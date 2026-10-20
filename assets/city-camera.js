export const CAMERA_STORAGE='mapleStreetCameraV1';
export function restoreCamera(value){return {motion:value?.motion==='cinematic'?'cinematic':'steady',distance:['close','standard','wide'].includes(value?.distance)?value.distance:'standard'};}
export function cameraDistance(settings){return {close:.82,standard:1,wide:1.18}[settings.distance]||1;}
export function cameraFieldOfView(aspect,speed,settings){return (aspect<.8?74:64)+(settings.motion==='cinematic'?Math.min(6,Math.abs(speed||0)*.28):0);}
const mix=(a,b,t)=>a+(b-a)*t,dist=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y,a.z-b.z);
// A conservative swept camera sphere against finite-height architecture boxes.
export function cameraSegmentHit(a,b,box,radius=.22){let lo=0,hi=1;for(const axis of ['x','y','z']){const key=axis.toUpperCase(),min=box['min'+key]-radius,max=box['max'+key]+radius,d=b[axis]-a[axis];if(Math.abs(d)<1e-9){if(a[axis]<min||a[axis]>max)return null;}else{const p=(min-a[axis])/d,q=(max-a[axis])/d;lo=Math.max(lo,Math.min(p,q));hi=Math.min(hi,Math.max(p,q));if(lo>hi)return null;}}
 if(lo===0){const inside=['x','y','z'].every(k=>a[k]>=box['min'+k.toUpperCase()]-radius&&a[k]<=box['max'+k.toUpperCase()]+radius);if(inside){const faces=['x','y','z'].flatMap(k=>[{k,sign:-1,gap:a[k]-(box['min'+k.toUpperCase()]-radius)},{k,sign:1,gap:box['max'+k.toUpperCase()]+radius-a[k]}]),nearest=Math.min(...faces.map(f=>f.gap));if(faces.some(f=>f.gap<=nearest+1e-7&&(b[f.k]-a[f.k])*f.sign>0))return null;}}
 return lo;
}
export function createCameraWorld(boxes=[]){const cells=new Map(),size=16;let count=0;
 function rebuild(next){cells.clear();count=0;for(const box of next){if(!['minX','maxX','minY','maxY','minZ','maxZ'].every(k=>Number.isFinite(box[k])))continue;if(box.maxX-box.minX>300||box.maxZ-box.minZ>300)continue;count++;for(let x=Math.floor(box.minX/size);x<=Math.floor(box.maxX/size);x++)for(let z=Math.floor(box.minZ/size);z<=Math.floor(box.maxZ/size);z++){const key=x+','+z;if(!cells.has(key))cells.set(key,[]);cells.get(key).push(box);}}}
 function resolve(a,b,radius=.22){const nearby=new Set();for(let x=Math.floor((Math.min(a.x,b.x)-radius)/size);x<=Math.floor((Math.max(a.x,b.x)+radius)/size);x++)for(let z=Math.floor((Math.min(a.z,b.z)-radius)/size);z<=Math.floor((Math.max(a.z,b.z)+radius)/size);z++)for(const box of cells.get(x+','+z)||[])nearby.add(box);let fraction=1;for(const box of nearby){const hit=cameraSegmentHit(a,b,box,radius);if(hit!==null)fraction=Math.min(fraction,Math.max(0,hit-.015/Math.max(.01,dist(a,b))));}return {x:mix(a.x,b.x,fraction),y:mix(a.y,b.y,fraction),z:mix(a.z,b.z,fraction),occluded:fraction<1};}
 rebuild(boxes);return {rebuild,resolve,get count(){return count}};
}
export function createCameraRig(resolve=(a,b)=>({...b})){let position=null,lastAnchor=null,fov=null;
 function update(anchor,desired,dt,{room=null,targetFov=64}={}){const clampRoom=p=>{if(!room)return p;return {x:Math.max(room.minX+.22,Math.min(room.maxX-.22,p.x)),y:Math.max(anchor.y-.4,Math.min(room.ceiling-.3,p.y)),z:Math.max(room.minZ+.22,Math.min(room.maxZ-.22,p.z))};},safe=resolve(anchor,clampRoom(desired));const reset=!position||!lastAnchor||dist(anchor,lastAnchor)>12,alpha=1-Math.exp(-Math.max(0,Math.min(dt,.1))*8);
 let candidate=reset?{...safe}:{x:mix(position.x,safe.x,alpha),y:mix(position.y,safe.y,alpha),z:mix(position.z,safe.z,alpha)};
 candidate=resolve(anchor,clampRoom(candidate));position={x:candidate.x,y:candidate.y,z:candidate.z};lastAnchor={...anchor};fov=reset||fov===null?targetFov:mix(fov,targetFov,alpha*.5);return {...position,fov,occluded:!!safe.occluded};}
 return {update,reset(){position=null;lastAnchor=null;fov=null}};
}

export function cameraTerrainLimit(a,b,height,clearance=.2){const length=dist(a,b),steps=Math.max(1,Math.ceil(length/.25));for(let i=1;i<=steps;i++){const t=i/steps,x=mix(a.x,b.x,t),z=mix(a.z,b.z,t),y=mix(a.y,b.y,t);if(y<height(x,z)+clearance){const safe=Math.max(0,(i-1)/steps);return {x:mix(a.x,b.x,safe),y:mix(a.y,b.y,safe),z:mix(a.z,b.z,safe),occluded:true};}}return {...b};}
