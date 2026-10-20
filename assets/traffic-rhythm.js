export const TRAFFIC_STORAGE='mapleStreetTrafficV1';
const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
export function restoreTraffic(value){return {mode:['auto','busy','quiet'].includes(value?.mode)?value.mode:'auto',horns:value?.horns!==false};}
const peak=(h,start,top,end)=>h<start||h>end?0:h<top?(h-start)/(top-start):(end-h)/(end-top);
export function trafficRegion(z){return z < -1135?'north':z>1040?'coast':Math.abs(z)>170?'connector':'maple';}
export function trafficDemand(hour,weekday=2,region='maple',mode='auto'){
 const h=((Number.isFinite(hour)?hour:12)%24+24)%24,weekend=weekday===0||weekday===6;
 const commute=weekend?0:Math.max(peak(h,6.5,8,10),peak(h,15.5,17.5,19.5)),leisure=weekend?peak(h,10,14,19)*.65:peak(h,11,12.5,14)*.25,coastal=region==='coast'?peak(h,17,20,23)*.65:0;
 const pressure=mode==='busy'?1:mode==='quiet'?0:Math.max(commute,leisure,coastal),night=h<5.5||h>=23;
 const density=mode==='quiet'?.22:mode==='busy'?1:clamp((night?.22:.48)+pressure*.52,.2,1);
 return {density,pressure,speedFactor:1-pressure*.34,headway:.75+pressure*.2,reaction:.3+pressure*.45,label:mode==='busy'?'Rush-hour preview':mode==='quiet'?'Quiet-road preview':commute>.5?'Commuter rush':coastal>.3?'Coastal evening':weekend&&leisure>.2?'Weekend activity':night?'Overnight roads':'Normal city traffic'};
}
export function createRushTrafficPool(traffic,car,{mobile=false}={}){
 const base=traffic.filter(t=>!t.mesh.userData.policeVehicle),groups={maple:[],north:[],coast:[],connector:[]};for(const t of base)groups[trafficRegion(t.mesh.position.z)].push(t);
 const counts=mobile?{maple:4,north:3,coast:3,connector:2}:{maple:8,north:6,coast:6,connector:4};let made=0;
 for(const region of Object.keys(groups)){let routes=groups[region];if(region==='maple')routes=routes.filter(t=>(t.axis||'z')==='z'&&t.mesh.position.x>50);if(region==='coast'||region==='north')routes=routes.filter(t=>(t.axis||'z')==='z');if(!routes.length)routes=groups[region];if(region!=='connector')routes=routes.slice(0,2);if(!routes.length)continue;
  for(let i=0;i<counts[region];i++){const template=routes[i%routes.length],axis=template.axis||'z',dir=Math.sign(template.speed)||1,min=template.min??-165,max=template.max??165,seed=(dir>0?min+8:max-8)+dir*Math.floor(i/routes.length)*14,pos={x:template.mesh.position.x,z:template.mesh.position.z};pos[axis]=clamp(seed,min+6,max-6);car(pos.x,pos.z,0xaaaaaa,template.mesh.rotation.y,true,template.speed,axis);const t=traffic.at(-1);Object.assign(t,{min,max,rushReserve:true,seedAlong:pos[axis]});made++;}
 }return made;
}
export function trafficSoundSample(traffic,listener,yaw=0){let level=0;for(const t of traffic){if(t.mesh.visible===false||t.mesh.userData.trafficInactive)continue;const p=t.mesh.position,d=Math.hypot(p.x-listener.x,p.z-listener.z);if(d<80&&Math.abs((p.y||0)-(listener.y||0))<10)level+=(1-d/80)*(.15+Math.min(1,Math.abs(t.currentSpeed||0)/9));}return clamp(level/7,0,1);}
export function hornLocation(source,listener,yaw=0){const dx=source.x-listener.x,dz=source.z-listener.z,distance=Math.hypot(dx,dz,(source.y||0)-(listener.y||0));return {distance,pan:clamp((-dx*Math.cos(yaw)-dz*Math.sin(yaw))/Math.max(8,distance),-1,1)};}
export function createTrafficDirector({traffic,vehicleRefs,canSpawn=()=>true,onHorn=()=>false}){
 let first=true,time=0,lastHorn=-20;const routes=new WeakMap();
 function route(t,i){if(!routes.has(t)){const p=t.mesh.position,axis=t.axis||'z',dir=Math.sign(t.speed)||1;routes.set(t,{axis,dir,fixed:p[axis==='z'?'x':'z'],min:t.min??-165,max:t.max??165,region:trafficRegion(p.z),seedAlong:t.seedAlong??p[axis],rank:((i*37+19)%101)/101});}return routes.get(t);}
 function tick(dt,{hour=12,weekday=2,listener={x:0,z:0},yaw=0,paused=false,settings=restoreTraffic()}={}){
  if(paused&&!first)return;if(!paused)time+=Math.max(0,Math.min(.1,dt));
  for(const [i,t] of traffic.entries()){const car=t.mesh;if(car.userData.policeVehicle)continue;const r=route(t,i);if(first&&t.rushReserve){car.userData.trafficInactive=true;car.visible=false;car.position.x=10000+i*12;car.position.z=10000;t.currentSpeed=0;}t.flow=trafficDemand(hour,weekday,r.region,settings.mode);const protectedCar=car.userData.disabled||car.userData.responding,needed=r.rank<t.flow.density||protectedCar;
   if(!needed&&!car.userData.trafficInactive&&!protectedCar&&(first||Math.hypot(car.position.x-listener.x,car.position.z-listener.z)>160)){
    if(Math.hypot(car.position.x-listener.x,car.position.z-listener.z)<12)continue;car.userData.trafficInactive=true;car.visible=false;car.position.x=10000+i*12;car.position.z=10000;t.currentSpeed=0;t.queueWait=0;
   }
   if(needed&&car.userData.trafficInactive||first&&needed&&t.rushReserve){const choices=first?[r.seedAlong,r.dir>0?r.min+8:r.max-8]:[r.dir>0?r.min+8:r.max-8];for(const along of choices){const p={x:r.axis==='x'?along:r.fixed,z:r.axis==='z'?along:r.fixed};if(!first&&Math.hypot(p.x-listener.x,p.z-listener.z)<160)continue;if(!canSpawn(t,p))continue;car.position.x=p.x;car.position.z=p.z;car.visible=true;car.userData.trafficInactive=false;t.currentSpeed=0;t.queueWait=0;break;}}
   if(car.userData.trafficInactive||paused)continue;
   t.queueWait=t.currentSpeed<.3&&t.queueBlocked&&!t.obeyingSignal&&!t.yieldingToPedestrian?(t.queueWait||0)+dt:0;
   if(settings.horns&&t.queueWait>5+i%4&&time-(t.lastHorn??-100)>35+i%17&&time-lastHorn>8){const location=hornLocation(car.position,listener,yaw);if(location.distance<65&&onHorn({...location,variant:i%3})){t.lastHorn=time;lastHorn=time;t.queueWait=0;}}
  }first=false;
 }
 return {tick,get time(){return time}};
}
export function trafficEntryClear(t,position,refs,people=[]){return !refs.some(({group:g})=>g!==t.mesh&&g.visible!==false&&Math.hypot(g.position.x-position.x,g.position.z-position.z)<10)&&!people.some(p=>Math.hypot(p.x-position.x,p.z-position.z)<7);}
