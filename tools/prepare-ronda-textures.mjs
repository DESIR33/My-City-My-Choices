#!/usr/bin/env node
// Downloads the pinned CC0 Poly Haven scans used by the Ronda district and writes
// KTX2 colour, normal and AO/roughness/metal maps (1024 px desktop, 512 px phones)
// to assets/ronda/textures/. Run from the repository root:
//   npm install --no-save sharp@0.35.5 ktx2-encoder@0.6.0
//   node tools/prepare-ronda-textures.mjs [--cache /tmp/polyhaven-ronda]
// The list lives in assets/ronda-world.js (RONDA_SCANS).
import {mkdir,readFile,writeFile,access} from 'node:fs/promises';
import {join} from 'node:path';
import {tmpdir} from 'node:os';
import {RONDA_SCANS} from '../assets/ronda-world.js';

let sharp,encodeToKTX2;
try{sharp=(await import('sharp')).default;({encodeToKTX2}=await import('ktx2-encoder'));}
catch{console.error('Install the tool dependencies first:\n  npm install --no-save sharp@0.35.5 ktx2-encoder@0.6.0');process.exit(1);}
const args=process.argv.slice(2),cache=args.includes('--cache')?args[args.indexOf('--cache')+1]:join(tmpdir(),'polyhaven-ronda'),out='assets/ronda/textures';
const API='https://api.polyhaven.com',UA={'User-Agent':'MyCityMyChoices-asset-tool/1.0 (+https://github.com/DESIR33/My-City-My-Choices)'};
const json=async url=>{const r=await fetch(url,{headers:UA});if(!r.ok)throw Error(url+' → '+r.status);return r.json();};
const exists=p=>access(p).then(()=>true,()=>false);
const FILE_KEY={diff:'Diffuse',nor:'nor_gl',arm:'arm'};
const ENCODE={diff:{isPerceptual:true,isSetKTX2SRGBTransferFunc:true,qualityLevel:180},nor:{isPerceptual:false,isSetKTX2SRGBTransferFunc:false,isNormalMap:true,qualityLevel:200},arm:{isPerceptual:false,isSetKTX2SRGBTransferFunc:false,qualityLevel:140}};
const imageDecoder=async b=>{const {data,info}=await sharp(b).ensureAlpha().raw().toBuffer({resolveWithObject:true});return {data:new Uint8Array(data),width:info.width,height:info.height};};
await mkdir(cache,{recursive:true});await mkdir(out,{recursive:true});
const credits=[];
for(const [kind,scan] of Object.entries(RONDA_SCANS)){
  const info=await json(API+'/info/'+scan.id),files=await json(API+'/files/'+scan.id);credits.push({kind,id:scan.id,name:info.name,authors:Object.keys(info.authors||{})});
  for(const map of ['diff','nor','arm']){
    const src=join(cache,scan.id+'_'+map+'_1k.jpg');
    if(!await exists(src)){const url=files[FILE_KEY[map]]?.['1k']?.jpg?.url;if(!url)throw Error(scan.id+' has no '+map);const r=await fetch(url,{headers:UA});if(!r.ok)throw Error(url+' → '+r.status);await writeFile(src,Buffer.from(await r.arrayBuffer()));}
    for(const size of [1024,512]){
      let img=sharp(await readFile(src)).resize(size,size,{kernel:'lanczos3'});
      // Tone scans become grayscale detail with a fixed mean, so the material tint sets the colour.
      if(map==='diff'&&scan.tone){const {data,info}=await img.greyscale().raw().toBuffer({resolveWithObject:true});let mean=0;for(const v of data)mean+=v;mean/=data.length;const k=.78*255/mean;for(let i=0;i<data.length;i++)data[i]=Math.min(255,Math.round(data[i]*k));img=sharp(data,{raw:{width:info.width,height:info.height,channels:1}});}
      const png=await img.png().toBuffer();
      const ktx=await encodeToKTX2(new Uint8Array(png),{imageDecoder,isUASTC:false,generateMipmap:true,isKTX2File:true,compressionLevel:2,...ENCODE[map]});
      const file=join(out,scan.id+'-'+size+'-'+map+'.ktx2');await writeFile(file,ktx);console.log(file,ktx.length,'bytes');
    }
  }
}
await writeFile(join(out,'ATTRIBUTION.md'),'# Ronda surface scans\n\nAll textures are from [Poly Haven](https://polyhaven.com) under the [CC0 1.0 license](https://polyhaven.com/license) (public domain). Credit is not required but is given here with thanks. `tools/prepare-ronda-textures.mjs` resized each 1K colour (grayscale detail for the cliff and bridge stone), normal (OpenGL) and AO/roughness/metal map to 1024 and 512 px and encoded it as KTX2 (ETC1S).\n\n'+credits.map(c=>'- `'+c.id+'` ('+c.kind+'): ['+c.name+'](https://polyhaven.com/a/'+c.id+') by '+c.authors.join(', ')).join('\n')+'\n');
console.log('Wrote',credits.length,'scans and ATTRIBUTION.md');
