// Synthetic reflex-tibia.json in extract_tibia.py's exact schema, to validate the gate.
import { writeFileSync } from 'fs';
// 20 sensory -> 6 interneurons (each 40 syn) -> 4 flexor MN (each 60 syn)
const N_S=20, N_I=6, N_M=4, N=N_S+N_I+N_M;
const src=[], dst=[], cnt=[];
for (let i=0;i<N_S;i++) for (let j=0;j<2;j++){src.push(i);dst.push(N_S+(i+j)%N_I);cnt.push(40);}
for (let i=0;i<N_I;i++) for (let j=0;j<N_M;j++){src.push(N_S+i);dst.push(N_S+N_I+j);cnt.push(60);}
const role=[...Array(N_S).fill('sensory'),...Array(N_I).fill('vnc'),...Array(N_M).fill('motor')];
const g={meta:{source:'synthetic',w_syn_V:0.275e-3,nt_rule:'t',n_nodes:N,n_edges:src.length},
 id:[...Array(N).keys()],cell_type:Array(N).fill('x'),role,
 target:[...Array(N_S+N_I).fill(''),...Array(N_M).fill('tibia_flexor_muscle')],
 side:Array(N).fill(''),pre_sign:Array(N).fill(1),src,dst,count:cnt};
writeFileSync('dist/reflex-tibia.synth.json', JSON.stringify(g));
console.log('synthetic written', N, 'nodes -> dist/reflex-tibia.synth.json');
