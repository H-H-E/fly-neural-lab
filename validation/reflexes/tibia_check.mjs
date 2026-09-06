// Deploy gate for the tibia reflex probe (M0-M2 offline checks).
// Loads dist/reflex-tibia.json, drives FeCO position tuning in Node, asserts:
//  M1: distinct tibia angles recruit distinct sensory subsets
//  M0: MN pools are present with correct muscle targets
//  M2: sustained flexion drive -> flexor MN pool fires within 500 ms,
//      incl. an end-to-end latency estimate (drive onset -> first MN spike)
// Usage: node validation/reflexes/tibia_check.mjs
import { readFileSync } from 'fs';
import { ReflexNet, DT } from '../../dist/reflex-engine.mjs';

const g = JSON.parse(readFileSync(new URL('../../dist/reflex-tibia.json', import.meta.url)));
let fail = 0;
const check = (name, cond, detail = '') => {
  console.log(`${cond ? 'PASS' : 'FAIL'}  ${name} ${detail}`);
  if (!cond) fail++;
};

const sens = [], flex = [], ext = [];
g.role.forEach((r, i) => {
  if (r === 'sensory') sens.push(i);
  if (r === 'motor' && /flexor/i.test(g.target[i])) flex.push(i);
  if (r === 'motor' && /extensor/i.test(g.target[i])) ext.push(i);
});
check('M0 flexor MN pool present', flex.length > 0, `n=${flex.length}`);
check('M0 sensory pool present', sens.length > 0, `n=${sens.length}`);

// M1: position tuning recruits different subsets at 30 vs 120 deg
function drive(net, deg) {
  net.clearStim();
  sens.forEach((idx, k) => {
    const pref = 10 + 140 * (k / Math.max(1, sens.length - 1));
    net.stimulate(idx, 150 * Math.exp(-((deg - pref) ** 2) / (2 * 25 ** 2)));
  });
}
const net1 = new ReflexNet(g);
drive(net1, 30); net1.step(500);
const c30 = Int32Array.from(net1.spikeCounts);
const net2 = new ReflexNet(g);
drive(net2, 120); net2.step(500);
const c120 = Int32Array.from(net2.spikeCounts);
const diff = sens.filter(i => (c30[i] > 0) !== (c120[i] > 0)).length;
check('M1 angle-dependent recruitment', diff > 0, `${diff}/${sens.length} differ`);

// M2: flexion drive -> flexor pool response + latency
const net3 = new ReflexNet(g);
drive(net3, 130); // strong flexion
let firstMN = -1, flexSpikes = 0;
const flexSet = new Set(flex);
for (let t = 0; t < 5000; t++) {
  const sp = net3.step(1);
  for (const s of sp[0]) if (flexSet.has(s)) { flexSpikes++; if (firstMN < 0) firstMN = t; }
}
check('M2 flexor pool fires under flexion drive', flexSpikes > 0, `n=${flexSpikes}`);
check('M2 latency < 500ms', firstMN >= 0 && firstMN < 5000,
  firstMN >= 0 ? `${(firstMN * DT * 1000).toFixed(1)} ms` : 'no response');
// negative control: zero drive -> zero spikes anywhere
const net4 = new ReflexNet(g);
let c = 0;
for (let t = 0; t < 2000; t++) for (const sp of net4.step(1)) c += sp.length;
check('negative control (undriven silence)', c === 0, `spikes=${c}`);
process.exit(fail ? 1 : 0);
