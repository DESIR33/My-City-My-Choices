import assert from 'node:assert/strict';
import test from 'node:test';
import * as THREE from 'three';
import {createRondaWorld,RONDA_PLACES as P} from '../assets/ronda-world.js';
import {cameraArchitectureBoxes} from '../assets/camera-geometry.js';
import {createCameraWorld,cameraSegmentHit} from '../assets/city-camera.js';

for(const mobile of [true,false])test('Ronda camera, bridge surfaces and bounded details · '+(mobile?'mobile':'desktop'),()=>{
  const scene=new THREE.Scene(),obstacles=[],world=createRondaWorld({scene,visualKit:{},obstacles,groundSurfaces:[],mobile});
  const boxes=cameraArchitectureBoxes(scene),camera=createCameraWorld(boxes);
  assert.ok(boxes.length>=world.houses.length*2,'Bodies and roofs survive the architecture snapshot');
  const source=new Set(boxes.map(b=>[b.minX,b.maxX,b.minY,b.maxY,b.minZ,b.maxZ].join(',')));
  for(const h of world.houses)assert.ok(source.has([h.x-h.w/2,h.x+h.w/2,0,h.h,h.z-h.d/2,h.z+h.d/2].join(',')),'Every visible house has a body blocker');
  for(const h of world.houses.filter((_,i)=>i%79===0)){
    const a={x:h.x,y:1.4,z:h.z+h.d/2+1},b={x:h.x,y:2,z:h.z},safe=camera.resolve(a,b);
    assert.equal(safe.occluded,true,'Orbit cannot enter a batched house');
    const body={minX:h.x-h.w/2,maxX:h.x+h.w/2,minY:0,maxY:h.h,minZ:h.z-h.d/2,maxZ:h.z+h.d/2};
    assert.equal(cameraSegmentHit(a,safe,body),null,'Resolved orbit ends outside the wall');
  }
  assert.equal(camera.resolve({x:-524,y:1.4,z:1400},{x:-516,y:2.2,z:1400}).occluded,false,'Shared street stays open');
  assert.equal(camera.resolve({x:P.arena.x,y:1.4,z:P.arena.z},{x:P.arena.x+6,y:2,z:P.arena.z}).occluded,false,'Arena courtyard is not filled by one giant camera box');
  for(const bridge of [P.bridge,P.oldBridge]){
    assert.equal(camera.resolve({x:bridge.x,y:1.4,z:1496},{x:bridge.x,y:2.2,z:1504}).occluded,false,'Road between parapets remains open');
    assert.equal(camera.resolve({x:bridge.x,y:.65,z:1500},{x:bridge.x+9,y:.65,z:1500}).occluded,true,'Parapets stop a low orbit');
  }
  // Rendered bridge mass used to rise 1–1.2 m through the y=0 walking surface.
  scene.updateMatrixWorld(true);const mass=[];world.root.traverse(n=>{if(n.geometry?.type==='ExtrudeGeometry')mass.push(n);});
  for(const bridge of [P.bridge,P.oldBridge]){
    const ray=new THREE.Raycaster(new THREE.Vector3(bridge.x,3,bridge.z),new THREE.Vector3(0,-1,0));
    const hit=ray.intersectObjects(mass,false)[0];assert.ok(hit);assert.ok(Math.abs(hit.point.y)<1e-5,'Stone ends at the walking surface instead of swallowing the player');
  }

  assert.ok(world.detailCells.length<=40&&world.detailMeshes.length<=5,'No per-cell draw-call explosion');
  const buffers=world.detailMeshes.map(m=>m.instanceMatrix),versions=()=>world.detailMeshes.map(m=>m.instanceMatrix.version);
  const capacity=world.detailMeshes.reduce((n,m)=>n+m.instanceMatrix.count,0);
  assert.ok(capacity>16000,'Budget measures the real detailed town');
  world.update(.016,{x:-272,z:-204});assert.ok(world.detailMeshes.every(m=>m.count===0),'Distant town facade detail does no instance work');
  const idleVersions=versions();for(let i=0;i<100;i++)world.update(.016,{x:-272,z:-204});assert.deepEqual(versions(),idleVersions,'No idle buffer uploads');
  world.update(.016,{x:-520,z:1400});const visible=world.detailMeshes.reduce((n,m)=>n+m.count,0);
  assert.ok(visible>0&&visible<capacity*(mobile?.7:.9),'Only nearby details are submitted');
  assert.ok(world.batches.every(m=>m.visible&&m.count>0),'Full-distance roofs, bodies and landmarks stay visible');
  for(const mesh of world.detailMeshes){
    const expected=world.detailCells.filter(c=>c.visible).flatMap(c=>c.chunks.filter(k=>k.batch.mesh===mesh));let offset=0;
    for(const chunk of expected){assert.deepEqual(mesh.instanceMatrix.array.subarray(offset,offset+chunk.matrices.length),chunk.matrices,'Packed GPU matrices are the actual selected cells');offset+=chunk.matrices.length;}
    assert.equal(mesh.count*16,offset);
    assert.ok(Number.isFinite(mesh.boundingSphere.radius)&&mesh.boundingSphere.radius>0);
  }
  const nearVersions=versions();for(let i=0;i<100;i++)world.update(.016,{x:-520,z:1400});assert.deepEqual(versions(),nearVersions);
  const cell=world.detailCells[0],midZ=(cell.minZ+cell.maxZ)/2;
  world.update(0,{x:0,z:0});world.update(0,{x:cell.maxX+world.detailRange-1,z:midZ});assert.equal(cell.visible,true);
  world.update(0,{x:cell.maxX+world.detailRange+12,z:midZ});assert.equal(cell.visible,true,'Boundary jitter uses hysteresis');
  world.update(0,{x:cell.maxX+world.detailRange+25,z:midZ});assert.equal(cell.visible,false);
  for(let i=0;i<100;i++){world.update(.016,{x:-520,z:i%2?1400:1700});world.update(.016,{x:0,z:0});}
  world.detailMeshes.forEach((m,i)=>assert.equal(m.instanceMatrix,buffers[i],'Travel reuses allocated buffers'));
  world.update(NaN,{x:Infinity,z:0});assert.ok(world.detailMeshes.every(m=>m.count===0),'Invalid positions cannot expose the entire town');
  assert.equal(cameraArchitectureBoxes(scene).length,boxes.length,'Detail visibility never changes camera geometry');
  console.log(JSON.stringify({mobile,facadeInstances:capacity,nearBridgeInstances:visible,detailDraws:world.detailMeshes.length,cameraBoxes:boxes.length}));
});
