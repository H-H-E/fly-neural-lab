# Front-left femur–tibia resistance assay

Status: **identity gate blocked; software observability gate passed**.

This is the first scientific target for the embodied BANC model. It is deliberately
not a walking assay.

## Claim boundary

The intended claim is narrow:

> This explicitly specified BANC-derived model produces a causal, compensatory
> front-left tibia response under the declared conditions.

The current assets do **not** yet earn that claim. They establish exact identifier
resolution, preserved synapse multiplicities, actual BANC paths, and an observable
neural kernel. They do not establish which front-left FeCO cells are extension-
sensitive claw/hook afferents, nor that the current homogeneous LIF parameters
reproduce the biological reflex.

The immutable machine-readable specification is:

- `brain-body/banc/circuits/fl_tibia_resistance.json`

It records the exact BANC IDs, graph indices, metadata evidence, route summaries,
source hashes, build commit, and unresolved identity status. Regenerate it when the
graph provenance changes:

```text
brain-body/.venv/Scripts/python.exe evidence/banc-audit/build_circuit_spec.py
node validation/banc/circuit_spec_check.mjs
```

## Current identity audit

The local BANC metadata contains three left-front chordotonal proprioceptor groups:

- `SNpp50` + `SNpp51` (position-labelled; raw `other_names`: 19 claw)
- `SNpp39`, `SNpp41`, `SNpp44` (direction-labelled; raw `other_names`: 17 hook)
- `SNpp18`, `SNpp43`, `SNpp47`, `SNpp57`, `SNpp58`, `SNpp59`, `SNpp60`, `SApp23`
  (vibro/tactile-labelled; raw `other_names`: 34 club, 46 unlabeled across groups)

Per-neuron morphology (`other_names`/`notes` from
`brain-body/banc/raw/banc_888_meta_20260521.parquet`) is now joined into the frozen
spec. Morphology is directly-measured evidence for claw/hook/club shape — it still
does NOT split extension vs flexion, so extension sensitivity stays `unknown`.
Full attempt history and dead ends (FANC types empty, MANC/FANC matches numeric,
reviewed FAFB matches 2/116, hemilineage null): `docs/science/fl-tibia-attempt-log.md`.

The independent FeCO literature distinguishes extension- and flexion-encoding
claw position channels and extension- and flexion-encoding hook movement channels.
It also reports that extension-selective claw/hook axons provide excitatory feedback
to tibia-flexing motor neurons and inhibitory feedback to tibia-extending motor
neurons. Those published functional classes do not appear as exact subtype labels
in this local BANC metadata, so the paper is evidence for the assay design, not a
license to map `SNpp50` or another local family by guesswork. See Agrawal et al.,
*Neural coding of leg proprioception in Drosophila* ([PMC6481666](https://pmc.ncbi.nlm.nih.gov/articles/PMC6481666/)) and the connectomic analysis in
*Divergent neural circuits for proprioceptive and exteroceptive sensing of the
Drosophila leg* ([PMC11071415](https://pmc.ncbi.nlm.nih.gov/articles/PMC11071415/)).

The frozen specification keeps the exact neuron IDs in three metadata-derived
candidate groups. It does **not** call any of them extension-sensitive. The local
metadata contains no independently supported claw/hook label for this assay. A
simulated flexor response cannot promote a candidate to that identity.

The motor endpoint is narrower than the old reflex experiment:

- left front-leg motor neurons annotated with `tibia_flexor_muscle`
- left front-leg motor neurons annotated with `tibia_extensor_muscle`
- accessory tibia muscles and unrelated front-leg muscles are not silently pooled
  into the primary endpoint

Muscle target annotation is evidence for anatomical assignment only. Moment arms,
force direction, recruitment order, and force calibration remain unknown.

## Coordinate and mechanics contract

Let `q` be the anatomical femur–tibia angle in radians. Increasing `q` means tibia
extension. The encoder consumes authoritative mechanical state:

```text
q       rad
q_dot   rad/s
load    declared proxy, if used
contact declared state, if used
```

A rendered quaternion may be used for a visualization diagnostic only. It is not
the state source for the scientific loop.

The external extension trajectory is an intervention for the restrained assay. It
must not be reused as a controller command in the free-joint assay.

The mechanical model is:

```text
motor spikes -> muscle activation
activation + muscle length/velocity -> muscle force
muscle force * signed moment arm -> neural joint torque
neural torque + passive torque + external torque -> q, q_dot
```

A spring returning the joint to rest is passive recovery, not neural stabilization.

## Experiment A: mechanically clamped recruitment

Protocol settings are engineering defaults, not quoted physiological measurements:

1. 250 ms baseline at the declared starting angle.
2. Extend the tibia by 10° over 50 ms.
3. Hold the displaced angle for 100 ms.
4. Repeat with matched opposite displacement, multiple ramp speeds, and no-displacement baseline.
5. Use the same initial network state and random seed schedule for every condition.

Only the selected sensory afferents receive perturbation-dependent external drive.
No direct motor drive is allowed in the primary trial.

Record per event:

```text
simulation tick and time
q and q_dot
external sensory target ID and requested rate
actual delivered sensory input event and amplitude
actual sensory spike event
selected relay voltage and spike event
individual selected motor voltage and spike event
external-input target list
```

`BancNet.stimulate(idx, rateHz)` is an external event rate, not a promise about
emitted sensory spikes. Both fields must be reported.

The primary analysis must preserve individual motor units. Do not average unlike
slow, intermediate, and fast units into a single success number. A motor unit may
show sensory-evoked depolarization without firing.

## Experiment B: free single hinge

After Experiment A passes its recruitment and intervention gates, replace the
imposed trajectory with a free hinge. Apply either:

- a logged external torque pulse, or
- a logged displacement followed by clamp release.

After release, motion is generated only by muscle torque, passive mechanics, and the
external perturbation. The decisive endpoint is a predeclared recovery measure that
changes relative to matched passive and feedback controls; “the tibia moved” is not
sufficient.

## Required controls

All controls use matched initial states, intervention logs, and background-drive
random streams:

1. **Sensory transmission cut** — preserve external sensory inputs and actual
   sensory spikes, but block selected afferent outputs.
2. **Motor-to-muscle cut** — preserve neural activity but set neural muscle force to
   zero; this isolates passive recovery.
3. **Feedback clamped** — after the perturbation, hold sensory input at baseline
   rather than encoding the changing joint.
4. **Pathway intervention** — silence a justified relay or edge set and compare with
   a matched off-pathway intervention.
5. **Direct motor stimulation** — actuator calibration only; never evidence for the
   sensory-to-motor claim.

Presample external noise or use independent per-neuron streams. Removing one input
must not shift every later random draw in all conditions.

## Software gates currently passed

`dist/banc-engine.mjs` now provides:

- tick/time-stamped selected-neuron spike events;
- delivered external-input events with requested rate and amplitude;
- scheduled synapse events with explicit delay timestamps;
- explicit output blocking, neuron silencing, and edge blocking;
- strict `preSign` validation; zero is rejected instead of becoming excitation;
- measured motor spike counts remain separate from requested input rates.

Run:

```text
node validation/banc/engine_reference_check.mjs
node validation/banc/circuit_spec_check.mjs
```

The engine fixture covers inhibitory sign, external event logging, 18-tick delay,
output blocking, and invalid zero-sign rejection. It is a software fixture, not a
biological acceptance result.

## Remaining scientific gate

Resolve the extension-sensitive afferents from an independent anatomical/type
source, then update the specification with their exact original BANC IDs and
supporting evidence. Until that happens, the experiment may be used for metadata
and pathway diagnostics, but not interpreted as an extension reflex.

After identity resolution, implement the DOM-free single-hinge modules and run
matched sensory-only, transmission-cut, passive-only, and feedback-clamped traces.
Only then should the browser presentation be attached.
