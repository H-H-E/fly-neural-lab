// Node check: MN rates flex vs extend a fake tibia bone.
// Usage: node validation/effectors/kinematic_check.mjs
import { readFileSync } from 'fs';
import { makeEffector, R_MAX } from '../../dist/effectors/kinematic.mjs';

const channels = JSON.parse(readFileSync(new URL('../../dist/banc-channels.json', import.meta.url)));
let fail = 0;
const check = (name, cond, detail = '') => {
  console.log(`${cond ? 'PASS' : 'FAIL'}  ${name} ${detail}`);
  if (!cond) fail++;
};

function fakeBone() {
  return {
    quaternion: { x: 0, y: 0, z: 0, w: 1 },
    userData: { restQuaternion: [0, 0, 0, 1] },
  };
}

const bones = {
  leg_FL_tibia: fakeBone(),
  leg_FR_tibia: fakeBone(),
  leg_FL_coxa: fakeBone(),
};
const effector = makeEffector(channels, bones);
const n = channels.motor.length;
const rates = new Float32Array(n);

const flexIdx = channels.motor
  .map((m, i) => ({ m, i }))
  .filter(({ m }) => m.bone === 'leg_FL_tibia' && /tibia_flexor/.test(m.target) && !/accessory/.test(m.target))
  .map(({ i }) => i);
const extIdx = channels.motor
  .map((m, i) => ({ m, i }))
  .filter(({ m }) => m.bone === 'leg_FL_tibia' && /tibia_extensor/.test(m.target))
  .map(({ i }) => i);
const contra = channels.motor
  .map((m, i) => ({ m, i }))
  .filter(({ m }) => m.bone === 'leg_FR_tibia' && /tibia_flexor/.test(m.target) && !/accessory/.test(m.target))
  .map(({ i }) => i);

check('flexor pool nonempty', flexIdx.length > 0, `n=${flexIdx.length}`);
check('extensor pool nonempty', extIdx.length > 0, `n=${extIdx.length}`);

for (const i of flexIdx) rates[i] = R_MAX;
for (let t = 0; t < 20; t++) effector.step(0.01, rates); // 200 ms
const qx = bones.leg_FL_tibia.quaternion.x;
check('flexor drive increases FL tibia x', qx > 0.2, `qx=${qx.toFixed(3)}`);
check('contralateral tibia stays near rest', Math.abs(bones.leg_FR_tibia.quaternion.x) < 0.05,
  `qx=${bones.leg_FR_tibia.quaternion.x.toFixed(3)}`);

rates.fill(0);
for (const i of extIdx) rates[i] = R_MAX;
for (let t = 0; t < 40; t++) effector.step(0.01, rates);
check('extensor drive reverses toward negative x', bones.leg_FL_tibia.quaternion.x < qx,
  `qx ${qx.toFixed(3)} → ${bones.leg_FL_tibia.quaternion.x.toFixed(3)}`);

rates.fill(0);
const ttm = channels.motor.map((m, i) => ({ m, i }))
  .filter(({ m }) => m.bone === 'leg_FL_coxa' && /tergotrochanter_extensor/.test(m.target))
  .map(({ i }) => i);
for (const i of ttm) rates[i] = R_MAX;
for (let t = 0; t < 20; t++) effector.step(0.01, rates);
check('tergotrochanter drives coxa y, not tibia',
  Math.abs(bones.leg_FL_coxa.quaternion.y) > 0.05,
  `coxa.y=${bones.leg_FL_coxa.quaternion.y.toFixed(3)} tibia.x=${bones.leg_FL_tibia.quaternion.x.toFixed(3)}`);

process.exit(fail ? 1 : 0);
