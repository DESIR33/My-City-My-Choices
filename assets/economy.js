// Tier-scaled story money. Every amount the game stores is integer cents in the
// active tier's own money; the original catalogue values are the Sprout tier.
// A tier change converts stored amounts once through convertCents().
export const ECONOMY_TIERS=Object.freeze(['sprout','builder','planner']);
export const isEconomyTier=t=>ECONOMY_TIERS.includes(t);

// Multipliers applied to the original (Sprout) cent catalogue, by category.
// `core` covers everything that sets the pace toward a goal (wallet start, goals,
// business costs and sales, restocking, upgrades, neighbor jobs, Garden Club), so
// days-to-goal stay the same in every tier. Other categories are tuned to feel
// realistic for older players and do not gate goal progress.
export const FACTORS=Object.freeze({
  core:Object.freeze({sprout:1,builder:10,planner:100}),
  rent:Object.freeze({sprout:1,builder:10,planner:150}),
  projects:Object.freeze({sprout:1,builder:10,planner:100}),
  clothes:Object.freeze({sprout:1,builder:10,planner:15}),
  food:Object.freeze({sprout:1,builder:3,planner:4}),
  courier:Object.freeze({sprout:1,builder:10,planner:20}),
  car:Object.freeze({sprout:1,builder:10,planner:1000}),
  fuel:Object.freeze({sprout:1,builder:10,planner:25}),
  service:Object.freeze({sprout:1,builder:10,planner:100}),
  home:Object.freeze({sprout:1,builder:10,planner:2500})
});

// Original story amounts in Sprout cents. Values here always scale with `core`.
export const CORE=Object.freeze({
  startWallet:500,
  restock:200,
  upgrade:200,
  neighborJob:200,
  firstShift:200,
  gardenStake:100,
  gardenDemo:1000,
  planStep:25,
  planStepBig:100,
  starterSale:100,
  premiumSale:125
});
export const GOAL_TARGETS=Object.freeze([600,500,800]);

// Buying the furnished home. Sprout and Builder keep the original simple plan;
// Planner buys a pricier home with a small down payment and a loan that earns interest.
export const HOME_PURCHASE=Object.freeze({
  sprout:Object.freeze({price:1000,down:500,installment:100}),
  builder:Object.freeze({price:10000,down:5000,installment:1000}),
  planner:Object.freeze({price:2500000,down:100000,installment:50000})
});
export const RENT_CENTS=200;

// Real-life money systems by tier. Rates are per in-game week (seven business days)
// and deliberately larger than real rates so the change is visible while playing.
export const MONEY_SYSTEMS=Object.freeze({
  sprout:Object.freeze({savingsRate:0,payroll:false,taxRate:0,homeLoanRate:0,carLoan:false,carLoanRate:0,carDownShare:0,bills:false}),
  builder:Object.freeze({savingsRate:.02,payroll:false,taxRate:0,homeLoanRate:0,carLoan:false,carLoanRate:0,carDownShare:0,bills:false}),
  planner:Object.freeze({savingsRate:.01,payroll:true,taxRate:.1,homeLoanRate:.005,carLoan:true,carLoanRate:.01,carDownShare:.2,bills:true})
});
// Monthly bills (Planner). A month is four in-game weeks.
export const BILLS=Object.freeze([
  Object.freeze({id:'phone',name:'Phone plan',amount:5000,needsHome:false,detail:'Calls, texts and data for one month.'}),
  Object.freeze({id:'utilities',name:'Home utilities',amount:15000,needsHome:true,detail:'Power and water for your home for one month.'})
]);
export const WEEK_DAYS=7,MONTH_WEEKS=4;
export const weekIndex=day=>Math.floor((Math.max(1,day|0)-1)/WEEK_DAYS);
export const isWeekStart=day=>Number.isSafeInteger(day)&&day>1&&(day-1)%WEEK_DAYS===0;
export const isMonthStart=day=>isWeekStart(day)&&weekIndex(day)%MONTH_WEEKS===1;

// Denominations for the market stall's change tray, by tier.
const DENOMINATIONS=Object.freeze([
  {id:'penny',name:'Penny',value:1,label:'1¢',kind:'coin copper'},
  {id:'nickel',name:'Nickel',value:5,label:'5¢',kind:'coin silver'},
  {id:'dime',name:'Dime',value:10,label:'10¢',kind:'coin silver'},
  {id:'quarter',name:'Quarter',value:25,label:'25¢',kind:'coin silver'},
  {id:'half',name:'Half-dollar',value:50,label:'50¢',kind:'coin silver'},
  {id:'coin1',name:'$1 coin',value:100,label:'$1',kind:'coin silver'},
  {id:'bill1',name:'$1 bill',value:100,label:'$1',kind:'bill'},
  {id:'bill5',name:'$5 bill',value:500,label:'$5',kind:'bill'},
  {id:'bill10',name:'$10 bill',value:1000,label:'$10',kind:'bill'},
  {id:'bill20',name:'$20 bill',value:2000,label:'$20',kind:'bill'},
  {id:'bill50',name:'$50 bill',value:5000,label:'$50',kind:'bill'},
  {id:'bill100',name:'$100 bill',value:10000,label:'$100',kind:'bill'}
].map(Object.freeze));
const TRAY=Object.freeze({
  sprout:['penny','nickel','dime','quarter','half','coin1','bill1','bill5','bill10'],
  builder:['quarter','half','bill1','bill5','bill10','bill20','bill50'],
  planner:['bill1','bill5','bill10','bill20','bill50','bill100']
});
export function changeDenominations(tier=active){return (TRAY[tier]||TRAY.sprout).map(id=>DENOMINATIONS.find(d=>d.id===id));}

let active='sprout';
export function setEconomyTier(tier){active=isEconomyTier(tier)?tier:'sprout';return active;}
export function economyTier(){return active;}
export function factor(category,tier=active){
  const f=FACTORS[category]?.[tier];
  if(!f)throw Error('Unknown economy category '+category+' for '+tier);
  return f;
}
// Scale an original Sprout catalogue amount (cents) into the tier's money.
export function scaled(cents,category='core',tier=active){return Math.round(cents*factor(category,tier));}
export const core=(key,tier=active)=>{if(!(key in CORE))throw Error('Unknown core amount '+key);return scaled(CORE[key],'core',tier);};
export const goalTarget=(i,tier=active)=>scaled(GOAL_TARGETS[i]??0,'core',tier);
export const homePurchase=(tier=active)=>HOME_PURCHASE[tier]||HOME_PURCHASE.sprout;
export const rentPrice=(tier=active)=>scaled(RENT_CENTS,'rent',tier);
export const systems=(tier=active)=>MONEY_SYSTEMS[tier]||MONEY_SYSTEMS.sprout;
// Learning questions show money at the same scale as the story wallet.
export const moneyUnit=(tier=active)=>factor('core',tier);

// Convert a stored amount (cents) from one tier's money into another's.
export function convertCents(cents,category,from,to){
  if(!Number.isFinite(cents))return cents;
  if(from===to||!isEconomyTier(from)||!isEconomyTier(to))return Math.round(cents);
  return Math.round(cents*factor(category,to)/factor(category,from));
}
// Same conversion for the entry point's dollar values, kept to whole cents.
export function convertDollars(dollars,category,from,to){
  if(!Number.isFinite(dollars))return dollars;
  return convertCents(Math.round(dollars*100),category,from,to)/100;
}

const groups=n=>String(n).replace(/\B(?=(\d{3})+(?!\d))/g,',');
// "$1,234.50". With short: true, whole dollars drop ".00" ("$2") and amounts under
// a dollar read as cents ("50¢"), matching the story's existing wording.
export function formatMoney(cents,{short=false}={}){
  const c=Math.round(Number(cents)||0),neg=c<0,a=Math.abs(c),d=Math.floor(a/100),r=a%100;
  if(short&&a<100&&a>0)return (neg?'-':'')+a+'¢';
  if(short&&r===0)return (neg?'-':'')+'$'+groups(d);
  return (neg?'-':'')+'$'+groups(d)+'.'+String(r).padStart(2,'0');
}
export const formatDollars=(dollars,opts)=>formatMoney(Math.round((Number(dollars)||0)*100),opts);
