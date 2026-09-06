// Packed CSR step budget. Slack 80 ms for 50 ticks; do not treat as realtime gate.
// Usage: node validation/banc/budget_check.mjs
import { readFileSync } from 'fs';
import { gunzipSync } from 'zlib';
import { BancNet } from '../../dist/banc-engine.mjs';

const man = JSON.parse(readFileSync(new URL('../../dist/banc-manifest.json', import.meta.url)));
const parts = man.csrParts.map((p) => gunzipSync(readFileSync(new URL('../../dist/' + p.url, import.meta.url))));
const buf = new Uint8Array(man.csrBytes);
let o = 0;
for (const p of parts) { buf.set(p, o); o += p.length; }
const signBuf = gunzipSync(readFileSync(new URL('../../dist/' + man.sign.url, import.meta.url)));
const net = BancNet.fromCSR(buf, new Int8Array(signBuf.buffer, signBuf.byteOffset, signBuf.byteLength));
net.step(5, false); // warmup
const t0 = Date.now();
net.step(50, false);
const ms = Date.now() - t0;
const ok = ms < 80;
console.log(`${ok ? 'PASS' : 'FAIL'}  50 ticks in ${ms} ms (budget 80 ms)`);
process.exit(ok ? 0 : 1);
