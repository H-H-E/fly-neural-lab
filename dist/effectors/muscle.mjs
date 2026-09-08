// Spike-driven muscle activation and signed joint torque.
export class Muscle {
  constructor({ maxForce = 1, momentArm = 1, direction = 1, tau = 0.02, spikeGain = 0.1, lengthGain = 1, velocityGain = 0 } = {}) {
    if (!(maxForce >= 0) || !(momentArm >= 0) || !(tau > 0)) throw new Error('invalid muscle parameters');
    if (direction !== 1 && direction !== -1) throw new Error('muscle direction must be -1 or 1');
    this.maxForce = maxForce; this.momentArm = momentArm; this.direction = direction;
    this.tau = tau; this.spikeGain = spikeGain; this.lengthGain = lengthGain; this.velocityGain = velocityGain;
    this.activation = 0;
  }

  step({ spikes = 0, dt, length = 1, velocity = 0 } = {}) {
    if (!(dt > 0) || !Number.isFinite(dt)) throw new Error('muscle dt must be positive and finite');
    if (!(spikes >= 0) || !Number.isFinite(spikes)) throw new Error('muscle spikes must be nonnegative');
    const decay = Math.exp(-dt / this.tau);
    this.activation = Math.min(1, this.activation * decay + this.spikeGain * spikes * (1 - decay));
    const lengthFactor = Math.max(0, 1 - this.lengthGain * Math.abs(length - 1));
    const velocityFactor = Math.max(0, 1 - this.velocityGain * Math.abs(velocity));
    const force = this.maxForce * this.activation * lengthFactor * velocityFactor;
    return { activation: this.activation, force, torque: this.direction * this.momentArm * force };
  }

  reset() { this.activation = 0; }
}
