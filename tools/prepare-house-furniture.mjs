#!/usr/bin/env node
// Downloads pinned CC0 Poly Haven furniture, simplifies each model to its triangle
// budget, compresses textures to 512 px KTX2 and writes .glb files to
// assets/house/furniture/. Run from the repository root:
//
//   npm install --no-save sharp@0.35.5 ktx2-encoder@0.6.0 @gltf-transform/core@4.5.1 \
//     @gltf-transform/functions@4.5.1 @gltf-transform/extensions@4.5.1 meshoptimizer@0.22.0
//   node tools/prepare-house-furniture.mjs [--cache /tmp/polyhaven-furniture]
//
// The model list and budgets live in assets/house-furniture.js (HOUSE_FURNITURE_MODELS).
import {mkdir,writeFile,access} from 'node:fs/promises';
import {join,dirname} from 'node:path';
import {tmpdir} from 'node:os';
import {HOUSE_FURNITURE_MODELS} from '../assets/house-furniture.js';

let NodeIO,ALL_EXTENSIONS,F,MeshoptSimplifier,sharp,ktx2;
try{({NodeIO}=await import('@gltf-transform/core'));({ALL_EXTENSIONS}=await import('@gltf-transform/extensions'));F=await import('@gltf-transform/functions');({MeshoptSimplifier}=await import('meshoptimizer'));sharp=(await import('sharp')).default;({ktx2}=await import('ktx2-encoder/gltf-transform'));}
catch(e){console.error('Install the tool dependencies first (see the header of this file).\n',e.message);process.exit(1);}

const args=process.argv.slice(2),cache=args.includes('--cache')?args[args.indexOf('--cache')+1]:join(tmpdir(),'polyhaven-furniture'),out='assets/house/furniture';
const API='https://api.polyhaven.com',UA={'User-Agent':'MyCityMyChoices-asset-tool/1.0 (+https://github.com/DESIR33/My-City-My-Choices)'};
const json=async url=>{const r=await fetch(url,{headers:UA});if(!r.ok)throw Error(url+' → '+r.status);return r.json();};
const exists=p=>access(p).then(()=>true,()=>false);
const imageDecoder=async b=>{const {data,info}=await sharp(b).ensureAlpha().raw().toBuffer({resolveWithObject:true});return {data:new Uint8Array(data),width:info.width,height:info.height};};
const triangles=doc=>doc.getRoot().listMeshes().reduce((n,m)=>n+m.listPrimitives().reduce((k,p)=>k+(p.getIndices()?.getCount()??p.getAttribute('POSITION').getCount())/3,0),0);

await mkdir(out,{recursive:true});await MeshoptSimplifier.ready;
const io=new NodeIO().registerExtensions(ALL_EXTENSIONS),credits=[];
for(const [id,spec] of Object.entries(HOUSE_FURNITURE_MODELS)){
 const [info,files]=await Promise.all([json(API+'/info/'+id),json(API+'/files/'+id)]);
 credits.push({id,name:info.name,authors:Object.keys(info.authors||{})});
 const g=files.gltf['1k'].gltf,dir=join(cache,id),main=join(dir,id+'.gltf');
 if(!await exists(main)){await mkdir(dir,{recursive:true});for(const [rel,f] of [[id+'.gltf',g],...Object.entries(g.include||{})]){const r=await fetch(f.url,{headers:UA});if(!r.ok)throw Error(f.url+' → '+r.status);const p=join(dir,rel);await mkdir(dirname(p),{recursive:true});await writeFile(p,Buffer.from(await r.arrayBuffer()));}}
 const doc=await io.read(main),before=triangles(doc);
 await doc.transform(F.dedup(),F.prune(),F.weld());
 const ratio=Math.min(1,spec.triangles/before);
 if(ratio<1)await doc.transform(F.simplify({simplifier:MeshoptSimplifier,ratio,error:spec.error??.02,lockBorder:false}),F.weld());
 await doc.transform(F.prune(),F.textureCompress({encoder:sharp,resize:[512,512],targetFormat:'png'}));
 await doc.transform(ktx2({isUASTC:false,generateMipmap:true,imageDecoder,qualityLevel:160,compressionLevel:2}));
 const file=join(out,id+'.glb');await io.write(file,doc);
 console.log(id,'triangles',before,'→',triangles(doc));
}
await writeFile(join(out,'ATTRIBUTION.md'),'# Maple House furniture\n\nAll models are from [Poly Haven](https://polyhaven.com) under the [CC0 1.0 license](https://polyhaven.com/license) (public domain). Credit is not required but is given here with thanks. `tools/prepare-house-furniture.mjs` simplified each model to a triangle budget and compressed its textures to 512 px KTX2.\n\n| Model | Authors |\n| --- | --- |\n'+credits.map(c=>'| ['+c.name+'](https://polyhaven.com/a/'+c.id+') | '+c.authors.join(', ')+' |').join('\n')+'\n');
console.log('Wrote',credits.length,'models and ATTRIBUTION.md');
