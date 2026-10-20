import {bridgeHeight,onBridge,worldDrivable,worldWalkable} from './world-rules.js';
const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
export function sampleRoadSurface(x,z,heading=0,wetness=0){
 const wet=clamp(Number(wetness)||0,0,1),road=worldDrivable(x,z),surface=road?'asphalt':worldWalkable(x,z)?'paving':'boundary';
 const elevation=(px,pz)=>onBridge(px,pz)?bridgeHeight(pz):.06,dx=Math.sin(heading)*.7,dz=Math.cos(heading)*.7;
 return {kind:surface,grip:road?1-wet*.31:.78-wet*.15,rollingResistance:road?1:1.8,grade:(elevation(x+dx,z+dz)-elevation(x-dx,z-dz))/1.4,wetness:wet};
}
