import { encodeSelectedFeCO } from '../sensors/feco.mjs';

const CONDITIONS = new Set(['intact', 'sensory-transmission-cut', 'motor-to-muscle-cut', 'feedback-clamped', 'pathway-cut']);

export class TibiaResistanceExperiment {
  constructor({ net, hinge, sensory, sensoryCalibration, motorUnits, muscles, condition = 'intact', pathwayIds = [], feedbackClamp = null } = {}) {
    if (!net || !hinge) throw new Error('resistance experiment requires a network and hinge');
    if (!CONDITIONS.has(condition)) throw new Error(`unknown resistance condition: ${condition}`);
    this.net = net; this.hinge = hinge; this.sensory = sensory || []; this.sensoryCalibration = sensoryCalibration || {};
    this.motorUnits = motorUnits || []; this.muscles = muscles || {}; this.condition = condition;
    this.pathwayIds = pathwayIds; this.feedbackClamp = feedbackClamp; this.trace = []; this.clamped = false;
    this.initialState = { q: hinge.q, qdot: hinge.qdot };
    this.reset();
  }

  reset() {
    this.net.reset();
    this.net.clearInterventions();
    this.hinge.reset(this.initialState);
    for (const muscle of Object.values(this.muscles)) muscle.reset();
    this.trace.length = 0;
    this.baseline = { q: this.hinge.q, qdot: this.hinge.qdot };
    this.lastCounts = new Int32Array(this.net.n);
  }

  setCondition(condition) {
    if (!CONDITIONS.has(condition)) throw new Error(`unknown resistance condition: ${condition}`);
    this.condition = condition; this.reset();
  }

  setAngle(q, { clamp = true } = {}) { this.hinge.q = q; this.hinge.qdot = 0; this.clamped = clamp; }

  step({ dt = 0.001, neuralTicks = Math.max(1, Math.round(dt / 1e-4)), externalTorque = 0 } = {}) {
    const feedbackState = this.condition === 'feedback-clamped' && this.feedbackClamp
      ? this.feedbackClamp : { q: this.hinge.q, qdot: this.hinge.qdot };
    const rates = encodeSelectedFeCO(this.sensory, feedbackState, this.sensoryCalibration);
    this.net.clearStim();
    this.net.clearInterventions();
    if (this.condition === 'sensory-transmission-cut') this.net.blockOutputs(this.sensory.map((channel) => channel.idx));
    if (this.condition === 'pathway-cut') this.net.silenceNeurons(this.pathwayIds);
    this.sensory.forEach((channel, index) => this.net.stimulate(channel.idx, rates[index]));

    const before = this.lastCounts;
    this.net.step(neuralTicks);
    const observed = this.net.observe();
    const motorSpikes = this.motorUnits.reduce((sum, unit) => sum + this.net.spikeCounts[unit.idx] - before[unit.idx], 0);
    const sensorySet = new Set(this.sensory.map((channel) => channel.idx));
    const sensorySpikes = observed.events.filter((event) => sensorySet.has(event.idx)).length;
    const muscleState = {};
    let neuralTorque = 0;
    for (const unit of this.motorUnits) {
      const spikes = this.net.spikeCounts[unit.idx] - before[unit.idx];
      const muscle = this.muscles[unit.muscleId];
      if (!muscle) throw new Error(`missing muscle for motor unit ${unit.id}`);
      const result = muscle.step({ spikes, dt, length: 1, velocity: this.hinge.qdot });
      muscleState[unit.muscleId] = result;
      neuralTorque += result.torque;
    }
    if (this.condition === 'motor-to-muscle-cut') neuralTorque = 0;
    const state = this.clamped ? this.hinge.state() : this.hinge.step({ dt, neuralTorque, externalTorque });
    this.lastCounts = Int32Array.from(this.net.spikeCounts);
    const row = {
      tick: this.net.tick, time: this.net.t, q: state.q, qdot: state.qdot,
      requestedSensoryRates: [...rates], sensoryInputEvents: observed.inputs.length,
      sensorySpikes, motorSpikes, neuralTorque, passiveTorque: state.passiveTorque,
      externalTorque, totalTorque: state.totalTorque, deliveredSynapses: observed.deliveredSynapses,
      selectedEvents: observed.events, muscleState,
    };
    this.trace.push(row);
    return row;
  }
}
