import {MODEL_HOME} from './house-rules.js';

export const HOME_PROJECTS=Object.freeze([
  {id:'textiles',name:'Ocean blue textiles',cost:100,detail:'A blue living-room rug and coordinated sofa and bedding.'},
  {id:'planters',name:'Backyard container garden',cost:150,detail:'Three planted terracotta pots beside the rear patio.'},
  {id:'study',name:'A study to grow into',cost:125,detail:'Books and a small plant on the upstairs desk.'}
]);
// Shared by the catalogue swatches and the existing scene materials.
export const TEXTILE_STYLES=Object.freeze([
  Object.freeze({id:'ocean',name:'Ocean blue',detail:'Soft blue upholstery, a coastal rug and warm neutral guest bedding.',rug:0x557d98,fabric:0x647f97,guest:0x9f8b76}),
  Object.freeze({id:'sage',name:'Garden sage',detail:'Sage upholstery, a deep green rug and soft olive guest bedding.',rug:0x526b59,fabric:0x8c9d82,guest:0xa6ad8d}),
  Object.freeze({id:'clay',name:'Warm clay',detail:'Clay upholstery, a terracotta rug and sand-colored guest bedding.',rug:0x9b6853,fabric:0xbb8a72,guest:0xc5af8f})
]);
export function textileStyle(id){return TEXTILE_STYLES.find(s=>s.id===id)||TEXTILE_STYLES[0];}
const integer=(n,min=0,max=100000)=>Number.isSafeInteger(n)&&n>=min&&n<=max;
export const SETTLING_STEPS=Object.freeze(['idle','arrive','wardrobe','rest','review','done']);
export function freshHomeLife(){return {version:1,propertyId:null,tenure:'none',rentThroughDay:0,reviewedDay:0,improvements:[],improvementSpent:0,textileStyle:'ocean',settling:'idle',settlingPaused:false};}
// Existing housing payments remain authoritative. Old purchases map to the
// furnished property without charging again or changing the remaining debt.
export function restoreHomeLife(value,legacy={}){
  const s=freshHomeLife(),day=integer(legacy.day,1)?legacy.day:1;
  s.tenure=['rent','owner'].includes(legacy.choice)?legacy.choice:'none';
  s.propertyId=s.tenure==='none'?null:MODEL_HOME.id;
  if(!value||value.version!==1||value.propertyId!==MODEL_HOME.id){if(s.tenure==='rent')s.rentThroughDay=day+6;return s;}
  s.rentThroughDay=integer(value.rentThroughDay)?value.rentThroughDay:0;
  if(s.tenure==='rent'&&!s.rentThroughDay)s.rentThroughDay=day+6;
  s.reviewedDay=integer(value.reviewedDay)?Math.min(day,value.reviewedDay):0;
  if(s.tenure!=='none'&&SETTLING_STEPS.includes(value.settling))s.settling=value.settling;
  s.settlingPaused=value.settlingPaused===true;
  if(s.tenure!=='none')s.improvements=HOME_PROJECTS.filter(p=>Array.isArray(value.improvements)&&value.improvements.includes(p.id)).map(p=>p.id);
  s.improvementSpent=s.improvements.reduce((sum,id)=>sum+HOME_PROJECTS.find(p=>p.id===id).cost,0);
  if(s.improvements.includes('textiles'))s.textileStyle=textileStyle(value.textileStyle).id;
  return s;
}
export function homeAccess(s,day){return s?.propertyId===MODEL_HOME.id&&(s.tenure==='owner'||s.tenure==='rent'&&integer(day,1)&&day<=s.rentThroughDay);}
export function homeProjectQuote(s,id,wallet,day){const project=HOME_PROJECTS.find(p=>p.id===id);if(!homeAccess(s,day))return {ok:false,reason:'Rent or buy this home before making improvements. Renew an expired rental first.'};if(!project||s.improvements.includes(id))return {ok:false,reason:'That improvement is unavailable or already installed.'};if(!integer(wallet,0,1e11)||wallet<project.cost)return {ok:false,reason:'Keep saving: your wallet cannot cover this improvement.'};return {ok:true,project,walletAfter:wallet-project.cost};}
export function installHomeProject(s,id,wallet,day){const q=homeProjectQuote(s,id,wallet,day);if(!q.ok)return q;return {...q,state:{...s,improvements:[...s.improvements,id],improvementSpent:s.improvementSpent+q.project.cost}};}
export function restyleHome(s,id,day){
  if(!homeAccess(s,day))return {ok:false,reason:'Rent or buy this home, or renew your rental, before restyling.'};
  if(!s.improvements?.includes('textiles'))return {ok:false,reason:'Install Ocean blue textiles once to unlock all three styles.'};
  const style=TEXTILE_STYLES.find(style=>style.id===id);
  if(!style)return {ok:false,reason:'Choose one of the available textile styles.'};
  return {ok:true,style,state:s.textileStyle===id?s:{...s,textileStyle:id}};
}
export function homeUpcoming(s,day,loanBalance=0){if(s.tenure==='owner')return loanBalance>0?{label:'Next optional home installment',cost:100}:null;if(s.tenure==='rent')return {label:day>s.rentThroughDay?'Rental renewal available':'Rent paid through business day '+s.rentThroughDay,cost:day>s.rentThroughDay?200:0};return null;}

export function settlingCue(s){return ({
 arrive:{title:'Head home · 101 Maple Grove',hint:'Follow the route to your driveway. Park, step out, open the front door and walk inside.'},
 wardrobe:{title:'Make yourself at home · Upstairs wardrobe',hint:'Walk up the stairs and use the wardrobe in the main bedroom. You can change owned clothes for free.'},
 rest:{title:'Take a moment · Try your bed',hint:'Use either upstairs bed and choose Rest on the bed. Interact again to stand.'},
 review:{title:'Home for the evening · Review today',hint:'Stand up, open Home & daily life and review today’s earnings. Then choose when to open your business again.'}
 })[s?.settling]||null;}
export function advanceSettling(s,event){
 const expected={arrive:'entered',wardrobe:'wardrobe',rest:'rested',review:'reviewed'};
 if(!expected[s?.settling]||expected[s.settling]!==event)return s;
 return {...s,settling:SETTLING_STEPS[SETTLING_STEPS.indexOf(s.settling)+1]};
}
