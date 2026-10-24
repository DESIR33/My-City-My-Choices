import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFile} from 'node:fs/promises';

const html=await readFile(new URL('../index.html',import.meta.url),'utf8');
const shortcuts=html.split('\n').find(line=>line.startsWith("document.addEventListener('keydown',e=>{if(e.code==='Tab'"));
const pointer=html.split('\n').find(line=>line.startsWith('document.addEventListener("pointerlockchange"'));
const hide=html.slice(html.indexOf('function hide('),html.indexOf('function notify('));
assert.ok(shortcuts&&pointer&&hide);
const classes=()=>{const set=new Set();return {add:k=>set.add(k),remove:k=>set.delete(k),contains:k=>set.has(k)};};
const modal={classList:classes()},intro={classList:classes()},body={classList:classes()},canvas={};let menus=0,locks=0,exits=0,resets=0;
const listeners={},keys={KeyW:true,Space:true};
const c={endWardrobePreview(){},modal,panel:{},stage:'done',locked:true,keys,homeProjectTicket:{},backupLoadId:0,pendingImportedSave:null,pendingMoneyDecision:null,neighborJobStep:null,
 renderer:{domElement:canvas},document:{body,pointerLockElement:canvas,addEventListener:(key,fn)=>{listeners[key]=fn;},querySelector:()=>intro,exitPointerLock(){exits++;this.pointerLockElement=null;}},
 resetInputs(){resets++;for(const key in keys)keys[key]=false;},requestGamePointerLock(){locks++;},openCityMenu(){menus++;modal.classList.add('show');c.document.exitPointerLock();}};
vm.createContext(c);vm.runInContext(hide+pointer+shortcuts,c);c.closeGamePanel=c.hide;
function key(code,options={}){let prevented=false;listeners.keydown({code,target:{matches:()=>false},preventDefault(){prevented=true;},...options});return prevented;}
assert.equal(key('Escape'),false,'Escape during play leaves the browser default intact');assert.equal(menus,0);assert.equal(locks,0);assert.equal(exits,1);assert.equal(keys.KeyW,false);assert.equal(keys.Space,false);
listeners.pointerlockchange();assert.equal(c.locked,false);assert.ok(resets>=2);
assert.equal(key('KeyP'),true);assert.equal(menus,1);assert.ok(modal.classList.contains('show'));
c.homeProjectTicket={};c.pendingImportedSave={};assert.equal(key('Escape'),true);assert.equal(modal.classList.contains('show'),false);assert.equal(locks,0,'Closing a panel with Escape never captures the mouse again');assert.equal(c.homeProjectTicket,null);assert.equal(c.pendingImportedSave,null);
assert.equal(key('Escape'),false);assert.equal(menus,1,'A second Escape never opens the menu');
key('KeyP');key('KeyP');assert.equal(modal.classList.contains('show'),false);assert.equal(locks,1,'P can toggle back into play');
const before=menus;for(const options of [{repeat:true},{ctrlKey:true},{metaKey:true},{altKey:true},{target:{matches:()=>true}}])key('KeyP',options);assert.equal(menus,before,'Typing and browser shortcuts are unaffected');
intro.classList.add('show');assert.equal(key('KeyP'),false);assert.equal(menus,before);intro.classList.remove('show');
c.document.pointerLockElement=canvas;listeners.pointerlockchange();assert.equal(c.locked,true);
assert.match(html,/<kbd>P<\/kbd> menu/);assert.match(html,/<kbd>Esc<\/kbd> release mouse/);assert.match(html,/Menu · P<\/button>/);
console.log('Menu/pointer passed: actual shortcut, pointer-change and panel-close handlers separate P from Escape, preserve browser/typing shortcuts, cancel stale panels and clear held inputs without recapture.');
