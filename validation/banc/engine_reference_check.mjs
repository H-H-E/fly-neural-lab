import assert from 'node:assert/strict';
import { BancNet, DT, W_SYN } from '../../dist/banc-engine.mjs';

// A 2-cell fixture: cell 0 is inhibitory, cell 1 is the watched target.
const net = BancNet.fromEdges({
  n: 2,
  src: [0], dst: [1], count: [1], preSign: [-1, 1], seed: 7,
});
net.setWatch([0, 1]);
net.stimulate(0, 1 / DT); // deterministic external event on the first tick
const spikes = net.step(30);
assert.ok(spikes.some((tick) => tick.includes(0)), 'source should emit a spike');
assert.ok(net.wt[0] < 0 && Math.abs(net.wt[0] + W_SYN) < 1e-9, 'negative sign must remain inhibitory');
assert.ok(net.observe().events.some((event) => event.idx === 0 && Number.isFinite(event.time)));
assert.ok(net.observe().inputs.some((event) => event.idx === 0 && event.delivered));
assert.ok(net.observe().synapses.some((event) => event.src === 0 && event.arrivalTick - event.tick === 18));

// Explicit output intervention must block transmission without deleting source spikes.
const controlled = BancNet.fromEdges({
  n: 2, src: [0], dst: [1], count: [1], preSign: [1, 1], seed: 3,
});
controlled.setWatch([0, 1]);
controlled.blockOutputs([0]);
controlled.stimulate(0, 1 / DT);
controlled.step(30);
assert.ok(controlled.observe().events.some((event) => event.idx === 0));
assert.equal(controlled.observe().deliveredSynapses, 0);

// A zero sign is not an ablation and must not silently become excitation.
assert.throws(() => BancNet.fromEdges({
  n: 2, src: [0], dst: [1], count: [1], preSign: [0, 1], seed: 1,
}), /sign/i);

console.log(JSON.stringify({ ok: true, dt: DT, sourceEvents: net.observe().events.length }));
