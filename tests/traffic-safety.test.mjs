import assert from 'node:assert/strict';
import {createPedestrianTracker,pedestrianYield,pedestrianStepClear} from '../assets/traffic-safety.js';
const car={x:0,y:0,z:0,axis:'z',direction:1,speed:7};
assert(pedestrianYield(car,[{x:0,y:0,z:12}],.04).speedLimit<7||pedestrianYield(car,[{x:0,y:0,z:12}],.04).yielding);
assert.equal(pedestrianYield(car,[{x:3,y:0,z:5}],.04).yielding,false,'Sidewalk people do not stop traffic');
assert.equal(pedestrianYield(car,[{x:0,y:8,z:5}],.04).yielding,false,'People upstairs do not stop traffic below');
assert.equal(pedestrianYield(car,[{x:0,y:0,z:-5}],.04).yielding,false,'People behind the car do not stop forward traffic');
assert(pedestrianYield(car,[{x:3,y:0,z:12,vx:-1.55,vz:0}],.04).yielding,'Anticipate a pedestrian crossing into the lane');
assert.equal(pedestrianYield(car,[{x:3,y:0,z:12,vx:1.55,vz:0}],.04).yielding,false,'A person moving away from the lane does not hold traffic');
for(const axis of ['x','z'])for(const dir of [-1,1]){const pose={...car,axis,direction:dir,speed:30},ped=axis==='z'?{x:0,z:dir*4}:{x:dir*4,z:0},r=pedestrianYield(pose,[ped],.2);assert(r.hardClearance<30*.2,'Sudden step-outs limit swept travel in both directions');assert(r.hardClearance>=0);}
const c={x:0,y:0,z:0,heading:0};assert.equal(pedestrianStepClear({x:-5,z:0},{x:5,z:0},[c]),false,'Swept crossing cannot tunnel through a car');assert.equal(pedestrianStepClear({x:-5,z:4},{x:5,z:4},[c]),true);assert.equal(pedestrianStepClear({x:-5,y:8,z:0},{x:5,y:8,z:0},[c]),true);assert.equal(pedestrianStepClear({x:-5,z:2},{x:5,z:2},[{...c,heading:Math.PI/2}]),true,'Rotated car uses its actual orientation');
const tracker=createPedestrianTracker(),a={position:{x:0,y:0,z:0},visible:true},b={position:{x:0,z:0},visible:false};assert.equal(tracker.sample([a,b],.04).length,1);a.position.x=.1;assert.equal(tracker.sample([a],.05)[0].vx,2);a.position.x=100;assert.equal(tracker.sample([a],.05)[0].vx,0,'Teleports do not produce a crossing prediction');assert.equal(tracker.sample([a],.05,{exclude:new Set([a])}).length,0);
console.log('Traffic safety passed: swept pedestrian protection, crossing prediction, sidewalks, reverse lanes, height separation, tracking and teleport exclusion.');

assert.equal(pedestrianStepClear({x:0,z:0},{x:.1,z:0},[c]),true,'An encroached pedestrian can move outward from a car centre');assert.equal(pedestrianStepClear({x:1,z:0},{x:.5,z:0},[c]),false,'An encroached pedestrian cannot move deeper through the car');
