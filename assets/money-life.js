// Weekly real-life money: savings interest (Builder and Planner), plus Planner's
// paycheck with tax withheld, loan interest and monthly bills. Pure functions over
// integer cents. Nothing here charges a fee, a penalty or an automatic payment:
// bills and loan payments are always the player's choice.
import {systems,BILLS,weekIndex,isWeekStart,isMonthStart,convertCents,isEconomyTier} from './economy.js';

const cents=n=>Number.isSafeInteger(n)&&n>=0?n:0;
const day=n=>Number.isSafeInteger(n)&&n>0&&n<100000?n:1;
export function freshMoneyLife(){return {version:1,lastWeek:0,payroll:{pending:[],stubs:[]},carLoan:null,bills:[],interestEarned:0,taxPaid:0,loanInterest:0};}
export function restoreMoneyLife(saved){
  const s=freshMoneyLife();if(!saved||typeof saved!=='object'||saved.version!==1)return s;
  s.lastWeek=Number.isSafeInteger(saved.lastWeek)&&saved.lastWeek>=0?saved.lastWeek:0;
  const line=p=>p&&typeof p.label==='string'&&cents(p.gross)>0?{source:String(p.source||'job').slice(0,24),label:p.label.slice(0,80),gross:p.gross,day:day(p.day)}:null;
  s.payroll.pending=(Array.isArray(saved.payroll?.pending)?saved.payroll.pending:[]).map(line).filter(Boolean).slice(-40);
  s.payroll.stubs=(Array.isArray(saved.payroll?.stubs)?saved.payroll.stubs:[]).filter(t=>t&&cents(t.gross)>0&&cents(t.tax)<=t.gross&&t.net===t.gross-t.tax).map(t=>({day:day(t.day),gross:t.gross,tax:t.tax,net:t.net,lines:(Array.isArray(t.lines)?t.lines:[]).map(line).filter(Boolean).slice(0,40)})).slice(-10);
  const loan=saved.carLoan;
  if(loan&&cents(loan.balance)>0&&typeof loan.offerId==='string')s.carLoan={offerId:loan.offerId,balance:loan.balance,paid:cents(loan.paid),interest:cents(loan.interest)};
  s.bills=(Array.isArray(saved.bills)?saved.bills:[]).filter(b=>BILLS.some(x=>x.id===b?.id)&&cents(b.amount)>0).map(b=>({id:b.id,amount:b.amount,day:day(b.day)})).slice(-24);
  for(const k of ['interestEarned','taxPaid','loanInterest'])s[k]=cents(saved[k]);
  return s;
}

// Planner side-job pay waits for payday; other tiers are paid on the spot.
export function earnPay(state,{source='job',label,gross,day:d},tier){
  const g=cents(gross);
  if(!systems(tier).payroll||!g)return {state,paidNow:g};
  return {state:{...state,payroll:{...state.payroll,pending:[...state.payroll.pending,{source,label:String(label||'Work').slice(0,80),gross:g,day:day(d)}].slice(-40)}},paidNow:0};
}
export const pendingPay=state=>state.payroll.pending.reduce((n,p)=>n+p.gross,0);

// Run every week boundary between the last processed week and `businessDay`.
// Returns the new state, wallet/savings/home-loan changes and story events.
export function weeklyTick(state,{businessDay,tier,saved=0,homeLoan=0,housed=false}){
  const sys=systems(tier),target=weekIndex(day(businessDay));
  let s={...state,payroll:{...state.payroll},bills:[...state.bills],carLoan:state.carLoan&&{...state.carLoan}};
  let wallet=0,save=cents(saved),loan=cents(homeLoan);const events=[];
  while(s.lastWeek<target){
    s.lastWeek++;
    const weekDay=s.lastWeek*7+1;
    if(sys.savingsRate>0&&save>0){const i=Math.round(save*sys.savingsRate);if(i>0){save+=i;s.interestEarned+=i;events.push({kind:'savings',amount:i,day:weekDay,rate:sys.savingsRate})}}
    if(sys.payroll&&s.payroll.pending.length){
      const lines=s.payroll.pending,gross=lines.reduce((n,p)=>n+p.gross,0),tax=Math.round(gross*sys.taxRate),net=gross-tax;
      wallet+=net;s.taxPaid+=tax;
      const stub={day:weekDay,gross,tax,net,lines};
      s.payroll={pending:[],stubs:[...s.payroll.stubs,stub].slice(-10)};
      events.push({kind:'paycheck',amount:net,day:weekDay,stub});
    }
    if(sys.homeLoanRate>0&&loan>0){const i=Math.round(loan*sys.homeLoanRate);if(i>0){loan+=i;s.loanInterest+=i;events.push({kind:'home-interest',amount:i,day:weekDay,rate:sys.homeLoanRate})}}
    if(sys.carLoan&&s.carLoan?.balance>0){const i=Math.round(s.carLoan.balance*sys.carLoanRate);if(i>0){s.carLoan.balance+=i;s.carLoan.interest+=i;s.loanInterest+=i;events.push({kind:'car-interest',amount:i,day:weekDay,rate:sys.carLoanRate})}}
    if(sys.bills&&isMonthStart(weekDay)){
      for(const b of BILLS)if(!b.needsHome||housed){s.bills.push({id:b.id,amount:b.amount,day:weekDay});events.push({kind:'bill',id:b.id,amount:b.amount,day:weekDay})}
      s.bills=s.bills.slice(-24);
    }
  }
  return {state:s,walletChange:wallet,saved:save,homeLoan:loan,events};
}
export const billsDue=state=>state.bills.reduce((n,b)=>n+b.amount,0);
export function payBill(state,index,wallet){
  const b=state.bills[index];
  if(!b)return {ok:false,reason:'That bill is already paid.',state,wallet};
  if(!Number.isSafeInteger(wallet)||wallet<b.amount)return {ok:false,reason:'Your wallet does not cover this bill yet.',state,wallet};
  return {ok:true,bill:b,cost:b.amount,wallet:wallet-b.amount,state:{...state,bills:state.bills.filter((_,i)=>i!==index)}};
}
// Planner can finance a car: a down payment now and a loan for the rest.
export function financeTerms(price,tier){
  const sys=systems(tier);if(!sys.carLoan||!cents(price))return null;
  const down=Math.round(price*sys.carDownShare);
  return {price,down,loan:price-down,rate:sys.carLoanRate};
}
export function startCarLoan(state,offerId,loan){return {...state,carLoan:{offerId,balance:cents(loan),paid:0,interest:0}};}
export function payCarLoan(state,amount,wallet){
  const loan=state.carLoan;if(!loan||loan.balance<=0)return {ok:false,reason:'You have no car loan.',state,wallet};
  const pay=Math.min(cents(amount),loan.balance);
  if(!pay)return {ok:false,reason:'Choose an amount to pay.',state,wallet};
  if(!Number.isSafeInteger(wallet)||wallet<pay)return {ok:false,reason:'Your wallet does not cover that payment.',state,wallet};
  const balance=loan.balance-pay;
  return {ok:true,cost:pay,wallet:wallet-pay,state:{...state,carLoan:balance>0?{...loan,balance,paid:loan.paid+pay}:null}};
}
// Leaving Planner pays out waiting pay in full (no tax) so nothing earned is lost.
export function convertMoneyLife(state,from,to){
  if(from===to||!isEconomyTier(from)||!isEconomyTier(to))return {state,walletChange:0};
  const c=(v,cat)=>convertCents(v,cat,from,to);
  let s={...state,
    payroll:{pending:state.payroll.pending.map(p=>({...p,gross:c(p.gross,'courier')})),stubs:state.payroll.stubs.map(t=>{const gross=c(t.gross,'courier'),tax=Math.min(gross,c(t.tax,'courier'));return {...t,gross,tax,net:gross-tax,lines:t.lines.map(p=>({...p,gross:c(p.gross,'courier')}))}})},
    carLoan:state.carLoan&&{...state.carLoan,balance:c(state.carLoan.balance,'car'),paid:c(state.carLoan.paid,'car'),interest:c(state.carLoan.interest,'car')},
    bills:state.bills.map(b=>({...b,amount:c(b.amount,'core')})).filter(b=>b.amount>0),
    interestEarned:c(state.interestEarned,'core'),taxPaid:c(state.taxPaid,'courier'),loanInterest:c(state.loanInterest,'core')};
  let walletChange=0;
  if(!systems(to).payroll&&s.payroll.pending.length){walletChange=pendingPay(s);s={...s,payroll:{...s.payroll,pending:[]}};}
  return {state:s,walletChange};
}
