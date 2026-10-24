import assert from 'node:assert/strict';
import * as THREE from 'three';
import {createPlannedCommunity} from '../assets/planned-community.js';
import {createLandmarkHouse} from '../assets/landmark-house.js';
import {COMMUNITY_HOMES,communityPoint} from '../assets/world-rules.js';
import {houseObstacleBlocks,MODEL_HOME} from '../assets/house-rules.js';
import {createWalkValidator} from '../assets/city-navigation.js';
import {cameraArchitectureBoxes} from '../assets/camera-geometry.js';

const q=new Proxy({},{get:()=>()=>{}});globalThis.document={createElement:()=>({width:0,height:0,getContext:()=>q})};
const material=new THREE.MeshStandardMaterial({color:0x889385}),m=()=>material;
const visualKit={concrete:material,grass:material,asphalt:material,wood:m,siding:m,brick:m,roofing:m,masonry:m,windowMaterial:m,treeModel:()=>new THREE.Group(),atmosphere:{registerGlow(){},addStreetLight(){}}};
const scene=new THREE.Scene(),obstacles=[],groundSurfaces=[];
const community=createPlannedCommunity({scene,visualKit,obstacles,groundSurfaces,buildings:[]});
const landmark=createLandmarkHouse({scene,visualKit,obstacles,groundSurfaces});
const blocked=(x,z)=>obstacles.some(o=>o.houseId||o.vehicleOnly?houseObstacleBlocks(o,x,z,.3):x>o.minX-.5&&x<o.maxX+.5&&z>o.minZ-.5&&z<o.maxZ+.5);
const valid=createWalkValidator(obstacles);
assert.equal(community.doors.length,78,'Every neighboring front/patio/garage has a real working leaf');
assert.equal(community.addressPlaques.length,27);assert.equal(new Set(community.addressPlaques.map(p=>p.address)).size,27);
for(const plaque of community.addressPlaques){const home=COMMUNITY_HOMES.find(h=>h.id===plaque.homeId);assert.equal(plaque.address,home.address+' '+home.street);assert.equal(plaque.heading,home.heading);assert.ok(Math.abs(plaque.position.z-home.z)>home.d/2,'Numbers mount outside the front wall');assert.ok(plaque.face.material.emissiveMap,'Numbers remain legible after dark');}
for(const door of community.doors){
  const exterior=door.type==='rear'?-1:1,p={...communityPoint(door.home,door.x,door.z+exterior*2.7),y:.3};
  assert.equal(blocked(door.center.x,door.center.z),true,'Closed leaf blocks '+door.id);
  assert.equal(valid(door.center.x,door.center.z),false,'Routes respect the closed door');
  const near=community.nearestDoor(p);assert.equal(near?.id,door.id,'Door prompt appears from the actual approach: '+door.id);assert.match(near.actionLabel,/^Open/);assert.ok(near.title.includes(door.home.address+' '+door.home.street));
  assert.equal(community.actDoor(door.id,{x:0,z:0,y:.3}).ok,false,'Remote interactions are refused');
  assert.equal(community.actDoor(door.id,p).ok,true);for(let i=0;i<120;i++)community.update(1/60,p);
  assert.equal(blocked(door.center.x,door.center.z),false,'Opening removes the actual collision: '+door.id);assert.equal(valid(door.center.x,door.center.z),true,'Navigation follows the moved door');
  if(door.type==='garage'){assert.ok(door.collider.maxY-door.collider.minY<.15,'Open garage panels tuck horizontally below the ceiling');assert.ok(door.collider.minY>2.7);}
  for(let step=-.7;step<=.7;step+=.1){const crossing=communityPoint(door.home,door.x,door.z+step);assert.equal(blocked(crossing.x,crossing.z),false,'Walk through both sides of '+door.id);}
  assert.match(community.nearestDoor(p).actionLabel,/^Close/);assert.equal(community.actDoor(door.id,{...door.center,y:.3}).ok,false,'Closing never sweeps through the player');
  assert.equal(community.actDoor(door.id,p).ok,true);for(let i=0;i<120;i++)community.update(1/60,p);assert.equal(blocked(door.center.x,door.center.z),true);
}
assert.equal(landmark.nearest({...MODEL_HOME.entry,y:.3})?.actionLabel,'Open door');assert.equal(landmark.act('front',MODEL_HOME.entry).ok,true);landmark.update(1,MODEL_HOME.entry);assert.equal(landmark.nearest({...MODEL_HOME.entry,y:.3})?.actionLabel,'Close door');
for(const home of community.homes.filter(h=>h.id!==MODEL_HOME.id)){const room=community.interior({x:home.x,z:home.z,y:.3});assert.ok(room&&room.ceiling>=3.18,'A real ground-floor shell supports entry and indoor camera clipping');}
const boxes=cameraArchitectureBoxes(scene);assert.ok(!boxes.some(b=>b.minX<COMMUNITY_HOMES[1].x&&b.maxX>COMMUNITY_HOMES[1].x&&b.minZ<COMMUNITY_HOMES[1].z&&b.maxZ>COMMUNITY_HOMES[1].z&&b.minY<1&&b.maxY>2),'Hollow homes do not retain a solid camera-blocking body');
console.log('Residential entry passed: 78 animated community doors plus the landmark garage, both house orientations, real collision gaps, safe closing, live navigation, indoor shells, and 27 unique illuminated front-wall plaques.');
