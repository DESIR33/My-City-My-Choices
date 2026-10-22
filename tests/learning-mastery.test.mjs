import assert from 'node:assert/strict';
import test from 'node:test';
import {freshLearning,restoreLearning,recordAttempt,refreshStatus,skillState,pickSkill,applyPlacement,STATUS} from '../assets/learning/mastery.js';
import {tierForAge} from '../assets/learning/tiers.js';

const hit={correct:true,firstTry:true,hints:0,seconds:5};
const miss={correct:true,firstTry:false,hints:1,seconds:9,missed:'Q',given:'$1.00'};
const base=tier=>({...freshLearning('kid'),tier});

test('ages map to tiers',()=>{
  assert.deepEqual([6,7,8,9,10,12].map(tierForAge),['sprout','sprout','builder','builder','planner','planner']);
});

test('three first-try answers level up; two misses level down with a worked example',()=>{
  let l=base('builder');
  assert.equal(skillState(l,'change.make').level,2);
  for(let i=0;i<3;i++)l=recordAttempt(l,'change.make',hit,1);
  let s=skillState(l,'change.make');
  assert.equal(s.level,3);assert.equal(s.status,STATUS.PRACTICING);
  l=recordAttempt(l,'change.make',miss,2);l=recordAttempt(l,'change.make',miss,2);
  s=skillState(l,'change.make');
  assert.equal(s.level,2);assert.equal(s.workedExample,true);assert.deepEqual(s.drops,[2]);
  l=recordAttempt(l,'change.make',hit,2);
  assert.equal(skillState(l,'change.make').workedExample,false);
});

test('level never leaves 1 to 5',()=>{
  let l=base('sprout');
  for(let i=0;i<10;i++)l=recordAttempt(l,'coins.value',miss,1);
  assert.equal(skillState(l,'coins.value').level,1);
  for(let i=0;i<30;i++)l=recordAttempt(l,'coins.value',hit,1);
  assert.equal(skillState(l,'coins.value').level,5);
});

test('mastered, needs review, and back',()=>{
  let l=base('sprout');
  for(let i=0;i<5;i++)l=recordAttempt(l,'coins.value',hit,1);
  assert.equal(skillState(l,'coins.value').status,STATUS.MASTERED);
  l=recordAttempt(l,'coins.value',miss,2);l=recordAttempt(l,'coins.value',miss,2);
  assert.equal(skillState(l,'coins.value').status,STATUS.REVIEW);
  l=recordAttempt(l,'coins.value',hit,3);l=recordAttempt(l,'coins.value',hit,3);
  assert.equal(skillState(l,'coins.value').status,STATUS.MASTERED);
  l=refreshStatus(l,10);
  assert.equal(skillState(l,'coins.value').status,STATUS.REVIEW,'a week without practice brings it back for review');
});

test('mastery needs the tier target level',()=>{
  let l=base('planner');
  l={...l,skills:{'borrow.cost':{...skillState(l,'borrow.cost'),level:1}}};
  for(let i=0;i<5;i++)l=recordAttempt(l,'borrow.cost',{...hit},1);
  // level 1 -> 2 after three hits; still below Planner target 4
  assert.notEqual(skillState(l,'borrow.cost').status,STATUS.MASTERED);
});

test('pickSkill respects tier and prefers the weakest skill',()=>{
  let l=base('sprout');
  assert.equal(pickSkill(l,['biz.profit'],'x'),null,'Sprout never sees business profit');
  l={...l,skills:{'read.detail':{...skillState(l,'read.detail'),level:3,status:'practicing'},'prices.add':{...skillState(l,'prices.add'),level:1,status:'practicing'}}};
  const picks=new Set(Array.from({length:40},(_,i)=>pickSkill(l,['read.detail','prices.add'],'d'+i)));
  assert.deepEqual([...picks],['prices.add']);
});

test('pickSkill mixes in review of mastered skills',()=>{
  let l=base('builder');
  l={...l,skills:{'prices.add':{...skillState(l,'prices.add'),status:'mastered',level:4}}};
  const picks=Array.from({length:200},(_,i)=>pickSkill(l,['prices.add','read.detail'],'r'+i));
  const review=picks.filter(p=>p==='prices.add').length;
  assert.ok(review>30&&review<100,'about 30% review, got '+review);
});

test('placement nudges levels and suggests a tier without changing it',()=>{
  const l=applyPlacement(base('builder'),[{skill:'coins.value',correct:true},{skill:'change.make',correct:true},{skill:'prices.add',correct:true}]);
  assert.equal(l.tier,'builder');assert.equal(l.tierSuggestion,'planner');assert.equal(skillState(l,'change.make').level,3);
  const low=applyPlacement(base('builder'),[{skill:'coins.value',correct:false},{skill:'change.make',correct:false},{skill:'prices.add',correct:false}]);
  assert.equal(low.tierSuggestion,'sprout');assert.equal(skillState(low,'prices.add').level,1);
});

test('restore validates and drops bad data',()=>{
  let l=base('planner');
  for(let i=0;i<3;i++)l=recordAttempt(l,'save.goal',hit,4);
  const back=restoreLearning(JSON.parse(JSON.stringify(l)));
  assert.deepEqual(back.skills['save.goal'],l.skills['save.goal']);
  const bad=restoreLearning({tier:'wizard',skills:{'fake.skill':{level:3},'coins.value':{level:99,status:'??'}},parentPinHash:'1234'});
  assert.equal(bad.tier,null);assert.equal(bad.skills['fake.skill'],undefined);
  assert.equal(bad.skills['coins.value'].level,1);assert.equal(bad.skills['coins.value'].status,'new');
  assert.equal(bad.parentPinHash,null);
  assert.equal(restoreLearning(null).tier,null);
});
