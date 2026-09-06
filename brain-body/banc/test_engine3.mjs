import { ReflexNet, W_SYN } from '../../dist/reflex-engine.mjs';
function run(sign8){
  const src=[], dst=[], cnt=[];
  for (let i=0;i<8;i++){src.push(i);dst.push(8);cnt.push(60);}
  src.push(8);dst.push(9);cnt.push(100);
  const ps=Array(10).fill(1); ps[8]=sign8;
  const g = { meta:{n_nodes:10,n_edges:9,source:'t',w_syn_V:W_SYN,nt_rule:'t'},
    id:[...Array(10).keys()], cell_type:Array(10).fill('x'), role:Array(10).fill('vnc'),
    target:Array(10).fill(''), side:Array(10).fill(''), pre_sign:ps, src, dst, count:cnt };
  const net = new ReflexNet(g);
  for (let i=0;i<8;i++) net.stimulate(i, 80);
  let out=0; for (let t=0;t<5000;t++){const sp=net.step(1);for(const s of sp[0])if(s===9)out++;}
  return out;
}
console.log('out spikes excitatory (expect >0)=', run(1));
console.log('out spikes inhibitory (expect 0)=', run(-1));
