# Tibia reflex copy deck

Four depth levels of the same story, written to sit at specific slots in
`reflex.html`. L0 leads, L3 hides behind a footnote toggle. Each level assumes
the previous one was read or skipped, never required. All numbers come from the
sim as built: 0.1 ms tick, 10 ms motor readout, 20 ms raster window, 10 to 150
degree range, 20 degree perturbation.

## L0: first sentence under the title (no interaction assumed)

```
The green chunk is the femur. The orange one is the tibia, basically the fly's
shin. Bend it with the slider and watch the bottom panel: each dot is one
neuron firing, one row per group, and these are the neurons wired straight to
the muscle. Every neuron on this page is real. Each was traced from an actual
fruit fly, connection by connection, in electron microscope pictures.

When the tibia bends, sensors at the joint fire, the message runs up the nerve
cord and back down, and a muscle tugs the tibia toward where it was. No brain
required. Nothing in there decided to move the leg. The wiring just does this,
the same way a spring pushes back.
```

## L1: hint button, "How does the leg know?" (after they've bent it once)

```
Pull your hand back from a hot pan and your spinal cord handles most of it.
The signal goes out, comes back, your arm moves, and your brain finds out
later, as a done deal. Flies run the same trick, and this page lets you watch.

Grab the Bend slider. At the joint sit sensors called FeCO neurons, and they
fire whenever the tibia moves: some track the angle, some track direction and
speed, some only complain when the joint nears a stop. Those spikes climb into
the nerve cord, hop across a couple of relay neurons, and land on motor
neurons wired to two opposing muscles, the flexor that bends the tibia and the
extensor that straightens it. Bend the joint and the extensor pool wakes up
while the flexor goes quiet, so the leg pushes back toward where it was.

Press Perturb and the tibia jumps 20 degrees. The leg starts correcting in
about ten milliseconds. You'd take roughly two hundred. Reflexes live in the
nerve cord instead of the brain for exactly this reason: asking the brain
would mean waiting on it.
```

## L2: expandable panel, "Under the hood" (for the reader who stayed)

```
The joint angle is encoded, not measured. There is no ruler anywhere in that
leg. What travels up the nerve is a population code: a bank of position
neurons, each tuned to its own preferred angle, fires hardest when the joint
is near that angle and stays mostly quiet otherwise. Read the whole bank
together and the angle falls out of the pattern. Your retina runs the same
trick for edges and motion. On this page, each position sensor is one slice of
that tuning curve. A real FeCO organ spreads one receptor's dendrites across
the tendon, so the code is continuous rather than a row of little dials.

Velocity is coded the opposite way: half the movement neurons fire for one
direction, half for the other, and the difference between the two populations
is the speed. Your vestibular system works this way too.

None of that does anything by itself. The readout happens at the motor
neurons, which pool every incoming spike in a ten millisecond window and turn
pool rate into torque: extensor rate minus flexor rate, signed and scaled,
minus a passive spring and damper at the joint. The spring-damper term is
honest modeling laziness; a real fly has passive joint stiffness too.

One caveat, because it matters: most of the interneurons in this nerve cord
were never recorded during this reflex. Their shapes and synapses come from
the connectome, but their dynamics are a generic leaky integrate-and-fire
model, and electrical synapses between them are not modeled at all. The
sensor-to-motor wiring is measured. The stuff in between is a plausible guess
wearing a measured skeleton. If a biologist silenced a neuron in a real fly
and the reflex carried on regardless, this sim could not have predicted that.
```

## L3: footnote toggle, "For the pedantic" (expert register)

```
Encoding: Gaussian position tuning, sigma 25 degrees, 150 Hz peak, tiled
across 10 to 150 degrees. Velocity: direction-opponent half-wave rectified
pairs. Limit detectors ramp up inside 15 degrees of either stop. Motor
readout: 10 ms boxcar pool rate; torque = k(flexor - extensor) minus a
passive spring-damper on a single-hinge inertia of 1e-6.

Fidelity gaps, ordered by how much they should worry you:

1. Every interneuron is LIF with generic synapses. The real VNC contains
   non-spiking interneurons and electrical synapses; both change gain and
   timing, and neither exists here.
2. The encoder grid is not the FeCO organ. Claw neurons are tonic position
   units that also carry some velocity sensitivity; hook neurons are phasic
   but not cleanly direction-pure. A real recording shows partly redundant,
   correlated channels, not three orthogonal populations.
3. No efference copy. During active movements the CNS modulates reflex gain;
   this loop runs constant gain, so it will be wrong during grooming and
   possibly wrong in sign for some active motions.
4. Pools recruit uniformly here. Real FeCO-driven recruitment is ordered
   (think size principle), not all-at-once, which reshapes the torque
   onset profile.
5. The 20 ms raster is a display convenience; the sim ticks at 0.1 ms and
   the exchange with the "CNS" is 1 ms, so latency claims should quote the
   sim clock, not the screen.
```

## Voice rules for whoever edits this later

- Talk to one person, present tense, second person for L0 to L2, no person
  at L3.
- Wrong-then-right for anything counterintuitive (encoded vs measured).
- Explanations come before their jargon, never after. Jargon appears only
  once it has already been needed.
- Numbers get a friendly margin in L0 to L2 ("about ten milliseconds") and
  exact values in L3.
- Every level ends honest, not inspiring. No "isn't nature amazing".
