import * as THREE from 'three';
import {AIRPORT} from './world-rules.js';
import {AIRPLANE_FLEET} from './airplanes/fleet.js';
import {createAirplaneLibrary,flashLights} from './air-traffic.js';

// Arrivals and departures at Northstar Airport. One aircraft moves at a time (the
// runway and taxiways are never shared): arrivals fly a 3-degree glide path onto
// runway 27, flare, touch down, slow down, leave the runway at the middle exit and taxi
// nose-in to a free stand that fits their wingspan. Departures push back, taxi to the
// east end, line up, take off westbound and turn north before the downtown skyline.
// Parked planes wait at the stands. All timing uses play time (dt), and the airport
// only runs while the player is within OPS_RANGE of it (models load on first visit).
export const OPS_RANGE=2400,OPS_GAP=45,GLIDE=Math.tan(3*Math.PI/180);
export const AIRPORT_CENTRE=Object.freeze({x:1500,z:-2400});
const R=AIRPORT.runway,TW=AIRPORT.taxiway,TL=AIRPORT.taxilane,D2R=Math.PI/180;

// Round the corners of a 2D polyline with arcs of radius r, sampled every `step` metres.
export function smoothCorners(points,r=30,step=4){
  const out=[points[0]];
  for(let i=1;i<points.length-1;i++){const [a,b,c]=[points[i-1],points[i],points[i+1]];
    const ux=a[0]-b[0],uz=a[1]-b[1],vx=c[0]-b[0],vz=c[1]-b[1],lu=Math.hypot(ux,uz),lv=Math.hypot(vx,vz);
    const cos=(ux*vx+uz*vz)/(lu*lv),angle=Math.acos(Math.max(-1,Math.min(1,cos)));if(angle>Math.PI-1e-3||lu<1e-6||lv<1e-6){out.push(b);continue;}
    const t=Math.min(r/Math.tan(angle/2),lu*.45,lv*.45),p0=[b[0]+ux/lu*t,b[1]+uz/lu*t],p1=[b[0]+vx/lv*t,b[1]+vz/lv*t];
    const n=Math.max(2,Math.ceil(t*(Math.PI-angle)/step));// quadratic Bezier through the corner is close to an arc
    for(let k=0;k<=n;k++){const s=k/n,q=1-s;out.push([q*q*p0[0]+2*q*s*b[0]+s*s*p1[0],q*q*p0[1]+2*q*s*b[1]+s*s*p1[1]]);}}
  out.push(points.at(-1));return out;}

// A motion is a list of nodes {x,y,z,v,pitch,reverse,hold}; speed changes linearly with
// distance between nodes (constant acceleration), `hold` waits at a node in seconds.
export function createMotion(input){
  // Starting from or stopping at rest happens over the last/first 20 m of a segment, not all of it.
  const nodes=[];for(let i=0;i<input.length;i++){const n=input[i],m=input[i+1];nodes.push(n);if(!m)continue;const L=Math.hypot(m.x-n.x,m.y-n.y,m.z-n.z);
    if(L>30&&n.v<.5&&m.v>=.5){const f=20/L;nodes.push({...m,x:n.x+(m.x-n.x)*f,y:n.y+(m.y-n.y)*f,z:n.z+(m.z-n.z)*f,hold:0,pitch:n.pitch});}
    else if(L>30&&m.v<.5&&n.v>=.5){const f=1-20/L;nodes.push({...n,x:n.x+(m.x-n.x)*f,y:n.y+(m.y-n.y)*f,z:n.z+(m.z-n.z)*f,hold:0});}}
  const segs=[];let time=0;
  for(let i=0;i<nodes.length;i++){const n=nodes[i];if(n.hold){segs.push({hold:true,a:n,b:n,t0:time,dur:n.hold});time+=n.hold;}
    if(i===nodes.length-1)break;const m=nodes[i+1],L=Math.hypot(m.x-n.x,m.y-n.y,m.z-n.z);if(L<1e-6)continue;
    const v0=Math.max(n.v,0),v1=Math.max(m.v,0),avg=Math.max((v0+v1)/2,.05),dur=L/avg;segs.push({a:n,b:m,L,v0,v1,acc:(v1*v1-v0*v0)/(2*L),t0:time,dur});time+=dur;}
  return {nodes,segs,duration:time};}
export function sampleMotion(m,t){
  t=Math.max(0,Math.min(t,m.duration));let s=m.segs.find(q=>t<=q.t0+q.dur)||m.segs.at(-1);
  const a=s.a,b=s.b,tau=t-s.t0;let f=0;
  if(!s.hold)f=Math.max(0,Math.min(1,(s.v0*tau+.5*s.acc*tau*tau)/s.L));
  // direction of travel for heading
  const seg=s.hold?(m.segs[m.segs.indexOf(s)+1]&&!m.segs[m.segs.indexOf(s)+1].hold?m.segs[m.segs.indexOf(s)+1]:m.segs[Math.max(0,m.segs.indexOf(s)-1)]):s;
  const dx=seg.b.x-seg.a.x,dz=seg.b.z-seg.a.z,reverse=!!(s.hold?seg.a.reverse&&seg.b.reverse:b.reverse);
  return {x:a.x+(b.x-a.x)*f,y:a.y+(b.y-a.y)*f,z:a.z+(b.z-a.z)*f,yaw:Math.atan2(reverse?-dx:dx,reverse?-dz:dz),
    pitch:((a.pitch||0)+((b.pitch||0)-(a.pitch||0))*f)*D2R,speed:s.hold?0:s.v0+(s.v1-s.v0)*f,done:t>=m.duration,airborne:Math.min(a.y,b.y)>.5||(a.y+(b.y-a.y)*f)>.5};}

const taxiNodes=(points,v,{r=30,last=null}={})=>smoothCorners(points,r).map((p,i,all)=>({x:p[0],y:0,z:p[1],v:i===all.length-1&&last!==null?last:v}));
export function standCentreZ(plane){return AIRPORT.standNoseZ-plane.length/2;}

// Arrival: final approach from 5.2 km east, touchdown, rollout, exit, taxi, park.
export function arrivalMotion(plane,stand){
  const air=[[R.threshold+5200,15+5200*GLIDE,78,2],[R.threshold+1500,15+1500*GLIDE,74,2],[R.threshold,15,72,2.5],[R.touchdown+60,2,69,4],[R.touchdown,0,67,4],[R.touchdown-200,0,52,0],[1995,0,14,0]]
    .map(([x,y,v,pitch])=>({x,y,z:R.z,v,pitch}));
  const cz=standCentreZ(plane),taxi=taxiNodes([[1995,R.z],[1900,R.z],[1900,TW.z],[AIRPORT.apronLink,TW.z],[AIRPORT.apronLink,TL.z],[stand.x,TL.z],[stand.x,cz]],9,{r:32});
  taxi[0].v=14;const n=taxi.length;for(let i=Math.max(1,n-6);i<n;i++)taxi[i].v=2.5;taxi[n-1].v=0;
  return createMotion([...air,...taxi.slice(1)]);}
// Departure: push back, taxi to the east end, line up, take off westbound, turn north.
export function departureMotion(plane,stand){
  const cz=standCentreZ(plane),push=smoothCorners([[stand.x,cz],[stand.x,TL.z+30],[stand.x-40,TL.z]],28).map((p,i,all)=>({x:p[0],y:0,z:p[1],v:i===0||i===all.length-1?0:1.6,reverse:true}));
  push[0].hold=4;push.at(-1).hold=8;
  const taxi=taxiNodes([[stand.x-40,TL.z],[AIRPORT.apronLink,TL.z],[AIRPORT.apronLink,TW.z],[2640,TW.z],[2640,R.z+20]],9,{r:32,last:0});taxi[0].v=0;taxi.at(-1).hold=8;
  const line=taxiNodes([[2640,R.z+20],[2640,R.z],[2580,R.z]],4,{r:18,last:0});line.at(-1).hold=5;line.at(-1).v=0;
  const roll=[[1640,0,72,0],[1520,0,78,9],[1380,12,80,12],[1000,62,84,12],[700,104,88,11]].map(([x,y,v,pitch])=>({x,y,z:R.z,v,pitch}));
  const climb=new THREE.CatmullRomCurve3([[700,104,R.z],[600,135,R.z-40],[540,170,R.z-130],[500,215,R.z-260],[440,280,R.z-500],[300,380,R.z-1000],[100,480,R.z-1700]].map(p=>new THREE.Vector3(...p))).getPoints(40).slice(1)
    .map((p,i,all)=>({x:p.x,y:p.y,z:p.z,v:88+7*i/all.length,pitch:10}));
  return createMotion([...push,...taxi.slice(1),...line.slice(1),...roll,...climb]);}

export function createAirportOps({scene,fleet=AIRPLANE_FLEET,library=createAirplaneLibrary(),random=Math.random,gap=OPS_GAP,range=OPS_RANGE,onEvent=()=>{}}={}){
  const group=new THREE.Group();group.name='Airport operations';scene.add(group);
  const stands=AIRPORT.stands.map(s=>({...s,plane:null,object:null}));
  const state={active:null,pending:false,clock:gap-15,started:false,movements:0,arrivals:0,departures:0,next:'arrival',time:0,failures:0};
  const fits=(plane,stand)=>plane.span<=stand.maxSpan;
  const place=(object,plane,p)=>{object.position.set(p.x,p.y-plane.gear,p.z);object.rotation.set(-p.pitch,p.yaw,p.roll||0,'YXZ');};
  async function park(stand,plane){stand.plane=plane;const object=await library.instance(plane);stand.object=object;
    place(object,plane,{x:stand.x,y:0,z:standCentreZ(plane),yaw:0,pitch:0});object.userData.lights.beacon.visible=object.userData.lights.strobe.visible=false;group.add(object);return object;}
  // First visit: three planes already at the gates.
  async function start(){if(state.started)return;state.started=true;const initial=[['A2','grove-express'],['A4','northstar-air'],['B1','ronda-skyways']];
    await Promise.all(initial.map(([id,pid])=>{const stand=stands.find(s=>s.id===id),plane=fleet.find(p=>p.id===pid)||fleet[0];return fits(plane,stand)?park(stand,plane).catch(()=>{stand.plane=null;}):null;}));}
  function chooseArrival(){const free=stands.filter(s=>!s.plane);if(!free.length)return null;const order=fleet.map((_,i)=>fleet[(state.arrivals+i)%fleet.length]);
    for(const plane of order){const stand=free.filter(s=>fits(plane,s)).sort((a,b)=>a.maxSpan-b.maxSpan)[0];if(stand)return {plane,stand};}return null;}
  async function begin(kind){
    state.pending=true;
    try{if(kind==='arrival'){const pick=chooseArrival();if(!pick)return false;pick.stand.plane=pick.plane;const object=await library.instance(pick.plane);
        state.active={kind,plane:pick.plane,stand:pick.stand,object,motion:arrivalMotion(pick.plane,pick.stand),t:0,lastYaw:null};state.arrivals++;}
      else{const parked=stands.filter(s=>s.object);if(!parked.length)return false;const stand=parked[state.departures%parked.length],object=stand.object;
        stand.object=null;state.active={kind,plane:stand.plane,stand,object,motion:departureMotion(stand.plane,stand),t:0,lastYaw:null};stand.plane=null;state.departures++;}
      const a=state.active;group.add(a.object);update(0,{});state.movements++;onEvent({kind,plane:a.plane,stand:a.stand});return true;}
    catch(error){state.failures++;console.warn('Airport movement unavailable',error);return false;}
    finally{state.pending=false;}}
  function update(dt,{position}={}){
    dt=Number.isFinite(dt)&&dt>0?Math.min(dt,.25):0;state.time+=dt;
    const near=position?Math.hypot(position.x-AIRPORT_CENTRE.x,position.z-AIRPORT_CENTRE.z)<range:false;
    if(near&&!state.started)start();
    const a=state.active;
    if(a){a.t+=dt;const p=sampleMotion(a.motion,a.t),yawRate=a.lastYaw===null||dt<=0?0:Math.atan2(Math.sin(p.yaw-a.lastYaw),Math.cos(p.yaw-a.lastYaw))/dt;a.lastYaw=p.yaw;
      p.roll=p.airborne?Math.max(-.44,Math.min(.44,Math.atan(p.speed*yawRate/9.81))):0;a.roll=(a.roll??0)+(p.roll-(a.roll??0))*Math.min(1,dt*1.5);p.roll=a.roll;place(a.object,a.plane,p);a.sample=p;
      const L=a.object.userData.lights;flashLights(L,state.time);if(!p.airborne&&p.speed<20)L.strobe.visible=false;
      if(p.done){if(a.kind==='arrival'){a.stand.object=a.object;L.beacon.visible=L.strobe.visible=false;}else group.remove(a.object);state.active=null;state.clock=0;state.next=a.kind==='arrival'?'departure':'arrival';}}
    else if(near&&state.started&&!state.pending){state.clock+=dt;if(state.clock>=gap){state.clock=0;const kind=state.next;begin(kind).then(ok=>{if(!ok){state.next=kind==='arrival'?'departure':'arrival';state.clock=gap*.8;}});}}}
  const v=new THREE.Vector3();
  function sound(camera){const a=state.active;if(!a||!camera||!a.sample)return {level:0,pan:0};v.copy(a.object.position);const d=v.distanceTo(camera.position);v.applyMatrix4(camera.matrixWorldInverse);
    const power=a.sample.airborne?1:Math.min(1,.35+a.sample.speed/60);return {level:Math.pow(Math.max(0,1-d/2200),2)*power,pan:Math.max(-1,Math.min(1,v.x/Math.max(1,Math.hypot(v.x,v.z))))};}
  return {group,state,stands,update,sound,begin,start,library,get busy(){return !!state.active;}};
}
