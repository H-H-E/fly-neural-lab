// Net-driven M0: FL flexor spikes from BANC LIF flex the kinematic tibia.
// Rates must come from the net, not a hand-filled 200 Hz vector.
// Usage: node validation/banc/stage_m0_check.mjs
import { readFileSync } from 'fs';
import { gunzipSync } from 'zlib';
import { BancNet, DT } from '../../dist/banc-engine.mjs';
import { makeEffector } from '../../dist/effectors/kinematic.mjs';

let fail = 0;
const check = (name, cond, detail = '') => {
  console.log(`${cond ? 'PASS' : 'FAIL'}  ${name} ${detail}`);
  if (!cond) fail++;
};

const man = JSON.parse(readFileSync(new URL('../../dist/banc-manifest.json', import.meta.url)));
const parts = man.csrParts.map((p) => gunzipSync(readFileSync(new URL('../../dist/' + p.url, import.meta.url))));
const buf = new Uint8Array(man.csrBytes);
let o = 0;
for (const p of parts) { buf.set(p, o); o += p.length; }
const signBuf = gunzipSync(readFileSync(new URL('../../dist/' + man.sign.url, import.meta.url)));
const sign = new Int8Array(signBuf.buffer, signBuf.byteOffset, signBuf.byteLength);
const net = BancNet.fromCSR(buf, sign);
const channels = JSON.parse(readFileSync(new URL('../../dist/banc-channels.json', import.meta.url)));

function fakeBone() {
  return { quaternion: { x: 0, y: 0, z: 0, w: 1 }, userData: { restQuaternion: [0, 0, 0, 1] } };
}
const bones = { leg_FL_tibia: fakeBone(), leg_FR_tibia: fakeBone() };
const effector = makeEffector(channels, bones);

const flex = channels.motor.filter((m) =>
  m.bone === 'leg_FL_tibia' && /tibia_flexor/.test(m.target) && !/accessory/.test(m.target) && m.idx >= 0);
check('FL flexor pool in compact net', flex.length > 0, `n=${flex.length}`);
for (const m of flex) net.stimulate(m.idx, 200);

const motorIdx = channels.motor.map((m) => m.idx);
const rates = new Float32Array(channels.motor.length);
const chunk = 50;
const chunks = Math.ceil(0.2 / (chunk * DT)); // 200 ms sim
let maxFlexHz = 0;
for (let c = 0; c < chunks; c++) {
  const lists = net.step(chunk);
  const hit = new Int32Array(net.n);
  for (const s of lists) for (const i of s) hit[i]++;
  const denom = chunk * DT;
  for (let i = 0; i < rates.length; i++) {
    const id = motorIdx[i];
    rates[i] = id >= 0 ? hit[id] / denom : 0;
  }
  maxFlexHz = Math.max(maxFlexHz, ...flex.map((m) => {
    const i = channels.motor.indexOf(m);
    return rates[i];
  }));
  // 50 ticks = 5 ms
  effector.step(chunk * DT, rates);
}
check('net produced flexor rate > 0 (not LUT kick)', maxFlexHz > 5, `Hz=${maxFlexHz.toFixed(1)}`);
check('FL tibia flexed from net rates', bones.leg_FL_tibia.quaternion.x > 0.2,
  `qx=${bones.leg_FL_tibia.quaternion.x.toFixed(3)}`);
check('FR tibia quiet', Math.abs(bones.leg_FR_tibia.quaternion.x) < 0.05,
  `qx=${bones.leg_FR_tibia.quaternion.x.toFixed(3)}`);

process.exit(fail ? 1 : 0);
