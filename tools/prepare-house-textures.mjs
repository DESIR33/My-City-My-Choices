#!/usr/bin/env node
// Downloads the pinned CC0 Poly Haven textures used by the Maple House and writes
// GPU-compressed KTX2 files (1024 px for desktop, 512 px for phones) to
// assets/house/textures/. Run from the repository root:
//
//   npm install --no-save sharp@0.35.5 ktx2-encoder@0.6.0
//   node tools/prepare-house-textures.mjs [--cache /tmp/polyhaven]
//
// The texture list lives in assets/house-surfaces.js (HOUSE_TEXTURES).
import {mkdir,readFile,writeFile,access} from 'node:fs/promises';
import {join} from 'node:path';
import {tmpdir} from 'node:os';
import {HOUSE_TEXTURES} from '../assets/house-surfaces.js';

let sharp,encodeToKTX2;
try{sharp=(await import('sharp')).default;({encodeToKTX2}=await import('ktx2-encoder'));}
catch{console.error('Install the tool dependencies first:\n  npm install --no-save sharp@0.35.5 ktx2-encoder@0.6.0');process.exit(1);}

const args=process.argv.slice(2),cache=args.includes('--cache')?args[args.indexOf('--cache')+1]:join(tmpdir(),'polyhaven-house'),out='assets/house/textures';
const API='https://api.polyhaven.com',UA={'User-Agent':'MyCityMyChoices-asset-tool/1.0 (+https://github.com/DESIR33/My-City-My-Choices)'};
const json=async url=>{const r=await fetch(url,{headers:UA});if(!r.ok)throw Error(url+' → '+r.status);return r.json();};
const exists=p=>access(p).then(()=>true,()=>false);
const FILE_KEY={diff:'Diffuse',nor:'nor_gl',arm:'arm'};
// ETC1S everywhere keeps downloads small; normal maps use the normal-map preset.
const ENCODE={diff:{isPerceptual:true,isSetKTX2SRGBTransferFunc:true,qualityLevel:180},nor:{isPerceptual:false,isSetKTX2SRGBTransferFunc:false,isNormalMap:true,qualityLevel:200},arm:{isPerceptual:false,isSetKTX2SRGBTransferFunc:false,qualityLevel:140}};
const imageDecoder=async b=>{const {data,info}=await sharp(b).ensureAlpha().raw().toBuffer({resolveWithObject:true});return {data:new Uint8Array(data),width:info.width,height:info.height};};

await mkdir(cache,{recursive:true});await mkdir(out,{recursive:true});
const credits=[];
for(const [id,spec] of Object.entries(HOUSE_TEXTURES)){
 const [info,files]=await Promise.all([json(API+'/info/'+id),json(API+'/files/'+id)]);
 credits.push({id,name:info.name,authors:Object.keys(info.authors||{}),size:spec.size});
 for(const map of spec.maps){
  const src=join(cache,id+'_'+map+'_1k.jpg');
  if(!await exists(src)){const url=files[FILE_KEY[map]]?.['1k']?.jpg?.url;if(!url)throw Error(id+' has no '+map+' map');const r=await fetch(url,{headers:UA});if(!r.ok)throw Error(url+' → '+r.status);await writeFile(src,Buffer.from(await r.arrayBuffer()));}
  for(const size of [1024,512]){
   const png=await sharp(await readFile(src)).resize(size,size,{kernel:'lanczos3'}).png().toBuffer();
   const ktx=await encodeToKTX2(new Uint8Array(png),{imageDecoder,isUASTC:false,generateMipmap:true,isKTX2File:true,compressionLevel:2,...ENCODE[map]});
   const file=join(out,id+'-'+size+'-'+map+'.ktx2');await writeFile(file,ktx);console.log(file,ktx.length,'bytes');
  }
 }
}
await writeFile(join(out,'ATTRIBUTION.md'),'# Maple House textures\n\nAll textures are from [Poly Haven](https://polyhaven.com) under the [CC0 1.0 license](https://polyhaven.com/license) (public domain). Credit is not required but is given here with thanks. Files were resized to 1024 and 512 pixels and compressed to KTX2 (Basis ETC1S) by `tools/prepare-house-textures.mjs`.\n\n| Texture | Authors | Repeat size |\n| --- | --- | --- |\n'+credits.map(c=>'| ['+c.name+'](https://polyhaven.com/a/'+c.id+') | '+c.authors.join(', ')+' | '+c.size+' m |').join('\n')+'\n');
console.log('Wrote',credits.length,'textures and ATTRIBUTION.md');
