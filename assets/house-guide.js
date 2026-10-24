import {MODEL_HOME as H,houseInside,houseLocal,onHouseStairs} from './house-rules.js';

export const HOUSE_ROOMS=Object.freeze([
 {id:'living',name:'Living room',floor:0,x:-3.6,z:-2.7,items:['sofa','tv']},
 {id:'kitchen',name:'Kitchen',floor:0,x:1.4,z:-4.6,items:['oven','tap','cabinet','fridge']},
 {id:'dining',name:'Dining area',floor:0,x:1.5,z:.4,items:['dining-front','dining-back','dining-side']},
 {id:'utility',name:'Utility room',floor:0,x:-3.8,z:3.5,door:'garage',doorName:'utility room',items:['washer','workbench','supplies']},
 {id:'foyer',name:'Entrance hall',floor:0,x:1.7,z:4.4,items:['lights0','home-plans']},
 {id:'main',name:'Main bedroom',floor:1,x:-3.7,z:3.5,door:'bedroom1',doorName:'main bedroom',items:['bed1','wardrobe','curtains']},
 {id:'second',name:'Second bedroom',floor:1,x:-3.7,z:-3.5,door:'bedroom2',doorName:'second bedroom',items:['bed2','books']},
 {id:'bath',name:'Bathroom',floor:1,x:.8,z:-4.4,door:'bathroom',doorName:'bathroom',items:['bath-sink','shower','toilet']},
 {id:'landing',name:'Landing & study',floor:1,x:1.6,z:3.6,items:['desk-chair','desk','lights1']}
].map(room=>Object.freeze({...room,items:Object.freeze(room.items)})));
const names={sofa:'Sofa',tv:'TV',oven:'Oven',tap:'Kitchen tap',cabinet:'Kitchen drawers',fridge:'Refrigerator','dining-front':'Front dining chair','dining-back':'Back dining chair','dining-side':'Side dining chair',washer:'Washing machine',workbench:'Tool kit',supplies:'Laundry & storage',bed1:'Main bed',bed2:'Second bed',wardrobe:'Wardrobe',books:'Bedside books','desk-chair':'Study chair',desk:'Study lamp','bath-sink':'Bathroom basin',shower:'Shower',toilet:'Toilet',curtains:'Bedroom curtains',lights0:'Downstairs lights',lights1:'Upstairs lights','home-plans':'Home keys & daily review'};
export const houseGuideFloor=p=>(p?.y||0)>H.upper-.65?1:0;
export function houseGuideEntries(home){return (home?.actions||[]).filter(a=>a.kind!=='door'&&a.kind!=='garageDoor').map(a=>({id:a.id,name:names[a.id]||a.title,floor:a.floor,x:a.x,y:a.y,z:a.z,room:HOUSE_ROOMS.find(r=>r.items.includes(a.id))}));}
export function restoreHouseGuide(value,home){const targetId=typeof value?.targetId==='string'&&houseGuideEntries(home).some(a=>a.id===value.targetId)?value.targetId:null;return {targetId};}
export function houseRoomAt(p){
 if(!p||![p.x,p.z,p.y??0].every(Number.isFinite)||!houseInside(p))return null;
 if(onHouseStairs(p))return {id:'stairs',name:'Stairs',floor:houseGuideFloor(p)};
 const q=houseLocal(p),floor=houseGuideFloor(p),id=floor?(q.x<-.6?(q.z>=0?'main':'second'):q.x<2.2&&q.z<-2.4?'bath':'landing'):(q.x<-.8?(q.z>.75?'utility':'living'):q.z<-1.8?'kitchen':q.z<1.9?'dining':'foyer');
 return HOUSE_ROOMS.find(r=>r.id===id);
}
export function houseGuideCue(home,state,p,{mobile=false}={}){
 const target=houseGuideEntries(home).find(a=>a.id===state?.targetId);if(!target)return null;
 const current=houseRoomAt(p),floor=target.floor?'Upstairs':'Downstairs';
 if(!current)return {target,inside:false,message:'Enter 101 Maple Grove Lane to find '+target.name};
 let hint;
 if(current.id==='stairs')hint='Continue '+(target.floor?'up':'down')+' the stairs';
 else if(current.door&&current.id!==target.room?.id&&!home.state[current.door])hint='Open the '+current.doorName+' door to leave';
 else if(current.floor!==target.floor)hint='Use the stairs on the east side';
 else if(home.nearby?.(p).some(a=>a.id===target.id))hint=mobile?'Nearby · Tap the action and choose '+target.name:'Nearby · Press E and choose '+target.name;
 else if(target.room?.door&&current.id!==target.room.id&&!home.state[target.room.door])hint='Open the '+target.room.doorName+' door';
 else hint='Find '+target.name+' in the '+(target.room?.name.toLowerCase()||'house');
 return {target,inside:true,message:floor+' · '+(target.room?.name||'House')+' · '+hint};
}
const escape=s=>String(s).replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;');
// Floor plans come from the same live collision boxes and action approaches as
// the 3D house. This is a location guide, not a path through walls or furniture.
export function renderHousePlan(home,p,floor=0,targetId=null){
 floor=floor===1?1:0;const y=floor?H.upper:H.ground,scale=24,px=x=>38+(x-H.x+H.w/2)*scale,pz=z=>38+(z-H.z+H.d/2)*scale;
 const rect=(x,z,w,d,fill)=>`<rect x="${px(x).toFixed(1)}" y="${pz(z).toFixed(1)}" width="${(w*scale).toFixed(1)}" height="${(d*scale).toFixed(1)}" fill="${fill}"/>`;
 let svg='<svg class="housePlan" viewBox="0 0 400 365" role="img" aria-label="'+(floor?'Upstairs':'Downstairs')+' plan of '+H.address+'"><title>'+(floor?'Upstairs':'Downstairs')+' house plan</title><desc>North is the backyard. Gray shapes show walls and furniture. Striped stairs are on the east side. Gold marks your position and teal marks your selected object. Walk using normal controls and open doors as needed.</desc><defs><pattern id="houseStairHatch" width="7" height="7" patternUnits="userSpaceOnUse"><path d="M0 0H7" stroke="#d1b77b" stroke-width="2"/></pattern></defs>';
 svg+=rect(H.x-H.w/2,H.z-H.d/2,H.w,H.d,'#33473f');
 const doorIds=new Set(home.doors.map(d=>d.id));
 for(const box of home.colliders){if(box.maxY<=y+.08||box.minY>=y+1.55||doorIds.has(box.fixtureId))continue;svg+=rect(box.minX,box.minZ,box.maxX-box.minX,box.maxZ-box.minZ,box.fixtureId==='wall'?'#ded5bb':box.fixtureId==='window'?'#94bfc1':'#66776b');}
 const s=H.stairs;svg+=rect(H.x+s.minX,H.z+s.minZ,s.maxX-s.minX,s.maxZ-s.minZ,'url(#houseStairHatch)');
 for(const room of HOUSE_ROOMS.filter(r=>r.floor===floor))svg+='<text x="'+px(H.x+room.x)+'" y="'+pz(H.z+room.z)+'" text-anchor="middle" fill="#fff0cf" font-size="13" font-weight="600" stroke="#20332b" stroke-width="3" paint-order="stroke">'+escape(room.name)+'</text>';
 svg+='<text x="'+px(H.x+4.95)+'" y="'+pz(H.z+.3)+'" text-anchor="middle" fill="#fff0cf" font-size="9" stroke="#20332b" stroke-width="3" paint-order="stroke">STAIRS</text>';
 for(const door of home.doors.filter(d=>Math.abs(d.y-y)<.1)){svg+=rect(door.collider.minX,door.collider.minZ,Math.max(.07,door.collider.maxX-door.collider.minX),Math.max(.07,door.collider.maxZ-door.collider.minZ),home.state[door.id]?'#7ecdb3':'#e2bb70');}
 const target=houseGuideEntries(home).find(a=>a.id===targetId&&a.floor===floor);
 if(target)svg+='<circle cx="'+px(target.x)+'" cy="'+pz(target.z)+'" r="8" fill="#67e5cf" stroke="#173b32" stroke-width="2"/><text x="'+px(target.x)+'" y="'+(pz(target.z)+3.5)+'" text-anchor="middle" fill="#173b32" font-size="10" font-weight="800">★</text>';
 if(houseRoomAt(p)&&houseGuideFloor(p)===floor)svg+='<circle cx="'+px(p.x)+'" cy="'+pz(p.z)+'" r="4" fill="#ffd56c" stroke="#172f25" stroke-width="2"/>';
 return svg+'<text x="200" y="20" text-anchor="middle" fill="#e8d6ae" font-size="11">BACKYARD · NORTH ↑</text><text x="200" y="348" text-anchor="middle" fill="#e8d6ae" font-size="11">FRONT OF HOUSE · SOUTH</text></svg>';
}
