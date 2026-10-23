import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import * as THREE from 'three';
import {createLandmarkHouse} from '../assets/landmark-house.js';
import {MODEL_HOME as H, freshHouse} from '../assets/house-rules.js';

globalThis.document={createElement:()=>({width:0,height:0,getContext:()=>new Proxy({},{get:()=>()=>{}})})};
for(const mobile of [true,false]){
 const scene=new THREE.Scene(),home=createLandmarkHouse({scene,visualKit:{},obstacles:[],groundSurfaces:[],mobile});
 const lights=[];scene.traverse(o=>{if(o.isPointLight)lights.push(o);});assert.equal(lights.length,2);
 const layout=()=>{const result=[];scene.traverseVisible(o=>{if(o.isLight)result.push(o.type);});return result.sort();};
 home.update(.016,{x:H.x+30,y:0,z:H.z});const initialLayout=layout();
 // Simulate approaching, entering, climbing stairs, switching off and exiting.
 // Three's light-count shader defines must not change at these boundaries.
 for(let n=0;n<100;n++){
  for(const y of [.3,H.upper]){
   home.update(.016,{x:H.x,y,z:H.z});assert.deepEqual(layout(),initialLayout);
   assert.equal(lights.filter(l=>l.intensity>0).length,mobile?0:1);
  }
  home.update(.016,{x:H.x+30,y:0,z:H.z});assert.deepEqual(layout(),initialLayout);assert.ok(lights.every(l=>l.intensity===0));
 }
 home.restore({...freshHouse(),lights0:false,lights1:false});home.update(.016,{x:H.x,y:.3,z:H.z});
 assert.ok(lights.every(l=>l.intensity===0));assert.deepEqual(layout(),initialLayout);
 home.restore(freshHouse());home.update(.016,{x:H.x,y:.3,z:H.z});
 assert.equal(home.state.lights0,true);assert.equal(home.actions.filter(a=>a.kind==='toggle').length>5,true);
 // An idle door must not repeatedly walk the loaded furniture hierarchy.
 let walks=0;const original=home.root.updateMatrixWorld;
 home.root.updateMatrixWorld=function(...args){walks++;return original.apply(this,args);};
 for(let n=0;n<120;n++)home.update(.016,{x:H.x+30,y:0,z:H.z});assert.equal(walks,0);
 const front=home.actions.find(a=>a.id==='front'),p={x:front.x,y:front.y,z:front.z+1};
 assert.equal(home.act('front',p).ok,true);for(let n=0;n<180;n++)home.update(1/60,{x:H.x+30,y:0,z:H.z});
 assert.ok(walks>0,'an opening door updates collision bounds');assert.equal(home.doors.find(d=>d.id==='front').angle,Math.PI/2);
 const settled=walks;for(let n=0;n<120;n++)home.update(.016,{x:H.x+30,y:0,z:H.z});assert.equal(walks,settled,'settled doors stop traversing');
 assert.ok(home.colliders.every(c=>[c.minX,c.maxX,c.minZ,c.maxZ].every(Number.isFinite)));
}
const html=await readFile(new URL('../index.html',import.meta.url),'utf8');
assert.match(html,/createLandmarkHouse\(\{scene,visualKit,obstacles,groundSurfaces,mobile:mobileGraphics\}\)/);
console.log('House entry budgets pass: fixed light layout across entry/floors/switches, mobile baked light, unchanged actions, finite door collisions and no idle hierarchy walks.');
