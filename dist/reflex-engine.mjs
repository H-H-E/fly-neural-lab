// Shiu-model LIF probe engine (front-leg tibia reflex subgraph).
// Constants replicate engine/code_objects parameters exactly:
// dt=0.1ms, t_mbr=20ms, tau_syn=5ms, v0=v_rst=-52mV, vth=-45mV,
// refractory 2.2ms, synaptic delay 1.8ms, w=sign*count*0.275mV.
// Not bit-parity with the fused WASM engine (ordering simplified); qualitative match.
import { RandomSource, cappedIds } from './experiment-core.mjs';

export const DT = 1e-4, T_MBR = 0.02, TAU = 0.005;
export const V0 = -0.052, VTH = -0.045, RFC_TICKS = 22, DELAY_TICKS = 18;
export const W_SYN = 0.275e-3, F_POI = 250;
export const MAX_WATCH = 64, MAX_WATCH_SPIKES = 4096;

const EG = Math.exp(-DT / TAU), EV = Math.exp(-DT / T_MBR);
const L8 = V0 * (1 - EV), L10 = EV;
const L9 = (TAU / (T_MBR - TAU)) * (-Math.exp(DT / T_MBR) + Math.exp(DT / TAU)) * EV * EG;

export class ReflexNet {
  constructor(graph, { seed = null } = {}) {
    const n = graph.meta.n_nodes;
    this.n = n; this.tick = 0; this.t = 0;
    this.v = new Float64Array(n).fill(V0);
    this.g = new Float64Array(n);
    this.deadline = new Int32Array(n);
    this.w = new Float32Array(graph.count.length);
    const sgn = graph.pre_sign;
    for (let k = 0; k < graph.count.length; k++)
      this.w[k] = sgn[graph.src[k]] * graph.count[k] * W_SYN;
    // CSR
    const off = new Int32Array(n + 1);
    for (const s of graph.src) off[s + 1]++;
    for (let i = 0; i < n; i++) off[i + 1] += off[i];
    const cur = Int32Array.from(off);
    this.dst = new Int32Array(graph.src.length);
    this.wt = new Float32Array(graph.src.length);
    for (let k = 0; k < graph.src.length; k++) {
      const p = cur[graph.src[k]]++;
      this.dst[p] = graph.dst[k]; this.wt[p] = this.w[k];
    }
    this.off = off;
    // delay ring: 18 slots of [dst, w] pairs
    this.ring = Array.from({ length: DELAY_TICKS }, () => []);
    this.spikes = [];           // per-tick spike lists (cleared by consumer)
    this.spikeCounts = new Int32Array(n);
    this.stim = new Map();      // idx -> rate Hz
    this.rng = new RandomSource(seed);
    this.watch = new Set();
    this.watchSpikes = [];
  }
  stimulate(idx, rateHz) { rateHz > 0 ? this.stim.set(idx, rateHz) : this.stim.delete(idx); }
  clearStim() { this.stim.clear(); }
  setSeed(seed = null) { this.rng.setSeed(seed); }
  setWatch(ids = []) {
    this.watch = new Set(cappedIds(ids, MAX_WATCH).filter((idx) => idx < this.n));
  }
  observe() {
    return {
      spikes: this.watchSpikes.map((id) => id),
      neurons: [...this.watch].map((id) => ({
        id,
        v: this.v[id],
        g: this.g[id],
        spikes: this.spikeCounts[id],
      })),
    };
  }
  reset({ seed = this.rng.seed } = {}) {
    this.tick = 0; this.t = 0;
    this.v.fill(V0); this.g.fill(0); this.deadline.fill(0);
    for (const slot of this.ring) slot.length = 0;
    this.spikes.length = 0; this.spikeCounts.fill(0); this.stim.clear();
    this.watchSpikes.length = 0; this.rng.reset(seed);
  }
  step(ticks) {
    const { v, g, deadline, off, dst, wt, ring, n } = this;
    this.watchSpikes.length = 0;
    for (let s = 0; s < ticks; s++) {
      const slot = ring[this.tick % DELAY_TICKS];
      for (let k = 0; k < slot.length; k += 2) g[slot[k]] += slot[k + 1];
      slot.length = 0;
      const fired = [];
      for (let i = 0; i < n; i++) {
        const gv = g[i], vv = v[i];
        g[i] = EG * gv;
        v[i] = L8 + L9 * gv + L10 * vv;
        if (this.tick >= deadline[i] && v[i] > VTH) {
          v[i] = V0; g[i] = 0;
          deadline[i] = this.tick + RFC_TICKS;
          fired.push(i); this.spikeCounts[i]++;
          if (this.watch.has(i) && this.watchSpikes.length < MAX_WATCH_SPIKES) this.watchSpikes.push(i);
          const dslot = ring[this.tick % DELAY_TICKS]; // just-emptied slot recurs in 18 ticks
          for (let p = off[i]; p < off[i + 1]; p++) { dslot.push(dst[p], wt[p]); }
        }
      }
      // Poisson drive applied as conductance kicks (Shiu PoissonInput equivalent)
      for (const [i, r] of this.stim) {
        if (this.rng.next() < r * DT) g[i] += W_SYN * F_POI;
      }
      this.spikes.push(fired);
      this.tick++; this.t += DT;
    }
    return this.spikes.splice(0);
  }
}
