import { ReflexNet, W_SYN } from '../../dist/reflex-engine.mjs';
// convergence: 8 drivers -> 1 mid (each 60 synapses) -> out (100 synapses)
const src=[], dst=[], cnt=[];
for (let i=0;i<8;i++){src.push(i);dst.push(8);cnt.push(60);}
src.push(8);dst.push(9);cnt.push(100);
const g = { meta:{n_nodes:10,n_edges:9,source:'t2',w_syn_V:W_SYN,nt_rule:'t'},
  id:[...Array(10).keys()], cell_type:Array(10).fill('x'), role:Array(10).fill('vnc'),
  target:Array(10).fill(''), side:Array(10).fill(''), pre_sign:Array(10).fill(1),
  src, dst, count:cnt };
const net = new ReflexNet(g);
for (let i=0;i<8;i++) net.stimulate(i, 80);
let mid=0,out=0,tm=-1,to=-1;
for (let t=0;t<5000;t++){const sp=net.step(1);
  for (const s of sp[0]){if(s===8){mid++;if(tm<0)tm=t;}if(s===9){out++;if(to<0)to=t;}}}
console.log('mid spikes=',mid,'out spikes=',out,'first mid(ms)=',(tm/10).toFixed(1),'first out(ms)=',(to/10).toFixed(1));
// inhibition check: add strong inhibitory driver to silenced mid
const g2 = structuredClone(g); g2.pre_sign=[1,1,1,1,1,1,1,1,-1,1];
const net3 = new ReflexNet(g2);
for (let i=0;i<8;i++) net3.stimulate(i, 80);
let mid3=0; for (let t=0;t<5000;t++){const sp=net3.step(1);for(const s of sp[0])if(s===8)mid3++;}
console.log('mid spikes with inhibition (expect < mid)=',mid3);
