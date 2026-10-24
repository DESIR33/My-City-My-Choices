import * as THREE from 'three';
import {COMMUNITY_HOMES,communityPoint} from './world-rules.js';
import {freshHouse,restoreHouse,HOUSE_FOOD,houseObstacleBlocks} from './house-rules.js';
import {createWalkValidator,localWalkPath} from './city-navigation.js';

export function createNeighborhoodLife({scene,characters,community,obstacles}){
 const root=new THREE.Group();root.name='Neighborhood daily life';scene.add(root);
 const material=c=>new THREE.MeshStandardMaterial({color:c,roughness:.85}),unit=new THREE.BoxGeometry(1,1,1),dummy=new THREE.Object3D();
 const valid=createWalkValidator(obstacles),bells=COMMUNITY_HOMES.map(h=>({id:h.id,home:h,...communityPoint(h,h.id==='maple-grove-1'?3.8:h.w*.2+1.1,h.d/2+.25),y:1.5,cooldown:0}));
 const backs=new THREE.InstancedMesh(unit,material(0x293b38),bells.length),buttons=new THREE.InstancedMesh(unit,material(0xd9b778),bells.length);backs.name='Doorbell backplates';buttons.name='Doorbell buttons';root.add(backs,buttons);
 for(const [i,b] of bells.entries())for(const [mesh,w,h,d,offset] of [[backs,.15,.34,.07,0],[buttons,.09,.1,.035,.05]]){dummy.position.set(b.x,b.y,b.z+(b.home.heading===0?1:-1)*offset);dummy.rotation.y=b.home.heading;dummy.scale.set(w,h,d);dummy.updateMatrix();mesh.setMatrixAt(i,dummy.matrix);}
 const residents=[],names=['Alex','Sam','Robin','Jordan','Casey','Taylor'];
 const usable=p=>valid(p.x,p.z),toWorld=(h,x,z)=>({...communityPoint(h,x,z),y:.3});
 for(const [i,home] of COMMUNITY_HOMES.filter(h=>h.id!=='maple-grove-1').filter((_,i)=>i%4===0).entries()){
  const candidates=[[.1,-1.5],[2,-3.4],[-2,-2],[2,3.8],[0,0]].map(([x,z])=>toWorld(home,x,z)),inside=candidates.find(usable);
  if(inside){const actor=characters.create({...inside,model:'crowd',ambient:'read'}),held=new THREE.Mesh(new THREE.BoxGeometry(.24,.03,.19),material(0x91674c));held.position.set(.25,1.1,.3);actor.add(held);const r={actor,held,home,name:names[i%names.length],task:['reading','preparing a snack','tidying up'][i%3],origin:inside,path:[],answer:0};characters.setActivity(actor,['carry','eat','brew'][i%3],held);residents.push(r);}
  if(i%2===0){const p=toWorld(home,home.w*.46+1.3,home.d/2+.83);if(usable(p)){const actor=characters.create({...p,model:'crowd'}),held=new THREE.Mesh(new THREE.CylinderGeometry(.1,.11,.17,8),material(0x63827b));held.position.set(.25,1.1,.3);actor.add(held);characters.setActivity(actor,'brew',held);residents.push({actor,held,home,name:names[(i+2)%names.length],task:'watering the garden',origin:p,path:[],answer:0});}continue;}
  const p=toWorld(home,0,Math.abs(home.roadZ-home.z)-9.3),q=toWorld(home,3,Math.abs(home.roadZ-home.z)-9.3);
  if(usable(p)&&usable(q)){const actor=characters.create({...p,model:'crowd'});residents.push({actor,home,name:names[(i+2)%names.length],task:'walking in the neighborhood',origin:p,ends:[p,q],path:[q],answer:0});}
 }
 const nearestBell=p=>p&&Math.abs((p.y||0)-.3)<1.35?bells.filter(b=>(p.z-b.home.z)*(b.home.heading===0?1:-1)>=b.home.d/2+.05&&Math.hypot(p.x-b.x,p.z-b.z)<1.7).sort((a,b)=>Math.hypot(p.x-a.x,p.z-a.z)-Math.hypot(p.x-b.x,p.z-b.z))[0]||null:null;
 function ring(id,p){const bell=bells.find(b=>b.id===id);if(!bell||nearestBell(p)!==bell)return {ok:false,message:'Walk up to the doorbell.'};if(bell.cooldown>0)return {ok:false,message:'Give your neighbor a moment.'};bell.cooldown=8;
  const r=residents.find(r=>r.home.id===id&&!r.ends&&r.task!=='watering the garden');if(r){r.answer=8;r.returnAfterAnswer=true;const front=community.doors.find(d=>d.home.id===id&&d.type==='front');if(front&&!front.open)community.actDoor(front.id,p);const target=toWorld(r.home,r.home.w*.2,r.home.d/2-.9);r.path=localWalkPath(r.actor.position,target,valid)?.slice(1)||[];characters.setActivity(r.actor,'idle');r.held.visible=false;return {ok:true,message:r.name+' was '+r.task+'. “Hello! Welcome to '+r.home.address+' '+r.home.street+'.”'};}
  return {ok:true,message:'Ding-dong! No one is answering at '+bell.home.address+' '+bell.home.street+' right now.'};
 }
 // A fitted kitchen at 146, kept out of the shared central stair corridor.
 const home=COMMUNITY_HOMES.find(h=>h.address===146),kroot=new THREE.Group();kroot.position.set(home.x,0,home.z);kroot.rotation.y=home.heading;root.add(kroot);
 const fixtures=[];function part(x,y,z,w,h,d,c,solid=true){const mesh=new THREE.Mesh(unit,material(c));mesh.position.set(x,y+h/2,z);mesh.scale.set(w,h,d);kroot.add(mesh);if(solid){const p=communityPoint(home,x,z),o={minX:p.x-w/2,maxX:p.x+w/2,minZ:p.z-d/2,maxZ:p.z+d/2,minY:y,maxY:y+h,houseId:home.id,fixtureId:'146-kitchen'};obstacles.push(o);fixtures.push(o);}return mesh;}
 for(const x of [2.4,3.8]){part(x,.3,-5.65,1.3,.85,.8,0x806247);part(x,1.15,-5.65,1.35,.06,.85,0xd5d0c4,false);}
 part(2.4,1.22,-5.65,.65,.02,.45,0x899e9e,false);part(2.4,1.24,-5.9,.05,.3,.05,0xb8c2be,false);
 part(3.8,.46,-5.22,.8,.5,.035,0x263634,false);for(const x of [3.55,4.05])for(const z of [-5.4,-5.85])part(x,1.22,z,.27,.018,.25,0x252c2c,false);
 part(3.1,1.9,-5.75,2.7,.65,.4,0xc3b497,false);part(3.8,1.9,-5.48,.7,.4,.3,0x495557,false);
 const fridgePoint={...communityPoint(home,5.7,-4.2),y:.3};part(5.7,.3,-5.3,1,1.95,1,0xdce1d8);const leaf=new THREE.Group();leaf.position.set(5.2,.3,-4.78);kroot.add(leaf);const face=new THREE.Mesh(unit,material(0xe9e5d9));face.position.set(.5,.975,0);face.scale.set(1,1.95,.06);leaf.add(face);
 const stock=[];for(const [i,f] of HOUSE_FOOD.entries()){const m=new THREE.Mesh(new THREE.SphereGeometry(.1,8,6),material(f.color));m.position.set(5.45+i*.23,.95+i*.25,-4.72);kroot.add(m);stock.push({id:f.id,mesh:m});}
 let state=freshHouse();const near=p=>p&&Math.abs((p.y||0)-.3)<1.3&&Math.hypot(p.x-fridgePoint.x,p.z-fridgePoint.z)<1.6&&!fixtures.some(o=>houseObstacleBlocks(o,p.x,p.z,p.y));
 const kitchen={property:{address:'146 Willow Way'},get heldFood(){return state.heldFood},get state(){return state},nearby:p=>near(p)?[{id:'fridge'}]:[],nearest:p=>near(p)?fridgePoint:null,
  act(id,p){if(!near(p))return {ok:false};state.fridge=!state.fridge;return {ok:true}},
  fridgeContents:()=>({open:state.fridge,held:HOUSE_FOOD.find(f=>f.id===state.heldFood)||null,items:HOUSE_FOOD.map(f=>({...f,remaining:state.food[f.id]}))}),
  takeFood(id,p){const f=HOUSE_FOOD.find(f=>f.id===id);if(!near(p)||!state.fridge||!f||state.heldFood||!state.food[id])return {ok:false};state.food[id]--;state.heldFood=id;return {ok:true}},
  eatFood(){const f=HOUSE_FOOD.find(f=>f.id===state.heldFood);if(!f)return {ok:false};state.heldFood=null;return {ok:true,food:f,message:'You ate the '+f.name.toLowerCase()+'.'}},
  returnFood(p){if(!near(p)||!state.fridge||!state.heldFood)return false;state.food[state.heldFood]=Math.min(HOUSE_FOOD.find(f=>f.id===state.heldFood).count,state.food[state.heldFood]+1);state.heldFood=null;return true;}};
 function update(dt,p){for(const b of bells)b.cooldown=Math.max(0,b.cooldown-dt);leaf.rotation.y=state.fridge?-Math.PI*.6:0;for(const s of stock)s.mesh.visible=state.fridge&&state.food[s.id]>0;
  for(const r of residents){if(!p||Math.hypot(r.actor.position.x-p.x,r.actor.position.z-p.z)>80)continue;r.answer=Math.max(0,r.answer-dt);if(r.path.length){const t=r.path[0],dx=t.x-r.actor.position.x,dz=t.z-r.actor.position.z,d=Math.hypot(dx,dz),step=Math.min(d,dt*.8);const x=r.actor.position.x+dx/(d||1)*step,z=r.actor.position.z+dz/(d||1)*step;if(usable({x,z})){r.actor.position.x=x;r.actor.position.z=z;}else r.path=[];if(d<.08)r.path.shift();}else if(r.ends){r.to=r.to?0:1;r.path=[r.ends[r.to]];}else if(r.answer===0){if(r.returnAfterAnswer){r.path=localWalkPath(r.actor.position,r.origin,valid)?.slice(1)||[];r.returnAfterAnswer=false;}r.held.visible=true;characters.setActivity(r.actor,r.task==='preparing a snack'?'eat':['tidying up','watering the garden'].includes(r.task)?'brew':'carry',r.held);}}
 }
 const guestBeds=community.furnishedInteriors.flatMap(record=>record.fixtures.filter(f=>f.id==='guest-bed').map(f=>{const h=COMMUNITY_HOMES.find(h=>h.id===record.homeId),sign=h.heading===0?1:-1,stand={x:f.x+sign*1.65,z:f.z};return {...stand,y:.3,address:record.address,seat:{id:record.homeId+'-bed',type:'bed',x:f.x,z:f.z+sign*.85,floor:.3,height:.72,heading:h.heading,rest:true,stand}};}));
 const nearestBed=p=>guestBeds.find(b=>Math.abs((p.y||0)-.3)<1.3&&Math.hypot(b.x-p.x,b.z-p.z)<1.65)||null;
 update(0);return {root,bells,residents,kitchen,nearestBed,nearestBell,ring,update,serialize:()=>({kitchen146:{...state,food:{...state.food}}}),restore(value){state=restoreHouse(value?.kitchen146);update(0);}};
}
