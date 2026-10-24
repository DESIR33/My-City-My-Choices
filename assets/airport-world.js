import * as THREE from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {MeshoptDecoder} from 'three/addons/libs/meshopt_decoder.module.js';
import {AIRPORT,airportInside} from './world-rules.js';
import {AIRPORT_MODELS} from './airport/models.js';

// Northstar Airport, north-east of Northstar City. Landside: an access road from
// Northstar's last street, a loop road with a terminal curb, a parking lot and a plaza
// with the arched landmark building. The terminal exterior is the owner's terminal
// model; walking in through the main doors shows a departures hall (check-in islands,
// departures board, information desk, café and newsstand), a gate corridor with
// security and two pairs of moving walkways, and a gate lounge whose glass wall looks
// over the apron. Airside (fenced, seen but not walked): runway 09/27 with markings and
// lights, a parallel taxiway, an apron with six stands and jet bridges, the control
// tower, hangars, a fire station, a fuel farm and a windsock. The models stream in when
// the player first comes within MODEL_RANGE; plain stand-ins show until then.
export const MODEL_RANGE=2400,BELT_SPEED=.65;
export const AIRPORT_PLACES=Object.freeze({
  board:{x:1150,z:-2052,r:10,name:'Departures board'},window:{x:1150,z:-2146,r:9,name:'Plane-spotting window'},
  info:{x:1150,z:-2012,r:6,name:'Information desk'},belt:{x:1150,z:-2092,r:7,name:'Moving walkway'},
  landmark:{x:958,z:-1834,r:26,name:'Skyview landmark'}});
export const AIRPORT_FACTS=Object.freeze({
  board:'A departures board lists every flight: the time it leaves, the flight number, where it goes, the gate and its status. Boarding usually starts about 30 minutes before take-off, so travellers plan to reach the gate early.',
  window:'Jets land on a gentle 3-degree slope at about 250 km/h, touch down near the big white aiming marks and need around 1.5 km of runway to slow down. Pilots land into the wind because it makes the plane slower over the ground.',
  info:'Hundreds of people work at an airport: pilots, air traffic controllers in the tower, mechanics in the hangars, baggage handlers, security officers, gate agents, fire-fighters and café staff. Many of these jobs need special training.',
  belt:'A moving walkway carries you at about 0.65 metres per second, about half a slow walk. Walk on it and the speeds add up, so you reach the gate sooner.',
  landmark:'This arched building with a round top is built in a 1960s "space age" style, when air travel felt like the future. Its old control tower stands beside it.'});
export const AIRPORT_THINK=Object.freeze({
  board:{question:'Flight NA 214 leaves at 3:40 PM and boarding starts 30 minutes before. When should you be at the gate?',answer:'3:40 − 0:30 = 3:10 PM.'},
  window:{question:'A plane lands at 70 metres per second. How far does it travel in 10 seconds?',answer:'70 × 10 = 700 metres.'},
  info:{question:'A plane ticket costs $180. If you save $45 every week, how many weeks until you can buy it?',answer:'180 ÷ 45 = 4 weeks.'},
  belt:{question:'You walk 1.4 m/s on a walkway moving 0.65 m/s. How fast are you going?',answer:'1.4 + 0.65 = 2.05 metres per second.'},
  landmark:{question:'The old tower is about 80 m tall and one floor of a building is about 4 m. About how many floors tall is it?',answer:'80 ÷ 4 = 20 floors.'}});
// Moving walkways in the gate corridor: two in a row each way. dir -1 heads to the gates (north).
export const TRAVELATORS=Object.freeze([-2072,-2090,-2108].flatMap(z=>[{x:1146,z,dir:-1},{x:1154,z,dir:1}]).map(Object.freeze));
const BELT={length:13.4,width:1.0};
export function travelatorAt(p){for(const t of TRAVELATORS)if(Math.abs(p.x-t.x)<BELT.width/2&&Math.abs(p.z-t.z)<BELT.length/2)return t;return null;}

const FLIGHTS=[['NA 214','New York','A2'],['MA 108','Toronto','A1'],['SA 377','Miami','A3'],['RS 902','Málaga','B1'],['GE 455','Chicago','A1'],['RA 630','Tokyo','A4'],['NA 721','London','B2'],['SA 119','Mexico City','A3'],['MA 560','Vancouver','A2']];
export function departuresBoard(hour){const base=Math.floor(((hour%24)+24)%24*60/15)*15;return FLIGHTS.slice(0,8).map(([flight,to,gate],i)=>{const t=base+20+i*25,h=Math.floor(t/60)%24,m=t%60,clock=((h+11)%12+1)+':'+String(m).padStart(2,'0')+(h<12?' AM':' PM');
  const status=i===0?'Boarding':i===3?'Delayed 20 min':i===1?'Gate open':'On time';return {time:clock,flight,to,gate,status};});}

export function createAirportWorld({scene,visualKit,cube,C,obstacles,groundSurfaces,mobile=false,parkedCar=null,getHour=()=>12,loader=null,characters=null}){
  const A=AIRPORT,root=new THREE.Group();root.name='Northstar Airport';scene.add(root);
  // World-space boxes for camera collision and rain shelter (instanced batches are otherwise skipped).
  const cameraBoxes=[];root.userData.architectureBoxes=cameraBoxes;const camBox=(x,y,z,w,h,d)=>cameraBoxes.push({minX:x-w/2,maxX:x+w/2,minY:y,maxY:y+h,minZ:z-d/2,maxZ:z+d/2});
  const exterior=new THREE.Group();exterior.name='Airport terminal exterior';root.add(exterior);
  const interior=new THREE.Group();interior.name='Airport terminal interior';interior.visible=false;root.add(interior);
  const mat=(color,roughness=.7,metalness=0,extra={})=>new THREE.MeshStandardMaterial({color,roughness,metalness,...extra});
  const glow=(m,o)=>visualKit.atmosphere?.registerGlow?.(m,o);
  const M={white:mat(0xf1f1ec,.6),yellow:mat(0xf2c230,.6),red:mat(0xb3271f,.6),dark:mat(0x2c3136,.6),steel:mat(0x9aa3aa,.35,.7),concrete:mat(0xb9b6ae,.85),cream:mat(0xe9e3d6,.8),
    terrazzo:mat(0x8f897f,.3),inlay:mat(0x7d786f,.3),wall:mat(0xdcd8d0,.85),wallBase:mat(0x8e8a83,.6),ceiling:mat(0x8a6a4a,.75),column:mat(0xeeeeea,.5),glass:new THREE.MeshPhysicalMaterial({color:0x9fb8c4,roughness:.06,metalness:.1,transmission:0,transparent:true,opacity:.28,depthWrite:false}),
    mullion:mat(0x4a5258,.4,.6),desk:mat(0x6d7a84,.5,.2),deskTop:mat(0xe8e4dc,.4),belt:mat(0x1c1e20,.8),seat:mat(0x2f4f6e,.6),seatFrame:mat(0x8c949a,.35,.7),wood:mat(0x9b7653,.6),plant:mat(0x4d7a46,.8),
    orange:mat(0xe5732a,.6),blue:mat(0x2a63b8,.5),hangar:mat(0xc9ccd0,.55,.3),hangarRoof:mat(0x8f979e,.5,.5),fire:mat(0xc42c22,.5),tank:mat(0xe9eaea,.4,.3),grass:C.grass,
    light:mat(0xfff6e2,.4,0,{emissive:0xfff1d6,emissiveIntensity:.6}),cab:mat(0x9fd3e8,.2,.1,{emissive:0x9fd3e8,emissiveIntensity:.05}),probe:mat(0,1,0,{emissive:0xffffff})};
  glow(M.light,{day:.5,night:1.4});glow(M.cab,{day:.02,night:.9,color:0x9fd3e8});glow(M.probe,{day:0,night:1});
  const batches=new Map(),unit=new THREE.BoxGeometry(1,1,1);
  function box(material,x,y,z,w,h,d,ry=0,group=root){const key=group.uuid+material.uuid;if(!batches.has(key))batches.set(key,{material,group,list:[]});batches.get(key).list.push([x,y+h/2,z,w,h,d,ry]);}
  const ibox=(m,x,y,z,w,h,d,ry=0)=>box(m,x,y,z,w,h,d,ry,interior);
  const solid=(x,z,w,d,kind='airport',extra={})=>{const o={minX:x-w/2,maxX:x+w/2,minZ:z-d/2,maxZ:z+d/2,kind,airport:true,...extra};obstacles.push(o);return o;};
  const signTexture=(lines,{w=1024,h=256,bg='#13233a',fg='#ffffff',font=96,align='center'}={})=>{const c=document.createElement('canvas');c.width=w;c.height=h;const g=c.getContext('2d');g.fillStyle=bg;g.fillRect(0,0,w,h);g.fillStyle=fg;g.textAlign=align;g.textBaseline='middle';
    (Array.isArray(lines)?lines:[lines]).forEach((t,i,all)=>{g.font='bold '+font+'px Arial';g.fillText(t,align==='center'?w/2:40,h*(i+.5)/all.length,w-60);});const t=new THREE.CanvasTexture(c);t.colorSpace=THREE.SRGBColorSpace;t.anisotropy=4;return {texture:t,canvas:c,ctx:g};};
  function sign(text,x,y,z,w,h,ry=0,opts={},group=root){const {texture}=signTexture(text,opts);const m=new THREE.Mesh(new THREE.PlaneGeometry(w,h),new THREE.MeshStandardMaterial({map:texture,roughness:.6,emissive:0xffffff,emissiveMap:texture,emissiveIntensity:.35}));
    m.position.set(x,y,z);m.rotation.y=ry;group.add(m);return m;}
  const flatMark=(material,x,z,w,d,y=.03,ry=0)=>box(material,x,y,z,w,.012,d,ry);

  // ---------- ground ----------
  cube(root,2050,-.5,-2200,2300,.41,1000,C.grass,false);// x 900..3200, z -1700..-2700 (Northstar's grass covers west of 900)
  cube(root,1815,-.5,-2900,2770,.41,400,C.grass,false);// x 430..3200, z -2700..-3100
  // Open country around the airport so the ground never ends in view (approach and climb-out areas).
  cube(root,1500,-.52,-3650,4800,.41,1100,C.grass,false);cube(root,3800,-.52,-2400,1200,.41,1400,C.grass,false);
  const road=(x,z,w,d)=>cube(root,x,-.08,z,w,.1,d,C.road,false),pave=(x,z,w,d,y=-.06)=>cube(root,x,y,z,w,.1,d,C.walk,false);
  // Landside: access road, loop, curb, parking, sidewalks and plaza.
  road((A.road.x0+A.road.x1)/2,A.road.z,A.road.x1-A.road.x0,A.road.halfWidth*2);
  for(const x of [A.loop.west,A.loop.east])road(x,(A.road.z+A.loop.curb)/2,A.loop.halfWidth*2,A.road.z-A.loop.curb);
  road((A.loop.west+A.loop.east)/2,A.loop.curb,A.loop.east-A.loop.west+A.loop.halfWidth*2,A.loop.halfWidth*2);
  road((A.parking.minX+A.parking.maxX)/2,(A.parking.minZ+A.parking.maxZ)/2,A.parking.maxX-A.parking.minX,A.parking.maxZ-A.parking.minZ);
  pave((A.landside.minX+A.landside.maxX)/2,(A.landside.minZ+A.landside.maxZ)/2,A.landside.maxX-A.landside.minX,A.landside.maxZ-A.landside.minZ,-.09);pave(1150,-1977,A.loop.east-A.loop.west+30,16);pave(905,-1866,250,240,-.07);
  for(const s of [-1,1])pave((A.road.x0+A.road.x1)/2,A.road.z+s*(A.road.halfWidth+1),A.road.x1-A.road.x0,2);
  groundSurfaces?.push({minX:A.landside.minX,maxX:A.landside.maxX,minZ:A.landside.minZ,maxZ:A.landside.maxZ,top:0,kind:'concrete',airport:true});
  // Road paint and parking stalls.
  for(let x=A.road.x0+6;x<A.road.x1-10;x+=12)flatMark(M.white,x,A.road.z,6,.18,.0);
  for(let x=A.parking.minX+6;x<A.parking.maxX-3;x+=3)for(const z of [-1792,-1812,-1852,-1872,-1912,-1932])flatMark(M.white,x,z,.12,5,.0);
  flatMark(M.white,1150,A.loop.curb+A.loop.halfWidth-.4,190,.2,.0);for(let x=1060;x<1245;x+=8)flatMark(M.yellow,x,A.loop.curb+A.loop.halfWidth-1.2,4,.15,.0);
  // Curbside canopy and wayfinding.
  for(let x=1080;x<=1220;x+=20){box(M.steel,x,0,-1972,.5,6,.5);solid(x,-1972,.6,.6,'airport-column');}
  box(M.cream,1150,6,-1977,160,.6,14);camBox(1150,6,-1977,160,.6,14);box(M.light,1150,5.95,-1977,150,.08,10);
  sign('DEPARTURES  ✈  ALL GATES',1150,7.2,-1969.9,40,2.2,0,{bg:'#13233a',fg:'#ffffff'});
  sign('NORTHSTAR AIRPORT  ✈  →',262,4.2,-1741,14,2.2,0,{bg:'#0e5a3a'});box(M.steel,256,0,-1741.1,.3,3.6,.3);box(M.steel,268,0,-1741.1,.3,3.6,.3);
  for(let x=A.road.x0+30;x<A.road.x1;x+=45)for(const s of [-1,1]){const z=A.road.z+s*(A.road.halfWidth+1.5);box(M.steel,x,0,z,.22,8,.22);box(M.light,x,8,z-s*1,.5,.25,1.6);visualKit.atmosphere?.addStreetLight?.({x,y:8,z:z-s*1,groundY:.02});}
  // Parked cars in the lot (a few on phones).
  if(parkedCar){let n=0;for(const z of [-1802,-1862,-1922])for(let x=A.parking.minX+9;x<A.parking.maxX-6&&n<(mobile?6:18);x+=12){if(((x*7+z)|0)%3===0)continue;parkedCar(x,z,z<-1900?Math.PI:0);n++;}}
  // Plaza benches and planters around the landmark.
  for(const [x,z] of [[870,-1790],[950,-1790],[1010,-1830],[1010,-1930],[850,-1960]]){box(M.wood,x,.45,z,4,.12,1.2);box(M.seatFrame,x,0,z,3.6,.45,.2);solid(x,z,4,1.2,'airport-bench');}

  // ---------- landmark (owner's arched building and its old tower) ----------
  const L=A.landmark,lm={core:[L.x+43,L.z],tower:[L.x-81,L.z+18],feet:[[94,-3],[-8,3],[40,51],[40,-51]].map(([x,z])=>[L.x+x,L.z+z])};
  solid(lm.core[0],lm.core[1],42,42,'airport-landmark');solid(lm.tower[0],lm.tower[1],12,12,'airport-landmark');for(const [x,z] of lm.feet)solid(x,z,4,4,'airport-landmark');
  const landmarkStandIn=new THREE.Group();{const m=new THREE.Mesh(new THREE.CylinderGeometry(20,20,9,24),M.white);m.position.set(lm.core[0],4.5,lm.core[1]);landmarkStandIn.add(m);const t=new THREE.Mesh(new THREE.CylinderGeometry(4,4,62,12),M.white);t.position.set(lm.tower[0],31,lm.tower[1]);landmarkStandIn.add(t);}root.add(landmarkStandIn);

  // ---------- terminal stand-in (until the model streams in) ----------
  const T=A.terminal,standIn=new THREE.Group();standIn.name='Terminal stand-in';exterior.add(standIn);
  {const add=(m,x,y,z,w,h,d)=>{const o=new THREE.Mesh(unit,m);o.position.set(x,y+h/2,z);o.scale.set(w,h,d);standIn.add(o);};add(M.cream,1150,0,-2080,240,16,190);add(M.glass,1150,1,-1985.5,236,12,.4);add(M.steel,1150,16,-2080,246,1.5,196);add(M.hangar,1153,0,-2131,58,110,36);}

  // ---------- interior: departures hall, gate corridor, gate lounge ----------
  const H=A.hall,K=A.corridor,G=A.lounge;
  for(const r of [H,K,G]){ibox(M.terrazzo,(r.minX+r.maxX)/2,-.03,(r.minZ+r.maxZ)/2,r.maxX-r.minX,.04,r.maxZ-r.minZ);groundSurfaces?.push({minX:r.minX,maxX:r.maxX,minZ:r.minZ,maxZ:r.maxZ,top:0,kind:'tile',airport:true,inside:true});}
  const wall=(x0,z0,x1,z1,h,m=M.wall,t=.4)=>{const len=Math.hypot(x1-x0,z1-z0),along=Math.abs(x1-x0)>Math.abs(z1-z0);ibox(m,(x0+x1)/2,0,(z0+z1)/2,along?len:t,h,along?t:len);camBox((x0+x1)/2,0,(z0+z1)/2,along?len:t,h,along?t:len);ibox(M.wallBase,(x0+x1)/2,0,(z0+z1)/2,along?len:t+.06,1.2,along?t+.06:len);};
  for(const r of [H,G])for(let x=r.minX+12;x<r.maxX;x+=12)ibox(M.inlay,x,-.005,(r.minZ+r.maxZ)/2,.6,.012,r.maxZ-r.minZ);for(let z=K.minZ+6;z<K.maxZ;z+=6)ibox(M.inlay,1150,-.005,z,K.maxX-K.minX,.012,.5);
  for(const x of [1072,1128,1172,1228])for(const z of [-1998,-2054]){const c=new THREE.Mesh(new THREE.CylinderGeometry(.55,.55,14,16),M.column);c.position.set(x,7,z);interior.add(c);solid(x,z,1.2,1.2,'airport-column');}
  sign(['WELCOME TO NORTHSTAR'],1150,11,H.maxZ-.6,30,3,Math.PI,{bg:'#0e5a3a',font:110},interior);
  const glazing=(x0,x1,z,h,gap=null)=>{for(const [a,b] of gap?[[x0,gap[0]],[gap[1],x1]]:[[x0,x1]]){camBox((a+b)/2,0,z,b-a,h,.3);ibox(M.glass,(a+b)/2,0,z,b-a,h,.08);for(let x=a;x<=b+1e-6;x+=3)ibox(M.mullion,x,0,z,.14,h,.3);for(const y of [3.2,h*.6])ibox(M.mullion,(a+b)/2,y,z,b-a,.12,.25);}};
  // Hall: 14 m high, glass landside facade with the entrance, check-in islands.
  glazing(H.minX,H.maxX,H.maxZ,14,[A.entrance.minX,A.entrance.maxX]);ibox(M.mullion,1150,4.2,H.maxZ,A.entrance.maxX-A.entrance.minX,.4,.4);ibox(M.glass,1150,4.6,H.maxZ,A.entrance.maxX-A.entrance.minX,9.4,.08);
  for(const x of [A.entrance.minX,A.entrance.maxX]){solid(x,H.maxZ,.6,1.2,'airport-wall');ibox(M.mullion,x,0,H.maxZ,.5,4.2,.6);}
  solid((H.minX+A.entrance.minX)/2,H.maxZ,A.entrance.minX-H.minX,1.2,'airport-wall');solid((A.entrance.maxX+H.maxX)/2,H.maxZ,H.maxX-A.entrance.maxX,1.2,'airport-wall');
  wall(H.minX,H.minZ,H.minX,H.maxZ,14);wall(H.maxX,H.minZ,H.maxX,H.maxZ,14);wall(H.minX,H.minZ,K.minX,H.minZ,14);wall(K.maxX,H.minZ,H.maxX,H.minZ,14);ibox(M.wall,1150,6,H.minZ,K.maxX-K.minX,8,.4);
  ibox(M.ceiling,(H.minX+H.maxX)/2,14,(H.minZ+H.maxZ)/2,H.maxX-H.minX,.4,H.maxZ-H.minZ);for(const r of [[H,14],[K,6],[G,8]])camBox((r[0].minX+r[0].maxX)/2,r[1],(r[0].minZ+r[0].maxZ)/2,r[0].maxX-r[0].minX+1,.5,r[0].maxZ-r[0].minZ+1);for(let z=H.minZ+6;z<H.maxZ;z+=9)ibox(M.light,(H.minX+H.maxX)/2,13.9,z,H.maxX-H.minX-8,.06,1.4);
  for(const [x,letter,first] of [[1084,'A',1],[1110,'B',13],[1190,'C',25],[1216,'D',37]]){ibox(M.desk,x,0,-2028,3.2,2.3,40);ibox(M.belt,x,.55,-2028,1.2,.08,40);solid(x,-2028,8.6,41,'airport-checkin');
    for(const s of [-1,1])for(let z=-2004;z>=-2012;z-=4){ibox(M.steel,x+s*5.6,0,z,.08,1,.08);}for(const s of [-1,1])ibox(M.blue,x+s*5.6,.85,-2008,.04,.06,8);
    for(let i=0;i<6;i++)for(const s of [-1,1]){const z=-2045+i*6.8;ibox(M.desk,x+s*2.9,0,z,1.4,1.05,2.6);ibox(M.deskTop,x+s*2.9,1.05,z,1.6,.06,2.8);ibox(M.dark,x+s*2.3,1.1,z,.08,.5,.7);}
    sign('CHECK-IN '+letter+'  '+first+'–'+(first+11),x,6.2,-2008,9,1.5,0,{bg:'#13233a'},interior);sign('CHECK-IN '+letter+'  '+first+'–'+(first+11),x,6.2,-2048,9,1.5,Math.PI,{bg:'#13233a'},interior);for(const z of [-2008,-2048])ibox(M.steel,x,7,z,.1,7,.1);}
  // Luggage trolleys by the entrance.
  for(let i=0;i<8;i++){const x=1130+i*1.4;ibox(M.steel,x,.3,-1990,1,.06,1.8);ibox(M.steel,x,.3,-1990.9,1,.9,.06);}solid(1135,-1990,12,2.2,'airport-trolleys');
  // Departures board above the corridor opening, updated with the city clock.
  const board=signTexture(['DEPARTURES'],{w:2048,h:1024,bg:'#0b1726',font:90}),boardMesh=new THREE.Mesh(new THREE.PlaneGeometry(22,11),new THREE.MeshStandardMaterial({map:board.texture,emissive:0xffffff,emissiveMap:board.texture,emissiveIntensity:.55,roughness:.5}));
  boardMesh.position.set(1150,9.6,H.minZ+.3);interior.add(boardMesh);ibox(M.dark,1150,3.9,H.minZ+.15,23,11.4,.2);
  let boardMinute=-1;function drawBoard(hour){const g=board.ctx,W=2048;g.fillStyle='#0b1726';g.fillRect(0,0,W,1024);g.fillStyle='#ffd34d';g.font='bold 92px Arial';g.textAlign='left';g.fillText('✈ DEPARTURES',50,90);
    g.font='bold 54px Arial';g.fillStyle='#9fb4c8';[['TIME',50],['FLIGHT',380],['TO',700],['GATE',1300],['STATUS',1500]].forEach(([t,x])=>g.fillText(t,x,190));
    departuresBoard(hour).forEach((f,i)=>{const y=280+i*92;g.fillStyle=i%2?'#122238':'#0f1d30';g.fillRect(30,y-45,W-60,88);g.fillStyle='#ffffff';g.font='bold 62px Arial';g.fillText(f.time,50,y);g.fillText(f.flight,380,y);g.fillText(f.to,700,y);g.fillText(f.gate,1300,y);
      g.fillStyle=f.status==='Boarding'?'#7dff9a':f.status.startsWith('Delayed')?'#ff8a6a':'#ffd34d';g.fillText(f.status,1500,y);});board.texture.needsUpdate=true;}
  drawBoard(getHour());
  // Information desk, café and newsstand.
  {const desk=new THREE.Mesh(new THREE.CylinderGeometry(3,3,1.1,24),M.desk);desk.position.set(1150,.55,-2018);interior.add(desk);const top=new THREE.Mesh(new THREE.CylinderGeometry(3.2,3.2,.08,24),M.deskTop);top.position.set(1150,1.12,-2018);interior.add(top);solid(1150,-2018,6.4,6.4,'airport-info');
    sign('i  INFORMATION',1150,3.3,-2018,6,1.1,0,{bg:'#1f6f4a'},interior);ibox(M.steel,1150,1.1,-2018,.12,1.7,.12);}
  for(const [x,name,color] of [[1072,'SKY CAFÉ','#7a3b1d'],[1228,'NEWSSTAND','#1c3f6e']]){ibox(M.wood,x,0,-2044,12,3.2,22);ibox(M.cream,x,3.2,-2044,12.4,.4,22.4);solid(x,-2044,12,22,'airport-shop');sign(name,x+(x<1150?6.05:-6.05),4.3,-2044,10,1.4,x<1150?Math.PI/2:-Math.PI/2,{bg:color},interior);}
  const seatRows=[];const seats=(x0,x1,z,facing)=>{for(let x=x0;x<=x1;x+=.62)seatRows.push([x,z,facing]);solid((x0+x1)/2,z,x1-x0+.8,.9,'airport-seats');};
  seats(1074,1086,-1996,0);seats(1074,1086,-1999,Math.PI);seats(1214,1226,-1996,0);seats(1214,1226,-1999,Math.PI);
  // Gate corridor: security frame, walls with ads, moving walkways.
  wall(K.minX,K.minZ,K.minX,K.maxZ,6);wall(K.maxX,K.minZ,K.maxX,K.maxZ,6);ibox(M.ceiling,1150,6,(K.minZ+K.maxZ)/2,K.maxX-K.minX,.3,K.maxZ-K.minZ);for(let z=K.minZ+4;z<K.maxZ;z+=6)ibox(M.light,1150,5.9,z,8,.06,1);
  for(const x of [1140,1160]){ibox(M.steel,x,0,-2066,.3,2.6,.6);}ibox(M.steel,1150,2.6,-2066,20.6,.3,.6);sign('SECURITY  ·  GATES A1–A4  B1–B2  →',1150,4.2,-2066,18,1.2,Math.PI,{bg:'#13233a'},interior);
  for(const z of [-2075,-2100])for(const [x,ry] of [[K.minX+.25,Math.PI/2],[K.maxX-.25,-Math.PI/2]])sign(z===-2075?['SAVE FOR YOUR','NEXT ADVENTURE']:['FLY · LEARN','EXPLORE'],x,2.4,z,6,3,ry,{bg:'#1f3d5c',h:512,font:80},interior);
  const beltTexture=(()=>{const c=document.createElement('canvas');c.width=64;c.height=256;const g=c.getContext('2d');g.fillStyle='#202326';g.fillRect(0,0,64,256);g.fillStyle='#3a3f44';for(let y=0;y<256;y+=16)g.fillRect(0,y,64,6);const t=new THREE.CanvasTexture(c);t.wrapS=t.wrapT=THREE.RepeatWrapping;t.repeat.set(1,BELT.length/1.2);return t;})();
  const beltMats=[1,-1].map(dir=>{const m=new THREE.MeshStandardMaterial({map:beltTexture.clone(),roughness:.8});m.map.needsUpdate=true;m.userData.dir=dir;return m;});
  const travelatorStandIns=[];for(const t of TRAVELATORS){const belt=new THREE.Mesh(new THREE.PlaneGeometry(BELT.width,BELT.length),beltMats[t.dir>0?0:1]);belt.rotation.x=-Math.PI/2;belt.position.set(t.x,.09,t.z);interior.add(belt);
    const base=new THREE.Mesh(unit,M.steel);base.scale.set(1.6,.08,13.9);base.position.set(t.x,.04,t.z);interior.add(base);travelatorStandIns.push(base);
    for(const s of [-1,1]){solid(t.x+s*.72,t.z,.18,13.4,'airport-travelator');}}
  sign('→ GATES',1146,3.6,-2066.5,3,.8,Math.PI,{bg:'#13233a',font:120},interior);
  // Gate lounge: glass wall over the apron, gate desks, seating.
  glazing(G.minX,G.maxX,G.minZ,8);wall(G.minX,G.minZ,G.minX,G.maxZ,8);wall(G.maxX,G.minZ,G.maxX,G.maxZ,8);wall(G.minX,G.maxZ,K.minX,G.maxZ,8);wall(K.maxX,G.maxZ,G.maxX,G.maxZ,8);
  ibox(M.ceiling,(G.minX+G.maxX)/2,8,(G.minZ+G.maxZ)/2,G.maxX-G.minX,.3,G.maxZ-G.minZ);for(let x=G.minX+6;x<G.maxX;x+=10)ibox(M.light,x,7.9,(G.minZ+G.maxZ)/2,1.2,.06,G.maxZ-G.minZ-4);
  for(const s of A.stands){const door=s.x+2;if(s.bridge){ibox(M.mullion,door,0,G.minZ+.2,3.6,3,.3);ibox(M.dark,door,0,G.minZ+.25,3,2.6,.2);}
    if(s.x>G.maxX-4)continue;ibox(M.desk,s.x-4,0,G.minZ+7,3.4,1.05,1.2);ibox(M.deskTop,s.x-4,1.05,G.minZ+7,3.6,.06,1.4);solid(s.x-4,G.minZ+7,3.6,1.4,'airport-gate-desk');
    sign('GATE '+s.id,s.x-4,4.4,G.minZ+7,4.4,1.3,0,{bg:'#13233a',font:130},interior);ibox(M.steel,s.x-4,1.1,G.minZ+7,.1,2.6,.1);}
  sign('BUS GATES  B1 · B2  →',G.maxX-10,4.4,G.maxZ-.4,10,1.2,Math.PI,{bg:'#13233a'},interior);
  for(const z of [-2130,-2134])for(const [x0,x1] of [[1044,1056],[1070,1110],[1128,1135],[1166,1172],[1188,1236],[1250,1262]])seats(x0,x1,z,z<-2132?Math.PI:0);
  for(const [x,z] of [[1046,-2124],[1262,-2124],[1066,-2056],[1234,-2056]]){ibox(M.cream,x,0,z,1.6,.9,1.6);const p=new THREE.Mesh(new THREE.IcosahedronGeometry(1.1,1),M.plant);p.position.set(x,1.7,z);interior.add(p);solid(x,z,1.6,1.6,'airport-planter');}
  // Seats are instanced: cushion and frame per seat.
  {const cushion=new THREE.InstancedMesh(new THREE.BoxGeometry(.56,.1,.5),M.seat,seatRows.length),back=new THREE.InstancedMesh(new THREE.BoxGeometry(.56,.55,.08),M.seat,seatRows.length),frame=new THREE.InstancedMesh(new THREE.BoxGeometry(.6,.42,.46),M.seatFrame,seatRows.length),o=new THREE.Object3D();
    seatRows.forEach(([x,z,ry],i)=>{o.rotation.set(0,ry,0);o.position.set(x,.47,z);o.updateMatrix();cushion.setMatrixAt(i,o.matrix);o.position.set(x-Math.sin(ry)*.21,.78,z-Math.cos(ry)*.21);o.updateMatrix();back.setMatrixAt(i,o.matrix);o.position.set(x,.21,z);o.updateMatrix();frame.setMatrixAt(i,o.matrix);});
    interior.add(cushion,back,frame);}

  // Travellers: queueing at check-in, reading the board, waiting at the gates (fewer on phones).
  if(characters?.create){const spots=[[1078.4,-2006,Math.PI],[1078.4,-2009,Math.PI],[1115.6,-2006,Math.PI],[1184.4,-2007,Math.PI],[1221.6,-2006,Math.PI],[1146,-2046,Math.PI],[1155,-2044,Math.PI],[1100,-2140,0],[1205,-2141,0],[1162,-2146,0],[1060,-2128,Math.PI/2],[1240,-2128,-Math.PI/2]];
    for(const [i,[x,z,turn]] of spots.entries()){if(mobile&&i%3)continue;characters.create({x,z,model:'crowd',turn,ambient:true});}}
  // ---------- airside: runway, taxiways, apron ----------
  const R=A.runway,TW=A.taxiway,TL=A.taxilane,AP=A.apron;
  cube(root,(R.x0+R.x1)/2,-.08,R.z,R.x1-R.x0+100,.12,R.halfWidth*2,C.road,false);
  cube(root,(TW.x0+TW.x1)/2,-.09,TW.z,TW.x1-TW.x0,.1,TW.halfWidth*2,C.road,false);
  for(const x of A.connectors)cube(root,x,-.095,(TW.z+R.z)/2,TW.halfWidth*2,.1,TW.z-R.z,C.road,false);
  cube(root,A.apronLink,-.095,(TL.z+TW.z)/2,TW.halfWidth*2,.1,TL.z-TW.z,C.road,false);
  cube(root,(AP.minX+AP.maxX)/2,-.1,(AP.minZ+AP.maxZ)/2,AP.maxX-AP.minX,.1,AP.maxZ-AP.minZ,C.walk,false);
  // Runway markings (white): centreline, edges, thresholds, aiming points, touchdown zones, numbers.
  const W=M.white,Y=M.yellow;for(let x=R.x0+70;x<R.x1-70;x+=50)flatMark(W,x,R.z,30,.9);
  for(const s of [-1,1])flatMark(W,(R.x0+R.x1)/2,R.z+s*(R.halfWidth-.9),R.x1-R.x0,.9);
  for(const [end,dir] of [[R.x1,-1],[R.x0,1]]){for(let i=0;i<8;i++)for(const s of [-1,1])flatMark(W,end+dir*21,R.z+s*(3+i*2.3),30,1.6);
    for(const s of [-1,1])flatMark(W,end+dir*420,R.z+s*7,45,6);for(const d of [150,300,600])for(const s of [-1,1])for(const k of [0,1.6])flatMark(W,end+dir*(d+20),R.z+s*(9+k*1.6),22,1);}
  for(const [text,x,ry] of [['27',R.x1-62,-Math.PI/2],['09',R.x0+62,Math.PI/2]]){const {texture}=signTexture(text,{w:256,h:512,bg:'rgba(0,0,0,0)',fg:'#f1f1ec',font:420});const m=new THREE.Mesh(new THREE.PlaneGeometry(18,36),new THREE.MeshStandardMaterial({map:texture,transparent:true,roughness:.7,polygonOffset:true,polygonOffsetFactor:-2}));m.rotation.set(-Math.PI/2,0,ry);m.position.set(x,.05,R.z);root.add(m);}
  // Taxiway paint (yellow): centrelines, holding positions, stand lead-in lines and stop bars.
  flatMark(Y,(TW.x0+TW.x1)/2,TW.z,TW.x1-TW.x0,.2);for(const x of A.connectors){flatMark(Y,x,(TW.z+R.z)/2,.2,TW.z-R.z);for(const [k,dz] of [[0,0],[1,1.2],[2,2.6],[3,3.8]])for(let i=-5;i<=5;i++)flatMark(Y,x+i*2,R.z+R.halfWidth+20+dz,k<2?1.6:.9,.2);}
  flatMark(Y,A.apronLink,(TL.z+TW.z)/2,.2,TL.z-TW.z);flatMark(Y,(TL.x0+TL.x1)/2,TL.z,TL.x1-TL.x0,.2);
  for(const s of A.stands){flatMark(Y,s.x,(TL.z+A.standNoseZ)/2,.2,A.standNoseZ-TL.z);flatMark(W,s.x,A.standNoseZ-1.5,6,.4);const {texture}=signTexture(s.id,{w:256,h:256,bg:'rgba(0,0,0,0)',fg:'#f2c230',font:200});const m=new THREE.Mesh(new THREE.PlaneGeometry(8,8),new THREE.MeshStandardMaterial({map:texture,transparent:true,polygonOffset:true,polygonOffsetFactor:-2}));m.rotation.set(-Math.PI/2,0,Math.PI);m.position.set(s.x,.04,TL.z+20);root.add(m);
    for(const k of [-1,1])flatMark(M.red,s.x+k*(s.maxSpan/2+3),(A.standNoseZ+TL.z)/2+30,.3,A.standNoseZ-TL.z-60);}
  // Jet bridges built for A1 and A4 (A2 and A3 use the terminal model's own bridges).
  for(const s of A.stands.filter(q=>q.bridge==='built')){const face=s.x<1110?-2198:-2171,door=[s.x+2.2,A.standNoseZ-6.5],start=[s.x+(s.x<1110?8:6),face],y=s.maxSpan>45?4.6:3.4;
    const dx=door[0]-start[0],dz=door[1]-start[1],len=Math.hypot(dx,dz),ry=Math.atan2(dx,dz);box(M.cream,(start[0]+door[0])/2,y,(start[1]+door[1])/2,3.2,3,len,ry);box(M.glass,(start[0]+door[0])/2,y+1.2,(start[1]+door[1])/2,3.25,.8,len-2,ry);
    box(M.dark,door[0],y-.2,door[1],4,3.6,3.4,ry);const leg=[start[0]+dx*.7,start[1]+dz*.7];box(M.steel,leg[0],0,leg[1],.5,y,.5);box(M.dark,leg[0],0,leg[1],2.6,.8,1.2,ry);const rot=new THREE.Mesh(new THREE.CylinderGeometry(2.4,2.4,y+3,16),M.cream);rot.position.set(start[0],(y+3)/2,start[1]);root.add(rot);}
  // Ground service vehicles at the gates.
  for(const s of A.stands){const z=A.standNoseZ-24;box(M.yellow,s.x-14,0,z,2.2,1.5,3.6);box(M.dark,s.x-14,1.5,z-.6,1.8,.9,1.6);for(let i=1;i<=3;i++){box(M.steel,s.x-14,.3,z-4.5*i,1.8,.9,3.2);box(M.blue,s.x-14,1.2,z-4.5*i,1.8,.8,3.2);}}
  box(M.white,1245+18,0,A.standNoseZ-40,2.6,3,9);box(M.red,1245+18,0,A.standNoseZ-35,2.6,2.4,2.4);
  // Apron flood-light masts.
  const lightHeads=[];for(const [x,z] of [[1010,-2440],[1200,-2445],[1390,-2445],[1495,-2300]]){box(M.steel,x,0,z,.8,26,.8);box(M.light,x,26,z,4,1,1.2);lightHeads.push([x,25.5,z]);}
  // Hangars, fire station, fuel farm, windsock.
  for(const x of [1880,2040]){const z=-2340;box(M.hangar,x,0,z,70,18,56);const roof=new THREE.Mesh(new THREE.CylinderGeometry(35,35,56,24,1,false,-Math.PI/2,Math.PI),M.hangarRoof);roof.rotation.x=Math.PI/2;roof.scale.set(1,1,.24);roof.position.set(x,18,z);root.add(roof);
    box(M.dark,x,0,z-28.1,60,16,.3);for(let i=0;i<6;i++)box(M.steel,x-25+i*10,0,z-28.3,.3,16,.3);}
  sign('NORTHSTAR MAINTENANCE',1960,20,-2367,40,4,Math.PI,{bg:'#13233a'});
  box(M.fire,2250,0,-2470,40,10,24);for(let i=0;i<3;i++)box(M.dark,2238+i*12,0,-2482.2,9,7,.3);sign('AIRPORT FIRE & RESCUE',2250,8.6,-2482.4,26,2,Math.PI,{bg:'#8a1c16'});
  for(let i=0;i<3;i++){const t=new THREE.Mesh(new THREE.CylinderGeometry(8,8,10,20),M.tank);t.position.set(2420+i*22,5,-2360);root.add(t);}
  const windsock=new THREE.Group();windsock.position.set(2380,0,-2650);root.add(windsock);{const pole=new THREE.Mesh(new THREE.CylinderGeometry(.1,.12,7,8),M.steel);pole.position.y=3.5;windsock.add(pole);
    const cone=new THREE.Mesh(new THREE.CylinderGeometry(.5,.18,3.6,12,1,true),M.orange);cone.rotation.z=Math.PI/2;cone.position.set(-1.8,6.8,0);const sock=new THREE.Group();sock.position.y=0;sock.add(cone);windsock.add(sock);windsock.userData.sock=sock;}
  // Control tower stand-in and base building.
  const towerStandIn=new THREE.Group();{const shaft=new THREE.Mesh(new THREE.CylinderGeometry(3.2,4,60,16),M.concrete);shaft.position.set(A.tower.x,30,A.tower.z);towerStandIn.add(shaft);const cab=new THREE.Mesh(new THREE.CylinderGeometry(8,6,8,16),M.cab);cab.position.set(A.tower.x,64,A.tower.z);towerStandIn.add(cab);}root.add(towerStandIn);
  box(M.cream,A.tower.x,0,A.tower.z+16,30,8,14);

  // ---------- perimeter fence ----------
  {const posts=[],panels=[],F={minX:470,maxX:3150,minZ:-3060,maxZ:-1995};const run=(x0,z0,x1,z1)=>{const len=Math.hypot(x1-x0,z1-z0),n=Math.ceil(len/8);for(let i=0;i<=n;i++)posts.push([x0+(x1-x0)*i/n,z0+(z1-z0)*i/n]);panels.push([(x0+x1)/2,(z0+z1)/2,len,Math.atan2(x1-x0,z1-z0)]);};
    run(F.minX,F.maxZ,1025,F.maxZ);run(1275,F.maxZ,F.maxX,F.maxZ);run(F.maxX,F.maxZ,F.maxX,F.minZ);run(F.maxX,F.minZ,F.minX,F.minZ);run(F.minX,F.minZ,F.minX,F.maxZ);
    const postMesh=new THREE.InstancedMesh(new THREE.CylinderGeometry(.05,.05,2.8,6),M.steel,posts.length),o=new THREE.Object3D();posts.forEach(([x,z],i)=>{o.position.set(x,1.4,z);o.updateMatrix();postMesh.setMatrixAt(i,o.matrix);});root.add(postMesh);
    const c=document.createElement('canvas');c.width=c.height=64;const g=c.getContext('2d');g.strokeStyle='rgba(190,198,204,.9)';g.lineWidth=2;for(let k=-64;k<128;k+=12){g.beginPath();g.moveTo(k,0);g.lineTo(k+64,64);g.stroke();g.beginPath();g.moveTo(k+64,0);g.lineTo(k,64);g.stroke();}
    const tex=new THREE.CanvasTexture(c);tex.wrapS=tex.wrapT=THREE.RepeatWrapping;for(const [x,z,len,ry] of panels){const t=tex.clone();t.needsUpdate=true;t.repeat.set(len/1.2,2.5/1.2);const m=new THREE.Mesh(new THREE.PlaneGeometry(len,2.5),new THREE.MeshStandardMaterial({map:t,transparent:true,alphaTest:.3,side:THREE.DoubleSide,roughness:.5,metalness:.6}));m.position.set(x,1.25,z);m.rotation.y=ry+Math.PI/2;root.add(m);}}

  // ---------- lights (screen-sized points; brighter at night) ----------
  const lightSets=[];const points=(list,color,size)=>{const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(list.flat(),3));const p=new THREE.Points(g,new THREE.PointsMaterial({color,size,sizeAttenuation:false,transparent:true,depthWrite:false}));p.frustumCulled=false;root.add(p);lightSets.push(p);return p;};
  {const edge=[],taxi=[],approach=[],thr=[],end=[],papi=[[],[]];
    for(let x=R.x0;x<=R.x1;x+=60)for(const s of [-1,1])edge.push([x,.4,R.z+s*(R.halfWidth+1.5)]);
    for(let i=-4;i<=4;i++){thr.push([R.x1+1,.4,R.z+i*5]);end.push([R.x0-1,.4,R.z+i*5]);}
    for(let x=R.x1+60;x<=R.x1+900;x+=30){for(let i=-2;i<=2;i++)approach.push([x,.8+(x-R.x1)*.004,R.z+i*1.5]);if(Math.abs(x-R.x1-300)<1)for(let i=-7;i<=7;i++)approach.push([x,1.8,R.z+i*2]);}
    for(let x=TW.x0;x<=TW.x1;x+=30)for(const s of [-1,1])taxi.push([x,.3,TW.z+s*(TW.halfWidth+.8)]);for(let x=TL.x0;x<=TL.x1;x+=30)for(const s of [-1,1])taxi.push([x,.3,TL.z+s*(TL.halfWidth+.8)]);
    for(const c of A.connectors)for(let z=R.z+R.halfWidth+3;z<TW.z-TW.halfWidth;z+=20)for(const s of [-1,1])taxi.push([c+s*(TW.halfWidth+.8),.3,z]);
    for(let i=0;i<4;i++)papi[i<2?1:0].push([R.touchdown,.6,R.z+R.halfWidth+10+i*9]);
    points(edge,0xfff3d6,3);points(taxi,0x3a7bff,3);points(approach,0xfff7e8,3.5);points(thr,0x3dff6e,4);points(end,0xff3b30,4);points(papi[0],0xffffff,4);points(papi[1],0xff3b30,4);
    points(lightHeads,0xfff4d8,6);points([[A.tower.x,73,A.tower.z]],0xff2a1f,4);points(lm.tower.length?[[lm.tower[0],81,lm.tower[1]]]:[],0xff2a1f,4);}

  // ---------- commit instanced boxes ----------
  const dummy=new THREE.Object3D(),meshes=[];
  for(const {material,group,list} of batches.values()){const mesh=new THREE.InstancedMesh(unit,material,list.length);list.forEach(([x,y,z,w,h,d,ry],i)=>{dummy.position.set(x,y,z);dummy.rotation.set(0,ry,0);dummy.scale.set(w,h,d);dummy.updateMatrix();mesh.setMatrixAt(i,dummy.matrix);});
    mesh.castShadow=!mobile&&group===root&&material!==M.white&&material!==M.yellow&&material!==M.red;mesh.receiveShadow=true;mesh.computeBoundingSphere();group.add(mesh);meshes.push(mesh);}

  // ---------- streamed models ----------
  const models={state:'idle',terminal:null,tower:null,landmark:null,travelators:[]};
  let loading=null;
  function loadModels(modelLoader){loading||=fetchModels(modelLoader);return loading;}
  async function fetchModels(modelLoader=loader||new GLTFLoader().setMeshoptDecoder(MeshoptDecoder)){
    models.state='loading';
    const get=async key=>{try{return (await modelLoader.loadAsync(AIRPORT_MODELS[key].url)).scene;}catch(error){console.warn('Airport model unavailable: '+key,error);return null;}};
    const [terminal,tower,landmark,travelator]=await Promise.all([get(mobile?'terminalMobile':'terminal'),get('tower'),get('landmark'),get('travelator')]);
    if(terminal){terminal.rotation.y=Math.PI/2;terminal.position.set(T.x,0,T.z);terminal.traverse(c=>{if(c.isMesh){c.castShadow=!mobile;c.receiveShadow=true;}});exterior.add(terminal);standIn.visible=false;models.terminal=terminal;}
    if(tower){tower.position.set(A.tower.x,0,A.tower.z);tower.traverse(c=>{if(c.isMesh){c.castShadow=!mobile;if(c.material?.name==='body'){c.material.map=null;c.material.color.setHex(0xc9c6bf);c.material.needsUpdate=true;}}});root.add(tower);towerStandIn.visible=false;models.tower=tower;}
    if(landmark){landmark.position.set(L.x,0,L.z);landmark.traverse(c=>{if(c.isMesh)c.castShadow=!mobile;});root.add(landmark);landmarkStandIn.visible=false;models.landmark=landmark;}
    if(travelator)for(const [i,t] of TRAVELATORS.entries()){const m=travelator.clone();m.position.set(t.x,0,t.z);if(t.dir>0)m.rotation.y=Math.PI;interior.add(m);models.travelators.push(m);travelatorStandIns[i].visible=false;}
    models.state='ready';return models;}

  let inside=false,time=0;
  function update(dt,{position}={}){dt=Number.isFinite(dt)?Math.max(0,Math.min(dt,.25)):0;time+=dt;
    if(position){if(models.state==='idle'&&Math.hypot(position.x-1500,position.z+2400)<MODEL_RANGE)loadModels();
      const now=airportInside(position.x,position.z,.2);if(now!==inside){inside=now;interior.visible=inside;exterior.visible=!inside;}}
    if(interior.visible){for(const m of beltMats)m.map.offset.y+=m.userData.dir*dt*BELT_SPEED/1.2;
      const minute=Math.floor(getHour()*60);if(minute!==boardMinute){boardMinute=minute;drawBoard(getHour());}}
    windsock.userData.sock.rotation.y=Math.sin(time*.3)*.35+.6;windsock.userData.sock.children[0].rotation.x=Math.sin(time*2.1)*.06;
    const night=M.probe.emissiveIntensity??0;for(const p of lightSets)p.material.opacity=.35+.65*night;}
  // Moving-walkway velocity under a walking player (m/s), or null.
  function conveyor(p){const t=travelatorAt(p);return t?{x:0,z:t.dir*BELT_SPEED}:null;}
  function nearestLandmark(p){let best=null,dist=Infinity;for(const [id,s] of Object.entries(AIRPORT_PLACES)){const d=Math.hypot(p.x-s.x,p.z-s.z);if(d<s.r&&d<dist){dist=d;best={id,name:s.name,x:s.x,z:s.z,fact:AIRPORT_FACTS[id],think:AIRPORT_THINK[id]};}}return best;}
  return {root,interior,exterior,models,loadModels,update,conveyor,nearestLandmark,places:AIRPORT_PLACES,get inside(){return inside;},batches:meshes,board:{draw:drawBoard,mesh:boardMesh},lights:lightSets};
}
