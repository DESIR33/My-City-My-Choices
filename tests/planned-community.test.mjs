import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFile} from 'node:fs/promises';
import * as THREE from 'three';
import * as world from '../assets/world-rules.js';
import {createPlannedCommunity} from '../assets/planned-community.js';
import {createCityNetwork,planCityRoute,createWalkValidator,localWalkPath,lineClear,communityResponseRoute} from '../assets/city-navigation.js';
import {vehicleFootprint,rectanglesOverlap} from '../assets/vehicle-physics.js';
import {walkingSurface} from '../assets/character-grounding.js';
import {mergeGeometries} from 'three/addons/utils/BufferGeometryUtils.js';
import {cameraArchitectureBoxes} from '../assets/camera-geometry.js';
import {createArchitectureDetail} from '../assets/architecture-detail.js';
const {COMMUNITY_HOMES,COMMUNITY_ROADS,communityPoint,communityDriveway,communityReserved,worldDrivable,worldWalkable}=world;
globalThis.document={createElement:()=>({width:0,height:0,getContext:()=>({fillRect(){},strokeRect(){},fillText(){}})})};
const mat=color=>new THREE.MeshStandardMaterial({color}),cache=new Map(),surface=(kind,color)=>{const key=kind+color;if(!cache.has(key)){const m=mat(color);m.userData.tileSize=kind==='grass'?6:2;cache.set(key,m);}return cache.get(key);};
const lights=[],visualKit={concrete:surface('concrete',0xbebbb0),asphalt:surface('asphalt',0x414649),grass:surface('grass',0x708057),wood:c=>surface('wood',c),siding:c=>surface('siding',c),brick:c=>surface('brick',c),roofing:c=>surface('roof',c),windowMaterial:()=>surface('glass',0x526f7a),treeModel:(x,z,s)=>{const g=new THREE.Group(),trunk=new THREE.Mesh(new THREE.CylinderGeometry(.2,.2,3,6),mat(0x5b4837));trunk.position.y=1.5;trunk.castShadow=true;g.add(trunk);g.position.set(x,0,z);g.scale.setScalar(s);return g;},atmosphere:{registerGlow(){},addStreetLight:p=>lights.push(p)}};
const scene=new THREE.Scene(),obstacles=[],buildings=[],groundSurfaces=[],snapshot=JSON.stringify(COMMUNITY_HOMES);
const community=createPlannedCommunity({scene,visualKit,obstacles,buildings,groundSurfaces});
assert.equal(JSON.stringify(COMMUNITY_HOMES),snapshot,'Construction never mutates the shared layout');
assert.equal(community.homes.length,27);assert.equal(community.homes.filter(h=>!h.existing).length,24);assert.ok(community.homes.every(h=>h.stories===2));assert.equal(community.fenced,18);assert.equal(community.gateways.length,18);
assert.equal(new Set(COMMUNITY_HOMES.map(h=>h.id)).size,27);assert.equal(new Set(COMMUNITY_HOMES.map(h=>h.address+' '+h.street)).size,27);assert.equal(new Set(COMMUNITY_HOMES.map(h=>h.plan)).size,4);assert.equal(new Set(COMMUNITY_HOMES.map(h=>h.palette)).size,6);
const walkValid=createWalkValidator(obstacles),driveNetwork=createCityNetwork('drive'),walkNetwork=createCityNetwork('walk');
function roadLegs(route,valid){assert.ok(route);for(let i=1;i<route.points.length;i++)assert.ok(lineClear(route.points[i-1],route.points[i],valid),'Every route segment stays on its real playable network');}
function overlapsBox(shape,o){return rectanglesOverlap(shape,[{x:o.minX,z:o.minZ},{x:o.maxX,z:o.minZ},{x:o.maxX,z:o.maxZ},{x:o.minX,z:o.maxZ}]);}
for(const h of community.homes){
 const front=h.d/2,sign=h.heading===0?1:-1,drive=communityDriveway(h),garageX=(drive.minX+drive.maxX)/2;
 assert.ok(h.backyard.maxZ-h.backyard.minZ>=6,'Every home has a usable backyard depth');assert.ok(h.backyard.maxX-h.backyard.minX>16);
 assert.ok(worldWalkable((h.backyard.minX+h.backyard.maxX)/2,(h.backyard.minZ+h.backyard.maxZ)/2));
 // Actual car footprints, not just their centre points, fit from the road to
 // the garage approach and do not touch walls, porch pillars, trees or fences.
 const last=Math.abs(h.roadZ-h.z)-(front+3.6);
 for(let step=0;step<=last;step+=.35){const z=h.roadZ-sign*step,shape=vehicleFootprint(garageX,z,h.heading+Math.PI);assert.ok(shape.every(p=>worldDrivable(p.x,p.z)),'A complete car fits '+h.id+' driveway');assert.ok(!obstacles.some(o=>overlapsBox(shape,o)),'Driveway stays unobstructed at '+h.id);}
 const center={x:garageX,z:(drive.minZ+drive.maxZ)/2};assert.equal(walkingSurface(center.x,center.z,groundSurfaces),'concrete');
 const approach=communityPoint(h,h.w*.2,front+2.88),patio={x:(h.patio.minX+h.patio.maxX)/2,z:(h.patio.minZ+h.patio.maxZ)/2};assert.ok(walkValid(approach.x,approach.z));assert.ok(walkValid(patio.x,patio.z));
 const backyardPath=localWalkPath(approach,patio,walkValid);assert.ok(backyardPath,'Accessible backyard at '+h.id);assert.ok(backyardPath.slice(1).every((p,i)=>lineClear(backyardPath[i],p,walkValid)));
 roadLegs(planCityRoute({x:-83,z:-22},approach,{mode:'walk',network:walkNetwork,walkValid}),walkValid);
 roadLegs(planCityRoute({x:-55,z:-44},center,{mode:'drive',network:driveNetwork}),worldDrivable);
 for(const other of community.homes)if(h!==other){assert.ok(Math.abs(h.x-other.x)>=(h.w+other.w)/2+.5||Math.abs(h.z-other.z)>=(h.d+other.d)/2+.5,'House footprints never overlap');assert.ok(h.backyard.maxX<=other.backyard.minX||h.backyard.minX>=other.backyard.maxX||h.backyard.maxZ<=other.backyard.minZ||h.backyard.minZ>=other.backyard.maxZ,'Each home has a separate backyard');}
 // Neither the building nor its private rear lawn is reclassified as a road.
 assert.equal(worldDrivable(h.x,h.z),false);assert.equal(worldDrivable(patio.x,patio.z),false);
}
for(const gate of community.gateways){const h=COMMUNITY_HOMES.find(h=>h.id===gate.homeId),direction=h.heading===0?1:-1;assert.ok(lineClear({x:gate.x-direction,z:gate.z},{x:gate.x+direction,z:gate.z},walkValid),'Physical gateway is passable');const rear=communityPoint(h,0,(h.rearZ-h.z)*direction);assert.equal(walkValid(rear.x,rear.z),false,'Privacy fence blocks walking through its boards');}
for(const road of COMMUNITY_ROADS){const route=planCityRoute({x:120,z:-30},{x:(road.x1+road.x2)/2,z:(road.z1+road.z2)/2},{mode:'drive',network:driveNetwork});roadLegs(route,worldDrivable);}
for(const target of [{x:-240,z:-180},{x:-302,z:-90},{x:-150,z:-165},{x:-224,z:-87.6}]){const path=communityResponseRoute({x:136.4,z:-39},target);for(let i=4;i<path.length;i++)assert.ok(lineClear(path[i-1],path[i],worldDrivable),'Police reach the subdivision using streets');assert.ok(Math.hypot(path.at(-1).x-target.x,path.at(-1).z-target.z)>=7.9);assert.ok(Math.hypot(path.at(-1).x-target.x,path.at(-1).z-target.z)<8.1);}
// The actual main-page sidewalk builder removes raised concrete from driveways
// and each new road connection, including the rebuilt original houses.
const html=await readFile(new URL('../index.html',import.meta.url),'utf8'),paving=[];
const context={...world,C:{walk:{}},scene:{},cube:(parent,x,y,z,w,h,d)=>paving.push({minX:x-w/2,maxX:x+w/2,minZ:z-d/2,maxZ:z+d/2,top:y+h}),streets:[-120,-60,0,60,120]};vm.createContext(context);vm.runInContext(html.slice(html.indexOf('const plannedPavingCuts='),html.indexOf('// Painted lane dividers')),context);
for(const h of COMMUNITY_HOMES.filter(h=>h.existing)){const d=communityDriveway(h);assert.ok(!paving.some(p=>p.maxX>d.minX&&p.minX<d.maxX&&p.maxZ>d.minZ&&p.minZ<d.maxZ),'Existing sidewalks have physical lowered driveway cuts');}
const architecture=cameraArchitectureBoxes(scene);assert.ok(architecture.length>3000,'New walls and fences enter the real camera/rain shelter snapshot');
const pitched=createArchitectureDetail({scene:new THREE.Scene(),buildings,materials:{surface:(kind,color)=>surface(kind,color)}});assert.equal(pitched.roofUnits,0,'Flat-roof HVAC and parapets never float above pitched residential roofs');assert.equal(pitched.facadePanels,0,'Commercial facade overlays do not cover home doors or garages');
let meshCount=0,triangles=0;scene.updateMatrixWorld(true);scene.traverse(mesh=>{if(!mesh.isMesh)return;meshCount++;const p=mesh.geometry.attributes.position;assert.ok([...p.array].every(Number.isFinite));assert.ok([...mesh.matrixWorld.elements].every(Number.isFinite));triangles+=(mesh.geometry.index?mesh.geometry.index.count:p.count)/3*(mesh.isInstancedMesh?mesh.count:1);if(mesh.isInstancedMesh)assert.ok([...mesh.instanceMatrix.array].every(Number.isFinite));});
assert.ok(meshCount<450,'Neighborhood construction is instanced before the global merge');assert.ok(community.architectureBatches.length<70);assert.ok(triangles<220000,'Shared low-detail architecture stays within a neighborhood budget');assert.equal(lights.length,6);assert.ok(communityReserved(-240,-204));assert.equal(world.districtName(-204,-240),'Maple Grove');assert.equal(world.districtName(-204,0),'North Road');
// Exercise the real production batcher: custom gables, textured panels and
// every trim/fence mesh must survive merging with compatible attributes.
const visualSource=await readFile(new URL('../assets/city-visuals.js',import.meta.url),'utf8'),batchContext={scene,THREE,mergeGeometries};vm.createContext(batchContext);vm.runInContext(visualSource.slice(visualSource.indexOf('function batchArchitecture()'),visualSource.indexOf('\n  return {',visualSource.indexOf('function batchArchitecture()')))+';this.batching=batchArchitecture();',batchContext);assert.equal(batchContext.batching.sourceGroups,30);assert.ok(batchContext.batching.drawGroups<110,'Static subdivision detail uses a bounded number of draws');let mergedTriangles=0;scene.traverse(mesh=>{if(mesh.isMesh)mergedTriangles+=(mesh.geometry.index?mesh.geometry.index.count:mesh.geometry.attributes.position.count)/3*(mesh.isInstancedMesh?mesh.count:1);});assert.equal(mergedTriangles,triangles,'Batching retains all architectural and tree triangles');
const buffers=new Set();let bufferBytes=0;scene.traverse(mesh=>{if(!mesh.isMesh)return;for(const attribute of [...Object.values(mesh.geometry.attributes),mesh.geometry.index,mesh.instanceMatrix].filter(Boolean))if(!buffers.has(attribute.array.buffer)){buffers.add(attribute.array.buffer);bufferBytes+=attribute.array.buffer.byteLength;}});assert.ok(bufferBytes<4500000,'Neighborhood vertex and instance buffers remain bounded after production batching');
console.log('Planned community passed:',{bufferBytes,homes:27,fenced:18,meshCount,triangles,checks:'actual geometry, distinct backyards, full-car driveway clearance, open gates, on-foot routes to every house, lowered curb cuts, connected roads, emergency access, camera/shelter coverage and residential roof protection'});
