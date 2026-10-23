import assert from 'node:assert/strict';
import {readFile,stat} from 'node:fs/promises';
import * as THREE from 'three';
import {SOFA_SET_LAYOUT,SOFA_SET_SKIP,SOFA_SET_URL,SOFA_FLOOR,sofaSetHomes,sofaSetPlacement} from '../assets/sofa-sets.js';
import {createPlannedCommunity} from '../assets/planned-community.js';
import {COMMUNITY_HOMES,communityPoint} from '../assets/world-rules.js';
import {houseObstacleBlocks} from '../assets/house-rules.js';
import {localWalkPath,lineClear} from '../assets/city-navigation.js';

const file=p=>new URL('../'+p,import.meta.url);
// The runtime layout matches what the asset tool measured, and the asset stays in budget.
const layout=JSON.parse(await readFile(file('assets/sofa-set/layout.json'),'utf8'));
assert.deepEqual({bounds:SOFA_SET_LAYOUT.bounds,pieces:SOFA_SET_LAYOUT.pieces},{bounds:layout.bounds,pieces:layout.pieces});
assert.ok(layout.triangles<45000,'set stays under 45k triangles');
assert.ok((await stat(file(SOFA_SET_URL.slice(2)))).size<3e6,'set GLB stays under 3 MB');
assert.equal(SOFA_SET_URL,'./assets/sofa-set/rosa-living.glb');

// Every other eligible home, never the landmark 101 or the furnished 139.
const chosen=sofaSetHomes(COMMUNITY_HOMES),eligible=COMMUNITY_HOMES.filter(h=>!SOFA_SET_SKIP.includes(h.id));
assert.equal(chosen.length,Math.ceil(eligible.length/2));assert.ok(chosen.every(h=>!SOFA_SET_SKIP.includes(h.id)));
for(let i=0;i<eligible.length;i++)assert.equal(chosen.includes(eligible[i]),i%2===0,'alternating at '+eligible[i].id);

// Fits inside every chosen shell with clearance at the walls and the front door.
for(const home of chosen){const p=sofaSetPlacement(home);
  assert.ok(p.minX>-home.w/2+.25&&p.maxX<home.w/2-.25&&p.minZ>-home.d/2+.25&&p.maxZ<home.d/2-1.5,'set fits inside '+home.id);
  for(const piece of p.pieces){assert.ok(piece.minY>=SOFA_FLOOR&&piece.maxY>piece.minY);}
}

// Built into the community: colliders per piece, a reachable interior and streamed models.
globalThis.document={createElement:()=>({width:0,height:0,getContext:()=>new Proxy({},{get:()=>()=>{}})})};
const material=color=>new THREE.MeshStandardMaterial({color}),cache=new Map(),m=color=>{if(!cache.has(color))cache.set(color,material(color));return cache.get(color);};
const visualKit={concrete:m(0x999999),grass:m(0x335533),asphalt:m(0x222222),wood:m,siding:m,brick:m,roofing:m,windowMaterial:m,treeModel:()=>new THREE.Group(),atmosphere:{registerGlow(){},addStreetLight(){}}};
const scene=new THREE.Scene(),obstacles=[];
const community=createPlannedCommunity({scene,visualKit,obstacles,groundSurfaces:[],buildings:[]});
const sofas=community.sofaSets;assert.equal(sofas.count,chosen.length);
for(const set of sofas.sets){
  const ids=set.colliders.map(c=>c.fixtureId).sort();assert.deepEqual(ids,Object.keys(SOFA_SET_LAYOUT.pieces).map(k=>'sofa-set-'+k).sort());
  assert.ok(set.colliders.every(c=>obstacles.includes(c)&&c.houseId===set.home.id&&c.homeId===set.home.id));
}
// Walk in through the front door to the rear wall, the garage side and the sofa itself.
for(const set of sofas.sets.filter((s,i)=>i<3||s.home.heading!==0)){
  const home=set.home,point=(x,z)=>communityPoint(home,x,z);
  const blocked=(x,z)=>obstacles.some(o=>o.homeId===home.id&&!o.vehicleOnly&&houseObstacleBlocks({...o,houseId:home.id},x,z,.3));
  const valid=(x,z)=>Math.abs(x-home.x)<home.w/2-.2&&Math.abs(z-home.z)<home.d/2-.2&&!blocked(x,z),scale=4;
  const from=point(home.w*.2,home.d/2-.45);assert.ok(valid(from.x,from.z),'entry is clear in '+home.id);
  const seat=set.place.pieces.find(p=>p.id==='coffee-table');
  for(const [name,target] of [['rear',point(home.w*.2,-home.d/2+.9)],['garage side',point(-home.w*.3,0)],['beside the coffee table',point(seat.x-seat.w/2-.5,seat.z)]]){
    assert.ok(valid(target.x,target.z),name+' is open in '+home.id);
    const path=localWalkPath({x:from.x*scale,z:from.z*scale},{x:target.x*scale,z:target.z*scale},(x,z)=>valid(x/scale,z/scale))?.map(p=>({x:p.x/scale,z:p.z/scale}));
    assert.ok(path&&path.slice(1).every((p,i)=>lineClear(path[i],p,valid)),'walk from the door to the '+name+' in '+home.id);
  }
  const sofa=set.colliders.find(c=>c.fixtureId==='sofa-set-sectional');assert.equal(blocked((sofa.minX+sofa.maxX)/2,(sofa.minZ+sofa.maxZ)/2),true,'the sectional is solid');
}
// Models install once into every set; only nearby sets draw.
const source=new THREE.Group();source.add(new THREE.Mesh(new THREE.BoxGeometry(1,1,1),m(0xffffff)));
community.update(1/60,{x:0,y:0,z:0});assert.ok(sofas.sets.every(s=>!s.group.visible),'hidden before the model arrives');
sofas.install(source);assert.equal(sofas.installed,true);assert.ok(sofas.sets.every(s=>s.group.children.length===1));
assert.equal(sofas.sets[0].group.children[0].children[0].geometry,source.children[0].geometry,'clones share geometry');
const near=sofas.sets[0].center;community.update(1/60,{x:near.x,y:.3,z:near.z});
assert.equal(sofas.sets[0].group.visible,true);assert.ok(sofas.sets.filter(s=>s.group.visible).length<sofas.count,'far sets are hidden');
assert.ok(Math.abs(sofas.sets[0].group.position.y-SOFA_FLOOR)<1e-9);

// Game wiring: the set streams through the KTX2-aware GLTF loader.
const index=await readFile(file('index.html'),'utf8');
assert.match(index,/import \{SOFA_SET_URL\} from "\.\/assets\/sofa-sets\.js"/);assert.match(index,/setKTX2Loader\(loader\)\.loadAsync\(SOFA_SET_URL\);sofas\.install\(gltf\.scene\)/);
console.log('Sofa sets passed: '+sofas.count+' homes, measured colliders, reachable rooms, streamed shared models and distance culling.');
