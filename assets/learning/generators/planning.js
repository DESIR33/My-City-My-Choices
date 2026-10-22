// save.goal, budget.plan, risk.choose and borrow.cost generators.
import {createRng} from '../rng.js';
import {numberQuestion,choiceQuestion,levelOf} from '../question.js';
import {t,GOAL_ITEMS} from '../content.en.js';
import {money} from '../format.js';

export function saveGoal(level,seed){
  const L=levelOf(level),rng=createRng('save.goal:'+L+':'+seed),skill='save.goal',item=rng.pick(GOAL_ITEMS);
  let goal,have=0,save,prompt;
  if(L===1){save=100*rng.int(1,5);goal=100*rng.int(save/100+1,20);prompt=t('save.goal.p1',{item,goal:money(goal),save:money(save)})}
  else if(L===2||L===3){
    goal=L===2?100*rng.int(10,60):25*rng.int(60,240);have=L===2?100*rng.int(0,Math.floor(goal/200)):25*rng.int(0,Math.floor(goal/50));
    save=L===2?100*rng.int(2,10):25*rng.int(10,60);prompt=t('save.goal.p2',{item,goal:money(goal),have:money(have),save:money(save)});
  }else if(L===4){const earn=100*rng.int(4,20);save=earn/2;goal=100*rng.int(20,120);prompt=t('save.goal.p4',{item,goal:money(goal),earn:money(earn)})}
  else{const earn=100*rng.int(20,80),pct=rng.pick([10,15,20,25]);save=earn*pct/100;goal=500*rng.int(10,40);prompt=t('save.goal.p5',{item,goal:money(goal),earn:money(earn),pct})}
  const need=goal-have,answer=Math.max(1,Math.ceil(need/save));
  return numberQuestion({skill,level:L,prompt,answer,format:'count',distractors:[Math.floor(need/save)||answer+1,Math.ceil(goal/save),answer+1,answer+2],hints:[t('save.goal.h1'),t('save.goal.h2',{need:money(need),save:money(save)})]});
}

export function budgetPlan(level,seed){
  const L=levelOf(level),rng=createRng('budget.plan:'+L+':'+seed),skill='budget.plan';
  if(L<=3){
    const unit=L===3?5:100,total=L===1?100*rng.int(5,10):L===2?100*rng.int(10,30):5*rng.int(1000,6000);
    const parts=[];let left=total;
    for(let i=0;i<(L===1?2:3);i++){const v=unit*rng.int(1,Math.max(1,Math.floor(left/unit/3)));parts.push(v);left-=v}
    const planned=total-left,vars={total:money(total),a:money(parts[0]),b:money(parts[1]),c:money(parts[2]||0)};
    return numberQuestion({skill,level:L,prompt:t(L===1?'budget.plan.p1':'budget.plan.p2',vars),answer:left,format:'money',distractors:[planned,left+parts[0],left-unit,left+unit*2],hints:[t('budget.plan.h1'),t('budget.plan.h2',{planned:money(planned),total:money(total)})]});
  }
  if(L===4){
    const total=2000*rng.int(1,10),pct=rng.pick([10,20,25,50]),answer=total*pct/100;
    return numberQuestion({skill,level:L,prompt:t('budget.plan.p4',{total:money(total),pct}),answer,format:'money',distractors:[total-answer,pct*100,answer*2,answer/2],hints:[t('budget.plan.h1.pct',{pct}),t('budget.plan.h2.pct',{one:money(total/100),pct})]});
  }
  const home=100*rng.int(30,45),food=100*rng.int(15,30),fun=100*rng.int(5,15),save=10000-home-food-fun;
  const bill=fun+100*rng.int(1,Math.max(1,save/100-1)),answer=save-(bill-fun);
  return numberQuestion({skill,level:L,prompt:t('budget.plan.p5',{total:money(10000),home:money(home),food:money(food),fun:money(fun),save:money(save),bill:money(bill)}),answer,format:'money',distractors:[save-bill,save,fun-bill+save+fun,answer+100],hints:[t('budget.plan.h1.bill'),t('budget.plan.h2.bill',{bill:money(bill),fun:money(fun),rest:money(bill-fun)})]});
}

export function riskChoose(level,seed){
  const L=levelOf(level),rng=createRng('risk.choose:'+L+':'+seed),skill='risk.choose';
  const plans=[t('plan.jar'),t('plan.steady'),t('plan.weather')];
  if(L===1)return choiceQuestion({skill,level:L,prompt:t('risk.choose.p1'),correct:t('risk.choose.sure'),choices:[t('risk.choose.sure'),t('risk.choose.flip'),t('risk.choose.both')],hints:[t('risk.choose.h1'),t('risk.choose.h2')]});
  if(L===2)return choiceQuestion({skill,level:L,prompt:t('risk.choose.p2'),correct:t('plan.jar'),choices:plans,hints:[t('risk.choose.h1'),t('risk.choose.h2')]});
  if(L===3){
    const start=1000*rng.int(1,5),up=start*.3,down=start*.2,pair=(a,b)=>money(a)+' or '+money(b);
    return choiceQuestion({skill,level:L,prompt:t('risk.choose.p3',{start:money(start)}),correct:pair(start+up,start-down),choices:[pair(start+up,start-down),pair(start+up,start),pair(start+down,start-up),pair(start+up+down,start)],hints:[t('risk.choose.h1.calc'),t('risk.choose.h2.calc',{start:money(start),up:money(up),down:money(down)})]});
  }
  if(L===4){
    const start=100*rng.int(10,20),n=rng.int(2,5),goal=Math.floor(start*Math.pow(1.02,n));
    return choiceQuestion({skill,level:L,prompt:t('risk.choose.p4',{start:money(start),goal:money(goal),n}),correct:t('plan.jar'),choices:[...plans,t('plan.none')],hints:[t('risk.choose.h1'),t('risk.choose.h2.goal',{goal:money(goal)})]});
  }
  const a=100*rng.int(11,20)+5*rng.int(0,19),b0=100*rng.int(5,9)+5*rng.int(0,19),b=(a+b0)%2?b0+5:b0,answer=(a+b)/2;
  return numberQuestion({skill,level:L,prompt:t('risk.choose.p5',{a:money(a),b:money(b)}),answer,format:'money',distractors:[a+b,a-b,answer+50,answer-50],hints:[t('risk.choose.h1.avg'),t('risk.choose.h2.avg',{a:money(a),b:money(b)})]});
}

export function borrowCost(level,seed){
  const L=levelOf(level),rng=createRng('borrow.cost:'+L+':'+seed),skill='borrow.cost',item=rng.pick(['bike','laptop','scooter','tablet']);
  if(L===1){
    const now=100*rng.int(6,15),n=rng.int(3,8),pay=100*Math.ceil(now/100/n)+100*rng.int(0,1),total=n*pay;
    const correct=total>now?t('borrow.cost.weekly'):total<now?t('borrow.cost.now'):t('borrow.cost.same');
    return choiceQuestion({skill,level:L,prompt:t('borrow.cost.p1',{now:money(now),pay:money(pay),n}),correct,choices:[t('borrow.cost.now'),t('borrow.cost.weekly'),t('borrow.cost.same')],hints:[t('borrow.cost.h1'),t('borrow.cost.h2',{n,pay:money(pay),total:money(total)})]});
  }
  if(L===2){
    const n=rng.int(3,12),pay=25*rng.int(4,40),answer=n*pay;
    return numberQuestion({skill,level:L,prompt:t('borrow.cost.p2',{pay:money(pay),n}),answer,format:'money',distractors:[answer-pay,answer+pay,pay*(n+1)+100,answer+100],hints:[t('borrow.cost.h1'),t('borrow.cost.h2',{n,pay:money(pay),total:money(answer)})]});
  }
  const n=rng.int(4,12),pay=100*rng.int(10,60),down=1000*rng.int(2,10),total=down+n*pay;
  if(L===3)return numberQuestion({skill,level:L,prompt:t('borrow.cost.p3',{item,down:money(down),n,pay:money(pay)}),answer:total,format:'money',distractors:[n*pay,total-pay,total+pay,down+pay],hints:[t('borrow.cost.h1'),t('borrow.cost.h2',{n,pay:money(pay),total:money(n*pay)})]});
  if(L===4){
    const price=total-100*rng.int(5,Math.max(5,Math.floor(n*pay/400))),answer=total-price;
    return numberQuestion({skill,level:L,prompt:t('borrow.cost.p4',{item,price:money(price),down:money(down),n,pay:money(pay)}),answer,format:'money',distractors:[n*pay-price,total,answer+pay,answer-100],hints:[t('borrow.cost.h1'),t('borrow.cost.h2.extra',{total:money(total),price:money(price)})]});
  }
  const principal=10000*rng.int(1,10),rate=rng.int(2,10),years=rng.int(1,5),yearly=principal*rate/100,answer=yearly*years;
  return numberQuestion({skill,level:L,prompt:t('borrow.cost.p5',{principal:money(principal),rate,years}),answer,format:'money',distractors:[yearly,principal+answer,answer*2,yearly*(years+1)],hints:[t('borrow.cost.h1.int'),t('borrow.cost.h2.int',{rate,principal:money(principal),yearly:money(yearly),years})]});
}
