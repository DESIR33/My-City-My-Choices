import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFile} from 'node:fs/promises';
import * as THREE from 'three';
import * as world from '../assets/world-rules.js';
import {createCommunityPlaza,plazaGroundHeight} from '../assets/community-plaza.js';
import {createPlannedCommunity} from '../assets/planned-community.js';
import {createWalkValidator,localWalkPath,lineClear,planCityRoute} from '../assets/city-navigation.js';
import {vehicleFootprint,rectanglesOverlap} from '../assets/vehicle-physics.js';
import {cameraArchitectureBoxes} from '../assets/camera-geometry.js';
const material=new THREE.MeshStandardMaterial(),lights=[],planted=[],cache=new Map();
const surface=(kind,color)=>{const key=kind+color;if(!cache.has(key))cache.set(key,new THREE.MeshStandardMaterial({color}));return cache.get(key);};
const visualKit={concrete:material,asphalt:material,grass:new THREE.MeshStandardMaterial({color:0x647853}),masonry:c=>surface('stone',c),wood:c=>surface('wood',c),brick:c=>surface('brick',c),roofing:c=>surface('roof',c),siding:c=>surface('siding',c),windowMaterial:()=>material,treeModel:(x,z)=>{planted.push({x,z});return new THREE.Group();},atmosphere:{registerGlow(){},addStreetLight:p=>lights.push(p)}};
globalThis.document={createElement:()=>({width:0,height:0,getContext:()=>({fillRect(){},strokeRect(){},fillText(){}})})};
const scene=new THREE.Scene(),groundSurfaces=[],seats=[],buildings=[],obstacles=[78,102].map(x=>({minX:x-7.35,maxX:x+7.35,minZ:-48.35,maxZ:-27.65}));
const actors=[],characters={create:p=>{const a=new THREE.Group();a.position.set(p.x,0,p.z);a.userData.character=true;a.userData.model=p.model;scene.add(a);actors.push(a);return a;},setSeated:(actor,pose)=>actor.userData.seated=pose};
const plaza=createCommunityPlaza({scene,visualKit,obstacles,groundSurfaces,seats,characters});
assert.equal(plaza.seats.length,6);assert.equal(plaza.neighbors.length,5);assert.deepEqual(plaza.neighbors.map(a=>a.userData.model),['crowd','crowd','crowd-child','crowd-child','crowd-child'],'two seated adults and three playground kids from the crowd pool');assert.equal(seats.filter(s=>!s.occupiedBy).length,4);assert.equal(plaza.features.filter(f=>f.kind==='slide').length,1);
assert.ok(plaza.features.some(f=>f.kind==='pergola'));assert.equal(plaza.plantings.length,4);
const valid=createWalkValidator(obstacles),entrance=world.MAPLE_COMMONS.entrance;
for(const target of [...seats.map(s=>s.stand),{x:78,z:-14},{x:101,z:-18.5},{x:101,z:-23},{x:106.5,z:-23},{x:89,z:-21}]){
 assert.ok(valid(target.x,target.z),'Usable destination and seat exits are clear');
 const path=localWalkPath(entrance,target,valid);assert.ok(path,'Plaza paths reach '+JSON.stringify(target));assert.ok(path.slice(1).every((p,i)=>lineClear(path[i],p,valid)));
}
assert.ok(planCityRoute({x:-83,z:-22},entrance,{walkValid:valid}),'Plaza joins city walking guidance');
assert.ok(planCityRoute({x:-55,z:-44},{...entrance,parking:world.MAPLE_COMMONS.parking},{mode:'drive'}),'Driving guidance stops at the street rather than the playground');
assert.equal(world.worldDrivable(90,-19),false);assert.equal(world.worldDrivable(101,-23),false);
const ground=(x,z)=>Math.max(plazaGroundHeight(x,z),...groundSurfaces.filter(s=>world.withinRect(x,z,s)).map(s=>s.top));
for(let i=0;i<6;i++)assert.ok(Math.abs(ground(101,-19.05-i*.5)-(.41+i*.2))<1e-8);
assert.equal(ground(101,-23),1.41);assert.equal(plazaGroundHeight(102.2,-23),1.41);assert.equal(plazaGroundHeight(106.8,-23),.25);
for(let x=102.25;x<106.7;x+=.2){assert.ok(valid(x,-23),'Slide centre stays inside its guards');assert.ok(Math.abs(plazaGroundHeight(x+.1,-23)-plazaGroundHeight(x,-23))<.03,'Continuous shallow slide grade');}
let meshes=0,triangles=0;scene.updateMatrixWorld(true);scene.traverse(m=>{if(!m.isMesh)return;meshes++;triangles+=(m.geometry.index?.count||m.geometry.attributes.position.count)/3;assert.ok([...m.matrixWorld.elements].every(Number.isFinite));});
assert.ok(meshes<260,'Plaza keeps construction and draw work bounded before batching');assert.ok(triangles<12000);assert.ok(cameraArchitectureBoxes(scene).some(b=>b.minY>3),'Pergola and canopy enter the camera/rain snapshot');
createPlannedCommunity({scene,visualKit,obstacles,buildings,groundSurfaces});
assert.equal(world.COMMUNITY_PARKED_CARS.length,8);
for(const p of world.COMMUNITY_PARKED_CARS){const home=world.COMMUNITY_HOMES.find(h=>h.id===p.homeId),drive=world.communityDriveway(home),shape=vehicleFootprint(p.x,p.z,p.heading);
 assert.ok(shape.every(v=>world.withinRect(v.x,v.z,drive,-.15)),'Whole parked car stays on its driveway');
 const block=obstacles.some(o=>rectanglesOverlap(shape,[{x:o.minX,z:o.minZ},{x:o.maxX,z:o.minZ},{x:o.maxX,z:o.maxZ},{x:o.minX,z:o.maxZ}]));assert.equal(block,false,'Resident car clears walls, trees, fences and the porch');
 const lane=world.communityPoint(home,-home.w*.23+(p.homeId==='maple-grove-1'?1.55:-1.55),home.d/2+4.2),freeShape=vehicleFootprint(lane.x,lane.z,home.heading);assert.equal(rectanglesOverlap(shape,freeShape),false,'The second bay stays clear');
}
for(const tree of planted)assert.equal(world.worldDrivable(tree.x,tree.z),false,'Designed trees stay outside roads and drives');
const html=await readFile(new URL('../index.html',import.meta.url),'utf8'),streetTrees=[];
const context={...world,streets:world.MAPLE_STREETS,CLOTHING_STORE:{x:42,z:45},obstacles,tree:(x,z)=>streetTrees.push({x,z})};vm.createContext(context);vm.runInContext(html.slice(html.indexOf('function safeTree('),html.indexOf('// Detailed corner fixtures')),context);
assert.ok(streetTrees.every(p=>!world.communityReserved(p.x,p.z)&&!world.plazaReserved(p.x,p.z,3)&&!world.worldDrivable(p.x,p.z)),'The actual legacy tree loop respects new roads and plaza boundaries');
for(const p of [{x:-155,z:60},{x:-145,z:120},{x:-132,z:-90}])assert.equal(world.worldDrivable(p.x,p.z),false,'Removed west road stubs are no longer drivable');
for(const p of [{x:-140,z:-120},{x:-140,z:-60},{x:-140,z:0}])assert.equal(world.worldDrivable(p.x,p.z),true,'All three actual subdivision entries stay connected');
for(const z of [-122.4,-62.4,2.4,57.6,117.6]){const limits=world.mapleTrafficBounds(z);assert.ok(limits);for(let x=limits.min;x<=limits.max;x+=.5)assert.ok(vehicleFootprint(x,z,Math.PI/2).every(p=>world.worldDrivable(p.x,p.z)),'Traffic wrap positions and the full car remain on real asphalt');}
const paving=[],paveContext={...world,C:{walk:{}},scene:{},cube:(parent,x,y,z,w,h,d)=>paving.push({minX:x-w/2,maxX:x+w/2,minZ:z-d/2,maxZ:z+d/2,top:y+h}),streets:world.MAPLE_STREETS};vm.createContext(paveContext);vm.runInContext(html.slice(html.indexOf('const plannedPavingCuts='),html.indexOf('// Painted lane dividers')),paveContext);
for(const z of [60,120])assert.ok(paving.some(r=>world.withinRect(-129,z,r)&&Math.abs(r.top-.21)<1e-8),'West sidewalk continues through removed T-junction stubs');
assert.match(html,/const communityParkedCars=COMMUNITY_PARKED_CARS\.map/);assert.match(html,/setCityDestination\(\\'commons\\'\)/);assert.match(html,/Math\.max\(coastGroundHeight\(x,z\),plazaGroundHeight\(x,z\)\)/);
console.log('Community plaza passed:',{meshes,triangles,seats:6,neighbors:5,drivewayCars:8,checks:'real geometry, usable seats and exits, tower stairs/slide, city routes, tree clearance, second garage bays, removed road stubs and through sidewalks'});
