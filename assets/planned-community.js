import * as THREE from 'three';
import {createSofaSets} from './sofa-sets.js';
import {MAPLE_STREETS,MAPLE_GROVE,mapleOnRoad,COMMUNITY_ROADS,COMMUNITY_HOMES,communityPoint,communityDriveway,communityRoadRect,communityOnRoad,worldDrivable,withinRect} from './world-rules.js';
import {createResidentialDoors} from './residential-doors.js';

// Metre-scale homes, private lots and streets share the same layout as navigation
// and vehicle collision. Static detail is merged by the existing city batcher.
export function createPlannedCommunity({scene,visualKit,obstacles,buildings,groundSurfaces}){
  const streetRoot=new THREE.Group();streetRoot.userData.staticArchitecture=true;streetRoot.name='Maple Grove streets and landscaping';scene.add(streetRoot);
  const unit=new THREE.BoxGeometry(1,1,1),materialCache=new Map(),grassGeometries=new Map(),homes=[],gateways=[],architectureRoots=[streetRoot];
  const doorSystem=createResidentialDoors({scene,obstacles}),addressPlaques=[],furnishedInteriors=[];
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
    // PBR materials derive UVs from world/instance transforms. The legacy
    // grass material still needs metre-scaled UVs, shared by lawn dimensions.
    let geometry=unit;
    if(mat===grass&&mat.userData?.tileSize){const tile=mat.userData.tileSize,key=[w,h,d].join(':');if(!grassGeometries.has(key)){const g=unit.clone(),p=g.attributes.position,n=g.attributes.normal,uv=g.attributes.uv;for(let i=0;i<p.count;i++){const ax=Math.abs(n.getX(i)),ay=Math.abs(n.getY(i));uv.setXY(i,((ay>.5||ax<.5?p.getX(i)*w:p.getZ(i)*d)+(ay>.5||ax<.5?w:d)/2)/tile,((ay>.5?p.getZ(i)*d:p.getY(i)*h)+(ay>.5?d:h)/2)/tile);}grassGeometries.set(key,g);}geometry=grassGeometries.get(key);}
    const mesh=new THREE.Mesh(geometry,mat);mesh.position.set(x,y+h/2,z);mesh.scale.set(w,h,d);mesh.castShadow=shadow;mesh.receiveShadow=true;parent.add(mesh);return mesh;
  }
  function solid(home,x,z,w,d,kind){const p=home?communityPoint(home,x,z):{x,z};const obstacle={minX:p.x-w/2,maxX:p.x+w/2,minZ:p.z-d/2,maxZ:p.z+d/2,kind,homeId:home?.id};obstacles.push(obstacle);return obstacle;}
  function surface(home,x,z,w,d,top,mat,kind,bottom=top-.08){const p=home?communityPoint(home,x,z):{x,z};if(mat!==grass||!home)box(streetRoot,p.x,bottom,p.z,w,top-bottom,d,mat,false);const s={minX:p.x-w/2,maxX:p.x+w/2,minZ:p.z-d/2,maxZ:p.z+d/2,top,kind,homeId:home?.id};groundSurfaces.push(s);return s;}
  function textPlate(parent,text,x,y,z,w,h,background='#24483e',yaw=0){const canvas=document.createElement('canvas');canvas.width=512;canvas.height=128;const q=canvas.getContext('2d');q.fillStyle=background;q.fillRect(0,0,512,128);q.strokeStyle='#c9c6aa';q.lineWidth=5;q.strokeRect(5,5,502,118);q.fillStyle='#fff4d8';q.font='600 48px Arial';q.textAlign='center';q.textBaseline='middle';q.fillText(text,256,66,480);const map=new THREE.CanvasTexture(canvas);map.colorSpace=THREE.SRGBColorSpace;const mesh=new THREE.Mesh(new THREE.PlaneGeometry(w,h),new THREE.MeshStandardMaterial({map,roughness:.8,side:THREE.DoubleSide}));mesh.position.set(x,y,z);mesh.rotation.y=yaw;parent.add(mesh);return mesh;}
  // One texture atlas keeps all unique addresses legible without 27 extra draws.
  const addressCanvas=document.createElement('canvas');addressCanvas.width=addressCanvas.height=1024;
  const aq=addressCanvas.getContext('2d'),addressMap=new THREE.CanvasTexture(addressCanvas);addressMap.colorSpace=THREE.SRGBColorSpace;
  const addressMaterial=new THREE.MeshStandardMaterial({map:addressMap,emissiveMap:addressMap,emissive:0xffe2ac,emissiveIntensity:.08,roughness:.48});
  visualKit.atmosphere.registerGlow(addressMaterial,{day:.05,night:.65});
  function addressPlaque(root,home,x,z){const index=addressPlaques.length,col=index%4,row=Math.floor(index/4),left=col*256,top=row*128;
    aq.fillStyle='#192d2c';aq.fillRect(left,top,256,128);aq.strokeStyle='#c4a76c';aq.lineWidth=2;aq.strokeRect(left+8,top+8,240,112);
    aq.textAlign='center';aq.textBaseline='middle';aq.fillStyle='#f4dca9';aq.font='600 76px Georgia';aq.fillText(String(home.address),left+128,top+53,218);
    aq.fillStyle='#d7cfb8';aq.font='12px Arial';aq.fillText(home.street.toUpperCase(),left+128,top+103,218);
    box(root,x,1.22,z,1.22,.73,.07,material(0xb39760,.32,.65),false);box(root,x,1.245,z+.041,1.17,.68,.035,dark,false);
    const geometry=new THREE.PlaneGeometry(1.13,.64),uv=geometry.attributes.uv;for(let i=0;i<uv.count;i++)uv.setXY(i,(col+uv.getX(i))/4,1-(row+1)/8+uv.getY(i)/8);
    const face=new THREE.Mesh(geometry,addressMaterial);face.position.set(x,1.585,z+.062);face.name='Address plaque · '+home.address+' '+home.street;face.userData.address=home.address+' '+home.street;root.add(face);
    addressPlaques.push({homeId:home.id,address:face.userData.address,face,position:communityPoint(home,x,z),heading:home.heading});
  }
  function lowerWall(root,home,axis,fixed,a,b,mat,openings=[]){const xs=[a,b,...openings.flatMap(o=>[o.a,o.b])].sort((x,y)=>x-y),ys=[.3,3.18,...openings.map(o=>o.top)].sort((x,y)=>x-y);
    for(let i=1;i<xs.length;i++)for(let j=1;j<ys.length;j++){const lo=xs[i-1],hi=xs[i],y=ys[j-1],top=ys[j],mid=(lo+hi)/2;if(hi-lo<.001||top-y<.001||openings.some(o=>mid>o.a&&mid<o.b&&y<o.top))continue;
      const x=axis==='x'?mid:fixed,z=axis==='x'?fixed:mid,w=axis==='x'?hi-lo:.22,d=axis==='x'?.22:hi-lo;
      box(root,x,y,z,w,top-y,d,mat);if(y<1.85)Object.assign(solid(home,x,z,w,d,'community-wall'),{minY:y,maxY:top});
    }
  }
  // A flat developed site replaces the forest skirt underneath the subdivision.
  surface(null,(MAPLE_GROVE.minX+MAPLE_GROVE.maxX)/2,(MAPLE_GROVE.minZ+MAPLE_GROVE.maxZ)/2,MAPLE_GROVE.maxX-MAPLE_GROVE.minX,MAPLE_GROVE.maxZ-MAPLE_GROVE.minZ,.02,grass,'grass',-.07);
  const roadRects=COMMUNITY_ROADS.map(r=>communityRoadRect(r)),walkRects=COMMUNITY_ROADS.map(r=>communityRoadRect(r,3.3)),drives=COMMUNITY_HOMES.map(communityDriveway);
  const oldRoad=mapleOnRoad;
  const oldWalk=[];for(const n of MAPLE_STREETS)for(const side of [-1,1]){let cursor=-165;for(const crossing of [...MAPLE_STREETS,173.5]){const end=Math.min(165,crossing-8.5);if(end>cursor){oldWalk.push({minX:n+side*9-1.5,maxX:n+side*9+1.5,minZ:cursor,maxZ:end},{minX:Math.max(cursor,-130.8),maxX:end,minZ:n+side*9-1.5,maxZ:n+side*9+1.5});}cursor=crossing+8.5;}}
  // Partition the union once, so asphalt/sidewalks never overlap at junctions.
  // Driveway cuts are lowered continuously through the sidewalk to the road.
  const bounds={minX:-313,maxX:-109,minZ:-191,maxZ:11},relevant=[...roadRects,...walkRects,...drives,...oldWalk.filter(r=>r.maxX>=bounds.minX&&r.minX<=bounds.maxX&&r.maxZ>=bounds.minZ&&r.minZ<=bounds.maxZ)];
  const breaks=(axis)=>[...new Set([bounds['min'+axis],bounds['max'+axis],...relevant.flatMap(r=>[r['min'+axis],r['max'+axis]]),...(axis==='X'?[-165]:MAPLE_STREETS.flatMap(n=>[n-7.5,n+7.5]))].filter(n=>n>=bounds['min'+axis]&&n<=bounds['max'+axis]))].sort((a,b)=>a-b);
  const xs=breaks('X'),zs=breaks('Z');
  function tileKind(x,z){if(roadRects.some(r=>withinRect(x,z,r)))return oldRoad(x,z)?null:'asphalt';if(!walkRects.some(r=>withinRect(x,z,r))||oldRoad(x,z)||oldWalk.some(r=>withinRect(x,z,r))||drives.some(r=>withinRect(x,z,r)))return null;return 'concrete';}
  for(let j=1;j<zs.length;j++){let start=0,last=null;const flush=i=>{if(last)surface(null,(xs[start]+xs[i])/2,(zs[j-1]+zs[j])/2,xs[i]-xs[start],zs[j]-zs[j-1],last==='asphalt'?.06:.21,last==='asphalt'?asphalt:concrete,last);};for(let i=0;i<xs.length-1;i++){const kind=tileKind((xs[i]+xs[i+1])/2,(zs[j-1]+zs[j])/2);if(kind!==last){flush(i);start=i;last=kind;}}flush(xs.length-1);}
  for(const road of COMMUNITY_ROADS){const horizontal=road.z1===road.z2,a=horizontal?Math.min(road.x1,road.x2):Math.min(road.z1,road.z2),b=horizontal?Math.max(road.x1,road.x2):Math.max(road.z1,road.z2);for(const side of [-1,1])for(let t=a;t<b;t+=1.5){const len=Math.min(1.48,b-t),fixed=(horizontal?road.z1:road.x1)+side*7.62,x=horizontal?t+len/2:fixed,z=horizontal?fixed:t+len/2;if(worldDrivable(x,z)||oldWalk.some(r=>withinRect(x,z,r))||drives.some(r=>withinRect(x,z,r,.35)))continue;box(streetRoot,x,.06,z,horizontal?len:.16,.16,horizontal?.16:len,foundation,false);}}

  // Narrow seams between lots read as planted garden pockets, never lanes.
  const landscapePockets=[];
  for(const x of [-256,-224,-192])for(const z of [-219,-144,-54,39]){
    surface(null,x,z,2.7,5.8,.055,mulch,'grass',.02);
    const shrubMat=material(0x607553);
    for(const dz of [-1.8,0,1.8]){if(visualKit.shrub?.(x,.06,z+dz,{width:1.05,height:.78,tint:0x607553}))continue;const shrub=new THREE.Mesh(new THREE.IcosahedronGeometry(.48,0),shrubMat);shrub.position.set(x,.42,z+dz);shrub.scale.set(1,.7,1);streetRoot.add(shrub);}
    landscapePockets.push({x,z});
  }

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

  function furnish139(root,home){
    // A bounded furnished ground floor, using the same static instance batches.
    // The upstairs shell stays closed; property ownership still belongs to 101.
    const plaster=material(0xe6dfd1),fabric=material(0x829387,.96),linen=material(0xe2d8c2,.98),walnut=visualKit.wood(0x795e46),counter=material(0xd4d0c5),steel=material(0x909c9c,.3,.5);
    const record={homeId:home.id,address:home.address+' '+home.street,rooms:['Living room','Kitchen & dining','Guest bedroom','Garage'],fixtures:[]};furnishedInteriors.push(record);
    const front=home.d/2,half=home.w/2;
    const piece=(x,y,z,w,h,d,mat)=>box(root,x,y,z,w,h,d,mat,false);
    function fixture(id,x,z,w,d,y,h,mat){
      const mesh=piece(x,y,z,w,h,d,mat);mesh.name='139 · '+id;
      const collider=solid(home,x,z,w,d,'community-furniture');Object.assign(collider,{houseId:home.id,fixtureId:id,minY:y,maxY:y+h});
      record.fixtures.push({id,...communityPoint(home,x,z),y,w,d,collider});return mesh;
    }
    // Inner plaster faces and full-height room dividers; openings align with
    // the existing front/garage/patio leaves and keep a clear central route.
    lowerWall(root,home,'x',front-.14,-half,half,plaster,[{a:-home.w*.23-3,b:-home.w*.23+3,top:2.85},{a:home.w*.2-.85,b:home.w*.2+.85,top:2.85}]);
    lowerWall(root,home,'x',-front+.14,-half,half,plaster,[{a:home.w*.24-.85,b:home.w*.24+.85,top:2.85}]);
    for(const side of [-1,1])lowerWall(root,home,'z',side*(half-.14),-front+.14,front-.14,plaster);
    lowerWall(root,home,'z',-.2,-front+.25,front-.25,plaster,[{a:-4.2,b:-2.7,top:2.7},{a:2.2,b:3.7,top:2.7}]);
    lowerWall(root,home,'x',1.2,-half+.25,-.2,plaster);
    piece(0,3.13,0,home.w-.5,.025,home.d-.5,plaster);
    // Living room: a complete sofa, coffee table, media console and TV.
    piece(4.8,.302,1.65,3.4,.012,3.3,material(0xb8a58c));
    fixture('sofa',4.8,.05,2.8,1.05,.3,.4,fabric);piece(4.8,.7,-.43,2.8,.66,.16,fabric);
    for(const side of [-1,1]){piece(4.8+side*1.3,.7,.05,.22,.32,1.05,fabric);piece(4.8+side*.67,.7,.07,1.1,.16,.83,linen);}
    fixture('coffee-table',4.8,1.8,1.5,.75,.3,.52,walnut);
    fixture('media-console',4.8,4.3,2.6,.45,.3,.64,walnut);piece(4.8,1.16,4.28,2.05,1.15,.10,dark);piece(4.8,1.23,4.215,1.88,.96,.012,material(0x547278,.6));
    // Rear kitchen and four-place dining table, with separate appliance forms.
    fixture('kitchen-counter',1,-5.77,1.4,.72,.3,.85,walnut);piece(1,1.15,-5.77,1.45,.06,.77,counter);
    fixture('oven-counter',5.7,-5.77,1.45,.72,.3,.85,walnut);piece(5.7,1.15,-5.77,1.5,.06,.77,counter);
    piece(5.7,.46,-5.395,.8,.5,.025,dark);for(const x of [.35,1.65,5.03,6.37])piece(x,.38,-5.39,.04,.67,.025,trim);
    piece(1,1.211,-5.77,.7,.018,.48,steel);piece(1,1.35,-5.96,.055,.3,.055,steel);
    fixture('refrigerator',6.4,-4.65,.8,.9,.3,1.95,trim);piece(6.4,1.36,-4.185,.75,.035,.025,dark);
    fixture('kitchen-island',4.4,-2.8,2.25,1,.3,.85,walnut);piece(4.4,1.15,-2.8,2.35,.06,1.1,counter);
    fixture('dining-table',2.9,-.8,2.2,1.3,.3,.76,walnut);
    for(const [i,[x,z]] of [[2.3,-1.85],[3.5,-1.85],[2.3,.25],[3.5,.25]].entries()){
      fixture('dining-chair-'+(i+1),x,z,.46,.46,.3,.45,walnut);piece(x,.75,z+.18,.46,.54,.08,walnut);
    }
    // Guest bedroom, separate from the garage and public living space.
    fixture('guest-bed',-4.6,-4.6,2.05,2.35,.3,.45,walnut);piece(-4.6,.75,-4.6,2,.2,2.3,linen);piece(-4.6,.95,-4.3,2,.06,1.65,fabric);
    piece(-4.6,.3,-5.83,2.1,1.2,.12,walnut);for(const x of [-5.12,-4.08])piece(x,.96,-5.4,.8,.14,.45,trim);
    fixture('nightstand',-6.25,-4.9,.65,.65,.3,.6,walnut);piece(-6.25,.9,-4.9,.3,.5,.3,linen);
    fixture('dresser',-5,-.2,2.1,.65,.3,.92,walnut);for(const y of [.52,.8,1.08])piece(-5,y,.14,1.95,.025,.025,trim);
    fixture('garage-workbench',-5.6,1.8,2,.65,.3,.9,walnut);piece(-5.6,1.2,1.8,2.06,.06,.72,counter);
    // Trim and framed art finish the inner walls without new textures/lights.
    for(const z of [-1,1]){piece(7.03,.3,z*3.2,.045,.12,5.7,trim);piece(7.02,1.3,z*3.2,.07,.9,1.15,walnut);piece(6.975,1.35,z*3.2,.025,.8,1.02,fabric);}
  }

  for(const home of COMMUNITY_HOMES){
    const {w,d}=home,p=palette[home.palette],root=new THREE.Group();root.position.set(home.x,0,home.z);root.rotation.y=home.heading;root.userData.staticArchitecture=true;root.name='Two-story home '+home.address+' '+home.street;scene.add(root);architectureRoots.push(root);
    const front=d/2,rear=(home.rearZ-home.z)*(home.heading===0?1:-1),frontLot=Math.abs(home.roadZ-home.z)-10.8,doorX=w*.20,garageX=-w*.23,porchX=w*.28;
    // The developed-site lawn already covers every lot; avoid coplanar grass.
    surface(home,0,(rear+frontLot)/2,home.lotWidth-.12,frontLot-rear,.025,grass,'grass',-.055);
    if(home.id!=='maple-grove-1'){
    // Keep the slab below the finished floor: equal .30 m top faces flickered.
    box(root,0,-.055,0,w+.34,.325,d+.34,foundation);box(root,0,3.18,0,w,3.22,d,p.siding);
    lowerWall(root,home,'x',front,-w/2,w/2,p.brick,[{a:garageX-3,b:garageX+3,top:2.85},{a:doorX-.85,b:doorX+.85,top:2.85}]);
    lowerWall(root,home,'x',-front,-w/2,w/2,p.siding,[{a:w*.24-.85,b:w*.24+.85,top:2.85}]);
    for(const side of [-1,1])lowerWall(root,home,'z',side*w/2,-front,front,p.brick);
    surface(home,0,0,w-.22,d-.22,.3,visualKit.wood(0x988160),'wood',.22);
    if(home.id==='maple-grove-20')furnish139(root,home);
    box(root,0,3.04,front+.08,w+.08,.17,.15,trim);box(root,0,6.27,front+.08,w+.16,.13,.15,trim);
    for(const side of [-1,1]){box(root,side*(w/2+.07),.3,front,.13,6.1,.15,trim,false);box(root,side*(w/2+.16),.24,-front+.4,.09,6.1,.09,metal,false);}
    const turn=home.plan===2?Math.PI/2:0;gable(root,0,0,turn?d+1:w+1,turn?w+1:d+1,6.4,home.plan===3?2.45:2.12,p.roof,p.siding,turn);
    if(home.plan===1||home.plan===3)gable(root,home.plan===1?garageX:porchX,front-1.35,home.plan===1?6.7:5.8,4.1,6.38,1.52,p.roof,p.siding);
    for(const [i,x] of [-w*.29,0,w*.29].entries()){windowOn(root,x,4.27,front+.11,home.plan===3?1.45:1.35,1.45,0,i+home.palette);if(home.plan%2===1)for(const s of [-1,1])box(root,x+s*.94,4.17,front+.1,.28,1.65,.09,dark,false);}
    windowOn(root,w*.40,1.12,front+.1,1.05,1.35,0,4);
    for(const side of [-1,1])for(const z of [-d*.27,d*.24])for(const y of [1.2,4.27])windowOn(root,side*(w/2+.08),y,z,1.1,1.38,side*Math.PI/2,home.palette+Math.round(y));
    for(const x of [-w*.27,w*.27]){windowOn(root,x,4.27,-front-.08,1.35,1.45,Math.PI,home.palette+3);if(x<0)windowOn(root,x,1.2,-front-.08,1.45,1.4,Math.PI,home.palette+2);}
    // Both garage bays share one paneled two-car overhead door.
    for(const side of [-1,1]){box(root,garageX+side*3.09,.3,front+.12,.16,2.55,.2,trim,false);box(root,doorX+side*.93,.3,front+.12,.16,2.55,.2,trim,false);}
    box(root,garageX,2.85,front+.12,6.34,.15,.2,trim,false);box(root,doorX,2.85,front+.12,2.02,.15,.2,trim,false);
    doorSystem.add(home,'garage',{x:garageX,z:front+.18,width:5.98,height:2.5,material:p.door});doorSystem.add(home,'front',{x:doorX,z:front+.18,material:p.door});
    surface(home,porchX,front+.87,w*.40,1.65,.3,concrete,'concrete',.14);surface(home,doorX,front+1.94,1.65,.65,.17,concrete,'concrete',.08);surface(home,doorX,front+2.53,1.7,.6,.09,concrete,'concrete',.025);
    for(const x of [w*.08,w*.48]){box(root,x,.3,front+1.42,.18,2.65,.18,trim);solid(home,x,front+1.42,.22,.22,'porch-post');}box(root,porchX,3.02,front+.88,w*.44,.16,2.05,trim);box(root,porchX,3.18,front+.88,w*.45,.12,2.15,p.roof);
    for(const x of [garageX-3.3,doorX+.94]){box(root,x,2.03,front+.19,.2,.42,.18,dark,false);box(root,x,2.1,front+.29,.14,.23,.08,porchLight,false);}
    }else doorSystem.add(home,'garage',{x:garageX,z:front+.18,width:5.98,height:2.5,material:p.door});
    const drive=communityDriveway(home);surface(null,(drive.minX+drive.maxX)/2,(drive.minZ+drive.maxZ)/2,drive.maxX-drive.minX,drive.maxZ-drive.minZ,drive.top,concrete,'concrete',.025);
    for(let localZ=front+3;localZ<Math.abs(home.roadZ-home.z)-7.3;localZ+=3.2)box(root,garageX,.081,localZ,6.5,.003,.018,foundation,false);
    const walkEnd=Math.abs(home.roadZ-home.z)-9.1,walkStart=front+2.7;surface(home,doorX,(walkStart+walkEnd)/2,1.55,walkEnd-walkStart,.085,concrete,'concrete',.025);
    // A rear door, patio and lawn make every backyard a usable separate space.
    if(home.id!=='maple-grove-1'){for(const side of [-1,1])box(root,w*.24+side*.93,.3,-front-.12,.16,2.55,.2,trim,false);box(root,w*.24,2.85,-front-.12,2.02,.15,.2,trim,false);doorSystem.add(home,'rear',{x:w*.24,z:-front-.18,material:p.door});
    }
    const patio=surface(home,w*.2,-front-2.3,5.2,4.2,.085,concrete,'concrete',.025);
    if(home.id!=='maple-grove-1'){box(root,-w/2-1.05,.05,-front+1,1.25,.08,1.3,concrete,false);box(root,-w/2-1.05,.13,-front+1,1.05,.92,1.05,metal);for(let y=.23;y<.95;y+=.13)box(root,-w/2-1.05,y,-front+1.53,.96,.035,.025,dark,false);solid(home,-w/2-1.05,-front+1,1.1,1.1,'air-conditioner');
    const shrubs=material(0x5d7750);for(const x of [-w*.44,w*.46]){box(root,x,.025,front+.8,1.35,.08,.9,mulch,false);for(let i=0;i<2;i++){const p=communityPoint(home,x+(i-.5)*.5,front+.83);if(visualKit.shrub?.(p.x,.1,p.z,{width:.86,height:.66,tint:0x5d7750}))continue;const shrub=new THREE.Mesh(new THREE.SphereGeometry(.42,10,7),shrubs);shrub.position.set(x+(i-.5)*.5,.44,front+.83);shrub.scale.y=.78;root.add(shrub);}}
    }
    const mailboxX=home.lotWidth*.39,mailboxZ=Math.abs(home.roadZ-home.z)-11.2;box(root,mailboxX,.025,mailboxZ,.1,1.05,.1,metal);box(root,mailboxX,1.07,mailboxZ,.42,.3,.58,dark);textPlate(root,String(home.address),mailboxX,1.22,mailboxZ+.301,.38,.16,'#344b43');
    addressPlaque(root,home,doorX-1.6,front+.24);
    if(home.fenced){const fenceMat=home.palette===4?whiteFence:wood,bound=home.lotWidth/2-.4,start=-front+.65,gapFront=-front-.7,gapBack=-front-3.1;
      fence(root,home,-bound,rear,bound,rear,fenceMat);fence(root,home,-bound,rear,-bound,start,fenceMat);fence(root,home,bound,rear,bound,gapBack,fenceMat);fence(root,home,bound,gapFront,bound,start,fenceMat);
      // An open gate leaf rests perpendicular to the side fence; the 2.4 m
      // opening stays clear instead of trapping a character in the backyard.
      box(root,bound-1.05,.1,gapFront,2.1,1.72,.11,fenceMat);solid(home,bound-1.05,gapFront,2.1,.15,'open-gate');const gate=communityPoint(home,bound,(gapFront+gapBack)/2);gateways.push({...gate,homeId:home.id,width:gapFront-gapBack});
    }
    const frontTree=communityPoint(home,home.lotWidth*.36,Math.abs(home.roadZ-home.z)-13.3),backTree=communityPoint(home,-home.lotWidth*.33,rear+3.2);
    scene.add(visualKit.treeModel(frontTree.x,frontTree.z,.55));solid(null,frontTree.x,frontTree.z,.38,.38,'tree');
    if(!home.existing){scene.add(visualKit.treeModel(backTree.x,backTree.z,.62));solid(null,backTree.x,backTree.z,.4,.4,'tree');}
    const houseBlock=solid(home,0,0,w+.4,d+.4,'community-house');houseBlock.vehicleOnly=true;buildings.push({...home,shop:false,height:9.05,residential:true});homes.push({...home,fullAddress:home.address+' '+home.street,driveway:drive,patio,backyard:{minX:home.x-home.lotWidth/2+.4,maxX:home.x+home.lotWidth/2-.4,minZ:Math.min(home.rearZ,home.z-(home.heading===0?1:-1)*(front+.8)),maxZ:Math.max(home.rearZ,home.z-(home.heading===0?1:-1)*(front+.8))}});
  }
  for(const z of [-165,-120,-45])for(const x of [-311.5,-140.5]){box(streetRoot,x,.02,z,.23,.28,.23,foundation);box(streetRoot,x,.3,z,.09,5.7,.09,metal);box(streetRoot,x,5.96,z,1.35,.12,.4,metal);box(streetRoot,x,5.91,z,1.12,.05,.32,porchLight,false);visualKit.atmosphere.addStreetLight({x,y:5.91,z,groundY:.06});solid(null,x,z,.25,.25,'streetlight');}
  for(const z of [-140,-18]){const monument=new THREE.Group();monument.position.set(-135.8,0,z);monument.rotation.y=Math.PI/2;monument.userData.staticArchitecture=true;scene.add(monument);architectureRoots.push(monument);box(monument,0,.02,0,8.4,.38,1.3,foundation);box(monument,0,.4,0,7.8,1.48,.85,visualKit.brick(0x8c705c));box(monument,0,1.88,0,8.2,.14,1.05,trim);textPlate(monument,'MAPLE GROVE',0,1.2,.44,6.9,.8,'#2e473e');solid(null,-135.8,z,1.3,8.4,'community-monument');}
  for(const [z,name] of [[-180,'MAPLE GROVE LN'],[-90,'CEDAR RUN'],[0,'WILLOW WAY']]){const x=-139.3,zz=z-11.8;box(streetRoot,x,.02,zz,.07,2.95,.07,metal);textPlate(streetRoot,name,x,2.77,zz+.04,3.4,.47);}
  // Preserve exact camera/shelter bounds before replacing the box meshes.
  // Instancing retains transforms, materials and shadows without expanding every
  // cube into a separate flat vertex buffer during the city-wide merge.
  scene.updateMatrixWorld(true);
  const batches=new Map(),size=new THREE.Vector3();
  unit.computeBoundingBox();
  for(const root of architectureRoots)root.traverse(mesh=>{
    if(!mesh.isMesh||mesh.geometry!==unit)return;
    const key=mesh.material.uuid+':'+mesh.castShadow;
    if(!batches.has(key))batches.set(key,{material:mesh.material,shadow:mesh.castShadow,sources:[]});
    batches.get(key).sources.push(mesh);
  });
  const architectureBatches=[];
  for(const batch of batches.values()){
    const mesh=new THREE.InstancedMesh(unit,batch.material,batch.sources.length),boxes=[];
    mesh.name='Maple Grove instanced architecture';mesh.castShadow=batch.shadow;mesh.receiveShadow=true;
    batch.sources.forEach((source,i)=>{
      mesh.setMatrixAt(i,source.matrixWorld);
      const bounds=unit.boundingBox.clone().applyMatrix4(source.matrixWorld);bounds.getSize(size);
      if(size.y>.03&&size.x>0&&size.z>0&&Math.max(size.x,size.z)<=300)boxes.push({minX:bounds.min.x,maxX:bounds.max.x,minY:bounds.min.y,maxY:bounds.max.y,minZ:bounds.min.z,maxZ:bounds.max.z});
      source.removeFromParent();
    });
    mesh.userData.architectureBoxes=boxes;mesh.instanceMatrix.needsUpdate=true;mesh.computeBoundingSphere();scene.add(mesh);architectureBatches.push(mesh);
  }
  addressMap.needsUpdate=true;doorSystem.finalize();
  const sofaSets=createSofaSets({scene,homes:COMMUNITY_HOMES,solid});
  function interior(p){const home=homes.find(h=>h.id!=='maple-grove-1'&&Math.abs(p.x-h.x)<h.w/2-.15&&Math.abs(p.z-h.z)<h.d/2-.15);return home?{minX:home.x-home.w/2+.22,maxX:home.x+home.w/2-.22,minZ:home.z-home.d/2+.22,maxZ:home.z+home.d/2-.22,ceiling:3.18}:null;}
  return {homes,roads:COMMUNITY_ROADS,gateways,landscapePockets,architectureBatches,addressPlaques,furnishedInteriors,doors:doorSystem.doors,nearestDoor:doorSystem.nearest,actDoor:doorSystem.act,update:(dt,p)=>{doorSystem.update(dt,p);sofaSets.update(p);},sofaSets,interior,fenced:homes.filter(h=>h.fenced).length};
}
