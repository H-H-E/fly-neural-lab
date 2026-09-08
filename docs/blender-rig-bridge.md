# Blender GLB → computational controller bridge

## Runtime

`story-scene.mjs` now awaits `loadBlenderFly()` rather than merely preloading the GLB. The 1,593,820-byte `fly_refined.glb` supplies every rendered fly mesh in WebGL. The old low-detail procedural body is used only for no-WebGL fallback (and constructed temporarily to obtain the canonical controller rig, then its geometry/materials/textures are disposed).

The bridge retains the existing 43 canonical bones, local axes, rest poses, sensors and four authored clips. It reads each GLB shell's ancestor from the glTF skin's joint indices and parser associations, not ambiguous mesh/bone display names. Blender's bone roll is deliberately not copied into the controller.

For each rigid shell:

`local = inverse(canonicalBoneRestWorld) × diag(1,1,-1) × importedMeshRestWorld`

The reflection reverses the existing proxy/export coordinate conversion. The shell becomes a child of the matching controller bone with that exact local matrix. No skin-weight approximation, neural gain change, surrogate motor rates, or new gait generator is introduced.

## Computational path

1. `banc-worker.mjs`: actual BANC v888 LIF motor spike-count deltas / model-time interval.
2. `story-labs.mjs`: sample arrives; reset canonical pose, step the existing first-order effector using elapsed model time.
3. `effectors/kinematic.mjs`: pool signed motor rates by bone/axis and write canonical quaternions.
4. Blender shells inherit those transforms. The existing proprioceptive readout still reads the same controller bones.

The smaller BANC-derived reflex experiment writes its computed joint angle into the same controller tibia. Manual Bend and Direct joint demo remain explicitly distinct from neural evidence. The authored walking preview is off during neural experiments.

The FlyWire whole-brain worker remains independent: aggregate spikes are **not** used to invent a body command. A validated brain-to-body mapping is still absent. The male morphology/female CNS mismatch is disclosed in model metadata and UI. Sensor tuning, muscle gains and joint dynamics remain assumptions, not fitted physiology.

## Materials

`blenderMaterials.mjs` restores the source node graph's linear-RGB colors, abdominal banding and corneal height/color semantics. These are portable approximations of passes 11–12, **not a Cycles texture bake**. Unsupported procedural noise is omitted. The original GLB bytes are unchanged.

## Verification

Run:

- `python validation/model/browser_check.py`
- `python validation/model/fallback_check.py`
- `node validation/channels/lut_check.mjs`
- `node validation/effectors/kinematic_check.mjs`
- `node validation/sensors/proprio_check.mjs`
- `node validation/reflexes/body_check.mjs`
- `node validation/reflexes/experiment_check.mjs`
- `node validation/banc/stage_m0_check.mjs`
- `node validation/engines/observation_check.mjs`
- `node validation/lessons/lesson_check.mjs`

For a deployment: `FLYLAB_BASE=https://fly-neural-lab.vercel.app/ FLYLAB_EVIDENCE=evidence/rig-bridge/production python validation/model/browser_check.py`.

Local browser results:

- 119 render meshes (113 glTF mesh definitions, some split by material), all sourced from GLB; 39 directly bound bones; all 43 canonical bones retained.
- No missing mapped motor-channel bone. Existing LUT: 764 mapped of 805 motor rows; unmapped rows remain unmapped.
- Sampled world-rest geometry error < 7e-16 model units; maximum canonical/imported bone-head mismatch < 5e-7.
- Every bone with geometry descendants moves them; unrelated shells remain fixed; neutral reset has no measured drift. Terminalia and both haltere bones have no geometry descendants in this source asset; retaining their controller bones does not manufacture missing anatomy.
- Synthetic effector test and authored clip tests pass separately from the real BANC worker proof.
- Real browser BANC run: positive emitted motor spikes (peak 6 per observed 5 ms sample), Blender front-left foot displacement > 0.45 model units, walking off. These are software-model measurements, not biological validation.
- WebGL home scene: 125 draw calls, 64,016 triangles (includes scene decorations).
- Mobile-width WebGL, reduced motion, no-WebGL procedural fallback, missing-GLB text fallback, and learning controls pass.
- Existing `qa_flylab.py` small-experiment/route/mobile regression passes.

Screenshots and raw browser readouts are under `evidence/rig-bridge/`. Physical-phone frame rate and real-time neural performance are not established by headless Chromium/SwiftShader runs.
