import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import * as THREE from 'three';
import {METRO_MODELS} from '../assets/metro/models.js';
import {STATIONS,CENTRELINE,LINE_LENGTH,LOOP,STOPS,TIMETABLE,TRAIN,PLATFORM_Y,RAIL_Y,DECK_Y,TRACK_OFFSET,lineAt,stationFrame,stationDecks,stationStairs,stairHeight,
  metroFloorAt,metroWalk,trainState,nearMetro,metroReserved,stationFootprint,metroSafePoint,stairFoot,ENTRANCE,CENTRAL} from '../assets/metro-line.js';
import {NORTH_CITY,AIRPORT,CITY_BLOCKS,TOWERS,METRO_CENTRAL_RESERVE,worldWalkable} from '../assets/world-rules.js';
import {SKYLINE_TOWERS} from '../assets/northstar-skyline.js';

const file=p=>new URL('../'+p,import.meta.url);
// Models: the owner's light-rail car and subway entrance, compressed and in budget.
for(const [key,limit] of [['train',4e5],['entrance',7e5]]){const bytes=await readFile(file(METRO_MODELS[key].url.slice(2)));assert.ok(bytes.length<limit,key+' under '+limit+' bytes');
  const json=JSON.parse(bytes.subarray(20,20+bytes.readUInt32LE(12)).toString('utf8'));assert.ok(json.extensionsUsed.includes('EXT_meshopt_compression'),key+' meshopt');for(const img of json.images||[])assert.equal(img.mimeType,'image/webp');
  if(key==='train')for(const name of ['body','door-L-a','door-L-b','door-R-a','door-R-b'])assert.ok(json.nodes.some(n=>n.name===name),'train part '+name);}
const T=METRO_MODELS.train;assert.ok(Math.abs(T.length-TRAIN.length)<.1&&T.width<3&&T.triangles<20000,'a 27.5 m car');
assert.ok(Math.abs(RAIL_Y+T.floor-PLATFORM_Y)<.01,'level boarding: car floor = platform height');

// Line: a separate eastern greenway, then the north-side airport greenway
// and a station west of the terminal loop; no longitudinal road occupation.
assert.ok(Math.abs(CENTRELINE[0].x-280)<.01&&CENTRELINE[0].z===-1100&&Math.abs(CENTRELINE.at(-1).x-1028)<.01&&CENTRELINE.at(-1).z===-1950);
assert.ok(LINE_LENGTH>1500&&LINE_LENGTH<1650);
for(let i=1;i<CENTRELINE.length;i++)assert.ok(Math.hypot(CENTRELINE[i].x-CENTRELINE[i-1].x,CENTRELINE[i].z-CENTRELINE[i-1].z)<1.01,'continuous');
assert.equal(STATIONS.length,7);assert.deepEqual(STATIONS.map(s=>s.id),['rivergate','midtown','central','uptown','northgate','plaza','airport']);
assert.equal(STATIONS.filter(s=>s.kind==='central').length,1);
for(let i=1;i<STATIONS.length;i++)assert.ok(STATIONS[i].s-STATIONS[i-1].s>100,'stations spaced');
for(const st of STATIONS){const F=stationFrame(st),p=lineAt(st.s);assert.ok(!p.curved,st.id+' on a straight');
  // stations sit mid-block, clear of crossings (platform, landings and stairs)
  const f=stationFootprint(st);for(const z of NORTH_CITY.streets)for(const x of NORTH_CITY.avenues){const clear=f.maxX<x-10.8||f.minX>x+10.8||f.maxZ<z-10.8||f.minZ>z+10.8;assert.ok(clear,st.id+' clear of crossing '+x+','+z);}
  // the stair foot is on a walkable street or plaza
  const foot=stairFoot(st);assert.ok(worldWalkable(foot.x,foot.z),st.id+' stair reaches the street');
  for(const t of SKYLINE_TOWERS){const fw=t.footprint[0]+4,fd=t.footprint[1]+4,z=t.z+t.offset[1];assert.ok(f.maxX<t.x-fw/2||f.minX>t.x+fw/2||f.maxZ<z-fd/2||f.minZ>z+fd/2,st.id+' clear of '+t.name);}
  for(const b of CITY_BLOCKS)assert.ok(!metroReserved(b),st.id+' clear of '+b.name);
  void F;}
assert.equal(CITY_BLOCKS.length,TOWERS.length*2,'Central moves outside the building grid');
{const R=METRO_CENTRAL_RESERVE,f=stationFootprint(STATIONS[2],2),K=ENTRANCE.kiosk;assert.ok(f.minX>=R.minX&&f.maxX<=R.maxX&&f.minZ>=R.minZ&&f.maxZ<=R.maxZ&&K.minX>=R.minX&&K.maxX<=R.maxX&&K.minZ>=R.minZ&&K.maxZ<=R.maxZ,'reserve covers Central and the entrance');}
assert.ok(STATIONS.at(-1).at[1]>AIRPORT.parking.minZ&&STATIONS.at(-1).at[1]<AIRPORT.parking.maxZ&&stairFoot(STATIONS.at(-1)).z>AIRPORT.landside.minZ,'airport station over the parking lot, in front of the terminal');
assert.ok(nearMetro(280,-1400)&&nearMetro(700,-1782)&&!nearMetro(60,-1400)&&!nearMetro(1150,-2050));

// Floors: platforms and stairs are walkable; the tracks and the air beyond are not.
const mid=STATIONS[1],F=stationFrame(mid),w=(u,v)=>F.toWorld(u,v);
{const p=w(0,6);assert.equal(metroFloorAt(p.x,p.z,PLATFORM_Y),PLATFORM_Y);assert.equal(metroFloorAt(p.x,p.z,0),null,'street below a platform');
  const t=w(0,0);assert.equal(metroFloorAt(t.x,t.z,PLATFORM_Y),null,'no floor over the tracks');
  const [s]=stationStairs(mid),[u0,u1,v0,v1]=s,sm=w((u0+u1)/2,(v0+v1)/2),h=stairHeight(s,(u0+u1)/2);assert.ok(Math.abs(h-PLATFORM_Y/2)<.01);assert.equal(metroFloorAt(sm.x,sm.z,h),h);
  assert.ok(Math.abs(stairHeight(s,s[4])-PLATFORM_Y)<1e-9&&stairHeight(s,s[4]===u0?u1:u0)===0,'top at the landing, bottom at the street');
  assert.equal(metroWalk({...w(0,6),y:PLATFORM_Y},w(0,3).x,w(0,3).z),false,'cannot step onto the tracks');
  assert.equal(metroWalk({...w(0,8.5),y:PLATFORM_Y},w(0,9.2).x,w(0,9.2).z),false,'cannot step off the outer edge');
  assert.equal(metroWalk({...w(0,6),y:PLATFORM_Y},w(1,6).x,w(1,6).z),true,'walk along the platform');
  const l=stationDecks(mid)[2],lp=w((l[0]+l[1])/2,(l[2]+l[3])/2);assert.equal(metroFloorAt(lp.x,lp.z,PLATFORM_Y),PLATFORM_Y,'landing');
  // Climb: walking up the stair from the street to the landing never needs a big step.
  let y=0;for(let u=u0+.05;u<=u1+1.5;u+=.1){const q=w(u,(v0+v1)/2),f=metroFloorAt(q.x,q.z,y);assert.ok(f!=null&&Math.abs(f-y)<.2,'stair step at u='+u.toFixed(2));y=f;}
  assert.equal(y,PLATFORM_Y);}
// Central: island platform and concourse join the platforms; a grand stair to the plaza.
{const c=STATIONS[2],G=stationFrame(c),L=c.length/2,i=G.toWorld(0,(CENTRAL.island[0]+CENTRAL.island[1])/2),k=G.toWorld(L+3,-15);
  assert.equal(metroFloorAt(i.x,i.z,PLATFORM_Y),PLATFORM_Y);assert.equal(metroFloorAt(k.x,k.z,PLATFORM_Y),PLATFORM_Y);assert.equal(stationStairs(c).length,2);
  const ft=G.toWorld(0,CENTRAL.futureTracks[0]);assert.equal(metroFloorAt(ft.x,ft.z,PLATFORM_Y),null,'future intercity tracks');}
assert.ok(ENTRANCE.hole.maxX-ENTRANCE.hole.minX>2&&worldWalkable(ENTRANCE.x,ENTRANCE.kiosk.maxZ+1));
{const s=metroSafePoint({x:w(0,6).x,y:PLATFORM_Y,z:w(0,6).z});assert.ok(worldWalkable(s.x,s.z)&&metroFloorAt(s.x,s.z,0)==null,'saving on a platform resumes at a stair foot');}

// Timetable: a loop through all 14 platform stops with reversals at both ends.
assert.equal(STOPS.filter(s=>s.station).length,14);assert.equal(STOPS.filter(s=>s.reverse).length,2);
assert.ok(TIMETABLE.cycle>600&&TIMETABLE.cycle<900,'about '+Math.round(TIMETABLE.cycle/60)+' minutes round trip');
let maxSpeed=0,lastD=null;for(let t=0;t<TIMETABLE.cycle;t+=.5){const s=trainState(t);maxSpeed=Math.max(maxSpeed,s.speed);assert.ok(s.speed<=TRAIN.maxSpeed+1e-6);if(s.doors)assert.ok(s.station&&s.speed===0,'doors only open at a station');
  if(lastD!=null){const step=((s.d-lastD)%LOOP.length+LOOP.length)%LOOP.length;assert.ok(step<TRAIN.maxSpeed*.5+.5,'smooth motion');}lastD=s.d;}
assert.ok(maxSpeed>15);
for(const st of STATIONS)for(const track of ['A','B']){const stop=STOPS.find(s=>s.station===st.id&&s.track===track),p=LOOP.points.find(q=>Math.abs(q.d-stop.d)<1e-6);
  const F2=stationFrame(st),{u,v}=F2.toLocal(p.x,p.z);assert.ok(Math.abs(u)<.01&&Math.abs(v-(track==='A'?TRACK_OFFSET:-TRACK_OFFSET))<.01,st.id+' '+track+' stops centred at the platform');}

// World: build in Node with a canvas stub, run trains, board, ride and get off.
const ctx=new Proxy({},{get:()=>()=>{},set:()=>true});globalThis.document={createElement:()=>({width:0,height:0,getContext:()=>ctx})};
const {createMetroWorld,DOORWAYS,METRO_FACTS,METRO_THINK,METRO_FARE}=await import('../assets/metro-world.js');
const scene=new THREE.Scene(),obstacles=[],player={position:new THREE.Vector3(0,0,0),rotation:{y:0}},events=[];
const metro=createMetroWorld({scene,obstacles,player,onEvent:e=>events.push(e)});
assert.equal(metro.trains.length,3);assert.equal(metro.gates.length,STATIONS.length*2*DOORWAYS.length*2);assert.ok(metro.columns.length>50);
assert.ok(obstacles.every(o=>o.houseId==='metro'&&o.maxY<DECK_Y||o.kind==='metro-entrance'),'metro ground obstacles stay below the deck');
for(const c of metro.columns){assert.ok(!NORTH_CITY.streets.some(z=>Math.abs(c.z-z)<11)||!NORTH_CITY.avenues.some(x=>Math.abs(c.x-x)<11),'no column in a crossing');}
for(const st of STATIONS){assert.ok(METRO_FACTS[st.id]&&METRO_THINK[st.id]?.question&&METRO_THINK[st.id]?.answer,st.id+' lesson');}
assert.equal(METRO_FARE.youth,0);assert.ok(METRO_FARE.weekPass<METRO_FARE.adult*10);
assert.equal(metro.floorAt(5000,5000,0),null);
// Wait on Midtown platform 1 for a train to the airport.
const door=F.toWorld(DOORWAYS[2],4.3);player.position.set(door.x,PLATFORM_Y,door.z);
let board=null;for(let i=0;i<4000&&!board;i++){metro.update(.25,{});board=metro.boardable(player.position);}
assert.ok(board&&board.station.id==='midtown'&&board.towards.id==='airport'&&!board.terminates);
assert.deepEqual(board.stops.map(s=>s.id),['central','uptown','northgate','plaza','airport']);
assert.ok(metro.gates.filter(g=>g.station==='midtown'&&g.track==='A').every(g=>g.open>.5),'platform gates open with the train doors');
assert.equal(metro.board(board.train,'rivergate'),false,'only stations ahead');
// Actions revalidate physical boarding; rejected calls cannot move the actor.
const waiting=player.position.clone(),train=metro.trains[board.train];
for(const bad of [{x:0,y:PLATFORM_Y,z:0},{x:waiting.x,y:0,z:waiting.z},{x:waiting.x,y:PLATFORM_Y+2,z:waiting.z},{x:NaN,y:PLATFORM_Y,z:waiting.z},{x:waiting.x,y:PLATFORM_Y,z:Infinity}]){
 player.position.set(bad.x,bad.y,bad.z);assert.equal(metro.boardable(player.position),null);assert.equal(metro.board(board.train,'plaza'),false);assert.equal(metro.isRiding(),false);assert.ok(Object.is(player.position.x,bad.x)&&Object.is(player.position.y,bad.y)&&Object.is(player.position.z,bad.z),'refused boarding leaves position untouched');}
player.position.copy(waiting);
assert.equal(metro.board(String(board.train),'plaza'),false,'invalid train identity');assert.equal(metro.board(board.train,'removed-stop'),false);assert.equal(metro.board(board.train,'plaza',null),false,'missing actor');
const open=train.doorOpen;train.doorOpen=.45;assert.equal(metro.board(board.train,'plaza'),false,'a partly opening door cannot accept a stale click');train.doorOpen=open;
const speed=train.state.speed;train.state.speed=1;assert.equal(metro.board(board.train,'plaza'),false,'cannot board a moving car');train.state.speed=speed;
// A player inside the track envelope is near a door but not on its platform.
const track=F.toWorld(DOORWAYS[2],3.0);player.position.set(track.x,PLATFORM_Y,track.z);assert.equal(metro.board(board.train,'plaza'),false);player.position.copy(waiting);
assert.ok(metro.board(board.train,'plaza'));assert.ok(metro.isRiding());
assert.equal(metro.board(board.train,'plaza'),false,'one ride only');
const seat=player.position.clone();train.doorOpen=.3;assert.equal(metro.alight(),null,'wait for the real door to open');assert.ok(metro.isRiding());assert.ok(player.position.equals(seat));train.doorOpen=open;
const savedDuringRide=metro.safePoint(player.position);assert.ok(worldWalkable(savedDuringRide.x,savedDuringRide.z));assert.equal(metroFloorAt(savedDuringRide.x,savedDuringRide.z,0),null);assert.ok(player.position.equals(seat)&&metro.isRiding(),'saving derives a recovery point without changing the active ride');

assert.equal(metro.floorAt(player.position.x,player.position.z,player.position.y),RAIL_Y+T.floor,'standing on the car floor');
for(let i=0;i<4000&&metro.isRiding();i++){metro.update(.25,{});if(metro.isRiding()){metro.carry(player);const tr=metro.trains[board.train].group;assert.ok(Math.hypot(player.position.x-tr.position.x,player.position.z-tr.position.z)<14,'carried in the car');if(metro.rideInfo().speed>0){const before=player.position.clone();assert.equal(metro.alight(),null,'cannot leave a moving train');assert.ok(player.position.equals(before)&&metro.isRiding());}}}
assert.ok(!metro.isRiding());const kinds=events.map(e=>e.kind);assert.ok(kinds.includes('departing')&&kinds.includes('arrived'));
const off=events.find(e=>e.kind==='alighted');assert.equal(off.station.id,'plaza');assert.equal(player.position.y,PLATFORM_Y);
assert.equal(metroFloorAt(player.position.x,player.position.z,PLATFORM_Y),PLATFORM_Y,'stepped out onto the platform');
// Terminus platforms: arriving trains end their trip.
{const air=STATIONS.at(-1),A=stationFrame(air),d=A.toWorld(DOORWAYS[1],4.3);player.position.set(d.x,PLATFORM_Y,d.z);let b=null;for(let i=0;i<4000&&!b;i++){metro.update(.25,{});b=metro.boardable(player.position);}assert.ok(b?.terminates,'airport platform 1 is arrivals only');assert.equal(metro.board(b.train,'rivergate'),false,'cannot board an arrivals-only train');}

// Rivergate report: the old circular door triggers missed the outer half of the
// platform and the space between doors. Board from the safe platform alongside
// each stopped car, while preserving terminal, height and door checks.
for(const station of STATIONS)for(const track of ['A','B']){
 const stop=TIMETABLE.events.find(e=>e.type==='dwell'&&e.stop.station===station.id&&e.stop.track===track),frame=stationFrame(station),side=track==='A'?1:-1;
 metro.time=stop.t0+5;metro.trains[0].doorOpen=0;for(let i=0;i<5;i++)metro.update(.25,{});
 const terminal=(station.id==='rivergate'&&track==='B')||(station.id==='airport'&&track==='A');
 for(const u of [-13,0,13])for(const v of [4.1,6.2,8.4]){
  const p=frame.toWorld(u,side*v);player.position.set(p.x,PLATFORM_Y,p.z);
  const platform=metro.platformAt(player.position),b=metro.boardable(player.position);
  assert.equal(platform.station.id,station.id);assert.equal(platform.platform,track==='A'?1:2);assert.equal(platform.terminates,terminal);
  assert.equal(b?.train,0,station.id+' '+track+' boarding visible across platform at '+u+','+v);assert.equal(b.terminates,terminal);
 }
 if(!terminal){const b=metro.boardable(player.position);assert.ok(metro.board(0,b.stops[0].id));assert.ok(metro.alight(),'can step back onto same platform');}
 else assert.equal(metro.board(0,track==='A'?'rivergate':'airport'),false,'arrival-only terminal still rejects boarding');
 const edge=frame.toWorld(19,side*6);player.position.set(edge.x,PLATFORM_Y,edge.z);assert.equal(metro.boardable(player.position),null,'not beside this car');assert.ok(metro.platformAt(player.position),'guidance still available beyond car');
 const road=frame.toWorld(0,side*6);player.position.set(road.x,0,road.z);assert.equal(metro.platformAt(player.position),null,'no elevated platform action from road');
 player.position.y=PLATFORM_Y;metro.trains[0].doorOpen=.4;assert.equal(metro.boardable(player.position),null,'closed or partly opening door remains unavailable');
 metro.trains[0].doorOpen=1;metro.trains[0].state.speed=1;assert.equal(metro.boardable(player.position),null,'moving trains remain unavailable');
}

// Game wiring.
const html=await readFile(file('index.html'),'utf8');
for(const re of [/createMetroWorld\(\{scene,visualKit,obstacles,mobile:mobileGraphics,player:\(\)=>player,/,/const metroFloor=globalThis\.metroWorld\?\.floorAt\(x,z,referenceY\)/,/const metroStep=globalThis\.metroWorld\?\.walk\(player\.position,x,z\)/,
  /coastWorld\.isRiding\?\.\(\)\|\|globalThis\.metroWorld\?\.isRiding\(\)\)return;const touch/,/globalThis\.metroWorld\?\.update\(dt,\{position:player\.position\}\);if\(globalThis\.metroWorld\?\.isRiding\(\)\)metroWorld\.carry\(player\)/,/if\(globalThis\.metroWorld\?\.isRiding\(\)\)\{metroCamera\(dt\);return;\}/,
  /window\.openMetroBoard=function/,/window\.boardMetro=function/,/window\.openMetroRide=function/,/setCityDestination\(\\'metro\\'\)/,/globalThis\.metroWorld\?\.safePoint\(player\.position\)/])assert.match(html,re);
const north=await readFile(file('assets/north-world.js'),'utf8');assert.match(north,/ENTRANCE\.hole/);
console.log('metro ok',Math.round(TIMETABLE.cycle),'s cycle,',metro.columns.length,'columns');
