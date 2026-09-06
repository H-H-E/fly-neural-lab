# Fly Lab

Browser-local FlyWire v783 neural simulation in WebAssembly, with a Three.js rigged anatomical male fly and aggregate neural-activity display. No model inference server is used. Load the model explicitly, start/pause, and switch sugar stimulation on/off.

This is a neural simulation prototype, not validated motor embodiment. The fly body plays an idle animation (head, antennae, abdomen micro-motion; wings/legs are rig-addressable for future work). Its glow represents aggregate activity at the head, not a biological mapping of circuit anatomy.

## The rigged body

The stage fly is a procedural, photo-matched **rigged male Drosophila melanogaster** (`dist/fly-model/flyRigged.mjs`, 43 bones, 4 AnimationClips, hex-bump compound eyes, vertex-color banded abdomen, merged venation/bristle geometry). It renders in ~110 draw calls / ~38k triangles and replaces the earlier oval schematic; if its module fails to load, the app falls back to the schematic automatically. Direct joint access for future motor work: `fly.bones['leg_FL_femur'].rotation.z = -0.4`, wing roots `fly.bones.wing_L/R`, clip switching via `fly.clips` (idle/flight/walk/groom). Scientific priors (male scale 2.26 mm, wingbeat ~200 Hz, haltere antiphase 192°, head yaw ±15°) are embedded in `group.userData.scientific`.

## Implementation

138,639 neurons; 15,091,983 weighted connection rows. Female connectome from eonsystemspbc/fly-brain at commit a3db62f9436074e485c0278290c2164ed6150808. Generated Brian2 code uses double precision, original 0.1 ms steps, integer refractory deadlines, a shared untouched-state recurrence, and fused sparse integration/threshold detection. Untouched neurons activate before any synaptic/Poisson access. Touched neurons are never pruned. Sparse emission order remains ascending; delayed synapse/reset ordering is preserved.

The Web Worker advances 500 ticks (50 ms) at a time. Rendering runs independently on the main thread. Delays and neural state persist between calls. Only spike recording vectors are cleared between chunks to bound logging memory. Stimulation changes are applied between chunks. Pausing preserves state. No SharedArrayBuffer or pthread requirement. Large network memory makes desktop browsers the initial target; mobile compatibility has not been verified.

Download is approximately 53.9 MB compressed, expanding to approximately 241.5 MB of initialization arrays. Loaded runtime state takes additional memory. Assets are gzip chunks decoded with DecompressionStream; serve .gz bytes without adding Content-Encoding:gzip because the worker performs decompression explicitly.

## Validation

- Native sparse fused model: ten simulated seconds in 4.5786 seconds of integration; all 169,513 spikes and final voltage, synaptic state, last-spike times and refractory flags identical to previous sparse implementation.
- Emscripten 6.0.9 batch build in Node WebAssembly: ten simulated seconds in 5.76768 seconds of integration (9.06461 seconds whole executable). Raw spike and state files match native bit-for-bit.
- Live stepping in Node: 200 separate 50 ms updates complete in 5.67871 seconds and reproduce the same complete ten-second trace and final states bit-for-bit. Floating-point reported network time is 10.000000000000007 seconds; spike times remain exactly equal.
- On/off stimulation smoke test is in controls-check.json.
- These are Node WebAssembly checks; no real browser rendering/performance QA was performed. Hosting publication does not establish browser numerical or visual parity. Performance varies by device/browser.

## Build and serve

The dist directory is static. Serve it over HTTP(S); opening index.html via file:// will not support the module worker and asset loading correctly. Local development example: python -m http.server 8000 --directory dist.

The compiled WebAssembly and source are included. To rebuild, activate Emscripten and run python build_engine.py. Three.js 0.185.1 is vendored in dist/vendor with its MIT license. engine contains the already-specialized live generated C++ source. prepare-live.py records the one-time transformation from the original generated batch source; do not rerun it against the already-transformed engine.

Reference test scripts require the native static_arrays directory indicated in their data variable; change it to your matching pinned upstream generated data. Browser assets already contain that data compressed. Tests write only local result files.

## Sources and notices

- https://github.com/eonsystemspbc/fly-brain (repository GPL-2.0-or-later, with upstream third-party notices)
- https://github.com/philshiu/Drosophila_brain_model (original model)
- https://flywire.ai/ (connectome)
- https://brian2.readthedocs.io/ (Brian2 2.10.1 code generation)
- https://emscripten.org/ (Emscripten 6.0.9)
- https://threejs.org/ (Three.js 0.185.1)

No claim of complete biological fidelity, consciousness, or validated locomotion. Sparse behavior is specialized for the pinned model's resting initialization and fixed parameters; adding new input pathways or state inspection requires respecting the materialization hooks.
