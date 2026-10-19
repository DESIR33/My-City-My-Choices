import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {gunzipSync} from 'node:zlib';
import * as THREE from 'three';
import {OBJLoader} from 'three/addons/loaders/OBJLoader.js';
import {MTLLoader} from 'three/addons/loaders/MTLLoader.js';
import {mountVehicleWheel} from '../assets/vehicle-wheels.js';
import {prepareVehicleTemplate,mountVehicle,updateVehicleVisual} from '../assets/vehicles.js';
import {VEHICLE} from '../assets/vehicle-physics.js';

for(const side of [-1,1]) {
  const rig=new THREE.Group(),center=new THREE.Vector3(side*.832,.388,1.47),wheel=mountVehicleWheel(rig,center);
  rig.updateMatrixWorld(true);
  const tire=wheel.spin.getObjectByName('Wheel tire');tire.geometry.computeBoundingBox();
  const bounds=tire.geometry.boundingBox;
  assert.ok(Math.abs(bounds.max.y-VEHICLE.wheelRadius)<.001,'Tire radius matches the driving simulation');
  assert.ok(center.y+bounds.min.y>.058&&center.y+bounds.min.y<.065,'Tires sit on the road instead of floating or clipping');
  const a=Math.PI/5,ray=new THREE.Raycaster(new THREE.Vector3(center.x+side*.8,center.y+Math.cos(a)*.17,center.z+Math.sin(a)*.17),new THREE.Vector3(-side,0,0));
  const rim=wheel.spin.children.filter(x=>['alloy','lip'].includes(x.userData.wheelPart));
  assert.equal(ray.intersectObjects(rim).length,0,'The alloy has an open spoke gap on both sides of the car');
  assert.ok(ray.intersectObject(wheel.spin.getObjectByName('Wheel rotor')).length>0,'The recessed rotor is visible through the open rim');
  assert.equal(wheel.pivot.getObjectByName('Fixed brake caliper').parent,wheel.pivot,'The brake caliper does not spin with the wheel');
}
const mtl=new MTLLoader().parse(await readFile(new URL('../assets/MapleStreetMustang.mtl',import.meta.url),'utf8'),'');mtl.preload();
const source=new OBJLoader().setMaterials(mtl).parse(gunzipSync(await readFile(new URL('../assets/maple-mustang.obj.gz',import.meta.url))).toString());
const template=prepareVehicleTemplate(source),car=new THREE.Group();mountVehicle(car,template,0x8b423a);
const {wheels,body,brakeMaterial,reverseMaterial}=car.userData.vehicleVisual;
assert.equal(wheels.length,4);
const bodyMesh=body.children[0],glass=bodyMesh.material.find(m=>m.transparent);
assert.ok(glass&&glass.opacity<.9&&!glass.depthWrite,'Smoked windows reveal the cabin without an opaque blue fill');
assert.equal(bodyMesh.geometry.attributes.position.count,bodyMesh.geometry.attributes.normal.count);
updateVehicleVisual(car,{wheelTravel:2,steering:.25,brake:1,gear:'R'},.04);
assert.ok(wheels.every(w=>w.spin.rotation.x>0));assert.ok(wheels.filter(w=>w.front).every(w=>w.pivot.rotation.y>0));
assert.equal(brakeMaterial.emissiveIntensity,2.6);assert.equal(reverseMaterial.emissiveIntensity,1.4);
console.log('Vehicle visuals passed: open rims, recessed brakes, road contact, model import, smoked glazing, steering, wheel rotation and lamp states.');
