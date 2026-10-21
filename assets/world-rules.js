// Shared, metre-scale world layout. North is negative Z.
export const MAPLE_STREETS=Object.freeze([-120,-60,0,60,120]);
// A connected, builder-style subdivision west of the original Maple Street grid.
export const MAPLE_GROVE=Object.freeze({name:'Maple Grove',minX:-320,maxX:-137,minZ:-242,maxZ:64});
export const COMMUNITY_ROADS=Object.freeze([
  {id:'grove-north',name:'Maple Grove Lane',x1:-302,z1:-180,x2:-150,z2:-180},
  {id:'grove-middle',name:'Cedar Run',x1:-302,z1:-90,x2:-150,z2:-90},
  {id:'grove-south',name:'Willow Way',x1:-302,z1:0,x2:-120,z2:0},
  {id:'grove-west',name:'Grove Park Drive',x1:-302,z1:-180,x2:-302,z2:0},
  {id:'grove-east',name:'Grove Park Drive',x1:-150,z1:-180,x2:-150,z2:0},
  {id:'grove-entry',name:'Maple Grove entrance',x1:-150,z1:-120,x2:-120,z2:-120},
  {id:'grove-market-entry',name:'Maple Grove entrance',x1:-150,z1:-60,x2:-120,z2:-60},
].map(r=>Object.freeze({...r,halfWidth:7.5})));
const communityRows=[
  {z:-204,heading:0,roadZ:-180,rearZ:-234},
  {z:-156,heading:Math.PI,roadZ:-180,rearZ:-135.08},
  {z:-114,heading:0,roadZ:-90,rearZ:-134.92},
  {z:-66,heading:Math.PI,roadZ:-90,rearZ:-45.08},
  {z:-24,heading:0,roadZ:0,rearZ:-44.92},
  {z:24,heading:Math.PI,roadZ:0,rearZ:54},
];
export const COMMUNITY_HOMES=Object.freeze([
  ...communityRows.flatMap((row,r)=>[-272,-240,-208,-176].map((x,c)=>({
    id:'maple-grove-'+(r*4+c+1),address:101+r*8+c*2+(r%2),street:COMMUNITY_ROADS[Math.floor(r/2)].name,
    x,...row,w:[13.4,14.2,13.8,14.6][(r+c)%4],d:[11.8,12.4,12,12.8][(r+c)%4],lotWidth:28,
    plan:(r+c)%4,palette:(r*2+c)%6,fenced:(r+c)%3!==0,stories:2,
  }))),
  {id:'maple-entry-1',address:201,street:'Maple Street',x:-100,z:-90,w:13.4,d:12,lotWidth:18,heading:0,roadZ:-60,rearZ:-109,plan:1,palette:2,fenced:true,stories:2,existing:true},
  {id:'maple-entry-2',address:203,street:'Maple Street',x:-80,z:-90,w:13.4,d:12,lotWidth:18,heading:0,roadZ:-60,rearZ:-109,plan:3,palette:4,fenced:false,stories:2,existing:true},
  {id:'maple-family-home',address:205,street:'Maple Street',x:-87,z:-35,w:15.5,d:12,lotWidth:28,heading:0,roadZ:0,rearZ:-49,plan:0,palette:0,fenced:true,stories:2,existing:true},
].map(h=>Object.freeze(h)));
export function communityPoint(home,x,z){const sign=home.heading===0?1:-1;return {x:home.x+x*sign,z:home.z+z*sign};}
export function communityDriveway(home){
  const start=home.d/2+.02,end=Math.abs(home.roadZ-home.z)-7.18;
  const a=communityPoint(home,-home.w*.23,start),b=communityPoint(home,-home.w*.23,end);
  return {minX:a.x-3.3,maxX:a.x+3.3,minZ:Math.min(a.z,b.z),maxZ:Math.max(a.z,b.z),top:.08,kind:'concrete',homeId:home.id};
}
export function communityRoadRect(road,extra=0){const half=road.halfWidth+extra;return {minX:Math.min(road.x1,road.x2)-half,maxX:Math.max(road.x1,road.x2)+half,minZ:Math.min(road.z1,road.z2)-half,maxZ:Math.max(road.z1,road.z2)+half};}
export function withinRect(x,z,r,margin=0){return x>=r.minX-margin&&x<=r.maxX+margin&&z>=r.minZ-margin&&z<=r.maxZ+margin;}
export function communityReserved(x,z,margin=0){return withinRect(x,z,MAPLE_GROVE,margin);}
export function communityOnRoad(x,z){return COMMUNITY_ROADS.some(r=>withinRect(x,z,communityRoadRect(r,-.02)));}
export function communityDrivable(x,z){return communityOnRoad(x,z)||COMMUNITY_HOMES.some(h=>withinRect(x,z,communityDriveway(h)));}

export const NORTH_CITY=Object.freeze({name:'Northstar City',minX:-252,maxX:252,minZ:-1810,maxZ:-1120,avenues:[-180,-60,60,180],streets:[-1750,-1630,-1510,-1390,-1270,-1150]});
export const NORTH_MOTORS=Object.freeze({x:194,z:-1177});
export const RIVER=Object.freeze({south:-550,north:-770,waterLevel:-1.6});
export const BRIDGE=Object.freeze({south:-350,north:-970,deck:8,roadHalfWidth:7.5,walkHalfWidth:11.1});
export const TOWERS=Object.freeze(Array.from({length:15},(_,i)=>({id:'north-tower-'+i,x:[-120,0,120][i%3],z:-1210-Math.floor(i/3)*120,w:34+(i%3)*3,d:36+(i%2)*4,height:[88,126,104,142,96,158,114,186,132,98,148,120,166,110,138][i],use:['Offices','Apartments','Hotel'][i%3],name:['Hudson Exchange','Northstar Residences','Grand River Hotel','Atlas Financial','Parkview Apartments','Meridian House','Foundry Studios','Northstar Tower','Crescent Hotel','Broadway Works','Skyline Homes','Harbor Suites','Union Center','Garden Residences','Crown Plaza'][i]})));
export const CITY_BLOCKS=Object.freeze(TOWERS.flatMap((t,i)=>[-1,1].map((side,j)=>({x:t.x+side*37,z:t.z+30,w:19,d:23,height:12+(i+j)%4*4,use:['Restaurant','Apartments','Bookshop','Office','Deli','Theater'][(i*2+j)%6],name:['RIVER TABLE','PARKSIDE HOMES','NORTHSTAR BOOKS','STUDIO & CO.','BROADWAY DELI','THE LYRIC'][(i*2+j)%6]}))));
// Smooth grade transitions meet both the flat approach and the river span with
// zero slope. The 200 m approaches keep the peak grade below six percent.
export function bridgeHeight(z){
  if(z>BRIDGE.south||z<BRIDGE.north)return .06;
  const smooth=t=>t*t*(3-2*t);
  if(z>RIVER.south)return .06+smooth((BRIDGE.south-z)/(BRIDGE.south-RIVER.south))*(BRIDGE.deck-.06);
  if(z<RIVER.north)return .06+smooth((z-BRIDGE.north)/(RIVER.north-BRIDGE.north))*(BRIDGE.deck-.06);
  return BRIDGE.deck;
}
export function onBridge(x,z){return Math.abs(x)<=BRIDGE.walkHalfWidth&&z<=BRIDGE.south&&z>=BRIDGE.north;}
export function bridgePitch(x,z,heading){return onBridge(x,z)?Math.atan2(bridgeHeight(z-1)-bridgeHeight(z+1),2)*Math.cos(heading):0;}
export function worldWalkable(x,z){if(!Number.isFinite(x)||!Number.isFinite(z))return false;if(communityReserved(x,z))return true;if(Math.abs(x)<=158&&Math.abs(z)<=158)return true;if(z>=150&&z<=1082&&Math.abs(x)<=11.1)return true;if(z>=COAST_CITY.minZ&&z<=COAST_CITY.maxZ&&x>=COAST_CITY.minX&&x<=COAST_CITY.maxX)return true;if(z<=-150&&z>=-1122&&Math.abs(x)<=BRIDGE.walkHalfWidth)return true;return x>=NORTH_CITY.minX&&x<=NORTH_CITY.maxX&&z>=NORTH_CITY.minZ&&z<=NORTH_CITY.maxZ;}
export function worldDrivable(x,z){if(!Number.isFinite(x)||!Number.isFinite(z))return false;if(communityDrivable(x,z))return true;if(Math.abs(x)<=164&&Math.abs(z)<=164&&MAPLE_STREETS.some(n=>Math.abs(x-n)<7.48||Math.abs(z-n)<7.48))return true;if(z>=150&&z<=1080&&Math.abs(x)<7.48)return true;if(z>=1040&&z<=2080&&x>=-252&&x<7.48&&(COAST_CITY.avenues.some(n=>Math.abs(x-n)<7.48)||COAST_CITY.streets.some(n=>Math.abs(z-n)<7.48)))return true;if(z<=-150&&z>=-1150&&Math.abs(x)<7.48)return true;return x>=-240&&x<=240&&z>=-1795&&z<=-1130&&(NORTH_CITY.avenues.some(n=>Math.abs(x-n)<7.48)||NORTH_CITY.streets.some(n=>Math.abs(z-n)<7.48));}
export function districtName(z,x=0){if(communityReserved(x,z))return MAPLE_GROVE.name;return z>=1040?'Sunshore City':z>158?'Coast Road':z<-1120?'Northstar City':z<=BRIDGE.south&&z>=BRIDGE.north?'Rivergate Bridge':z<-158?'North Road':'Maple Street';}
export function northResponseRoute(start,target){
  const points=[{x:start.x,z:start.z},{x:130,z:start.z},{x:130,z:-30},{x:120,z:-30},{x:120,z:-120},{x:0,z:-120}];
  if(target.z>-1120){points.push({x:0,z:target.z+(target.z<-120?8:-8)});return points;}
  points.push({x:0,z:-1150});const nearest=(n,values)=>values.reduce((a,b)=>Math.abs(b-n)<Math.abs(a-n)?b:a),ax=nearest(target.x,NORTH_CITY.avenues),sz=nearest(target.z,NORTH_CITY.streets);
  if(Math.abs(target.x-ax)<Math.abs(target.z-sz))points.push({x:ax,z:-1150},{x:ax,z:target.z+8});else points.push({x:ax,z:-1150},{x:ax,z:sz},{x:target.x+(target.x>ax?-8:8),z:sz});return points;
}

export const COAST_CITY=Object.freeze({name:'Sunshore City',minX:-258,maxX:124,minZ:1040,maxZ:2090,avenues:[-240,-120,0],streets:[1080,1240,1400,1560,1720,1880,2040],beachStart:32,shore:132,promenade:23});
export const COAST_MOTORS=Object.freeze({x:-15,z:1114});
export const COAST_INFO=Object.freeze({x:25,z:1090});
export const COAST_BUILDINGS=Object.freeze(Array.from({length:24},(_,i)=>{
  const column=i%2,row=Math.floor(i/4),side=Math.floor(i/2)%2;
  return {id:'coast-building-'+i,x:column?-180:-60,z:1160+row*160+(side?27:-27),w:48,d:40,height:[15,24,10,36,18,12,45,21][i%8],
    name:['THE CORAL','PALM COURT','OCEAN TABLE','AZURE SUITES','SUNSET CINEMA','SURFSIDE MARKET','THE MARLIN','SEA BREEZE CAFE','SOL RESIDENCES','COASTAL BOOKS','THE FLAMINGO','BAYVIEW STUDIOS'][i%12],
    use:['Hotel','Apartments','Restaurant','Hotel','Cinema','Shop','Hotel','Cafe','Apartments','Bookshop','Hotel','Office'][i%12]};
}));
export function coastGroundHeight(x,z){return z>=1000&&z<=2200&&x>=32&&x<=132?.21-(x-32)*.0088:-.07;}
export function southResponseRoute(start,target){
  const points=[{x:start.x,z:start.z},{x:130,z:start.z},{x:130,z:-30},{x:120,z:-30},{x:120,z:120},{x:0,z:120}];
  if(target.z<1040){points.push({x:0,z:target.z-9});return points;}
  const nearest=(n,values)=>values.reduce((a,b)=>Math.abs(b-n)<Math.abs(a-n)?b:a),ax=nearest(target.x,COAST_CITY.avenues),sz=nearest(target.z,COAST_CITY.streets);
  points.push({x:0,z:1080});
  if(Math.abs(target.x-ax)<Math.abs(target.z-sz))points.push({x:ax,z:1080},{x:ax,z:target.z-9});
  else points.push({x:0,z:sz},{x:target.x+(target.x<0?9:-9),z:sz});
  return points.filter((p,i)=>!i||Math.hypot(p.x-points[i-1].x,p.z-points[i-1].z)>.01);
}
