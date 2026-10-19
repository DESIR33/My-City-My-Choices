// Shared, metre-scale world layout. North is negative Z.
export const MAPLE_STREETS=Object.freeze([-120,-60,0,60,120]);
export const NORTH_CITY=Object.freeze({name:'Northstar City',minX:-252,maxX:252,minZ:-1810,maxZ:-1120,avenues:[-180,-60,60,180],streets:[-1750,-1630,-1510,-1390,-1270,-1150]});
export const NORTH_MOTORS=Object.freeze({x:194,z:-1177});
export const RIVER=Object.freeze({south:-550,north:-770,waterLevel:-1.6});
export const BRIDGE=Object.freeze({south:-490,north:-830,deck:8,roadHalfWidth:7.5,walkHalfWidth:11.1});
export const RIVER_PARK=Object.freeze({minX:-46,maxX:-11,minZ:-400,maxZ:-260});
export const TOWERS=Object.freeze(Array.from({length:15},(_,i)=>({id:'north-tower-'+i,x:[-120,0,120][i%3],z:-1210-Math.floor(i/3)*120,w:34+(i%3)*3,d:36+(i%2)*4,height:[88,126,104,142,96,158,114,186,132,98,148,120,166,110,138][i],use:['Offices','Apartments','Hotel'][i%3],name:['Hudson Exchange','Northstar Residences','Grand River Hotel','Atlas Financial','Parkview Apartments','Meridian House','Foundry Studios','Northstar Tower','Crescent Hotel','Broadway Works','Skyline Homes','Harbor Suites','Union Center','Garden Residences','Crown Plaza'][i]})));
export const CITY_BLOCKS=Object.freeze(TOWERS.flatMap((t,i)=>[-1,1].map((side,j)=>({x:t.x+side*37,z:t.z+30,w:19,d:23,height:12+(i+j)%4*4,use:['Restaurant','Apartments','Bookshop','Office','Deli','Theater'][(i*2+j)%6],name:['RIVER TABLE','PARKSIDE HOMES','NORTHSTAR BOOKS','STUDIO & CO.','BROADWAY DELI','THE LYRIC'][(i*2+j)%6]}))));
export function bridgeHeight(z){if(z>BRIDGE.south||z<BRIDGE.north)return .06;if(z>RIVER.south)return .06+(BRIDGE.south-z)/60*(BRIDGE.deck-.06);if(z<RIVER.north)return .06+(z-BRIDGE.north)/60*(BRIDGE.deck-.06);return BRIDGE.deck;}
export function onBridge(x,z){return Math.abs(x)<=BRIDGE.walkHalfWidth&&z<=BRIDGE.south&&z>=BRIDGE.north;}
export function bridgePitch(x,z,heading){return onBridge(x,z)?Math.atan2(bridgeHeight(z-1)-bridgeHeight(z+1),2)*Math.cos(heading):0;}
export function worldWalkable(x,z){if(!Number.isFinite(x)||!Number.isFinite(z))return false;if(Math.abs(x)<=158&&Math.abs(z)<=158)return true;if(x>=RIVER_PARK.minX&&x<=RIVER_PARK.maxX&&z>=RIVER_PARK.minZ&&z<=RIVER_PARK.maxZ)return true;if(z<=-150&&z>=-1122&&Math.abs(x)<=BRIDGE.walkHalfWidth)return true;return x>=NORTH_CITY.minX&&x<=NORTH_CITY.maxX&&z>=NORTH_CITY.minZ&&z<=NORTH_CITY.maxZ;}
export function worldDrivable(x,z){if(!Number.isFinite(x)||!Number.isFinite(z))return false;if(Math.abs(x)<=164&&Math.abs(z)<=164&&MAPLE_STREETS.some(n=>Math.abs(x-n)<7.48||Math.abs(z-n)<7.48))return true;if(z<=-150&&z>=-1150&&Math.abs(x)<7.48)return true;return x>=-240&&x<=240&&z>=-1795&&z<=-1130&&(NORTH_CITY.avenues.some(n=>Math.abs(x-n)<7.48)||NORTH_CITY.streets.some(n=>Math.abs(z-n)<7.48));}
export function districtName(z){return z<-1120?'Northstar City':z<=BRIDGE.south&&z>=BRIDGE.north?'Rivergate Bridge':z<-158?'North Road':'Maple Street';}
export function northResponseRoute(start,target){
  const points=[{x:start.x,z:start.z},{x:130,z:start.z},{x:130,z:-30},{x:120,z:-30},{x:120,z:-120},{x:0,z:-120}];
  if(target.z>-1120){points.push({x:0,z:target.z+(target.z<-120?8:-8)});return points;}
  points.push({x:0,z:-1150});const nearest=(n,values)=>values.reduce((a,b)=>Math.abs(b-n)<Math.abs(a-n)?b:a),ax=nearest(target.x,NORTH_CITY.avenues),sz=nearest(target.z,NORTH_CITY.streets);
  if(Math.abs(target.x-ax)<Math.abs(target.z-sz))points.push({x:ax,z:-1150},{x:ax,z:target.z+8});else points.push({x:ax,z:-1150},{x:ax,z:sz},{x:target.x+(target.x>ax?-8:8),z:sz});return points;
}
