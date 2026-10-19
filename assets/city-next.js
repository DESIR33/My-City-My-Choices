// Places and money rules for the next Maple Street chapter. Prices are cents.
export const SCHOOL = Object.freeze({x:24,z:-36,w:16,d:12,entry:{x:24,z:-29.2},desk:{x:24,z:-39}});
export const GROCERY = Object.freeze({x:44,z:-18,w:14,d:12,entry:{x:44,z:-11.2},counter:{x:44,z:-21.2}});
export const GROCERY_AISLE = Object.freeze([
  Object.freeze({id:'bread',name:'Loaf of bread',description:'A fresh loaf for the week.',price:100,essential:true}),
  Object.freeze({id:'milk',name:'Carton of milk',description:'Cold milk from the cooler.',price:125,essential:true}),
  Object.freeze({id:'apples',name:'Bag of apples',description:'A small bag of apples.',price:150,essential:true}),
  Object.freeze({id:'cereal',name:'Box of cereal',description:'A breakfast box.',price:200,essential:false}),
  Object.freeze({id:'juice',name:'Bottle of juice',description:'A bottle to share later.',price:175,essential:false}),
  Object.freeze({id:'snacks',name:'Snack pack',description:'A treat, not a meal.',price:75,essential:false}),
]);
export const BUS_FARE = 100;
export const BUS_STOPS = Object.freeze({
  maple:Object.freeze({id:'maple',name:'Maple Street bus stop',x:12,z:-148,to:'northstar'}),
  northstar:Object.freeze({id:'northstar',name:'Northstar bus stop',x:14,z:-1140,to:'maple'}),
});
export const NORTH_BLOCK = Object.freeze({
  x:0,z:-1167,w:20,d:14,
  entry:{x:0,z:-1158.2},
  lobby:{x:7.4,z:-1162.4},
  restaurant:{x:-6,z:-1170.2},
  office:{x:6,z:-1170.2},
});
export const NORTH_MENU = Object.freeze([
  Object.freeze({id:'soup',name:'Tomato soup',description:'A warm bowl at the River Table.',price:150}),
  Object.freeze({id:'salad',name:'Garden salad',description:'Greens and fruit.',price:200}),
  Object.freeze({id:'pasta',name:'Pasta plate',description:'A full plate for a city afternoon.',price:350}),
]);
export const ROOM_RATE = 4500;
export const ERRAND_PAY = 200;

const wall = 0.3;
export function shellObstacles(place, gap = 2.4) {
  const {x,z,w,d} = place, front = z + d / 2, back = z - d / 2, west = x - w / 2, east = x + w / 2;
  const slab = (minX,maxX,minZ,maxZ) => ({minX,maxX,minZ,maxZ});
  return [
    slab(west - wall / 2, west + wall / 2, back, front),
    slab(east - wall / 2, east + wall / 2, back, front),
    slab(west, east, back - wall / 2, back + wall / 2),
    slab(west, x - gap / 2, front - wall / 2, front + wall / 2),
    slab(x + gap / 2, east, front - wall / 2, front + wall / 2),
  ];
}
export function groceryObstacles() {
  const {x,z} = GROCERY;
  return [
    ...shellObstacles(GROCERY),
    {minX:x - 5.4, maxX:x - 1.7, minZ:z - 1.6, maxZ:z + 1.4},
    {minX:x + 1.7, maxX:x + 5.4, minZ:z - 1.6, maxZ:z + 1.4},
    {minX:x - 2.4, maxX:x + 2.4, minZ:z - 5.5, maxZ:z - 4.5},
  ];
}
export function northBlockObstacles() {
  const {x,w} = NORTH_BLOCK, west = x - w / 2, east = x + w / 2, divider = -1168;
  const gaps = [-6, 6];
  const segments = [];
  let cursor = west;
  for (const gap of gaps) {
    segments.push({minX:cursor, maxX:gap - 1.15, minZ:divider - wall / 2, maxZ:divider + wall / 2});
    cursor = gap + 1.15;
  }
  segments.push({minX:cursor, maxX:east, minZ:divider - wall / 2, maxZ:divider + wall / 2});
  return [
    ...shellObstacles(NORTH_BLOCK),
    ...segments,
    {minX:-8.2, maxX:-3.8, minZ:-1172.4, maxZ:-1171.4},
    {minX:3.8, maxX:8.2, minZ:-1172.4, maxZ:-1171.4},
    {minX:6.6, maxX:9.2, minZ:-1164.4, maxZ:-1163.3},
  ];
}
export function pointBlocked(obstacles, x, z, pad = 0.5) {
  return obstacles.some(o => x > o.minX - pad && x < o.maxX + pad && z > o.minZ - pad && z < o.maxZ + pad);
}
export function insideSchool(p) {return !!p && p.x > 16.4 && p.x < 31.6 && p.z > -41.6 && p.z < -30.2;}
export function insideGrocery(p) {return !!p && p.x > 37.4 && p.x < 50.6 && p.z > -23.6 && p.z < -12.2;}
export function insideNorthBlock(p) {return !!p && p.x > -9.6 && p.x < 9.6 && p.z > -1173.6 && p.z < -1160.3;}
export function northRoom(p) {
  if (!insideNorthBlock(p)) return null;
  if (p.z > -1168) return 'lobby';
  return p.x < 0 ? 'restaurant' : 'office';
}

export function schoolLessonFor(day) {
  const safe = Number.isSafeInteger(day) && day > 0 ? day : 1;
  const kind = ['price', 'contract', 'timetable'][(safe - 1) % 3];
  if (kind === 'price') return {day:safe, kind, discount:25, title:'Read a price', text:'Each grocery item is 25¢ off for the rest of today. Tomorrow the tags go back to full price.'};
  if (kind === 'contract') return {day:safe, kind, title:'Read a contract', text:'The contract says purchases come from wallet cash. Goal savings stay where they are unless you move them.'};
  return {day:safe, kind, fare:BUS_FARE, title:'Read a bus timetable', text:'The city bus costs $1.00 each way between Maple Street and Northstar. If the wallet cannot pay the fare, you walk.'};
}
export function groceryUnitPrice(item, lesson) {
  const discount = lesson && lesson.kind === 'price' && lesson.day ? lesson.discount || 0 : 0;
  return Math.max(25, item.price - discount);
}
export function fitGroceryBag(ids, walletCents, lesson) {
  const unique = [];
  for (const id of ids || []) {
    const item = GROCERY_AISLE.find(entry => entry.id === id);
    if (!item || unique.some(entry => entry.id === id)) continue;
    unique.push({id:item.id, name:item.name, essential:item.essential, price:groceryUnitPrice(item, lesson)});
  }
  const kept = [...unique];
  const dropped = [];
  const total = () => kept.reduce((sum, item) => sum + item.price, 0);
  const queue = [...unique].sort((a, b) => (a.essential ? 1 : 0) - (b.essential ? 1 : 0) || b.price - a.price);
  for (const item of queue) {
    if (!Number.isSafeInteger(walletCents) || total() <= walletCents) break;
    const index = kept.findIndex(entry => entry.id === item.id);
    if (index >= 0) dropped.push(kept.splice(index, 1)[0]);
  }
  const spent = total();
  const ok = kept.length > 0 && Number.isSafeInteger(walletCents) && spent <= walletCents;
  return {ok, kept, dropped, spent:ok ? spent : 0, wallet:ok ? walletCents - spent : walletCents, smaller:ok && dropped.length > 0};
}

export function busTripMetres() {
  const a = BUS_STOPS.maple, b = BUS_STOPS.northstar;
  return Math.hypot(a.x - b.x, a.z - b.z);
}
export function busFareQuote({walletCents = 0, fuelLitres = 0, burnPerMetre = 0, fuelPackPrice = 0, packSize = 2, hasOwnCar = false} = {}) {
  const metres = busTripMetres();
  const litres = hasOwnCar && burnPerMetre > 0 ? metres * burnPerMetre : 0;
  const pack = packSize > 0 ? packSize : 2;
  const fuelCostCents = hasOwnCar ? Math.round(litres * (fuelPackPrice / pack)) : 0;
  const canRide = Number.isSafeInteger(walletCents) && walletCents >= BUS_FARE;
  const canDrive = hasOwnCar && fuelLitres + 1e-8 >= litres && litres > 0;
  const cheaper = !hasOwnCar ? 'walk' : fuelCostCents < BUS_FARE ? 'drive' : fuelCostCents > BUS_FARE ? 'bus' : 'either';
  return {fare:BUS_FARE, metres, litres, fuelCostCents, canRide, canDrive, cheaper, hasOwnCar};
}
export function rideBus(walletCents, fromId) {
  const from = BUS_STOPS[fromId];
  if (!from) return {ok:false, wallet:walletCents, reason:'Stand at a city bus stop.'};
  if (!Number.isSafeInteger(walletCents) || walletCents < BUS_FARE) return {ok:false, wallet:walletCents, fare:BUS_FARE, reason:'The fare is $1.00 from wallet cash. Without it, you walk.'};
  return {ok:true, wallet:walletCents - BUS_FARE, fare:BUS_FARE, to:BUS_STOPS[from.to]};
}

export function askAboutRoom() {
  return {rate:ROOM_RATE, text:'A room in this block is $45.00 a night. This visit is only a look, so nothing is charged and goal savings stay put.'};
}
export function buyNorthMeal(walletCents, id) {
  const item = NORTH_MENU.find(entry => entry.id === id);
  if (!item) return {ok:false, wallet:walletCents, reason:'That dish is not on the menu.'};
  if (!Number.isSafeInteger(walletCents) || walletCents < item.price) return {ok:false, wallet:walletCents, item, reason:'The kitchen needs wallet cash before it can cook. Goal savings stay separate.'};
  return {ok:true, wallet:walletCents - item.price, item};
}
export function takeParcel(parcel, day) {
  if (parcel?.status === 'carrying') return {ok:false, parcel, reason:'You are already carrying the office parcel.'};
  if (parcel?.status === 'delivered' && parcel.day === day) return {ok:false, parcel, reason:'The office already has today’s parcel.'};
  return {ok:true, parcel:{status:'carrying', day}};
}
export function dropParcel(parcel, day) {
  if (!parcel || parcel.status !== 'carrying') return {ok:false, parcel, reason:'Pick up the parcel from the lobby desk first.'};
  return {ok:true, parcel:{status:'delivered', day:Number.isSafeInteger(day) ? day : parcel.day}};
}

export function errandDestination(day) {
  return Number.isSafeInteger(day) && day % 2 === 0 ? 'bakery' : 'market';
}
export function freshErrand() {return {status:'none', day:null, place:null};}
export function pickupErrand({errand, day, jobStamp, stage}) {
  if (stage !== 'done') return {ok:false, errand:errand || freshErrand(), reason:'Sam posts the list after you finish a business day.'};
  if (jobStamp === 'after-' + day) return {ok:false, errand, reason:'You already finished today’s errand.'};
  if (errand?.status === 'carrying' && errand.day === day) return {ok:false, errand, reason:'You already have today’s list. Carry it to the ' + (errand.place === 'bakery' ? 'Maple Bakery' : 'Saturday Market') + '.'};
  const place = errandDestination(day);
  return {ok:true, errand:{status:'carrying', day, place}};
}
export function deliverErrand({errand, place, day, jobStamp, stage}) {
  const unchanged = reason => ({ok:false, pay:0, errand, jobStamp, reason});
  if (stage !== 'done') return unchanged('The errand pays after a finished business day.');
  if (jobStamp === 'after-' + day) return unchanged('Today’s errand is already paid.');
  if (!errand || errand.status !== 'carrying' || errand.day !== day) return unchanged('Pick up Sam’s list at Maple Motors first.');
  if (place !== errand.place) return unchanged(errand.place === 'bakery' ? 'This list goes to Maple Bakery.' : 'This list goes to the Saturday Market.');
  return {ok:true, pay:ERRAND_PAY, errand:{status:'done', day, place}, jobStamp:'after-' + day};
}

export function cityAtmosphere({stage, eventId, eventName} = {}) {
  const rain = eventId === 'rain' || eventName === 'Rain in the forecast';
  const evening = stage === 'done';
  return {
    rain,
    evening,
    walkScale:rain ? 0.82 : 1,
    marketOpen:stage === 'customers',
    cafeBusy:rain,
    wetRoads:rain,
    windowGlow:evening ? 0.9 : 0,
    sunScale:evening ? 0.18 : rain ? 0.45 : 1,
    headlight:evening ? 2.4 : rain ? 1.15 : 0.2,
  };
}

function cleanNote(note) {
  if (!note || !Number.isSafeInteger(note.day) || note.day < 1) return null;
  const fresh = schoolLessonFor(note.day);
  return fresh.kind === note.kind ? fresh : null;
}
function cleanParcel(parcel) {
  if (!parcel || !['carrying', 'delivered', 'none'].includes(parcel.status)) return {status:'none', day:null};
  if (parcel.status === 'none') return {status:'none', day:null};
  return {status:parcel.status, day:Number.isSafeInteger(parcel.day) ? parcel.day : null};
}
export function freshCityNext() {
  return {version:1, schoolNote:null, groceryBasket:[], groceryReceipts:[], grocerySpent:0, errand:freshErrand(), busRides:0, parcel:{status:'none', day:null}, northMeals:[]};
}
export function restoreCityNext(saved) {
  const next = freshCityNext();
  if (!saved || typeof saved !== 'object') return next;
  next.schoolNote = cleanNote(saved.schoolNote);
  next.groceryBasket = Array.isArray(saved.groceryBasket) ? saved.groceryBasket.filter(id => GROCERY_AISLE.some(item => item.id === id)).slice(0, GROCERY_AISLE.length) : [];
  next.groceryReceipts = Array.isArray(saved.groceryReceipts) ? saved.groceryReceipts.filter(row => row && GROCERY_AISLE.some(item => item.id === row.id) && Number.isSafeInteger(row.price) && row.price > 0).slice(-30) : [];
  next.grocerySpent = Number.isSafeInteger(saved.grocerySpent) && saved.grocerySpent >= 0 ? saved.grocerySpent : 0;
  const errand = saved.errand;
  if (errand && errand.status === 'carrying' && Number.isSafeInteger(errand.day) && ['bakery', 'market'].includes(errand.place)) next.errand = {status:'carrying', day:errand.day, place:errand.place};
  else if (errand && errand.status === 'done' && Number.isSafeInteger(errand.day)) next.errand = {status:'done', day:errand.day, place:['bakery', 'market'].includes(errand.place) ? errand.place : null};
  next.busRides = Number.isSafeInteger(saved.busRides) && saved.busRides >= 0 ? Math.min(saved.busRides, 100000) : 0;
  next.parcel = cleanParcel(saved.parcel);
  next.northMeals = Array.isArray(saved.northMeals) ? saved.northMeals.filter(row => row && NORTH_MENU.some(item => item.id === row.id) && Number.isSafeInteger(row.price)).slice(-30) : [];
  return next;
}
export function toggleGroceryItem(state, id) {
  if (!GROCERY_AISLE.some(item => item.id === id)) return state;
  const basket = state.groceryBasket.includes(id) ? state.groceryBasket.filter(entry => entry !== id) : [...state.groceryBasket, id];
  return {...state, groceryBasket:basket};
}
export function checkoutGrocery(state, walletCents, lesson, day = 1) {
  const fit = fitGroceryBag(state.groceryBasket, walletCents, lesson);
  if (!fit.ok) return {ok:false, state, wallet:walletCents, fit, reason:'The basket is empty, or the wallet cannot hold even the smallest bag.'};
  const receipts = fit.kept.map(item => ({id:item.id, name:item.name, price:item.price, day}));
  return {ok:true, fit, wallet:fit.wallet, state:{...state, groceryBasket:[], grocerySpent:state.grocerySpent + fit.spent, groceryReceipts:[...state.groceryReceipts, ...receipts].slice(-30)}};
}
