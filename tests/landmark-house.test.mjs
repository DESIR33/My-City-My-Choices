import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import * as THREE from 'three';
import {createLandmarkHouse} from '../assets/landmark-house.js';
import {MODEL_HOME as H,freshHouse,restoreHouse,houseFloorAt,houseInside,houseLocal} from '../assets/house-rules.js';
import {createVerticalState,advanceVertical} from '../assets/character-grounding.js';
import {cameraArchitectureBoxes} from '../assets/camera-geometry.js';
import {localWalkPath,lineClear,createWalkValidator} from '../assets/city-navigation.js';
import {parseSaveFile,exportSave} from '../assets/save-backups.js';
const q=new Proxy({},{get:()=>()=>{}});globalThis.document={createElement:()=>({width:0,height:0,getContext:()=>q})};
const scene=new THREE.Scene(),obstacles=[],groundSurfaces=[],m=c=>new THREE.MeshStandardMaterial({color:c}),visualKit={wood:m,brick:m,siding:m,roofing:m,masonry:m};
const home=createLandmarkHouse({scene,visualKit,obstacles,groundSurfaces});
const p=(x,z,y=.3)=>({x:H.x+x,z:H.z+z,y});
const reverseDoor=home.doors.find(d=>d.id==='bedroom2');assert.ok(reverseDoor.g.children.every(m=>m.position.z<=0),'Reverse-hinged bedroom door panels and handle stay on the door leaf');
assert.equal(home.property.id,'maple-grove-1');assert.equal(home.doors.length,6);assert.equal(home.beds.length,2);assert.ok(home.actions.length>=25);assert.ok(home.seats.length>=5);
assert.equal(home.blocked(H.x+2.68,H.z+5.9,.3),true,'Closed front door physically blocks its opening');
assert.equal(home.act('front',H.entry).ok,true);assert.equal(home.blocked(H.x+2.68,H.z+5.9,.3),true,'Collision follows the leaf while the door animates');home.update(2,H.entry);assert.equal(home.blocked(H.x+2.68,H.z+5.9,.3),false);
assert.equal(home.act('front',p(2.68,5.2)).ok,false,'Closing cannot sweep through the player');
const opened={...freshHouse(),front:true,rear:true,garage:true,bedroom1:true,bedroom2:true,bathroom:true};home.restore(opened);
function path(start,end,y,insideOnly=false){const valid=(x,z)=>(!insideOnly||houseInside({x,z},.3))&&!home.blocked(x,z,y);assert.ok(valid(end.x,end.z),'Clear interaction approach: '+JSON.stringify(houseLocal(end)));const scale=insideOnly?4:1,route=localWalkPath({x:start.x*scale,z:start.z*scale},{x:end.x*scale,z:end.z*scale},(x,z)=>valid(x/scale,z/scale))?.map(q=>({x:q.x/scale,z:q.z/scale}));assert.ok(route,'Walkable route to '+JSON.stringify(houseLocal(end)));assert.ok(route.slice(1).every((q,i)=>lineClear(route[i],q,valid)));return route;}
for(const a of home.actions.filter(a=>a.kind!=='door')){const start=a.floor?p(3.3,-1.3,H.upper):H.entry;path(start,a,a.y,!!a.floor);assert.ok(home.act(a.id,{...a}).ok,'Every furnished interaction responds from its real approach: '+a.id);}
// Return state to a known configuration after toggling the actual appliances.
home.restore(opened);
for(let i=0;i<=18;i++){const z=3.4-i*.35-.001,y=houseFloorAt(H.x+4.95,H.z+Math.max(-2.9,z),.3);assert.ok(y>=.3&&y<=3.45);assert.equal(home.blocked(H.x+4.95,H.z+Math.max(-2.9,z),y),false,'The full stair path clears rails and walls');}
const walking=createVerticalState(H.x+4.95,H.z+3.55,.3);
for(const direction of [-1,1])for(let i=0;i<=270;i++){const z=direction<0?3.55-i*.025:-3.2+i*.025,floor=houseFloorAt(H.x+4.95,H.z+z,walking.y);advanceVertical(walking,{x:H.x+4.95,z:H.z+z,floor,dt:1/60});assert.equal(walking.grounded,true,'Normal walking stays grounded on every stair');assert.ok(Math.abs(walking.y-floor)<1e-6);}assert.ok(Math.abs(walking.y-.3)<1e-6,'The real movement integrator returns downstairs');
assert.equal(houseFloorAt(H.x+1,H.z+1,.3),.3);assert.equal(houseFloorAt(H.x+1,H.z+1,3.45),3.45,'The same X/Z supports two distinct storeys');
assert.equal(houseFloorAt(0,0,3.45),null);assert.equal(home.interior(p(0,0)).ceiling,3.24);assert.equal(home.interior(p(0,0,3.45)).ceiling,6.4);assert.equal(home.interior(p(4.95,0,1.8)).ceiling,6.4,'The stairwell has real headroom');
for(const seat of [...home.seats,...home.beds.map(b=>b.seat)]){assert.equal(home.blocked(seat.stand.x,seat.stand.z,seat.floor),false,'Every seat and bed has a clear stand-up point');}
const table=obstacles.find(o=>o.fixtureId==='dining-table');assert.equal(home.blocked((table.minX+table.maxX)/2,(table.minZ+table.maxZ)/2,.3),true);assert.equal(home.blocked((table.minX+table.maxX)/2,(table.minZ+table.maxZ)/2,3.45),false,'Ground-floor furniture cannot block upstairs movement');
assert.equal(home.act('tv',p(-1.6,-4.2)).ok,true);assert.equal(home.state.tv,true);home.act('tv',p(-1.6,-4.2));assert.equal(home.state.channel,1);home.act('tv',p(-1.6,-4.2));home.act('tv',p(-1.6,-4.2));assert.equal(home.state.tv,false);
assert.equal(home.act('fridge',p(0,0)).ok,false,'Remote actions are refused');
const state={...opened,tv:true,channel:2,fridge:true,lights1:false,bed1:false};home.restore(state);const saved=home.serialize(p(3.3,-1.3,H.upper));assert.equal(saved.visit.floor,1);const pose=home.restore(saved,p(3.3,-1.3,0));assert.equal(pose.y,H.upper);assert.equal(home.state.channel,2);assert.equal(home.state.fridge,true);assert.equal(home.state.lights1,false);
const recovery=home.restore(saved,p(-3.5,4.1,0));assert.equal(recovery.y,H.upper);assert.equal(home.blocked(recovery.x,recovery.z,recovery.y),false,'Reloading a resting pose recovers to a clear upstairs landing');
assert.equal(restoreHouse({propertyId:'other-house',tv:true}).tv,false);assert.equal(restoreHouse({propertyId:H.id,tv:'yes',channel:999}).tv,false);assert.equal(restoreHouse({propertyId:H.id,channel:999}).channel,2);
const raw={stage:'parent',goal:0,business:-1,cash:0,saved:0,earned:0,spent:0,investment:0,x:H.x+3.3,z:H.z-1.3,house:saved};const portable=exportSave(JSON.stringify(raw));assert.deepEqual(parseSaveFile(portable).save.house,saved,'House settings and upstairs visit round-trip through actual save backups');
const camera=cameraArchitectureBoxes(scene);assert.ok(camera.length>200);assert.ok(camera.some(b=>b.minY>3.4));assert.ok(camera.every(b=>[b.minX,b.maxX,b.minY,b.maxY,b.minZ,b.maxZ].every(Number.isFinite)));
const navigatorValid=createWalkValidator([{vehicleOnly:true,minX:H.x-6.7,maxX:H.x+6.7,minZ:H.z-5.9,maxZ:H.z+5.9},...obstacles]);assert.ok(navigatorValid(H.entry.x,H.entry.z),'City routes can guide to the real porch');
let triangles=0,meshCount=0;const buffers=new Set();let bytes=0;scene.traverse(m=>{if(!m.isMesh)return;meshCount++;triangles+=(m.geometry.index?.count||m.geometry.attributes.position.count)/3*(m.isInstancedMesh?m.count:1);for(const a of [...Object.values(m.geometry.attributes),m.geometry.index,m.instanceMatrix].filter(Boolean))if(!buffers.has(a.array.buffer)){buffers.add(a.array.buffer);bytes+=a.array.buffer.byteLength;}assert.ok([...m.matrixWorld.elements].every(Number.isFinite));});assert.ok(meshCount<130,'Detailed house keeps a bounded draw count');assert.ok(triangles<35000);assert.ok(bytes<2000000);
const html=await readFile(new URL('../index.html',import.meta.url),'utf8');assert.match(html,/landmarkHome\?\.restore\(s\.house,player\.position\)/);assert.match(html,/landmarkHome\?\.serialize\(player\.position\)/);assert.match(html,/setCityDestination\(\\'modelHome\\'\)/);assert.match(html,/seat\.floor\?\?groundHeight/);
console.log('Landmark house passed:',{actions:home.actions.length,doors:6,beds:2,meshCount,triangles,bytes,checks:'real rooms, both floors, every interaction route, stair clearance, door animation/sweep, seat exits, appliance state, upstairs save/export/recovery, camera bounds and draw budget'});
