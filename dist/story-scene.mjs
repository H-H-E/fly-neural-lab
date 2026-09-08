import * as THREE from 'three';
import { createDrosophilaMale, resetPose, FLY_MODEL_REVISION } from './fly-model/flyRigged.mjs';
import { RandomSource } from './experiment-core.mjs';
import { SoftwareSceneRenderer } from './software-scene.mjs';

const V = (x = 0, y = 0, z = 0) => new THREE.Vector3(x, y, z);
const LIME = 0xd8f788, CORAL = 0xf49b80, BLUE = 0x8ebfcc;
const clamp = THREE.MathUtils.clamp;
const POSES = [
  { camera: [3.7, 2.55, -6.1], target: [0, .2, 0], type: 'fly' },
  { camera: [0, .4, 8.8], target: [0, .1, 0], type: 'neuron' },
  { camera: [0, .3, 7.8], target: [0, .1, 0], type: 'circuit' },
  { camera: [-2.8, 1.5, 4.1], target: [-.6, -.05, .5], type: 'reflex' },
  { camera: [.5, 1.3, 7.9], target: [0, 0, 0], type: 'brain' },
  { camera: [-3.6, 3.8, -6.5], target: [0, .1, 0], type: 'fly' },
];

function tube(parent, points, color, radius = .016, opacity = 1) {
  const curve = new THREE.CatmullRomCurve3(points.map((p) => Array.isArray(p) ? V(...p) : p));
  const material = new THREE.MeshStandardMaterial({ color, emissive: color, emissiveIntensity: .25, roughness: .42, transparent: opacity < 1, opacity });
  const mesh = new THREE.Mesh(new THREE.TubeGeometry(curve, 32, radius, 5, false), material);
  parent.add(mesh); return { mesh, curve, material };
}

function cell(parent, position, radius, color) {
  const material = new THREE.MeshPhysicalMaterial({ color, emissive: color, emissiveIntensity: .18, roughness: .35, metalness: .12, clearcoat: 1 });
  const mesh = new THREE.Mesh(new THREE.SphereGeometry(radius, 24, 16), material);
  mesh.position.copy(position); parent.add(mesh);
  const halo = new THREE.Mesh(new THREE.SphereGeometry(radius * 1.35, 20, 14), new THREE.MeshBasicMaterial({ color, transparent: true, opacity: .065, depthWrite: false }));
  mesh.add(halo);
  return { mesh, material, halo };
}

function createNeuron() {
  const group = new THREE.Group(), rng = new RandomSource(48);
  const soma = cell(group, V(-.65, .05, 0), .28, LIME);
  const nucleus = new THREE.Mesh(new THREE.IcosahedronGeometry(.09, 2), new THREE.MeshStandardMaterial({ color: 0xfff9db, emissive: 0xf4f5ca, emissiveIntensity: .4 }));
  nucleus.position.set(-.67, .07, .255); group.add(nucleus);
  for (let i = 0; i < 9; i++) {
    const a = 1.1 + i * .5;
    const start = V(-.65 + Math.cos(a) * .15, .05 + Math.sin(a) * .15, 0);
    const mid = V(-.65 + Math.cos(a) * .7, .05 + Math.sin(a) * .65, (rng.next() - .5) * .4);
    const end = V(-.65 + Math.cos(a) * 1.25, .05 + Math.sin(a) * 1.05, (rng.next() - .5) * .6);
    tube(group, [start, mid, end], LIME, .027);
    for (const side of [-1, 1]) {
      const fork = end.clone().add(V(-.32 + rng.next() * .4, side * (.18 + rng.next() * .25), rng.next() * .25));
      tube(group, [mid, end, fork], LIME, .013);
      cell(group, fork, .025, LIME);
    }
  }
  const axon = tube(group, [[-.4,.05,0],[.2,-.12,.04],[.8,.12,0],[1.55,.06,0]], LIME, .028);
  for (let i = 0; i < 6; i++) {
    const p = axon.curve.getPoint(.14 + i * .12);
    const shell = new THREE.Mesh(new THREE.SphereGeometry(.074, 12, 8), new THREE.MeshStandardMaterial({ color: 0x739d8d, roughness: .7 }));
    shell.scale.set(1.4, .8, .8); shell.position.copy(p); group.add(shell);
  }
  for (let i = 0; i < 5; i++) {
    const endpoint = [2.0 + (i % 2) * .1, (i - 2) * .23, (i % 3 - 1) * .16];
    tube(group, [[1.55,.06,0],[1.76,(i-2)*.11,0],endpoint], LIME, .014);
    cell(group, V(...endpoint), .043, LIME);
  }
  const signal = cell(group, V(), .075, 0xffffff); signal.mesh.visible = false;
  return { group, soma, signal, axon };
}

function createCircuit() {
  const group = new THREE.Group();
  const locations = { input: V(-1.6,0,0), relay: V(-.15,.85,0), inhibitory: V(-.15,-.85,0), output: V(1.5,0,0) };
  const nodes = Object.fromEntries(Object.entries(locations).map(([id, p]) => {
    const node = cell(group, p, .19, id === 'inhibitory' ? CORAL : id === 'output' ? LIME : BLUE);
    node.mesh.userData.node = id;
    for (let i = 0; i < 4; i++) {
      const a = i / 4 * Math.PI * 2, outward = p.clone().add(V(Math.cos(a)*.36,Math.sin(a)*.36,0));
      tube(group, [p, outward], id === 'inhibitory' ? CORAL : BLUE, .012, .6);
    }
    return [id, node];
  }));
  const edges = [['input','relay'],['input','inhibitory'],['relay','output'],['inhibitory','output']].map(([from,to]) => {
    const mid = locations[from].clone().lerp(locations[to], .5); mid.z = -.12;
    const link = tube(group, [locations[from],mid,locations[to]], from === 'inhibitory' ? CORAL : BLUE, .014, .65);
    const sign = from === 'inhibitory' ? new THREE.Mesh(new THREE.BoxGeometry(.14,.035,.035),new THREE.MeshBasicMaterial({color:CORAL})) : new THREE.Mesh(new THREE.ConeGeometry(.047,.13,8),new THREE.MeshBasicMaterial({color:BLUE}));
    sign.position.copy(link.curve.getPoint(.76));
    if (from !== 'inhibitory') sign.quaternion.setFromUnitVectors(V(0,1,0),link.curve.getTangent(.76));
    group.add(sign);
    const pulse = cell(group, V(), .055, from === 'inhibitory' ? CORAL : LIME); pulse.mesh.visible = false;
    return { from, to, ...link, sign, pulse };
  });
  return { group, nodes, edges, locations };
}

function createBrain() {
  // A spatial illustration of scale. No reconstructed coordinates are implied.
  const group = new THREE.Group(), rng = new RandomSource(197);
  const positions = [], colors = [];
  for (let i = 0; i < 2200; i++) {
    const side = i % 2 ? -1 : 1, a = rng.next()*Math.PI*2, v = rng.next()*2-1, r = Math.cbrt(rng.next());
    const width = i % 7 === 0 ? .48 : .8;
    positions.push(side * .68 + Math.cos(a)*Math.sqrt(1-v*v)*r*width, v*r*.85 + .12, Math.sin(a)*Math.sqrt(1-v*v)*r*.62);
    const color = new THREE.Color(i % 9 === 0 ? LIME : BLUE); color.multiplyScalar(.55 + rng.next()*.55);
    colors.push(color.r,color.g,color.b);
  }
  const geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.Float32BufferAttribute(positions,3)); geo.setAttribute('color',new THREE.Float32BufferAttribute(colors,3));
  const material = new THREE.PointsMaterial({ size: .027, vertexColors: true, transparent: true, opacity: .88, sizeAttenuation: true });
  group.add(new THREE.Points(geo,material));
  const linePositions = [];
  for (let i = 0; i < 350; i++) {
    const a = Math.floor(rng.next()*2200)*3, b = Math.floor(rng.next()*2200)*3;
    if (Math.abs(positions[a]-positions[b]) < .65) linePositions.push(...positions.slice(a,a+3),...positions.slice(b,b+3));
  }
  const lines = new THREE.BufferGeometry(); lines.setAttribute('position',new THREE.Float32BufferAttribute(linePositions,3));
  group.add(new THREE.LineSegments(lines,new THREE.LineBasicMaterial({color:BLUE,transparent:true,opacity:.13})));
  tube(group,[[-.25,-.4,0],[0,-.85,.05],[0,-1.3,.05]],BLUE,.035,.45);
  return { group, material };
}

export function createStoryScene(canvas, labelsElement, { onNode, onError } = {}) {
  const context = canvas.getContext('webgl2', { antialias: true, alpha: true, powerPreference: 'low-power' });
  const renderer = context ? new THREE.WebGLRenderer({ canvas, context, antialias: true, alpha: true }) : new SoftwareSceneRenderer(canvas);
  renderer.setPixelRatio(Math.min(devicePixelRatio || 1, innerWidth < 760 ? 1.5 : 1.75));
  renderer.setClearColor(0x000000,0); renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.25;
  const scene = new THREE.Scene(), camera = new THREE.PerspectiveCamera(36,1,.05,100);
  const ambient = new THREE.HemisphereLight(0xf5f5df,0x213f34,2.8); scene.add(ambient);
  const key = new THREE.DirectionalLight(0xfff2d6,3.4); key.position.set(-3,5,-3); scene.add(key);
  const rim = new THREE.DirectionalLight(0xc8e2d1,3); rim.position.set(4,2,3); scene.add(rim);
  const fill = new THREE.DirectionalLight(0xc2d8cb,1.8); fill.position.set(0,-2,-4); scene.add(fill);
  // Keep one source of truth for the specimen. Only tessellation adapts to
  // the device and renderer; every tier is the current site-fly revision.
  const flyDetail = renderer.isSoftware ? 'low' : innerWidth < 760 ? 'standard' : 'hero';
  const fly = createDrosophilaMale({detail:flyDetail});
  resetPose(fly); fly.group.position.y = .65;
  const flyRoot = new THREE.Group(); flyRoot.add(fly.group); scene.add(flyRoot);
  const mixer = new THREE.AnimationMixer(fly.group);
  const walk = mixer.clipAction(fly.clips.find(c=>c.name==='walk'));
  const neuron = createNeuron(), circuit = createCircuit(), brain = createBrain();
  scene.add(neuron.group,circuit.group,brain.group);
  const ring = new THREE.Mesh(new THREE.TorusGeometry(2.25,.007,5,120),new THREE.MeshBasicMaterial({color:0x557b67,transparent:true,opacity:.22}));
  ring.rotation.x = Math.PI/2; ring.position.y = -.6; scene.add(ring);
  const innerRing=ring.clone(); innerRing.scale.setScalar(.8); innerRing.material=ring.material.clone(); innerRing.material.opacity=.12; scene.add(innerRing);
  const kneeHalo = new THREE.Mesh(new THREE.TorusGeometry(.15,.011,6,48),new THREE.MeshBasicMaterial({color:LIME,transparent:true,opacity:.8,depthTest:false}));
  kneeHalo.rotation.y = Math.PI/2; fly.bones.leg_FL_tibia.add(kneeHalo);
  let chapter=0, progress=0, motion=!matchMedia('(prefers-reduced-motion: reduce)').matches;
  let rotate=false, yaw=0, tilt=0, walking=false, last=0, frameId=0, disposed=false;
  let teaching={time:0, result:null, circuitResult:null, circuitTime:0, selectedNode:'input'};
  let brainSpikes=0, drag=null, revision=0, signature="", lastDraw=0;
  const target=V(), desiredCamera=V(), desiredTarget=V(), pointer=new THREE.Vector2(), raycaster=new THREE.Raycaster();
  const labels = [];
  function label(text, position, mode, className='', value=null) {
    const node=document.createElement('span'); node.className=`specimen-label ${className}`; node.textContent=text; labelsElement.append(node); labels.push({node,position,mode,value});
  }
  label('Drosophila melanogaster',()=>fly.bones.head.getWorldPosition(V()).add(V(0,.55,0)),'fly','species-label');
  label('Cell body',()=>neuron.soma.mesh.getWorldPosition(V()).add(V(0,-.55,0)),'neuron');
  label('',()=>neuron.soma.mesh.getWorldPosition(V()).add(V(0,-.8,0)),'neuron','model-label',()=>{const p=teaching.result?.trace[Math.min(3199,Math.round(teaching.time/.1))];return p?`${p.voltage.toFixed(1)} mV · ${teaching.result.spikes.filter(t=>t<=teaching.time).length} spikes`: '−52.0 mV · 0 spikes';});
  label('Incoming signals',()=>neuron.group.localToWorld(V(-1.5,1.2,0)),'neuron');
  label('Outgoing spike',()=>neuron.group.localToWorld(V(1.65,-.6,0)),'neuron');
  const nodeNames={input:'01 · Input',relay:'02 · Relay',inhibitory:'03 · Brake',output:'04 · Output'};
  for(const [id,p] of Object.entries(circuit.locations)) label(nodeNames[id],()=>circuit.group.localToWorld(p.clone().add(V(0,id==='relay'?.45:-.44,0))),'circuit',id==='inhibitory'?'coral-label':'');
  label('Front-left tibia',()=>fly.bones.leg_FL_tibia.getWorldPosition(V()).add(V(0,.24,-.3)),'reflex');
  label('Illustrative layout · not reconstructed anatomy',()=>brain.group.localToWorld(V(0,-1.65,0)),'brain','model-label');

  function resize() {
    const rect=canvas.getBoundingClientRect();
    renderer.setSize(rect.width,rect.height,false); revision++; camera.aspect=rect.width/Math.max(1,rect.height); camera.updateProjectionMatrix();
  }
  const observer=new ResizeObserver(resize); observer.observe(canvas); resize();
  function poses() {
    const p=POSES[chapter], next=POSES[Math.min(5,chapter+1)];
    // Only the end of a chapter starts its camera move; controls stay stable.
    const blend=motion ? clamp((progress-.76)/.24,0,1)*.4 : 0;
    desiredCamera.fromArray(p.camera).lerp(V(...next.camera),blend);
    desiredTarget.fromArray(p.target).lerp(V(...next.target),blend);
    desiredCamera.sub(desiredTarget).multiplyScalar(Math.max(1, .9 / camera.aspect)).add(desiredTarget);
  }
  function render(now) {
    if(disposed || document.hidden)return;
    const dt=Math.min(.05,(now-last)/1000||.016);last=now;
    poses();
    const smoothing=motion ? 1-Math.exp(-dt*6) : 1;
    camera.position.lerp(desiredCamera,smoothing);target.lerp(desiredTarget,smoothing);camera.lookAt(target);
    const type=POSES[chapter].type;
    flyRoot.visible=type==='fly'||type==='reflex'; neuron.group.visible=type==='neuron';circuit.group.visible=type==='circuit';brain.group.visible=type==='brain';
    ring.visible=innerRing.visible=flyRoot.visible;kneeHalo.visible=type==='reflex';
    for(const root of [flyRoot,neuron.group,circuit.group,brain.group]) {root.rotation.y=yaw;root.rotation.x=tilt;}
    if(walking && type==='fly' && motion)mixer.update(dt);
    if(type==='neuron') {
      const spike=teaching.result?.spikes?.filter(t=>t<=teaching.time).at(-1);
      const since=spike===undefined?Infinity:teaching.time-spike;
      neuron.soma.material.emissiveIntensity=since<8?1.5:.22;
      neuron.soma.halo.material.opacity=since<8?.22:.065;
      neuron.signal.mesh.visible=since>=0 && since<35;
      if(neuron.signal.mesh.visible)neuron.signal.mesh.position.copy(neuron.axon.curve.getPoint(clamp(since/35,0,1)));
    }
    if(type==='circuit') {
      for(const [id,node] of Object.entries(circuit.nodes)) {
        const samples=teaching.circuitResult?.trace[id];
        const at=Math.round(teaching.circuitTime/.1), active=samples?.slice(Math.max(0,at-45),at+1).some(p=>p.spike);
        node.material.emissiveIntensity=active?1.7:.18;
        node.halo.material.opacity=id===teaching.selectedNode ? .22 : .065;
      }
      for(const edge of circuit.edges) {
        const enabled=edge.from!=='inhibitory'||teaching.circuitResult?.inhibition!==false;
        edge.material.opacity=enabled?.65:.1;edge.sign.visible=enabled;
        const samples=teaching.circuitResult?.trace[edge.from];
        const at=Math.round(teaching.circuitTime/.1);
        const point=samples?.slice(Math.max(0,at-100),at+1).findLast(p=>p.spike);
        edge.pulse.mesh.visible=enabled && !!point;
        if(point)edge.pulse.mesh.position.copy(edge.curve.getPoint(clamp((teaching.circuitTime-point.time)/10,0,1)));
      }
    }
    brain.material.opacity=brainSpikes>0?.95:.7;
    scene.updateMatrixWorld(true);camera.updateMatrixWorld(true);
    for(const l of labels) {
      l.node.hidden=l.mode!==type;
      if(l.node.hidden)continue;
      if(l.value)l.node.textContent=l.value();
      const projected=l.position().project(camera);
      l.node.style.left=`${(projected.x*.5+.5)*100}%`;l.node.style.top=`${(-projected.y*.5+.5)*100}%`;
      l.node.style.opacity=projected.z<1?'1':'0';
    }
    const nextSignature=[chapter,revision,yaw,tilt,walking?mixer.time:0,...camera.position.toArray().map(v=>v.toFixed(3)),...target.toArray().map(v=>v.toFixed(3))].join('|');
    if(nextSignature!==signature && (!renderer.isSoftware || now-lastDraw>80)) {
      renderer.render(scene,camera);signature=nextSignature;lastDraw=now;
    }
    frameId=requestAnimationFrame(render);
  }
  function visibility(){cancelAnimationFrame(frameId);if(!document.hidden){last=performance.now();frameId=requestAnimationFrame(render);}}
  document.addEventListener('visibilitychange',visibility);
  canvas.addEventListener('webglcontextlost',(e)=>{e.preventDefault();cancelAnimationFrame(frameId);onError?.('The 3D view was interrupted. Your experiments and results still work. Reload to restore the view.');});
  canvas.addEventListener('pointerdown',(e)=>{if(rotate){drag={x:e.clientX,y:e.clientY,yaw,tilt};canvas.setPointerCapture(e.pointerId);}});
  canvas.addEventListener('pointermove',(e)=>{if(drag){yaw=drag.yaw+(e.clientX-drag.x)*.009;tilt=clamp(drag.tilt+(e.clientY-drag.y)*.004,-.5,.5);}});
  canvas.addEventListener('pointerup',(e)=>{
    if(drag){drag=null;return;}
    if(chapter!==2)return;
    const rect=canvas.getBoundingClientRect();pointer.set((e.clientX-rect.left)/rect.width*2-1,-(e.clientY-rect.top)/rect.height*2+1);raycaster.setFromCamera(pointer,camera);
    const hit=raycaster.intersectObjects(Object.values(circuit.nodes).map(n=>n.mesh),false)[0];if(hit)onNode?.(hit.object.userData.node);
  });
  canvas.addEventListener('pointercancel',()=>{drag=null;});
  canvas.addEventListener('keydown',(e)=>{if(!rotate)return;const delta={'ArrowLeft':-.16,'ArrowRight':.16}[e.key];if(delta!==undefined){yaw+=delta;e.preventDefault();}if(e.key==='Home'){yaw=tilt=0;e.preventDefault();}});
  poses();camera.position.copy(desiredCamera);target.copy(desiredTarget);frameId=requestAnimationFrame(render);
  return {
    fly, simplified: !!renderer.isSoftware,
    setChapter(index, within=0){if(chapter!==index){yaw=tilt=0;if(walking){walk.stop();walking=false;resetPose(fly);}}chapter=index;progress=within;},
    setMotion(value){motion=value;if(!value&&walking){walk.stop();walking=false;resetPose(fly);}},
    setRotate(value){rotate=value;canvas.classList.toggle('is-rotating',value);canvas.tabIndex=value?0:-1;if(value)canvas.focus({preventScroll:true});},
    resetView(){yaw=tilt=0;},
    setWalk(value){walking=value;if(value){walk.reset().play();}else{walk.stop();resetPose(fly);}},
    updateTeaching(state){Object.assign(teaching,state);revision++;},
    setReflexAngle(degrees){const bone=fly.bones.leg_FL_tibia;bone.quaternion.fromArray(bone.userData.restQuaternion);bone.rotateX((degrees-70)*Math.PI/180);revision++;},
    resetFly(){resetPose(fly);revision++;},
    updateBrain(spikes){brainSpikes=spikes;revision++;},
    snapshot(){return {simplified:!!renderer.isSoftware,flyModel:{name:'site-fly',revision:FLY_MODEL_REVISION,detail:fly.stats.detail},chapter,type:POSES[chapter].type,walking,motion,camera:camera.position.toArray(),tibia:fly.bones.leg_FL_tibia.quaternion.toArray(),draws:renderer.info.render.calls,triangles:renderer.info.render.triangles};},
    dispose(){disposed=true;cancelAnimationFrame(frameId);observer.disconnect();document.removeEventListener('visibilitychange',visibility);scene.traverse(o=>{o.geometry?.dispose();const mats=Array.isArray(o.material)?o.material:[o.material];mats.forEach(m=>m?.dispose());});renderer.dispose();}
  };
}
