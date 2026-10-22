import * as THREE from 'three';
import {MAPLE_COMMONS,withinRect} from './world-rules.js';

// The slide is a continuous walking surface. Step treads are also registered
// individually so normal walking/jumping uses the actual play structure.
export function plazaGroundHeight(x,z){
 const p=MAPLE_COMMONS.platform,s=MAPLE_COMMONS.slide;
 if(withinRect(x,z,p))return p.top;
 if(withinRect(x,z,s))return s.low+(s.maxX-x)/(s.maxX-s.minX)*(s.high-s.low);
 return -.07;
}

export function createCommunityPlaza({scene,visualKit,obstacles,groundSurfaces,seats,characters}){
 const site=MAPLE_COMMONS,root=new THREE.Group();root.name='Maple Commons gathering plaza';root.userData.staticArchitecture=true;scene.add(root);
 const unit=new THREE.BoxGeometry(1,1,1),round=new THREE.CylinderGeometry(1,1,1,12),ball=new THREE.SphereGeometry(1,8,6);
 const wood=visualKit.wood(0x9d8062),brick=visualKit.brick(0x9a735b),pavers=visualKit.masonry(0xcbbb9d),roof=visualKit.roofing(0x3a403d);
 const metal=new THREE.MeshStandardMaterial({color:0x303b37,metalness:.55,roughness:.56}),rubber=new THREE.MeshStandardMaterial({color:0xb08c70,roughness:1}),joint=new THREE.MeshStandardMaterial({color:0x9e917c,roughness:1}),foliage=new THREE.MeshStandardMaterial({color:0x75865a,roughness:1});
 const slideMat=new THREE.MeshStandardMaterial({color:0xc1c8bf,metalness:.55,roughness:.36}),glow=new THREE.MeshStandardMaterial({color:0xffe3ac,emissive:0xffc477,emissiveIntensity:.05,roughness:.4});
 visualKit.atmosphere.registerGlow(glow,{day:.04,night:2.2});
 const features=[],plazaSeats=[],plantings=[];
 function box(x,y,z,w,h,d,material=wood){const m=new THREE.Mesh(unit,material);m.position.set(x,y+h/2,z);m.scale.set(w,h,d);m.castShadow=h>.08;m.receiveShadow=true;root.add(m);return m;}
 function solid(x,z,w,d,kind){const b={minX:x-w/2,maxX:x+w/2,minZ:z-d/2,maxZ:z+d/2,kind:'commons-'+kind};obstacles.push(b);return b;}
 function surface(x,z,w,d,top,material,kind,bottom=.17){const m=box(x,bottom,z,w,top-bottom,d,material);m.castShadow=false;
  // The legacy grass texture uses mesh UVs rather than the PBR world shader.
  if(material===visualKit.grass){const g=unit.clone(),uv=g.attributes.uv,n=g.attributes.normal,p=g.attributes.position;for(let i=0;i<p.count;i++)uv.setXY(i,(Math.abs(n.getX(i))>.5?p.getZ(i)*d:p.getX(i)*w)/6,(Math.abs(n.getY(i))>.5?p.getZ(i)*d:p.getY(i)*(top-bottom))/6);m.geometry=g;}
  const s={minX:x-w/2,maxX:x+w/2,minZ:z-d/2,maxZ:z+d/2,top,kind};groundSurfaces.push(s);return s;}
 function rod(a,b,r,material=metal){const delta=new THREE.Vector3(...b).sub(new THREE.Vector3(...a)),m=new THREE.Mesh(round,material);m.position.copy(new THREE.Vector3(...a).add(new THREE.Vector3(...b)).multiplyScalar(.5));m.scale.set(r,delta.length(),r);m.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),delta.normalize());m.castShadow=true;m.receiveShadow=true;root.add(m);return m;}
 function label(text,x,y,z,w=5,h=.7){const c=document.createElement('canvas');c.width=768;c.height=128;const q=c.getContext('2d');q.fillStyle='#33463b';q.fillRect(0,0,768,128);q.fillStyle='#f4e9cd';q.font='600 60px Georgia';q.textAlign='center';q.textBaseline='middle';q.fillText(text,384,66,730);const map=new THREE.CanvasTexture(c);map.colorSpace=THREE.SRGBColorSpace;const m=new THREE.Mesh(new THREE.PlaneGeometry(w,h),new THREE.MeshStandardMaterial({map,roughness:.85}));m.position.set(x,y,z);root.add(m);return m;}
 surface(90,-19,39,17,.21,pavers,'concrete',.04);
 surface(site.lawn.x,site.lawn.z,site.lawn.w,site.lawn.d,.235,visualKit.grass,'grass',.212);
 surface(site.play.x,site.play.z,site.play.w,site.play.d,.24,rubber,'concrete',.212);
 // A light brick perimeter and concrete joints make the plaza read as a
 // pedestrian destination, with broad openings to all adjoining sidewalks.
 for(const x of [70.7,109.3])box(x,.21,-19,.22,.065,16.6,brick);
 box(90,.21,-27.3,38.6,.065,.22,brick);
 for(const [x,w] of [[78,14],[101,16]])box(x,.21,-10.7,w,.065,.22,brick);
 for(const x of [72,84,95,108])box(x,.211,-19,.022,.006,16.4,joint);
 for(const z of [-26.5,-16,-12])box(90,.211,z,38,.006,.022,joint);
 // Reclaimed-looking timber canopy, slim black hardware, and warm festoons.
 const pg=site.pergola;
 for(const x of [pg.x-4.6,pg.x+4.6])for(const z of [pg.z-2.9,pg.z+2.9]){
  box(x,.21,z,.24,3.4,.24);box(x,.21,z,.3,.14,.3,metal);solid(x,z,.32,.32,'pergola-post');
  box(x,3.16,z,.28,.44,.29,metal);
 }
 for(const z of [pg.z-3.1,pg.z+3.1])box(pg.x,3.55,z,10.2,.3,.2);
 for(const x of [pg.x-4.8,pg.x+4.8])box(x,3.55,pg.z,.2,.3,6.6);
 for(let x=pg.x-4.8;x<=pg.x+4.8;x+=.62)box(x,3.85,pg.z,.12,.16,7.1);
 for(const x of [pg.x-4.6,pg.x+4.6])for(const z of [pg.z-2.9,pg.z+2.9])rod([x,2.9,z],[x+(x<pg.x?.75:-.75),3.55,z],.065,wood);
 for(const z of [-24.5,-19.5]){
  let last=null;
  for(let i=0;i<=10;i++){const x=73.4+i*.92,y=3.54-.27*Math.sin(i/10*Math.PI);if(last)rod(last,[x,y,z],.012);last=[x,y,z];if(i%2===1){rod([x,y,z],[x,y-.13,z],.014);const bulb=new THREE.Mesh(ball,glow);bulb.position.set(x,y-.2,z);bulb.scale.set(.07,.1,.07);root.add(bulb);}}
 }
 features.push({kind:'pergola',...pg});
 function bench(x,z,heading=0,width=2.5){const g=new THREE.Group();g.position.set(x,.21,z);g.rotation.y=heading;root.add(g);
  function part(a,y,b,w,h,d,mat=wood){const m=new THREE.Mesh(unit,mat);m.position.set(a,y+h/2,b);m.scale.set(w,h,d);m.castShadow=m.receiveShadow=true;g.add(m);}
  for(const x of [-width*.38,width*.38])part(x,0,0,.08,.43,.5,metal);
  for(const z of [-.18,0,.18])part(0,.43,z,width,.09,.15);
  for(const x of [-width*.43,width*.43])part(x,.48,-.25,.06,.54,.06,metal);
  for(const y of [.63,.84])part(0,y,-.25,width,.16,.075);
  const w=Math.abs(Math.cos(heading))*width+Math.abs(Math.sin(heading))*.55,d=Math.abs(Math.sin(heading))*width+Math.abs(Math.cos(heading))*.55;solid(x,z,w,d,'bench');
  const seat={id:'commons-seat-'+plazaSeats.length,type:'bench',x,z,height:.52,heading,stand:{x:x-Math.sin(heading)*1.2,z:z-Math.cos(heading)*1.2}};seats.push(seat);plazaSeats.push(seat);return seat;
 }
 for(const x of [75.7,80.3]){
  for(let n=0;n<5;n++)box(x,.95,-22+(n-2)*.22,3.5,.1,.19);
  for(const side of [-1,1]){box(x+side*1.25,.21,-22,.09,.74,.75,metal);}
  solid(x,-22,3.5,1.1,'picnic-table');
  bench(x,-23.35,0,3.2);bench(x,-20.65,Math.PI,3.2);
 }
 bench(86,-14.3,0,2.5);bench(93.1,-14.3,0,2.5);
 // Low planting beds stay at the corners, clear of entrances and play routes.
 for(const [x,z] of [[71.7,-25.8],[108.2,-25.8],[71.7,-12.5],[108.2,-12.5]]){
  box(x,.21,z,1.6,.38,1.6,brick);box(x,.59,z,1.45,.025,1.45,joint);solid(x,z,1.65,1.65,'planter');
  for(const side of [-1,1]){const m=new THREE.Mesh(ball,foliage);m.position.set(x+side*.28,.83,z);m.scale.set(.5,.43,.5);root.add(m);}plantings.push({x,z});
 }
 // A timber play tower, broad stair and stainless slide; rails enclose its
 // high sides while the stair and slide openings remain physically accessible.
 const platform=site.platform;
 surface(101,-23,2.4,2.4,platform.top,wood,'wood',1.25);
 for(const x of [99.9,102.1])for(const z of [-24.1,-21.9]){box(x,.24,z,.16,2.7,.16);solid(x,z,.18,.18,'tower-post');}
 box(101,1.43,-24.15,2.4,.72,.1);solid(101,-24.15,2.4,.1,'tower-rail');
 box(99.85,1.43,-23,.1,.72,2.4);solid(99.85,-23,.1,2.4,'tower-rail');
 for(const x of [100,102]){box(x,1.43,-21.85,.35,.72,.1);solid(x,-21.85,.35,.1,'tower-rail');}
 for(const z of [-24.05,-21.95])box(102.15,1.43,z,.1,.72,.25);
 for(const side of [-1,1]){const m=box(101+side*.7,3.0,-23,1.65,.12,3,roof);m.rotation.z=-side*.35;}
 for(let i=0;i<6;i++){const z=-19.05-i*.5,top=.41+i*.2;surface(101,z,1.25,.5,top,wood,'wood',.24);}
 const s=site.slide,length=s.maxX-s.minX,drop=s.high-s.low,midX=(s.minX+s.maxX)/2,midY=(s.high+s.low)/2;
 const ramp=box(midX,midY-.05,-23,Math.hypot(length,drop),.07,1.6,slideMat);ramp.rotation.z=-Math.atan2(drop,length);
 for(const z of [-23.86,-22.14]){const side=box(midX,midY+.04,z,Math.hypot(length,drop),.23,.1,slideMat);side.rotation.z=ramp.rotation.z;solid(midX,z,length,.1,'slide-edge');}
 groundSurfaces.push({...s,top:.24,kind:'concrete'});
 features.push({kind:'play-tower',x:101,z:-23,top:platform.top},{kind:'slide',...s});
 for(const [i,x] of [98,100,102,104].entries()){
  const height=[.16,.3,.42,.24][i],m=new THREE.Mesh(round,wood);m.position.set(x,.24+height/2,-14.7);m.scale.set(.37,height,.37);m.castShadow=m.receiveShadow=true;root.add(m);
  groundSurfaces.push({minX:x-.3,maxX:x+.3,minZ:-15,maxZ:-14.4,top:.24+height,kind:'wood'});
 }
 // A wall sign faces the street; its shallow plinth leaves the central path open.
 box(90,.21,-26.9,5,.65,.35,brick);label('MAPLE COMMONS',90,.69,-26.71,4.65,.5);
 for(const x of [84.9,95.1]){box(x,.21,-12.1,.07,3.8,.07,metal);box(x,3.92,-12.1,.5,.15,.5,metal);box(x,3.84,-12.1,.4,.08,.4,glow);solid(x,-12.1,.12,.12,'lamp');visualKit.atmosphere.addStreetLight({x,y:3.84,z:-12.1,groundY:.21});}
 // Existing character and seat systems supply people without a new simulation.
 const neighbors=[];
 if(characters){for(const [i,seat] of [plazaSeats[0],plazaSeats[3]].entries()){
  const actor=characters.create({x:seat.x,z:seat.z,shirt:i?0xa18166:0x657d6c,model:'crowd',scale:.96});actor.rotation.y=seat.heading;characters.setSeated(actor,{height:seat.height});seat.occupiedBy='commons-neighbor-'+i;neighbors.push(actor);
 }// Kids around the play area; crowd children rotate through the Rocketbox kids.
 for(const [x,z,heading] of [[106.6,-17.1,-Math.PI/2],[104.2,-15.4,Math.PI*.8],[107.9,-19.6,-Math.PI*.3]]){const child=characters.create({x,z,shirt:0xc7a45f,model:'crowd-child',scale:.85});child.rotation.y=heading;neighbors.push(child);}}
 return {site,root,features,seats:plazaSeats,plantings,neighbors};
}
