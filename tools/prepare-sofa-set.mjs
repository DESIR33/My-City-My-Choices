#!/usr/bin/env node
// Builds assets/sofa-set/rosa-living.glb from the owner-supplied "Full set rosa"
// FBX (sectional sofa, cushions, blanket, armchair, coffee table with decor,
// end table with lamp, side table and rug). The 191 MB source is not stored in the repository.
//   - merges parts by material and simplifies to a browser budget
//   - fixes FBX export materials (fabrics exported as metal, bare parts as mirror)
//   - compresses textures to KTX2 (1024 px for the sofa fabric and rug, 512 px for
//     other colour maps, 256 px roughness)
//   - writes assets/sofa-set/layout.json with piece boxes for collisions
// Run from the repository root:
//   npm install --no-save sharp@0.35.5 ktx2-encoder@0.6.0 @gltf-transform/core@4.5.1 \
//     @gltf-transform/functions@4.5.1 @gltf-transform/extensions@4.5.1 meshoptimizer@0.22.0 fbx2gltf@0.9.7-p1
//   node tools/prepare-sofa-set.mjs --fbx /path/to/Full_set_rosa.fbx
import {execFileSync} from 'node:child_process';
import {mkdir,writeFile,mkdtemp,rm} from 'node:fs/promises';
import {join,dirname} from 'node:path';
import {tmpdir} from 'node:os';
import {createRequire} from 'node:module';

let NodeIO,getBounds,ALL_EXTENSIONS,F,MeshoptSimplifier,sharp,ktx2;
try{({NodeIO,getBounds}=await import('@gltf-transform/core'));({ALL_EXTENSIONS}=await import('@gltf-transform/extensions'));F=await import('@gltf-transform/functions');({MeshoptSimplifier}=await import('meshoptimizer'));sharp=(await import('sharp')).default;({ktx2}=await import('ktx2-encoder/gltf-transform'));}
catch(e){console.error('Install the tool dependencies first (see the header of this file).\n',e.message);process.exit(1);}
const args=process.argv.slice(2),FBX=args.includes('--fbx')?args[args.indexOf('--fbx')+1]:null;if(!FBX){console.error('Pass --fbx /path/to/Full_set_rosa.fbx');process.exit(1);}
const BUDGET=Number(args.includes('--triangles')?args[args.indexOf('--triangles')+1]:32000);
const FBX2GLTF=join(dirname(createRequire(import.meta.url).resolve('fbx2gltf/package.json')),'bin',{linux:'Linux',darwin:'Darwin',win32:'Windows_NT'}[process.platform],process.platform==='win32'?'FBX2glTF.exe':'FBX2glTF');
const imageDecoder=async b=>{const {data,info}=await sharp(b).ensureAlpha().raw().toBuffer({resolveWithObject:true});return {data:new Uint8Array(data),width:info.width,height:info.height};};
const triangles=doc=>doc.getRoot().listMeshes().reduce((n,m)=>n+m.listPrimitives().reduce((k,p)=>k+(p.getIndices()?.getCount()??p.getAttribute('POSITION').getCount())/3,0),0);
// Collision groups by node name: one box per piece of furniture a player could walk into.
const PIECES=[['chaise',/^(sofa_03|sofa_10|sofa_leg_0[34]|blanket)/i],['sectional',/^(sofa|cusion|Object093|blanket)/i],['armchair',/^(armchair|Box008)/i],['coffee-table',/^(coffeetable|sculpture|stone stray|Line07|Cylinder005|spher)/i],['end-table',/^(sidetable_handle|Box00[1-79]|lamp|Shape|shade)/i],['side-table',/^(sidetable$|sidetable_leg|Cylinder004|Object026)/i]];

const tmp=await mkdtemp(join(tmpdir(),'sofa-'));execFileSync(FBX2GLTF,['--binary','--input',FBX,'--output',join(tmp,'set')],{stdio:'ignore'});
const io=new NodeIO().registerExtensions(ALL_EXTENSIONS),doc=await io.read(join(tmp,'set.glb'));await rm(tmp,{recursive:true,force:true});
const root=doc.getRoot(),before=triangles(doc);
// Piece boxes and the footprint, measured before anything is merged (metres, set space).
const boxes={};for(const n of root.listNodes()){if(!n.getMesh())continue;const k=PIECES.find(([,re])=>re.test(n.getName()))?.[0];if(!k)continue;const b=getBounds(n);const box=boxes[k]||={min:[Infinity,Infinity,Infinity],max:[-Infinity,-Infinity,-Infinity]};for(let i=0;i<3;i++){box.min[i]=Math.min(box.min[i],b.min[i]);box.max[i]=Math.max(box.max[i],b.max[i]);}}
const all=getBounds(root.listScenes()[0]);
// Materials: dielectric everywhere; untextured parts get believable roughness instead of mirror finish.
for(const m of root.listMaterials()){m.setMetallicFactor(0);if(m.getMetallicRoughnessTexture())m.setRoughnessFactor(1);else{const c=m.getBaseColorFactor(),dark=c[0]+c[1]+c[2]<.2;m.setRoughnessFactor(m.getBaseColorTexture()?.85:dark?.45:.6);}}
await doc.transform(F.dedup(),F.flatten(),F.join({keepNamed:false}),F.weld(),F.prune());
const ratio=Math.min(1,BUDGET/triangles(doc));
await doc.transform(F.simplify({simplifier:MeshoptSimplifier,ratio,error:.012,lockBorder:false}),F.weld(),F.prune());
// Dense parts (the quilted sofa fabric, the knitted blanket) stop at the error limit: cap each at 6k triangles.
const CAP=6000;for(const m of root.listMeshes())for(const p of m.listPrimitives()){const n=(p.getIndices()?.getCount()??0)/3;if(n>CAP)F.simplifyPrimitive(p,{simplifier:MeshoptSimplifier,ratio:CAP/n,error:.05,lockBorder:false});}
await doc.transform(F.weld(),F.prune(),F.quantize());
// Textures: large surfaces 1024 px, small pieces 512 px, roughness 256 px, then KTX2 (ETC1S).
for(const t of root.listTextures()){const rough=/rough|roghness/i.test(t.getName()),big=/sofa_fabric|carpet/i.test(t.getName()),size=rough?256:big?1024:512;const png=await sharp(Buffer.from(t.getImage())).resize(size,size,{fit:'fill'}).png().toBuffer();t.setImage(new Uint8Array(png)).setMimeType('image/png');}
await doc.transform(ktx2({isUASTC:false,generateMipmap:true,imageDecoder,qualityLevel:150,compressionLevel:2}));
await mkdir('assets/sofa-set',{recursive:true});await io.write('assets/sofa-set/rosa-living.glb',doc);
const r2=v=>Math.round(v*1000)/1000;
await writeFile('assets/sofa-set/layout.json',JSON.stringify({source:'Full_set_rosa.fbx (owner-supplied)',triangles:triangles(doc),bounds:{min:all.min.map(r2),max:all.max.map(r2)},pieces:Object.fromEntries(Object.entries(boxes).map(([k,b])=>[k,{min:b.min.map(r2),max:b.max.map(r2)}]))},null,1)+'\n');
console.log('triangles',before,'→',triangles(doc),'meshes',root.listMeshes().length,'materials',root.listMaterials().length);
