import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFile} from 'node:fs/promises';
import * as THREE from 'three';
import {createLandmarkHouse} from '../assets/landmark-house.js';
import {MODEL_HOME as H} from '../assets/house-rules.js';
import {HOUSE_ROOMS,houseGuideEntries,restoreHouseGuide,houseRoomAt,houseGuideCue,renderHousePlan} from '../assets/house-guide.js';
import {exportSave,parseSaveFile} from '../assets/save-backups.js';

const context=new Proxy({},{get:()=>()=>{}});globalThis.document={createElement:()=>({getContext:()=>context})};
const scene=new THREE.Scene(),kit=Object.fromEntries(['wood','brick','siding','roofing','masonry'].map(key=>[key,color=>new THREE.MeshStandardMaterial({color})]));
const home=createLandmarkHouse({scene,visualKit:kit,obstacles:[],groundSurfaces:[]}),entries=houseGuideEntries(home);
assert.equal(entries.length,25);assert.equal(new Set(entries.map(a=>a.id)).size,25);
assert.ok(entries.every(a=>a.room&&a.room.floor===a.floor),'Every actual furniture action is assigned to its real floor');
assert.deepEqual(new Set(HOUSE_ROOMS.flatMap(r=>r.items)),new Set(entries.map(a=>a.id)));
for(const entry of entries){assert.equal(home.blocked(entry.x,entry.z,entry.y),false,'Guide target is a clear real approach: '+entry.id);assert.match(renderHousePlan(home,entry,entry.floor,entry.id),/aria-label="(Upstairs|Downstairs) plan/);}
const at=(x,z,y=H.ground)=>({x:H.x+x,z:H.z+z,y}),state={targetId:'wardrobe'};
assert.equal(houseRoomAt(at(-3,3,H.upper)).id,'main');assert.equal(houseRoomAt(at(-3,-3,H.upper)).id,'second');assert.equal(houseRoomAt(at(.6,-4,H.upper)).id,'bath');
assert.equal(houseRoomAt(at(-3,3)).id,'utility');assert.equal(houseRoomAt(at(-3,-3)).id,'living');assert.equal(houseRoomAt(at(1,-4)).id,'kitchen');assert.equal(houseRoomAt(at(1,4)).id,'foyer');
assert.equal(houseRoomAt({x:0,z:0,y:0}),null);assert.equal(houseRoomAt({x:NaN,z:H.z,y:0}),null);
assert.deepEqual(restoreHouseGuide(null,home),{targetId:null});
for(const id of [null,123,'front','unknown','<script>','__proto__'])assert.equal(restoreHouseGuide({targetId:id},home).targetId,null);
assert.deepEqual(restoreHouseGuide(state,home),state);assert.deepEqual(restoreHouseGuide(state,null),{targetId:null});
assert.match(houseGuideCue(home,state,at(2,3)).message,/Upstairs.*stairs on the east side/);
assert.match(houseGuideCue(home,state,at(4.95,0,1.8)).message,/Continue up the stairs/);
assert.match(houseGuideCue(home,{targetId:'tv'},at(4.95,0,1.8)).message,/Continue down the stairs/);
assert.match(houseGuideCue(home,state,at(2,2,H.upper)).message,/Open the main bedroom door/);
const open={...home.state,bedroom1:true,bedroom2:true,bathroom:true};home.restore(open);
const wardrobe=entries.find(a=>a.id==='wardrobe');assert.match(houseGuideCue(home,state,wardrobe,{mobile:true}).message,/Nearby.*Tap/);assert.match(houseGuideCue(home,state,wardrobe).message,/Press E/);
home.restore({...open,bedroom2:false});assert.match(houseGuideCue(home,state,at(-3,-3,H.upper)).message,/second bedroom door to leave/);
assert.match(houseGuideCue(home,{targetId:'tv'},at(-3,-3,H.upper)).message,/second bedroom door to leave/,'A closed exit door takes precedence before instructions to change floors');
assert.equal(houseGuideCue(home,state,{x:0,z:0,y:0}).inside,false);assert.equal(houseGuideCue(home,{targetId:'invalid'},wardrobe),null);
const raw={stage:'parent',goal:0,business:-1,cash:0,saved:0,earned:0,spent:0,investment:0,x:H.entry.x,z:H.entry.z,houseGuide:state};assert.deepEqual(parseSaveFile(exportSave(JSON.stringify(raw))).save.houseGuide,state,'Guide survives actual portable saves');
const before=home.serialize(),room0=renderHousePlan(home,wardrobe,0,'wardrobe'),room1=renderHousePlan(home,wardrobe,1,'wardrobe');
assert.ok(!room0.includes('>★</text>'));assert.ok(room1.includes('>★</text>'),'Target marker appears only on its real floor');
assert.match(room1,/fill="#ffd56c"/);assert.ok(!room0.includes('fill="#ffd56c"'),'Player marker appears only on the selected matching floor');
assert.ok(!room1.includes('NaN'));assert.match(room1,/houseStairHatch/);assert.match(room1,/BACKYARD · NORTH/);assert.deepEqual(home.serialize(),before,'Opening or rendering the map never operates furniture or changes the house');
const html=await readFile(new URL('../index.html',import.meta.url),'utf8'),statusSource=html.split('\n').find(l=>l.includes("const status=document.querySelector('#routeStatus')"));
function hud(p,{driving=null,navigationTarget={id:'cafe'},targetId='wardrobe'}={}){
 const status={style:{},textContent:''},flags=new Map(),context={driving,riding:null,houseGuideCue,landmarkHome:home,houseGuide:{targetId},player:{position:p},mobileControls:{enabled:false},navigationTarget,navigationInfo:{remaining:123,message:'Continue to the cafe'},formatRouteDistance:()=> '123 m',document:{querySelector:()=>status,body:{classList:{toggle:(key,on)=>flags.set(key,on)}}}};
 vm.runInNewContext(statusSource,context);return {status,flags,context};
}
let display=hud(at(2,3));assert.match(display.status.textContent,/Upstairs.*stairs/);assert.equal(display.context.navigationTarget.id,'cafe','Indoor cue leaves the saved city destination intact');assert.equal(display.flags.get('navigating'),true);
display=hud({x:0,z:0,y:0});assert.match(display.status.textContent,/123 m.*cafe/,'Leaving the house restores the existing city route cue');
assert.match(hud(at(2,3),{driving:{}}).status.textContent,/123 m.*cafe/,'Vehicle controls do not show indoor walking guidance');
assert.equal(hud({x:0,z:0,y:0},{navigationTarget:null}).status.style.display,'none','An outdoor house target adds no stray HUD line');
console.log('House guide passes: all 25 real approaches, both floors/rooms, stairs/closed-door cues, invalid targets, portable saves and floor-specific geometry/markers without mutations.');
