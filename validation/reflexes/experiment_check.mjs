// Behavioral checks for the reusable reflex experiment, independent of rendering.
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { ReflexExperiment } from '../../dist/reflex-experiment.mjs';
const graph=JSON.parse(readFileSync(new URL('../../dist/reflex-tibia.json',import.meta.url)));
const run=(condition='full')=>{
  const model=new ReflexExperiment(graph,{condition,seed:2026});
  model.bend(100);
  for(let i=0;i<120;i++) {if(i===60)model.perturb();model.step();}
  return model;
};
const first=run(),second=run();
assert.deepEqual(first.trace,second.trace,'same seed and interventions reproduce all observations');
const before=structuredClone(first.trace),events=structuredClone(first.events);
assert.ok(first.replay());
while(first.chunks<first.replayEnd)first.step();
assert.deepEqual(first.trace,before,'replay preserves bends at their exact model time');
assert.deepEqual(first.events,events,'replay retains the original event log');
assert.ok(first.replay());while(first.chunks<first.replayEnd)first.step();
assert.deepEqual(first.trace,before,'replaying again gives the same result');
const terminal=run();terminal.bend(105);terminal.replay();while(terminal.chunks<terminal.replayEnd)terminal.step();assert.equal(terminal.latest.angle,105,'replay applies a bend at the final paused timestamp');
const passive=run('passive'),motorOff=run('no-neural'),sensorsOff=run('no-sensors');
assert.ok(passive.trace.every(p=>p.neuralTorque===0&&p.sensoryHz===0),'passive baseline has no neural torque or sensory input');
assert.ok(motorOff.trace.every(p=>p.neuralTorque===0),'disconnecting motor output removes all neural torque');
assert.deepEqual(motorOff.trace.map(p=>p.angle),passive.trace.map(p=>p.angle),'same passive mechanics produce the same movement with output disconnected');
assert.ok(motorOff.trace.some(p=>p.sensoryHz>0),'sensors still run when the motor output is cut');
assert.ok(sensorsOff.trace.every(p=>p.sensoryHz===0),'sensor cut removes new sensor activity from a reset model');
first.reset();first.bend(110);first.perturb();assert.equal(first.latest.angle,130,'Bend and perturb update the displayed pose immediately');
first.setCondition('passive');assert.equal(first.latest.angle,70);assert.equal(first.latest.time,0);assert.equal(first.events.length,0);
assert.ok(before.every(p=>Number.isFinite(p.angle)&&p.angle>=10&&p.angle<=150));
console.log('PASS seeded reset, exact intervention replay, repeated replay, immediate Bend, matched counterfactuals, bounded joint angle');
