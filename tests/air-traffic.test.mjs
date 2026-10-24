import assert from 'node:assert/strict';
import {readFile,stat} from 'node:fs/promises';
import * as THREE from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {MeshoptDecoder} from 'three/addons/libs/meshopt_decoder.module.js';
import {AIRPLANE_FLEET} from '../assets/airplanes/fleet.js';
import {FLYOVER_INTERVAL,FLIGHT,planFlight,flightPosition,createAirTraffic} from '../assets/air-traffic.js';
import {TOWERS} from '../assets/world-rules.js';

const file=p=>new URL('../'+p,import.meta.url);
// Fleet: four planes in fictional liveries, small compressed models, nose along +Z.
assert.equal(AIRPLANE_FLEET.length,4);assert.deepEqual(AIRPLANE_FLEET.map(p=>p.name),['Maple Air','Sunshore Airways','Northstar Air','Ronda Skyways']);
const realBrands=/emirates|american|qatar|\blot\b|hk ?express|oneworld|dreamliner/i;
assert.ok(!realBrands.test(await readFile(file('assets/airplanes/fleet.js'),'utf8')),'no real airline names in the fleet data');
const loader=new GLTFLoader().setMeshoptDecoder(MeshoptDecoder);
for(const plane of AIRPLANE_FLEET){const bytes=await readFile(file(plane.url.slice(2)));assert.ok(bytes.length<400e3,plane.id+' under 400 KB');
  const json=JSON.parse(bytes.subarray(20,20+bytes.readUInt32LE(12)).toString('utf8'));assert.ok(!json.images&&!json.textures,'no logo images');assert.ok(json.extensionsUsed.includes('EXT_meshopt_compression'));
  assert.ok(!realBrands.test(JSON.stringify(json)),plane.id+' carries no airline names');assert.ok(plane.triangles>4000&&plane.triangles<=15000,plane.id+' triangles '+plane.triangles);
  const gltf=await new Promise((ok,fail)=>loader.parse(bytes.buffer.slice(bytes.byteOffset,bytes.byteOffset+bytes.byteLength),'',ok,fail));
  const box=new THREE.Box3().setFromObject(gltf.scene),size=box.getSize(new THREE.Vector3());let colours=0;gltf.scene.traverse(c=>{if(c.isMesh)colours+=c.geometry.attributes.color?1:0;});assert.equal(colours,1);
  assert.ok(Math.abs(size.z-plane.length)<.3&&Math.abs(size.x-plane.span)<.3,plane.id+' nose along +Z, wings along X');assert.ok(box.max.z>-box.min.z*.8,'nose forward of centre');
  assert.ok(plane.lights.left[0]>0&&plane.lights.right[0]<0&&plane.lights.tail[2]<0,'red left (+X), green right (-X), white tail');}
assert.ok(AIRPLANE_FLEET[0].span<AIRPLANE_FLEET[3].span,'smallest to largest');

// Flight plans: pass beside the player, high above the tallest tower, inside the view range.
let seed=7;const random=()=>(seed=(seed*16807)%2147483647)/2147483647;
const tallest=Math.max(...TOWERS.map(t=>t.height),326);
for(let i=0;i<200;i++){const at={x:(random()-.5)*2000,z:(random()-.5)*3000},f=planFlight(at,random);
  const start=flightPosition(f,0),mid=flightPosition(f,f.duration/2),end=flightPosition(f,f.duration);
  assert.ok(Math.abs(Math.hypot(mid.x-at.x,mid.z-at.z)-f.offset)<1e-6&&f.offset>=FLIGHT.minOffset&&f.offset<=FLIGHT.maxOffset,'passes to one side');
  assert.ok(start.y>=FLIGHT.minAltitude&&start.y>tallest+10&&end.y>start.y&&end.y<700,'climbs gently, well above the skyline');
  for(const p of [start,end])assert.ok(Math.hypot(p.x-at.x,p.y,p.z-at.z)<2600,'starts and ends inside the camera range');
  assert.ok(Math.abs(f.duration-2*FLIGHT.reach/FLIGHT.speed)<1e-9&&f.duration>45&&f.duration<75);}

// Timer: ten minutes of play, paused time does not count, one plane at a time, fleet rotates.
const scene=new THREE.Scene(),seen=[],source=()=>{const g=new THREE.Group();g.add(new THREE.Mesh(new THREE.BoxGeometry(30,4,30),new THREE.MeshStandardMaterial()));return g;};
const air=createAirTraffic({scene,random,loadModel:async()=>source(),onFlyover:p=>seen.push(p.id)}),at={x:0,z:-120};
assert.equal(FLYOVER_INTERVAL,600);
for(let i=0;i<5990;i++)air.update(.1,{position:at});assert.equal(air.state.flights,0);assert.ok(air.nextIn<1.01);
for(let i=0;i<10000;i++)air.update(0,{position:at});assert.equal(air.state.flights,0,'paused time does not count');
air.update(.25,{position:at});air.update(.25,{position:at});air.update(.25,{position:at});air.update(.25,{position:at});air.update(.25,{position:at});await new Promise(r=>setTimeout(r,0));assert.equal(air.state.flights,1);assert.deepEqual(seen,['maple-air']);
const plane=air.state.active.object;assert.ok(air.group.children.includes(plane));assert.equal(air.nextIn,null);
const s=air.sound({position:new THREE.Vector3(at.x,1.7,at.z),matrixWorldInverse:new THREE.Matrix4()});assert.ok(s.level>=0&&s.level<=1&&Math.abs(s.pan)<=1);
let near=0;const span=air.state.active.duration;for(let t=0;t<span+1;t+=.25){air.update(.25,{position:at});if(air.state.active){const d=plane.position.distanceTo(new THREE.Vector3(at.x,0,at.z));near=Math.max(near,air.sound({position:new THREE.Vector3(at.x,1.7,at.z),matrixWorldInverse:new THREE.Matrix4()}).level);assert.ok(d>FLIGHT.minAltitude-1);}}
assert.equal(air.state.active,null);assert.ok(!air.group.children.includes(plane),'the plane leaves the scene');assert.ok(near>.2,'loudest when passing');
assert.ok(plane.userData.lights.beacon&&plane.userData.lights.strobe,'navigation lights');
for(let i=0;i<6000;i++)air.update(.1,{position:at});await new Promise(r=>setTimeout(r,0));assert.deepEqual(seen,['maple-air','sunshore-airways'],'next plane in the fleet');
assert.equal(air.sound(null).level,0);
// A failed download is skipped, not fatal.
const broken=createAirTraffic({scene:new THREE.Scene(),interval:1,loadModel:async()=>{throw new Error('offline')}}),warn=console.warn;console.warn=()=>{};
for(let i=0;i<5;i++)broken.update(.25,{position:at});await new Promise(r=>setTimeout(r,0));console.warn=warn;assert.equal(broken.state.failures,1);assert.equal(broken.state.active,null);

// Game wiring: play-time updates, a kid-friendly notice and the engine sound.
const index=await readFile(file('index.html'),'utf8'),audio=await readFile(file('assets/city-audio.js'),'utf8');
assert.match(index,/const airTraffic=createAirTraffic\(\{scene,onFlyover:plane=>notify\('Look up! A '\+plane\.name\+' jet is flying over the city\.'\)\}\);/);
assert.match(index,/airTraffic\.update\(dt,\{position:player\.position\}\)/);assert.match(index,/aircraft:airTraffic\.sound\(camera\)/);
assert.match(audio,/aircraft:loop\('ambience','noise',420,true\)/);assert.match(audio,/s\.aircraft/);
console.log('Air traffic passed: four fictional-livery airliners, flights every 10 minutes of play, high safe paths, lights, sound and wiring.');
