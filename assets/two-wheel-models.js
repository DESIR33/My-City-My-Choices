import * as THREE from 'three';
import {RoundedBoxGeometry} from 'three/addons/geometries/RoundedBoxGeometry.js';
import {mergeGeometries} from 'three/addons/utils/BufferGeometryUtils.js';
import {TWO_WHEEL_SPECS,twoWheelFootprint} from './two-wheel-physics.js';

const UP=new THREE.Vector3(0,1,0);
export const RIDE_SPAWNS=Object.freeze([
 {id:'maple-cycle',kind:'bicycle',x:-64.7,z:-44,heading:0,color:0x1d8c86},{id:'maple-moto',kind:'motorcycle',x:-55,z:-44,heading:0,color:0xa32d34},
 {id:'north-cycle',kind:'bicycle',x:-4.8,z:-1100,heading:Math.PI,color:0xcaa83e},{id:'north-moto',kind:'motorcycle',x:20,z:-1145,heading:Math.PI,color:0x244f83},
 {id:'coast-cycle',kind:'bicycle',x:5,z:1106,heading:0,color:0xc15b39},{id:'coast-moto',kind:'motorcycle',x:-5,z:1120,heading:0,color:0x234a42},
 {id:'beach-cycle',kind:'bicycle',x:-124.6,z:1360,heading:Math.PI,color:0x5c72aa},{id:'beach-moto',kind:'motorcycle',x:-124.6,z:1490,heading:Math.PI,color:0xb8b6ad},
]);
function batch(parent){for(const child of [...parent.children])if(child.isGroup)batch(child);const groups=new Map();for(const m of [...parent.children])if(m.isMesh){if(!groups.has(m.material))groups.set(m.material,[]);groups.get(m.material).push(m);}for(const [mat,items] of groups){if(items.length<2)continue;const parts=items.map(m=>{m.updateMatrix();const geometry=m.geometry.index?m.geometry.toNonIndexed():m.geometry.clone();return geometry.applyMatrix4(m.matrix);}),g=mergeGeometries(parts,false);if(!g){parts.forEach(g=>g.dispose());continue;}const combined=new THREE.Mesh(g,mat);combined.castShadow=combined.receiveShadow=true;parent.add(combined);for(const m of items)parent.remove(m);parts.forEach(g=>g.dispose());}}
export function createTwoWheeler(kind,color=0x245e75){
 const spec=TWO_WHEEL_SPECS[kind],moto=kind==='motorcycle',root=new THREE.Group(),body=new THREE.Group();root.name=spec.name;root.rotation.order='YXZ';root.add(body);
 const paint=new THREE.MeshPhysicalMaterial({color,metalness:.36,roughness:.24,clearcoat:1,clearcoatRoughness:.14}),steel=new THREE.MeshStandardMaterial({color:0xa2adb0,metalness:.86,roughness:.27}),alloy=new THREE.MeshStandardMaterial({color:0x333e43,metalness:.7,roughness:.38}),black=new THREE.MeshStandardMaterial({color:0x101619,roughness:.82}),rubber=new THREE.MeshStandardMaterial({color:0x171a1c,roughness:.9}),gold=new THREE.MeshStandardMaterial({color:0xb99b57,metalness:.75,roughness:.25}),leather=new THREE.MeshStandardMaterial({color:0x292c2b,roughness:.82}),red=new THREE.MeshStandardMaterial({color:0xb52220,emissive:0x500000,emissiveIntensity:.2}),lamp=new THREE.MeshStandardMaterial({color:0xe1eff5,emissive:0xc8e5ff,emissiveIntensity:.2}),amber=new THREE.MeshStandardMaterial({color:0xd69d37,roughness:.35});
 const shared=new Map();function geo(key,create){if(!shared.has(key))shared.set(key,create());return shared.get(key);}
 function mesh(parent,g,mat,x=0,y=0,z=0){const m=new THREE.Mesh(g,mat);m.position.set(x,y,z);m.castShadow=m.receiveShadow=true;parent.add(m);return m;}
 function box(parent,mat,x,y,z,w,h,d,r=.025){return mesh(parent,geo('box'+[w,h,d,r],()=>new RoundedBoxGeometry(w,h,d,3,r)),mat,x,y,z);}
 function rod(parent,mat,a,b,r=.025){const v=new THREE.Vector3(...b).sub(new THREE.Vector3(...a)),m=mesh(parent,geo('rod'+r,()=>new THREE.CylinderGeometry(r,r,1,10)),mat);m.position.set((a[0]+b[0])/2,(a[1]+b[1])/2,(a[2]+b[2])/2);m.scale.y=v.length();m.quaternion.setFromUnitVectors(UP,v.normalize());return m;}
 function tube(parent,mat,points,r=.015){return mesh(parent,new THREE.TubeGeometry(new THREE.CatmullRomCurve3(points.map(p=>new THREE.Vector3(...p))),24,r,7,false),mat);}
 const radius=spec.radius,frontZ=spec.wheelbase/2,rearZ=-frontZ,steering=new THREE.Group();steering.position.set(0,moto?.92:.98,frontZ-.18);steering.name='Steering and telescopic fork';body.add(steering);
 const frontWheel=new THREE.Group(),rearWheel=new THREE.Group();frontWheel.position.set(0,radius-steering.position.y,.18);rearWheel.position.set(0,radius,rearZ);steering.add(frontWheel);body.add(rearWheel);
 function wheel(group,rear){
  group.name=rear?'Rear wheel spin':'Front wheel spin';const half=moto?(rear?.087:.063):.023;
  const profile=[new THREE.Vector2(radius-.07,-half*.8),new THREE.Vector2(radius-.035,-half),new THREE.Vector2(radius-.005,-half*.55),new THREE.Vector2(radius,0),new THREE.Vector2(radius-.005,half*.55),new THREE.Vector2(radius-.035,half),new THREE.Vector2(radius-.07,half*.8)];
  mesh(group,new THREE.LatheGeometry(profile,64).rotateZ(Math.PI/2),rubber);
  mesh(group,new THREE.TorusGeometry(radius-(moto?.07:.035),moto?.016:.009,8,64).rotateY(Math.PI/2),steel);
  const hub=mesh(group,new THREE.CylinderGeometry(.045,.045,moto?.19:.09,16).rotateZ(Math.PI/2),alloy);
  for(let n=0;n<(moto?7:32);n++){const a=n*Math.PI*2/(moto?7:32),r=radius-(moto?.08:.042),s=n%2?1:-1;rod(group,moto?alloy:steel,[s*(moto?.022:.03),Math.sin(a+.16)*.045,Math.cos(a+.16)*.045],[0,Math.sin(a)*r,Math.cos(a)*r],moto?.015:.0021);}
  const shape=new THREE.Shape();shape.absarc(0,0,moto?.133:.085,0,Math.PI*2,false);const inner=new THREE.Path();inner.absarc(0,0,.035,0,Math.PI*2,true);shape.holes.push(inner);for(let i=0;i<14;i++){const a=i*Math.PI/7,p=new THREE.Path();p.absarc(Math.cos(a)*(moto?.108:.066),Math.sin(a)*(moto?.108:.066),moto?.007:.004,0,Math.PI*2,true);shape.holes.push(p);}
  const rotor=new THREE.ShapeGeometry(shape,32).rotateY(Math.PI/2);mesh(group,rotor,steel,moto?.095:.04);if(moto&&!rear)mesh(group,rotor,steel,-.095);
  if(moto)for(let n=0;n<48;n++){const a=n*Math.PI*2/48;const tread=box(group,black,0,Math.sin(a)*(radius+.001),Math.cos(a)*(radius+.001),half*1.6,.003,.007,.001);tread.rotation.x=-a;}
 }
 wheel(frontWheel,false);wheel(rearWheel,true);
 for(const side of [-1,1]){
  rod(body,moto?alloy:paint,[side*.055,.36,.02],[side*.07,radius,rearZ],moto?.026:.018);
  rod(body,moto?steel:paint,[side*.07,radius,rearZ],[side*.055,moto?.73:.76,-.18],moto?.026:.018);
  rod(steering,moto?gold:alloy,[side*(moto?.12:.055),-.03,0],[side*(moto?.12:.055),radius-steering.position.y+.18,.14],moto?.032:.022);
  rod(steering,steel,[side*(moto?.12:.055),radius-steering.position.y+.24,.14],[side*(moto?.12:.055),radius-steering.position.y,.18],moto?.025:.016);
 }
 box(steering,moto?gold:alloy,.12,radius-steering.position.y+.06,.26,.08,.12,.065,.01);
 const bars=new THREE.Group();bars.position.set(0,moto?.10:.08,moto?-.27:-.11);steering.add(bars);
 const handTargets=[];for(const side of [-1,1]){tube(bars,alloy,[[0,0,0],[side*.18,.035,0],[side*.31,.015,-.08]],.014);box(bars,rubber,side*.30,.016,-.08,.13,.035,.035,.009);rod(bars,steel,[side*.26,.015,-.04],[side*.33,.02,.02],.005);const hand=new THREE.Object3D();hand.position.set(side*.29,.025,-.08);bars.add(hand);handTargets.push(hand);tube(steering,black,[[side*.24,.12,-.16],[side*.18,-.15,.03],[side*.09,-.48,.20]],.004);}
 const crank=new THREE.Group(),pedals=[];crank.position.set(0,.35,-.06);body.add(crank);
 if(!moto){
  for(const [a,b] of [[[0,.36,-.06],[0,.76,-.2]],[[0,.76,-.2],[0,.79,.36]],[[0,.79,.36],[0,.36,-.06]]])rod(body,paint,a,b,.026);
  rod(body,steel,[0,.61,-.18],[0,.81,-.21],.017);box(body,leather,0,.83,-.23,.22,.055,.28,.035);
  mesh(crank,new THREE.TorusGeometry(.086,.009,6,36).rotateY(Math.PI/2),alloy,.075);
  for(const side of [-1,1]){rod(crank,alloy,[side*.075,0,0],[side*.075,side*.15,0],.012);const pedal=new THREE.Group();pedal.position.set(side*.17,side*.15,0);crank.add(pedal);box(pedal,black,0,0,0,.15,.025,.075,.005);pedals.push(pedal);}
  for(const y of [-.03,.03])rod(body,alloy,[.083,.35+y,-.06],[.083,radius+y,rearZ],.004);
  for(let i=0;i<5;i++)mesh(rearWheel,new THREE.TorusGeometry(.039+i*.006,.003,5,24).rotateY(Math.PI/2),steel,.05+i*.004);
  box(body,black,0,.45,-.19,.07,.19,.07,.02);box(body,steel,0,.46,-.19,.075,.16,.05,.015); // bottle/cage
 }else{
  box(body,paint,0,.82,.12,.43,.31,.6,.11);box(body,leather,0,.86,-.35,.31,.10,.55,.04);box(body,leather,0,.91,-.63,.26,.09,.25,.025);
  for(const side of [-1,1]){rod(body,alloy,[side*.14,.71,-.4],[side*.14,.60,.39],.027);rod(body,alloy,[side*.14,.60,.39],[side*.14,.36,-.10],.026);rod(body,steel,[side*.11,.54,-.30],[side*.11,.37,-.59],.025);for(let i=0;i<9;i++){const spring=mesh(body,new THREE.TorusGeometry(.036,.007,5,16),gold,side*.11,.38+i*.017,-.49);spring.rotation.x=Math.PI/2;}
   box(body,alloy,side*.13,.45,.01,.18,.29,.3,.025);for(let i=0;i<7;i++)box(body,steel,side*.13,.41+i*.023,.07,.2,.012,.28,.002);
   tube(body,steel,[[side*.13,.50,.2],[side*.15,.31,.34],[side*.2,.2,.08],[side*.22,.28,-.55]],.025);const silencer=mesh(body,new THREE.CylinderGeometry(.065,.085,.44,20).rotateX(Math.PI/2),alloy,side*.23,.32,-.55);
   rod(body,alloy,[side*.1,.36,-.18],[side*.27,.36,-.18],.013);const peg=new THREE.Object3D();peg.position.set(side*.24,.37,-.18);body.add(peg);pedals.push(peg);
   rod(bars,alloy,[side*.23,.04,0],[side*.35,.22,.05],.008);const mirror=mesh(bars,new THREE.SphereGeometry(.065,16,10),steel,side*.35,.23,.05);mirror.scale.set(1.1,.65,.24);
  }
  box(body,black,0,.58,.34,.30,.27,.08,.02);for(let i=0;i<6;i++)box(body,steel,0,.48+i*.035,.39,.27,.009,.015,.002);
  box(body,paint,0,.90,-.64,.3,.09,.38,.025);box(body,red,0,.86,-.81,.2,.045,.035,.009);box(body,steel,0,.65,-.84,.16,.12,.012,.004);
 }
 const light=mesh(steering,new THREE.CylinderGeometry(moto?.079:.025,moto?.085:.03,.035,24).rotateX(Math.PI/2),lamp,0,moto?-.08:-.08,.065);for(const side of [-1,1]){box(steering,amber,side*.19,-.08,.05,.04,.035,.055,.008);box(body,amber,side*.18,.82,-.76,.04,.035,.055,.008);}
 const stand=new THREE.Group();stand.position.set(moto?-.15:-.08,.37,-.13);body.add(stand);rod(stand,alloy,[0,0,0],[-.18,-.36,-.04],.009);
 // Named anchors survive batching and follow the animated front end/pedals.
 const seat=new THREE.Object3D();seat.position.set(0,spec.seat,moto?-.27:-.22);body.add(seat);
 batch(body);root.userData.twoWheeler={kind,spec,body,steering,frontWheel,rearWheel,crank,pedals,handTargets,seat,stand,brakeMaterial:red,lampMaterial:lamp};
 return root;
}
export function updateTwoWheelVisual(root,state={}){
 const d=root.userData.twoWheeler,parked=!state.mounted;d.body.rotation.z=parked?-.09:state.lean||0;d.steering.rotation.y=state.steering||0;d.frontWheel.rotation.x=d.rearWheel.rotation.x=-(state.travel||0)/d.spec.radius;d.crank.rotation.x=state.pedalAngle||0;if(d.kind==='bicycle')for(const pedal of d.pedals)pedal.rotation.x=-d.crank.rotation.x;d.stand.visible=parked;d.brakeMaterial.emissiveIntensity=state.brake>.1?2.5:.2;d.lampMaterial.emissiveIntensity=state.mounted?(d.kind==='motorcycle'?2:1):.15;
 // Spring travel visibly compresses the front end under braking/weight transfer.
 d.frontWheel.position.y=d.spec.radius-d.steering.position.y+Math.max(-.025,Math.min(.045,(state.pitch||0)*.6));
 root.updateMatrixWorld(true);
}
export function riderTargets(root,state){const d=root.userData.twoWheeler,get=o=>o.getWorldPosition(new THREE.Vector3());const feet=d.pedals.map(get);if(Math.abs(state.speed)<.65||state.pushing){feet.forEach((p,i)=>{p.copy(root.localToWorld(new THREE.Vector3(i===0?-.24:.24,.10,state.pushing?Math.sin(state.travel*5+i*Math.PI)*.15:0)));});}return {seat:get(d.seat),hands:d.handTargets.map(get),feet};}
export function createTwoWheelWorld({scene,obstacles,groundHeight}){
 const vehicles=RIDE_SPAWNS.map(p=>{const m=createTwoWheeler(p.kind,p.color);m.userData.rideId=p.id;m.position.set(p.x,groundHeight(p.x,p.z),p.z);m.rotation.y=p.heading;scene.add(m);return m;});
 function unpark(m){const i=obstacles.indexOf(m.userData.obstacle);if(i>=0)obstacles.splice(i,1);m.userData.obstacle=null;}
 function park(m){unpark(m);const points=twoWheelFootprint(m.position.x,m.position.z,m.rotation.y,m.userData.twoWheeler.kind);const o={minX:Math.min(...points.map(p=>p.x)),maxX:Math.max(...points.map(p=>p.x)),minZ:Math.min(...points.map(p=>p.z)),maxZ:Math.max(...points.map(p=>p.z)),ride:m};m.userData.obstacle=o;obstacles.push(o);updateTwoWheelVisual(m);}
 vehicles.forEach(park);
 return {vehicles,park,unpark,serialize(active){return {activeId:active?.userData.rideId||null,poses:vehicles.map(m=>({id:m.userData.rideId,x:m.position.x,z:m.position.z,heading:m.rotation.y}))};},restore(saved,valid=()=>true){vehicles.forEach(unpark);for(const [i,m] of vehicles.entries()){const p=saved?.poses?.find?.(p=>p.id===m.userData.rideId);const pose=p&&[p.x,p.z,p.heading].every(Number.isFinite)&&valid(m,p)?p:RIDE_SPAWNS[i];m.position.set(pose.x,groundHeight(pose.x,pose.z),pose.z);m.rotation.set(0,pose.heading,0);park(m);}return vehicles.find(m=>m.userData.rideId===saved?.activeId)||null;}};
}
