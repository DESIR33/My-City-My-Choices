import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {gunzipSync} from 'node:zlib';
import vm from 'node:vm';
import * as THREE from 'three';
import {decodeVehicleTemplate} from '../assets/vehicle-template.js';
import {mountVehicle,updateVehicleVisual} from '../assets/vehicles.js';
import {civilianAppearance} from '../assets/vehicle-fleet.js';
const html=await readFile(new URL('../index.html',import.meta.url),'utf8'),compressed=await readFile(new URL('../assets/vehicles/mustang-template.bin.gz',import.meta.url));
const raw=gunzipSync(compressed),buffer=raw.buffer.slice(raw.byteOffset,raw.byteOffset+raw.byteLength);
assert.ok(compressed.length<1_300_000&&raw.length<6_500_000,'prepared download and decoded buffers stay bounded');
for(const bad of [new ArrayBuffer(0),buffer.slice(0,40)])assert.throws(()=>decodeVehicleTemplate(bad));
const version=buffer.slice(0),headSize=new DataView(version).getUint32(0,true),text=new TextDecoder().decode(new Uint8Array(version,4,headSize));
new Uint8Array(version,4,headSize).set(new TextEncoder().encode(text.replace('"version":1','"version":9')));assert.throws(()=>decodeVehicleTemplate(version));
assert.ok(!/OBJLoader|MTLLoader|prepareVehicleTemplate\(/.test(html),'runtime never rebuilds OBJ/welded normals');

const canvas=new Proxy({},{get:()=>()=>{}});globalThis.document={createElement:()=>({getContext:()=>canvas})};
const {addPoliceVehicleDetails}=await import('../assets/police-vehicles.js');
const refs=[0,1,2,4].map(i=>{const group=new THREE.Group(),appearance=civilianAppearance(i);group.userData.fleetAppearance=appearance;group.userData.vehicleId='car-'+i;group.position.set(i*3,0,i*7);mountVehicle(group,null,appearance.color);return {group,color:appearance.color};});
const police=new THREE.Group();mountVehicle(police,null,0x17212b);addPoliceVehicleDetails(police);police.userData.policeVehicle.active=true;refs.push({group:police,color:0x17212b});
const driving=refs[0].group;driving.userData.vehicleVisual.travel=7;const position=driving.position.clone();driving.rotation.y=.6;
const oldPremiumRigs=[refs[1],refs[3]].map(r=>r.group.userData.vehicleVisual.rig);
let frame=0;const installs=[],urls=[],warnings=[];
const context={Response,DecompressionStream,decodeVehicleTemplate,mustangTemplate:null,vehicleRefs:refs,driving,vehicleState:{wheelTravel:4,steering:.2,brake:1,gear:'R'},updateVehicleVisual,addPoliceVehicleDetails,
 fetch:async url=>{urls.push(url);return new Response(compressed);},
 requestAnimationFrame:fn=>{frame++;queueMicrotask(fn);},console:{warn:(...args)=>warnings.push(args)},
 visualKit:{contactShadow:()=>new THREE.Group()},mountVehicle:(...args)=>{installs.push({group:args[0],frame});return mountVehicle(...args);},window:{}};
vm.createContext(context);vm.runInContext(html.slice(html.indexOf('function nextVehicleFrame(){'),html.indexOf('async function loadPremiumCars()'))+';window.loadFord=loadDetailedCars;',context);
await context.window.loadFord();
assert.deepEqual(urls,['assets/vehicles/mustang-template.bin.gz']);assert.equal(warnings.length,0);assert.equal(installs.length,3,'only Ford slots and police get initial Ford mounts');
assert.equal(new Set(installs.map(x=>x.frame)).size,3,'installations yield between cars');
assert.equal(refs[1].group.userData.vehicleVisual.rig,oldPremiumRigs[0]);assert.equal(refs[3].group.userData.vehicleVisual.rig,oldPremiumRigs[1],'do not replace and discard premium-slot rigs');
assert.equal(driving.userData.vehicleVisual.travel,7);assert.equal(driving.userData.vehicleVisual.paint.color.getHex(),refs[0].color);assert.ok(driving.position.equals(position));assert.equal(driving.rotation.y,.6);
assert.equal(driving.userData.vehicleVisual.brakeMaterial.emissiveIntensity,2.6);assert.ok(driving.userData.vehicleVisual.wheels.every(w=>w.spin.rotation.x>0));assert.equal(police.userData.policeVehicle.active,true);
for(const response of [()=>new Response('',{status:404}),()=>new Response(new Uint8Array([1,2,3]))]){
 const rig=driving.userData.vehicleVisual.rig,count=installs.length;context.fetch=async()=>response();await context.window.loadFord();assert.equal(installs.length,count);assert.equal(driving.userData.vehicleVisual.rig,rig,'failed preparation/download keeps current cars');
}
assert.equal(warnings.length,2);
console.log('Prepared vehicle loading passed: bounded binary, malformed data, actual streamed loader, frame-spread Ford/police-only mounts, retained driver/paint/wheel/lamp state and failed-download fallback.');
