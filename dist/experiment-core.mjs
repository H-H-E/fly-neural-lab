// Shared experiment utilities. These are deliberately tiny so the static app
// can use the same recording and reproducibility rules on every page.
export const EXPERIMENT_SCHEMA = 'fly-lab-experiment/v1';
export const RNG_VERSION = 'mulberry32-v1';

function asSeed(value) {
  if (value === null || value === undefined || value === '') return null;
  const n = Number(value);
  if (!Number.isFinite(n)) throw new Error('Seed must be a finite number.');
  return (Math.trunc(n) >>> 0);
}

export class RandomSource {
  constructor(seed = null) {
    this.seed = asSeed(seed);
    this.state = this.seed;
  }

  setSeed(seed = null) {
    this.seed = asSeed(seed);
    this.state = this.seed;
  }

  reset(seed = this.seed) {
    this.setSeed(seed);
  }

  next() {
    // A null seed deliberately preserves the engines' historical Math.random
    // behavior. Experiments pass a seed when replayability is required.
    if (this.state === null) return Math.random();
    let t = (this.state += 0x6D2B79F5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }
}

export function finiteNumber(value, fallback = 0) {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

export function cappedIds(ids, max = 64) {
  return [...new Set((ids || []).map(Number).filter((id) => Number.isInteger(id) && id >= 0))].slice(0, max);
}

export function makeRecorder(maxEvents = 2000) {
  const events = [];
  return {
    events,
    record(type, time, data = {}) {
      if (events.length >= maxEvents) events.shift();
      events.push({ type, time: finiteNumber(time), ...data });
    },
    clear() { events.length = 0; },
    snapshot() { return events.map((event) => ({ ...event })); },
  };
}

export function downloadJSON(filename, payload) {
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 0);
}
