// Kinematic first-order muscle: MN rates → hinge angle on flyRigged bones.
// rates[i] is Hz for channels.motor[i] (same order as the LUT).
export const R_MAX = 200;
export const TAU_MS = 20;
export const THETA_MAX = { tibia: 1.4, femur: 0.8, coxa: 0.6, tarsus: 0.5, default: 0.4 };

function thetaMaxFor(bone) {
  const seg = bone.split('_').pop();
  return THETA_MAX[seg] ?? THETA_MAX.default;
}

function quatMul(ax, ay, az, aw, bx, by, bz, bw) {
  return [
    aw * bx + ax * bw + ay * bz - az * by,
    aw * by - ax * bz + ay * bw + az * bx,
    aw * bz + ax * by - ay * bx + az * bw,
    aw * bw - ax * bx - ay * by - az * bz,
  ];
}

function restTimesAxis(rest, axis, angle) {
  const h = angle * 0.5, s = Math.sin(h), c = Math.cos(h);
  const d = axis === 'x' ? [s, 0, 0, c] : axis === 'y' ? [0, s, 0, c] : [0, 0, s, c];
  return quatMul(rest[0], rest[1], rest[2], rest[3], d[0], d[1], d[2], d[3]);
}

function writeQuat(bone, q) {
  if (typeof bone.quaternion.fromArray === 'function') bone.quaternion.fromArray(q);
  else {
    bone.quaternion.x = q[0];
    bone.quaternion.y = q[1];
    bone.quaternion.z = q[2];
    bone.quaternion.w = q[3];
  }
}

export function makeEffector(channels, bones) {
  const groups = new Map();
  channels.motor.forEach((m, i) => {
    if (!m.bone) return;
    const k = `${m.bone}|${m.axis}`;
    if (!groups.has(k)) groups.set(k, { bone: m.bone, axis: m.axis, members: [] });
    groups.get(k).members.push({ i, sign: m.sign, gain: m.gain });
  });
  const a = new Float32Array(channels.motor.length);
  const tau = TAU_MS / 1000;
  return {
    a,
    step(dt, rates) {
      const k = dt / tau;
      for (let i = 0; i < a.length; i++) {
        const target = Math.min(Math.max(rates[i] || 0, 0), R_MAX) / R_MAX;
        a[i] += (target - a[i]) * Math.min(1, k);
      }
      const angles = new Map(); // bone -> {x,y,z}
      for (const g of groups.values()) {
        if (!bones[g.bone]) continue;
        let u = 0;
        for (const m of g.members) u += m.sign * m.gain * a[m.i];
        const tmax = thetaMaxFor(g.bone);
        const theta = Math.max(-tmax, Math.min(tmax, u * tmax));
        const slot = angles.get(g.bone) || { x: 0, y: 0, z: 0 };
        slot[g.axis] = theta;
        angles.set(g.bone, slot);
      }
      for (const [name, slot] of angles) {
        const bone = bones[name];
        const rest = bone.userData?.restQuaternion || [0, 0, 0, 1];
        let q = rest;
        for (const axis of ['x', 'y', 'z']) {
          if (slot[axis]) q = restTimesAxis(q, axis, slot[axis]);
        }
        writeQuat(bone, q);
      }
    },
  };
}
