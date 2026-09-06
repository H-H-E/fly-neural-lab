// Tripod A and B coxae swing opposite. Usage: node validation/effectors/gait_check.mjs
import { makeGait, WALK_HZ } from '../../dist/effectors/gait.mjs';

let fail = 0;
const check = (name, cond, detail = '') => {
  console.log(`${cond ? 'PASS' : 'FAIL'}  ${name} ${detail}`);
  if (!cond) fail++;
};

function fakeBone(name) {
  return { name, quaternion: { x: 0, y: 0, z: 0, w: 1 }, userData: { restQuaternion: [0, 0, 0, 1] } };
}

const bones = {};
for (const pos of ['F', 'M', 'H']) {
  for (const side of ['L', 'R']) {
    for (const seg of ['coxa', 'femur', 'tibia']) {
      const n = `leg_${pos}${side}_${seg}`;
      bones[n] = fakeBone(n);
    }
  }
}
bones.antenna_L = fakeBone('antenna_L');
bones.antenna_R = fakeBone('antenna_R');
const group = { position: { x: 0, y: 1.2, z: 0 }, rotation: { y: Math.PI } };
const gait = makeGait(bones, group);
const dt = 1 / (WALK_HZ * 4); // quarter cycle
gait.step(dt);
const fl = bones.leg_FL_coxa.quaternion.y;
const fr = bones.leg_FR_coxa.quaternion.y;
check('tripod A vs B coxa yaw opposite', Math.sign(fl) !== Math.sign(fr) && Math.abs(fl) > 0.05,
  `FL y=${fl.toFixed(3)} FR y=${fr.toFixed(3)}`);
gait.step(dt * 2);
check('group moved from origin', Math.hypot(group.position.x, group.position.z) > 0.01,
  `xz=${Math.hypot(group.position.x, group.position.z).toFixed(3)}`);
const held = new Set(['leg_FL_tibia']);
const before = { ...bones.leg_FL_tibia.quaternion };
gait.step(dt, { hold: held });
check('held tibia not overwritten',
  bones.leg_FL_tibia.quaternion.x === before.x && bones.leg_FL_tibia.quaternion.y === before.y,
  `x=${bones.leg_FL_tibia.quaternion.x.toFixed(3)}`);

process.exit(fail ? 1 : 0);
