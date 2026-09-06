// BANC worker: packed gzip CSR LIF. Falls back to mock MN rates if manifest missing.
import { BancNet } from './banc-engine.mjs';

let net = null, channels = null, running = false, timer = null, ticksPerChunk = 100;
const post = (type, data = {}) => self.postMessage({ type, ...data });

async function gunzip(url) {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`download failed ${url}`);
  return new Uint8Array(await new Response(response.body.pipeThrough(new DecompressionStream('gzip'))).arrayBuffer());
}

async function load() {
  try {
    channels = await (await fetch('./banc-channels.json')).json();
    post('channels', { nMotor: channels.motor.length, mapped: channels.meta.n_motor_mapped });
    const manRes = await fetch('./banc-manifest.json');
    if (!manRes.ok) {
      post('ready', { mode: 'mock', memoryMiB: 0, n: 0 });
      return;
    }
    const man = await manRes.json();
    const buf = new Uint8Array(man.csrBytes);
    let off = 0, done = 0;
    const total = man.csrParts.reduce((s, p) => s + p.bytes, 0);
    for (const part of man.csrParts) {
      const chunk = await gunzip('./' + part.url);
      buf.set(chunk, off);
      off += chunk.length;
      done += chunk.length;
      post('progress', { fraction: done / total, message: `Loading BANC cord · ${Math.round(100 * done / total)}%` });
    }
    const signBytes = await gunzip('./' + man.sign.url);
    const sign = new Int8Array(signBytes.buffer, signBytes.byteOffset, signBytes.byteLength);
    net = BancNet.fromCSR(buf, sign);
    post('ready', { mode: 'banc', memoryMiB: Math.round(buf.byteLength / 1048576), n: net.n });
  } catch (e) {
    post('error', { message: e.message || String(e) });
  }
}

function tick() {
  if (!running) return;
  const start = performance.now();
  let spikes = 0;
  const rates = new Float32Array(channels.motor.length);
  if (net) {
    const lists = net.step(ticksPerChunk);
    const hit = new Int32Array(net.n);
    for (const s of lists) {
      spikes += s.length;
      for (const i of s) hit[i]++;
    }
    const denom = ticksPerChunk * 1e-4;
    for (let i = 0; i < channels.motor.length; i++) {
      const id = channels.motor[i].idx;
      if (id >= 0) rates[i] = hit[id] / denom;
    }
  }
  const elapsed = performance.now() - start;
  post('sample', {
    time: net ? net.t : 0,
    spikes,
    speed: net ? (ticksPerChunk * 0.1 / Math.max(elapsed, 0.1)) : 0,
    rates,
    mode: net ? 'banc' : 'mock',
  });
  timer = setTimeout(tick, Math.max(0, 50 - elapsed));
}

self.onmessage = (e) => {
  const { type } = e.data;
  if (type === 'load') load();
  else if (type === 'run') {
    if (e.data.ticks > 0) ticksPerChunk = e.data.ticks | 0;
    running = true; tick();
  } else if (type === 'pause') { running = false; clearTimeout(timer); }
  else if (type === 'stim' && net) {
    net.clearStim();
    const stim = e.data.stim;
    if (stim) for (const [idx, hz] of stim) net.stimulate(idx | 0, hz);
  } else if (type === 'kick' && channels) {
    const rates = new Float32Array(channels.motor.length);
    const bone = e.data.bone || 'leg_FL_tibia';
    const want = e.data.target || 'tibia_flexor';
    channels.motor.forEach((m, i) => {
      if (m.bone === bone && (m.target || '').includes(want) && !(m.target || '').includes('accessory'))
        rates[i] = 200;
    });
    post('sample', { time: 0, spikes: 0, speed: 0, rates, mode: 'kick' });
  }
};
