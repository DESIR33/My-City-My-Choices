import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import vm from 'node:vm';
import * as THREE from 'three';
import * as world from '../assets/world-rules.js';
import {createCoastWorld} from '../assets/coast-world.js';
import {createVehicleState,advanceVehicle,vehicleFootprint,rectanglesOverlap} from '../assets/vehicle-physics.js';
import {restoreCarOwnership} from '../assets/vehicle-ownership.js';

const {COAST_CITY,COAST_BUILDINGS,COAST_MOTORS,coastGroundHeight,worldDrivable,worldWalkable,southResponseRoute,districtName}=world;
assert.equal(COAST_BUILDINGS.length,24);
assert.equal(new Set(COAST_BUILDINGS.map(b=>b.id)).size,24);
assert.equal(districtName(500),'Coast Road');assert.equal(districtName(1400),'Sunshore City');assert.equal(districtName(-1500),'Northstar City');
for(let z=150;z<1082;z+=.5){assert.ok(worldWalkable(9.3,z),'Walk continuously along the southern footpath');assert.ok(worldDrivable(-2.4,z),'The connecting road never has a gap');}
for(const z of [1080,1400,2020])for(const x of [35,65,110,123]){assert.ok(worldWalkable(x,z));assert.equal(worldDrivable(x,z),false,'Cars stay off the beach and promenade');}
for(const p of [{x:133,z:1500},{x:300,z:1500},{x:0,z:2200},{x:100,z:500}])assert.equal(worldWalkable(p.x,p.z),false,'Ocean and unbuilt shortcuts remain outside the playable world');
assert.ok(coastGroundHeight(120,1600)<coastGroundHeight(40,1600));
for(let i=0;i<COAST_BUILDINGS.length;i++) {
  const a=COAST_BUILDINGS[i];for(const b of COAST_BUILDINGS.slice(i+1))assert.ok(Math.abs(a.x-b.x)>(a.w+b.w)/2||Math.abs(a.z-b.z)>(a.d+b.d)/2,'Coastal architecture has separate footprints');
  for(let x=a.x-a.w/2;x<=a.x+a.w/2;x+=4)for(let z=a.z-a.d/2;z<=a.z+a.d/2;z+=4)assert.equal(worldDrivable(x,z),false,'Buildings do not occupy a road');
}

// Construct the actual coastal scene in Node. No mocked Three geometry: road,
// guardrail, palms, beach, furniture, and building collisions are inspected.
const originalDocument=globalThis.document;
globalThis.document={createElement:()=>({width:512,height:96,getContext:()=>({fillRect(){},fillText(){}})})};
const scene=new THREE.Scene(),obstacles=[],buildings=[],traffic=[],cars=[],seats=[],trafficControllers=[],surfaces=[],glows=[],lamps=[],actors=[];
const C={road:new THREE.MeshStandardMaterial(),walk:new THREE.MeshStandardMaterial(),grass:new THREE.MeshStandardMaterial()};
const cube=(parent,x,y,z,w,h,d,material)=>{const mesh=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),material);mesh.position.set(x,y+h/2,z);parent.add(mesh);if(h<=.25&&(Object.values(C).includes(material)||material.userData.walkSurface))surfaces.push({minX:x-w/2,maxX:x+w/2,minZ:z-d/2,maxZ:z+d/2,top:y+h});return mesh;};
const groundHeight=(x,z)=>surfaces.filter(s=>x>=s.minX&&x<=s.maxX&&z>=s.minZ&&z<=s.maxZ).reduce((y,s)=>Math.max(y,s.top),coastGroundHeight(x,z));
let coast;
try {
  coast=createCoastWorld({scene,C,cube,obstacles,buildings,traffic,seats,trafficControllers,groundSurfaces:surfaces,groundHeight,
    visualKit:{windowMaterial:()=>new THREE.MeshPhysicalMaterial(),atmosphere:{registerGlow:(...args)=>glows.push(args),addStreetLight:lamp=>lamps.push(lamp)}},
    car:(x,z,color,heading,moving=false,speed=0,axis='z')=>{const mesh=new THREE.Group();mesh.position.set(x,0,z);mesh.rotation.y=heading;mesh.userData={vehicleId:'coast-'+cars.length};cars.push(mesh);if(moving)traffic.push({mesh,speed,axis});return mesh;},
    addCornerSignal(){},characters:{create:p=>{const actor=new THREE.Group();actor.position.set(p.x,groundHeight(p.x,p.z),p.z);actors.push(actor);return actor;}}});
} finally {globalThis.document=originalDocument;}
const blocked=(x,z,radius=.5)=>!worldWalkable(x,z)||obstacles.some(o=>x>o.minX-radius&&x<o.maxX+radius&&z>o.minZ-radius&&z<o.maxZ+radius);
assert.ok(coast.palms.length>=100,'The district has a dense palm canopy, not a few isolated trees');
assert.equal(coast.palmGrove.templates.length,3);coast.update(.04,{x:19,z:1300});assert.ok(coast.palmGrove.meshes.some(m=>m.userData.palmDetail==='near'&&m.count>0),'The real coast selects detailed nearby palms');assert.equal(coast.palmGrove.meshes.filter(m=>m.name==='Layered palm crowns').reduce((n,m)=>n+m.count,0),coast.palms.length);
assert.equal(traffic.length,12);assert.equal(cars.length,15,'There are twelve moving cars and three parked beach loaners');
assert.equal(actors.length,8);assert.equal(seats.length,6);
assert.equal(trafficControllers.length,21);assert.ok(glows.length>=30);assert.ok(lamps.length>20);
for(const {mesh} of traffic)assert.ok(vehicleFootprint(mesh.position.x,mesh.position.z,mesh.rotation.y).every(p=>worldDrivable(p.x,p.z)),'Traffic spawns fully within its road');
for(const t of traffic){assert.ok(t.axis==='x'?t.min>=-244&&t.max<=3&&t.mesh.position.z>=1040:t.min>=150&&t.max<=2080,'Southern traffic never wraps to Maple or Northstar');}
for(const seat of seats)assert.equal(groundHeight(seat.x,seat.z),.21000000000000002,'Boardwalk seats stand on a solid walkable surface');
for(let x=-10;x<80;x+=.2)assert.equal(blocked(x,1400),false,'A marked crossing leads continuously through the rail gap to dry sand');
assert.ok(blocked(7.35,1160),'The beachfront guardrail has an actual collision barrier');
assert.ok(coast.guardrails.length>=8);
for(const b of COAST_BUILDINGS)for(let x=b.x+b.w/2+1;x<=b.x+60-11;x+=.5)assert.equal(blocked(x,b.z),false,'Hotel frontage paths are clear of palm trunks and furniture');
for(const actor of actors)assert.equal(blocked(actor.position.x,actor.position.z),false,'Promenade residents start on clear walking paths');
coast.ocean.geometry.computeBoundingBox();coast.beach.geometry.computeBoundingBox();
assert.ok(coast.ocean.geometry.boundingBox.min.x+coast.ocean.position.x>=132,'The sea starts beyond the beach, not under the boulevard');
assert.equal(groundHeight(100,1400),coastGroundHeight(100,1400),'Feet follow the actual sloping sand');
const shader={uniforms:{},vertexShader:THREE.ShaderLib.physical.vertexShader};coast.ocean.material.onBeforeCompile(shader);
assert.ok(shader.vertexShader.includes('transformed.z+=.10*sin')&&shader.vertexShader.includes('objectNormal=normalize'),'Ocean wave motion and normals reach the actual physical material shader');

// Drive the actual dynamics for the whole approach and length of Ocean Drive,
// checking every vehicle corner against the real static collision geometry.
const vehicle=createVehicleState(-2.4,150,0);
const canOccupy=(x,z,heading)=>{
  const shape=vehicleFootprint(x,z,heading);return shape.every(p=>worldDrivable(p.x,p.z))&&!obstacles.some(o=>rectanglesOverlap(shape,[{x:o.minX,z:o.minZ},{x:o.maxX,z:o.minZ},{x:o.maxX,z:o.maxZ},{x:o.minX,z:o.maxZ}]));
};
let metres=0;for(let i=0;i<4000&&vehicle.z<2060;i++){const step=advanceVehicle(vehicle,{forward:1},.04,canOccupy);assert.equal(step.collided,false,'Southbound car clears every pole, rail, and building');metres+=step.distance;}
assert.ok(vehicle.z>=2060&&metres>1900,'The road connects Maple to the far end of the beachfront');
for(const target of [{x:2.4,z:600},{x:2.4,z:1900},{x:-120,z:1500},{x:-185,z:1560},{x:-240,z:1980}]) {
  const route=southResponseRoute({x:136,z:-39},target);
  for(let i=1;i<route.length;i++){const a=route[i-1],b=route[i],n=Math.ceil(Math.hypot(a.x-b.x,a.z-b.z));for(let k=0;k<=n;k++){const x=a.x+(b.x-a.x)*k/n,z=a.z+(b.z-a.z)*k/n;if(z>158){assert.ok(vehicleFootprint(x,z,0).every(p=>worldDrivable(p.x,p.z)),'Police reach southern incidents entirely by road');assert.ok(!obstacles.some(o=>x>o.minX-.5&&x<o.maxX+.5&&z>o.minZ-.5&&z<o.maxZ+.5));}}}
}
const saved=restoreCarOwnership({offerId:'used',fuel:2,pose:{x:-2.4,z:1800,heading:Math.PI}});
assert.equal(saved.pose.z,1800,'Owned cars retain their coastal position in saved games');
for(let i=0;i<300;i++)coast.update(.04);
assert.ok(shader.uniforms.coastTime.value>11,'Ocean time advances through the shipped update handler');
assert.ok(actors.every(a=>a.position.z>=1105&&a.position.z<=2020),'Walking residents stay on the promenade');
const flamingo=COAST_BUILDINGS.find(b=>b.name==='THE FLAMINGO'&&b.height>30);
const shortFlamingo=COAST_BUILDINGS.find(b=>b.name==='THE FLAMINGO'&&b.height<30);
assert.ok(flamingo&&shortFlamingo);
assert.equal(blocked(shortFlamingo.x,shortFlamingo.z),true,'The shorter namesake stays a solid street building');
assert.equal(blocked(flamingo.x,flamingo.z),false,'The tall Flamingo lobby is walkable');
const door=flamingo.x+flamingo.w/2;
for(let i=0;i<40;i++)coast.update(.05,{x:door+3,z:flamingo.z});
for(let x=door+1;x>flamingo.x-8;x-=.4)assert.equal(blocked(x,flamingo.z),false,'The street door and lobby aisle stay open');
for(let z=flamingo.z;z<flamingo.z+15.2;z+=.4)assert.equal(blocked(flamingo.x-8.3,z),false,'The aisle from the entrance to the elevator stays open');
assert.equal(coast.inside({x:flamingo.x,z:flamingo.z}),true);
assert.ok(coast.nearestElevator({x:flamingo.x-8.3,z:flamingo.z+16}));
assert.equal(coast.floorY(),.21);
const rider={position:{x:flamingo.x-8.3,y:.21,z:flamingo.z+14.5}};
assert.equal(coast.rideTo(1,rider),true);
for(let i=0;i<220;i++)coast.update(.05,rider.position);
assert.equal(coast.isRiding(),false,'The elevator ride finishes');
assert.ok(Math.abs(coast.floorY()-8.35)<.02,'The cab arrives on the sky lounge');
assert.ok(Math.abs(rider.position.y-8.35)<.02&&Math.abs(rider.position.x-(flamingo.x-8.3))<.2);
assert.equal(blocked(rider.position.x,rider.position.z-3),false,'The lounge in front of the elevator is walkable');
assert.equal(coast.rideTo(2,rider),true);
for(let i=0;i<220;i++)coast.update(.05,rider.position);
assert.ok(Math.abs(coast.floorY()-13.15)<.02,'The cab continues to the guest suites');
assert.equal(coast.rideTo(0,rider),true);
for(let i=0;i<220;i++)coast.update(.05,rider.position);
assert.ok(Math.abs(coast.floorY()-.21)<.02,'The elevator returns to the lobby');
const html=await readFile(new URL('../index.html',import.meta.url),'utf8');
const trafficCode=html.slice(html.indexOf('function advanceTraffic(dt)'),html.indexOf('const playerStopDwell='));
const cpu=new THREE.Group();cpu.position.set(-2.4,0,1208);
const physics=await import('../assets/vehicle-physics.js');
const safety=await import('../assets/traffic-safety.js');
const trafficContext={...physics,...safety,pedestrianTracker:safety.createPedestrianTracker(),characters:{actors:[]},player:{position:{x:50,y:0,z:50}},traffic:[{mesh:cpu,speed:7,axis:'z',min:1050,max:2070}],vehicleRefs:[{group:cpu}],trafficControllers:[{ix:0,iz:1240,offset:0}],stopJunctions:[],signalClock:12,riding:null,twoWheelWorld:{vehicles:[]},driving:null,groundHeight,bridgePitch:()=>0,updateVehicleVisual(){}};
vm.createContext(trafficContext);vm.runInContext(trafficCode,trafficContext);
for(let i=0;i<450;i++)trafficContext.advanceTraffic(.1);
assert.ok(cpu.position.z<1230.5,'Coastal traffic waits before the red light, not in the middle of the intersection');
trafficContext.signalClock=2;for(let i=0;i<100;i++)trafficContext.advanceTraffic(.1);assert.ok(cpu.position.z>1240,'Coastal traffic continues after green');
assert.ok(html.includes('incident.z>158?southResponseRoute'),'The actual dispatcher selects the southern road network');
assert.ok(html.includes('createCoastWorld({')&&html.includes('coastWorld.update('),'The coast is constructed and animated in the shipped game');
const northSource=await readFile(new URL('../assets/north-world.js',import.meta.url),'utf8');assert.ok(northSource.includes('225,1800,.35,1550'),'The former grass bank no longer covers the new ocean');
console.log('Coastal world passed: actual scene construction, 24 buildings, palms, 1.9 km drive, road/footpath continuity, physical rail gaps, beach boundaries and slopes, clear hotel paths, traffic and residents, police routes, lighting registrations, boardwalk seating, and saved coastal car positions.');
const {RIDE_SPAWNS}=await import('../assets/two-wheel-models.js'),{twoWheelFootprint}=await import('../assets/two-wheel-physics.js');
for(const p of RIDE_SPAWNS.filter(p=>p.z>1040)){const shape=twoWheelFootprint(p.x,p.z,p.heading,p.kind);assert.ok(shape.every(q=>p.kind==='motorcycle'?worldDrivable(q.x,q.z):worldWalkable(q.x,q.z)),p.id+' has an accessible riding surface');assert.ok(!obstacles.some(o=>rectanglesOverlap(shape,[{x:o.minX,z:o.minZ},{x:o.maxX,z:o.minZ},{x:o.maxX,z:o.maxZ},{x:o.minX,z:o.maxZ}])),p.id+' clears actual coastal furniture and architecture');}
const cameraRules=await import('../assets/city-camera.js'),cameraGeometry=await import('../assets/camera-geometry.js'),cameraWorld=cameraRules.createCameraWorld(cameraGeometry.cameraArchitectureBoxes(scene));
const cameraPlayer=new THREE.Group(),hotelCamera=new THREE.PerspectiveCamera();cameraPlayer.position.set(flamingo.x,.21,flamingo.z);coast.update(.04,cameraPlayer.position);assert.equal(scene.getObjectByName('Flamingo art-deco shell').visible,true,'Entering the hotel keeps its architecture visible');const hotelCameraContext={...cameraRules,cameraRig:cameraRules.createCameraRig(cameraWorld.resolve),cameraPreferences:cameraRules.restoreCamera(),THREE,player:cameraPlayer,camera:hotelCamera,civicWorld:{interior:()=>null},clothingWorld:{interior:()=>null},coastWorld:coast,driving:null,riding:null,carSpeed:0,yaw:0,pitch:.12,camDist:5.3,performance:{now:()=>0}};vm.createContext(hotelCameraContext);vm.runInContext(html.split('\n').filter(l=>l.startsWith('function cameraFollow(')||l.startsWith('function applyCameraView(')).join('\n'),hotelCameraContext);for(let yaw=0;yaw<6.3;yaw+=.2){hotelCameraContext.yaw=yaw;hotelCameraContext.cameraFollow(.04);const bounds=coast.interior(cameraPlayer.position);assert.ok(hotelCamera.position.x>=bounds.minX&&hotelCamera.position.x<=bounds.maxX);assert.ok(hotelCamera.position.z>=bounds.minZ&&hotelCamera.position.z<=bounds.maxZ);assert.ok(hotelCamera.position.y<bounds.ceiling);}
const navigation=await import('../assets/city-navigation.js'),courierRules=await import('../assets/courier-jobs.js');const walkValid=navigation.createWalkValidator(obstacles);for(const target of [courierRules.COURIER_JOBS[2].dropoff,{x:48,z:1400}]){const route=navigation.planCityRoute({x:0,z:1106},target,{mode:'walk',walkValid});assert.ok(route,'Native coastal route to '+(target.name||'beach'));for(let i=1;i<route.points.length;i++)assert.ok(navigation.lineClear(route.points[i-1],route.points[i],walkValid),'Coastal guidance clears actual guardrails, palm trunks and buildings');}
