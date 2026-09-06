// Preferred-angle proprio encoding from BANC LUT. Not array-index Gaussians.
// Usage: node validation/sensors/proprio_check.mjs
import { readFileSync } from 'fs';
import { encodeProprio } from '../../dist/sensors/proprio.mjs';

const channels = JSON.parse(readFileSync(new URL('../../dist/banc-channels.json', import.meta.url)));
let fail = 0;
const check = (name, cond, detail = '') => {
  console.log(`${cond ? 'PASS' : 'FAIL'}  ${name} ${detail}`);
  if (!cond) fail++;
};

const pose30 = { 'leg_FL_tibia': 30 };
const pose120 = { 'leg_FL_tibia': 120 };
const h30 = encodeProprio(channels, pose30, {});
const h120 = encodeProprio(channels, pose120, {});
const fl = channels.proprio
  .map((p, i) => ({ p, i }))
  .filter(({ p }) => p.bones[0] === 'leg_FL_tibia' && p.encode === 'angle');
check('FL tibia angle proprioceptors exist', fl.length > 10, `n=${fl.length}`);
const fired30 = fl.filter(({ i }) => h30[i] > 20).map(({ i }) => i);
const fired120 = fl.filter(({ i }) => h120[i] > 20).map(({ i }) => i);
const only30 = fired30.filter((i) => !fired120.includes(i));
const only120 = fired120.filter((i) => !fired30.includes(i));
check('30° vs 120° recruit different IDs', only30.length > 0 && only120.length > 0,
  `only30=${only30.length} only120=${only120.length} both=${fired30.filter((i) => fired120.includes(i)).length}`);

const sameA = encodeProprio(channels, pose30, {});
const sameB = encodeProprio(channels, pose30, {});
check('id-stable (same pose → same rates)', sameA.every((v, i) => v === sameB[i]));

const lim = channels.proprio.findIndex((p) => p.encode === 'limit' && p.bones[0] === 'leg_FL_coxa');
check('limit encoder exists', lim >= 0);
const near = encodeProprio(channels, { 'leg_FL_coxa': 12 }, {});
const mid = encodeProprio(channels, { 'leg_FL_coxa': 80 }, {});
check('limit high near stop, low mid-range', near[lim] > 50 && mid[lim] < 10,
  `near=${near[lim].toFixed(1)} mid=${mid[lim].toFixed(1)}`);

process.exit(fail ? 1 : 0);
