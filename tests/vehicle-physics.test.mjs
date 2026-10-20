import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
const source=await readFile(new URL('../assets/vehicle-physics.js',import.meta.url),'utf8').catch(()=>readFile(new URL('../assets/vehicle-physics.js',import.meta.url),'utf8'));
const {createVehicleState,advanceVehicle,vehicleFootprint,vehicleBlocksPedestrian,rectanglesOverlap,VEHICLE}=await import('data:text/javascript;base64,'+Buffer.from(source).toString('base64'));
function drive(seconds,input,hz=60,state=createVehicleState(),collision){for(let i=0;i<Math.round(seconds*hz);i++)advanceVehicle(state,typeof input==='function'?input(i/hz):input,1/hz,collision);return state;}
const result=[];
for(const hz of [30,60,120])result.push(drive(8,t=>({forward:t<5?1:0,steer:t>=2&&t<4?.4:0}),hz));
for(const s of result.slice(1)){assert.ok(Math.hypot(s.x-result[0].x,s.z-result[0].z)<.02,'Frame-rate independence');assert.ok(Math.abs(s.speed-result[0].speed)<.01);}
const accelerate=drive(5,{forward:1});assert.ok(accelerate.speed>11&&accelerate.speed<18,'Smooth road-scale acceleration');
const startSpeed=accelerate.speed;drive(1,{forward:0},60,accelerate);assert.ok(accelerate.speed<startSpeed&&accelerate.speed>startSpeed*.8,'Coasting retains momentum');
const stop=createVehicleState();stop.speed=13;let brakeDistance=0;for(let i=0;i<180&&stop.speed>.05;i++){const old=stop.z;advanceVehicle(stop,{forward:-1},1/60);brakeDistance+=stop.z-old;assert.ok(stop.speed>=0,'Brakes do not immediately reverse');}
assert.ok(stop.speed<.1&&brakeDistance>7&&brakeDistance<20,'Plausible stopping distance');
const wait=createVehicleState();drive(.2,{forward:-1},60,wait);assert.equal(wait.speed,0,'Direction change waits at rest');drive(1,{forward:-1},60,wait);assert.ok(wait.speed<0&&wait.speed>=-VEHICLE.maxReverse);assert.equal(wait.gear,'R');
const hand=createVehicleState();hand.speed=12;drive(2,{forward:1,handbrake:true},60,hand);assert.equal(hand.speed,0,'Handbrake overrides throttle');
const rest=createVehicleState();drive(2,{steer:1},60,rest);assert.equal(rest.x,0);assert.equal(rest.z,0);assert.equal(rest.heading,0,'No rotation at rest');
const low=createVehicleState(),high=createVehicleState();low.speed=3;high.speed=17;drive(.5,{steer:1},60,low);drive(.5,{steer:1},60,high);assert.ok(Math.abs(high.steering)<Math.abs(low.steering),'Reduced steering lock at speed');assert.ok(Math.abs(high.lateralAcceleration)<=9.81*.93,'Grip limit');
const straightPull=createVehicleState(),cornerPull=createVehicleState();straightPull.speed=cornerPull.speed=12;drive(.75,{forward:1},60,straightPull);drive(.75,{forward:1,steer:.8},60,cornerPull);assert.ok(cornerPull.speed<straightPull.speed-.25,'Cornering consumes tire grip and reduces acceleration');
const reverse=createVehicleState();reverse.direction=-1;reverse.speed=-3;drive(.4,{forward:-1,steer:.6},60,reverse);assert.ok(reverse.heading<0,'Reversing changes turn direction');
const crash=drive(4,{forward:1},60,createVehicleState(),(x,z,h)=>vehicleFootprint(x,z,h).every(p=>p.z<=8));assert.ok(crash.z<=8-VEHICLE.length/2+.001,'Bumper cannot cross wall');assert.equal(crash.speed,0);
const contactZ=crash.z;drive(2,{forward:-1},60,crash,(x,z,h)=>vehicleFootprint(x,z,h).every(p=>p.z<=8));assert.ok(crash.z<contactZ-2,'A collision allows reversing away from the wall');assert.equal(crash.gear,'R');drive(3,{forward:1},60,crash,(x,z,h)=>vehicleFootprint(x,z,h).every(p=>p.z<=8));assert.ok(crash.z>contactZ-2,'The car can select forward again after reversing');
const disabled=createVehicleState();disabled.disabled=true;disabled.speed=8;const noDrive=advanceVehicle(disabled,{forward:1,steer:1},.1);assert.equal(disabled.speed,0);assert.equal(disabled.x,0);assert.equal(disabled.z,0);assert.equal(noDrive.distance,0,'An explicit disabled flag still stops a vehicle');
assert.equal(rectanglesOverlap(vehicleFootprint(0,0,0),vehicleFootprint(0,3,0)),true);assert.equal(rectanglesOverlap(vehicleFootprint(0,0,0),vehicleFootprint(4,0,Math.PI/4)),false);
const parked={x:10,z:20,heading:Math.PI/4};
assert.ok(vehicleBlocksPedestrian(10,20,parked),'The car body remains solid');
assert.ok(vehicleBlocksPedestrian(11.2,21.2,parked),'The rotated body blocks pedestrians along its length');
assert.ok(vehicleBlocksPedestrian(11.8,21.8,parked),'The bumper preserves pedestrian clearance');
assert.equal(vehicleBlocksPedestrian(11.8,18.2,parked),false,'Empty space beside a diagonal car is walkable');
assert.equal(vehicleBlocksPedestrian(8.2,21.8,parked),false,'Both sides of a diagonal car are walkable');
assert.ok(accelerate.pitch<.04&&Math.abs(high.roll)<.06,'Suspension stays bounded');
console.log(JSON.stringify({checks:'Vehicle physics passed',speedAfterFiveSecondsMPH:+(startSpeed*2.237).toFixed(1),stoppingDistanceFrom29MPHMetres:+brakeDistance.toFixed(2),frameRates:[30,60,120],coverage:['acceleration','coasting','stopping','reverse delay','handbrake','steering at rest','speed sensitivity','grip cap','reverse steering','bumper collision','rectangle overlap','suspension']},null,2));
