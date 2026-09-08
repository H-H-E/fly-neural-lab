# Frontend redesign: from specimen to signal

## Goal

Help a learner connect an input, a model's response, and a defensible explanation. The fly is the visual anchor throughout one native-scroll experience. Success means a first-time visitor can run a pulse, change a circuit, and distinguish neural from passive leg motion without hunting through separate pages.

This is a design hypothesis based on the existing interface and the project brief, not a claim of completed user research.

## Detailed implementation checklist

### 1. Story and information architecture
- [x] Audit the four existing entry pages, workers, neuron model, and reflex controls.
- [x] Define chapters: Meet the fly → One neuron → A circuit → A moving leg → The whole brain → What the model tells us.
- [x] Keep measured wiring, illustrative teaching circuits, body mapping, and animation clearly identified.
- [x] Give each chapter one question, a primary experiment, a visible outcome, and an optional deeper explanation.
- [x] Add persistent chapter links, progress, next/back navigation, and shareable hash locations.
- [x] Preserve `/lesson.html`, `/reflex.html`, and `/taste.html` as links into the new experience.

### 2. Three.js scene and visual system
- [x] Reuse the detailed rigged male fly in a persistent, generous viewport.
- [x] Build an illustrative branching neuron and an inspectable four-node circuit.
- [x] Frame the front-left leg for the reflex chapter and add a clearly illustrative whole-brain view.
- [x] Interpolate camera framing with native document scroll; never trap the wheel or force scroll snapping.
- [x] Add object labels, an accessible rotate control, reset view, and a plainly labelled animation preview.
- [x] Use one restrained visual system: dark specimen stage, warm white text, lime input, coral inhibition, thin measurement rules.
- [x] Reserve display rendering for showing state; scrolling must not advance the neural model.

### 3. Experiments
- [x] Connect pulse strength, pulse timing, inhibition, play/pause, step, reset, replay, and export to the existing teaching-neuron model.
- [x] Show a live voltage trace and spike count synchronized with the 3D neuron.
- [x] Connect four-node circuit activity, inhibition toggle, node selection, and output comparison to the existing circuit model.
- [x] Extract the existing reflex equations into a reusable model without silently changing their constants.
- [x] Connect Bend, perturbation, seeded reset/replay, and all four counterfactual conditions to the 3D leg.
- [x] Plot angle, neural torque, and passive torque separately; expose the assumptions beside the experiment.
- [x] Retain full BANC stimulation, sensor silence, pause/reset, and the direct-joint control with separate provenance.
- [x] Load BANC and FlyWire only on an explicit request; show progress, failure/retry, and independent counters.
- [x] Keep FlyWire sugar input and bounded neuron watch; avoid unsupported feeding claims.
- [x] Pause active experiments when leaving their chapter or hiding the document.

### 4. Accessibility, mobile, and resilience
- [x] Keep all learning actions in semantic HTML with keyboard access, visible focus, labelled outputs, and useful status messages.
- [x] Keep touch scrolling usable over the specimen; make rotation an explicit mode.
- [x] Keep the specimen visible above the current chapter on narrow screens without covering controls.
- [x] Respect reduced motion and offer a visible motion toggle.
- [x] Provide textual model/trace results when WebGL is missing or lost, plus useful no-JavaScript content.
- [x] Cap pixel ratio, reuse scene objects, bound histories, and stop unnecessary work in background tabs.

### 5. Verification and delivery
- [x] Check desktop composition, chapter transitions, experiment outcomes, controls, and console errors in a real browser.
- [x] Check narrow layout, overflow, touch/keyboard paths, reduced motion, deep links, and error recovery.
- [x] Run meaningful regression checks for teaching models, seed replay, reflex counterfactuals, and existing BANC interfaces.
- [x] Update the browser QA harness and README to match the unified experience.
- [x] Push a planning checkpoint, a working frontend checkpoint, and the verified final changes to `main`.

## Boundaries

The 3D teaching neuron and brain layout are illustrations, not reconstructed morphology. The reflex is a BANC-derived subgraph with assumed sensory encoding and single-hinge mechanics. Full BANC uses a kinematic motor-to-bone mapping. FlyWire runs independently and does not control locomotion. The optional walking clip is labelled as animation. These facts must remain visible without turning the main story into a technical report.

## Verification record · 2026-09-07

- Browser-tested the deployed story: close inputs produce two teaching-neuron spikes; the inhibitory circuit produces two output spikes with its brake and three without it.
- Verified immediate keyboard Bend (10°), +20° perturbation (30°), passive torque with zero neural torque, and BANC's bounded stimulus followed by pause. The direct-joint control displayed its separate source label.
- Loaded FlyWire in the browser, enabled sugar input, observed nonzero spikes and advancing simulation time, then paused and reset/unloaded successfully.
- Inspected the actual fly, branching neuron, and circuit with the same-geometry software renderer. Verified phone reflow in a 390 × 844 iframe, no horizontal overflow, successful pulse playback, the reduced-motion toggle, and keyboard rotation.
- Verified the legacy reflex link redirects to the corresponding chapter.
- Node checks passed for lesson outputs, bounded observations, deterministic and repeated reflex replay (including a final-timestamp bend), matched passive controls, and the existing BANC/effector/sensor regression suite. All application modules pass syntax checks.
- Limitation: this cloud browser disables WebGL. Full-material GPU rendering and physical touch-device performance remain unverified; software 3D, semantic controls, and model behavior were checked directly. The Playwright harness is updated for a workstation or CI browser with WebGL.

The temporary preview uses the existing deployed model assets. Repository and production configuration retain the bundled, pinned model assets and their original URLs.
