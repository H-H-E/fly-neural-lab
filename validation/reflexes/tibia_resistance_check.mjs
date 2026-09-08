import assert from 'node:assert/strict';
import { BancNet } from '../../dist/banc-engine.mjs';
import { TibiaHinge } from '../../dist/physics/tibia-hinge.mjs';
import { Muscle } from '../../dist/effectors/muscle.mjs';
import { TibiaResistanceExperiment } from '../../dist/experiments/tibia-resistance.mjs';

function make(condition) {
  const net = BancNet.fromEdges({ n: 2, src: [0], dst: [1], count: [300], preSign: [1, 1], seed: 11 });
  return new TibiaResistanceExperiment({
    net,
    condition,
    hinge: new TibiaHinge({ restAngle: 0, inertia: 1, stiffness: 0, damping: 0, q: 0.2 }),
    sensory: [{ id: 's0', idx: 0, mode: 'position' }],
    sensoryCalibration: { s0: { preferredAngle: 0.2, width: 0.05, maxRateHz: 10000 } },
    motorUnits: [{ id: 'm0', idx: 1, muscleId: 'flexor' }],
    muscles: { flexor: new Muscle({ maxForce: 5, momentArm: 1, direction: -1, spikeGain: 1 }) },
  });
}

const intact = make('intact');
const first = intact.step({ dt: 0.001, neuralTicks: 10 });
assert.ok(first.sensoryInputEvents > 0, 'external input must be logged');
assert.ok(first.sensorySpikes >= 0);
assert.ok(first.motorSpikes >= 0);
assert.ok(Number.isFinite(first.q));
for (let i = 0; i < 4; i++) intact.step({ dt: 0.001, neuralTicks: 10 });
assert.ok(intact.trace.some((row) => row.motorSpikes > 0), 'fixture must transmit sensory drive to motor output');
assert.ok(intact.trace.some((row) => row.neuralTorque < 0), 'motor output must produce signed opposing torque');

const passive = make('motor-to-muscle-cut');
const passiveStart = passive.hinge.q;
for (let i = 0; i < 20; i++) passive.step({ dt: 0.001, neuralTicks: 10 });
assert.equal(passive.trace.every((row) => row.neuralTorque === 0), true);
assert.equal(passive.hinge.q, passiveStart, 'zero passive mechanics should not move without muscle torque');

const cut = make('sensory-transmission-cut');
const row = cut.step({ dt: 0.001, neuralTicks: 10 });
assert.ok(row.sensoryInputEvents > 0);
assert.equal(row.deliveredSynapses, 0, 'sensory transmission cut must block outgoing sensory synapses');

console.log(JSON.stringify({
  ok: true,
  intactMotorSpikes: intact.trace.reduce((sum, row) => sum + row.motorSpikes, 0),
  intactNeuralTorque: intact.trace.some((row) => row.neuralTorque < 0),
  passiveRows: passive.trace.length,
  cutDeliveredSynapses: row.deliveredSynapses,
}));
