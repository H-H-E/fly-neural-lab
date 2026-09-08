import { runNeuronExperiment, runTeachingCircuit } from './neuron-model.mjs';
import { ReflexExperiment, REFLEX_CONDITIONS } from './reflex-experiment.mjs';
import { EXPERIMENT_SCHEMA, downloadJSON, cappedIds } from './experiment-core.mjs';
import { plot, plotVoltage, plotReflex, COLORS } from './story-charts.mjs';
import { makeEffector } from './effectors/kinematic.mjs';
import { encodeProprio, poseFromBones } from './sensors/proprio.mjs';

const $ = id => document.getElementById(id);
const text = (id, value) => { const node=$(id); if(node.textContent!==String(value))node.textContent=String(value); };
const enable = (ids, enabled = true) => ids.forEach(id => { $(id).disabled = !enabled; });
const selected = name => document.querySelector(`input[name="${name}"]:checked`).value;
const exported = (lesson, payload) => downloadJSON(`fly-lab-${lesson}.json`, { schema: EXPERIMENT_SCHEMA, lesson, savedAt: new Date().toISOString(), ...payload });

// Every playback advances a fixed amount of model time per callback. Rendering
// never steps the model, and restarting always cancels the preceding timer.
function playback(update, complete, duration = 320, increment = 2) {
  let timer = null, time = 0, running = false;
  function pause() { running = false; clearTimeout(timer); timer = null; }
  function tick() {
    if (!running) return;
    time = Math.min(duration, +(time + increment).toFixed(4)); update(time);
    if (time >= duration) { pause(); complete(); } else timer = setTimeout(tick, 20);
  }
  return {
    get time() { return time; }, get running() { return running; },
    start() { if (running) return; if (time >= duration) time = 0; running = true; timer = setTimeout(tick, 20); },
    pause,
    reset() { pause(); time = 0; update(time); },
    step() { pause(); time = Math.min(duration, +(time + 1).toFixed(4)); update(time); if (time >= duration) complete(); },
  };
}

export function createLabs({ getScene, setSource, currentChapter }) {
  let neuronResult = runNeuronExperiment(), circuitResult = runTeachingCircuit();
  let circuitNode = 'input', reflex = null, reflexLoading = false, reflexRunning = false, reflexTimer = null;
  let bodyMode = 'reflex';
  let banc = null, bancReady = false, bancRunning = false, bancLoading = false, channels = null, effector = null;
  let bancTime = 0, driveUntil = 0, finishDriveAt = 0;
  let brain = null, brainReady = false, brainRunning = false, brainHistory = [], brainObserved = [], brainTime = 0;
  let brainWatched = [], lastCircuitCounts = {};
  const circuitDescriptions = {
    input: 'Input neuron · receives the repeated stimulus. Select a neuron to inspect its role.',
    relay: 'Relay neuron · passes an excitatory signal toward the output neuron.',
    inhibitory: 'Brake neuron · still fires when its connection is cut, but can no longer inhibit the output.',
    output: 'Output neuron · combines the relay signal with inhibition. Compare its spike count across conditions.',
  };

  function neuronUpdate(time) {
    const spikes = neuronResult.spikes.filter(t => t <= time).length;
    text('neuron-count', spikes); plotVoltage($('neuron-trace'), neuronResult.trace, time);
    getScene()?.updateTeaching({ result: neuronResult, time });
    $('neuron-trace').setAttribute('aria-label', `${spikes} spikes recorded by ${time.toFixed(1)} milliseconds. Dashed line: −45 millivolt threshold.`);
  }
  function neuronComplete() {
    text('neuron-run', 'Send again ↗');
    const n = neuronResult.spikes.length;
    text('neuron-result', n ? `${n} ${n === 1 ? 'spike' : 'spikes'}. The input pushed voltage over the threshold. Change one setting and compare.` : 'No spike. The voltage rose, then leaked away. Try a stronger input or pulses close together.');
  }
  const neuronPlayer = playback(neuronUpdate, neuronComplete);
  function prepareNeuron() {
    neuronPlayer.pause();
    neuronResult = runNeuronExperiment({ strength: Number($('pulse-strength').value), pattern: selected('pulse-pattern'), inhibition: $('neuron-inhibition').checked });
    neuronPlayer.reset(); text('neuron-run', 'Send a signal ↗'); text('pulse-strength-value', Number($('pulse-strength').value).toFixed(2));
    text('neuron-result', 'Settings changed. Send the signal to see what happens.');
  }
  $('pulse-strength').addEventListener('input', prepareNeuron);
  document.querySelectorAll('input[name="pulse-pattern"]').forEach(input => input.addEventListener('change', prepareNeuron));
  $('neuron-inhibition').addEventListener('change', prepareNeuron);
  $('neuron-run').onclick = () => {
    if (neuronPlayer.running) { neuronPlayer.pause(); text('neuron-run', 'Resume signal ↗'); text('neuron-result', `Paused at ${neuronPlayer.time.toFixed(1)} ms.`); }
    else { neuronPlayer.start(); text('neuron-run', 'Pause signal'); text('neuron-result', 'Watch the voltage approach the dashed threshold. Playback is slowed.'); }
  };
  $('neuron-reset').onclick = () => { neuronPlayer.reset(); text('neuron-run', 'Send a signal ↗'); text('neuron-result', 'Reset. Same inputs, ready for another prediction.'); };
  $('neuron-step').onclick = () => { neuronPlayer.step(); text('neuron-run', 'Resume signal ↗'); text('neuron-result', `Stepped to ${neuronPlayer.time.toFixed(1)} ms. ${$('neuron-count').textContent} spikes so far.`); };
  $('neuron-replay').onclick = () => { neuronPlayer.reset(); neuronPlayer.start(); text('neuron-run', 'Pause signal'); text('neuron-result', 'Replaying the same input.'); };
  $('neuron-save').onclick = () => { exported('neuron', { ...neuronResult, viewedUntilMs: neuronPlayer.time }); text('neuron-result', 'Saved the full computed trace and the playback position as JSON.'); };
  enable(['neuron-run','neuron-reset','neuron-step','neuron-replay','neuron-save']); neuronUpdate(0);

  function circuitUpdate(time) {
    for (const [id, trace] of Object.entries(circuitResult.trace)) text(`count-${id}`, trace.filter(p => p.time <= time && p.spike).length);
    plotVoltage($('circuit-trace'), circuitResult.trace[circuitNode], time);
    getScene()?.updateTeaching({ circuitResult, circuitTime: time, selectedNode: circuitNode });
  }
  function circuitComplete() {
    text('circuit-run', 'Run again ↗');
    const count = circuitResult.spikeCounts.output, key = circuitResult.inhibition ? 'connected' : 'disconnected';
    lastCircuitCounts[key] = count;
    const other = lastCircuitCounts[circuitResult.inhibition ? 'disconnected' : 'connected'];
    text('circuit-result', `${count} output spikes with the brake ${key}.${other === undefined ? ' Change the connection and run again to compare.' : ` Your other condition produced ${other}. Same input, different connection.`}`);
  }
  const circuitPlayer = playback(circuitUpdate, circuitComplete);
  function selectNode(id) {
    if (!Object.hasOwn(circuitDescriptions,id)) return;
    circuitNode = id; text('node-description', circuitDescriptions[id]);
    document.querySelectorAll('[data-node]').forEach(button => button.setAttribute('aria-pressed', String(button.dataset.node === id)));
    circuitUpdate(circuitPlayer.time);
  }
  document.querySelectorAll('[data-node]').forEach(button => { button.onclick = () => selectNode(button.dataset.node); });
  $('circuit-inhibition').onchange = () => {
    circuitPlayer.pause(); circuitResult = runTeachingCircuit({ inhibition: $('circuit-inhibition').checked }); circuitPlayer.reset();
    text('circuit-run', 'Run the circuit ↗'); text('circuit-result', 'Connection changed. The same input is ready to run.');
  };
  $('circuit-run').onclick = () => {
    if (circuitPlayer.running) { circuitPlayer.pause(); text('circuit-run','Resume circuit ↗'); text('circuit-result',`Paused at ${circuitPlayer.time.toFixed(1)} ms.`); }
    else { circuitPlayer.start(); text('circuit-run','Pause circuit'); text('circuit-result','Follow the input through the relay and the inhibitory branch.'); }
  };
  $('circuit-reset').onclick = () => { circuitPlayer.reset(); text('circuit-run','Run the circuit ↗'); text('circuit-result','Reset. The connection choice is preserved.'); };
  $('circuit-step').onclick = () => { circuitPlayer.step(); text('circuit-run','Resume circuit ↗'); text('circuit-result',`Stepped to ${circuitPlayer.time.toFixed(1)} ms.`); };
  $('circuit-replay').onclick = () => { circuitPlayer.reset(); circuitPlayer.start(); text('circuit-run','Pause circuit'); };
  $('circuit-save').onclick = () => exported('circuit', { ...circuitResult, viewedUntilMs: circuitPlayer.time, comparison: lastCircuitCounts });
  enable(['circuit-run','circuit-reset','circuit-step','circuit-replay','circuit-save']); circuitUpdate(0);

  function reflexUpdate() {
    if (!reflex) return;
    const d = reflex.latest;
    text('bend-value', `${d.angle.toFixed(1)}°`); $('bend').value = String(d.angle);
    text('reflex-time', `${d.time.toFixed(3)} s`);
    for (const pool of ['sensory','flexor','extensor']) text(`reflex-${pool}`, `${d[`${pool}Hz`].toFixed(1)} Hz`);
    plotReflex($('reflex-angle-trace'), $('reflex-torque-trace'), reflex.trace);
    if (bodyMode === 'reflex' && currentChapter() === 3) getScene()?.setReflexAngle(d.angle);
    $('reflex-angle-trace').setAttribute('aria-label', `Joint angle ${d.angle.toFixed(1)} degrees at ${d.time.toFixed(3)} seconds.`);
    $('reflex-torque-trace').setAttribute('aria-label', `Neural torque ${(d.neuralTorque*1e6).toFixed(2)} micronewton metres; passive torque ${(d.passiveTorque*1e6).toFixed(2)} micronewton metres.`);
  }
  function pauseReflex(message = true) {
    const wasRunning=reflexRunning;reflexRunning=false;clearTimeout(reflexTimer);reflexTimer=null;
    text('reflex-run', reflex?.chunks ? 'Resume leg ↗' : 'Run the leg ↗');
    if (wasRunning && message) text('reflex-status', `Paused at ${reflex.latest.time.toFixed(3)} s. The leg and model state are frozen.`);
  }
  function chooseReflex() {
    pauseBanc();bodyMode='reflex';getScene()?.resetFly();
    if(currentChapter()===3)setSource('BANC-DERIVED REFLEX PROBE', 'Joint pose follows the probe · sensory and body rules are assumed');
  }
  function reflexTick() {
    if (!reflexRunning || !reflex) return;
    for (let i=0;i<8;i++) {
      if(reflex.replayEvents && reflex.chunks>=reflex.replayEnd)break;
      reflex.step();
    }
    reflexUpdate();
    if ((reflex.replayEvents && reflex.chunks >= reflex.replayEnd) || reflex.chunks >= 1000) {
      const replayed=!!reflex.replayEvents;pauseReflex(false);
      text('reflex-status',replayed ? 'Replay complete. Same seed, condition, and interventions.' : `${REFLEX_CONDITIONS[reflex.condition]}: 1 second recorded. Compare with another condition; motion alone does not prove a reflex.`);
    } else reflexTimer=setTimeout(reflexTick,16);
  }
  async function loadReflex() {
    if (reflex || reflexLoading) return;
    reflexLoading=true;$('reflex-retry').hidden=true;
    try {
      const response=await fetch('./reflex-tibia.json');if(!response.ok)throw Error('The reflex data did not load.');
      const graph=await response.json();reflex=new ReflexExperiment(graph,{condition:selected('condition'),seed:Number($('reflex-seed').value)});
      enable(['bend','reflex-run','perturb','reflex-reset','reflex-step','reflex-replay','reflex-save']);
      reflexUpdate();text('reflex-status','Ready. Bend the leg, nudge it, then run.');
    }catch(error){text('reflex-status',`${error.message} You can still run the neuron and circuit experiments.`);$('reflex-retry').hidden=false;}
    finally{reflexLoading=false;}
  }
  $('reflex-retry').onclick=loadReflex;
  $('bend').oninput=()=>{if(!reflex)return;pauseReflex(false);chooseReflex();reflex.bend(Number($('bend').value));reflexUpdate();text('reflex-status',`Joint set to ${reflex.latest.angle.toFixed(0)}°. Run to measure the response.`);};
  $('perturb').onclick=()=>{if(!reflex)return;chooseReflex();reflex.perturb();reflexUpdate();text('reflex-status',`Nudged +20° at ${reflex.latest.time.toFixed(3)} s. Now compare neural and passive torque.`);};
  $('reflex-run').onclick=()=>{
    if(!reflex)return;
    if(reflexRunning){pauseReflex();return;}
    chooseReflex();
    if(reflex.chunks>=1000){reflex.reset();reflexUpdate();}
    reflexRunning=true;text('reflex-run','Pause leg');text('reflex-status',`${REFLEX_CONDITIONS[reflex.condition]} running. Coral is neural torque; blue is passive torque.`);reflexTimer=setTimeout(reflexTick,16);
  };
  function resetReflex(){if(!reflex)return;pauseReflex(false);chooseReflex();reflex.seed=Number($('reflex-seed').value)>>>0;reflex.reset();reflexUpdate();text('reflex-run','Run the leg ↗');text('reflex-status',`Reset to 70°. ${REFLEX_CONDITIONS[reflex.condition]} · seed ${reflex.seed}.`);}
  $('reflex-reset').onclick=resetReflex;$('reflex-seed').onchange=resetReflex;
  document.querySelectorAll('input[name="condition"]').forEach(input=>input.onchange=()=>{if(!reflex)return;pauseReflex(false);chooseReflex();reflex.setCondition(selected('condition'));reflexUpdate();text('reflex-run','Run the leg ↗');text('reflex-status',`${REFLEX_CONDITIONS[reflex.condition]}. Reset to the same pose and seed; apply the same nudge to compare.`);});
  $('reflex-step').onclick=()=>{if(!reflex)return;pauseReflex(false);chooseReflex();reflex.step();reflexUpdate();text('reflex-status',`Stepped to ${reflex.latest.time.toFixed(3)} s.`);};
  $('reflex-replay').onclick=()=>{if(!reflex)return;pauseReflex(false);chooseReflex();if(!reflex.replay()){text('reflex-status','Run or step the experiment before replaying.');return;}reflexRunning=true;text('reflex-run','Pause leg');text('reflex-status','Replaying your recorded bends with the same seed.');reflexTimer=setTimeout(reflexTick,16);};
  $('reflex-save').onclick=()=>{if(reflex){exported('reflex',reflex.snapshot());text('reflex-status','Saved the condition, seed, interventions, and measured traces as JSON.');}};

  function pauseBanc() {
    bancRunning=false;banc?.postMessage({type:'pause'});text('banc-pause','Resume BANC');
  }
  function bancFailure(message){pauseBanc();banc?.terminate();banc=null;bancReady=false;bancLoading=false;enable(['flex','banc-pause','banc-reset','kick'],false);$('banc-load').disabled=false;$('banc-load').hidden=false;text('banc-load','Retry BANC download');$('banc-progress').hidden=true;text('banc-status',message);}
  async function loadBanc() {
    if(bancReady||bancLoading)return;bancLoading=true;$('banc-load').disabled=true;$('banc-progress').hidden=false;text('banc-status','Loading the BANC nerve cord…');
    try{
      if(!('Worker' in window)||!('DecompressionStream' in window))throw Error('BANC needs Web Workers and gzip decompression in this browser.');
      const response=await fetch('./banc-channels.json');if(!response.ok)throw Error('Motor channel data could not load.');channels=await response.json();
      const instance=new Worker('./banc-worker.mjs',{type:'module'});banc=instance;
      instance.onerror=()=>bancFailure('BANC could not start. Retry when more browser memory is available.');
      instance.onmessage=({data:d})=>{
        if(instance!==banc)return;
        if(d.type==='progress'){$('banc-progress').value=d.fraction;text('banc-status',d.message);}
        if(d.type==='ready'){
          if(d.mode!=='banc'){bancFailure('The BANC assets are unavailable.');return;}
          bancLoading=false;bancReady=true;$('banc-progress').hidden=true;$('banc-load').hidden=true;enable(['flex','banc-pause','banc-reset','kick']);
          text('banc-status',`BANC v888 ready · ${d.n.toLocaleString()} neurons · seed ${d.seed}`);
        }
        if(d.type==='error')bancFailure(d.message);
        if(d.type==='reset') {bancTime=0;driveUntil=finishDriveAt=0;text('banc-simtime','0.000 s');text('banc-spikes','0');text('banc-speed','—');if(effector)effector.a.fill(0);if(bodyMode!=='reflex')getScene()?.resetFly();text('banc-status','BANC reset · seed 2026.');}
        if(d.type==='sample'){
          if(d.mode==='kick'){
            pauseBanc();bodyMode='demo';getScene()?.resetFly();if(!effector&&getScene())effector=makeEffector(channels,getScene().fly.bones);effector?.step(.03,d.rates);
            setSource('DIRECT JOINT DEMO','This pose bypasses the neurons. It is a control.');text('banc-source','Direct joint demo: a rate was written to the joint; neural time and spike counters were not advanced.');return;
          }
          const dt=Math.max(0,d.time-bancTime);bancTime=d.time;
          text('banc-simtime',`${d.time.toFixed(3)} s`);text('banc-spikes',Number(d.spikes).toLocaleString());text('banc-speed',`${Number(d.speed).toFixed(2)}×`);
          if(bodyMode==='banc'&&currentChapter()===3){
            if(!effector&&getScene())effector=makeEffector(channels,getScene().fly.bones);
            getScene()?.resetFly();effector?.step(dt,d.rates);
            setSource('BANC MOTOR OUTPUT','Measured motor-pool spikes → kinematic joint mapping');
          }
          if(driveUntil && d.time>=driveUntil){banc.postMessage({type:'drive-clear'});driveUntil=0;text('banc-source','Input ended after 150 ms of model time. The motor readout is measured from emitted spikes.');}
          if(finishDriveAt && d.time>=finishDriveAt){pauseBanc();finishDriveAt=0;text('banc-status','Stimulus complete. BANC paused for inspection.');}
          if(bancRunning&&channels&&getScene()){
            const {pose}=poseFromBones(getScene().fly.bones);const hz=$('noproprio').checked?[]:encodeProprio(channels,pose,{});
            banc.postMessage({type:'stim',stim:channels.proprio.flatMap((p,i)=>p.idx>=0&&hz[i]>1?[[p.idx,hz[i]]]:[])});
          }
        }
      };
      instance.postMessage({type:'load'});
    }catch(error){bancFailure(error.message);}
  }
  $('banc-load').onclick=loadBanc;
  $('flex').onclick=()=>{if(!bancReady)return;pauseReflex();bodyMode='banc';bancRunning=true;driveUntil=bancTime+.15;finishDriveAt=bancTime+.25;text('banc-pause','Pause BANC');text('banc-status','Stimulating the front-left tibia flexors…');text('banc-source','Input: 200 Hz to the mapped flexor pool for 150 ms of simulation time.');banc.postMessage({type:'drive',bone:'leg_FL_tibia',target:'tibia_flexor'});};
  $('banc-pause').onclick=()=>{if(!bancReady)return;if(bancRunning){pauseBanc();text('banc-status','BANC paused.');}else{pauseReflex();bodyMode='banc';bancRunning=true;banc.postMessage({type:'run'});text('banc-pause','Pause BANC');text('banc-status','BANC running locally.');}};
  $('banc-reset').onclick=()=>{pauseBanc();banc?.postMessage({type:'reset'});};
  $('kick').onclick=()=>{if(!bancReady)return;pauseReflex();pauseBanc();banc.postMessage({type:'drive-clear'});driveUntil=finishDriveAt=0;banc.postMessage({type:'kick'});};
  $('noproprio').onchange=()=>{if(bancReady&&$('noproprio').checked)banc.postMessage({type:'stim',stim:[]});};

  function pauseBrain() {brainRunning=false;brain?.postMessage({type:'pause'});text('brain-run','Run the brain ↗');}
  function brainFailure(message){pauseBrain();brain?.terminate();brain=null;brainReady=false;enable(['sugar','brain-run','brain-unload','brain-watch-apply','brain-save'],false);$('brain-load').hidden=false;$('brain-load').disabled=false;text('brain-load','Retry brain download ↓');$('brain-progress').hidden=true;text('brain-status',message);}
  function drawBrain(){const max=Math.max(1,...brainHistory.map(p=>p.spikes));plot($('brain-trace'),{points:brainHistory,series:[{key:'spikes',color:COLORS.blue}],xMax:Math.max(.5,brainTime),xLabel:'s',yMin:0,yMax:max,yLabel:'spikes'});}
  $('brain-load').onclick=()=>{
    if(brain)return;
    if(!('Worker' in window)||!('WebAssembly' in window)||!('DecompressionStream' in window)){brainFailure('This browser is missing a feature needed by the whole-brain model. The smaller experiments remain available.');return;}
    $('brain-load').disabled=true;$('brain-progress').hidden=false;$('brain-progress').value=0;text('brain-status','Downloading FlyWire model data…');
    const instance=new Worker('./brain-worker.mjs',{type:'module'});brain=instance;
    instance.onerror=()=>brainFailure('The brain worker could not start. Try again with more browser memory available.');
    instance.onmessage=({data:d})=>{
      if(instance!==brain)return;
      if(d.type==='progress'){$('brain-progress').value=d.fraction;text('brain-status',d.message||`Downloading FlyWire · ${Math.round(d.fraction*100)}%`);}
      if(d.type==='ready'){
        brainReady=true;$('brain-progress').hidden=true;$('brain-load').hidden=true;enable(['sugar','brain-run','brain-unload','brain-watch-apply','brain-save']);
        $('sugar').checked=false;brain.postMessage({type:'sugar',on:false});text('brain-status',`${d.modelLabel} ready · ${d.memoryMiB} MiB memory. Choose an input and run.`);
      }
      if(d.type==='sample'){
        brainTime=d.time;text('brain-simtime',`${d.time.toFixed(2)} s`);text('brain-spikes',Number(d.spikes).toLocaleString());text('brain-speed',`${Number(d.speed).toFixed(2)}×`);
        brainHistory.push({time:d.time,spikes:d.spikes});if(brainHistory.length>500)brainHistory.shift();
        brainObserved.push(...d.observed);if(brainObserved.length>4096)brainObserved.splice(0,brainObserved.length-4096);
        text('brain-watch-status',`${brainWatched.length} neurons watched · ${brainObserved.length} recorded spike events (last 4,096 maximum).`);drawBrain();getScene()?.updateBrain(d.spikes);
      }
      if(d.type==='input')text('brain-status',`FlyWire sugar input ${d.on?'on':'off'}. ${brainRunning?'Running.':'Paused; press Run the brain.'}`);
      if(d.type==='error')brainFailure(d.message);
    };instance.postMessage({type:'load'});
  };
  $('sugar').onchange=()=>brain?.postMessage({type:'sugar',on:$('sugar').checked});
  $('brain-run').onclick=()=>{if(!brainReady)return;if(brainRunning){pauseBrain();text('brain-status','FlyWire paused. Its counters are frozen.');}else{brainRunning=true;brain.postMessage({type:'run',ticks:500});text('brain-run','Pause brain');text('brain-status',`FlyWire running · sugar input ${$('sugar').checked?'on':'off'}.`);}};
  $('brain-unload').onclick=()=>{pauseBrain();brain?.terminate();brain=null;brainReady=false;brainHistory=[];brainObserved=[];brainTime=0;brainWatched=[];$('sugar').checked=false;enable(['sugar','brain-run','brain-unload','brain-watch-apply','brain-save'],false);$('brain-load').hidden=false;$('brain-load').disabled=false;text('brain-load','Load the brain ↓');text('brain-status','Reset and unloaded. Memory released.');text('brain-simtime','0.00 s');text('brain-spikes','0');text('brain-speed','—');text('brain-watch-status','No neurons selected.');getScene()?.updateBrain(0);drawBrain();};
  $('brain-watch-apply').onclick=()=>{
    const raw=$('brain-watch').value.trim();const parts=raw?raw.split(',').map(s=>s.trim()):[];
    if(parts.some(s=>s===''||!/^\d+$/.test(s)||Number(s)>=138639)){text('brain-watch-status','Use whole-number indices between 0 and 138,638, separated by commas.');return;}
    brainWatched=cappedIds(parts,64);brainObserved=[];brain?.postMessage({type:'watch',ids:brainWatched});text('brain-watch-status',`${brainWatched.length} neurons watched.${parts.length>64?' Limited to the first 64 unique indices.':''}`);
  };
  $('brain-save').onclick=()=>exported('flywire',{model:'FlyWire v783',settings:{sugar:$('sugar').checked,watch:brainWatched},trace:brainHistory,observations:brainObserved,limits:{voltage:'not exported',namedFeedingPathway:'not mapped',watchedSpikes:4096}});
  drawBrain();

  function pauseAll(){
    if(neuronPlayer.running){neuronPlayer.pause();text('neuron-run','Resume signal ↗');text('neuron-result','Paused when you left the experiment. Resume whenever you are ready.');}
    if(circuitPlayer.running){circuitPlayer.pause();text('circuit-run','Resume circuit ↗');text('circuit-result','Paused when you left the experiment.');}
    pauseReflex();pauseBanc();pauseBrain();
  }
  return {
    selectNode,pauseAll,
    enter(index){
      if(index===1)neuronUpdate(neuronPlayer.time);
      if(index===2)circuitUpdate(circuitPlayer.time);
      if(index===3){bodyMode='reflex';loadReflex();reflexUpdate();}
      if(index===4)drawBrain();
    },
    resize(){neuronUpdate(neuronPlayer.time);circuitUpdate(circuitPlayer.time);reflexUpdate();drawBrain();},
    snapshot(){return {neuron:{time:neuronPlayer.time,running:neuronPlayer.running,spikes:Number($('neuron-count').textContent)},circuit:{time:circuitPlayer.time,running:circuitPlayer.running,output:Number($('count-output').textContent),inhibition:circuitResult.inhibition},reflex:reflex?{...reflex.latest,running:reflexRunning,condition:reflex.condition,seed:reflex.seed}:null,banc:{ready:bancReady,running:bancRunning,time:bancTime},brain:{ready:brainReady,running:brainRunning,time:brainTime},bodyMode};}
  };
}
