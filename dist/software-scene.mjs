// A bounded Canvas renderer for browsers without WebGL. It projects the same
// Three.js objects and camera, with simpler shading and no texture detail.
import * as THREE from 'three';
const rgb = (r,g,b) => `rgb(${Math.round(Math.pow(Math.min(1,Math.max(0,r)),1/2.2)*255)},${Math.round(Math.pow(Math.min(1,Math.max(0,g)),1/2.2)*255)},${Math.round(Math.pow(Math.min(1,Math.max(0,b)),1/2.2)*255)})`;

export class SoftwareSceneRenderer {
  constructor(canvas) {
    this.canvas=canvas;this.ctx=canvas.getContext('2d');
    if(!this.ctx)throw Error('Neither WebGL nor Canvas rendering is available.');
    this.isSoftware=true;this.ratio=1;this.width=1;this.height=1;
    this.info={render:{calls:0,triangles:0}};
    this.projected=new WeakMap();
  }
  setPixelRatio(ratio){this.ratio=Math.min(ratio,1.25);}
  setClearColor(){}
  setSize(w,h){this.width=w;this.height=h;this.canvas.width=Math.round(w*this.ratio);this.canvas.height=Math.round(h*this.ratio);}
  dispose(){this.projected=new WeakMap();}
  render(scene,camera) {
    const c=this.ctx,w=this.width,h=this.height;
    c.setTransform(this.ratio,0,0,this.ratio,0,0);c.clearRect(0,0,w,h);
    scene.updateMatrixWorld();camera.updateMatrixWorld();
    const vp=new THREE.Matrix4().multiplyMatrices(camera.projectionMatrix,camera.matrixWorldInverse);
    const matrix=new THREE.Matrix4(),normal=new THREE.Matrix3(),n=new THREE.Vector3();
    const faces=[],points=[],lines=[],illumination=new THREE.Vector3(-.4,.75,-.5).normalize();let calls=0;
    scene.traverseVisible(object=>{
      if(!object.geometry || object.isInstancedMesh)return; // omit tiny instanced hairs
      const geo=object.geometry,pos=geo.attributes.position;
      if(!pos)return;
      const mat=Array.isArray(object.material)?object.material[0]:object.material;
      if(!mat || mat.visible===false || mat.opacity<.09)return;
      calls++;
      matrix.multiplyMatrices(vp,object.matrixWorld);const e=matrix.elements;
      let projected=this.projected.get(object);
      if(!projected || projected.length!==pos.count*3){projected=new Float32Array(pos.count*3);this.projected.set(object,projected);}
      const raw=pos.array;
      for(let i=0;i<pos.count;i++){
        const j=i*3,x=raw[j],y=raw[j+1],z=raw[j+2];const pw=e[3]*x+e[7]*y+e[11]*z+e[15];
        projected[j]=(e[0]*x+e[4]*y+e[8]*z+e[12])/pw*w/2+w/2;
        projected[j+1]=-(e[1]*x+e[5]*y+e[9]*z+e[13])/pw*h/2+h/2;
        projected[j+2]=(e[2]*x+e[6]*y+e[10]*z+e[14])/pw;
      }
      if(object.isPoints){
        const cols=geo.attributes.color;
        for(let i=0;i<pos.count;i++){const j=i*3;if(Math.abs(projected[j+2])>1)continue;points.push({x:projected[j],y:projected[j+1],color:cols?rgb(cols.getX(i),cols.getY(i),cols.getZ(i)):mat.color.getStyle(),alpha:mat.opacity});}
        return;
      }
      if(object.isLineSegments || object.isLine){
        for(let i=0;i<pos.count-1;i+=object.isLineSegments?2:1){const a=i*3,b=(i+1)*3;lines.push({x:projected[a],y:projected[a+1],xx:projected[b],yy:projected[b+1],color:mat.color.getStyle(),alpha:mat.opacity});}
        return;
      }
      if(!object.isMesh)return;
      const idx=geo.index?.array,normals=geo.attributes.normal?.array,cols=geo.attributes.color;
      normal.getNormalMatrix(object.matrixWorld);
      const count=idx?idx.length:pos.count;
      const base=mat.color?.clone()||new THREE.Color(0xa8c7ab);
      if(/eye_[LR]/.test(object.name))base.setHex(0x9a2611);
      for(let k=0;k<count;k+=3){
        const ia=idx?idx[k]:k,ib=idx?idx[k+1]:k+1,ic=idx?idx[k+2]:k+2;
        const a=ia*3,b=ib*3,d=ic*3;
        if(Math.abs(projected[a+2])>1||Math.abs(projected[b+2])>1||Math.abs(projected[d+2])>1)continue;
        const ax=projected[a],ay=projected[a+1],bx=projected[b],by=projected[b+1],dx=projected[d],dy=projected[d+1];
        if(mat.side===THREE.FrontSide && (bx-ax)*(dy-ay)-(by-ay)*(dx-ax)>=0)continue;
        if(Math.max(ax,bx,dx)<0||Math.min(ax,bx,dx)>w||Math.max(ay,by,dy)<0||Math.min(ay,by,dy)>h)continue;
        let light=.75;
        if(normals){n.set((normals[a]+normals[b]+normals[d])/3,(normals[a+1]+normals[b+1]+normals[d+1])/3,(normals[a+2]+normals[b+2]+normals[d+2])/3).applyMatrix3(normal).normalize();light=.42+.85*Math.max(0,n.dot(illumination))+.25*Math.max(0,n.z);}
        if(mat.isMeshBasicMaterial)light=1;
        if(mat.emissiveIntensity)light+=mat.emissiveIntensity*.12;
        const col=cols?[cols.getX(ia),cols.getY(ia),cols.getZ(ia)]:[1,1,1];
        faces.push({ax,ay,bx,by,dx,dy,z:(projected[a+2]+projected[b+2]+projected[d+2])/3,fill:rgb(base.r*col[0]*light,base.g*col[1]*light,base.b*col[2]*light),alpha:mat.opacity});
      }
    });
    faces.sort((a,b)=>b.z-a.z);
    c.lineJoin='round';c.lineWidth=.35;
    for(const f of faces){c.globalAlpha=f.alpha;c.fillStyle=f.fill;c.beginPath();c.moveTo(f.ax,f.ay);c.lineTo(f.bx,f.by);c.lineTo(f.dx,f.dy);c.closePath();c.fill();if(f.alpha>.95){c.strokeStyle=f.fill;c.stroke();}}
    for(const l of lines){c.globalAlpha=l.alpha;c.strokeStyle=l.color;c.lineWidth=.7;c.beginPath();c.moveTo(l.x,l.y);c.lineTo(l.xx,l.yy);c.stroke();}
    for(const p of points){c.globalAlpha=p.alpha;c.fillStyle=p.color;c.beginPath();c.arc(p.x,p.y,1.3,0,Math.PI*2);c.fill();}
    c.globalAlpha=1;this.info.render.calls=calls;this.info.render.triangles=faces.length;
  }
}
