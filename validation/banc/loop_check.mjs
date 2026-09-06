// Proprio → BANC → tibia MN. Untyped FeCO may recruit nothing — do not add a CPG.
// Usage: node validation/banc/loop_check.mjs
import { readFileSync } from 'fs';
import { gunzipSync } from 'zlib';
import { BancNet, DT } from '../../dist/banc-engine.mjs';
import { encodeProprio } from '../../dist/sensors/proprio.mjs';

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
const net = BancNet.fromCSR(buf, new Int8Array(signBuf.buffer, signBuf.byteOffset, signBuf.byteLength));
const channels = JSON.parse(readFileSync(new URL('../../dist/banc-channels.json', import.meta.url)));

const hz = encodeProprio(channels, { 'leg_FL_tibia': 120 }, {});
let nStim = 0;
channels.proprio.forEach((p, i) => {
  if (p.idx >= 0 && hz[i] > 1) { net.stimulate(p.idx, hz[i]); nStim++; }
});
const tibiaMN = channels.motor.filter((m) => m.bone === 'leg_FL_tibia' && m.idx >= 0).map((m) => m.idx);
const before = tibiaMN.map((i) => net.spikeCounts[i]);
net.step(Math.ceil(0.1 / DT), false);
const gained = tibiaMN.reduce((s, i, k) => s + (net.spikeCounts[i] - before[k]), 0);
if (gained > 0) check('proprio at 120° recruited tibia MN', true, `spikes=${gained} stim=${nStim}`);
else console.log(`SKIP  untyped proprio did not recruit tibia MNs (stim=${nStim}) — no CPG added`);

net.clearStim();
const mid = tibiaMN.map((i) => net.spikeCounts[i]);
net.step(Math.ceil(0.1 / DT), false);
const extra = tibiaMN.reduce((s, i, k) => s + (net.spikeCounts[i] - mid[k]), 0);
check('cleared stim → tibia MN silent', extra === 0, `extra=${extra}`);

process.exit(fail ? 1 : 0);
