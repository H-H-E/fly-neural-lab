// DOM-free one-degree-of-freedom femur-tibia mechanics.
// q is radians; positive q is tibia extension.
export class TibiaHinge {
  constructor({ restAngle = 0, inertia = 1, stiffness = 0, damping = 0, q = restAngle, qdot = 0, minAngle = -Infinity, maxAngle = Infinity } = {}) {
    if (!(inertia > 0)) throw new Error('hinge inertia must be positive');
    this.restAngle = restAngle; this.inertia = inertia; this.stiffness = stiffness; this.damping = damping;
    this.q = q; this.qdot = qdot; this.minAngle = minAngle; this.maxAngle = maxAngle;
    this.last = { neuralTorque: 0, passiveTorque: 0, externalTorque: 0, totalTorque: 0 };
  }

  step({ dt, neuralTorque = 0, externalTorque = 0 } = {}) {
    if (!(dt > 0) || !Number.isFinite(dt)) throw new Error('hinge dt must be positive and finite');
    const passiveTorque = -this.stiffness * (this.q - this.restAngle) - this.damping * this.qdot;
    const totalTorque = neuralTorque + passiveTorque + externalTorque;
    this.qdot += (totalTorque / this.inertia) * dt;
    this.q += this.qdot * dt;
    if (this.q < this.minAngle) { this.q = this.minAngle; if (this.qdot < 0) this.qdot = 0; }
    if (this.q > this.maxAngle) { this.q = this.maxAngle; if (this.qdot > 0) this.qdot = 0; }
    this.last = { neuralTorque, passiveTorque, externalTorque, totalTorque };
    return this.state();
  }

  state() { return { q: this.q, qdot: this.qdot, ...this.last }; }
  reset({ q = this.restAngle, qdot = 0 } = {}) { this.q = q; this.qdot = qdot; }
}
