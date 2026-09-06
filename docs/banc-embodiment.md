# BANC embodiment (fast path)

Canonical loop: `proprio → BANC LIF → MN rates → kinematic hinges → Three.js bones`.
Neuron-for-neuron at the MN/sensory layer. No DN `forward/left/right` abstractions.

**v1 is kinematic full-body**, not MuJoCo and not a one-joint queue.
Physics (flybody / MuJoCo WASM) is optional and must not block this path.
`sexMismatch: male-morphology/female-CNS`.

## On disk

| Piece | Path |
|---|---|
| Channel LUT (805 MN + proprio) | `dist/banc-channels.json` (generated) |
| Generator | `brain-body/banc/mk_channel_lut.py` |
| Compact CSR (skip optic/glia) | `brain-body/banc/compact_csr.py` → `dist/banc-csr.bin` |
| Kinematic effector | `dist/effectors/kinematic.mjs` |
| Proprio encoder | `dist/sensors/proprio.mjs` |
| LIF engine (JS; WASM when em++ exists) | `dist/banc-engine.mjs` |
| Worker | `dist/banc-worker.mjs` |
| FlyWire overlay | `dist/brain-worker.mjs` (unchanged) |

## Generate

```text
brain-body/.venv/Scripts/python.exe brain-body/banc/mk_channel_lut.py
brain-body/.venv/Scripts/python.exe brain-body/banc/compact_csr.py
brain-body/.venv/Scripts/python.exe brain-body/banc/pack_banc.py
node validation/channels/lut_check.mjs
node validation/effectors/kinematic_check.mjs
node validation/sensors/proprio_check.mjs
node validation/banc/lif_smoke.mjs
node validation/banc/csr_check.mjs
node validation/reflexes/body_check.mjs
node validation/reflexes/tibia_check.mjs
```

`dist/banc-csr.bin` is generated, not committed. Packed gzip chunks in `dist/banc-data/`
(~13 MB) are committed and loaded by `banc-worker.mjs`. Kick still works if they are missing.

## Infidelity flags (do not silently "fix")

- LIF, not non-spiking VNC INs; no electrical synapses.
- Untyped FeCO (`tuning: untyped_chordotonal`) — id-hashed preferred angles, not claw/hook.
- DLM/DVM are a kinematic wing stub, not stretch-activated power muscles.
- Kinematic walking will not walk. Do not add a CPG to fake gait.
