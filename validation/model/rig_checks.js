async () => {
  const THREE = await import('/vendor/three.module.js');
  const { loadBlenderFly } = await import('/fly-model/blenderFly.mjs');
  const { resetPose } = await import('/fly-model/flyRigged.mjs');
  const { makeEffector } = await import('/effectors/kinematic.mjs');
  const { poseFromBones } = await import('/sensors/proprio.mjs');
  const fly = await loadBlenderFly();
  const check = (value, message) => { if (!value) throw Error(message); };
  const meshes = [];
  fly.group.traverse(o => { if (o.isMesh) meshes.push(o); });
  check(meshes.every(m => m.userData.source === 'blender-glb'), 'Old procedural meshes remain visible');
  check(Object.keys(fly.bones).length === 43, 'Controller bone count changed');
  const { GLTFLoader } = await import('/vendor/GLTFLoader.js');
  const source = await new GLTFLoader().loadAsync(new URL('/fly-model/fly_refined.glb', location.href).href);
  source.scene.updateMatrixWorld(true);
  const sourceMeshes = [];
  source.scene.traverse(o => { if(o.isMesh) sourceMeshes.push(o); });
  check(sourceMeshes.length === meshes.length, 'Exported geometry was dropped');
  let maxRestError = 0;
  for (const m of meshes) {
    const original = sourceMeshes.find(o => o.name === m.name);
    check(original, `Missing source shell ${m.name}`);
    const pos = m.geometry.attributes.position;
    for (const i of [0,Math.floor(pos.count/2),pos.count-1]) {
      const expected = new THREE.Vector3().fromBufferAttribute(original.geometry.attributes.position,i).applyMatrix4(original.matrixWorld);
      expected.z *= -1;
      const actual = new THREE.Vector3().fromBufferAttribute(pos,i).applyMatrix4(m.matrixWorld);
      maxRestError = Math.max(maxRestError,expected.distanceTo(actual));
    }
  }
  check(maxRestError < 1e-5, `Blender rest geometry drift: ${maxRestError}`);
  const jointIndices = source.parser.json.skins[0].joints;
  let maxPivotError = 0;
  for (const i of jointIndices) {
    const name = source.parser.json.nodes[i].name;
    const bone = await source.parser.getDependency('node',i);
    const expected = bone.getWorldPosition(new THREE.Vector3()); expected.z *= -1;
    maxPivotError = Math.max(maxPivotError, expected.distanceTo(fly.bones[name].getWorldPosition(new THREE.Vector3())));
  }
  check(maxPivotError < 1e-5, `Controller and Blender pivots differ: ${maxPivotError}`);
  const channels = await (await fetch('/banc-channels.json')).json();
  const missing = channels.motor.filter(m => m.bone && !fly.bones[m.bone]);
  check(missing.length === 0, 'Mapped motor channels have no bone');
  const points = () => meshes.map(m => new THREE.Vector3().fromBufferAttribute(m.geometry.attributes.position, 0).applyMatrix4(m.matrixWorld));
  const rest = points();
  const moves = {};
  for (const name of Object.keys(fly.bones)) {
    resetPose(fly);
    fly.bones[name].rotateX(.3);
    fly.group.updateMatrixWorld(true);
    const now = points();
    const descendants = new Set();
    fly.bones[name].traverse(o => { if (o.isMesh) descendants.add(o); });
    const changed = meshes.map((m,i) => now[i].distanceTo(rest[i]));
    check(changed.every((d,i) => descendants.has(meshes[i]) || d < 1e-7), `Unrelated geometry moved: ${name}`);
    if (descendants.size) check(changed.some(d => d > .00001), `No visible descendants move: ${name}`);
    moves[name] = Math.max(...changed);
  }
  resetPose(fly);
  check(points().every((p,i) => p.distanceTo(rest[i]) < 1e-7), 'Rest restoration drift');
  const rates = new Float32Array(channels.motor.length);
  channels.motor.forEach((m,i) => { if(m.bone === 'leg_FL_tibia' && m.target.includes('tibia_flexor')) rates[i] = 200; });
  check(rates.some(r => r > 0), 'No mapped flexors tested');
  makeEffector(channels, fly.bones).step(.02, rates);
  fly.group.updateMatrixWorld(true);
  const driven = points();
  check(meshes.some((m,i) => m.userData.driverBone === 'leg_FL_tarsus' && driven[i].distanceTo(rest[i]) > .01), 'Effector does not move Blender foot');
  const pose = poseFromBones(fly.bones);
  check(JSON.stringify(pose).length > 0, 'Proprioception readout missing');
  resetPose(fly);
  const mixer = new THREE.AnimationMixer(fly.group);
  mixer.clipAction(fly.clips.find(c => c.name === 'walk')).play(); mixer.update(.2);
  fly.group.updateMatrixWorld(true);
  check(points().some((p,i) => p.distanceTo(rest[i]) > .01), 'Authored walk no longer moves Blender meshes');
  mixer.stopAllAction(); resetPose(fly);
  check(fly.materials.m_7c431a.color.r < .5, 'GLB lost Blender cuticle colors (white export)');
  return { meshes: meshes.length, bones: Object.keys(moves).length, maxRestError, maxPivotError, missingMotorChannels: missing.length, moves, materialColor: fly.materials.m_7c431a.color.toArray(), syntheticEffectorTest: true };
}
