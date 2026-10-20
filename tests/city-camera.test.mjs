import assert from 'node:assert/strict';
import * as THREE from 'three';
import {restoreCamera,cameraDistance,cameraFieldOfView,cameraTerrainLimit,cameraSegmentHit,createCameraWorld,createCameraRig} from '../assets/city-camera.js';
import {cameraArchitectureBoxes} from '../assets/camera-geometry.js';
const wall={minX:-3,maxX:3,minY:0,maxY:5,minZ:-3,maxZ:-2.8},anchor={x:0,y:1.3,z:0},desired={x:0,y:2.6,z:-6};
const world=createCameraWorld([wall]),safe=world.resolve(anchor,desired);assert(safe.occluded);assert(safe.z>-2.58,'Camera sphere stays on the near side of a thin wall');assert.equal(cameraSegmentHit(anchor,safe,wall),null);assert.equal(world.resolve(anchor,{x:0,y:2,z:6}).occluded,false);
const low={...wall,maxY:.6};assert.equal(createCameraWorld([low]).resolve(anchor,desired).occluded,false,'Low furniture does not become an infinite wall');
const doors=[{...wall,maxX:-1},{...wall,minX:1}];assert.equal(createCameraWorld(doors).resolve(anchor,desired).occluded,false,'Open door gap remains open');assert(createCameraWorld(doors).resolve({x:2,y:1.3,z:0},{x:2,y:2.6,z:-6}).occluded);
const rig=createCameraRig(world.resolve);rig.update(anchor,{x:0,y:2.6,z:6},.04);for(let i=0;i<200;i++){const angle=i*.05,pose=rig.update(anchor,{x:Math.sin(angle)*6,y:2.6,z:Math.cos(angle)*6},i%2?.016:.04);assert.equal(cameraSegmentHit(anchor,pose,wall),null,'Smoothed orbit never crosses the obstruction');}
let near=rig.update(anchor,desired,.04);world.rebuild([]);const release=rig.update(anchor,desired,.04);assert(Math.abs(release.z-desired.z)>0,'Obstruction release eases back instead of snapping');for(let i=0;i<200;i++)near=rig.update(anchor,desired,.04);assert(Math.abs(near.z-desired.z)<.001);
const teleported=rig.update({x:100,y:20,z:100},{x:100,y:22,z:94},.04);assert.equal(teleported.x,100);assert.equal(teleported.z,94,'Teleports do not drag the camera across the city');
const room={minX:98,maxX:102,minZ:98,maxZ:102,ceiling:23};const indoor=rig.update({x:100,y:21.1,z:100},{x:108,y:30,z:90},.04,{room});assert(indoor.x<=101.78&&indoor.z>=98.22&&indoor.y<=22.7);
assert.deepEqual(restoreCamera({motion:'invalid',distance:'invalid'}),{motion:'steady',distance:'standard'});assert(cameraDistance({distance:'close'})<1);assert(cameraFieldOfView(.5,0,restoreCamera())>cameraFieldOfView(1.5,0,restoreCamera()));assert.equal(cameraFieldOfView(1.5,25,restoreCamera()),64);assert.equal(cameraFieldOfView(1.5,100,{motion:'cinematic'}),70);
const scene=new THREE.Scene(),solid=new THREE.Mesh(new THREE.BoxGeometry(4,3,.15),new THREE.MeshBasicMaterial());solid.position.set(2,1.5,-3);scene.add(solid);const rider=new THREE.Group();rider.userData.character={};rider.add(solid.clone());scene.add(rider);const fleet=new THREE.Group();fleet.userData.vehicleId='car';fleet.add(solid.clone());scene.add(fleet);const boxes=cameraArchitectureBoxes(scene);assert.equal(boxes.length,1,'People and vehicles cannot create self-occlusion');assert.equal(boxes[0].minX,0);assert.equal(boxes[0].maxY,3);solid.position.x=200;assert.equal(boxes[0].minX,0,'Snapshot survives later source mesh changes/batching');
console.log('Camera passed: thin walls, doorway gaps, real mesh heights, orbit safety, eased release, teleports, room ceilings, portrait framing, preferences and dynamic-actor exclusion.');

const hill=cameraTerrainLimit({x:0,y:2,z:0},{x:6,y:2,z:0},x=>x>3?3:0);assert(hill.x<=3&&hill.occluded,'Rising terrain cannot swallow the camera');assert.equal(cameraTerrainLimit(anchor,desired,()=>0).occluded,undefined);

const nearWall={x:0,y:1.3,z:-2.59};assert.equal(cameraSegmentHit(nearWall,{x:0,y:2,z:0},wall),null,'An anchor touching the expanded wall can move away');assert.equal(cameraSegmentHit(nearWall,{x:0,y:2,z:-6},wall),0,'An anchor touching the wall cannot pass through to its far side');
