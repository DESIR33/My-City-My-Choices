const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
const silent=()=>({level:0,pan:0,pitch:1});
// Track only the current response, never every vehicle. Arrival/returning reset
// history so a new dispatch or a teleport cannot produce a Doppler spike.
export function createEmergencyAudioTracker(){let last=null;
 function sample(response,listener,yaw=0,dt=0){const car=response?.car,p=car?.position;if(!p||response.arrived||response.returning||car.visible===false||car.userData?.disabled){last=null;return silent();}
  const source={x:p.x,y:p.y||0,z:p.z},ear={x:listener?.x,y:listener?.y||0,z:listener?.z};if(![...Object.values(source),...Object.values(ear)].every(Number.isFinite)){last=null;return silent();}
  const dx=source.x-ear.x,dz=source.z-ear.z,distance=Math.hypot(dx,dz,source.y-ear.y);let pitch=1;
  if(last?.car===car&&dt>0&&dt<=.1&&Math.hypot(source.x-last.source.x,source.y-last.source.y,source.z-last.source.z)<6&&Math.hypot(ear.x-last.ear.x,ear.y-last.ear.y,ear.z-last.ear.z)<4){const radial=clamp((distance-last.distance)/dt,-30,30);pitch=clamp(343/(343+radial),.92,1.1);}
  if(dt>0||!last)last={car,source,ear,distance};const angle=Number.isFinite(yaw)?yaw:0;
  return {level:Math.pow(clamp(1-distance/160,0,1),1.7),pan:clamp((-dx*Math.cos(angle)-dz*Math.sin(angle))/Math.max(8,distance),-1,1),pitch};
 }
 return {sample,reset(){last=null;}};
}
