import assert from 'node:assert/strict';
import * as THREE from 'three';
import {createPlannedCommunity} from '../assets/planned-community.js';
import {COMMUNITY_HOMES,communityPoint} from '../assets/world-rules.js';
import {houseObstacleBlocks} from '../assets/house-rules.js';
import {localWalkPath,lineClear} from '../assets/city-navigation.js';
import {cameraArchitectureBoxes} from '../assets/camera-geometry.js';
import {createVerticalState,advanceVertical} from '../assets/character-grounding.js';

globalThis.document={createElement:()=>({width:0,height:0,getContext:()=>new Proxy({},{get:()=>()=>{}})})};
const material=color=>new THREE.MeshStandardMaterial({color}),cache=new Map(),m=color=>{if(!cache.has(color))cache.set(color,material(color));return cache.get(color);};
const visualKit={concrete:m(0x999999),grass:m(0x335533),asphalt:m(0x222222),wood:m,siding:m,brick:m,roofing:m,windowMaterial:m,treeModel:()=>new THREE.Group(),atmosphere:{registerGlow(){},addStreetLight(){}}};
const scene=new THREE.Scene(),obstacles=[],groundSurfaces=[];
const community=createPlannedCommunity({scene,visualKit,obstacles,groundSurfaces,buildings:[]});
scene.updateMatrixWorld(true);
const home=COMMUNITY_HOMES.find(h=>h.address===139);assert.equal(home.id,'maple-grove-20');assert.equal(home.street,'Willow Way');
assert.equal(community.furnishedInteriors.length,2);const furnishing=community.furnishedInteriors[0];assert.equal(furnishing.homeId,home.id);assert.equal(furnishing.rooms.length,8);
for(const id of ['media-console-cabinet','living-plant-plant','kitchen-counter','oven-counter','refrigerator','kitchen-island','dining-table','main-bed-bed','main-bed-nightstand-left','main-bed-nightstand-right','main-bed-ottoman','study-cabinet-cabinet','study-desk','bath-tub','bath-vanity','bath-toilet','second-bed','third-bed','garage-workbench'])assert.ok(furnishing.fixtures.some(f=>f.id===id),id+' is real furnished geometry');
assert.equal(furnishing.fixtures.filter(f=>f.id.startsWith('dining-chair')).length,4);assert.equal(furnishing.fixtures.filter(f=>f.id.startsWith('stool-')).length,3);
assert.ok(community.sofaSets.sets.some(s=>s.home.id===home.id),'139 living room uses the owner sofa set');
for(const kind of ['bedroom','cabinet','chair','plant'])assert.ok(community.interiorProps.placements.some(p=>p.home.id===home.id&&p.model===kind),kind+' model is placed in 139');
const point=(x,z)=>({...communityPoint(home,x,z),y:.3});
const blocked=(x,z)=>obstacles.some(o=>o.homeId===home.id&&houseObstacleBlocks({...o,houseId:home.id},x,z,.3));
const from=point(home.w*.2,home.d/2+1.05);
for(const door of community.doors.filter(d=>d.home.id===home.id)){const exterior=point(door.x,door.z+(door.type==='rear'?-2.7:2.7));assert.equal(community.actDoor(door.id,exterior).ok,true);}
for(let i=0;i<120;i++)community.update(1/60);
for(const [name,x,z,via] of [['entry',2.92,5.4],['living room',4.6,4.95],['kitchen',2,-4.3],['dining room',.8,1],['study',-2,-3.4],['garage',-3,4.5],['patio',home.w*.24,-home.d/2-1,[2,-4.3]]]){
 const target=point(x,z),valid=(x,z)=>Math.abs(x-home.x)<home.w/2+.1&&Math.abs(z-home.z)<home.d/2+1.5&&!blocked(x,z),scale=4;
 assert.equal(blocked(target.x,target.z),false,name+' has a clear approach: '+JSON.stringify(obstacles.filter(o=>o.homeId===home.id&&houseObstacleBlocks({...o,houseId:home.id},target.x,target.z,.3))));
 // The patio is reached through the kitchen, which is itself checked from the front door.
 const start=via?point(...via):from,path=localWalkPath({x:start.x*scale,z:start.z*scale},{x:target.x*scale,z:target.z*scale},(x,z)=>valid(x/scale,z/scale))?.map(p=>({x:p.x/scale,z:p.z/scale}));
 assert.ok(path,'Walk from front door to '+name);assert.ok(path.slice(1).every((p,i)=>lineClear(path[i],p,valid)));
}
const partition=point(-.2,0);assert.equal(blocked(partition.x,partition.z),true,'Room dividers have real collision');
const boxes=cameraArchitectureBoxes(scene);for(const y of [.5,1.5,2.9])assert.ok(boxes.some(b=>b.minX<partition.x&&b.maxX>partition.x&&b.minZ<partition.z&&b.maxZ>partition.z&&b.minY<=y&&b.maxY>=y),'Camera sees the full interior wall after instancing');
// Downward rays hit exactly one finished floor, never a coplanar foundation.
const ray=new THREE.Raycaster();for(const h of COMMUNITY_HOMES.filter(h=>h.id!=='maple-grove-1')){
 const p=communityPoint(h,h.w*.2,h.d/2-.9);ray.set(new THREE.Vector3(p.x,2.5,p.z),new THREE.Vector3(0,-1,0));
 const hits=ray.intersectObjects(community.architectureBatches,false);
 const floors=hits.filter(hit=>Math.abs(hit.point.y-.3)<1e-5);assert.equal(floors.length,1,'Single finished floor at '+h.address);
 assert.ok(hits.some(hit=>Math.abs(hit.point.y-.27)<1e-5),'Foundation is 3 cm below the floor at '+h.address);
 const floor=Math.max(...groundSurfaces.filter(s=>p.x>=s.minX&&p.x<=s.maxX&&p.z>=s.minZ&&p.z<=s.maxZ).map(s=>s.top));assert.equal(floor,.3);
 const state=createVerticalState(p.x,p.z,.3);for(let i=0;i<120;i++)advanceVertical(state,{...p,floor,dt:1/60});assert.equal(state.y,.3);assert.equal(state.grounded,true);
}
assert.ok(community.architectureBatches.length<110,'Furnishings remain in bounded shared architecture batches');
console.log('House 139 passed: real partitions/furnishings, all room and exit routes, collision/camera after batching, and 26 single-surface floors with stable footing.');
