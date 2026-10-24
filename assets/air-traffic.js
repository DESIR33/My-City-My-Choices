import * as THREE from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {MeshoptDecoder} from 'three/addons/libs/meshopt_decoder.module.js';
import {AIRPLANE_FLEET} from './airplanes/fleet.js';

// Airliners fly over the city every ten minutes of play. Only time that actually
// plays counts (the game passes dt=0 while menus are open or the tab is hidden).
// Each flyover picks the next plane in the fleet (fictional liveries, see
// assets/airplanes), loads its model the first time it is needed, and flies a
// straight, gently climbing line that passes a few hundred metres to one side of
// the player, high above the tallest towers. Navigation lights (red left, green
// right, white tail), a flashing red beacon and white strobes stay visible as small
// screen-sized points. The distant engine roar is fed to the city audio mixer.
export const FLYOVER_INTERVAL=600;
export const FLIGHT=Object.freeze({minAltitude:340,maxAltitude:460,minOffset:150,maxOffset:500,reach:2200,speed:78,climb:.035});

// Plan one flight past `around` (the player's position) using `random()` in [0,1).
export function planFlight(around,random=Math.random){
  const heading=random()*Math.PI*2,dir={x:Math.sin(heading),z:Math.cos(heading)},side=random()<.5?-1:1,offset=FLIGHT.minOffset+random()*(FLIGHT.maxOffset-FLIGHT.minOffset);
  const altitude=FLIGHT.minAltitude+random()*(FLIGHT.maxAltitude-FLIGHT.minAltitude);
  const centre={x:around.x+dir.z*offset*side,z:around.z-dir.x*offset*side};
  return {heading,dir,centre,altitude,offset,side,speed:FLIGHT.speed,length:FLIGHT.reach*2,duration:FLIGHT.reach*2/FLIGHT.speed};}
// Position along a planned flight at time t (seconds from the start).
export function flightPosition(f,t){const s=-FLIGHT.reach+f.speed*t;return {x:f.centre.x+f.dir.x*s,y:f.altitude+(s+FLIGHT.reach)*FLIGHT.climb*.5,z:f.centre.z+f.dir.z*s};}

export function navLights(plane){
  const L=plane.lights,points=(list,color,size)=>{const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(list.flat(),3));
    const p=new THREE.Points(g,new THREE.PointsMaterial({color,size,sizeAttenuation:false,transparent:true,depthWrite:false}));p.frustumCulled=false;return p;};
  const group=new THREE.Group();group.name=plane.name+' lights';
  const steady={left:points([L.left],0xff3b30,3.5),right:points([L.right],0x3bff6a,3.5),tail:points([L.tail],0xffffff,3)};
  const beacon=points([L.beaconTop,L.beaconBottom],0xff2a1f,4.5),strobe=points([L.left,L.right],0xffffff,5.5);
  group.add(steady.left,steady.right,steady.tail,beacon,strobe);return {group,beacon,strobe,steady};}
// Beacon and strobe flashing at time t (seconds).
export function flashLights(lights,t){lights.beacon.visible=t%1.2<.12;const s=t%1.5;lights.strobe.visible=s<.06||(s>.18&&s<.24);}

// One shared cache of airliner models: each plane type downloads once, then every
// flight or parked plane is a cheap clone (shared geometry and material) with its own lights.
export function createAirplaneLibrary({loadModel}={}){
  const templates=new Map();let loader=null;
  const load=loadModel||(async plane=>{loader||=new GLTFLoader().setMeshoptDecoder(MeshoptDecoder);return (await loader.loadAsync(plane.url)).scene;});
  function template(plane){if(!templates.has(plane.id))templates.set(plane.id,Promise.resolve().then(()=>load(plane)).then(scene=>{
      scene.traverse(c=>{if(c.isMesh){c.castShadow=false;c.receiveShadow=false;c.frustumCulled=false;c.material.vertexColors=true;c.material.fog=true;
        // Thinner haze on the plane keeps it readable high in the sky.
        c.material.onBeforeCompile=shader=>{shader.vertexShader=shader.vertexShader.replace('#include <fog_vertex>','#include <fog_vertex>\n#ifdef USE_FOG\nvFogDepth*=.4;\n#endif');};c.material.customProgramCacheKey=()=>'airliner-v1';}});return scene;})
      .catch(error=>{templates.delete(plane.id);throw error;}));
    return templates.get(plane.id);}
  async function instance(plane){const scene=await template(plane),holder=new THREE.Group();holder.name=plane.name;holder.add(scene.clone());
    const lights=navLights(plane);holder.add(lights.group);holder.userData.lights=lights;holder.userData.plane=plane;return holder;}
  return {template,instance,get loaded(){return templates.size;}};
}

export function createAirTraffic({scene,fleet=AIRPLANE_FLEET,interval=FLYOVER_INTERVAL,random=Math.random,loadModel,library=createAirplaneLibrary({loadModel}),onFlyover=()=>{}}={}){
  const group=new THREE.Group();group.name='Air traffic';scene.add(group);
  const state={clock:0,flights:0,next:0,active:null,pending:null,failures:0};
  const model=plane=>library.instance(plane);
  // Start the next flyover now (also used by the timer).
  async function launch(around){
    if(state.active||state.pending)return state.pending||state.active;
    const plane=fleet[state.next%fleet.length];state.next++;
    const flight={plane,...planFlight(around,random),t:0,object:null};
    state.pending=model(plane).then(object=>{state.pending=null;flight.object=object;object.rotation.set(-Math.atan(FLIGHT.climb*.5),flight.heading,0,'YXZ');group.add(object);state.active=flight;state.flights++;
        const p=flightPosition(flight,0);object.position.set(p.x,p.y,p.z);onFlyover(plane,flight);return flight;})
      .catch(error=>{state.pending=null;state.failures++;console.warn('Airplane unavailable',plane.id,error);return null;});
    return state.pending;}
  function update(dt,{position,quiet=false}={}){
    dt=Number.isFinite(dt)&&dt>0?Math.min(dt,.25):0;
    // `quiet`: the player is at the airport, where real arrivals and departures replace flyovers.
    if(!state.active&&!state.pending&&!quiet){state.clock+=dt;if(state.clock>=interval&&position){state.clock-=interval;launch(position);}}
    const f=state.active;if(!f)return;
    f.t+=dt;const p=flightPosition(f,f.t);f.object.position.set(p.x,p.y,p.z);
    flashLights(f.object.userData.lights,f.t);
    if(f.t>=f.duration){group.remove(f.object);state.active=null;}}
  // Engine roar for the audio mixer: loudness falls with distance, pan from the camera's view.
  const v=new THREE.Vector3();
  function sound(camera){const f=state.active;if(!f||!camera)return {level:0,pan:0};v.copy(f.object.position);const d=v.distanceTo(camera.position);v.applyMatrix4(camera.matrixWorldInverse);
    const level=Math.pow(Math.max(0,1-d/2000),2);return {level,pan:Math.max(-1,Math.min(1,v.x/Math.max(1,Math.hypot(v.x,v.z))))};}
  return {group,state,update,launch,sound,fleet,library,get nextIn(){return state.active||state.pending?null:Math.max(0,interval-state.clock);}};
}
