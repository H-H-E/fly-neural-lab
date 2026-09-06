// Id-stable proprioceptive rates from BANC channel LUT.
// poseDeg[bone] = joint angle in degrees (0 = rest). omegaDeg[bone] = deg/s.

function prefDeg(id) {
  let h = 2166136261;
  for (let i = 0; i < id.length; i++) h = Math.imul(h ^ id.charCodeAt(i), 16777619);
  return 10 + ((h >>> 0) % 140);
}

export function encodeProprio(channels, poseDeg = {}, omegaDeg = {}) {
  const hz = new Float32Array(channels.proprio.length);
  for (let i = 0; i < channels.proprio.length; i++) {
    const p = channels.proprio[i];
    const bone = p.bones[0];
    const deg = poseDeg[bone] ?? 70;
    const w = omegaDeg[bone] ?? 0;
    if (p.encode === 'angle') {
      const pref = prefDeg(p.id);
      hz[i] = 150 * Math.exp(-((deg - pref) ** 2) / (2 * 25 ** 2));
    } else if (p.encode === 'velocity') {
      const dir = (p.side === 'right') ? -1 : 1;
      hz[i] = Math.max(0, dir * w) * 2;
    } else if (p.encode === 'limit') {
      const near = Math.min(deg - 10, 150 - deg);
      hz[i] = near < 15 ? 150 * (1 - Math.max(near, 0) / 15) : 0;
    }
  }
  return hz;
}

export function poseFromBones(bones) {
  const pose = {}, omega = {};
  for (const [name, bone] of Object.entries(bones)) {
    const rest = bone.userData?.restQuaternion;
    if (!rest || !bone.quaternion) continue;
    const q = bone.quaternion;
    const rx = rest[0], ry = rest[1], rz = rest[2], rw = rest[3];
    // relative = rest^{-1} * q
    const ix = -rx, iy = -ry, iz = -rz, iw = rw;
    const x = iw * q.x + ix * q.w + iy * q.z - iz * q.y;
    const y = iw * q.y - ix * q.z + iy * q.w + iz * q.x;
    const z = iw * q.z + ix * q.y - iy * q.x + iz * q.w;
    const w = iw * q.w - ix * q.x - iy * q.y - iz * q.z;
    pose[name] = (2 * Math.atan2(Math.hypot(x, y, z), w) * 180) / Math.PI;
    omega[name] = 0;
  }
  return { pose, omega };
}
