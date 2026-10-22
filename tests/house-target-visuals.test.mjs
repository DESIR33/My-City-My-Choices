import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFile} from 'node:fs/promises';
import * as THREE from 'three';
import {createLandmarkHouse} from '../assets/landmark-house.js';
import {MODEL_HOME as H} from '../assets/house-rules.js';
import {houseTargetPoint,createHouseTargetVisuals} from '../assets/house-target-visuals.js';
import {cameraArchitectureBoxes} from '../assets/camera-geometry.js';

const q=new Proxy({},{get:()=>()=>{}});globalThis.document={createElement:()=>({getContext:()=>q})};
const scene=new THREE.Scene(),obstacles=[],home=createLandmarkHouse({scene,visualKit:Object.fromEntries(['wood','brick','siding','roofing','masonry'].map(k=>[k,c=>new THREE.MeshStandardMaterial({color:c})])),obstacles,groundSurfaces:[]});
const open={...home.state,front:true,rear:true,garage:true,bedroom1:true,bedroom2:true,bathroom:true};home.restore(open);
const eye=a=>({x:a.x+.1,y:a.y+1.8,z:a.z+.1}),at=(x,z,y=H.ground)=>({x:H.x+x,y,z:H.z+z});
for(const action of home.actions.filter(a=>a.kind!=='door')){
 const point=houseTargetPoint(home,{targetId:action.id},action,eye(action));assert.ok(point,'Every real object approach supports a clear nearby marker: '+action.id);assert.equal(point.x,action.x);assert.equal(point.z,action.z);assert.equal(point.y,action.y+.035);
}
const tv=home.actions.find(a=>a.id==='tv'),wardrobe=home.actions.find(a=>a.id==='wardrobe'),guide={targetId:'wardrobe'},hall=at(1.5,2,H.upper),camera=eye(hall);
assert.ok(houseTargetPoint(home,guide,hall,camera),'Open main bedroom doorway reveals selected approach');
home.restore({...open,bedroom1:false});assert.equal(houseTargetPoint(home,guide,hall,camera),null,'Closed physical door hides the target');home.restore(open);
assert.equal(houseTargetPoint(home,guide,wardrobe,eye(at(-3,-2,H.upper))),null,'Camera cannot reveal a target through the bedroom dividing wall');
const washer=home.actions.find(a=>a.id==='washer');assert.equal(houseTargetPoint(home,{targetId:'washer'},washer,at(-5.65,5.4,1)),null,'Actual laundry furniture blocks the camera-to-marker segment');
assert.equal(houseTargetPoint(home,guide,{...wardrobe,y:H.ground},eye(tv)),null,'Matching X/Z on another floor cannot reveal the upstairs marker');
assert.equal(houseTargetPoint(home,guide,at(4.95,0,2),eye(wardrobe)),null,'Stair travel never presents a marker on the wrong level');
assert.equal(houseTargetPoint(home,{targetId:'tv'},at(5,4),eye(tv)),null,'Targets beyond six meters remain hidden');
for(const options of [{paused:true},{mounted:true},{seated:true},{focusView:true}])assert.equal(houseTargetPoint(home,{targetId:'tv'},tv,eye(tv),options),null);
for(const p of [null,{x:NaN,y:.3,z:H.z},{x:0,y:0,z:0},{...tv,y:Infinity}])assert.equal(houseTargetPoint(home,{targetId:'tv'},p,eye(tv)),null);
for(const targetId of [null,'unknown','front','__proto__'])assert.equal(houseTargetPoint(home,{targetId},tv,eye(tv)),null);
assert.equal(houseTargetPoint(home,{targetId:'tv'},tv,{...eye(tv),y:10}),null,'Camera above the ceiling cannot see through the floor');
assert.equal(houseTargetPoint(home,{targetId:'tv'},tv,{...eye(tv),y:0}),null,'Camera below the floor cannot see up through it');
assert.equal(houseTargetPoint(null,guide,tv,eye(tv)),null);
const beforeBoxes=cameraArchitectureBoxes(scene).length,beforeObstacles=obstacles.length,saved=home.serialize(tv),visuals=createHouseTargetVisuals({scene});
assert.equal(cameraArchitectureBoxes(scene).length,beforeBoxes,'Decorative marker does not become a camera obstacle');assert.equal(obstacles.length,beforeObstacles);
assert.equal(visuals.root.visible,false);const geometries=new Set(),materials=new Set();let triangles=0;
visuals.root.traverse(m=>{assert.ok(!m.isLight);if(!m.isMesh)return;geometries.add(m.geometry);materials.add(m.material);triangles+=(m.geometry.index?.count||m.geometry.attributes.position.count)/3;assert.equal(m.material.depthTest,true);assert.equal(m.material.depthWrite,false);assert.equal(m.castShadow,false);assert.equal(m.receiveShadow,false);});
assert.equal(geometries.size,2);assert.equal(materials.size,1);assert.equal(triangles,72);
assert.equal([...materials][0].side,THREE.FrontSide,'Front-facing geometry avoids duplicate transparent back/front render passes');assert.ok(new THREE.Vector3(0,0,1).applyEuler(visuals.root.children[0].rotation).y>.99,'The floor ring faces the above-floor camera');
for(let i=0;i<10000;i++)assert.equal(visuals.update(home,{targetId:'tv'},tv,eye(tv)),true);
scene.updateMatrixWorld(true);for(const aspect of [390/760,16/9]){const view=new THREE.PerspectiveCamera(45,aspect,.05,30);view.position.copy(eye(tv));view.lookAt(tv.x,tv.y+.1,tv.z);view.updateMatrixWorld(true);const projected=visuals.root.position.clone().project(view);assert.ok([projected.x,projected.y,projected.z].every(Number.isFinite));assert.ok(Math.abs(projected.x)<1&&Math.abs(projected.y)<1&&projected.z>-1&&projected.z<1,'Actual world marker projects into portrait and desktop camera views');}
const afterGeometry=new Set();visuals.root.traverse(m=>{if(m.isMesh)afterGeometry.add(m.geometry)});assert.deepEqual(afterGeometry,geometries,'Repeated updates reuse both original geometries');assert.deepEqual(home.serialize(tv),saved,'Guidance never operates furniture or changes the save');
assert.equal(visuals.update(home,{targetId:null},tv,eye(tv)),false);assert.equal(visuals.update(home,{targetId:'tv'},tv,eye(tv),{focusView:true}),false);
const html=await readFile(new URL('../index.html',import.meta.url),'utf8'),updateSource=html.match(/houseTargetVisuals\.update\([^;]+;/)?.[0];assert.ok(updateSource);assert.ok(html.includes('cameraFollow(dt);houseTargetVisuals.update('),'Visibility uses the current camera pose after collision-aware camera following');
const runtime={houseTargetVisuals:visuals,landmarkHome:home,houseGuide:{targetId:'tv'},player:{position:tv},camera:{position:eye(tv)},gameplayBlocked:()=>false,document:{hidden:false},driving:null,riding:null,seatedAt:null,focusView:false};
vm.runInNewContext(updateSource,runtime);assert.equal(visuals.root.visible,true,'Actual frame integration reveals the selected nearby point');runtime.focusView=true;vm.runInNewContext(updateSource,runtime);assert.equal(visuals.root.visible,false);runtime.focusView=false;runtime.gameplayBlocked=()=>true;vm.runInNewContext(updateSource,runtime);assert.equal(visuals.root.visible,false);runtime.gameplayBlocked=()=>false;runtime.driving={};vm.runInNewContext(updateSource,runtime);assert.equal(visuals.root.visible,false);
let disposed=0;for(const g of geometries)g.addEventListener('dispose',()=>disposed++);for(const m of materials)m.addEventListener('dispose',()=>disposed++);visuals.dispose();visuals.dispose();assert.equal(disposed,3);assert.equal(visuals.root.parent,null);assert.equal(visuals.update(home,{targetId:'tv'},tv,eye(tv)),false);
console.log('House target marker passes: all actual approaches, both floors, live doors/walls, camera occlusion/height, six-meter range, pause/vehicle/seat/focus gates, 72 triangles, stable resources and cleanup.');
