// Northstar Metro: an elevated light-rail line. Geometry, stations and timetable only
// (no Three.js), shared by the world builder, the rules and the tests.
// The line runs over the median of Northstar's x=60 avenue from the south edge of the
// city, curves east over the z=-1750 street and the airport road, and curves north over
// the airport parking lot to end in front of the terminal. Two tracks: A on the left of
// the outbound direction (towards the airport), B on the right. Trains run a loop:
// out on A, reverse on the tail track past the airport station and cross to B, back on
// B, reverse on the south tail and cross to A. The cars are symmetric with a cab at
// each end, so reversing only swaps which cab leads.
export const DECK_Y=7.5,RAIL_Y=7.7,PLATFORM_Y=8.72,TRACK_OFFSET=2.25,CURVE_RADIUS=30;
export const TRAIN=Object.freeze({length:27.5,doorZ:[-6.45,6.45],maxSpeed:16,curveSpeed:7.5,accel:1.1,decel:1.2,dwell:22,reverseDwell:8});
export const PLATFORM=Object.freeze({inner:3.7,outer:8.7,stairInner:7.9,stairOuter:9.7,landing:2.5,stairRun:15.5});

// Centreline: straight legs joined by 30 m arcs, sampled every metre.
const LEGS=[[60,-1100],[60,-1750],[1150,-1750],[1150,-1950]];
function buildCentreline(step=1){
  const pts=[];const push=(x,z)=>{const last=pts.at(-1);if(!last||Math.hypot(last.x-x,last.z-z)>1e-6)pts.push({x,z});};
  const r=CURVE_RADIUS;let start={x:LEGS[0][0],z:LEGS[0][1]};
  for(let i=1;i<LEGS.length;i++){const a=LEGS[i-1],b=LEGS[i],c=LEGS[i+1];const dx=Math.sign(b[0]-a[0]),dz=Math.sign(b[1]-a[1]);
    const end=c?{x:b[0]-dx*r,z:b[1]-dz*r}:{x:b[0],z:b[1]};const len=Math.hypot(end.x-start.x,end.z-start.z);
    for(let d=0;d<=len;d+=step)push(start.x+dx*d,start.z+dz*d);push(end.x,end.z);
    if(c){const ex=Math.sign(c[0]-b[0]),ez=Math.sign(c[1]-b[1]),cx=end.x+ex*r,cz=end.z+ez*r,a0=Math.atan2(end.z-cz,end.x-cx),next={x:b[0]+ex*r,z:b[1]+ez*r},a1=Math.atan2(next.z-cz,next.x-cx);
      let da=a1-a0;while(da>Math.PI)da-=2*Math.PI;while(da<-Math.PI)da+=2*Math.PI;const n=Math.ceil(Math.abs(da)*r/step);for(let k=1;k<=n;k++){const t=a0+da*k/n;push(cx+r*Math.cos(t),cz+r*Math.sin(t));}start=next;}}
  let s=0;pts.forEach((p,i)=>{if(i)s+=Math.hypot(p.x-pts[i-1].x,p.z-pts[i-1].z);p.s=s;});
  pts.forEach((p,i)=>{const a=pts[Math.max(0,i-1)],b=pts[Math.min(pts.length-1,i+1)],l=Math.hypot(b.x-a.x,b.z-a.z);p.tx=(b.x-a.x)/l;p.tz=(b.z-a.z)/l;
    // curvature for speed limits
    const prev=pts[Math.max(0,i-3)],next=pts[Math.min(pts.length-1,i+3)],h1=Math.atan2(p.x-prev.x,p.z-prev.z),h2=Math.atan2(next.x-p.x,next.z-p.z);let dh=h2-h1;while(dh>Math.PI)dh-=2*Math.PI;while(dh<-Math.PI)dh+=2*Math.PI;p.curved=Math.abs(dh)>.02;});
  return pts;}
export const CENTRELINE=Object.freeze(buildCentreline());
export const LINE_LENGTH=CENTRELINE.at(-1).s;
// Point on the centreline at distance s, with tangent (tx,tz) and left normal (nx,nz).
export function lineAt(s){const P=CENTRELINE;s=Math.max(0,Math.min(LINE_LENGTH,s));let lo=0,hi=P.length-1;while(hi-lo>1){const m=(lo+hi)>>1;if(P[m].s<=s)lo=m;else hi=m;}
  const a=P[lo],b=P[hi],f=b.s>a.s?(s-a.s)/(b.s-a.s):0,tx=a.tx+(b.tx-a.tx)*f,tz=a.tz+(b.tz-a.tz)*f,l=Math.hypot(tx,tz)||1;
  return {x:a.x+(b.x-a.x)*f,z:a.z+(b.z-a.z)*f,tx:tx/l,tz:tz/l,nx:tz/l,nz:-tx/l,curved:a.curved||b.curved};}
// Left normal: for the outbound direction (tx,tz) the left side is (tz,-tx) in this world (north is -z).
export function projectToLine(x,z){let best=null;for(const p of CENTRELINE){const d=Math.hypot(p.x-x,p.z-z);if(!best||d<best.d)best={s:p.s,d};}return best;}

export const STATIONS=Object.freeze([
  {id:'rivergate',name:'Rivergate',at:[60,-1210],length:40,kind:'stop',area:'South Northstar, by the bridge road'},
  {id:'midtown',name:'Midtown',at:[60,-1330],length:40,kind:'stop',area:'Offices and apartments'},
  {id:'central',name:'Northstar Central',at:[60,-1453],length:60,kind:'central',area:'Main station and future intercity hall'},
  {id:'uptown',name:'Uptown',at:[60,-1570],length:40,kind:'stop',area:'Hotels and shops'},
  {id:'northgate',name:'North Gate',at:[130,-1750],length:40,kind:'stop',area:'North edge of the city'},
  {id:'plaza',name:'Landmark Plaza',at:[905,-1750],length:40,kind:'stop',area:'Airport landmark and plaza'},
  {id:'airport',name:'Northstar Airport',at:[1150,-1880],length:40,kind:'terminal',area:'Terminal and parking'}].map(s=>Object.freeze({...s,s:projectToLine(...s.at).s})));
export const METRO_COLOR='#d8262b',LINE_NAME='Red Line';
export const stationById=id=>STATIONS.find(s=>s.id===id)||null;

// Station-local frame: u along the line (outbound positive), v to the left. Converts to world.
export function stationFrame(station){const p=lineAt(station.s);return {x:p.x,z:p.z,tx:p.tx,tz:p.tz,nx:p.nx,nz:p.nz,yaw:Math.atan2(p.tx,p.tz),toWorld:(u,v)=>({x:p.x+p.tx*u+p.nx*v,z:p.z+p.tz*u+p.nz*v}),toLocal:(x,z)=>({u:(x-p.x)*p.tx+(z-p.z)*p.tz,v:(x-p.x)*p.nx+(z-p.z)*p.nz})};}
// Central: two metro side platforms, a two-track intercity terminus (tracks end at the
// north concourse) with an island platform, and a grand stair to the east plaza.
export const CENTRAL=Object.freeze({futureTracks:[-11,-24],island:[-21.5,-13.5],concourse:6,deckEdge:-26,grandStair:[-29.5,-26]});
// Walkable decks at platform level, in station-local rectangles [u0,u1,v0,v1].
// Landings join a platform to the top of its stair: A side at the outbound end, B side at
// the inbound end. Central's B platform reaches the street through the concourse instead.
export function stationLandings(station){const L=station.length/2,P=PLATFORM,list=[[L,L+P.landing,P.inner,P.stairOuter]];if(station.kind!=='central')list.push([-L-P.landing,-L,-P.stairOuter,-P.inner]);return list;}
export function stationDecks(station){const L=station.length/2,P=PLATFORM,C=CENTRAL,decks=[[-L,L,P.inner,P.outer],[-L,L,-P.outer,-P.inner],...stationLandings(station)];
  if(station.kind==='central')decks.push([-L,L,C.island[0],C.island[1]],[L,L+C.concourse,C.grandStair[0],-P.inner]);
  return decks;}
// Stairs run back along the outside of each platform: [u0,u1,v0,v1,uTop]. Height falls
// from PLATFORM_Y at uTop to street level at the other end.
export function stationStairs(station){const L=station.length/2,P=PLATFORM,C=CENTRAL;
  const list=[[L-P.stairRun,L,P.outer,P.stairOuter,L]];
  list.push(station.kind==='central'?[L-P.stairRun,L,C.grandStair[0],C.grandStair[1],L]:[-L,-L+P.stairRun,-P.stairOuter,-P.outer,-L]);
  return list;}
export function stairHeight(stair,u){const [u0,u1,,,top]=stair,run=u1-u0,d=top===u0?u-u0:u1-u;return PLATFORM_Y*Math.max(0,Math.min(1,1-d/run));}
const inRect=(r,u,v)=>u>=r[0]&&u<=r[1]&&v>=r[2]&&v<=r[3];
// Floor height under (x,z) for a walker at height refY, or null when the metro is not underfoot.
export function metroFloorAt(x,z,refY=0){
  for(const st of STATIONS){const F=stationFrame(st);if(Math.abs(x-F.x)>st.length/2+45||Math.abs(z-F.z)>st.length/2+45)continue;const {u,v}=F.toLocal(x,z);
    for(const s of stationStairs(st))if(inRect(s,u,v)){const h=stairHeight(s,u);if(Math.abs(refY-h)<1.3)return h;}
    if(refY>PLATFORM_Y-1.4)for(const d of stationDecks(st))if(inRect(d,u,v))return PLATFORM_Y;}
  return null;}
// Walking rule for the player: on an elevated metro surface you may only step onto
// another metro surface at about the same height (no walking off platforms or onto the
// tracks). Returns true (allowed, even over a road), false (blocked) or null (not metro).
export function metroWalk(from,x,z){const y=from.y??0,here=metroFloorAt(from.x,from.z,y);
  if(here!=null&&here>.6){const there=metroFloorAt(x,z,y);return there!=null&&Math.abs(there-here)<.7;}
  const there=metroFloorAt(x,z,y);return there!=null&&Math.abs(there-y)<.7?true:null;}
// Ground space the metro needs kept clear of buildings and trees.
export function stationFootprint(station,pad=0){const L=station.length/2,F=stationFrame(station),C=CENTRAL,v0=station.kind==='central'?C.grandStair[0]:-PLATFORM.stairOuter,u1=station.kind==='central'?L+C.concourse:L+PLATFORM.landing;
  const pts=[[-L-PLATFORM.landing-pad,v0-pad],[u1+pad,v0-pad],[u1+pad,PLATFORM.stairOuter+pad],[-L-PLATFORM.landing-pad,PLATFORM.stairOuter+pad]].map(([u,v])=>F.toWorld(u,v));
  return {minX:Math.min(...pts.map(p=>p.x)),maxX:Math.max(...pts.map(p=>p.x)),minZ:Math.min(...pts.map(p=>p.z)),maxZ:Math.max(...pts.map(p=>p.z))};}
export function nearMetro(x,z,clear=7){if(x<20||x>1200||z>-1080||z<-1970)return false;const p=projectToLine(x,z);if(p.d<clear)return true;return STATIONS.some(st=>{const f=stationFootprint(st,2);return x>=f.minX&&x<=f.maxX&&z>=f.minZ&&z<=f.maxZ;});}
export function metroReserved(b){return STATIONS.some(st=>{const f=stationFootprint(st,2);return b.x+b.w/2>f.minX&&b.x-b.w/2<f.maxX&&b.z+b.d/2>f.minZ&&b.z-b.d/2<f.maxZ;});}
// The owner's subway-entrance model marks the future lower intercity concourse, on the
// plaza south of Central. The ground keeps a hole for its stairwell.
export const ENTRANCE=Object.freeze({x:82,z:-1409,yaw:0,hole:Object.freeze({minX:80.85,maxX:83.15,minZ:-1408.45,maxZ:-1403.7}),kiosk:Object.freeze({minX:80.75,maxX:83.45,minZ:-1408.55,maxZ:-1403.6})});

// ---------------- loop path and timetable ----------------
// The loop as a list of samples {x,z,yaw,track,s,stop} for the train centre.
const XOVER=30;
function buildLoop(){
  const half=TRAIN.length/2,sMin=half,sMax=LINE_LENGTH-half,out=[];
  const at=(s,off)=>{const p=lineAt(s);return {x:p.x+p.nx*off,z:p.z+p.nz*off,curved:p.curved};};
  const smooth=t=>t*t*(3-2*t);
  const add=(s,off,track)=>{const p=at(s,off);out.push({x:p.x,z:p.z,s,track,curved:p.curved});};
  // A outbound from the end of the south crossover to the north tail.
  const span=(a,b)=>{const list=[];for(let s=Math.ceil(a);s<b;s++)list.push(s);for(const st of STATIONS)if(st.s>a&&st.s<b)list.push(st.s);list.push(b);return [...new Set(list)].sort((p,q)=>p-q).filter((s,i,all)=>!i||s-all[i-1]>.05);};
  for(const s of span(sMin+XOVER,sMax))add(s,TRACK_OFFSET,'A');out.at(-1).cusp=true;
  // North crossover back onto B (reverse).
  for(let k=1;k<=XOVER;k++){const t=k/XOVER;add(sMax-k,TRACK_OFFSET-2*TRACK_OFFSET*smooth(t),'X');}
  for(const s of span(sMin,sMax-XOVER-.5).reverse())add(s,-TRACK_OFFSET,'B');out.at(-1).cusp=true;
  for(let k=1;k<XOVER;k++){const t=k/XOVER;add(sMin+k,-TRACK_OFFSET+2*TRACK_OFFSET*smooth(t),'X');}
  let d=0;out.forEach((p,i)=>{if(i)d+=Math.hypot(p.x-out[i-1].x,p.z-out[i-1].z);p.d=d;});
  const closing=Math.hypot(out[0].x-out.at(-1).x,out[0].z-out.at(-1).z);return {points:out,length:d+closing};}
export const LOOP=buildLoop();
// Stops along the loop: each station once on A (outbound) and once on B (inbound); cusps reverse.
function buildStops(){const P=LOOP.points,stops=[];
  for(const st of STATIONS)for(const track of ['A','B']){let best=null;for(const p of P)if(p.track===track&&(!best||Math.abs(p.s-st.s)<Math.abs(best.s-st.s)))best=p;if(Math.abs(best.s-st.s)>.01)throw new Error('Metro stop off the loop: '+st.id);stops.push({d:best.d,station:st.id,track,dwell:TRAIN.dwell,doors:true});}
  for(const p of P)if(p.cusp)stops.push({d:p.d,station:null,track:p.track,dwell:TRAIN.reverseDwell,doors:false,reverse:true});
  return stops.sort((a,b)=>a.d-b.d);}
export const STOPS=buildStops();
// Speed profile between consecutive stops (trapezoid with curve limits), integrated to a timetable.
function buildTimetable(){const P=LOOP.points,L=LOOP.length,events=[];let t=0;
  const limit=d=>{let lo=0,hi=P.length-1;d=((d%L)+L)%L;while(hi-lo>1){const m=(lo+hi)>>1;if(P[m].d<=d)lo=m;else hi=m;}return P[lo].curved||P[lo].track==='X'?TRAIN.curveSpeed:TRAIN.maxSpeed;};
  for(let i=0;i<STOPS.length;i++){const a=STOPS[i],b=STOPS[(i+1)%STOPS.length];events.push({type:'dwell',t0:t,t1:t+a.dwell,d:a.d,stop:a});t+=a.dwell;
    let dist=b.d-a.d;if(dist<=0)dist+=L;const n=Math.max(2,Math.ceil(dist)),v=new Float64Array(n+1);for(let k=0;k<=n;k++)v[k]=limit(a.d+dist*k/n);v[0]=0;v[n]=0;
    const ds=dist/n;for(let k=1;k<=n;k++)v[k]=Math.min(v[k],Math.sqrt(v[k-1]*v[k-1]+2*TRAIN.accel*ds));for(let k=n-1;k>=0;k--)v[k]=Math.min(v[k],Math.sqrt(v[k+1]*v[k+1]+2*TRAIN.decel*ds));
    const times=new Float64Array(n+1);for(let k=1;k<=n;k++){const avg=Math.max((v[k]+v[k-1])/2,.3);times[k]=times[k-1]+ds/avg;}
    events.push({type:'run',t0:t,t1:t+times[n],d0:a.d,dist,ds,times,speeds:v,from:a,to:b});t+=times[n];}
  return {events,cycle:t};}
export const TIMETABLE=buildTimetable();
export const TRAIN_COUNT=3;
// Where a train is at loop time t: centre position, heading, speed, doors and stop info.
export function loopPoint(d){const P=LOOP.points,L=LOOP.length;d=((d%L)+L)%L;let lo=0,hi=P.length-1;if(d>=P[hi].d){const a=P[hi],b=P[0],f=(d-a.d)/(L-a.d);return {x:a.x+(b.x-a.x)*f,z:a.z+(b.z-a.z)*f,track:a.track,index:hi};}
  while(hi-lo>1){const m=(lo+hi)>>1;if(P[m].d<=d)lo=m;else hi=m;}const a=P[lo],b=P[hi],f=(d-a.d)/(b.d-a.d||1);return {x:a.x+(b.x-a.x)*f,z:a.z+(b.z-a.z)*f,track:a.track,index:lo};}
export function trainState(time){const T=TIMETABLE,t=((time%T.cycle)+T.cycle)%T.cycle;let lo=0,hi=T.events.length-1;while(hi>lo){const m=(lo+hi)>>1;if(T.events[m].t1<t)lo=m+1;else hi=m;}const e=T.events[lo];
  let d,speed=0,dir=1,doors=false,station=null,nextStop=null,remaining=0;
  if(e.type==='dwell'){d=e.d;doors=e.stop.doors&&t-e.t0>2&&e.t1-t>3;station=e.stop.station;remaining=e.t1-t;const i=T.events.indexOf(e);nextStop=T.events[(i+1)%T.events.length].to;}
  else{const tau=t-e.t0;let lo2=0,hi2=e.times.length-1;while(hi2-lo2>1){const m=(lo2+hi2)>>1;if(e.times[m]<=tau)lo2=m;else hi2=m;}const f=(tau-e.times[lo2])/((e.times[hi2]-e.times[lo2])||1);
    d=e.d0+e.ds*(lo2+f);speed=e.speeds[lo2]+(e.speeds[hi2]-e.speeds[lo2])*f;nextStop=e.to;remaining=e.t1-t;}
  const p=loopPoint(d),q=loopPoint(d+1.5),r=loopPoint(d-1.5);const yaw=Math.atan2(q.x-r.x,q.z-r.z);
  return {x:p.x,z:p.z,y:RAIL_Y,yaw,speed,doors,station,track:p.track,d,nextStop,remaining,cycleTime:t};}
// Next stations served from here, in order, for a train state.
export function upcomingStations(state,count=STATIONS.length){const T=TIMETABLE,list=[];const start=T.events.findIndex(e=>e.type==='dwell'&&Math.abs(e.d-state.d)<.01&&state.speed===0);
  let i=start>=0?start+1:T.events.findIndex(e=>e.type==='run'&&e.to===state.nextStop);for(let k=0;k<T.events.length&&list.length<count;k++){const e=T.events[(i+k)%T.events.length];if(e.type==='dwell'&&e.stop.station&&!list.includes(e.stop.station))list.push(e.stop.station);}return list;}
// Street-level spot at the foot of a station stair (for saving while on the metro).
export function stairFoot(station){const F=stationFrame(station),[u0,u1,v0,v1,top]=stationStairs(station)[0],u=top===u0?u1+1.2:u0-1.2;return F.toWorld(u,(v0+v1)/2);}
export function metroSafePoint(p,riding=false){const elevated=riding||((metroFloorAt(p.x,p.z,p.y??0)??0)>.6);if(!elevated)return {x:p.x,z:p.z};
  let best=STATIONS[0],d=Infinity;for(const st of STATIONS){const q=stationFrame(st),e=Math.hypot(q.x-p.x,q.z-p.z);if(e<d){d=e;best=st;}}const f=stairFoot(best);return {x:f.x,z:f.z};}
