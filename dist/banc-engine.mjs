// Generic Shiu-model LIF over a CSR graph (BANC or synthetic).
// Constants match dist/reflex-engine.mjs.
import { RandomSource, cappedIds } from './experiment-core.mjs';

export const DT = 1e-4, T_MBR = 0.02, TAU = 0.005;
export const V0 = -0.052, VTH = -0.045, RFC_TICKS = 22, DELAY_TICKS = 18;
export const W_SYN = 0.275e-3, F_POI = 250;
export const MAX_WATCH = 64, MAX_WATCH_SPIKES = 4096;

const EG = Math.exp(-DT / TAU), EV = Math.exp(-DT / T_MBR);
const L8 = V0 * (1 - EV), L10 = EV;
const L9 = (TAU / (T_MBR - TAU)) * (-Math.exp(DT / T_MBR) + Math.exp(DT / TAU)) * EV * EG;

function synapseSign(preSign, source) {
  const sign = preSign[source];
  if (sign !== 1 && sign !== -1) {
    throw new Error(`invalid synapse sign for neuron ${source}: expected -1 or 1`);
  }
  return sign;
}

function csrFromEdges(n, src, dst, count, preSign) {
  const off = new Int32Array(n + 1);
  for (const s of src) off[s + 1]++;
  for (let i = 0; i < n; i++) off[i + 1] += off[i];
  const cur = Int32Array.from(off);
  const d = new Int32Array(src.length);
  const wt = new Float32Array(src.length);
  for (let k = 0; k < src.length; k++) {
    const p = cur[src[k]]++;
    d[p] = dst[k];
    wt[p] = synapseSign(preSign, src[k]) * count[k] * W_SYN;
  }
  return { off, dst: d, wt };
}

export class BancNet {
  constructor({ n, off, dst, wt, seed = null }) {
    this.n = n;
    this.tick = 0;
    this.t = 0;
    this.v = new Float64Array(n).fill(V0);
    this.g = new Float64Array(n);
    this.deadline = new Int32Array(n);
    this.off = off;
    this.dst = dst;
    this.wt = wt;
    this.ring = Array.from({ length: DELAY_TICKS }, () => []);
    this.spikes = [];
    this.spikeCounts = new Int32Array(n);
    this.stim = new Map();
    this.rng = new RandomSource(seed);
    this.watch = new Set();
    this.watchSpikes = [];
    this.watchEvents = [];
    this.inputEvents = [];
    this.synapseEvents = [];
    this.deliveredSynapses = 0;
    this.blockedOutputs = new Set();
    this.silent = new Set();
    this.blockedEdges = new Set();
  }

  static fromEdges({ n, src, dst, count, preSign, seed = null }) {
    return new BancNet({ n, ...csrFromEdges(n, src, dst, count, preSign), seed });
  }

  static fromCSR(buf, preSign, { seed = null } = {}) {
    const u8 = buf instanceof Uint8Array ? buf : new Uint8Array(buf);
    const magic = String.fromCharCode(...u8.subarray(0, 9));
    if (magic !== 'BANC CSR1') throw new Error(`bad CSR magic ${magic}`);
    const view = new DataView(u8.buffer, u8.byteOffset, u8.byteLength);
    const n = Number(view.getBigInt64(9, true));
    const ne = Number(view.getBigInt64(17, true));
    const off = new Int32Array(n + 1);
    for (let i = 0; i <= n; i++) off[i] = Number(view.getBigInt64(25 + i * 8, true));
    const dstOff = 25 + (n + 1) * 8;
    const dst = new Int32Array(ne);
    for (let i = 0; i < ne; i++) dst[i] = view.getInt32(dstOff + i * 4, true);
    const wOff = dstOff + ne * 4;
    const wt = new Float32Array(ne);
    for (let s = 0; s < n; s++) {
      const sign = synapseSign(preSign, s);
      for (let p = off[s]; p < off[s + 1]; p++) wt[p] = sign * view.getFloat32(wOff + p * 4, true) * W_SYN;
    }
    return new BancNet({ n, off, dst, wt, seed });
  }

  stimulate(idx, rateHz) { rateHz > 0 ? this.stim.set(idx, rateHz) : this.stim.delete(idx); }
  clearStim() { this.stim.clear(); }
  setSeed(seed = null) { this.rng.setSeed(seed); }
  setWatch(ids = []) { this.watch = new Set(cappedIds(ids, MAX_WATCH).filter((idx) => idx < this.n)); }
  blockOutputs(ids = []) { this.blockedOutputs = new Set(cappedIds(ids, this.n).filter((idx) => idx < this.n)); }
  silenceNeurons(ids = []) { this.silent = new Set(cappedIds(ids, this.n).filter((idx) => idx < this.n)); }
  blockEdges(edges = []) { this.blockedEdges = new Set(edges.map(([src, dst]) => `${src}:${dst}`)); }
  clearInterventions() { this.blockedOutputs.clear(); this.silent.clear(); this.blockedEdges.clear(); }

  observe() {
    return {
      spikes: this.watchSpikes.map((id) => id),
      events: this.watchEvents.map((event) => ({ ...event })),
      inputs: this.inputEvents.map((event) => ({ ...event })),
      synapses: this.synapseEvents.map((event) => ({ ...event })),
      deliveredSynapses: this.deliveredSynapses,
      neurons: [...this.watch].map((id) => ({ id, v: this.v[id], g: this.g[id], spikes: this.spikeCounts[id] })),
    };
  }

  reset({ seed = this.rng.seed } = {}) {
    this.tick = 0; this.t = 0;
    this.v.fill(V0); this.g.fill(0); this.deadline.fill(0);
    for (const slot of this.ring) slot.length = 0;
    this.spikes.length = 0; this.spikeCounts.fill(0); this.stim.clear();
    this.watchSpikes.length = 0; this.watchEvents.length = 0; this.inputEvents.length = 0;
    this.synapseEvents.length = 0;
    this.deliveredSynapses = 0; this.rng.reset(seed);
  }

  step(ticks, collect = true) {
    const { v, g, deadline, off, dst, wt, ring, n } = this;
    this.watchSpikes.length = 0;
    this.watchEvents.length = 0;
    this.inputEvents.length = 0;
    this.synapseEvents.length = 0;
    this.deliveredSynapses = 0;
    for (let s = 0; s < ticks; s++) {
      const slot = ring[this.tick % DELAY_TICKS];
      for (let k = 0; k < slot.length; k += 2) g[slot[k]] += slot[k + 1];
      slot.length = 0;
      const fired = collect ? [] : null;
      for (let i = 0; i < n; i++) {
        if (this.silent.has(i)) { v[i] = V0; g[i] = 0; continue; }
        const gv = g[i], vv = v[i];
        g[i] = EG * gv;
        v[i] = L8 + L9 * gv + L10 * vv;
        if (this.tick >= deadline[i] && v[i] > VTH) {
          v[i] = V0; g[i] = 0;
          deadline[i] = this.tick + RFC_TICKS;
          this.spikeCounts[i]++;
          if (fired) fired.push(i);
          if (this.watch.has(i)) {
            if (this.watchSpikes.length < MAX_WATCH_SPIKES) this.watchSpikes.push(i);
            this.watchEvents.push({ idx: i, tick: this.tick, time: this.t });
          }
          if (this.blockedOutputs.has(i)) continue;
          const dslot = ring[this.tick % DELAY_TICKS];
          for (let p = off[i]; p < off[i + 1]; p++) {
            if (this.blockedEdges.has(`${i}:${dst[p]}`)) continue;
            dslot.push(dst[p], wt[p]);
            this.synapseEvents.push({ src: i, dst: dst[p], tick: this.tick, time: this.t, arrivalTick: this.tick + DELAY_TICKS, arrivalTime: this.t + DELAY_TICKS * DT, weight: wt[p] });
            this.deliveredSynapses++;
          }
        }
      }
      for (const [i, r] of this.stim) {
        if (this.rng.next() < r * DT) {
          const amplitude = W_SYN * F_POI;
          g[i] += amplitude;
          this.inputEvents.push({ idx: i, tick: this.tick, time: this.t, rateHz: r, amplitude, delivered: true });
        }
      }
      if (fired) this.spikes.push(fired);
      this.tick++; this.t += DT;
    }
    return collect ? this.spikes.splice(0) : null;
  }

  motorRates(idxs, windowTicks) {
    const out = new Float32Array(idxs.length);
    const denom = Math.max(1, windowTicks) * DT;
    for (let k = 0; k < idxs.length; k++) out[k] = this.spikeCounts[idxs[k]] / denom;
    return out;
  }
}
