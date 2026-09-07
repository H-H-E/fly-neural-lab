import createBrain from './brain-live.mjs';
let brain=null, running=false, timer=null, loading=false, ticksPerChunk=500;
let watchedIds = [];
const MODEL = 'flywire-v783';
const MODEL_LABEL = 'FlyWire v783 whole-brain model';
const post=(type,data={})=>self.postMessage({type,...data});
async function load(){
 if(loading||brain)return;loading=true;
 try{
  const manifest=await (await fetch('./data-manifest.json')).json();let done=0;
  const m=await createBrain({print:()=>{},printErr:t=>post('notice',{message:t})});
  m.FS.mkdir('static_arrays');m.FS.mkdir('results');
  for(const file of manifest.files){
   const raw=new Uint8Array(file.bytes);let offset=0;
   for(let i=0;i<file.parts.length;i+=3){
    const blocks=await Promise.all(file.parts.slice(i,i+3).map(async part=>{
     const response=await fetch('./'+part.url);if(!response.ok)throw Error('Network download failed. Reload to retry.');
     const bytes=await new Response(response.body.pipeThrough(new DecompressionStream('gzip'))).arrayBuffer();
     done+=part.bytes;post('progress',{fraction:done/manifest.downloadBytes});return new Uint8Array(bytes);
    }));
    for(const block of blocks){raw.set(block,offset);offset+=block.length;}
   }
   if(offset!==file.bytes)throw Error('Incomplete model data. Reload to retry.');
   m.FS.writeFile('static_arrays/'+file.name,raw);
  }
  post('progress',{fraction:1,message:'Connecting the neurons…'});m.callMain([]);
  for(const file of manifest.files)m.FS.unlink('static_arrays/'+file.name);
  brain=m;post('ready',{
    model:MODEL, modelLabel:MODEL_LABEL,
    memoryMiB:Math.round(m.HEAP32.buffer.byteLength/1048576), n:138639,
    observation:'spike-monitor only; membrane voltage is not exported by this build',
  });
}catch(e){post('error',{message:e.message||String(e)});}finally{loading=false;}
}
function tick(){
 if(!running||!brain)return;
 try{
   const start=performance.now();const count=brain._fly_step(ticksPerChunk);const elapsed=performance.now()-start;
   const observed=[];
   if (count > 0 && watchedIds.length) {
    const idPtr=brain._fly_spike_ids()/4, timePtr=brain._fly_spike_times()/8;
    const watched=new Set(watchedIds);
    for(let i=0;i<count && observed.length<4096;i++) {
     const id=brain.HEAP32[idPtr+i];
     if(watched.has(id)) observed.push({id,time:brain.HEAPF64[timePtr+i]});
    }
   }
   post('sample',{
     model:MODEL, source:'flywire-neural-output',
     time:brain._fly_time(),dt:ticksPerChunk*0.0001,
     spikes:count,speed:ticksPerChunk*0.1/Math.max(elapsed,0.1),
     touched:brain._fly_live_count(),observed,
   });
   timer=setTimeout(tick,Math.max(0,50-elapsed));
 }catch(e){running=false;post('error',{message:e.message||String(e)});}
}
self.onmessage=e=>{
 const {type,on}=e.data;
 if(type==='load')load();
 else if(type==='run'&&brain&&!running){if(e.data.ticks>0)ticksPerChunk=e.data.ticks|0;running=true;tick();}
 else if(type==='pause'){running=false;clearTimeout(timer);}
 else if(type==='sugar'&&brain){brain._fly_sugar(on?1:0);post('input',{model:MODEL,input:'sugar',on:!!on,time:brain._fly_time()});}
 else if(type==='watch'&&brain){
  watchedIds=Array.from(new Set((e.data.ids||[]).map(Number).filter(Number.isInteger))).filter(id=>id>=0&&id<138639).slice(0,64);
  post('watch',{model:MODEL,ids:watchedIds});
 }
};
