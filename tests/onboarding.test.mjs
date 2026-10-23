import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {mountOnboarding,ownScriptError,LOAD_GRACE_MS,STARTER_GOALS,setupGoal,setupTier,setupTarget,setupPinValid,existingSetupStory} from '../assets/onboarding.js';
import {convertDollars} from '../assets/economy.js';

for(const value of ['',null,undefined,'3','-1','0.0','01',true,{},NaN])assert.equal(setupGoal(value),null);
for(const goal of STARTER_GOALS){assert.equal(setupGoal(String(goal.id)),goal.id);for(const age of [6,7,8,9,10,11,12,''])assert.equal(setupTarget(goal.id,age),convertDollars(goal.target,'core','sprout',setupTier(age)));}
assert.equal(setupTier(''),'builder');assert.equal(setupTier(7),'sprout');assert.equal(setupTier(8),'builder');assert.equal(setupTier(10),'planner');
for(const pin of ['','0000','1234'])assert.ok(setupPinValid(pin));for(const pin of ['123','abcd','12345',' 123'])assert.equal(setupPinValid(pin),false);
const saved={stage:'parent',goal:1,business:-1,cash:0,saved:0,earned:0,spent:0,investment:0,x:-83,z:-22,avatarName:'Existing',marketDay:1};
assert.equal(existingSetupStory(JSON.stringify(saved)).avatarName,'Existing');for(const raw of [null,'bad','{}',JSON.stringify({...saved,goal:55})])assert.equal(existingSetupStory(raw),null);

class Element{
 constructor(){this.dataset={};this.hidden=false;this.disabled=false;this.value='';this.checked=false;this.attrs={};this.events={};this.children=[];const set=new Set();this.classList={add:k=>set.add(k),contains:k=>set.has(k),toggle:(k,v)=>v?set.add(k):set.delete(k)};}
 addEventListener(type,fn){(this.events[type]||=[]).push(fn);}emit(type,event={}){for(const fn of this.events[type]||[])fn(event);}
 setAttribute(k,v){this.attrs[k]=v;}removeAttribute(k){delete this.attrs[k];}focus(){doc.activeElement=this;}getClientRects(){return this.hidden?[]:[{}];}
 querySelector(){return heading;}querySelectorAll(){return this.children;}
}
let doc,heading;
function fixture(raw=null){
 const ids=['intro','onboardingGoal','setupResume','setupReplace','savedStorySummary','childAge','parentPinSetup','avatarName','setupName','setupGoalName','setupTarget','setupTier','setupGoalHint','setupNext','setupPinError','begin','replaceStory','continueStory','introBackups','citySetupStatus','setupRetry','setupBack','setupBody','setupActionHint','skinChoices','shirtChoices','hairChoices'];
 const map=new Map(ids.map(id=>[id,new Element()])),get=id=>map.get(id),root=get('intro');root.classList.add('show');get('onboardingGoal').value='-1';heading=new Element();
 const panels=[0,1,2].map(()=>new Element()),steps=[0,1,2].map(()=>new Element()),goals=[0,1,2].map(i=>Object.assign(new Element(),{dataset:{goal:String(i)}})),prices=[0,1,2].map(i=>Object.assign(new Element(),{dataset:{goalPrice:String(i)}}));
 root.querySelectorAll=selector=>selector==='[data-setup-panel]'?panels:selector==='[data-setup-step]'?steps:selector==='[data-goal]'?goals:selector==='[data-goal-price]'?prices:[get('avatarName'),get('setupNext')];
 for(const group of ['skinChoices','shirtChoices','hairChoices'])get(group).children=[new Element(),new Element()];
 doc={events:{},querySelector:selector=>get(selector.slice(1)),addEventListener:Element.prototype.addEventListener,emit:Element.prototype.emit};let writes=0,reloads=0;
 const win={events:{},addEventListener:Element.prototype.addEventListener,emit:Element.prototype.emit,localStorage:{getItem:()=>raw,setItem(){writes++;}},location:{href:'https://play.example/index.html',reload(){reloads++;}},matchMedia:()=>({matches:false}),timers:[],setTimeout(fn,ms){this.timers.push({fn,ms});return this.timers.length;},clearTimeout(id){if(this.timers[id-1])this.timers[id-1].fn=null;}};
 const control=mountOnboarding(doc,win);return {control,get,root,panels,steps,goals,prices,win,get writes(){return writes;},get reloads(){return reloads;}};
}
let f=fixture();assert.equal(f.control.step,0);assert.equal(f.panels[0].hidden,false);assert.equal(f.get('setupResume').hidden,true);assert.equal(f.get('begin').disabled,true);
f.get('avatarName').value='<Player>';f.get('avatarName').emit('input');f.get('childAge').value='11';f.get('childAge').emit('change');assert.equal(f.prices[0].textContent,'Savings target · $600.00');
f.get('setupNext').emit('click');assert.equal(f.control.step,1);assert.equal(f.get('setupNext').disabled,true);f.get('setupNext').emit('click');assert.equal(f.control.step,1,'Cannot skip goal selection');
f.goals[1].emit('click');assert.equal(f.get('onboardingGoal').value,'1');assert.equal(f.goals[1].attrs['aria-pressed'],'true');assert.equal(f.get('setupNext').disabled,false);
f.get('setupNext').emit('click');assert.equal(f.control.step,2);assert.equal(f.get('setupName').textContent,'<Player>');assert.equal(f.get('setupGoalName').textContent,'Get an art set');assert.equal(f.get('setupTarget').textContent,'$500.00');assert.equal(f.get('begin').hidden,false);assert.equal(f.get('begin').disabled,true,'Setup cannot start an uninitialized city');
assert.match(f.get('setupActionHint').textContent,/still loading/,'Step 3 says Start waits for the city');
f.root.dataset.cityReady='true';doc.emit('city:ready');assert.equal(f.get('begin').disabled,false);
assert.match(f.get('setupActionHint').textContent,/Start when you’re ready/);
f.get('parentPinSetup').value='abc';f.get('parentPinSetup').emit('input');assert.equal(f.get('begin').disabled,true);assert.match(f.get('setupActionHint').textContent,/Fix the PIN/);assert.match(f.get('setupPinError').textContent,/four digits/);
f.get('parentPinSetup').value='1234';f.get('parentPinSetup').emit('input');assert.equal(f.get('begin').disabled,false);
f.get('setupBack').emit('click');assert.equal(f.control.step,1);assert.equal(f.goals[1].attrs['aria-pressed'],'true');assert.equal(f.writes,0,'Editing setup never writes or replaces progress');
let prevented=false;doc.activeElement=f.get('setupNext');f.root.emit('keydown',{code:'Tab',preventDefault(){prevented=true;}});assert.ok(prevented);assert.equal(doc.activeElement,f.get('avatarName'));
assert.equal(mountOnboarding(doc,f.win),null,'Mounting twice does not attach duplicate handlers');
f=fixture(JSON.stringify(saved));assert.equal(f.get('setupResume').hidden,false);assert.equal(f.get('savedStorySummary').textContent,'Existing · Business day 1');f.goals[0].emit('click');f.root.dataset.cityReady='true';doc.emit('city:ready');assert.equal(f.get('continueStory').disabled,false);assert.equal(f.get('begin').disabled,true,'An existing story needs explicit replacement consent');f.get('replaceStory').checked=true;f.get('replaceStory').emit('change');assert.equal(f.get('begin').disabled,false);assert.equal(f.writes,0);
f=fixture();f.goals[2].emit('click');f.win.emit('error',{type:'error',message:'ReferenceError: x is not defined',filename:'https://play.example/index.html'});assert.match(f.get('citySetupStatus').textContent,/couldn’t finish loading/);assert.equal(f.get('setupRetry').hidden,false);assert.equal(f.get('onboardingGoal').value,'2');f.get('setupRetry').emit('click');assert.equal(f.reloads,1);

// Errors that are not the game's own crash no longer lock setup on their own.
const own={type:'error',message:'TypeError: boom',filename:'https://play.example/index.html'},href={location:{href:'https://play.example/index.html'}};
assert.equal(ownScriptError(own,href),true);assert.equal(ownScriptError({...own,filename:'https://play.example/assets/onboarding.js'},href),true);
for(const e of [{type:'error',message:'Script error.',filename:''},{...own,filename:'https://cdn.overlay.example/edit.js'},{type:'unhandledrejection',reason:new Error('x')},{type:'error',message:'x'},undefined])assert.equal(ownScriptError(e,href),false);
f=fixture();f.win.emit('error',{type:'error',message:'Script error.'});f.win.emit('unhandledrejection',{type:'unhandledrejection'});
assert.equal(f.root.dataset.cityError,undefined,'host overlay errors and stray rejections do not fail setup immediately');assert.equal(f.win.timers.length,1,'one grace timer');assert.equal(f.win.timers[0].ms,LOAD_GRACE_MS);
f.root.dataset.cityReady='true';doc.emit('city:ready');assert.equal(f.win.timers[0].fn,null,'ready cancels the grace timer');assert.equal(f.root.dataset.cityError,undefined);
f=fixture();f.win.emit('unhandledrejection',{type:'unhandledrejection'});f.win.timers[0].fn();assert.match(f.get('citySetupStatus').textContent,/couldn’t finish loading/,'a city that never becomes ready still reports the failure');
f.root.dataset.cityReady='true';doc.emit('city:ready');assert.equal(f.root.dataset.cityError,undefined,'a late ready clears the generic message');assert.match(f.get('citySetupStatus').textContent,/ready/);
f=fixture();f.root.dataset.cityError='The city couldn’t start on this device.';f.win.emit('error',own);f.root.dataset.cityReady='true';doc.emit('city:ready');assert.ok(f.root.dataset.cityError,'specific setup errors are never cleared by ready');
const html=await readFile(new URL('../index.html',import.meta.url),'utf8');for(const g of STARTER_GOALS)assert.ok(html.includes('id="startupGoal'+g.id+'"'),'Goal '+g.id+' exists before any runtime JS');assert.match(html,/<script type="module" src="\.\/assets\/onboarding.js"><\/script>/);assert.ok(!html.includes('goalNames.forEach((n,i)=>{let b=document.createElement'));
// A saved story locks Start until the player chooses to replace it, and step 3 says so.
f=fixture(JSON.stringify(saved));f.root.dataset.cityReady='true';doc.emit('city:ready');f.get('setupNext').emit('click');f.goals[0].emit('click');f.get('setupNext').emit('click');
assert.equal(f.get('begin').disabled,true);assert.match(f.get('setupActionHint').textContent,/saved story.*Continue it above.*Start a new story/);
f.get('replaceStory').checked=true;f.get('replaceStory').emit('change');assert.equal(f.get('begin').disabled,false);assert.match(f.get('setupActionHint').textContent,/Start when you’re ready/);
// Startup regression: world setup runs before the player exists, so conversation placement must not call blocked() (it reads player height).
const conversationSource=html.match(/function conversation\(x,z\)\{[^\n]*/)?.[0]||'',openGroundSource=html.match(/function openGround\(x,z\)\{[^\n]*/)?.[0]||'';
assert.ok(conversationSource.includes('openGround(')&&!conversationSource.includes('blocked('),'conversation pairs use the setup-safe ground check');assert.ok(openGroundSource&&!/player/.test(openGroundSource));
assert.ok(html.indexOf('function conversation(x,z)')<html.indexOf('const player=person('),'conversation() is defined before the player, so it must stay player-free');
console.log('Onboarding passed: static goals, all age-tier targets, real setup-controller steps, loading/failure states, PIN and saved-story guards with step-3 reasons, startup-safe conversation placement, safe text, focus containment and no premature save writes.');
