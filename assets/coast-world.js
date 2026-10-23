import * as THREE from 'three';
import {createFlamingoHotel} from './flamingo-hotel.js';
import {createPalmGrove} from './palm-trees.js';
import {COAST_CITY,COAST_BUILDINGS,COAST_MOTORS,COAST_INFO,coastGroundHeight} from './world-rules.js';

// Original procedural architecture and palms; no external imagery or models.
export function createCoastWorld({scene,visualKit,cube,C,obstacles,buildings,car,traffic,trafficControllers,addCornerSignal,addCrossingPedestrian,characters,seats,groundSurfaces,groundHeight=coastGroundHeight,mobile=false}) {
  const batches=new Map(),unit=new THREE.BoxGeometry(1,1,1),dummy=new THREE.Object3D();
  const mat=(color,roughness=.8,metalness=0)=>new THREE.MeshStandardMaterial({color,roughness,metalness});
  const stucco=[0xf0beb3,0xaad6ce,0xf2dcac,0xbcc6e4,0xe0becf,0xf1e8d5].map(color=>visualKit.stucco?.(color)||mat(color));
  const trim=mat(0xf1ecd8),dark=mat(0x263c46,.48,.25),metal=mat(0xa8b6b5,.36,.75),wood=visualKit.wood?.(0x9e8053)||mat(0x9e8053),paint=mat(0xe7d9aa),paving=visualKit.pbr?.surface('concrete',0xcdbf9e)||mat(0xcdbf9e);
  paving.userData.walkSurface=true;
  const glass=visualKit.windowMaterial(3),warm=mat(0xffd6a4);
  visualKit.atmosphere.registerGlow(warm,{day:.03,night:1.5,color:0xffbd76});
  const neons=[0x56e8d3,0xf07bac,0xffc980,0xa49bff].map(color=>{
    const m=mat(color,.3);visualKit.atmosphere.registerGlow(m,{day:.12,night:2.2,color});return m;
  });
  const lampGlow=mat(0xffe9c2,.3);visualKit.atmosphere.registerGlow(lampGlow,{day:.1,night:2.4,color:0xffda9b});
  function box(m,x,y,z,w,h,d,rotation=0){if(!batches.has(m))batches.set(m,[]);batches.get(m).push({x,y:y+h/2,z,w,h,d,rotation});}
  function solid(x,z,w,d,kind='coast'){obstacles.push({minX:x-w/2,maxX:x+w/2,minZ:z-d/2,maxZ:z+d/2,coastal:true,kind});}
  function sign(text,x,y,z,w=8,h=1,yaw=0,color='#193b48') {
    const canvas=document.createElement('canvas');canvas.width=512;canvas.height=96;
    const q=canvas.getContext('2d');q.fillStyle=color;q.fillRect(0,0,512,96);q.fillStyle='#fff0d1';q.font='bold 36px sans-serif';q.textAlign='center';q.textBaseline='middle';q.fillText(text,256,49,490);
    const texture=new THREE.CanvasTexture(canvas);texture.colorSpace=THREE.SRGBColorSpace;
    const material=new THREE.MeshStandardMaterial({map:texture,emissiveMap:texture,emissive:0xffffff,roughness:.65,side:THREE.DoubleSide});
    visualKit.atmosphere.registerGlow(material,{day:.06,night:.8});
    const mesh=new THREE.Mesh(new THREE.PlaneGeometry(w,h),material);mesh.position.set(x,y,z);mesh.rotation.y=yaw;scene.add(mesh);return mesh;
  }
  // The earlier southern grass plane ends at z=1000. Mainland stays inland,
  // leaving the actual ocean open rather than hiding water below green land.
  // West of x=-300 the ground belongs to Ronda's plateau (ronda-world.js).
  cube(scene,-134,-.42,1800,332,.35,1600,C.grass,false);
  cube(scene,0,.01,622.5,15,.05,915,C.road,false);
  for(const side of [-1,1])cube(scene,side*9.3,.07,602.5,3,.14,875,C.walk,false);
  for(const x of COAST_CITY.avenues)cube(scene,x,.01,1560,15,.05,1040,C.road,false);
  for(const z of COAST_CITY.streets)cube(scene,-122.25,.01,z,259.5,.05,15,C.road,false);
  for(const x of COAST_CITY.avenues)for(const side of [-1,1]) {
    let start=1040;for(const z of [...COAST_CITY.streets,2090]){if(z-8.5>start)cube(scene,x+side*9.3,.07,(start+z-8.5)/2,3,.14,z-8.5-start,C.walk,false);start=z+8.5;}
  }
  for(const z of COAST_CITY.streets)for(const side of [-1,1]) {
    let start=-252;for(const x of [...COAST_CITY.avenues,7.5]){if(x-8.5>start)cube(scene,(start+x-8.5)/2,.07,z+side*9.3,x-8.5-start,.14,3,C.walk,false);start=x+8.5;}
  }
  cube(scene,23,.07,1560,12,.14,1040,paving,false);
  cube(scene,31,.07,1560,4,.14,1040,paving,false);
  for(const z of COAST_CITY.streets)cube(scene,20,.07,z,26,.14,5,paving,false);
  for(let z=180;z<2080;z+=12) {
    if(z>1040&&COAST_CITY.streets.some(n=>Math.abs(n-z)<12))continue;
    for(const side of [-1,1])box(paint,side*.15,.064,z,.11,.012,5);
    for(const side of [-1,1])box(trim,side*7.0,.065,z,.12,.012,10);
    if(z>1040)for(const x of [-120,-240])for(const side of [-1,1])box(paint,x+side*.15,.064,z,.11,.012,5);
  }
  function guardrail(x,a,b) {
    if(b<=a)return;
    box(metal,x,.72,(a+b)/2,.15,.28,b-a);box(metal,x,.96,(a+b)/2,.07,.06,b-a);
    for(let z=a+.4;z<b;z+=3)box(dark,x,.06,z,.12,.85,.11);
    solid(x,(a+b)/2,.16,b-a,'guardrail');
  }
  for(const x of [-7.35,7.35])guardrail(x,260,980);
  let railStart=1040;
  for(const z of [...COAST_CITY.streets,2094]){guardrail(7.35,railStart,Math.min(2080,z-14));railStart=z+14;}
  for(const x of COAST_CITY.avenues)for(const z of COAST_CITY.streets) {
    const controller={ix:x,iz:z,offset:Math.abs(x+z)%5,heads:[],pedestrians:[]};trafficControllers.push(controller);
    for(const [sx,sz] of [[1,1],[-1,-1],[1,-1],[-1,1]])addCornerSignal(x,z,sx,sz,controller);
    for(const side of [-1,1])for(let k=-5;k<=5;k++) {
      box(trim,x+k*1.3,.065,z+side*8.3,.55,.012,3);
      box(trim,x+side*8.3,.065,z+k*1.3,3,.012,.55);
    }
    if(x===0&&[1240,1720].includes(z))addCrossingPedestrian?.(x,z,'x',controller,0x67a6a0);
  }
  // A gently sloping, genuinely walkable sandy beach, separated from the road.
  const sandGeo=new THREE.PlaneGeometry(100,1200,20,1),sandPos=sandGeo.attributes.position;
  for(let i=0;i<sandPos.count;i++)sandPos.setZ(i,coastGroundHeight(sandPos.getX(i)+82,1600));
  sandGeo.computeVertexNormals();
  const grains=new Uint8Array(64*64*4);let seed=813;
  for(let i=0;i<64*64;i++){seed=(Math.imul(seed,1664525)+1013904223)>>>0;const noise=((seed>>>24)/255-.5)*22;for(let c=0;c<3;c++)grains[i*4+c]=[217,195,149][c]+noise;grains[i*4+3]=255;}
  const sandMap=new THREE.DataTexture(grains,64,64);sandMap.wrapS=sandMap.wrapT=THREE.RepeatWrapping;sandMap.repeat.set(30,360);sandMap.colorSpace=THREE.SRGBColorSpace;sandMap.magFilter=THREE.LinearFilter;sandMap.minFilter=THREE.LinearMipmapLinearFilter;sandMap.generateMipmaps=true;sandMap.needsUpdate=true;
  const sand=new THREE.MeshStandardMaterial({map:sandMap,bumpMap:sandMap,bumpScale:.018,roughness:1});
  const beach=new THREE.Mesh(sandGeo,sand);beach.rotation.x=-Math.PI/2;beach.position.set(82,0,1600);beach.receiveShadow=true;beach.name='Sunshore walkable sand';scene.add(beach);
  const waterTime={value:0},waterGeo=new THREE.PlaneGeometry(2400,1900,mobile?48:100,mobile?48:100),waterPos=waterGeo.attributes.position,waterColors=[];
  const shallow=new THREE.Color(0x54bbc0),deep=new THREE.Color(0x155b81);
  for(let i=0;i<waterPos.count;i++){const x=waterPos.getX(i)+1332,c=shallow.clone().lerp(deep,THREE.MathUtils.smoothstep(x,132,650));waterColors.push(c.r,c.g,c.b);}
  waterGeo.setAttribute('color',new THREE.Float32BufferAttribute(waterColors,3));
  const waterMaterial=new THREE.MeshPhysicalMaterial({vertexColors:true,roughness:.27,metalness:.12,clearcoat:.95,clearcoatRoughness:.22});
  waterMaterial.onBeforeCompile=shader=>{
    shader.uniforms.coastTime=waterTime;
    shader.vertexShader='uniform float coastTime;\n'+shader.vertexShader
      .replace('#include <beginnormal_vertex>','#include <beginnormal_vertex>\nobjectNormal=normalize(vec3(-.012*cos(position.x*.12+position.y*.07+coastTime*.7),-.007*cos(position.x*.12+position.y*.07+coastTime*.7)-.00945*cos(position.y*.21-coastTime*.9),1.0));')
      .replace('#include <begin_vertex>','#include <begin_vertex>\ntransformed.z+=.10*sin(position.x*.12+position.y*.07+coastTime*.7)+.045*sin(position.y*.21-coastTime*.9);');
  };waterMaterial.customProgramCacheKey=()=> 'sunshore-water-v1';
  const ocean=new THREE.Mesh(waterGeo,waterMaterial);ocean.rotation.x=-Math.PI/2;ocean.position.set(1332,-.68,1750);ocean.receiveShadow=true;ocean.name='Sunshore Atlantic-inspired ocean';scene.add(ocean);
  // Soft, irregular foam at the waterline, animated as a few shared ribbons.
  const foams=[],foamPixels=new Uint8Array(64*64*4);
  for(let y=0;y<64;y++)for(let x=0;x<64;x++){const i=(y*64+x)*4;foamPixels[i]=foamPixels[i+1]=foamPixels[i+2]=255;const edge=Math.pow(Math.max(0,1-Math.abs(x-31.5)/32),1.5),grain=((x*73+y*151)%97)/97;foamPixels[i+3]=Math.floor(255*edge*(grain<.2?0:.4+grain*.6));}
  const foamMap=new THREE.DataTexture(foamPixels,64,64);foamMap.wrapS=foamMap.wrapT=THREE.RepeatWrapping;foamMap.repeat.set(1,160);foamMap.magFilter=foamMap.minFilter=THREE.LinearFilter;foamMap.needsUpdate=true;
  for(let row=0;row<3;row++) {
    const geo=new THREE.PlaneGeometry(.65+row*.45,1200,1,100),p=geo.attributes.position;
    for(let i=0;i<p.count;i++)p.setX(i,p.getX(i)+Math.sin(p.getY(i)*.055+row)*.45);
    const m=new THREE.MeshBasicMaterial({map:foamMap,color:0xd9f3e9,transparent:true,opacity:.35-row*.08,depthWrite:false});
    const foam=new THREE.Mesh(geo,m);foam.rotation.x=-Math.PI/2;foam.position.set(130+row*2,-.57,1600);foam.name='Shore foam';scene.add(foam);foams.push(foam);
  }
  // Stepped art-deco facades, portholes, rounded balcony corners, and neon
  // accents use common material batches rather than one draw per window.
  let flamingo=null;
  for(const [i,b] of COAST_BUILDINGS.entries()) {
    const front=b.x+b.w/2;
    if(b.name==='THE FLAMINGO'&&b.height>=30){
      flamingo=createFlamingoHotel({scene,building:b,obstacles,groundSurfaces,visualKit});
      buildings.push({...b,coastal:true,shop:false,enterable:true});
      const entranceWalk=b.x+60-9.3;
      cube(scene,(front+entranceWalk)/2,.07,b.z,entranceWalk-front,.14,3.2,paving,false);
      continue;
    }
    const m=stucco[i%stucco.length],neon=neons[i%neons.length];
    box(m,b.x,.06,b.z,b.w,b.height,b.d);box(trim,b.x,b.height,b.z,b.w+1,.4,b.d+1);
    box(m,b.x,b.height+.4,b.z,b.w-8,1.4,b.d-8);box(trim,b.x,b.height+1.8,b.z,b.w-7,.25,b.d-7);
    box(glass,front+.08,.8,b.z,.09,2.7,b.d-4);box(dark,front+.16,.2,b.z, .12,2.8,2.2);
    box(trim,front+1.5,3.6,b.z,3,.24,b.d-1);box(neon,front+3.03,3.65,b.z,.06,.10,b.d-2);
    for(let y=5;y<b.height-1;y+=3.5) {
      box(trim,front+.55,y-.3,b.z,1.2,.2,b.d);box(neon,front+1.17,y-.25,b.z,.04,.07,b.d-1);
      for(let z=b.z-b.d/2+3;z<b.z+b.d/2-1;z+=4){box(glass,front+.1,y,b.z+(z-b.z),.07,2.1,2.5);box(trim,front+.14,y,b.z+(z-b.z),.1,2.1,.09);}
      for(const side of [-1,1])for(let x=b.x-b.w/2+4;x<b.x+b.w/2-1;x+=5)box(i%3?glass:warm,x,y,b.z+side*(b.d/2+.06),2.1,2,.08);
    }
    // Vertical hotel sign and a ribbed corner tower are the strip's silhouette.
    box(trim,front+.9,3.9,b.z-b.d/2+2,1.4,b.height-2.7,3);
    box(neon,front+1.66,4.3,b.z-b.d/2+2,.07,b.height-3.5,.11);
    sign(b.name,front+1.75,4.6,b.z,Math.min(24,b.d-5),1.2,Math.PI/2,i%2?'#294d55':'#54374c');
    sign(b.use.toUpperCase(),front+1.78,3.0,b.z,9,.65,Math.PI/2);
    solid(b.x,b.z,b.w+.2,b.d+.2);buildings.push({...b,coastal:true,shop:false});
    const entranceWalk=b.x+60-9.3;
    cube(scene,(front+entranceWalk)/2,.07,b.z,entranceWalk-front,.14,3.2,paving,false);
  }
  // Layered coconut/royal palms share textured materials and near/far geometry.
  const palms=[];
  function palm(x,z,scale=1){if(COAST_BUILDINGS.some(b=>x>b.x+b.w/2&&x<b.x+60-9.3&&Math.abs(b.z-z)<5))return;palms.push({x,z,scale});solid(x,z,.8*scale,.8*scale,'palm');}
  for(let z=1088;z<2070;z+=28) {
    if(COAST_CITY.streets.some(n=>Math.abs(z-n)<16))continue;
    for(const x of [19,31,-105,-135,-225])palm(x,z,.84+((Math.round(z)+Math.abs(x))%7)*.055);
    if(!COAST_BUILDINGS.some(b=>b.x===-60&&Math.abs(b.z-z)<5))palm(-16,z,1.08);
  }
  for(let z=300;z<990;z+=70)for(const side of [-1,1])palm(side*17,z,.82);
  const palmGrove=createPalmGrove({scene,placements:palms,groundHeight,mobile});
  function lamp(x,z){box(dark,x,.21,z,.14,6.2,.14);box(dark,x+.8,6.4,z,1.7,.12,.14);box(lampGlow,x+1.5,6.28,z,.65,.12,.36);visualKit.atmosphere.addStreetLight({x:x+1.5,y:6.32,z,groundY:.23});}
  for(let z=1110;z<2080;z+=48)if(!COAST_CITY.streets.some(n=>Math.abs(n-z)<15))lamp(15,z);
  for(let z=330;z<1040;z+=85)lamp(-12,z);
  for(let z=1160;z<2040;z+=160) {
    // Benches face the sea and use the existing sit/stand interaction system.
    for(const dz of [-.8,.8])box(dark,23.3,.21,z+dz,.5,.5,.09);
    for(let k=0;k<4;k++)box(wood,23.05+k*.14,.71,z,.11,.07,2.0);
    box(wood,22.97,.78,z,.09,.55,2);seats.push({x:23.3,z,height:.56,yaw:Math.PI/2,type:'ocean-facing boardwalk bench'});
    solid(23.3,z,.65,2.1);box(dark,28,.21,z+8,.5,.8,.5);solid(28,z+8,.5,.5);
  }
  // Beach furniture uses broad alternating canopy panels and connected poles.
  for(let z=1135;z<2040;z+=80)for(const x of [52,84]) {
    const y=coastGroundHeight(x,z),umbrella=new THREE.Mesh(new THREE.ConeGeometry(2.1,.65,12),stucco[(Math.round(z)+x)%stucco.length]);umbrella.position.set(x,y+2.3,z);umbrella.castShadow=true;scene.add(umbrella);
    box(wood,x,y,z,.09,2.35,.09);solid(x,z,.2,.2);
    for(const side of [-1,1]){box(trim,x+side*1.2,y+.2,z+2, .7,.12,1.8);box(stucco[x%stucco.length],x+side*1.2,y+.32,z+1.2,.7,.55,.12);}
  }
  for(const z of [1290,1770]) {
    const x=61,y=coastGroundHeight(x,z);for(const dx of [-2,2])for(const dz of [-1.8,1.8])box(wood,x+dx,y,z+dz,.2,2.0,.2);
    box(trim,x,y+1.9,z,5,.22,4.4);box(stucco[0],x,y+2.12,z,3.7,2.0,3.5);box(glass,x,y+2.7,z+1.8,3,1,.05);box(trim,x,y+4.12,z,5.2,.18,4.6);
    const ring=new THREE.Mesh(new THREE.TorusGeometry(.35,.09,8,20),neons[1]);ring.position.set(x,y+2.5,z+1.9);scene.add(ring);sign('LIFEGUARD',x,y+3.9,z+2.0,4,.55);solid(x,z,5,4.4);
  }
  // Legible arrival signs, beach information, and a practical fuel stop.
  for(const z of [420,850]){for(const x of [-7.7,7.7])box(dark,x,.07,z,.13,6.2,.13);box(dark,0,6.27,z,15.6,.14,.14);sign('SUNSHORE CITY  SOUTH ↓',0,5.55,z- .1,12,1.2,Math.PI);}
  sign('SUNSHORE · OCEAN DRIVE',-2,5.6,1052,20,1.5,Math.PI,'#285f65');
  box(wood,28,.21,1091,.14,2.6,2.4);sign('BEACH ACCESS',27.9,2.2,1091,2.1,.7,-Math.PI/2);sign('SUNSHORE BEACH',25,2.4,1083,10,1,Math.PI);
  for(const z of COAST_CITY.streets)sign('BEACH →',12,2.1,z+5,3.4,.65,Math.PI/2);
  cube(scene,-18,.07,1114,18,.14,22,paving,false);box(stucco[1],-27,.21,1105,9,4.5,12);solid(-27,1105,9,12);
  box(trim,COAST_MOTORS.x,.21,COAST_MOTORS.z,.8,1.3,.65);box(dark,COAST_MOTORS.x,1.51,COAST_MOTORS.z,.65,.5,.5);solid(COAST_MOTORS.x,COAST_MOTORS.z,.8,.65);sign('SUNSHORE MOTORS',-22,3.2,1112,10,1,Math.PI/2);
  buildings.push({x:-27,z:1105,w:9,d:12,height:4.7,coastal:true});
  // Moving residents stay on the promenade, away from road traffic and benches.
  const walkers=[];
  for(let i=0;i<8;i++){const actor=characters.create({x:i%2?26:21,z:1120+i*115,model:'crowd',shirt:[0xe3ba83,0x72aeab,0xd5868d][i%3]});walkers.push({actor,dir:i%2?1:-1,speed:.8+i%3*.15});}
  // District-local traffic never wraps a coastal car back into Maple Street.
  for(let i=0;i<8;i++){const x=i<4?0:i<6?-120:-240,speed=i%2?-7:7;car(x+(speed>0?-2.4:2.4),1130+i*105,0xaaaaaa,speed>0?0:Math.PI,true,speed);Object.assign(traffic.at(-1),{min:1050,max:2070});}
  for(const [i,z] of [1240,1880].entries()){const speed=i?-6:6;car(-210+i*70,z+(speed>0?2.4:-2.4),0xaaaaaa,speed>0?Math.PI/2:-Math.PI/2,true,speed,'x');Object.assign(traffic.at(-1),{min:-244,max:3});}
  for(const side of [-1,1]){const speed=side<0?10:-10;car(side*2.4,side<0?400:830,0xaaaaaa,speed>0?0:Math.PI,true,speed);Object.assign(traffic.at(-1),{min:180,max:1030});}
  for(const z of [1188,1518,1848]){car(5,z,0xaaaaaa,Math.PI);for(const side of [-1,1])box(trim,5,.065,z+side*3.1,2.7,.015,.08);sign('P',10,2.3,z, .7,.8,-Math.PI/2);}
  for(const [material,items] of batches) {
    const mesh=new THREE.InstancedMesh(unit,material,items.length);
    items.forEach((p,i)=>{dummy.position.set(p.x,p.y,p.z);dummy.rotation.set(0,p.rotation,0);dummy.scale.set(p.w,p.h,p.d);dummy.updateMatrix();mesh.setMatrixAt(i,dummy.matrix);});
    mesh.castShadow=mesh.receiveShadow=true;mesh.computeBoundingSphere();mesh.name='Sunshore architecture and street furniture';scene.add(mesh);
  }
  return {floors:flamingo?.floors||[],inside:p=>flamingo?.inside(p)||false,interior:p=>flamingo?.interior(p)||null,nearestElevator:p=>flamingo?.nearestElevator(p)||null,isRiding:()=>flamingo?.isRiding()||false,rideTo:(index,actor)=>flamingo?.rideTo(index,actor)||false,floorY:()=>flamingo?.floorY()??.21,buildings:COAST_BUILDINGS,palms,palmGrove,ocean,beach,guardrails:obstacles.filter(o=>o.kind==='guardrail'),
    update(dt,eye){flamingo?.update(dt,eye);palmGrove.update(dt,eye);waterTime.value+=dt;foamMap.offset.y=waterTime.value*.008;foams.forEach((foam,i)=>{foam.position.x=130+i*2+Math.sin(waterTime.value*.3+i)*.6;foam.material.opacity=.24+Math.sin(waterTime.value*.7+i)*.07;});for(const w of walkers){w.actor.position.z+=w.dir*w.speed*dt;if(w.actor.position.z>2020){w.actor.position.z=2020;w.dir=-1;}if(w.actor.position.z<1105){w.actor.position.z=1105;w.dir=1;}}}};
}
