// One question on screen: the hint ladder, the worked example, and the attempt to record.
import {present,checkAnswer} from './question.js';
import {formatValue} from './format.js';
import {t} from './content.en.js';
import {TIERS} from './tiers.js';

const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'})[c]);

export function startQuestion(question,{tier='builder',seed='0',now=0,workedExample=false}={}){
  const cfg=TIERS[tier]||TIERS.builder;
  return {p:present(question,{mode:cfg.answerMode,options:cfg.options,seed}),misses:0,started:now,workedFirst:!!workedExample,done:false};
}

// Returns {session, status:'correct'|'hint'|'worked', message, attempt?}
export function answerQuestion(session,response,now=0){
  if(session.done)return {session,status:'correct',message:''};
  const p=session.p,ok=checkAnswer(p,response);
  const given=p.mode==='choice'?p.options[Number(response)]?.label:String(response??'').slice(0,40);
  if(ok){
    const next={...session,done:true};
    const attempt={correct:true,firstTry:session.misses===0,hints:Math.min(3,session.misses),seconds:Math.max(0,Math.round((now-session.started)/1000)),missed:session.misses?p.prompt:undefined,given:session.firstGiven};
    return {session:next,status:'correct',message:t('ui.correct'),attempt};
  }
  const misses=session.misses+1,next={...session,misses,firstGiven:session.firstGiven??given};
  if(misses===1)return {session:next,status:'hint',message:t('ui.hint')+': '+p.hints[0]};
  if(misses===2)return {session:next,status:'hint',message:t('ui.hint')+': '+p.hints[1]};
  return {session:next,status:'worked',message:workedText(p)};
}
export function workedText(p){
  return t('ui.workedTitle')+': '+p.hints[1]+' '+t('solution',{answer:p.mode==='choice'?p.options[p.correctIndex].label:formatValue(p.answer,p.format)})+' '+t('ui.enterIt');
}

// HTML for the question body. `handler` is the global function name called with the answer.
export function questionHtml(session,handler){
  const p=session.p;
  let h=session.workedFirst?'<div class="dialogue worked">'+esc(t('ui.workedExample'))+' '+esc(workedText(p).replace(' '+t('ui.enterIt'),''))+'</div>':'';
  h+='<div class="dialogue">'+esc(p.prompt)+'</div>';
  if(p.mode==='choice'){
    h+='<div class="choices">'+p.options.map((o,i)=>'<button class="choice" onclick="'+handler+'('+i+')">'+esc(o.label)+'</button>').join('')+'</div>';
  }else{
    h+='<div class="typedAnswer"><input id="learnAnswer" autocomplete="off" inputmode="'+(p.format==='time'?'text':'decimal')+'" placeholder="'+esc(t('ui.typeAnswer'))+'" onkeydown="if(event.key===\'Enter\')'+handler+'(this.value)"><button class="primary" onclick="'+handler+'(document.querySelector(\'#learnAnswer\').value)">'+esc(t('ui.check'))+'</button></div>';
  }
  return h+'<div id="learnFeedback" class="learnFeedback" aria-live="polite"></div>';
}
