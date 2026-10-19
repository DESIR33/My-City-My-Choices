export const CAFE_MENU = Object.freeze([
  {id:'fruit',name:'Fresh fruit bowl',description:'Apple, berries, and orange slices.',price:75},
  {id:'juice',name:'Orange juice',description:'A small glass of orange juice.',price:125},
  {id:'sandwich',name:'Grilled cheese sandwich',description:'Warm bread and melted cheese.',price:200},
  {id:'cocoa',name:'Hot chocolate',description:'A warm cup of cocoa.',price:150},
]);
export const CAFE = Object.freeze({x:-30,z:-34,entry:{x:-30,z:-25},counter:{x:-25,z:-38}});
export const FIRE_STATION = Object.freeze({x:150,z:-90,entry:{x:137,z:-90}});
export const freshCityLife = () => ({cafeReceipts:[],cafeSpent:0,disabledVehicles:[],incidents:[]});
export function restoreCityLife(saved) {
  const s=freshCityLife();if(!saved||typeof saved!=='object')return s;
  s.cafeReceipts=Array.isArray(saved.cafeReceipts)?saved.cafeReceipts.slice(-30).filter(r=>CAFE_MENU.some(m=>m.id===r.id)&&Number.isSafeInteger(r.price)&&r.price>0):[];
  s.cafeSpent=Number.isSafeInteger(saved.cafeSpent)&&saved.cafeSpent>=0?saved.cafeSpent:0;
  s.disabledVehicles=Array.isArray(saved.disabledVehicles)?saved.disabledVehicles.filter(v=>typeof v.id==='string'&&Number.isFinite(v.x)&&Number.isFinite(v.z)&&Number.isFinite(v.heading)).slice(0,30):[];
  s.incidents=Array.isArray(saved.incidents)?saved.incidents.filter(i=>typeof i.vehicleId==='string'&&Number.isFinite(i.x)&&Number.isFinite(i.z)).slice(-20):[];
  return s;
}
export function buyCafeOrder(state,wallet,id,day=1){
  const item=CAFE_MENU.find(m=>m.id===id);
  if(!item||!Number.isSafeInteger(wallet)||wallet<item.price)return {ok:false,state,wallet,reason:'You need enough wallet cash before an order can be prepared.'};
  return {ok:true,wallet:wallet-item.price,item,state:{...state,cafeSpent:state.cafeSpent+item.price,cafeReceipts:[...state.cafeReceipts,{id:item.id,name:item.name,price:item.price,day}].slice(-30)}};
}
export function recordCrash(state,vehicle,impactSpeed){
  if(!vehicle?.id||!Number.isFinite(impactSpeed)||impactSpeed<1.2||state.disabledVehicles.some(v=>v.id===vehicle.id))return {ok:false,state};
  const incident={vehicleId:vehicle.id,x:vehicle.x,z:vehicle.z,heading:vehicle.heading,impactSpeed,status:'dispatched'};
  return {ok:true,incident,state:{...state,disabledVehicles:[...state.disabledVehicles,{...vehicle}],incidents:[...state.incidents,incident].slice(-20)}};
}
export function repairCrash(state,wallet,id){
  if(wallet<75||!state.disabledVehicles.some(v=>v.id===id))return {ok:false,state,wallet};
  return {ok:true,wallet:wallet-75,state:{...state,disabledVehicles:state.disabledVehicles.filter(v=>v.id!==id),incidents:state.incidents.map(i=>i.vehicleId===id?{...i,status:'recovered'}:i)}};
}
// A responder travels through the station driveway and along the city road grid.
export function policeResponseRoute(start,target,streets=[-120,-60,0,60,120]){
  const nearest=v=>streets.reduce((a,b)=>Math.abs(b-v)<Math.abs(a-v)?b:a);
  const vx=nearest(target.x),hz=nearest(target.z),vertical=Math.abs(vx-target.x)<=Math.abs(hz-target.z);
  const points=[{x:start.x,z:start.z},{x:130,z:start.z},{x:130,z:-30},{x:120,z:-30}];
  if(vertical){const cross=nearest(target.z);points.push({x:120,z:cross},{x:vx,z:cross},{x:vx,z:target.z+(target.z>cross?-8:8)});}
  else points.push({x:120,z:hz},{x:target.x+(target.x<120?8:-8),z:hz});
  return points.filter((p,i)=>!i||Math.hypot(p.x-points[i-1].x,p.z-points[i-1].z)>.05);
}
export function advanceResponse(response,dt,canMove=()=>true){
  if(response.index>=response.path.length)return {arrived:true,distance:0};
  const point=response.path[response.index],dx=point.x-response.x,dz=point.z-response.z,distance=Math.hypot(dx,dz),step=Math.min(distance,Math.max(0,dt)*6);
  if(distance<.05){response.index++;return {arrived:response.index>=response.path.length,distance:0};}
  const heading=Math.atan2(dx,dz),x=response.x+dx/distance*step,z=response.z+dz/distance*step;
  if(!canMove(x,z,heading))return {arrived:false,distance:0};
  response.x=x;response.z=z;response.heading=heading;
  if(step>=distance-.001)response.index++;
  return {arrived:response.index>=response.path.length,distance:step};
}
