import * as THREE from 'three';
import {MAPLE_STREETS,MAPLE_GROVE,COMMUNITY_ROADS,COMMUNITY_HOMES,communityPoint,communityDriveway,communityRoadRect,communityOnRoad,worldDrivable,withinRect} from './world-rules.js';

// Metre-scale homes, private lots and streets share the same layout as navigation
// and vehicle collision. Static detail is merged by the existing city batcher.
export function createPlannedCommunity({scene,visualKit,obstacles,buildings,groundSurfaces}){
  const streetRoot=new THREE.Group();streetRoot.userData.staticArchitecture=true;streetRoot.name='Maple Grove streets and landscaping';scene.add(streetRoot);
  const unit=new THREE.BoxGeometry(1,1,1),geometryCache=new Map(),materialCache=new Map(),homes=[],gateways=[];
  const material=(color,roughness=.84,metalness=0)=>{const key=color+':'+roughness+':'+metalness;if(!materialCache.has(key))materialCache.set(key,new THREE.MeshStandardMaterial({color,roughness,metalness}));return materialCache.get(key);};
  const concrete=visualKit.concrete,grass=visualKit.grass,asphalt=visualKit.asphalt,trim=material(0xe5e0d3),dark=material(0x29383b,.6,.25),foundation=material(0xaca79a),wood=visualKit.wood(0x988160),whiteFence=material(0xdad8ca),mulch=material(0x4b3f32),metal=material(0x38433e,.55,.5);
  const palette=[
    [0xd3cbbc,0x9b7059,0x3c4142,0x29434d], [0x87999c,0xaaa08b,0x393f42,0x344d5c],
    [0x9da895,0x886a52,0x41423e,0x43574d], [0xb7aa95,0x94725d,0x474542,0x5a463b],
    [0xc9c9be,0x797c77,0x343c40,0x354950], [0xb3b3a5,0x9b6955,0x424642,0x4c5550],
  ].map(([s,b,r,d])=>({siding:visualKit.siding(s),brick:visualKit.brick(b),roof:visualKit.roofing(r),door:material(d,.56)}));
  const porchLight=new THREE.MeshStandardMaterial({color:0xffe7bb,emissive:0xffc575,emissiveIntensity:.08,roughness:.35});
  visualKit.atmosphere.registerGlow(porchLight,{day:.04,night:2.3});
  function box(parent,x,y,z,w,h,d,mat,shadow=true){
    let geometry=unit;
    if(mat.userData?.tileSize){const tile=mat.userData.tileSize,key=[w,h,d,tile].join(':');if(!geometryCache.has(key)){const g=unit.clone(),p=g.attributes.position,n=g.attributes.normal,uv=g.attributes.uv;for(let i=0;i<p.count;i++){const ax=Math.abs(n.getX(i)),ay=Math.abs(n.getY(i));uv.setXY(i,((ay>.5||ax<.5?p.getX(i)*w:p.getZ(i)*d)+(ay>.5||ax<.5?w:d)/2)/tile,((ay>.5?p.getZ(i)*d:p.getY(i)*h)+(ay>.5?d:h)/2)/tile);}geometryCache.set(key,g);}geometry=geometryCache.get(key);}
    const mesh=new THREE.Mesh(geometry,mat);mesh.position.set(x,y+h/2,z);mesh.scale.set(w,h,d);mesh.castShadow=shadow;mesh.receiveShadow=true;parent.add(mesh);return mesh;
  }
  function solid(home,x,z,w,d,kind){const p=home?communityPoint(home,x,z):{x,z};const obstacle={minX:p.x-w/2,maxX:p.x+w/2,minZ:p.z-d/2,maxZ:p.z+d/2,kind,homeId:home?.id};obstacles.push(obstacle);return obstacle;}
  function surface(home,x,z,w,d,top,mat,kind,bottom=top-.08){const p=home?communityPoint(home,x,z):{x,z};box(streetRoot,p.x,bottom,p.z,w,top-bottom,d,mat,false);const s={minX:p.x-w/2,maxX:p.x+w/2,minZ:p.z-d/2,maxZ:p.z+d/2,top,kind,homeId:home?.id};groundSurfaces.push(s);return s;}
  function textPlate(parent,text,x,y,z,w,h,background='#24483e',yaw=0){const canvas=document.createElement('canvas');canvas.width=512;canvas.height=128;const q=canvas.getContext('2d');q.fillStyle=background;q.fillRect(0,0,512,128);q.strokeStyle='#c9c6aa';q.lineWidth=5;q.strokeRect(5,5,502,118);q.fillStyle='#fff4d8';q.font='600 48px Arial';q.textAlign='center';q.textBaseline='middle';q.fillText(text,256,66,480);const map=new THREE.CanvasTexture(canvas);map.colorSpace=THREE.SRGBColorSpace;const mesh=new THREE.Mesh(new THREE.PlaneGeometry(w,h),new THREE.MeshStandardMaterial({map,roughness:.8,side:THREE.DoubleSide}));mesh.position.set(x,y,z);mesh.rotation.y=yaw;parent.add(mesh);return mesh;}
  // A flat developed site replaces the forest skirt underneath the subdivision.
  surface(null,(MAPLE_GROVE.minX+MAPLE_GROVE.maxX)/2,(MAPLE_GROVE.minZ+MAPLE_GROVE.maxZ)/2,MAPLE_GROVE.maxX-MAPLE_GROVE.minX,MAPLE_GROVE.maxZ-MAPLE_GROVE.minZ,.02,grass,'grass',-.07);
  const roadRects=COMMUNITY_ROADS.map(r=>communityRoadRect(r)),walkRects=COMMUNITY_ROADS.map(r=>communityRoadRect(r,3.3)),drives=COMMUNITY_HOMES.map(communityDriveway);
  const oldRoad=(x,z)=>Math.abs(x)<=165&&Math.abs(z)<=165&&MAPLE_STREETS.some(n=>Math.abs(x-n)<=7.5||Math.abs(z-n)<=7.5);
  const oldWalk=[];for(const n of MAPLE_STREETS)for(const side of [-1,1]){let cursor=-165;for(const crossing of [...MAPLE_STREETS,173.5]){const end=Math.min(165,crossing-8.5);if(end>cursor){oldWalk.push({minX:n+side*9-1.5,maxX:n+side*9+1.5,minZ:cursor,maxZ:end},{minX:cursor,maxX:end,minZ:n+side*9-1.5,maxZ:n+side*9+1.5});}cursor=crossing+8.5;}}
  // Partition the union once, so asphalt/sidewalks never overlap at junctions.
  // Driveway cuts are lowered continuously through the sidewalk to the road.
  const bounds={minX:-313,maxX:-109,minZ:-191,maxZ:11},relevant=[...roadRects,...walkRects,...drives,...oldWalk.filter(r=>r.maxX>=bounds.minX&&r.minX<=bounds.maxX&&r.maxZ>=bounds.minZ&&r.minZ<=bounds.maxZ)];
  const breaks=(axis)=>[...new Set([bounds['min'+axis],bounds['max'+axis],...relevant.flatMap(r=>[r['min'+axis],r['max'+axis]]),...(axis==='X'?[-165]:MAPLE_STREETS.flatMap(n=>[n-7.5,n+7.5]))].filter(n=>n>=bounds['min'+axis]&&n<=bounds['max'+axis]))].sort((a,b)=>a-b);
  const xs=breaks('X'),zs=breaks('Z');
  function tileKind(x,z){if(roadRects.some(r=>withinRect(x,z,r)))return oldRoad(x,z)?null:'asphalt';if(!walkRects.some(r=>withinRect(x,z,r))||oldRoad(x,z)||oldWalk.some(r=>withinRect(x,z,r))||drives.some(r=>withinRect(x,z,r)))return null;return 'concrete';}
  for(let j=1;j<zs.length;j++){let start=0,last=null;const flush=i=>{if(last)surface(null,(xs[start]+xs[i])/2,(zs[j-1]+zs[j])/2,xs[i]-xs[start],zs[j]-zs[j-1],last==='asphalt'?.06:.21,last==='asphalt'?asphalt:concrete,last);};for(let i=0;i<xs.length-1;i++){const kind=tileKind((xs[i]+xs[i+1])/2,(zs[j-1]+zs[j])/2);if(kind!==last){flush(i);start=i;last=kind;}}flush(xs.length-1);}
  for(const road of COMMUNITY_ROADS){const horizontal=road.z1===road.z2,a=horizontal?Math.min(road.x1,road.x2):Math.min(road.z1,road.z2),b=horizontal?Math.max(road.x1,road.x2):Math.max(road.z1,road.z2);for(const side of [-1,1])for(let t=a;t<b;t+=1.5){const len=Math.min(1.48,b-t),fixed=(horizontal?road.z1:road.x1)+side*7.62,x=horizontal?t+len/2:fixed,z=horizontal?fixed:t+len/2;if(worldDrivable(x,z)||oldWalk.some(r=>withinRect(x,z,r))||drives.some(r=>withinRect(x,z,r,.35)))continue;box(streetRoot,x,.06,z,horizontal?len:.16,.16,horizontal?.16:len,foundation,false);}}

  function gable(parent,cx,cz,w,d,base,rise,roof,siding,turn=0){
    const g=new THREE.Group();g.position.set(cx,base,cz);g.rotation.y=turn;parent.add(g);const run=w/2,slope=Math.hypot(run,rise),angle=Math.atan2(rise,run);
    for(const side of [-1,1]){const panel=box(g,side*run/2,rise/2-.1,0,slope,.2,d,roof);panel.rotation.z=-side*angle;box(g,side*run,-.15,0,.18,.25,d+.08,trim);}
    box(g,0,rise-.12,0,.23,.23,d+.12,roof);
    const shape=new THREE.Shape();shape.moveTo(-run+.35,0);shape.lineTo(run-.35,0);shape.lineTo(0,rise-.14);shape.closePath();const geometry=new THREE.ExtrudeGeometry(shape,{depth:.12,bevelEnabled:false});
    for(const side of [-1,1]){const face=new THREE.Mesh(geometry,siding);face.position.set(0,0,side*(d/2-.18));if(side<0)face.rotation.y=Math.PI;face.castShadow=face.receiveShadow=true;g.add(face);}
  }
  function windowOn(root,x,y,z,width=1.3,height=1.4,yaw=0,index=0){const g=new THREE.Group();g.position.set(x,y,z);g.rotation.y=yaw;root.add(g);box(g,0,-.1,0,width+.2,height+.2,.12,trim,false);box(g,0,0,.08,width,height,.05,visualKit.windowMaterial(index),false);box(g,0,0,.12,.045,height,.035,trim,false);box(g,0,height*.49,.12,width,.055,.035,trim,false);box(g,0,-.15,.08,width+.33,.12,.27,trim,false);}
  function fence(root,home,x1,z1,x2,z2,mat){const distance=Math.hypot(x2-x1,z2-z1),count=Math.ceil(distance/1.8);for(let i=0;i<count;i++){const t=(i+.5)/count,x=x1+(x2-x1)*t,z=z1+(z2-z1)*t,horizontal=z1===z2,len=distance/count;box(root,x,.1,z,horizontal?len:.11,1.72,horizontal?.11:len,mat);box(root,x,1.82,z,horizontal?len+.035:.15,.08,horizontal?.15:len+.035,mat);for(const y of [.43,1.38])box(root,x,y,z+.07,horizontal?len:.16,.1,horizontal?.08:len,mat,false);}
    for(let i=0;i<=count;i++){const t=i/count,x=x1+(x2-x1)*t,z=z1+(z2-z1)*t;box(root,x,.02,z,.19,1.96,.19,mat);box(root,x,1.98,z,.23,.06,.23,mat,false);}solid(home,(x1+x2)/2,(z1+z2)/2,Math.abs(x2-x1)+.2,Math.abs(z2-z1)+.2,'backyard-fence');}

  for(const home of COMMUNITY_HOMES){
    const {w,d}=home,p=palette[home.palette],root=new THREE.Group();root.position.set(home.x,0,home.z);root.rotation.y=home.heading;root.userData.staticArchitecture=true;root.name='Two-story home '+home.address+' '+home.street;scene.add(root);
    const front=d/2,rear=(home.rearZ-home.z)*(home.heading===0?1:-1),frontLot=Math.abs(home.roadZ-home.z)-10.8,doorX=w*.20,garageX=-w*.23,porchX=w*.28;
    surface(home,0,(rear+frontLot)/2,home.lotWidth-.12,frontLot-rear,.025,grass,'grass',-.055);
    box(root,0,-.055,0,w+.34,.355,d+.34,foundation);box(root,0,.3,0,w,6.1,d,p.siding);
    box(root,0,.3,front+.035,w,2.77,.09,p.brick);for(const side of [-1,1])box(root,side*(w/2+.035),.3,0,.09,2.77,d,p.brick);
    box(root,0,3.04,front+.08,w+.08,.17,.15,trim);box(root,0,6.27,front+.08,w+.16,.13,.15,trim);
    for(const side of [-1,1]){box(root,side*(w/2+.07),.3,front,.13,6.1,.15,trim,false);box(root,side*(w/2+.16),.24,-front+.4,.09,6.1,.09,metal,false);}
    const turn=home.plan===2?Math.PI/2:0;gable(root,0,0,turn?d+1:w+1,turn?w+1:d+1,6.4,home.plan===3?2.45:2.12,p.roof,p.siding,turn);
    if(home.plan===1||home.plan===3)gable(root,home.plan===1?garageX:porchX,front-1.35,home.plan===1?6.7:5.8,4.1,6.38,1.52,p.roof,p.siding);
    for(const [i,x] of [-w*.29,0,w*.29].entries()){windowOn(root,x,4.27,front+.11,home.plan===3?1.45:1.35,1.45,0,i+home.palette);if(home.plan%2===1)for(const s of [-1,1])box(root,x+s*.94,4.17,front+.1,.28,1.65,.09,dark,false);}
    windowOn(root,w*.40,1.12,front+.1,1.05,1.35,0,4);
    for(const side of [-1,1])for(const z of [-d*.27,d*.24])for(const y of [1.2,4.27])windowOn(root,side*(w/2+.08),y,z,1.1,1.38,side*Math.PI/2,home.palette+Math.round(y));
    for(const x of [-w*.27,w*.27]){windowOn(root,x,4.27,-front-.08,1.35,1.45,Math.PI,home.palette+3);if(x<0)windowOn(root,x,1.2,-front-.08,1.45,1.4,Math.PI,home.palette+2);}
    // Both garage bays share one paneled two-car overhead door.
    box(root,garageX,.28,front+.12,6.25,2.5,.17,trim,false);box(root,garageX,.36,front+.23,5.98,2.25,.08,material(0xc9c9c0),false);
    for(let y=.64;y<2.6;y+=.38)box(root,garageX,y,front+.281,5.88,.035,.025,foundation,false);
    for(const x of [-2.1,-.7,.7,2.1])box(root,garageX+x,2.17,front+.29,1.08,.28,.035,visualKit.windowMaterial(1),false);
    box(root,doorX,.3,front+.12,1.25,2.43,.13,trim,false);box(root,doorX,.4,front+.22,1.02,2.22,.08,p.door,false);box(root,doorX,1.6,front+.27,.55,.78,.04,visualKit.windowMaterial(5),false);box(root,doorX+.35,1.42,front+.3,.055,.11,.04,material(0xb39b63,.3,.6),false);
    surface(home,porchX,front+.87,w*.40,1.65,.3,concrete,'concrete',.14);surface(home,doorX,front+1.94,1.65,.65,.17,concrete,'concrete',.08);surface(home,doorX,front+2.53,1.7,.6,.09,concrete,'concrete',.025);
    for(const x of [w*.08,w*.48]){box(root,x,.3,front+1.42,.18,2.65,.18,trim);solid(home,x,front+1.42,.22,.22,'porch-post');}box(root,porchX,3.02,front+.88,w*.44,.16,2.05,trim);box(root,porchX,3.18,front+.88,w*.45,.12,2.15,p.roof);
    for(const x of [garageX-3.3,doorX+.94]){box(root,x,2.03,front+.19,.2,.42,.18,dark,false);box(root,x,2.1,front+.29,.14,.23,.08,porchLight,false);}
    const drive=communityDriveway(home);surface(null,(drive.minX+drive.maxX)/2,(drive.minZ+drive.maxZ)/2,drive.maxX-drive.minX,drive.maxZ-drive.minZ,drive.top,concrete,'concrete',.025);
    for(let localZ=front+3;localZ<Math.abs(home.roadZ-home.z)-7.3;localZ+=3.2)box(root,garageX,.081,localZ,6.5,.003,.018,foundation,false);
    const walkEnd=Math.abs(home.roadZ-home.z)-9.1,walkStart=front+2.7;surface(home,doorX,(walkStart+walkEnd)/2,1.55,walkEnd-walkStart,.085,concrete,'concrete',.025);
    // A rear door, patio and lawn make every backyard a usable separate space.
    box(root,w*.24,.3,-front-.11,1.65,2.4,.13,trim,false);box(root,w*.24,.42,-front-.2,1.42,2.16,.06,visualKit.windowMaterial(3),false);
    const patio=surface(home,w*.2,-front-2.3,5.2,4.2,.085,concrete,'concrete',.025);
    box(root,-w/2-1.05,.05,-front+1,1.25,.08,1.3,concrete,false);box(root,-w/2-1.05,.13,-front+1,1.05,.92,1.05,metal);for(let y=.23;y<.95;y+=.13)box(root,-w/2-1.05,y,-front+1.53,.96,.035,.025,dark,false);solid(home,-w/2-1.05,-front+1,1.1,1.1,'air-conditioner');
    const shrubs=material(0x5d7750);for(const x of [-w*.44,w*.46]){box(root,x,.025,front+.8,1.35,.08,.9,mulch,false);for(let i=0;i<2;i++){const shrub=new THREE.Mesh(new THREE.SphereGeometry(.42,10,7),shrubs);shrub.position.set(x+(i-.5)*.5,.44,front+.83);shrub.scale.y=.78;root.add(shrub);}}
    const mailboxX=home.lotWidth*.39,mailboxZ=Math.abs(home.roadZ-home.z)-11.2;box(root,mailboxX,.025,mailboxZ,.1,1.05,.1,metal);box(root,mailboxX,1.07,mailboxZ,.42,.3,.58,dark);textPlate(root,String(home.address),mailboxX,1.22,mailboxZ+.301,.38,.16,'#344b43');
    if(home.fenced){const fenceMat=home.palette===4?whiteFence:wood,bound=home.lotWidth/2-.4,start=-front+.65,gapFront=-front-.7,gapBack=-front-3.1;
      fence(root,home,-bound,rear,bound,rear,fenceMat);fence(root,home,-bound,rear,-bound,start,fenceMat);fence(root,home,bound,rear,bound,gapBack,fenceMat);fence(root,home,bound,gapFront,bound,start,fenceMat);
      // An open gate leaf rests perpendicular to the side fence; the 2.4 m
      // opening stays clear instead of trapping a character in the backyard.
      box(root,bound-1.05,.1,gapFront,2.1,1.72,.11,fenceMat);solid(home,bound-1.05,gapFront,2.1,.15,'open-gate');const gate=communityPoint(home,bound,(gapFront+gapBack)/2);gateways.push({...gate,homeId:home.id,width:gapFront-gapBack});
    }
    const frontTree=communityPoint(home,home.lotWidth*.36,Math.abs(home.roadZ-home.z)-13.3),backTree=communityPoint(home,-home.lotWidth*.33,rear+3.2);
    scene.add(visualKit.treeModel(frontTree.x,frontTree.z,.55));solid(null,frontTree.x,frontTree.z,.38,.38,'tree');
    if(!home.existing){scene.add(visualKit.treeModel(backTree.x,backTree.z,.62));solid(null,backTree.x,backTree.z,.4,.4,'tree');}
    solid(home,0,0,w+.4,d+.4,'community-house');buildings.push({...home,shop:false,height:9.05,residential:true});homes.push({...home,driveway:drive,patio,backyard:{minX:home.x-home.lotWidth/2+.4,maxX:home.x+home.lotWidth/2-.4,minZ:Math.min(home.rearZ,home.z-(home.heading===0?1:-1)*(front+.8)),maxZ:Math.max(home.rearZ,home.z-(home.heading===0?1:-1)*(front+.8))}});
  }
  for(const z of [-165,-120,-45])for(const x of [-311.5,-140.5]){box(streetRoot,x,.02,z,.23,.28,.23,foundation);box(streetRoot,x,.3,z,.09,5.7,.09,metal);box(streetRoot,x,5.96,z,1.35,.12,.4,metal);box(streetRoot,x,5.91,z,1.12,.05,.32,porchLight,false);visualKit.atmosphere.addStreetLight({x,y:5.91,z,groundY:.06});solid(null,x,z,.25,.25,'streetlight');}
  for(const z of [-140,-18]){const monument=new THREE.Group();monument.position.set(-135.8,0,z);monument.rotation.y=Math.PI/2;monument.userData.staticArchitecture=true;scene.add(monument);box(monument,0,.02,0,8.4,.38,1.3,foundation);box(monument,0,.4,0,7.8,1.48,.85,visualKit.brick(0x8c705c));box(monument,0,1.88,0,8.2,.14,1.05,trim);textPlate(monument,'MAPLE GROVE',0,1.2,.44,6.9,.8,'#2e473e');solid(null,-135.8,z,1.3,8.4,'community-monument');}
  for(const [z,name] of [[-180,'MAPLE GROVE LN'],[-90,'CEDAR RUN'],[0,'WILLOW WAY']]){const x=-139.3,zz=z-11.8;box(streetRoot,x,.02,zz,.07,2.95,.07,metal);textPlate(streetRoot,name,x,2.77,zz+.04,3.4,.47);}
  return {homes,roads:COMMUNITY_ROADS,gateways,fenced:homes.filter(h=>h.fenced).length};
}
