#!/usr/bin/env node
// Builds assets/pets/dog.glb and cat.glb from Quaternius "Animal Pack Vol.2" (CC0,
// https://opengameart.org/content/animated-animales-low-poly). Converts the FBX
// with FBX2glTF, restores the material colors the FBX export drops, renames the
// clips to idle/walk. (Vertex quantization is skipped: the FBX mesh node carries
// a ×100 scale that the quantizer turns into wrong skinned bounds.) Run from the repository root:
//
//   npm install --no-save @gltf-transform/core@4.5.1 @gltf-transform/extensions@4.5.1 fbx2gltf@0.9.7-p1
//   node tools/prepare-pets.mjs
import {execFileSync} from 'node:child_process';
import {mkdir,writeFile,mkdtemp,rm} from 'node:fs/promises';
import {join,dirname} from 'node:path';
import {tmpdir} from 'node:os';
import {createRequire} from 'node:module';
import {unzipSync} from 'three/examples/jsm/libs/fflate.module.js';

let NodeIO,ALL_EXTENSIONS;
try{({NodeIO}=await import('@gltf-transform/core'));({ALL_EXTENSIONS}=await import('@gltf-transform/extensions'));}
catch{console.error('Install the tool dependencies first (see the header of this file).');process.exit(1);}
const FBX2GLTF=join(dirname(createRequire(import.meta.url).resolve('fbx2gltf/package.json')),'bin',{linux:'Linux',darwin:'Darwin',win32:'Windows_NT'}[process.platform],process.platform==='win32'?'FBX2glTF.exe':'FBX2glTF');
const ZIP='https://opengameart.org/sites/default/files/Animal%20Pack%20Vol.2%20by%20%40Quaternius.zip';
// Linear colors for the cat's tuxedo coat; the dog is one material tinted per pet at runtime.
const COLORS={White:[.86,.85,.82],Grey:[.035,.035,.04],Pink:[.85,.42,.5],Dog:[1,1,1]};

const r=await fetch(ZIP,{headers:{'User-Agent':'MyCityMyChoices-asset-tool/1.0'}});if(!r.ok)throw Error(ZIP+' → '+r.status);
const files=unzipSync(new Uint8Array(await r.arrayBuffer())),io=new NodeIO().registerExtensions(ALL_EXTENSIONS);
await mkdir('assets/pets',{recursive:true});
for(const [name,out] of [['Dog','dog'],['Cat','cat']]){
 const entry=Object.keys(files).find(f=>f.endsWith('/FBX/'+name+'.fbx'));if(!entry)throw Error('No '+name+'.fbx in the pack');
 const tmp=await mkdtemp(join(tmpdir(),'pets-'));await writeFile(join(tmp,name+'.fbx'),files[entry]);
 execFileSync(FBX2GLTF,['--binary','--input',join(tmp,name+'.fbx'),'--output',join(tmp,out)],{stdio:'ignore'});
 const doc=await io.read(join(tmp,out+'.glb'));await rm(tmp,{recursive:true,force:true});
 for(const m of doc.getRoot().listMaterials()){const c=COLORS[m.getName()];if(!c)throw Error('Unknown material '+m.getName());m.setBaseColorFactor([...c,1]).setMetallicFactor(0).setRoughnessFactor(.9);}
 for(const a of doc.getRoot().listAnimations())a.setName(/Walk/i.test(a.getName())?'walk':'idle');
 await io.write(join('assets/pets',out+'.glb'),doc);console.log('assets/pets/'+out+'.glb');
}
await writeFile('assets/pets/ATTRIBUTION.md','# Pets\n\nDog and Cat from [Animal Pack Vol.2 by Quaternius](https://opengameart.org/content/animated-animales-low-poly), [CC0 1.0](https://creativecommons.org/publicdomain/zero/1.0/) (public domain). Credit is not required but is given here with thanks. `tools/prepare-pets.mjs` converted the FBX files, restored material colors, and renamed the clips to `idle`/`walk`.\n');
