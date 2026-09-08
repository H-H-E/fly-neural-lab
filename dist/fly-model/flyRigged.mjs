import * as THREE from 'three';
import { mergeGeometries } from '../vendor/BufferGeometryUtils.js';

const AXIS_Y = new THREE.Vector3(0, 1, 0);
const AXIS_Z = new THREE.Vector3(0, 0, 1);

// Keep the visual specimen tied to the latest reviewed site-fly pass. The
// detail tiers below change tessellation only; they all use this same rig.
export const FLY_MODEL_REVISION = 'e53c905ec367f7bdc95a0fc9ba836a3087c3d488';

// Tiered tessellation: big body shapes get density, small parts don't pay for it.
const DETAIL = {
  low:      { big: [22, 14], mid: [12, 8], small: [8, 6], tubeR: 5, bodySetae: 90,  abdomenSetae: 10, legSetae: 4, veinTubular: 10, eyeSetae: 30, microRows: 18 },
  standard: { big: [38, 24], mid: [18, 12], small: [10, 7], tubeR: 6, bodySetae: 200, abdomenSetae: 18, legSetae: 6, veinTubular: 16, eyeSetae: 60, microRows: 30 },
  hero:     { big: [56, 36], mid: [26, 16], small: [14, 9], tubeR: 8, bodySetae: 360, abdomenSetae: 26, legSetae: 9, veinTubular: 22, eyeSetae: 110, microRows: 44 },
};

function mulberry32(seed) {
  return function rng() {
    let t = seed += 0x6D2B79F5;
    t = Math.imul(t ^ t >>> 15, t | 1);
    t ^= t + Math.imul(t ^ t >>> 7, t | 61);
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
}

function noiseTexture(seed = 1, size = 96) {
  const rng = mulberry32(seed);
  const data = new Uint8Array(size * size * 4);
  for (let i = 0; i < size * size; i++) {
    const grain = Math.max(0, Math.min(255, 126 + (rng() - 0.5) * 92));
    data[i * 4 + 0] = grain;
    data[i * 4 + 1] = grain;
    data[i * 4 + 2] = grain;
    data[i * 4 + 3] = 255;
  }
  const tex = new THREE.DataTexture(data, size, size, THREE.RGBAFormat);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(7, 7);
  tex.needsUpdate = true;
  tex.colorSpace = THREE.NoColorSpace;
  return tex;
}

// Ommatidial hex lattice as a bump map: reads as real compound-eye faceting at
// macro distance for zero draw calls (replaces ~950 instanced facet discs).
function hexEyeTexture(size = 512, cols = 30) {
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = size;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = '#5a5a5a';
  ctx.fillRect(0, 0, size, size);
  const hexW = size / cols;
  const hexH = hexW * 1.1547;
  const rng = mulberry32(77);
  for (let row = -1; row * hexH < size + hexH; row++) {
    for (let col = -1; col * hexW < size + hexW; col++) {
      const cx = col * hexW + (row & 1 ? hexW / 2 : 0);
      const cy = row * hexH;
      const r = hexW * 0.56;
      const shade = 140 + Math.floor(rng() * 75);
      ctx.beginPath();
      for (let k = 0; k < 6; k++) {
        const a = Math.PI / 6 + (k * Math.PI) / 3;
        const px = cx + r * Math.cos(a);
        const py = cy + r * Math.sin(a);
        if (k === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
      }
      ctx.closePath();
      ctx.fillStyle = `rgb(${shade},${shade},${shade})`;
      ctx.fill();
      ctx.lineWidth = Math.max(2, hexW * 0.14);
      ctx.strokeStyle = 'rgb(28,28,28)';
      ctx.stroke();
    }
  }
  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.colorSpace = THREE.NoColorSpace;
  return tex;
}

// Per-facet color variation + dark inter-facet borders (Blender macro pass:
// borders are what sell facets, not the bump alone).
function hexEyeColorTexture(size = 512, cols = 30) {
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = size;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = '#3d0d04';
  ctx.fillRect(0, 0, size, size);
  const hexW = size / cols;
  const hexH = hexW * 1.1547;
  const rng = mulberry32(78);
  for (let row = -1; row * hexH < size + hexH; row++) {
    for (let col = -1; col * hexW < size + hexW; col++) {
      const cx = col * hexW + (row & 1 ? hexW / 2 : 0);
      const cy = row * hexH;
      const r = hexW * 0.44;
      const v = rng();
      const rr = Math.floor(138 + v * 62);
      const gg = Math.floor(20 + v * 22);
      const bb = Math.floor(6 + v * 10);
      ctx.beginPath();
      for (let k = 0; k < 6; k++) {
        const a = Math.PI / 6 + (k * Math.PI) / 3;
        const px = cx + r * Math.cos(a);
        const py = cy + r * Math.sin(a);
        if (k === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
      }
      ctx.closePath();
      ctx.fillStyle = `rgb(${rr},${gg},${bb})`;
      ctx.fill();
    }
  }
  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

// Large-scale warm mottling (near-white blotch map): multiplies base color so
// the cuticle reads organic, not spray-painted. Sphere/cylinder UVs suffice.
function mottleTexture(size = 256, seed = 913) {
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = size;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = '#fbf6ec';
  ctx.fillRect(0, 0, size, size);
  const rng = mulberry32(seed);
  for (let i = 0; i < 70; i++) {
    const x = rng() * size, y = rng() * size;
    const r = size * (0.03 + rng() * 0.10);
    const warm = rng() > 0.45;
    const g = ctx.createRadialGradient(x, y, 0, x, y, r);
    const a = 0.05 + rng() * 0.09;
    g.addColorStop(0, warm ? `rgba(214,164,110,${a})` : `rgba(88,52,28,${a})`);
    g.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = g;
    ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill();
  }
  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(3, 3);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

function ellipsoid({ radii, material, seg, center = [0, 0, 0], name = '' }) {
  const g = new THREE.SphereGeometry(1, seg[0], seg[1]);
  g.scale(radii[0], radii[1], radii[2]);
  const m = new THREE.Mesh(g, material);
  m.position.fromArray(center);
  m.name = name;
  m.castShadow = true;
  m.receiveShadow = true;
  return m;
}

function cylinderBetween(parent, start, end, radius, material, radialSegments = 8, name = '') {
  const a = new THREE.Vector3().fromArray(start);
  const b = new THREE.Vector3().fromArray(end);
  const d = b.clone().sub(a);
  const len = d.length();
  const g = new THREE.CylinderGeometry(radius * 0.93, radius, len, radialSegments, 1, false);
  g.translate(0, len / 2, 0);
  const mesh = new THREE.Mesh(g, material);
  mesh.position.copy(a);
  mesh.quaternion.setFromUnitVectors(AXIS_Y, d.normalize());
  mesh.name = name;
  mesh.castShadow = true;
  parent.add(mesh);
  return mesh;
}

function tubeGeom(points, radius, tubularSegments = 18, radialSegments = 4, closed = false) {
  const pts = points.map(p => p.isVector3 ? p.clone() : new THREE.Vector3().fromArray(p));
  const curve = closed
    ? new THREE.CatmullRomCurve3(pts, true, 'centripetal')
    : new THREE.CatmullRomCurve3(pts, false, 'centripetal');
  return new THREE.TubeGeometry(curve, tubularSegments, radius, radialSegments, closed);
}

function tube(parent, points, radius, material, tubularSegments = 18, radialSegments = 4, closed = false, name = '') {
  const m = new THREE.Mesh(tubeGeom(points, radius, tubularSegments, radialSegments, closed), material);
  m.name = name;
  m.castShadow = true;
  parent.add(m);
  return m;
}

// Merge many tube geometries built in the SAME bone's local space into one mesh.
function mergedTubeMesh(parent, specs, material, name) {
  const geoms = specs.map(([pts, radius, tub, rad, closed]) => tubeGeom(pts, radius, tub, rad, closed));
  const merged = mergeGeometries(geoms, false);
  geoms.forEach(g => g.dispose());
  const mesh = new THREE.Mesh(merged, material);
  mesh.name = name;
  mesh.castShadow = true;
  parent.add(mesh);
  return mesh;
}

function bristleGeom(base, dir, length, radius, bend = 0.08) {
  const b = new THREE.Vector3().fromArray(base);
  const d = new THREE.Vector3().fromArray(dir).normalize();
  const side = new THREE.Vector3(-d.y, d.x + 0.0001, d.z * 0.15).normalize().multiplyScalar(length * bend);
  const p1 = b.clone().add(d.clone().multiplyScalar(length * 0.48)).add(side);
  const p2 = b.clone().add(d.clone().multiplyScalar(length));
  return tubeGeom([b, p1, p2], radius, 8, 3, false);
}

function addEllipsoidSetae(parent, { radii, center = [0, 0, 0], count, seed, length = [0.03, 0.07], material, reject = null }) {
  const rng = mulberry32(seed);
  const geom = new THREE.ConeGeometry(0.010, 1, 4, 1, false);
  geom.translate(0, 0.5, 0);
  const inst = new THREE.InstancedMesh(geom, material, count);
  inst.name = 'micro_setae';
  const c = new THREE.Vector3().fromArray(center);
  const m = new THREE.Matrix4();
  const q = new THREE.Quaternion();
  const s = new THREE.Vector3();
  const p = new THREE.Vector3();
  const n = new THREE.Vector3();
  let written = 0;
  let guard = 0;
  while (written < count && guard < count * 30) {
    guard++;
    const cosTheta = rng() * 2 - 1;
    const sinTheta = Math.sqrt(Math.max(0, 1 - cosTheta * cosTheta));
    const phi = rng() * Math.PI * 2;
    const ux = sinTheta * Math.cos(phi);
    const uy = cosTheta;
    const uz = sinTheta * Math.sin(phi);
    p.set(c.x + radii[0] * ux, c.y + radii[1] * uy, c.z + radii[2] * uz);
    n.set(ux / radii[0], uy / radii[1], uz / radii[2]).normalize();
    if (reject && reject(p, n)) continue;
    const l = THREE.MathUtils.lerp(length[0], length[1], rng());
    const tilt = new THREE.Vector3((rng() - 0.5) * 0.22, (rng() - 0.5) * 0.12, (rng() - 0.5) * 0.22);
    const nn = n.clone().add(tilt).normalize();
    q.setFromUnitVectors(AXIS_Y, nn);
    const width = THREE.MathUtils.lerp(0.40, 0.75, rng());
    s.set(width, l, width);
    m.compose(p, q, s);
    inst.setMatrixAt(written++, m);
  }
  inst.count = written;
  inst.instanceMatrix.needsUpdate = true;
  parent.add(inst);
  return inst;
}

function addSegmentSetae(parent, vec, count, seed, material, radius = 0.035) {
  const rng = mulberry32(seed);
  const d = new THREE.Vector3().fromArray(vec);
  const axis = d.clone().normalize();
  const tmp = Math.abs(axis.y) < 0.85 ? new THREE.Vector3(0, 1, 0) : new THREE.Vector3(1, 0, 0);
  const b1 = new THREE.Vector3().crossVectors(axis, tmp).normalize();
  const b2 = new THREE.Vector3().crossVectors(axis, b1).normalize();
  const g = new THREE.ConeGeometry(0.007, 1, 4, 1, false);
  g.translate(0, .5, 0);
  const inst = new THREE.InstancedMesh(g, material, count);
  inst.name = 'leg_setae';
  const q = new THREE.Quaternion();
  const mat = new THREE.Matrix4();
  const pos = new THREE.Vector3();
  const out = new THREE.Vector3();
  const scl = new THREE.Vector3();
  for (let i = 0; i < count; i++) {
    const t = 0.12 + 0.76 * (i / Math.max(1, count - 1));
    const phi = i * 2.399963 + rng() * .45;
    out.copy(b1).multiplyScalar(Math.cos(phi)).addScaledVector(b2, Math.sin(phi)).normalize();
    pos.copy(d).multiplyScalar(t).addScaledVector(out, radius);
    q.setFromUnitVectors(AXIS_Y, out);
    const l = THREE.MathUtils.lerp(.03, .06, rng());
    scl.set(1, l, 1);
    mat.compose(pos, q, scl);
    inst.setMatrixAt(i, mat);
  }
  inst.instanceMatrix.needsUpdate = true;
  parent.add(inst);
  return inst;
}

function addCompoundEye(headBone, side, segments, materials) {
  const center = new THREE.Vector3(-0.16, 0.035, side * 0.265);
  const eye = ellipsoid({ radii: [0.23, 0.24, 0.125], material: materials.eye, seg: segments.mid, center: [-0.16, 0.035, side * 0.25], name: side > 0 ? 'eye_L' : 'eye_R' });
  headBone.add(eye);
}

// Inter-ommatidial bristles: the tiny hairs between facets that sell a real
// compound eye at macro distance (Blender pass 6). One instanced draw per eye.
function addEyeSetae(headBone, side, count, seed, material) {
  const radii = [0.23, 0.24, 0.125];
  const center = new THREE.Vector3(-0.16, 0.035, side * 0.25);
  const rng = mulberry32(seed);
  const geom = new THREE.ConeGeometry(0.004, 1, 5, 1, false);
  geom.translate(0, 0.5, 0);
  const inst = new THREE.InstancedMesh(geom, material, count);
  inst.name = side > 0 ? 'eye_setae_L' : 'eye_setae_R';
  const m = new THREE.Matrix4(), q = new THREE.Quaternion();
  const p = new THREE.Vector3(), n = new THREE.Vector3(), s = new THREE.Vector3();
  let written = 0, guard = 0;
  while (written < count && guard < count * 40) {
    guard++;
    const u = rng() * 2 - 1, phi = rng() * Math.PI * 2;
    const sq = Math.sqrt(Math.max(0, 1 - u * u));
    const d = new THREE.Vector3(sq * Math.cos(phi), u, sq * Math.sin(phi));
    if (d.z * side < 0.05) continue; // outer shell only
    p.set(center.x + radii[0] * d.x, center.y + radii[1] * d.y, center.z + radii[2] * d.z);
    n.set(d.x / radii[0], d.y / radii[1], d.z / radii[2]).normalize();
    q.setFromUnitVectors(AXIS_Y, n);
    const l = 0.035 + rng() * 0.025;
    s.set(1, l, 1);
    m.compose(p, q, s);
    inst.setMatrixAt(written++, m);
  }
  inst.count = written;
  inst.instanceMatrix.needsUpdate = true;
  headBone.add(inst);
  return inst;
}

// Thoracic microchaetae: acrostichal rows + scutellars (Blender pass 6).
// One instanced draw; real flies carry these in neat dorsal rows.
function addThoracicMicro(thoraxBone, count, seed, material) {
  const radii = [0.53, 0.43, 0.38];
  const rng = mulberry32(seed);
  const geom = new THREE.ConeGeometry(0.0032, 1, 5, 1, false);
  geom.translate(0, 0.5, 0);
  const inst = new THREE.InstancedMesh(geom, material, count + 4);
  inst.name = 'thoracic_microchaetae';
  const m = new THREE.Matrix4(), q = new THREE.Quaternion();
  const p = new THREE.Vector3(), n = new THREE.Vector3(), s = new THREE.Vector3();
  let w = 0;
  const perRow = Math.floor(count / 2);
  for (const zoff of [0.06, -0.06]) {
    for (let i = 0; i < perRow; i++) {
      const x = -0.34 + (0.72 * i) / Math.max(1, perRow - 1);
      const dx = x / radii[0], dz = zoff / radii[2];
      const qq = 1 - dx * dx - dz * dz;
      if (qq <= 0.05) continue;
      const y = radii[1] * Math.sqrt(qq);
      p.set(x, y, zoff);
      n.set(dx / radii[0], Math.sqrt(qq) / radii[1], dz / radii[2]).normalize();
      q.setFromUnitVectors(AXIS_Y, n);
      s.set(1, 0.045 + rng() * 0.02, 1);
      m.compose(p, q, s);
      inst.setMatrixAt(w++, m);
    }
  }
  for (const sd of [1, -1]) { // scutellar pair, longer
    p.set(0.47, 0.18, sd * 0.10);
    n.set(0.55, 0.8, sd * 0.25).normalize();
    q.setFromUnitVectors(AXIS_Y, n);
    s.set(1.4, 0.13, 1.4);
    m.compose(p, q, s);
    inst.setMatrixAt(w++, m);
  }
  inst.count = w;
  inst.instanceMatrix.needsUpdate = true;
  thoraxBone.add(inst);
  return inst;
}

function addOcelli(headBone, segments, materials) {
  // Three tiny ellipsoids merged into one draw (same bone, static).
  const pts = [
    [-0.02, 0.315, 0],
    [0.04, 0.285, 0.075],
    [0.04, 0.285, -0.075],
  ];
  const geoms = pts.map(center => {
    const g = new THREE.SphereGeometry(1, segments.small[0], segments.small[1]);
    g.scale(0.035, 0.025, 0.035);
    g.translate(center[0], center[1], center[2]);
    return g;
  });
  const merged = mergeGeometries(geoms, false);
  geoms.forEach(g => g.dispose());
  const m = new THREE.Mesh(merged, materials.ocellus);
  m.name = 'ocelli';
  headBone.add(m);
}

function addAntenna(headBone, side, bones, segments, materials) {
  const base = new THREE.Bone();
  base.name = side > 0 ? 'antenna_L' : 'antenna_R';
  base.position.set(-0.335, 0.06, side * 0.16);
  // subtle down-tip only: strong rotation read as horns from above
  base.rotation.z = -0.15;
  headBone.add(base);
  bones[base.name] = base;

  const pedicel = ellipsoid({ radii: [0.065, 0.060, 0.052], material: materials.cuticleLight, seg: segments.small, center: [0, 0, 0], name: `${base.name}_pedicel` });
  base.add(pedicel);
  const funiculus = ellipsoid({ radii: [0.095, 0.070, 0.055], material: materials.cuticleLight, seg: segments.small, center: [-0.07, -0.01, side * 0.015], name: `${base.name}_funiculus` });
  base.add(funiculus);

  const arista = new THREE.Bone();
  arista.name = side > 0 ? 'arista_L' : 'arista_R';
  arista.position.set(-0.12, 0.01, side * 0.025);
  base.add(arista);
  bones[arista.name] = arista;

  const shaft = [
    [0, 0, 0], [-0.06, 0.015, side * 0.01], [-0.12, 0.035, side * 0.018], [-0.18, 0.06, side * 0.026], [-0.24, 0.09, side * 0.032]
  ];
  const branchCount = 7;
  const specs = [[shaft, 0.0075, 14, 4, false]];
  for (let i = 1; i <= branchCount; i++) {
    const t = i / (branchCount + 1);
    const x = -0.24 * t;
    const y = 0.09 * t;
    const z = side * 0.032 * t;
    const l = 0.028 + 0.018 * Math.sin(Math.PI * t);
    specs.push([
      [[x, y, z], [x + 0.008, y + l * 0.45, z + side * l * 0.15], [x + 0.012, y + l, z + side * l * 0.24]],
      0.0032, 6, 3, false,
    ]);
    specs.push([
      [[x, y, z], [x + 0.006, y - l * 0.40, z - side * l * 0.10], [x + 0.008, y - l * 0.82, z - side * l * 0.20]],
      0.0028, 6, 3, false,
    ]);
  }
  mergedTubeMesh(arista, specs, materials.darkHair, `${arista.name}_full`);
}

function camberOf(x) {
  // gentle spanwise camber: real wings are not flat plates (Blender pass 3)
  const t = THREE.MathUtils.clamp(x / 1.92, 0, 1);
  return 0.030 * Math.sin(Math.PI * t);
}

function wingGeometry(side) {
  // Male wing ≈ 1.92 mm on a 2.26 mm body (grade A): longer relative to body.
  const outline = [
    [0.00, 0.00], [0.12, 0.12], [0.46, 0.27], [0.95, 0.42], [1.44, 0.50], [1.76, 0.42],
    [1.92, 0.26], [1.87, 0.10], [1.60, -0.045], [1.20, -0.14], [0.70, -0.185], [0.28, -0.115], [0.06, -0.05]
  ];
  const pts2 = outline.map(([x, z]) => new THREE.Vector2(x, z * side));
  const tris = THREE.ShapeUtils.triangulateShape(pts2, []);
  const pos = [];
  const uv = [];
  for (const p of pts2) {
    pos.push(p.x, camberOf(p.x), p.y);
    uv.push(p.x / 1.92, (p.y / side + .185) / .69);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  g.setIndex(tris.flat());
  g.computeVertexNormals();
  g.computeBoundingSphere();
  return { geometry: g, outline };
}

function addWing(thoraxBone, side, bones, segments, materials) {
  const wing = new THREE.Bone();
  wing.name = side > 0 ? 'wing_L' : 'wing_R';
  // Fold math: the planform's own tip sits +0.26 outboard, angling the blade
  // axis ~8° outward before rotation. Bone yaw 0.27 rad puts the blade axis
  // ~8° INWARD — tips meet/overlap at the dorsal midline (v8 0.52 = X-cross,
  // v9/v10 0.035-0.12 = splay).
  wing.position.set(0.06, 0.33, side * 0.22);
  wing.rotation.y = side * 0.27;
  wing.rotation.z = -0.10;
  wing.rotation.x = side * -0.03;
  thoraxBone.add(wing);
  bones[wing.name] = wing;

  const { geometry, outline } = wingGeometry(side);
  const membrane = new THREE.Mesh(geometry, materials.wing);
  membrane.name = `${wing.name}_membrane`;
  membrane.receiveShadow = true;
  membrane.renderOrder = 1;
  wing.add(membrane);

  // Venation merged into ONE mesh per wing (was 11 separate tube draws).
  const yz = (x, z, lift = 0.004) => [x, camberOf(x) + lift, side * z];
  const veins = [
    ['C',   [[0.02,0.01],[0.20,0.16],[0.74,0.37],[1.38,0.47],[1.74,0.39],[1.91,0.25]]],
    ['Sc',  [[0.04,0.00],[0.24,0.10],[0.63,0.25],[1.02,0.34]]],
    ['R1',  [[0.03,0.00],[0.26,0.065],[0.64,0.16],[1.18,0.22],[1.66,0.235]]],
    ['R2+3',[[0.04,0.00],[0.28,0.02],[0.64,0.055],[1.09,0.06],[1.55,0.03]]],
    ['R4+5',[[0.04,0.00],[0.26,-0.01],[0.64,-0.03],[1.09,-0.075],[1.48,-0.12]]],
    ['M1',  [[0.04,0.00],[0.23,-0.032],[0.53,-0.082],[0.92,-0.13],[1.23,-0.15]]],
    ['CuA1',[[0.03,-0.01],[0.17,-0.065],[0.35,-0.11],[0.65,-0.175]]],
    ['A1',  [[0.03,-0.02],[0.10,-0.07],[0.23,-0.11],[0.39,-0.14]]],
    ['ACV', [[0.63,0.16],[0.66,0.095],[0.64,0.055],[0.62,-0.02]]],
    ['PCV', [[1.05,0.068],[1.06,0.01],[1.07,-0.07],[1.04,-0.12]]],
  ];
  const specs = veins.map(([, pts]) => [pts.map(([x, z]) => yz(x, z)), 0.0045, segments.veinTubular, 3, false]);
  // costal fringe: short marginal hairs along the leading edge (Blender pass 6),
  // merged into the venation draw — zero new draw calls.
  const costa = veins[0][1];
  for (let i = 1; i < costa.length - 1; i += 2) {
    const [fx, fz] = costa[i];
    specs.push([
      [yz(fx, fz, 0.002), [fx - 0.006, camberOf(fx) + 0.034, side * (fz + 0.030)]],
      0.0022, 4, 3, false,
    ]);
  }
  specs.push([outline.map(([x, z]) => yz(x, z, 0.004)), 0.0045, 44, 3, true]);
  mergedTubeMesh(wing, specs, materials.wingVein, `${wing.name}_venation`);

  const hinge = ellipsoid({ radii: [0.07, 0.04, 0.05], material: materials.cuticleDark, seg: segments.small, center: [0.025, 0, side * 0.01], name: `${wing.name}_hinge` });
  wing.add(hinge);
}

function addHaltere(thoraxBone, side, bones, segments, materials) {
  const b = new THREE.Bone();
  b.name = side > 0 ? 'haltere_L' : 'haltere_R';
  // Tucked under the folded wing, small: real halteres are ~0.1 mm clubs.
  b.position.set(0.31, 0.02, side * 0.24);
  thoraxBone.add(b);
  bones[b.name] = b;
  const stemEnd = [0.17, -0.03, side * 0.12];
  // Stem + capitellum merged into one draw (same bone, static).
  const stem = new THREE.CylinderGeometry(0.010, 0.012, new THREE.Vector3().fromArray(stemEnd).length(), 6, 1, false);
  stem.translate(0, new THREE.Vector3().fromArray(stemEnd).length() / 2, 0);
  stem.applyQuaternion(new THREE.Quaternion().setFromUnitVectors(AXIS_Y, new THREE.Vector3().fromArray(stemEnd).normalize()));
  const knob = new THREE.SphereGeometry(1, segments.small[0], segments.small[1]);
  knob.scale(0.055, 0.042, 0.048);
  knob.translate(stemEnd[0], stemEnd[1], stemEnd[2]);
  const merged = mergeGeometries([stem, knob], false);
  stem.dispose(); knob.dispose();
  const m = new THREE.Mesh(merged, materials.haltere);
  m.name = `${b.name}_stem_capitellum`;
  m.castShadow = true;
  b.add(m);
}

// Thoracic macrochaetae merged into one mesh (was 10 separate tube draws).
// Shorter, stouter macrochaetae: real dorsocentrals read ~0.2 mm, wire spikes read fake.
function addScutellumAndMacrochaetae(thoraxBone, segments, materials) {
  const sc = ellipsoid({ radii: [0.16, 0.075, 0.22], material: materials.cuticle, seg: segments.mid, center: [0.40, 0.135, 0], name: 'scutellum' });
  sc.castShadow = false;
  thoraxBone.add(sc);
  const macro = [
    [[-0.24,0.34, 0.18],[-.30,.68,.20],.17], [[-0.24,0.34,-0.18],[-.30,.68,-.20],.17],
    [[-0.05,0.40, 0.14],[-.07,.74,.14],.19], [[-0.05,0.40,-0.14],[-.07,.74,-.14],.19],
    [[0.14,0.39, 0.15],[.19,.76,.17],.20], [[0.14,0.39,-0.15],[.19,.76,-.17],.20],
    [[0.37,0.26, 0.20],[.44,.62,.30],.18], [[0.37,0.26,-0.20],[.44,.62,-.30],.18],
    [[0.43,0.19, 0.23],[.68,.46,.44],.22], [[0.43,0.19,-0.23],[.68,.46,-.44],.22],
  ];
  const geoms = macro.map(([base, tip, len]) => {
    const d = new THREE.Vector3().fromArray(tip).sub(new THREE.Vector3().fromArray(base)).normalize();
    return bristleGeom(base, d.toArray(), len, 0.007, .14);
  });
  const merged = mergeGeometries(geoms, false);
  geoms.forEach(g => g.dispose());
  const mesh = new THREE.Mesh(merged, materials.darkHair);
  mesh.name = 'macrochaetae';
  mesh.castShadow = true;
  thoraxBone.add(mesh);
}

function addHeadBristles(headBone, materials) {
  const defs = [
    [[-0.10,.28,.22],[-.25,.78,.32],.19], [[-0.10,.28,-.22],[-.25,.78,-.32],.19],
    [[-.27,.18,.23],[-.55,.55,.42],.17], [[-.27,.18,-.23],[-.55,.55,-.42],.17],
    [[-.31,-.02,.20],[-.62,.18,.38],.15], [[-.31,-.02,-.20],[-.62,.18,-.38],.15],
  ];
  const geoms = defs.map(([base, tip, len]) => {
    const d = new THREE.Vector3().fromArray(tip).sub(new THREE.Vector3().fromArray(base)).normalize();
    return bristleGeom(base, d.toArray(), len, 0.004, .10);
  });
  const merged = mergeGeometries(geoms, false);
  geoms.forEach(g => g.dispose());
  const mesh = new THREE.Mesh(merged, materials.darkHair);
  mesh.name = 'head_bristles';
  mesh.castShadow = true;
  headBone.add(mesh);
}

// Claw pair merged into one mesh per tarsus.
function makeClaws(parent, tip, materials) {
  const t = new THREE.Vector3().fromArray(tip);
  const geoms = [];
  for (const sign of [1, -1]) {
    const p1 = t.clone().add(new THREE.Vector3(-0.015, -0.018, sign * 0.026));
    const p2 = t.clone().add(new THREE.Vector3(-0.032, -0.045, sign * 0.055));
    geoms.push(tubeGeom([t, p1, p2], 0.005, 6, 3, false));
  }
  const merged = mergeGeometries(geoms, false);
  geoms.forEach(g => g.dispose());
  const mesh = new THREE.Mesh(merged, materials.darkHair);
  mesh.name = 'claws';
  mesh.castShadow = true;
  parent.add(mesh);
}

function addSexComb(tarsusBone, tarsusVec, side, materials) {
  const v = new THREE.Vector3().fromArray(tarsusVec);
  const axis = v.clone().normalize();
  const outward = new THREE.Vector3(0.12, 0, side).projectOnPlane(axis).normalize();
  const row = new THREE.Vector3().crossVectors(axis, outward).normalize();
  const teeth = 11;
  const g = new THREE.ConeGeometry(0.008, 1, 4, 1, false);
  g.translate(0, .5, 0);
  const inst = new THREE.InstancedMesh(g, materials.sexComb, teeth);
  inst.name = side > 0 ? 'sex_comb_L' : 'sex_comb_R';
  const q = new THREE.Quaternion(), m = new THREE.Matrix4(), p = new THREE.Vector3(), s = new THREE.Vector3();
  for (let i = 0; i < teeth; i++) {
    const offset = (i - (teeth - 1) / 2) * 0.017;
    p.copy(v).multiplyScalar(.18).addScaledVector(row, offset).addScaledVector(outward, .028);
    q.setFromUnitVectors(AXIS_Y, outward);
    s.set(1, .07 + .018 * Math.sin(Math.PI * (i + 1) / (teeth + 1)), 1);
    m.compose(p, q, s);
    inst.setMatrixAt(i, m);
  }
  inst.instanceMatrix.needsUpdate = true;
  tarsusBone.add(inst);
}

const LEG_LAYOUT = {
  F: {
    attachX: -0.25,
    coxa:  [-0.06,-0.12,0.10],
    femur: [-0.20,-0.20,0.16],
    tibia: [-0.22,-0.32,0.13],
    tarsus:[-0.24,-0.44,0.10],
  },
  M: {
    attachX: 0.00,
    coxa:  [0.02,-0.13,0.11],
    femur: [0.04,-0.36,0.22],
    tibia: [0.06,-0.38,0.21],
    tarsus:[0.06,-0.46,0.15],
  },
  H: {
    attachX: 0.27,
    coxa:  [0.06,-0.13,0.11],
    femur: [0.28,-0.20,0.19],
    tibia: [0.32,-0.34,0.16],
    tarsus:[0.30,-0.50,0.11],
  }
};

function mirrorVec(v, side) { return [v[0], v[1], v[2] * side]; }

function addLeg(thoraxBone, positionCode, side, bones, segments, materials, seed) {
  const cfg = LEG_LAYOUT[positionCode];
  const sideCode = side > 0 ? 'L' : 'R';
  const prefix = `leg_${positionCode}${sideCode}`;

  const coxa = new THREE.Bone(); coxa.name = `${prefix}_coxa`; coxa.position.set(cfg.attachX, -0.16, side * 0.29); thoraxBone.add(coxa); bones[coxa.name] = coxa;
  const coxaV = mirrorVec(cfg.coxa, side);
  cylinderBetween(coxa, [0, 0, 0], coxaV, .034, materials.leg, segments.tubeR, `${prefix}_coxa_mesh`);

  const femur = new THREE.Bone(); femur.name = `${prefix}_femur`; femur.position.fromArray(coxaV); coxa.add(femur); bones[femur.name] = femur;
  const femurV = mirrorVec(cfg.femur, side);
  cylinderBetween(femur, [0, 0, 0], femurV, positionCode === 'H' ? .036 : .032, materials.leg, segments.tubeR, `${prefix}_femur_mesh`);
  // femoral muscle swell: validated in Blender look-dev (pass 3), kills pipe-cleaner read
  const swell = ellipsoid({ radii: [.052, .044, .046], material: materials.leg, seg: segments.small, center: [femurV[0] * .45, femurV[1] * .45, femurV[2] * .45], name: `${prefix}_femur_swell` });
  femur.add(swell);
  addSegmentSetae(femur, femurV, segments.legSetae, seed + 1, materials.darkHair, .034);

  const tibia = new THREE.Bone(); tibia.name = `${prefix}_tibia`; tibia.position.fromArray(femurV); femur.add(tibia); bones[tibia.name] = tibia;
  const tibiaV = mirrorVec(cfg.tibia, side);
  cylinderBetween(tibia, [0, 0, 0], tibiaV, .026, materials.leg, segments.tubeR, `${prefix}_tibia_mesh`);
  addSegmentSetae(tibia, tibiaV, segments.legSetae + 2, seed + 2, materials.darkHair, .028);

  const tarsus = new THREE.Bone(); tarsus.name = `${prefix}_tarsus`; tarsus.position.fromArray(tibiaV); tibia.add(tarsus); bones[tarsus.name] = tarsus;
  const tarsusV = mirrorVec(cfg.tarsus, side);
  const v = new THREE.Vector3().fromArray(tarsusV);
  // five tarsomeres merged into ONE mesh (was 5 separate cylinder draws)
  const tarsGeoms = [];
  let prev = new THREE.Vector3();
  const tarsomeres = 5;
  for (let i = 1; i <= tarsomeres; i++) {
    const next = v.clone().multiplyScalar(i / tarsomeres);
    const d = next.clone().sub(prev);
    const len = d.length();
    const g = new THREE.CylinderGeometry(Math.max(0.012, .021 - i * .0025), .021 - (i - 1) * .0025, len, Math.max(5, segments.tubeR - 2), 1, false);
    g.translate(0, len / 2, 0);
    g.applyQuaternion(new THREE.Quaternion().setFromUnitVectors(AXIS_Y, d.clone().normalize()));
    g.translate(prev.x, prev.y, prev.z);
    tarsGeoms.push(g);
    prev.copy(next);
  }
  const tarsMerged = mergeGeometries(tarsGeoms, false);
  tarsGeoms.forEach(g => g.dispose());
  const tarsMesh = new THREE.Mesh(tarsMerged, materials.tarsus);
  tarsMesh.name = `${prefix}_tarsomeres`;
  tarsMesh.castShadow = true;
  tarsus.add(tarsMesh);
  addSegmentSetae(tarsus, tarsusV, segments.legSetae + 1, seed + 3, materials.darkHair, .024);
  makeClaws(tarsus, tarsusV, materials);
  if (positionCode === 'F') addSexComb(tarsus, tarsusV, side, materials);

  const jointMat = materials.leg;
  for (const [bone, at, r] of [[coxa, coxaV, .030], [femur, femurV, .034], [tibia, tibiaV, .028]]) {
    const j = ellipsoid({ radii: [r, r * .9, r], material: jointMat, seg: segments.small, center: at, name: 'leg_joint' });
    bone.add(j);
  }
}

// Abdomen: overlapping tergites with VERTEX-COLORED posterior bands (male banding
// pattern). One shared material; the 8 torus "band hoops" are gone.
function bandedTergiteGeometry(radii, center, bandStart = 0.55, seed = 1) {
  const g = new THREE.SphereGeometry(1, 26, 16);
  g.scale(radii[0], radii[1], radii[2]);
  g.translate(center[0], center[1], center[2]);
  const pos = g.attributes.position;
  const colors = new Float32Array(pos.count * 3);
  const amber = new THREE.Color(0x96602a);
  const dark = new THREE.Color(0x241408);
  const c = new THREE.Color();
  const xMax = center[0] + radii[0];
  const xMin = center[0] - radii[0];
  const rng = mulberry32(seed);
  const jitter = (rng() - 0.5) * 0.04;
  for (let i = 0; i < pos.count; i++) {
    const t = (pos.getX(i) - xMin) / (xMax - xMin); // 0 anterior → 1 posterior
    // wide smoothstep = soft pigment gradient like the real tergites
    const band = THREE.MathUtils.smoothstep(t, bandStart + jitter, bandStart + jitter + 0.26);
    c.copy(amber).lerp(dark, band);
    // subtle dorsal darkening for a rounded, lit cuticle look
    const dorsal = THREE.MathUtils.clamp(1 - pos.getY(i) / (radii[1] * 1.4), 0, 1) * 0.12;
    c.multiplyScalar(1 - dorsal);
    colors[i * 3 + 0] = c.r;
    colors[i * 3 + 1] = c.g;
    colors[i * 3 + 2] = c.b;
  }
  g.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  return g;
}

function addAbdomen(thoraxBone, bones, segments, materials) {
  // Deep overlap + gentle droop so the chain reads as ONE curved male abdomen,
  // not a stack of beads; dark bands sit in the exposed grooves only.
  const defs = [
    { len: .32, ry: .30, rz: .32, band: 0.52 },
    { len: .30, ry: .31, rz: .33, band: 0.50 },
    { len: .29, ry: .30, rz: .32, band: 0.48 },
    { len: .28, ry: .28, rz: .30, band: 0.44 },
    { len: .27, ry: .25, rz: .27, band: 0.36 },
    { len: .24, ry: .21, rz: .23, band: 0.0 },  // terminal: fully dark (male)
  ];
  let parent = thoraxBone;
  for (let i = 0; i < defs.length; i++) {
    const d = defs[i];
    const bone = new THREE.Bone();
    bone.name = `abdomen_${i + 1}`;
    // chain with deep overlap and progressive downward droop (male rest pose)
    bone.position.set(i === 0 ? 0.38 : defs[i - 1].len * 0.50, i === 0 ? -0.04 : -0.015 - i * 0.004, 0);
    if (i >= 1) bone.rotation.z = -0.055; // ~3.2° per segment, accumulates to a smooth male curve
    parent.add(bone);
    bones[bone.name] = bone;
    const radii = [d.len * .68, d.ry, d.rz];
    const center = [d.len * .40, 0, 0];
    const geom = i === defs.length - 1
      ? bandedTergiteGeometry(radii, center, 0.0, 700 + i)  // full dark tip
      : bandedTergiteGeometry(radii, center, d.band, 700 + i);
    const body = new THREE.Mesh(geom, materials.abdomen);
    body.name = `tergite_${i + 1}`;
    body.castShadow = true;
    body.receiveShadow = true;
    bone.add(body);
    if (i <= 3) {
      addEllipsoidSetae(bone, { radii, center, count: segments.abdomenSetae, seed: 400 + i, length: [.028, .055], material: materials.darkHair, reject: (p, n) => n.y < -0.82 });
    }
    parent = bone;
  }

  const terminal = new THREE.Bone();
  terminal.name = 'terminalia';
  terminal.position.set(defs[defs.length - 1].len * .56, -.08, 0);
  parent.add(terminal);
  bones[terminal.name] = terminal;
  const arch = ellipsoid({ radii: [.10, .08, .14], material: materials.terminalia, seg: segments.small, center: [.03, -.03, 0], name: 'male_genital_arch' });
  terminal.add(arch);
  // Paired surstyli merged into one draw (same bone, static).
  const claspGeoms = [-1, 1].map(s => {
    const g = new THREE.SphereGeometry(1, segments.small[0], segments.small[1]);
    g.scale(.055, .045, .040);
    g.translate(.08, -.06, s * .075);
    return g;
  });
  const claspMerged = mergeGeometries(claspGeoms, false);
  claspGeoms.forEach(g => g.dispose());
  const clasp = new THREE.Mesh(claspMerged, materials.terminalia);
  clasp.name = 'surstyli_pair';
  clasp.castShadow = true;
  terminal.add(clasp);
}

function addProboscis(headBone, bones, segments, materials) {
  const p = new THREE.Bone();
  p.name = 'proboscis';
  p.position.set(-.24, -.22, 0);
  p.rotation.z = -.18;
  headBone.add(p); bones[p.name] = p;
  const haustellum = ellipsoid({ radii: [.13, .07, .075], material: materials.proboscis, seg: segments.small, center: [-.07, -.04, 0], name: 'haustellum' });
  p.add(haustellum);
  // Paired labella merged into one draw (same bone, static).
  const labGeoms = [-1, 1].map(s => {
    const g = new THREE.SphereGeometry(1, segments.small[0], segments.small[1]);
    g.scale(.07, .045, .045);
    g.translate(-.16, -.075, s * .035);
    return g;
  });
  const labMerged = mergeGeometries(labGeoms, false);
  labGeoms.forEach(g => g.dispose());
  const lab = new THREE.Mesh(labMerged, materials.proboscisDark);
  lab.name = 'labella_pair';
  lab.castShadow = true;
  p.add(lab);
}

function storeRestPose(bones) {
  for (const bone of Object.values(bones)) {
    bone.userData.restQuaternion = bone.quaternion.toArray();
    bone.userData.restPosition = bone.position.toArray();
  }
}

function qTrack(bone, times, eulers) {
  const rest = new THREE.Quaternion().fromArray(bone.userData.restQuaternion);
  const values = [];
  for (const e of eulers) {
    const delta = new THREE.Quaternion().setFromEuler(new THREE.Euler(e[0] || 0, e[1] || 0, e[2] || 0, 'XYZ'));
    const q = rest.clone().multiply(delta).normalize();
    values.push(q.x, q.y, q.z, q.w);
  }
  return new THREE.QuaternionKeyframeTrack(`${bone.name}.quaternion`, times, values);
}

function makeIdleClip(bones) {
  const t = [0, .6, 1.2, 1.8, 2.4];
  const tracks = [];
  tracks.push(qTrack(bones.head, t, [[0, 0, 0], [0, .045, .018], [0, 0, 0], [0, -.04, -.015], [0, 0, 0]]));  // ±2.6° << ±15° yaw envelope
  tracks.push(qTrack(bones.antenna_L, t, [[0, 0, 0], [.03, .02, .01], [0, 0, 0], [-.02, -.015, 0], [0, 0, 0]]));
  tracks.push(qTrack(bones.antenna_R, t, [[0, 0, 0], [-.02, -.015, 0], [0, 0, 0], [.03, .02, .01], [0, 0, 0]]));
  tracks.push(qTrack(bones.arista_L, t, [[0, 0, 0], [.05, .03, .02], [0, 0, 0], [-.04, -.02, 0], [0, 0, 0]]));
  tracks.push(qTrack(bones.arista_R, t, [[0, 0, 0], [-.04, -.02, 0], [0, 0, 0], [.05, .03, -.02], [0, 0, 0]]));
  tracks.push(qTrack(bones.abdomen_3, t, [[0, 0, 0], [0, 0, .035], [0, 0, 0], [0, 0, -.028], [0, 0, 0]]));
  tracks.push(qTrack(bones.abdomen_5, t, [[0, 0, 0], [0, 0, .026], [0, 0, 0], [0, 0, -.020], [0, 0, 0]]));
  return new THREE.AnimationClip('idle', 2.4, tracks);
}

// Visual-readability wingbeat (slowed). Real kinematics for simulation live in
// fly.oscillators: ~200 Hz, haltere antiphase ~192°, amplitude/phase from the
// measured priors. See README "Use from your own Three.js app".
function makeFlightClip(bones) {
  const t = [0, .025, .05, .075, .10];
  const tracks = [];
  tracks.push(qTrack(bones.wing_L, t, [[0, 0, 0], [1.20, .18, .10], [0, 0, 0], [-1.05, -.14, -.08], [0, 0, 0]]));
  tracks.push(qTrack(bones.wing_R, t, [[0, 0, 0], [-1.20, .18, -.10], [0, 0, 0], [1.05, -.14, .08], [0, 0, 0]]));
  tracks.push(qTrack(bones.haltere_L, t, [[0, 0, 0], [-1.05, 0, 0], [0, 0, 0], [1.05, 0, 0], [0, 0, 0]]));  // antiphase to ipsilateral wing
  tracks.push(qTrack(bones.haltere_R, t, [[0, 0, 0], [1.05, 0, 0], [0, 0, 0], [-1.05, 0, 0], [0, 0, 0]]));
  tracks.push(qTrack(bones.abdomen_2, t, [[0, 0, 0], [0, 0, .018], [0, 0, 0], [0, 0, -.018], [0, 0, 0]]));
  return new THREE.AnimationClip('flight', .10, tracks);
}

function walkWave(phaseShift = 0, amp = .62) {
  const base = [0, 1, 0, -1, 0];
  if (!phaseShift) return base.map(v => v * amp);
  return [0, -1, 0, 1, 0].map(v => v * amp);
}

function makeWalkClip(bones) {
  const t = [0, .20, .40, .60, .80];
  const tracks = [];
  const tripodA = new Set(['FL', 'MR', 'HL']);
  for (const pos of ['F', 'M', 'H']) {
    for (const side of ['L', 'R']) {
      const code = `${pos}${side}`;
      const phase = tripodA.has(code) ? 0 : 1;
      const prefix = `leg_${code}`;
      const hip = walkWave(phase, pos === 'H' ? .34 : .42);
      const knee = walkWave(1 - phase, pos === 'F' ? .48 : .38).map((v, i) => Math.max(-.12, v));
      const ankle = walkWave(phase, .20);
      tracks.push(qTrack(bones[`${prefix}_coxa`], t, hip.map(a => [0, a * (side === 'L' ? 1 : -1), a * .18])));
      tracks.push(qTrack(bones[`${prefix}_femur`], t, knee.map(a => [a * .42, 0, a * (side === 'L' ? -.55 : .55)])));
      tracks.push(qTrack(bones[`${prefix}_tibia`], t, ankle.map(a => [a * .65, 0, 0])));
    }
  }
  return new THREE.AnimationClip('walk', .80, tracks);
}

function makeGroomClip(bones) {
  const t = [0, .35, .7, 1.05, 1.4];
  const tracks = [];
  for (const side of ['L', 'R']) {
    const s = side === 'L' ? 1 : -1;
    const p = `leg_F${side}`;
    tracks.push(qTrack(bones[`${p}_coxa`], t, [[0, 0, 0], [.15, -s * .55, s * .18], [.30, -s * .68, s * .22], [.12, -s * .48, s * .16], [0, 0, 0]]));
    tracks.push(qTrack(bones[`${p}_femur`], t, [[0, 0, 0], [.55, 0, -s * .42], [.78, 0, -s * .62], [.45, 0, -s * .35], [0, 0, 0]]));
    tracks.push(qTrack(bones[`${p}_tibia`], t, [[0, 0, 0], [-.48, 0, 0], [-.70, 0, 0], [-.40, 0, 0], [0, 0, 0]]));
  }
  tracks.push(qTrack(bones.arista_L, t, [[0, 0, 0], [.08, 0, .05], [-.06, 0, -.04], [.06, 0, .04], [0, 0, 0]]));
  tracks.push(qTrack(bones.arista_R, t, [[0, 0, 0], [-.08, 0, -.05], [.06, 0, .04], [-.06, 0, -.04], [0, 0, 0]]));
  return new THREE.AnimationClip('groom', 1.4, tracks);
}

export function createDrosophilaMale(options = {}) {
  const detailName = options.detail || 'hero';
  const seg = DETAIL[detailName] || DETAIL.hero;
  const bodyNoise = noiseTexture(1337, 96);
  const hexEye = hexEyeTexture(512, 30);
  const hexEyeColor = hexEyeColorTexture(512, 30);
  const mottle = mottleTexture(256, 913);

  // Photo-matched palette (honey-amber glossy cuticle, saturated red-orange
  // eyes, pearl iridescent wings). Shared bump map, few materials.
  const materials = {
    cuticle:      new THREE.MeshPhysicalMaterial({ color: 0x7c431a, map: mottle, roughness: .48, metalness: 0, clearcoat: .35, clearcoatRoughness: .38, bumpMap: bodyNoise, bumpScale: .014 }),
    cuticleLight: new THREE.MeshPhysicalMaterial({ color: 0x8a4e1e, map: mottle, roughness: .50, clearcoat: .30, clearcoatRoughness: .40, bumpMap: bodyNoise, bumpScale: .012 }),
    cuticleDark:  new THREE.MeshPhysicalMaterial({ color: 0x63391a, map: mottle, roughness: .55, clearcoat: .25, clearcoatRoughness: .42, bumpMap: bodyNoise, bumpScale: .010 }),
    leg:          new THREE.MeshPhysicalMaterial({ color: 0x85501f, map: mottle, roughness: .50, clearcoat: .30, clearcoatRoughness: .38, bumpMap: bodyNoise, bumpScale: .010 }),
    tarsus:       new THREE.MeshPhysicalMaterial({ color: 0x502e14, roughness: .55, clearcoat: .20, bumpMap: bodyNoise, bumpScale: .008 }),
    eye:          new THREE.MeshPhysicalMaterial({ color: 0xffffff, map: hexEyeColor, roughness: .26, metalness: 0, clearcoat: .95, clearcoatRoughness: .10, bumpMap: hexEye, bumpScale: .035 }),
    ocellus:      new THREE.MeshPhysicalMaterial({ color: 0x2c1712, roughness: .22, clearcoat: .7 }),
    darkHair:     new THREE.MeshStandardMaterial({ color: 0x3a2a1a, roughness: .62 }),
    wing:         new THREE.MeshPhysicalMaterial({ color: 0xcfd8da, roughness: .16, metalness: 0, transparent: true, opacity: .15, iridescence: .4, iridescenceIOR: 1.3, sheen: .5, sheenColor: new THREE.Color(0x9db8c8), side: THREE.DoubleSide, depthWrite: false }),
    wingVein:     new THREE.MeshStandardMaterial({ color: 0x8a6a42, roughness: .55, transparent: true, opacity: .6 }),
    haltere:      new THREE.MeshPhysicalMaterial({ color: 0xa86f33, roughness: .40, clearcoat: .5 }),
    abdomen:      new THREE.MeshPhysicalMaterial({ vertexColors: true, roughness: .48, metalness: 0, clearcoat: .40, clearcoatRoughness: .35, bumpMap: bodyNoise, bumpScale: .012 }),
    terminalia:   new THREE.MeshStandardMaterial({ color: 0x191009, roughness: .68, metalness: 0 }),
    proboscis:    new THREE.MeshStandardMaterial({ color: 0x7a4a20, roughness: .55 }),
    proboscisDark:new THREE.MeshStandardMaterial({ color: 0x523218, roughness: .60 }),
    sexComb:      new THREE.MeshStandardMaterial({ color: 0x17110f, roughness: .58 }),
  };
  // The scutellum blob already exists implicitly inside the thorax ellipsoid;
  // a separate glossy bump reads as a "second abdomen". Keep the named node
  // (rig consumers expect it) but make it flush with the thorax silhouette.
  materials.scutellumFlush = true;

  const group = new THREE.Group();
  group.name = 'Drosophila_melanogaster_male';
  group.rotation.z = 0;
  const bones = {};
  const rootBone = new THREE.Bone(); rootBone.name = 'fly_root'; group.add(rootBone); bones[rootBone.name] = rootBone;
  const thorax = new THREE.Bone(); thorax.name = 'thorax'; rootBone.add(thorax); bones[thorax.name] = thorax;

  const thoraxBody = ellipsoid({ radii: [.53, .43, .38], material: materials.cuticle, seg: seg.big, center: [0, 0, 0], name: 'thorax_cuticle' });
  thorax.add(thoraxBody);
  // Paired pleura merged into one draw (same bone, static).
  const pleuraGeoms = [1, -1].map(side => {
    const g = new THREE.SphereGeometry(1, seg.mid[0], seg.mid[1]);
    g.scale(.37, .27, .11);
    g.translate(.03, -.04, side * .34);
    return g;
  });
  const pleuraMerged = mergeGeometries(pleuraGeoms, false);
  pleuraGeoms.forEach(g => g.dispose());
  const pleura = new THREE.Mesh(pleuraMerged, materials.cuticleDark);
  pleura.name = 'pleura_pair';
  pleura.castShadow = true;
  thorax.add(pleura);
  addEllipsoidSetae(thorax, { radii: [.53, .43, .38], count: seg.bodySetae, seed: 22, length: [.03, .07], material: materials.darkHair, reject: (p, n) => p.y < -.28 || (Math.abs(p.z) > .31 && p.y < .05) });
  addThoracicMicro(thorax, seg.microRows, 5150, materials.darkHair);
  addScutellumAndMacrochaetae(thorax, seg, materials);

  const head = new THREE.Bone(); head.name = 'head'; head.position.set(-.64, .02, 0); thorax.add(head); bones[head.name] = head;
  const headBody = ellipsoid({ radii: [.39, .34, .36], material: materials.cuticleLight, seg: seg.big, center: [0, 0, 0], name: 'head_capsule' });
  head.add(headBody);
  addCompoundEye(head, 1, seg, materials); addCompoundEye(head, -1, seg, materials); addOcelli(head, seg, materials);
  addEyeSetae(head, 1, seg.eyeSetae, 6101, materials.darkHair);
  addEyeSetae(head, -1, seg.eyeSetae, 6102, materials.darkHair);
  addEllipsoidSetae(head, { radii: [.39, .34, .36], count: Math.round(seg.bodySetae * .3), seed: 44, length: [.025, .06], material: materials.darkHair, reject: (p, n) => Math.abs(p.z) > .23 && p.y < .25 && p.y > -.24 });
  addHeadBristles(head, materials);
  addAntenna(head, 1, bones, seg, materials); addAntenna(head, -1, bones, seg, materials);
  addProboscis(head, bones, seg, materials);

  addAbdomen(thorax, bones, seg, materials);
  addWing(thorax, 1, bones, seg, materials); addWing(thorax, -1, bones, seg, materials);
  addHaltere(thorax, 1, bones, seg, materials); addHaltere(thorax, -1, bones, seg, materials);

  let seed = 100;
  for (const pos of ['F', 'M', 'H']) {
    addLeg(thorax, pos, 1, bones, seg, materials, seed); seed += 10;
    addLeg(thorax, pos, -1, bones, seg, materials, seed); seed += 10;
  }

  storeRestPose(bones);
  group.updateMatrixWorld(true);
  const boneList = [];
  rootBone.traverse(o => { if (o.isBone) boneList.push(o); });
  const skeleton = new THREE.Skeleton(boneList);
  skeleton.calculateInverses();

  const clips = [makeIdleClip(bones), makeFlightClip(bones), makeWalkClip(bones), makeGroomClip(bones)];
  group.animations = clips;
  group.userData.species = 'Drosophila melanogaster';
  group.userData.sex = 'male';
  group.userData.model = {
    name: 'site-fly',
    revision: FLY_MODEL_REVISION,
    detail: detailName,
  };
  group.userData.scale = { units: 'mm', approximateBodyLength: 2.26, note: 'per-fly scale via group.scale; male mean, not species-universal' };
  group.userData.rig = {
    root: 'fly_root',
    jointNames: Object.keys(bones),
    sockets: {
      camera_focus: [0.1, 0, 0],
      wing_hinge_L: bones.wing_L.position.toArray(),
      wing_hinge_R: bones.wing_R.position.toArray(),
      proboscis: bones.proboscis.position.toArray(),
    },
    maleMarkers: ['rounded dark posterior abdomen', 'foreleg sex combs', 'male terminalia'],
  };
  // Measured priors (see evidence/scientific/). Grades: A = direct male data,
  // B = species data, C = Flybody female surrogate, D = engineering recommendation.
  group.userData.scientific = {
    sources: 'evidence/scientific/drosophila_male_rig_scientific_priors.json',
    scale: { bodyLengthMm: 2.26, wingLengthMm: 1.92, grade: 'A' },
    head: { yawSoftLimitDeg: 15, yawHardLimitDeg: 25, gainBandHz: '1-4', latencyMs: 10, grade: 'B' },
    antenna: { a1a2: 'active muscles', a2a3: 'passive spring/damper', arista: 'welded to A3', grade: 'B' },
    wing: {
      rootDoF: ['stroke', 'deviation', 'pitch'],
      internalActiveJoints: 0,
      wingbeatHzTypical: 200,
      measuredPostTakeoff: { hz: '222 ± 3.8', strokeDeg: '141 ± 2.9', pitchDeg: '113 ± 1.4' },
      leftRightPhaseDiffDeg: 5.63,
      grade: 'B',
    },
    haltere: { phaseToIpsilateralWingDeg: 192.14, strokeAmplitudeDeg: [140, 220], grade: 'B' },
    abdomen: { serialSegments: 6, perSegmentFlexDeg: [-8.59, 5.73], extremeTipDeg: 90, grade: 'B' },
    legs: { jointLimits: 'external_joint_limits_and_pivots.csv (Flybody female surrogate; simulator limits, not natural male pose envelope)', grade: 'C' },
  };
  group.userData.reference = {
    side: '/reference/side.png', dorsal: '/reference/dorsal.png',
    photoLateral: '/reference/photo_side_feeding.png',
    photoTop: '/reference/photo_top_aka.jpg',
    photoFront: '/reference/photo_front_aka.jpg',
    inference: 'ventral/rear surfaces reconstructed by bilateral/anatomical symmetry',
  };

  const stats = {
    revision: FLY_MODEL_REVISION,
    detail: detailName,
    bones: boneList.length,
    clips: clips.length,
    eyeFacetsApprox: '~800 ommatidia/eye (hex lattice map, literature count)',
    bodySetaeApprox: seg.bodySetae + Math.round(seg.bodySetae * .3) + seg.abdomenSetae * 6,
    maleMarkers: 3,
  };

  return {
    group, rootBone, thoraxBone: thorax, bones, skeleton, clips, materials, stats,
    // Drive these procedurally for biological-frequency flight (monitor-rate
    // clip playback cannot show a 200 Hz wingbeat).
    oscillators: {
      wingbeatHz: 200,
      wingStrokeAmplitudeDeg: 141,
      wingPitchAmplitudeDeg: 113,
      halterePhaseDeg: 192.14,
      haltereStrokeAmplitudeDeg: [140, 220],
    },
  };
}

export function resetPose(fly) {
  for (const bone of Object.values(fly.bones)) {
    if (!bone.userData.restQuaternion) continue;
    bone.quaternion.fromArray(bone.userData.restQuaternion);
    bone.position.fromArray(bone.userData.restPosition);
  }
  fly.group.updateMatrixWorld(true);
  fly.skeleton.update();
}
