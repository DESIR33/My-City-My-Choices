import * as THREE from 'three';
import {MODEL_HOME as H,freshHouse,restoreHouse,houseLocal,houseInside,onHouseStairs,houseFloorAt,houseObstacleBlocks} from './house-rules.js';

// One persistent property, built at world scale. Moving leaves stay outside the
// static batches; all collision volumes carry their real vertical interval.
export function createLandmarkHouse({scene,visualKit,obstacles,groundSurfaces}){
 const root=new THREE.Group();root.name='101 Maple Grove Lane · walk-in landmark';root.position.set(H.x,0,H.z);scene.add(root);
 const unit=new THREE.BoxGeometry(1,1,1),cylinder=new THREE.CylinderGeometry(1,1,1,12),sphere=new THREE.SphereGeometry(1,10,7),torus=new THREE.TorusGeometry(1,.12,6,18);
 const cache=new Map(),mat=(color,r=.85,m=0)=>{const k=[color,r,m].join(':');if(!cache.has(k))cache.set(k,new THREE.MeshStandardMaterial({color,roughness:r,metalness:m}));return cache.get(k);};
 const oak=visualKit.wood(0x997954),walnut=visualKit.wood(0x65533f),brick=visualKit.brick(0x9b7059),siding=visualKit.siding(0xd3cbbc),roofMat=visualKit.roofing(0x3c4142),stone=visualKit.masonry(0xcac5b7);
 const plaster=mat(0xe1dbcb),trim=mat(0xf0e9d9),metal=mat(0x303c39,.45,.55),brass=mat(0xa58b55,.32,.65),fabric=mat(0x819385,.96),linen=mat(0xd9d0b9,.98),rug=mat(0x9a8671,1),dark=mat(0x202c2d,.6),ceramic=mat(0xdddcd0,.28),water=mat(0x6ba2ac,.18,.15);
 const glass=new THREE.MeshPhysicalMaterial({color:0xb9d1c9,transparent:true,opacity:.22,roughness:.12,metalness:.04,depthWrite:false,side:THREE.DoubleSide});
 const lightMats=[new THREE.MeshBasicMaterial({color:0xffe4a9}),new THREE.MeshBasicMaterial({color:0xffe4a9})];
 let state=freshHouse(),referenceY=.3,tvClock=0,tvTime=0;
 const colliders=[],actions=[],seats=[],doors=[],moving=[],beds=[],batches=[],roomLabels=[];
 const world=(x,z)=>({x:H.x+x,z:H.z+z});
 function box(parent,x,y,z,w,h,d,material=oak){const m=new THREE.Mesh(unit,material);m.position.set(x,y+h/2,z);m.scale.set(w,h,d);m.castShadow=h>.08;m.receiveShadow=true;parent.add(m);return m;}
 function solid(x,z,w,d,minY,maxY,id='fixture'){const o={...world(x-w/2,z-d/2),minX:H.x+x-w/2,maxX:H.x+x+w/2,minZ:H.z+z-d/2,maxZ:H.z+z+d/2,minY,maxY,houseId:H.id,fixtureId:id};delete o.x;delete o.z;obstacles.push(o);colliders.push(o);return o;}
 function furnishing(x,y,z,w,h,d,material=oak,id='furniture'){box(root,x,y,z,w,h,d,material);solid(x,z,w,d,y,y+h,id);}
 function shape(parent,geometry,x,y,z,sx,sy,sz,material){const m=new THREE.Mesh(geometry,material);m.position.set(x,y,z);m.scale.set(sx,sy,sz);m.castShadow=m.receiveShadow=true;parent.add(m);return m;}
 function rod(a,b,r=.025,material=metal){const delta=new THREE.Vector3(...b).sub(new THREE.Vector3(...a)),m=shape(root,cylinder,(a[0]+b[0])/2,(a[1]+b[1])/2,(a[2]+b[2])/2,r,delta.length(),r,material);m.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),delta.normalize());return m;}
 function action(id,title,x,z,floor=0,kind='toggle',extra={}){const a={id,title,...world(x,z),y:floor?H.upper:H.ground,floor,kind,...extra};actions.push(a);return a;}
 function plate(text,x,y,z,w=1.4,h=.35,background='#34483e'){const c=document.createElement('canvas');c.width=512;c.height=128;const q=c.getContext('2d');q.fillStyle=background;q.fillRect(0,0,512,128);q.fillStyle='#f5e7c8';q.font='600 42px Georgia';q.textAlign='center';q.textBaseline='middle';q.fillText(text,256,66,490);const map=new THREE.CanvasTexture(c);map.colorSpace=THREE.SRGBColorSpace;const m=new THREE.Mesh(new THREE.PlaneGeometry(w,h),new THREE.MeshStandardMaterial({map,roughness:.75,side:THREE.DoubleSide}));m.position.set(x,y,z);root.add(m);return m;}
 function floor(x,z,w,d,top,material=oak){box(root,x,top-.12,z,w,.12,d,material);}
 function wall(axis,fixed,a,b,y0,y1,openings=[]){const xs=[...new Set([a,b,...openings.flatMap(o=>[o.a,o.b])])].sort((x,y)=>x-y),ys=[...new Set([y0,y1,...openings.flatMap(o=>[o.bottom,o.top])])].sort((x,y)=>x-y);
  for(let i=1;i<xs.length;i++)for(let j=1;j<ys.length;j++){const lo=xs[i-1],hi=xs[i],bottom=ys[j-1],top=ys[j],mid=(lo+hi)/2,cy=(bottom+top)/2;if(lo<a||hi>b||bottom<y0||top>y1||openings.some(o=>mid>o.a&&mid<o.b&&cy>o.bottom&&cy<o.top))continue;const x=axis==='x'?mid:fixed,z=axis==='x'?fixed:mid,w=axis==='x'?hi-lo:.22,d=axis==='x'?.22:hi-lo;box(root,x,bottom,z,w,top-bottom,d,axis==='x'&&fixed===5.9?brick:plaster);solid(x,z,w,d,bottom,top,'wall');}
 }
 function window(axis,fixed,center,y,width=1.6,height=1.5){const g=new THREE.Group();g.position.set(axis==='x'?center:fixed,y,axis==='x'?fixed:center);if(axis==='z')g.rotation.y=Math.PI/2;root.add(g);
  box(g,0,0,0,width,height,.06,glass);for(const x of [-width/2,width/2])box(g,x,-.08,0,.07,height+.16,.16,trim);for(const h of [-.08,height])box(g,0,h,0,width+.14,.07,.16,trim);box(g,0,0,.035,.04,height,.04,trim);box(g,0,height*.5,.035,width,.04,.04,trim);
  solid(axis==='x'?center:fixed,axis==='x'?fixed:center,axis==='x'?width:.16,axis==='x'?.16:width,y,y+height,'window');
 }
 const windows={front:[{a:4.2,b:5.7,bottom:1.1,top:2.6},...[-3.7,0,3.7].map(x=>({a:x-.8,b:x+.8,bottom:4.3,top:5.8}))],rear:[...[-3.3,.4,4.8].flatMap(x=>[0,1].map(f=>({a:x-.75,b:x+.75,bottom:(f?H.upper:H.ground)+.85,top:(f?H.upper:H.ground)+2.3})))],side:[-3.4,2.9].flatMap(z=>[0,1].map(f=>({a:z-.75,b:z+.75,bottom:(f?H.upper:H.ground)+.85,top:(f?H.upper:H.ground)+2.3})))};
 wall('x',5.9,-6.7,6.7,.3,6.45,[{a:1.83,b:3.53,bottom:.3,top:2.85},...windows.front]);
 wall('x',-5.9,-6.7,6.7,.3,6.45,[{a:-6.15,b:-4.45,bottom:.3,top:2.85},...windows.rear]);
 for(const x of [-6.7,6.7])wall('z',x,-5.9,5.9,.3,6.45,windows.side);
 for(const o of windows.front)window('x',5.9,(o.a+o.b)/2,o.bottom,o.b-o.a,o.top-o.bottom);
 for(const o of windows.rear)window('x',-5.9,(o.a+o.b)/2,o.bottom,o.b-o.a,o.top-o.bottom);
 for(const x of [-6.7,6.7])for(const o of windows.side)window('z',x,(o.a+o.b)/2,o.bottom,o.b-o.a,o.top-o.bottom);
 // Exterior trim, a two-car garage facade and a pitched standing-seam roof.
 box(root,0,.06,0,13.65,.24,12.05,stone);floor(0,0,13.15,11.55,.3);
 for(const y of [3.22,6.36])box(root,0,y,5.99,13.55,.12,.16,trim);
 for(const x of [-6.72,6.72])box(root,x,.3,5.94,.16,6.12,.18,trim);
 box(root,-3.08,.36,6.04,6,2.3,.1,mat(0xc5c5ba));for(let y=.65;y<2.6;y+=.38)box(root,-3.08,y,6.1,5.9,.025,.03,metal);
 for(const x of [-5.1,-3.75,-2.4,-1.05])box(root,x,2.13,6.11,1.05,.3,.035,glass);
 for(const side of [-1,1]){const p=box(root,side*3.55,7.49,0,7.45,.18,12.8,roofMat);p.rotation.z=-side*.31;box(root,side*7.05,6.38,0,.14,.2,12.8,trim);}
 const roofShape=new THREE.Shape();roofShape.moveTo(-7.05,0);roofShape.lineTo(7.05,0);roofShape.lineTo(0,2.26);roofShape.closePath();const roofFace=new THREE.ShapeGeometry(roofShape);
 for(const z of [-6.2,6.2]){const face=new THREE.Mesh(roofFace,siding);face.position.set(0,6.45,z);if(z<0)face.rotation.y=Math.PI;root.add(face);}
 box(root,0,8.68,0,.18,.12,12.8,roofMat);
 floor(2.68,6.65,4,1.6,.3,stone);for(const [z,y] of [[7.65,.17],[8.25,.085]]){box(root,2.68,y-.08,z,1.7,.08,.65,stone);groundSurfaces.push({minX:H.x+1.83,maxX:H.x+3.53,minZ:H.z+z-.325,maxZ:H.z+z+.325,top:y,kind:'concrete'});}
 groundSurfaces.push({minX:H.x+.68,maxX:H.x+4.68,minZ:H.z+5.85,maxZ:H.z+7.45,top:.3,kind:'concrete'});
 for(const x of [.9,4.45]){box(root,x,.3,7.2,.14,2.7,.14,trim);solid(x,7.2,.16,.16,.3,3,'porch-post');}box(root,2.68,3.02,6.7,4.3,.16,2.1,roofMat);plate('101 · THE MAPLE HOUSE',2.68,3.25,7.76,3.5,.38);
 floor(-5.3,-6.5,2,1.3,.17,stone);groundSurfaces.push({minX:H.x-6.3,maxX:H.x-4.3,minZ:H.z-7.15,maxZ:H.z-5.85,top:.17,kind:'concrete'});
 // Slabs have a genuine stair opening, rather than a floor texture over steps.
 floor(-1.3,0,10.4,11.55,H.upper);floor(6.2,0,.6,11.55,H.upper);floor(4.9,-4.35,2,2.9,H.upper);floor(4.9,4.75,2,2.1,H.upper);
 box(root,0,6.4,0,13.2,.12,11.6,plaster);
 wall('z',-.8,.75,5.9,.3,3.25,[{a:1.95,b:3.65,bottom:.3,top:2.8}]);wall('x',.75,-6.7,-.8,.3,3.25);
 wall('z',-.6,-5.9,5.9,H.upper,6.4,[{a:1.85,b:3.55,bottom:H.upper,top:6},{a:-1.95,b:-.25,bottom:H.upper,top:6}]);wall('x',0,-6.7,-.6,H.upper,6.4);
 wall('z',2.2,-5.9,-2.4,H.upper,6.4);wall('x',-2.4,-.6,2.2,H.upper,6.4,[{a:-.25,b:1.45,bottom:H.upper,top:6}]);
 // Baseboards, timber treads, newel posts and a sloped handrail.
 for(const f of [.3,H.upper])for(const x of [-6.53,6.53])box(root,x,f,0,.055,.11,11.5,trim);
 const stair=H.stairs;
 for(let i=0;i<stair.steps;i++){const z=stair.maxZ-(i+.5)*.35,top=H.ground+(i+1)*.175;box(root,4.95,.3,z,1.8,top-.3,.35,oak);box(root,4.95,top-.025,z,1.84,.025,.35,walnut);}
 for(const x of [3.98,5.98]){rod([x,1.22,3.4],[x,4.37,-2.9],.045,oak);for(let i=0;i<=9;i++){const z=3.4-i*.7,y=.3+i*.35;rod([x,y,z],[x,y+.9,z],.025);}}
 solid(3.98,.45,.1,5.9,.3,4.4,'stair-side');solid(5.98,.25,.1,6.3,.3,4.4,'stair-side');
 box(root,3.93,H.upper,-.0,.1,.9,5.05,metal);solid(3.93,0,.12,5.05,H.upper,H.upper+.9,'landing-rail');
 // The foyer/gallery gives a clear view of the stair and the living room.
 floor(2.4,3.3,1.55,2.1,.307,rug);furnishing(.2,.3,4.9,1.2,.83,.4,walnut,'entry-console');plate('Make yourself at home',.2,1.64,5.73,1.9,.55);
 function door(id,title,axis,x,z,floor=0,sign=1,direction=1){const y=floor?H.upper:.3,w=1.7,g=new THREE.Group();g.position.set(x,y,z);g.userData.dynamicHouse=true;g.userData.cameraIgnore=true;root.add(g);const leaf=box(g,axis==='x'?w/2:0,0,axis==='z'?direction*w/2:0,axis==='x'?w:.08,2.5,axis==='x'?.08:w,id==='front'?mat(0x29434d,.56):trim);
  for(const h of [.2,1.3])box(g,axis==='x'?w/2:.055,h,axis==='z'?direction*w/2:.055,axis==='x'?1.3:.035,.8,axis==='x'?.035:1.3,oak);
  shape(g,sphere,axis==='x'?1.45:.09,1.12,axis==='z'?direction*1.45:.09,.045,.045,.045,brass);
  const collider=solid(x+(axis==='x'?w/2:0),z+(axis==='z'?direction*w/2:0),axis==='x'?w:.1,axis==='z'?w:.1,y,y+2.5,id);
  const d={id,g,leaf,collider,x,z,y,w,axis,sign,direction,angle:0};doors.push(d);action(id,title,x+(axis==='x'?w/2:0),z+(axis==='z'?direction*w/2:0),floor,'door',{door:d,radius:2.5});
 }
 door('front','Open / close the front door','x',1.83,5.9,0,1);door('rear','Open / close the patio door','x',-6.15,-5.9,0,-1);door('garage','Open / close the utility-room door','z',-.8,1.95,0,-1);
 door('bedroom1','Open / close the main bedroom','z',-.6,1.85,1,1);door('bedroom2','Open / close the second bedroom','z',-.6,-.25,1,1,-1);door('bathroom','Open / close the bathroom','x',-.25,-2.4,1,1);
 function chair(id,title,x,z,floor=0,heading=0,width=.64,stand=null){const y=floor?H.upper:.3,g=new THREE.Group();g.position.set(x,y,z);g.rotation.y=heading;root.add(g);
  for(const a of [-1,1])for(const b of [-1,1])box(g,a*(width/2-.07),0,b*.2,.055,.43,.055,walnut);
  box(g,0,.43,0,width,.1,.6,fabric);box(g,0,.53,-.25,width,.65,.09,oak);
  const w=Math.abs(Math.cos(heading))*width+Math.abs(Math.sin(heading))*.6,d=Math.abs(Math.sin(heading))*width+Math.abs(Math.cos(heading))*.6;solid(x,z,w,d,y,y+1.1,id);
  const s={id,type:title,x:H.x+x,z:H.z+z,floor:y,height:.53,heading,stand:stand?world(...stand):world(x-Math.sin(heading)*1.1,z-Math.cos(heading)*1.1)};seats.push(s);action(id,'Sit on '+title,houseLocal(s.stand).x,houseLocal(s.stand).z,floor,'seat',{seat:s});return s;
 }
 // Living room: stitched sectional, cushions, rug, coffee table, media wall.
 floor(-3.1,-2.7,4.9,4.6,.307,rug);furnishing(-3.1,.42,-1.1,3.4,.32,.95,fabric,'sofa');box(root,-3.1,.74,-.7,3.4,.67,.17,fabric);
 for(const x of [-4.8,-1.4])box(root,x,.6,-1.1,.18,.46,1,fabric);for(const x of [-4.15,-3.1,-2.05])box(root,x,.75,-1.15,.9,.13,.8,linen);
 const sofa={id:'sofa',type:'sofa',...world(-3.1,-1.1),floor:.3,height:.58,heading:Math.PI,stand:world(-3.1,-2.4)};seats.push(sofa);action('sofa','Relax on the sofa',-3.1,-2.4,0,'seat',{seat:sofa});
 furnishing(-3.1,.3,-3.4,1.35,.42,.7,walnut,'coffee-table');box(root,-3.1,.73,-3.4,1.4,.05,.75,stone);plate('MAPLE LIVING',-3.1,.8,-3.37,.55,.12);
 furnishing(-2.9,.3,-5.15,3,.48,.48,walnut,'media-console');box(root,-2.9,.92,-5.45,2.85,1.6,.1,dark);
 const tvCanvas=document.createElement('canvas');tvCanvas.width=512;tvCanvas.height=288;const tq=tvCanvas.getContext('2d'),tvMap=new THREE.CanvasTexture(tvCanvas);tvMap.colorSpace=THREE.SRGBColorSpace;
 const screen=new THREE.Mesh(new THREE.PlaneGeometry(2.65,1.42),new THREE.MeshBasicMaterial({map:tvMap}));screen.position.set(-2.9,1.74,-5.385);screen.userData.dynamicHouse=true;root.add(screen);action('tv','TV · power and channels',-1.6,-4.2);
 function tvPicture(){tq.fillStyle=state.tv?['#497779','#425b78','#476e54'][state.channel]:'#172426';tq.fillRect(0,0,512,288);if(state.tv){tq.fillStyle='#d6bf8f';tq.fillRect(0,194,512,94);tq.fillStyle='#f4dfb0';tq.beginPath();tq.arc(370,65,28,0,Math.PI*2);tq.fill();tq.fillStyle='#345b48';for(let i=0;i<8;i++){tq.beginPath();tq.moveTo(i*85-90,200);tq.lineTo(i*85-15,75+Math.sin(i+tvTime)*9);tq.lineTo(i*85+60,200);tq.fill();}tq.fillStyle='#fff1d2';tq.font='22px sans-serif';tq.fillText(['MAPLE NATURE','CITY STORIES','GARDEN TIME'][state.channel],25,263);}tvMap.needsUpdate=true;}
 // Kitchen: quartz worktops, inset sink, an island, storage and full appliances.
 furnishing(.15,.3,-5.22,2.65,.86,.82,trim,'kitchen-counter');box(root,.15,1.16,-5.22,2.75,.07,.88,stone);
 furnishing(1.95,.3,-5.22,.85,.86,.82,metal,'range');box(root,1.95,1.16,-5.22,.88,.06,.9,dark);for(const x of [1.7,2.2])for(const z of [-5.45,-5]){const ring=shape(root,torus,x,1.23,z,.15,.15,.15,metal);ring.rotation.x=Math.PI/2;}
 const oven=box(root,1.95,.42,-4.78,.73,.57,.055,dark);oven.userData.dynamicHouse=true;moving.push({key:'oven',mesh:oven,axis:'z',base:-4.78,delta:.4});action('oven','Open / close the oven',1.95,-4.0);
 const basin=shape(root,cylinder,.1,1.237,-5.22,.36,.025,.26,metal);rod([.35,1.22,-5.5],[.35,1.62,-5.5],.025,metal);rod([.35,1.62,-5.5],[.35,1.62,-5.22],.025,metal);
 const stream=shape(root,cylinder,.35,1.42,-5.22,.014,.37,.014,water);stream.userData.dynamicHouse=true;action('tap','Turn the kitchen tap on / off',.1,-4.0);
 const cabinet=new THREE.Group();cabinet.position.set(-.7,.4,-4.77);cabinet.userData.dynamicHouse=true;root.add(cabinet);for(let i=0;i<3;i++){box(cabinet,0,i*.23,0,.8,.2,.055,oak);box(cabinet,0,i*.23+.1,.05,.3,.025,.04,brass);}moving.push({key:'cabinet',mesh:cabinet,axis:'z',base:-4.77,delta:.38});action('cabinet','Open / close the kitchen drawers',-.7,-4.0);
 furnishing(.75,.3,-2.8,2.1,.9,.8,mat(0x657a6b),'island');box(root,.75,1.2,-2.8,2.25,.06,.95,stone);shape(root,cylinder,.75,1.35,-2.8,.2,.2,.2,ceramic);
 furnishing(3.05,.3,-5.1,.95,1.95,1.05,metal,'fridge');box(root,3.05,.55,-4.55,.78,1.6,.03,dark);for(const y of [.65,1.05,1.45,1.85])box(root,3.05,y,-4.48,.72,.025,.18,trim);
 for(const [x,y] of [[2.8,.75],[3.1,1.15],[3.3,1.6]])shape(root,sphere,x,y,-4.43,.1,.15,.1,mat(0xa3ac65));
 const fridgeDoor=new THREE.Group();fridgeDoor.position.set(2.57,.3,-4.5);fridgeDoor.userData.dynamicHouse=true;root.add(fridgeDoor);box(fridgeDoor,.48,0,0,.95,1.95,.065,ceramic);box(fridgeDoor,.78,.8,.07,.04,.6,.04,brass);moving.push({key:'fridge',mesh:fridgeDoor,rotation:true,base:0,delta:-Math.PI*.6});action('fridge','Open / close the refrigerator',3.05,-3.7);
 box(root,.7,1.9,-5.7,3.2,.7,.38,oak);for(const x of [-.4,.6,1.6])box(root,x,1.92,-5.48,.94,.65,.04,trim);
 // Dining furniture has distinct usable chair positions and clear exits.
 furnishing(1.3,.3,.4,1.9,.8,1.1,oak,'dining-table');box(root,1.3,1.1,.4,2,.06,1.2,stone);shape(root,cylinder,1.3,1.3,.4,.12,.3,.12,ceramic);
 chair('dining-front','dining chair',1.3,1.8,0,Math.PI,.65,[1.3,2.9]);chair('dining-back','dining chair',1.3,-1.05,0,0,.65,[2.9,-1.1]);chair('dining-side','dining chair',3.05,.4,0,-Math.PI/2,.65,[3.05,1.55]);
 // Utility garage: laundry drum, shelving, a workbench and household supplies.
 furnishing(-5.65,.3,4.6,1.05,.95,.9,ceramic,'washer');const drum=shape(root,torus,-5.65,.85,5.08,.3,.3,.3,metal);drum.userData.dynamicHouse=true;action('washer','Start / stop the washing machine',-5.65,3.55);
 furnishing(-3.9,.3,4.65,1.7,.95,.7,oak,'workbench');box(root,-3.9,1.25,4.65,1.85,.08,.8,stone);action('workbench','Inspect the household tool kit',-3.9,3.6,0,'read',{message:'A tool kit, spare bulbs and a tape measure. This home is ready for future improvements.'});
 for(const y of [.6,1.2,1.8])box(root,-5.9,y,1.5,.75,.06,1.2,oak);action('supplies','Inspect laundry and storage',-4.85,1.5,0,'read',{message:'Laundry supplies and labeled storage boxes keep this utility room organized.'});
 function bed(id,x,z,heading=0){const g=new THREE.Group();g.position.set(x,H.upper,z);g.rotation.y=heading;root.add(g);box(g,0,.1,0,2.15,.25,2.45,walnut);box(g,0,.35,0,2.05,.2,2.35,linen);const duvet=box(g,0,.55,.2,2.05,.08,1.9,id==='bed1'?fabric:mat(0x9f8b76,.98));duvet.userData.dynamicHouse=true;box(g,0,.1,-1.23,2.2,1.1,.12,oak);for(const side of [-1,1])box(g,side*.5,.56,-.8,.8,.16,.45,trim);solid(x,z,2.2,2.5,H.upper,H.upper+.7,id);
  const stand=world(x+1.85,z),seat={id,type:'bed',...world(x-Math.sin(heading)*.0,z+Math.cos(heading)*.9),floor:H.upper,height:.64,heading,rest:true,stand};beds.push({id,duvet,seat});action(id,'Rest / make the '+(id==='bed1'?'main bed':'second bed'),x+1.85,z,1,'bed',{seat});
 }
 bed('bed1',-3.5,4.1,Math.PI);bed('bed2',-3.5,-4.2);
 for(const [x,z] of [[-5.2,4.5],[-5.2,-4.7]]){furnishing(x,H.upper,z,.65,.62,.6,walnut,'nightstand');shape(root,cylinder,x,H.upper+1.05,z,.19,.4,.19,linen);}
 furnishing(-4.3,H.upper,1,3,.95,.6,oak,'dresser');plate('CLOTHES & KEEPSAKES',-4.3,4.65,1.32,1.8,.22);action('wardrobe','Use your wardrobe',-4.3,1.95,1,'wardrobe');
 furnishing(-5.25,H.upper,-1.1,1.6,.85,.7,oak,'bedroom-desk');plate('Room to dream',-5.25,5,-.1,1.6,.4);action('books','Read the bedside books',-5.25,-2.1,1,'read',{message:'A shelf of adventure stories, a sketchbook and a neighborhood history. A quiet corner to make your own.'});
 // Upstairs landing study, with a usable chair and a working desk lamp.
 furnishing(1.15,H.upper,4.9,2.2,.8,.65,oak,'study');box(root,1.15,H.upper+.9,5.02,.8,.55,.045,dark);chair('desk-chair','study chair',1.15,3.7,1,0,.65,[1.15,2.55]);action('desk','Toggle the study lamp',2.6,3.65,1);
 const deskGlow=shape(root,sphere,1.95,H.upper+1.1,4.9,.17,.1,.17,lightMats[1]);
 // Bathroom: inset bath, towel rail, mirror, vanity and a flushable toilet.
 furnishing(.15,H.upper,-5.12,1,.83,.7,oak,'vanity');box(root,.15,H.upper+.83,-5.12,1.1,.08,.78,ceramic);box(root,.15,H.upper+1.25,-5.7,1.1,.85,.04,slideMirror());action('bath-sink','Use the bathroom basin',.35,-4,1,'read',{message:'You wash your hands at the ceramic basin.'});
 furnishing(1.45,H.upper,-5.0,.85,.55,1.45,ceramic,'bath');box(root,1.45,H.upper+.56,-5,.68,.025,1.2,water);rod([1.8,H.upper+.6,-5.55],[1.8,H.upper+2.2,-5.55],.02);const shower=shape(root,cylinder,1.55,H.upper+1.4,-5.1,.04,1.4,.04,water);shower.userData.dynamicHouse=true;action('shower','Turn the shower on / off',.5,-4,1);
 furnishing(1.45,H.upper,-3.25,.55,.45,.7,ceramic,'toilet');shape(root,torus,1.45,H.upper+.48,-3.25,.23,.23,.28,ceramic).rotation.x=Math.PI/2;box(root,1.45,H.upper+.4,-3.57,.55,.5,.22,ceramic);action('toilet','Flush the toilet',.6,-3.25,1,'read',{message:'The toilet flushes. The bathroom is ready for the next person.'});
 // Art, curtain panels, plants, switches and warm ceiling fixtures finish rooms.
 const curtains=[];for(const [x,z] of [[-4.75,5.7],[-2.25,5.7],[-4.5,-5.7],[-2.1,-5.7]]){const c=box(root,x,4.05,z,.45,1.95,.06,linen);c.userData.dynamicHouse=true;curtains.push(c);}action('curtains','Open / close the bedroom curtains',-1.65,4.1,1);
 for(const [x,z,y] of [[-5.8,-.5,.3],[2.8,4.8,.3],[-5.7,2,H.upper]]){shape(root,cylinder,x,y+.2,z,.18,.4,.18,ceramic);for(const a of [-.2,.1,.3])shape(root,sphere,x+a,y+.65,z,.2,.45,.2,mat(0x66836a));}
 const lights=[];for(const [i,y] of [[0,.3],[1,H.upper]]){for(const [x,z] of [[-3.1,-2.8],[1.5,1.7]]){box(root,x,y+2.7,z,.65,.06,.65,metal);box(root,x,y+2.65,z,.55,.05,.55,lightMats[i]);}const light=new THREE.PointLight(0xffe4bd,12,13,2);light.position.set(H.x-.4,y+2.4,H.z-.7);light.castShadow=false;scene.add(light);lights.push(light);action('lights'+i,'Switch '+(i?'upstairs':'downstairs')+' lights',i?2.9:3.35,i?-1.4:4.25,i);}
 plate('WELCOME HOME',2.65,1.5,5.78,1.1,.28);plate('101',.95,2.0,6.08,.45,.25);
 function slideMirror(){return new THREE.MeshPhysicalMaterial({color:0xb6c5bd,metalness:.9,roughness:.13,envMapIntensity:.8});}
 function syncDoor(d){d.g.rotation.y=d.angle;root.updateMatrixWorld(true);const bounds=new THREE.Box3().setFromObject(d.leaf,true);Object.assign(d.collider,{minX:bounds.min.x,maxX:bounds.max.x,minZ:bounds.min.z,maxZ:bounds.max.z});}
 function inSwing(d,p){if(Math.abs((p.y||0)-d.y)>1.7)return false;const q=houseLocal(p),dx=d.axis==='x'?d.w:0,dz=d.axis==='z'?d.direction*d.w:0,angle=d.sign*Math.PI/2,ox=dx*Math.cos(angle)+dz*Math.sin(angle),oz=-dx*Math.sin(angle)+dz*Math.cos(angle);return q.x>d.x+Math.min(0,dx,ox)-.5&&q.x<d.x+Math.max(0,dx,ox)+.5&&q.z>d.z+Math.min(0,dz,oz)-.5&&q.z<d.z+Math.max(0,dz,oz)+.5;}
 function update(dt=0,position=null,instant=false){tvTime+=Math.max(0,dt);for(const d of doors){if(!state[d.id]&&Math.abs(d.angle)>.02&&position&&inSwing(d,position))state[d.id]=true;const goal=state[d.id]?d.sign*Math.PI/2:0;d.angle=instant?goal:dt?THREE.MathUtils.damp(d.angle,goal,9,dt):d.angle;syncDoor(d);}
  for(const m of moving){if(m.rotation)m.mesh.rotation.y=state[m.key]?m.base+m.delta:m.base;else m.mesh.position[m.axis]=m.base+(state[m.key]?m.delta:0);}
  stream.visible=state.tap;shower.visible=state.shower;if(state.washer)drum.rotation.z+=dt*3;
  for(const b of beds){b.duvet.rotation.z=state[b.id]?0:.09;b.duvet.position.z=state[b.id]?.2:.5;}for(const c of curtains)c.scale.x=state.curtains?.45:1.1;
  deskGlow.visible=state.desk;for(const [i,l] of lights.entries()){lightMats[i].color.setHex(state['lights'+i]?0xffe4a9:0x5d6257);l.visible=!!position&&houseInside(position)&&Math.abs((position.y||0)-(i?H.upper:.3))<1.8&&state['lights'+i];}
  tvClock+=dt;if(!dt||state.tv&&position&&houseInside(position)&&tvClock>.5){tvClock=0;tvPicture();}
 }
 function blocked(x,z,y=.3,ignore=null){return colliders.some(o=>o.fixtureId!==ignore&&houseObstacleBlocks(o,x,z,y));}
 function nearest(p){const level=(p.y||0)>H.upper-.65?1:0;const near=actions.filter(a=>a.floor===level&&Math.hypot(a.x-p.x,a.z-p.z)<(a.radius||1.65)&&Math.abs(a.y-(p.y||0))<1.35&&clear(p,a,a.kind==='door'?a.id:null));return near.sort((a,b)=>Math.hypot(a.x-p.x,a.z-p.z)-Math.hypot(b.x-p.x,b.z-p.z))[0]||null;}
 function clear(a,b,ignore=null){const distance=Math.hypot(b.x-a.x,b.z-a.z),n=Math.max(1,Math.ceil(distance/.2));for(let i=0;i<=n;i++)if(blocked(a.x+(b.x-a.x)*i/n,a.z+(b.z-a.z)*i/n,a.y||.3,ignore))return false;return true;}
 function act(id,p){const a=actions.find(a=>a.id===id);if(!a||!p||Math.hypot(a.x-p.x,a.z-p.z)>(a.radius||1.65)||Math.abs(a.y-(p.y||0))>1.35||!clear(p,a,a.kind==='door'?id:null))return {ok:false,message:'Move closer to this object.'};
  if(a.kind==='seat'||a.kind==='bed')return {ok:true,seat:a.seat,bed:a.kind==='bed',action:a};if(a.kind==='wardrobe')return {ok:true,wardrobe:true};if(a.kind==='read')return {ok:true,message:a.message};
  if(a.kind==='door'&&state[id]&&inSwing(a.door,p))return {ok:false,message:'Step clear of the doorway before closing it.'};
  if(id==='tv'){if(!state.tv){state.tv=true;state.channel=0;}else if(state.channel<2)state.channel++;else state.tv=false;}else state[id]=!state[id];
  update(0,p);return {ok:true,message:id==='tv'?(state.tv?['Nature on TV','City stories on TV','Garden time on TV'][state.channel]:'TV switched off'):a.kind==='door'?(state[id]?'Door opened. Walk inside.':'Door closed.'):a.title+' · '+(state[id]?'on / open':'off / closed')};
 }
 function makeBed(id){if(!beds.some(b=>b.id===id))return false;state[id]=!state[id];update(0);return state[id];}
 function serialize(p){return {...state,visit:p&&houseInside(p)?{floor:(p.y||0)>H.upper-.65?1:0}:null};}
 function restore(value,p=null){state=restoreHouse(value);update(0,null,true);if(p&&houseInside(p)){referenceY=value?.propertyId===H.id&&value?.visit?.floor===1?H.upper:.3;let y=houseFloorAt(p.x,p.z,referenceY);if(blocked(p.x,p.z,y)){const q=referenceY>2?world(3.3,-1.3):world(2.68,3.7);return {...q,y:referenceY};}return {x:p.x,z:p.z,y};}return null;}
 function interior(p){if(!houseInside(p,.12))return null;return {minX:H.x-6.48,maxX:H.x+6.48,minZ:H.z-5.68,maxZ:H.z+5.68,ceiling:onHouseStairs(p)||p.y>2.8?6.4:3.24};}
 // Instance the actual static meshes by geometry/material. Exact world boxes
 // are retained before instancing so doors and the stairwell stay real gaps.
 root.updateMatrixWorld(true);const groups=new Map();root.traverse(m=>{if(!m.isMesh)return;for(let p=m;p&&p!==root;p=p.parent)if(p.userData.dynamicHouse)return;const k=m.geometry.uuid+':'+m.material.uuid+':'+m.castShadow;if(!groups.has(k))groups.set(k,[]);groups.get(k).push(m);});
 for(const sources of groups.values()){const first=sources[0],batch=new THREE.InstancedMesh(first.geometry,first.material,sources.length),boxes=[];batch.name='Maple House static details';batch.castShadow=first.castShadow;batch.receiveShadow=true;sources.forEach((m,i)=>{batch.setMatrixAt(i,m.matrixWorld);const b=new THREE.Box3().setFromObject(m,true);if(b.max.y-b.min.y>.03)boxes.push({minX:b.min.x,maxX:b.max.x,minY:b.min.y,maxY:b.max.y,minZ:b.min.z,maxZ:b.max.z});m.removeFromParent();});batch.userData.architectureBoxes=boxes;batch.computeBoundingSphere();scene.add(batch);batches.push(batch);}
 update(0);return {property:H,root,actions,seats,beds,doors,colliders,batches,nearest,act,makeBed,serialize,restore,update,blocked,interior,floorAt:(x,z,y=referenceY)=>houseFloorAt(x,z,y),surface:p=>houseInside(p)?(houseLocal(p).x>-.5&&houseLocal(p).x<2.2&&houseLocal(p).z<-2.4&&p.y>2.8?'concrete':'wood'):null,get state(){return {...state};},get referenceY(){return referenceY;},set referenceY(y){referenceY=Number.isFinite(y)?y:.3;}};
}
