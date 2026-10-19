// Fictional story prices, stored in cents. Buying and upkeep never draw from goal savings.
export const CAR_OFFERS = Object.freeze([
  Object.freeze({id:'used',name:'Pre-owned city coupe',price:400,color:0x326d8c,startCondition:65,burnPerMetre:.006,wearPerMetre:.025,fuelPackPrice:50,servicePrice:75,description:'Lower price today; more frequent fuel stops and service.'}),
  Object.freeze({id:'refreshed',name:'Refreshed city coupe',price:600,color:0xa65332,startCondition:100,burnPerMetre:.0045,wearPerMetre:.015,fuelPackPrice:40,servicePrice:50,description:'Costs more now; a more efficient engine and a fresh service.'})
]);
export const TANK_CAPACITY=8, FUEL_PACK=2;
const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
export const offerFor=id=>CAR_OFFERS.find(o=>o.id===id);
export function freshCarOwnership(){return {version:1,offerId:null,fuel:0,condition:100,metres:0,purchaseSpent:0,fuelSpent:0,serviceSpent:0,visited:false,choice:null,pose:null};}
export function restoreCarOwnership(saved){
  const fresh=freshCarOwnership();if(!saved||typeof saved!=='object')return fresh;
  const offer=offerFor(saved.offerId);fresh.visited=!!saved.visited;fresh.choice=['borrow','buy'].includes(saved.choice)?saved.choice:null;
  if(!offer)return fresh;
  const safe=(n,fall,max=1e9)=>Number.isFinite(n)?clamp(n,0,max):fall;
  return {...fresh,offerId:offer.id,choice:'buy',fuel:safe(saved.fuel,TANK_CAPACITY,TANK_CAPACITY),condition:safe(saved.condition,offer.startCondition,100),metres:safe(saved.metres,0),purchaseSpent:Math.round(safe(saved.purchaseSpent,offer.price)),fuelSpent:Math.round(safe(saved.fuelSpent,0)),serviceSpent:Math.round(safe(saved.serviceSpent,0)),pose:saved.pose&&['x','z','heading'].every(k=>Number.isFinite(saved.pose[k]))&&Math.abs(saved.pose.x)<253&&saved.pose.z>-1811&&saved.pose.z<2090?{x:saved.pose.x,z:saved.pose.z,heading:saved.pose.heading}:null};
}
export function carBudget(offerId,walletCents){
  const offer=offerFor(offerId);if(!offer)return null;
  const nextTank=offer.fuelPackPrice*TANK_CAPACITY/FUEL_PACK;
  return {price:offer.price,nextTank,service:offer.servicePrice,total:offer.price+nextTank+offer.servicePrice,cashAfter:walletCents-offer.price};
}
export function fuelQuote(car){const o=offerFor(car.offerId);if(!o)return null;const units=Math.min(FUEL_PACK,Math.max(0,TANK_CAPACITY-car.fuel));return {units,cost:Math.max(0,Math.ceil(units/FUEL_PACK*o.fuelPackPrice-1e-8))};}
export function transactCar(car,walletCents,action,offerId){
  const unchanged=reason=>({ok:false,reason,car,walletCents,cost:0});
  if(!Number.isSafeInteger(walletCents)||walletCents<0)return unchanged('Invalid wallet balance.');
  let cost=0,next={...car};
  if(action==='buy'){
    const offer=offerFor(offerId);if(!offer)return unchanged('Choose a car first.');if(car.offerId)return unchanged('You already own a car.');
    cost=offer.price;next={...freshCarOwnership(),offerId:offer.id,fuel:TANK_CAPACITY,condition:offer.startCondition,purchaseSpent:cost,visited:true,choice:'buy'};
  }else if(action==='fuel'){
    const quote=fuelQuote(car);if(!quote)return unchanged('You need your own car first.');if(quote.units<.001)return unchanged('Your tank is already full.');
    cost=quote.cost;next.fuel=Math.min(TANK_CAPACITY,car.fuel+quote.units);next.fuelSpent+=cost;
  }else if(action==='service'){
    const offer=offerFor(car.offerId);if(!offer)return unchanged('You need your own car first.');if(car.condition>=99.99)return unchanged('Your car does not need service yet.');
    cost=offer.servicePrice;next.condition=100;next.serviceSpent+=cost;
  }else return unchanged('Unknown purchase.');
  if(walletCents<cost)return unchanged('That costs more than the cash in your wallet.');
  return {ok:true,car:next,walletCents:walletCents-cost,cost};
}
export function useOwnedCar(car,distance,hardDriving=false){
  const offer=offerFor(car.offerId);if(!offer||!Number.isFinite(distance)||distance<=0)return {car,lowFuel:false,empty:false,serviceDue:false};
  const factor=hardDriving?1.5:1,fuel=Math.max(0,car.fuel-distance*offer.burnPerMetre*factor),condition=Math.max(0,car.condition-distance*offer.wearPerMetre*factor);
  return {car:{...car,fuel,condition,metres:car.metres+distance},lowFuel:car.fuel>2&&fuel<=2,empty:car.fuel>0&&fuel===0,serviceDue:car.condition>30&&condition<=30};
}
