#!/usr/bin/env node
// Builds the flyover airliners in assets/airplanes from the owner-supplied FBX models
// (four SketchUp/3ds Max airliners: two single-aisle jets, a twin-aisle jet and a
// double-deck jet, all in metres). The source liveries belong to real airlines and
// their logo images were not supplied, so every plane is repainted in a fictional
// livery for the game: white fuselage, light grey belly and wings, a coloured tail
// and cheatline. Painted lettering and stripes disappear because every light or
// coloured surface takes its region's paint; windows, cockpit glass, tyres and other
// dark parts keep their colour. Each plane becomes one simplified mesh with vertex
// colours, nose along +Z, centred on its fuselage axis, plus generated fleet.js.
// Run from the repository root:
//   npm install --no-save @gltf-transform/core@4.5.1 @gltf-transform/functions@4.5.1 \
//     @gltf-transform/extensions@4.5.1 meshoptimizer@0.22.0 fbx2gltf@0.9.7-p1
//   node tools/prepare-airplanes.mjs --fbx a.fbx b.fbx c.fbx d.fbx --gate 3d-model-5.fbx
// --gate is the owner's gate scene (jet bridges and seven parked jets in real liveries);
// one single-aisle jet and one long-haul twin are lifted out of it by region.
import {execFileSync} from 'node:child_process';
import {mkdir,mkdtemp,rm,writeFile} from 'node:fs/promises';
import {join,dirname,basename} from 'node:path';
import {tmpdir} from 'node:os';
import {createRequire} from 'node:module';

let NodeIO,Document,ALL_EXTENSIONS,F,MeshoptEncoder,MeshoptSimplifier;
try{({NodeIO,Document}=await import('@gltf-transform/core'));({ALL_EXTENSIONS}=await import('@gltf-transform/extensions'));F=await import('@gltf-transform/functions');({MeshoptEncoder,MeshoptSimplifier}=await import('meshoptimizer'));}
catch(e){console.error('Install the tool dependencies first (see the header of this file).\n',e.message);process.exit(1);}
const args=process.argv.slice(2),files=args.includes('--fbx')?args.slice(args.indexOf('--fbx')+1,args.findIndex((a,i)=>i>args.indexOf('--fbx')&&a.startsWith('--'))>0?args.findIndex((a,i)=>i>args.indexOf('--fbx')&&a.startsWith('--')):undefined):[],GATE=args.includes('--gate')?args[args.indexOf('--gate')+1]:null;
if(files.length!==4){console.error('Pass --fbx with the four airliner FBX files');process.exit(1);}
const OUT='assets/airplanes',BUDGET=Number(args.includes('--triangles')?args[args.indexOf('--triangles')+1]:14000);
// Fictional liveries, smallest plane first. No real airline names, logos or colours schemes.
const LIVERIES=[
  {id:'maple-air',name:'Maple Air',tail:[46,110,64],stripe:[222,160,48]},
  {id:'sunshore-airways',name:'Sunshore Airways',tail:[232,104,74],stripe:[40,150,170]},
  {id:'northstar-air',name:'Northstar Air',tail:[32,58,110],stripe:[120,170,220]},
  {id:'ronda-skyways',name:'Ronda Skyways',tail:[150,64,40],stripe:[232,196,120]},
  {id:'grove-express',name:'Grove Express',tail:[112,64,150],stripe:[246,190,60]},
  {id:'rivergate-airlines',name:'Rivergate Airlines',tail:[18,112,120],stripe:[214,86,64]}];
// Planes lifted from the gate scene: model-space regions (x0,x1,z0,z1) around each jet.
// Parts are told apart by material family: the single-aisle jet's paint and gear, or the twin's.
const GATE_PLANES=[{region:[-6,40,-20,17],part:names=>names.some(n=>/CanJet|Landing Gear/.test(n))||names.every(n=>/Group_00[56]/.test(n))},
  {region:[15,86,-70,-5],part:names=>!names.some(n=>/CanJet|Landing Gear|box/.test(n))&&!names.every(n=>/Group_00[56]/.test(n))}];
const BRIDGE_PART=/Layer0|DefaultMaterial|Группа|Group_04[0-5]/;
const FBX2GLTF=join(dirname(createRequire(import.meta.url).resolve('fbx2gltf/package.json')),'bin',{linux:'Linux',darwin:'Darwin',win32:'Windows_NT'}[process.platform],process.platform==='win32'?'FBX2glTF.exe':'FBX2glTF');
const io=new NodeIO().registerExtensions(ALL_EXTENSIONS).registerDependencies({'meshopt.encoder':MeshoptEncoder});await MeshoptEncoder.ready;await MeshoptSimplifier.ready;

async function load(file,region=null,part=null){const tmp=await mkdtemp(join(tmpdir(),'plane-'));execFileSync(FBX2GLTF,['--binary','--input',file,'--output',join(tmp,'x')],{stdio:'ignore'});const doc=await io.read(join(tmp,'x.glb'));await rm(tmp,{recursive:true,force:true});
  const tris=[];// [ax,ay,az,bx,by,bz,cx,cy,cz, r,g,b, glass]
  for(const node of doc.getRoot().listNodes()){const mesh=node.getMesh();if(!mesh)continue;const W=node.getWorldMatrix();
    if(region){// keep only this jet's parts: not a jet-bridge part, centred inside the region
      const names=mesh.listPrimitives().map(p=>p.getMaterial()?.getName()||'');if(names.every(n=>BRIDGE_PART.test(n))||(part&&!part(names)))continue;let n=0,cx=0,cz=0;const v=[0,0,0];
      for(const p of mesh.listPrimitives()){const pos=p.getAttribute('POSITION');for(let i=0;i<pos.getCount();i++){pos.getElement(i,v);cx+=W[0]*v[0]+W[4]*v[1]+W[8]*v[2]+W[12];cz+=W[2]*v[0]+W[6]*v[1]+W[10]*v[2]+W[14];n++;}}
      cx/=n;cz/=n;if(cx<region[0]||cx>region[1]||cz<region[2]||cz>region[3])continue;}
    for(const p of mesh.listPrimitives()){const pos=p.getAttribute('POSITION'),idx=p.getIndices(),m=p.getMaterial(),c=m?m.getBaseColorFactor():[1,1,1,1],name=(m?.getName()||'').toLowerCase(),glass=/glass|translucent/.test(name)||c[3]<.95,textured=!!m?.getBaseColorTexture();
      const v=[0,0,0],P=[];for(let i=0;i<pos.getCount();i++){pos.getElement(i,v);P.push([0,1,2].map(a=>W[a]*v[0]+W[4+a]*v[1]+W[8+a]*v[2]+W[12+a]));}
      const I=idx?idx.getArray():[...P.keys()];for(let t=0;t<I.length;t+=3)tris.push([...P[I[t]],...P[I[t+1]],...P[I[t+2]],c[0],c[1],c[2],glass?1:0,textured?1:0]);}}
  return tris;}

const fleet=[];await mkdir(OUT,{recursive:true});
const loaded=[];for(const f of files)loaded.push({file:basename(f),tris:await load(f)});
// Order by wingspan so the liveries go smallest to largest.
for(const L of loaded){let x0=Infinity,x1=-Infinity,z0=Infinity,z1=-Infinity;for(const t of L.tris)for(let k=0;k<9;k+=3){x0=Math.min(x0,t[k]);x1=Math.max(x1,t[k]);z0=Math.min(z0,t[k+2]);z1=Math.max(z1,t[k+2]);}L.size=Math.max(x1-x0,z1-z0);}
loaded.sort((a,b)=>a.size-b.size||a.file.localeCompare(b.file));
if(GATE)for(const [i,g] of GATE_PLANES.entries())loaded.push({file:basename(GATE)+'#'+(i+1),tris:await load(GATE,g.region,g.part),paintDark:true});

const area=t=>{const ax=t[3]-t[0],ay=t[4]-t[1],az=t[5]-t[2],bx=t[6]-t[0],by=t[7]-t[1],bz=t[8]-t[2];return Math.hypot(ay*bz-az*by,az*bx-ax*bz,ax*by-ay*bx)/2;};
for(const [index,L] of loaded.entries()){const livery=LIVERIES[index],T=L.tris;
  // Axis: from the tail-fin top (highest point) through the plan-view centre is backwards.
  let top=T[0],x0=Infinity,x1=-Infinity,z0=Infinity,z1=-Infinity,y0=Infinity,y1=-Infinity;
  for(const t of T)for(let k=0;k<9;k+=3){if(t[k+1]>top[1])top=[t[k],t[k+1],t[k+2]];x0=Math.min(x0,t[k]);x1=Math.max(x1,t[k]);z0=Math.min(z0,t[k+2]);z1=Math.max(z1,t[k+2]);y0=Math.min(y0,t[k+1]);y1=Math.max(y1,t[k+1]);}
  const cx=(x0+x1)/2,cz=(z0+z1)/2,ax=Math.abs(top[0]-cx)>Math.abs(top[2]-cz)?'x':'z',sign=ax==='x'?Math.sign(cx-top[0]):Math.sign(cz-top[2]);
  // local frame: f = along nose, s = lateral, y up
  const frame=(x,z)=>ax==='z'?[ (x-cx)*sign, (z-cz)*sign ]:[ -(z-cz)*sign, (x-cx)*sign ];// [s,f]
  const length=ax==='z'?z1-z0:x1-x0,r=length*.052;
  // fuselage centre height at mid-length near the centreline
  let crown=-Infinity;for(const t of T)for(let k=0;k<9;k+=3){const [s,f]=frame(t[k],t[k+2]);if(Math.abs(s)<r*.4&&Math.abs(f)<length*.1)crown=Math.max(crown,t[k+1]);}
  const yc=crown-r;
  const out=[];
  for(const t of T){const pts=[0,3,6].map(k=>{const [s,f]=frame(t[k],t[k+2]);return [s,t[k+1]-yc,f];});
    const ms=pts.reduce((a,p)=>a+p[0],0)/3,my=pts.reduce((a,p)=>a+p[1],0)/3,mf=pts.reduce((a,p)=>a+p[2],0)/3;
    const [R,G,B,glass,textured]=t.slice(9),luma=.3*R+.59*G+.11*B,sat=Math.max(R,G,B)-Math.min(R,G,B);
    let col;
    const fin=mf<-length*.28&&my>r*1.05&&Math.abs(ms)<r*1.2;
    if(glass)col=[22,28,36];
    else if(fin)col=livery.tail;// the whole fin, including any dark bands of the old livery
    else if(!textured&&luma<.22&&sat<.12&&!(L.paintDark&&area(t)>.6&&my<r*.6))col=[R,G,B].map(v=>Math.round(Math.max(.04,v)*255));// windows, tyres, dark trim (the gate jets' dark bellies are repainted)
    else if(Math.abs(ms)>r*1.25)col=[176,182,190];// wings, stabilisers, engines (grey reads against a bright sky)
    else if(my<-r*.45)col=[168,174,184];// belly
    else if(my>-r*.36&&my<-r*.2&&mf>-length*.3)col=livery.stripe;// cheatline
    else col=[244,245,246];
    out.push({p:pts,c:col});}
  // Mesh with flat normals, then simplify.
  const n=out.length,pos=new Float32Array(n*9),col=new Uint8Array(n*9);
  out.forEach((t,i)=>{t.p.forEach((p,k)=>pos.set(p,i*9+k*3));for(let k=0;k<3;k++)col.set(t.c,i*9+k*3);});
  const doc=new Document(),buf=doc.createBuffer();
  const prim=doc.createPrimitive().setAttribute('POSITION',doc.createAccessor().setType('VEC3').setArray(pos).setBuffer(buf)).setAttribute('COLOR_0',doc.createAccessor().setType('VEC3').setArray(col).setNormalized(true).setBuffer(buf))
    .setMaterial(doc.createMaterial(livery.name+' paint').setRoughnessFactor(.42).setMetallicFactor(.15));
  doc.createScene().addChild(doc.createNode(livery.id).setMesh(doc.createMesh(livery.id).addPrimitive(prim)));
  await doc.transform(F.weld(),F.simplify({simplifier:MeshoptSimplifier,ratio:Math.min(1,BUDGET/n),error:.004,lockBorder:false}),F.unweld(),F.normals({overwrite:true}),F.weld(),F.reorder({encoder:MeshoptEncoder}),F.quantize({quantizePosition:14,quantizeNormal:10}),F.meshopt({encoder:MeshoptEncoder,level:'high'}));
  const final=doc.getRoot().listMeshes()[0].listPrimitives()[0],triangles=final.getIndices().getCount()/3;
  await io.write(join(OUT,livery.id+'.glb'),doc);
  // Light positions in the plane's frame (metres): wingtips, tail, beacons.
  let span=0,tipF=0,tipY=0,tailF=0,tailY=-Infinity,belly=0,nose=-Infinity;
  for(const t of out)for(const p of t.p){if(Math.abs(p[0])>span){span=Math.abs(p[0]);tipF=p[2];tipY=p[1];}if(p[2]<tailF)tailF=p[2];if(p[1]>tailY)tailY=p[1];if(Math.abs(p[0])<r*.5&&Math.abs(p[2])<length*.1)belly=Math.min(belly,p[1]);nose=Math.max(nose,p[2]);}
  const r2=v=>+v.toFixed(2);
  fleet.push({id:livery.id,name:livery.name,source:L.file,url:'./assets/airplanes/'+livery.id+'.glb',length:r2(length),span:r2(span*2),height:r2(y1-y0),gear:r2(y0-yc),triangles,
    lights:{left:[r2(span),r2(tipY),r2(tipF)],right:[r2(-span),r2(tipY),r2(tipF)],tail:[0,r2(r*.2),r2(tailF)],beaconTop:[0,r2(r*1.02),r2(length*.05)],beaconBottom:[0,r2(belly),r2(length*.05)],nose:[0,r2(-r*.3),r2(nose)]}});
  console.log(livery.id,'from',L.file,'tris',n,'->',triangles,'span',r2(span*2),'length',r2(length));}
await writeFile(join(OUT,'fleet.js'),'// Generated by tools/prepare-airplanes.mjs. Do not edit by hand.\nexport const AIRPLANE_FLEET=Object.freeze('+JSON.stringify(fleet,null,1)+');\n');
await writeFile(join(OUT,'README.md'),`# Airliners\n\nBuilt by \`tools/prepare-airplanes.mjs\` from four owner-supplied airliner FBX models and two jets lifted from the owner's gate-scene FBX (SketchUp/3ds Max exports in metres). The source models carried real airline liveries and referenced logo images that were not supplied; the game repaints every plane in a fictional livery (${LIVERIES.map(l=>l.name).join(', ')}) with no airline names or logos. Each GLB is one simplified, meshopt-compressed mesh with vertex colours, nose along +Z.\n`);
