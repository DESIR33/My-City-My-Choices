// Per-skill mastery: levels 1 to 5 and a status. Pure functions; callers store the result.
import {TIERS,isTier} from './tiers.js';
import {skillById,skillsForTier} from './skills.js';
import {createRng} from './rng.js';

export const STATUS=Object.freeze({NEW:'new',PRACTICING:'practicing',MASTERED:'mastered',REVIEW:'review'});
const STATUSES=Object.values(STATUS);
const MAX_ATTEMPTS=8,STALE_DAYS=7;

export function freshLearning(childId){
  return {version:1,childId:typeof childId==='string'&&childId?childId:'child-'+Date.now().toString(36),tier:null,age:null,placementDone:false,parentPinHash:null,tierSuggestion:null,garden:null,skills:{}};
}
const int=(v,lo,hi,d)=>Number.isInteger(v)&&v>=lo&&v<=hi?v:d;
function restoreSkill(s){
  if(!s||typeof s!=='object')return null;
  return {
    level:int(s.level,1,5,1),status:STATUSES.includes(s.status)?s.status:STATUS.NEW,
    streak:int(s.streak,0,99,0),misses:int(s.misses,0,99,0),reviewStreak:int(s.reviewStreak,0,99,0),
    lastDay:int(s.lastDay,0,1e6,0),workedExample:!!s.workedExample,
    drops:Array.isArray(s.drops)?s.drops.filter(d=>Number.isInteger(d)&&d>0).slice(-10):[],
    attempts:Array.isArray(s.attempts)?s.attempts.filter(a=>a&&typeof a==='object').slice(-MAX_ATTEMPTS).map(a=>({correct:!!a.correct,firstTry:!!a.firstTry,hints:int(a.hints,0,3,0),seconds:int(a.seconds,0,3600,0),day:int(a.day,0,1e6,0),level:int(a.level,1,5,1),...(typeof a.missed==='string'?{missed:a.missed.slice(0,300)}:{}),...(typeof a.given==='string'?{given:a.given.slice(0,60)}:{})})):[]
  };
}
export function restoreLearning(saved){
  const l=freshLearning(saved?.childId);
  if(!saved||typeof saved!=='object')return l;
  l.tier=isTier(saved.tier)?saved.tier:null;
  l.age=int(saved.age,6,12,null);
  l.placementDone=!!saved.placementDone;
  l.parentPinHash=typeof saved.parentPinHash==='string'&&/^[0-9a-f]{64}$/.test(saved.parentPinHash)?saved.parentPinHash:null;
  l.tierSuggestion=isTier(saved.tierSuggestion)?saved.tierSuggestion:null;
  l.garden=saved.garden&&typeof saved.garden==='object'?{reflections:Array.isArray(saved.garden.reflections)?saved.garden.reflections.filter(r=>r&&typeof r.plan==='string').slice(-10):[]}:null;
  if(saved.skills&&typeof saved.skills==='object')for(const [id,s] of Object.entries(saved.skills)){if(skillById(id)){const r=restoreSkill(s);if(r)l.skills[id]=r}}
  return l;
}
export function skillState(learning,id){
  const tier=TIERS[learning.tier]||TIERS.builder;
  return learning.skills[id]||{level:tier.startLevel,status:STATUS.NEW,streak:0,misses:0,reviewStreak:0,lastDay:0,workedExample:false,drops:[],attempts:[]};
}
export const levelFor=(learning,id)=>skillState(learning,id).level;
const targetLevel=learning=>(TIERS[learning.tier]||TIERS.builder).targetLevel;

// attempt: {correct, firstTry, hints, seconds, missed?, given?}. A miss is anything but first-try correct.
export function recordAttempt(learning,id,attempt,day=0){
  if(!skillById(id))return learning;
  const prev=skillState(learning,id),s={...prev,drops:prev.drops.slice(),attempts:prev.attempts.slice()};
  const hit=!!attempt.correct&&!!attempt.firstTry;
  s.attempts.push({correct:!!attempt.correct,firstTry:!!attempt.firstTry,hints:int(attempt.hints,0,3,0),seconds:int(Math.round(attempt.seconds||0),0,3600,0),day,level:s.level,...(!hit&&typeof attempt.missed==='string'?{missed:attempt.missed.slice(0,300)}:{}),...(!hit&&typeof attempt.given==='string'?{given:attempt.given.slice(0,60)}:{})});
  s.attempts=s.attempts.slice(-MAX_ATTEMPTS);
  s.lastDay=day;s.workedExample=false;
  if(s.status===STATUS.NEW)s.status=STATUS.PRACTICING;
  if(hit){s.streak++;s.misses=0}else{s.misses++;s.streak=0}
  if(s.status===STATUS.REVIEW){
    s.reviewStreak=hit?s.reviewStreak+1:0;
    if(s.reviewStreak>=2){s.status=STATUS.MASTERED;s.reviewStreak=0}
  }else if(s.status===STATUS.MASTERED&&s.misses>=2){
    s.status=STATUS.REVIEW;s.reviewStreak=0;
  }
  if(s.streak>=3&&s.level<5){s.level++;s.streak=0}
  if(s.misses>=2&&s.level>1){s.level--;s.misses=0;s.drops.push(day||1);s.drops=s.drops.slice(-10);s.workedExample=true}
  if(s.status===STATUS.PRACTICING){
    const last5=s.attempts.slice(-5);
    if(last5.length>=5&&last5.filter(a=>a.correct&&a.firstTry).length>=4&&s.level>=targetLevel(learning))s.status=STATUS.MASTERED;
  }
  return {...learning,skills:{...learning.skills,[id]:s}};
}

// Mastered skills not seen for a week come back for review.
export function refreshStatus(learning,day){
  let skills=learning.skills,changed=false;
  for(const [id,s] of Object.entries(skills)){
    if(s.status===STATUS.MASTERED&&day-s.lastDay>=STALE_DAYS){skills={...skills,[id]:{...s,status:STATUS.REVIEW,reviewStreak:0}};changed=true}
  }
  return changed?{...learning,skills}:learning;
}

// Pick the skill for the next question: about 70% practice (lowest level first), 30% review.
export function pickSkill(learning,pool,seed){
  const allowed=new Set(skillsForTier(learning.tier||'builder').map(s=>s.id));
  const ids=pool.filter(id=>allowed.has(id));
  if(!ids.length)return null;
  const rng=createRng('pick:'+seed),state=id=>skillState(learning,id);
  const review=ids.filter(id=>[STATUS.MASTERED,STATUS.REVIEW].includes(state(id).status));
  const practice=ids.filter(id=>!review.includes(id));
  const byNeed=(a,b)=>(state(a).status===STATUS.REVIEW?-1:0)-(state(b).status===STATUS.REVIEW?-1:0)||state(a).level-state(b).level||state(a).attempts.length-state(b).attempts.length;
  const useReview=review.length&&(!practice.length||rng.chance(.3));
  const list=(useReview?review:practice).slice().sort(byNeed);
  const top=list.filter(id=>byNeed(id,list[0])===0);
  return rng.pick(top);
}

// Placement: three warm-up answers nudge starting levels and may suggest a tier to the parent.
export function applyPlacement(learning,results){
  let l={...learning,skills:{...learning.skills}};
  const tier=TIERS[l.tier]||TIERS.builder;
  for(const {skill,correct} of results){
    const s=skillState(l,skill);
    l.skills[skill]={...s,level:Math.max(1,Math.min(5,tier.startLevel+(correct?1:-1)))};
  }
  const right=results.filter(r=>r.correct).length;
  const order=['sprout','builder','planner'],i=order.indexOf(l.tier||'builder');
  l.tierSuggestion=right===results.length&&i<2?order[i+1]:right===0&&i>0?order[i-1]:null;
  l.placementDone=true;
  return l;
}

export function statusCounts(learning){
  const out={new:0,practicing:0,mastered:0,review:0};
  for(const s of skillsForTier(learning.tier||'builder'))out[skillState(learning,s.id).status]++;
  return out;
}
