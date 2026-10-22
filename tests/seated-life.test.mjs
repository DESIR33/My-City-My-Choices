import assert from 'node:assert/strict';
import {readFile,stat} from 'node:fs/promises';
import * as THREE from 'three';
import {SEATED_MOTIONS,seatedMotion} from '../assets/crowd-life.js';
import {createCharacterSystem} from '../assets/characters.js';

const file=p=>new URL('../'+p,import.meta.url);
async function glbJSON(path){const b=await readFile(path),len=b.readUInt32LE(12);return JSON.parse(b.toString('utf8',20,20+len));}

// Schedule: mostly a neutral sit, with looking around, breathing and relaxing mixed in.
const seen=new Set();for(let t=0;t<120;t+=.5)seen.add(seatedMotion(t,{seed:3}));
assert.deepEqual([...seen].sort(),Object.keys(SEATED_MOTIONS).sort());assert.equal(seatedMotion(33,{seed:1}),seatedMotion(33,{seed:1}));
let bytes=0;for(const set of ['f','m'])for(const name of Object.values(SEATED_MOTIONS)){const path=file('assets/characters/'+set+'_'+name+'.glb'),g=await glbJSON(path);bytes+=(await stat(path)).size;
 assert.equal(g.animations.length,1);for(const c of g.animations[0].channels)assert.ok(c.target.path==='rotation'||g.nodes[c.target.node].name==='Bip01');}
assert.ok(bytes<600e3,'seated clips '+bytes);

// Real rigs and clips: only bitmap decoding is mocked.
globalThis.self=globalThis;globalThis.ProgressEvent=class{constructor(type,data){Object.assign(this,{type},data)}};
globalThis.createImageBitmap=async()=>({width:1,height:1,close(){}});
const context=new Proxy({measureText:()=>({width:10}),createLinearGradient:()=>({addColorStop(){}})},{get:(t,k)=>t[k]||(()=>{})});
globalThis.document={createElement:()=>({width:512,height:512,getContext:()=>context})};
const BASE='https://models.invalid/characters/',nativeFetch=globalThis.fetch;
globalThis.fetch=async request=>{const url=typeof request==='string'?request:request.url;if(url.startsWith('blob:'))return nativeFetch(request);const bytes=await readFile(file('assets/characters/'+url.slice(BASE.length)));return new Response(bytes,{headers:{'Content-Length':String(bytes.length)}});};
const errors=[],scene=new THREE.Scene(),chars=createCharacterSystem(scene,{groundHeight:()=>0,baseURL:BASE,onError:(m,e)=>errors.push(m+' '+e)});
const SEAT=.45,people=[['mom',0],['m12',1.2],['m04',2.4],['boy',3.6]].map(([model,x])=>({model,actor:chars.create({x,z:0,model})}));
await chars.ready();for(const {actor} of people)chars.setSeated(actor,{height:SEAT});
for(let i=0;i<200&&!people.every(p=>p.actor.userData.character.seatedReady);i++)await new Promise(r=>setTimeout(r,20));
assert.deepEqual(errors,[]);assert.ok(people.every(p=>p.actor.userData.character.seatedReady),'seated clips load when someone sits');

const bone=(actor,part)=>{let found;actor.userData.character.source.traverse(b=>{if(b.isBone&&b.name.replaceAll('_',' ').endsWith(part))found=b;});return found;};
const used=new Set();
for(let f=0;f<420;f++){chars.update(.1,null);
 for(const {model,actor} of people){const d=actor.userData.character;used.add(d.active);assert.ok(SEATED_MOTIONS[d.active],model+' plays a seated clip, not '+d.active);
  const pelvis=bone(actor,'Pelvis').getWorldPosition(new THREE.Vector3());assert.ok(Math.abs(pelvis.y-(SEAT+.04))<.02,model+' sits on the seat');
  for(const {bone:foot,soleDepth} of d.contacts){const p=foot.getWorldPosition(new THREE.Vector3());assert.ok(p.y-soleDepth>-.03,model+' foot stays above the floor');
   if(model!=='boy')assert.ok(p.y-soleDepth<.06,model+' foot reaches the floor ('+(p.y-soleDepth).toFixed(3)+')');
   assert.ok((p.z-actor.position.z)>.1,model+' feet rest in front of the seat');}}}
assert.ok(used.size>=3,'seated people change gestures over time: '+[...used].join(','));

// Standing up returns to standing motion.
for(const {actor} of people)chars.setSeated(actor,null);chars.update(1/30,null);
for(const {model,actor} of people)assert.ok(!SEATED_MOTIONS[actor.userData.character.active],model+' stands');
globalThis.fetch=nativeFetch;
console.log('Seated life passed: real rigs sit at seat height with feet on the floor and animated upper bodies',{clips:[...used]});
