import * as THREE from 'three';

// Portable approximation of the reviewed Blender node graphs (passes 11/12).
// glTF cannot export Noise -> ColorRamp -> MixRGB, and treats the eye's height
// image as a color/normal map. Restore its intended semantics, not white defaults.
// Values below are linear RGB from the source graphs; noise is not a Cycles bake.
export function restoreBlenderMaterials(fly) {
  const palette = { m_7c431a: [.25,.105,.032], m_8a4e1e: [.28,.127,.041],
    live_leg: [.32,.16,.056], live_vein: [.4,.3,.17] };
  for (const [name, rgb] of Object.entries(palette)) {
    const mat = fly.materials[name];
    if (mat) mat.color.setRGB(...rgb);
  }
  for (let i=1;i<=6;i++) {
    const mat = fly.materials[`tergite_mat_${i}`];
    if (!mat) continue;
    mat.color.setRGB(...(i>=5 ? [.03,.012,.005] : [1,1,1]));
    if (i>=5) continue;
    mat.vertexColors = true;
    fly.group.traverse(mesh => {
      if (mesh.material !== mat) return;
      const geo = mesh.geometry; geo.computeBoundingBox();
      const pos = geo.attributes.position, box = geo.boundingBox;
      const colors = new Float32Array(pos.count*3);
      for (let v=0;v<pos.count;v++) {
        const x = (pos.getX(v)-box.min.x)/(box.max.x-box.min.x);
        const band = THREE.MathUtils.clamp((x-.655)/.06,0,1);
        for (let c=0;c<3;c++) colors[v*3+c] = THREE.MathUtils.lerp([.29,.142,.049][c],[.025,.009,.004][c],band);
      }
      geo.setAttribute('color',new THREE.BufferAttribute(colors,3));
    });
  }
  const eye = fly.materials.m_9e1c08;
  if (eye?.map?.image) {
    const height = eye.map;
    const canvas = document.createElement('canvas');
    canvas.width=height.image.width; canvas.height=height.image.height;
    const ctx=canvas.getContext('2d'); ctx.drawImage(height.image,0,0);
    const image=ctx.getImageData(0,0,canvas.width,canvas.height);
    const rgb = new THREE.Color();
    for(let p=0;p<image.data.length;p+=4) {
      const t=THREE.MathUtils.clamp((image.data[p]/255-.07)/(.75-.07),0,1);
      rgb.setRGB(THREE.MathUtils.lerp(.085,.38,t),THREE.MathUtils.lerp(.003,.017,t),THREE.MathUtils.lerp(.0015,.006,t)).convertLinearToSRGB();
      image.data[p]=Math.round(rgb.r*255);image.data[p+1]=Math.round(rgb.g*255);image.data[p+2]=Math.round(rgb.b*255);
    }
    ctx.putImageData(image,0,0);
    const color = new THREE.CanvasTexture(canvas);
    color.colorSpace=THREE.SRGBColorSpace; color.flipY=false;
    color.wrapS=height.wrapS; color.wrapT=height.wrapT;
    eye.map=color; eye.color.setRGB(1,1,1);
    height.colorSpace=THREE.NoColorSpace;
    eye.bumpMap=height;eye.bumpScale=.0012;
    // This is a grayscale height field, not tangent-space RGB normals.
    const oldNormal=eye.normalMap;eye.normalMap=null;
    if(oldNormal && oldNormal!==height)oldNormal.dispose();
    eye.needsUpdate=true;
  }
}
