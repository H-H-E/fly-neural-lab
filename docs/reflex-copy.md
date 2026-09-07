# Tibia evidence copy

The page is an evidence lesson, not a promise that a returning tibia proves a
reflex. It uses three explanation depths and keeps the experiment state while
the learner changes depth. All numbers below describe the current simulator:
0.1 ms neural ticks, a 10 ms motor readout window, a 10–150 degree hinge, and
a 20 degree perturbation.

## Start here

```
The green segment is the femur. The ember segment is the tibia. Bend it with
the slider, predict what will contribute to the return, then perturb it. The
page plots angle, neural torque, and passive torque separately.

The important question is not simply whether the tibia moves. A spring and
damper can move it without neural output. Compare full feedback with sensors
off, neural output off, and passive mechanics alone.
```

## How it works

```
The joint angle is encoded using an assumed position, velocity, and limit
population. Those inputs are applied to the extracted BANC tibia graph. The
model advances in fixed 0.1 ms steps; every 10 ticks it reads flexor and
extensor motor-pool rates and advances the single-hinge body model.

The plotted total torque is the sum of two visible terms:

```text
neural torque  = muscle scale × (flexor rate − extensor rate)
passive torque = spring + damper
total torque   = neural torque + passive torque
```

The Bend slider changes the simulated joint immediately. Browser redraws do
not advance the neural or body clocks.
```

## Model & evidence

```
The wiring is taken from the pinned BANC-derived subgraph. The dynamics of
interneurons are generic LIF approximations; electrical synapses and
non-spiking interneurons are not modeled. The sensory split is an explicit
60/30/remainder assumption over extracted rows, not a verified functional
annotation of the fly's FeCO organ.

If neural output is disconnected and the leg still returns, that is a
mechanics control: the motion alone cannot establish a neural reflex. A
difference between matched conditions is evidence about this model under its
stated assumptions, not a direct measurement from a living fly.
```

## Details

```
Position channels use Gaussian tuning with a 25 degree sigma and a 150 Hz
peak across 10–150 degrees. Velocity channels are direction-opponent pairs;
limit channels rise within 15 degrees of either stop. Motor rates use a 10 ms
boxcar. Neural and passive torque are plotted separately so a latency or
return claim is not accidentally based on total torque alone.
```

## Voice rules for later edits

- Address one learner in the present tense.
- State the causal question before introducing jargon.
- Label extracted data, generic dynamics, and illustrative assumptions
  separately.
- Never use walking or a returning joint as evidence by itself.
- Do not claim a display-frame latency when the result is measured on the
  simulation clock.
