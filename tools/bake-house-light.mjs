#!/usr/bin/env node
// Bakes indirect light for the Maple House into assets/house/bake/:
//  - lightmap.png: per-texel factor for sky/hemisphere/bounce light (stored as
//    sqrt(factor / 1.25), decoded in house-surfaces.js)
//  - bake.json: layout signature plus a coarse probe grid for characters inside.
// One factor of 1 means "as lit as an open field"; corners, rooms and the space
// under furniture get less. Direct sun and lamps stay dynamic in the game.
//
//   npm install --no-save three-mesh-bvh@0.9.16 sharp@0.35.5
//   node tools/bake-house-light.mjs [--rays 48]
import {mkdir,writeFile} from 'node:fs/promises';
import * as THREE from 'three';

const q=new Proxy({},{get:()=>()=>{}});globalThis.document={createElement:()=>({width:0,height:0,getContext:()=>q})};
const {createLandmarkHouse}=await import('../assets/landmark-house.js');
const {MODEL_HOME:H}=await import('../assets/house-rules.js');
let MeshBVH;try{({MeshBVH}=await import('three-mesh-bvh'));}catch{console.error('Install the tool dependencies first:\n  npm install --no-save three-mesh-bvh@0.9.16 sharp@0.35.5');process.exit(1);}

const RAYS=Number(process.argv[process.argv.indexOf('--rays')+1])||48,GROUND_ALBEDO=.22,FACTOR_MAX=1.25;
const house=createLandmarkHouse({scene:new THREE.Scene(),visualKit:{},obstacles:[],groundSurfaces:[]});
const layout=house.bakeLayout,W=layout.width,Ht=layout.height;
// Smooth each planar chart (one face) on its own, so light never bleeds between
// faces, then copy edge texels into the 1-texel border for filtering.
function smoothCharts(F,radius=2,passes=3){
 for(const c of layout.charts){if(c.kind!=='planar')continue;const x0=c.x+1,y0=c.y+1,w=c.w,h=c.h;
  for(let pass=0;pass<passes;pass++){const src=new Float32Array(w*h);for(let y=0;y<h;y++)for(let x=0;x<w;x++)src[y*w+x]=F[(y0+y)*W+x0+x];
   for(let y=0;y<h;y++)for(let x=0;x<w;x++){let s=0,n=0;for(let dy=-radius;dy<=radius;dy++)for(let dx=-radius;dx<=radius;dx++){const yy=y+dy,xx=x+dx;if(yy<0||yy>=h||xx<0||xx>=w)continue;s+=src[yy*w+xx];n++;}F[(y0+y)*W+x0+x]=s/n;}}
  for(let y=-1;y<=h;y++)for(let x=-1;x<=w;x++){if(x>=0&&x<w&&y>=0&&y<h)continue;const sx=Math.min(w-1,Math.max(0,x)),sy=Math.min(h-1,Math.max(0,y));F[(y0+y)*W+x0+x]=F[(y0+sy)*W+x0+sx];}
 }
}
const encode=F=>{const b=new Uint8Array(W*Ht);for(let i=0;i<b.length;i++)b[i]=Math.round(Math.sqrt(Math.max(0,Math.min(FACTOR_MAX,F[i]))/FACTOR_MAX)*255);return b;};
if(process.argv.includes('--filter-only')){
 const sharp=(await import('sharp')).default,{data,info}=await sharp('assets/house/bake/lightmap.png').extractChannel(0).raw().toBuffer({resolveWithObject:true});
 if(info.width!==W||info.height!==Ht)throw Error('lightmap does not match the current layout; run a full bake');
 const F=new Float32Array(W*Ht);for(let i=0;i<F.length;i++)F[i]=(data[i]/255)**2*FACTOR_MAX;smoothCharts(F);
 await sharp(Buffer.from(encode(F)),{raw:{width:W,height:Ht,channels:1}}).toColourspace('b-w').png({compressionLevel:9}).toFile('assets/house/bake/lightmap.tmp.png');
 (await import('node:fs')).renameSync('assets/house/bake/lightmap.tmp.png','assets/house/bake/lightmap.png');console.log('Smoothed the existing lightmap');process.exit(0);
}

// Occluders: every opaque merged house mesh plus a wide ground plane.
const triAlbedo=[],triUv=[],positions=[];
// Merged house surfaces are already in world space; furniture stand-ins (which
// models replace in the game) are transformed, so they still cast contact shade.
house.root.updateMatrixWorld(true);const v=new THREE.Vector3();
for(const mesh of house.bakeOccluders()){
 const material=[].concat(mesh.material)[0];if(material.transparent&&material.opacity<.9)continue;
 const albedo=material.userData?.albedo??(material.color?(material.color.r*.2126+material.color.g*.7152+material.color.b*.0722):.5);
 const g=mesh.geometry.index?mesh.geometry.toNonIndexed():mesh.geometry,pos=g.attributes.position,uv=g.attributes.houseBakeUv;
 for(let i=0;i<pos.count;i++){v.fromBufferAttribute(pos,i).applyMatrix4(mesh.matrixWorld);positions.push(v.x,v.y,v.z);}
 for(let t=0;t<pos.count/3;t++){triAlbedo.push(albedo);triUv.push(uv?[0,1,2].map(k=>[uv.getX(t*3+k),uv.getY(t*3+k)]):null);}
}
const G=220;positions.push(H.x-G,0,H.z-G, H.x-G,0,H.z+G, H.x+G,0,H.z-G, H.x+G,0,H.z-G, H.x-G,0,H.z+G, H.x+G,0,H.z+G);triAlbedo.push(GROUND_ALBEDO,GROUND_ALBEDO);triUv.push(null,null);
const occluder=new THREE.BufferGeometry();occluder.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));
const bvh=new MeshBVH(occluder),ray=new THREE.Ray(),index=occluder.index;

// Deterministic, stratified cosine-weighted directions around a normal.
function directions(n,count,salt,sphere=false){
 const out=[],t=Math.abs(n.y)<.9?new THREE.Vector3(0,1,0):new THREE.Vector3(1,0,0),u=new THREE.Vector3().crossVectors(t,n).normalize(),v=new THREE.Vector3().crossVectors(n,u),side=Math.ceil(Math.sqrt(count));
 let s=(salt*2654435761)>>>0;const rnd=()=>((s=(Math.imul(s,1664525)+1013904223)>>>0)/4294967296);
 for(let i=0;i<count;i++){const a=((i%side)+rnd())/side,b=((Math.floor(i/side)%side)+rnd())/side;
  if(sphere){const z=1-2*a,r=Math.sqrt(Math.max(0,1-z*z)),phi=2*Math.PI*b;out.push(new THREE.Vector3(r*Math.cos(phi),z,r*Math.sin(phi)));continue;}
  const r=Math.sqrt(a),phi=2*Math.PI*b,z=Math.sqrt(Math.max(0,1-a));out.push(new THREE.Vector3().addScaledVector(u,r*Math.cos(phi)).addScaledVector(v,r*Math.sin(phi)).addScaledVector(n,z));}
 return out;
}
// Radiance seen along a ray: sky above, sunlit ground below, or a house surface
// reflecting its own first-pass light (one bounce).
function trace(origin,dir,firstPass){
 ray.origin.copy(origin);ray.direction.copy(dir);
 const hit=bvh.raycastFirst(ray,THREE.DoubleSide,0,90);
 if(!hit)return dir.y>0?1:GROUND_ALBEDO;
 const tri=Math.floor(index.getX(hit.faceIndex*3)/3);
 if(!triUv[tri])return GROUND_ALBEDO;
 if(firstPass)return 0;
 const [a,b,c]=triUv[tri],bc=hit.barycoord||barycentric(hit.point,tri),u=a[0]*bc.x+b[0]*bc.y+c[0]*bc.z,v=a[1]*bc.x+b[1]*bc.y+c[1]*bc.z;
 return triAlbedo[tri]*firstPass_lookup(u,v);
}
const pa=new THREE.Vector3(),pb=new THREE.Vector3(),pc=new THREE.Vector3(),tri3=new THREE.Triangle();
function barycentric(point,tri){const p=occluder.attributes.position;pa.fromBufferAttribute(p,tri*3);pb.fromBufferAttribute(p,tri*3+1);pc.fromBufferAttribute(p,tri*3+2);tri3.set(pa,pb,pc);return tri3.getBarycoord(point,new THREE.Vector3());}
let V1=null;
function firstPass_lookup(u,v){const x=Math.min(W-1,Math.max(0,Math.floor(u*W))),y=Math.min(Ht-1,Math.max(0,Math.floor((1-v)*Ht)));return V1[y*W+x];}
// Open-field reference for a normal: what the factor is divided by.
const reference=(dirs)=>dirs.reduce((s,d)=>s+(d.y>0?1:GROUND_ALBEDO),0)/dirs.length;

// Texel samples: rasterize planar pieces; objects and probes are averaged.
const samples=new Array(W*Ht).fill(null),chartOf=new Int32Array(W*Ht).fill(-1);
const charts=layout.charts,chartId=new Map(charts.map((c,i)=>[c,i]));
for(const p of layout.pieces){
 if(p.chart.kind!=='planar')continue;const id=chartId.get(p.chart);
 for(let t=0;t<p.positions.length/9;t++){
  const P=[0,1,2].map(k=>new THREE.Vector3().fromArray(p.positions,(t*3+k)*3)),N=new THREE.Vector3().fromArray(p.normals,t*9).normalize();
  const T=[0,1,2].map(k=>[(p.chart.x+1+p.local[(t*3+k)*2]*p.chart.w),(p.chart.y+1+p.local[(t*3+k)*2+1]*p.chart.h)]);
  const minX=Math.max(0,Math.floor(Math.min(...T.map(a=>a[0])))),maxX=Math.min(W-1,Math.ceil(Math.max(...T.map(a=>a[0])))),minY=Math.max(0,Math.floor(Math.min(...T.map(a=>a[1])))),maxY=Math.min(Ht-1,Math.ceil(Math.max(...T.map(a=>a[1]))));
  const area=(T[1][0]-T[0][0])*(T[2][1]-T[0][1])-(T[2][0]-T[0][0])*(T[1][1]-T[0][1]);if(Math.abs(area)<1e-9)continue;
  for(let y=minY;y<=maxY;y++)for(let x=minX;x<=maxX;x++){
   const px=x+.5,py=y+.5,w0=((T[1][0]-px)*(T[2][1]-py)-(T[2][0]-px)*(T[1][1]-py))/area,w1=((T[2][0]-px)*(T[0][1]-py)-(T[0][0]-px)*(T[2][1]-py))/area,w2=1-w0-w1;
   if(w0<-1e-4||w1<-1e-4||w2<-1e-4||samples[y*W+x])continue;
   const pos=new THREE.Vector3().addScaledVector(P[0],w0).addScaledVector(P[1],w1).addScaledVector(P[2],w2);
   samples[y*W+x]={pos:pos.addScaledVector(N,.004),normal:N};chartOf[y*W+x]=id;
  }
 }
}
const objectSamples=charts.map((c,id)=>{
 if(c.kind==='object'){const pts=[];const ps=layout.pieces.filter(p=>p.chart===c);for(const p of ps)for(let k=0;k<p.positions.length/3;k+=Math.max(1,Math.floor(p.positions.length/3/24)))pts.push({pos:new THREE.Vector3().fromArray(p.positions,k*3),normal:new THREE.Vector3().fromArray(p.normals,k*3).normalize()});for(const s of pts)s.pos.addScaledVector(s.normal,.004);return pts;}
 if(c.kind==='probe')return [{pos:c.center.clone(),normal:null}];return null;});

function shade(sample,firstPass,salt){
 const dirs=sample.normal?directions(sample.normal,RAYS,salt):directions(new THREE.Vector3(0,1,0),RAYS*2,salt,true);
 let sum=0;for(const d of dirs)sum+=trace(sample.pos,d,firstPass);return {value:sum/dirs.length,ref:reference(dirs)};
}
const t0=Date.now();
function passOver(firstPass){
 const out=new Float32Array(W*Ht);let done=0;
 for(let i=0;i<samples.length;i++){const s=samples[i];if(!s)continue;out[i]=shade(s,firstPass,i+(firstPass?0:7919)).value;if(++done%100000===0)console.log((firstPass?'pass 1 ':'pass 2 ')+done+' texels '+Math.round((Date.now()-t0)/1000)+'s');}
 // Object and probe charts: one averaged value filling their whole region.
 charts.forEach((c,id)=>{const pts=objectSamples[id];if(!pts)return;let sum=0,ref=0;for(const [k,s] of pts.entries()){const r=shade(s,firstPass,id*131+k);sum+=r.value;ref+=r.ref;}const value=firstPass?sum/pts.length:Math.min(FACTOR_MAX,sum/ref);
  for(let y=c.y;y<c.y+c.h+2;y++)for(let x=c.x;x<c.x+c.w+2;x++){out[y*W+x]=value;chartOf[y*W+x]=id;}});
 return out;
}
V1=passOver(true);console.log('pass 1 done',Math.round((Date.now()-t0)/1000)+'s');
const L=passOver(false);console.log('pass 2 done',Math.round((Date.now()-t0)/1000)+'s');
// Normalize by the open-field reference for each texel's normal.
const F=new Float32Array(W*Ht);
for(let i=0;i<samples.length;i++){const s=samples[i];if(s)F[i]=Math.min(FACTOR_MAX,L[i]/reference(directions(s.normal,64,1)));else if(chartOf[i]>=0)F[i]=L[i];}
// Denoise inside each chart (3x3, two passes), then dilate into borders.
smoothCharts(F);
for(let pass=0;pass<2;pass++){const src=F.slice(),filled=samples.map(Boolean);for(let y=0;y<Ht;y++)for(let x=0;x<W;x++){const i=y*W+x;if(filled[i]||chartOf[i]<0&&pass>0)continue;let s=0,n=0;for(let dy=-1;dy<=1;dy++)for(let dx=-1;dx<=1;dx++){const j=(y+dy)*W+x+dx;if(y+dy<0||y+dy>=Ht||x+dx<0||x+dx>=W||!filled[j])continue;s+=src[j];n++;}if(n){F[i]=s/n;samples[i]=samples[i]||{fill:true};}}}

// Probe grid for characters: full-sphere light around 1.1 m above each point.
const step=.5,origin=[H.x-7,0,H.z-6.3],dims=[Math.ceil(14/step)+1,Math.ceil(7.6/step)+1,Math.ceil(12.6/step)+1],values=[];
const openSphere=.5+.5*GROUND_ALBEDO;
for(let z=0;z<dims[2];z++)for(let y=0;y<dims[1];y++)for(let x=0;x<dims[0];x++){const s={pos:new THREE.Vector3(origin[0]+x*step,origin[1]+y*step,origin[2]+z*step),normal:null};const r=shade(s,false,x*7+y*131+z*977);values.push(Math.round(Math.sqrt(Math.min(FACTOR_MAX,r.value/openSphere)/FACTOR_MAX)*255));}
console.log('probes done',values.length,Math.round((Date.now()-t0)/1000)+'s');

const bytes=encode(F);
const sharp=(await import('sharp')).default;await mkdir('assets/house/bake',{recursive:true});
await sharp(Buffer.from(bytes),{raw:{width:W,height:Ht,channels:1}}).toColourspace('b-w').png({compressionLevel:9}).toFile('assets/house/bake/lightmap.png');
await writeFile('assets/house/bake/bake.json',JSON.stringify({version:1,signature:layout.signature,width:W,height:Ht,density:layout.density,rays:RAYS,groundAlbedo:GROUND_ALBEDO,factorMax:FACTOR_MAX,probes:{origin,step,dims,values}}));
console.log('Wrote assets/house/bake/lightmap.png and bake.json in',Math.round((Date.now()-t0)/1000)+'s');
