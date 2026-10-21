export const MODEL_HOME=Object.freeze({id:'maple-grove-1',address:'101 Maple Grove Lane',name:'The Maple House',x:-272,z:-204,w:13.4,d:11.8,ground:.3,upper:3.45,ceiling:6.45,
 stairs:Object.freeze({minX:4.05,maxX:5.85,minZ:-2.9,maxZ:3.4,steps:18}),entry:Object.freeze({x:-269.32,z:-196.5}),parking:Object.freeze({x:-275.08,z:-191.7})});
export const HOUSE_FLAGS=Object.freeze(['front','rear','garage','bedroom1','bedroom2','bathroom','lights0','lights1','tv','fridge','oven','tap','shower','washer','cabinet','desk','bed1','bed2','curtains']);
export function freshHouse(){return {version:1,propertyId:MODEL_HOME.id,...Object.fromEntries(HOUSE_FLAGS.map(key=>[key,['lights0','lights1','bed1','bed2','curtains'].includes(key)])),channel:0};}
export function restoreHouse(value){const state=freshHouse();if(value?.propertyId!==MODEL_HOME.id)return state;for(const key of HOUSE_FLAGS)if(typeof value[key]==='boolean')state[key]=value[key];state.channel=Number.isInteger(value.channel)?Math.max(0,Math.min(2,value.channel)):0;return state;}
export function houseLocal(p){return {x:p.x-MODEL_HOME.x,z:p.z-MODEL_HOME.z};}
export function houseInside(p,margin=0){const q=houseLocal(p);return Math.abs(q.x)<MODEL_HOME.w/2-margin&&Math.abs(q.z)<MODEL_HOME.d/2-margin;}
export function onHouseStairs(p){const q=houseLocal(p),s=MODEL_HOME.stairs;return q.x>=s.minX&&q.x<=s.maxX&&q.z>=s.minZ&&q.z<=s.maxZ;}
export function houseFloorAt(x,z,referenceY=0){const p={x,z};if(!houseInside(p,-.12))return null;const q=houseLocal(p),s=MODEL_HOME.stairs;
 if(onHouseStairs(p)){const step=Math.max(0,Math.min(s.steps,Math.ceil((s.maxZ-q.z)/(s.maxZ-s.minZ)*s.steps-1e-8)));return MODEL_HOME.ground+(MODEL_HOME.upper-MODEL_HOME.ground)*step/s.steps;}
 return referenceY>MODEL_HOME.upper-.65?MODEL_HOME.upper:MODEL_HOME.ground;
}
export function houseObstacleBlocks(o,x,z,y=.3){if(o.vehicleOnly)return false;if(o.houseId&&(o.maxY<=y+.08||o.minY>=y+1.55))return false;return x>o.minX-.42&&x<o.maxX+.42&&z>o.minZ-.42&&z<o.maxZ+.42;}
