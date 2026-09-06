# BANC embodiment roadmap (adopted 2026-09-06)

Canonical goal: `environment → BANC sensory neurons → brain → VNC → motor
neurons → muscles → body → environment`, neuron-for-neuron where the
connectome supports it. No `forward/left/right` abstractions at the DN layer.

## Pinned snapshots

- Nervous system: **BANC v888 + synapses_v2** (final print version per Bates
  et al. 2026; preprint used CAVE mat. v626). Do not chase living CAVE.
- Brain baseline: existing FlyWire v783 engine stays working until BANC engine
  reaches parity. FAFB↔BANC crosswalk via published NBLAST matches.
- Body physics reference: TuragaLab/flybody MuJoCo model (Vaxenburg et al.
  2025, female, 67 bodies / 102 DoFs). Full MuJoCo is NOT a browser
  dependency — see phasing.
- Fidelity tag: CNS is **female**; visible mesh is **male**. Tag as
  `sexMismatch: male-morphology/female-CNS` in code, not silently. Male-CNS
  variant later via MANC/maleCNS mappings. Abdominal/courtship circuits are
  out of scope for v1.

## Repo layout (dist/ stays the deploy root)

```text
brain-body/banc/      BANC data layer + FlyWire crosswalk
brain-body/sensors/   physics → sensory spikes (FeCO, hair plates, CS, …)
brain-body/effectors/ motor spikes → muscle activation → joint torques
runtime/scheduler/    multirate co-sim clock (neural/physics/exchange/render)
runtime/physics/      articulated dynamics (single-hinge first, flybody later)
validation/           M0–M9 checks with ablations
docs/banc-embodiment.md  this file
```

## Key engineering decisions

1. `fly_step(ticks)` is already parameterized (engine/main.cpp:362); only the
   worker hardcodes 500. Scheduler v1 = expose tick count + exchange sensory/
   motor vectors between calls. No SharedArrayBuffer until measured need:
   SAB requires COOP/COEP headers, which vercel.json does not set and which
   complicate static hosting. Start with transferable typed arrays at 5–10 ms
   exchange, tighten to 1–2 ms only when reflex latency demands it.
2. First physics is a **single tibia hinge** (1 DoF), not MuJoCo-in-WASM.
   M0–M2 need one joint + one muscle + three encoders. Full flybody comes at
   M3/M4, likely as a second WASM module or simplified collider set.
3. VNC v1 reuses LIF/NT machinery. Known infidelity: non-spiking VNC
   interneurons and electrical synapses are not modeled. Flag, don't fix yet.
4. Vision stays FlyWire-frontend → BANC-downstream via type match (BANC lacks
   lamina). Smell last: legs-first per plan.
5. Neuromodulation/arousal/hunger are tonic-input state vars
   (`state.arousal` etc.), never hardcoded into the body interface.

## First coding target (only target until done)

Bend one femur–tibia joint → FeCO claw/hook spikes → BANC VNC → tibia MN →
muscle torque → leg pushes back. Exit criteria:

- M0: stimulate one tibia MN → correct muscle torque, correct sign.
- M1: move tibia passively → correct FeCO IDs fire (claw=position,
  hook=movement/direction), silent otherwise.
- M2: perturbation → corrective torque with <10 ms sensor→torque latency,
  ablated by silencing FeCO (negative control).

## Milestones M3–M9

M3 stance → M4 walking cycles → M5 DN-steered turns → M6 bristle
grooming/avoidance → M7 visual steering → M8 wingbeat-timescale haltere reflex
→ M9 takeoff→flight→landing. Each with ablation vs. literature phenotype.
Flight needs split power (stretch-activated oscillator) vs. steering
(phase-timed hinge torque) muscle models — never a generic Hill muscle.
