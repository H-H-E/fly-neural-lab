import { createLabs } from './story-labs.mjs';

const $ = id => document.getElementById(id);
const chapters = [...document.querySelectorAll('.chapter')];
const links = [...document.querySelectorAll('.dock-chapter')];
const titles = ['The fly','One neuron','A circuit','Movement','The whole brain','The science'];
const sourceLabels = [
  ['3D ANATOMICAL ILLUSTRATION','Male fly morphology · female CNS data · illustrative coupling'],
  ['ILLUSTRATIVE NEURON','A teaching model · highlights follow the computed spikes'],
  ['ILLUSTRATIVE FOUR-CELL CIRCUIT','Measured model output · schematic signal paths'],
  ['BANC-DERIVED REFLEX PROBE','Joint pose follows the probe · sensory and body rules are assumed'],
  ['ILLUSTRATION OF SCALE','FlyWire runs independently · layout is not reconstructed anatomy'],
  ['A MODEL YOU CAN QUESTION','Measured wiring. Explicit assumptions. Testable predictions.'],
];
const kickers = ['SPECIMEN 001','A SINGLE NEURON','FOUR CONNECTED CELLS','THE FRONT-LEFT LEG','FROM MAP TO MODEL','KEEP ASKING QUESTIONS'];
let active = -1, scene = null, rotate = false, walking = false;
let scrollScheduled = false, motion = !matchMedia('(prefers-reduced-motion: reduce)').matches;
const media = matchMedia('(prefers-reduced-motion: reduce)');

function setSource(label, description) {
  $('scene-source').textContent = label; $('scene-description').textContent = description;
}
const labs = createLabs({getScene:()=>scene,setSource,currentChapter:()=>active});

function changeChapter(index) {
  if(index===active)return;
  labs.pauseAll();active=index;
  walking=false;$('walk-preview').setAttribute('aria-pressed','false');$('walk-preview').innerHTML='<span aria-hidden="true">▷</span> Preview a walking animation';$('walk-note').hidden=true;
  rotate=false;scene?.setRotate(false);$('rotate-view').setAttribute('aria-pressed','false');$('rotate-hint').hidden=true;
  document.body.dataset.chapter=chapters[index].id;
  links.forEach((link,i)=>{if(i===index)link.setAttribute('aria-current','step');else link.removeAttribute('aria-current');});
  $('scene-kicker').textContent=kickers[index];setSource(...sourceLabels[index]);
  const next=(index+1)%chapters.length;$('next-chapter').href=`#${chapters[next].id}`;
  $('next-chapter').setAttribute('aria-label',index===5?'Back to the beginning':`Next chapter: ${titles[next]}`);
  $('next-chapter').textContent=index===5?'↑':'↓';
  $('chapter-announcement').textContent=`Chapter ${index+1} of 6: ${titles[index]}`;
  scene?.setChapter(index);labs.enter(index);
}

function updateScroll() {
  scrollScheduled=false;
  const mobile=innerWidth<=760;
  const line=mobile ? $('specimen-stage').getBoundingClientRect().bottom+65 : innerHeight*.35;
  let index=0;
  for(let i=0;i<chapters.length;i++)if(chapters[i].getBoundingClientRect().top<=line)index=i;
  const rect=chapters[index].getBoundingClientRect();
  const progress=Math.max(0,Math.min(1,(line-rect.top)/Math.max(1,rect.height)));
  changeChapter(index);scene?.setChapter(index,progress);
  const totalScroll=document.documentElement.scrollHeight-innerHeight;
  $('story-progress').style.width=`${Math.min(100,scrollY/Math.max(1,totalScroll)*100)}%`;
}
function scheduleScroll(){if(!scrollScheduled){scrollScheduled=true;requestAnimationFrame(updateScroll);}}
addEventListener('scroll',scheduleScroll,{passive:true});
const sectionObserver=new ResizeObserver(scheduleScroll);chapters.forEach(chapter=>sectionObserver.observe(chapter));
addEventListener('resize',()=>{scheduleScroll();labs.resize();},{passive:true});
// Native anchors preserve deep links, browser back/forward, and touch scrolling.
addEventListener('hashchange',scheduleScroll);
chapters.forEach(chapter=>chapter.tabIndex=-1);

function applyMotion() {
  document.documentElement.classList.toggle('reduce-motion',!motion);
  $('motion-toggle').setAttribute('aria-pressed',String(!motion));$('motion-label').textContent=motion?'Motion on':'Motion reduced';
  scene?.setMotion(motion);
  if(!motion&&walking){walking=false;scene?.setWalk(false);$('walk-preview').setAttribute('aria-pressed','false');$('walk-preview').textContent='Preview a walking animation';setSource(...sourceLabels[active]);}
}
$('motion-toggle').onclick=()=>{motion=!motion;applyMotion();};
media.addEventListener('change',()=>{motion=!media.matches;applyMotion();});applyMotion();
$('rotate-view').onclick=()=>{if(!scene)return;rotate=!rotate;scene.setRotate(rotate);$('rotate-view').setAttribute('aria-pressed',String(rotate));$('rotate-hint').hidden=!rotate;};
$('reset-view').onclick=()=>scene?.resetView();
$('walk-preview').onclick=()=>{
  if(!scene)return;
  if(!motion){$('walk-note').textContent='Turn motion on using the header control to play the animation.';$('walk-note').hidden=false;return;}
  walking=!walking;scene.setWalk(walking);$('walk-preview').setAttribute('aria-pressed',String(walking));$('walk-preview').textContent=walking?'Ⅱ Pause walking animation':'▷ Preview a walking animation';
  $('walk-note').hidden=!walking;$('walk-note').textContent='This is a programmed animation. It is separate from the neural experiments.';
  if(walking)setSource('WALKING ANIMATION','Programmed animation clip · not generated by the neural model');else setSource(...sourceLabels[active]);
};
function fallback(message){
  $('scene-loading').hidden=true;$('render-fallback').hidden=false;$('render-message').textContent=message;
  document.body.classList.add('no-webgl');$('scene').hidden=true;$('scene-labels').hidden=true;
  $('rotate-view').disabled=$('reset-view').disabled=$('walk-preview').disabled=true;scheduleScroll();
}
document.addEventListener('visibilitychange',()=>{if(document.hidden){labs.pauseAll();if(walking){walking=false;scene?.setWalk(false);$('walk-preview').setAttribute('aria-pressed','false');$('walk-preview').textContent='▷ Preview a walking animation';setSource(...sourceLabels[active]);}}});
updateScroll();
try {
  const {createStoryScene}=await import('./story-scene.mjs');
  scene=await createStoryScene($('scene'),$('scene-labels'),{onNode:labs.selectNode,onError:fallback});
  $('scene-loading').hidden=true;if(scene.simplified){$('specimen-stage').dataset.renderer='simplified';$('stage-render-mode').hidden=false;}scene.setMotion(motion);scene.setChapter(Math.max(0,active));labs.enter(active);labs.resize();
}catch(error){fallback('The 3D view is unavailable in this browser. All experiment controls, traces, and text results still work.');console.warn('3D view unavailable:',error.message);}
// Development/QA readout only; these functions never advance any model.
window.__storyQA=()=>({chapter:chapters[active]?.id,motion,scene:scene?.snapshot(),labs:labs.snapshot(),source:$('scene-source').textContent});
