import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import vm from 'node:vm';
import * as THREE from 'three';
import {Sky} from 'three/addons/objects/Sky.js';
import {createCityAtmosphere} from '../assets/city-atmosphere.js';
import {CITY_LIGHT_PRESETS,CITY_LIGHT_STORAGE,CITY_DAY_SECONDS,restoreCityTime,advanceCityTime,setCityLightPreset,formatCityTime,cityLightingAt} from '../assets/city-time.js';
import {mountVehicle,updateVehicleVisual} from '../assets/vehicles.js';
import {bridgeHeight,bridgePitch} from '../assets/world-rules.js';

assert.deepEqual(restoreCityTime(),{hour:15,cycling:false});
assert.deepEqual(restoreCityTime({hour:Infinity,cycling:'true'}),{hour:15,cycling:false});
assert.equal(restoreCityTime({hour:-1}).hour,23);
assert.equal(formatCityTime(0),'12:00 AM');assert.equal(formatCityTime(12),'12:00 PM');assert.equal(formatCityTime(18.25),'6:15 PM');
const clock=restoreCityTime();assert.equal(setCityLightPreset(clock,'bogus'),false);assert.equal(clock.hour,15);
for(const key of Object.keys(CITY_LIGHT_PRESETS)){assert.ok(setCityLightPreset(clock,key));assert.equal(clock.cycling,false);}
for(const hz of [30,60,120]) {
  const time={hour:23.99,cycling:true};
  for(let i=0;i<hz*60;i++)advanceCityTime(time,1/hz);
  assert.ok(Math.abs(time.hour-.99)<1e-8,'The cycle crosses midnight consistently at every frame rate');
}
const held={hour:15,cycling:true};advanceCityTime(held,1/30,true);assert.equal(held.hour,15);
advanceCityTime(held,3600);assert.ok(held.hour<15.002,'Returning from a background tab does not skip hours');
held.cycling=false;advanceCityTime(held,1);assert.ok(held.hour<15.002);
assert.equal(CITY_DAY_SECONDS,1440);
for(let hour=0;hour<24;hour+=.01) {
  const sample=cityLightingAt(hour),next=cityLightingAt(hour+.0001);
  for(const key of ['sun','hemi','exposure','env','night','skyNight','fogDensity']) {
    assert.ok(Number.isFinite(sample[key]));assert.ok(Math.abs(next[key]-sample[key])<.001,'Lighting never pops at a timeline boundary');
  }
  assert.ok(sample.hemi>=.4,'Night retains enough fill to explore on foot');
  assert.ok(Object.values(sample.lightDirection).every(Number.isFinite));
}
assert.ok(cityLightingAt(22).night>.99);assert.equal(cityLightingAt(15).night,0);
assert.ok(cityLightingAt(22).env<cityLightingAt(15).env*.25,'Night reflections do not remain at daylight brightness');

function fixture(mobile=false) {
  const scene=new THREE.Scene();scene.background=new THREE.Color();scene.fog=new THREE.FogExp2();
  const sky=new Sky(),sun=new THREE.DirectionalLight(),hemisphere=new THREE.HemisphereLight(),renderer={toneMappingExposure:1},direction=new THREE.Vector3();
  scene.add(sky,sun,hemisphere);
  const kit=createCityAtmosphere({renderer,scene,sky,sun,hemisphere,lightDirection:direction,mobile});
  return {scene,sky,sun,hemisphere,renderer,direction,kit};
}
const f=fixture(),{kit,scene}=f;
const glow=new THREE.MeshStandardMaterial();kit.registerGlow(glow,{day:.1,night:2.2,color:0xffd39a});
for(let i=0;i<200;i++)kit.addStreetLight({x:i*18,y:7,z:8,groundY:.23});
kit.finalizeStreetLights();
assert.equal(kit.poolMesh.count,200);assert.ok(kit.poolMesh.isInstancedMesh,'Ground pools are a single batch rather than 200 draw calls');
assert.equal(kit.lampLights.length,4);assert.equal(kit.headLights.length,2);
const liveLights=scene.children.filter(o=>o.isLight).length;
assert.ok([...kit.headLights,...kit.lampLights].every(light=>!light.castShadow),'Practical lights do not add shadow-map passes');
const car=new THREE.Group(),parked=new THREE.Group(),traffic=new THREE.Group();
for(const c of [car,parked,traffic]){mountVehicle(c,null,0x356575);scene.add(c);}
traffic.userData.traffic=true;
const paint=car.userData.vehicleVisual.paint;paint.envMap=new THREE.Texture();
car.position.set(2,bridgeHeight(-520)-.06,-520);car.rotation.set(bridgePitch(2,-520,Math.PI),Math.PI,0);
let args={hour:22,position:car.position,vehicles:[car,parked,traffic],focusVehicle:car,dt:.3};
kit.update(args);
assert.equal(glow.emissiveIntensity,2.2);
assert.ok(f.sky.material.fragmentShader.includes('mix(retColor, nightColor, cityNight)'),'The physical daytime sky is actually replaced by a dark sky');
assert.equal(f.sky.material.uniforms.cityNight.value,1);
assert.ok(kit.headLights.every(light=>light.visible&&light.intensity>100));
for(const [i,light] of kit.headLights.entries()) {
  const expected=car.localToWorld(new THREE.Vector3((i?1:-1)*.7,.61,2.18));
  assert.ok(light.position.distanceTo(expected)<1e-6,'Low beams follow the car heading and bridge grade');
  assert.ok(light.target.position.z<light.position.z-20,'A northbound car lights the road ahead rather than behind');
  assert.ok(light.target.position.y>light.position.y,'Low beams follow the rising bridge deck');
}
assert.ok(car.userData.vehicleVisual.headlampMaterial.emissiveIntensity>2);
assert.ok(traffic.userData.vehicleVisual.headlampMaterial.emissiveIntensity>2);
assert.ok(parked.userData.vehicleVisual.headlampMaterial.emissiveIntensity<.1,'Parked cars keep their headlights off');
assert.ok(paint.envMapIntensity<.1,'Captured daytime reflections dim after sunset');
const nightExposure=f.renderer.toneMappingExposure;
assert.throws(()=>kit.captureDaylight(()=>{assert.equal(kit.sample.hour,15);assert.ok(kit.headLights.every(light=>!light.visible));throw new Error('probe unavailable');}),/probe unavailable/);
assert.equal(kit.sample.hour,22);assert.equal(f.renderer.toneMappingExposure,nightExposure);
assert.ok(kit.headLights.every(light=>light.visible),'A failed reflection capture restores the nighttime lights');
updateVehicleVisual(car,{brake:1,gear:'R'},.04);kit.update(args);
assert.equal(car.userData.vehicleVisual.brakeMaterial.emissiveIntensity,2.6,'Night running lamps do not overwrite braking');
assert.equal(car.userData.vehicleVisual.reverseMaterial.emissiveIntensity,1.4);
car.userData.disabled=true;kit.update(args);
assert.ok(kit.headLights.every(light=>!light.visible));assert.equal(car.userData.vehicleVisual.headlampMaterial.emissiveIntensity,.06);
car.userData.disabled=false;
kit.update({...args,hour:15});
assert.equal(glow.emissiveIntensity,.1);assert.ok(kit.headLights.every(light=>!light.visible));assert.equal(kit.poolMesh.visible,false);assert.equal(paint.envMapIntensity,1);
kit.update({...args,hour:22,position:new THREE.Vector3(900,0,0)});
assert.ok(kit.lampLights.some(light=>light.visible&&Math.abs(light.position.x-900)<20),'The fixed light pool follows the observer across the city');
assert.equal(scene.children.filter(o=>o.isLight).length,liveLights,'Time changes and moving do not allocate more lights');
assert.equal(f.sky.position.x,900,'The sky stays centered after long trips');
mountVehicle(car,null,0x754538);kit.update(args);
assert.ok(car.userData.vehicleVisual.headlampMaterial.emissiveIntensity>2,'A model replacement inherits the active lighting without reloading');
const m=fixture(true);assert.equal(m.kit.lampLights.length,2);assert.equal(m.kit.headLights.length,2);

// Execute the shipped menu handlers, including malformed storage and the real
// pause gate. The visual clock is separate from story data and wallet state.
const html=await readFile(new URL('../index.html',import.meta.url),'utf8');
const controls=html.slice(html.indexOf('const cityTime=(()=>'),html.indexOf('sessionLifecycle=createSessionLifecycle('));
for(const saved of [null,'{broken',JSON.stringify({hour:22,cycling:true})]) {
  const store=new Map(saved?[[CITY_LIGHT_STORAGE,saved]]:[]),els=new Map();let blocked=false,shown='',lastUpdate;
  const context={CITY_LIGHT_STORAGE,CITY_LIGHT_PRESETS,restoreCityTime,advanceCityTime,setCityLightPreset,formatCityTime,JSON,Math,
    document:{hidden:false,addEventListener(){},querySelector:id=>{if(!els.has(id))els.set(id,{textContent:'',setAttribute(){}});return els.get(id)}},
    localStorage:{getItem:key=>store.get(key),setItem:(key,value)=>store.set(key,value)},addEventListener(){},show:s=>shown=s,
    gameplayBlocked:()=>blocked,visualKit:{atmosphere:{update:arg=>lastUpdate=arg,finalizeStreetLights(){}}},player:{position:new THREE.Vector3()},vehicleRefs:[],driving:null};
  context.window=context;vm.createContext(context);vm.runInContext(controls+';window.state=cityTime;window.tick=updateCityLight;',context);
  context.openCityLight();assert.ok(shown.includes('Daylight')&&shown.includes('Sunset')&&shown.includes('Night'));
  const singleQuotedHandlers=[...shown.matchAll(/onclick="([^"]+)"/g)].map(m=>m[1]);
  assert.ok(singleQuotedHandlers.includes("chooseCityLight('sunset')"),'Rendered buttons contain executable preset handlers');
  context.chooseCityLight('sunset');assert.equal(context.state.hour,18.25);assert.equal(context.state.cycling,false);
  assert.equal(JSON.parse(store.get(CITY_LIGHT_STORAGE)).hour,18.25,'Lighting preference survives reload');
  context.toggleCityLightCycle();blocked=true;context.tick(.04);assert.equal(context.state.hour,18.25);
  blocked=false;context.tick(.04);assert.ok(context.state.hour>18.25);assert.equal(lastUpdate.hour,context.state.hour);
  context.document.hidden=true;const before=context.state.hour;context.tick(.04);assert.equal(context.state.hour,before);
  assert.equal(store.size,1,'Visual preferences never write to the story save or wallet');
}
console.log('City lighting passed: timeline, midnight, persistence, menus/background pause, real light budgets, bridge-aligned low beams, brake/reverse states, reflection levels, hot model replacement, and actual menu handlers.');
