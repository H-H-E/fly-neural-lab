import createBrain from './brain-live.mjs';
let brain=null, running=false, timer=null, loading=false, ticksPerChunk=500;
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
  brain=m;post('ready',{memoryMiB:Math.round(m.HEAP32.buffer.byteLength/1048576)});
 }catch(e){post('error',{message:e.message||String(e)});}finally{loading=false;}
}
function tick(){
 if(!running||!brain)return;
 try{
  const start=performance.now();const count=brain._fly_step(ticksPerChunk);const elapsed=performance.now()-start;
   post('sample',{time:brain._fly_time(),spikes:count,speed:ticksPerChunk*0.1/elapsed,touched:brain._fly_live_count()});
  timer=setTimeout(tick,Math.max(0,50-elapsed));
 }catch(e){running=false;post('error',{message:e.message||String(e)});}
}
self.onmessage=e=>{
 const {type,on}=e.data;
 if(type==='load')load();
 else if(type==='run'&&brain&&!running){if(e.data.ticks>0)ticksPerChunk=e.data.ticks|0;running=true;tick();}
 else if(type==='pause'){running=false;clearTimeout(timer);}
 else if(type==='sugar'&&brain)brain._fly_sugar(on?1:0);
};
