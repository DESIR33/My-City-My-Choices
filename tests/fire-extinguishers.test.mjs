import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import * as THREE from 'three';
import {FIRE_EXTINGUISHER_URL,FIRE_EXTINGUISHER_SPOTS,FIRE_SAFETY_LESSON,EXTINGUISHER_DEPTH,EXTINGUISHER_HEIGHT,MOUNT_HEIGHT,extinguisherMount,createFireExtinguishers} from '../assets/fire-extinguishers.js';
import {createPlannedCommunity} from '../assets/planned-community.js';
import {COMMUNITY_HOMES} from '../assets/world-rules.js';
import {MODEL_HOME} from '../assets/house-rules.js';

const file=p=>new URL('../'+p,import.meta.url);
// The asset: small, self-contained, real materials for each part.
const glb=await readFile(file(FIRE_EXTINGUISHER_URL.slice(2)));assert.ok(glb.length<250e3,'extinguisher GLB under 250 KB');
assert.equal(glb.readUInt32LE(0),0x46546c67,'binary glTF');const json=JSON.parse(glb.subarray(20,20+glb.readUInt32LE(12)).toString('utf8'));
assert.deepEqual(json.materials.map(m=>m.name).sort(),['bracket','chrome','gauge','paint','rubber','strap','tag']);
assert.ok(!json.images&&!json.textures,'no textures to stream');
const tris=json.meshes[0].primitives.reduce((n,p)=>n+json.accessors[p.indices].count/3,0);assert.ok(tris>3000&&tris<7000,'about 6k triangles: '+tris);
const paint=json.materials.find(m=>m.name==='paint').pbrMetallicRoughness.baseColorFactor;assert.ok(paint[0]>.3&&paint[1]<.05&&paint[2]<.05,'signal red body');

// Placement: real rooms, wall-mounted at a safe, reachable height, facing into the room.
const ids=FIRE_EXTINGUISHER_SPOTS.map(s=>s.id);assert.equal(new Set(ids).size,ids.length);assert.equal(ids.length,11);
for(const id of ['house-101-kitchen','house-101-utility','house-139-kitchen','house-139-garage','maple-cafe','maple-bakery','thread-and-sole','fire-station','flamingo-lobby','flamingo-lounge','flamingo-suites'])assert.ok(ids.includes(id),id);
assert.ok(MOUNT_HEIGHT>=.1&&MOUNT_HEIGHT+EXTINGUISHER_HEIGHT<=1.53,'bottom at least 10 cm up, top no higher than 1.53 m');
const inside={'house-101':p=>Math.abs(p.x-MODEL_HOME.x)<6.59&&Math.abs(p.z-MODEL_HOME.z)<5.79,'maple-cafe':p=>p.x>-40.7&&p.x<-19.29&&p.z>-40.78&&p.z<-27,'maple-bakery':p=>p.x>-48.7&&p.x<-35.29&&p.z>-99.7&&p.z<-80,'thread-and-sole':p=>p.x>35.3&&p.x<48.7&&p.z>20.29&&p.z<40};
for(const spot of FIRE_EXTINGUISHER_SPOTS){
  assert.equal(Math.hypot(spot.nx,spot.nz),1,spot.id+' has a unit wall normal');const m=extinguisherMount(spot);
  assert.ok(Math.abs(m.x-spot.x-spot.nx*EXTINGUISHER_DEPTH)<1e-9&&Math.abs(m.z-spot.z-spot.nz*EXTINGUISHER_DEPTH)<1e-9,'bracket flush on the wall');
  const front=new THREE.Vector3(0,0,1).applyAxisAngle(new THREE.Vector3(0,1,0),m.yaw);assert.ok(Math.abs(front.x-spot.nx)<1e-9&&Math.abs(front.z-spot.nz)<1e-9,spot.id+' faces into the room');
  const key=Object.keys(inside).find(k=>spot.id.startsWith(k));if(key){const p={x:spot.x+spot.nx*.3,z:spot.z+spot.nz*.3};assert.ok(inside[key](p),spot.id+' is inside its building');}
}
// Furnished 139: mounted on its own walls, clear of every fixture and reachable.
globalThis.document={createElement:()=>({width:0,height:0,getContext:()=>new Proxy({},{get:()=>()=>{}})})};
const mat=new THREE.MeshStandardMaterial(),m=()=>mat,visualKit={concrete:mat,grass:mat,asphalt:mat,wood:m,siding:m,brick:m,roofing:m,windowMaterial:m,treeModel:()=>new THREE.Group(),atmosphere:{registerGlow(){},addStreetLight(){}}};
const obstacles=[];createPlannedCommunity({scene:new THREE.Scene(),visualKit,obstacles,groundSurfaces:[],buildings:[]});
const home=COMMUNITY_HOMES.find(h=>h.id==='maple-grove-20');
for(const spot of FIRE_EXTINGUISHER_SPOTS.filter(s=>s.id.startsWith('house-139'))){
  const behind={x:spot.x-spot.nx*.05,z:spot.z-spot.nz*.05},overlaps=(o,p,r=0)=>p.x>o.minX-r&&p.x<o.maxX+r&&p.z>o.minZ-r&&p.z<o.maxZ+r;
  assert.ok(obstacles.some(o=>o.homeId===home.id&&o.kind==='community-wall'&&overlaps(o,behind)),spot.id+' hangs on a real wall');
  const body={x:spot.x+spot.nx*.1,z:spot.z+spot.nz*.1};assert.ok(!obstacles.some(o=>o.fixtureId&&overlaps(o,body,.2)),spot.id+' is clear of furniture');
  const stand={x:spot.x+spot.nx*.9,z:spot.z+spot.nz*.9};assert.ok(!obstacles.some(o=>o.homeId===home.id&&!o.vehicleOnly&&overlaps(o,stand)),spot.id+' can be walked up to');
}

// Runtime: shared clones, floor-aware drawing and the fire-safety prompt.
const scene=new THREE.Scene(),system=createFireExtinguishers({scene});assert.equal(system.count,11);
const source=new THREE.Group();source.add(new THREE.Mesh(new THREE.BoxGeometry(.2,.5,.2),mat));
system.update({x:0,y:0,z:0});assert.ok(system.units.every(u=>!u.group.visible),'hidden until the model arrives');
system.install(source);assert.ok(system.units.every(u=>u.group.children[0].children[0].geometry===source.children[0].geometry));
const lobby=FIRE_EXTINGUISHER_SPOTS.find(s=>s.id==='flamingo-lobby'),lounge=FIRE_EXTINGUISHER_SPOTS.find(s=>s.id==='flamingo-lounge');
system.update({x:lobby.x-1.5,y:lobby.floor,z:lobby.z-1.5});
const shown=system.units.filter(u=>u.group.visible).map(u=>u.spot.id);assert.ok(shown.includes('flamingo-lobby')&&!shown.includes('flamingo-lounge'),'other hotel floors hide: '+shown);
assert.equal(system.nearest({x:lobby.x-.8,y:lobby.floor,z:lobby.z-.9}).id,'flamingo-lobby');assert.equal(system.nearest({x:lounge.x-.8,y:lounge.floor,z:lounge.z-.9}).id,'flamingo-lounge');
assert.equal(system.nearest({x:lobby.x-5,y:lobby.floor,z:lobby.z-5}),null);
assert.match(FIRE_SAFETY_LESSON.kids,/get out/i);assert.match(FIRE_SAFETY_LESSON.kids,/911/);assert.match(FIRE_SAFETY_LESSON.adults,/Pull.*Aim.*Squeeze.*Sweep/);

// Game wiring.
const index=await readFile(file('index.html'),'utf8');
assert.match(index,/createFireExtinguishers\(\{scene\}\);globalThis\.fireExtinguishers=fireExtinguishers;new GLTFLoader\(\)\.loadAsync\(FIRE_EXTINGUISHER_URL\)/);assert.match(index,/globalThis\.fireExtinguishers\?\.update\(player\.position\)/);
assert.match(index,/globalThis\.fireExtinguishers\?\.nearest\(player\.position\)/);assert.match(index,/near\.kind==="extinguisher"\)\{show\(/);
console.log('Fire extinguishers passed: 11 wall mounts, safe height, real walls, clear of furniture, floor-aware drawing and the fire-safety lesson.');
