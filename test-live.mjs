import fs from 'node:fs';import create from './dist/brain-live.mjs';
const data='/workspace/scratch/c32846136fc4/headless-deliverable/optimization/sparse_fused10/build/static_arrays';
const m=await create({wasmBinary:fs.readFileSync(new URL('./dist/brain-live.wasm',import.meta.url)),print:()=>{}});
m.FS.mkdir('static_arrays');m.FS.mkdir('results');for(const f of fs.readdirSync(data))m.FS.writeFile('static_arrays/'+f,fs.readFileSync(data+'/'+f));
m.callMain([]);const ids=[],times=[];const t=performance.now();
for(let i=0;i<200;i++){const n=m._fly_step(500);ids.push(Buffer.from(m.HEAP32.slice(m._fly_spike_ids()/4,m._fly_spike_ids()/4+n).buffer));times.push(Buffer.from(m.HEAPF64.slice(m._fly_spike_times()/8,m._fly_spike_times()/8+n).buffer));}
const duration=(performance.now()-t)/1000;console.log(JSON.stringify({integration_wall_s:duration,simulated_s:m._fly_time(),touched:m._fly_live_count()}));
fs.mkdirSync('live-results',{recursive:true});fs.writeFileSync('live-results/spike_ids.bin',Buffer.concat(ids));fs.writeFileSync('live-results/spike_times.bin',Buffer.concat(times));
m._fly_finish();for(const f of m.FS.readdir('results'))if(f!=='.'&&f!=='..')fs.writeFileSync('live-results/'+f,m.FS.readFile('results/'+f));
