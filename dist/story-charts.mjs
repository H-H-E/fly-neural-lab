// Read-only plots. State lives in the experiments, never in a drawing callback.
export const COLORS = { lime: '#d8f788', coral: '#f49b80', blue: '#8ebfcc', text: '#a8b6b0', rule: '#34453e' };

export function plot(canvas, { points = [], series = [], xMax = 320, xLabel = 'ms', yMin = -55, yMax = -40, yLabel = 'mV', threshold = null, cursor = null } = {}) {
  if (!canvas) return;
  const w = Math.max(220, canvas.clientWidth || 360), h = Number(canvas.dataset.height || 150);
  const ratio = Math.min(devicePixelRatio || 1, 2);
  if (canvas.width !== Math.round(w * ratio) || canvas.height !== Math.round(h * ratio)) {
    canvas.width = Math.round(w * ratio); canvas.height = Math.round(h * ratio);
  }
  const c = canvas.getContext('2d');
  c.setTransform(ratio, 0, 0, ratio, 0, 0); c.clearRect(0, 0, w, h);
  const l = 36, r = w - 10, t = 14, b = h - 25;
  const x = (v) => l + (r - l) * v / Math.max(.001, xMax);
  const y = (v) => b - (b - t) * (v - yMin) / Math.max(.00001, yMax - yMin);
  c.font = '10px ui-monospace, monospace'; c.lineWidth = 1;
  for (let i = 0; i <= 2; i++) {
    const v = yMin + (yMax - yMin) * i / 2, yy = y(v);
    c.strokeStyle = COLORS.rule; c.beginPath(); c.moveTo(l, yy); c.lineTo(r, yy); c.stroke();
    c.fillStyle = COLORS.text; c.textAlign = 'right'; c.fillText(Math.abs(v) >= 1000 ? v.toExponential(0) : Number(v.toFixed(1)).toString(), l - 6, yy + 3);
  }
  c.textAlign = 'left'; c.fillText(yLabel, 0, 9); c.fillText('0', l, h - 7);
  c.textAlign = 'right'; c.fillText(`${Number(xMax.toFixed(2))} ${xLabel}`, r, h - 7);
  if (threshold !== null) {
    c.strokeStyle = COLORS.coral; c.setLineDash([3, 4]); c.beginPath(); c.moveTo(l, y(threshold)); c.lineTo(r, y(threshold)); c.stroke(); c.setLineDash([]);
    c.fillStyle = COLORS.coral; c.fillText('threshold', r - 3, y(threshold) - 5);
  }
  const stride = Math.max(1, Math.floor(points.length / 800));
  for (const { key, color = COLORS.lime } of series) {
    c.strokeStyle = color; c.lineWidth = 1.6; c.beginPath();
    for (let i = 0; i < points.length; i += stride) {
      const point = points[i], xx = x(point.time), yy = y(point[key]);
      i ? c.lineTo(xx, yy) : c.moveTo(xx, yy);
    }
    c.stroke();
  }
  if (cursor !== null) {
    c.strokeStyle = '#e9ebde66'; c.beginPath(); c.moveTo(x(cursor), t); c.lineTo(x(cursor), b); c.stroke();
  }
}

export function plotVoltage(canvas, trace = [], cursor = 0) {
  const points = trace.slice(0, Math.round(cursor / .1) + 1).map((p) => ({ ...p, voltage: p.spike ? -40 : p.voltage }));
  plot(canvas, { points, series: [{ key: 'voltage' }], cursor, threshold: -45, yMin: -60, yMax: -38 });
}

export function plotReflex(angleCanvas, torqueCanvas, trace) {
  const xMax = Math.max(.5, trace.at(-1)?.time || 0);
  plot(angleCanvas, { points: trace, series: [{ key: 'angle' }], xMax, xLabel: 's', yMin: 10, yMax: 150, yLabel: 'degrees' });
  const points = trace.map((p) => ({ time: p.time, neural: p.neuralTorque * 1e6, passive: p.passiveTorque * 1e6 }));
  const max = Math.max(10, ...points.flatMap((p) => [Math.abs(p.neural), Math.abs(p.passive)]));
  plot(torqueCanvas, { points, series: [{ key: 'neural', color: COLORS.coral }, { key: 'passive', color: COLORS.blue }], xMax, xLabel: 's', yMin: -max, yMax: max, yLabel: 'µN m' });
}
