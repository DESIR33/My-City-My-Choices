import * as THREE from 'three';
import {mergeGeometries} from 'three/addons/utils/BufferGeometryUtils.js';

// Static house meshes are merged per material, with a second UV set (houseBakeUv)
// that addresses a lightmap atlas. The same deterministic layout runs in the game
// and in tools/bake-house-light.mjs, so the baked image always lines up. A
// signature of the layout is stored with the bake; tests fail if they drift.
export const BAKE_WIDTH=2048,BAKE_MAX_HEIGHT=2048,BAKE_BORDER=1,BAKE_DENSITIES=Object.freeze([20,18,16,14,12,10,8]);

const corner=(pos,i)=>new THREE.Vector3(pos.getX(i),pos.getY(i),pos.getZ(i));
// Turn one source mesh into world-space triangle pieces, each with a chart.
function piecesFor(mesh,charts){
 const g=mesh.geometry,pos=g.attributes.position,nor=g.attributes.normal,uv=g.attributes.uv,index=g.index,matrix=mesh.matrixWorld,normalMatrix=new THREE.Matrix3().getNormalMatrix(matrix);
 const materials=Array.isArray(mesh.material)?mesh.material:null,groups=g.groups.length?g.groups:[{start:0,count:index?index.count:pos.count,materialIndex:0}];
 const planar=g.type==='BoxGeometry'||g.type==='PlaneGeometry'||g.type==='ShapeGeometry',out=[];
 const object=planar?null:{kind:'object',w:2,h:2,mesh};if(object)charts.push(object);
 for(const group of groups){
  const ids=[];for(let k=group.start;k<group.start+group.count;k++)ids.push(index?index.getX(k):k);if(!ids.length)continue;
  const material=materials?materials[group.materialIndex]:mesh.material;if(!material)continue;
  let chart=object,local;
  if(planar){
   // Chart size from the face's real dimensions. Box faces carry 0..1 UVs; planes
   // and shapes use their local XY extent scaled by the mesh.
   const unique=[...new Set(ids)];let u0=Infinity,u1=-Infinity,v0=Infinity,v1=-Infinity;
   const scale=new THREE.Vector3();matrix.decompose(new THREE.Vector3(),new THREE.Quaternion(),scale);
   const lx=i=>g.type==='BoxGeometry'?uv.getX(i):pos.getX(i),ly=i=>g.type==='BoxGeometry'?uv.getY(i):pos.getY(i);
   for(const i of unique){u0=Math.min(u0,lx(i));u1=Math.max(u1,lx(i));v0=Math.min(v0,ly(i));v1=Math.max(v1,ly(i));}
   const find=(a,b)=>unique.find(i=>Math.abs(lx(i)-a)<1e-6&&Math.abs(ly(i)-b)<1e-6);
   let width,height;
   if(g.type==='BoxGeometry'){const o=find(u0,v0),x=find(u1,v0),y=find(u0,v1);const p=i=>corner(pos,i).applyMatrix4(matrix);width=p(o).distanceTo(p(x));height=p(o).distanceTo(p(y));}
   else{width=(u1-u0)*scale.x;height=(v1-v0)*scale.y;}
   chart={kind:'planar',meters:[width,height],w:0,h:0};charts.push(chart);
   local=i=>[(lx(i)-u0)/Math.max(1e-9,u1-u0),(ly(i)-v0)/Math.max(1e-9,v1-v0)];
  }
  const n=ids.length,P=new Float32Array(n*3),N=new Float32Array(n*3),U=new Float32Array(n*2),L=new Float32Array(n*2),v=new THREE.Vector3();
  ids.forEach((i,k)=>{v.fromBufferAttribute(pos,i).applyMatrix4(matrix);P.set([v.x,v.y,v.z],k*3);v.fromBufferAttribute(nor,i).applyMatrix3(normalMatrix).normalize();N.set([v.x,v.y,v.z],k*3);if(uv)U.set([uv.getX(i),uv.getY(i)],k*2);L.set(planar?local(i):[.5,.5],k*2);});
  out.push({material,castShadow:mesh.castShadow,positions:P,normals:N,uvs:U,local:L,chart,source:mesh});
 }
 return out;
}
function pack(charts,density){
 for(const c of charts)if(c.kind==='planar'){c.w=Math.max(2,Math.ceil(c.meters[0]*density));c.h=Math.max(2,Math.ceil(c.meters[1]*density));}
 const order=charts.map((c,i)=>i).sort((a,b)=>charts[b].h-charts[a].h||charts[b].w-charts[a].w||a-b);
 let x=0,y=0,shelf=0;
 for(const i of order){const c=charts[i],cw=c.w+2*BAKE_BORDER,ch=c.h+2*BAKE_BORDER;if(x+cw>BAKE_WIDTH){x=0;y+=shelf;shelf=0;}c.x=x;c.y=y;x+=cw;shelf=Math.max(shelf,ch);}
 return Math.ceil((y+shelf)/4)*4;
}
const fnv=(h,n)=>{h^=n&0xffff;h=Math.imul(h,16777619)>>>0;h^=n>>>16;return Math.imul(h,16777619)>>>0;};

// Merge static meshes, lay out the atlas and give dynamic meshes a probe chart.
export function mergeHouseStatic(staticMeshes,dynamicMeshes=[],{boxesFor=()=>null,groupOf=m=>m}={}){
 const charts=[],pieces=staticMeshes.flatMap(m=>piecesFor(m,charts));
 // One probe chart per moving group (a door, a drawer, a chair), sampled at its centre.
 const groups=new Map();for(const mesh of dynamicMeshes){const key=groupOf(mesh);if(!groups.has(key))groups.set(key,[]);groups.get(key).push(mesh);}
 const probes=[...groups.entries()].map(([key,meshes])=>{const box=new THREE.Box3();for(const m of meshes)box.expandByObject(m,true);const c={kind:'probe',w:2,h:2,key,meshes,center:box.getCenter(new THREE.Vector3())};charts.push(c);return c;});
 let density=BAKE_DENSITIES.at(-1),height=0;
 for(const d of BAKE_DENSITIES){height=pack(charts,d);density=d;if(height<=BAKE_MAX_HEIGHT)break;}
 const atlasUv=(c,lu,lv)=>[(c.x+BAKE_BORDER+lu*c.w)/BAKE_WIDTH,1-(c.y+BAKE_BORDER+lv*c.h)/height];
 const buckets=new Map();
 for(const p of pieces){const key=p.material.uuid+':'+p.castShadow;if(!buckets.has(key))buckets.set(key,{material:p.material,castShadow:p.castShadow,pieces:[],sources:new Set()});const b=buckets.get(key);b.pieces.push(p);b.sources.add(p.source);}
 const claimed=new Set(),meshes=[];
 for(const b of buckets.values()){
  const geos=b.pieces.map(p=>{const g=new THREE.BufferGeometry(),n=p.positions.length/3,bake=new Float32Array(n*2);for(let k=0;k<n;k++)bake.set(atlasUv(p.chart,p.local[k*2],p.local[k*2+1]),k*2);g.setAttribute('position',new THREE.BufferAttribute(p.positions,3));g.setAttribute('normal',new THREE.BufferAttribute(p.normals,3));g.setAttribute('uv',new THREE.BufferAttribute(p.uvs,2));g.setAttribute('houseBakeUv',new THREE.BufferAttribute(bake,2));return g;});
  const geometry=mergeGeometries(geos,false);geos.forEach(g=>g.dispose());
  const mesh=new THREE.Mesh(geometry,b.material);mesh.name='Maple House baked surfaces';mesh.castShadow=b.castShadow;mesh.receiveShadow=true;
  const boxes=[];for(const s of b.sources){if(claimed.has(s))continue;claimed.add(s);const box=boxesFor(s);if(box)boxes.push(box);}
  mesh.userData.architectureBoxes=boxes;geometry.computeBoundingSphere();geometry.computeBoundingBox();meshes.push(mesh);
 }
 // Dynamic meshes keep their own transforms; one constant UV samples their probe.
 for(const c of probes){const uv=atlasUv(c,.5,.5);c.uv=uv;for(const mesh of c.meshes){const g=mesh.geometry.clone(),n=g.attributes.position.count,bake=new Float32Array(n*2);for(let k=0;k<n;k++)bake.set(uv,k*2);g.setAttribute('houseBakeUv',new THREE.BufferAttribute(bake,2));mesh.geometry=g;}}
 let signature=fnv(2166136261,BAKE_WIDTH);signature=fnv(signature,height);signature=fnv(signature,density);
 for(const c of charts)for(const n of [c.x,c.y,c.w,c.h,c.kind==='planar'?1:c.kind==='object'?2:3])signature=fnv(signature,n);
 for(const p of pieces)for(let k=0;k<p.positions.length;k+=9)signature=fnv(signature,Math.round(p.positions[k]*100)+Math.round(p.positions[k+1]*100)*7+Math.round(p.positions[k+2]*100)*13);
 return {meshes,probeUv:key=>probes.find(c=>c.key===key)?.uv||null,layout:{width:BAKE_WIDTH,height,density,charts,pieces,signature:signature.toString(16)}};
}

// Load the baked lightmap as a single-channel texture (a quarter of the memory of
// an RGBA image). The PNG's top row is the atlas row y=0, which the layout maps
// to v=1, so rows are flipped into the DataTexture (whose first row is v=0).
export async function loadHouseBake({base='./assets/house/bake/',fetchImpl=globalThis.fetch}={}){
 const [image,data]=await Promise.all([fetchImpl(base+'lightmap.png').then(r=>{if(!r.ok)throw Error('lightmap '+r.status);return r.blob()}).then(b=>createImageBitmap(b)),fetchImpl(base+'bake.json').then(r=>{if(!r.ok)throw Error('bake '+r.status);return r.json()})]);
 const w=image.width,h=image.height,canvas=typeof OffscreenCanvas!=='undefined'?new OffscreenCanvas(w,h):Object.assign(document.createElement('canvas'),{width:w,height:h}),q=canvas.getContext('2d',{willReadFrequently:true});
 q.drawImage(image,0,0);const rgba=q.getImageData(0,0,w,h).data,red=new Uint8Array(w*h);image.close?.();
 for(let y=0;y<h;y++){const src=y*w*4,dst=(h-1-y)*w;for(let x=0;x<w;x++)red[dst+x]=rgba[src+x*4];}
 const texture=new THREE.DataTexture(red,w,h,THREE.RedFormat,THREE.UnsignedByteType);
 texture.magFilter=THREE.LinearFilter;texture.minFilter=THREE.LinearMipmapLinearFilter;texture.generateMipmaps=true;texture.colorSpace=THREE.NoColorSpace;texture.needsUpdate=true;
 return {texture,data};
}
