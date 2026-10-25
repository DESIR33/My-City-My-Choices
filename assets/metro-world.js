// Northstar Metro, the Red Line: an elevated light-rail line with seven stations, a big
// Central station with a future intercity terminus, and trains the player can ride.
// Geometry and the timetable live in metro-line.js; this file builds the scene, runs
// the trains, animates doors and platform gates, and carries a riding player.
import * as THREE from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {MeshoptDecoder} from 'three/addons/libs/meshopt_decoder.module.js';
import {METRO_MODELS} from './metro/models.js';
import {DECK_Y,RAIL_Y,PLATFORM_Y,TRACK_OFFSET,PLATFORM,CENTRAL,ENTRANCE,LINE_LENGTH,LINE_NAME,STATIONS,STOPS,TIMETABLE,TRAIN_COUNT,
  CENTRELINE,lineAt,stationFrame,stationLandings,stationStairs,metroSafePoint,stairHeight,metroFloorAt,metroWalk,stationById,trainState,LOOP} from './metro-line.js';
import {NORTH_CITY,AIRPORT} from './world-rules.js';

export const DOORWAYS=Object.freeze([...METRO_MODELS.train.doorways]);// doorway centres along the car (both sides)
export const METRO_FARE=Object.freeze({adult:2.75,weekPass:22,youth:0});
export const METRO_RANGE=1600;// stream the train model when this close to the line
export const METRO_FACTS=Object.freeze({
  rivergate:'Rivergate is the south end of the Red Line. Trains wait here a few seconds, the driver walks to the cab at the other end, and the train heads back north. Both ends of a metro train have a cab, so it never needs to turn around.',
  midtown:'Elevated railways are built on columns above the street, so trains never wait at traffic lights. One train can carry as many people as about 150 cars, which keeps the road below less crowded.',
  central:'Northstar Central is the main station. The Red Line stops on platforms 1 and 2. Platforms 3 and 4 are already built for intercity trains to other cities. The tracks end at the concourse, so this part of the station is a terminus, like a dead-end street for trains.',
  uptown:'Metro trains run on a timetable. With three trains on the line, one arrives about every four minutes in each direction. That gap is called the headway.',
  northgate:'The train gets electricity from the wire above the track through the pantograph on its roof. When the train brakes, its motors work like generators and send power back into the wire for other trains to use.',
  plaza:'Trains follow a speed profile: they speed up gently, cruise, then slow down smoothly before a curve or a station. Gentle changes keep standing passengers comfortable.',
  airport:'The airport station is the north end of the line. A ride from Rivergate takes about six minutes, much faster than driving at rush hour, and there is no parking fee to pay.'});
export const METRO_THINK=Object.freeze({
  rivergate:{question:'An adult ticket costs $2.75. How much does it cost to ride to work and back every weekday for a week?',answer:'2 rides a day × 5 days = 10 rides. 10 × $2.75 = $27.50.'},
  midtown:{question:'A weekly pass costs $22. If you ride 10 times a week, does the pass save money compared with $2.75 tickets?',answer:'Yes. Ten tickets cost $27.50, so the pass saves $27.50 − $22 = $5.50 a week.'},
  central:{question:'How many rides a week do you need before the $22 weekly pass beats $2.75 single tickets?',answer:'$22 ÷ $2.75 = 8. At exactly 8 rides they cost the same, so from the 9th ride the pass is the better deal.'},
  uptown:{question:'A train comes every 4 minutes. If you just missed one, what is the longest you will wait?',answer:'About 4 minutes, the length of one headway. On average you wait half of it, about 2 minutes.'},
  northgate:{question:'A car uses about $3 of fuel for this trip plus $8 to park at the airport. A ticket costs $2.75. How much does the train save?',answer:'$3 + $8 = $11 by car. $11 − $2.75 = $8.25 saved.'},
  plaza:{question:'The train cruises at 16 m/s. How far does it go in one minute?',answer:'16 × 60 = 960 metres, almost a kilometre.'},
  airport:{question:'The line is about 1.9 km long and a trip takes about 6 minutes. What is the average speed?',answer:'1,900 m ÷ 360 s ≈ 5.3 m/s, about 19 km/h, because stopping at stations takes time.'}});

const yawOf=(tx,tz)=>Math.atan2(tx,tz);

export function createMetroWorld({scene,visualKit,obstacles,mobile=false,loader=null,player:playerRef=null,onEvent=()=>{}}){
  // The player object, or a function returning it (the game creates the player later).
  const me=()=>typeof playerRef==='function'?playerRef():playerRef;
  const root=new THREE.Group();root.name='Northstar Metro';scene.add(root);
  const cameraBoxes=[];root.userData.architectureBoxes=cameraBoxes;
  const mat=(color,roughness=.7,metalness=0,extra={})=>new THREE.MeshStandardMaterial({color,roughness,metalness,...extra});
  const glow=(m,o)=>visualKit?.atmosphere?.registerGlow?.(m,o);
  const M={concrete:mat(0xaaa59b,.85),deck:mat(0x9d998f,.85),stairNose:mat(0x3a3f45,.6),paving:mat(0x9b968c,.9),dark:mat(0x3a3f45,.7),rail:mat(0x8b9096,.35,.8),sleeper:mat(0x77736c,.9),bed:mat(0x5e5a55,.95),
    steel:mat(0x9aa3aa,.4,.7),red:mat(0xc8242b,.5),white:mat(0xf2f2ee,.55),yellow:mat(0xf2c230,.6),floor:mat(0x8d8a84,.75),tile:mat(0xb9b5ad,.6),
    roof:mat(0xe4e6e8,.5,.2),wire:mat(0x2b2e31,.5,.6),bench:mat(0x2f4f6e,.55),wood:mat(0x9b7653,.6),
    glass:new THREE.MeshPhysicalMaterial({color:0xa8c4cf,roughness:.08,metalness:.1,transparent:true,opacity:.3,depthWrite:false}),
    vault:new THREE.MeshPhysicalMaterial({color:0x9fc4d6,roughness:.1,metalness:.2,transparent:true,opacity:.38,side:THREE.DoubleSide,depthWrite:false}),
    light:mat(0xfff6e2,.4,0,{emissive:0xfff1d6,emissiveIntensity:.6}),screen:mat(0x1d2a33,.4,0,{emissive:0x6fb9d8,emissiveIntensity:.4}),
    head:mat(0xffffff,.3,0,{emissive:0xfff4d8,emissiveIntensity:.4}),probe:mat(0,1,0,{emissive:0xffffff})};
  glow(M.light,{day:.45,night:1.5});glow(M.screen,{day:.4,night:1});glow(M.head,{day:.4,night:2.2});glow(M.probe,{day:0,night:1});
  const batches=new Map(),unit=new THREE.BoxGeometry(1,1,1);
  function box(material,x,y,z,w,h,d,ry=0){if(!batches.has(material))batches.set(material,[]);batches.get(material).push([x,y+h/2,z,w,h,d,ry]);}
  // Box in a station frame: u along the line, v to the left, y bottom.
  const sbox=(F,m,u0,u1,v0,v1,y,h)=>{const c=F.toWorld((u0+u1)/2,(v0+v1)/2);box(m,c.x,y,c.z,Math.abs(v1-v0),h,Math.abs(u1-u0),F.yaw);};
  const camBox=(F,u0,u1,v0,v1,y0,y1)=>{const pts=[[u0,v0],[u1,v0],[u1,v1],[u0,v1]].map(([u,v])=>F.toWorld(u,v));cameraBoxes.push({minX:Math.min(...pts.map(p=>p.x)),maxX:Math.max(...pts.map(p=>p.x)),minY:y0,maxY:y1,minZ:Math.min(...pts.map(p=>p.z)),maxZ:Math.max(...pts.map(p=>p.z))});};
  // Ground obstacles: below the deck only (a player on a platform is not blocked).
  const solid=(x,z,w,d,maxY=DECK_Y-1.2,kind='metro-column')=>{const o={minX:x-w/2,maxX:x+w/2,minZ:z-d/2,maxZ:z+d/2,minY:-1,maxY,houseId:'metro',kind};obstacles.push(o);return o;};
  const signTexture=(lines,{w=1024,h=256,bg='#c8242b',fg='#ffffff',font=110,align='center'}={})=>{const c=typeof document!=='undefined'?document.createElement('canvas'):null;if(!c?.getContext)return null;c.width=w;c.height=h;const g=c.getContext('2d');if(!g)return null;
    const draw=(rows,opts={})=>{g.fillStyle=opts.bg||bg;g.fillRect(0,0,w,h);g.textBaseline='middle';rows.forEach((t,i,all)=>{const row=typeof t==='string'?{text:t}:t;g.fillStyle=row.color||opts.fg||fg;g.textAlign=row.align||align;g.font='bold '+(row.font||font)+'px Arial';g.fillText(row.text,(row.align||align)==='center'?w/2:(row.align==='right'?w-36:36),h*(i+.5)/all.length,w-60);});};
    draw(Array.isArray(lines)?lines:[lines]);const t=new THREE.CanvasTexture(c);t.colorSpace=THREE.SRGBColorSpace;t.anisotropy=4;return {texture:t,canvas:c,ctx:g,draw:(rows,o)=>{draw(rows,o);t.needsUpdate=true;}};};
  const signs=[];
  function sign(text,x,y,z,w,h,ry=0,opts={}){const tex=signTexture(text,opts);const m=new THREE.Mesh(new THREE.PlaneGeometry(w,h),tex?new THREE.MeshStandardMaterial({map:tex.texture,roughness:.6,emissive:0xffffff,emissiveMap:tex.texture,emissiveIntensity:.35}):M.red);
    m.position.set(x,y,z);m.rotation.y=ry;root.add(m);signs.push(m);if(tex)glow(m.material,{day:.35,night:.9});return {mesh:m,tex};}
  // Two-sided sign in a station frame facing ±v.
  const stationSign=(F,text,u,v,y,w,h,opts)=>{const p=F.toWorld(u,v),a=sign(text,p.x,y,p.z,w,h,F.yaw+Math.PI/2,opts),b=sign(text,p.x,y,p.z,w,h,F.yaw-Math.PI/2,opts);return [a,b];};

  // ---------- viaduct, columns, track and overhead wire ----------
  const stationSpan=s=>STATIONS.find(st=>Math.abs(s-st.s)<st.length/2+(st.kind==='central'?CENTRAL.concourse:PLATFORM.landing)+.5);
  const nearRoadCross=(x,z)=>NORTH_CITY.streets.some(n=>Math.abs(z-n)<12)&&NORTH_CITY.avenues.some(n=>Math.abs(x-n)<12)||Math.abs(x-AIRPORT.loop.west)<11&&Math.abs(z-AIRPORT.road.z)<12||Math.abs(x-AIRPORT.loop.east)<11&&Math.abs(z-AIRPORT.road.z)<12;
  for(let s=0;s<LINE_LENGTH;){const a=lineAt(s),step=a.curved?2:8,b=lineAt(Math.min(LINE_LENGTH,s+step)),len=Math.hypot(b.x-a.x,b.z-a.z),cx=(a.x+b.x)/2,cz=(a.z+b.z)/2,yaw=yawOf(b.x-a.x,b.z-a.z),nx=Math.cos(yaw),nz=-Math.sin(yaw);
    box(M.deck,cx,DECK_Y-1.25,cz,10,1.25,len+.08,yaw);box(M.bed,cx,DECK_Y,cz,8.6,.05,len+.08,yaw);
    if(!stationSpan(s+step/2))for(const side of [-1,1]){box(M.concrete,cx+nx*side*4.85,DECK_Y,cz+nz*side*4.85,.3,1.05,len+.08,yaw);}
    for(const off of [-TRACK_OFFSET,TRACK_OFFSET])for(const g of [-.7175,.7175]){const o=off+g;box(M.rail,cx+nx*o,DECK_Y+.13,cz+nz*o,.075,.15,len+.04,yaw);}
    // contact wire above each track
    for(const off of [-TRACK_OFFSET,TRACK_OFFSET])box(M.wire,cx+nx*off,RAIL_Y+5.95,cz+nz*off,.05,.05,len+.04,yaw);
    s+=step;}
  for(let s=0;s<LINE_LENGTH;s+=20){const a=lineAt(s),b=lineAt(Math.min(LINE_LENGTH,s+20));cameraBoxes.push({minX:Math.min(a.x,b.x)-5,maxX:Math.max(a.x,b.x)+5,minY:DECK_Y-1.25,maxY:DECK_Y+1.05,minZ:Math.min(a.z,b.z)-5,maxZ:Math.max(a.z,b.z)+5});}
  // sleepers
  if(!mobile)for(let s=.6;s<LINE_LENGTH;s+=1.2){const p=lineAt(s),yaw=yawOf(p.tx,p.tz);for(const off of [-TRACK_OFFSET,TRACK_OFFSET])box(M.sleeper,p.x+p.nx*off,DECK_Y+.04,p.z+p.nz*off,2.4,.09,.26,yaw);}
  // crossovers at both tails (rails along the loop path where it changes track)
  {const P=LOOP.points;for(let i=1;i<P.length;i++){const a=P[i-1],b=P[i];if(a.track!=='X'&&b.track!=='X')continue;const len=Math.hypot(b.x-a.x,b.z-a.z),yaw=yawOf(b.x-a.x,b.z-a.z),nx=Math.cos(yaw),nz=-Math.sin(yaw),cx=(a.x+b.x)/2,cz=(a.z+b.z)/2;for(const g of [-.7175,.7175])box(M.rail,cx+nx*g,DECK_Y+.13,cz+nz*g,.075,.15,len+.04,yaw);}}
  // buffer stops at both ends
  for(const s of [.6,LINE_LENGTH-.6]){const p=lineAt(s),yaw=yawOf(p.tx,p.tz);for(const off of [-TRACK_OFFSET,TRACK_OFFSET]){box(M.red,p.x+p.nx*off,DECK_Y,p.z+p.nz*off,2.2,1.3,.5,yaw);box(M.yellow,p.x+p.nx*off,DECK_Y+1.3,p.z+p.nz*off,2.2,.12,.52,yaw);}}
  // columns with pier heads
  const columns=[];for(let s=6;s<LINE_LENGTH-2;s+=24){const p=lineAt(s);if(nearRoadCross(p.x,p.z))continue;const yaw=yawOf(p.tx,p.tz);
    box(M.concrete,p.x,0,p.z,1.3,DECK_Y-1.25,1.3,yaw);box(M.concrete,p.x,DECK_Y-2.2,p.z,7.5,.95,1.7,yaw);solid(p.x,p.z,1.4,1.4);columns.push({x:p.x,z:p.z});}
  // catenary masts between stations
  for(let s=20;s<LINE_LENGTH-10;s+=48){if(stationSpan(s))continue;const p=lineAt(s),yaw=yawOf(p.tx,p.tz);for(const side of [-1,1])box(M.steel,p.x+p.nx*side*4.6,DECK_Y,p.z+p.nz*side*4.6,.25,6.9,.25,yaw);box(M.steel,p.x,RAIL_Y+6.3,p.z,9.5,.2,.2,yaw);}

  // ---------- stations ----------
  const stations=[],gates=[],boards=[],streetTotems=[];const gateLeaf=new THREE.BoxGeometry(.05,1.45,.7);
  for(const st of STATIONS){const F=stationFrame(st),L=st.length/2,P=PLATFORM,Y=PLATFORM_Y,central=st.kind==='central',info={station:st,frame:F,boards:[]};stations.push(info);
    // platforms with tactile edge
    for(const side of [1,-1]){const v0=side>0?P.inner:-P.outer,v1=side>0?P.outer:-P.inner,edge=side*P.inner;
      sbox(F,M.tile,-L,L,v0,v1,DECK_Y-.5,Y-DECK_Y+.5);sbox(F,M.yellow,-L,L,edge,edge+side*.55,Y,.012);camBox(F,-L,L,v0,v1,DECK_Y-.5,Y);
      // platform gates along the edge, open at the doorways
      const gv=side*(P.inner+.12);let u=-L+.6;for(const d of [...DOORWAYS,L-.6]){const end=Math.min(d-.75,L-.6);if(end>u){sbox(F,M.glass,u,end,gv-.03,gv+.03,Y,1.45);sbox(F,M.steel,u,end,gv-.05,gv+.05,Y+1.45,.08);}u=d+.75;}
      for(const d of DOORWAYS){sbox(F,M.steel,d-.82,d-.72,gv-.08,gv+.08,Y,1.55);sbox(F,M.steel,d+.72,d+.82,gv-.08,gv+.08,Y,1.55);
        for(const dir of [-1,1]){const leaf=new THREE.Mesh(gateLeaf,M.glass),c=F.toWorld(d+dir*.36,gv);leaf.position.set(c.x,Y+.73,c.z);leaf.rotation.y=F.yaw;root.add(leaf);gates.push({leaf,station:st.id,track:side>0?'A':'B',dir,base:d+dir*.36,frame:F,v:gv,open:0});}}
      // outer railing (glass), benches, canopy or vault posts
      const rv=side*(P.outer-.05);sbox(F,M.glass,-L,L,rv-.03,rv+.03,Y,1.1);sbox(F,M.steel,-L,L,rv-.05,rv+.05,Y+1.1,.07);
      if(!central||side>0)for(const bu of [-L*.55,L*.2]){sbox(F,M.bench,bu-1.6,bu+1.6,side*(P.outer-1.4),side*(P.outer-.9),Y+.42,.1);sbox(F,M.steel,bu-1.5,bu+1.5,side*(P.outer-1.3),side*(P.outer-1.0),Y,.42);}
      if(!central){const cv0=side*(P.inner+.15),cv1=side*(P.outer+.25);sbox(F,M.roof,-L+1,L-1,cv0,cv1,Y+3.4,.22);sbox(F,M.light,-L+2,L-2,side*(P.inner+1.6),side*(P.inner+2.1),Y+3.36,.04);camBox(F,-L+1,L-1,cv0,cv1,Y+3.4,Y+3.62);
        for(let pu=-L+2;pu<=L-2;pu+=9)sbox(F,M.steel,pu-.12,pu+.12,side*(P.outer-.4)-.12,side*(P.outer-.4)+.12,Y,3.4);}
      // under-platform supports on the sidewalk side
      for(const pu of [-L+3,0,L-3])sbox(F,M.concrete,pu-.4,pu+.4,side*(P.outer-1.2)-.4,side*(P.outer-1.2)+.4,0,DECK_Y-.5);
      for(const pu of [-L+3,0,L-3]){const c=F.toWorld(pu,side*(P.outer-1.2));solid(c.x,c.z,.9,.9);}
      // station name boards facing the track and a next-train display
      for(const bu of [-L*.6,L*.6]){const c=F.toWorld(bu,side*(P.outer-.2));const s=sign(['Ⓜ  '+st.name.toUpperCase()],c.x,Y+2.6,c.z,6.2,.8,F.yaw+(side>0?-Math.PI/2:Math.PI/2),{w:1024,h:132,font:86});void s;}
      {const c=F.toWorld(-2,side*(P.inner+1.8));const b=sign(['NEXT TRAIN'],c.x,Y+2.75,c.z,3.4,1.1,F.yaw+(side>0?-Math.PI/2:Math.PI/2),{w:640,h:208,bg:'#11161b',fg:'#ffbf3c',font:46,align:'left'});const b2=sign(['NEXT TRAIN'],c.x,Y+2.75,c.z,3.4,1.1,F.yaw+(side>0?Math.PI/2:-Math.PI/2),{w:640,h:208,bg:'#11161b',fg:'#ffbf3c',font:46,align:'left'});
        const board={station:st.id,track:side>0?'A':'B',faces:[b,b2],text:''};boards.push(board);info.boards.push(board);sbox(F,M.steel,-2.05,-1.95,side*(P.inner+1.8)-.05,side*(P.inner+1.8)+.05,Y+3.3,(central?6:.1));}
      // ticket machine and validator on the landing side
      {const lu=side>0?L-1.2:-L+1.2;sbox(F,M.dark,lu-.4,lu+.4,side*(P.outer-.75),side*(P.outer-.25),Y,1.8);sbox(F,M.screen,lu-.3,lu+.3,side*(P.outer-.77),side*(P.outer-.74),Y+1.1,.45);}
    }
    // landings with railings on their open sides
    for(const d of stationLandings(st)){const out=d[0]>0;sbox(F,M.tile,d[0],d[1],d[2],d[3],DECK_Y-.5,Y-DECK_Y+.5);camBox(F,d[0],d[1],d[2],d[3],DECK_Y-.5,Y);
      const eu=out?d[1]:d[0],ev=out?d[3]:d[2];sbox(F,M.glass,eu-.03,eu+.03,d[2],d[3],Y,1.1);sbox(F,M.steel,eu-.05,eu+.05,d[2],d[3],Y+1.1,.07);sbox(F,M.glass,d[0],d[1],ev-.03,ev+.03,Y,1.1);}
    // stairs: open steel stairs (treads on two sloping stringers, glass balustrade and
    // handrail) on two posts, with a street totem at the foot
    for(const s of stationStairs(st)){const [u0,u1,v0,v1,top]=s,n=Math.round(Y/.17),run=(u1-u0)/n,rise=Y/n,low=top===u0?u1:u0;
      for(let k=0;k<n;k++){const a=top===u0?u0+k*run:u1-(k+1)*run,mid=a+run/2,h=stairHeight(s,mid)+rise/2;sbox(F,M.tile,a,a+run+.01,v0+.12,v1-.12,h-.07,.07);sbox(F,M.stairNose,top===u0?a:a+run-.05,top===u0?a+.05:a+run,v0+.12,v1-.12,h-.005,.012);}
      const slope=Math.atan2(Y,u1-u0),len=Math.hypot(Y,u1-u0),dir=top===u0?1:-1;
      for(const [sv,m,h,w,lift] of [[v0+.06,M.steel,.42,.12,-.32],[v1-.06,M.steel,.42,.12,-.32],[v0+.06,M.glass,1,.03,.55],[v1-.06,M.glass,1,.03,.55],[v0+.06,M.steel,.06,.06,1.08],[v1-.06,M.steel,.06,.06,1.08]]){
        const c=F.toWorld((u0+u1)/2,sv),beam=new THREE.Mesh(unit,m);beam.position.set(c.x,Y/2+lift,c.z);beam.rotation.order='YXZ';beam.rotation.set(dir*slope,F.yaw,0);beam.scale.set(w,h,len);beam.castShadow=!mobile&&m!==M.glass;root.add(beam);}
      for(const f of [.35,.7]){const pu=low+(top-low)*f,ph=stairHeight(s,pu)-.45;sbox(F,M.steel,pu-.15,pu+.15,(v0+v1)/2-.15,(v0+v1)/2+.15,0,ph);}
      const foot=top===u0?u1:u0,fc=F.toWorld(foot+(top===u0?1.2:-1.2),(v0+v1)/2+((v0+v1)>0?2.3:-2.3));streetTotems.push({station:st.id,...fc});
      box(M.red,fc.x,0,fc.z,.3,4.2,.3,F.yaw);const t=sign(['Ⓜ'],fc.x,4.6,fc.z,1.1,1.1,F.yaw,{w:256,h:256,font:200,bg:'#c8242b'});const t2=sign(['Ⓜ'],fc.x,4.6,fc.z,1.1,1.1,F.yaw+Math.PI,{w:256,h:256,font:200,bg:'#c8242b'});void t;void t2;
      {const lc=F.toWorld(foot+(top===u0?1.2:-1.2),(v0+v1)/2+((v0+v1)>0?-1.1:1.1));sign([st.name,LINE_NAME],lc.x,3.3,lc.z,2.6,1.1,F.yaw+((v0+v1)>0?-Math.PI/2:Math.PI/2),{w:640,h:270,font:72,bg:'#1d2a33'});}
      // the high part of the stair is a wall at street level
      for(let a=u0;a<u1;a+=1){const mid=a+.5,h=stairHeight(s,mid);if(h<1.15)continue;const c=F.toWorld(mid,(v0+v1)/2);const o={minX:c.x-Math.abs(F.nx)*(v1-v0)/2-Math.abs(F.tx)*.5,maxX:c.x+Math.abs(F.nx)*(v1-v0)/2+Math.abs(F.tx)*.5,minZ:c.z-Math.abs(F.nz)*(v1-v0)/2-Math.abs(F.tz)*.5,maxZ:c.z+Math.abs(F.nz)*(v1-v0)/2+Math.abs(F.tz)*.5,minY:-1,maxY:Math.min(1,h-.2),houseId:'metro',kind:'metro-stair'};obstacles.push(o);}
      }
    // the station name on the viaduct face, seen from the street
    for(const side of [1,-1])stationSign(F,[st.name.toUpperCase()],0,side*(P.outer+.32),Y-.7,11,1.05,{w:1024,h:100,font:72});
    if(central)buildCentral(st,F);
  }
  function buildCentral(st,F){const L=st.length/2,C=CENTRAL,Y=PLATFORM_Y,P=PLATFORM;
    // wide deck for the intercity tracks and island platform
    sbox(F,M.deck,-L,L,C.deckEdge,-5,DECK_Y-1.25,1.25);sbox(F,M.bed,-L,L,C.deckEdge,-5,DECK_Y,.05);camBox(F,-L,L,C.deckEdge,-5,DECK_Y-1.25,DECK_Y);
    for(const tv of C.futureTracks){for(const g of [-.7175,.7175])sbox(F,M.rail,-L+.5,L,tv+g-.04,tv+g+.04,DECK_Y+.05,.15);if(!mobile)for(let u=-L+1;u<L;u+=1.2)sbox(F,M.sleeper,u-.13,u+.13,tv-1.2,tv+1.2,DECK_Y+.04,.09);
      for(const bu of [-L+.5,L-.6]){sbox(F,M.red,bu-.25,bu+.25,tv-1.1,tv+1.1,DECK_Y,1.3);sbox(F,M.yellow,bu-.26,bu+.26,tv-1.1,tv+1.1,DECK_Y+1.3,.12);}}
    const [i0,i1]=C.island;sbox(F,M.tile,-L,L,i0,i1,DECK_Y-.5,Y-DECK_Y+.5);for(const e of [i0,i1-.55])sbox(F,M.yellow,-L,L,e,e+.55,Y,.012);camBox(F,-L,L,i0,i1,DECK_Y-.5,Y);
    for(const bu of [-12,0,12]){sbox(F,M.bench,bu-1.6,bu+1.6,(i0+i1)/2-.25,(i0+i1)/2+.25,Y+.42,.1);sbox(F,M.steel,bu-1.5,bu+1.5,(i0+i1)/2-.2,(i0+i1)/2+.2,Y,.42);}
    // concourse across the platform ends and the grand stair to the east plaza
    const cu0=L,cu1=L+C.concourse,[g0]=C.grandStair;sbox(F,M.tile,cu0,cu1,g0,-P.inner,DECK_Y-.5,Y-DECK_Y+.5);camBox(F,cu0,cu1,g0,-P.inner,DECK_Y-.5,Y);
    sbox(F,M.glass,cu1-.05,cu1,g0,-P.inner,Y,1.1);sbox(F,M.steel,cu1-.07,cu1+.02,g0,-P.inner,Y+1.1,.07);sbox(F,M.glass,cu0,cu1,-P.inner-.05,-P.inner,Y,1.1);sbox(F,M.glass,cu0,cu1,g0,g0+.05,Y,1.1);
    sbox(F,M.glass,L-P.stairRun,L,C.grandStair[1]-.05,C.grandStair[1],Y,1.1);
    // the metro platform B's east edge and the island's ends get railings
    sbox(F,M.glass,-L,-L+.05,i0,i1,Y,1.1);sbox(F,M.glass,-L,-L+.05,-P.outer,-P.inner,Y,1.1);sbox(F,M.glass,-L,-L+.05,P.inner,P.outer,Y,1.1);
    for(const sideU of [cu0+3])stationSign(F,['PLATFORMS 3 · 4   INTERCITY','Service starts soon'],sideU,(i0+i1)/2,Y+3.2,8,1.6,{w:1024,h:208,font:64,bg:'#13233a'});
    stationSign(F,['◀ 1 · 2  RED LINE'],cu0+3,-P.outer+.5,Y+3.2,5,.9,{w:1024,h:184,font:84});
    {const c=F.toWorld((-L+L)/2,(i0+i1)/2);const b=sign(['INTERCITY DEPARTURES','First trains: coming soon','Platforms 3 and 4 are ready'],c.x,Y+3.1,c.z,5.4,2.2,F.yaw+Math.PI/2,{w:1024,h:420,font:60,bg:'#11161b',fg:'#ffbf3c'});void b;
      const b2=sign(['INTERCITY DEPARTURES','First trains: coming soon','Platforms 3 and 4 are ready'],c.x,Y+3.1,c.z,5.4,2.2,F.yaw-Math.PI/2,{w:1024,h:420,font:60,bg:'#11161b',fg:'#ffbf3c'});void b2;sbox(F,M.steel,-.05,.05,(i0+i1)/2-.05,(i0+i1)/2+.05,Y+4.2,4);}
    // supports under the wide deck
    for(let u=-L+4;u<=L+C.concourse-1;u+=12)for(const v of [-12,-24]){sbox(F,M.concrete,u-.6,u+.6,v-.6,v+.6,0,DECK_Y-1.25);const c=F.toWorld(u,v);solid(c.x,c.z,1.3,1.3);}
    for(const v of [-12,-24]){const c=F.toWorld(L+C.concourse-1,v);void c;}
    // glass vault over the whole hall with steel ribs
    const vw=-g0+P.outer+1.2,vc=(P.outer+.6+g0-.6)/2,rise=8.5,spring=Y+5.4,vl=L*2+C.concourse+2,vu=(-L-1+L+C.concourse+1)/2;
    const vault=new THREE.Mesh(new THREE.CylinderGeometry(vw/2,vw/2,vl,28,1,true,-Math.PI/2,Math.PI),M.vault);const vcW=F.toWorld(vu,vc);
    vault.position.set(vcW.x,spring,vcW.z);vault.rotation.set(0,F.yaw,0);vault.rotateX(-Math.PI/2);vault.scale.set(1,1,rise/(vw/2));// cylinder axis along u, dome up
    root.add(vault);
    // glazing bars along the vault
    for(let k=1;k<12;k++){const a=Math.PI*k/12,v=vc+Math.cos(a)*vw/2,y=spring+Math.sin(a)*rise,c=F.toWorld(vu,v),bar=new THREE.Mesh(unit,M.steel);bar.position.set(c.x,y,c.z);bar.rotation.y=F.yaw;bar.scale.set(.12,.12,vl);root.add(bar);}
    // a paved plaza under and around the hall
    {const pts=[[-L-4,P.stairOuter+1],[L+C.concourse+4,P.stairOuter+1],[L+C.concourse+4,g0-4],[-L-4,g0-4]].map(([u,v])=>F.toWorld(u,v)),x0=Math.max(Math.min(...pts.map(p=>p.x)),70),x1=Math.max(...pts.map(p=>p.x)),z0=Math.min(...pts.map(p=>p.z)),z1=Math.max(...pts.map(p=>p.z));
      box(M.paving,(x0+x1)/2,-.02,(z0+z1)/2,x1-x0,.1,z1-z0);}
    const ribGeo=new THREE.TorusGeometry(vw/2,.14,6,28,Math.PI);
    for(let u=-L-1;u<=L+C.concourse+1;u+=6){const r=new THREE.Mesh(ribGeo,M.steel),c=F.toWorld(u,vc);r.position.set(c.x,spring,c.z);r.rotation.set(0,F.yaw,0);r.scale.set(1,rise/(vw/2),1);root.add(r);
      for(const v of [P.outer+.6,g0-.6]){if(v>0&&u>L-P.stairRun-1&&u<L+P.landing+.5)continue;const p=F.toWorld(u,v);box(M.steel,p.x,DECK_Y-1.25,p.z,.5,spring-DECK_Y+1.25,.5,F.yaw);}}
    cameraBoxes.push(...(()=>{const pts=[[-L-1,P.outer+.6],[L+C.concourse+1,P.outer+.6],[L+C.concourse+1,g0-.6],[-L-1,g0-.6]].map(([u,v])=>F.toWorld(u,v));return [{minX:Math.min(...pts.map(p=>p.x)),maxX:Math.max(...pts.map(p=>p.x)),minY:spring+rise-1,maxY:spring+rise,minZ:Math.min(...pts.map(p=>p.z)),maxZ:Math.max(...pts.map(p=>p.z))}];})());
    for(let u=-L+3;u<L;u+=7.5)for(const v of [P.inner+2,(i0+i1)/2,-P.inner-2])sbox(F,M.light,u-1.6,u+1.6,v-.15,v+.15,Y+4.6,.05);
    // big name on the hall's street faces
    stationSign(F,['NORTHSTAR CENTRAL'],vu,g0-.75,spring+1.2,16,1.8,{w:1024,h:116,font:84,bg:'#13233a'});
    {const c=F.toWorld(L+C.concourse+1.4,(P.outer+g0)/2);sign(['NORTHSTAR CENTRAL  ·  Ⓜ RED LINE  ·  INTERCITY'],c.x,spring+2.6,c.z,26,1.8,F.yaw,{w:2048,h:140,font:92,bg:'#13233a'});}
  }

  // ---------- future intercity lower-concourse entrance (owner's model) ----------
  const entranceGroup=new THREE.Group();entranceGroup.position.set(ENTRANCE.x,0,ENTRANCE.z);entranceGroup.rotation.y=ENTRANCE.yaw;root.add(entranceGroup);
  {const H=ENTRANCE.hole,p=6,x0=H.minX-p,x1=H.maxX+p,z0=H.minZ-p,z1=H.maxZ+p+2,pave=(a,b,c,d)=>box(M.paving,(a+b)/2,-.02,(c+d)/2,b-a,.1,d-c);pave(x0,x1,z0,H.minZ);pave(x0,x1,H.maxZ,z1);pave(x0,H.minX,H.minZ,H.maxZ);pave(H.maxX,x1,H.minZ,H.maxZ);}
  {const K=ENTRANCE.kiosk;obstacles.push({minX:K.minX,maxX:K.maxX,minZ:K.minZ,maxZ:K.maxZ,kind:'metro-entrance'});
    sign(['INTERCITY LOWER CONCOURSE','Opening soon'],ENTRANCE.x,1.6,K.maxZ+.25,2.6,.8,0,{w:1024,h:320,font:84,bg:'#13233a'});}

  const dummy=new THREE.Object3D(),meshes=[];
  for(const [material,list] of batches){const mesh=new THREE.InstancedMesh(unit,material,list.length);list.forEach(([x,y,z,w,h,d,ry],i)=>{dummy.position.set(x,y,z);dummy.rotation.set(0,ry,0);dummy.scale.set(w,h,d);dummy.updateMatrix();mesh.setMatrixAt(i,dummy.matrix);});
    mesh.castShadow=!mobile&&material!==M.glass&&material!==M.light&&material!==M.yellow;mesh.receiveShadow=material!==M.glass;mesh.computeBoundingSphere();root.add(mesh);meshes.push(mesh);}

  // ---------- trains ----------
  const trainSpec=METRO_MODELS.train,trains=[];
  function standInTrain(){const g=new THREE.Group(),body=new THREE.Mesh(new THREE.BoxGeometry(2.9,3.2,trainSpec.length),M.white);body.position.y=2.2;g.add(body);
    const stripe=new THREE.Mesh(new THREE.BoxGeometry(2.95,.9,trainSpec.length-.2),M.red);stripe.position.y=1.35;g.add(stripe);const win=new THREE.Mesh(new THREE.BoxGeometry(2.96,1.1,trainSpec.length-2),M.dark);win.position.y=2.6;g.add(win);return g;}
  for(let i=0;i<TRAIN_COUNT;i++){const group=new THREE.Group();group.name='Red Line train '+(i+1);const standIn=standInTrain();group.add(standIn);
    for(const z of [-trainSpec.length/2+.05,trainSpec.length/2-.05])for(const x of [-.85,.85]){const h=new THREE.Mesh(new THREE.BoxGeometry(.28,.16,.06),M.head);h.position.set(x,1.25,z);group.add(h);}
    root.add(group);trains.push({index:i,group,standIn,model:null,doors:{},doorOpen:0,offset:i*TIMETABLE.cycle/TRAIN_COUNT,state:null,last:null});}
  const models={state:'idle',train:null,entrance:null};let loading=null;
  function loadModels(modelLoader){loading||=fetchModels(modelLoader);return loading;}
  async function fetchModels(modelLoader=loader||new GLTFLoader().setMeshoptDecoder(MeshoptDecoder)){models.state='loading';
    const get=async key=>{try{return (await modelLoader.loadAsync(METRO_MODELS[key].url)).scene;}catch(error){console.warn('Metro model unavailable: '+key,error);return null;}};
    const [train,entrance]=await Promise.all([get('train'),get('entrance')]);
    if(train){train.traverse(c=>{if(c.isMesh){c.castShadow=!mobile;c.receiveShadow=true;if(c.material?.name==='Northstar Metro glass'){c.material.emissive?.setHex(0xffe7b8);glow(c.material,{day:0,night:.55,color:0xffe7b8});}}});models.train=train;
      for(const t of trains){const m=train.clone(true);t.group.add(m);t.model=m;t.standIn.visible=false;m.traverse(c=>{if(/^door-/.test(c.name)){t.doors[c.name]=c;c.userData.baseZ=c.position.z;}});}}
    if(entrance){entrance.traverse(c=>{if(c.isMesh){c.castShadow=!mobile;c.receiveShadow=true;}});entranceGroup.add(entrance);models.entrance=entrance;}
    models.state='ready';return models;}

  // ---------- running ----------
  let time=0,ride=null;const stationIds=new Set(STATIONS.map(s=>s.id));
  const eventIndexAt=ct=>{const E=TIMETABLE.events;let lo=0,hi=E.length-1;while(hi>lo){const m=(lo+hi)>>1;if(E[m].t1<ct)lo=m+1;else hi=m;}return lo;};
  // Stations still ahead of a train before it reaches the end of the line (it reverses there).
  function stationsAhead(t){const E=TIMETABLE.events,ct=t.state.cycleTime,i0=eventIndexAt(ct),list=[];let elapsed=0;
    for(let k=0;k<E.length;k++){const e=E[(i0+k)%E.length];if(k===0){if(e.type==='dwell'){if(e.stop.reverse)break;continue;}elapsed+=e.t1-ct;continue;}
      if(e.type==='dwell'){if(e.stop.reverse)break;list.push({id:e.stop.station,minutes:Math.max(1,Math.round(elapsed/60)),seconds:elapsed});elapsed+=e.t1-e.t0;}else elapsed+=e.t1-e.t0;}
    return list;}
  // Seconds until each train next opens its doors at a station platform.
  function arrivals(stationId,track){const E=TIMETABLE.events,ev=E.find(e=>e.type==='dwell'&&e.stop.station===stationId&&e.stop.track===track);if(!ev)return [];
    return trains.map(t=>{const ct=((time+t.offset)%TIMETABLE.cycle+TIMETABLE.cycle)%TIMETABLE.cycle;let wait=ev.t0-ct;if(ct>=ev.t0&&ct<=ev.t1)wait=0;else if(wait<0)wait+=TIMETABLE.cycle;return {train:t.index,wait};}).sort((a,b)=>a.wait-b.wait);}
  const terminatesAt=(stationId,track)=>{const E=TIMETABLE.events,i=E.findIndex(e=>e.type==='dwell'&&e.stop.station===stationId&&e.stop.track===track);for(let k=1;k<E.length;k++){const e=E[(i+k)%E.length];if(e.type==='dwell')return !!e.stop.reverse;}return false;};
  const destinationOf=track=>track==='A'?STATIONS.at(-1):STATIONS[0];
  function doorWorld(t,doorway,out=2.6){const yaw=t.group.rotation.y,x=Math.cos(yaw),z=-Math.sin(yaw),fx=Math.sin(yaw),fz=Math.cos(yaw);return {x:t.group.position.x+x*out+fx*doorway,z:t.group.position.z+z*out+fz*doorway};}
  function drawBoards(position){if(!position)return;for(const info of stations){if(Math.hypot(position.x-info.frame.x,position.z-info.frame.z)>160)continue;for(const b of info.boards){
      const term=terminatesAt(b.station,b.track),list=arrivals(b.station,b.track),dest=destinationOf(b.track).name;
      const fmt=w=>w<15?'Boarding':w<60?'Arriving':Math.ceil(w/60)+' min';
      const rows=term?[{text:'PLATFORM '+(b.track==='A'?1:2)+' · ARRIVALS ONLY',font:34},{text:'Trains end here.',font:38,color:'#ffffff'},{text:'Ride from platform '+(b.track==='A'?2:1),font:34,color:'#ffffff'}]:[{text:'P'+(b.track==='A'?1:2)+' · to '+dest,font:38,color:'#ffffff'},{text:'1st  '+fmt(list[0]?.wait??0),font:46},{text:'2nd  '+fmt(list[1]?.wait??0),font:40}];
      const text=rows.map(r=>r.text).join('|');if(text===b.text)continue;b.text=text;for(const f of b.faces)f.tex?.draw(rows,{bg:'#11161b',fg:'#ffbf3c'});}}}
  let boardClock=0;
  function update(dt,{position}={}){dt=Number.isFinite(dt)?Math.max(0,Math.min(dt,.25)):0;time+=dt;
    if(position&&models.state==='idle'&&position.z<-1000&&position.x>-300&&position.x<1400)loadModels();
    for(const t of trains){const s=trainState(time+t.offset);t.last=t.state;t.state=s;t.group.position.set(s.x,RAIL_Y,s.z);t.group.rotation.y=s.yaw;
      const target=s.doors?1:0;t.doorOpen+=Math.max(-dt/1.6,Math.min(dt/1.6,target-t.doorOpen));const slide=trainSpec.doorSlide*t.doorOpen;
      const da=t.doors['door-L-a'],db=t.doors['door-L-b'];if(da)da.position.z=da.userData.baseZ+slide;if(db)db.position.z=db.userData.baseZ-slide;
      const prev=t.last;if(prev&&ride?.train===t.index){if(prev.speed===0&&s.speed>0){const next=stationsAhead(t)[0];if(next)onEvent({kind:'departing',next:stationById(next.id),destination:stationById(ride.destination)});}
        if(!prev.doors&&s.doors&&s.station){onEvent({kind:'arrived',station:stationById(s.station),destination:stationById(ride.destination)});if(s.station===ride.destination)ride.alightAt=time+1.2;}}}
    for(const g of gates){const t=trains.find(t=>t.state.station===g.station&&t.state.track===g.track&&t.state.speed===0);const target=t?t.doorOpen:0;g.open=target;const c=g.frame.toWorld(g.base+g.dir*.68*g.open,g.v);g.leaf.position.x=c.x;g.leaf.position.z=c.z;}
    boardClock-=dt;if(boardClock<=0){boardClock=1;drawBoards(position);}
    if(ride){const t=trains[ride.train];if(ride.alightAt&&time>=ride.alightAt&&t.doorOpen>.6){const out=alight();if(out)onEvent({kind:'alighted',...out});}}}
  // ---------- passengers ----------
  // Platform context stays available while waiting and distinguishes terminal arrivals.
  function platformAt(p){
    if(ride||!p||![p.x,p.y,p.z].every(Number.isFinite)||Math.abs(p.y-PLATFORM_Y)>.35||metroFloorAt(p.x,p.z,p.y)!==PLATFORM_Y)return null;
    for(const station of STATIONS){const frame=stationFrame(station),{u,v}=frame.toLocal(p.x,p.z);
      if(Math.abs(u)>station.length/2||Math.abs(v)<PLATFORM.inner||Math.abs(v)>PLATFORM.outer)continue;
      const track=v>0?'A':'B',terminates=terminatesAt(station.id,track),departureTrack=terminates?(track==='A'?'B':'A'):track;
      const wait=arrivals(station.id,track)[0]?.wait??0;
      return {station,track,platform:track==='A'?1:2,u,v,terminates,towards:destinationOf(departureTrack),departurePlatform:departureTrack==='A'?1:2,wait};
    }return null;
  }
  // Interact from the safe platform alongside the car; no need to enter the tracks
  // or hunt a small circular trigger at a door. The nearest actual door is retained.
  function boardable(p){const platform=platformAt(p);if(!platform)return null;
    for(const t of trains){const s=t.state;if(!s?.doors||s.station!==platform.station.id||s.track!==platform.track||s.speed!==0||t.doorOpen<.6)continue;
      const frame=stationFrame(platform.station),center=frame.toLocal(t.group.position.x,t.group.position.z);
      if(Math.abs(platform.u-center.u)>trainSpec.length/2+.5)continue;
      const doorway=DOORWAYS.reduce((a,b)=>{const wa=doorWorld(t,a,2.4),wb=doorWorld(t,b,2.4);return Math.hypot(p.x-wa.x,p.z-wa.z)<Math.hypot(p.x-wb.x,p.z-wb.z)?a:b;});
      return {train:t.index,doorway,station:platform.station,terminates:platform.terminates,towards:platform.towards,stops:platform.terminates?[]:stationsAhead(t),departsIn:Math.max(0,s.remaining-3)};
    }return null;
  }
  function board(trainIndex,destination,actor=me()){
    if(!Number.isInteger(trainIndex)||!actor?.position||!stationIds.has(destination))return false;
    const b=boardable(actor.position);if(!b||b.train!==trainIndex||b.terminates||!b.stops.some(s=>s.id===destination))return false;
    ride={train:trainIndex,destination,boardedAt:b.station.id,alightAt:null,view:'outside',slot:[.8,-6.45]};carry(actor);return true;}
  function carry(actor=me()){if(!ride||!actor)return;const t=trains[ride.train],yaw=t.group.rotation.y,[lx,lz]=ride.slot,x=Math.cos(yaw),z=-Math.sin(yaw),fx=Math.sin(yaw),fz=Math.cos(yaw);
    actor.position.set(t.group.position.x+x*lx+fx*lz,RAIL_Y+trainSpec.floor,t.group.position.z+z*lx+fz*lz);actor.rotation.y=yaw;}
  // Step out of the nearest doorway onto the platform (doors must be open).
  function alight(actor=me()){if(!ride||!actor?.position)return null;const t=trains[ride.train],s=t.state;if(!s?.doors||!s.station||s.speed!==0||t.doorOpen<.6)return null;
    const [,lz]=ride.slot,d=DOORWAYS.reduce((a,b)=>Math.abs(b-lz)<Math.abs(a-lz)?b:a),w=doorWorld(t,d,2.9);
    if(metroFloorAt(w.x,w.z,PLATFORM_Y)!==PLATFORM_Y)return null;
    const station=stationById(s.station);ride=null;actor.position.set(w.x,PLATFORM_Y,w.z);actor.rotation.y=t.group.rotation.y+Math.PI/2;return {station,x:w.x,y:PLATFORM_Y,z:w.z};}
  function changeDestination(id){if(!ride)return false;const t=trains[ride.train];if(!stationsAhead(t).some(x=>x.id===id)&&!(t.state.station===id&&t.state.doors))return false;ride.destination=id;if(t.state.station===id&&t.state.doors)ride.alightAt=time+.2;return true;}
  function rideInfo(){if(!ride)return null;const t=trains[ride.train];return {train:ride.train,destination:stationById(ride.destination),ahead:stationsAhead(t),speed:t.state.speed,stopped:t.state.speed===0,doors:!!t.state.doors,at:t.state.station?stationById(t.state.station):null,view:ride.view,position:t.group.position,yaw:t.group.rotation.y};}
  function setView(view){if(ride)ride.view=view==='inside'?'inside':'outside';return ride?.view;}
  // Height of the metro floor under the player, only near the player (cars and other
  // walkers below a platform keep the street).
  function floorAt(x,z,refY){const player=me();if(!player||Math.abs(x-player.position.x)>2.5||Math.abs(z-player.position.z)>2.5)return null;if(ride)return RAIL_Y+trainSpec.floor;return metroFloorAt(x,z,refY);}
  function walk(from,x,z){return metroWalk(from,x,z);}
  function nearestStation(p,range=60){let best=null,dist=range;for(const info of stations){const d=Math.hypot(p.x-info.frame.x,p.z-info.frame.z);if(d<dist){dist=d;best=info.station;}}return best;}
  function nearestLandmark(p){if(ride||!p)return null;const st=nearestStation(p,36);if(!st)return null;const F=stationFrame(st);return {id:st.id,name:st.name+' station',x:F.x,z:F.z,fact:METRO_FACTS[st.id],think:METRO_THINK[st.id],station:st};}
  // Red Line on the overview maps: an SVG fragment for the world map and canvas strokes for the minimap.
  const mapPoints=CENTRELINE.filter((q,i)=>i%10===0||i===CENTRELINE.length-1);
  function mapSvg(mx,mz){return '<polyline points="'+mapPoints.map(q=>mx(q.x).toFixed(1)+','+mz(q.z).toFixed(1)).join(' ')+'" fill="none" stroke="#e0343a" stroke-width="3"/>'+STATIONS.map(st=>'<circle cx="'+mx(st.at[0]).toFixed(1)+'" cy="'+mz(st.at[1]).toFixed(1)+'" r="2.6" fill="#fff"/>').join('')+'<text x="'+(mx(100)+6).toFixed(1)+'" y="'+(mz(-1760)-4).toFixed(1)+'" fill="#ff8b8f" font-size="11">Ⓜ RED LINE</text>';}
  function drawMinimap(ctx,px,pz){ctx.strokeStyle='#e0343a';ctx.lineWidth=2.5;ctx.beginPath();mapPoints.forEach((q,i)=>i?ctx.lineTo(px(q.x),pz(q.z)):ctx.moveTo(px(q.x),pz(q.z)));ctx.stroke();ctx.fillStyle='#ffffff';for(const st of STATIONS){ctx.beginPath();ctx.arc(px(st.at[0]),pz(st.at[1]),2.6,0,Math.PI*2);ctx.fill();}}
  return {root,trains,stations,gates,boards,columns,streetTotems,models,loadModels,update,arrivals,boardable,board,alight,carry,changeDestination,rideInfo,setView,floorAt,walk,platformAt,nearestStation,nearestLandmark,
    mapSvg,drawMinimap,isRiding:()=>!!ride,safePoint:p=>metroSafePoint(p,!!ride),get time(){return time;},set time(v){time=v;},batches:meshes,entrance:entranceGroup,stops:STOPS};
}
