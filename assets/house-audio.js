import {houseInside} from './house-rules.js';
import {houseRoomAt,houseGuideEntries} from './house-guide.js';

const clamp=n=>Math.max(0,Math.min(1,n));
const noise=(volume,duration,frequency)=>({volume,duration,frequency});
const tone=(pitch,volume=.035,duration=.12)=>({tone:pitch,volume,duration,frequency:3000,wave:'triangle'});
// Original short textures, never recordings or speech. Bed menus are silent;
// only the subsequent rest/make action produces a fabric sound.
export function houseActionSound(id,state={}){
 state=state&&typeof state==='object'?state:{};
 if(['front','rear','garage','bedroom1','bedroom2','bathroom'].includes(id))return state[id]?[noise(.045,.19,550),tone(115,.014,.17)]:[noise(.065,.10,330)];
 if(['lights0','lights1','desk'].includes(id))return [noise(.035,.035,3200)];
 if(['fridge','oven','cabinet'].includes(id))return [noise(.045,id==='cabinet'?.2:.12,state[id]?850:420)];
 if(['curtains','wardrobe','seat','rest','bedding','books'].includes(id))return [noise(.032,id==='curtains'?.32:.2,id==='books'?1800:800)];
 if(['tap','shower'].includes(id))return state[id]?[noise(.025,.06,2200),noise(.025,.14,1600)]:[noise(.03,.055,1600)];
 if(id==='washer')return [tone(state.washer?440:220,.03,.14)];
 if(id==='tv')return [tone(state.tv?440+110*Math.max(0,Math.min(2,Number.isInteger(state.channel)?state.channel:0)):180,.025,.14)];
 if(id==='toilet')return [noise(.05,.65,650)];
 if(id==='bath-sink')return [noise(.035,.35,1900)];
 return [];
}
const sources=new WeakMap();
function homeSources(home){
 if(!sources.has(home)){const entries=houseGuideEntries(home);sources.set(home,['tap','shower','washer'].map(id=>entries.find(a=>a.id===id)).filter(Boolean));}
 return sources.get(home);
}
const silent=()=>({water:{level:0,pan:0},washer:{level:0,pan:0}});
export function sampleHouseAudio(home,position,yaw=0){
 const result=silent();if(!home?.actions||!position||![position.x,position.z,position.y??0].every(Number.isFinite)||!houseInside(position))return result;
 const state=home.state||{},room=houseRoomAt(position);yaw=Number.isFinite(yaw)?yaw:0;
 let waterWeight=0,waterPan=0;
 for(const source of homeSources(home)){
  if(state[source.id]!==true)continue;
  const dx=source.x-position.x,dz=source.z-position.z,distance=Math.hypot(dx,dz),otherFloor=Math.abs(source.y-(position.y||0))>1.5;
  let level=Math.pow(clamp(1-distance/10),2)*(otherFloor?.12:1);
  if(room?.id!==source.room?.id){level*=.8;for(const r of [room,source.room])if(r?.door&&!state[r.door])level*=.28;}
  const pan=Math.max(-1,Math.min(1,(dx*Math.cos(yaw)+dz*Math.sin(yaw))/Math.max(1,distance)));
  if(source.id==='washer')result.washer={level,pan};
  else{const weight=level*(source.id==='tap'?.65:1);waterWeight+=weight;waterPan+=pan*weight;}
 }
 result.water={level:clamp(waterWeight),pan:waterWeight?waterPan/waterWeight:0};return result;
}
