// M0/MX/MY on the full LUT + kinematic effector (no neural engine).
// Usage: node validation/reflexes/body_check.mjs
import { readFileSync } from 'fs';
import { makeEffector, R_MAX } from '../../dist/effectors/kinematic.mjs';

const channels = JSON.parse(readFileSync(new URL('../../dist/banc-channels.json', import.meta.url)));
let fail = 0;
const check = (name, cond, detail = '') => {
  console.log(`${cond ? 'PASS' : 'FAIL'}  ${name} ${detail}`);
  if (!cond) fail++;
};

function fakeBone() {
  return { quaternion: { x: 0, y: 0, z: 0, w: 1 }, userData: { restQuaternion: [0, 0, 0, 1] } };
}
const bones = {};
for (const m of channels.motor) if (m.bone && !bones[m.bone]) bones[m.bone] = fakeBone();

function drive(targetContains, bone, ms = 200) {
  const effector = makeEffector(channels, bones);
  const rates = new Float32Array(channels.motor.length);
  channels.motor.forEach((m, i) => {
    if (m.bone === bone && (m.target || '').includes(targetContains) && !(m.target || '').includes('accessory'))
      rates[i] = R_MAX;
  });
  for (let t = 0; t < ms / 10; t++) effector.step(0.01, rates);
}

drive('tibia_flexor', 'leg_FL_tibia');
check('M0 FL tibia flexes', bones.leg_FL_tibia.quaternion.x > 0.2,
  `x=${bones.leg_FL_tibia.quaternion.x.toFixed(3)}`);
check('M0 contralateral tibia quiet', Math.abs(bones.leg_FR_tibia.quaternion.x) < 0.05,
  `x=${bones.leg_FR_tibia.quaternion.x.toFixed(3)}`);

for (const b of Object.values(bones)) {
  b.quaternion.x = b.quaternion.y = b.quaternion.z = 0; b.quaternion.w = 1;
}
const rest = makeEffector(channels, bones);
const zero = new Float32Array(channels.motor.length);
for (let t = 0; t < 20; t++) rest.step(0.01, zero);
check('MX undriven rest', Object.values(bones).every((b) => Math.hypot(b.quaternion.x, b.quaternion.y, b.quaternion.z) < 1e-6));

drive('tergotrochanter_extensor', 'leg_FL_coxa');
check('MY tergotrochanter moves coxa y', Math.abs(bones.leg_FL_coxa.quaternion.y) > 0.05,
  `coxa.y=${bones.leg_FL_coxa.quaternion.y.toFixed(3)} tibia.x=${bones.leg_FL_tibia.quaternion.x.toFixed(3)}`);
check('MY tibia not the target', Math.abs(bones.leg_FL_tibia.quaternion.x) < 0.05,
  `tibia.x=${bones.leg_FL_tibia.quaternion.x.toFixed(3)}`);

process.exit(fail ? 1 : 0);
