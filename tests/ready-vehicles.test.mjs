import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {gunzipSync} from 'node:zlib';
import * as THREE from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {MeshoptDecoder} from 'three/addons/libs/meshopt_decoder.module.js';
import {preparePremiumVehicleTemplate,loadPremiumVehicleTemplates} from '../assets/premium-vehicles.js';
import {mountVehicle,updateVehicleVisual} from '../assets/vehicles.js';
const ready=new Map(),original=new Map();
const parse=async bytes=>{const b=gunzipSync(bytes);return (await new GLTFLoader().setMeshoptDecoder(MeshoptDecoder).parseAsync(b.buffer.slice(b.byteOffset,b.byteOffset+b.byteLength),'')).scene;};
const meshes=root=>{const list=[];root.traverse(o=>{if(o.isMesh)list.push(o);});return list;};
function sameSurface(a,b){
  assert.equal(a.index?.count||a.attributes.position.count,b.index?.count||b.attributes.position.count);
  assert.deepEqual(Object.keys(a.attributes).sort(),Object.keys(b.attributes).sort());
  for(const key of Object.keys(a.attributes)){
    const x=a.attributes[key],y=b.attributes[key];assert.equal(x.itemSize,y.itemSize);
    const count=a.index?.count||x.count;
    for(let k=0;k<count;k++){
      const i=a.index?a.index.getX(k):k,j=b.index?b.index.getX(k):k;
      for(let c=0;c<x.itemSize;c++){
        const fn=['getX','getY','getZ','getW'][c];
        assert.ok(Math.abs(x[fn](i)-y[fn](j))<1e-6,'prepared '+key+' preserves each rendered triangle');
      }
    }
  }
}
for(const mobile of [false,true])for(const id of ['gls','senna']){
  const key=id+(mobile?'-mobile':''),oldBytes=await readFile(new URL('../assets/vehicles/'+key+'.glb.gz',import.meta.url)),bytes=await readFile(new URL('../assets/vehicles/'+key+'-ready.glb.gz',import.meta.url));
  ready.set(key,bytes);original.set(key,oldBytes);assert.ok(bytes.length<oldBytes.length+(mobile?3000:450000),'prepared download overhead is bounded');
  const oldScene=await parse(oldBytes),old=preparePremiumVehicleTemplate(oldScene,id,{mobile});mountVehicle(new THREE.Group(),old,0x215fbd);
  const scene=await parse(bytes);assert.equal(scene.userData.vehiclePreparation.version,1);
  if(mobile)assert.equal(scene.getObjectByName('near_body'),undefined,'no new maximum-detail geometry on phones');
  const oldNormals=THREE.BufferGeometry.prototype.computeVertexNormals,oldRay=THREE.Raycaster.prototype.intersectObject;
  let template,car=new THREE.Group();car.userData={vehicleId:'owned',disabled:true};
  try{
    THREE.BufferGeometry.prototype.computeVertexNormals=()=>{throw new Error('No gameplay normal preparation');};
    THREE.Raycaster.prototype.intersectObject=()=>{throw new Error('No gameplay lamp projection');};
    template=preparePremiumVehicleTemplate(scene,id,{mobile,requirePrepared:true});mountVehicle(car,template,0x215fbd);
  }finally{THREE.BufferGeometry.prototype.computeVertexNormals=oldNormals;THREE.Raycaster.prototype.intersectObject=oldRay;}
  assert.deepEqual([...template.materials.keys()],[...old.materials.keys()]);
  for(const [key,m] of template.materials)for(const prop of ['type','metalness','roughness','transparent','opacity'])assert.equal(m[prop],old.materials.get(key)[prop],'material role '+key+' '+prop);
  for(let l=0;l<3;l++){
    const a=template.levels[l],b=old.levels[l];
    for(let i=0;i<4;i++){assert.ok(a.wheels[i].center.distanceTo(b.wheels[i].center)<1e-7);assert.equal(a.wheels[i].radius,b.wheels[i].radius);}
    const left=[...meshes(a.body),...a.wheels.flatMap(w=>meshes(w.source))],right=[...meshes(b.body),...b.wheels.flatMap(w=>meshes(w.source))];assert.equal(left.length,right.length);
    for(let i=0;i<left.length;i++){sameSurface(left[i].geometry,right[i].geometry);assert.deepEqual(left[i].matrixWorld.elements,right[i].matrixWorld.elements);}
  }
  for(const key of ['reverse','hazard']){assert.equal(!!template.auxiliary[key],!!old.auxiliary[key]);if(old.auxiliary[key])sameSurface(template.auxiliary[key],old.auxiliary[key]);}
  updateVehicleVisual(car,{wheelTravel:4,steering:.2,brake:1,gear:'R'},.04);assert.equal(car.userData.vehicleId,'owned');assert.equal(car.userData.disabled,true);assert.equal(car.userData.vehicleVisual.paint.color.getHex(),0x215fbd);assert.equal(car.userData.vehicleVisual.reverseMaterial.emissiveIntensity,1.4);assert.ok(car.userData.vehicleVisual.wheels.every(w=>w.spin.rotation.x>0));
  assert.throws(()=>preparePremiumVehicleTemplate(oldScene,id,{mobile,requirePrepared:true}),'runtime refuses an unprepared file rather than rebuilding it');
  console.log(key,'prepared bytes',bytes.length,'vs',oldBytes.length,'original; surfaces, normals, lamp placement and wheel transforms preserved');
}
const oldFetch=globalThis.fetch,oldWarn=console.warn;
try{
  console.warn=()=>{};
  for(const mobile of [false,true]){
    let active=0,peak=0;const events=[];
    globalThis.fetch=async url=>{const key=String(url).split('/').at(-1).replace('-ready.glb.gz','');events.push(key);active++;peak=Math.max(peak,active);await new Promise(r=>setTimeout(r,2));active--;return new Response(ready.get(key));};
    const templates=await loadPremiumVehicleTemplates(new URL('https://vehicles.invalid/'),{mobile,yieldFrame:async()=>{events.push('frame');}});
    assert.equal(templates.size,2);assert.equal(peak,1);assert.deepEqual(events,[mobile?'senna-mobile':'senna','frame',mobile?'gls-mobile':'gls','frame']);
  }
  globalThis.fetch=async url=>new Response(original.get(String(url).includes('senna')?'senna':'gls'));
  assert.equal((await loadPremiumVehicleTemplates(new URL('https://vehicles.invalid/'))).size,0,'legacy files do not reintroduce heavy runtime preparation');
}finally{globalThis.fetch=oldFetch;console.warn=oldWarn;}
console.log('Ready vehicles passed: prepared geometry/lights, all device/detail levels, guarded runtime path, serial assets with frame opportunities and legacy-file fallback.');
