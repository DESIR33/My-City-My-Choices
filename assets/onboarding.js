import {tierForAge,AGES,TIERS} from './learning/tiers.js';
import {convertDollars,formatDollars} from './economy.js';
import {parseSaveFile} from './save-backups.js';

export const STARTER_GOALS=Object.freeze([
  Object.freeze({id:0,name:'Save for a bike',target:6}),
  Object.freeze({id:1,name:'Get an art set',target:5}),
  Object.freeze({id:2,name:'Make home cozy',target:8})
]);
export function setupGoal(value){return typeof value==='string'&&/^[012]$/.test(value)?Number(value):Number.isInteger(value)&&value>=0&&value<3?value:null;}
export function setupTier(age){return AGES.includes(Number(age))?tierForAge(Number(age)):'builder';}
export function setupTarget(id,age){const goal=STARTER_GOALS.find(g=>g.id===setupGoal(id));return goal?convertDollars(goal.target,'core','sprout',setupTier(age)):null;}
export function setupPinValid(pin){return pin===''||/^\d{4}$/.test(pin);}
export function existingSetupStory(raw){try{return parseSaveFile(raw).save;}catch{return null;}}

// This module deliberately has no 3D dependencies. The HTML goal cards and the
// entire setup flow work even if the separate world module fails to initialize.
export function mountOnboarding(doc,win){
  const root=doc.querySelector('#intro');if(!root||root.dataset.setupMounted)return null;root.dataset.setupMounted='true';
  const get=id=>doc.querySelector('#'+id),panels=[...root.querySelectorAll('[data-setup-panel]')],steps=[...root.querySelectorAll('[data-setup-step]')],goals=[...root.querySelectorAll('[data-goal]')];
  let step=0,story=null;try{story=existingSetupStory(win.localStorage.getItem('mapleStreetChapter1'));}catch{}
  get('setupResume').hidden=!story;get('setupReplace').hidden=!story;
  if(story)get('savedStorySummary').textContent=(story.avatarName||'Player')+' · Business day '+(story.marketDay||1);
  const ready=()=>root.dataset.cityReady==='true'&&!root.dataset.cityError;
  const selected=()=>setupGoal(get('onboardingGoal').value);
  function refresh(){
    const id=selected(),age=get('childAge').value,tier=setupTier(age),pin=get('parentPinSetup').value;
    for(const button of goals){const chosen=Number(button.dataset.goal)===id;button.classList.toggle('selected',chosen);button.setAttribute('aria-pressed',String(chosen));}
    for(const price of root.querySelectorAll('[data-goal-price]'))price.textContent='Savings target · '+formatDollars(setupTarget(price.dataset.goalPrice,age));
    get('setupName').textContent=get('avatarName').value.trim().slice(0,16)||'Player';
    get('setupGoalName').textContent=STARTER_GOALS.find(g=>g.id===id)?.name||'Choose a goal';
    get('setupTarget').textContent=id===null?'—':formatDollars(setupTarget(id,age));get('setupTier').textContent=TIERS[tier].name;
    get('setupGoalHint').textContent=id===null?'Choose one goal to continue.':STARTER_GOALS[id].name+' selected. You can change your mind before starting.';
    get('setupNext').disabled=step===1&&id===null;
    get('setupPinError').textContent=setupPinValid(pin)?'':'Use exactly four digits, or leave the PIN blank.';
    get('begin').disabled=!ready()||id===null||!setupPinValid(pin)||!!story&&!get('replaceStory').checked;
    get('continueStory').disabled=!ready();get('introBackups').disabled=!ready();
    get('citySetupStatus').textContent=root.dataset.cityError|| (ready()?'Your city is ready. Let’s meet Mom.':'Getting your city ready. You can choose your player and goal while it loads.');
    // On the last step, say exactly why Start is not available yet.
    if(step===2)get('setupActionHint').textContent=root.dataset.cityError?'Step 3 of 3 · The city didn’t load. Reload to try again.':!ready()?'Step 3 of 3 · Your city is still loading. Start unlocks when it’s ready.':id===null?'Step 3 of 3 · Go back and choose a goal first.':!setupPinValid(pin)?'Step 3 of 3 · Fix the PIN under Grown-up controls, or leave it blank.':story&&!get('replaceStory').checked?'Step 3 of 3 · You have a saved story. Continue it above, or tick “Start a new story” below to replace it.':'Step 3 of 3 · Start when you’re ready.';
    get('setupRetry').hidden=!root.dataset.cityError;get('setupRetry').textContent=root.dataset.lighterGraphics==='true'?'Try lighter graphics':'Reload city';
  }
  function render(focus=false){
    panels.forEach((panel,i)=>panel.hidden=i!==step);steps.forEach((el,i)=>{if(i===step)el.setAttribute('aria-current','step');else el.removeAttribute('aria-current');el.classList.toggle('complete',i<step);});
    get('setupBack').hidden=step===0;get('setupNext').hidden=step===2;get('begin').hidden=step!==2;
    get('setupNext').textContent=step===0?'Next: choose a goal →':'Next: ready to play →';
    get('setupActionHint').textContent=['Step 1 of 3 · Next, choose your goal.','Step 2 of 3 · Pick one savings goal.','Step 3 of 3 · Start when you’re ready.'][step];
    get('setupBody').scrollTop=0;refresh();if(focus)panels[step].querySelector('h2')?.focus();
  }
  get('setupNext').addEventListener('click',()=>{if(step===1&&selected()===null)return;step=Math.min(2,step+1);render(true);});
  get('setupBack').addEventListener('click',()=>{step=Math.max(0,step-1);render(true);});
  for(const button of goals)button.addEventListener('click',()=>{get('onboardingGoal').value=button.dataset.goal;refresh();});
  for(const id of ['avatarName','childAge','parentPinSetup','replaceStory'])get(id).addEventListener(id==='replaceStory'||id==='childAge'?'change':'input',refresh);
  for(const group of ['skinChoices','shirtChoices','hairChoices']){
    const buttons=[...get(group).querySelectorAll('button')];for(const button of buttons){button.setAttribute('aria-pressed',String(button.classList.contains('selected')));button.addEventListener('click',()=>{for(const other of buttons){other.classList.toggle('selected',other===button);other.setAttribute('aria-pressed',String(other===button));}});}
  }
  get('setupRetry').addEventListener('click',()=>{if(typeof win.retryCitySetup==='function')win.retryCitySetup();else win.location.reload();});
  root.addEventListener('keydown',event=>{if(event.code!=='Tab'||!root.classList.contains('show'))return;const nodes=[...root.querySelectorAll('button:not([disabled]),input:not([disabled]):not([type="hidden"]),select:not([disabled]),summary')].filter(el=>el.getClientRects().length);if(!nodes.length)return;const first=nodes[0],last=nodes.at(-1);if(event.shiftKey&&(doc.activeElement===first||!nodes.includes(doc.activeElement))){event.preventDefault();last.focus();}else if(!event.shiftKey&&(doc.activeElement===last||!nodes.includes(doc.activeElement))){event.preventDefault();first.focus();}});
  doc.addEventListener('city:ready',refresh);doc.addEventListener('city:setup-error',refresh);
  const fail=()=>{if(!ready()){root.dataset.cityError||='The city couldn’t finish loading. Your saved story has not been replaced. Reload to try again.';refresh();}};
  win.addEventListener('error',fail);win.addEventListener('unhandledrejection',fail);
  if(win.matchMedia?.('(any-pointer: coarse)').matches)get('setupControls').textContent='Left stick to move · Drag the city to look · Tap Interact near Mom · Menu opens your city options';
  render();const heading=root.querySelector('h1');if(heading){heading.tabIndex=-1;heading.focus();}return {refresh,get step(){return step;}};
}
if(typeof window!=='undefined'&&typeof document!=='undefined'&&document.getElementById?.('onboarding'))mountOnboarding(document,window);
