// Parent progress view: a pure model built from the save, and the HTML for it.
import {skillsForTier} from './skills.js';
import {skillState,STATUS} from './mastery.js';
import {TIERS,TIER_ORDER,AGES} from './tiers.js';
import {t} from './content.en.js';
import {money} from './format.js';

const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'})[c]);
const WEEK=7;

export async function hashPin(pin,childId){
  const data=new TextEncoder().encode('mcmc-parent:'+childId+':'+pin);
  const buf=await crypto.subtle.digest('SHA-256',data);
  return [...new Uint8Array(buf)].map(b=>b.toString(16).padStart(2,'0')).join('');
}
export const validPin=pin=>/^\d{4}$/.test(String(pin));

// game: {name, day, cash, saved, shopping (dollars), gardenPlan, reflection}
export function parentModel(learning,game){
  const tier=learning.tier||'builder',skills=skillsForTier(tier).map(s=>{
    const st=skillState(learning,s.id),recent=st.attempts.slice(-10),first=recent.filter(a=>a.correct&&a.firstTry).length;
    return {id:s.id,name:s.name,status:st.status,level:st.level,tries:recent.length,firstTryRate:recent.length?Math.round(100*first/recent.length):null,drops:st.drops,lastMiss:[...st.attempts].reverse().find(a=>!(a.correct&&a.firstTry)&&a.missed)||null};
  });
  const all=Object.values(learning.skills).flatMap(s=>s.attempts);
  const questions=all.length,firstTry=all.filter(a=>a.correct&&a.firstTry).length;
  const day=game.day||1;
  // Stuck: dropped a level twice this week, needs review, or keeps missing at the easiest level.
  const floorMisses=id=>skillState(learning,id).attempts.slice(-4).filter(a=>!(a.correct&&a.firstTry)).length;
  const stuck=skills.filter(s=>s.drops.filter(d=>day-d<WEEK).length>=2||s.status===STATUS.REVIEW||(s.level===1&&floorMisses(s.id)>=3));
  return {name:game.name||'Player',tier,tierName:TIERS[tier].name,age:learning.age,questions,rate:questions?Math.round(100*firstTry/questions):0,skills,stuck,
    money:{cash:game.cash||0,saved:game.saved||0,shopping:game.shopping||0,gardenPlan:game.gardenPlan||null,reflection:game.reflection||null},
    suggestion:learning.tierSuggestion&&learning.tierSuggestion!==tier?TIERS[learning.tierSuggestion].name:null,hasPin:!!learning.parentPinHash};
}

const STATUS_LABEL={new:'status.new',practicing:'status.practicing',mastered:'status.mastered',review:'status.review'};
export function parentHtml(m){
  let h='<div class="label">'+esc(t('parent.title'))+'</div><h2>'+esc(m.name)+'</h2>';
  h+='<p>'+esc(t('parent.summary',{name:m.name,tier:m.tierName,questions:m.questions,rate:m.rate}))+'</p>';
  if(m.suggestion)h+='<p class="parentNote">'+esc(t('parent.suggest',{tier:m.suggestion}))+'</p>';
  h+='<table class="skillGrid"><thead><tr><th>Skill</th><th>Status</th><th>Level</th><th>First try</th></tr></thead><tbody>';
  for(const s of m.skills)h+='<tr><td>'+esc(s.name)+'</td><td><span class="skillStatus '+s.status+'">'+esc(t(STATUS_LABEL[s.status]))+'</span></td><td>'+s.level+' of 5</td><td>'+(s.firstTryRate===null?'–':s.firstTryRate+'% of '+s.tries)+'</td></tr>';
  h+='</tbody></table><h3>'+esc(t('parent.stuck'))+'</h3>';
  if(!m.stuck.length)h+='<p>'+esc(t('parent.none'))+'</p>';
  for(const s of m.stuck){
    h+='<div class="stuckSkill"><b>'+esc(s.name)+'</b>';
    if(s.lastMiss)h+='<p>Missed: “'+esc(s.lastMiss.missed)+'”'+(s.lastMiss.given?' Answered: '+esc(s.lastMiss.given)+'.':'')+'</p>';
    h+='<p><b>'+esc(t('parent.tryHome'))+':</b> '+esc(t('home.'+s.id))+'</p></div>';
  }
  h+='<h3>'+esc(t('parent.money'))+'</h3><p>Wallet '+money(Math.round(m.money.cash*100))+' · Goal savings '+money(Math.round(m.money.saved*100))+' · Spent shopping '+money(Math.round(m.money.shopping*100))+(m.money.gardenPlan?' · Garden plan: '+esc(m.money.gardenPlan):'')+'</p>';
  if(m.money.reflection)h+='<p>Garden reflection: “'+esc(m.money.reflection)+'”</p>';
  h+='<h3>Settings</h3><div class="parentSettings"><label>Child’s age <select id="parentAge"><option value=""'+(m.age?'':' selected')+'>Not set</option>'+AGES.map(a=>'<option value="'+a+'"'+(a===m.age?' selected':'')+'>'+a+'</option>').join('')+'</select></label>';
  h+='<label>Tier <select id="parentTier">'+TIER_ORDER.map(id=>'<option value="'+id+'"'+(id===m.tier?' selected':'')+'>'+TIERS[id].name+'</option>').join('')+'</select></label>';
  h+='<label>Reset a skill <select id="parentResetSkill"><option value="">Choose…</option>'+m.skills.map(s=>'<option value="'+s.id+'">'+esc(s.name)+'</option>').join('')+'</select></label>';
  h+='<label>'+(m.hasPin?'Change PIN':'Set a PIN')+' <input id="parentNewPin" inputmode="numeric" maxlength="4" pattern="[0-9]{4}" placeholder="4 digits"></label></div>';
  if(!m.hasPin)h+='<p class="parentNote">'+esc(t('parent.noPin'))+'</p>';
  h+='<div class="actions"><button class="primary" onclick="saveParentSettings()">Save settings</button><button onclick="downloadCitySave()">Export progress</button><button onclick="closeGamePanel()">Close</button></div><div id="feedback"></div>';
  return h;
}
