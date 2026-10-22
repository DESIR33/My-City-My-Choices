import * as THREE from 'three';
import {NORTH_CITY,NORTH_MOTORS,RIVER,BRIDGE,TOWERS,CITY_BLOCKS,bridgeHeight,bridgePitch} from './world-rules.js';
export function createNorthWorld({scene,visualKit,cube,C,obstacles,buildings,car,traffic,trafficControllers,addCornerSignal,characters}){
  const unit=new THREE.BoxGeometry(1,1,1),batches=new Map(),dummy=new THREE.Object3D();
  const mat=(color,roughness=.7,metalness=0)=>new THREE.MeshStandardMaterial({color,roughness,metalness});
  const stone=visualKit.masonry?.(0xb7afa0)||mat(0xb7afa0),dark=mat(0x293d47,.36,.5),silver=mat(0x7f9198,.35,.65),gold=mat(0x9c8354,.4,.5),glass=[0x55707b,0x6e858c,0x536771].map(c=>new THREE.MeshPhysicalMaterial({color:c,roughness:.16,metalness:.05,clearcoat:1,ior:1.5,envMapIntensity:1.15})),brick=[0x794536,0x8e6247,0x4c605b].map(c=>visualKit.brick?.(c)||mat(c)),warm=new THREE.MeshStandardMaterial({color:0xc6b183,emissive:0x6d4c20,emissiveIntensity:.3,roughness:.38}),white=mat(0xdbd2ba),roadPaint=mat(0xdfc36d),rail=mat(0x344d52,.45,.65);
  function box(material,x,y,z,w,h,d,rotation=0){if(!batches.has(material))batches.set(material,[]);batches.get(material).push({x,y:y+h/2,z,w,h,d,rotation});}
  function solid(x,z,w,d){obstacles.push({minX:x-w/2,maxX:x+w/2,minZ:z-d/2,maxZ:z+d/2});}
  function label(text,x,y,z,w=8,h=.85,color='#1c3541'){
    const canvas=document.createElement('canvas');canvas.width=1024;canvas.height=128;const ctx=canvas.getContext('2d');ctx.fillStyle=color;ctx.fillRect(0,0,1024,128);ctx.fillStyle='#f8e9c8';ctx.font='bold 54px Arial';ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText(text,512,66,990);const map=new THREE.CanvasTexture(canvas);map.colorSpace=THREE.SRGBColorSpace;const mesh=new THREE.Mesh(new THREE.PlaneGeometry(w,h),new THREE.MeshStandardMaterial({map,roughness:.8,side:THREE.DoubleSide}));mesh.position.set(x,y,z);scene.add(mesh);return mesh;
  }
  // Two banks leave the full river channel open under the elevated crossing.
  cube(scene,0,-.42,225,1800,.35,1550,C.grass,false); // south bank ends at the new coastline: -550 … 1000
  cube(scene,0,-.42,-1735,1800,.35,1930,C.grass,false); // north bank: -2700 … -770
  const waterGeometry=new THREE.PlaneGeometry(1800,220,90,18),positions=waterGeometry.attributes.position;
  for(let i=0;i<positions.count;i++)positions.setZ(i,.045*Math.sin(positions.getX(i)*.17+positions.getY(i)*.11));waterGeometry.computeVertexNormals();
  const water=new THREE.Mesh(waterGeometry,new THREE.MeshPhysicalMaterial({color:0x245d70,metalness:.35,roughness:.27,clearcoat:1,clearcoatRoughness:.2}));water.rotation.x=-Math.PI/2;water.position.set(0,RIVER.waterLevel,-660);water.receiveShadow=true;water.name='Rivergate River';scene.add(water);
  for(const z of [RIVER.south,RIVER.north]){box(stone,0,-2,z,1800,1.92,3);for(let x=-180;x<=180;x+=45)if(Math.abs(x)>20)scene.add(visualKit.treeModel(x,z+(z===RIVER.south?12:-12),1.1));}
  // One sampled road skin sits above the structural slab. Never put the slab's
  // top at the asphalt's height: coplanar surfaces flicker severely at distance.
  const bridgeSurfaces=[],markings=[],supports=[],sampleZ=(from,to)=>{const n=Math.ceil(Math.abs(to-from));return Array.from({length:n+1},(_,i)=>from+(to-from)*i/n);};
  function strip(x,width,raised,material,from=BRIDGE.south,to=BRIDGE.north,name='Bridge road'){
    const verts=[],uv=[],indices=[],zs=sampleZ(from,to);
    for(const z of zs){const y=bridgeHeight(z)+raised;verts.push(x-width/2,y,z,x+width/2,y,z);uv.push((x-width/2)/6,z/6,(x+width/2)/6,z/6);}
    for(let i=0;i<zs.length-1;i++){const k=i*2;indices.push(k,k+1,k+2,k+1,k+3,k+2);}
    const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(verts,3));g.setAttribute('uv',new THREE.Float32BufferAttribute(uv,2));g.setIndex(indices);g.computeVertexNormals();
    const m=new THREE.Mesh(g,material);m.name=name;m.receiveShadow=true;m.castShadow=false;scene.add(m);return m;
  }
  function volume(from,to,halfWidth,topAt,bottomAt,name){
    const zs=sampleZ(from,to),verts=[],indices=[];
    for(const z of zs)verts.push(-halfWidth,topAt(z),z,halfWidth,topAt(z),z,-halfWidth,bottomAt(z),z,halfWidth,bottomAt(z),z);
    for(let i=0;i<zs.length-1;i++){const k=i*4;indices.push(k,k+1,k+4,k+1,k+5,k+4,k+2,k+6,k+3,k+3,k+6,k+7,k,k+4,k+2,k+2,k+4,k+6,k+1,k+3,k+5,k+3,k+7,k+5);}
    const last=(zs.length-1)*4;indices.push(0,2,1,1,2,3,last,last+1,last+2,last+1,last+3,last+2);
    const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(verts,3));g.setIndex(indices);g.computeVertexNormals();const m=new THREE.Mesh(g,stone);m.name=name;m.castShadow=m.receiveShadow=true;scene.add(m);supports.push(m);return m;
  }
  for(const [from,to] of [[-165,BRIDGE.south],[BRIDGE.north,-1150]]){const center=(from+to)/2,length=Math.abs(to-from);cube(scene,0,.01,center,15,.05,length,C.road,false);for(const s of [-1,1])cube(scene,s*9.3,.07,center,3,.14,length,C.walk,false);}
  const bridgeAsphalt=visualKit.pbr?.surface('asphalt',0x3d4448)||C.road.clone();bridgeAsphalt.polygonOffset=true;bridgeAsphalt.polygonOffsetFactor=-1;bridgeAsphalt.polygonOffsetUnits=-2;
  bridgeSurfaces.push(strip(0,15,0,bridgeAsphalt));
  for(const s of [-1,1]){
    bridgeSurfaces.push(strip(s*9.3,3,.15,C.walk,BRIDGE.south,BRIDGE.north,'Bridge footpath'));
    volume(BRIDGE.south,BRIDGE.north,.15,z=>bridgeHeight(z)+.15,z=>bridgeHeight(z)-.045,'Bridge curb').position.x=s*7.65;
  }
  volume(BRIDGE.south,BRIDGE.north,12.2,z=>bridgeHeight(z)-.06,z=>bridgeHeight(z)-.8,'Bridge structural deck');
  for(const [a,b] of [[BRIDGE.south,RIVER.south],[RIVER.north,BRIDGE.north]])volume(a,b,12.2,z=>bridgeHeight(z)-.8,()=>-2.2,'Bridge approach abutment');
  for(const z of [RIVER.south,RIVER.north]){box(stone,0,6.5,z,26,.65,4);for(const s of [-1,1]){box(stone,s*12.2,-3,z,1.4,33,4);box(stone,s*12.2,30,z,1.8,1.1,4.3);}}
  function beam(a,b,width,material){const v=new THREE.Vector3().subVectors(b,a),length=v.length();if(!batches.has(material))batches.set(material,[]);batches.get(material).push({x:(a.x+b.x)/2,y:(a.y+b.y)/2,z:(a.z+b.z)/2,w:width,h:length,d:width,quaternion:new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0,1,0),v.normalize())});}
  for(const s of [-1,1]){
    for(const [end,anchor] of [[RIVER.south,BRIDGE.south],[RIVER.north,BRIDGE.north]]){beam(new THREE.Vector3(s*12.2,29,end),new THREE.Vector3(s*12.2,.8,anchor),.15,silver);box(stone,s*12.2,-.07,anchor,2,1,3);}
    for(let z=BRIDGE.south;z>=BRIDGE.north;z-=4){const y=bridgeHeight(z)+.15;box(rail,s*11,y,z,.1,1.25,.1);}
    for(let z=BRIDGE.south;z>BRIDGE.north;z-=4){const end=Math.max(BRIDGE.north,z-4);beam(new THREE.Vector3(s*11,bridgeHeight(z)+1.4,z),new THREE.Vector3(s*11,bridgeHeight(end)+1.4,end),.11,rail);}
    for(let z=RIVER.south;z>=RIVER.north;z-=10){const sag=14+15*Math.pow((z+660)/110,2);beam(new THREE.Vector3(s*12.2,8,z),new THREE.Vector3(s*12.2,sag,z),.05,silver);if(z>RIVER.north){const next=z-10,nextY=14+15*Math.pow((next+660)/110,2);beam(new THREE.Vector3(s*12.2,sag,z),new THREE.Vector3(s*12.2,nextY,next),.14,silver);}}
    solid(s*11,(BRIDGE.south+BRIDGE.north)/2,.2,BRIDGE.south-BRIDGE.north);
  }
  // Paint follows the same sampled profile, including each end of every dash.
  // Polygon offset keeps paint legible without adding a second road surface.
  const yellowPaint=roadPaint.clone(),edgePaint=white.clone();for(const paint of [yellowPaint,edgePaint]){paint.polygonOffset=true;paint.polygonOffsetFactor=-2;paint.polygonOffsetUnits=-4;}
  for(let z=-175;z>-1140;z-=12)for(const s of [-1,1])markings.push(strip(s*.15,.11,.018,yellowPaint,z,z-5,'North Road center dash'));
  for(const s of [-1,1])markings.push(strip(s*7.1,.12,.018,edgePaint,-165,-1150,'North Road edge line'));
  // Keep the shaped paint and hundreds of railing/cable segments inexpensive.
  // Two paint meshes retain the exact sampled surfaces instead of one draw per dash.
  const paintParts=markings.splice(0);
  for(const material of [yellowPaint,edgePaint]){
    const positions=[],uvs=[],indices=[];
    for(const mesh of paintParts.filter(m=>m.material===material)){const g=mesh.geometry,offset=positions.length/3;positions.push(...g.attributes.position.array);uvs.push(...g.attributes.uv.array);indices.push(...Array.from(g.index.array,n=>n+offset));scene.remove(mesh);g.dispose();}
    const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));g.setAttribute('uv',new THREE.Float32BufferAttribute(uvs,2));g.setIndex(indices);g.computeVertexNormals();const mesh=new THREE.Mesh(g,material);mesh.name='North Road paint batch';mesh.receiveShadow=true;scene.add(mesh);markings.push(mesh);
  }
  visualKit.atmosphere.registerGlow(warm,{day:.05,night:1.35});
  const lampGlow=new THREE.MeshStandardMaterial({color:0xffe4b0,emissive:0xffd39a,emissiveIntensity:.1,roughness:.35});
  visualKit.atmosphere.registerGlow(lampGlow,{day:.1,night:2.4});
  function lamp(x,z,y=.21){const inward=x>0?-1:1;box(rail,x,y,z,.22,.22,.22);box(rail,x,y+.22,z,.09,7.3,.09);box(rail,x+inward*1.2,y+7.4,z,2.5,.09,.09);box(lampGlow,x+inward*2.3,y+7.25,z,.65,.15,.33);visualKit.atmosphere.addStreetLight({x:x+inward*2.3,y:y+7.25,z,groundY:y+.02,pitch:bridgePitch(0,z,0)});}
  for(let z=-210;z>-1130;z-=48)for(const s of [-1,1])lamp(s*10.3,z,bridgeHeight(z)+.15);
  for(const z of [-190,-450,-850,-1100]){const y=bridgeHeight(z);for(const x of [-7.7,7.7])box(rail,x,y,z,.13,6.9,.13);box(rail,0,y+6.9,z,15.6,.14,.14);box(dark,0,y+5.4,z,12,1.5,.2);label(z>-550?'NORTHSTAR CITY  ↑':'NORTHSTAR CITY  •  NEXT LEFT / RIGHT',0,y+6.12,z+.12,11.5,1.2);}
  // Broad avenues and short, uninterrupted blocks make the city readable on foot.
  for(const x of NORTH_CITY.avenues)cube(scene,x,.01,-1462.5,15,.05,665,C.road,false);
  for(const z of NORTH_CITY.streets)cube(scene,0,.01,z,480,.05,15,C.road,false);
  for(const x of NORTH_CITY.avenues)for(const s of [-1,1]){let start=-1795;for(const z of [...NORTH_CITY.streets,-1130]){if(z-8.5>start)cube(scene,x+s*9.3,.07,(start+z-8.5)/2,3,.14,z-8.5-start,C.walk,false);start=z+8.5;}}
  for(const z of NORTH_CITY.streets)for(const s of [-1,1]){let start=-240;for(const x of [...NORTH_CITY.avenues,240]){if(x-8.5>start)cube(scene,(start+x-8.5)/2,.07,z+s*9.3,x-8.5-start,.14,3,C.walk,false);start=x+8.5;}}
  for(const x of NORTH_CITY.avenues)for(const z of NORTH_CITY.streets){const controller={ix:x,iz:z,offset:(Math.abs(x+z)%5),heads:[],pedestrians:[]};trafficControllers.push(controller);for(const [sx,sz] of [[1,1],[-1,-1],[1,-1],[-1,1]])addCornerSignal(x,z,sx,sz,controller);for(const s of [-1,1])for(let k=-5;k<=5;k++){box(white,x+k*1.3,.063,z+s*8.3,.55,.015,3);box(white,x+s*8.3,.063,z+k*1.3,3,.015,.55);}}
  for(const x of NORTH_CITY.avenues)for(let z=-1780;z<-1135;z+=12)if(!NORTH_CITY.streets.some(n=>Math.abs(n-z)<12))for(const s of [-1,1])box(roadPaint,x+s*.15,.063,z,.11,.015,5);
  for(const z of NORTH_CITY.streets)for(let x=-230;x<235;x+=12)if(!NORTH_CITY.avenues.some(n=>Math.abs(n-x)<12))for(const s of [-1,1])box(roadPaint,x,.063,z+s*.15,5,.015,.11);
  for(const [i,t] of TOWERS.entries()){
    const {x,z,w,d,height}=t,podium=7.2,tier=height*.7;box(stone,x,-.07,z,w+4,.3,d+4);box(dark,x,.23,z,w+2,podium,d+2);box(glass[i%3],x,1,z+d/2+1.02,w-2,5,.08);box(silver,x,0,z+d/2+1.08,2.2,3.2,.1);box(gold,x,3.3,z+d/2+1.2,5,.2,.8);
    box(glass[i%3],x,podium,z,w,tier-podium,d);box(glass[(i+1)%3],x,tier,z,w-6,height-tier,d-6);
    for(let y=podium;y<height;y+=3.4){const upper=y>=tier,ww=w-(upper?6:0),dd=d-(upper?6:0);box(i%3===0?gold:silver,x,y,z,ww+.18,.16,dd+.18);for(const s of [-1,1])for(let k=-ww/2+2;k<ww/2;k+=3.2){box(dark,x+k,y,z+s*(dd/2+.06),.11,3.2,.12);if((Math.floor(y)+Math.floor(k)+i)%7===0)box(warm,x+k,y+.5,z+s*(dd/2+.13),1.6,2,.04);}for(const s of [-1,1])for(let k=-dd/2+2;k<dd/2;k+=3.2)box(dark,x+s*(ww/2+.06),y,z+k,.12,3.2,.11);}
    box(stone,x,height,z,w-5,.45,d-5);box(dark,x,height+.45,z,9,2.5,9);if(i%3===1){box(stone,x,height+3,z,5,7,5);box(silver,x,height+10,z,.25,9,.25);}label(t.name.toUpperCase(),x,4.5,z+d/2+1.15,w-3,1.1);
    solid(x,z,w+4,d+4);buildings.push({...t,skyscraper:true,shop:false});cube(scene,x,.07,z+d/2+8,4,.14,12,C.walk,false);
  }
  for(const [i,b] of CITY_BLOCKS.entries()){
    const {x,z,w,d,height}=b;box(brick[i%3],x,.1,z,w,height,d);box(stone,x,height,z,w+.5,.35,d+.5);box(dark,x,.3,z+d/2+.1,w-1,2.7,.16);for(const s of [-1,1])box(glass[i%3],x+s*w*.27,.7,z+d/2+.2,w*.32,2,.06);box(gold,x,3.3,z+d/2+.7,w,.22,1.4);
    for(let y=4.3;y<height-1;y+=3.2)for(let wx=-w/2+2;wx<w/2;wx+=3.1){box(stone,x+wx,y-.15,z+d/2+.1,1.7,1.9,.15);box((i+Math.round(y))%3===0?warm:glass[i%3],x+wx,y,z+d/2+.2,1.4,1.6,.05);}label(b.name,x,3.75,z+d/2+.22,w-1,.7);solid(x,z,w,d);buildings.push({...b,shop:false});cube(scene,x,.07,z+d/2+4,2,.14,8,C.walk,false);
    if(i%5===0)for(const side of [-1,1]){box(rail,x+side*6,height,z, .12,3,.12);box(rail,x+side*6,height+3,z,1.4,.12,.12);}
  }
  // A civic hall and an arched railway terminal break up the commercial skyline.
  box(stone,220,.1,-1450,28,13,44);box(stone,220,13.1,-1450,30,.45,46);
  for(const x of [210,215,225,230]){box(stone,x,.1,-1425,.8,9,.8);box(stone,x-.2,9.1,-1425,1.2,.35,1.2);}box(stone,220,9.45,-1425,30,.5,3);box(dark,220,.25,-1427.9,4,5,.12);label('NORTHSTAR CITY HALL',220,10.9,-1427.8,26,1.1);solid(220,-1450,28,44);buildings.push({x:220,z:-1450,w:28,d:44,shop:false,height:13.55});cube(scene,220,.07,-1413,4,.14,26,C.walk,false);
  box(brick[0],-220,.1,-1330,28,13,44);box(stone,-220,13.1,-1330,29,.4,45);box(glass[1],-220,3,-1307.9,22,7,.1);for(const x of [-229,-223,-217,-211])box(stone,x,3,-1307.8,.35,7,.3);label('UNION TERMINAL',-220,11.4,-1307.7,25,1);solid(-220,-1330,28,44);buildings.push({x:-220,z:-1330,w:28,d:44,shop:false,height:13.5});cube(scene,-220,.07,-1293,4,.14,26,C.walk,false);
  // A roadside service stop gives a long-distance driver a place to refuel.
  box(brick[2],220,.1,-1210,22,8,20);box(stone,220,8.1,-1210,23,.4,21);label('NORTHSTAR MOTORS',220,4,-1199.9,20,1);solid(220,-1210,22,20);buildings.push({x:220,z:-1210,w:22,d:20,height:8.5,shop:false});
  cube(scene,201,.07,-1177,22,.14,16,C.walk,false);for(const z of [-1182,-1172]){box(rail,194,.21,z,.13,3.9,.13);box(rail,204,.21,z,.13,3.9,.13);}box(gold,199,4.11,-1177,13,.3,14);box(stone,194,.21,-1177,1.1,1.4,.65);box(dark,194,1.61,-1177,.85,.6,.5);solid(194,-1177,1.1,.65);label('FUEL & SERVICE',199,4.25,-1169.9,12,.7);
  // Street trees occupy block interiors and never overlap a road or an entrance.
  for(const t of TOWERS)for(const s of [-1,1])scene.add(visualKit.treeModel(t.x+s*40,t.z-30,.95));
  for(let x=-228;x<=228;x+=38){scene.add(visualKit.treeModel(x,-1780,1));scene.add(visualKit.treeModel(x,-1120,1));}
  for(const z of NORTH_CITY.streets)for(const x of [-222,-94,26,214])lamp(x,z-10.5);
  // CPU cars stay within their own district instead of wrapping back to Maple Street.
  for(let i=0;i<4;i++){const x=NORTH_CITY.avenues[i],speed=i%2?-8:8;car(x+(speed>0?-2.4:2.4),-1700+i*94,[0x293f51,0x8f4336,0xb8aea0,0xd3a43a][i],speed>0?0:Math.PI,true,speed);Object.assign(traffic.at(-1),{min:-1790,max:-1136});}
  for(let i=0;i<6;i++){const z=NORTH_CITY.streets[i],speed=i%2?-7:7;car(-210+i*64,z+(speed>0?2.4:-2.4),[0xd1a82f,0x455965,0x974e35][i%3],speed>0?Math.PI/2:-Math.PI/2,true,speed,'x');Object.assign(traffic.at(-1),{min:-235,max:235});}
  for(const x of [-2.4,2.4]){const speed=x<0?11:-11;car(x,x<0?-380:-940,0x466b72,speed>0?0:Math.PI,true,speed);Object.assign(traffic.at(-1),{min:-1134,max:-176});}
  for(let i=0;i<8;i++){const t=TOWERS[i*2];characters.create({x:t.x-24,z:t.z+44,model:'crowd'});}
  for(const [material,items] of batches){const mesh=new THREE.InstancedMesh(unit,material,items.length);for(const [i,p] of items.entries()){dummy.position.set(p.x,p.y,p.z);dummy.rotation.set(0,p.rotation||0,0);if(p.quaternion)dummy.quaternion.copy(p.quaternion);dummy.scale.set(p.w,p.h,p.d);dummy.updateMatrix();mesh.setMatrixAt(i,dummy.matrix);}mesh.castShadow=mesh.receiveShadow=true;mesh.computeBoundingSphere();mesh.name='Northstar city architecture';scene.add(mesh);}
  return {towers:TOWERS,buildings:CITY_BLOCKS,water,bridge:{surfaces:bridgeSurfaces,markings,supports}};
}
