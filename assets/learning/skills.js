// Skill registry: which tiers see each skill and which generator makes its questions.
import {coinsValue,coinsCount,changeMake} from './generators/money-basics.js';
import {pricesAdd,affordCompare,bizProfit} from './generators/spending.js';
import {saveGoal,budgetPlan,riskChoose,borrowCost} from './generators/planning.js';
import {readDetail,timeOrder} from './generators/everyday.js';
import {tierAtLeast} from './tiers.js';
import {setMoneyUnit} from './format.js';

export const SKILLS=Object.freeze([
  {id:'coins.value',name:'Coin and bill values',minTier:'sprout',generate:coinsValue},
  {id:'coins.count',name:'Counting money',minTier:'sprout',generate:coinsCount},
  {id:'change.make',name:'Making change',minTier:'sprout',generate:changeMake},
  {id:'prices.add',name:'Adding prices',minTier:'sprout',generate:pricesAdd},
  {id:'afford.compare',name:'Can I afford it?',minTier:'sprout',generate:affordCompare},
  {id:'biz.profit',name:'Business profit',minTier:'builder',generate:bizProfit},
  {id:'save.goal',name:'Saving for a goal',minTier:'sprout',generate:saveGoal},
  {id:'budget.plan',name:'Budget planning',minTier:'planner',generate:budgetPlan},
  {id:'risk.choose',name:'Risk and choices',minTier:'builder',generate:riskChoose},
  {id:'borrow.cost',name:'Cost of paying over time',minTier:'planner',generate:borrowCost},
  {id:'read.detail',name:'Reading for detail',minTier:'sprout',generate:readDetail},
  {id:'time.order',name:'Time and order',minTier:'sprout',generate:timeOrder}
].map(Object.freeze));

export const skillById=id=>SKILLS.find(s=>s.id===id)||null;
export const skillsForTier=tier=>SKILLS.filter(s=>tierAtLeast(tier,s.minTier));
// Skills whose money amounts follow the story's tier scale. Coin and change skills
// stay in real coins; time questions have no money.
export const SCALED_SKILLS=Object.freeze(['prices.add','afford.compare','biz.profit','save.goal','budget.plan','risk.choose','borrow.cost','read.detail']);
// Every money generator is linear in its amounts, so rendering at unit k and
// multiplying the answer by k gives the exact question at k times the money.
export function generateQuestion(skillId,level,seed,opts){
  const s=skillById(skillId);
  if(!s)throw Error('Unknown skill '+skillId);
  const k=SCALED_SKILLS.includes(skillId)&&Number.isSafeInteger(opts?.moneyUnit)&&opts.moneyUnit>1?opts.moneyUnit:1;
  if(k===1)return s.generate(level,seed,opts);
  let q;setMoneyUnit(k);
  try{q=s.generate(level,seed,opts)}finally{setMoneyUnit(1)}
  if(q.kind==='number'&&(q.format==='money'||q.format==='cents'))q={...q,answer:q.answer*k,distractors:q.distractors.map(d=>d*k),unit:k};
  return q;
}
// Skills each business practices for its customers, besides counting change.
// The market stall (0) practices change.make only.
export const BUSINESS_SKILLS=Object.freeze({
  1:['read.detail','prices.add','afford.compare'],
  2:['read.detail','prices.add','afford.compare'],
  3:['time.order','save.goal','biz.profit']
});
