import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createGraphicsRecovery,showGraphicsUnavailable} from '../assets/graphics-recovery.js';
class Element extends EventTarget{
 constructor(tag){super();this.tag=tag;this.children=[];this.style={};this.attributes={};}
 setAttribute(key,value){this.attributes[key]=value;}
 append(...children){for(const child of children){child.parent=this;this.children.push(child);}}
 focus(){this.focused=true;}
 remove(){this.parent.children=this.parent.children.filter(child=>child!==this);}
}
const document={body:new Element('body'),createElement:tag=>new Element(tag),exitPointerLock(){this.unlocked=true;}},canvas=new EventTarget();
let saves=0,reloads=0,restores=0;
const recovery=createGraphicsRecovery({canvas,document,onPause:()=>saves++,onReload:()=>reloads++,onRestore:()=>restores++});
assert.equal(recovery.blocked,false);
canvas.dispatchEvent(new Event('webglcontextrestored'));assert.equal(document.body.children.length,0);
const event=new Event('webglcontextlost',{cancelable:true});canvas.dispatchEvent(event);
assert.equal(event.defaultPrevented,true,'Context loss is acknowledged so the browser may restore it');
assert.equal(recovery.blocked,true,'The simulation and renderer must stop while graphics are lost');
assert.equal(saves,1);assert.equal(document.unlocked,true);
const overlay=document.body.children[0],card=overlay.children[0],button=card.children[2];
assert.equal(overlay.attributes.role,'alertdialog');assert.equal(button.focused,true);
canvas.dispatchEvent(new Event('webglcontextlost',{cancelable:true}));assert.equal(saves,1,'Duplicate loss events cannot resave or stack dialogs');assert.equal(document.body.children.length,1);
canvas.dispatchEvent(new Event('webglcontextrestored'));assert.equal(recovery.blocked,true,'Keep the simulation paused until a full page rebuild');assert.match(card.children[1].textContent,/Reloading with lighter graphics/);assert.equal(restores,1,'A restored context automatically requests the lighter reload');assert.equal(reloads,0);
canvas.dispatchEvent(new Event('webglcontextrestored'));assert.equal(restores,1,'Duplicate restore events cannot trigger repeated recovery');
button.dispatchEvent(new Event('click'));assert.equal(reloads,1);
recovery.dispose();canvas.dispatchEvent(new Event('webglcontextlost',{cancelable:true}));assert.equal(saves,1);assert.equal(document.body.children.length,0);
const unavailable=showGraphicsUnavailable({document,onReload:()=>reloads++});
assert.match(document.body.children[0].children[0].children[0].textContent,/could not start/);
document.body.children[0].children[0].children[2].dispatchEvent(new Event('click'));assert.equal(reloads,2);unavailable.remove();
const html=readFileSync(new URL('../index.html',import.meta.url),'utf8');
assert.match(html,/if\(sessionLifecycle\.paused\|\|graphicsRecovery\.blocked\)return/);
assert.match(html,/return !!graphicsRecovery\?\.blocked\|\|/,'Input also stays blocked until reload');
assert.match(html,/if\(stage!=='goal'\)saveGame\(\)/,'A loss at the welcome screen cannot overwrite an existing story');
assert.match(html,/function preferBasicGraphics\(\)/);assert.match(html,/showGraphicsUnavailable\(\{document,onReload:reloadWithBasicGraphics\}\)/);
assert.match(html,/120000\)return false/,'A recent automatic retry prevents recovery loops');assert.match(html,/onRestore:recoverAfterGraphicsRestore/);
const visuals=readFileSync(new URL('../assets/city-visuals.js',import.meta.url),'utf8');assert.match(visuals,/Math\.min\(mobile \? 2 : 8/);assert.match(visuals,/if\(mobile\)return scene\.environment/);assert.match(visuals,/mobile \? 512 : 2048/);
console.log('Graphics loss pauses once, preserves checkpoint gating, offers explicit lightweight reload, and handles unavailable WebGL');
