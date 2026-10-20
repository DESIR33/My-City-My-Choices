import assert from 'node:assert/strict';
import {sampleRoadSurface as sample} from '../assets/road-surfaces.js';
import {createVehicleState,advanceVehicle} from '../assets/vehicle-physics.js';
import {createTwoWheelState,advanceTwoWheeler} from '../assets/two-wheel-physics.js';
assert.equal(sample(0,0).kind,'asphalt');assert.equal(sample(35,1500).kind,'paving');assert.equal(sample(300,1500).kind,'boundary');assert.ok(sample(0,-440,Math.PI).grade>0);assert.ok(sample(0,-440,0).grade<0);assert.equal(sample(40,-440,0).grade,0);assert.equal(sample(0,-650,0).grade,0);
function stop(wet,kind){let s=kind==='car'?createVehicleState(0,30):createTwoWheelState(kind,0,30);s.speed=12;const start=s.z;for(let i=0;i<1200&&s.speed>.01;i++){const surface=sample(s.x,s.z,s.heading,wet);if(kind==='car')advanceVehicle(s,{forward:-1,surface},1/120);else advanceTwoWheeler(s,{forward:-1,surface},1/120);}assert.ok(s.speed<.02);return s.z-start;}
for(const kind of ['car','motorcycle','bicycle']){const dry=stop(0,kind),wet=stop(1,kind);assert.ok(wet>dry*1.2,kind+' needs more braking distance after rain');}
const flat=createVehicleState(0,-450,Math.PI),up=createVehicleState(0,-450,Math.PI);flat.travelHeading=up.travelHeading=Math.PI;for(let i=0;i<360;i++){advanceVehicle(flat,{forward:1},1/120);advanceVehicle(up,{forward:1,surface:sample(up.x,up.z,up.heading)},1/120);}assert.ok(up.speed<flat.speed,'Bridge grade reduces uphill acceleration');
for(const hz of [30,60,120]){const s=createVehicleState(0,30);for(let i=0;i<hz*3;i++)advanceVehicle(s,{forward:1,surface:sample(s.x,s.z,s.heading,1)},1/hz);assert.ok(Number.isFinite(s.speed)&&s.speed>0);}
console.log('Road surfaces passed: all districts, bridge direction/grade, dry/wet braking for all ride types, uphill car acceleration and frame rates.');
