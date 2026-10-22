import assert from 'node:assert/strict';
import {readFile,stat} from 'node:fs/promises';
import * as THREE from 'three';
import {AMBIENT_MOTIONS,PHONE_MOTIONS,ambientMotion,CROWD_LIMITS} from '../assets/crowd-life.js';
import {MODELS,CROWD_ADULTS,CROWD_CHILDREN,crowdModel} from '../assets/character-roster.js';
import {createCharacterSystem} from '../assets/characters.js';

const file=p=>new URL('../'+p,import.meta.url);
async function glbJSON(path){const b=await readFile(path),len=b.readUInt32LE(12);return JSON.parse(b.toString('utf8',20,20+len));}

// Schedule: loners cycle through idle, looking around, texting and waiting; it is deterministic.
const loner=new Set();for(let t=0;t<200;t+=.5)loner.add(ambientMotion('loner',t,{seed:2}));
assert.deepEqual([...loner].sort(),['idle','look','phone','wait']);
assert.equal(ambientMotion('loner',47,{seed:5}),ambientMotion('loner',47,{seed:5}));
assert.ok(Array.from({length:12},(_,seed)=>ambientMotion('loner',0,{seed})).some(k=>k!=='idle'),'people are not all in step');
for(const k of loner)assert.ok(k==='idle'||AMBIENT_MOTIONS[k],k+' has a clip');
assert.ok(PHONE_MOTIONS.every(k=>AMBIENT_MOTIONS[k]));
// Conversations: partners sharing a seed always take turns, and turns change over time.
const speaking=k=>k==='talk'||k==='talk2';let swaps=0,lastA=null;
for(let t=0;t<120;t+=.25){const a=ambientMotion('talk',t,{seed:9,turn:0}),b=ambientMotion('talk',t,{seed:9,turn:1});
 assert.notEqual(speaking(a),speaking(b),'one talks while the other listens at '+t);for(const k of [a,b])assert.ok(AMBIENT_MOTIONS[k],k);
 if(lastA!==null&&speaking(a)!==lastA)swaps++;lastA=speaking(a);}
assert.ok(swaps>=15,'they swap roles every few seconds');

// Clip files: both animation sets, retargetable channels only, within budget.
let bytes=0;
for(const set of ['f','m'])for(const name of Object.values(AMBIENT_MOTIONS)){
 const path=file('assets/characters/'+set+'_'+name+'.glb'),gltf=await glbJSON(path),size=(await stat(path)).size;bytes+=size;
 assert.equal(gltf.animations?.length,1,name);assert.ok(!gltf.meshes?.length,'motion only');
 const channels=gltf.animations[0].channels;assert.ok(channels.length>=40,set+'_'+name+' animates the body');
 for(const c of channels)assert.ok(c.target.path==='rotation'||(c.target.path==='translation'&&gltf.nodes[c.target.node].name==='Bip01'),'only rotations and root motion');
 assert.ok(size<450e3,set+'_'+name+' '+size);
}
assert.ok(bytes<1.6e6,'ambient clips '+bytes);

// Phones use a smaller crowd that still mixes women and men.
const phoneAdults=new Set(Array.from({length:40},(_,i)=>crowdModel(i,{limit:CROWD_LIMITS.mobile.adults})));
assert.equal(phoneAdults.size,CROWD_LIMITS.mobile.adults);assert.ok([...phoneAdults].some(k=>MODELS[k].set==='f')&&[...phoneAdults].some(k=>MODELS[k].set==='m'));
assert.equal(new Set(Array.from({length:40},(_,i)=>crowdModel(i))).size,CROWD_ADULTS.length,'desktop uses the whole pool');
assert.equal(new Set(Array.from({length:10},(_,i)=>crowdModel(i,{child:true,limit:CROWD_LIMITS.mobile.children}))).size,Math.min(CROWD_CHILDREN.length,CROWD_LIMITS.mobile.children));

// Character options: crowd people idle with life, uniforms and story characters do not.
globalThis.document={createElement:()=>({width:0,height:0,getContext:()=>new Proxy({},{get:()=>()=>{}})})};
const scene=new THREE.Scene(),chars=createCharacterSystem(scene,{onError:()=>{},baseURL:'file:///nowhere/',crowdLimit:CROWD_LIMITS.mobile});
const data=o=>chars.create({x:0,z:0,...o}).userData.character;
assert.equal(data({model:'crowd'}).ambient,'loner');assert.equal(data({model:'crowd',police:true}).ambient,null);assert.equal(data({model:'mom'}).ambient,null);
const a=data({model:'crowd',ambient:'talk',turn:0,ambientSeed:42}),b=data({model:'crowd',ambient:'talk',turn:1,ambientSeed:42});
assert.deepEqual([a.ambient,a.turn,a.seed,b.turn,b.seed],['talk',0,42,1,42]);
const limited=new Set(Array.from({length:20},()=>data({model:'crowd'}).model));assert.ok(limited.size<=CROWD_LIMITS.mobile.adults,'phone limit applies');
await chars.ready();

// Game wiring: three conversations and the phone crowd limit.
const index=await readFile(file('index.html'),'utf8');
assert.ok((index.match(/conversation\(-?[\d.]+,-?[\d.]+\)/g)||[]).length>=3);assert.match(index,/crowdLimit:mobileGraphics\?CROWD_LIMITS\.mobile/);
console.log('Crowd life passed:',{clips:Object.keys(AMBIENT_MOTIONS).length*2,clipMB:+(bytes/1e6).toFixed(2),phoneAdults:phoneAdults.size});
