import * as THREE from 'three';
import {CAFE,BAKERY,FIRE_STATION} from './city-rules.js';
import {SCHOOL,GROCERY,BUS_STOPS,shellObstacles,groceryObstacles,insideSchool,insideGrocery} from './city-next.js';
import {RIVER_PARK} from './world-rules.js';
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
  const engine=buildFireEngine(scene,box,obstacle);
  function buildFireEngine(scene,box,obstacle){
    const engine=new THREE.Group();engine.name='fire-engine';engine.position.set(133.5,.06,-90);engine.rotation.y=-Math.PI/2;scene.add(engine);
    const paint=new THREE.MeshPhysicalMaterial({color:0xc01f18,roughness:.26,metalness:.18,clearcoat:1,clearcoatRoughness:.14});
    const black=new THREE.MeshStandardMaterial({color:0x14181c,roughness:.42,metalness:.35});
    const chrome=new THREE.MeshStandardMaterial({color:0xd5dbe0,roughness:.18,metalness:.94});
    const rubber=new THREE.MeshStandardMaterial({color:0x17191c,roughness:.97});
    const glass=new THREE.MeshPhysicalMaterial({color:0x173038,roughness:.06,metalness:.12,transparent:true,opacity:.62,clearcoat:1,side:THREE.DoubleSide});
    const gold=new THREE.MeshStandardMaterial({color:0xf2c94b,roughness:.32,metalness:.28,emissive:0x5c430c,emissiveIntensity:.12});
    const white=new THREE.MeshStandardMaterial({color:0xf7f4ee,roughness:.4});
    const lamp=new THREE.MeshStandardMaterial({color:0xfff6d8,emissive:0xfff0c4,emissiveIntensity:.85,roughness:.18});
    const amber=new THREE.MeshStandardMaterial({color:0xffb03a,emissive:0xff8600,emissiveIntensity:.55,roughness:.28});
    const emergency=new THREE.MeshStandardMaterial({color:0xff2c22,emissive:0xff140c,emissiveIntensity:.9,roughness:.22});
    const clearLamp=new THREE.MeshStandardMaterial({color:0xe7f3ff,emissive:0xcfe6ff,emissiveIntensity:.7,roughness:.18});
    const hoseMat=new THREE.MeshStandardMaterial({color:0x8d221c,roughness:.72});
    const plate=new THREE.MeshStandardMaterial({color:0x9aa3a8,roughness:.38,metalness:.72});
    function pane(mat,x,y,z,w,h,rx=0,ry=0){const m=new THREE.Mesh(new THREE.PlaneGeometry(w,h),mat);m.position.set(x,y,z);m.rotation.set(rx,ry,0);engine.add(m);return m;}
    function wheel(x,z,radius=.5,width=.26){const tire=new THREE.Mesh(new THREE.CylinderGeometry(radius,radius,width,28),rubber);tire.rotation.z=Math.PI/2;tire.position.set(x,radius,z);tire.castShadow=tire.receiveShadow=true;engine.add(tire);const hub=new THREE.Mesh(new THREE.CylinderGeometry(radius*.46,radius*.46,width*.42,18),chrome);hub.rotation.z=Math.PI/2;hub.position.set(x,radius,z);engine.add(hub);const cap=new THREE.Mesh(new THREE.CylinderGeometry(radius*.16,radius*.16,width*.62,12),paint);cap.rotation.z=Math.PI/2;cap.position.set(x,radius,z);engine.add(cap);for(let i=0;i<5;i++){const lug=new THREE.Mesh(new THREE.CylinderGeometry(.035,.035,width*.5,8),chrome);lug.rotation.z=Math.PI/2;lug.position.set(x,radius+Math.cos(i*1.2566)*radius*.28,z+Math.sin(i*1.2566)*radius*.28);engine.add(lug);}}
    function decal(text,x,y,z,w,h,ry,color='#f8e7a2',font=150){const c=document.createElement('canvas');c.width=1024;c.height=256;const q=c.getContext('2d');q.clearRect(0,0,1024,256);q.fillStyle=color;q.font=`bold ${font}px Arial`;q.textAlign='center';q.textBaseline='middle';q.fillText(text,512,132);const map=new THREE.CanvasTexture(c);map.colorSpace=THREE.SRGBColorSpace;const m=new THREE.Mesh(new THREE.PlaneGeometry(w,h),new THREE.MeshStandardMaterial({map,transparent:true,roughness:.45,metalness:.05,side:THREE.DoubleSide,depthWrite:false}));m.position.set(x,y,z);m.rotation.y=ry;engine.add(m);return m;}
    for(const side of [-1,1])box(engine,chrome,side*.78,.32,.05,.09,.16,8.15);
    box(engine,black,0,.28,0,2.05,.12,8.3);
    box(engine,paint,0,.58,2.28,2.48,1.22,3.55);
    box(engine,paint,0,1.78,2.02,2.42,1.18,2.72);
    box(engine,white,0,2.92,1.95,2.28,.08,2.35);
    box(engine,paint,0,.78,-1.95,2.5,1.62,4.85);
    box(engine,black,0,2.28,-2.15,2.05,.22,3.55);
    pane(glass,0,2.22,3.52,2.22,1.02,-.42,0);
    for(const side of [-.45,.45]){const wiper=box(engine,black,side,1.95,3.72,.05,.04,.72);wiper.rotation.x=-.7;wiper.rotation.z=side*-.15;}
    for(const side of [-1,1]){
      pane(glass,side*1.235,2.18,2.62,.95,.62,0,side*Math.PI/2);
      pane(glass,side*1.235,2.12,1.35,.78,.58,0,side*Math.PI/2);
      box(engine,black,side*1.232,1.22,2.15,.03,1.55,.045);
      box(engine,black,side*1.232,1.18,.55,.03,1.45,.04);
      box(engine,chrome,side*1.27,1.22,1.72,.04,.08,.18);
      box(engine,chrome,side*1.27,1.18,.15,.04,.08,.16);
      const mirror=box(engine,black,side*1.42,2.15,3.15,.28,.16,.1);mirror.rotation.y=side*.25;
      pane(glass,side*1.42,2.15,3.12,.18,.1,0,side*(Math.PI/2+.25));
      box(engine,gold,side*1.255,1.22,-1.9,.03,.16,4.35);
      box(engine,white,side*1.26,.95,-1.9,.02,.07,4.35);
      box(engine,plate,side*1.32,.4,1.55,.32,.07,1.15);
      for(const z of [-3.35,-2.15,-.95]){box(engine,paint,side*1.2,.95,z,.08,1.15,1.05);box(engine,black,side*1.248,.95,z,.02,.02,1.08);box(engine,black,side*1.248,.95,z+0,.02,1.18,.025);box(engine,chrome,side*1.28,1.15,z+.28,.035,.05,.16);}
      decal('MAPLE',side*1.29,1.55,-2.55,2.15,.42,side*Math.PI/2,'#f8e7a2',170);
      decal('FIRE & RESCUE',side*1.29,1.55,-.85,1.7,.28,side*Math.PI/2,'#fff8e8',92);
    }
    box(engine,chrome,0,.48,4.18,2.55,.28,.28);
    box(engine,black,0,.78,4.12,1.55,.72,.08);
    for(let i=0;i<5;i++)box(engine,chrome,0,.58+i*.14,4.18,1.42,.035,.04);
    for(const side of [-1,1]){box(engine,lamp,side*.95,.72,4.16,.38,.22,.06);box(engine,amber,side*1.18,.48,4.16,.22,.12,.05);box(engine,emergency,side*.42,1.55,4.08,.28,.1,.05);box(engine,clearLamp,side*.78,2.55,3.55,.16,.08,.05);}
    decal('E-1',0,1.95,4.1,.7,.32,0,'#f8e7a2',150);
    box(engine,black,0,2.95,2.15,1.55,.14,.42);
    for(const [x,mat] of [[-.52,emergency],[-.18,clearLamp],[.18,emergency],[.52,clearLamp]])box(engine,mat,x,3.02,2.15,.26,.12,.32);
    box(engine,chrome,0,3.12,1.15,.22,.28,.22);
    const bell=new THREE.Mesh(new THREE.SphereGeometry(.13,16,12),chrome);bell.scale.y=.7;bell.position.set(0,3.02,1.55);engine.add(bell);
    const nozzle=new THREE.Mesh(new THREE.CylinderGeometry(.055,.09,.48,12),chrome);nozzle.rotation.x=1.15;nozzle.position.set(0,2.72,-.15);nozzle.castShadow=true;engine.add(nozzle);
    for(const x of [-.42,.42]){const roll=new THREE.Mesh(new THREE.TorusGeometry(.32,.1,12,20),hoseMat);roll.rotation.y=Math.PI/2;roll.position.set(x,2.22,-2.35);roll.castShadow=true;engine.add(roll);}
    box(engine,hoseMat,-.7,2.18,-3.15,.28,.28,1.1);box(engine,white,.7,2.18,-3.15,.28,.28,1.1);
    for(const side of [-.34,.34])box(engine,chrome,side,2.48,-1.85,.05,.05,3.7);
    for(let z=-3.55;z<.05;z+=.28)box(engine,chrome,0,2.48,z,.64,.028,.03);
    for(const side of [-1,1]){for(const z of [-1.15,-2.45]){const cap=new THREE.Mesh(new THREE.CylinderGeometry(.11,.11,.08,14),chrome);cap.rotation.z=Math.PI/2;cap.position.set(side*1.3,1.28,z);engine.add(cap);box(engine,side<0?emergency:lamp,side*1.32,1.05,z,.04,.16,.16);}}
    box(engine,plate,1.22,1.15,-.35,.06,.55,.7);for(const [dx,dy,color] of [[0,.12,0xc23a32],[.12,-.05,0xf2c94b],[-.12,-.05,0x4aa3d8]]){const gauge=new THREE.Mesh(new THREE.CircleGeometry(.055,14),new THREE.MeshStandardMaterial({color,roughness:.35,emissive:color,emissiveIntensity:.25}));gauge.position.set(1.26,1.15+dy,-.35+dx);gauge.rotation.y=Math.PI/2;engine.add(gauge);}
    const chevron=document.createElement('canvas');chevron.width=512;chevron.height=256;const cq=chevron.getContext('2d');cq.fillStyle='#f4f1ea';cq.fillRect(0,0,512,256);cq.fillStyle='#c01f18';for(let i=-2;i<8;i++){cq.beginPath();cq.moveTo(i*70,0);cq.lineTo(i*70+46,0);cq.lineTo(i*70+150,256);cq.lineTo(i*70+104,256);cq.closePath();cq.fill();}const chevronMap=new THREE.CanvasTexture(chevron);chevronMap.colorSpace=THREE.SRGBColorSpace;const chevronMesh=new THREE.Mesh(new THREE.PlaneGeometry(2.35,.7),new THREE.MeshStandardMaterial({map:chevronMap,roughness:.5}));chevronMesh.position.set(0,1.15,-4.32);chevronMesh.rotation.y=Math.PI;engine.add(chevronMesh);
    for(const side of [-1,1]){box(engine,emergency,side*.85,.55,-4.28,.32,.14,.04);box(engine,amber,side*.4,.55,-4.28,.18,.1,.04);box(engine,lamp,side*1.05,1.55,-4.22,.16,.1,.04);}
    decal('KEEP BACK',0,.82,-4.34,1.15,.16,Math.PI,'#1a1c1e',110);
    wheel(1.22,2.95);wheel(-1.22,2.95);
    for(const z of [-1.2,-2.55])for(const side of [-1,1]){wheel(side*1.02,z,.5,.22);wheel(side*1.28,z,.5,.22);box(engine,black,side*1.15,.5,z,.08,.08,.55);}
    for(const z of [2.95,-1.2,-2.55])box(engine,black,0,.5,z,2.1,.08,.08);
    box(engine,black,0,.22,-4.05,2.2,.08,.12);
    obstacle(133.5,-90,8.95,2.75);
    return engine;
  }
  const firefighters=[];for(let i=0;i<4;i++){const actor=characters.create({x:133+i*2,z:-100,model:i%2?'casual':'neighbor',firefighter:true,interactive:true});firefighters.push(actor);}
  const crowd=new THREE.Group();scene.add(crowd);crowd.visible=false;
  for(const [cx,cz,color] of [[-36,-16,0x3d6a86],[-33,-15,0x8a4d42],[-37,-13,0x4f6b52],[-34,-18,0x6d5b86]]){
    const person=new THREE.Group();person.position.set(cx,0,cz);crowd.add(person);
    box(person,new THREE.MeshStandardMaterial({color,roughness:.8}),0,.9,0,.46,1.15,.32);
    box(person,new THREE.MeshStandardMaterial({color:0xc99570,roughness:.7}),0,1.62,0,.22,.22,.2);
  }
  const marketClosed=label(scene,'MARKET CLOSED',14,2.35,-13.2,4.2,.55);marketClosed.visible=false;
  function useObstacles(list){for(const o of list)obstacles.push(o);}
  function openBuilding(place,brickColor,signText,extraObstacles,floorH=4.4){
    const {x,z,w,d}=place,brick=visualKit.brick(brickColor),front=z+d/2;
    const shell=new THREE.Group();scene.add(shell);
    box(scene,visualKit.concrete,x,.08,z,w,.13,d);groundSurfaces.push({minX:x-w/2,maxX:x+w/2,minZ:z-d/2,maxZ:front+1.2,top:.21});
    for(const side of [-1,1])box(shell,brick,x+side*(w/2),.21,z,.3,floorH,d);
    box(shell,brick,x,.21,z-d/2,w,floorH,.3);
    const gap=2.4,leaf=(w-gap)/2;
    box(shell,brick,x-gap/2-leaf/2,.21,front,leaf,floorH,.3);box(shell,brick,x+gap/2+leaf/2,.21,front,leaf,floorH,.3);
    box(shell,cream,x,floorH-.45,front,gap,.7,.16);
    const roofMesh=box(shell,metal,x,floorH,z,w+.5,.22,d+.5);
    box(scene,metal,x,floorH-.55,front+.15,w,.16,1.4);label(scene,signText,x,floorH-.15,front+.2,Math.min(w-1,11),.7);
    useObstacles(extraObstacles);
    buildings.push({x,z,w,d,shop:false,height:floorH+.3});
    return {shell,roof:roofMesh};
  }
  // The zero-size box above is unused; the front wall is the two leaves around the door.
  const school=openBuilding(SCHOOL,0x8d4b3a,'MAPLE STREET SCHOOL',shellObstacles(SCHOOL),4.6);
  box(scene,visualKit.grass,SCHOOL.x,.02,SCHOOL.z+SCHOOL.d/2+4,SCHOOL.w+2,.08,6);
  chair(SCHOOL.x+6,SCHOOL.z+SCHOOL.d/2+3.2,Math.PI,'bench');
  box(scene,wood,SCHOOL.desk.x,.21,SCHOOL.desk.z,3.2,.9,1.1);obstacles.push({minX:SCHOOL.desk.x-1.6,maxX:SCHOOL.desk.x+1.6,minZ:SCHOOL.desk.z-.7,maxZ:SCHOOL.desk.z+.55});
  label(scene,'TODAY’S LESSON',SCHOOL.desk.x,1.7,SCHOOL.desk.z-.7,3.2,.4);
  if(characters.create)characters.create({x:SCHOOL.x-4,z:SCHOOL.z-1,model:'mom',interactive:false});
  const grocery=openBuilding(GROCERY,0x3f6a58,'MAPLE GROCERY',groceryObstacles(),4.3);
  for(const side of [-1,1]){box(scene,wood,GROCERY.x+side*3.4,.21,GROCERY.z,.9,1.15,2.6);box(scene,cream,GROCERY.x+side*3.4,1.36,GROCERY.z,1,.08,2.7);}
  box(scene,wood,GROCERY.x,.21,GROCERY.z-5,4.6,1.05,1);label(scene,'PAY HERE',GROCERY.x,2.1,GROCERY.z-5.7,3,.45);
  if(characters.create)characters.create({x:GROCERY.x+3,z:GROCERY.z-3.2,model:'neighbor',interactive:false});
  function busStop(stop){
    const g=new THREE.Group();g.position.set(stop.x+2.4,0,stop.z);scene.add(g);
    box(g,metal,0,.21,0,.12,2.6,.12);box(g,metal,.7,2.7,0,1.6,.08,1.3);box(g,navy,0,.9,.35,1.5,1.1,.08);
    label(g,'CITY BUS',0,2.15,.42,1.5,.32);obstacles.push({minX:stop.x+1.7,maxX:stop.x+3.3,minZ:stop.z-.5,maxZ:stop.z+.5});
  }
  busStop(BUS_STOPS.maple);busStop(BUS_STOPS.northstar);
  const park=RIVER_PARK,px=(park.minX+park.maxX)/2,pz=(park.minZ+park.maxZ)/2,pw=park.maxX-park.minX,pd=park.maxZ-park.minZ;
  box(scene,visualKit.grass,px,.03,pz,pw,.08,pd);groundSurfaces.push({minX:park.minX,maxX:park.maxX,minZ:park.minZ,maxZ:park.maxZ,top:.1});
  box(scene,visualKit.concrete,-28,.08,-330,34,.1,2.4);box(scene,visualKit.concrete,-34,.08,-345,2.2,.1,30);
  chair(-24,-318,Math.PI/2,'bench');chair(-40,-352,-Math.PI/2,'bench');
  table(-34,-340);chair(-34,-341.8,0);chair(-34,-338.2,Math.PI);
  label(scene,'RIVERFRONT PARK',-22,2.4,-300,5,.55);
  for(const [tx,tz] of [[-42,-290],[-18,-370],[-44,-360]])if(visualKit.treeModel)scene.add(visualKit.treeModel(tx,tz,1));
  let servedOrder=null;
  function serveOrder(id){if(servedOrder)scene.remove(servedOrder);servedOrder=new THREE.Group();servedOrder.position.set(-25,1.35,-38.2);scene.add(servedOrder);box(servedOrder,metal,0,0,0,.65,.025,.45);
    if(id==='sandwich'){box(servedOrder,cream,0,.025,0,.38,.05,.28);box(servedOrder,new THREE.MeshStandardMaterial({color:0xd7a841}),0,.075,0,.39,.025,.29);box(servedOrder,cream,0,.1,0,.38,.05,.28);}
    else if(id==='fruit'){const bowl=new THREE.Mesh(new THREE.CylinderGeometry(.2,.12,.12,16),cream);bowl.position.y=.085;servedOrder.add(bowl);for(let i=0;i<5;i++){const fruit=new THREE.Mesh(new THREE.SphereGeometry(.06,12,8),new THREE.MeshStandardMaterial({color:[0x9b3832,0x6a8f40,0xd29a36][i%3]}));fruit.position.set(Math.cos(i*1.3)*.1,.17,Math.sin(i*1.3)*.1);servedOrder.add(fruit);}}
    else{const cup=new THREE.Mesh(new THREE.CylinderGeometry(.11,.085,.23,16),cream);cup.position.y=.14;servedOrder.add(cup);const drink=new THREE.Mesh(new THREE.CircleGeometry(.098,16),new THREE.MeshStandardMaterial({color:id==='juice'?0xe2a13a:0x5f3624}));drink.rotation.x=-Math.PI/2;drink.position.y=.258;servedOrder.add(drink);}}
  return {seats,chair,firefighters,fireEngine:engine,serveOrder,serveBakeryOrder,bakeryInside,cafeInside:p=>p.x>-40.5&&p.x<-19.5&&p.z>-40.5&&p.z<-27,schoolInside:insideSchool,groceryInside:insideGrocery,marketClosed,
    applyAtmosphere(atmosphere){crowd.visible=!!atmosphere?.cafeBusy;marketClosed.visible=!!atmosphere?.evening;},
    update(p){const inside=this.cafeInside(p);for(const o of cutaway)o.visible=!inside;const inBakery=bakeryInside(p);bakeryWalls.visible=bakeryRoof.visible=!inBakery;const inSchool=insideSchool(p),inGrocery=insideGrocery(p);school.shell.visible=!inSchool;grocery.shell.visible=!inGrocery;return inside||inBakery||inSchool||inGrocery;}};
}
