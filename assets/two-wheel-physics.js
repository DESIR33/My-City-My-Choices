const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
const damp=(n,t,k,dt)=>n+(t-n)*(1-Math.exp(-k*dt));
export const TWO_WHEEL_SPECS=Object.freeze({
 bicycle:{name:'Maple commuter bicycle',wheelbase:1.08,length:1.82,width:.64,radius:.345,mass:82,maxSpeed:9.5,maxLean:.55,braking:6,power:210,seat:.79},
 motorcycle:{name:'Sunshore 650 roadster',wheelbase:1.43,length:2.12,width:.79,radius:.325,mass:264,maxSpeed:30,maxLean:.72,braking:9.2,power:41000,seat:.8},
});
export function createTwoWheelState(kind,x=0,z=0,heading=0){if(!TWO_WHEEL_SPECS[kind])throw new Error('Unknown two-wheeler');return {kind,x,z,heading,speed:0,steering:0,yawRate:0,lean:0,leanVelocity:0,throttle:0,brake:0,acceleration:0,travel:0,pedalAngle:0,cadence:0,rpm:kind==='motorcycle'?1200:0,gear:'N',pitch:0,pushing:false};}
export function twoWheelFootprint(x,z,heading,kind){const s=TWO_WHEEL_SPECS[kind],c=Math.cos(heading),sn=Math.sin(heading);return [[-s.width/2,-s.length/2],[s.width/2,-s.length/2],[s.width/2,s.length/2],[-s.width/2,s.length/2]].map(([a,b])=>({x:x+a*c+b*sn,z:z-a*sn+b*c}));}
export function advanceTwoWheeler(state,input,elapsed,canOccupy=()=>true,height=()=>.06){
 const spec=TWO_WHEEL_SPECS[state.kind],duration=clamp(Number.isFinite(elapsed)?elapsed:0,0,.1),f=clamp(input.forward||0,-1,1),steer=clamp(input.steer||0,-1,1);let remaining=duration,distance=0,collided=false,impactSpeed=0;
 while(remaining>1e-8){const dt=Math.min(remaining,1/120);remaining-=dt;const old=state.speed,abs=Math.abs(old),pushing=!!input.walkBack&&f<-.1&&abs<1.4;
  state.pushing=pushing;state.throttle=damp(state.throttle,f>0&&!input.rearBrake?f:0,6,dt);state.brake=damp(state.brake,pushing?0:Math.max(-f,input.rearBrake?.58:0),15,dt);
  const drag=(state.kind==='motorcycle'? .009*abs*abs:.006*abs*abs)+.07,grade=(height(state.z+Math.cos(state.heading)*.6)-height(state.z-Math.cos(state.heading)*.6))/1.2;
  const powerForce=state.kind==='bicycle'?Math.min(170,spec.power/Math.max(abs,1.3)):Math.min(2350,spec.power/Math.max(abs,6));
  let acceleration=state.throttle*powerForce/spec.mass-Math.sign(old)*drag-9.81*grade;
  if(pushing)acceleration=(-1.05-old)*4;else if(state.brake>.01)acceleration-=Math.sign(old||1)*state.brake*spec.braking;
  let next=clamp(old+acceleration*dt,pushing?-1.1:Math.min(0,old),spec.maxSpeed);
  if(!pushing&&old<=0&&f<=0||state.brake>.1&&Math.sign(next)!==Math.sign(old))next=0;
  if(Math.abs(next)<.025&&f<=0&&!pushing)next=0;
  state.speed=next;state.acceleration=(next-old)/dt;
  // Steering authority decreases with speed, with yaw capped by the tyre's
  // combined cornering/braking grip. Lean follows v²/(g*r), not a fixed tilt.
  const maxSteer=.66/(1+abs*(state.kind==='motorcycle'?.14:.1)),targetSteer=steer*maxSteer;state.steering=damp(state.steering,targetSteer,7,dt);
  const grip=9.81*(input.rearBrake?.48:.85)*Math.sqrt(Math.max(.18,1-Math.pow(state.brake*.78,2))),desiredYaw=state.speed*Math.tan(state.steering)/spec.wheelbase;
  state.yawRate=abs<.04?0:damp(state.yawRate,clamp(desiredYaw,-grip/Math.max(abs,1),grip/Math.max(abs,1)),10,dt);
  const heading=state.heading+state.yawRate*dt,step=state.speed*dt,x=state.x+Math.sin(heading)*step,z=state.z+Math.cos(heading)*step;
  if(canOccupy(x,z,heading)){state.x=x;state.z=z;state.heading=heading;state.travel+=step;distance+=Math.abs(step);}else{impactSpeed=Math.max(impactSpeed,Math.abs(state.speed));state.speed=state.throttle=state.yawRate=0;state.acceleration=0;collided=true;remaining=0;}
  const leanTarget=abs<1.3||pushing?0:clamp(-Math.atan2(state.speed*state.yawRate,9.81),-spec.maxLean,spec.maxLean);state.leanVelocity+=((leanTarget-state.lean)*58-state.leanVelocity*14)*dt;state.lean=clamp(state.lean+state.leanVelocity*dt,-spec.maxLean,spec.maxLean);
  state.pitch=damp(state.pitch,clamp(-state.acceleration*.005,-.045,.065),10,dt);
  const pedaling=state.kind==='bicycle'&&f>.1&&!input.rearBrake&&state.speed>.15&&!pushing;state.cadence=damp(state.cadence,pedaling?clamp(state.speed*13,35,105):0,8,dt);state.pedalAngle+=state.cadence*Math.PI*2/60*dt;
 }
 const v=Math.abs(state.speed);state.gear=state.pushing?'WALK':v<.15?'N':state.kind==='bicycle'?'PEDAL':String(v<5?1:v<10?2:v<16?3:v<22?4:v<27?5:6);state.rpm=state.kind==='bicycle'?state.cadence:damp(state.rpm,clamp(1200+v*220+state.throttle*1200,1200,8500),7,duration);
 return {distance,collided,impactSpeed};
}
