import assert from 'node:assert/strict';
import * as THREE from 'three';
import {AIRPORT,NORTH_CITY,SKYVIEW_PATHS,worldDrivable,worldWalkable} from '../assets/world-rules.js';
import {STATIONS,ENTRANCE,stationFrame,stationStairs,stairFoot,metroGroundClear} from '../assets/metro-line.js';
import {createMetroWorld} from '../assets/metro-world.js';
import {createAirportWorld} from '../assets/airport-world.js';
import {vehicleFootprint,rectanglesOverlap} from '../assets/vehicle-physics.js';
import {planCityRoute,createWalkValidator,lineClear} from '../assets/city-navigation.js';
const ctx=new Proxy({},{get:()=>()=>{}});globalThis.document={createElement:()=>({getContext:()=>ctx})};
const scene=new THREE.Scene(),obstacles=[],ground=[],cubes=[];
const grass=new THREE.MeshStandardMaterial({color:0x456f44}),C={grass,walk:grass,road:grass};
const cube=(p,x,y,z,w,h,d,m)=>{const mesh=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),m);mesh.position.set(x,y+h/2,z);p.add(mesh);cubes.push({x,z,w,d,top:y+h});return mesh;};
const airport=createAirportWorld({scene,cube,C,visualKit:{atmosphere:{registerGlow(){}}},obstacles,groundSurfaces:ground});
const metro=createMetroWorld({scene,obstacles,player:{position:new THREE.Vector3()}});
assert.equal(STATIONS[0].at[0],280);assert.ok(STATIONS.slice(0,4).every(s=>s.at[0]>NORTH_CITY.maxX+20),'railway sits beyond downtown roads/buildings');
for(const c of metro.columns)assert.ok(metroGroundClear(c.x,c.z),'pier clears driving/sidewalk/promenade space');
for(const c of metro.streetTotems)assert.ok(metroGroundClear(c.x,c.z,.5,.5),'sign clears public paths '+c.station+' '+c.x+','+c.z);
const allRoads=[];for(const x of NORTH_CITY.avenues)for(const side of [-1,1])for(let z=-1780;z<=-1135;z+=2)allRoads.push({x:x+side*3.5,z,heading:0});
for(const z of NORTH_CITY.streets)for(const side of [-1,1])for(let x=-230;x<=235;x+=2)allRoads.push({x,z:z+side*3.5,heading:Math.PI/2});
for(const side of [-1,1])for(let x=245;x<1248;x+=2)allRoads.push({x,z:AIRPORT.road.z+side*3.5,heading:Math.PI/2});
for(const x of [AIRPORT.loop.west,AIRPORT.loop.east])for(const side of [-1,1])for(let z=-1760;z>-1955;z-=2)allRoads.push({x:x+side*3.1,z,heading:0});
for(const p of allRoads){assert.ok(worldDrivable(p.x,p.z),'drivable rule at '+p.x+','+p.z);const body=vehicleFootprint(p.x,p.z,p.heading);assert.ok(!obstacles.some(o=>(o.maxY??8)>.3&&rectanglesOverlap(body,[{x:o.minX,z:o.minZ},{x:o.maxX,z:o.minZ},{x:o.maxX,z:o.maxZ},{x:o.minX,z:o.maxZ}])), 'road drive clear at '+p.x+','+p.z);}
// The old plaza rectangle covered part of the asphalt. All new low hardscape
// cubes stay outside road lanes, and public paths avoid the landmark supports.
for(const r of SKYVIEW_PATHS){assert.ok(worldWalkable(r.minX,r.minZ));for(let x=r.minX+.6;x<r.maxX;x+=1)for(let z=r.minZ+.6;z<r.maxZ;z+=1){assert.equal(worldDrivable(x,z),false,'paving stays off asphalt');assert.ok(!obstacles.some(o=>o.kind!=='metro-column'&&x>o.minX-.25&&x<o.maxX+.25&&z>o.minZ-.25&&z<o.maxZ+.25),'public path remains clear '+x+','+z);}}
assert.ok(!cubes.some(c=>c.w>240&&c.d>200&&c.top>0&&Math.abs(c.z+1866)<20),'no blanket concrete apron');
assert.equal(airport.skyview.beds.length,6);assert.equal(airport.skyview.benches.length,4);
for(const r of metro.footpaths)assert.equal(worldDrivable((r.minX+r.maxX)/2,(r.minZ+r.maxZ)/2),false,'station paths are separate from roads');
for(const st of STATIONS)for(const s of stationStairs(st)){const F=stationFrame(st),u=s[4]===s[0]?s[1]+1.2:s[0]-1.2,p=F.toWorld(u,(s[2]+s[3])/2);assert.ok(worldWalkable(p.x,p.z),st.id+' stair reaches accessible ground');}
const walkValid=createWalkValidator(obstacles),route=(a,b)=>{const r=planCityRoute(a,b,{mode:'walk',walkValid});assert.ok(r&&r.points.every((p,i)=>!i||lineClear(r.points[i-1],p,walkValid)),'walk route to relocated station');};
route({x:189.3,z:-1260.7},stairFoot(STATIONS[0]));route({x:189.3,z:-1380.7},{x:ENTRANCE.x,z:ENTRANCE.z+7});
console.log('Skyview/rail passed:',allRoads.length,'driving samples; off-road piers/signs, unobstructed stone paths, planted garden, accessible station feet and relocated walking routes.');
