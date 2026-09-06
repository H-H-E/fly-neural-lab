// Generic Shiu-model LIF over a CSR graph (BANC or synthetic).
// Constants match dist/reflex-engine.mjs.
export const DT = 1e-4, T_MBR = 0.02, TAU = 0.005;
export const V0 = -0.052, VTH = -0.045, RFC_TICKS = 22, DELAY_TICKS = 18;
export const W_SYN = 0.275e-3, F_POI = 250;

const EG = Math.exp(-DT / TAU), EV = Math.exp(-DT / T_MBR);
const L8 = V0 * (1 - EV), L10 = EV;
const L9 = (TAU / (T_MBR - TAU)) * (-Math.exp(DT / T_MBR) + Math.exp(DT / TAU)) * EV * EG;

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
    wt[p] = (preSign[src[k]] || 1) * count[k] * W_SYN;
  }
  return { off, dst: d, wt };
}

export class BancNet {
  constructor({ n, off, dst, wt }) {
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
  }

  static fromEdges({ n, src, dst, count, preSign }) {
    return new BancNet({ n, ...csrFromEdges(n, src, dst, count, preSign) });
  }

  static fromCSR(buf, preSign) {
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
      const sign = preSign[s] || 1;
      for (let p = off[s]; p < off[s + 1]; p++)
        wt[p] = sign * view.getFloat32(wOff + p * 4, true) * W_SYN;
    }
    return new BancNet({ n, off, dst, wt });
  }

  stimulate(idx, rateHz) { rateHz > 0 ? this.stim.set(idx, rateHz) : this.stim.delete(idx); }
  clearStim() { this.stim.clear(); }

  step(ticks) {
    const { v, g, deadline, off, dst, wt, ring, n } = this;
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
          const dslot = ring[this.tick % DELAY_TICKS];
          for (let p = off[i]; p < off[i + 1]; p++) dslot.push(dst[p], wt[p]);
        }
      }
      for (const [i, r] of this.stim) {
        if (Math.random() < r * DT) g[i] += W_SYN * F_POI;
      }
      this.spikes.push(fired);
      this.tick++; this.t += DT;
    }
    return this.spikes.splice(0);
  }

  motorRates(idxs, windowTicks) {
    const out = new Float32Array(idxs.length);
    const denom = Math.max(1, windowTicks) * DT;
    for (let k = 0; k < idxs.length; k++) out[k] = this.spikeCounts[idxs[k]] / denom;
    return out;
  }
}
