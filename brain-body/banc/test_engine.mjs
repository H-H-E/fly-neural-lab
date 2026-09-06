import { ReflexNet, DT, W_SYN } from '../../dist/reflex-engine.mjs';
const g = { meta:{n_nodes:3,n_edges:2,source:'test',w_syn_V:W_SYN,nt_rule:'t'},
  id:[1,2,3], cell_type:['a','b','c'], role:['sensory','vnc','motor'],
  target:['','',''], side:['','',''], pre_sign:[1,1,1],
  src:[0,1], dst:[1,2], count:[50,50] };
const net = new ReflexNet(g);
net.stimulate(0, 100);
let s0=0,s1=0,s2=0, t1=-1, t2=-1;
for (let t = 0; t < 5000; t++) {
  const sp = net.step(1);
  for (const s of sp[0]) {
    if (s===0) s0++;
    if (s===1 && t1<0) t1=t;
    if (s===1) s1++; if (s===2) { if (t2<0) t2=t; s2++; }
  }
}
console.log('drive spikes=',s0,'mid spikes=',s1,'out spikes=',s2);
console.log('first mid tick=',t1,'first out tick=',t2);
const net2 = new ReflexNet(g);
let c=0; for (let t=0;t<2000;t++) for (const sp of net2.step(1)) c+=sp.length;
console.log('unstimulated spikes (expect 0)=',c);
