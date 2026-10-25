import assert from 'node:assert/strict';
import test from 'node:test';
import vm from 'node:vm';
import {readFile} from 'node:fs/promises';
import * as THREE from 'three';
import {createAirportWorld,departuresBoard} from '../assets/airport-world.js';
import {CITY_LIGHT_STORAGE,restoreCityTime} from '../assets/city-time.js';

const html=await readFile(new URL('../index.html',import.meta.url),'utf8');
// Run the real clock declaration and real airport call in their shipped order.
// The airport eagerly paints its board; a late clock declaration throws here.
const boot=html.split('\n').filter(line=>line.startsWith('const cityTime=(()=>')||line.startsWith('const airportWorld=createAirportWorld(')).join('\n');
const before=html.replace(/const cityTime=.*\n/,'');
const airportLine=before.split('\n').find(line=>line.startsWith('const airportWorld=createAirportWorld('));
const clockLine=html.split('\n').find(line=>line.startsWith('const cityTime=(()=>'));
function fixture(raw=null){
 const text=[],canvasContext=new Proxy({fillText:s=>text.push(s)},{get:(o,k)=>o[k]??(()=>{})});
 globalThis.document={createElement:()=>({width:0,height:0,getContext:()=>canvasContext})};
 const material=new THREE.MeshStandardMaterial(),context={THREE,createAirportWorld,CITY_LIGHT_STORAGE,restoreCityTime,Date,JSON,Number,Math,
 localStorage:{getItem:key=>key===CITY_LIGHT_STORAGE?raw:null,setItem(){throw new Error('Startup must not write storage')}},scene:new THREE.Scene(),visualKit:{atmosphere:{registerGlow(){}}},
 cube:()=>new THREE.Mesh(),C:{grass:material,walk:material,road:material},obstacles:[],groundSurfaces:[],characters:null,mobileGraphics:true,
 car:()=>new THREE.Group(),globalThis:{}};
 vm.createContext(context);return {context,text};
}
test('Airport initialization cannot read the clock before its declaration',()=>{
 const {context}=fixture();assert.throws(()=>vm.runInContext(airportLine+'\n'+clockLine,context),/before initialization/,'reproduce the pre-fix eager getter failure');
});
test('Shipped startup builds the real airport with the restored city clock',()=>{
 for(const raw of [null,'broken',JSON.stringify({hour:22.5,held:true,cycling:false}),JSON.stringify({hour:7,cycling:true})]){
  const {context,text}=fixture(raw);assert.doesNotThrow(()=>vm.runInContext(boot,context));
  const hour=vm.runInContext('cityTime.hour',context);assert.ok(Number.isFinite(hour));if(raw?.includes('22.5'))assert.equal(hour,22.5);
  assert.ok(context.globalThis.airportWorld?.board.mesh.isMesh,'airport reaches the end of synchronous construction');
  assert.ok(text.includes(departuresBoard(hour)[0].time),'first departures board uses the actual restored clock');
  vm.runInContext('cityTime.hour=9.5; airportWorld.board.draw(cityTime.hour)',context);assert.ok(text.includes(departuresBoard(9.5)[0].time));
 }
});
