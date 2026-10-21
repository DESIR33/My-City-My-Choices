import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import * as THREE from 'three';
import {createCharacterSystem} from '../assets/characters.js';
// Load the shipped skeletons/clips locally. Only bitmap decoding is mocked;
// geometry, bone transforms, retargeting and animation mixers are real.
globalThis.self=globalThis;globalThis.ProgressEvent=class {constructor(type,data){Object.assign(this,{type},data)}};
globalThis.createImageBitmap=async()=>({width:1,height:1,close(){}});
const context=new Proxy({measureText:()=>({width:10}),createLinearGradient:()=>({addColorStop(){}})},{get:(target,key)=>target[key]||(()=>{})});
globalThis.document={createElement:()=>({width:512,height:512,getContext:()=>context})};
const nativeFetch=globalThis.fetch;globalThis.fetch=async request=>{const url=typeof request==='string'?request:request.url;if(url.startsWith('blob:'))return nativeFetch(request);const bytes=await readFile(new URL('../assets/characters/'+new URL(url).pathname.split('/').at(-1),import.meta.url));return new Response(bytes,{headers:{'Content-Length':String(bytes.length)}})};
const errors=[],scene=new THREE.Scene(),height=(x,z)=>x>1?.21:.06,characters=createCharacterSystem(scene,{groundHeight:height,baseURL:'https://models.invalid/',onError:(message,error)=>errors.push(error)});
const player=characters.create({x:0,z:0,model:'child'}),adult=characters.create({x:0,z:2,model:'neighbor'});await characters.ready();assert.deepEqual(errors,[]);assert(player.userData.character.ready);assert.equal(player.userData.character.contacts.length,2);assert.equal(adult.userData.character.contacts.length,2);
for(let i=0;i<180;i++){player.position.x+=i<90?.02:.07;adult.position.x+=i<90?.025:.07;characters.update(1/60,player);for(const actor of [player,adult])for(const {bone,soleDepth} of actor.userData.character.contacts){const p=bone.getWorldPosition(new THREE.Vector3());assert(p.y-soleDepth>=height(p.x,p.z)-1e-5,'Animated shoe contact stays above the local floor');}}
player.userData.vertical={managed:true,y:1.2,grounded:false};characters.update(1/60,player);assert.equal(player.position.y,1.2,'Character animation preserves airborne position');
player.userData.vertical={managed:true,y:3.45,grounded:true};player.position.set(0,3.45,0);characters.setResting(player,{height:.64});characters.update(1/60,player);const restingBox=new THREE.Box3().setFromObject(player.userData.character.visual,true);assert.ok(restingBox.min.y>=4.09-1e-5,'The resting rig stays above the mattress');assert.ok(restingBox.max.y-restingBox.min.y<1,'Resting lies horizontally rather than standing on the bed');characters.setResting(player,null);characters.update(1/60,player);assert.equal(player.userData.character.visual.rotation.x,0,'Standing restores the upright model');
globalThis.fetch=nativeFetch;
console.log('Real child/adult skeletons and shipped walk/run animations stay above pavement and raised curbs; jumping height is preserved');
