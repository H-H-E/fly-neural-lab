# BANC embodiment (fast path)

Canonical loop: `proprio → BANC LIF → MN rates → kinematic hinges → Three.js bones`.
Neuron-for-neuron at the MN/sensory layer. No DN `forward/left/right` abstractions.

**v1 done:** packed BANC LIF on the stage fly. **Stimulate tibia flexors** applies an explicit input to the extracted FL tibia-flexor pool and sends the emitted motor rate to the hinge. **Direct joint demo** is a separately labelled LUT bypass that skips the neurons. Untyped proprio does not close a reflex — Silence proprio is wired, no CPG added.

The home page keeps BANC and FlyWire state in separate panels. The walking clip is a visual introduction only; on the home page its timeline is set from BANC simulation time, and the BANC reset/pause controls do not silently continue neural state. The visible source annotation identifies whether motion comes from measured BANC output, the direct demo, or the kinematic walk visualization.

The shared experiment boundary is in `dist/experiment-core.mjs`: BANC observations are capped at 64 watched indices and 4,096 watched spike events per sample; seeded experiments use the versioned `mulberry32-v1` source. The optimized FlyWire WASM path remains spike-monitor-only because its untouched-neuron materialization rules are not exposed as a safe general voltage API.

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
| FlyWire overlay | `dist/brain-worker.mjs` (separate optional model) |

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
node validation/banc/stage_m0_check.mjs
node validation/banc/budget_check.mjs
node validation/banc/loop_check.mjs
node validation/reflexes/body_check.mjs
node validation/reflexes/tibia_check.mjs
node validation/engines/observation_check.mjs
node validation/lessons/lesson_check.mjs
```

`dist/banc-csr.bin` is generated, not committed. Packed gzip chunks in `dist/banc-data/`
(~13 MB) are committed and loaded by `banc-worker.mjs`. If they are missing, the scientific BANC control is disabled while the explicitly labelled direct-joint demo can still show the effector path.

## Infidelity flags (do not silently "fix")

- LIF, not non-spiking VNC INs; no electrical synapses.
- Untyped FeCO (`tuning: untyped_chordotonal`) — id-hashed preferred angles, not claw/hook.
- DLM/DVM are a kinematic wing stub, not stretch-activated power muscles.
- Kinematic walking will not walk. Do not add a CPG to fake gait.
