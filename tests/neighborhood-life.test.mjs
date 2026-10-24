import assert from 'node:assert/strict';
import * as THREE from 'three';
import vm from 'node:vm';
import {readFile} from 'node:fs/promises';
import {createLandmarkHouse} from '../assets/landmark-house.js';
import {vehicleFootprint,rectanglesOverlap} from '../assets/vehicle-physics.js';
import {createPlannedCommunity} from '../assets/planned-community.js';
import {createNeighborhoodLife} from '../assets/neighborhood-life.js';
import {COMMUNITY_HOMES,COMMUNITY_PARKED_CARS,communityPoint,worldDrivable} from '../assets/world-rules.js';
import {houseObstacleBlocks} from '../assets/house-rules.js';
globalThis.document={createElement:()=>({getContext:()=>new Proxy({},{get:()=>()=>{}})})};
const m=c=>new THREE.MeshStandardMaterial({color:c}),scene=new THREE.Scene(),obstacles=[],groundSurfaces=[];
const visualKit={concrete:m(0x999999),grass:m(0x335533),asphalt:m(0x222222),wood:m,siding:m,brick:m,roofing:m,windowMaterial:m,treeModel:()=>new THREE.Group(),atmosphere:{registerGlow(){},addStreetLight(){}}};
const community=createPlannedCommunity({scene,obstacles,groundSurfaces,buildings:[],visualKit});
const actors=[],characters={create:p=>{const actor=new THREE.Group();actor.position.set(p.x,.3,p.z);scene.add(actor);actors.push(actor);return actor},setActivity(actor,type,held){actor.userData.activity={type,held}}};
const life=createNeighborhoodLife({scene,characters,community,obstacles});
assert.equal(life.bells.length,27);assert.equal(new Set(life.bells.map(b=>b.id)).size,27);assert.ok(life.residents.length>=12&&life.residents.length<=14);assert.ok(life.residents.some(r=>r.ends)&&life.residents.some(r=>!r.ends));assert.ok(new Set(life.residents.map(r=>r.task)).size>=4);
for(const b of life.bells){const sign=b.home.heading===0?1:-1,p={x:b.x,y:.3,z:b.z+sign*.7};assert.equal(life.nearestBell(p),b);const result=life.ring(b.id,p);assert.equal(result.ok,true);assert.equal(life.ring(b.id,p).ok,false,'Doorbell cooldown');assert.equal(life.ring(b.id,{x:0,y:.3,z:0}).ok,false,'Remote ringing refused');}
for(let i=0;i<600;i++)life.update(1/60,{x:-240,z:-90});assert.ok(actors.every(a=>[a.position.x,a.position.y,a.position.z].every(Number.isFinite)));
const h146=COMMUNITY_HOMES.find(h=>h.address===146),p={...communityPoint(h146,5.7,-4.2),y:.3},k=life.kitchen;
assert.ok(k.nearest(p));assert.equal(k.takeFood('apple',p).ok,false);assert.equal(k.act('fridge',p).ok,true);assert.equal(k.takeFood('apple',p).ok,true);const save=life.serialize();life.restore(JSON.parse(JSON.stringify(save)));assert.equal(k.heldFood,'apple');assert.equal(k.fridgeContents().items[0].remaining,2);assert.equal(k.eatFood().ok,true);assert.equal(k.eatFood().ok,false);life.restore(null);assert.equal(k.fridgeContents().items[0].remaining,3);
const h144=community.furnishedInteriors.find(h=>h.address==='144 Willow Way');assert.ok(h144);for(const id of ['sofa','guest-bed','refrigerator','dining-table','oven-counter'])assert.ok(h144.fixtures.some(f=>f.id===id));
for(const h of COMMUNITY_HOMES.filter(h=>h.id!=='maple-grove-1')){
 const S=community.stairsOf(h);for(let i=0;i<=S.steps;i++){const p=communityPoint(h,(S.x0+S.x1)/2,S.z0+i*(S.z1-S.z0)/S.steps),y=community.floorAt(p.x,p.z,.3+i*3.15/S.steps);assert.ok(Math.abs(y-(.3+i*3.15/S.steps))<1e-6,'Continuous stair height '+h.address);assert.ok(!obstacles.some(o=>(o.homeId===h.id||o.houseId===h.id)&&houseObstacleBlocks(o,p.x,p.z,y)),'Clear stair centre '+h.address+' step '+i);}
 const p=communityPoint(h,2,-2);assert.equal(community.floorAt(p.x,p.z,3.45),3.45);assert.equal(community.interior({...p,y:3.45}).ceiling,6.28);
}
console.log('Neighborhood life passed: 27 guarded bells, bounded indoor/outdoor residents, independently saved 146 kitchen, furnished 144 and all 26 additional stairs/upper floors.');
const landmark=createLandmarkHouse({scene,obstacles,groundSurfaces,visualKit:{}});landmark.restore({...landmark.state,garageDoor:true});
for(const door of community.doors)if(door.type==='garage')door.open=true;for(let i=0;i<180;i++)community.update(1/60);
for(const car of COMMUNITY_PARKED_CARS){const shape=vehicleFootprint(car.x,car.z,car.heading);obstacles.push({minX:Math.min(...shape.map(p=>p.x)),maxX:Math.max(...shape.map(p=>p.x)),minZ:Math.min(...shape.map(p=>p.z)),maxZ:Math.max(...shape.map(p=>p.z)),vehiclePose:car});}
const html=await readFile(new URL('../index.html',import.meta.url),'utf8'),code=html.slice(html.indexOf('function vehicleCanOccupy('),html.indexOf('function updateMove('));
const c={globalThis:{landmarkHome:landmark,residentialCommunity:community},vehicleFootprint,rectanglesOverlap,worldDrivable,groundHeight:(x,z)=>landmark.floorAt(x,z,.3)??community.floorAt(x,z,.3)??.08,obstacles,traffic:[],vehicleRefs:[],lastVehicleHit:null};vm.createContext(c);vm.runInContext(code,c);
for(const h of COMMUNITY_HOMES){const x=h.id==='maple-grove-1'?-2.2:-h.w*.23-1.55;for(let z=h.d/2+8;z>=h.d/2-2.6;z-=.2){const p=communityPoint(h,x,z);assert.equal(c.vehicleCanOccupy(p.x,p.z,h.heading),true,'Full shared-world garage route '+h.address+' at '+z+' '+JSON.stringify(c.lastVehicleHit));}}
console.log('All 27 garage approaches pass the shipped full-car collision handler with resident driveway cars and both world builders present.');
