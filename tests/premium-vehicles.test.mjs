import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {gunzipSync} from 'node:zlib';
import * as THREE from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {MeshoptDecoder} from 'three/addons/libs/meshopt_decoder.module.js';
import {preparePremiumVehicleTemplate,loadPremiumVehicleTemplates,updateVehicleDetail,setVehicleEnvironment} from '../assets/premium-vehicles.js';
import {mountVehicle,updateVehicleVisual} from '../assets/vehicles.js';
import {VEHICLE} from '../assets/vehicle-physics.js';

function triangleCount(object) {
  let count=0;object.traverse(o=>{if(o.isMesh)count+=(o.geometry.index?.count||o.geometry.attributes.position.count)/3;});return count;
}
const templates=new Map();
for(const id of ['senna','gls']) {
  const compressed=await readFile(new URL('../assets/vehicles/'+id+'.glb.gz',import.meta.url));
  assert.ok(compressed.length<3*1024*1024,'The shipped download remains bounded');
  const bytes=gunzipSync(compressed);
  const gltf=await new GLTFLoader().setMeshoptDecoder(MeshoptDecoder).parseAsync(bytes.buffer.slice(bytes.byteOffset,bytes.byteOffset+bytes.byteLength),'');
  const template=preparePremiumVehicleTemplate(gltf.scene,id);templates.set(id,template);
  assert.ok(template.size.x<=VEHICLE.width+.015&&template.size.z<=VEHICLE.length+.015,'The asset fits the collision footprint');
  const counts=template.levels.map(level=>triangleCount(level.body)+level.wheels.reduce((n,w)=>n+triangleCount(w.source),0));
  assert.ok(counts[2]<counts[0]*.18&&counts[1]<counts[0]*.4,'Distance levels substantially reduce actual geometry');
  for(const level of template.levels) {
    assert.equal(level.wheels.length,4);
    for(const wheel of level.wheels) {
      assert.ok(Math.abs(wheel.center.y-wheel.radius-.061)<.012,'Each wheel pivots around its tire center, on the road');
      assert.equal(wheel.front,wheel.center.z>0,'The steerable axle faces the game forward direction');
      let rubber=false;wheel.source.traverse(o=>{if(o.isMesh)for(const m of (Array.isArray(o.material)?o.material:[o.material]))if(m.name==='Vehicle_Rubber'){rubber=true;assert.equal(m.metalness,0);}});
      assert.ok(rubber,'Every authored wheel keeps its rubber surface');
    }
  }
  assert.ok(template.materials.get('Glass').transparent&&template.materials.get('Glass').opacity<.6,'Cabins remain visible through the glass');
  const car=new THREE.Group();car.userData.vehicleId='preserved';car.userData.disabled=true;
  mountVehicle(car,template,0x8b2118);assert.equal(car.userData.vehicleId,'preserved');assert.equal(car.userData.disabled,true);
  updateVehicleVisual(car,{wheelTravel:2,steering:.24,brake:1,gear:'R',pitch:.02,roll:.01},.04);
  const data=car.userData.vehicleVisual;
  if(id==='senna')assert.ok(data.levels[0].wheels.every(w=>w.fixedCalipers.length>0&&w.fixedCalipers.every(c=>c.parent===w.pivot)),'The brake calipers remain fixed while the authored wheels spin');
  for(const level of data.levels) {
    assert.ok(level.wheels.every(w=>w.spin.rotation.x>0));
    assert.ok(level.wheels.filter(w=>w.front).every(w=>w.pivot.rotation.y>0));
    assert.ok(level.wheels.filter(w=>!w.front).every(w=>w.pivot.rotation.y===0));
  }
  assert.equal(data.brakeMaterial.emissiveIntensity,2.6);assert.equal(data.reverseMaterial.emissiveIntensity,1.4);
  console.log(id,'triangles per detail level:',counts);
}
const camera=new THREE.PerspectiveCamera();camera.position.set(0,1.6,0);
const refs=Array.from({length:16},(_,i)=>{const group=new THREE.Group();group.position.set(i*.3,0,5+i*.2);mountVehicle(group,templates.get('gls'),0x31474f);return{group};});
for(const mobile of [false,true]) {
  updateVehicleDetail(refs,camera,{mobile,focusVehicle:refs[15].group});
  assert.equal(refs[15].group.userData.vehicleVisual.activeLevel,mobile?1:0,'The driven car uses device-appropriate detail');
  assert.ok(refs.filter(r=>r.group.userData.vehicleVisual.activeLevel===0).length<=(mobile?0:4),'Near detail has a strict device budget');
  assert.ok(refs.filter(r=>r.group.userData.vehicleVisual.activeLevel===1).length<=(mobile?5:10),'Medium detail has a strict device budget');
  for(const {group} of refs)assert.equal(group.userData.vehicleVisual.levels.filter(l=>l.root.visible).length,1);
  if(mobile)for(let i=0;i<100;i++){
    updateVehicleDetail(refs,camera,{mobile,focusVehicle:i%2?refs[i%refs.length].group:null});
    assert.ok(refs.every(r=>r.group.userData.vehicleVisual.activeLevel!==0),'Entry and on-foot travel never expose the heaviest model on phones');
    assert.ok(refs.filter(r=>r.group.userData.vehicleVisual.activeLevel===1).length<=5);
  }
}
camera.position.set(1000,2,1000);updateVehicleDetail(refs,camera);
assert.ok(refs.every(r=>r.group.userData.vehicleVisual.activeLevel===2),'Distant vehicles use the inexpensive silhouette');
const environment=new THREE.Texture();setVehicleEnvironment(refs,templates,environment);
assert.ok(refs.every(r=>r.group.userData.vehicleVisual.paint.envMap===environment),'The city reflection reaches individual paint materials');
const originalFetch=globalThis.fetch,originalWarn=console.warn;
try {
  console.warn=()=>{};
  const senna=await readFile(new URL('../assets/vehicles/senna.glb.gz',import.meta.url));
  globalThis.fetch=async url=>new URL(url).pathname.endsWith('senna.glb.gz')?new Response(senna):new Response('',{status:404});
  const partial=await loadPremiumVehicleTemplates(new URL('https://vehicle-test.invalid/assets/'));
  assert.deepEqual([...partial.keys()],['senna'],'One unavailable model does not discard the other loaded asset');
  globalThis.fetch=async()=>new Response('',{status:503});
  assert.equal((await loadPremiumVehicleTemplates(new URL('https://vehicle-test.invalid/assets/'))).size,0,'Failed asset downloads leave the existing fleet available');
} finally {globalThis.fetch=originalFetch;console.warn=originalWarn;}
console.log('Premium vehicles passed: shipped asset import, footprints, road contact, tire materials, wheel pivots, lamp states, detail budgets and reflections.');
