// Small, inspectable LIF models used by the opening lesson.
// These are deliberately illustrative. The browser's full FlyWire model is
// a separate artifact and is not secretly represented by this circuit.
export const TEACHING_MODEL = Object.freeze({
  name: 'Illustrative leaky integrate-and-fire neuron',
  dtMs: 0.1,
  membraneTauMs: 20,
  synapseTauMs: 5,
  restingVoltageMv: -52,
  thresholdMv: -45,
  refractoryMs: 2.2,
  version: 'lif-teaching-v1',
});

const DT = TEACHING_MODEL.dtMs;
const E_G = Math.exp(-DT / TEACHING_MODEL.synapseTauMs);
const REFRACTORY_STEPS = Math.round(TEACHING_MODEL.refractoryMs / DT);

export class TeachingNeuron {
  constructor() { this.reset(); }

  reset() {
    this.v = TEACHING_MODEL.restingVoltageMv;
    this.excitatory = 0;
    this.inhibitory = 0;
    this.refractory = 0;
    this.spikeCount = 0;
  }

  step(excitatoryKick = 0, inhibitoryKick = 0) {
    this.excitatory += excitatoryKick;
    this.inhibitory += inhibitoryKick;
    this.excitatory *= E_G;
    this.inhibitory *= E_G;

    if (this.refractory > 0) {
      this.refractory -= 1;
      this.v = TEACHING_MODEL.restingVoltageMv;
      return false;
    }

    this.v += (TEACHING_MODEL.restingVoltageMv - this.v) * DT / TEACHING_MODEL.membraneTauMs;
    this.v += this.excitatory - this.inhibitory;
    if (this.v < -90) this.v = -90;

    if (this.v >= TEACHING_MODEL.thresholdMv) {
      this.v = TEACHING_MODEL.restingVoltageMv;
      this.excitatory = 0;
      this.inhibitory = 0;
      this.refractory = REFRACTORY_STEPS;
      this.spikeCount += 1;
      return true;
    }
    return false;
  }
}

function patternTimes(pattern) {
  if (pattern === 'close') return [60, 65, 70, 75];
  if (pattern === 'spaced') return [60, 120, 180, 240];
  return [60];
}

export function runNeuronExperiment({
  strength = 0.2,
  pattern = 'single',
  inhibition = false,
  durationMs = 320,
} = {}) {
  const neuron = new TeachingNeuron();
  const events = patternTimes(pattern);
  const trace = [];
  const steps = Math.round(durationMs / DT);
  for (let step = 0; step < steps; step++) {
    const time = +(step * DT).toFixed(4);
    const hasPulse = events.includes(time);
    const hasInhibition = inhibition && time === 75;
    const spike = neuron.step(hasPulse ? Number(strength) : 0, hasInhibition ? 0.2 : 0);
    trace.push({
      time,
      voltage: neuron.v,
      spike,
      input: hasPulse ? Number(strength) : 0,
      inhibition: hasInhibition ? 0.2 : 0,
    });
  }
  return {
    model: TEACHING_MODEL,
    pattern,
    strength: Number(strength),
    inhibition: !!inhibition,
    trace,
    spikes: trace.filter((point) => point.spike).map((point) => point.time),
  };
}

export const CIRCUIT_NODES = Object.freeze([
  { id: 'input', label: 'Input neuron', kind: 'input' },
  { id: 'relay', label: 'Relay neuron', kind: 'relay' },
  { id: 'inhibitory', label: 'Inhibitory branch', kind: 'inhibitory' },
  { id: 'output', label: 'Output neuron', kind: 'output' },
]);

export function runTeachingCircuit({ inhibition = true, durationMs = 320 } = {}) {
  const nodes = Object.fromEntries(CIRCUIT_NODES.map(({ id }) => [id, new TeachingNeuron()]));
  const trace = Object.fromEntries(CIRCUIT_NODES.map(({ id }) => [id, []]));
  const steps = Math.round(durationMs / DT);
  for (let step = 0; step < steps; step++) {
    const time = +(step * DT).toFixed(4);
    // Repeated input makes the relay/output difference visible without
    // implying this is a recovered Drosophila circuit.
    const inputKick = time >= 60 && time < 180 && ((step - 600) % 50 === 0) ? 0.2 : 0;
    const inputSpike = nodes.input.step(inputKick, 0);
    const relaySpike = nodes.relay.step(inputSpike ? 0.2 : 0, 0);
    const inhibitorySpike = nodes.inhibitory.step(inputSpike ? 0.1 : 0, 0);
    const outputSpike = nodes.output.step(
      relaySpike ? 0.2 : 0,
      inhibition && inhibitorySpike ? 0.1 : 0,
    );
    const fired = { input: inputSpike, relay: relaySpike, inhibitory: inhibitorySpike, output: outputSpike };
    for (const { id } of CIRCUIT_NODES) {
      trace[id].push({ time, voltage: nodes[id].v, spike: fired[id] });
    }
  }
  return {
    model: `${TEACHING_MODEL.version}/circuit-v1`,
    inhibition: !!inhibition,
    trace,
    spikeCounts: Object.fromEntries(CIRCUIT_NODES.map(({ id }) => [id, trace[id].filter((p) => p.spike).length])),
  };
}
