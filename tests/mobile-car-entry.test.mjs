import assert from 'node:assert/strict';
import test from 'node:test';
import {readFile} from 'node:fs/promises';
import vm from 'node:vm';
import * as THREE from 'three';
import {Sky} from 'three/addons/objects/Sky.js';
import {WebGLLights} from 'three/src/renderers/webgl/WebGLLights.js';
import {createCityAtmosphere} from '../assets/city-atmosphere.js';
import {mountVehicle} from '../assets/vehicles.js';
import {createTouchControls} from '../assets/touch-controls.js';
import {createVehicleState} from '../assets/vehicle-physics.js';
import {bridgeHeight,bridgePitch} from '../assets/world-rules.js';

test('Mobile car entry keeps the real Three light program layout stable',()=>{
  const scene=new THREE.Scene();scene.background=new THREE.Color();scene.fog=new THREE.FogExp2();
  const sky=new Sky(),sun=new THREE.DirectionalLight(),hemisphere=new THREE.HemisphereLight();scene.add(sky,sun,hemisphere);
  const kit=createCityAtmosphere({scene,sky,sun,hemisphere,renderer:{},lightDirection:new THREE.Vector3(),mobile:true});
  for(let i=0;i<6;i++)kit.addStreetLight({x:i*18,y:7,z:8});kit.finalizeStreetLights();
  const car=new THREE.Group();mountVehicle(car,null,0x286452);scene.add(car);
  const beams=kit.headBeamMesh,resources=[beams.geometry,beams.material,beams.material.map,beams.instanceMatrix];
  assert.equal(beams.count,2);assert.ok(beams.material.isMeshBasicMaterial&&beams.material.transparent&&!beams.material.depthWrite&&beams.material.depthTest);
  assert.equal(beams.material.map,kit.poolMesh.material.map,'Headlight pools share the existing radial texture');
  assert.equal(beams.geometry.index.count/3*beams.count,4,'Four triangles replace entry-time spotlights');
  const lights=WebGLLights({has:()=>false});let version;
  for(let n=0;n<100;n++)for(const hour of [15,18.25,23])for(const rain of [0,1])for(const entered of [false,true]){
    car.position.set(2,bridgeHeight(-520)-.06,-520);car.rotation.set(bridgePitch(2,-520,Math.PI),Math.PI,0);
    kit.update({hour,rain,position:car.position,vehicles:[car],focusVehicle:entered?car:null,dt:1/60});
    const visible=[];scene.traverseVisible(o=>{if(o.isLight)visible.push(o);});lights.setup(visible);
    if(version===undefined)version=lights.state.version;
    assert.equal(lights.state.version,version,'Entry, exit, weather and daylight cannot alter lighting program definitions');
    assert.equal(lights.state.spot.length,0);assert.ok([...kit.headLights,...kit.lampLights].every(l=>!l.visible&&l.intensity===0));
    const active=entered&&(hour!==15||rain>0);assert.equal(beams.visible,active);
    if(active){scene.updateMatrixWorld(true);const local=new THREE.Matrix4();beams.getMatrixAt(0,local);
      const actual=new THREE.Vector3().setFromMatrixPosition(local).applyMatrix4(beams.matrixWorld),expected=car.localToWorld(new THREE.Vector3(-.7,.11,12));
      assert.ok(actual.distanceTo(expected)<1e-5,'Beam pools follow heading and bridge grade');
      assert.ok(beams.material.opacity>0&&beams.material.opacity<=.2);assert.ok(car.userData.vehicleVisual.headlampMaterial.emissiveIntensity>.35);
    }
  }
  kit.update({hour:23,position:car.position,vehicles:[car],focusVehicle:car});
  assert.throws(()=>kit.captureDaylight(()=>{assert.equal(beams.visible,false);throw new Error('probe failed');}),/probe failed/);assert.equal(beams.visible,true);
  car.userData.disabled=true;kit.update({hour:23,position:car.position,vehicles:[car],focusVehicle:car});assert.equal(beams.visible,false);
  assert.deepEqual([beams.geometry,beams.material,beams.material.map,beams.instanceMatrix],resources,'Repeated entry reuses all beam resources');
});

class Element{
  constructor(){this.events=new Map();this.style={};this.hidden=false;this.disabled=false;this.classList={add(){},remove(){},toggle(){}};}
  addEventListener(k,f){if(!this.events.has(k))this.events.set(k,[]);this.events.get(k).push(f);}
  emit(k,extra={}){for(const f of this.events.get(k)||[])f({pointerId:1,pointerType:'touch',clientX:68,clientY:10,preventDefault(){},...extra});}
  setPointerCapture(){}setAttribute(){}getBoundingClientRect(){return {left:0,top:0,width:136,height:136};}
}
test('Actual touch Enter car handler checkpoints first and releases held controls',async()=>{
  const html=await readFile(new URL('../index.html',import.meta.url),'utf8'),els=new Map(),doc=new Element(),win=new Element();
  doc.body=new Element();doc.querySelector=id=>{if(!els.has(id))els.set(id,new Element());return els.get(id);};win.matchMedia=()=>Object.assign(new Element(),{matches:true});
  const oldDoc=globalThis.document,oldWin=globalThis.window;globalThis.document=doc;globalThis.window=win;
  try{
    const car=new THREE.Group(),player=new THREE.Group();car.userData.vehicleId='test-car';car.userData.obstacle={minX:-1,maxX:1,minZ:-3,maxZ:3};
    car.position.set(2,bridgeHeight(-520)-.06,-520);car.rotation.y=Math.PI;player.position.set(3.8,bridgeHeight(-520),-520);
    let paused=false,saved,saveCalls=0,crashCalls=0;
    const context={player,driving:null,riding:null,seatedAt:null,near:{kind:'car',car},carSpeed:0,vehicleState:null,yaw:0,keys:{KeyW:true},drivingLastDirection:1,
      playerStopDwell:new Map([['stop',1]]),playerStopReady:new Set(['stop']),obstacles:[car.userData.obstacle],document:doc,
      createVehicleState,groundHeight:(x,z)=>bridgeHeight(z),gameplayBlocked:()=>paused,findNear(){},updateCarStatus(){},notify(){},updateVehicleVisual(){},blocked:()=>false,
      openCrashHelp(){crashCalls++;},saveGame(){saved={driving:context.driving,position:player.position.clone()};saveCalls++;return true;},parkedObstacle:()=>({minX:0,maxX:4,minZ:-522,maxZ:-518})};
    const controls=createTouchControls({canvas:new Element(),isBlocked:()=>paused,onLook(){},onInteract(){},onVehicle:()=>context.vehicleAction()});context.mobileControls=controls;
    const interact=html.slice(html.indexOf('function distance(a,b)'),html.indexOf('let prompt=document.querySelector'));
    const reset=html.split('\n').find(line=>line.startsWith('function resetInputs()'));
    const vehicle=html.slice(html.indexOf('function vehicleAction(){'),html.indexOf('function rideCanOccupy('));
    vm.createContext(context);vm.runInContext(interact+'\n'+reset+'\n'+vehicle,context);
    controls.update({driving:false,near:context.near});doc.querySelector('#moveStick').emit('pointerdown');assert.ok(controls.state.forward>0);
    const pose=player.position.clone();doc.querySelector('#touchVehicle').emit('click');
    assert.equal(saveCalls,1);assert.equal(saved.driving,null,'Checkpoint precedes changing to driving');assert.ok(saved.position.equals(pose));
    assert.equal(context.driving,car);assert.equal(player.visible,false);assert.equal(context.keys.KeyW,false);assert.equal(controls.state.forward,0);
    assert.equal(context.vehicleState.speed,0);assert.equal(player.position.y,bridgeHeight(-520),'Entry uses the road height immediately');
    assert.equal(context.obstacles.includes(car.userData.obstacle),false);assert.equal(context.playerStopDwell.size,0);assert.equal(context.playerStopReady.size,0);
    doc.querySelector('#moveStick').emit('pointermove',{clientY:0});assert.equal(controls.state.forward,0,'The old thumb cannot keep accelerating after entry');
    controls.update({driving:true,near:null});doc.querySelector('#touchVehicle').emit('click');assert.equal(context.driving,null);assert.equal(player.visible,true);
    paused=true;doc.querySelector('#touchVehicle').emit('click');assert.equal(context.driving,null);assert.equal(saveCalls,1);
    paused=false;car.userData.disabled=true;doc.querySelector('#touchVehicle').emit('click');assert.equal(context.driving,null);assert.equal(crashCalls,1);assert.equal(saveCalls,1);
    car.userData.disabled=false;context.saveGame=()=>false;assert.doesNotThrow(()=>doc.querySelector('#touchVehicle').emit('click'));assert.equal(context.driving,car,'A handled storage failure does not crash car entry');
  }finally{globalThis.document=oldDoc;globalThis.window=oldWin;}
});
