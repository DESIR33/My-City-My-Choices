import assert from 'node:assert/strict';
import {readFile,stat} from 'node:fs/promises';
import * as THREE from 'three';
import {RONDA,worldWalkable,worldDrivable,districtName} from '../assets/world-rules.js';
import {createRondaWorld,loadRondaScans,rondaScanFiles,gorgeFloorY,RONDA_SCANS,RONDA_PLACES,RONDA_FACTS,RONDA_THINK} from '../assets/ronda-world.js';
import {planCityRoute,createWalkValidator,lineClear} from '../assets/city-navigation.js';

const file=p=>new URL('../'+p,import.meta.url),G=RONDA.gorge,[nuevo,viejo]=RONDA.bridges;

// Rules: the town plateau is open, the gorge and the escarpment are not, the bridges cross.
assert.ok(worldWalkable(-600,1300)&&worldWalkable(-400,1700)&&worldWalkable(-315,1500),'old town and the east end are walkable');
for(const x of [-650,-560,-470,-360])assert.equal(worldWalkable(x,1500),false,'gorge at '+x);
assert.equal(worldWalkable(RONDA.cliffX+1,1300),false,'escarpment edge');assert.equal(worldWalkable(-760,1300),false,'valley below');
assert.ok(worldWalkable(nuevo.x,1500)&&worldWalkable(nuevo.x+nuevo.halfWidth-.7,1500)&&!worldWalkable(nuevo.x+nuevo.halfWidth,1500),'Puente Nuevo deck with parapets');
assert.ok(worldWalkable(viejo.x,1500)&&!worldDrivable(viejo.x,1500),'Puente Viejo is for walking');
assert.ok(worldDrivable(nuevo.x,1500)&&worldDrivable(-280,RONDA.link.z)&&worldDrivable(-600,RONDA.roads.ew[0])&&worldDrivable(-345,1700),'roads, link and bridge are drivable');
assert.equal(worldDrivable(-345,1500),false,'the east street stops at the gorge');assert.equal(worldDrivable(-600,1300),false,'blocks are not roads');
assert.equal(districtName(1500,-520),'Ronda');assert.equal(districtName(1400,-100),'Sunshore City');
assert.ok(gorgeFloorY(-400)>gorgeFloorY(-560)&&gorgeFloorY(-560)<RONDA_PLACES.waterfall.top,'river falls under the bridge');

// Scans: every material kind has KTX2 files at both sizes, all CC0 and in budget.
let bytes=0;for(const size of [512,1024])for(const f of rondaScanFiles(size)){bytes+=(await stat(file(f.url.slice(2)))).size;}
assert.equal(rondaScanFiles(1024).length,Object.keys(RONDA_SCANS).length*3);assert.ok(bytes<6e6,'scans under 6 MB: '+bytes);
const credits=await readFile(file('assets/ronda/textures/ATTRIBUTION.md'),'utf8');assert.match(credits,/CC0/);for(const s of Object.values(RONDA_SCANS))assert.ok(credits.includes(s.id),s.id+' credited');

// Build in Node with a canvas stub.
const ctx=new Proxy({},{get:(t,k)=>k==='createLinearGradient'||k==='createRadialGradient'?()=>({addColorStop(){}}):k==='getImageData'?()=>({data:new Uint8ClampedArray(4)}):()=>{},set:()=>true});
globalThis.document={createElement:()=>({width:0,height:0,getContext:()=>ctx})};
const scene=new THREE.Scene(),obstacles=[],groundSurfaces=[];
const world=createRondaWorld({scene,visualKit:{},obstacles,groundSurfaces});
assert.ok(world.houses.length>500,'a dense town: '+world.houses.length);
assert.ok(groundSurfaces.some(g=>g.ronda&&g.top===0));
const solids=obstacles.filter(o=>o.ronda);assert.ok(solids.length>world.houses.length);
for(const h of world.houses)assert.ok(worldWalkable(h.x,h.z)&&h.x-h.w/2>RONDA.cliffX&&!(h.z+h.d/2>G.minZ&&h.z-h.d/2<G.maxZ&&h.x<G.eastX),'house sits on the plateau at '+h.x+','+h.z);
const blocked=(x,z)=>solids.some(o=>x>o.minX-.3&&x<o.maxX+.3&&z>o.minZ-.3&&z<o.maxZ+.3);
// Every drivable street centre line is free of buildings.
for(const z of RONDA.roads.ew)for(let x=-655;x<=-302;x+=1)assert.ok(!blocked(x,z),'east-west street at '+x+','+z);
for(const x of RONDA.roads.ns)for(let z=1182;z<=1818;z+=1)if(worldDrivable(x,z))assert.ok(!blocked(x,z),'north-south street at '+x+','+z);
for(let x=RONDA.link.minX;x<=RONDA.link.maxX;x++)assert.ok(!blocked(x,RONDA.link.z));
// Landmarks: real structures, a working waterfall and kid-friendly facts with a maths question.
assert.ok(world.cliffMeshes.length>=4&&world.batches.length>8);
const fall=scene.getObjectByName('Ronda');assert.ok(fall);world.update(.5);
assert.equal(world.nearestLandmark({x:nuevo.x,z:1500}).id,'bridge');
assert.equal(world.nearestLandmark({x:RONDA_PLACES.arena.x,z:RONDA_PLACES.arena.z+RONDA_PLACES.arena.r+3}).id,'arena');assert.equal(world.nearestLandmark({x:-600,z:1600}),null);
for(const id of ['bridge','arena','town']){assert.ok(RONDA_FACTS[id].length>80);assert.ok(RONDA_THINK[id].question&&RONDA_THINK[id].answer);}
assert.match(RONDA_FACTS.bridge,/1759/);assert.match(RONDA_THINK.bridge.answer,/34/);assert.match(RONDA_FACTS.arena,/museum/);
// Scans attach to every scanned material through the shared loader.
const fake=new THREE.Texture();const loaded=await loadRondaScans(world,{load:async()=>fake.clone(),size:512});
assert.equal(loaded.applied,world.scanned.length);assert.ok(world.materials.cliff.normalMap&&world.materials.roof.map&&!world.materials.white.map,'whitewash keeps its paint colour');

// Navigation: drive from Maple Street and walk from Sunshore to the bridge, avoiding buildings.
const target={x:nuevo.x,z:G.minZ-34,parking:{x:nuevo.x,z:RONDA.roads.ew[0]}};
const drive=planCityRoute({x:0,z:-120},target,{mode:'drive'});assert.ok(drive&&drive.points.every((p,i)=>!i||lineClear(drive.points[i-1],p,worldDrivable)),'drivable route');
const walkValid=createWalkValidator(obstacles),walk=planCityRoute({x:-230,z:1300},target,{mode:'walk',walkValid});
assert.ok(walk&&walk.points.every((p,i)=>!i||lineClear(walk.points[i-1],p,walkValid)),'walking route from Sunshore');
const cross=planCityRoute({x:nuevo.x,z:1440},{x:nuevo.x,z:1580},{mode:'walk',walkValid});assert.ok(cross&&cross.total<200,'walk across the Puente Nuevo');

// Game wiring.
const index=await readFile(file('index.html'),'utf8');
assert.match(index,/const rondaWorld=createRondaWorld\(\{scene,visualKit,obstacles,groundSurfaces,mobile:mobileGraphics\}\);globalThis\.rondaWorld=rondaWorld;/);
assert.match(index,/loadRondaScans\(globalThis\.rondaWorld,options\)/);assert.match(index,/rondaWorld\.update\(frameTime\)/);
assert.match(index,/ronda:\{name:'Ronda · Puente Nuevo'/);assert.match(index,/setCityDestination\(\\'ronda\\'\)/);assert.match(index,/near\.kind==="ronda"/);
console.log('Ronda passed: '+world.houses.length+' houses, gorge and escarpment rules, bridges, clear streets, CC0 scans, landmark lessons, routes and wiring.');
// Bridge bodies stay under the walkable deck (no hidden step across the road).
for(const name of ['Puente Nuevo']){const g=scene.getObjectByName(name);g.updateMatrixWorld(true);const box=new THREE.Box3().setFromObject(g.children[0]);assert.ok(box.max.y<=.01,name+' body top '+box.max.y);}
{let top=-Infinity;world.root.traverse(o=>{if(o.isMesh&&o.geometry?.type==='ExtrudeGeometry'){o.geometry.computeBoundingBox();top=Math.max(top,o.geometry.boundingBox.max.y+o.position.y);}});assert.ok(top<=.01,'extruded bridge bodies end at the deck: '+top);}
