import assert from 'node:assert/strict';
import test from 'node:test';
import {SKILLS,generateQuestion,skillsForTier} from '../assets/learning/skills.js';
import {present,checkAnswer} from '../assets/learning/question.js';
import {formatValue,parseAnswer} from '../assets/learning/format.js';
import {marketPayment} from '../assets/learning/generators/money-basics.js';

const SEEDS=1000;

test('every skill and level makes valid questions for 1,000 seeds',()=>{
  for(const skill of SKILLS)for(let level=1;level<=5;level++){
    const slots=new Map();
    for(let i=0;i<SEEDS;i++){
      const q=generateQuestion(skill.id,level,'s'+i,{context:i%2?'store':'restaurant'});
      assert.equal(q.skill,skill.id);assert.equal(q.level,level);
      assert.ok(q.prompt.length>10&&!/\{\w+\}/.test(q.prompt),skill.id+' L'+level+' prompt: '+q.prompt);
      assert.ok(!/NaN|undefined/.test(q.prompt),skill.id+' L'+level+' prompt: '+q.prompt);
      assert.equal(q.hints.length,2);
      for(const h of q.hints)assert.ok(!/\{\w+\}|NaN|undefined/.test(h),skill.id+' hint: '+h);
      if(q.kind==='number'){
        assert.ok(Number.isInteger(q.answer)&&q.answer>0,skill.id+' L'+level+' answer '+q.answer+' for '+q.prompt);
        if(['money','time'].includes(q.format))assert.ok(!q.hints.slice(0,1).some(h=>h.includes(formatValue(q.answer,q.format))),skill.id+' hint gives away the answer: '+q.hints.join(' | '));
      }else{
        assert.ok(q.choices.includes(q.correct));
        assert.ok(q.choices.length>=2);
      }
      for(const mode of ['choice','number']){
        const p=present(q,{mode,options:4,seed:'p'+i});
        if(p.mode==='choice'){
          const labels=p.options.map(o=>o.label);
          assert.equal(new Set(labels).size,labels.length,skill.id+' L'+level+' duplicate options '+labels.join(', '));
          assert.ok(p.options.length>=2);
          assert.ok(checkAnswer(p,p.correctIndex));
          assert.ok(!checkAnswer(p,(p.correctIndex+1)%p.options.length));
          if(mode==='choice')slots.set(p.correctIndex,(slots.get(p.correctIndex)||0)+1);
        }else{
          assert.ok(checkAnswer(p,formatValue(p.answer,p.format)),'typed answer accepted: '+formatValue(p.answer,p.format));
        }
      }
    }
    // The correct answer must not sit in one slot: kids could pattern-guess.
    const most=Math.max(...slots.values());
    assert.ok(most<SEEDS*0.75,skill.id+' L'+level+' answer in the same slot '+most+' of '+SEEDS);
  }
});

test('same seed gives the same question; different seeds vary',()=>{
  for(const skill of SKILLS){
    assert.deepEqual(generateQuestion(skill.id,3,'a'),generateQuestion(skill.id,3,'a'));
    const prompts=new Set(Array.from({length:30},(_,i)=>generateQuestion(skill.id,3,'v'+i).prompt));
    assert.ok(prompts.size>3,skill.id+' has little variety');
  }
});

test('change and price math is exact',()=>{
  for(let i=0;i<500;i++){
    const q=generateQuestion('change.make',4,'c'+i);
    const [price,paid]=[...q.prompt.matchAll(/\$(\d+\.\d\d)/g)].map(m=>Math.round(Number(m[1])*100));
    assert.equal(q.answer,paid-price);
  }
  const sale=generateQuestion('prices.add',5,'sale');
  assert.match(sale.prompt,/% off/);
});

test('typed answers parse money, cents and time',()=>{
  assert.equal(parseAnswer('$1.25','money'),125);
  assert.equal(parseAnswer('1.5','money'),150);
  assert.equal(parseAnswer('75¢','cents'),75);
  assert.equal(parseAnswer('3','money'),300);
  assert.equal(parseAnswer('10:45','time'),645);
  assert.equal(parseAnswer('1:15 pm','time'),795);
  assert.equal(parseAnswer('abc','count'),null);
});

test('tier skill lists grow with age',()=>{
  assert.equal(skillsForTier('sprout').length,8);
  assert.equal(skillsForTier('builder').length,10);
  assert.equal(skillsForTier('planner').length,12);
});

test('market payments get harder with level and always cover the price',()=>{
  for(const price of [100,125])for(let level=1;level<=5;level++){
    const pay=marketPayment(level,price,'m');
    assert.ok(pay>price);
  }
  assert.equal(marketPayment(1,100,'x'),125);
  assert.equal(marketPayment(5,125,'x'),2000);
});
