import assert from 'node:assert/strict';
import {readFile,stat} from 'node:fs/promises';
import * as THREE from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {MeshoptDecoder} from 'three/addons/libs/meshopt_decoder.module.js';
import {TOWERS,CITY_BLOCKS,NORTH_CITY,worldWalkable} from '../assets/world-rules.js';
import {SKYLINE_LAYOUT,SKYLINE_TOWERS,SKYLINE_URLS,createSkylineMaterial,createNorthstarSkyline} from '../assets/northstar-skyline.js';
import {createNorthWorld} from '../assets/north-world.js';

const file=p=>new URL('../'+p,import.meta.url);
// Layout: every lot gets one tower, the tallest lot the tallest tower, all inside the collider.
assert.equal(SKYLINE_LAYOUT.towers.length,TOWERS.length);assert.deepEqual(SKYLINE_LAYOUT.towers.map(t=>t.lot).sort((a,b)=>a-b),TOWERS.map((_,i)=>i));
const byLot=[...TOWERS.keys()].sort((a,b)=>TOWERS[b].height-TOWERS[a].height),byNew=[...TOWERS.keys()].sort((a,b)=>SKYLINE_TOWERS[b].height-SKYLINE_TOWERS[a].height);
assert.equal(byNew[0],byLot[0],'the tallest tower stands on the tallest lot ('+TOWERS[byLot[0]].name+')');assert.equal(SKYLINE_TOWERS[byLot[0]].height,326);
for(const [i,t] of SKYLINE_TOWERS.entries()){assert.equal(t.name,TOWERS[i].name);assert.ok(t.height>=150&&t.height<=326,t.name+' height '+t.height);
  assert.ok(t.footprint[0]<=TOWERS[i].w+4&&t.footprint[1]<=TOWERS[i].d+4,t.name+' fits its collider');}
assert.ok(SKYLINE_LAYOUT.skyline.bounds.maxZ<=NORTH_CITY.minZ-30,'the far skyline starts north of the last street');

// Assets: compressed, in budget, carrying the shader attributes.
for(const [url,limit] of [[SKYLINE_URLS.towers,1e6],[SKYLINE_URLS.skyline,3.5e6]])assert.ok((await stat(file(url.slice(2)))).size<limit,url+' under '+limit+' bytes');
const glb=async url=>{const b=await readFile(file(url.slice(2)));return {buffer:b,json:JSON.parse(b.subarray(20,20+b.readUInt32LE(12)).toString('utf8'))};};
const towersGlb=await glb(SKYLINE_URLS.towers),skyGlb=await glb(SKYLINE_URLS.skyline);
for(const g of [towersGlb,skyGlb]){assert.ok(g.json.extensionsUsed.includes('EXT_meshopt_compression'));for(const m of g.json.meshes)for(const p of m.primitives)assert.ok('COLOR_0' in p.attributes&&'_LEVEL' in p.attributes&&'NORMAL' in p.attributes);assert.ok(!g.json.images);}
assert.deepEqual(towersGlb.json.nodes.map(n=>n.name).sort(),TOWERS.map((_,i)=>'tower-'+i).sort());

// Decode the real geometry.
const loader=new GLTFLoader().setMeshoptDecoder(MeshoptDecoder);
const parse=g=>new Promise((ok,fail)=>loader.parse(g.buffer.buffer.slice(g.buffer.byteOffset,g.buffer.byteOffset+g.buffer.byteLength),'',ok,fail));
const towers=(await parse(towersGlb)).scene,sky=(await parse(skyGlb)).scene;
const scene=new THREE.Scene(),stub={atmosphere:{registerGlow(m,o){stub.glow={m,o};}}},skyline=createNorthstarSkyline({scene,visualKit:stub});
assert.equal(skyline.lots.length,15);scene.updateMatrixWorld(true);assert.ok(skyline.lots.every(l=>l.standIn.visible&&Math.abs(new THREE.Box3().setFromObject(l.standIn).max.y-l.lot.height)<1e-3),'stand-ins show the final heights');
assert.equal(stub.glow.m,skyline.material,'windows light up at night');
assert.equal(skyline.installTowers(towers),true);assert.ok(skyline.lots.every(l=>!l.standIn.visible&&l.model));
scene.updateMatrixWorld(true);
for(const l of skyline.lots){const box=new THREE.Box3().setFromObject(l.model),t=TOWERS[l.lot.lot];
  assert.ok(Math.abs(box.max.y-l.lot.height)<.6,t.name+' model height '+box.max.y);assert.ok(box.min.y>-.2);
  assert.ok(box.min.x>=t.x-(t.w+4)/2-.3&&box.max.x<=t.x+(t.w+4)/2+.3&&box.min.z>=t.z-(t.d+4)/2-.3&&box.max.z<=t.z+(t.d+4)/2+.3,t.name+' stays on its lot');
  l.model.traverse(c=>{if(c.isMesh){assert.equal(c.material,skyline.material);assert.ok(c.geometry.attributes._level&&c.geometry.attributes.color.itemSize===4);}});}
skyline.installSkyline(sky);scene.updateMatrixWorld(true);const far=new THREE.Box3().setFromObject(sky);
assert.ok(far.max.z<=NORTH_CITY.minZ-30&&far.max.y<=330&&far.min.y>-.2&&Math.abs(far.min.x+far.max.x)<1,'far skyline: north of Northstar, centred, below 330 m');
let tris=0;sky.traverse(c=>{if(c.isMesh){tris+=c.geometry.index?c.geometry.index.count/3:c.geometry.attributes.position.count/3;assert.equal(c.castShadow,false);}});assert.equal(tris,SKYLINE_LAYOUT.skyline.triangles);
// Nothing of the far skyline can be reached on foot.
assert.ok(!worldWalkable(0,far.max.z-1)&&!worldWalkable(0,(far.min.z+far.max.z)/2));

// The shader hooks every chunk it relies on.
const mat=createSkylineMaterial(),shader={vertexShader:THREE.ShaderLib.standard.vertexShader,fragmentShader:THREE.ShaderLib.standard.fragmentShader,uniforms:{}};mat.onBeforeCompile(shader);
for(const s of ['vLevel=_level','vFogDepth*=.42'])assert.ok(shader.vertexShader.includes(s),s);
for(const s of ['skyWin=facade','roughnessFactor=mix(roughnessFactor,.2,skyWin)','totalEmissiveRadiance*=skyLit'])assert.ok(shader.fragmentShader.includes(s),s);

// Northstar keeps its lots, names and colliders, with the new heights.
globalThis.document={createElement:()=>({getContext:()=>({fillRect(){},fillText(){}})})};
const buildings=[],obstacles=[],traffic=[],C={road:mat,walk:mat,grass:mat};
createNorthWorld({scene:new THREE.Scene(),visualKit:{treeModel:()=>new THREE.Group(),atmosphere:{registerGlow(){},addStreetLight(){}}},cube(){},C,obstacles,buildings,car(){traffic.push({});},traffic,trafficControllers:[],addCornerSignal(){},characters:{create(){}}});
for(const [i,t] of TOWERS.entries()){const b=buildings.find(q=>q.id===t.id);assert.ok(b.skyscraper&&b.skylineModel);assert.equal(b.height,SKYLINE_TOWERS[i].height);
  assert.ok(obstacles.some(o=>Math.abs(o.minX-(t.x-(t.w+4)/2))<1e-9&&Math.abs(o.maxZ-(t.z+(t.d+4)/2))<1e-9),t.name+' collider');}
assert.equal(buildings.filter(b=>CITY_BLOCKS.some(c=>c.x===b.x&&c.z===b.z)).length,CITY_BLOCKS.length);

// Game wiring.
const index=await readFile(file('index.html'),'utf8');
assert.match(index,/const northSkyline=createNorthstarSkyline\(\{scene,visualKit\}\);/);assert.match(index,/\(mobileGraphics\?northSkyline\.loadTowers\(\):northSkyline\.load\(\)\)\.catch\(/);
console.log('Northstar skyline passed: 15 San Francisco towers fitted to their lots, a compressed far skyline north of the city, facade shader hooks, stand-ins and wiring.');
