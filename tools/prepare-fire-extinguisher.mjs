#!/usr/bin/env node
// Builds assets/safety/fire-extinguisher.glb from the owner-supplied mid-poly FBX
// (a stored-pressure extinguisher with hose, horn, gauge, tag and a wall bracket).
// The FBX has one untextured mesh and one grey material, so parts are found as
// connected pieces and given believable materials: red paint, black rubber hose
// and horn, black bracket straps, a dark steel wall bracket, a white gauge face,
// a paper tag and chrome valve hardware. The result is simplified for repeated use.
// Run from the repository root:
//   npm install --no-save @gltf-transform/core@4.5.1 @gltf-transform/functions@4.5.1 \
//     @gltf-transform/extensions@4.5.1 meshoptimizer@0.22.0 fbx2gltf@0.9.7-p1
//   node tools/prepare-fire-extinguisher.mjs --fbx /path/to/fire_extinguisher_mid_poly_model.fbx
import {execFileSync} from 'node:child_process';
import {mkdir,mkdtemp,rm} from 'node:fs/promises';
import {join,dirname} from 'node:path';
import {tmpdir} from 'node:os';
import {createRequire} from 'node:module';

let NodeIO,Document,getBounds,ALL_EXTENSIONS,F,MeshoptSimplifier;
try{({NodeIO,Document,getBounds}=await import('@gltf-transform/core'));({ALL_EXTENSIONS}=await import('@gltf-transform/extensions'));F=await import('@gltf-transform/functions');({MeshoptSimplifier}=await import('meshoptimizer'));}
catch(e){console.error('Install the tool dependencies first (see the header of this file).\n',e.message);process.exit(1);}
const args=process.argv.slice(2),arg=k=>args.includes(k)?args[args.indexOf(k)+1]:null,FBX=arg('--fbx');
if(!FBX){console.error('Pass --fbx /path/to/fire_extinguisher_mid_poly_model.fbx');process.exit(1);}
const BUDGET=Number(arg('--triangles')||5000),OUT='assets/safety/fire-extinguisher.glb';
const FBX2GLTF=join(dirname(createRequire(import.meta.url).resolve('fbx2gltf/package.json')),'bin',{linux:'Linux',darwin:'Darwin',win32:'Windows_NT'}[process.platform],process.platform==='win32'?'FBX2glTF.exe':'FBX2glTF');

const tmp=await mkdtemp(join(tmpdir(),'extinguisher-'));execFileSync(FBX2GLTF,['--binary','--input',FBX,'--output',join(tmp,'x')],{stdio:'ignore'});
const io=new NodeIO().registerExtensions(ALL_EXTENSIONS),src=await io.read(join(tmp,'x.glb'));await rm(tmp,{recursive:true,force:true});
const node=src.getRoot().listNodes().find(n=>n.getMesh()),M=node.getWorldMatrix(),prim=node.getMesh().listPrimitives()[0];
const pos=prim.getAttribute('POSITION'),nrm=prim.getAttribute('NORMAL'),idx=prim.getIndices().getArray(),n=pos.getCount();
// World-space metres, Y up (the converter already applies the FBX axis and unit scale).
const P=new Float32Array(n*3),N=new Float32Array(n*3),v=[0,0,0];
for(let i=0;i<n;i++){pos.getElement(i,v);for(let a=0;a<3;a++)P[i*3+a]=M[a]*v[0]+M[4+a]*v[1]+M[8+a]*v[2]+M[12+a];nrm.getElement(i,v);let l=0;for(let a=0;a<3;a++){N[i*3+a]=M[a]*v[0]+M[4+a]*v[1]+M[8+a]*v[2];l+=N[i*3+a]**2;}l=Math.sqrt(l)||1;for(let a=0;a<3;a++)N[i*3+a]/=l;}
// Connected pieces, joining UV seams by position.
const canon=new Map(),c=new Int32Array(n);for(let i=0;i<n;i++){const k=[0,1,2].map(a=>Math.round(P[i*3+a]*2e4)).join();if(!canon.has(k))canon.set(k,i);c[i]=canon.get(k);}
const par=Int32Array.from({length:n},(_,i)=>i),find=i=>{while(par[i]!==i){par[i]=par[par[i]];i=par[i];}return i;};
for(let t=0;t<idx.length;t+=3){const a=find(c[idx[t]]);for(const k of [1,2]){const b=find(c[idx[t+k]]);if(a!==b)par[b]=a;}}
const pieces=new Map();for(let t=0;t<idx.length;t+=3){const r=find(c[idx[t]]);let q=pieces.get(r);if(!q)pieces.set(r,q={tris:0,min:[9,9,9],max:[-9,-9,-9]});q.tris++;for(const k of [0,1,2])for(let a=0;a<3;a++){const w=P[idx[t+k]*3+a];q.min[a]=Math.min(q.min[a],w);q.max[a]=Math.max(q.max[a],w);}}
const ranked=[...pieces.values()].sort((a,b)=>b.tris-a.tris);
// Classify by size rank and position (verified against a per-piece colour render).
const MATERIALS={paint:[0xa8141c,.3,0],rubber:[0x141414,.72,0],strap:[0x1b1c1e,.6,0],bracket:[0x34383d,.45,.6],gauge:[0xf1eee6,.35,0],tag:[0xeee6c9,.85,0],chrome:[0xc8ccd1,.22,1]};
function kind(q,rank,z){
  if(rank===0)return z<-.066?'bracket':'paint';
  if(rank===2||rank===4)return 'rubber';                        // horn and hose
  if(rank===10||rank===11)return 'strap';                       // two bracket bands
  if(q.min[1]>.47&&q.max[1]>.55)return 'tag';                   // inspection tag above the valve
  if(rank===9)return 'gauge';                                   // front gauge face
  return 'chrome';
}
const rankOf=new Map(ranked.map((q,i)=>[q,i])),groups=Object.fromEntries(Object.keys(MATERIALS).map(k=>[k,[]]));
for(let t=0;t<idx.length;t+=3){const q=pieces.get(find(c[idx[t]])),z=(P[idx[t]*3+2]+P[idx[t+1]*3+2]+P[idx[t+2]*3+2])/3;groups[kind(q,rankOf.get(q),z)].push(idx[t],idx[t+1],idx[t+2]);}
const doc=new Document(),buffer=doc.createBuffer(),mesh=doc.createMesh('fire-extinguisher');
const position=doc.createAccessor().setType('VEC3').setArray(P).setBuffer(buffer),normal=doc.createAccessor().setType('VEC3').setArray(N).setBuffer(buffer);
for(const [name,list] of Object.entries(groups)){if(!list.length)continue;const [color,roughness,metalness]=MATERIALS[name];
  const material=doc.createMaterial(name).setBaseColorFactor([...[16,8,0].map(s=>((color>>s)&255)/255).map(c=>c**2.2),1]).setRoughnessFactor(roughness).setMetallicFactor(metalness);
  mesh.addPrimitive(doc.createPrimitive().setAttribute('POSITION',position).setAttribute('NORMAL',normal).setIndices(doc.createAccessor().setType('SCALAR').setArray(new Uint32Array(list)).setBuffer(buffer)).setMaterial(material));}
doc.createScene().addChild(doc.createNode('fire-extinguisher').setMesh(mesh));
const count=d=>d.getRoot().listMeshes().reduce((s,m)=>s+m.listPrimitives().reduce((k,p)=>k+p.getIndices().getCount()/3,0),0),before=count(doc);
await doc.transform(F.dedup(),F.weld(),F.simplify({simplifier:MeshoptSimplifier,ratio:Math.min(1,BUDGET/before),error:.002,lockBorder:false}),F.prune(),F.quantize());
await mkdir(dirname(OUT),{recursive:true});await io.write(OUT,doc);
const b=getBounds(doc.getRoot().listScenes()[0]);
console.log('triangles',before,'→',count(doc),'size',b.max.map((x,i)=>(x-b.min[i]).toFixed(3)).join(' × '),'m; parts',Object.entries(groups).map(([k,l])=>k+':'+l.length/3).join(' '));
