#!/usr/bin/env node
// Downloads the pinned CC0 Poly Haven scans used across the city and writes KTX2
// files (1024 px desktop, 512 px phones) to assets/city/textures/. Each scan gets
// a grayscale "tone" map whose average matches the procedural maps, so buildings
// keep their paint colors. Normal/roughness maps the house already ships are
// reused rather than duplicated. Run from the repository root:
//
//   npm install --no-save sharp@0.35.5 ktx2-encoder@0.6.0
//   node tools/prepare-city-textures.mjs [--cache /tmp/polyhaven-city]
//
// The list lives in assets/city-scans.js (CITY_SCANS).
import {mkdir,readFile,writeFile,access} from 'node:fs/promises';
import {join} from 'node:path';
import {tmpdir} from 'node:os';
import {CITY_SCANS,CITY_TONE_MEAN,cityScanFiles} from '../assets/city-scans.js';

let sharp,encodeToKTX2;
try{sharp=(await import('sharp')).default;({encodeToKTX2}=await import('ktx2-encoder'));}
catch{console.error('Install the tool dependencies first:\n  npm install --no-save sharp@0.35.5 ktx2-encoder@0.6.0');process.exit(1);}

const args=process.argv.slice(2),cache=args.includes('--cache')?args[args.indexOf('--cache')+1]:join(tmpdir(),'polyhaven-city'),out='assets/city/textures';
const API='https://api.polyhaven.com',UA={'User-Agent':'MyCityMyChoices-asset-tool/1.0 (+https://github.com/DESIR33/My-City-My-Choices)'};
const json=async url=>{const r=await fetch(url,{headers:UA});if(!r.ok)throw Error(url+' → '+r.status);return r.json();};
const exists=p=>access(p).then(()=>true,()=>false);
const FILE_KEY={tone:'Diffuse',nor:'nor_gl',arm:'arm'};
const ENCODE={tone:{isPerceptual:true,isSetKTX2SRGBTransferFunc:true,qualityLevel:180},nor:{isPerceptual:false,isSetKTX2SRGBTransferFunc:false,isNormalMap:true,qualityLevel:200},arm:{isPerceptual:false,isSetKTX2SRGBTransferFunc:false,qualityLevel:140}};
const imageDecoder=async b=>{const {data,info}=await sharp(b).ensureAlpha().raw().toBuffer({resolveWithObject:true});return {data:new Uint8Array(data),width:info.width,height:info.height};};

// Quarter turn clockwise. Rotating a tangent-space normal map also rotates its
// vectors: new x = old y, new y = -old x (OpenGL convention).
async function rotated(raw,size,map){
 const {data}=await sharp(raw,{raw:{width:size,height:size,channels:4}}).rotate(90).raw().toBuffer({resolveWithObject:true});
 if(map==='nor')for(let i=0;i<data.length;i+=4){const r=data[i],g=data[i+1];data[i]=g;data[i+1]=255-r;}
 return data;
}
// Grayscale detail with the procedural maps' average brightness.
function tone(data){
 const n=data.length/4,lum=new Float32Array(n);let mean=0;
 for(let i=0;i<n;i++){lum[i]=.2126*data[i*4]+.7152*data[i*4+1]+.0722*data[i*4+2];mean+=lum[i];}
 const scale=CITY_TONE_MEAN*255/(mean/n);
 for(let i=0;i<n;i++){const v=Math.min(255,Math.round(lum[i]*scale));data[i*4]=data[i*4+1]=data[i*4+2]=v;data[i*4+3]=255;}
 return data;
}

await mkdir(cache,{recursive:true});await mkdir(out,{recursive:true});
const credits=new Map(),wanted=new Set(cityScanFiles(1024).filter(f=>f.dir==='city').map(f=>f.name.replace('-1024-','-')));
for(const [kind,scan] of Object.entries(CITY_SCANS)){
 const id=scan.id;
 if(!credits.has(id)){const info=await json(API+'/info/'+id);credits.set(id,{id,name:info.name,authors:Object.keys(info.authors||{}),kinds:[],tile:scan.tile});}
 credits.get(id).kinds.push(kind);
 const files=await json(API+'/files/'+id);
 for(const map of ['tone','nor','arm']){
  if(!wanted.has(id+'-'+map+'.ktx2'))continue;
  const src=join(cache,id+'_'+FILE_KEY[map]+'_1k.jpg');
  if(!await exists(src)){const url=files[FILE_KEY[map]]?.['1k']?.jpg?.url;if(!url)throw Error(id+' has no '+map+' map');const r=await fetch(url,{headers:UA});if(!r.ok)throw Error(url+' → '+r.status);await writeFile(src,Buffer.from(await r.arrayBuffer()));}
  for(const size of [1024,512]){
   let data=(await sharp(await readFile(src)).resize(size,size,{kernel:'lanczos3'}).ensureAlpha().raw().toBuffer({resolveWithObject:true})).data;
   if(scan.rotate)data=await rotated(data,size,map);
   if(map==='tone')data=tone(data);
   const png=await sharp(data,{raw:{width:size,height:size,channels:4}}).png().toBuffer();
   const ktx=await encodeToKTX2(new Uint8Array(png),{imageDecoder,isUASTC:false,generateMipmap:true,isKTX2File:true,compressionLevel:2,...ENCODE[map]});
   const file=join(out,id+'-'+size+'-'+map+'.ktx2');await writeFile(file,ktx);console.log(file,ktx.length,'bytes');
  }
 }
}
await writeFile(join(out,'ATTRIBUTION.md'),'# City surface scans\n\nAll textures are from [Poly Haven](https://polyhaven.com) under the [CC0 1.0 license](https://polyhaven.com/license) (public domain). Credit is not required but is given here with thanks. `tools/prepare-city-textures.mjs` converted each color scan to a grayscale tone map (so buildings keep their own paint colors), resized to 1024 and 512 pixels and compressed to KTX2 (Basis ETC1S). White Planks Clean is turned a quarter turn to read as horizontal lap siding. Normal and roughness maps for scans the Maple House already uses live in `assets/house/textures/`.\n\n| Texture | Authors | Used for | Repeat size |\n| --- | --- | --- | --- |\n'+[...credits.values()].map(c=>'| ['+c.name+'](https://polyhaven.com/a/'+c.id+') | '+c.authors.join(', ')+' | '+c.kinds.join(', ')+' | '+c.tile+' m |').join('\n')+'\n');
console.log('Wrote',credits.size,'scans and ATTRIBUTION.md');
