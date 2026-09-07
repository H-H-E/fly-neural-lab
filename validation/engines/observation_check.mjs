// Observation/replay contract checks. Usage: node validation/engines/observation_check.mjs
import { readFileSync } from 'node:fs';
import { BancNet } from '../../dist/banc-engine.mjs';
import { ReflexNet } from '../../dist/reflex-engine.mjs';

let fail = 0;
const check = (name, condition, detail = '') => {
  console.log(`${condition ? 'PASS' : 'FAIL'}  ${name} ${detail}`);
  if (!condition) fail++;
};

const graph = {
  meta: { n_nodes: 3 }, src: [0], dst: [1], count: [40], pre_sign: [1, 1, 1],
};

function reflexTrace(seed) {
  const net = new ReflexNet(graph, { seed });
  net.setWatch([0, 1, 2, 3, 4]);
  net.stimulate(0, 200);
  const trace = [];
  for (let i = 0; i < 120; i++) {
    const spikes = net.step(10);
    const before = net.v[0];
    const observation = net.observe();
    trace.push({ spikes, observation, before });
  }
  return trace;
}

check('seeded reflex replay is identical', JSON.stringify(reflexTrace(42)) === JSON.stringify(reflexTrace(42)));
check('different seed can change stochastic trace', JSON.stringify(reflexTrace(42)) !== JSON.stringify(reflexTrace(43)));

const watchGraph = { meta: { n_nodes: 100 }, src: [], dst: [], count: [], pre_sign: new Array(100).fill(1) };
const observed = new ReflexNet(watchGraph, { seed: 42 });
observed.setWatch(Array.from({ length: 100 }, (_, i) => i));
observed.stimulate(0, 200);
observed.step(20);
const beforeObserve = { t: observed.t, v: observed.v[0], spikes: observed.spikeCounts[0] };
const snapshot = observed.observe();
const afterObserve = { t: observed.t, v: observed.v[0], spikes: observed.spikeCounts[0] };
check('watch list is capped', snapshot.neurons.length === 64);
check('observation is read-only', JSON.stringify(beforeObserve) === JSON.stringify(afterObserve));
observed.reset({ seed: 42 });
check('reset returns clock to zero', observed.t === 0 && observed.tick === 0);
check('reset clears spike counts', observed.spikeCounts.every((value) => value === 0));

const banc = BancNet.fromEdges({ n: 3, src: [0], dst: [1], count: [40], preSign: [1, 1, 1] });
banc.setWatch([0, 1]); banc.stimulate(0, 200); banc.step(20, false);
const bancObservation = banc.observe();
check('BANC exposes watched neuron state', bancObservation.neurons.length === 2 && 'v' in bancObservation.neurons[0]);
check('BANC observation spikes are bounded', bancObservation.spikes.length <= 4096);

const worker = readFileSync(new URL('../../dist/banc-worker.mjs', import.meta.url), 'utf8');
const brainWorker = readFileSync(new URL('../../dist/brain-worker.mjs', import.meta.url), 'utf8');
check('scientific BANC worker has no hidden rate fallback', !worker.includes('heldHz') && !worker.includes('if (heldDrive.size &&'));
check('BANC samples carry source and simulation dt', worker.includes('source: heldDrive.size') && worker.includes('dt: net ? ticksPerChunk * DT'));
check('FlyWire worker observes exported spike monitor only', brainWorker.includes('fly_spike_ids') && brainWorker.includes('observed'));

process.exit(fail ? 1 : 0);
