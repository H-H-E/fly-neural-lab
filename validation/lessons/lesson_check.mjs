// Opening-lesson checks. Usage: node validation/lessons/lesson_check.mjs
import { readFileSync } from 'node:fs';
import { runNeuronExperiment, runTeachingCircuit } from '../../dist/neuron-model.mjs';

let fail = 0;
const check = (name, condition, detail = '') => {
  console.log(`${condition ? 'PASS' : 'FAIL'}  ${name} ${detail}`);
  if (!condition) fail++;
};

const singleWeak = runNeuronExperiment({ strength: 0.2, pattern: 'single' });
const singleStrong = runNeuronExperiment({ strength: 0.3, pattern: 'single' });
const close = runNeuronExperiment({ strength: 0.2, pattern: 'close' });
const spaced = runNeuronExperiment({ strength: 0.2, pattern: 'spaced' });
check('weak single pulse stays below threshold', singleWeak.spikes.length === 0);
check('strong single pulse crosses threshold', singleStrong.spikes.length > 0);
check('close timing changes the result', close.spikes.length > spaced.spikes.length);
check('inhibition is represented in the trace', runNeuronExperiment({ strength: 0.3, pattern: 'close', inhibition: true }).trace.some((point) => point.inhibition > 0));

const connected = runTeachingCircuit({ inhibition: true });
const disconnected = runTeachingCircuit({ inhibition: false });
check('circuit has four named nodes', Object.keys(connected.spikeCounts).length === 4);
check('disabling inhibition changes output', connected.spikeCounts.output !== disconnected.spikeCounts.output,
  `${connected.spikeCounts.output} vs ${disconnected.spikeCounts.output}`);

const lesson = readFileSync(new URL('../../dist/lesson.html', import.meta.url), 'utf8');
const taste = readFileSync(new URL('../../dist/taste.html', import.meta.url), 'utf8');
const reflex = readFileSync(new URL('../../dist/reflex.html', import.meta.url), 'utf8');
check('lesson exposes reset, step, replay, and save controls', ['neuron-reset', 'neuron-step', 'neuron-replay', 'save-experiment'].every((id) => lesson.includes(`id="${id}"`)));
check('taste page keeps named-cell claims gated', taste.includes('No named cell map is bundled yet.') && taste.includes('Cannot yet say'));
check('lesson pages expose three explanation depths', ['data-depth="start"', 'data-taste-depth="works"', 'data-reflex-depth="evidence"'].every((marker) => lesson.includes(marker) || taste.includes(marker) || reflex.includes(marker)));
check('reflex exposes causal counterfactuals', ['full', 'no-sensors', 'no-neural', 'passive'].every((id) => reflex.includes(`data-condition="${id}"`)));
check('reflex plots neural and passive torque separately', reflex.includes('neuralTorque') && reflex.includes('passiveTorque'));

process.exit(fail ? 1 : 0);
