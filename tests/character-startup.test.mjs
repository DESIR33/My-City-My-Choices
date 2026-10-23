import assert from 'node:assert/strict';
import test from 'node:test';
import * as THREE from 'three';
import {readFile} from 'node:fs/promises';
import {createCharacterSystem,MODELS} from '../assets/characters.js';

test('Mobile characters hydrate only nearby, during active play, one actor at a time',async()=>{
 const oldDocument=globalThis.document,oldFetch=globalThis.fetch,oldBitmap=globalThis.createImageBitmap,oldSelf=globalThis.self,oldProgress=globalThis.ProgressEvent;
 globalThis.self=globalThis;globalThis.ProgressEvent=class {constructor(type,data){Object.assign(this,{type},data)}};
 globalThis.createImageBitmap=async()=>({width:1,height:1,close(){}});
 const context=new Proxy({measureText:()=>({width:10}),createLinearGradient:()=>({addColorStop(){}})},{get:(target,key)=>target[key]||(()=>{})});
 globalThis.document={createElement:()=>({width:512,height:512,getContext:()=>context})};
 const requests=[],releases=[];
 globalThis.fetch=async request=>{const url=typeof request==='string'?request:request.url;if(url.startsWith('blob:'))return oldFetch(request);requests.push(url);
  if(url.endsWith(MODELS.neighbor.file)||url.endsWith(MODELS.casual.file))await new Promise(resolve=>releases.push(resolve));
  const bytes=await readFile(new URL('../assets/characters/'+new URL(url).pathname.split('/').at(-1),import.meta.url));return new Response(bytes,{headers:{'Content-Length':String(bytes.length)}});
 };
 try{
  const scene=new THREE.Scene(),errors=[],characters=createCharacterSystem(scene,{groundHeight:()=>0,baseURL:'https://models.invalid/',detailRadius:40,detailConcurrency:1,onError:(m,e)=>errors.push(e)});
  const player=characters.create({x:0,z:0,model:'neighbor'}),near=characters.create({x:3,z:0,model:'neighbor'}),far=characters.create({x:500,z:500,model:'casual'});
  assert.equal(requests.length,0,'Constructing all city actors starts no detailed downloads');
  characters.update(0,player);assert.equal(requests.length,0,'Paused first-frame/setup cannot start model loading');
  characters.update(1/60,player);assert.ok(player.userData.character.loading);assert.equal(near.userData.character.loading,undefined,'One actor hydration at once');assert.equal(far.userData.character.loading,undefined);
  assert.ok(!requests.some(u=>u.endsWith(MODELS.casual.file)),'Far-away model stays unloaded');
  releases.shift()();await characters.ready();assert.deepEqual(errors,[]);assert.equal(player.userData.character.ready,true);
  characters.update(1/60,player);await characters.ready();assert.equal(near.userData.character.ready,true,'A nearby second actor uses the shared template');
  assert.equal(requests.filter(u=>u.endsWith(MODELS.neighbor.file)).length,1);assert.equal(far.userData.character.loading,undefined);
  player.position.set(500,0,500);characters.update(1/60,player);assert.ok(far.userData.character.loading);releases.shift()();await characters.ready();assert.equal(far.userData.character.ready,true);
  assert.deepEqual(errors,[]);
 }finally{globalThis.fetch=oldFetch;globalThis.document=oldDocument;globalThis.createImageBitmap=oldBitmap;globalThis.self=oldSelf;globalThis.ProgressEvent=oldProgress;}
});
