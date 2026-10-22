// Skill registry: which tiers see each skill and which generator makes its questions.
import {coinsValue,coinsCount,changeMake} from './generators/money-basics.js';
import {pricesAdd,affordCompare,bizProfit} from './generators/spending.js';
import {saveGoal,budgetPlan,riskChoose,borrowCost} from './generators/planning.js';
import {readDetail,timeOrder} from './generators/everyday.js';
import {tierAtLeast} from './tiers.js';

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
export function generateQuestion(skillId,level,seed,opts){
  const s=skillById(skillId);
  if(!s)throw Error('Unknown skill '+skillId);
  return s.generate(level,seed,opts);
}
// Skills each business practices for its customers, besides counting change.
// The market stall (0) practices change.make only.
export const BUSINESS_SKILLS=Object.freeze({
  1:['read.detail','prices.add','afford.compare'],
  2:['read.detail','prices.add','afford.compare'],
  3:['time.order','save.goal','biz.profit']
});
