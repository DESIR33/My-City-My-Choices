import assert from 'node:assert/strict';
import test from 'node:test';
import {readFile} from 'node:fs/promises';
import vm from 'node:vm';
import {mountCityStartup} from '../assets/city-startup.js';
import {mountOnboarding} from '../assets/onboarding.js';

class Element{
 constructor(){this.dataset={};this.children=[];this.events={};this.attrs={};this.value='';this.checked=false;this.disabled=false;this.hidden=false;this.classList={contains:()=>true,toggle(){},add(){}};}
 addEventListener(type,fn){(this.events[type]||=[]).push(fn);}dispatchEvent(event){for(const fn of this.events[event.type]||[])fn(event);return true;}
 click(){if(this.disabled)return;let stopped=false;const event={type:'click',preventDefault(){},stopImmediatePropagation(){stopped=true;}};for(const fn of this.events.click||[]){fn(event);if(stopped)return;}this.onclick?.();}
 setAttribute(k,v){this.attrs[k]=v;}removeAttribute(k){delete this.attrs[k];}focus(){}querySelector(){return new Element();}querySelectorAll(){return this.children;}
}
function fixture(mobile,raw=null){
 const map=new Map(),get=id=>{if(!map.has(id))map.set(id,new Element());return map.get(id);};get('cityRuntime').textContent='/* runtime source */';get('onboardingGoal').value='-1';
 const goals=[0,1,2].map(i=>Object.assign(new Element(),{dataset:{goal:String(i)}}));const panels=[new Element(),new Element(),new Element()];
 get('intro').querySelectorAll=s=>s==='[data-goal]'?goals:s==='[data-setup-panel]'?panels:[];
 const doc=new Element();doc.querySelector=s=>get(s.slice(1));doc.body=new Element();doc.body.appendChild=script=>doc.body.children.push(script);doc.createElement=()=>new Element();
 const win=new Element();win.matchMedia=()=>({matches:mobile});win.Event=class{constructor(type){this.type=type;}};win.CustomEvent=class extends win.Event{constructor(t,args){super(t);this.detail=args.detail;}};
 let writes=0;win.localStorage={getItem:()=>raw,setItem(){writes++;}};win.location={href:'https://test.invalid/',reload(){}};
 const onboarding=mountOnboarding(doc,win),boot=mountCityStartup(doc,win);return {get,doc,win,goals,onboarding,boot,writes:()=>writes};
}
test('Mobile setup stays renderer-free and launches Start exactly once after ready',async()=>{
 const f=fixture(true);assert.equal(f.doc.body.children.length,0);assert.equal(f.boot.started,false);assert.equal(f.get('begin').disabled,true);
 f.get('setupNext').click();f.goals[1].click();f.get('setupNext').click();assert.equal(f.get('begin').disabled,false);
 f.get('parentPinSetup').value='12';f.get('parentPinSetup').dispatchEvent({type:'input'});assert.equal(f.get('begin').disabled,true);assert.equal(f.doc.body.children.length,0);
 f.get('parentPinSetup').value='';f.get('parentPinSetup').dispatchEvent({type:'input'});f.get('begin').click();
 assert.equal(f.doc.body.children.length,1);assert.equal(f.doc.body.children[0].type,'module');assert.equal(f.get('begin').disabled,true);
 f.get('begin').click();f.boot.launch('begin');assert.equal(f.doc.body.children.length,1,'No duplicate runtime/renderer');
 let starts=0;f.get('begin').onclick=()=>starts++;assert.equal(starts,0);assert.equal(f.writes(),0);
 f.get('intro').dataset.cityReady='true';f.doc.dispatchEvent(new f.win.Event('city:ready'));await Promise.resolve();assert.equal(starts,1);
 f.doc.dispatchEvent(new f.win.Event('city:ready'));await Promise.resolve();assert.equal(starts,1,'Ready cannot replay Start');
});
test('Continue keeps the old save and starts only after world readiness',async()=>{
 const save=JSON.stringify({stage:'parent',goal:1,business:-1,cash:7,saved:2,earned:0,spent:0,investment:0,x:-83,z:-22,avatarName:'Existing'}),f=fixture(true,save);
 assert.equal(f.get('continueStory').disabled,false);assert.equal(f.get('begin').disabled,true);
 f.goals[0].click();assert.equal(f.get('begin').disabled,true,'Replacement consent still required');f.get('continueStory').click();
 let restores=0;f.get('continueStory').onclick=()=>restores++;assert.equal(restores,0);assert.equal(f.writes(),0);
 f.get('intro').dataset.cityReady='true';f.doc.dispatchEvent(new f.win.Event('city:ready'));await Promise.resolve();assert.equal(restores,1);assert.equal(f.writes(),0);
});
test('Module failure keeps setup/save intact and does not auto-start',async()=>{
 const f=fixture(true);f.goals[0].click();f.get('begin').click();let starts=0;f.get('begin').onclick=()=>starts++;
 f.get('intro').dataset.cityError='Specific graphics failure';f.doc.dispatchEvent(new f.win.Event('city:setup-error'));assert.equal(f.get('intro').dataset.cityState,'failed');f.doc.body.children[0].dispatchEvent(new f.win.Event('error'));
 assert.equal(f.get('intro').dataset.cityError,'Specific graphics failure');assert.equal(f.get('begin').disabled,true);assert.equal(f.get('setupRetry').hidden,false);
 f.get('intro').dataset.cityReady='true';f.doc.dispatchEvent(new f.win.Event('city:ready'));await Promise.resolve();assert.equal(starts,0);assert.equal(f.writes(),0);
});
test('Desktop still starts eagerly; HTML never executes the inert source itself',async()=>{
 const f=fixture(false);assert.equal(f.doc.body.children.length,1);assert.equal(mountCityStartup(f.doc,f.win),null);
 const html=await readFile(new URL('../index.html',import.meta.url),'utf8');assert.match(html,/<script type="text\/plain" id="cityRuntime">/);assert.match(html,/<script type="module" src="\.\/assets\/city-startup.js">/);
 const runtime=html.split('<script type="text/plain" id="cityRuntime">')[1].split('</script>')[0];assert.ok(runtime.includes('new THREE.WebGLRenderer'));
 const cars=html.match(/if\(!mobileGraphics\)loadDetailedCars\(\)\.then\(loadPremiumCars\)\.catch[^\n]*/)[0];
 for(const mobileGraphics of [true,false]){let loaded=0;vm.runInNewContext(cars,{mobileGraphics,loadDetailedCars(){loaded++;return Promise.resolve();},loadPremiumCars(){},console});await Promise.resolve();assert.equal(loaded,mobileGraphics?0:1);}
 assert.match(runtime,/renderer\.shadowMap\.enabled=!mobileGraphics/);
});
