import assert from 'node:assert/strict';
import * as THREE from 'three';
import {createLandmarkHouse} from '../assets/landmark-house.js';
import {MODEL_HOME as H} from '../assets/house-rules.js';
import {houseActionSound,sampleHouseAudio} from '../assets/house-audio.js';
import {createCityAudio,restoreAudio} from '../assets/city-audio.js';

const canvas=new Proxy({},{get:()=>()=>{}});globalThis.document={createElement:()=>({getContext:()=>canvas})};
const home=createLandmarkHouse({scene:new THREE.Scene(),visualKit:Object.fromEntries(['wood','brick','siding','roofing','masonry'].map(k=>[k,c=>new THREE.MeshStandardMaterial({color:c})])),obstacles:[],groundSurfaces:[]});
const at=id=>home.actions.find(a=>a.id===id),tap=at('tap'),shower=at('shower'),washer=at('washer');
assert.deepEqual(sampleHouseAudio(home,tap),{water:{level:0,pan:0},washer:{level:0,pan:0}});
home.restore({...home.state,tap:true,shower:true,washer:true});
const saved=home.serialize(tap),near=sampleHouseAudio(home,tap),far=sampleHouseAudio(home,{x:H.x-5,z:H.z,y:H.ground});
assert.ok(near.water.level>far.water.level);assert.ok(sampleHouseAudio(home,shower).water.level>.9,'Running shower uses its actual upstairs source');
assert.ok(sampleHouseAudio(home,washer).washer.level>.99,'Washer uses its actual utility-room source');
const beside={...washer,x:washer.x+1};assert.ok(sampleHouseAudio(home,beside,0).washer.pan<0);assert.ok(sampleHouseAudio(home,beside,Math.PI).washer.pan>0);
const oppositeFloor={...washer,y:H.upper};assert.ok(sampleHouseAudio(home,oppositeFloor).washer.level<.02,'Floor separation and closed room doors muffle the washer');
const hall={x:H.x+1.5,z:H.z+3.5,y:H.ground},closed=sampleHouseAudio(home,hall).washer.level;home.restore({...home.state,garage:true});assert.ok(sampleHouseAudio(home,hall).washer.level>closed,'Opening the utility door changes sound transmission');
for(const p of [null,{x:NaN,z:tap.z,y:.3},{x:0,z:0,y:0},{...tap,y:Infinity}])assert.deepEqual(sampleHouseAudio(home,p),{water:{level:0,pan:0},washer:{level:0,pan:0}});
assert.deepEqual(sampleHouseAudio(null,tap),{water:{level:0,pan:0},washer:{level:0,pan:0}});
home.restore(saved);assert.deepEqual(home.serialize(tap),saved,'Sampling never changes saved appliance state');
for(const id of ['front','rear','garage','bedroom1','bedroom2','bathroom','lights0','lights1','desk','fridge','oven','cabinet','curtains','wardrobe','seat','rest','bedding','books','tap','shower','washer','tv','toilet','bath-sink']){
 for(const state of [null,{}, {[id]:true,tv:true,channel:2}, {tv:true,channel:NaN}])for(const sound of houseActionSound(id,state))assert.ok(Number.isFinite(sound.volume)&&sound.volume>0&&sound.volume<=.07&&sound.duration>0&&sound.duration<=.65&&Number.isFinite(sound.frequency));
}
for(const id of ['bed1','bed2','home-plans','unknown'])assert.deepEqual(houseActionSound(id),[],'Opening a bed/planning menu has no physical sound');
assert.notDeepEqual(houseActionSound('front',{front:true}),houseActionSound('front',{front:false}));
assert.notDeepEqual(houseActionSound('tv',{tv:true,channel:0}),houseActionSound('tv',{tv:true,channel:2}));

class Param{constructor(){this.value=0}setTargetAtTime(v){this.value=v}setValueAtTime(v){this.value=v}linearRampToValueAtTime(v){this.value=v}exponentialRampToValueAtTime(v){this.value=v}}
class Node{constructor(){for(const k of ['gain','frequency','Q','threshold','ratio','pan'])this[k]=new Param()}connect(){}disconnect(){this.disconnected=true}start(){this.started=true}stop(){this.stopped=true}}
let ctx,created=0;class Context{constructor(){created++;ctx=this;this.currentTime=0;this.sampleRate=100;this.state='suspended';this.destination={};this.nodes=[]}node(){const n=new Node();this.nodes.push(n);return n}createGain(){return this.node()}createDynamicsCompressor(){return this.node()}createOscillator(){return this.node()}createBufferSource(){return this.node()}createBiquadFilter(){return this.node()}createStereoPanner(){return this.node()}createBuffer(a,n){return {getChannelData:()=>new Float32Array(n)}}async resume(){this.state='running'}async suspend(){this.state='suspended'}async close(){this.state='closed'}}
let settings;const audio=createCityAudio({Context,onSettings:s=>settings=s});assert.equal(created,0);assert.equal(audio.householdEffect('front',{front:true}),false);assert.equal(created,0,'House actions never create audio before gesture unlock');
await audio.unlock();const fixed=ctx.nodes.length;assert.ok(fixed<=48);assert.equal(ctx.nodes.filter(n=>n.started).length,13,'Two fixed household layers share the eleven city layers (including the passing airliner)');
const waterFilter=ctx.nodes.find(n=>n.type==='bandpass'),waterGain=ctx.nodes[ctx.nodes.indexOf(waterFilter)+1],waterPan=ctx.nodes[ctx.nodes.indexOf(waterFilter)+2];
const motor=ctx.nodes.find(n=>n.started&&n.frequency.value===58),motorGain=ctx.nodes[ctx.nodes.indexOf(motor)+2];
const sample={water:{level:1,pan:-.6},washer:{level:1,pan:.5}},environment={household:sample,position:tap,seated:true};
for(let i=0;i<5000;i++)audio.update(.04,environment);assert.equal(ctx.nodes.length,fixed,'Continuous household sound creates no per-frame nodes');assert.equal(audio.voiceCount,0,'Restored running appliances never replay action sounds');assert.equal(waterGain.gain.value,.055);assert.equal(waterPan.pan.value,-.6);assert.ok(motorGain.gain.value>0);
audio.update(0,{...environment,paused:true});assert.equal(waterGain.gain.value,0);assert.equal(motorGain.gain.value,0);
assert.equal(audio.householdEffect('tap',{tap:true}),true,'Validated actions can sound in the paused object chooser');assert.equal(audio.voiceCount,2);const afterTap=ctx.nodes.length;assert.equal(audio.householdEffect('tap',{tap:true}),false);assert.equal(ctx.nodes.length,afterTap);
ctx.currentTime+=.2;assert.equal(audio.householdEffect('lights0'),true,'Cooldown uses audio time while simulation is paused');assert.equal(audio.voiceCount,3);
audio.setSettings({household:false});assert.equal(settings.household,false);assert.equal(audio.voiceCount,0,'Disabling household sound stops and releases its short voices');assert.equal(audio.householdEffect('lights0'),false);
audio.setSettings({household:true});audio.update(.1,environment);assert.ok(waterGain.gain.value>0);audio.update(.1,{...environment,vehicle:{kind:'car'}});assert.equal(waterGain.gain.value,0);
for(const off of [{muted:true},{master:0},{effects:0}]){audio.setSettings({muted:false,master:.45,effects:.65,...off});audio.update(.1,environment);assert.equal(waterGain.gain.value,0);ctx.currentTime+=.2;assert.equal(audio.householdEffect('front',{front:true}),false);}
audio.setSettings({muted:false,master:.45,effects:.65});ctx.currentTime+=.2;assert.ok(audio.householdEffect('front',{front:true}));await audio.setBackground(true);assert.equal(audio.voiceCount,0);assert.equal(waterGain.gain.value,0);assert.equal(audio.householdEffect('front'),false);assert.equal(ctx.state,'suspended');
await audio.setBackground(false);await audio.unlock();assert.equal(audio.voiceCount,0,'Returning to the app does not replay old actions');
for(let i=0;i<20;i++){ctx.currentTime+=.2;audio.householdEffect('tap',{tap:true});}assert.equal(audio.voiceCount,8,'Household actions share the global eight-voice cap');
audio.dispose();assert.equal(audio.voiceCount,0);assert.equal(ctx.state,'closed');assert.ok(waterPan.disconnected&&motor.stopped);assert.equal(audio.householdEffect('tv',{tv:true}),false);
assert.equal(restoreAudio({}).household,true);assert.equal(restoreAudio({household:false}).household,false);assert.equal(createCityAudio({Context:null}).householdEffect('toilet'),false);
console.log('House audio passes: actual saved sources, room/floor/distance/stereo, distinct bounded effects, gesture/mute/category/background gates, paused chooser cooldown, fixed layers, voice cap and cleanup.');
