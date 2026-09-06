// Kinematic tripod gait + idle life. Not connectome-emergent walking.
export const WALK_HZ = 2.4;
const TRIPOD_A = new Set(['FL', 'MR', 'HL']);

function quatMul(ax, ay, az, aw, bx, by, bz, bw) {
  return [
    aw * bx + ax * bw + ay * bz - az * by,
    aw * by - ax * bz + ay * bw + az * bx,
    aw * bz + ax * by - ay * bx + az * bw,
    aw * bw - ax * bx - ay * by - az * bz,
  ];
}

function restTimesEuler(rest, x, y, z) {
  let q = rest;
  const add = (axis, angle) => {
    if (!angle) return;
    const h = angle * 0.5, s = Math.sin(h), c = Math.cos(h);
    const d = axis === 'x' ? [s, 0, 0, c] : axis === 'y' ? [0, s, 0, c] : [0, 0, s, c];
    q = quatMul(q[0], q[1], q[2], q[3], d[0], d[1], d[2], d[3]);
  };
  add('x', x); add('y', y); add('z', z);
  return q;
}

function writeQuat(bone, q) {
  if (typeof bone.quaternion.fromArray === 'function') bone.quaternion.fromArray(q);
  else {
    bone.quaternion.x = q[0]; bone.quaternion.y = q[1];
    bone.quaternion.z = q[2]; bone.quaternion.w = q[3];
  }
}

function restOf(bone) {
  return bone.userData?.restQuaternion || [0, 0, 0, 1];
}

export function makeGait(bones, group) {
  let t = 0;
  let heading = 0;
  const standY = group?.position.y ?? 1.15;
  return {
    t: () => t,
    heading: () => heading,
    step(dt, opts = {}) {
      const hold = opts.hold || new Set();
      t += dt;
      const w = WALK_HZ * Math.PI * 2;
      for (const pos of ['F', 'M', 'H']) {
        for (const side of ['L', 'R']) {
          const code = `${pos}${side}`;
          const phase = TRIPOD_A.has(code) ? 0 : Math.PI;
          const s = side === 'L' ? 1 : -1;
          const hip = Math.sin(w * t + phase);
          const lift = Math.max(0, Math.sin(w * t + phase + Math.PI / 2));
          const prefix = `leg_${code}`;
          const coxa = bones[`${prefix}_coxa`];
          const femur = bones[`${prefix}_femur`];
          const tibia = bones[`${prefix}_tibia`];
          if (coxa && !hold.has(coxa.name))
            writeQuat(coxa, restTimesEuler(restOf(coxa), 0.05 * lift, 0.38 * hip, 0.10 * hip * s));
          if (femur && !hold.has(femur.name))
            writeQuat(femur, restTimesEuler(restOf(femur), 0.22 * hip + 0.35 * lift, 0, -s * 0.28 * hip));
          if (tibia && !hold.has(tibia.name))
            writeQuat(tibia, restTimesEuler(restOf(tibia), 0.18 * hip - 0.25 * lift, 0, 0));
        }
      }
      const ant = 0.12 * Math.sin(w * t * 0.5);
      if (bones.antenna_L) writeQuat(bones.antenna_L, restTimesEuler(restOf(bones.antenna_L), 0, 0, ant));
      if (bones.antenna_R) writeQuat(bones.antenna_R, restTimesEuler(restOf(bones.antenna_R), 0, 0, -ant));
      if (bones.abdomen_2) writeQuat(bones.abdomen_2, restTimesEuler(restOf(bones.abdomen_2), 0.04 * Math.sin(w * t), 0, 0));
      if (bones.wing_L) writeQuat(bones.wing_L, restTimesEuler(restOf(bones.wing_L), 0.04 * Math.sin(w * t * 2), 0, 0.03));
      if (bones.wing_R) writeQuat(bones.wing_R, restTimesEuler(restOf(bones.wing_R), 0.04 * Math.sin(w * t * 2 + 0.2), 0, -0.03));
      if (group) {
        heading += 0.35 * dt;
        const r = 0.9;
        group.position.x = r * Math.sin(heading);
        group.position.z = r * Math.cos(heading) * 0.35;
        group.position.y = standY + 0.025 * Math.sin(w * t * 2);
        group.rotation.y = Math.PI + heading;
      }
    },
  };
}
