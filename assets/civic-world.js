import * as THREE from 'three';
import {CAFE,BAKERY,FIRE_STATION} from './city-rules.js';
const unit=new THREE.BoxGeometry(1,1,1);
export function createCivicWorld({scene,visualKit,obstacles,buildings,groundSurfaces,characters}){
  const seats=[],cutaway=[],wood=new THREE.MeshStandardMaterial({color:0x865d3d,roughness:.82}),metal=new THREE.MeshStandardMaterial({color:0x243a3a,metalness:.55,roughness:.44}),cream=new THREE.MeshStandardMaterial({color:0xd5c9ad,roughness:.85}),red=new THREE.MeshStandardMaterial({color:0xa72e24,roughness:.5,metalness:.18}),navy=new THREE.MeshStandardMaterial({color:0x253846,roughness:.76});
  function box(parent,mat,x,y,z,w,h,d){const m=new THREE.Mesh(unit,mat);m.position.set(x,y+h/2,z);m.scale.set(w,h,d);m.castShadow=m.receiveShadow=true;parent.add(m);return m;}
  const obstacle=(x,z,w,d)=>obstacles.push({minX:x-w/2,maxX:x+w/2,minZ:z-d/2,maxZ:z+d/2});
  function label(parent,text,x,y,z,w=5,h=.7){const c=document.createElement('canvas');c.width=1024;c.height=160;const q=c.getContext('2d');q.fillStyle='#173837';q.fillRect(0,0,1024,160);q.fillStyle='#f1dfb3';q.textAlign='center';q.textBaseline='middle';q.font='bold 66px Arial';q.fillText(text,512,82);const t=new THREE.CanvasTexture(c);t.colorSpace=THREE.SRGBColorSpace;const p=new THREE.Mesh(new THREE.PlaneGeometry(w,h),new THREE.MeshStandardMaterial({map:t,roughness:.8,side:THREE.DoubleSide}));p.position.set(x,y,z);parent.add(p);return p;}
  function chair(x,z,heading=0,type='chair'){
    const g=new THREE.Group();g.position.set(x,.21,z);g.rotation.y=heading;scene.add(g);
    const width=type==='sofa'?2.4:type==='bench'?1.8:.62,depth=type==='sofa'?.85:.6,height=type==='sofa'?.43:.48;
    const fabric=type==='sofa'?new THREE.MeshStandardMaterial({color:0x54726c,roughness:.98}):wood;
    box(g,fabric,0,height,0,width,.12,depth);box(g,fabric,0,height+.12,-depth/2+.05,width,.63,.11);
    for(const side of [-1,1]){box(g,metal,side*(width/2-.1),0,0,.075,height,depth*.75);if(type==='sofa')box(g,fabric,side*(width/2-.1),height,0,.18,.4,depth);}
    obstacle(x,z,Math.abs(Math.cos(heading))*width+Math.abs(Math.sin(heading))*depth,Math.abs(Math.sin(heading))*width+Math.abs(Math.cos(heading))*depth);
    const forward={x:Math.sin(heading),z:Math.cos(heading)},seat={id:'seat-'+seats.length,type,x,z,height:height+.12,heading,stand:{x:x+forward.x*(depth/2+1),z:z+forward.z*(depth/2+1)}};
    seats.push(seat);return seat;
  }
  function table(x,z,umbrella=false){
    const g=new THREE.Group();g.position.set(x,.21,z);scene.add(g);box(g,metal,0,0,0,.11,.76,.11);box(g,wood,0,.76,0,1.65,.1,1.65);obstacle(x,z,1.65,1.65);
    if(umbrella){box(g,metal,0,.86,0,.055,1.8,.055);const canopy=new THREE.Mesh(new THREE.ConeGeometry(1.85,.58,12,1,true),new THREE.MeshStandardMaterial({color:0xc89750,side:THREE.DoubleSide,roughness:.9}));canopy.position.y=2.7;canopy.castShadow=true;g.add(canopy);for(let i=0;i<12;i++){const a=i*Math.PI/6;const rib=new THREE.Mesh(new THREE.CylinderGeometry(.012,.012,1.9,5),metal),end=new THREE.Vector3(Math.sin(a)*1.8,2.42,Math.cos(a)*1.8),top=new THREE.Vector3(0,2.98,0);rib.position.copy(top).add(end).multiplyScalar(.5);rib.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),end.sub(top).normalize());g.add(rib);}}
  }
  // The café is a real shell: the doorway and the room remain open for walking.
  const floor=box(scene,visualKit.concrete,-30,.08,-34,22,.13,14);groundSurfaces.push({minX:-41,maxX:-19,minZ:-41,maxZ:-27,top:.21});
  box(scene,visualKit.concrete,-30,.08,-18,28,.13,14);groundSurfaces.push({minX:-44,maxX:-16,minZ:-25,maxZ:-11,top:.21});
  const walls=new THREE.Group();scene.add(walls);const brick=visualKit.brick(0x784635),glass=new THREE.MeshPhysicalMaterial({color:0x9aafa7,transparent:true,opacity:.24,roughness:.15,metalness:.08,side:THREE.DoubleSide});
  for(const side of [-1,1]){box(walls,brick,-30+side*10.85,.21,-34,.3,4,14);obstacle(-30+side*10.85,-34,.3,14);box(walls,glass,-30+side*6.1,.21,-27,9.4,3.7,.12);obstacle(-30+side*6.1,-27,9.4,.12);}
  box(walls,brick,-30,.21,-40.9,22,4,.25);obstacle(-30,-40.9,22,.25);
  const roof=box(scene,metal,-30,4.2,-34,22.6,.25,14.6);cutaway.push(walls,roof);
  box(scene,metal,-30,3.8,-26.9,22,.4,.28);label(scene,'MAPLE CAFE',-30,3.99,-26.71,9,1.05);
  for(const x of [-40,-20])box(scene,wood,x,.21,-25,.14,3.5,.14);
  box(scene,metal,-30,3.62,-25.7,22,.16,2.5);
  // A central walkway between the terrace tables leads straight to the door.
  for(const x of [-39,-21])for(const z of [-21,-14]){table(x,z,true);chair(x-1.45,z,Math.PI/2);chair(x+1.45,z,-Math.PI/2);}
  table(-36,-34);chair(-37.4,-34,Math.PI/2);chair(-34.6,-34,-Math.PI/2);chair(-37,-38,0,'sofa');
  chair(-44,-17,Math.PI/2,'bench');
  box(scene,wood,-24,.21,-38.8,6,1.05,1.25);obstacle(-24,-38.8,6,1.25);box(scene,cream,-24,1.26,-38.8,6.2,.09,1.4);label(scene,'ORDER HERE',-24,2.25,-39.6,3.5,.5);
  box(scene,navy,-22,1.35,-38.7,.5,.35,.35);for(const x of [-25.6,-25,-24.4]){const cup=new THREE.Mesh(new THREE.CylinderGeometry(.09,.07,.22,12),cream);cup.position.set(x,1.46,-38.4);scene.add(cup);}
  buildings.push({x:-30,z:-34,w:22,d:14,shop:false,height:4.45});
  // Maple Bakery replaces the former solid shop at the same street address.
  const bakeryWalls=new THREE.Group();scene.add(bakeryWalls);
  const bakeryBrick=visualKit.brick(0x395e68),pastry=new THREE.MeshStandardMaterial({color:0xbb783b,roughness:.9});
  box(scene,visualKit.concrete,-42,.08,-90,14,.13,20);groundSurfaces.push({minX:-49,maxX:-35,minZ:-100,maxZ:-80,top:.21});
  box(scene,visualKit.concrete,-42,.08,-74.5,22,.13,11);groundSurfaces.push({minX:-53,maxX:-31,minZ:-80,maxZ:-69,top:.21});
  for(const side of [-1,1]){box(bakeryWalls,bakeryBrick,-42+side*6.85,.21,-90,.3,8.4,20);obstacle(-42+side*6.85,-90,.3,20);box(bakeryWalls,glass,-42+side*4.15,.21,-80,5.5,3.5,.12);obstacle(-42+side*4.15,-80,5.5,.12);}
  box(bakeryWalls,bakeryBrick,-42,.21,-99.85,14,8.4,.3);obstacle(-42,-99.85,14,.3);
  box(bakeryWalls,bakeryBrick,-42,3.8,-80,14,4.8,.3);box(bakeryWalls,cream,-42,4,-90,14,.2,20);
  for(const x of [-46.5,-42,-37.5]){box(bakeryWalls,cream,x,5.2,-79.8,2.2,2,.12);box(bakeryWalls,glass,x,5.35,-79.7,1.9,1.7,.08);}
  const bakeryRoof=box(scene,metal,-42,8.61,-90,14.6,.3,20.6);
  box(scene,metal,-42,3.65,-79.2,14,.2,2);label(scene,'MAPLE BAKERY',-42,3.85,-78.15,10,.8);
  for(const x of [-48,-36])box(scene,wood,x,.21,-78,.13,3.4,.13);
  // Umbrella tables flank the unbroken central route to the open doorway.
  for(const x of [-50,-34]){table(x,-74.5,true);chair(x-1.45,-74.5,Math.PI/2);chair(x+1.45,-74.5,-Math.PI/2);}
  table(-45,-88);chair(-46.45,-88,Math.PI/2);chair(-43.55,-88,-Math.PI/2);chair(-45,-95,0,'bench');
  box(scene,wood,-38.5,.21,-97,5,1.05,1.3);obstacle(-38.5,-97,5,1.3);box(scene,cream,-38.5,1.26,-97,5.2,.1,1.4);box(scene,glass,-38.5,1.36,-97,5,.55,1.2);label(scene,'FRESHLY BAKED • ORDER HERE',-40,2.5,-99.6,8,.6);
  for(let i=0;i<7;i++){const bun=new THREE.Mesh(new THREE.SphereGeometry(.16,16,10),pastry);bun.scale.set(1,.6,.8);bun.position.set(-40+i*.5,1.48,-96.8);scene.add(bun);}
  buildings.push({x:-42,z:-90,w:14,d:20,shop:false,height:8.91});
  const bakeryInside=p=>p.x>-48.5&&p.x<-35.5&&p.z>-99.5&&p.z<-80;
  let bakeryOrder=null;
  function serveBakeryOrder(id){if(bakeryOrder)scene.remove(bakeryOrder);bakeryOrder=new THREE.Group();bakeryOrder.position.set(-38,1.37,-96.4);scene.add(bakeryOrder);box(bakeryOrder,cream,0,0,0,.65,.025,.45);const food=new THREE.Mesh(id==='milk'?new THREE.CylinderGeometry(.1,.08,.25,16):new THREE.SphereGeometry(.18,20,12),id==='milk'?cream:pastry);food.position.y=.15;if(id!=='milk')food.scale.set(id==='croissant'?1.4:1,.7,1);bakeryOrder.add(food);}
  // Fire station with two apparatus bays, a clear driveway, and a staffed forecourt.
  const f=new THREE.Group();f.position.set(FIRE_STATION.x,0,FIRE_STATION.z);f.rotation.y=-Math.PI/2;scene.add(f);
  box(f,visualKit.brick(0x873d30),0,.2,0,25,6.7,19);box(f,cream,0,6.9,0,25.6,.25,19.6);
  for(const side of [-1,1]){box(f,metal,side*6,.25,9.58,8,4.5,.15);box(f,red,side*6,.35,9.7,7.6,4.2,.1);for(let y=.7;y<4.5;y+=.5)box(f,cream,side*6,y,9.77,7.4,.035,.04);}
  label(f,'MAPLE FIRE & RESCUE',0,5.65,9.67,20,1.05);obstacle(150,-90,20,25);buildings.push({x:150,z:-90,w:20,d:25,shop:false,height:7.15});
  box(scene,visualKit.asphalt,132,.015,-90,20,.045,26);groundSurfaces.push({minX:122,maxX:142,minZ:-103,maxZ:-77,top:.06});
  const engine=new THREE.Group();engine.position.set(135,.06,-90);engine.rotation.y=-Math.PI/2;scene.add(engine);
  box(engine,metal,0,.45,0,2.3,.3,6.8);box(engine,red,0,.7,1.8,2.38,2.0,2.8);box(engine,red,0,.7,-1.55,2.38,1.65,3.8);
  const engineGlass=new THREE.MeshStandardMaterial({color:0x284957,metalness:.2,roughness:.18});box(engine,engineGlass,0,1.55,3.22,2.05,.93,.025);
  for(const side of [-1,1]){box(engine,engineGlass,side*1.205,1.55,1.85,.025,.85,2.2);box(engine,cream,side*1.21,1.08,-1.5,.04,1.1,3.4);box(engine,cream,side*1.22,.8,1.75,.03,.16,2.5);for(const z of [-2.5,-1.1,2.25]){const tire=new THREE.Mesh(new THREE.CylinderGeometry(.49,.49,.32,24),new THREE.MeshStandardMaterial({color:0x171b1d,roughness:.96}));tire.rotation.z=Math.PI/2;tire.position.set(side*1.1,.49,z);engine.add(tire);const hub=new THREE.Mesh(new THREE.CylinderGeometry(.25,.25,.34,20),cream);hub.rotation.z=Math.PI/2;hub.position.copy(tire.position);engine.add(hub);}for(let z=-3;z<0;z+=.45){const coupling=new THREE.Mesh(new THREE.CylinderGeometry(.09,.09,.08,12),metal);coupling.rotation.z=Math.PI/2;coupling.position.set(side*1.26,1.36,z);engine.add(coupling);}}
  for(const side of [-1,1])box(engine,metal,side*.65,2.48,-1.05,.065,.08,4);for(let z=-2.9;z<.8;z+=.38)box(engine,metal,0,2.48,z,1.3,.065,.065);
  for(const side of [-1,1]){const sign=label(engine,'FIRE & RESCUE',side*1.235,1.65,-1.3,3.1,.45);sign.rotation.y=side*Math.PI/2;}
  box(engine,cream,0,.65,3.31,2.55,.28,.2);const beaconMat=new THREE.MeshStandardMaterial({color:0xff3830,emissive:0xdd1208,emissiveIntensity:.65});box(engine,beaconMat,0,2.75,1.5,1.4,.12,.25);obstacle(135,-90,7.4,2.6);
  const firefighters=[];for(let i=0;i<4;i++){const actor=characters.create({x:133+i*2,z:-100,model:i%2?'casual':'neighbor',firefighter:true,interactive:true});firefighters.push(actor);}
  let servedOrder=null;
  function serveOrder(id){if(servedOrder)scene.remove(servedOrder);servedOrder=new THREE.Group();servedOrder.position.set(-25,1.35,-38.2);scene.add(servedOrder);box(servedOrder,metal,0,0,0,.65,.025,.45);
    if(id==='sandwich'){box(servedOrder,cream,0,.025,0,.38,.05,.28);box(servedOrder,new THREE.MeshStandardMaterial({color:0xd7a841}),0,.075,0,.39,.025,.29);box(servedOrder,cream,0,.1,0,.38,.05,.28);}
    else if(id==='fruit'){const bowl=new THREE.Mesh(new THREE.CylinderGeometry(.2,.12,.12,16),cream);bowl.position.y=.085;servedOrder.add(bowl);for(let i=0;i<5;i++){const fruit=new THREE.Mesh(new THREE.SphereGeometry(.06,12,8),new THREE.MeshStandardMaterial({color:[0x9b3832,0x6a8f40,0xd29a36][i%3]}));fruit.position.set(Math.cos(i*1.3)*.1,.17,Math.sin(i*1.3)*.1);servedOrder.add(fruit);}}
    else{const cup=new THREE.Mesh(new THREE.CylinderGeometry(.11,.085,.23,16),cream);cup.position.y=.14;servedOrder.add(cup);const drink=new THREE.Mesh(new THREE.CircleGeometry(.098,16),new THREE.MeshStandardMaterial({color:id==='juice'?0xe2a13a:0x5f3624}));drink.rotation.x=-Math.PI/2;drink.position.y=.258;servedOrder.add(drink);}}
  return {seats,chair,firefighters,fireEngine:engine,serveOrder,serveBakeryOrder,bakeryInside,cafeInside:p=>p.x>-40.5&&p.x<-19.5&&p.z>-40.5&&p.z<-27,
    update(p){const inside=this.cafeInside(p);for(const o of cutaway)o.visible=!inside;const inBakery=bakeryInside(p);bakeryWalls.visible=bakeryRoof.visible=!inBakery;return inside||inBakery;}};
}
