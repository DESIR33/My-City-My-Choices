export const CAFE_MENU = Object.freeze([
  {id:'coffee',name:'Fresh brewed coffee',description:'Ground, brewed, and poured by our cashier.',price:100},
  {id:'espresso',name:'Espresso',description:'A freshly pulled espresso shot.',price:125},
  {id:'latte',name:'Cafe latte',description:'Espresso with freshly steamed milk.',price:175},
  {id:'fruit',name:'Fresh fruit bowl',description:'Apple, berries, and orange slices.',price:75},
  {id:'juice',name:'Orange juice',description:'A small glass of orange juice.',price:125},
  {id:'sandwich',name:'Grilled cheese sandwich',description:'Warm bread and melted cheese.',price:200},
  {id:'cocoa',name:'Hot chocolate',description:'A warm cup of cocoa.',price:150},
]);
export const BAKERY_MENU=Object.freeze([
  {id:'roll',name:'Warm bread roll',description:'A freshly baked roll from the morning batch.',price:50},
  {id:'croissant',name:'Butter croissant',description:'A flaky pastry baked in our kitchen.',price:125},
  {id:'muffin',name:'Blueberry muffin',description:'A soft muffin with blueberries.',price:150},
  {id:'milk',name:'Cold milk',description:'A small cup to enjoy with your pastry.',price:75},
]);
export const BAKERY=Object.freeze({x:-42,z:-90,entry:{x:-42,z:-78},counter:{x:-38,z:-96}});
export const CAFE = Object.freeze({x:-30,z:-34,entry:{x:-30,z:-25},counter:{x:-25,z:-38}});
export const FIRE_STATION = Object.freeze({x:150,z:-90,entry:{x:137,z:-90}});
export const freshCityLife = () => ({cafeReceipts:[],cafeSpent:0,cafeService:{nextTicket:1,pending:null,till:0,customerSales:0,ledger:[]},bakeryReceipts:[],bakerySpent:0,disabledVehicles:[],incidents:[]});
export function restoreCityLife(saved) {
  const s=freshCityLife();if(!saved||typeof saved!=='object')return s;
  s.cafeReceipts=Array.isArray(saved.cafeReceipts)?saved.cafeReceipts.slice(-30).filter(r=>CAFE_MENU.some(m=>m.id===r.id)&&Number.isSafeInteger(r.price)&&r.price>0):[];
  s.cafeSpent=Number.isSafeInteger(saved.cafeSpent)&&saved.cafeSpent>=0?saved.cafeSpent:0;
  s.bakeryReceipts=Array.isArray(saved.bakeryReceipts)?saved.bakeryReceipts.slice(-30).filter(r=>BAKERY_MENU.some(m=>m.id===r.id)&&Number.isSafeInteger(r.price)&&r.price>0):[];
  s.bakerySpent=Number.isSafeInteger(saved.bakerySpent)&&saved.bakerySpent>=0?saved.bakerySpent:0;
  s.disabledVehicles=Array.isArray(saved.disabledVehicles)?saved.disabledVehicles.filter(v=>typeof v.id==='string'&&Number.isFinite(v.x)&&Number.isFinite(v.z)&&Number.isFinite(v.heading)).slice(0,30):[];
  s.incidents=Array.isArray(saved.incidents)?saved.incidents.filter(i=>typeof i.vehicleId==='string'&&Number.isFinite(i.x)&&Number.isFinite(i.z)).slice(-20):[];
  const service=saved.cafeService;
  if(service&&typeof service==='object'){
    const n=v=>Number.isSafeInteger(v)&&v>=0?v:0;
    s.cafeService={nextTicket:Math.max(1,n(service.nextTicket)),pending:null,till:n(service.till),customerSales:n(service.customerSales),ledger:Array.isArray(service.ledger)?service.ledger.filter(r=>Number.isSafeInteger(r.price)&&r.price>0).slice(-30):[]};
    const held=service.held;if(held&&CAFE_MENU.some(m=>m.id===held.id)&&Number.isFinite(held.remaining)&&held.remaining>0)s.cafeService.held={id:held.id,remaining:Math.min(35,held.remaining)};
    const p=service.pending;
    if(p&&CAFE_MENU.some(m=>m.id===p.id)&&Number.isSafeInteger(p.ticket)&&['queued','preparing','ready'].includes(p.status))s.cafeService.pending={ticket:p.ticket,id:p.id,status:p.status,remaining:Number.isFinite(p.remaining)?Math.max(0,Math.min(12,p.remaining)):6};
  }
  return s;
}
// Every price and ledger amount is an integer number of cents.
export function buyCafeOrder(state,wallet,id,day=1){
  const item=CAFE_MENU.find(m=>m.id===id),service=state.cafeService||freshCityLife().cafeService;
  if(service.pending)return {ok:false,state,wallet,reason:'Collect your paid order before ordering again.'};
  if(!item||!Number.isSafeInteger(wallet)||wallet<item.price)return {ok:false,state,wallet,reason:'You need enough wallet cash before an order can be prepared.'};
  const ticket=service.nextTicket,receipt={ticket,id:item.id,name:item.name,price:item.price,day,collected:false};
  return {ok:true,wallet:wallet-item.price,item,state:{...state,cafeSpent:state.cafeSpent+item.price,cafeReceipts:[...state.cafeReceipts,receipt].slice(-30),cafeService:{...service,nextTicket:ticket+1,till:service.till+item.price,ledger:[...service.ledger,{ticket,id,price:item.price,customer:'player'}].slice(-30),pending:{ticket,id,status:'queued',remaining:id==='latte'?9:6}}}};
}
export function progressCafeOrder(state,dt){
  const p=state.cafeService?.pending;
  if(!p||p.status==='ready'||!Number.isFinite(dt)||dt<=0)return false;
  p.status='preparing';p.remaining=Math.max(0,p.remaining-dt);
  if(p.remaining===0){p.status='ready';return true;}return false;
}
export function collectCafeOrder(state){
  const p=state.cafeService?.pending;if(!p||p.status!=='ready')return {ok:false,state};
  return {ok:true,id:p.id,ticket:p.ticket,state:{...state,cafeReceipts:state.cafeReceipts.map(r=>r.ticket===p.ticket?{...r,collected:true}:r),cafeService:{...state.cafeService,pending:null,held:{id:p.id,remaining:35}}}};
}
export function payCafeCustomer(state,customer,id){
  const item=CAFE_MENU.find(m=>m.id===id),s=state.cafeService;
  if(!s||!item||!Number.isSafeInteger(customer.wallet)||customer.wallet<item.price)return false;
  customer.wallet-=item.price;s.till+=item.price;s.customerSales++;s.ledger.push({ticket:s.nextTicket++,customer:customer.id,id,price:item.price});s.ledger=s.ledger.slice(-30);return true;
}
export function buyBakeryOrder(state,wallet,id,day=1){
  const item=BAKERY_MENU.find(m=>m.id===id);
  if(!item||!Number.isSafeInteger(wallet)||wallet<item.price)return {ok:false,state,wallet,reason:'You need enough wallet cash before an order can be prepared.'};
  return {ok:true,wallet:wallet-item.price,item,state:{...state,bakerySpent:(state.bakerySpent||0)+item.price,bakeryReceipts:[...(state.bakeryReceipts||[]),{id:item.id,name:item.name,price:item.price,day}].slice(-30)}};
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
