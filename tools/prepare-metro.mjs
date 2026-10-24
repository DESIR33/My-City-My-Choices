#!/usr/bin/env node
// Builds the Northstar Metro models in assets/metro from owner-supplied files:
//   --train    KS_3010_fbx.fbx  (extracted from KS_3010_fbx.rar: a two-section light-rail
//                                car, 27.5 m, untextured, with separate door leaves)
//   --entrance IN.glb           (a New York-style subway entrance, 8K textures)
// The train is repainted in the Northstar Metro livery by region (charcoal skirt, red
// lower body, white window band, silver roof; dark bogies; blue seats and a dark floor
// inside), simplified, and split into a static body, glass, and four door groups that the
// game slides open: door-L-a/door-L-b on the left side (+X when the cab faces +Z) and
// door-R-a/door-R-b on the right. The entrance keeps its look with 1024 px WebP textures.
// Writes train.glb, entrance.glb and models.js.
// Run from the repository root (extract the RAR first):
//   npm install --no-save @gltf-transform/core@4.5.1 @gltf-transform/functions@4.5.1 \
//     @gltf-transform/extensions@4.5.1 meshoptimizer@0.22.0 fbx2gltf@0.9.7-p1 sharp
//   node tools/prepare-metro.mjs --train KS_3010_fbx.fbx --entrance IN.glb
import {execFileSync} from 'node:child_process';
import {mkdir,mkdtemp,rm,writeFile} from 'node:fs/promises';
import {join,dirname} from 'node:path';
import {tmpdir} from 'node:os';
import {createRequire} from 'node:module';

let NodeIO,Document,getBounds,ALL_EXTENSIONS,F,MeshoptEncoder,MeshoptSimplifier,sharp;
try{({NodeIO,Document,getBounds}=await import('@gltf-transform/core'));({ALL_EXTENSIONS}=await import('@gltf-transform/extensions'));F=await import('@gltf-transform/functions');({MeshoptEncoder,MeshoptSimplifier}=await import('meshoptimizer'));sharp=(await import('sharp')).default;}
catch(e){console.error('Install the tool dependencies first (see the header of this file).\n',e.message);process.exit(1);}
const args=process.argv.slice(2),arg=k=>args.includes(k)?args[args.indexOf(k)+1]:null,OUT='assets/metro';
const FBX2GLTF=join(dirname(createRequire(import.meta.url).resolve('fbx2gltf/package.json')),'bin',{linux:'Linux',darwin:'Darwin',win32:'Windows_NT'}[process.platform],process.platform==='win32'?'FBX2glTF.exe':'FBX2glTF');
const io=new NodeIO().registerExtensions(ALL_EXTENSIONS).registerDependencies({'meshopt.encoder':MeshoptEncoder});await MeshoptEncoder.ready;await MeshoptSimplifier.ready;
await mkdir(OUT,{recursive:true});const models={};

// ---------------- train ----------------
{const tmp=await mkdtemp(join(tmpdir(),'metro-'));execFileSync(FBX2GLTF,['--binary','--input',arg('--train'),'--output',join(tmp,'x')],{stdio:'ignore'});const src=await io.read(join(tmp,'x.glb'));await rm(tmp,{recursive:true,force:true});
  // Which output part each source node goes to.
  const part=name=>{if(/^dl_[14]$|^ldgl_[23]$/.test(name))return 'door-L-a';if(/^dr_[23]$|^rdgl_[14]$/.test(name))return 'door-L-b';if(/^dl_[68]$|^ldgl_[68]$/.test(name))return 'door-R-a';if(/^dr_[57]$|^rdgl_[57]$/.test(name))return 'door-R-b';return 'body';};
  const glassy=name=>/gl_/.test(name);
  const parts=new Map();// part -> {paint:[], glass:[]} triangles [9 pos, 3 nrm-ish ignored, rgb]
  const RED=[198,36,40],WHITE=[236,238,240],SILVER=[176,182,188],CHAR=[52,56,62],DARK=[38,40,44],SEAT=[38,82,150],FLOOR=[70,74,82],INTERIOR=[214,216,218],POLE=[226,190,40];
  for(const node of src.getRoot().listNodes()){const mesh=node.getMesh();if(!mesh)continue;const W=node.getWorldMatrix(),name=node.getName(),p=part(name);if(!parts.has(p))parts.set(p,{paint:[],glass:[]});const bucket=parts.get(p);
    for(const prim of mesh.listPrimitives()){const pos=prim.getAttribute('POSITION'),idx=prim.getIndices(),v=[0,0,0],P=[];for(let i=0;i<pos.getCount();i++){pos.getElement(i,v);P.push([0,1,2].map(a=>W[a]*v[0]+W[4+a]*v[1]+W[8+a]*v[2]+W[12+a]));}
      const I=idx?idx.getArray():[...P.keys()],matName=prim.getMaterial()?.getName()||'';
      for(let t=0;t<I.length;t+=3){const a=P[I[t]],b=P[I[t+1]],c=P[I[t+2]],my=(a[1]+b[1]+c[1])/3,mx=(a[0]+b[0]+c[0])/3;
        const ux=b[0]-a[0],uy=b[1]-a[1],uz=b[2]-a[2],wx=c[0]-a[0],wy=c[1]-a[1],wz=c[2]-a[2];let ny=uz*wx-ux*wz;const len=Math.hypot(uy*wz-uz*wy,ny,ux*wy-uy*wx)||1;ny/=len;
        if(glassy(name)||matName.startsWith('01')){bucket.glass.push([...a,...b,...c]);continue;}
        let col;if(/^(Bogie|w_)/.test(name))col=DARK;
        else if(/^Interior/.test(name)){col=my<1.08&&ny>.7?FLOOR:my>1.2&&my<2.05&&Math.abs(mx)>.35&&ny>.5?SEAT:my>3.1?INTERIOR:Math.abs(mx)<.08&&my>1.2?POLE:INTERIOR;}
        else if(/isl_lod0|Line005/.test(name))col=INTERIOR;
        else col=my<.95?CHAR:my<1.85?RED:my<3.05?WHITE:my<3.55?RED:SILVER;
        bucket.paint.push([...a,...b,...c,...col]);}}}
  const doc=new Document(),buf=doc.createBuffer(),scene=doc.createScene();
  const paintMat=doc.createMaterial('Northstar Metro paint').setRoughnessFactor(.38).setMetallicFactor(.25),glassMat=doc.createMaterial('Northstar Metro glass').setBaseColorFactor([.2,.28,.33,.35]).setAlphaMode('BLEND').setRoughnessFactor(.05).setMetallicFactor(.4);
  for(const [name,{paint,glass}] of parts){const node=doc.createNode(name),mesh=doc.createMesh(name);
    if(paint.length){const pos=new Float32Array(paint.length*9),col=new Uint8Array(paint.length*9);paint.forEach((t,i)=>{pos.set(t.slice(0,9),i*9);for(let k=0;k<3;k++)col.set(t.slice(9,12),i*9+k*3);});
      mesh.addPrimitive(doc.createPrimitive().setAttribute('POSITION',doc.createAccessor().setType('VEC3').setArray(pos).setBuffer(buf)).setAttribute('COLOR_0',doc.createAccessor().setType('VEC3').setArray(col).setNormalized(true).setBuffer(buf)).setMaterial(paintMat));}
    if(glass.length){const pos=new Float32Array(glass.length*9);glass.forEach((t,i)=>pos.set(t,i*9));mesh.addPrimitive(doc.createPrimitive().setAttribute('POSITION',doc.createAccessor().setType('VEC3').setArray(pos).setBuffer(buf)).setMaterial(glassMat));}
    node.setMesh(mesh);scene.addChild(node);}
  await doc.transform(F.weld(),F.simplify({simplifier:MeshoptSimplifier,ratio:.45,error:.0015}),F.unweld(),F.normals({overwrite:true}),F.weld(),F.reorder({encoder:MeshoptEncoder}),F.quantize(),F.meshopt({encoder:MeshoptEncoder,level:'high'}));
  await io.write(join(OUT,'train.glb'),doc);const b=getBounds(scene);let tris=0;for(const m of doc.getRoot().listMeshes())for(const p of m.listPrimitives())tris+=p.getIndices().getCount()/3;
  models.train={url:'./assets/metro/train.glb',length:+(b.max[2]-b.min[2]).toFixed(2),width:+(b.max[0]-b.min[0]).toFixed(2),height:+(b.max[1]-b.min[1]).toFixed(2),floor:1.02,doorways:[-9.7,-3.24,3.24,9.7],doorWidth:1.3,doorSlide:.68,triangles:tris};
  console.log('train',models.train);}

// ---------------- entrance ----------------
{const doc=await io.read(arg('--entrance'));
  await doc.transform(F.dedup(),F.weld(),F.simplify({simplifier:MeshoptSimplifier,ratio:.35,error:.0008}),F.prune(),F.textureCompress({encoder:sharp,targetFormat:'webp',quality:82,resize:[1024,1024]}),F.reorder({encoder:MeshoptEncoder}),F.quantize(),F.meshopt({encoder:MeshoptEncoder,level:'high'}));
  const b=getBounds(doc.getRoot().listScenes()[0]);let tris=0;for(const m of doc.getRoot().listMeshes())for(const p of m.listPrimitives())tris+=p.getIndices().getCount()/3;
  await io.write(join(OUT,'entrance.glb'),doc);models.entrance={url:'./assets/metro/entrance.glb',min:b.min.map(v=>+v.toFixed(2)),max:b.max.map(v=>+v.toFixed(2)),triangles:tris};console.log('entrance',models.entrance);}
await writeFile(join(OUT,'models.js'),'// Generated by tools/prepare-metro.mjs. Do not edit by hand.\nexport const METRO_MODELS=Object.freeze('+JSON.stringify(models,null,1)+');\n');
