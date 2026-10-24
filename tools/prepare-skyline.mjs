#!/usr/bin/env node
// Builds Northstar City's San Francisco skyline from the owner-supplied city FBX.
// The FBX is a blocky model of northeast San Francisco (seven parts, about 467k
// triangles; its texture JPGs are referenced but were not supplied). The tool:
//  1. keeps the downtown core and measures the street level under every point,
//  2. scales the city so its tallest tower stands 326 m,
//  3. lifts out the 15 tallest towers, squares each to the street grid and fits it
//     to one of Northstar's 15 tower lots (tallest tower to the tallest lot),
//  4. places the rest of downtown north of Northstar as a scenery skyline.
// Each triangle is labelled facade, roof or street in its vertex colour (alpha marks
// facades, RGB is the building tint) and carries its height above the street
// (_LEVEL), so the runtime shader draws floors, windows and lit rooms at night.
// Outputs (meshopt compressed): towers.glb and skyline.glb, plus layout.js, in
// assets/city/skyline. Phones load only towers.glb.
// Run from the repository root:
//   npm install --no-save @gltf-transform/core@4.5.1 @gltf-transform/functions@4.5.1 \
//     @gltf-transform/extensions@4.5.1 meshoptimizer@0.22.0 fbx2gltf@0.9.7-p1
//   node tools/prepare-skyline.mjs --fbx /path/to/SanFrancisco_City.fbx
import {execFileSync} from 'node:child_process';
import {mkdir,mkdtemp,rm,writeFile} from 'node:fs/promises';
import {join,dirname} from 'node:path';
import {tmpdir} from 'node:os';
import {createRequire} from 'node:module';
import {TOWERS} from '../assets/world-rules.js';

let NodeIO,Document,ALL_EXTENSIONS,F,MeshoptEncoder;
try{({NodeIO,Document}=await import('@gltf-transform/core'));({ALL_EXTENSIONS}=await import('@gltf-transform/extensions'));F=await import('@gltf-transform/functions');({MeshoptEncoder}=await import('meshoptimizer'));}
catch(e){console.error('Install the tool dependencies first (see the header of this file).\n',e.message);process.exit(1);}
const args=process.argv.slice(2),arg=(k,d)=>args.includes(k)?args[args.indexOf(k)+1]:d,FBX=arg('--fbx'),GLB=arg('--glb');
if(!FBX&&!GLB){console.error('Pass --fbx /path/to/SanFrancisco_City.fbx');process.exit(1);}
// Crop in model units (about 0.59 km each), yaw in degrees, game placement in metres.
const CROP=arg('--crop','-3.05,-1.85,-3.15,-1.55').split(',').map(Number),YAW=Number(arg('--yaw','0'))*Math.PI/180;
const TALLEST=Number(arg('--tallest','326')),CENTER_X=Number(arg('--x','0')),NEAR_Z=Number(arg('--near','-1850')),OUT=arg('--out','assets/city/skyline');

let glb=GLB,tmp=null;
if(!glb){const FBX2GLTF=join(dirname(createRequire(import.meta.url).resolve('fbx2gltf/package.json')),'bin',{linux:'Linux',darwin:'Darwin',win32:'Windows_NT'}[process.platform],process.platform==='win32'?'FBX2glTF.exe':'FBX2glTF');
  tmp=await mkdtemp(join(tmpdir(),'skyline-'));execFileSync(FBX2GLTF,['--binary','--input',FBX,'--output',join(tmp,'x')],{stdio:'ignore'});glb=join(tmp,'x.glb');}
const io=new NodeIO().registerExtensions(ALL_EXTENSIONS).registerDependencies({'meshopt.encoder':MeshoptEncoder});await MeshoptEncoder.ready;
const src=await io.read(glb);if(tmp)await rm(tmp,{recursive:true,force:true});

// ---- world-space triangles inside the crop, with connected-piece ids ----
const [cx0,cx1,cz0,cz1]=CROP,T=[],comp=[];let compBase=0;
for(const node of src.getRoot().listNodes()){const mesh=node.getMesh();if(!mesh)continue;const W=node.getWorldMatrix();
  for(const p of mesh.listPrimitives()){const pos=p.getAttribute('POSITION'),idx=p.getIndices(),N=pos.getCount(),P=new Float64Array(N*3),v=[0,0,0];
    for(let i=0;i<N;i++){pos.getElement(i,v);for(let a=0;a<3;a++)P[i*3+a]=W[a]*v[0]+W[4+a]*v[1]+W[8+a]*v[2]+W[12+a];}
    const I=idx?idx.getArray():null,count=I?I.length/3:N/3,at=k=>I?I[k]:k;
    const keys=new Map(),id=new Int32Array(N);for(let i=0;i<N;i++){const k=Math.round(P[i*3]*2e4)+','+Math.round(P[i*3+1]*2e4)+','+Math.round(P[i*3+2]*2e4);if(!keys.has(k))keys.set(k,keys.size);id[i]=keys.get(k);}
    const par=new Int32Array(keys.size).map((_,i)=>i),f=a=>{while(par[a]!==a){par[a]=par[par[a]];a=par[a];}return a;};
    for(let t=0;t<count;t++){const a=f(id[at(t*3)]);for(const k of [1,2]){const b=f(id[at(t*3+k)]);if(a!==b)par[b]=a;}}
    for(let t=0;t<count;t++){let mx=0,mz=0;for(let k=0;k<3;k++){const i=at(t*3+k);mx+=P[i*3];mz+=P[i*3+2];}mx/=3;mz/=3;if(mx<cx0||mx>cx1||mz<cz0||mz>cz1)continue;
      for(let k=0;k<3;k++){const i=at(t*3+k);T.push(P[i*3],P[i*3+1],P[i*3+2]);}comp.push(compBase+f(id[at(t*3)]));}
    compBase+=keys.size;}}
const nT=comp.length;console.log('triangles in crop',nT);
const normalOf=t=>{const o=t*9,ax=T[o+3]-T[o],ay=T[o+4]-T[o+1],az=T[o+5]-T[o+2],bx=T[o+6]-T[o],by=T[o+7]-T[o+1],bz=T[o+8]-T[o+2];let nx=ay*bz-az*by,ny=az*bx-ax*bz,nz=ax*by-ay*bx;const l=Math.hypot(nx,ny,nz)||1;return [nx/l,ny/l,nz/l,l/2];};

// ---- street level: lowest surface within ~40 m, on a 0.01-unit (about 6 m) grid ----
const G=.01,gw=Math.ceil((cx1-cx0)/G)+1,gh=Math.ceil((cz1-cz0)/G)+1,low=new Float64Array(gw*gh).fill(Infinity),high=new Float64Array(gw*gh).fill(-Infinity);
const cellIJ=(x,z)=>[Math.min(gw-1,Math.max(0,Math.floor((x-cx0)/G))),Math.min(gh-1,Math.max(0,Math.floor((z-cz0)/G)))],cell=(x,z)=>{const [i,j]=cellIJ(x,z);return j*gw+i;};
for(let t=0;t<nT;t++){const flat=Math.abs(normalOf(t)[1])>=.85;for(let k=0;k<3;k++){const o=t*9+k*3,c=cell(T[o],T[o+2]);if(flat)low[c]=Math.min(low[c],T[o+1]);high[c]=Math.max(high[c],T[o+1]);}}
const R=7,ground=new Float64Array(gw*gh);
for(let j=0;j<gh;j++)for(let i=0;i<gw;i++){let m=Infinity;for(let b=-R;b<=R;b++)for(let a=-R;a<=R;a++){const ii=i+a,jj=j+b;if(ii<0||jj<0||ii>=gw||jj>=gh)continue;m=Math.min(m,low[jj*gw+ii]);}ground[j*gw+i]=m;}
for(let pass=0;pass<30;pass++)for(let c=0;c<gw*gh;c++)if(!Number.isFinite(ground[c])){const n=[c-1,c+1,c-gw,c+gw].filter(q=>q>=0&&q<gw*gh&&Number.isFinite(ground[q]));if(n.length)ground[c]=Math.min(...n.map(q=>ground[q]));}
const groundAt=(x,z)=>ground[cell(x,z)],levelOf=(t,k)=>{const o=t*9+k*3;return T[o+1]-groundAt(T[o],T[o+2]);};

// ---- scale: the tallest point above its street becomes TALLEST metres ----
let top=0;for(let t=0;t<nT;t++)for(let k=0;k<3;k++)top=Math.max(top,levelOf(t,k));
const S=TALLEST/top;console.log('scale',S.toFixed(1),'m per unit');
const H=new Float64Array(gw*gh);for(let c=0;c<gw*gh;c++)H[c]=Number.isFinite(high[c])?Math.max(0,(high[c]-ground[c])*S):0;

// ---- the 15 tallest towers: peaks, footprints grown from each peak ----
const peaks=[];for(let j=3;j<gh-3;j++)for(let i=3;i<gw-3;i++){const h=H[j*gw+i];if(h<90)continue;let max=true;for(let b=-4;b<=4&&max;b++)for(let a=-4;a<=4;a++)if((a||b)&&H[(j+b)*gw+i+a]>h){max=false;break;}if(max)peaks.push({i,j,h});}
peaks.sort((a,b)=>b.h-a.h);
const owner=new Int16Array(gw*gh).fill(-1),towers=[];
for(const p of peaks){if(towers.length===TOWERS.length)break;if(owner[p.j*gw+p.i]>=0)continue;
  const region=[],queue=[[p.i,p.j]],seen=new Set([p.j*gw+p.i]),cut=Math.max(40,p.h*.5),reach=6;
  while(queue.length){const [i,j]=queue.pop(),c=j*gw+i;if(owner[c]>=0)continue;region.push(c);
    for(const [a,b] of [[1,0],[-1,0],[0,1],[0,-1],[1,1],[1,-1],[-1,1],[-1,-1]]){const ii=i+a,jj=j+b,cc=jj*gw+ii;if(ii<0||jj<0||ii>=gw||jj>=gh||seen.has(cc))continue;seen.add(cc);if(H[cc]>=cut&&Math.abs(ii-p.i)<=reach&&Math.abs(jj-p.j)<=reach)queue.push([ii,jj]);}}
  if(region.length<4)continue;const id=towers.length;
  // claim the footprint plus a one-cell margin so its walls come with it
  for(const c of region){const i=c%gw,j=(c-i)/gw;for(let b=-1;b<=1;b++)for(let a=-1;a<=1;a++){const ii=i+a,jj=j+b;if(ii<0||jj<0||ii>=gw||jj>=gh)continue;const cc=jj*gw+ii;if(owner[cc]<0&&H[cc]>=12)owner[cc]=id;}}
  towers.push({id,h:p.h,peak:[cx0+(p.i+.5)*G,cz0+(p.j+.5)*G],tris:[]});}
// A tower is every triangle reaching above half its height in its footprint, plus
// anything lower that lies wholly inside the footprint those triangles outline.
const claimed=new Int16Array(nT).fill(-1);
for(let t=0;t<nT;t++){let mx=0,mz=0,lv=0;for(let k=0;k<3;k++){const o=t*9+k*3;mx+=T[o]/3;mz+=T[o+2]/3;lv=Math.max(lv,levelOf(t,k)*S);}const o=owner[cell(mx,mz)];if(o>=0&&lv>=Math.max(40,towers[o].h*.5)){claimed[t]=o;towers[o].tris.push(t);}}
for(const tw of towers){let x0=Infinity,x1=-Infinity,z0=Infinity,z1=-Infinity;for(const t of tw.tris)for(let k=0;k<3;k++){const o=t*9+k*3;x0=Math.min(x0,T[o]);x1=Math.max(x1,T[o]);z0=Math.min(z0,T[o+2]);z1=Math.max(z1,T[o+2]);}tw.box=[x0,x1,z0,z1];}
const m2=2/S;for(let t=0;t<nT;t++){if(claimed[t]>=0)continue;let lv=0;for(let k=0;k<3;k++)lv=Math.max(lv,levelOf(t,k)*S);if(lv<=1.5)continue;
  for(const tw of towers){const [x0,x1,z0,z1]=tw.box;let inside=true;for(let k=0;k<3&&inside;k++){const o=t*9+k*3;inside=T[o]>=x0-m2&&T[o]<=x1+m2&&T[o+2]>=z0-m2&&T[o+2]<=z1+m2;}if(inside){claimed[t]=tw.id;tw.tris.push(t);break;}}}
console.log('towers',towers.map(t=>Math.round(t.h)).join(' '));

// ---- shared attribute building ----
const hash=n=>{n=Math.imul(n^0x9e3779b9,0x85ebca6b);n^=n>>>13;n=Math.imul(n,0xc2b2ae35);return ((n^n>>>16)>>>0)/4294967296;};
const FACADES=[[226,220,206],[214,204,184],[196,182,154],[186,190,194],[164,170,176],[128,148,164],[92,110,126],[70,82,96],[150,118,104],[230,228,222],[178,166,146],[110,98,92]];
const ROOF=[[120,122,124],[142,140,134],[104,108,112]],STREET=[86,88,92];
function attributes(list,place){// place(x,z) in metres relative to the model -> [gx,gz] ; returns typed arrays
  const n=list.length,pos=new Float32Array(n*9),nor=new Float32Array(n*9),col=new Uint8Array(n*12),lev=new Float32Array(n*3),rot=place.rot||0,c=Math.cos(rot),s=Math.sin(rot);
  list.forEach((t,q)=>{const nn=normalOf(t),facade=Math.abs(nn[1])<.75;let above=0;
    for(let k=0;k<3;k++){const o=t*9+k*3,y=Math.max(0,levelOf(t,k)*S);above=Math.max(above,y);const [gx,gz]=place(T[o]*S,T[o+2]*S);pos.set([gx,y,gz],q*9+k*3);lev[q*3+k]=y;nor.set([nn[0]*c-nn[2]*s,nn[1],nn[0]*s+nn[2]*c],q*9+k*3);}
    const h=hash(comp[t]),tint=!facade&&above<2.5?STREET:facade?FACADES[Math.floor(h*FACADES.length)]:ROOF[Math.floor(h*ROOF.length)];
    for(let k=0;k<3;k++)col.set([tint[0],tint[1],tint[2],facade?255:0],q*12+k*4);});
  return {pos,nor,col,lev,count:n};}
function primitive(doc,buf,a,name){return doc.createPrimitive()
  .setAttribute('POSITION',doc.createAccessor().setType('VEC3').setArray(a.pos).setBuffer(buf))
  .setAttribute('NORMAL',doc.createAccessor().setType('VEC3').setArray(a.nor).setBuffer(buf))
  .setAttribute('COLOR_0',doc.createAccessor().setType('VEC4').setArray(a.col).setNormalized(true).setBuffer(buf))
  .setAttribute('_LEVEL',doc.createAccessor().setType('SCALAR').setArray(a.lev).setBuffer(buf))
  .setMaterial(doc.getRoot().listMaterials()[0]||doc.createMaterial(name).setRoughnessFactor(.85));}
async function save(file,parts){const doc=new Document(),buf=doc.createBuffer(),scene=doc.createScene();
  for(const [name,a,translation] of parts){if(!a.count)continue;const mesh=doc.createMesh(name).addPrimitive(primitive(doc,buf,a,'Northstar skyline'));const node=doc.createNode(name).setMesh(mesh);if(translation)node.setTranslation(translation);scene.addChild(node);}
  await doc.transform(F.weld(),F.reorder({encoder:MeshoptEncoder}),F.quantize({quantizePosition:14,quantizeNormal:8,pattern:/^(POSITION|NORMAL|COLOR_0)$/}),F.meshopt({encoder:MeshoptEncoder,level:'high'}));
  await io.write(file,doc);}

// ---- towers: square to the street grid, fit to the lot, tallest to tallest ----
const lots=TOWERS.map((t,i)=>({i,...t})).sort((a,b)=>b.height-a.height),towerParts=[],towerLayout=[];
const order=towers.slice().sort((a,b)=>b.h-a.h);
order.forEach((tw,rank)=>{const lot=lots[rank];
  // dominant wall direction (area-weighted, folded into 90 degrees)
  let sx=0,sy=0;for(const t of tw.tris){const n=normalOf(t);if(Math.abs(n[1])>.4)continue;const a=Math.atan2(n[2],n[0])*4;sx+=Math.cos(a)*n[3];sy+=Math.sin(a)*n[3];}
  const rot=-Math.atan2(sy,sx)/4;const c=Math.cos(rot),s=Math.sin(rot);
  let x0=Infinity,x1=-Infinity,z0=Infinity,z1=-Infinity;for(const t of tw.tris)for(let k=0;k<3;k++){const o=t*9+k*3,x=T[o]*S,z=T[o+2]*S,rx=x*c-z*s,rz=x*s+z*c;x0=Math.min(x0,rx);x1=Math.max(x1,rx);z0=Math.min(z0,rz);z1=Math.max(z1,rz);}
  const fw=x1-x0,fd=z1-z0,k=Math.min(1.25,(lot.w+3)/fw,(lot.d+3)/fd),mx=(x0+x1)/2,mz=(z0+z1)/2;
  const place=(x,z)=>{const rx=x*c-z*s,rz=x*s+z*c;return [(rx-mx)*k,(rz-mz)*k];};place.rot=rot;
  const a=attributes(tw.tris,place);let height=0;for(let q=0;q<a.count*3;q++)height=Math.max(height,a.pos[q*3+1]);
  towerParts.push(['tower-'+lot.i,a]);towerLayout.push({lot:lot.i,name:lot.name,height:+height.toFixed(1),footprint:[+(fw*k).toFixed(1),+(fd*k).toFixed(1)],fit:+k.toFixed(3),triangles:a.count});});
towerLayout.sort((a,b)=>a.lot-b.lot);

// ---- downtown skyline: everything else, turned by YAW and placed north of Northstar ----
const rest=[];for(let t=0;t<nT;t++)if(claimed[t]<0)rest.push(t);
const ccx=(cx0+cx1)/2*S,ccz=(cz0+cz1)/2*S,cy=Math.cos(YAW),sy2=Math.sin(YAW);
const turn=(x,z)=>{const rx=x-ccx,rz=z-ccz;return [rx*cy-rz*sy2,rx*sy2+rz*cy];};turn.rot=YAW;
const sky=attributes(rest,turn);let minX=Infinity,maxX=-Infinity,minZ=Infinity,maxZ=-Infinity;for(let q=0;q<sky.count*3;q++){minX=Math.min(minX,sky.pos[q*3]);maxX=Math.max(maxX,sky.pos[q*3]);minZ=Math.min(minZ,sky.pos[q*3+2]);maxZ=Math.max(maxZ,sky.pos[q*3+2]);}
const dx=CENTER_X-(minX+maxX)/2,dz=NEAR_Z-maxZ;for(let q=0;q<sky.count*3;q++){sky.pos[q*3]+=dx;sky.pos[q*3+2]+=dz;}
let skyTop=0;for(let q=0;q<sky.count*3;q++)skyTop=Math.max(skyTop,sky.pos[q*3+1]);
await mkdir(OUT,{recursive:true});
await save(OUT+'/towers.glb',towerParts);
await save(OUT+'/skyline.glb',[['Northstar skyline',sky]]);
const r=v=>+v.toFixed(1);
await writeFile(OUT+'/layout.js','// Generated by tools/prepare-skyline.mjs. Do not edit by hand.\nexport const SKYLINE_LAYOUT=Object.freeze('+JSON.stringify({source:'SanFrancisco_City.fbx (owner-supplied)',crop:CROP,yawDegrees:+(YAW*180/Math.PI).toFixed(1),metresPerUnit:+S.toFixed(2),
  skyline:{bounds:{minX:r(minX+dx),maxX:r(maxX+dx),minZ:r(minZ+dz),maxZ:r(maxZ+dz)},top:r(skyTop),triangles:sky.count},towers:towerLayout},null,1)+');\n');
console.log('towers',towerParts.reduce((n,p)=>n+p[1].count,0),'tris; skyline',sky.count);
