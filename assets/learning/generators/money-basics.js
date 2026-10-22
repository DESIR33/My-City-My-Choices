// coins.value, coins.count and change.make generators.
import {createRng} from '../rng.js';
import {numberQuestion,choiceQuestion,levelOf} from '../question.js';
import {t,COINS,NAMES} from '../content.en.js';
import {money,cents} from '../format.js';

export const joinList=items=>items.length<=1?items.join(''):items.slice(0,-1).join(', ')+' and '+items.at(-1);
const coinText=(coin,n)=>n+' '+(n===1?coin.name:coin.plural);
const billText=(value,n)=>n+' '+(value===100?'$1':'$'+value/100)+' bill'+(n===1?'':'s');
const amountFmt=v=>v<100?'cents':'money';

// A purse: counts per coin id plus bills. Returns its text and total in cents.
function purse(rng,{coins,maxCoins,bills=[]}){
  const parts=[];let total=0;
  for(const b of bills){if(b.n>0){parts.push(billText(b.value,b.n));total+=b.value*b.n}}
  const pool=COINS.filter(c=>coins.includes(c.id)).slice().reverse();
  let kinds=0;
  for(const c of pool){
    const n=rng.int(0,maxCoins);
    if(n>0){parts.push(coinText(c,n));total+=c.value*n;kinds++}
  }
  if(kinds===0){const c=pool.at(-1);parts.push(coinText(c,1));total+=c.value}
  return {text:joinList(parts),total,billTotal:bills.reduce((s,b)=>s+b.value*b.n,0)};
}
const fewestCoins=a=>{let n=0;for(const v of [25,10,5,1]){n+=Math.floor(a/v);a%=v}return n};

export function coinsValue(level,seed){
  const L=levelOf(level),rng=createRng('coins.value:'+L+':'+seed),skill='coins.value';
  const h=[t('coins.value.h1'),t('coins.value.h2')];
  if(L===1){
    const coin=rng.pick(COINS.slice(0,4));
    return choiceQuestion({skill,level:L,prompt:t('coins.value.p1',{value:cents(coin.value)}),correct:cap(coin.name),choices:COINS.slice(0,4).map(c=>cap(c.name)),hints:h});
  }
  if(L===2){
    const coin=rng.pick(COINS);const answer=100/coin.value;
    return numberQuestion({skill,level:L,prompt:t('coins.value.p2',{plural:coin.plural}),answer,format:'count',distractors:[coin.value,answer*2,answer+1,Math.max(1,answer/2)],hints:h});
  }
  if(L===5){
    const amount=rng.int(30,99),answer=fewestCoins(amount);
    const noQuarters=Math.floor(amount/10)+Math.floor((amount%10)/5)+amount%5;
    return numberQuestion({skill,level:L,prompt:t('coins.value.p5',{amount:cents(amount)}),answer,format:'count',distractors:[answer+1,answer+2,noQuarters,Math.max(1,answer-1)],hints:[t('coins.value.h1.fewest'),t('coins.value.h2.fewest',{amount:cents(amount)})]});
  }
  let p;
  do{p=purse(rng,{coins:['quarter','dime','nickel','penny'],maxCoins:L===3?3:4,bills:L===4?[{value:100,n:rng.int(1,4)}]:[]})}while(L===3&&p.total>100);
  return numberQuestion({skill,level:L,prompt:t('coins.value.p3',{list:p.text}),answer:p.total,format:L===3?amountFmt(p.total):'money',distractors:[p.total+5,p.total-5,p.total+10,p.total-10,p.total+25],hints:h});
}

export function coinsCount(level,seed){
  const L=levelOf(level),rng=createRng('coins.count:'+L+':'+seed),skill='coins.count';
  let p;
  if(L===1){const coin=rng.pick(COINS.slice(1,4)),n=rng.int(2,coin.value===25?2:5);p={text:coinText(coin,n),total:coin.value*n,billTotal:0}}
  else if(L===2){do{p=purse(rng,{coins:['quarter','dime','nickel','penny'],maxCoins:3})}while(p.total>100)}
  else{
    const bills=L===3?[{value:100,n:rng.int(1,4)}]:L===4?[{value:1000,n:rng.int(0,1)},{value:500,n:1},{value:100,n:rng.int(0,4)}]:[{value:2000,n:rng.int(1,2)},{value:1000,n:rng.int(0,1)},{value:500,n:rng.int(0,1)},{value:100,n:rng.int(1,4)}];
    p=purse(rng,{coins:['quarter','dime','nickel','penny'],maxCoins:L===5?4:3,bills});
  }
  const fmt=p.total<100?'cents':'money';
  return numberQuestion({skill,level:L,prompt:t('coins.count.p',{list:p.text}),answer:p.total,format:fmt,distractors:[p.billTotal,p.total+10,p.total-10,p.total+25,p.total-1],hints:[t('coins.count.h1'),t('coins.count.h2',{bills:money(p.billTotal)})]});
}

// Common subtraction slip: subtract the smaller digit from the bigger in each column.
function columnSlip(a,b){
  const A=String(a).padStart(6,'0'),B=String(b).padStart(6,'0');let out='';
  for(let i=0;i<6;i++)out+=Math.abs(Number(A.at(i))-Number(B.at(i)));
  return Number(out);
}
const CHANGE_PRICES=[
  r=>({price:rng5(r,[25,50,75]),paid:100}),
  r=>{const price=25*r.int(4,18);return {price,paid:price<400&&r.chance(.5)?Math.ceil((price+1)/100)*100:500}},
  r=>({price:5*r.int(21,99),paid:500}),
  r=>({price:r.int(101,999),paid:1000}),
  r=>({price:r.int(1001,1999),paid:2000})
];
function rng5(r,list){return r.pick(list)}
export function changeMake(level,seed){
  const L=levelOf(level),rng=createRng('change.make:'+L+':'+seed),skill='change.make';
  const {price,paid}=CHANGE_PRICES[L-1](rng),answer=paid-price,name=rng.pick(NAMES);
  return numberQuestion({skill,level:L,prompt:t('change.make.p',{name,price:money(price),paid:money(paid)}),answer,format:answer<100?'cents':'money',distractors:[columnSlip(paid,price),answer+100,answer-100,answer+10,answer-10,price],hints:[t('change.make.h1'),t('change.make.h2',{paid:money(paid),price:money(price)})]});
}
// For the market stall: the story price stays fixed; the level decides what the customer hands over.
// `unit` is the story's money scale (Builder 10, Planner 100): payments round up in
// the same steps as the tier's prices, so change stays sensible at every scale.
export function marketPayment(level,price,seed,unit=1){
  const L=levelOf(level),rng=createRng('market:'+L+':'+seed),u=Number.isSafeInteger(unit)&&unit>0?unit:1;
  const q=25*u,d=100*u,nextQuarter=Math.ceil((price+1)/q)*q,nextDollar=Math.ceil((price+1)/d)*d;
  if(L===1)return nextQuarter;
  if(L===2)return rng.chance(.5)?nextDollar:nextDollar+d;
  if(L===3)return Math.max(500*u,nextDollar);
  if(L===4)return Math.max(1000*u,nextDollar);
  return Math.max(2000*u,nextDollar);
}
const cap=s=>s.charAt(0).toUpperCase()+s.slice(1);
export {cap};
