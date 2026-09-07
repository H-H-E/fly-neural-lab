import * as THREE from 'three';
import { OrbitControls } from './vendor/OrbitControls.js';
import { makeEffector } from './effectors/kinematic.mjs';
import { encodeProprio, poseFromBones } from './sensors/proprio.mjs';

const $ = (id) => document.getElementById(id);
let running = false;
let worker = null;
let bancWorker = null;
let bancReady = false;
let brainReady = false;
let channels = null;
let effector = null;
let motorRates = new Float32Array(0);
let lastRateMode = 'idle';
let lastBancTime = 0;
let stageFly = null;
let resetPoseFn = null;
let mixer = null;
let walkAct = null;
let demoKick = null;
let driveTimer = null;
let level = 0;
const history = [];
const chart = $('banc-trace');

function setText(id, value) {
  const node = $(id);
  if (node) node.textContent = value;
}

function drawTrace() {
  if (!chart) return;
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  const width = Math.max(1, chart.clientWidth);
  chart.width = Math.round(width * dpr);
  chart.height = Math.round(90 * dpr);
  const c = chart.getContext('2d');
  c.setTransform(dpr, 0, 0, dpr, 0, 0);
  c.clearRect(0, 0, width, 90);
  c.strokeStyle = '#34402e';
  c.lineWidth = 1;
  c.beginPath(); c.moveTo(0, 80); c.lineTo(width, 80); c.stroke();
  if (history.length < 2) return;
  c.strokeStyle = '#c8ef61'; c.lineWidth = 2; c.beginPath();
  const max = Math.max(1, ...history);
  history.forEach((value, index) => {
    const x = index * width / Math.max(1, 119);
    const y = 78 - value / max * 66;
    index ? c.lineTo(x, y) : c.moveTo(x, y);
  });
  c.stroke();
}

function setStageSource(label, detail) {
  setText('active-source', label);
  setText('active-source-detail', detail);
}

function setBancStatus(message, live = false) {
  setText('banc-status', message);
  const node = $('status');
  if (node) {
    node.textContent = message;
    node.classList.toggle('live', live);
  }
}

function setBrainStatus(message) {
  setText('brain-status', message);
}

function resetBancReadouts() {
  if (driveTimer) { clearTimeout(driveTimer); driveTimer = null; }
  setText('banc-simtime', '0.00 s');
  setText('banc-spikes', '—');
  setText('banc-speed', '—');
  history.length = 0;
  drawTrace();
  lastBancTime = 0;
  lastRateMode = 'idle';
  level = 0;
  motorRates.fill(0);
  demoKick = null;
  if (effector?.a) effector.a.fill(0);
  if (stageFly && resetPoseFn) resetPoseFn(stageFly);
  if (mixer) mixer.setTime(0);
  setStageSource('Waiting for simulation', 'The walk, when shown, is a kinematic visualization.');
  setText('banc-source', 'Reset complete. No neural output has been replaced with a synthetic movement signal.');
}

function sendProprioceptiveInput() {
  if (!running || !bancWorker || !channels || !stageFly?.bones) return;
  if ($('noproprio')?.checked) {
    bancWorker.postMessage({ type: 'stim', stim: [] });
    return;
  }
  const { pose } = poseFromBones(stageFly.bones);
  const hz = encodeProprio(channels, pose, {});
  const stim = [];
  channels.proprio.forEach((p, index) => {
    if (p.idx >= 0 && hz[index] > 1) stim.push([p.idx, hz[index]]);
  });
  // This message is sent after a simulation sample, so the next chunk is the
  // first chunk that can consume it. Stimulus changes never depend on frames.
  bancWorker.postMessage({ type: 'stim', stim });
}

function setVisualTime(seconds) {
  if (!mixer) return;
  mixer.setTime(seconds * 1.25);
  if (stageFly?.group) stageFly.group.position.y = 1.22 + 0.02 * Math.sin(seconds * Math.PI * 6.25);
}

function handleBancSample(d) {
  if (d.mode === 'kick') {
    motorRates = Float32Array.from(d.rates || []);
    lastRateMode = 'kick';
    demoKick = { started: performance.now(), rates: motorRates.slice() };
    level = 0.8;
    setStageSource('Direct joint demo', 'A rate was written straight to the effector; the neural model was skipped.');
    setText('banc-source', d.note || 'Direct joint demo: this movement is not neural evidence.');
    return;
  }
  const nextTime = Number.isFinite(Number(d.time)) ? Number(d.time) : lastBancTime;
  const simDt = Math.max(0, nextTime - lastBancTime);
  lastBancTime = Math.max(lastBancTime, nextTime);
  if (d.rates) {
    motorRates = Float32Array.from(d.rates);
    lastRateMode = d.mode || 'banc';
    setVisualTime(nextTime);
    if (effector && simDt > 0) effector.step(simDt, motorRates);
  }
  setText('banc-simtime', `${nextTime.toFixed(2)} s`);
  setText('banc-spikes', Number(d.spikes || 0).toLocaleString());
  setText('banc-speed', `${Number(d.speed || 0).toFixed(2)}×`);
  history.push(Number(d.spikes || 0));
  if (history.length > 120) history.shift();
  drawTrace();
  level = Math.min(1, Number(d.spikes || 0) / 1000);
  if (d.mode === 'drive') {
    setStageSource('BANC output under direct stimulation', 'The front-left tibia flexor pool is stimulated; the displayed rate is measured from emitted spikes.');
    setText('banc-source', 'BANC v888 output is driving the shin through the kinematic effector. A quiet pool stays quiet.');
  } else {
    setStageSource('BANC motor output', 'The shin receives only the measured rate emitted by the BANC nerve-cord model.');
    setText('banc-source', 'The walking clip is separate. This joint signal comes from the BANC motor-neuron readout.');
  }
  sendProprioceptiveInput();
}

function handleBrainSample(d) {
  const time = Number(d.time || 0);
  setText('brain-simtime', `${time.toFixed(2)} s`);
  setText('brain-spikes', Number(d.spikes || 0).toLocaleString());
  setText('brain-speed', `${Number(d.speed || 0).toFixed(2)}×`);
  setText('brain-touched', Number(d.touched || 0).toLocaleString());
  setText('brain-watched', String((d.observed || []).length));
}

function setRunning(next) {
  running = !!next;
  if (running) {
    bancWorker?.postMessage({ type: 'run' });
    worker?.postMessage({ type: 'run' });
  } else {
    bancWorker?.postMessage({ type: 'pause' });
    worker?.postMessage({ type: 'pause' });
  }
  const button = $('pause');
  if (button) button.textContent = running ? 'Pause simulation' : 'Start simulation';
  if (running) setBancStatus('Simulating BANC locally.', true);
  else if (bancReady) setBancStatus('Paused. State is frozen; camera rendering remains available.', true);
}

function failBrain(message) {
  setBrainStatus(message);
  setText('active-source-detail', 'FlyWire is optional and remains separate from the visible body.');
  if ($('load')) {
    $('load').hidden = false;
    $('load').textContent = 'Reload to retry';
    $('load').disabled = false;
    $('load').onclick = () => location.reload();
  }
  if ($('brain-progress')) $('brain-progress').hidden = true;
  worker?.terminate();
  worker = null;
  brainReady = false;
}

fetch('./data-manifest.json').then((response) => response.json()).then((manifest) => {
  const mb = Math.round(manifest.downloadBytes / 1e6);
  setText('download-info', `FlyWire download: ${mb} MB compressed. BANC body state uses a separate local channel LUT.`);
}).catch(() => {});

fetch('./banc-channels.json').then((response) => response.json()).then((data) => {
  channels = data;
  motorRates = new Float32Array(data.motor.length);
  setBancStatus(`Loading BANC v888 · ${data.meta.n_motor_mapped} motor neurons mapped.`);
  if ($('kick')) $('kick').disabled = false;
  bancWorker = new Worker('./banc-worker.mjs', { type: 'module' });
  bancWorker.onmessage = ({ data: d }) => {
    if (d.type === 'progress') {
      if ($('banc-progress')) { $('banc-progress').hidden = false; $('banc-progress').value = d.fraction; }
      setBancStatus(d.message || `Loading BANC · ${Math.round((d.fraction || 0) * 100)}%`);
    }
    if (d.type === 'ready') {
      bancReady = d.mode === 'banc';
      if ($('banc-progress')) $('banc-progress').hidden = true;
      $('pause').disabled = !bancReady;
      $('reset').disabled = !bancReady;
      $('status').classList.add('live');
      setBancStatus(d.mode === 'banc'
        ? `BANC v888 ready · ${d.n.toLocaleString()} neurons · seed ${d.seed}`
        : 'BANC data missing. Direct demo remains available.', true);
      if ($('flex')) $('flex').disabled = !bancReady;
    }
    if (d.type === 'sample') handleBancSample(d);
    if (d.type === 'reset') {
      running = false;
      $('pause').textContent = 'Start simulation';
      resetBancReadouts();
      setBancStatus(`BANC reset · seed ${d.seed}`, true);
    }
    if (d.type === 'error') setBancStatus(`BANC error: ${d.message}`);
  };
  bancWorker.onerror = (event) => setBancStatus(`BANC worker stopped: ${event.message || 'unknown error'}`);
  bancWorker.postMessage({ type: 'load' });
}).catch((error) => setBancStatus(`BANC channel data unavailable: ${error.message}`));

$('load').onclick = () => {
  if (!('Worker' in window) || !('WebAssembly' in window) || !('DecompressionStream' in window)) {
    failBrain('This browser lacks a required FlyWire feature. Try a current desktop browser.');
    return;
  }
  $('load').disabled = true;
  $('load').textContent = 'Loading…';
  $('brain-progress').hidden = false;
  setBrainStatus('Downloading FlyWire v783…');
  worker = new Worker('./brain-worker.mjs', { type: 'module' });
  worker.onerror = () => failBrain('The FlyWire worker stopped. Try a desktop browser with more free memory.');
  worker.onmessage = ({ data: d }) => {
    if (d.type === 'progress') {
      $('brain-progress').value = d.fraction;
      setBrainStatus(d.message || `Loading FlyWire · ${Math.round(d.fraction * 100)}%`);
    }
    if (d.type === 'ready') {
      brainReady = true;
      $('load').hidden = true;
      $('brain-progress').hidden = true;
      $('sugar').disabled = false;
      setBrainStatus(`${d.modelLabel} ready · ${d.memoryMiB} MiB`, true);
      if (running) worker.postMessage({ type: 'run' });
    }
    if (d.type === 'sample') handleBrainSample(d);
    if (d.type === 'input') setText('brain-input', d.on ? 'sugar on' : 'off');
    if (d.type === 'watch') setText('brain-watched', String(d.ids.length));
    if (d.type === 'error') failBrain(d.message);
  };
  worker.postMessage({ type: 'load' });
};

$('pause').onclick = () => setRunning(!running);
$('reset').onclick = () => {
  setRunning(false);
  bancWorker?.postMessage({ type: 'drive-clear' });
  bancWorker?.postMessage({ type: 'reset' });
  resetBancReadouts();
};
$('sugar').onchange = () => worker?.postMessage({ type: 'sugar', on: $('sugar').checked });
$('kick').onclick = () => {
  bancWorker?.postMessage({ type: 'drive-clear' });
  bancWorker?.postMessage({ type: 'kick', bone: 'leg_FL_tibia', target: 'tibia_flexor' });
};
$('flex').onclick = () => {
  if (!bancReady) return;
  if (!running) setRunning(true);
  if (driveTimer) clearTimeout(driveTimer);
  bancWorker?.postMessage({ type: 'drive', bone: 'leg_FL_tibia', target: 'tibia_flexor' });
  driveTimer = setTimeout(() => bancWorker?.postMessage({ type: 'drive-clear' }), 2200);
  setBancStatus('Stimulating the front-left tibia flexor pool…', true);
};

try {
  const canvas = $('scene');
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.setClearColor(0x000000, 0);
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(40, 1, .1, 100);
  camera.position.set(2.05, 1.05, -3.55);
  const controls = new OrbitControls(camera, canvas);
  controls.target.set(0.05, 0.42, 0);
  controls.enableDamping = true;
  controls.minDistance = 3.3;
  controls.maxDistance = 9;
  controls.minPolarAngle = 1.05;
  controls.maxPolarAngle = 1.62;
  controls.enablePan = false;
  scene.add(new THREE.HemisphereLight(0xedffd6, 0x192818, 2.6));
  const key = new THREE.DirectionalLight(0xffffff, 3.2); key.position.set(2, 4, -3); scene.add(key);
  const rim = new THREE.DirectionalLight(0xc8ef61, 1.6); rim.position.set(-3, 1, 2); scene.add(rim);
  const fill = new THREE.DirectionalLight(0x6d8a70, 2.2); fill.position.set(0, -4, 0); scene.add(fill);
  const activity = new THREE.MeshStandardMaterial({ color: 0xc8ef61, emissive: 0xc8ef61, emissiveIntensity: .1, transparent: true, opacity: .8 });
  let activityGlow = null;
  let last = performance.now();
  try {
    const { createDrosophilaMale, resetPose } = await import('./fly-model/flyRigged.mjs');
    resetPoseFn = resetPose;
    const fly = createDrosophilaMale({ detail: 'standard' });
    stageFly = fly;
    fly.group.rotation.y = Math.PI;
    fly.group.position.y = 1.22;
    scene.add(fly.group);
    resetPose(fly);
    mixer = new THREE.AnimationMixer(fly.group);
    walkAct = mixer.clipAction(fly.clips.find((clip) => clip.name === 'walk'));
    walkAct.timeScale = 1.25;
    walkAct.play();
    const idleAct = mixer.clipAction(fly.clips.find((clip) => clip.name === 'idle'));
    idleAct.play();
    fly.group.userData.sexMismatch = 'male-morphology/female-CNS';
    const glow = new THREE.Mesh(new THREE.SphereGeometry(.12, 12, 10), activity);
    glow.position.set(-.55, .22, 0);
    fly.group.add(glow);
    activityGlow = glow;
    window.__qa = () => ({
      cam: camera.position.toArray().map((n) => +n.toFixed(3)),
      target: controls.target.toArray().map((n) => +n.toFixed(3)),
      flyY: fly.group.position.y,
      coxaY: +fly.bones.leg_FL_coxa.quaternion.y.toFixed(3),
      tibiaX: +fly.bones.leg_FL_tibia.quaternion.x.toFixed(3),
      mix: mixer ? +mixer.time.toFixed(3) : 0,
      source: $('active-source')?.textContent,
      paused: !running,
      bancTime: lastBancTime,
    });
    const attach = () => {
      if (!channels || !fly?.bones) return;
      effector = makeEffector(channels, fly.bones);
    };
    attach();
    const wait = setInterval(() => { if (channels) { attach(); clearInterval(wait); } }, 50);
  } catch (error) {
    console.warn('rigged model unavailable, falling back to schematic', error);
    const fly = new THREE.Group(); fly.position.y = .65; scene.add(fly); stageFly = { group: fly, bones: {} };
    const body = new THREE.MeshStandardMaterial({ color: 0x6d7653, roughness: .5, metalness: .15 });
    const dark = new THREE.MeshStandardMaterial({ color: 0x252e20, roughness: .6 });
    const eyeMat = new THREE.MeshStandardMaterial({ color: 0xb34c2f, roughness: .4 });
    const wingMat = new THREE.MeshPhysicalMaterial({ color: 0xc8ddcf, transparent: true, opacity: .22, side: THREE.DoubleSide, roughness: .2, depthWrite: false });
    function oval(parent, material, position, scale) {
      const mesh = new THREE.Mesh(new THREE.SphereGeometry(1, 24, 16), material);
      mesh.position.set(...position); mesh.scale.set(...scale); parent.add(mesh); return mesh;
    }
    function segment(a, b, radius = .025, material = dark, parent = fly) {
      const from = new THREE.Vector3(...a), to = new THREE.Vector3(...b), delta = to.clone().sub(from);
      const mesh = new THREE.Mesh(new THREE.CylinderGeometry(radius, radius * .8, delta.length(), 8), material);
      mesh.position.copy(from).add(to).multiplyScalar(.5);
      mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), delta.normalize());
      parent.add(mesh);
    }
    oval(fly, body, [0, 0, 0], [.48, .47, .67]); oval(fly, dark, [0, -.05, -.88], [.39, .35, .77]); oval(fly, body, [0, .08, .78], [.43, .37, .34]);
    oval(fly, eyeMat, [-.33, .12, .94], [.2, .26, .19]); oval(fly, eyeMat, [.33, .12, .94], [.2, .26, .19]);
    for (let i = 0; i < 5; i++) {
      const ring = new THREE.Mesh(new THREE.TorusGeometry(.34 - i * .025, .025, 6, 40), body);
      ring.position.set(0, -.05, -.55 - i * .23); ring.scale.y = .88; fly.add(ring);
    }
    for (const side of [-1, 1]) {
      for (let i = 0; i < 3; i++) {
        const z = .4 - i * .5;
        segment([side * .3, -.15, z], [side * .85, -.4, z + .25 - i * .18]);
        segment([side * .85, -.4, z + .25 - i * .18], [side * 1.15, -.65, z + .48 - i * .3]);
      }
      segment([side * .18, .22, 1], [side * .27, .55, 1.25], .016);
      const wing = oval(fly, wingMat, [side * .91, .35, -.54], [.6, .045, 1.1]); wing.rotation.y = side * .48;
    }
    const glow = new THREE.Mesh(new THREE.SphereGeometry(.11, 10, 8), activity);
    glow.position.set(0, .23, .77); fly.add(glow); activityGlow = glow;
  }
  const plate = new THREE.Mesh(new THREE.CylinderGeometry(2.65, 2.7, .09, 96), new THREE.MeshStandardMaterial({ color: 0x283626, roughness: .8 }));
  plate.position.y = -.08; scene.add(plate);
  const grid = new THREE.GridHelper(5, 20, 0x65775a, 0x374a31); grid.position.y = -.027; scene.add(grid);
  function resize() {
    const parent = canvas.parentElement;
    renderer.setSize(parent.clientWidth, parent.clientHeight, false);
    camera.aspect = parent.clientWidth / parent.clientHeight;
    camera.updateProjectionMatrix();
    drawTrace();
  }
  new ResizeObserver(resize).observe(canvas.parentElement); resize();
  function frame(now) {
    requestAnimationFrame(frame);
    const dt = Math.min(0.05, (now - last) / 1000) || 0.016;
    last = now;
    controls.update();
    if (demoKick && effector) {
      const elapsed = (now - demoKick.started) / 1000;
      if (elapsed < 1.2) {
        const decay = Math.exp(-elapsed * 4);
        const rates = Float32Array.from(demoKick.rates, (rate) => rate * decay);
        effector.step(dt, rates);
      } else {
        demoKick = null;
        effector.step(dt, new Float32Array(motorRates.length));
      }
    }
    if (activityGlow) {
      activity.emissiveIntensity = .15 + level * 2;
      level *= .98;
    }
    renderer.render(scene, camera);
  }
  frame(performance.now());
} catch (error) {
  $('scene').insertAdjacentHTML('afterend', '<p class="render-fallback">3D rendering is unavailable in this browser. The model controls still work.</p>');
  console.warn('3D renderer unavailable', error);
}
