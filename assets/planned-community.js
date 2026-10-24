import * as THREE from 'three';
import {createSofaSets,sofaSetHomes,sofaSetPlacement} from './sofa-sets.js';
import {createInteriorSurfaces,createInteriorProps,createRoomLights,interiorScheme} from './home-interiors.js';
import {MAPLE_STREETS,MAPLE_GROVE,mapleOnRoad,COMMUNITY_ROADS,COMMUNITY_HOMES,communityPoint,communityDriveway,communityRoadRect,communityOnRoad,worldDrivable,withinRect} from './world-rules.js';
import {createResidentialDoors} from './residential-doors.js';

// Metre-scale homes, private lots and streets share the same layout as navigation
// and vehicle collision. Static detail is merged by the existing city batcher.
export function createPlannedCommunity({scene,visualKit,obstacles,buildings,groundSurfaces,mobile=false}){
  const streetRoot=new THREE.Group();streetRoot.userData.staticArchitecture=true;streetRoot.name='Maple Grove streets and landscaping';scene.add(streetRoot);
  const unit=new THREE.BoxGeometry(1,1,1),materialCache=new Map(),grassGeometries=new Map(),homes=[],gateways=[],architectureRoots=[streetRoot];
  const doorSystem=createResidentialDoors({scene,obstacles}),addressPlaques=[],furnishedInteriors=[];
  const inside=createInteriorSurfaces();inside.ceiling=inside.materials.ceiling;inside.trim=inside.materials.trim;inside.lamp=inside.materials.lamp;
  const props=createInteriorProps({scene,solid:(...a)=>solid(...a)}),roomLights=createRoomLights(scene,mobile?0:2),lights139={},lightSpots=new Map();
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
  // A wall from y0 to y1 with door/window openings ({a,b,bottom,top}). Colliders
  // cover the walkable height of that storey. Partitions and upstairs walls carry
  // the house id so they only block on their own floor; outer ground walls stay
  // plain obstacles, which the city navigator routes around.
  function lowerWall(root,home,axis,fixed,a,b,mat,openings=[],y0=.3,y1=3.18,partition=false){const xs=[a,b,...openings.flatMap(o=>[o.a,o.b])].sort((x,y)=>x-y),ys=[...new Set([y0,y1,...openings.flatMap(o=>[o.top,o.bottom??y0])])].filter(v=>v>=y0&&v<=y1).sort((x,y)=>x-y);
    for(let i=1;i<xs.length;i++)for(let j=1;j<ys.length;j++){const lo=xs[i-1],hi=xs[i],y=ys[j-1],top=ys[j],mid=(lo+hi)/2;if(hi-lo<.001||top-y<.001||openings.some(o=>mid>o.a&&mid<o.b&&y<o.top&&y>=(o.bottom??y0)))continue;
      const x=axis==='x'?mid:fixed,z=axis==='x'?fixed:mid,w=axis==='x'?hi-lo:.22,d=axis==='x'?.22:hi-lo;
      box(root,x,y,z,w,top-y,d,mat);if(y<y0+1.55){const o=Object.assign(solid(home,x,z,w,d,'community-wall'),{minY:y,maxY:top});if(partition||y0>1)o.houseId=home.id;}
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
  // A see-through window for furnished homes: reveal, glass, mullions and sills.
  function realWindow(root,x,bottom,z,width,height,yaw,floor=.3){const g=new THREE.Group();g.position.set(x,0,z);g.rotation.y=yaw;root.add(g);const top=bottom+height,f=inside.materials.trim;
    box(g,0,bottom-.04,-.07,width,.04,.36,f,false);box(g,0,top,-.07,width,.04,.36,f,false);for(const s of [-1,1])box(g,s*(width/2-.02),bottom,-.07,.04,height,.36,f,false);
    box(g,0,bottom,0,width-.04,height,.012,inside.materials.glass,false);box(g,0,bottom,.012,.04,height,.03,f,false);box(g,0,bottom+height*.5,.012,width-.04,.04,.03,f,false);
    box(g,0,bottom-.06,-.3,width+.12,.035,.12,f,false);box(g,0,bottom-.12,.14,width+.3,.06,.16,trim,false);for(const s of [-1,1])box(g,s*(width/2+.06),bottom-.1,.12,.1,height+.2,.04,trim,false);box(g,0,top,.12,width+.22,.1,.04,trim,false);
    // Linen curtains hang inside, pulled to each side.
    for(const s of [-1,1])box(g,s*(width/2+.17),floor+.03,-.33,.26,top+.25-floor,.05,inside.materials.curtain,true);box(g,0,top+.22,-.33,width+.9,.03,.03,inside.materials.brass,false);}
  function fence(root,home,x1,z1,x2,z2,mat){const distance=Math.hypot(x2-x1,z2-z1),count=Math.ceil(distance/1.8);for(let i=0;i<count;i++){const t=(i+.5)/count,x=x1+(x2-x1)*t,z=z1+(z2-z1)*t,horizontal=z1===z2,len=distance/count;box(root,x,.1,z,horizontal?len:.11,1.72,horizontal?.11:len,mat);box(root,x,1.82,z,horizontal?len+.035:.15,.08,horizontal?.15:len+.035,mat);for(const y of [.43,1.38])box(root,x,y,z+.07,horizontal?len:.16,.1,horizontal?.08:len,mat,false);}
    for(let i=0;i<=count;i++){const t=i/count,x=x1+(x2-x1)*t,z=z1+(z2-z1)*t;box(root,x,.02,z,.19,1.96,.19,mat);box(root,x,1.98,z,.23,.06,.23,mat,false);}solid(home,(x1+x2)/2,(z1+z2)/2,Math.abs(x2-x1)+.2,Math.abs(z2-z1)+.2,'backyard-fence');}

  // Interior finishes shared by every enterable home: scanned floor, plaster walls,
  // ceilings, baseboards and a flush ceiling light per room.
  function lineShell(root,home,plaster,windows={front:[],left:[],right:[]}){
    const front=home.d/2,half=home.w/2;
    lowerWall(root,home,'x',front-.14,-half,half,plaster,[{a:-home.w*.23-3,b:-home.w*.23+3,top:2.85},{a:home.w*.2-.85,b:home.w*.2+.85,top:2.85},...windows.front]);
    lowerWall(root,home,'x',-front+.14,-half,half,plaster,[{a:home.w*.24-.85,b:home.w*.24+.85,top:2.85}]);
    for(const side of [-1,1])lowerWall(root,home,'z',side*(half-.14),-front+.14,front-.14,plaster,side<0?windows.left:windows.right);
    aroundOpening(root,CEIL1,.025,inside.ceiling,home,stairsOf(home),.25);
    // Baseboards on the four inner faces, broken at the door openings.
    const trim=inside.trim,run=(x1,z1,x2,z2)=>{const w=Math.abs(x2-x1)||.018,d=Math.abs(z2-z1)||.018;if(w+d>.05)box(root,(x1+x2)/2,.3,(z1+z2)/2,w,.1,d,trim,false);};
    const fz=front-.26,rz=-front+.26,sx=half-.26,doors=[[-home.w*.23-3,-home.w*.23+3],[home.w*.2-.85,home.w*.2+.85]];
    let x=-sx;for(const [a,b] of doors){run(x,fz,a,fz);x=b;}run(x,fz,sx,fz);
    run(-sx,rz,home.w*.24-.85,rz);run(home.w*.24+.85,rz,sx,rz);for(const side of [-1,1])run(side*sx,rz,side*sx,fz);
  }
  // Paint, panel moulding, crown and prints. `face` is the wall's inner surface,
  // `inward` points into the room (+1/-1), holes are door/window openings.
  function wallCells(a,b,y0,y1,holes){const xs=[...new Set([a,b,...holes.flatMap(h=>[h.a,h.b]).filter(v=>v>a&&v<b)])].sort((p,q)=>p-q),ys=[...new Set([y0,y1,...holes.flatMap(h=>[h.bottom??.3,h.top]).filter(v=>v>y0&&v<y1)])].sort((p,q)=>p-q),cells=[];
    for(let i=1;i<xs.length;i++)for(let j=1;j<ys.length;j++){const lo=xs[i-1],hi=xs[i],y=ys[j-1],top=ys[j],mid=(lo+hi)/2,my=(y+top)/2;if(!holes.some(h=>mid>h.a&&mid<h.b&&my>(h.bottom??.3)&&my<h.top))cells.push([lo,hi,y,top]);}return cells;}
  function along(root,axis,face,inward,lo,hi,y,h,depth,mat,shadow=false){const c=(lo+hi)/2,o=face+inward*depth/2;return axis==='x'?box(root,c,y,o,hi-lo,h,depth,mat,shadow):box(root,o,y,c,depth,h,hi-lo,mat,shadow);}
  function paintWall(root,axis,face,inward,a,b,mat,holes=[],y0=.3,y1=3.11){if(y0>1&&y1===3.11)y1=CEIL2-.02;for(const [lo,hi,y,top] of wallCells(a,b,y0,y1,holes))along(root,axis,face,inward,lo,hi,y,top-y,.012,mat);}
  function wainscot(root,axis,face,inward,a,b,mat,holes=[],fy=0){
    paintWall(root,axis,face+inward*.012,inward,a,b,mat,holes,.4+fy,.93+fy);
    for(const [lo,hi] of wallCells(a,b,.4+fy,.93+fy,holes).map(c=>[c[0],c[1]]).filter((c,i,l)=>l.findIndex(d=>d[0]===c[0])===i)){
      along(root,axis,face+inward*.02,inward,lo,hi,.92+fy,.05,.035,inside.trim);
      const n=Math.max(1,Math.round((hi-lo)/.95)),w=(hi-lo)/n;for(let i=0;i<n;i++){const l=lo+i*w+.08,r=lo+(i+1)*w-.08;if(r-l<.2)continue;const m=face+inward*.024;along(root,axis,m,inward,l,r,.48+fy,.025,.012,inside.trim);along(root,axis,m,inward,l,r,.8+fy,.025,.012,inside.trim);along(root,axis,m,inward,l,l+.025,.48+fy,.345,.012,inside.trim);along(root,axis,m,inward,r-.025,r,.48+fy,.345,.012,inside.trim);}
    }
  }
  function print(root,axis,face,inward,center,y,w,h,index,frame=inside.materials.walnut){along(root,axis,face,inward,center-w/2,center+w/2,y-h/2,h,.035,frame);along(root,axis,face+inward*.035,inward,center-w/2+.05,center+w/2-.05,y-h/2+.05,h-.1,.006,inside.artwork(index));}
  function crown(root,home,y=3.04,base=null){const f=home.d/2-.25,x=home.w/2-.25;for(const z of [-f,f])along(root,'x',z,z>0?-1:1,-x,x,y,.07,.05,inside.trim);for(const s of [-1,1])along(root,'z',s*x,-s,-f,f,y,.07,.05,inside.trim);
    if(base!==null){for(const z of [-f,f])along(root,'x',z,z>0?-1:1,-x,x,base,.1,.018,inside.trim);for(const s of [-1,1])along(root,'z',s*x,-s,-f,f,base,.1,.018,inside.trim);}}
  function ceilingLight(root,x,z,y=CEIL1){box(root,x,y-.045,z,.5,.045,.5,inside.trim,false);box(root,x,y-.055,z,.42,.012,.42,inside.lamp,false);return {x,z,y:y-.1};}

  // ---- Stairs and the upper storey (every enterable home) -------------------
  const GROUND=.3,UPPER=3.45,CEIL1=3.13,CEIL2=6.28;
  // A straight flight against the left wall, rising from the rear toward the front.
  function stairsOf(home){const x0=-home.w/2+.25,z0=-home.d/2+.9;return {x0,x1:x0+1.15,z0,z1:z0+4.6,steps:14};}
  // A slab or ceiling between the outer walls with a hole over the stairs.
  function aroundOpening(root,y,h,mat,home,S,inset){const X0=-home.w/2+inset,X1=home.w/2-inset,Z0=-home.d/2+inset,Z1=home.d/2-inset;
    box(root,(S.x1+X1)/2,y,0,X1-S.x1,h,Z1-Z0,mat,false);box(root,(X0+S.x1)/2,y,(S.z1+Z1)/2,S.x1-X0,h,Z1-S.z1,mat,false);
    if(S.z0-Z0>.01)box(root,(X0+S.x1)/2,y,(Z0+S.z0)/2,S.x1-X0,h,S.z0-Z0,mat,false);if(S.x0-X0>.01)box(root,(X0+S.x0)/2,y,(S.z0+S.z1)/2,S.x0-X0,h,S.z1-S.z0,mat,false);}
  function buildStairs(root,home,S,wallMat){const run=(S.z1-S.z0)/S.steps,rise=(UPPER-GROUND)/S.steps,cx=(S.x0+S.x1)/2,w=S.x1-S.x0,m=inside.materials;
    for(let i=0;i<S.steps;i++){const z=S.z0+(i+.5)*run,top=GROUND+(i+1)*rise;box(root,cx,GROUND,z,w,top-GROUND-.03,run,m.upper,false);box(root,cx,top-.03,z+.01,w+.02,.03,run+.02,m.oak,false);}
    // The flight is walled on the room side above its first metre; the foot is open.
    const entry=S.z0+.9;lowerWall(root,home,'z',S.x1+.11,entry,S.z1+.22,wallMat,[],GROUND,CEIL1,true);lowerWall(root,home,'x',S.z1+.11,S.x0,S.x1,wallMat,[],GROUND,CEIL1,true);
    const rail=box(root,S.x1-.04,0,(S.z0+S.z1)/2,.05,.05,Math.hypot(S.z1-S.z0,UPPER-GROUND),m.walnut,false);rail.position.y=(GROUND+UPPER)/2+.9;rail.rotation.x=-Math.atan2(UPPER-GROUND,S.z1-S.z0);
    for(const z of [S.z0+.05,entry-.05]){box(root,S.x1-.04,GROUND,z,.08,1.0+(z-S.z0)/run*rise,.08,m.walnut,false);}}

  // Simple joinery for rooms that do not use a streamed model. Colliders carry the
  // floor height, so upstairs furniture never blocks the ground floor and vice versa.
  function furn(home,id,x,z,w,d,y,h,record){const c=solid(home,x,z,w,d,'community-furniture');Object.assign(c,{houseId:home.id,fixtureId:id,minY:y,maxY:y+h});record?.fixtures.push({id,...communityPoint(home,x,z),y,w,d,collider:c});return c;}
  function bedBox(root,home,id,x,z,length,width,floor,dir,linen,throwMat,record){ // headboard on the -dir side along x
    const m=inside.materials,cx=x,hx=x-dir*length/2;box(root,cx,floor,z,length,.32,width,m.walnut,false);box(root,cx+dir*.04,floor+.32,z,length-.12,.2,width-.06,m.upper,false);
    box(root,cx+dir*.25,floor+.52,z,length-.6,.07,width,linen,false);box(root,cx+dir*(length*.32),floor+.53,z,length*.22,.075,width+.02,throwMat,false);
    for(const s of width>1.2?[-1,1]:[0])box(root,hx+dir*.32,floor+.52,z+s*width*.24,.32,.16,width>1.2?width*.42:width*.8,m.upper,false);
    box(root,hx-dir*.03,floor,z,.08,1.15,width+.1,throwMat,false);furn(home,id,cx,z,length+.1,width+.1,floor,.75,record);}
  function nightstand(root,home,id,x,z,floor,record){const m=inside.materials;box(root,x,floor,z,.48,.55,.42,m.oak,false);box(root,x,floor+.55,z,.18,.04,.18,m.brass,false);box(root,x,floor+.59,z,.04,.3,.04,m.brass,false);box(root,x,floor+.89,z,.3,.24,.3,inside.lamp,false);furn(home,id,x,z,.5,.44,floor,.62,record);}
  function rug(root,x,z,w,d,floor,mat){box(root,x,floor+.001,z,w,.008,d,mat,false);}
  function desk(root,home,id,x,z,w,d,floor,record){const m=inside.materials;box(root,x,floor+.72,z,w,.04,d,m.oak,false);for(const sx of [-1,1])box(root,x+sx*(w/2-.04),floor,z,.04,.72,d-.04,m.black,false);box(root,x,floor+.76,z-d/2+.12,.5,.32,.02,m.black,false);furn(home,id,x,z,w,d,floor,.76,record);}
  // Kitchen run along the rear wall: shaker base cabinets, quartz top, tiled splash, uppers.
  function baseRun(root,home,id,x0,x1,record){const m=inside.materials,F=home.d/2-.25,rear=-F,w=x1-x0,cx=(x0+x1)/2,z=rear+.31;
    furn(home,id,cx,z,w,.62,.3,.88,record);box(root,cx,.3,z+.03,w-.04,.1,.56,m.black,false);box(root,cx,.4,z,w,.78,.6,m.cabinet,false);box(root,cx,1.18,z+.02,w+.02,.04,.66,m.quartz,false);
    const doors=Math.max(1,Math.round(w/.6));for(let i=0;i<doors;i++){const dx=x0+(i+.5)*w/doors;box(root,dx,.46,z+.305,w/doors-.04,.66,.02,m.cabinet,false);box(root,dx,.52,z+.318,w/doors-.18,.54,.012,m.upper,false);box(root,dx+(i%2?-.1:.1)*w/doors*2.4,1.0,z+.33,.012,.12,.02,m.brass,false);}
    box(root,cx,1.22,rear+.01,w,.6,.02,m.tile,false);box(root,cx,1.82,rear+.18,w,.72,.34,m.upper,false);for(let i=0;i<doors;i++)box(root,x0+(i+.5)*w/doors,1.84,rear+.355,w/doors-.04,.68,.012,m.trim,false);}
  function sink(root,x,rear){const m=inside.materials;box(root,x,1.205,rear+.33,.62,.02,.42,m.steel,false);box(root,x,1.22,rear+.1,.04,.32,.04,m.steel,false);box(root,x,1.5,rear+.18,.04,.04,.24,m.steel,false);}
  function range(root,x,rear){const m=inside.materials;box(root,x,1.2,rear+.33,.7,.02,.55,m.black,false);for(const [dx,dz] of [[-.17,-.12],[.17,-.12],[-.17,.14],[.17,.14]])box(root,x+dx,1.222,rear+.33+dz,.18,.006,.18,m.steel,false);box(root,x,.45,rear+.615,.62,.42,.02,m.black,false);box(root,x,.83,rear+.64,.5,.025,.03,m.steel,false);box(root,x,2.02,rear+.24,.76,.18,.46,m.steel,false);}
  function fridge(root,home,id,x,rear,record){const m=inside.materials;box(root,x,.3,rear+.42,.85,2.0,.8,m.steel,false);furn(home,id,x,rear+.42,.85,.8,.3,2.0,record);box(root,x,1.3,rear+.825,.84,.012,.02,m.black,false);for(const dx of [-.33,.33])box(root,x+dx,.95,rear+.85,.025,.75,.03,m.black,false);}
  function simpleChair(root,home,id,x,z,face,record,floor=GROUND){const m=inside.materials;box(root,x,floor,z,.44,.46,.44,m.oak,false);box(root,x,floor+.46,z,.44,.04,.44,m.fabric,false);box(root,x,floor+.46,z-face*.2,.44,.5,.04,m.oak,false);furn(home,id,x,z,.44,.44,floor,.5,record);}

  // The upper storey: outer walls, slab and ceiling, a hall at the stair head, a main
  // bedroom, two more bedrooms and a bathroom, painted, trimmed and lit.
  function buildUpper(root,home,p,scheme,glz,record,rich){
    const w=home.w,d=home.d,front=d/2,half=w/2,F=front-.25,R=half-.25,S=stairsOf(home),m=inside.materials,paint=inside.paint(scheme.walls),U=UPPER;
    lowerWall(root,home,'x',front,-half,half,p.siding,glz.upFront,3.18,6.4);lowerWall(root,home,'x',-front,-half,half,p.siding,glz.upRear,3.18,6.4);
    for(const side of [-1,1])lowerWall(root,home,'z',side*half,-front,front,p.siding,side<0?glz.upLeft:glz.upRight,3.18,6.4);
    box(root,0,CEIL2,0,w,.12,d,inside.ceiling,false);aroundOpening(root,3.18,U-3.18,m.floor,home,S,.11);
    lowerWall(root,home,'x',front-.14,-half,half,paint,glz.upFront,U,CEIL2,true);lowerWall(root,home,'x',-front+.14,-half,half,paint,glz.upRear,U,CEIL2,true);
    for(const side of [-1,1])lowerWall(root,home,'z',side*(half-.14),-front+.14,front-.14,paint,side<0?glz.upLeft:glz.upRight,U,CEIL2,true);
    const hallS=S.z1,hallN=S.z1+1.8,xM=Math.max(w*.06,.8),xW=S.x1+.11,xB=xW+3.4,xO=xB+3.6,door=(c)=>({a:c-.7,b:c+.7,top:U+2.2});
    lowerWall(root,home,'z',xW,-front+.25,hallS,paint,[],U,CEIL2,true);lowerWall(root,home,'z',xB,-front+.25,hallS,paint,[],U,CEIL2,true);
    lowerWall(root,home,'z',xO,-front+.25,hallS,paint,[],U,CEIL2,true);
    lowerWall(root,home,'x',hallS,xW,half-.25,paint,[door(xW+1.0),door(xB+1.1),door(xO+1.0)],U,CEIL2,true);
    lowerWall(root,home,'x',hallN,-half+.25,half-.25,paint,[door(xM-1.2),door(xM+1.2)],U,CEIL2,true);lowerWall(root,home,'z',xM,hallN,front-.25,paint,[],U,CEIL2,true);
    crown(root,home,CEIL2-.09,U);
    // Main bedroom (front right): accent wall with panel moulding behind the bed.
    const mz=(hallN+F)/2,accent=inside.paint(scheme.bedAccent);paintWall(root,'z',xM+.11,1,hallN+.11,F,accent,[],U);wainscot(root,'z',xM+.11+.012,1,hallN+.11,F,accent,[],U-.3);
    if(rich)modelAt(home,'main-bed','bedroom',{x:xM+.11+1.29+.03,z:mz+.85,yaw:-Math.PI/2,y:U-.3},record);
    else{bedBox(root,home,'main-bed',xM+.11+1.12,mz,2.1,1.65,U,1,m.upper,inside.fabric(scheme.bedAccent),record);for(const s of [-1,1])nightstand(root,home,'main-nightstand-'+(s<0?'l':'r'),xM+.11+.3,mz+s*1.15,U,record);}
    rug(root,xM+2.2,mz,2.6,2.2,U,inside.fabric(scheme.walls));print(root,'z',xM+.11+.03,1,mz,U+1.75,1.2,.7,scheme.art[0]+1,m.black);
    // Second bedroom (rear right): single bed on the outer wall, a dresser and a rug.
    const bz=(-F+hallS)/2;bedBox(root,home,'second-bed',R-1.02,bz+.4,2.0,1.0,U,-1,m.upper,inside.fabric(scheme.accent),record);rug(root,(xO+R)/2,bz,1.8,1.4,U,inside.fabric(scheme.bedroom));
    box(root,xO+.11+.25,U,bz-.2,.45,.95,1.2,m.oak,false);for(const y of [.2,.5,.8])box(root,xO+.11+.48,U+y,bz-.2,.012,.02,1.1,m.brass,false);furn(home,'second-dresser',xO+.36,bz-.2,.5,1.2,U,.95,record);
    // Office between the bathroom and second bedroom: desk under the window, bookshelf.
    desk(root,home,'office-desk',(xB+xO)/2,-F+.33,1.4,.6,U,record);box(root,xO-.11-.17,U,(-F+hallS)/2+.5,.32,1.9,1.1,m.walnut,false);for(const y of [.45,.85,1.25,1.65])box(root,xO-.11-.17,U+y,(-F+hallS)/2+.5,.3,.03,1.06,m.oak,false);furn(home,'office-shelf',xO-.28,(-F+hallS)/2+.5,.34,1.1,U,1.9,record);
    simpleChair(root,home,'office-chair',(xB+xO)/2,-F+1.0,-1,record,U);
    // Bathroom (rear centre): tub, vanity with mirror, toilet, tiled walls to 1.2 m.
    const bx0=xW+.11,bx1=xB-.11;paintWall(root,'z',bx0,1,-F,hallS-.11,m.tile,[],U,U+1.2);paintWall(root,'z',bx1,-1,-F,hallS-.11,m.tile,[],U,U+1.2);paintWall(root,'x',hallS-.11,-1,bx0,bx1,m.tile,[door(xW+1.0)],U,U+1.2);box(root,bx0+.85,U,-F+.38,1.7,.55,.75,m.tile,false);box(root,bx0+.85,U+.55,-F+.38,1.6,.02,.65,m.steel,false);furn(home,'bath-tub',bx0+.85,-F+.38,1.7,.75,U,.55,record);
    box(root,bx0+.85,U,-F+.012,1.75,1.9,.012,m.tile,false);box(root,bx1-.3,U,hallS-1.2,.55,.85,.9,m.cabinet,false);box(root,bx1-.3,U+.85,hallS-1.2,.58,.04,.94,m.quartz,false);box(root,bx1-.02,U+1.1,hallS-1.2,.02,.8,.7,m.steel,false);furn(home,'bath-vanity',bx1-.3,hallS-1.2,.55,.9,U,.9,record);
    box(root,bx1-.3,U,-F+1.4,.4,.42,.55,m.upper,false);box(root,bx1-.12,U+.42,-F+1.4,.18,.35,.5,m.upper,false);furn(home,'bath-toilet',bx1-.3,-F+1.4,.42,.55,U,.75,record);
    // Third bedroom (front left): double bed on the outer wall.
    const tz=(hallN+F)/2;bedBox(root,home,'third-bed',-R+1.07,tz,2.0,1.4,U,1,m.upper,inside.fabric(scheme.bedroom),record);nightstand(root,home,'third-nightstand',-R+.3,tz+1.0,U,record);rug(root,-R+2.2,tz,2.0,1.8,U,inside.fabric(scheme.accent));
    // Hall runner and a print at the stair head.
    rug(root,(S.x0+xB)/2+1.2,(hallS+hallN)/2,3.6,.8,U,inside.fabric(scheme.accent));print(root,'x',hallN-.11,-1,(xM-1.2+S.x1)/2,U+1.6,.6,.8,scheme.art[1]+2);
    return [ceilingLight(root,xM+2.2,mz,CEIL2),ceilingLight(root,(xO+R)/2,bz,CEIL2),ceilingLight(root,(xB+xO)/2,bz,CEIL2),ceilingLight(root,(bx0+bx1)/2,(-F+hallS)/2,CEIL2),ceilingLight(root,-R+2,tz,CEIL2),ceilingLight(root,(S.x0+xB)/2,(hallS+hallN)/2,CEIL2)];
  }
  function modelAt(home,id,kind,place,record){const e=props.add(home,kind,place,{name:id});for(const c of e.colliders){if(place.y){c.minY+=place.y;c.maxY+=place.y;}record?.fixtures.push({id:c.fixtureId,x:(c.minX+c.maxX)/2,z:(c.minZ+c.maxZ)/2,y:c.minY,w:c.maxX-c.minX,d:c.maxZ-c.minZ,collider:c});}return e;}


  function furnish139(root,home,glazing){
    // 139 Willow Way: an open living, kitchen and dining space, a guest bedroom and a
    // garage. Owner-supplied models (sofa set, bed set, accent cabinet) plus CC0
    // dining chairs and a plant stream in later; boxes here are kitchen joinery.
    const m=inside.materials,piece=(x,y,z,w,h,d,mat)=>box(root,x,y,z,w,h,d,mat,false);
    const record={homeId:home.id,address:home.address+' '+home.street,rooms:['Living room','Kitchen & dining','Study','Garage','Main bedroom','Second bedroom','Third bedroom','Bathroom'],fixtures:[]};furnishedInteriors.push(record);
    const front=home.d/2,half=home.w/2,rear=-front+.25;
    function fixture(id,x,z,w,d,y,h,mat){
      const mesh=mat?piece(x,y,z,w,h,d,mat):null;if(mesh)mesh.name='139 · '+id;
      const collider=solid(home,x,z,w,d,'community-furniture');Object.assign(collider,{houseId:home.id,fixtureId:id,minY:y,maxY:y+h});
      record.fixtures.push({id,...communityPoint(home,x,z),y,w,d,collider});return mesh;
    }
    const model=(id,kind,place)=>{const e=props.add(home,kind,place,{name:id});for(const c of e.colliders)record.fixtures.push({id:c.fixtureId,x:(c.minX+c.maxX)/2,z:(c.minZ+c.maxZ)/2,y:c.minY,w:c.maxX-c.minX,d:c.maxZ-c.minZ,collider:c});return e;};
    lineShell(root,home,inside.paint(interiorScheme(home).walls),glazing);
    // Room dividers: bedroom/garage wall and the hall partition, with door openings.
    lowerWall(root,home,'z',-.2,-front+.25,front-.25,m.plaster,[{a:-4.2,b:-2.7,top:2.7},{a:2.2,b:3.7,top:2.7}]);
    lowerWall(root,home,'x',.8,-half+.25,-.2,m.plaster);
    // Living room: the owner's sectional set (sofa-sets.js) faces a media cabinet and TV.
    const set=sofaSetPlacement(home),tvX=Math.max(set.x-.14,home.w*.2+.85+.55);
    model('media-console','cabinet',{x:tvX,z:front-.25-.21,yaw:0});
    piece(tvX,1.2,front-.29,1.32,.76,.05,m.black);piece(tvX,1.225,front-.32,1.26,.71,.012,m.screen);
    model('living-plant','plant',{x:half-.6,z:front-.7,yaw:Math.PI});
    // Kitchen along the rear wall: painted base cabinets with shaker doors, quartz
    // worktop, tiled splash, white uppers, sink, range and hood, and a fridge.
    function baseRun(id,x0,x1){const w=x1-x0,cx=(x0+x1)/2,z=rear+.31;
      fixture(id,cx,z,w,.62,.3,.88,null);piece(cx,.3,z+.03,w-.04,.1,.56,m.black);piece(cx,.4,z,w,.78,.6,m.cabinet);piece(cx,1.18,z+.02,w+.02,.04,.66,m.quartz);
      const doors=Math.max(1,Math.round(w/.6));for(let i=0;i<doors;i++){const dx=x0+(i+.5)*w/doors;piece(dx,.46,z+.305,w/doors-.04,.66,.02,m.cabinet);piece(dx,.52,z+.318,w/doors-.18,.54,.012,m.upper);piece(dx+(i%2?-.1:.1)*w/doors*2.4,1.0,z+.33,.012,.12,.02,m.brass);}
      piece(cx,1.22,rear+.01,w,.6,.02,m.tile);piece(cx,1.82,rear+.18,w,.72,.34,m.upper);for(let i=0;i<doors;i++)piece(x0+(i+.5)*w/doors,1.84,rear+.355,w/doors-.04,.68,.012,m.trim);}
    baseRun('kitchen-counter',.3,2.0);baseRun('oven-counter',4.45,5.95);
    piece(1.15,1.205,rear+.33,.62,.02,.42,m.steel);piece(1.15,1.22,rear+.1,.04,.32,.04,m.steel);piece(1.15,1.5,rear+.18,.04,.04,.24,m.steel);
    piece(5.2,1.2,rear+.33,.7,.02,.55,m.black);for(const [dx,dz] of [[-.17,-.12],[.17,-.12],[-.17,.14],[.17,.14]])piece(5.2+dx,1.222,rear+.33+dz,.18,.006,.18,m.steel);
    piece(5.2,.45,rear+.615,.62,.42,.02,m.black);piece(5.2,.83,rear+.64,.5,.025,.03,m.steel);piece(5.2,2.02,rear+.24,.76,.18,.46,m.steel);
    fixture('refrigerator',6.55,rear+.42,.85,.8,.3,2.0,m.steel);piece(6.55,1.3,rear+.825,.84,.012,.02,m.black);for(const x of [6.22,6.88])piece(x,.95,rear+.85,.025,.75,.03,m.black);
    // Island with an overhang and three stools.
    fixture('kitchen-island',4.4,-2.6,2.2,.95,.3,.9,null);piece(4.4,.3,-2.6,2.1,.86,.85,m.cabinet);piece(4.4,1.16,-2.55,2.4,.05,1.15,m.quartz);
    for(const x of [3.7,4.4,5.1]){piece(x,.3,-1.75,.05,.66,.05,m.black);piece(x,.96,-1.75,.4,.05,.4,m.oak);fixture('stool-'+x,x,-1.75,.42,.42,.3,.71,null);}
    for(const x of [3.85,4.95]){piece(x,1.95,-2.55,.012,1.1,.012,m.black);piece(x,1.78,-2.55,.3,.2,.3,m.black);piece(x,1.77,-2.55,.22,.012,.22,inside.lamp);}
    // Dining: a solid oak table with tapered legs and four CC0 chairs.
    fixture('dining-table',2.7,-.75,1.6,1,.3,.76,null);piece(2.7,1.02,-.75,1.7,.05,1.05,m.oak);for(const sx of [-1,1])for(const sz of [-1,1])piece(2.7+sx*.72,.3,-.75+sz*.42,.07,.72,.07,m.oak);
    for(const [i,[x,z,yaw]] of [[2.3,-1.55,0],[3.1,-1.55,0],[2.3,.05,Math.PI],[3.1,.05,Math.PI]].entries())model('dining-chair-'+(i+1),'chair',{x,z,yaw});
    // Study (rear left, beside the stairs): a desk under the print, the accent cabinet and a plant.
    fixture('study-desk',-3.5,-front+.25+.36,1.5,.7,.3,.76,null);piece(-3.5,1.02,-front+.61,1.5,.04,.7,m.walnut);for(const sx of [-1,1])piece(-3.5+sx*.7,.3,-front+.61,.05,.72,.62,m.black);
    model('study-chair','chair',{x:-3.5,z:-front+1.35,yaw:Math.PI});model('study-cabinet','cabinet',{x:-3.3,z:1.2-.11-.21,yaw:Math.PI});model('study-plant','plant',{x:-1.0,z:.5,yaw:0});
    fixture('guest-bed',-3.8,-2.2,1.7,2.1,.3,.71,m.fabric);
    // Garage workbench with a pegboard and shelf.
    fixture('garage-workbench',-6.6,3.1,.65,2,.3,.9,m.oak);piece(-6.6,1.2,3.1,.72,.06,2.06,m.quartz);
    // Colour: two-tone living wall with panel moulding, painted bedroom with an
    // accent wall behind the bed, crown moulding and original prints.
    const scheme=interiorScheme(home),R=half-.25,F=front-.25;
    crown(root,home);wainscot(root,'z',R,-1,-F+.1,F-.1,inside.paint(scheme.accent));
    print(root,'z',R,-1,-.4,1.85,.8,1.0,scheme.art[0]);print(root,'z',R,-1,.65,1.85,.8,1.0,scheme.art[1]);
    paintWall(root,'x',-F,1,-R,-.31,inside.paint(scheme.bedAccent));wainscot(root,'x',-F+.012,1,-R,-.31,inside.paint(scheme.bedAccent));
    paintWall(root,'z',-R,1,-F,1.09,inside.paint(scheme.bedroom));paintWall(root,'z',-.31,-1,-F,1.09,inside.paint(scheme.bedroom),[{a:-4.2,b:-2.7,bottom:.3,top:2.7}]);paintWall(root,'x',1.09,-1,-R,-.31,inside.paint(scheme.bedroom));
    print(root,'x',-F+.03,1,-3.47,2.05,1.3,.75,scheme.art[0]+2,m.black);print(root,'z',-.31-.012,-1,-1.2,1.75,.7,.9,scheme.art[1]+1);
    buildStairs(root,home,stairsOf(home),inside.paint(scheme.bedroom));
    lights139.down=[ceilingLight(root,set.x-.6,set.z+.4),ceilingLight(root,3.4,-2.2),ceilingLight(root,-3.0,-3.2),ceilingLight(root,-3.6,3.6)];
    lights139.up=buildUpper(root,home,palette[home.palette],scheme,glazing,record,true);
  }

  function furnish144(root,home){
    // A bounded furnished ground floor, using the same static instance batches.
    // Its upstairs uses the shared furnished storey; ownership still belongs to 101.
    const plaster=material(0xe6dfd1),fabric=material(0x829387,.96),linen=material(0xe2d8c2,.98),walnut=visualKit.wood(0x795e46),counter=material(0xd4d0c5),steel=material(0x909c9c,.3,.5);
    const record={homeId:home.id,address:home.address+' '+home.street,rooms:['Living room','Kitchen & dining','Guest bedroom','Garage'],fixtures:[]};furnishedInteriors.push(record);
    const front=home.d/2,half=home.w/2;
    const sx=home.w/14.6,sz=home.d/12.8;const piece=(x,y,z,w,h,d,mat)=>box(root,x*sx,y,z*sz,w*sx,h,d*sz,mat,false);
    function fixture(id,x,z,w,d,y,h,mat){
      const mesh=piece(x,y,z,w,h,d,mat);mesh.name=home.address+' · '+id;
      const collider=solid(home,x*sx,z*sz,w*sx,d*sz,'community-furniture');Object.assign(collider,{houseId:home.id,fixtureId:id,minY:y,maxY:y+h});
      if(id==='guest-bed')collider.maxY=1.01;record.fixtures.push({id,...communityPoint(home,x*sx,z*sz),y,w:w*sx,d:d*sz,collider});return mesh;
    }
    // Inner plaster faces and full-height room dividers; openings align with
    // the existing front/garage/patio leaves and keep a clear central route.
    lowerWall(root,home,'z',-.2,-front+.25,front-.25,plaster,[{a:-4.2,b:-2.7,top:2.7},{a:2.2,b:3.7,top:2.7}]);
    lowerWall(root,home,'x',.8,-half+.25,-.2,plaster,[{a:-1.9,b:-.2,top:3.18}]);

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
    fixture('nightstand',-2.8,-4.9,.65,.65,.3,.6,walnut);piece(-2.8,.9,-4.9,.3,.5,.3,linen);
    fixture('dresser',-3.8,-.2,2.1,.65,.3,.92,walnut);for(const y of [.52,.8,1.08])piece(-3.8,y,.14,1.95,.025,.025,trim);
    fixture('garage-workbench',-6.6,3.1,.65,2,.3,.9,walnut);piece(-6.6,1.2,3.1,.72,.06,2.06,counter);
    // Trim and framed art finish the inner walls without new textures/lights.
    for(const z of [-1,1]){piece(7.03,.3,z*3.2,.045,.12,5.7,trim);piece(7.02,1.3,z*3.2,.07,.9,1.15,walnut);piece(6.975,1.35,z*3.2,.025,.8,1.02,fabric);}
  }

  const livingHomes=new Set(sofaSetHomes(COMMUNITY_HOMES).map(h=>h.id));
  for(const home of COMMUNITY_HOMES){
    const {w,d}=home,p=palette[home.palette],root=new THREE.Group();root.position.set(home.x,0,home.z);root.rotation.y=home.heading;root.userData.staticArchitecture=true;root.name='Two-story home '+home.address+' '+home.street;scene.add(root);architectureRoots.push(root);
    const front=d/2,rear=(home.rearZ-home.z)*(home.heading===0?1:-1),frontLot=Math.abs(home.roadZ-home.z)-10.8,doorX=w*.20,garageX=-w*.23,porchX=w*.28;
    // The developed-site lawn already covers every lot; avoid coplanar grass.
    surface(home,0,(rear+frontLot)/2,home.lotWidth-.12,frontLot-rear,.025,grass,'grass',-.055);
    if(home.id!=='maple-grove-1'){
    // Keep the slab below the finished floor: equal .30 m top faces flickered.
    box(root,0,-.055,0,w+.34,.325,d+.34,foundation);
    // The furnished home gets see-through windows on both floors (the ones behind the
    // stairs and the rear study window stay dressed); the others keep facade glazing.
    const realWindows=home.id==='maple-grove-20',upW=home.plan===3?1.45:1.35,hole=(c,width,bottom,height)=>({a:c-width/2,b:c+width/2,bottom,top:bottom+height});
    const glazing=realWindows?{front:[hole(w*.4,1.05,1.12,1.35)],left:[hole(d*.24,1.1,1.2,1.38)],right:[-d*.27,d*.24].map(z=>hole(z,1.1,1.2,1.38)),
      upFront:[-w*.29,0,w*.29].map(x=>hole(x,upW,4.27,1.45)),upRear:[-w*.27,w*.27].map(x=>hole(x,1.35,4.27,1.45)),upLeft:[-d*.27,d*.24].map(z=>hole(z,1.1,4.27,1.38)),upRight:[-d*.27,d*.24].map(z=>hole(z,1.1,4.27,1.38))}
      :{front:[],left:[],right:[],upFront:[],upRear:[],upLeft:[],upRight:[]};
    lowerWall(root,home,'x',front,-w/2,w/2,p.brick,[{a:garageX-3,b:garageX+3,top:2.85},{a:doorX-.85,b:doorX+.85,top:2.85},...glazing.front]);
    lowerWall(root,home,'x',-front,-w/2,w/2,p.siding,[{a:w*.24-.85,b:w*.24+.85,top:2.85}]);
    for(const side of [-1,1])lowerWall(root,home,'z',side*w/2,-front,front,p.brick,side<0?glazing.left:glazing.right);
    surface(home,0,0,w-.22,d-.22,.3,inside.materials.floor,'wood',.22);
    if(home.id==='maple-grove-20'){furnish139(root,home,glazing);lightSpots.set(home.id,lights139);}
    else{const scheme=interiorScheme(home),R=w/2-.25,F=front-.25;lineShell(root,home,inside.paint(scheme.walls));crown(root,home);
      wainscot(root,'z',R,-1,-F+.1,F-.1,inside.paint(scheme.accent));print(root,'z',R,-1,F*.15,1.8,.9,1.1,scheme.art[0]);print(root,'z',R,-1,-F*.35,1.8,.9,1.1,scheme.art[1]);
      const spots={down:[ceilingLight(root,w*.2,front*.35),ceilingLight(root,w*.25,-front*.45),ceilingLight(root,-w*.25,front*.3)]};lightSpots.set(home.id,spots);
      // Kitchen along the rear wall either side of the patio door, fridge at the end,
      // and a dining table between the kitchen and the living area.
      if(home.address!==144&&home.address!==146){const rear=-F,doorL=w*.24-.95,doorR=w*.24+.95;baseRun(root,home,'kitchen-counter',.2,doorL,null);sink(root,(.2+doorL)/2,rear);baseRun(root,home,'oven-counter',doorR,R-1.0,null);range(root,(doorR+R-1.0)/2,rear);fridge(root,home,'refrigerator',R-.5,rear,null);
      }
      if(home.address!==144){const tz=-F+3.4,tx=w*.25;furn(home,'dining-table',tx,tz,1.6,.9,.3,.76,null);box(root,tx,1.02,tz,1.7,.05,.95,inside.materials.oak,false);for(const sx of [-1,1])for(const sz of [-1,1])box(root,tx+sx*.72,.3,tz+sz*.37,.07,.72,.07,inside.materials.oak,false);
      for(const [i,sx] of [-.4,.4].entries())for(const sz of [-1,1])simpleChair(root,home,'dining-chair-'+i+(sz<0?'a':'b'),tx+sx,tz+sz*.78,-sz,null);
      }
      if(home.address===144)furnish144(root,home);
      buildStairs(root,home,stairsOf(home),inside.paint(scheme.walls));spots.up=buildUpper(root,home,p,scheme,glazing,null,false);
      // Homes with the owner's sofa set also get a media cabinet, TV and a plant.
      if(livingHomes.has(home.id)){const set=sofaSetPlacement(home),tvX=Math.max(set.x-.14,w*.2+.85+.55);props.add(home,'cabinet',{x:tvX,z:front-.25-.21},{name:'media-console'});box(root,tvX,1.2,front-.29,1.32,.76,.05,inside.materials.black,false);box(root,tvX,1.225,front-.32,1.26,.71,.012,inside.materials.screen,false);props.add(home,'plant',{x:w/2-.6,z:front-.7,yaw:Math.PI},{name:'living-plant'});spots.down[0]=ceilingLight(root,set.x-.6,set.z+.4);}
      else if(home.address!==144){const set=sofaSetPlacement(home),sx=set.x-.2,sz=set.z-1.1,fab=inside.fabric(scheme.accent),mm=inside.materials;box(root,sx,.3,sz,2.4,.42,.95,fab,false);box(root,sx,.72,sz-.38,2.4,.45,.2,fab,false);for(const s of [-1,1])box(root,sx+s*1.12,.72,sz,.18,.22,.95,fab,false);for(const s of [-1,1])box(root,sx+s*.52,.72,sz+.06,1.0,.13,.7,mm.upper,false);furn(home,'sofa',sx,sz,2.4,.95,.3,.9,null);
        box(root,sx,.3,sz+1.35,1.2,.4,.65,mm.walnut,false);furn(home,'coffee-table',sx,sz+1.35,1.2,.65,.3,.4,null);rug(root,sx,sz+1.1,3.0,2.2,.3,inside.fabric(scheme.walls));}}
    box(root,0,3.04,front+.08,w+.08,.17,.15,trim);box(root,0,6.27,front+.08,w+.16,.13,.15,trim);
    for(const side of [-1,1]){box(root,side*(w/2+.07),.3,front,.13,6.1,.15,trim,false);box(root,side*(w/2+.16),.24,-front+.4,.09,6.1,.09,metal,false);}
    const turn=home.plan===2?Math.PI/2:0;gable(root,0,0,turn?d+1:w+1,turn?w+1:d+1,6.4,home.plan===3?2.45:2.12,p.roof,p.siding,turn);
    if(home.plan===1||home.plan===3)gable(root,home.plan===1?garageX:porchX,front-1.35,home.plan===1?6.7:5.8,4.1,6.38,1.52,p.roof,p.siding);
    for(const [i,x] of [-w*.29,0,w*.29].entries()){if(!realWindows)windowOn(root,x,4.27,front+.11,home.plan===3?1.45:1.35,1.45,0,i+home.palette);if(home.plan%2===1)for(const s of [-1,1])box(root,x+s*.94,4.17,front+.1,.28,1.65,.09,dark,false);}
    if(realWindows){realWindow(root,w*.40,1.12,front,1.05,1.35,0);for(const o of glazing.right)realWindow(root,w/2,1.2,(o.a+o.b)/2,1.1,1.38,Math.PI/2);for(const o of glazing.left)realWindow(root,-w/2,1.2,(o.a+o.b)/2,1.1,1.38,-Math.PI/2);
      for(const o of glazing.upFront)realWindow(root,(o.a+o.b)/2,4.27,front,o.b-o.a,1.45,0,UPPER);for(const o of glazing.upRear)realWindow(root,(o.a+o.b)/2,4.27,-front,1.35,1.45,Math.PI,UPPER);for(const side of [-1,1])for(const o of side<0?glazing.upLeft:glazing.upRight)realWindow(root,side*w/2,4.27,(o.a+o.b)/2,1.1,1.38,side*Math.PI/2,UPPER);
      windowOn(root,-w/2-.08,1.2,-d*.27,1.1,1.38,-Math.PI/2,home.palette+1);}
    else windowOn(root,w*.40,1.12,front+.1,1.05,1.35,0,4);
    for(const side of [-1,1])for(const z of [-d*.27,d*.24])for(const y of (realWindows?[]:[1.2,4.27]))windowOn(root,side*(w/2+.08),y,z,1.1,1.38,side*Math.PI/2,home.palette+Math.round(y));
    for(const x of [-w*.27,w*.27]){if(!realWindows)windowOn(root,x,4.27,-front-.08,1.35,1.45,Math.PI,home.palette+3);if(x<0)windowOn(root,x,1.2,-front-.08,1.45,1.4,Math.PI,home.palette+2);}
    // Both garage bays share one paneled two-car overhead door.
    for(const side of [-1,1]){box(root,garageX+side*3.09,.3,front+.12,.16,2.55,.2,trim,false);box(root,doorX+side*.93,.3,front+.12,.16,2.55,.2,trim,false);}
    box(root,garageX,2.85,front+.12,6.34,.15,.2,trim,false);box(root,doorX,2.85,front+.12,2.02,.15,.2,trim,false);
    doorSystem.add(home,'garage',{x:garageX,z:front+.18,width:5.98,height:2.5,material:p.door});doorSystem.add(home,'front',{x:doorX,z:front+.18,material:p.door});
    surface(home,porchX,front+.87,w*.40,1.65,.3,concrete,'concrete',.14);surface(home,doorX,front+1.94,1.65,.65,.17,concrete,'concrete',.08);surface(home,doorX,front+2.53,1.7,.6,.09,concrete,'concrete',.025);
    for(const x of [w*.08,w*.48]){box(root,x,.3,front+1.42,.18,2.65,.18,trim);solid(home,x,front+1.42,.22,.22,'porch-post');}box(root,porchX,3.02,front+.88,w*.44,.16,2.05,trim);box(root,porchX,3.18,front+.88,w*.45,.12,2.15,p.roof);
    for(const x of [garageX-3.3,doorX+.94]){box(root,x,2.03,front+.19,.2,.42,.18,dark,false);box(root,x,2.1,front+.29,.14,.23,.08,porchLight,false);}
    }
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
  // Floors inside the two-storey homes: the stair treads, then whichever storey the
  // walker is closer to (the same rule the landmark house uses).
  const homeAt=(x,z,pad=.15)=>homes.find(h=>h.id!=='maple-grove-1'&&Math.abs(x-h.x)<h.w/2-pad&&Math.abs(z-h.z)<h.d/2-pad);
  const localOf=(h,x,z)=>{const s=h.heading===0?1:-1;return {x:(x-h.x)*s,z:(z-h.z)*s};};
  function onStairs(h,q){const S=stairsOf(h);return q.x>=S.x0&&q.x<=S.x1&&q.z>=S.z0&&q.z<=S.z1;}
  function floorAt(x,z,referenceY=0){const h=homeAt(x,z,.12);if(!h)return null;const q=localOf(h,x,z),S=stairsOf(h);
    if(onStairs(h,q)){const step=Math.max(0,Math.min(S.steps,Math.ceil((q.z-S.z0)/(S.z1-S.z0)*S.steps-1e-8)));return step>=S.steps?UPPER:GROUND+(UPPER-GROUND)*step/S.steps;}
    for(const record of furnishedInteriors)if(record.homeId===h.id)for(const bed of record.fixtures.filter(f=>f.id==='guest-bed')){if(Math.abs(x-bed.x)<bed.w/2&&Math.abs(z-bed.z)<bed.d/2&&referenceY>=.93&&referenceY<1.6)return 1.01;}
    return referenceY>UPPER-.65?UPPER:GROUND;}
  function interior(p){const home=homeAt(p.x,p.z);if(!home)return null;const up=(p.y??0)>2.8||onStairs(home,localOf(home,p.x,p.z));return {minX:home.x-home.w/2+.22,maxX:home.x+home.w/2-.22,minZ:home.z-home.d/2+.22,maxZ:home.z+home.d/2-.22,ceiling:up?CEIL2:3.18,floor:up?UPPER:GROUND};}
  function garageDrivable(x,z){const h=homeAt(x,z,-.4);if(!h)return false;const q=localOf(h,x,z);return q.x>=-h.w*.23-2.85&&q.x<=-2.15&&q.z>=.87&&q.z<=h.d/2+.4;}
  return {garageDrivable,homes,roads:COMMUNITY_ROADS,gateways,landscapePockets,architectureBatches,addressPlaques,furnishedInteriors,doors:doorSystem.doors,nearestDoor:doorSystem.nearest,actDoor:doorSystem.act,update:(dt,p)=>{doorSystem.update(dt,p);sofaSets.update(p);props.update(p);const home=p?homeAt(p.x,p.z):null,spots=home?lightSpots.get(home.id):null;roomLights.update(home,spots?((p.y??.3)>2.8?spots.up:spots.down):null,p);},sofaSets,interiorProps:props,interiorSurfaces:inside,roomLights,interior,floorAt,stairsOf,fenced:homes.filter(h=>h.fenced).length};
}
