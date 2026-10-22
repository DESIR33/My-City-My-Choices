import {COMMUNITY_HOMES,communityPoint} from './world-rules.js';
import {MODEL_HOME} from './house-rules.js';

// Address labels and destinations derive from the same immutable lot data as
// the plaques. Use the spare driveway bay, leaving parked cars and walks clear.
export const COMMUNITY_ADDRESSES=Object.freeze(COMMUNITY_HOMES.map(home=>{
  const furnished=home.id===MODEL_HOME.id;
  const entry=furnished?MODEL_HOME.entry:communityPoint(home,home.w*.2,home.d/2+2.88);
  const parking=communityPoint(home,-home.w*.23+1.55,home.d/2+4.2);
  return Object.freeze({id:home.id,address:`${home.address} ${home.street}`,street:home.street,furnished,
    destination:Object.freeze({name:`${home.address} ${home.street}`,...entry,parking:Object.freeze(parking)})});
}));
export const COMMUNITY_DESTINATIONS=Object.freeze(Object.fromEntries(COMMUNITY_ADDRESSES.map(home=>[home.id,home.destination])));
