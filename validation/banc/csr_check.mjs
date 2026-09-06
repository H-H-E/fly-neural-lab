// Load packed BANC CSR and assert a real flexor MN can fire.
// Usage: node validation/banc/csr_check.mjs
import { readFileSync, existsSync } from 'fs';
import { gunzipSync } from 'zlib';
import { BancNet } from '../../dist/banc-engine.mjs';

let fail = 0;
const check = (name, cond, detail = '') => {
  console.log(`${cond ? 'PASS' : 'FAIL'}  ${name} ${detail}`);
  if (!cond) fail++;
};

const manPath = new URL('../../dist/banc-manifest.json', import.meta.url);
check('manifest exists', existsSync(manPath), manPath.pathname);
if (fail) process.exit(1);

const man = JSON.parse(readFileSync(manPath, 'utf8'));
check('n matches compact', man.n > 80000 && man.n < 120000, `n=${man.n}`);
check('csr parts present', Array.isArray(man.csrParts) && man.csrParts.length > 0, `parts=${man.csrParts?.length}`);

const parts = [];
let total = 0;
for (const p of man.csrParts) {
  const gz = readFileSync(new URL('../../dist/' + p.url, import.meta.url));
  const raw = gunzipSync(gz);
  check(`part ${p.url} bytes`, raw.length === p.bytes, `${raw.length} vs ${p.bytes}`);
  parts.push(raw);
  total += raw.length;
}
check('concat size', total === man.csrBytes, `${total} vs ${man.csrBytes}`);
const buf = new Uint8Array(total);
let o = 0;
for (const p of parts) { buf.set(p, o); o += p.length; }

const signGz = readFileSync(new URL('../../dist/' + man.sign.url, import.meta.url));
const sign = new Int8Array(gunzipSync(signGz).buffer);
check('sign length', sign.length === man.n, `${sign.length} vs ${man.n}`);

const net = BancNet.fromCSR(buf, sign);
check('engine n', net.n === man.n, `${net.n}`);

let spikes = 0;
for (const s of net.step(50)) spikes += s.length;
check('undriven silence', spikes === 0, `spikes=${spikes}`);

const channels = JSON.parse(readFileSync(new URL('../../dist/banc-channels.json', import.meta.url)));
const flex = channels.motor.find((m) => m.bone === 'leg_FL_tibia' && /tibia_flexor/.test(m.target) && !/accessory/.test(m.target) && m.idx >= 0);
check('FL flexor has compact idx', !!flex, flex ? `idx=${flex.idx}` : '');
if (flex) {
  net.stimulate(flex.idx, 200);
  let first = -1, nFire = 0;
  for (let t = 0; t < 2000; t++) {
    const sp = net.step(1)[0];
    if (sp.includes(flex.idx)) { nFire++; if (first < 0) first = t; }
  }
  check('stimulated flexor MN fires', nFire > 0, first >= 0 ? `${(first * 0.1).toFixed(1)} ms n=${nFire}` : 'none');
}

process.exit(fail ? 1 : 0);
