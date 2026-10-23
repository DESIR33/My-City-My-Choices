import {COMMUNITY_ROADS,MAPLE_STREETS,NORTH_CITY,COAST_CITY,RONDA,worldDrivable,worldWalkable} from './world-rules.js';
const distance=(a,b)=>Math.hypot(a.x-b.x,a.z-b.z),lerp=(a,b,t)=>({x:a.x+(b.x-a.x)*t,z:a.z+(b.z-a.z)*t});
const key=p=>p.x.toFixed(2)+','+p.z.toFixed(2);
class Heap{constructor(){this.a=[]}push(v){const a=this.a;a.push(v);let i=a.length-1;while(i){let p=(i-1)>>1;if(a[p].score<=v.score)break;a[i]=a[p];i=p;}a[i]=v;}pop(){const a=this.a,r=a[0],v=a.pop();if(a.length){let i=0;while(i*2+1<a.length){let c=i*2+1;if(c+1<a.length&&a[c+1].score<a[c].score)c++;if(a[c].score>=v.score)break;a[i]=a[c];i=c;}a[i]=v;}return r;}get length(){return this.a.length}}
export function createCityNetwork(mode='drive'){
 const nodes=[],edges=[],byKey=new Map(),adj=[];const add=p=>{const k=key(p);if(!byKey.has(k)){byKey.set(k,nodes.length);nodes.push({...p});adj.push([]);}return byKey.get(k);};
 const link=(a,b)=>{if(distance(a,b)>80){const n=Math.ceil(distance(a,b)/60);for(let k=0;k<n;k++)link(lerp(a,b,k/n),lerp(a,b,(k+1)/n));return;}const i=add(a),j=add(b),length=distance(a,b);if(i===j||adj[i].some(e=>e.to===j))return;adj[i].push({to:j,cost:length});adj[j].push({to:i,cost:length});edges.push({a:i,b:j,length});};
 function grid(xs,zs){if(mode==='drive'){for(const x of xs)for(let i=1;i<zs.length;i++)link({x,z:zs[i-1]},{x,z:zs[i]});for(const z of zs)for(let i=1;i<xs.length;i++)link({x:xs[i-1],z},{x:xs[i],z});return;}
  for(const x of xs)for(const z of zs){for(const sx of [-1,1])link({x:x+sx*9.3,z:z-9.3},{x:x+sx*9.3,z:z+9.3});for(const sz of [-1,1])link({x:x-9.3,z:z+sz*9.3},{x:x+9.3,z:z+sz*9.3});}
  for(const x of xs)for(let i=1;i<zs.length;i++)for(const s of [-1,1])link({x:x+s*9.3,z:zs[i-1]+9.3},{x:x+s*9.3,z:zs[i]-9.3});
  for(const z of zs)for(let i=1;i<xs.length;i++)for(const s of [-1,1])link({x:xs[i-1]+9.3,z:z+s*9.3},{x:xs[i]-9.3,z:z+s*9.3});
 }
 grid(MAPLE_STREETS,MAPLE_STREETS);grid(NORTH_CITY.avenues,NORTH_CITY.streets);grid(COAST_CITY.avenues,COAST_CITY.streets);
 // Split each actual subdivision street at its junctions, including the three
 // connections to the original grid. Do not invent roads across private lots.
 for(const r of COMMUNITY_ROADS){const horizontal=r.z1===r.z2,fixed=horizontal?r.z1:r.x1,from=horizontal?Math.min(r.x1,r.x2):Math.min(r.z1,r.z2),to=horizontal?Math.max(r.x1,r.x2):Math.max(r.z1,r.z2);
  const cuts=new Set([from,to]);for(const q of COMMUNITY_ROADS){if((q.z1===q.z2)===horizontal)continue;const cross=horizontal?q.x1:q.z1,low=horizontal?Math.min(q.z1,q.z2):Math.min(q.x1,q.x2),high=horizontal?Math.max(q.z1,q.z2):Math.max(q.x1,q.x2);if(cross>=from&&cross<=to&&fixed>=low&&fixed<=high)cuts.add(cross);}
  if(Math.abs(fixed)<=165)for(const cross of MAPLE_STREETS)if(cross>=from&&cross<=to)cuts.add(cross);
  const points=[...cuts].sort((a,b)=>a-b),point=(along,offset=0)=>horizontal?{x:along,z:fixed+offset}:{x:fixed+offset,z:along};
  if(mode==='drive'){for(let i=1;i<points.length;i++)link(point(points[i-1]),point(points[i]));}
  else {for(const v of points){const c=point(v);for(const side of [-1,1]){link({x:c.x+side*9.3,z:c.z-9.3},{x:c.x+side*9.3,z:c.z+9.3});link({x:c.x-9.3,z:c.z+side*9.3},{x:c.x+9.3,z:c.z+side*9.3});}}for(let i=1;i<points.length;i++)for(const side of [-1,1])link(point(points[i-1]+9.3,side*9.3),point(points[i]-9.3,side*9.3));}
 }

 if(mode==='drive'){link({x:0,z:-120},{x:0,z:-1150});link({x:0,z:-1150},{x:-60,z:-1150});link({x:0,z:-1150},{x:60,z:-1150});link({x:0,z:120},{x:0,z:1080});}
 else for(const s of [-1,1]){link({x:s*9.3,z:-129.3},{x:s*9.3,z:-1140.7});link({x:s*9.3,z:-1140.7},{x:s*50.7,z:-1140.7});link({x:s*9.3,z:129.3},{x:s*9.3,z:1070.7});}
 // Ronda: the link road leaves Sunshore's west avenue, then the old town's shared
 // streets. The east street stops at the gorge; only the Puente Nuevo crosses it.
 {const [a,b]=RONDA.roads.ew,[c,d]=RONDA.roads.ns,g=RONDA.gorge,line=(...ps)=>{for(let i=1;i<ps.length;i++)link(ps[i-1],ps[i]);};
  const west=COAST_CITY.avenues[0]-(mode==='drive'?0:15);line({x:west,z:a},{x:d,z:a},{x:c,z:a},{x:-660,z:a});line({x:-660,z:b},{x:c,z:b},{x:d,z:b},{x:-302,z:b});
  line({x:c,z:1180},{x:c,z:a},{x:c,z:b},{x:c,z:1820});line({x:d,z:1180},{x:d,z:a},{x:d,z:g.minZ-3});line({x:d,z:g.maxZ+3},{x:d,z:b},{x:d,z:1820});
  if(mode!=='drive')for(const s of [-1,1])link({x:COAST_CITY.avenues[0]-9.3,z:a+s*9.3},{x:west,z:a});}
 return {nodes,edges,adj,mode};
}
function project(p,a,b){const dx=b.x-a.x,dz=b.z-a.z,t=dx*dx+dz*dz===0?0:Math.max(0,Math.min(1,((p.x-a.x)*dx+(p.z-a.z)*dz)/(dx*dx+dz*dz)));return {...lerp(a,b,t),t};}
export function createWalkValidator(obstacles=[]){
 const cells=new Map(),doors=[];for(const o of obstacles){if(o.dynamicDoor){doors.push(o);continue;}if(o.vehicleOnly||o.houseId||o.vehiclePose||o.ride||![o.minX,o.maxX,o.minZ,o.maxZ].every(Number.isFinite))continue;for(let x=Math.floor((o.minX-.5)/16);x<=Math.floor((o.maxX+.5)/16);x++)for(let z=Math.floor((o.minZ-.5)/16);z<=Math.floor((o.maxZ+.5)/16);z++){const k=x+','+z;if(!cells.has(k))cells.set(k,[]);cells.get(k).push(o);}}
 return (x,z)=>worldWalkable(x,z)&&!(cells.get(Math.floor(x/16)+','+Math.floor(z/16))||[]).some(o=>x>o.minX-.48&&x<o.maxX+.48&&z>o.minZ-.48&&z<o.maxZ+.48)&&!doors.some(o=>o.minY<1.85&&o.maxY>.38&&x>o.minX-.42&&x<o.maxX+.42&&z>o.minZ-.42&&z<o.maxZ+.42);
}
export function lineClear(a,b,valid){const n=Math.max(1,Math.ceil(distance(a,b)/.6));for(let i=0;i<=n;i++){const p=lerp(a,b,i/n);if(!valid(p.x,p.z))return false;}return true;}
export function localWalkPath(a,b,valid){
 if(!valid(a.x,a.z)||!valid(b.x,b.z))return null;if(lineClear(a,b,valid))return [a,b];if(distance(a,b)>180)return null;
 const minX=Math.min(a.x,b.x)-12,maxX=Math.max(a.x,b.x)+12,minZ=Math.min(a.z,b.z)-12,maxZ=Math.max(a.z,b.z)+12,open=new Heap(),records=new Map();const first={p:a,g:0,parent:null};records.set('0,0',first);open.push({score:distance(a,b),id:'0,0'});let iterations=0,end=null;
 while(open.length&&iterations++<12000){const current=open.pop(),r=records.get(current.id);if(r.closed)continue;r.closed=true;if(distance(r.p,b)<1.6&&lineClear(r.p,b,valid)){end=r;break;}
  const [ix,iz]=current.id.split(',').map(Number);for(const [dx,dz] of [[1,0],[-1,0],[0,1],[0,-1],[1,1],[1,-1],[-1,1],[-1,-1]]){const id=(ix+dx)+','+(iz+dz),p={x:a.x+ix+dx,z:a.z+iz+dz};if(p.x<minX||p.x>maxX||p.z<minZ||p.z>maxZ||!lineClear(r.p,p,valid))continue;const g=r.g+Math.hypot(dx,dz),old=records.get(id);if(old&&old.g<=g)continue;records.set(id,{p,g,parent:r});open.push({score:g+distance(p,b),id});}
 }
 if(!end)return null;const points=[b];for(let r=end;r;r=r.parent)points.push(r.p);points.reverse();const out=[points[0]];for(let i=0;i<points.length-1;){let j=points.length-1;while(j>i+1&&!lineClear(points[i],points[j],valid))j--;out.push(points[j]);i=j;}return out;
}
const length=points=>points.slice(1).reduce((n,p,i)=>n+distance(points[i],p),0);
function compact(points){return points.filter((p,i)=>!i||distance(points[i-1],p)>.03).reduce((out,p)=>{if(out.length>1){const a=out.at(-2),b=out.at(-1),cross=(b.x-a.x)*(p.z-b.z)-(b.z-a.z)*(p.x-b.x);if(Math.abs(cross)<.01&&(b.x-a.x)*(p.x-b.x)+(b.z-a.z)*(p.z-b.z)>=0)out.pop();}out.push(p);return out;},[]);}
export function planCityRoute(start,target,{mode='walk',network=createCityNetwork(mode==='walk'?'walk':'drive'),walkValid=createWalkValidator()}={}){
 if(!start||!target||![start.x,start.z,target.x,target.z].every(Number.isFinite))return null;
 const driving=mode!=='walk',goal=driving?(target.parking||target):target,valid=driving?worldDrivable:walkValid;
 function attachments(p){const nearest=network.edges.map((edge,index)=>{const point=project(p,network.nodes[edge.a],network.nodes[edge.b]);return {edge,index,point,d:distance(p,point)};}).sort((a,b)=>a.d-b.d);const choices=[];
  for(const c of nearest.slice(0,16)){const path=driving?(lineClear(p,c.point,valid)?[p,c.point]:null):localWalkPath(p,c.point,walkValid);if(path){choices.push({...c,path,cost:length(path)});if(choices.length===3)break;}}return choices;
 }
 const starts=attachments(start),ends=attachments(goal);if(!starts.length||!ends.length)return null;
 const size=network.nodes.length,adj=network.adj.map(a=>a.slice()),nodes=[...network.nodes,start,goal];adj.push([],[]);const join=(a,b,cost,path)=>{adj[a].push({to:b,cost,path});adj[b].push({to:a,cost,path:path.slice().reverse()});};
 for(const [attachments,id] of [[starts,size],[ends,size+1]])for(const c of attachments){join(id,c.edge.a,c.cost+c.point.t*c.edge.length,[...c.path,network.nodes[c.edge.a]]);join(id,c.edge.b,c.cost+(1-c.point.t)*c.edge.length,[...c.path,network.nodes[c.edge.b]]);}
 for(const a of starts)for(const b of ends)if(a.index===b.index)join(size,size+1,a.cost+b.cost+distance(a.point,b.point),[...a.path,b.point,...b.path.slice().reverse()]);
 const costs=new Map([[size,0]]),previous=new Map(),queue=new Heap();queue.push({id:size,score:0});
 while(queue.length){const item=queue.pop();if(item.score!==costs.get(item.id))continue;if(item.id===size+1)break;for(const edge of adj[item.id]){const cost=item.score+edge.cost;if(cost<(costs.get(edge.to)??Infinity)){costs.set(edge.to,cost);previous.set(edge.to,{from:item.id,path:edge.path||[nodes[item.id],nodes[edge.to]]});queue.push({id:edge.to,score:cost});}}}
 if(!previous.has(size+1))return null;const legs=[];for(let id=size+1;id!==size;){const step=previous.get(id);legs.unshift(step.path);id=step.from;}let points=legs.flat().filter((p,i,a)=>!i||distance(a[i-1],p)>.03);
 if(!driving){const refined=[];for(let i=1;i<points.length;i++){const leg=lineClear(points[i-1],points[i],walkValid)?[points[i-1],points[i]]:localWalkPath(points[i-1],points[i],walkValid);if(!leg)return null;refined.push(...leg);}points=compact(refined);}else points=compact(points);
 if(points.length===1)points.push({...points[0]});
 return {points,total:length(points),mode,target:{...target},walkDistance:driving?distance(goal,target):0};
}
export function routeProgress(route,position,{heading=0,speed=0}={}){
 const p=route?.points;if(!p?.length)return null;let nearest=null,travelled=0;
 for(let i=1;i<p.length;i++){const q=project(position,p[i-1],p[i]),d=distance(position,q),segment=distance(p[i-1],p[i]);if(!nearest||d<=nearest.offRoute+1e-7)nearest={point:q,offRoute:d,index:i,along:travelled+segment*q.t};travelled+=segment;}
 const remaining=Math.max(0,route.total-nearest.along),arrived=distance(position,p.at(-1))<(route.mode==='walk'?2.4:6),next=p[nearest.index];let until=distance(nearest.point,next),turn='Continue straight';
 for(let i=nearest.index;i<p.length-1;i++){const a=p[i-1],b=p[i],c=p[i+1],inX=b.x-a.x,inZ=b.z-a.z,outX=c.x-b.x,outZ=c.z-b.z,angle=Math.atan2(inZ*outX-inX*outZ,inX*outX+inZ*outZ);if(Math.abs(angle)>.6&&distance(b,c)>4&&distance(a,b)>4){turn=angle<0?'Turn right':'Turn left';break;}if(i+1<p.length-1)until+=distance(b,c);else until=remaining;}
 const direction=Math.atan2(next.x-position.x,next.z-position.z),wrongWay=speed>1.3&&Math.abs(Math.atan2(Math.sin(direction-heading),Math.cos(direction-heading)))>2.1;
 const message=arrived?(route.mode==='walk'?'You have arrived':route.walkDistance>3?'Park safely and continue on foot':'You have arrived · park safely'):wrongWay?'Turn around when safe':turn==='Continue straight'?'Continue straight':until<8?turn:Math.round(until)+' m · '+turn.toLowerCase();
 return {...nearest,remaining,arrived,message,turn,distanceToTurn:until,etaSeconds:remaining/(route.mode==='walk'?1.7:route.mode==='bicycle'?4.5:9),remainingPoints:[nearest.point,...p.slice(nearest.index)]};
}
export function formatRouteDistance(metres){return metres>=1000?(metres/1000).toFixed(1)+' km':Math.max(0,Math.round(metres))+' m';}
export function createCityNavigator({obstacles=[]}={}){
 const networks={walk:createCityNetwork('walk'),drive:createCityNetwork('drive')};let valid=createWalkValidator(obstacles),route=null,target=null,mode='walk',retry=0,replans=0;
 return {setTarget(value){target=value;route=null;retry=0;},refreshObstacles(value){valid=createWalkValidator(value);route=null;retry=0;},get route(){return route;},get target(){return target;},get replans(){return replans;},update(position,{mode:nextMode='walk',heading=0,speed=0,dt=.1}={}){if(!target)return null;retry=Math.max(0,retry-dt);if(mode!==nextMode){mode=nextMode;route=null;retry=0;}let progress=routeProgress(route,position,{heading,speed});if((!route||progress.offRoute>(mode==='walk'?8:18))&&retry===0){route=planCityRoute(position,target,{mode,network:networks[mode==='walk'?'walk':'drive'],walkValid:valid});replans++;retry=2;progress=routeProgress(route,position,{heading,speed});}return progress||{unavailable:true,message:'Walk outside to begin route guidance',remainingPoints:[]};}};
}

// Station forecourt first, then the same connected drivable graph as the GPS.
// Stop eight metres before the incident so a parked crash does not block arrival.
export function communityResponseRoute(start,target){
 const access={x:120,z:-30},route=planCityRoute(access,target,{mode:'drive'});
 const tail=route?route.points.map(p=>({...p})):[access];let remaining=8;
 while(tail.length>1&&remaining>0){const b=tail.at(-1),a=tail.at(-2),d=distance(a,b);if(d<=remaining){remaining-=d;tail.pop();}else{tail[tail.length-1]=lerp(b,a,remaining/d);remaining=0;}}
 return [{x:start.x,z:start.z},{x:130,z:start.z},{x:130,z:-30},...tail].filter((p,i,a)=>!i||distance(a[i-1],p)>.03);
}
