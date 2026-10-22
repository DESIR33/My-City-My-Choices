// Shared question shape, presentation (choices or typed answer) and checking.
import {createRng} from './rng.js';
import {formatValue,parseAnswer,sameClock} from './format.js';
import {t} from './content.en.js';

export const clamp=(n,lo,hi)=>Math.max(lo,Math.min(hi,n));
export const levelOf=l=>clamp(Number.isInteger(l)?l:1,1,5);

// A number question: answer is an integer in the unit of `format`.
export function numberQuestion({skill,level,prompt,answer,format,distractors=[],hints,steps}){
  return {skill,level,kind:'number',prompt,answer,format,distractors,hints,steps:steps||[],solution:t('solution',{answer:formatValue(answer,format)})};
}
// A choice question: `correct` is one of `choices`; every other entry is wrong.
export function choiceQuestion({skill,level,prompt,correct,choices,hints,steps}){
  const unique=[...new Set(choices)];
  if(!unique.includes(correct))unique.unshift(correct);
  return {skill,level,kind:'choice',prompt,correct,choices:unique,hints,steps:steps||[],solution:t('solution',{answer:correct})};
}

function stepFor(format,answer){
  if(format==='time')return [5,10,15,30,60];
  if(format==='money'||format==='cents'){
    if(answer%100===0)return [100,200,50,25];
    if(answer%25===0)return [25,50,100,10];
    if(answer%5===0)return [5,10,100,25];
    return [1,10,100,5];
  }
  return [1,2,3,5];
}
// Fill wrong options: generator mistakes first, then near misses. All unique, positive, never the answer.
export function fillDistractors(answer,format,mistakes,count,rng,unit=1){
  const out=[];const ok=v=>Number.isInteger(v)&&v>0&&v!==answer&&!out.includes(v)&&(format!=='time'||!sameClock(v,answer));
  for(const m of rng.shuffle(mistakes))if(out.length<count&&ok(m))out.push(m);
  const steps=stepFor(format,answer/unit).map(s=>format==='money'||format==='cents'?s*unit:s);
  for(let i=0;out.length<count&&i<40;i++){
    const s=steps[i%steps.length]*(1+Math.floor(i/steps.length));
    const v=rng.chance(.5)?answer+s:answer-s;
    if(ok(v))out.push(v);else if(ok(answer+s))out.push(answer+s);
  }
  return out;
}

// Turn a question into what the child sees. Planner types number answers; others choose.
export function present(q,{mode='choice',options=4,seed='0'}={}){
  const rng=createRng('present:'+seed+':'+q.prompt);
  if(q.kind==='number'&&mode==='number')return {...q,mode:'number',options:[],correctIndex:-1};
  if(q.kind==='number'){
    const wrong=fillDistractors(q.answer,q.format,q.distractors,options-1,rng,q.unit||1);
    const values=rng.shuffle([q.answer,...wrong]);
    return {...q,mode:'choice',options:values.map(v=>({label:formatValue(v,q.format),value:v})),correctIndex:values.indexOf(q.answer)};
  }
  const wrong=rng.shuffle(q.choices.filter(c=>c!==q.correct)).slice(0,Math.max(1,options-1));
  const labels=rng.shuffle([q.correct,...wrong]);
  return {...q,mode:'choice',options:labels.map(l=>({label:l,value:l})),correctIndex:labels.indexOf(q.correct)};
}

export function checkAnswer(p,response){
  if(p.mode==='choice')return Number(response)===p.correctIndex;
  const v=parseAnswer(response,p.format);
  if(v===null)return false;
  return p.format==='time'?sameClock(v,p.answer):v===p.answer;
}
