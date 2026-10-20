import assert from 'node:assert/strict';
import {advanceTwoWheeler as advance,createTwoWheelState as create,TWO_WHEEL_SPECS as specs} from '../assets/two-wheel-physics.js';
function simulate(kind,input,seconds,hz=60){const s=create(kind);for(let i=0;i<seconds*hz;i++)advance(s,input,1/hz);return s;}
for(const kind of ['bicycle','motorcycle']){
 const s=simulate(kind,{forward:1},5);assert.ok(s.speed>3&&s.speed<=specs[kind].maxSpeed);const initial=s.speed;
 for(let i=0;i<60;i++)advance(s,{forward:0},1/60);assert.ok(s.speed<initial&&s.speed>0,'coasts');
 for(let i=0;i<300;i++)advance(s,{forward:-1},1/60);assert.equal(s.speed,0,'brakes without reversing');
 const z=s.z;for(let i=0;i<120;i++)advance(s,{forward:-1,walkBack:true},1/60);assert.ok(s.z<z&&s.speed<0&&s.speed>=-1.1,'walks backward');
 const turn=simulate(kind,{forward:1,steer:.7},6);assert.ok(turn.heading>0&&turn.lean<0&&Math.abs(turn.lean)<=specs[kind].maxLean,'speed-dependent balanced lean');
 const stationary=simulate(kind,{steer:1},3);assert.equal(stationary.heading,0);assert.equal(stationary.lean,0);
 const at30=simulate(kind,{forward:1},5,30),at120=simulate(kind,{forward:1},5,120);assert.ok(Math.abs(at30.z-at120.z)<.05,'frame independent integration');
 const hit=create(kind);for(let i=0;i<300;i++)advance(hit,{forward:1},1/60,(x,z)=>z<3);assert.ok(hit.z<3);assert.equal(hit.speed,0);const stopped=hit.z;for(let i=0;i<120;i++)advance(hit,{forward:-1,walkBack:true},1/60,(x,z)=>z<3);assert.ok(hit.z<stopped-.5,'recover from collision');
 const flat=create(kind),up=create(kind);for(let i=0;i<180;i++){advance(flat,{forward:1},1/60);advance(up,{forward:1},1/60,()=>true,z=>z*.06);}assert.ok(up.speed<flat.speed,'climbing consumes power');
}
assert.ok(simulate('motorcycle',{forward:1},5).speed>simulate('bicycle',{forward:1},5).speed*2);
console.log('Two-wheel physics passed: pedal/throttle, coasting, braking, walk back, collision recovery, lean, grip, slopes and frame rates.');
