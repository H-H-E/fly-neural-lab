import assert from 'node:assert/strict';
import { TibiaHinge } from '../../dist/physics/tibia-hinge.mjs';
import { Muscle } from '../../dist/effectors/muscle.mjs';
import { encodeFeCO } from '../../dist/sensors/feco.mjs';

const hinge = new TibiaHinge({ restAngle: 0, inertia: 1, stiffness: 2, damping: 0.4, q: 0.4 });
const before = hinge.state();
for (let i = 0; i < 100; i++) hinge.step({ dt: 0.001 });
assert.ok(hinge.q < before.q, 'passive hinge should recover toward rest');
assert.equal(hinge.last.neuralTorque, 0, 'passive recovery is not neural torque');

const flexor = new Muscle({ maxForce: 2, momentArm: 0.5, direction: -1, spikeGain: 0.2 });
const torque0 = flexor.step({ spikes: 0, dt: 0.001, length: 1, velocity: 0 }).torque;
const torque1 = flexor.step({ spikes: 3, dt: 0.001, length: 1, velocity: 0 }).torque;
assert.equal(Math.abs(torque0), 0);
assert.ok(torque1 < 0, 'flexor direction must produce signed opposing torque');

assert.throws(() => encodeFeCO({ mode: 'position', angle: 0, angularVelocity: 0 }), /calibrat/i);
const rate = encodeFeCO({ mode: 'position', angle: 0.3, angularVelocity: 0, calibration: { preferredAngle: 0.2, width: 0.1, maxRateHz: 100 } });
assert.ok(rate > 0 && rate <= 100);
const velocityRate = encodeFeCO({ mode: 'direction', angle: 0, angularVelocity: 2, calibration: { gainHzPerRadPerSecond: 10, positiveOnly: true } });
assert.ok(velocityRate === 20);

const coarse = new TibiaHinge({ restAngle: 0, inertia: 1, stiffness: 2, damping: 0.4, q: 0.4 });
const fine = new TibiaHinge({ restAngle: 0, inertia: 1, stiffness: 2, damping: 0.4, q: 0.4 });
for (let i = 0; i < 1000; i++) coarse.step({ dt: 0.001 });
for (let i = 0; i < 2000; i++) fine.step({ dt: 0.0005 });
assert.ok(Math.abs(coarse.q - fine.q) < 0.002, 'mechanical result must survive timestep refinement');

console.log(JSON.stringify({ ok: true, passiveAngle: hinge.q, muscleTorque: torque1, positionRate: rate }));
