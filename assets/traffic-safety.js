// Predict people entering a lane, then limit the actual swept vehicle step.
// World units are metres; only actors on the same road level can conflict.
const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
export function createPedestrianTracker(){
  const samples=new WeakMap();
  return {sample(actors,dt,{exclude=new Set()}={}){const result=[];for(const actor of actors){if(!actor?.position)continue;const p=actor.position,last=samples.get(actor);let vx=0,vz=0;if(last&&dt>0&&dt<=.2){vx=(p.x-last.x)/dt;vz=(p.z-last.z)/dt;if(Math.hypot(vx,vz)>7)vx=vz=0;}samples.set(actor,{x:p.x,z:p.z});if(exclude.has(actor)||actor.visible===false||actor.userData?.character?.riding)continue;result.push({x:p.x,y:p.y||0,z:p.z,vx,vz});}return result;}};
}
function laneInterval(side,velocity,halfWidth,horizon){if(Math.abs(velocity)<.001)return Math.abs(side)<=halfWidth?[0,horizon]:null;const a=(-halfWidth-side)/velocity,b=(halfWidth-side)/velocity,start=Math.max(0,Math.min(a,b)),end=Math.min(horizon,Math.max(a,b));return end>=start?[start,end]:null;}
export function pedestrianYield({x,z,y=0,axis='z',direction=1,speed=0,length=4.72,width=2.02},people,dt){
  const other=axis==='z'?'x':'z',along=axis==='z'?z:x,side=axis==='z'?x:z,dir=Math.sign(direction)||1,v=Math.max(0,speed),horizon=clamp(1.1+v/5,1.1,3.5);let clearance=Infinity,hardClearance=Infinity;
  for(const p of people){if(Math.abs((p.y||0)-y)>2)continue;const lateral=p[other]-side,lateralSpeed=other==='x'?(p.vx||0):(p.vz||0),forward=dir*(p[axis]-along),forwardSpeed=dir*(axis==='x'?(p.vx||0):(p.vz||0));
    // Broad phase: ignore distant people and anyone wholly behind the rear bumper.
    if(Math.abs(lateral)>1.65+Math.abs(lateralSpeed)*horizon||forward < -length/2-.6||forward>v*horizon+length/2+8)continue;
    const interval=laneInterval(lateral,lateralSpeed,width/2+.55,horizon);if(!interval)continue;
    const [enter,leave]=interval,front=length/2+.55;
    // Yield only if the crossing overlaps this vehicle's arrival interval.
    const arrival=v>.1?Math.max(0,(forward-front)/v):Infinity;
    if(enter===0||(arrival>=enter-.7&&arrival<=leave+.7))clearance=Math.min(clearance,Math.max(0,forward+Math.min(0,forwardSpeed)*enter-front-.6));
    // An immediate swept envelope prevents clipping even after a sudden step out.
    const now=laneInterval(lateral,lateralSpeed,width/2+.5,Math.max(0,dt));
    if(now)hardClearance=Math.min(hardClearance,Math.max(0,forward+Math.min(0,forwardSpeed)*Math.max(0,dt)-front));
  }
  return {clearance,hardClearance,speedLimit:Number.isFinite(clearance)?Math.sqrt(2*4*Math.max(0,clearance)):Infinity,yielding:Number.isFinite(clearance)};
}
export function pedestrianStepClear(from,to,vehicles,radius=.45){
  // Segment against each vehicle's expanded oriented footprint; no point tunnelling.
  for(const v of vehicles){if(Math.abs((v.y||0)-(from.y||0))>2)continue;const sin=Math.sin(v.heading||0),cos=Math.cos(v.heading||0),local=p=>{const dx=p.x-v.x,dz=p.z-v.z;return [dx*cos-dz*sin,dx*sin+dz*cos];},a=local(from),b=local(to),half=[(v.width||2.02)/2+radius,(v.length||4.72)/2+radius];let lo=0,hi=1;
    for(let k=0;k<2;k++){const d=b[k]-a[k];if(Math.abs(d)<1e-8){if(Math.abs(a[k])>half[k]){lo=2;break;}}else{const p=(-half[k]-a[k])/d,q=(half[k]-a[k])/d;lo=Math.max(lo,Math.min(p,q));hi=Math.min(hi,Math.max(p,q));}}
    if(lo<=hi){
      // If a player-driven car has already encroached, let the person walk out
      // along an outward path rather than trapping them inside its envelope.
      const inside=a.every((n,k)=>Math.abs(n)<=half[k]);
      const outward=a[0]*(b[0]-a[0])+a[1]*(b[1]-a[1])>=0;
      const depth=p=>Math.max(Math.abs(p[0])/half[0],Math.abs(p[1])/half[1]);
      if(inside&&outward&&depth(b)>depth(a)+1e-6)continue;
      return false;
    }
  }
  return true;
}
