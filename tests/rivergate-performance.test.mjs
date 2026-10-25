import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFile} from 'node:fs/promises';
import * as THREE from 'three';
import {createMetroWorld} from '../assets/metro-world.js';
import {STATIONS,PLATFORM_Y,stationFrame,stationStairs,stairFoot} from '../assets/metro-line.js';
import {houseObstacleBlocks} from '../assets/house-rules.js';
import {vehicleFootprint,vehicleBlocksPedestrian} from '../assets/vehicle-physics.js';
import {worldWalkable} from '../assets/world-rules.js';
const html=await readFile(new URL('../index.html',import.meta.url),'utf8');
const canvas=new Proxy({},{get:()=>()=>{}});globalThis.document={createElement:()=>({getContext:()=>canvas})};
const scene=new THREE.Scene(),obstacles=[],player={position:new THREE.Vector3()};const metro=createMetroWorld({scene,obstacles,player});
const c={globalThis:{metroWorld:metro},player,obstacles,worldWalkable,vehicleBlocksPedestrian,houseObstacleBlocks,vehicleFootprint};vm.createContext(c);
const parked=html.split('\n').find(s=>s.startsWith('function parkedObstacle(')),start=html.indexOf('function obstacleBlocksPedestrian('),end=html.indexOf('function showReturnPause(',start);
vm.runInContext(parked+'\n'+html.slice(start,end),c);
const river=STATIONS[0],F=stationFrame(river),below=F.toWorld(0,6.2),car=new THREE.Group();car.position.set(below.x,0,below.z);c.car=car;const collider=vm.runInContext('parkedObstacle(car)',c);obstacles.push(collider);
player.position.set(below.x,0,below.z);assert.equal(c.obstacleBlocksPedestrian(collider,below.x,below.z),true,'street-level cars stay solid');
player.position.y=PLATFORM_Y;assert.equal(c.obstacleBlocksPedestrian(collider,below.x,below.z),false,'a car below cannot block the platform');
// Walk the actual full platform in both directions over the parked car below.
for(const side of [-1,1])for(const direction of [-1,1]){
 for(let u=direction>0?-river.length/2+1:river.length/2-1;Math.abs(u)<river.length/2-.8;u+=direction*.2){const p=F.toWorld(u,side*6.2),next=F.toWorld(u+direction*.1,side*6.2);player.position.set(p.x,PLATFORM_Y,p.z);assert.equal(c.blocked(next.x,next.z),false,'clear Rivergate platform at '+u);}
}
for(const t of metro.streetTotems){const st=STATIONS.find(s=>s.id===t.station),frame=stationFrame(st),q=frame.toLocal(t.x,t.z);assert.ok(stationStairs(st).every(s=>q.v<s[2]-.5||q.v>s[3]+.5),'street totem clears every stair approach '+st.id);const foot=stairFoot(st);assert.ok(Math.hypot(foot.x-t.x,foot.z-t.z)>2,'save recovery/stair foot stays clear '+st.id);}
// The shipped desktop policy is bounded and asynchronous too.
const config=html.split('\n').find(s=>s.startsWith('const characters=createCharacterSystem('));
for(const mobileGraphics of [true,false]){const ctx={mobileGraphics,createCharacterSystem:(_,o)=>o,scene:{},groundHeight(){},CROWD_LIMITS:{mobile:{},desktop:{}},console,notify(){}};vm.createContext(ctx);vm.runInContext(config+';this.options=characters;',ctx);assert.equal(ctx.options.detailConcurrency,1);assert.equal(ctx.options.detailDrawLimit,mobileGraphics?8:16);assert.ok(Number.isFinite(ctx.options.drawRadius)&&Number.isFinite(ctx.options.residencyRadius));}
let loads=0;const gate=html.slice(html.indexOf('let desktopFleetStarted=false;'),html.indexOf('const mobileFleet='));const ctx={mobileGraphics:false,loadDetailedCars:()=>{loads++;return Promise.resolve();},loadPremiumCars(){},console};vm.createContext(ctx);vm.runInContext(gate,ctx);assert.equal(loads,0);ctx.updateDesktopFleet(0);assert.equal(loads,0);ctx.updateDesktopFleet(.04);ctx.updateDesktopFleet(.04);assert.equal(loads,1,'start desktop vehicle detail only once during active play');
console.log('Rivergate passed: full platform walking above real parked-car colliders, street collision retained, off-stair totems, clear recovery feet, bounded desktop crowd and active-play vehicle scheduling.');
