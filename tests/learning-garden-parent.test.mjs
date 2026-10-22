import assert from 'node:assert/strict';
import test from 'node:test';
import {simulate,summarize,pathsSvg,GARDEN_PLANS} from '../assets/learning/garden-sim.js';
import {startQuestion,answerQuestion,questionHtml} from '../assets/learning/session.js';
import {generateQuestion} from '../assets/learning/skills.js';
import {freshLearning,recordAttempt} from '../assets/learning/mastery.js';
import {parentModel,parentHtml,hashPin,validPin} from '../assets/learning/parent-view.js';

test('garden odds match the design doc within 2%',()=>{
  const expect={jar:{median:1486,mean:1486,below:0},steady:{median:1883,mean:1912,below:0},weather:{median:1480,mean:2652,below:.41}};
  for(const plan of GARDEN_PLANS){
    const s=summarize(plan.id,1000,20,10000,'doc');
    const e=expect[plan.id];
    assert.ok(Math.abs(s.mean-e.mean)/e.mean<.02,plan.id+' mean '+s.mean);
    assert.ok(Math.abs(s.median-e.median)/e.median<.05,plan.id+' median '+s.median);
    assert.ok(Math.abs(s.belowStart-e.below)<.02,plan.id+' below start '+s.belowStart);
  }
});

test('garden paths are seeded and the chart draws one line per plan',()=>{
  assert.deepEqual(simulate('weather',1000,20,'a'),simulate('weather',1000,20,'a'));
  assert.equal(simulate('jar',100,5,'x').at(-1),110);
  const svg=pathsSvg(GARDEN_PLANS.map(p=>({id:p.id,values:simulate(p.id,1000,20,'c')})));
  assert.equal((svg.match(/<polyline/g)||[]).length,3);
  assert.ok(!/NaN/.test(svg));
});

test('hint ladder: hint, hint, worked example, then the child enters it',()=>{
  const q=generateQuestion('change.make',2,'h');
  let s=startQuestion(q,{tier:'builder',seed:'h',now:0});
  const wrong=(s.p.correctIndex+1)%s.p.options.length;
  let r=answerQuestion(s,wrong,1000);assert.equal(r.status,'hint');assert.ok(r.message.includes(q.hints[0]));
  r=answerQuestion(r.session,wrong,2000);assert.equal(r.status,'hint');assert.ok(r.message.includes(q.hints[1]));
  r=answerQuestion(r.session,wrong,3000);assert.equal(r.status,'worked');assert.ok(r.message.includes(s.p.options[s.p.correctIndex].label));
  r=answerQuestion(r.session,s.p.correctIndex,9000);
  assert.equal(r.status,'correct');
  assert.deepEqual({c:r.attempt.correct,f:r.attempt.firstTry,h:r.attempt.hints,sec:r.attempt.seconds},{c:true,f:false,h:3,sec:9});
  assert.equal(r.attempt.missed,q.prompt);
  s=startQuestion(q,{tier:'planner',seed:'h',now:0});
  assert.equal(s.p.mode,'number');
  assert.match(questionHtml(s,'learnAnswer'),/input id="learnAnswer"/);
  r=answerQuestion(s,(q.answer/100).toFixed(2),4000);
  assert.equal(r.status,'correct');assert.equal(r.attempt.firstTry,true);
});

test('question HTML escapes text',()=>{
  const s=startQuestion({skill:'read.detail',level:1,kind:'choice',prompt:'<img src=x>',correct:'a<b',choices:['a<b','c'],hints:['h1','h2'],steps:[]},{tier:'sprout',seed:'e'});
  const html=questionHtml(s,'go');
  assert.ok(!html.includes('<img'));assert.ok(html.includes('a&lt;b'));
});

test('parent model shows status, stuck skills and try-at-home prompts',async()=>{
  let l={...freshLearning('kid'),tier:'builder',tierSuggestion:'planner'};
  const miss={correct:true,firstTry:false,hints:2,seconds:20,missed:'Nia pays $5.00 for $2.40.',given:'$3.40'};
  for(const d of [2,2,3,3])l=recordAttempt(l,'change.make',miss,d);
  for(let i=0;i<5;i++)l=recordAttempt(l,'read.detail',{correct:true,firstTry:true},3);
  const m=parentModel(l,{name:'Desi',day:4,cash:3,saved:2,shopping:1.5,gardenPlan:'Steady Garden'});
  assert.equal(m.skills.length,10);
  assert.equal(m.stuck.map(s=>s.id).join(),'change.make');
  assert.equal(m.suggestion,'Planner');
  assert.equal(m.rate,56);
  const html=parentHtml(m);
  assert.match(html,/Mastered/);assert.match(html,/count the change/);assert.match(html,/Answered: \$3.40/);assert.match(html,/Goal savings \$2.00/);
  assert.ok(!parentHtml({...m,name:'<script>'}).includes('<script>'));
  assert.ok(validPin('0427'));assert.ok(!validPin('42'));
  const a=await hashPin('0427','kid'),b=await hashPin('0427','kid'),c=await hashPin('0428','kid');
  assert.equal(a,b);assert.notEqual(a,c);assert.match(a,/^[0-9a-f]{64}$/);
});
