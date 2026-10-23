import assert from 'node:assert/strict';
import {firstStepCue} from '../assets/first-steps.js';

const base={stage:'parent',position:{x:0,z:0},target:{x:0,z:-20},nearKind:null};
for(const [x,z,direction] of [[0,-20,'north'],[20,-20,'northeast'],[20,0,'east'],[20,20,'southeast'],[0,20,'south'],[-20,20,'southwest'],[-20,0,'west'],[-20,-20,'northwest']])assert.ok(firstStepCue({...base,target:{x,z}}).title.endsWith(direction));
assert.match(firstStepCue(base).detail,/green marker/);assert.match(firstStepCue({...base,stage:'maya'}).detail,/gold marker/);
assert.equal(firstStepCue({...base,nearKind:'parent'}).title,'Press E · Talk to Mom');assert.equal(firstStepCue({...base,nearKind:'parent',mobile:true}).title,'Tap Talk to Mom');
assert.equal(firstStepCue({...base,stage:'maya',nearKind:'maya',mobile:true}).title,'Tap Talk to Maya');assert.match(firstStepCue({...base,stage:'maya',nearKind:'maya'}).detail,/startup plan/);
const blocked={...base,target:{x:0,z:0},nearKind:'communityDoor'};assert.equal(firstStepCue(blocked).title,'Meet Mom · nearby');assert.match(firstStepCue(blocked).detail,/Move clear/);assert.ok(!firstStepCue(blocked).title.includes('Press E'));
assert.match(firstStepCue({...base,mounted:true,nearKind:'parent'}).title,/step out first/);assert.match(firstStepCue({...base,mounted:true,mobile:true}).detail,/Dismount/);assert.match(firstStepCue({...base,seated:true,nearKind:'parent'}).title,/Stand up/);
for(const stage of ['goal','customers','choice','done','__proto__','constructor',null])assert.equal(firstStepCue({...base,stage}),null);
for(const bad of [null,{}, {x:NaN,z:1},{x:0,z:Infinity}]){assert.equal(firstStepCue({...base,position:bad}),null);assert.equal(firstStepCue({...base,target:bad}),null);}
const near=firstStepCue({...base,target:{x:0,z:-9.1}});assert.match(near.title,/10 m north/);assert.equal(firstStepCue({...base,target:{x:0,z:-10.1}}).title,near.title,'Rounded distances avoid constant text changes');
console.log('First-step cues pass: both story contacts, eight world directions, rounded distance, desktop/touch readiness, nearby-object precedence, vehicle/seated states and invalid/inactive inputs.');
