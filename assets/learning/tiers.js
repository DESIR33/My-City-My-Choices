// Age tiers set the starting level, the mastery target, and how answers are entered.
export const TIERS=Object.freeze({
  sprout:Object.freeze({id:'sprout',name:'Sprout',ages:[6,7],startLevel:1,targetLevel:2,answerMode:'choice',options:3}),
  builder:Object.freeze({id:'builder',name:'Builder',ages:[8,9],startLevel:2,targetLevel:3,answerMode:'choice',options:4}),
  planner:Object.freeze({id:'planner',name:'Planner',ages:[10,12],startLevel:3,targetLevel:4,answerMode:'number',options:4})
});
export const TIER_ORDER=Object.freeze(['sprout','builder','planner']);
export const AGES=Object.freeze([6,7,8,9,10,11,12]);
export function tierForAge(age){
  const n=Number(age);
  if(!Number.isInteger(n))return 'builder';
  if(n<=7)return 'sprout';
  if(n<=9)return 'builder';
  return 'planner';
}
export function isTier(id){return TIER_ORDER.includes(id)}
export function tierAtLeast(tier,min){return TIER_ORDER.indexOf(tier)>=TIER_ORDER.indexOf(min)}
