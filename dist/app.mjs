import * as THREE from 'three';import {OrbitControls} from './vendor/OrbitControls.js';
const $=id=>document.getElementById(id);let running=false,worker=null,level=0;
const history=[];const chart=$('trace');
function drawTrace(){const dpr=Math.min(devicePixelRatio,2);chart.width=chart.clientWidth*dpr;chart.height=90*dpr;const c=chart.getContext('2d');c.scale(dpr,dpr);const w=chart.clientWidth;c.strokeStyle='#34402e';c.beginPath();c.moveTo(0,80);c.lineTo(w,80);c.stroke();if(history.length<2)return;c.strokeStyle='#c8ef61';c.lineWidth=2;c.beginPath();const max=Math.max(1,...history);history.forEach((v,i)=>{const x=i*w/119,y=78-v/max*66;i?c.lineTo(x,y):c.moveTo(x,y);});c.stroke();}
function fail(message){$('status').textContent=message;running=false;$('pause').disabled=true;$('sugar').disabled=true;$('load').textContent='Reload to retry';$('load').disabled=false;$('load').onclick=()=>location.reload();if(worker)worker.terminate();}
fetch('./data-manifest.json').then(r=>r.json()).then(m=>{const mb=Math.round(m.downloadBytes/1e6);$('status').textContent=`${mb} MB model download. Best on a desktop; needs substantial memory.`;$('download-info').textContent=`Full connectome download: ${mb} MB compressed. No simulation server is used.`;}).catch(()=>fail('Model information could not load.'));
$('load').onclick=()=>{
 if(!('Worker'in window)||!('WebAssembly'in window)||!('DecompressionStream'in window)){fail('This browser lacks a required feature. Try a current desktop browser.');return;}
 $('load').disabled=true;$('load').textContent='Loading…';$('progress').hidden=false;
 worker=new Worker('./brain-worker.mjs',{type:'module'});worker.onerror=()=>fail('The brain worker stopped. Try a desktop browser with more free memory.');
 worker.onmessage=({data:d})=>{
  if(d.type==='progress'){$('progress').value=d.fraction;$('status').textContent=d.message||`Loading connectome · ${Math.round(d.fraction*100)}%`;}
  if(d.type==='ready'){$('load').hidden=true;$('progress').hidden=true;$('pause').disabled=false;$('sugar').disabled=false;$('status').textContent=`Brain ready · ${d.memoryMiB} MiB WebAssembly memory allocated. Press Start.`;}
  if(d.type==='error')fail(d.message);
  if(d.type==='sample'){$('simtime').innerHTML=d.time.toFixed(2)+' <small>s</small>';$('spikes').textContent=d.spikes.toLocaleString();$('speed').textContent=d.speed.toFixed(2)+'×';level=Math.min(1,d.spikes/1000);history.push(d.spikes);if(history.length>120)history.shift();drawTrace();}
 };worker.postMessage({type:'load'});
};
$('pause').onclick=()=>{running=!running;worker.postMessage({type:running?'run':'pause'});$('pause').textContent=running?'Pause':'Resume';$('status').textContent=running?'Simulating locally. Stimulation changes apply between samples.':'Paused. Neural state is preserved.';};
$('sugar').onchange=()=>worker?.postMessage({type:'sugar',on:$('sugar').checked});
try{
 const canvas=$('scene');const renderer=new THREE.WebGLRenderer({canvas,antialias:true,alpha:true});renderer.setPixelRatio(Math.min(devicePixelRatio,2));renderer.setClearColor(0x000000,0);const scene=new THREE.Scene();
 const camera=new THREE.PerspectiveCamera(40,1,.1,100);camera.position.set(5,3.2,7);const controls=new OrbitControls(camera,canvas);controls.target.set(0,.7,0);controls.enableDamping=true;controls.minDistance=4;controls.maxDistance=12;controls.enablePan=false;
 scene.add(new THREE.HemisphereLight(0xedffd6,0x192818,2.6));const key=new THREE.DirectionalLight(0xffffff,4);key.position.set(2,6,4);scene.add(key);const rim=new THREE.DirectionalLight(0xc8ef61,2);rim.position.set(-5,1,-3);scene.add(rim);
 // ---- Rigged male Drosophila (procedural, photo-matched) replaces the oval schematic ----
 const activity=new THREE.MeshStandardMaterial({color:0xc8ef61,emissive:0xc8ef61,emissiveIntensity:.1,transparent:true,opacity:.8});
 let fly=null,mixer=null,activityGlow=null;
 try{
  const {createDrosophilaMale}=await import('./fly-model/flyRigged.mjs');
  fly=createDrosophilaMale({detail:'standard'}); // 110-draw-class rig; ~37k tris at hero
  fly.group.rotation.y=Math.PI;                 // model faces -X; schematic flew +Z
  fly.group.position.y=-.02;                    // bone space ≈ schematic space
  scene.add(fly.group);
  mixer=new THREE.AnimationMixer(fly.group);
  mixer.clipAction(fly.clips.find(c=>c.name==='idle')).play();
  // brain glow hovering at the head crown (inside the capsule it would be occluded)
  const glow=new THREE.Mesh(new THREE.SphereGeometry(.28,16,12),activity);
  glow.position.set(-.62,.34,0);
  fly.group.add(glow);
  activityGlow=glow;
 }catch(e){
  // Fallback: original schematic body if the rigged model fails to load
  console.warn('rigged model unavailable, falling back to schematic',e);
  fly=new THREE.Group();fly.position.y=.65;scene.add(fly);
  const body=new THREE.MeshStandardMaterial({color:0x6d7653,roughness:.5,metalness:.15});const dark=new THREE.MeshStandardMaterial({color:0x252e20,roughness:.6});const eyeMat=new THREE.MeshStandardMaterial({color:0xb34c2f,roughness:.4});const wingMat=new THREE.MeshPhysicalMaterial({color:0xc8ddcf,transparent:true,opacity:.22,side:THREE.DoubleSide,roughness:.2,depthWrite:false});
  function oval(parent,material,position,scale){const m=new THREE.Mesh(new THREE.SphereGeometry(1,24,16),material);m.position.set(...position);m.scale.set(...scale);parent.add(m);return m;}
  function segment(a,b,r=.025,mat=dark,parent=fly){const from=new THREE.Vector3(...a),to=new THREE.Vector3(...b),d=to.clone().sub(from);const m=new THREE.Mesh(new THREE.CylinderGeometry(r,r*.8,d.length(),8),mat);m.position.copy(from).add(to).multiplyScalar(.5);m.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),d.normalize());parent.add(m);}
  oval(fly,body,[0,0,0],[.48,.47,.67]);oval(fly,dark,[0,-.05,-.88],[.39,.35,.77]);oval(fly,body,[0,.08,.78],[.43,.37,.34]);oval(fly,eyeMat,[-.33,.12,.94],[.2,.26,.19]);oval(fly,eyeMat,[.33,.12,.94],[.2,.26,.19]);
  for(let i=0;i<5;i++){const ring=new THREE.Mesh(new THREE.TorusGeometry(.34-i*.025,.025,6,40),body);ring.position.set(0,-.05,-.55-i*.23);ring.scale.y=.88;fly.add(ring);}
  for(const side of [-1,1]){for(let i=0;i<3;i++){const z=.4-i*.5;segment([side*.3,-.15,z],[side*.85,-.4,z+.25-i*.18]);segment([side*.85,-.4,z+.25-i*.18],[side*1.15,-.65,z+.48-i*.3]);}segment([side*.18,.22,1],[side*.27,.55,1.25],.016);const wing=oval(fly,wingMat,[side*.91,.35,-.54],[.6,.045,1.1]);wing.rotation.y=side*.48;}
  const glow=new THREE.Mesh(new THREE.SphereGeometry(.11,10,8),activity);glow.position.set(0,.23,.77);fly.add(glow);activityGlow=glow;
 }
 const plate=new THREE.Mesh(new THREE.CylinderGeometry(2.65,2.7,.09,96),new THREE.MeshStandardMaterial({color:0x283626,roughness:.8}));plate.position.y=-.08;scene.add(plate);const grid=new THREE.GridHelper(5,20,0x65775a,0x374a31);grid.position.y=-.027;scene.add(grid);
 function resize(){const p=canvas.parentElement;renderer.setSize(p.clientWidth,p.clientHeight,false);camera.aspect=p.clientWidth/p.clientHeight;camera.updateProjectionMatrix();drawTrace();}new ResizeObserver(resize).observe(canvas.parentElement);resize();
 function frame(){requestAnimationFrame(frame);controls.update();activity.emissiveIntensity=.15+level*2;level*=.98;renderer.render(scene,camera);}frame();
}catch(e){$('scene').insertAdjacentHTML('afterend','<p style="position:absolute;bottom:80px;left:5%;right:5%">3D rendering is unavailable in this browser. The neural simulation controls still work.</p>');}
