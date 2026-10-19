// Reserves are plans within wallet cash, not another account. Savings are separate money.
export const PLAN_CATEGORIES=Object.freeze([
  Object.freeze({id:'business',name:'Business supplies',hint:'Your next opening day'}),
  Object.freeze({id:'home',name:'Home & bills',hint:'Rent or the next home payment'}),
  Object.freeze({id:'transport',name:'Car care',hint:'Fuel and service'}),
  Object.freeze({id:'fun',name:'Treats & extras',hint:'Clothes, shoes, and things you want'}),
  Object.freeze({id:'buffer',name:'Just in case',hint:'Room for an unexpected choice'})
]);
const hasCategory=id=>PLAN_CATEGORIES.some(c=>c.id===id);
const cents=n=>Number.isSafeInteger(n)&&n>=0?n:0;
export function freshMoneyPlan(){return {version:1,reserves:Object.fromEntries(PLAN_CATEGORIES.map(c=>[c.id,0]))};}
export function restoreMoneyPlan(saved){const plan=freshMoneyPlan();if(saved&&typeof saved==='object')for(const c of PLAN_CATEGORIES)plan.reserves[c.id]=Math.min(1e8,cents(saved.reserves?.[c.id]));return plan;}
export function planTotals(plan,wallet){const planned=PLAN_CATEGORIES.reduce((n,c)=>n+cents(plan.reserves[c.id]),0);return {planned,unplanned:cents(wallet)-planned,shortfall:Math.max(0,planned-cents(wallet))};}
export function changeReserve(plan,wallet,id,change){
  if(!hasCategory(id)||!Number.isSafeInteger(change))return {ok:false,reason:'Choose a valid plan amount.',plan};
  const next=plan.reserves[id]+change;if(next<0)return {ok:false,reason:'That plan cannot go below zero.',plan};
  if(change>0&&change>planTotals(plan,wallet).unplanned)return {ok:false,reason:'There is not enough unplanned wallet cash. Reduce another plan first.',plan};
  return {ok:true,plan:{...plan,reserves:{...plan.reserves,[id]:next}}};
}
export function plannedSpend(plan,wallet,id,cost){
  const price=cents(cost),allocated=hasCategory(id)?Math.min(cents(plan.reserves[id]),price):0;
  const next={...plan,reserves:{...plan.reserves}};if(hasCategory(id))next.reserves[id]-=allocated;
  const afterWallet=cents(wallet)-price,totals=planTotals(next,Math.max(0,afterWallet));
  return {canAfford:Number.isSafeInteger(cost)&&cost>=0&&cost<=cents(wallet),price,allocated,afterWallet,afterPlan:next,unplannedAfter:afterWallet-totals.planned,shortfall:Math.max(0,totals.planned-afterWallet),newShortfall:Math.max(0,totals.planned-afterWallet)-planTotals(plan,wallet).shortfall};
}
export function moveGoalMoney(wallet,savings,amount,direction){
  if(![wallet,savings,amount].every(Number.isSafeInteger)||wallet<0||savings<0||amount<=0)return {ok:false,reason:'Choose a positive amount in cents.'};
  if(direction==='save'&&amount<=wallet)return {ok:true,wallet:wallet-amount,savings:savings+amount};
  if(direction==='withdraw'&&amount<=savings)return {ok:true,wallet:wallet+amount,savings:savings-amount};
  return {ok:false,reason:direction==='save'?'Your wallet does not have that much cash.':'Your goal savings do not have that much money.'};
}
