// prices.add, afford.compare and biz.profit generators.
import {createRng} from '../rng.js';
import {numberQuestion,choiceQuestion,levelOf} from '../question.js';
import {t,GOODS} from '../content.en.js';
import {money} from '../format.js';
import {joinList} from './money-basics.js';

function basket(rng,n,priceFn){
  const items=rng.shuffle(GOODS).slice(0,n);
  return items.map(name=>({name,price:priceFn()}));
}
const basketText=b=>joinList(b.map(i=>'a '+money(i.price)+' '+i.name));
const sum=b=>b.reduce((s,i)=>s+i.price,0);

export function pricesAdd(level,seed){
  const L=levelOf(level),rng=createRng('prices.add:'+L+':'+seed),skill='prices.add';
  const specs=[[2,()=>100*rng.int(1,4)],[3,()=>25*rng.int(1,12)],[2,()=>rng.int(100,999)],[4,()=>rng.int(100,799)],[4,()=>20*rng.int(10,60)]];
  const [n,fn]=specs[L-1],b=basket(rng,n,fn),total=sum(b);
  const steps=b.map(i=>money(i.price)).join(' + ');
  if(L<5)return numberQuestion({skill,level:L,prompt:t('prices.add.p',{list:basketText(b)}),answer:total,format:'money',distractors:[total-b.at(-1).price,total+100,total-100,total+10,total-10],hints:[t('prices.add.h1'),t('prices.add.h2',{steps})]});
  const pct=rng.pick([10,20,25,50]),item=rng.pick(b),save=item.price*pct/100,answer=total-save;
  return numberQuestion({skill,level:L,prompt:t('prices.add.p.sale',{list:basketText(b),item:item.name,pct}),answer,format:'money',distractors:[total,total-pct*100,answer+100,answer-10,total-item.price],hints:[t('prices.add.h1'),t('prices.add.h2.sale',{pct,price:money(item.price),save:money(save)})]});
}

export function affordCompare(level,seed){
  const L=levelOf(level),rng=createRng('afford.compare:'+L+':'+seed),skill='afford.compare';
  const item=rng.pick(GOODS);
  if(L===1){
    const wallet=100*rng.int(1,10),price=100*rng.int(1,10),enough=wallet>=price;
    return choiceQuestion({skill,level:L,prompt:t('afford.compare.p1',{wallet:money(wallet),price:money(price),item}),correct:enough?t('yes'):t('no'),choices:[t('yes'),t('no')],hints:[t('afford.compare.h1'),t('afford.compare.h2',{big:money(Math.max(wallet,price)),small:money(Math.min(wallet,price))})]});
  }
  if(L===2||L===3){
    const wallet=L===2?100*rng.int(1,15):rng.int(500,2000),price=wallet+(L===2?100*rng.int(1,8):rng.int(1,800)),answer=price-wallet;
    return numberQuestion({skill,level:L,prompt:t('afford.compare.p.more',{wallet:money(wallet),price:money(price),item}),answer,format:'money',distractors:[price,wallet,answer+100,answer-10,answer+10],hints:[t('afford.compare.h1'),t('afford.compare.h2',{big:money(price),small:money(wallet)})]});
  }
  if(L===4){
    const b=basket(rng,2,()=>rng.int(150,900)),total=sum(b),wallet=total+rng.int(1,900),answer=wallet-total;
    return numberQuestion({skill,level:L,prompt:t('afford.compare.p.left',{wallet:money(wallet),list:basketText(b)}),answer,format:'money',distractors:[wallet-b.at(0).price,answer+100,answer-100,answer+10,total],hints:[t('afford.compare.h1'),t('afford.compare.h2',{big:money(wallet),small:money(total)})]});
  }
  const b=basket(rng,3,()=>rng.int(150,1200)),total=sum(b),wallet=total-rng.int(50,900),answer=total-wallet;
  return numberQuestion({skill,level:L,prompt:t('afford.compare.p.short',{wallet:money(wallet),list:basketText(b)}),answer,format:'money',distractors:[total,wallet,answer+100,answer-10,answer+10],hints:[t('afford.compare.h1'),t('afford.compare.h2',{big:money(total),small:money(wallet)})]});
}

export function bizProfit(level,seed){
  const L=levelOf(level),rng=createRng('biz.profit:'+L+':'+seed),skill='biz.profit';
  if(L===1){
    const cost=100*rng.int(1,4),sales=cost+100*rng.int(1,6),answer=sales-cost;
    return numberQuestion({skill,level:L,prompt:t('biz.profit.p1',{cost:money(cost),sales:money(sales)}),answer,format:'money',distractors:[sales,cost,sales+cost,answer+100],hints:[t('biz.profit.h1'),t('biz.profit.h2',{sales:money(sales),cost:money(cost)})]});
  }
  if(L===2||L===3){
    const n=rng.int(3,6),price=L===2?rng.pick([100,125,150,200]):5*rng.int(21,59);
    const sales=n*price,cost=L===2?50*rng.int(2,Math.max(2,Math.floor(sales/50)-1)):rng.int(100,sales-1),answer=sales-cost;
    return numberQuestion({skill,level:L,prompt:t('biz.profit.p2',{cost:money(cost),n,price:money(price)}),answer,format:'money',distractors:[sales,sales+cost,answer+price,answer-price,answer+100],hints:[t('biz.profit.h1'),t('biz.profit.h2',{sales:money(sales),cost:money(cost)})]});
  }
  if(L===4){
    const price=rng.pick([75,100,125,150,200]),cost=25*rng.int(8,36),answer=Math.ceil(cost/price);
    return numberQuestion({skill,level:L,prompt:t('biz.profit.p4',{cost:money(cost),price:money(price)}),answer,format:'count',distractors:[Math.floor(cost/price)||answer+2,answer+1,Math.round(cost/100),answer+2],hints:[t('biz.profit.h1.even'),t('biz.profit.h2.even',{price:money(price),n:answer,total:money(price*answer)})]});
  }
  const plan=()=>({cost:50*rng.int(2,8),n:rng.int(3,7),price:25*rng.int(3,8)}),A=plan(),B=plan();
  const pa=A.n*A.price-A.cost,pb=B.n*B.price-B.cost;
  const correct=pa>pb?t('biz.profit.planA'):pb>pa?t('biz.profit.planB'):t('biz.profit.same');
  return choiceQuestion({skill,level:L,prompt:t('biz.profit.p5',{costA:money(A.cost),nA:A.n,priceA:money(A.price),costB:money(B.cost),nB:B.n,priceB:money(B.price)}),correct,choices:[t('biz.profit.planA'),t('biz.profit.planB'),t('biz.profit.same')],hints:[t('biz.profit.h1'),t('biz.profit.h2',{sales:money(A.n*A.price),cost:money(A.cost)})]});
}
