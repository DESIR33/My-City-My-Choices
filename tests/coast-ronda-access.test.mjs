import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import vm from 'node:vm';
import * as THREE from 'three';
import {createCoastWorld} from '../assets/coast-world.js';
import {createRondaWorld} from '../assets/ronda-world.js';
import {COAST_CITY,RONDA,worldDrivable,coastGroundHeight} from '../assets/world-rules.js';
import {advanceVehicle,createVehicleState,vehicleFootprint,rectanglesOverlap} from '../assets/vehicle-physics.js';
import {planCityRoute,lineClear} from '../assets/city-navigation.js';

const labels=[];
globalThis.document={createElement:()=>({getContext:()=>new Proxy({fillText(text){labels.push(text)}},{get:(o,k)=>o[k]||(()=>{})})})};
const scene=new THREE.Scene(),obstacles=[],surfaces=[],traffic=[],vehicleRefs=[];
const material=()=>new THREE.MeshStandardMaterial(),C={road:material(),walk:material(),grass:material()};
const cube=(parent,x,y,z,w,h,d,m)=>{const mesh=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),m);mesh.position.set(x,y+h/2,z);parent.add(mesh);return mesh};
const coast=createCoastWorld({scene,obstacles,groundSurfaces:surfaces,traffic,buildings:[],seats:[],trafficControllers:[],C,cube,groundHeight:coastGroundHeight,
 visualKit:{windowMaterial:material,atmosphere:{registerGlow(){},addStreetLight(){}}},addCornerSignal(){},
 characters:{create:({x,z})=>{const actor=new THREE.Group();actor.position.set(x,0,z);return actor}},
 car:(x,z,color,heading,moving)=>{const mesh=new THREE.Group();mesh.position.set(x,0,z);mesh.rotation.y=heading;vehicleRefs.push({group:mesh});if(moving)traffic.push({mesh});else{const shape=vehicleFootprint(x,z,heading);obstacles.push({minX:Math.min(...shape.map(p=>p.x)),maxX:Math.max(...shape.map(p=>p.x)),minZ:Math.min(...shape.map(p=>p.z)),maxZ:Math.max(...shape.map(p=>p.z))});}return mesh;}});
const ronda=createRondaWorld({scene,obstacles,groundSurfaces:surfaces,visualKit:{}});
const polygon=o=>[{x:o.minX,z:o.minZ},{x:o.maxX,z:o.minZ},{x:o.maxX,z:o.maxZ},{x:o.minX,z:o.maxZ}];
// Equivalent static SAT collision test, with an AABB broad phase to make the full
// two-district travel sweep cheap. Moving cars are excluded from a clear-road test.
function clear(x,z,heading){const shape=vehicleFootprint(x,z,heading);if(!shape.every(p=>worldDrivable(p.x,p.z)))return false;
 const minX=Math.min(...shape.map(p=>p.x)),maxX=Math.max(...shape.map(p=>p.x)),minZ=Math.min(...shape.map(p=>p.z)),maxZ=Math.max(...shape.map(p=>p.z));
 return !obstacles.some(o=>o.maxX>minX&&o.minX<maxX&&o.maxZ>minZ&&o.minZ<maxZ&&rectanglesOverlap(shape,polygon(o)));}
// Every coastal avenue, both lanes, both directions. Earlier coverage drove only
// Ocean Drive and built the coast without its neighboring Ronda collision field.
for(const avenue of COAST_CITY.avenues)for(const dir of [-1,1]){
 const car=createVehicleState(avenue-dir*2.4,dir>0?1080:2060,dir>0?0:Math.PI);
 for(let n=0;n<2100&&(dir>0?car.z<2060:car.z>1080);n++)assert.equal(advanceVehicle(car,{forward:1},.04,clear).collided,false,'Clear coastal lane at '+car.x+','+car.z);
 assert.ok(dir>0?car.z>=2060:car.z<=1080,'Full coastal avenue remains driveable');
}
for(const dir of [-1,1]){
 const car=createVehicleState(dir<0?-235:-635,RONDA.link.z+dir*2,dir<0?-Math.PI/2:Math.PI/2);
 for(let n=0;n<1000&&(dir<0?car.x>-635:car.x<-235);n++)assert.equal(advanceVehicle(car,{forward:1},.04,clear).collided,false,'Coast-to-town link at '+car.x);
 assert.ok(dir<0?car.x<=-635:car.x>=-235,'Both directions reach the other district');
}
const html=await readFile(new URL('../index.html',import.meta.url),'utf8');
const code=html.slice(html.indexOf('function vehicleCanOccupy('),html.indexOf('function updateMove('));
const context={vehicleFootprint,worldDrivable,rectanglesOverlap,obstacles,traffic:[],vehicleRefs,driving:null,lastVehicleHit:null};vm.createContext(context);vm.runInContext(code,context);
for(const x of COAST_CITY.avenues)for(const z of COAST_CITY.streets)for(const heading of [0,Math.PI/2,Math.PI,3*Math.PI/2])assert.equal(context.vehicleCanOccupy(x,z,heading),true,'Shipped collision handler clears junction '+x+','+z);
const drive=planCityRoute({x:-242.4,z:1080},{x:-520,z:1444,parking:{x:-520,z:1400}},{mode:'drive'});
assert.ok(drive&&drive.points.every((p,i)=>!i||lineClear(drive.points[i-1],p,worldDrivable)));
assert.equal(coast.rondaSigns.length,5);assert.equal(labels.filter(t=>t.includes('RONDA')).length,5);
for(const sign of coast.rondaSigns){assert.equal(sign.userData.destination,'ronda');assert.ok(sign.position.y>=4);assert.ok(!worldDrivable(sign.position.x,sign.position.z),'Wayfinding posts stay off roads');}
assert.ok(labels.includes('RONDA  →')&&labels.includes('←  RONDA')&&labels.includes('RONDA · CLIFF TOWN'));
assert.match(html,/third cross street/);assert.ok(!html.includes('west avenue to the middle street'));
assert.ok(ronda.houses.length>1300&&scene.getObjectByName('Ronda'),'Ronda is constructed next to the coast');
console.log('Coast/Ronda access passed: six full avenue drives, both link directions, actual junction collision handler, complete route and five off-road signs. User blockage remains unclassified without its exact position.');
