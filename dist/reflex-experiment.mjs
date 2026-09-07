// The former reflex page's equations, separated from drawing and wall time.
import { ReflexNet, DT } from './reflex-engine.mjs';
import { EXPERIMENT_SCHEMA, RNG_VERSION } from './experiment-core.mjs';

export const REFLEX_CONDITIONS = Object.freeze({
  full: 'Full feedback', 'no-sensors': 'Sensors off',
  'no-neural': 'Motor output off', passive: 'Passive only',
});
const CHUNK = 10, WINDOW = 10, RAD = Math.PI / 180;
const REST = 70 * RAD, K_MUSC = 2e-4, K_SPR = 4e-5, C_DMP = 2e-5, INERT = 1e-6;
const boundedAngle = (deg) => Math.max(10, Math.min(150, deg));

export class ReflexExperiment {
  constructor(graph, { seed = 2026, condition = 'full', bend = 70 } = {}) {
    this.graph = graph;
    this.seed = seed >>> 0;
    this.condition = condition;
    this.initialBend = boundedAngle(bend);
    this.pools = { sensory: [], relay: [], flexor: [], extensor: [] };
    graph.role.forEach((role, id) => {
      if (role === 'sensory') this.pools.sensory.push(id);
      else if (role === 'motor') {
        if (/flexor/i.test(graph.target[id] || '')) this.pools.flexor.push(id);
        else if (/extensor/i.test(graph.target[id] || '')) this.pools.extensor.push(id);
      } else this.pools.relay.push(id);
    });
    this.poolSets = Object.fromEntries(Object.entries(this.pools).map(([k, ids]) => [k, new Set(ids)]));
    this.net = new ReflexNet(graph, { seed: this.seed });
    this.net.setWatch([...this.pools.sensory.slice(0, 20), ...this.pools.flexor.slice(0, 20), ...this.pools.extensor.slice(0, 20)]);
    this.reset();
  }

  reset() {
    this.net.reset({ seed: this.seed });
    this.theta = this.initialBend * RAD; this.omega = 0;
    this.chunks = 0; this.window = []; this.trace = []; this.events = [];
    this.replayEvents = null; this.replayEnd = 0;
    this.latest = { time: 0, angle: this.initialBend, neuralTorque: 0, passiveTorque: 0, totalTorque: 0, sensoryHz: 0, flexorHz: 0, extensorHz: 0 };
  }

  setCondition(condition) {
    if (!Object.hasOwn(REFLEX_CONDITIONS, condition)) return;
    this.condition = condition; this.reset();
  }

  bend(degrees, record = true) {
    this.theta = boundedAngle(degrees) * RAD; this.omega = 0;
    this.latest = { ...this.latest, angle: this.theta / RAD };
    if (record && this.events.length < 2000) this.events.push({ chunk: this.chunks, type: 'bend', degrees: this.theta / RAD });
  }

  perturb() { this.bend(this.theta / RAD + 20); }

  encode() {
    this.net.clearStim();
    if (['no-sensors', 'passive'].includes(this.condition)) return;
    const sensory = this.pools.sensory, deg = this.theta / RAD;
    const posN = Math.floor(sensory.length * .6), velN = Math.floor(sensory.length * .3);
    sensory.forEach((id, k) => {
      let hz;
      if (k < posN) {
        const pref = 10 + 140 * k / Math.max(1, posN - 1);
        hz = 150 * Math.exp(-((deg - pref) ** 2) / (2 * 25 ** 2));
      } else if (k < posN + velN) {
        hz = Math.max(0, ((k - posN) % 2 ? 1 : -1) * this.omega / RAD) * 2;
      } else {
        const near = Math.min(deg - 10, 150 - deg);
        hz = near < 15 ? 150 * (1 - Math.max(near, 0) / 15) : 0;
      }
      this.net.stimulate(id, hz);
    });
  }

  step() {
    if (this.replayEvents) {
      while (this.replayEvents.length && this.replayEvents[0].chunk <= this.chunks) this.bend(this.replayEvents.shift().degrees, false);
    }
    this.encode();
    const spikes = this.net.step(CHUNK), counts = { sensory: 0, relay: 0, flexor: 0, extensor: 0 };
    for (const tick of spikes) for (const id of tick) {
      for (const [pool, ids] of Object.entries(this.poolSets)) if (ids.has(id)) counts[pool]++;
    }
    this.window.push(counts); if (this.window.length > WINDOW) this.window.shift();
    const rate = (pool) => this.window.reduce((sum, row) => sum + row[pool], 0) / (Math.max(1, this.pools[pool].length) * WINDOW * CHUNK * DT);
    const flexorHz = rate('flexor'), extensorHz = rate('extensor');
    const neuralTorque = ['no-neural', 'passive'].includes(this.condition) ? 0 : K_MUSC * (flexorHz - extensorHz);
    const passiveTorque = -K_SPR * (this.theta - REST) - C_DMP * this.omega;
    const totalTorque = neuralTorque + passiveTorque;
    this.omega += totalTorque / INERT * CHUNK * DT;
    this.theta += this.omega * CHUNK * DT;
    if (this.theta < 10 * RAD || this.theta > 150 * RAD) { this.theta = boundedAngle(this.theta / RAD) * RAD; this.omega = 0; }
    this.chunks++;
    this.latest = { time: this.chunks * CHUNK * DT, angle: this.theta / RAD, neuralTorque, passiveTorque, totalTorque, flexorHz, extensorHz, sensoryHz: rate('sensory') };
    this.trace.push({ ...this.latest, observed: this.net.observe() });
    if (this.trace.length > 2000) this.trace.shift();
    return this.latest;
  }

  replay() {
    const events = this.events.map((event) => ({ ...event })), end = this.chunks;
    this.reset(); this.events = events; this.replayEvents = events.map((event) => ({ ...event })); this.replayEnd = end;
    return end > 0;
  }

  snapshot() {
    return {
      schema: EXPERIMENT_SCHEMA, lesson: 'tibia-evidence-lab', model: 'BANC v888 tibia subgraph · qualitative probe',
      graph: this.graph.meta, settings: { condition: this.condition, bendDegrees: this.initialBend, seed: this.seed },
      rng: { version: RNG_VERSION, seed: this.seed },
      assumptions: { sensoryGrouping: 'Illustrative 60% position / 30% velocity / remainder limit', body: 'Single-hinge spring-damper', interneurons: 'Generic LIF', electricalSynapses: false },
      trace: this.trace.map((row) => ({ ...row })), events: this.events.map((event) => ({ ...event })),
    };
  }
}
