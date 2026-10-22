// read.detail and time.order generators.
import {createRng} from '../rng.js';
import {numberQuestion,choiceQuestion,levelOf} from '../question.js';
import {t,NAMES,FOODS,GOODS} from '../content.en.js';
import {money,clock} from '../format.js';
import {cap,joinList} from './money-basics.js';

export function readDetail(level,seed,{context='restaurant',name:who}={}){
  const L=levelOf(level),rng=createRng('read.detail:'+L+':'+context+':'+seed),skill='read.detail';
  const pool=context==='store'?GOODS:FOODS,[item,other,third,fourth]=rng.shuffle(pool),picked=rng.pick(NAMES),name=typeof who==='string'&&who?who:picked;
  const choices=[item,other,third,fourth].map(cap),correct=cap(item);
  if(L===1)return choiceQuestion({skill,level:L,prompt:t('read.detail.p1',{name,a:'a',item}),correct,choices,hints:[t('read.detail.h1'),t('read.detail.h2',{name})]});
  if(L===2)return choiceQuestion({skill,level:L,prompt:t('read.detail.p2',{name,item,other}),correct,choices,hints:[t('read.detail.h1'),t('read.detail.h2',{name})]});
  if(L===3){
    const n=rng.int(2,5);let m=rng.int(1,4);if(m===n)m=n===1?2:n-1;
    return numberQuestion({skill,level:L,prompt:t('read.detail.p3',{name,n,item,m,other}),answer:n,format:'count',distractors:[m,n+m,n+1],hints:[t('read.detail.h1'),t('read.detail.h2.count',{item})]});
  }
  if(L===4)return choiceQuestion({skill,level:L,prompt:t('read.detail.p4',{name,item,other}),correct,choices,hints:[t('read.detail.h1'),t('read.detail.h2.change',{name})]});
  const n=rng.int(2,4),price=25*rng.int(4,16),wallet=500*rng.int(Math.ceil(n*price/500)+1,6),kids=rng.int(2,4),answer=n*price;
  return numberQuestion({skill,level:L,prompt:t('read.detail.p5',{name,wallet:money(wallet),kids,n,item,price:money(price)}),answer,format:'money',distractors:[wallet-answer,(n+kids)*price,kids*price,answer+price],hints:[t('read.detail.h1'),t('read.detail.h2.spend',{n,price:money(price)})]});
}

const ap=min=>clock(min)+(min>=720?' pm':' am');
export function timeOrder(level,seed){
  const L=levelOf(level),rng=createRng('time.order:'+L+':'+seed),skill='time.order';
  if(L===1){
    let a=60*rng.int(8,17),b=60*rng.int(8,17);if(a===b)b=a+60;
    const correct=a<b?t('time.order.pet'):t('time.order.plant');
    return choiceQuestion({skill,level:L,prompt:t('time.order.p1',{a:ap(a),b:ap(b)}),correct,choices:[t('time.order.pet'),t('time.order.plant')],hints:[t('time.order.h1'),t('time.order.h2')]});
  }
  if(L===2){
    const slots=rng.shuffle(Array.from({length:20},(_,i)=>480+30*i)).slice(0,3),sorted=slots.slice().sort((x,y)=>x-y);
    return choiceQuestion({skill,level:L,prompt:t('time.order.p2',{list:joinList(slots.map(ap))}),correct:ap(sorted[1]),choices:[...sorted.map(ap),ap(sorted[1]+60)],hints:[t('time.order.h1'),t('time.order.h2')]});
  }
  let start,total,prompt,mistakes;
  if(L===3){start=480+30*rng.int(0,16);const len=rng.pick([15,20,30,45]);total=len;prompt=t('time.order.p3',{start:ap(start),len});mistakes=[start+len+40,start+len-10,start+60]}
  else if(L===4){start=480+15*(2*rng.int(0,16)+1);const a=5*rng.int(2,8),b=5*rng.int(2,8);total=a+b;prompt=t('time.order.p4',{start:ap(start),a,b});mistakes=[start+a,start+b,start+total+40]}
  else{start=540+15*rng.int(0,27);const n=rng.int(2,4),len=rng.pick([15,20,25,30]),walk=rng.pick([5,10]);total=n*len+(n-1)*walk;prompt=t('time.order.p5',{start:ap(start),n,len,walk});mistakes=[start+n*len,start+n*(len+walk),start+total-walk*(n-1)+walk]}
  return numberQuestion({skill,level:L,prompt,answer:start+total,format:'time',distractors:mistakes,hints:[t('time.order.h1.add'),t('time.order.h2.add',{total,start:ap(start)})]});
}
