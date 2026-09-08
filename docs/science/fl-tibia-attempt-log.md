# Front-left tibia resistance: attempt log + science used

Living notebook for the first behavioral target (front-left femur–tibia resistance
reflex). Every entry states what was tried, what the evidence actually showed, and
what remains blocked. "Verified" means a passing gate or a byte-checked artifact;
"inference" is marked as such and never promoted to identity.

Machine-readable freeze: `brain-body/banc/circuits/fl_tibia_resistance.json`
Assay contract: `docs/science/fl-tibia-resistance.md`

## Attempt 0 — preprocessing integrity (verified, committed work)

Problem: BANC identifiers were coerced through floats (`str(int(float(v)))`),
corrupting large IDs; CSR weights silently collapsed multiplicities to unit weights.
- Fix: `brain-body/banc/id_utils.py` (exact decimal-string normalization, floats
  rejected, nullable `root_888` stays null); `count` accepted as multiplicity;
  missing multiplicity now raises unless `--one-row-per-synapse` is explicit;
  duplicate pre/post pairs raise; endpoint-join losses raise with row/weight counts.
- Diagnosis of old assets: full CSR weight sum equaled edge count (11.7M vs 35.7M
  true multiplicity sum, 1 unique weight); only 260/34,155 population IDs matched
  metadata exactly.
- Rebuilt: full CSR 188,508 neurons / 11,752,828 edges / weight sum 35,733,096 /
  493 unique weights; compact 34,155 / 2,859,644 / sum 10,718,555; population and
  channel IDs 100% exact; 0 motor/proprio index misses.
- Audits: `evidence/banc-audit/count-identifier-audit.json`,
  `identifier-audit.json`, `post-rebuild-verify-final.json`,
  `post-rebuild-verify-current.json`. Verifier takes `--out` for new immutable
  reports (refusing to overwrite is by design, not a failure).
- Regression: `brain-body/banc/test_preprocessing.py` (unittest; pytest is not
  installed in the venv, so pytest was abandoned, not "fixed").

## Attempt 1 — broad tibia subgraph (verified, then judged too broad)

`brain-body/banc/extract_tibia.py`: front-leg proprioceptor + motor seeds, 1-hop
posts/pres, intersection relays, 2-hop neighborhood, 8,000-node cap.
Result: 5,184 nodes / 546,792 edges / multiplicity sum 2,490,980; 321 sensory
seeds, 139 front-leg MNs, 61 flexor MNs. Kept as the compact assay graph
(`dist/reflex-tibia.json`) but judged scientifically insufficient: no verified
extension-sensitive identities, accessory muscles pooled, no separated antagonist
circuit. Lesson recorded: extraction strategy is a container, not a claim.

## Attempt 2 — claw/hook identity search (negative result, recorded)

- Side-naming trap: early queries used `side == 'L'` and returned zero rows; the
  metadata uses `'left'`/`'right'`. Fixed, not fatal.
- `cell_type` contains `claw_tpGRN` (52 rows) — gustatory labellum neurons via
  maxillary-labial nerve. Morphological "claw" ≠ FeCO claw. Rejected as a trap.
- `cell_type` contains zero `hook` rows and zero `chordotonal` rows. FeCO
  subtype is not in `cell_type` for these neurons. Closed as negative: do not
  map by `cell_type` substring.
- Motor side succeeded: 17 left-front tibia-flexor + 2 extensor MNs
  (`tibia_flexor*`, `tibia_extensor_SETi/FETi`, T1, left prothoracic leg nerve).

## Attempt 3 — SNpp family grouping (verified metadata, inference boundary held)

116 left-front chordotonal proprioceptors in BANC metadata:
- SNpp50 (24, position) · SNpp39/41/44 (direction) · SNpp18/43/47/57/58/59/60,
  SApp23, SNpp51 (vibro_tactile).
- Frozen as three candidate groups (position/direction/vibro_tactile) with exact
  IDs + graph indices. Explicitly NOT labeled extension-sensitive: simulated
  flexor output can never promote a candidate to sensory identity (circularity
  rule written into the spec).

## Attempt 4 — circuit spec freeze (verified)

`evidence/banc-audit/build_circuit_spec.py` regenerates
`brain-body/banc/circuits/fl_tibia_resistance.json` (schema
`banc.front-left-tibia-resistance/v1`, status `identity_gate_blocked`): exact
source IDs, graph-index resolution, direct/one-hop BANC pathways with
multiplicities, edge/graph SHA-256, build commit. Gate:
`validation/banc/circuit_spec_check.mjs` (3 sensory groups, 2 motor groups,
10 pathways, 5,184 graph nodes).

## Attempt 5 — engine observability (verified)

`dist/banc-engine.mjs`: tick/time-stamped selected spike events, delivered
external-input events (requested rate + amplitude kept separate from emitted
spikes), scheduled synapse events with explicit 18-tick delay, output blocking,
neuron silencing, edge blocking, strict `preSign` (±1 only; 0 raises instead of
becoming excitation). Fixture gate `validation/banc/engine_reference_check.mjs`
covers inhibitory sign, delay arithmetic, transmission-cut behavior, zero-sign
rejection. Software fixture only — not biological acceptance.

## Attempt 6 — DOM-free single-hinge mechanics (verified)

- `dist/physics/tibia-hinge.mjs`: 1-DoF hinge, q in radians, +q = extension;
  passive spring-damper labeled passive, never neural.
- `dist/effectors/muscle.mjs`: spike-driven activation → force → signed
  moment-arm torque.
- `dist/sensors/feco.mjs`: calibrated encoder; calibration mandatory, no
  identifier-hash tuning, no 70° default (that was the old `proprio.mjs`
  behavior, now superseded for this assay).
- `dist/experiments/tibia-resistance.mjs`: intact / sensory-transmission-cut /
  motor-to-muscle-cut / feedback-clamped / pathway-cut conditions with matched
  resets.
- Gates: `validation/reflexes/resistance_reflex_check.mjs` (passive recovery,
  signed opposing torque, calibration-required, timestep refinement),
  `tibia_resistance_check.mjs` (drive→motor transmission, torque sign,
  cut semantics).

## Attempt 7 — raw-metadata morphology join (verified metadata, extension split still blocked)

Raw `banc_888_meta_20260521.parquet` carries `other_names` + `notes` that the
pipeline's `NEURON_COLS` drops. For the 116 left-front FeCO neurons:
- claw: 19 (all position) · hook: 17 (all direction) · club: 34 (all vibro_tactile)
- unlabeled: 46 (10 direction, 8 position, 28 vibro_tactile)
- `notes` corroborates (`"SNpp50, claw"`, `"SNpp39, hook"`, `"SNpp59, club"…`)
  with two uncertain rows (`"hook?"`, `"claw? may need more proofreading"`).
- All 116 resolve into the compact graph. Mapping claw↔position,
  hook↔direction/movement, club↔vibration matches the literature functionally,
  but `other_names` does NOT split extension vs flexion — the reflex's decisive
  label. Status: morphology upgraded to directly-measured evidence; extension
  sensitivity stays `unknown`.
- Dead ends checked the same day: `fanc_cell_type` empty for all 116;
  `manc_match`/`fanc_match` are numeric IDs, not types; reviewed FAFB matches
  cover only 2/116 (both `SA_DLV`, i.e. the SApp23 vibro rows); hemilineage is
  null for all 116.

## Science cited and what each contributed

1. Shiu et al. 2024, whole-brain activity model (Nature
   s41586-024-07763-9; Methods constants). USED AS IMPLEMENTATION SOURCE: LIF
   dt=0.1 ms, t_mbr=20 ms, tau_syn=5 ms, w = sign×count×0.275 mV, GABA/glutamate
   inhibitory rule, PoissonInput-style conductance kicks. Lives in
   `dist/banc-engine.mjs`, `dist/reflex-engine.mjs`, `extract_tibia.py` header.
2. Mamiya/Agrawal/Tuthill, "Neural coding of leg proprioception in Drosophila"
   (PMC6481666). DESIGN INSPO: claw = tonic position (flexion- vs
   extension-tuned branches), hook = phasic directional movement, club =
   bidirectional movement + vibration. Source of the extension/flexion branch
   vocabulary used in the assay doc.
3. Agrawal et al. 2020 eLife, "Central processing of leg proprioception"
   (article 60299). DESIGN INSPO: downstream cell types 13Bα (joint angle,
   posture), 9Aα (movement+vibration+angle), 10Bα (vibration-gated pausing) —
   sets expectations for relay diversity; not yet mapped to BANC IDs.
4. "Divergent neural circuits for proprioceptive and exteroceptive sensing of
   the Drosophila leg" (Nature Comms 2025, PMC11071415; FANC-based).
   STRONGEST DESIGN EVIDENCE: T1L (front-left) FeCO subtypes; claw/hook
   extension axons → excitatory feedback onto tibia-flexing MNs + inhibitory
   onto extenders (and mirror for flexion); extension/flexion channels have
   near-zero postsynaptic-connectivity similarity; suggests a
   connectivity-similarity route to a future extension/flexion split. No
   per-neuron ID table recovered — supplement links were not retrievable, so
   this remains design evidence, not an identity mapping.
5. "Biomechanical origins of proprioceptor feature selectivity"
   (S0896627323005421; bioRxiv 2022.08.08.503192). INSPO: hook-extension neurons
   distal to claw in group 2; biomechanical basis for tuning — supports taking
   morphology + connectivity seriously as functional clues.
6. Azevedo et al. 2020-era leg motor-circuit work. SEARCHED, NOT RELIED ON: no
   claim in this assay traces to it. (Recorded so a future reader doesn't assume
   it backstops the motor endpoint; the motor endpoint rests on BANC muscle-target
   annotation only.)
7. In-repo skill references (`lut-and-kinematics.md`, `stage-visual-qa.md`,
   `blender-rig-bridge.md`, embodiment skill): engineering constraints (LUT
   longest-substring matching, CSR DataView parsing, no CPG/DN-steering
   fakery, sexMismatch tagging, visual-QA camera rules). Cited where they
   constrain implementation, never as neuroscience.

## Kill criteria / what would unblock the gate

- An independent per-neuron extension/flexion label (FANC supplement ID table,
  GAL4-matched morphology, or physiology) joined by exact BANC ID.
- Failing that, a predeclared connectivity-similarity split (per paper 4's
  method) validated against held-out structure — labeled inference, with its own
  false-discovery accounting, before any dynamics claim.
- Until then: diagnostics only. No browser presentation of "the reflex."
