import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
const text=await readFile(new URL('../assets/business-days.js',import.meta.url),'utf8').catch(()=>readFile(new URL('../dist/assets/business-days.js',import.meta.url),'utf8'));
const {freshBusinessStory,restoreBusinessStory,morningEvent,businessDayQuote,recordBusinessDay}=await import('data:text/javascript;base64,'+Buffer.from(text).toString('base64'));
const story=freshBusinessStory();assert.equal(morningEvent(2,story),null);assert.equal(businessDayQuote(3,-1,story),null);
const fair=businessDayQuote(3,0,story);assert.equal(fair.cost,300);assert.equal(fair.customers,6);assert.equal(fair.revenue,600);assert.equal(fair.profit,300);
assert.equal(businessDayQuote(3,0,story,true).customers,8);assert.equal(businessDayQuote(4,1,story).price,75);
const repaired={...story,equipmentRepaired:true};assert.equal(businessDayQuote(5,0,story).customers,5,'Paid repair helps on the same day');assert.equal(businessDayQuote(6,0,repaired).customers,businessDayQuote(6,0,story).customers+1);assert.equal(morningEvent(10,repaired).id,'recommendations','Earlier repairs change later stories');assert.equal(morningEvent(10,story).id,'repair');
for(let day=3;day<200;day++)for(let i=0;i<2;i++){const q=businessDayQuote(day,i,repaired,true);assert.ok(q.customers<=10&&q.customers>0);assert.ok(Number.isSafeInteger(q.cost)&&q.cost>0);assert.equal(q.profit,q.customers*q.price-q.cost);assert.deepEqual(businessDayQuote(day,i,repaired,true),q,'Morning does not reroll');}
let history=story;for(let day=1;day<=25;day++)history=recordBusinessDay(history,{day,choice:'Story opening',openingCost:200,revenue:300,profit:100,customers:3});assert.equal(history.history.length,20);assert.equal(history.history[0].day,6);assert.equal(recordBusinessDay(history,{day:25}).history.length,20,'No duplicate results');
const restored=restoreBusinessStory({...history,equipmentRepaired:true,nextChoice:{day:26,option:1},jobStamp:'after-25'});assert.equal(restored.history.length,20);assert.deepEqual(restored.nextChoice,{day:26,option:1});assert.ok(restored.equipmentRepaired);assert.deepEqual(restoreBusinessStory(null),freshBusinessStory());
console.log('Business mornings passed: deterministic events, price/cost/profit quotes, upgrade and repair effects, customer limits, history deduplication, and save migration.');
