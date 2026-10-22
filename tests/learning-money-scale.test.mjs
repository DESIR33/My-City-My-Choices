import test from 'node:test';
import assert from 'node:assert/strict';
import {generateQuestion,SCALED_SKILLS,SKILLS} from '../assets/learning/skills.js';
import {present,checkAnswer} from '../assets/learning/question.js';
import {money,formatValue} from '../assets/learning/format.js';
import {marketPayment} from '../assets/learning/generators/money-basics.js';

// Rewrite every rendered amount in unscaled text as it should read at k× money.
const scaleText=(s,k)=>String(s).replace(/-?\$[\d,]+\.\d{2}|\d+¢/g,m=>{
  if(m.endsWith('¢')){const v=parseInt(m,10)*k;return v<100?v+'¢':money(v)}
  const neg=m.startsWith('-'),v=Math.round(parseFloat(m.replace(/[-$,]/g,''))*100)*k;return (neg?'-':'')+money(v);
});

test('scaled skills render the same question at k times the money',()=>{
  for(const id of SCALED_SKILLS)for(const k of [10,100])for(let level=1;level<=5;level++)for(let seed=0;seed<200;seed++){
    const a=generateQuestion(id,level,'s'+seed),b=generateQuestion(id,level,'s'+seed,{moneyUnit:k}),where=id+' L'+level+' s'+seed+' ×'+k;
    assert.equal(b.prompt,scaleText(a.prompt,k),where);
    assert.deepEqual(b.hints,a.hints.map(h=>scaleText(h,k)),where);
    assert.equal(b.solution,scaleText(a.solution,k),where);
    if(a.kind==='number'&&(a.format==='money'||a.format==='cents')){
      assert.equal(b.answer,a.answer*k,where);
      assert.deepEqual(b.distractors,a.distractors.map(d=>d*k),where);
    }else{
      assert.equal(b.answer,a.answer,where);
      if(a.kind==='choice'){assert.equal(b.correct,scaleText(a.correct,k),where);assert.deepEqual(b.choices,a.choices.map(c=>scaleText(c,k)),where)}
    }
    for(const mode of ['choice','number']){
      const p=present(b,{mode,options:4,seed:'p'+seed});
      if(p.mode==='choice'){
        assert.equal(new Set(p.options.map(o=>o.label)).size,p.options.length,where);
        assert.equal(checkAnswer(p,p.correctIndex),true,where);
      }else assert.equal(checkAnswer(p,formatValue(b.answer,b.format)),true,where);
    }
  }
});

test('coin, change and time skills ignore the money unit',()=>{
  for(const s of SKILLS.filter(s=>!SCALED_SKILLS.includes(s.id)))for(let level=1;level<=5;level++)for(let seed=0;seed<50;seed++)
    assert.deepEqual(generateQuestion(s.id,level,'c'+seed,{moneyUnit:100}),generateQuestion(s.id,level,'c'+seed),s.id);
});

test('the money unit never leaks out of question generation',()=>{
  generateQuestion('prices.add',3,'leak',{moneyUnit:100});
  assert.equal(money(125),'$1.25');
  assert.throws(()=>generateQuestion('nope',1,'x',{moneyUnit:100}));
  assert.equal(money(125),'$1.25');
});

test('market payments round up in the tier money steps',()=>{
  for(const [u,price] of [[1,100],[10,1000],[100,10000],[100,12500],[10,750]])for(let L=1;L<=5;L++)for(let seed=0;seed<40;seed++){
    const paid=marketPayment(L,price,'m'+seed,u);
    assert.ok(paid>price,u+' L'+L);
    assert.equal(paid%(25*u),0,u+' L'+L);
    assert.equal(marketPayment(L,price/u,'m'+seed)*u,paid,'×'+u+' L'+L+' matches the unscaled payment');
  }
});
