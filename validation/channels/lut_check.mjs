// Deploy gate for BANC → Three.js channel LUT.
// Usage: node validation/channels/lut_check.mjs
import { readFileSync } from 'fs';

const c = JSON.parse(readFileSync(new URL('../../dist/banc-channels.json', import.meta.url)));
let fail = 0;
const check = (name, cond, detail = '') => {
  console.log(`${cond ? 'PASS' : 'FAIL'}  ${name} ${detail}`);
  if (!cond) fail++;
};

const bones = new Set([
  'leg_FL_coxa', 'leg_FL_femur', 'leg_FL_tibia', 'leg_FL_tarsus',
  'leg_FR_coxa', 'leg_FR_femur', 'leg_FR_tibia', 'leg_FR_tarsus',
  'leg_ML_coxa', 'leg_ML_femur', 'leg_ML_tibia', 'leg_ML_tarsus',
  'leg_MR_coxa', 'leg_MR_femur', 'leg_MR_tibia', 'leg_MR_tarsus',
  'leg_HL_coxa', 'leg_HL_femur', 'leg_HL_tibia', 'leg_HL_tarsus',
  'leg_HR_coxa', 'leg_HR_femur', 'leg_HR_tibia', 'leg_HR_tarsus',
  'wing_L', 'wing_R', 'head', 'proboscis',
  'antenna_L', 'antenna_R', 'haltere_L', 'haltere_R',
]);
const known = (b) => bones.has(b) || /^abdomen_[1-6]$/.test(b);

check('meta source', c.meta?.source === 'BANC v888 synapses_v2');
check('sexMismatch tagged', c.meta?.sexMismatch === 'male-morphology/female-CNS');
check('M0 motor count is 805', c.motor?.length === 805, `n=${c.motor?.length}`);

const mapped = (c.motor || []).filter((m) => m.bone);
check('mapped MNs >= 400', mapped.length >= 400, `n=${mapped.length}`);
const unknown = mapped.filter((m) => !known(m.bone));
check('mapped bones are rig names', unknown.length === 0, unknown.slice(0, 5).map((m) => m.bone).join(','));

const tibia = mapped.filter((m) => String(m.bone).endsWith('_tibia'));
check('tibia MNs >= 20', tibia.length >= 20, `n=${tibia.length}`);

const front = mapped.filter((m) => m.body_part === 'front_leg');
const sides = new Set(front.map((m) => m.side));
check('front_leg bilateral', sides.has('left') && sides.has('right'), [...sides].join(','));

const flex = mapped.filter((m) => /tibia_flexor/.test(m.target || '') && m.bone === 'leg_FL_tibia');
const ext = mapped.filter((m) => /tibia_extensor/.test(m.target || '') && m.bone === 'leg_FL_tibia');
check('FL tibia flexor vs extensor opposite sign',
  flex.length && ext.length && Math.sign(flex[0].sign) === -Math.sign(ext[0].sign),
  `flex=${flex[0]?.sign} ext=${ext[0]?.sign}`);

const ttm = mapped.filter((m) => /tergotrochanter_extensor/.test(m.target || ''));
check('tergotrochanter uses coxa y (not swallowed by trochanter_extensor)',
  ttm.length > 0 && ttm.every((m) => m.bone.endsWith('_coxa') && m.axis === 'y'),
  `n=${ttm.length} axis=${[...new Set(ttm.map((m) => m.axis))]}`);

check('unmapped MNs retained', (c.motor || []).some((m) => m.bone == null));
check('proprio present', (c.proprio || []).length > 0, `n=${c.proprio?.length}`);
const enc = new Set((c.proprio || []).map((p) => p.encode));
check('proprio has angle+velocity+limit', enc.has('angle') && enc.has('velocity') && enc.has('limit'), [...enc].join(','));

process.exit(fail ? 1 : 0);
