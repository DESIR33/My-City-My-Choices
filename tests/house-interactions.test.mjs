import assert from 'node:assert/strict';
import * as THREE from 'three';
import {createLandmarkHouse} from '../assets/landmark-house.js';
import {MODEL_HOME as H,freshHouse} from '../assets/house-rules.js';

const canvas=new Proxy({},{get:()=>()=>{}});
globalThis.document={createElement:()=>({getContext:()=>canvas})};
const scene=new THREE.Scene(),kit=Object.fromEntries(['wood','brick','siding','roofing','masonry'].map(key=>[key,color=>new THREE.MeshStandardMaterial({color})]));
const home=createLandmarkHouse({scene,visualKit:kit,obstacles:[],groundSurfaces:[]});
const open={...freshHouse(),front:true,rear:true,garage:true,bedroom1:true,bedroom2:true,bathroom:true};
home.restore(open);
for(const action of home.actions.filter(a=>a.kind!=='door')){
 assert.ok(home.nearby(action).some(a=>a.id===action.id),'Every real furniture approach exposes its own object, including shared points: '+action.id);
 assert.ok(home.nearby(action).every(a=>a.floor===action.floor),'Nearby choices stay on the actual floor');
}
const bed=home.actions.find(a=>a.id==='bed1'),curtains=home.actions.find(a=>a.id==='curtains');
assert.equal(bed.x,curtains.x);assert.equal(bed.z,curtains.z);
assert.equal(home.nearest(bed).nearbyCount,2);
assert.deepEqual(home.nearby(bed).filter(a=>a.kind!=='door').map(a=>a.id),['bed1','curtains']);
assert.equal(home.nearby(bed).find(a=>a.id==='curtains').status,'Open');
assert.equal(home.act('curtains',bed).ok,true);
assert.equal(home.nearby(bed).find(a=>a.id==='curtains').actionLabel,'Open');
assert.equal(home.nearby(bed).find(a=>a.id==='curtains').status,'Closed');
home.restore(home.serialize(bed));assert.equal(home.state.curtains,false,'Chooser uses the existing saved household flags');
const tv=home.actions.find(a=>a.id==='tv');
for(const [status,actionLabel] of [['Off','Turn on'],['Nature','Next channel'],['City stories','Next channel'],['Garden time','Turn off'],['Off','Turn on']]){
 const item=home.nearby(tv).find(a=>a.id==='tv');assert.equal(item.status,status);assert.equal(item.actionLabel,actionLabel);home.act('tv',tv);
}
const bath=home.actions.find(a=>a.id==='bath-sink');
assert.ok(['bath-sink','shower','toilet'].every(id=>home.nearby(bath).some(a=>a.id===id)),'Bathroom fixtures remain individually selectable');
home.restore({...open,bathroom:false});
const outside={x:H.x+.6,y:H.upper,z:H.z-1.7};
assert.ok(!home.nearby(outside).some(a=>a.id==='toilet'),'A closed bathroom door blocks a nearby fixture');
assert.equal(home.act('toilet',outside).ok,false,'Chooser validation and execution agree across the door');
assert.ok(!home.nearby({...bed,y:H.ground}).some(a=>a.id==='bed1'),'Downstairs cannot select an upstairs object');
for(const p of [null,{x:NaN,z:bed.z,y:H.upper},{x:bed.x,z:Infinity,y:H.upper},{...bed,y:NaN},{x:0,z:0,y:0}]){
 assert.deepEqual(home.nearby(p),[]);assert.equal(home.act('curtains',p).ok,false);
}
const front={...H.entry,y:H.ground};
assert.equal(home.nearest(front).kind,'door');assert.equal(home.nearest(front).actionLabel,'Close door');
assert.equal(home.act('unknown',front).ok,false);
console.log('House interaction choices pass: all furniture approaches, shared bed/curtains, TV states, bathroom choices, door/floor/distance guards and saved flags.');
