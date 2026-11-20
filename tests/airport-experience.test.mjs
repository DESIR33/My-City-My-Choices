import assert from 'node:assert/strict';
import * as THREE from 'three';
import vm from 'node:vm';
import {readFile} from 'node:fs/promises';
import {createAirportWorld} from '../assets/airport-world.js';
import {AIRPORT,worldWalkable,worldDrivable} from '../assets/world-rules.js';
import {planCityRoute,createWalkValidator,lineClear} from '../assets/city-navigation.js';
import {vehicleFootprint,rectanglesOverlap} from '../assets/vehicle-physics.js';
const canvas=new Proxy({},{get:()=>()=>{}});globalThis.document={createElement:()=>({getContext:()=>canvas})};
const scene=new THREE.Scene(),obstacles=[],ground=[],parked=[],urls=[],m=new THREE.MeshStandardMaterial(),C={road:m,walk:m,grass:m};
const cube=(p,x,y,z,w,h,d,mat)=>{const mesh=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),mat);mesh.position.set(x,y+h/2,z);p.add(mesh);return mesh;};
const world=createAirportWorld({scene,C,cube,visualKit:{atmosphere:{registerGlow(){}}},obstacles,groundSurfaces:ground,parkedCar:(x,z,heading)=>parked.push({x,z,heading}),loader:{loadAsync:async url=>{urls.push(url);return {scene:new THREE.Group()};}}});
assert.ok(world.arrival.spaces.length>=700,'large parking has at least 700 marked bays');assert.equal(world.arrival.lots.length,2);assert.equal(parked.length,18,'no increase to rich parked-car budget');assert.ok(parked.some(c=>c.x>1280));
const valid=createWalkValidator(obstacles);
function walkRoute(a,b){const route=planCityRoute(a,b,{mode:'walk',walkValid:valid});assert.ok(route&&route.points.every((p,i)=>!i||lineClear(route.points[i-1],p,valid)),'walkable route '+JSON.stringify(a)+' → '+JSON.stringify(b));}
assert.ok(planCityRoute({x:0,z:-120},{x:1390,z:-1920,parking:{x:1390,z:-1920}},{mode:'drive'}),'connected road from Maple Street to P2');
for(let x=245;x<1550;x+=2)for(const side of [-1,1]){const p={x,z:AIRPORT.road.z+side*3.4},body=vehicleFootprint(p.x,p.z,Math.PI/2);assert.ok(worldDrivable(p.x,p.z));assert.ok(!obstacles.some(o=>rectanglesOverlap(body,[{x:o.minX,z:o.minZ},{x:o.maxX,z:o.minZ},{x:o.maxX,z:o.maxZ},{x:o.minX,z:o.maxZ}])), 'access road is clear at '+x);}
for(const p of world.arrival.spaces)assert.ok(worldDrivable(p.x,p.z),'every marked bay is usable ground');
walkRoute({x:1390,z:-1920},{x:1150,z:-1979});walkRoute({x:1150,z:-1979},{x:1139,z:-2003});walkRoute({x:1139,z:-2003},{x:1150,z:-2064});walkRoute({x:1150,z:-2064},{x:1115,z:-2142});
for(let z=-1979;z>=-1992;z-=.1){assert.ok(worldWalkable(1150,z));assert.ok(valid(1150,z),'entrance has no hidden wall');world.update(.04,{position:{x:1150,y:0,z}});}
assert.equal(world.arrival.opening,1);assert.ok(world.interior.visible&&world.exterior.visible,'facade stays coherent while inside');
scene.updateMatrixWorld(true);const ray=new THREE.Raycaster(new THREE.Vector3(1150,1.6,-1979),new THREE.Vector3(0,0,-1),0,14);assert.equal(ray.intersectObject(world.arrival.terminal,true).length,0,'no rendered base/glass across the open entrance');
await world.loadModels();assert.ok(!urls.some(u=>u.includes('terminal')),'opaque legacy exterior cannot return after streaming');assert.equal(world.models.terminal,world.arrival.terminal);
const p=(x,z,y=0)=>({x,y,z});assert.equal(world.act('checkin',p(0,0),'NA 214'),false);assert.equal(world.act('security',p(1150,-2064)),false);assert.equal(world.act('checkin',p(1139,-2003),'unknown'),false);
assert.ok(world.act('checkin',p(1139,-2003),'NA 214'));assert.equal(world.visit.pass.gate,'A2');assert.equal(world.act('A2',p(1115,-2142)),false,'security cannot be skipped');assert.equal(world.nearestAction(p(1139,-2003,8)),null,'no upstairs interaction');
assert.ok(world.act('security',p(1150,-2064)));assert.equal(world.act('A1',p(1058,-2142)),false,'wrong gate rejected');assert.ok(world.act('A2',p(1115,-2142)));assert.equal(world.visit.complete,true);
console.log('Airport experience passed:',world.arrival.spaces.length,'marked bays, connected approach road, parking-to-check-in-to-gate routes, visible door clearance after streaming and proximity/order-safe visitor journey.');

// Exercise the shipped UI handlers with the real world action validation.
const html=await readFile(new URL('../index.html',import.meta.url),'utf8'),actor={position:new THREE.Vector3(1150,0,-1979)};let panel='',destination=null;
const ui={airportWorld:world,player:actor,driving:null,riding:null,show:h=>panel=h,setCityDestination:id=>destination=id,notify(){},window:null};ui.window=ui;vm.createContext(ui);
vm.runInContext(html.slice(html.indexOf('window.openAirportService=function'),html.indexOf('window.openMetroPlatform=function')),ui);
world.visit.pass=null;world.visit.security=false;world.visit.complete=false;
ui.openAirportService();assert.ok(panel.includes('doors open automatically'));actor.position.set(1139,0,-2003);ui.openAirportService();assert.ok(panel.includes("airportCheckIn('NA 214')"));ui.airportCheckIn('NA 214');assert.ok(panel.includes('Practice pass ready'));ui.airportPassSecurity();assert.equal(world.visit.security,false,'UI cannot act remotely');
actor.position.set(1150,0,-2064);ui.airportPassSecurity();assert.equal(destination,'airportGateA2');actor.position.set(1115,0,-2142);ui.airportFinishVisit();assert.ok(panel.includes('completed your airport journey'));
console.log('Airport UI passed: entrance guidance, flight choice, remote refusal, security routing and gate completion through actual handlers.');
