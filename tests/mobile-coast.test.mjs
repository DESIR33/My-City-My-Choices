import assert from 'node:assert/strict';
import test,{after} from 'node:test';
import * as THREE from 'three';
import {WebGLLights} from 'three/src/renderers/webgl/WebGLLights.js';
import {createCoastWorld} from '../assets/coast-world.js';
import {COAST_BUILDINGS,coastGroundHeight} from '../assets/world-rules.js';
const oldDocument=globalThis.document;
globalThis.document={createElement:()=>({width:512,height:96,getContext:()=>new Proxy({measureText:()=>({width:10}),createLinearGradient:()=>({addColorStop(){}})},{get:(t,k)=>t[k]||(()=>{})})})};
function build(mobile){const scene=new THREE.Scene(),obstacles=[],surfaces=[],traffic=[],mat=()=>new THREE.MeshStandardMaterial();const coast=createCoastWorld({scene,mobile,C:{road:mat(),walk:mat()},cube:(parent,x,y,z,w,h,d,m)=>{const mesh=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),m);mesh.position.set(x,y+h/2,z);parent.add(mesh);return mesh;},obstacles,groundSurfaces:surfaces,buildings:[],traffic,seats:[],trafficControllers:[],groundHeight:coastGroundHeight,visualKit:{windowMaterial:mat,atmosphere:{registerGlow(){},addStreetLight(){}}},car:(x,z,color,heading,moving)=>{if(moving)traffic.push({});return new THREE.Group();},addCornerSignal(){},characters:{create:({x,z})=>{const g=new THREE.Group();g.position.set(x,0,z);return g;}}});return {scene,coast,obstacles,surfaces};}
after(()=>{globalThis.document=oldDocument;});
 test('Mobile coastal approaches keep the hotel light program stable and palm submissions bounded',()=>{
  const {scene,coast}=build(true),hotel=COAST_BUILDINGS.find(b=>b.name==='THE FLAMINGO'&&b.height>30),lights=WebGLLights({has:()=>false});let version,peak=0;
  const hotelInterior=scene.getObjectByName('Flamingo modern interior');
  const pointers=new Set(coast.palmGrove.meshes.map(m=>m.instanceMatrix));
  for(let pass=0;pass<3;pass++)for(const z of [0,400,850,1050,1200,hotel.z,hotel.z+60,hotel.z,1800,2070,400,0]){
   coast.update(.04,new THREE.Vector3(0,0,z));assert.equal(hotelInterior.visible,Math.hypot(hotel.x,hotel.z-z)<70,'Hotel furniture only renders near the hotel on phones');scene.updateMatrixWorld(true);const visible=[];scene.traverseVisible(o=>{if(o.isLight)visible.push(o);});lights.setup(visible);version??=lights.state.version;
   assert.equal(lights.state.version,version);assert.equal(lights.state.spot.length,0);assert.equal(lights.state.point.length,0);
   const near=coast.palmGrove.meshes.filter(m=>m.userData.palmDetail==='near'&&m.name.includes('crowns')).reduce((n,m)=>n+m.count,0);assert.ok(near<=4,'Four rich palm crowns globally, across all tiles');
   const triangles=coast.palmGrove.meshes.reduce((n,m)=>n+(m.geometry.index.count/3)*m.count,0);peak=Math.max(peak,triangles);assert.ok(triangles<210000,'Actual submitted palm triangle budget');
   for(const m of coast.palmGrove.meshes)assert.ok(pointers.has(m.instanceMatrix),'Travel reuses fixed buffers');
  }
  assert.equal(coast.palmGrove.meshes.reduce((n,m)=>n+m.count,0),0,'Distant coast submits no mobile palm geometry from Maple Street');
  assert.equal(coast.ocean.material.isMeshPhysicalMaterial,undefined,'Mobile waves keep the simpler lighting shader');
  // Hotel navigation is unchanged on mobile: three floors and working lift.
  const rider={position:{x:hotel.x-8.3,y:.21,z:hotel.z+14.5}};assert.equal(coast.rideTo(2,rider),true);for(let i=0;i<220;i++)coast.update(.05,rider.position);assert.equal(coast.isRiding(),false);assert.ok(Math.abs(rider.position.y-13.15)<.02);
  console.log('Mobile coastal peak submitted palm triangles:',peak);
 });
 test('Desktop retains practical hotel lights and the full palm horizon',()=>{const {scene,coast}=build(false),hotel=COAST_BUILDINGS.find(b=>b.name==='THE FLAMINGO'&&b.height>30);coast.update(.04,new THREE.Vector3(hotel.x,0,hotel.z));const lights=[];scene.traverseVisible(o=>{if(o.isPointLight||o.isSpotLight)lights.push(o);});assert.ok(lights.length>=15);assert.equal(coast.palmGrove.meshes.filter(m=>m.name.includes('crowns')).reduce((n,m)=>n+m.count,0),coast.palms.length);});
