#!/usr/bin/env node
// Builds the character GLBs from Microsoft Rocketbox sources (MIT).
//  - Original six (assets/characters/*.glb): keeps the shipped meshes and textures
//    and adds a roughness map made from the Rocketbox specular scan.
//  - Crowd models (assets/characters/crowd/*.glb): converts the FBX with FBX2glTF,
//    attaches color (1024 px; 512 px for hair/eyelashes), normal (512 px) and
//    roughness (512 px) WebP maps, makes hair/eyelashes alpha-tested and quantizes
//    vertex data.
// Run from the repository root:
//
//   GIT_LFS_SKIP_SMUDGE=1 git clone --depth 1 --filter=blob:none --sparse \
//     https://github.com/microsoft/microsoft-rocketbox /path/to/rocketbox
//   npm install --no-save sharp@0.35.5 @gltf-transform/core@4.5.1 @gltf-transform/extensions@4.5.1 \
//     @gltf-transform/functions@4.5.1 fbx2gltf@0.9.7-p1
//   node tools/prepare-characters.mjs --rocketbox /path/to/rocketbox [--only f02,m04]
//
// Files are read with `git cat-file`, so a blob-filtered sparse clone is enough.
import {execFileSync} from 'node:child_process';
import {mkdir,writeFile,mkdtemp,rm} from 'node:fs/promises';
import {join,dirname} from 'node:path';
import {tmpdir} from 'node:os';
import {createRequire} from 'node:module';
import {MODELS,roughnessFromSpecular} from '../assets/character-roster.js';

let sharp,NodeIO,ALL_EXTENSIONS,EXTTextureWebP,quantize;
try{sharp=(await import('sharp')).default;({NodeIO}=await import('@gltf-transform/core'));({ALL_EXTENSIONS,EXTTextureWebP}=await import('@gltf-transform/extensions'));({quantize}=await import('@gltf-transform/functions'));}
catch{console.error('Install the tool dependencies first (see the header of this file).');process.exit(1);}
const args=process.argv.slice(2),arg=k=>args.includes(k)?args[args.indexOf(k)+1]:null;
const RB=arg('--rocketbox');if(!RB){console.error('Pass --rocketbox /path/to/microsoft-rocketbox');process.exit(1);}
const only=arg('--only')?.split(',');
const FBX2GLTF=arg('--fbx2gltf')||join(dirname(createRequire(import.meta.url).resolve('fbx2gltf/package.json')),'bin',{linux:'Linux',darwin:'Darwin',win32:'Windows_NT'}[process.platform],process.platform==='win32'?'FBX2glTF.exe':'FBX2glTF');
const blob=p=>execFileSync('git',['-C',RB,'cat-file','-p','HEAD:Assets/Avatars/'+p],{maxBuffer:1<<28});
const list=p=>execFileSync('git',['-C',RB,'ls-tree','--name-only','HEAD','Assets/Avatars/'+p+'/'],{encoding:'utf8'}).trim().split('\n').map(f=>f.split('/').pop());
const io=new NodeIO().registerExtensions(ALL_EXTENSIONS);

// Uncompressed or RLE 24/32-bit TGA, returned top-row first like glTF images.
function decodeTGA(b){
 const idLen=b[0],type=b[2],w=b.readUInt16LE(12),h=b.readUInt16LE(14),bpp=b[16],desc=b[17],ch=bpp/8;
 if(![2,10].includes(type)||![24,32].includes(bpp))throw Error('Unsupported TGA type '+type+' / '+bpp+' bpp');
 let o=18+idLen+(b[1]?b.readUInt16LE(5)*Math.ceil(b[7]/8):0),i=0;const px=new Uint8Array(w*h*4);
 const put=s=>{px[i*4]=b[s+2];px[i*4+1]=b[s+1];px[i*4+2]=b[s];px[i*4+3]=ch===4?b[s+3]:255;i++;};
 if(type===2)for(let k=0;k<w*h;k++){put(o);o+=ch;}
 else while(i<w*h){const c=b[o++],n=(c&127)+1;if(c&128){for(let k=0;k<n;k++)put(o);o+=ch;}else for(let k=0;k<n;k++){put(o);o+=ch;}}
 if(!(desc&0x20)){const row=w*4,t=new Uint8Array(row);for(let y=0;y<h/2;y++){const a=y*row,z=(h-1-y)*row;t.set(px.subarray(a,a+row));px.copyWithin(a,z,z+row);px.set(t,z);}}
 return {data:px,width:w,height:h};
}
const raw=t=>sharp(Buffer.from(t.data.buffer,t.data.byteOffset,t.data.byteLength),{raw:{width:t.width,height:t.height,channels:4}});
async function roughnessWebP(spec,size){
 const {data}=await raw(spec).resize(size,size).raw().toBuffer({resolveWithObject:true});
 for(let k=0;k<data.length;k+=4){const r=Math.round(roughnessFromSpecular(data[k]/255)*255);data[k]=0;data[k+1]=r;data[k+2]=0;data[k+3]=255;}
 return sharp(data,{raw:{width:size,height:size,channels:4}}).removeAlpha().webp({quality:85}).toBuffer();
}
const webp=(t,size,opts)=>raw(t).resize(size,size).webp(opts).toBuffer();
function texture(doc,name,image){return doc.createTexture(name).setImage(new Uint8Array(image)).setMimeType('image/webp');}
const triangles=doc=>doc.getRoot().listMeshes().reduce((n,m)=>n+m.listPrimitives().reduce((k,p)=>k+(p.getIndices()?.getCount()??0)/3,0),0);

for(const [key,spec] of Object.entries(MODELS)){
 if(only&&!only.includes(key))continue;
 const files=list(spec.source+'/Textures'),out=join('assets/characters',spec.file);
 let doc;
 if(spec.crowd){
  const tmp=await mkdtemp(join(tmpdir(),'rocketbox-')),name=spec.source.split('/').pop(),fbx=join(tmp,name+'.fbx');
  await writeFile(fbx,blob(spec.source+'/Export/'+name+'.fbx'));
  execFileSync(FBX2GLTF,['--binary','--input',fbx,'--output',join(tmp,'model')],{stdio:'ignore'});
  doc=await io.read(join(tmp,'model.glb'));await rm(tmp,{recursive:true,force:true});
  doc.createExtension(EXTTextureWebP).setRequired(true);
  for(const t of doc.getRoot().listTextures())t.dispose();
  for(const m of doc.getRoot().listMaterials()){
   const id=m.getName(),tex=f=>files.includes(id+'_'+f+'.tga')?decodeTGA(blob(spec.source+'/Textures/'+id+'_'+f+'.tga')):null;
   const color=tex('color'),normal=tex('normal'),specular=tex('specular');
   if(!color)throw Error(key+': no color map for '+id);
   const opacity=/opacity/.test(id);
   m.setBaseColorTexture(texture(doc,id+'_color',await webp(color,opacity?512:1024,{quality:82,alphaQuality:80}))).setBaseColorFactor([1,1,1,1]).setMetallicFactor(0).setRoughnessFactor(1).setDoubleSided(opacity);
   if(opacity)m.setAlphaMode('MASK').setAlphaCutoff(.5);
   if(normal)m.setNormalTexture(texture(doc,id+'_normal',await webp(normal,512,{quality:88})));
   if(specular)m.setMetallicRoughnessTexture(texture(doc,id+'_roughness',await roughnessWebP(specular,512)));
  }
  // 16-bit positions/UVs and 8-bit normals/weights (KHR_mesh_quantization) roughly halve vertex data.
  await doc.transform(quantize({quantizePosition:14,quantizeNormal:8,quantizeTexcoord:12,quantizeWeight:8}));
 }else{
  doc=await io.read(out);
  for(const m of doc.getRoot().listMaterials()){
   const id=m.getName();if(!files.includes(id+'_specular.tga'))continue;
   m.getMetallicRoughnessTexture()?.dispose();
   m.setMetallicRoughnessTexture(texture(doc,id+'_roughness',await roughnessWebP(decodeTGA(blob(spec.source+'/Textures/'+id+'_specular.tga')),512))).setMetallicFactor(0).setRoughnessFactor(1);
  }
 }
 await mkdir(dirname(out),{recursive:true});await io.write(out,doc);
 console.log(key,out,'triangles',triangles(doc));
}
await writeFile('assets/characters/crowd/README.md','# Crowd characters\n\nMicrosoft Rocketbox avatars, Copyright (c) 2020 Microsoft, MIT License (see `../LICENSE.txt`). Source: https://github.com/microsoft/Microsoft-Rocketbox. `tools/prepare-characters.mjs` converted each FBX with FBX2glTF and attached WebP color (1024 px), normal (512 px) and specular-derived roughness (512 px) maps, and quantized vertex data. No Microsoft endorsement is implied.\n\n| Model | Rocketbox source |\n| --- | --- |\n'+Object.values(MODELS).filter(m=>m.crowd).map(m=>'| `'+m.file.split('/').pop()+'` | '+m.source+' |').join('\n')+'\n');
