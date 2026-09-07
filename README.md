# Fly Lab

Fly Lab is a browser-local computational-neuroscience workbench. Start with [`dist/lesson.html`](./dist/lesson.html): predict what one small model neuron will do, intervene, inspect its trace, then disable a branch in an illustrative four-node circuit. The full models remain available as separate experiments.

The visible body is a kinematic visualization, not proof that a complete fly is walking from the connectome. It is tagged `sexMismatch: male-morphology/female-CNS`: the stage is a procedural, photo-matched male *Drosophila melanogaster*, while the neural data are female-CNS model data. No model inference server is used.

## Learning path

| Page | Question | Evidence boundary |
|---|---|---|
| [`dist/lesson.html`](./dist/lesson.html) | How does a model neuron become a small circuit? | Deliberately illustrative LIF model; not a reconstructed fly circuit |
| [`dist/taste.html`](./dist/taste.html) | Does an imposed sugar input change the FlyWire spike pattern? | Aggregate and watched spikes only until a pinned named-cell map is verified |
| [`dist/reflex.html`](./dist/reflex.html) | What makes a tibia move: neural output, sensors, or mechanics? | BANC-derived subgraph with neural and passive torque plotted separately |

## Model boundaries

| Model or signal | Source and output | What it does not establish |
|---|---|---|
| Teaching neuron/circuit | `dist/neuron-model.mjs`; fixed-step, deterministic LIF traces | Biological firing rates or a hidden Drosophila circuit |
| BANC v888 body model | `dist/banc-worker.mjs`; measured motor-neuron output drives a kinematic hinge | Physics-based locomotion or complete motor embodiment |
| FlyWire v783 brain model | `dist/brain-worker.mjs`; optional 138,639-neuron WASM run with aggregate and bounded spike monitoring | A connection to the visible body, named taste identities, membrane-voltage export, or feeding behavior |
| Walking clip | Three.js animation, advanced only from the BANC simulation clock on the home page | Neural evidence |

The **Direct joint demo** is an explicit control that writes a rate to the effector and skips the BANC model. It is labelled as such and is not included as neural evidence. The BANC, FlyWire, and teaching-model counters have separate identities and displays.

## Experiment contract

The small experiments expose the same basic contract: reset, fixed-step advancement, bounded observation, seedable randomness where the model uses random draws, replay, and JSON export. Shared helpers live in `dist/experiment-core.mjs` (`fly-lab-experiment/v1`, `mulberry32-v1`). Observation is read-only and capped at 64 watched neuron IDs / 4,096 watched spike events per sample. The FlyWire worker reads its existing exported spike monitor only; it does not materialize the whole WASM state for the interface.

For BANC, neural state, motor rates, the kinematic effector, joint sensors, and the home-page animation timeline are advanced from the model’s simulation time. Browser rendering handles camera and redraws. Pausing stops simulation state while leaving camera interaction available.

## Implementation

138,639 neurons; 15,091,983 weighted connection rows. Female connectome from eonsystemspbc/fly-brain at commit a3db62f9436074e485c0278290c2164ed6150808. Generated Brian2 code uses double precision, original 0.1 ms steps, integer refractory deadlines, a shared untouched-state recurrence, and fused sparse integration/threshold detection. Untouched neurons activate before any synaptic/Poisson access. Touched neurons are never pruned. Sparse emission order remains ascending; delayed synapse/reset ordering is preserved.

The FlyWire Web Worker advances 500 ticks (50 ms) at a time. The BANC worker uses 50 ticks (5 ms) for its body loop. Rendering runs independently on the main thread. Delays and neural state persist between calls. Only spike recording vectors are cleared between chunks to bound logging memory. Stimulation changes are applied between chunks. Pausing preserves state. No SharedArrayBuffer or pthread requirement. Large network memory makes desktop browsers the initial target; mobile compatibility has not been verified.

Download is approximately 53.9 MB compressed, expanding to approximately 241.5 MB of initialization arrays. Loaded runtime state takes additional memory. Assets are gzip chunks decoded with DecompressionStream; serve .gz bytes without adding Content-Encoding:gzip because the worker performs decompression explicitly.

## Validation

- Native sparse fused model: ten simulated seconds in 4.5786 seconds of integration; all 169,513 spikes and final voltage, synaptic state, last-spike times and refractory flags identical to previous sparse implementation.
- Emscripten 6.0.9 batch build in Node WebAssembly: ten simulated seconds in 5.76768 seconds of integration (9.06461 seconds whole executable). Raw spike and state files match native bit-for-bit.
- Live stepping in Node: 200 separate 50 ms updates complete in 5.67871 seconds and reproduce the same complete ten-second trace and final states bit-for-bit. Floating-point reported network time is 10.000000000000007 seconds; spike times remain exactly equal.
- On/off stimulation smoke test is in controls-check.json.
- These are Node WebAssembly checks; the local environment used for this change did not have a browser executable available for the Playwright harness. Hosting publication does not establish browser numerical or visual parity. Performance varies by device/browser.

## Build and serve

The dist directory is static. Serve it over HTTP(S); opening index.html via file:// will not support the module worker and asset loading correctly. Local development example: python -m http.server 8000 --directory dist.

The compiled WebAssembly and source are included. To rebuild, activate Emscripten and run python build_engine.py. Three.js 0.185.1 is vendored in dist/vendor with its MIT license. engine contains the already-specialized live generated C++ source. prepare-live.py records the one-time transformation from the original generated batch source; do not rerun it against the already-transformed engine.

Reference test scripts require the native static_arrays directory indicated in their data variable; change it to your matching pinned upstream generated data. Browser assets already contain that data compressed. Tests write only local result files.

The focused checks for the experiment boundary are `node validation/engines/observation_check.mjs` and `node validation/lessons/lesson_check.mjs`.

## Sources and notices

- https://github.com/eonsystemspbc/fly-brain (repository GPL-2.0-or-later, with upstream third-party notices)
- https://github.com/philshiu/Drosophila_brain_model (original model)
- https://flywire.ai/ (connectome)
- https://brian2.readthedocs.io/ (Brian2 2.10.1 code generation)
- https://emscripten.org/ (Emscripten 6.0.9)
- https://threejs.org/ (Three.js 0.185.1)

No claim of complete biological fidelity, consciousness, or validated locomotion. Sparse behavior is specialized for the pinned model's resting initialization and fixed parameters; adding new input pathways or state inspection requires respecting the materialization hooks.
