import assert from 'node:assert/strict';
import test from 'node:test';
import vm from 'node:vm';
import {readFile} from 'node:fs/promises';
import * as THREE from 'three';
import {createMetroWorld} from '../assets/metro-world.js';
import {createCharacterSystem} from '../assets/characters.js';
import {CROWD_LIMITS} from '../assets/crowd-life.js';

const html=await readFile(new URL('../index.html',import.meta.url),'utf8');
const lines=html.split('\n'),take=prefix=>lines.find(s=>s.startsWith(prefix));
const ground=take('function groundHeight('),characters=take('const characters=createCharacterSystem('),person=take('function person('),metro=take('const metroWorld=createMetroWorld('),player=take('const player=person(').split(';')[0]+';';
const early={offset:html.indexOf('const neighborhoodLife='),code:'const earlyNeighbor=person(-240,-90,0x496d84);'};
const ordered=[{offset:html.indexOf(metro),code:metro},{offset:html.indexOf(player),code:player},early].sort((a,b)=>a.offset-b.offset).map(s=>s.code).join('\n');
function fixture(){
 globalThis.document={createElement:()=>({width:512,height:512,getContext:()=>new Proxy({measureText:()=>({width:10}),createLinearGradient:()=>({addColorStop(){}})},{get:(o,k)=>o[k]||(()=>{})})})};
 const c={THREE,createMetroWorld,createCharacterSystem,CROWD_LIMITS,mobileGraphics:true,scene:new THREE.Scene(),visualKit:{atmosphere:{registerGlow(){}}},obstacles:[],groundSurfaces:[],onBridge:()=>false,bridgeHeight:()=>0,coastGroundHeight:()=>0,plazaGroundHeight:()=>0,globalThis:{},metroEvent(){},notify(){},console};
 vm.createContext(c);vm.runInContext(ground+'\n'+characters+'\n'+person,c);return c;
}
test('The pre-fix metro/player/ground-height initialization cycle reproduces',()=>{
 const c=fixture();assert.throws(()=>vm.runInContext(metro+'\n'+early.code+'\n'+player,c),/before initialization/);
});
test('Shipped ordering creates early neighbors and the player before installing metro ground queries',()=>{
 const c=fixture();assert.doesNotThrow(()=>vm.runInContext(ordered,c));
 assert.equal(vm.runInContext('characters.actors.length',c),2);assert.equal(vm.runInContext('player.position.y',c),0);
 assert.equal(c.globalThis.metroWorld.trains.length,3);
 assert.doesNotThrow(()=>vm.runInContext('const laterNeighbor=person(0,-10,0x496d84);characters.update(0,player);',c));
 assert.equal(vm.runInContext('laterNeighbor.position.y',c),0);assert.equal(vm.runInContext('characters.actors.some(a=>a.userData.character.loading)',c),false,'paused setup starts no model hydration');
});
