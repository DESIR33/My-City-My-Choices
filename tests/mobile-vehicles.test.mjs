import assert from 'node:assert/strict';
import test from 'node:test';
import {readFile} from 'node:fs/promises';
import {gunzipSync} from 'node:zlib';
import * as THREE from 'three';
import {MeshoptDecoder} from 'three/addons/libs/meshopt_decoder.module.js';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {createMobileFleet,loadPremiumVehicleTemplates,preparePremiumVehicleTemplate,updateVehicleDetail} from '../assets/premium-vehicles.js';
import {mountVehicle,updateVehicleVisual} from '../assets/vehicles.js';
import {VEHICLE} from '../assets/vehicle-physics.js';
import {civilianAppearance} from '../assets/vehicle-fleet.js';
const assets=new Map();
const triangles=root=>{let n=0;root.traverse(o=>{if(o.isMesh)n+=(o.geometry.index?.count||o.geometry.attributes.position.count)/3;});return n;};
for(const id of ['senna','gls']){
 const compressed=await readFile(new URL('../assets/vehicles/'+id+'-mobile.glb.gz',import.meta.url));assets.set(id,await readFile(new URL('../assets/vehicles/'+id+'-mobile-ready.glb.gz',import.meta.url)));
 const original=await readFile(new URL('../assets/vehicles/'+id+'.glb.gz',import.meta.url));assert.ok(compressed.length<original.length*.62);
 const bytes=gunzipSync(compressed),gltf=await new GLTFLoader().parseAsync(bytes.buffer.slice(bytes.byteOffset,bytes.byteOffset+bytes.byteLength),'');
 const fullBytes=gunzipSync(original),full=await new GLTFLoader().setMeshoptDecoder(MeshoptDecoder).parseAsync(fullBytes.buffer.slice(fullBytes.byteOffset,fullBytes.byteOffset+fullBytes.byteLength),'');
 for(const level of ['mid','far'])for(const part of ['body','LF','RF','LR','RR'])assert.equal(triangles(gltf.scene.getObjectByName(level+'_'+part)),triangles(full.scene.getObjectByName(level+'_'+part)),'Compact export retains every authored medium/distant triangle');
 assert.equal(gltf.scene.getObjectByName('near_body'),undefined,'Phones never download/decode the highest detail');
 const template=preparePremiumVehicleTemplate(gltf.scene,id,{mobile:true}),car=new THREE.Group();car.userData.vehicleId='owned';car.userData.disabled=true;
 mountVehicle(car,template,0xc92d39);const data=car.userData.vehicleVisual;
 assert.equal(car.userData.vehicleId,'owned');assert.equal(car.userData.disabled,true);assert.equal(data.mobile,true);assert.equal(data.paint.isMeshPhysicalMaterial,undefined);assert.equal(data.paint.color.getHex(),0xc92d39);
 assert.ok(template.size.x<=VEHICLE.width+.015&&template.size.z<=VEHICLE.length+.015);
 for(const level of template.levels)for(const wheel of level.wheels)assert.ok(Math.abs(wheel.center.y-wheel.radius-.061)<.012,'Compact wheels retain road contact and their authored centers');
 const geometries=new Set();for(const level of template.levels){level.body.traverse(o=>{if(o.isMesh)geometries.add(o.geometry);});for(const w of level.wheels)w.source.traverse(o=>{if(o.isMesh)geometries.add(o.geometry);});}
 let memory=0;for(const g of geometries){for(const a of Object.values(g.attributes))memory+=a.array.byteLength;memory+=g.index?.array.byteLength||0;}assert.ok(memory<2200000,'Unique geometry buffer bytes stay bounded');
 const refs=Array.from({length:12},(_,i)=>{const group=new THREE.Group();mountVehicle(group,template,0x215fbd);group.position.z=i*2;return{group};}),camera=new THREE.PerspectiveCamera();camera.position.z=-3;
 const shared=new Set();for(const {group} of refs)group.traverse(o=>{if(o.isMesh)shared.add(o.geometry);});assert.ok(shared.size<=geometries.size+2,'Fleet shares authored buffers; extra geometry is the two auxiliary lamp planes');
 for(let i=0;i<40;i++){const focus=refs[i%refs.length].group;updateVehicleDetail(refs,camera,{mobile:true,focusVehicle:focus});updateVehicleVisual(focus,{steering:.2,wheelTravel:4,gear:'R',brake:1},.04);assert.equal(focus.userData.vehicleVisual.activeLevel,1);assert.ok(refs.every(r=>r.group.userData.vehicleVisual.activeLevel!==0));assert.ok(refs.filter(r=>r.group.userData.vehicleVisual.activeLevel===1).length<=5);assert.ok(focus.userData.vehicleVisual.wheels.every(w=>w.spin.rotation.x>0));}
 console.log(id,'compact geometry bytes',memory);
}
test('Mobile fleet waits for play, loads once, prioritizes the driven car and mounts one nearby vehicle per frame',async()=>{
 let loads=0,mounts=0;const refs=Array.from({length:8},(_,index)=>{const group=new THREE.Group();group.position.z=index*10;group.userData.fleetAppearance=civilianAppearance(index);return{group};});refs[1].group.userData.policeVehicle={};refs.at(-1).group.position.z=500;
 const fleet=createMobileFleet({refs,load:async()=>{loads++;return new Map([['gls',{}],['senna',{}]]);},mount:ref=>{mounts++;ref.group.userData.mounted=true;}}),eye=new THREE.Vector3();
 fleet.update(0,eye);await fleet.ready();assert.equal(loads,0);fleet.update(.04,eye);await fleet.ready();assert.equal(loads,1);assert.equal(mounts,0);
 fleet.update(.04,eye,refs[4].group);assert.equal(mounts,1);assert.ok(refs[4].group.userData.mounted);for(let i=0;i<15;i++)fleet.update(.04,eye);assert.equal(mounts,6);assert.equal(refs[1].group.userData.mounted,undefined);assert.equal(refs.at(-1).group.userData.mounted,undefined);
 fleet.update(.04,new THREE.Vector3(0,0,500));assert.equal(mounts,7);assert.equal(loads,1,'Travel cannot trigger another model load');
});
test('Mobile asset fetches are serial and request only compact files; partial failures preserve available cars',async()=>{
 const old=globalThis.fetch,warn=console.warn;let active=0,peak=0;const urls=[];
 try{console.warn=()=>{};globalThis.fetch=async url=>{active++;peak=Math.max(peak,active);urls.push(String(url));await new Promise(resolve=>setTimeout(resolve,2));active--;const id=String(url).includes('senna')?'senna':'gls';return id==='senna'?new Response('',{status:404}):new Response(assets.get(id));};
  const map=await loadPremiumVehicleTemplates(new URL('https://models.invalid/'),{mobile:true});assert.deepEqual([...map.keys()],['gls']);assert.equal(peak,1);assert.ok(urls.every(u=>u.endsWith('-mobile-ready.glb.gz')));
 }finally{globalThis.fetch=old;console.warn=warn;}
});
