// Synthetic 3-cell LIF smoke. Usage: node validation/banc/lif_smoke.mjs
import { BancNet, DT } from '../../dist/banc-engine.mjs';

let fail = 0;
const check = (name, cond, detail = '') => {
  console.log(`${cond ? 'PASS' : 'FAIL'}  ${name} ${detail}`);
  if (!cond) fail++;
};

// 0 excitatory → 1 excitatory → 2 (no outgoing). One synapse 0→1 weight +4*0.275mV
const net = BancNet.fromEdges({
  n: 3,
  src: [0],
  dst: [1],
  count: [40],
  preSign: [1, 1, 1],
});
let spikes = 0;
for (let t = 0; t < 2000; t++) for (const s of net.step(1)[0]) spikes += 1;
check('undriven silence', spikes === 0, `spikes=${spikes}`);

const net2 = BancNet.fromEdges({
  n: 3,
  src: [0],
  dst: [1],
  count: [40],
  preSign: [1, 1, 1],
});
net2.stimulate(0, 200);
let fired = 0, first = -1;
for (let t = 0; t < 2000; t++) {
  const sp = net2.step(1)[0];
  if (sp.includes(1) && first < 0) first = t;
  fired += sp.length;
}
check('driven cell produces spikes', fired > 0, `n=${fired}`);
check('postsynaptic cell 1 can fire', first >= 0, first >= 0 ? `${(first * DT * 1000).toFixed(1)} ms` : 'none');

const rates = net2.motorRates([0, 1], 2000);
check('motorRates length 2', rates.length === 2);
check('stimulated neuron has higher rate than silent', rates[0] > rates[1], `${rates[0].toFixed(1)} vs ${rates[1].toFixed(1)}`);

process.exit(fail ? 1 : 0);
