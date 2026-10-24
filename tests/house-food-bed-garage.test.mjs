import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import vm from 'node:vm';
import * as THREE from 'three';
import {createLandmarkHouse} from '../assets/landmark-house.js';
import {MODEL_HOME as H,HOUSE_FOOD,freshHouse,restoreHouse,houseObstacleBlocks} from '../assets/house-rules.js';
import {createVerticalState,requestJump,advanceVertical,advanceJumpPose} from '../assets/character-grounding.js';
import {vehicleFootprint,rectanglesOverlap,advanceVehicle,createVehicleState} from '../assets/vehicle-physics.js';
import {worldDrivable} from '../assets/world-rules.js';
globalThis.document={createElement:()=>({getContext:()=>new Proxy({},{get:()=>()=>{}})})};
const scene=new THREE.Scene(),obstacles=[],home=createLandmarkHouse({scene,obstacles,groundSurfaces:[],visualKit:{}}),fridge=home.actions.find(a=>a.id==='fridge');
assert.equal(home.takeFood('apple',fridge).ok,false,'Closed fridge cannot dispense food');home.act('fridge',fridge);
assert.equal(home.takeFood('unknown',fridge).ok,false);assert.equal(home.takeFood('apple',{x:0,z:0,y:.3}).ok,false);
for(const f of HOUSE_FOOD){
 const count=home.state.food[f.id];assert.equal(home.takeFood(f.id,fridge).ok,true);assert.equal(home.state.food[f.id],count-1);
 assert.equal(home.takeFood(f.id,fridge).ok,false,'One held item at a time');
 const saved=home.serialize(fridge);home.restore(JSON.parse(JSON.stringify(saved)));assert.equal(home.heldFood,f.id);assert.equal(home.state.food[f.id],count-1);
 assert.equal(home.eatFood().food.id,f.id);assert.equal(home.eatFood().ok,false,'Eating cannot repeat');
 assert.equal(home.takeFood(f.id,fridge).ok,true);assert.equal(home.returnFood(fridge),true);assert.equal(home.state.food[f.id],count-1);
}
while(home.state.food.apple){home.takeFood('apple',fridge);home.eatFood();}assert.equal(home.takeFood('apple',fridge).ok,false,'Empty shelf stays empty');
assert.deepEqual(restoreHouse({propertyId:H.id}).food,freshHouse().food,'Old saves receive bounded starter food');
assert.equal(restoreHouse({propertyId:H.id,food:{apple:-100},heldFood:'invalid'}).food.apple,0);assert.equal(restoreHouse({propertyId:H.id,heldFood:'invalid'}).heldFood,null);
const visibleFood=()=>{const ids=[];home.root.traverse(m=>{if(m.name.endsWith('in refrigerator')&&m.visible)ids.push(m.name)});return ids.length};
assert.equal(visibleFood(),2);home.act('fridge',fridge);assert.equal(visibleFood(),0,'Closed fridge hides all stock');

for(const bed of home.beds){
 const y=H.upper,x=H.x+bed.x,z=H.z+bed.z;
 assert.equal(home.floorAt(x,z,y),y,'No teleport onto mattress from floor');assert.equal(home.blocked(x,z,y),true);
 const state=createVerticalState(x+1.6,z,y);requestJump(state);let landed=false;
 for(let n=0;n<150;n++){
  const nx=n<8?x+1.6:x;
  if(nx===x&&state.y<bed.top-.08&&n<20)continue;
  advanceVertical(state,{x:nx,z,floor:home.floorAt(nx,z,state.y),dt:1/60});
  if(n>20&&state.grounded&&state.y===bed.top){landed=true;break;}
 }
 assert.equal(landed,true,'Jump lands on '+bed.id);assert.equal(home.blocked(x,z,state.y),false,'Mattress no longer blocks above its top');
 for(let n=0;n<90;n++)advanceVertical(state,{x:x+1.8,z,floor:home.floorAt(x+1.8,z,state.y),dt:1/60});assert.equal(state.y,H.upper,'Walking off bed lands on room floor');
}
const pose={};advanceJumpPose(pose,{grounded:false,velocity:6},.04);const takeoff=pose.calf;advanceJumpPose(pose,{grounded:false,velocity:0},.1);assert.ok(pose.calf>takeoff,'Knees tuck toward apex');advanceJumpPose(pose,{grounded:false,velocity:-5},.04);advanceJumpPose(pose,{grounded:true,velocity:0},.04);assert.ok(pose.crouch>0,'Landings compress');for(let n=0;n<120;n++)advanceJumpPose(pose,{grounded:true,velocity:0},1/60);assert.ok(Math.abs(pose.calf)<.0001&&pose.crouch<.0001,'Offsets ease back to normal');

const html=await readFile(new URL('../index.html',import.meta.url),'utf8'),code=html.slice(html.indexOf('function vehicleCanOccupy('),html.indexOf('function updateMove('));
const context={globalThis:{landmarkHome:home},vehicleFootprint,rectanglesOverlap,worldDrivable,groundHeight:(x,z)=>home.floorAt(x,z,.3)??.08,obstacles,traffic:[],vehicleRefs:[],lastVehicleHit:null};vm.createContext(context);vm.runInContext(code,context);
const opening=home.actions.find(a=>a.id==='garage-door'),car=createVehicleState(H.x-3.4,H.z+10,Math.PI);
assert.equal(context.vehicleCanOccupy(car.x,H.z+5.93,Math.PI),false,'Closed garage leaf blocks full car');home.act('garage-door',opening);for(let n=0;n<160;n++)home.update(1/60,opening);
for(let n=0;n<400&&car.z>H.z+3.5;n++)assert.equal(advanceVehicle(car,{forward:.3},.016,context.vehicleCanOccupy).collided,false,'Car clearance '+JSON.stringify({x:car.x,z:car.z,hit:context.lastVehicleHit,colliders:obstacles.filter(o=>o.minY<2.5&&o.maxY>.4&&o.minX<car.x+1.1&&o.maxX>car.x-1.1&&o.minZ<car.z+2.4&&o.maxZ>car.z-2.4).map(o=>({id:o.fixtureId,minY:o.minY,minZ:o.minZ,maxZ:o.maxZ}))}));assert.ok(car.z<=H.z+3.5);
assert.equal(context.vehicleCanOccupy(car.x,car.z,car.heading),true);assert.ok(!home.blocked(car.x+1.8,car.z,.3),'A parked driver has a clear exit');
home.act('garage-door',opening);for(let n=0;n<160;n++)home.update(1/60,opening);assert.equal(context.vehicleCanOccupy(car.x,car.z,car.heading),true,'Closed door does not trap or overlap correctly parked car');
home.restore({...home.state,garageDoor:true});const intrusion={minX:H.x-4.4,maxX:H.x-2.4,minZ:H.z+4,maxZ:H.z+7,vehiclePose:{}};obstacles.push(intrusion);home.act('garage-door',opening);home.update(.1,opening);assert.equal(home.state.garageDoor,true,'Door reopens over an obstructing vehicle');obstacles.pop();
assert.equal(houseObstacleBlocks(home.colliders.find(c=>c.fixtureId==='bed1'),H.x-3.5,H.z+4.1,H.upper+.63),false);
console.log('House food/bed/garage passed: guarded stock and saves, landing/step-off, phase-aware jump pose, actual full-car garage entry/exit clearance and obstruction reopening.');
