#!/usr/bin/env node
// Builds the ambient motion clips (looking around, texting, waiting, talking and
// listening) and the seated idles for both Rocketbox animation sets from the
// original FBX files.
// Keeps only what retargeting uses (bone rotations and the root's translation)
// and drops redundant keyframes. Run from the repository root:
//
//   GIT_LFS_SKIP_SMUDGE=1 git clone --depth 1 --filter=blob:none --sparse \
//     https://github.com/microsoft/microsoft-rocketbox /path/to/rocketbox
//   npm install --no-save @gltf-transform/core@4.5.1 @gltf-transform/extensions@4.5.1 \
//     @gltf-transform/functions@4.5.1 fbx2gltf@0.9.7-p1
//   node tools/prepare-motions.mjs --rocketbox /path/to/rocketbox
import {execFileSync} from 'node:child_process';
import {writeFile,mkdtemp,rm} from 'node:fs/promises';
import {join,dirname} from 'node:path';
import {tmpdir} from 'node:os';
import {createRequire} from 'node:module';
import {AMBIENT_MOTIONS,SEATED_MOTIONS} from '../assets/crowd-life.js';

let NodeIO,ALL_EXTENSIONS,resample,prune;
try{({NodeIO}=await import('@gltf-transform/core'));({ALL_EXTENSIONS}=await import('@gltf-transform/extensions'));({resample,prune}=await import('@gltf-transform/functions'));}
catch{console.error('Install the tool dependencies first (see the header of this file).');process.exit(1);}
const args=process.argv.slice(2),RB=args.includes('--rocketbox')?args[args.indexOf('--rocketbox')+1]:null;
if(!RB){console.error('Pass --rocketbox /path/to/microsoft-rocketbox');process.exit(1);}
const FBX2GLTF=join(dirname(createRequire(import.meta.url).resolve('fbx2gltf/package.json')),'bin',{linux:'Linux',darwin:'Darwin',win32:'Windows_NT'}[process.platform],process.platform==='win32'?'FBX2glTF.exe':'FBX2glTF');
const DIR='Assets/Animations/all_animations_max_motextr_static/';
const io=new NodeIO().registerExtensions(ALL_EXTENSIONS);

for(const set of ['f','m'])for(const file of [...Object.values(AMBIENT_MOTIONS),...Object.values(SEATED_MOTIONS)]){
 const source=set+'_'+file+'.max.fbx',tmp=await mkdtemp(join(tmpdir(),'motion-'));
 await writeFile(join(tmp,'clip.fbx'),execFileSync('git',['-C',RB,'cat-file','-p','HEAD:'+DIR+source],{maxBuffer:1<<28}));
 execFileSync(FBX2GLTF,['--binary','--input',join(tmp,'clip.fbx'),'--output',join(tmp,'clip')],{stdio:'ignore'});
 const doc=await io.read(join(tmp,'clip.glb'));await rm(tmp,{recursive:true,force:true});
 for(const a of doc.getRoot().listAnimations())for(const c of a.listChannels()){const keep=c.getTargetPath()==='rotation'||(c.getTargetPath()==='translation'&&c.getTargetNode()?.getName()==='Bip01');if(!keep){c.getSampler().dispose();c.dispose();}}
 await doc.transform(resample({tolerance:2e-3}),prune());
 const out='assets/characters/'+set+'_'+file+'.glb';await io.write(out,doc);
 const a=doc.getRoot().listAnimations()[0];console.log(out,a.listChannels().length,'channels');
}
