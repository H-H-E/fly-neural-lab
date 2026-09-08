import * as THREE from 'three';
import { GLTFLoader } from '../vendor/GLTFLoader.js';
import { createDrosophilaMale, resetPose } from './flyRigged.mjs';
import { restoreBlenderMaterials } from './blenderMaterials.mjs';

export const BLENDER_REVISION = 'blender-iteration15-rig-bridge-v1';
export const BLENDER_ASSET = new URL('./fly_refined.glb', import.meta.url).href;

// Keep computational axes, channel names, rest poses and authored clips intact.
// Blender bone roll differs from the controller rig: copying Euler angles to
// imported bones is incorrect. Transfer each rigid shell at its world rest pose
// to the matching canonical bone instead. No neural values are modified here.
export async function loadBlenderFly() {
  const gltf = await new GLTFLoader().loadAsync(BLENDER_ASSET);
  const fly = createDrosophilaMale({ detail: 'low' });
  resetPose(fly);
  const jointIndices = new Set(gltf.parser.json.skins.flatMap(s => s.joints));
  const jointNames = new Map();
  for (const index of jointIndices) {
    const node = await gltf.parser.getDependency('node', index);
    jointNames.set(node, gltf.parser.json.nodes[index].name);
  }
  const missing = Object.keys(fly.bones).filter(name => ![...jointNames.values()].includes(name));
  if (missing.length) throw Error(`Blender rig is missing joints: ${missing.join(', ')}`);
  gltf.scene.updateMatrixWorld(true);
  // Proxy builder used (x,z,y); glTF exports Blender as (x,z,-y).
  const coordinates = new THREE.Matrix4().makeScale(1, 1, -1);
  const bindings = [];
  gltf.scene.traverse(mesh => {
    if (!mesh.isMesh) return;
    if (mesh.isSkinnedMesh) throw Error('Expected rigid bone-parented insect shells, not blended skin weights');
    let ancestor = mesh.parent;
    while (ancestor && !jointNames.has(ancestor)) ancestor = ancestor.parent;
    const name = jointNames.get(ancestor);
    if (!fly.bones[name]) throw Error(`Unmapped Blender shell: ${mesh.name}`);
    const world = new THREE.Matrix4().multiplyMatrices(coordinates, mesh.matrixWorld);
    const local = fly.bones[name].matrixWorld.clone().invert().multiply(world);
    bindings.push({ mesh, name, local });
  });
  if (!bindings.length) throw Error('Blender asset contains no rigid meshes');
  // Dispose the temporary procedural shell, never its canonical bones.
  const oldMeshes = [], geometries = new Set(), materials = new Set(), textures = new Set();
  fly.group.traverse(o => { if (o.isMesh) oldMeshes.push(o); });
  for (const o of oldMeshes) {
    geometries.add(o.geometry);
    for (const m of (Array.isArray(o.material) ? o.material : [o.material])) materials.add(m);
    o.removeFromParent();
  }
  for (const m of materials) {
    for (const v of Object.values(m)) if (v?.isTexture) textures.add(v);
    m.dispose();
  }
  geometries.forEach(g => g.dispose()); textures.forEach(t => t.dispose());
  const mapped = new Set();
  for (const { mesh, name, local } of bindings) {
    fly.bones[name].add(mesh);
    mesh.matrix.copy(local); mesh.matrixAutoUpdate = false;
    mesh.userData.driverBone = name;
    mesh.userData.source = 'blender-glb';
    mapped.add(name);
  }
  fly.materials = {};
  fly.group.traverse(o => {
    for (const m of (Array.isArray(o.material) ? o.material : [o.material])) {
      if (m) { fly.materials[m.name] = m; if (m.transparent) m.depthWrite = false; }
    }
  });
  restoreBlenderMaterials(fly);
  fly.stats = { revision: BLENDER_REVISION, format: 'glb', detail: 'blender', bones: Object.keys(fly.bones).length,
    meshes: bindings.length, mappedBones: mapped.size, clips: fly.clips.length,
    sexMismatch: 'male-morphology/female-CNS' };
  fly.group.userData.model = { ...fly.stats, asset: BLENDER_ASSET };
  resetPose(fly);
  return fly;
}
