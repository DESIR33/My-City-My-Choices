import assert from 'node:assert/strict';
import {createSessionLifecycle} from '../assets/session-lifecycle.js';
function fixture({active=true,hidden=false}={}){
 const window=new EventTarget(),document=new EventTarget();document.hidden=hidden;let focused=true;
 document.hasFocus=()=>focused;
 let saves=0,returns=0,resets=0;
 const lifecycle=createSessionLifecycle({window,document,canSave:()=>active,save:()=>saves++,onAway:()=>resets++,onReturn:()=>returns++});
 return {window,document,lifecycle,setActive:value=>active=value,setFocus:value=>focused=value,counts:()=>[saves,returns,resets]};
}
const emit=(target,type)=>target.dispatchEvent(new Event(type));
const f=fixture();emit(f.window,'blur');assert.equal(f.lifecycle.paused,true);assert.deepEqual(f.counts(),[1,0,1]);
f.document.hidden=true;emit(f.document,'visibilitychange');emit(f.window,'pagehide');emit(f.document,'freeze');assert.deepEqual(f.counts(),[1,0,1],'one save per background transition');
emit(f.window,'focus');assert.equal(f.lifecycle.paused,true,'focus cannot resume a hidden document');
f.document.hidden=false;f.setFocus(false);emit(f.document,'visibilitychange');assert.equal(f.lifecycle.paused,true,'visible but unfocused stays paused');
f.setFocus(true);emit(f.window,'focus');assert.equal(f.lifecycle.paused,false);assert.deepEqual(f.counts(),[1,1,1]);emit(f.window,'pageshow');assert.deepEqual(f.counts(),[1,1,1],'duplicate resume events cannot open duplicate panels');
emit(f.window,'pagehide');emit(f.window,'pageshow');assert.deepEqual(f.counts(),[2,2,2],'BFCache back/forward cycle saves and resumes');
f.setActive(false);emit(f.window,'blur');emit(f.window,'focus');assert.deepEqual(f.counts(),[2,2,3],'welcome screen and intentional save replacement do not write or open a resume panel');
f.setActive(true);emit(f.document,'freeze');emit(f.document,'resume');assert.deepEqual(f.counts(),[3,3,4]);
f.lifecycle.dispose();emit(f.window,'blur');assert.deepEqual(f.counts(),[3,3,4]);
const initial=fixture({hidden:true});assert.equal(initial.lifecycle.paused,true);initial.document.hidden=false;emit(initial.window,'pageshow');assert.equal(initial.lifecycle.paused,false);assert.deepEqual(initial.counts(),[0,0,0],'background initialization cannot overwrite a save');
console.log('Session lifecycle background saves, focus gating, duplicate events and BFCache pass');
