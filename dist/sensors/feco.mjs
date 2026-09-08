// Calibrated FeCO encoder. No identifier hash or implicit default angle is allowed.
export function encodeFeCO({ mode, angle, angularVelocity = 0, calibration } = {}) {
  if (!calibration) throw new Error('FeCO encoder requires calibration');
  if (!Number.isFinite(angle) || !Number.isFinite(angularVelocity)) throw new Error('FeCO state must be finite');
  if (mode === 'position') {
    const { preferredAngle, width, maxRateHz } = calibration;
    if (!(width > 0) || !(maxRateHz >= 0) || !Number.isFinite(preferredAngle)) throw new Error('invalid position calibration');
    return maxRateHz * Math.exp(-((angle - preferredAngle) ** 2) / (2 * width ** 2));
  }
  if (mode === 'direction') {
    const gain = calibration.gainHzPerRadPerSecond;
    if (!(gain >= 0) || !Number.isFinite(gain)) throw new Error('invalid direction calibration');
    const value = gain * angularVelocity;
    return calibration.positiveOnly ? Math.max(0, value) : value;
  }
  if (mode === 'limit') {
    const { minAngle, maxAngle, width, maxRateHz } = calibration;
    if (!(width > 0) || !(maxRateHz >= 0) || !Number.isFinite(minAngle) || !Number.isFinite(maxAngle)) throw new Error('invalid limit calibration');
    const distance = Math.min(Math.abs(angle - minAngle), Math.abs(maxAngle - angle));
    return distance < width ? maxRateHz * (1 - distance / width) : 0;
  }
  throw new Error(`unsupported FeCO mode: ${mode}`);
}

export function encodeSelectedFeCO(channels, state, calibrations) {
  return channels.map((channel) => encodeFeCO({
    mode: channel.mode,
    angle: state.q,
    angularVelocity: state.qdot,
    calibration: calibrations[channel.id],
  }));
}
