import assert from 'node:assert/strict';
import {readFile,stat} from 'node:fs/promises';
import * as THREE from 'three';
import {AIRPORT,airportInside,worldWalkable,worldDrivable,districtName} from '../assets/world-rules.js';
import {AIRPORT_MODELS} from '../assets/airport/models.js';
import {AIRPLANE_FLEET} from '../assets/airplanes/fleet.js';
import {SKYLINE_LAYOUT} from '../assets/city/skyline/layout.js';
import {arrivalMotion,departureMotion,sampleMotion,smoothCorners,createAirportOps,standCentreZ,GLIDE,AIRPORT_CENTRE} from '../assets/airport-ops.js';
import {planCityRoute,createWalkValidator,lineClear} from '../assets/city-navigation.js';

const file=p=>new URL('../'+p,import.meta.url),A=AIRPORT,R=A.runway;
// Models: the owner's terminal, tower, landmark and travelator, compressed and in budget.
for(const [key,limit] of [['terminal',1.6e6],['terminalMobile',6e5],['tower',4e5],['landmark',1.5e5],['travelator',2e5]]){const m=AIRPORT_MODELS[key],bytes=await readFile(file(m.url.slice(2)));
  assert.ok(bytes.length<limit,key+' under '+limit+' bytes');const json=JSON.parse(bytes.subarray(20,20+bytes.readUInt32LE(12)).toString('utf8'));assert.ok(json.extensionsUsed.includes('EXT_meshopt_compression'),key+' meshopt');
  for(const img of json.images||[])assert.equal(img.mimeType,'image/webp',key+' textures are WebP');}
assert.ok(AIRPORT_MODELS.terminal.triangles<120000&&AIRPORT_MODELS.terminalMobile.triangles<40000&&AIRPORT_MODELS.tower.triangles<15000);
assert.ok(Math.abs(AIRPORT_MODELS.terminal.width-230.5)<1&&Math.abs(AIRPORT_MODELS.tower.height-72)<.5&&Math.abs(AIRPORT_MODELS.travelator.depth-13.9)<.2,'scaled to metres');

// Rules: landside and terminal are open; the airside is not; one door into the hall.
assert.ok(A.bounds.minX>SKYLINE_LAYOUT.skyline.bounds.maxX,'clear of the downtown skyline');
assert.ok(worldDrivable(240,A.road.z)&&worldDrivable(250,A.road.z)&&worldDrivable(1150,A.loop.curb)&&worldDrivable(1150,-1850),'road from Northstar to the curb and parking');
for(const p of [[1150,-1975],[900,-1800],[1150,-2030],[1150,-2100],[1150,-2140],[1060,-2135]])assert.ok(worldWalkable(...p),'walkable '+p);
for(const p of [[1100,A.landside.minZ+.1],[1200,A.landside.minZ+.1],[1150,-2300],[1600,R.z],[2000,A.taxiway.z],[1300,-2400],[1700,-2330],[1100,-2100]])assert.equal(worldWalkable(...p),false,'not walkable '+p);
assert.ok(worldWalkable(1150,A.landside.minZ+.1),'through the main doors');assert.equal(worldDrivable(1150,-2030),false);
assert.equal(districtName(-2400,1500),'Northstar Airport');assert.equal(districtName(-1750,200),'Northstar City');
assert.ok(airportInside(1150,-2030)&&airportInside(1150,-2140)&&!airportInside(1150,-1975));

// World: build in Node with a canvas stub and a fake model loader.
const ctx=new Proxy({},{get:()=>()=>{},set:()=>true});globalThis.document={createElement:()=>({width:0,height:0,getContext:()=>ctx})};
const {createAirportWorld,AIRPORT_PLACES,AIRPORT_FACTS,AIRPORT_THINK,TRAVELATORS,travelatorAt,departuresBoard,BELT_SPEED}=await import('../assets/airport-world.js');
const m=new THREE.MeshStandardMaterial(),C={road:m,walk:m,grass:m},cube=(p,x,y,z,w,h,d,mat)=>{const o=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),mat);o.position.set(x,y+h/2,z);p.add(o);return o;};
const fake=()=>{const g=new THREE.Group();g.add(new THREE.Mesh(new THREE.BoxGeometry(1,1,1),new THREE.MeshStandardMaterial({name:'body'})));return g;};
const glows=[],scene=new THREE.Scene(),obstacles=[],ground=[],people=[];let cars=0;
const world=createAirportWorld({scene,visualKit:{atmosphere:{registerGlow:(mt,o)=>glows.push(o),addStreetLight(){}}},cube,C,obstacles,groundSurfaces:ground,parkedCar:()=>cars++,characters:{create:o=>people.push(o)},getHour:()=>15.5,loader:{loadAsync:async()=>({scene:fake()})}});
assert.ok(people.length>=10&&people.every(p=>worldWalkable(p.x,p.z)&&airportInside(p.x,p.z)&&!obstacles.some(o=>p.x>o.minX-.3&&p.x<o.maxX+.3&&p.z>o.minZ-.3&&p.z<o.maxZ+.3)),'travellers stand inside, clear of furniture');
assert.ok(cars>=10&&glows.length>=3&&ground.some(g=>g.inside)&&world.root.userData.architectureBoxes.length>12,'cars, night glow, floors and camera/rain boxes');
const walkValid=createWalkValidator(obstacles),route=(a,b)=>{const r=planCityRoute(a,b,{mode:'walk',walkValid});return r&&r.points.every((p,i)=>!i||lineClear(r.points[i-1],p,walkValid))?r:null;};
assert.ok(route({x:1150,z:-1960},{x:1150,z:-2140}),'walk from the curb through the hall and corridor to the gates');
assert.ok(route({x:300,z:-1745},{x:A.terminal.x,z:-1970}),'walk the access road from Northstar');
assert.ok(planCityRoute({x:0,z:-120},{x:1150,z:-1977,parking:{x:1150,z:A.loop.curb}},{mode:'drive'}),'drive from Maple Street');
for(const [id,s] of Object.entries(AIRPORT_PLACES)){assert.ok(AIRPORT_FACTS[id].length>80&&AIRPORT_THINK[id].question&&AIRPORT_THINK[id].answer);assert.equal(world.nearestLandmark({x:s.x+.5,z:s.z}).id,id);
  if(id!=='landmark')assert.ok(worldWalkable(s.x,s.z)&&!obstacles.some(o=>s.x>o.minX&&s.x<o.maxX&&s.z>o.minZ&&s.z<o.maxZ),id+' can be reached');}
assert.equal(world.nearestLandmark({x:1600,z:-2600}),null);
// Moving walkways: two directions, carry the player along, open at both ends.
assert.equal(TRAVELATORS.length,6);assert.deepEqual(world.conveyor({x:1146,z:-2090}),{x:0,z:-BELT_SPEED});assert.deepEqual(world.conveyor({x:1154,z:-2090}),{x:0,z:BELT_SPEED});assert.equal(world.conveyor({x:1150,z:-2090}),null);
for(const t of TRAVELATORS){assert.ok(travelatorAt(t)===t&&worldWalkable(t.x,t.z));for(const end of [-1,1])assert.ok(!obstacles.some(o=>{const z=t.z+end*7;return t.x>o.minX&&t.x<o.maxX&&z>o.minZ&&z<o.maxZ;}),'open ends');}
// Inside/outside swap and streamed models.
world.update(.1,{position:{x:1150,z:-2030}});assert.ok(world.inside&&world.interior.visible&&!world.exterior.visible);world.update(.1,{position:{x:1150,z:-1970}});assert.ok(!world.inside&&!world.interior.visible&&world.exterior.visible);
await world.loadModels();assert.equal(world.models.state,'ready');assert.ok(world.models.terminal&&world.models.tower&&world.models.landmark);assert.equal(world.models.travelators.length,6);
const board=departuresBoard(15.5);assert.equal(board.length,8);assert.equal(board[0].status,'Boarding');assert.match(board[0].time,/^3:(4|5)\d PM$/);assert.ok(board.every(f=>A.stands.some(s=>s.id===f.gate)));

// Flight paths: 3-degree approach onto runway 27, taxi on paved surfaces, climb-out clear of the skyline.
const paved=(x,z,m=2)=>{const inRect=(x0,x1,z0,z1)=>x>=x0-m&&x<=x1+m&&z>=z0-m&&z<=z1+m;const T=A.taxiway,L=A.taxilane,P=A.apron;
  return inRect(R.x0-50,R.x1+50,R.z-R.halfWidth,R.z+R.halfWidth)||inRect(T.x0,T.x1,T.z-T.halfWidth,T.z+T.halfWidth)||A.connectors.some(c=>inRect(c-T.halfWidth,c+T.halfWidth,R.z,T.z))||inRect(A.apronLink-T.halfWidth,A.apronLink+T.halfWidth,T.z,L.z)||inRect(L.x0,L.x1,L.z-L.halfWidth,L.z+L.halfWidth)||inRect(P.minX,P.maxX,P.minZ,P.maxZ);};
const skylineTop=SKYLINE_LAYOUT.skyline.top,inSkyline=(x,z)=>x>=SKYLINE_LAYOUT.skyline.bounds.minX-30&&x<=SKYLINE_LAYOUT.skyline.bounds.maxX+30&&z>=SKYLINE_LAYOUT.skyline.bounds.minZ-30&&z<=SKYLINE_LAYOUT.skyline.bounds.maxZ+30;
for(const plane of AIRPLANE_FLEET)for(const stand of A.stands.filter(s=>plane.span<=s.maxSpan)){
  const arr=arrivalMotion(plane,stand),dep=departureMotion(plane,stand),first=sampleMotion(arr,0);
  assert.ok(first.x-R.threshold>5000&&Math.abs((first.y-15)/(first.x-R.threshold)-GLIDE)<1e-9&&first.z===R.z,'3-degree final from over 5 km');
  let touchdown=null;for(let t=0;t<=arr.duration;t+=.5){const p=sampleMotion(arr,t);if(!touchdown&&p.y<=0)touchdown=p;if(!p.airborne)assert.ok(paved(p.x,p.z),plane.id+' arrival stays on pavement at '+p.x.toFixed(0)+','+p.z.toFixed(0));if(p.airborne)assert.ok(Math.abs(p.z-R.z)<1e-9);}
  assert.ok(touchdown.x<=R.touchdown+1&&touchdown.x>R.touchdown-40&&touchdown.speed>60&&touchdown.speed<72,'touches down at the aiming point at landing speed');
  const end=sampleMotion(arr,arr.duration);assert.ok(Math.abs(end.x-stand.x)<1e-6&&Math.abs(end.z-standCentreZ(plane))<1e-6&&Math.abs(end.yaw)<1e-6&&end.speed===0,'parks nose-in at the stand');
  let lift=null;for(let t=0;t<=dep.duration;t+=.5){const p=sampleMotion(dep,t);if(!p.airborne)assert.ok(paved(p.x,p.z),plane.id+' departure stays on pavement');else{lift||=p;if(inSkyline(p.x,p.z))assert.ok(p.y>skylineTop+40,'clear of the skyline');}}
  assert.ok(lift&&lift.x<1530&&lift.x>1300&&lift.speed>=77,'lifts off past the middle of the runway');}
// Parked planes at neighbouring stands never touch wingtips.
const sorted=[...A.stands].sort((a,b)=>a.x-b.x);for(let i=1;i<sorted.length;i++)assert.ok(sorted[i].x-sorted[i-1].x>=(sorted[i].maxSpan+sorted[i-1].maxSpan)/2-12,'stand spacing '+sorted[i].id);
for(const s of A.stands)assert.ok(standCentreZ(AIRPLANE_FLEET.find(p=>p.span<=s.maxSpan))<A.terminal.airside-30,'parked planes stay clear of the terminal');
assert.deepEqual(smoothCorners([[0,0],[100,0],[100,100]],20).at(-1),[100,100]);

// Operations: three planes at the gates on the first visit, one movement at a time, nothing when far away.
const library={instance:async plane=>{const g=new THREE.Group();g.add(new THREE.Mesh(new THREE.BoxGeometry(plane.span,4,plane.length)));const pts=()=>new THREE.Points();g.userData.lights={beacon:pts(),strobe:pts(),steady:{}};g.userData.plane=plane;return g;}};
const events=[],ops=createAirportOps({scene:new THREE.Scene(),library,gap:30,onEvent:e=>events.push(e.kind)}),tick=async(n,pos,dt=.25)=>{for(let i=0;i<n;i++){ops.update(dt,{position:pos});if(i%40===0)await new Promise(r=>setTimeout(r,0));}};
await tick(400,{x:0,z:-120});assert.equal(ops.state.started,false,'idle while the player is far away');
const at={x:1150,z:-1970};await tick(1,at);await new Promise(r=>setTimeout(r,0));assert.deepEqual(ops.stands.filter(s=>s.object).map(s=>s.id).sort(),['A2','A4','B1']);
for(const s of ops.stands.filter(q=>q.plane))assert.ok(s.plane.span<=s.maxSpan,'parked planes fit their stands');
await tick(200,at);assert.equal(ops.state.active?.kind,'arrival');assert.deepEqual(events,['arrival']);
const cam={position:new THREE.Vector3(1150,1.7,-1970),matrixWorldInverse:new THREE.Matrix4()};let loud=0;
while(ops.state.active){await tick(40,at);loud=Math.max(loud,ops.sound(cam).level);}assert.ok(loud>.2,'engines heard while it lands and taxis');
assert.equal(ops.stands.filter(s=>s.object).length,4,'the arrival parks at a free stand');assert.equal(ops.sound(cam).level,0);
await tick(200,at);assert.equal(ops.state.active?.kind,'departure');const leaving=ops.state.active.object;while(ops.state.active)await tick(40,at);
assert.ok(!ops.group.children.includes(leaving),'the departure leaves');assert.equal(ops.stands.filter(s=>s.object).length,3);assert.deepEqual(events,['arrival','departure']);

// Game wiring.
const index=await readFile(file('index.html'),'utf8');
assert.match(index,/const airportWorld=createAirportWorld\(\{scene,visualKit,cube,C,obstacles,groundSurfaces,characters,mobile:mobileGraphics,getHour:\(\)=>cityTime\.hour,parkedCar:/);
assert.match(index,/const airportOps=createAirportOps\(\{scene,library:airTraffic\.library,onEvent:/);
assert.match(index,/airportWorld\.update\(dt,\{position:player\.position\}\);airportOps\.update\(dt,\{position:player\.position\}\);/);
assert.match(index,/const belt=airportWorld\.conveyor\(player\.position\)/);assert.match(index,/near\.kind==="airport"/);assert.match(index,/airport:\{name:'Northstar Airport'/);assert.match(index,/setCityDestination\(\\'airport\\'\)/);
console.log('Airport passed: owner models, landside and terminal rules, one-door hall, walkways, lessons, 3-degree landings, taxi on pavement, skyline-safe climbs, stands and operations.');
