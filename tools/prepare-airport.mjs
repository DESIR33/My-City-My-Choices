#!/usr/bin/env node
// Builds the Northstar Airport building models in assets/airport from owner-supplied files:
//   --terminal modernairportterminal3dmodel.glb  (a textured, generated terminal mesh, unit size)
//   --tower    atctower.fbx                       (control tower, embedded textures)
//   --landmark 3d-model-6.fbx                     (arched landmark building with an older tower, metres)
//   --travelator Travelator.FBX                   (moving walkway, 13.9 m; its texture JPGs were not supplied)
// Each is centred on its footprint with its base at y=0, scaled to metres, simplified
// and meshopt-compressed with WebP textures. The terminal also gets a lighter phone version.
// Writes terminal.glb, terminal-mobile.glb, tower.glb, landmark.glb, travelator.glb and models.js.
// Run from the repository root:
//   npm install --no-save @gltf-transform/core@4.5.1 @gltf-transform/functions@4.5.1 \
//     @gltf-transform/extensions@4.5.1 meshoptimizer@0.22.0 fbx2gltf@0.9.7-p1 sharp
//   node tools/prepare-airport.mjs --terminal t.glb --tower atctower.fbx --landmark 3d-model-6.fbx \
//     --travelator Travelator.FBX
import {execFileSync} from 'node:child_process';
import {mkdir,mkdtemp,rm,writeFile} from 'node:fs/promises';
import {join,dirname} from 'node:path';
import {tmpdir} from 'node:os';
import {createRequire} from 'node:module';

let NodeIO,getBounds,ALL_EXTENSIONS,F,MeshoptEncoder,MeshoptSimplifier,sharp;
try{({NodeIO,getBounds}=await import('@gltf-transform/core'));({ALL_EXTENSIONS}=await import('@gltf-transform/extensions'));F=await import('@gltf-transform/functions');({MeshoptEncoder,MeshoptSimplifier}=await import('meshoptimizer'));sharp=(await import('sharp')).default;}
catch(e){console.error('Install the tool dependencies first (see the header of this file).\n',e.message);process.exit(1);}
const args=process.argv.slice(2),arg=k=>args.includes(k)?args[args.indexOf(k)+1]:null;
const OUT='assets/airport';
const FBX2GLTF=join(dirname(createRequire(import.meta.url).resolve('fbx2gltf/package.json')),'bin',{linux:'Linux',darwin:'Darwin',win32:'Windows_NT'}[process.platform],process.platform==='win32'?'FBX2glTF.exe':'FBX2glTF');
const io=new NodeIO().registerExtensions(ALL_EXTENSIONS).registerDependencies({'meshopt.encoder':MeshoptEncoder});await MeshoptEncoder.ready;await MeshoptSimplifier.ready;
async function read(file){if(file.endsWith('.glb'))return io.read(file);const tmp=await mkdtemp(join(tmpdir(),'airport-'));execFileSync(FBX2GLTF,['--binary','--input',file,'--output',join(tmp,'x')],{stdio:'ignore'});const doc=await io.read(join(tmp,'x.glb'));await rm(tmp,{recursive:true,force:true});return doc;}
// Wrap the scene in a node that scales it to metres and puts the footprint centre at the origin, base at y=0.
function place(doc,scale){const scene=doc.getRoot().listScenes()[0],b=getBounds(scene),wrap=doc.createNode('model');
  for(const c of scene.listChildren()){scene.removeChild(c);wrap.addChild(c);}scene.addChild(wrap);
  wrap.setScale([scale,scale,scale]).setTranslation([-(b.min[0]+b.max[0])/2*scale,-b.min[1]*scale,-(b.min[2]+b.max[2])/2*scale]);
  const s=b.max.map((v,i)=>(v-b.min[i])*scale);return {width:+s[0].toFixed(1),height:+s[1].toFixed(1),depth:+s[2].toFixed(1)};}
const tris=doc=>doc.getRoot().listMeshes().reduce((n,m)=>n+m.listPrimitives().reduce((k,p)=>k+(p.getIndices()?.getCount()??p.getAttribute('POSITION').getCount())/3,0),0);
async function finish(doc,file,{ratio=1,error=.001,texture=1024,flat=false}={}){
  // Flat-shaded sources weld only once normals are dropped; they get faceted normals back after simplifying.
  if(flat)for(const p of doc.getRoot().listMeshes().flatMap(m=>m.listPrimitives()))p.setAttribute('NORMAL',null);
  await doc.transform(F.dedup(),F.weld(),...(ratio<1?[F.simplify({simplifier:MeshoptSimplifier,ratio,error})]:[]),...(flat?[F.unweld(),F.normals({overwrite:true})]:[]),F.flatten(),F.prune(),
    F.textureCompress({encoder:sharp,targetFormat:'webp',quality:80,resize:[texture,texture]}),F.reorder({encoder:MeshoptEncoder}),F.quantize(),F.meshopt({encoder:MeshoptEncoder,level:'high'}));
  await io.write(join(OUT,file),doc);return tris(doc);}
await mkdir(OUT,{recursive:true});const models={};

// Terminal: 230 m wide. The source is one textured mesh of about 964k triangles.
{const src=arg('--terminal');for(const [file,ratio,texture] of [['terminal.glb',.1,2048],['terminal-mobile.glb',.03,1024]]){const doc=await read(src);const size=place(doc,230/.94);const t=await finish(doc,file,{ratio,error:.0006,texture});models[file==='terminal.glb'?'terminal':'terminalMobile']={url:'./assets/airport/'+file,...size,triangles:t};console.log(file,size,t);}}
// Control tower: 72 m tall (the source is 16.3 units).
{const doc=await read(arg('--tower'));const size=place(doc,72/16.28);// The balcony railing alone is about 66k triangles; a coarse simplification keeps its look from the ground.
  const t=await finish(doc,'tower.glb',{ratio:.12,error:.02,texture:512,flat:true});models.tower={url:'./assets/airport/tower.glb',...size,triangles:t};console.log('tower',size,t);}
// Landmark: already in metres.
{const doc=await read(arg('--landmark'));const size=place(doc,1);const t=await finish(doc,'landmark.glb',{texture:512});models.landmark={url:'./assets/airport/landmark.glb',...size,triangles:t};console.log('landmark',size,t);}
// Travelator: untextured in the source, so its parts get believable materials by name:
// a dark ribbed belt, brushed steel sides, black rubber handrails and glass balustrades.
{const doc=await read(arg('--travelator'));const size=place(doc,1);
  const paint={steps:[.09,.09,.1,1,.7,.2],'strani4ni za eskalator':[.55,.57,.6,1,.35,.85],Glass:[.75,.85,.9,.25,.05,0]};
  for(const m of doc.getRoot().listMaterials()){const name=m.getName(),p=paint[name]||(m.getBaseColorFactor()[0]>.6?[.78,.8,.83,1,.3,.9]:m.getBaseColorFactor()[0]>.3?[.5,.52,.55,1,.4,.8]:[.04,.04,.045,1,.6,0]);
    m.setBaseColorTexture(null).setNormalTexture(null).setMetallicRoughnessTexture(null).setBaseColorFactor(p.slice(0,4)).setRoughnessFactor(p[4]).setMetallicFactor(p[5]).setAlphaMode(p[3]<1?'BLEND':'OPAQUE');}
  for(const p of doc.getRoot().listMeshes().flatMap(m=>m.listPrimitives()))for(const k of p.listSemantics())if(k.startsWith('TEXCOORD'))p.setAttribute(k,null);
  const t=await finish(doc,'travelator.glb',{ratio:.08,error:.01,texture:256,flat:true});models.travelator={url:'./assets/airport/travelator.glb',...size,triangles:t};console.log('travelator',size,t);}
await writeFile(join(OUT,'models.js'),'// Generated by tools/prepare-airport.mjs. Do not edit by hand.\nexport const AIRPORT_MODELS=Object.freeze('+JSON.stringify(models,null,1)+');\n');
