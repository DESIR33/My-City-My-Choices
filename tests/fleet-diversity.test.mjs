import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {gunzipSync} from 'node:zlib';
import vm from 'node:vm';
import * as THREE from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {MeshoptDecoder} from 'three/addons/libs/meshopt_decoder.module.js';
import {OBJLoader} from 'three/addons/loaders/OBJLoader.js';
import {MTLLoader} from 'three/addons/loaders/MTLLoader.js';
import {civilianAppearance,availableFleetModel,FLEET_PAINTS} from '../assets/vehicle-fleet.js';
import {prepareVehicleTemplate,mountVehicle,updateVehicleVisual} from '../assets/vehicles.js';
import {preparePremiumVehicleTemplate,updateVehicleDetail,setVehicleEnvironment} from '../assets/premium-vehicles.js';

const lineup=Array.from({length:50},(_,i)=>civilianAppearance(i));
assert.deepEqual(lineup.reduce((a,v)=>(a[v.modelId]=(a[v.modelId]||0)+1,a),{}),{mustang:20,gls:20,senna:10});
assert.equal(new Set(lineup.map(v=>v.brand)).size,3);
assert.equal(new Set(lineup.map(v=>v.color)).size,12);
for(const id of ['mustang','gls','senna'])assert.ok(new Set(lineup.filter(v=>v.modelId===id).map(v=>v.color)).size>=5,'Every model has several actual body colors');
for(let i=1;i<lineup.length;i++) {
  assert.notEqual(lineup[i].modelId,lineup[i-1].modelId,'Consecutive civilian slots do not all become the same model');
  assert.notEqual(lineup[i].color,lineup[i-1].color,'Neighboring slots use visibly different paint');
}
for(const start of [0,17,23,35])assert.equal(new Set(lineup.slice(start,start+8).map(v=>v.modelId)).size,3,'Parked cars, local traffic, and the north district each include all three models');
assert.deepEqual(Array.from({length:50},(_,i)=>civilianAppearance(i)),lineup,'Reloading retains the same vehicle identities');
assert.equal(new Set(FLEET_PAINTS.map(v=>v.color)).size,12);
assert.deepEqual(civilianAppearance(NaN),civilianAppearance(0));

const templates=new Map();
for(const id of ['gls','senna']) {
  const b=gunzipSync(await readFile(new URL('../assets/vehicles/'+id+'.glb.gz',import.meta.url)));
  const gltf=await new GLTFLoader().setMeshoptDecoder(MeshoptDecoder).parseAsync(b.buffer.slice(b.byteOffset,b.byteOffset+b.byteLength),'');
  templates.set(id,preparePremiumVehicleTemplate(gltf.scene,id));
}
const mtl=new MTLLoader().parse(await readFile(new URL('../assets/MapleStreetMustang.mtl',import.meta.url),'utf8'),'');mtl.preload();
const mustang=prepareVehicleTemplate(new OBJLoader().setMaterials(mtl).parse(gunzipSync(await readFile(new URL('../assets/maple-mustang.obj.gz',import.meta.url))).toString()));
templates.set('mustang',mustang);
const refs=lineup.map((appearance,i)=>{
  const group=new THREE.Group();group.position.set((i%5)*9,0,Math.floor(i/5)*12);
  group.userData={fleetAppearance:appearance,vehicleId:'civilian-'+i,disabled:i===8};
  mountVehicle(group,mustang,appearance.color,i);return{group,color:appearance.color};
});
// Insert police between districts: their IDs must not change civilian model
// assignments, and the premium pass must not repaint or replace their rig.
const police=new THREE.Group();police.userData.policeVehicle={active:true};police.userData.vehicleId='police';mountVehicle(police,mustang,0x17212b);
const policeRig=police.userData.vehicleVisual.rig,policePaint=police.userData.vehicleVisual.paint.color.getHex();
refs.splice(23,0,{group:police,color:policePaint});
const owned=refs[0];owned.color=0x326d8c;owned.group.userData.vehicleVisual.paint.color.setHex(owned.color);
const position=refs[3].group.position.clone();refs[3].group.rotation.y=.6;
const html=await readFile(new URL('../index.html',import.meta.url),'utf8');
const source=html.slice(html.indexOf('async function loadPremiumCars(){'),html.indexOf('loadDetailedCars().then(loadPremiumCars)'));
let captured=0;
const camera=new THREE.PerspectiveCamera();camera.position.set(0,3,0);
const context={civilianAppearance,availableFleetModel,mustangTemplate:mustang,loadPremiumVehicleTemplates:async()=>new Map([...templates].filter(([key])=>key!=='mustang')),
  mountVehicle,updateVehicleVisual,updateVehicleDetail,setVehicleEnvironment,vehicleRefs:refs,camera,mobileGraphics:false,
  driving:refs[3].group,vehicleState:{wheelTravel:4,steering:.2,brake:1},player:{position:new THREE.Vector3()},console,
  visualKit:{contactShadow:()=>new THREE.Group(),captureVehicleEnvironment:()=>{captured++;return new THREE.Texture();}},
  window:{},setTimeout:fn=>fn()};
vm.createContext(context);vm.runInContext(source+';window.loadFleet=loadPremiumCars;',context);
await context.window.loadFleet();
const civilians=refs.filter(r=>r!==refs.find(r=>r.group===police));
assert.deepEqual(civilians.reduce((a,r)=>(a[r.group.userData.vehicleVisual.modelId]=(a[r.group.userData.vehicleVisual.modelId]||0)+1,a),{}),{mustang:20,gls:20,senna:10},'The shipped loader retains Ford cars instead of overwriting all of them with Mercedes');
assert.equal(police.userData.vehicleVisual.rig,policeRig);assert.equal(police.userData.vehicleVisual.paint.color.getHex(),policePaint);
assert.equal(owned.group.userData.vehicleVisual.paint.color.getHex(),owned.color,'Saved ownership paint is not replaced by the traffic palette');
assert.equal(refs[3].group.position.distanceTo(position),0);assert.equal(refs[3].group.rotation.y,.6);
assert.equal(refs[3].group.userData.vehicleVisual.brakeMaterial.emissiveIntensity,2.6,'Driving input survives the model update');
assert.ok(refs[3].group.userData.vehicleVisual.wheels.every(w=>w.spin.rotation.x>0));
assert.equal(captured,1);assert.ok(civilians.every(r=>r.group.userData.vehicleVisual.paint.envMap),'Every brand gets the city reflections');
for(const ref of civilians) {
  const data=ref.group.userData.vehicleVisual;
  assert.equal(data.paint.color.getHex(),ref.color);
  let paintedMeshes=0;
  data.rig.traverse(o=>{if(o.isMesh&&[].concat(o.material).includes(data.paint))paintedMeshes++;});
  assert.ok(paintedMeshes>0,'The selected color reaches the actual rendered body panels');
}
const a=civilians[1].group.userData.vehicleVisual,b=civilians[3].group.userData.vehicleVisual;
assert.equal(a.modelId,'gls');assert.equal(b.modelId,'gls');assert.notEqual(a.paint,b.paint);
const otherColor=b.paint.color.getHex();a.paint.color.setHex(0xeeee00);assert.equal(b.paint.color.getHex(),otherColor,'Repainting one car cannot recolor the whole model fleet');a.paint.color.setHex(civilians[1].color);
for(const mobile of [false,true]) {
  updateVehicleDetail(refs,camera,{mobile,focusVehicle:refs[3].group});
  const premium=civilians.filter(r=>r.group.userData.vehicleVisual.kind==='premium');
  assert.ok(premium.filter(r=>r.group.userData.vehicleVisual.activeLevel===0).length<=(mobile?2:4));
  assert.ok(premium.filter(r=>r.group.userData.vehicleVisual.activeLevel===1).length<=(mobile?5:10));
}
// A missing download must not turn the entire fleet into whichever premium
// asset happened to load. The existing Ford remains part of the mix.
for(const loaded of [new Map([['gls',templates.get('gls')]]),new Map([['senna',templates.get('senna')]]),new Map()]) {
  const available=new Map(loaded);available.set('mustang',mustang);
  assert.ok(new Set(lineup.map(a=>availableFleetModel(a,available))).size===(loaded.size?2:1));
}
assert.equal(availableFleetModel(lineup[0],new Map()),null);
assert.equal(civilians[8].group.userData.disabled,true,'Disabled/crashed cars remain disabled after their model changes');
console.log('Fleet diversity passed: 50 actual civilian vehicles, 3 brands, 12 body colors, all three districts, real loader integration, owned paint, police livery, independent materials, wheel/brake states, premium detail budgets, and partial-download fallback.');
