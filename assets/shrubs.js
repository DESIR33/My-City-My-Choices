import * as THREE from 'three';

// Leafy shrubs built the way games build foliage: many small leaf-cluster cards on
// a rounded shell, lit with outward-facing normals so the bush shades like one soft
// mass, around an opaque core that keeps it full from a distance. All shrubs share
// one material and draw as a few instanced meshes.

const rand=seed=>{let a=(seed>>>0)||1;return ()=>{a=(a+0x6d2b79f5)>>>0;let t=a;t=Math.imul(t^t>>>15,t|1);t^=t+Math.imul(t^t>>>7,t|61);return ((t^t>>>14)>>>0)/4294967296;};};

// Unit shrub: exactly 2 m wide/deep and 1.6 m tall before instance scaling, base at y=0.
// The leaf atlas is 2x2: two cluster sprites on top, opaque dense foliage below.
export function shrubGeometry(seed=1,{cards=72,coreDetail=1}={}){
 const r=rand(seed),pos=[],nor=[],uv=[],col=[],idx=[];
 const ry=.8,center=new THREE.Vector3(0,ry,0),up=new THREE.Vector3(0,1,0);
 const push=(p,n,u,v,c)=>{pos.push(p.x,p.y,p.z);nor.push(n.x,n.y,n.z);uv.push(u,v);col.push(c,c,c);};
 for(let i=0;i<cards;i++){
  // Points spread over an ellipsoid shell, denser near the outside.
  const theta=r()*Math.PI*2,phi=Math.acos(1-r()*1.75),shell=.62+r()*.38;
  const dir=new THREE.Vector3(Math.sin(phi)*Math.cos(theta),Math.cos(phi),Math.sin(phi)*Math.sin(theta)),at=center.clone().add(new THREE.Vector3(dir.x,dir.y*ry,dir.z).multiplyScalar(shell));
  if(at.y<.05)at.y=.05;
  const normal=new THREE.Vector3(dir.x,dir.y*1.4+.25,dir.z).normalize();
  // Card faces mostly outward with a random twist so clusters overlap from every angle.
  const facing=dir.clone().add(new THREE.Vector3(r()-.5,r()-.5,r()-.5).multiplyScalar(.9)).normalize();
  const side=new THREE.Vector3().crossVectors(Math.abs(facing.y)>.95?new THREE.Vector3(1,0,0):up,facing).normalize().applyAxisAngle(facing,r()*Math.PI*2);
  const upv=new THREE.Vector3().crossVectors(facing,side).normalize(),size=.34+r()*.16;
  const shade=.62+shell*.32+dir.y*.08+(r()-.5)*.12,sprite=r()<.5?0:.5,b=pos.length/3;
  const corners=[[-1,-1,0,.5],[1,-1,.5,.5],[1,1,.5,1],[-1,1,0,1]].map(([sx,sy,u,v])=>[at.clone().addScaledVector(side,sx*size).addScaledVector(upv,sy*size),u,v]),lift=Math.max(0,-Math.min(...corners.map(c=>c[0].y)));
  for(const [corner,u,v] of corners){corner.y+=lift;push(corner,normal,sprite+u,v,shade);}
  idx.push(b,b+1,b+2,b,b+2,b+3);
 }
 // Opaque inner core textured with the dense-foliage half of the atlas.
 const core=new THREE.IcosahedronGeometry(1,coreDetail),cp=core.attributes.position,b0=pos.length/3;
 for(let i=0;i<cp.count;i++){const d=new THREE.Vector3().fromBufferAttribute(cp,i),p=new THREE.Vector3(d.x*.7,ry+d.y*ry*.66,d.z*.7);if(p.y<.02)p.y=.02;push(p,new THREE.Vector3(d.x,d.y*1.4+.25,d.z).normalize(),(Math.atan2(d.z,d.x)/Math.PI*.5+.5)*.98+.01,(d.y*.5+.5)*.48+.01,.5+d.y*.1);}
 const ci=core.index?Array.from(core.index.array):[...Array(cp.count).keys()];for(const i of ci)idx.push(b0+i);core.dispose();
 // Normalise to exactly 2 m wide/deep and 1.6 m tall so instance scales are true metres.
 {let minX=Infinity,maxX=-Infinity,minZ=Infinity,maxZ=-Infinity,maxY=0;for(let i=0;i<pos.length;i+=3){minX=Math.min(minX,pos[i]);maxX=Math.max(maxX,pos[i]);maxY=Math.max(maxY,pos[i+1]);minZ=Math.min(minZ,pos[i+2]);maxZ=Math.max(maxZ,pos[i+2]);}
  const sx=2/(maxX-minX),sy=1.6/maxY,sz=2/(maxZ-minZ),cx=(minX+maxX)/2,cz=(minZ+maxZ)/2;for(let i=0;i<pos.length;i+=3){pos[i]=(pos[i]-cx)*sx;pos[i+1]*=sy;pos[i+2]=(pos[i+2]-cz)*sz;}}
 const g=new THREE.BufferGeometry();
 g.setAttribute('position',new THREE.Float32BufferAttribute(pos,3));g.setAttribute('normal',new THREE.Float32BufferAttribute(nor,3));
 g.setAttribute('uv',new THREE.Float32BufferAttribute(uv,2));g.setAttribute('color',new THREE.Float32BufferAttribute(col,3));g.setIndex(idx);
 g.computeBoundingBox();g.computeBoundingSphere();return g;
}

// 2x2 leaf atlas drawn on a canvas: top = two leaf-cluster sprites with alpha,
// bottom = solid dense foliage for the core.
export function drawLeafAtlas(size=256){
 const c=document.createElement('canvas');c.width=c.height=size;const q=c.getContext('2d'),r=rand(77),h=size/2;
 const leaf=(x,y,len,wid,angle,shade)=>{q.save();q.translate(x,y);q.rotate(angle);const g=Math.round(70+shade*70),rr=Math.round(38+shade*40),bb=Math.round(28+shade*25);
  q.fillStyle=`rgb(${rr},${g},${bb})`;q.beginPath();q.moveTo(0,0);q.quadraticCurveTo(wid,len*.45,0,len);q.quadraticCurveTo(-wid,len*.45,0,0);q.fill();
  q.strokeStyle=`rgba(${rr-15},${g-30},${bb-10},.8)`;q.lineWidth=Math.max(1,size/256);q.beginPath();q.moveTo(0,len*.05);q.lineTo(0,len*.9);q.stroke();q.restore();};
 q.clearRect(0,0,size,size);
 // Bottom half: fully covered foliage (opaque).
 q.fillStyle='#2f4a26';q.fillRect(0,h,size,h);for(let i=0;i<220;i++)leaf(r()*size,h+r()*h,size*(.05+r()*.04),size*(.025+r()*.015),r()*Math.PI*2,r());
 // Top half: two clusters of leaves radiating from a twig, transparent around them.
 for(const ox of [0,h])for(let i=0;i<30;i++){const a=r()*Math.PI*2,d=r()*h*.3;leaf(ox+h/2+Math.cos(a)*d*.5,h/2+Math.sin(a)*d*.5,h*(.2+r()*.14),h*(.08+r()*.05),a+Math.PI/2+(r()-.5)*.7,.35+r()*.65);}
 return c;
}

export function createShrubField(scene,{variants=3,capacity=640,anisotropy=4,mobile=false}={}){
 const map=new THREE.CanvasTexture(drawLeafAtlas(mobile?128:256));map.colorSpace=THREE.SRGBColorSpace;map.anisotropy=anisotropy;
 const material=new THREE.MeshStandardMaterial({name:'Shrub foliage',map,vertexColors:true,alphaTest:.45,side:THREE.DoubleSide,roughness:.78,metalness:0});
 const meshes=Array.from({length:variants},(_,i)=>{const m=new THREE.InstancedMesh(shrubGeometry(11+i*37,{cards:mobile?48:72,coreDetail:mobile?0:1}),material,capacity);m.count=0;m.name='Shrubs '+i;m.castShadow=m.receiveShadow=true;m.frustumCulled=false;m.userData.shrubs=true;scene.add(m);return m;});
 const matrix=new THREE.Matrix4(),q=new THREE.Quaternion(),color=new THREE.Color(),white=new THREE.Color(1,1,1);let placed=0;
 // width/height in metres; tint nudges the hue (the leaves are already green); heading in radians.
 function add(x,y,z,{width=.9,height=.65,depth=width,tint=0x5d7750,heading=null,variant=null}={}){
  const mesh=meshes[variant??(placed%variants)];if(mesh.count>=capacity)return false;
  q.setFromAxisAngle(new THREE.Vector3(0,1,0),heading??placed*2.399);matrix.compose(new THREE.Vector3(x,y,z),q,new THREE.Vector3(width/2,height/1.6,depth/2));
  mesh.setMatrixAt(mesh.count,matrix);color.setHex(tint);color.multiplyScalar(1/Math.max(color.r,color.g,color.b,1e-3));color.lerpColors(white,color,.35).multiplyScalar(.9+((placed*0.618)%1)*.22);mesh.setColorAt(mesh.count,color);
  mesh.count++;placed++;mesh.instanceMatrix.needsUpdate=true;if(mesh.instanceColor)mesh.instanceColor.needsUpdate=true;return true;
 }
 return {add,meshes,material,get count(){return placed;}};
}
