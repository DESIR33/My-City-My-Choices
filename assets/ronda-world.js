import * as THREE from 'three';
import {mergeGeometries} from 'three/addons/utils/BufferGeometryUtils.js';
import {RONDA,rondaWalkable} from './world-rules.js';

// Ronda (Málaga, Spain) inspired district west of Sunshore: whitewashed houses with
// terracotta roofs on a limestone plateau, split by the El Tajo gorge and joined by
// the Puente Nuevo, with a waterfall, a parador, a historic arena, a church, the
// Alameda viewpoint and farmland in the valley below the western escarpment.
// Every surface works with plain colours first; CC0 Poly Haven scans stream in later
// (assets/ronda/textures, tools/prepare-ronda-textures.mjs). `tone` scans are stored
// as grayscale detail so the warm limestone colour comes from the material tint.
export const RONDA_SCANS=Object.freeze({
  cliff:{id:'rock_face_03',tile:7,tone:true},
  sandstone:{id:'large_sandstone_blocks_01',tile:3.2,tone:true},
  roof:{id:'clay_roof_tiles_02',tile:2.2},
  cobble:{id:'cobblestone_floor_04',tile:2.4},
  whitewash:{id:'plastered_stone_wall',tile:3,relief:true}
});
export function rondaScanFiles(size){return Object.values(RONDA_SCANS).flatMap(s=>['diff','nor','arm'].map(map=>({id:s.id,map,url:'./assets/ronda/textures/'+s.id+'-'+size+'-'+map+'.ktx2'})));}

// Landmarks, in world coordinates, shared by the map, prompts and tests.
export const RONDA_PLACES=Object.freeze({
  bridge:{name:'Puente Nuevo',x:-520,z:1500,deckY:0,floorY:-86},
  oldBridge:{name:'Puente Viejo',x:-410,z:1500},
  plaza:{name:'Plaza de España',x:-520,z:1458},
  parador:{name:'Parador',x:-574,z:1458,w:50,d:34,h:13},
  arena:{name:'Historic arena',x:-462,z:1335,r:31},
  church:{name:'Santa María la Mayor',x:-566,z:1708},
  mirador:{name:'Alameda viewpoint',x:-690,z:1340},
  waterfall:{x:-506,top:-58,bottom:-86},
  entry:{name:'Ronda',x:-318,z:1400}
});
export const RONDA_FACTS=Object.freeze({
  bridge:'The Puente Nuevo ("New Bridge") took 34 years to build, from 1759 to 1793. The El Tajo gorge it crosses is about 120 metres deep, carved by the Guadalevín river. The small room above the central arch was once a prison and is now a little museum.',
  arena:'Ronda\'s round arena opened in 1785 and is one of the oldest in Spain. Today it is a museum about the town\'s history, horses and traditions.',
  town:'Ronda sits on a cliff in the mountains of Málaga, Spain. Its white houses keep cool in the hot sun, and farmers grow olives and grapes in the valley below.'
});

// A quick maths question for each landmark (answers shown after the player thinks).
export const RONDA_THINK=Object.freeze({
  bridge:{question:'Building started in 1759 and finished in 1793. How many years is that?',answer:'1793 − 1759 = 34 years.'},
  arena:{question:'The arena is a circle about 66 metres across. Roughly how far is it around? (Around ≈ 3 × across.)',answer:'About 3 × 66 ≈ 198 metres, close to 200 metres.'},
  town:{question:'The gorge is about 120 metres deep. If one floor of a house is about 3 metres tall, how many floors would fit?',answer:'120 ÷ 3 = 40 floors.'}
});

// ---------- small deterministic noise ----------
const fract=x=>x-Math.floor(x);
const hash2=(x,y,s=0)=>fract(Math.sin(x*127.1+y*311.7+s*74.7)*43758.5453);
function vnoise(x,y,s=0){const xi=Math.floor(x),yi=Math.floor(y),xf=x-xi,yf=y-yi,u=xf*xf*(3-2*xf),v=yf*yf*(3-2*yf);
  const a=hash2(xi,yi,s),b=hash2(xi+1,yi,s),c=hash2(xi,yi+1,s),d=hash2(xi+1,yi+1,s);return a+(b-a)*u+(c-a)*v+(a-b-c+d)*u*v;}
function fbm(x,y,s=0,oct=4){let v=0,a=.5,f=1;for(let i=0;i<oct;i++){v+=a*vnoise(x*f,y*f,s+i*13);f*=2.03;a*=.5;}return v;}
const smooth=(a,b,x)=>{const t=Math.max(0,Math.min(1,(x-a)/(b-a)));return t*t*(3-2*t);};

// Gorge floor height along its length: the river drops at the waterfall under the bridge.
export function gorgeFloorY(x){const W=RONDA_PLACES.waterfall;if(x>W.x)return W.top+Math.min(1,(x-W.x)/180)*16;return W.bottom-Math.min(1,(W.x-x)/(W.x-RONDA.cliffX))*14;}

export function createRondaWorld({scene,visualKit,obstacles,groundSurfaces,mobile=false}){
  const root=new THREE.Group();root.name='Ronda';scene.add(root);
  const R=RONDA,G=R.gorge,X0=R.cliffX,XE=G.eastX,VY=R.valleyY;
  const glow=(m,o)=>visualKit.atmosphere?.registerGlow?.(m,o);

  // ---------- materials ----------
  const scanned=[];
  function surf(kind,color,{roughness=.9,metalness=0,world=true,vertexColors=false,side=THREE.FrontSide}={}){
    const m=new THREE.MeshStandardMaterial({name:'Ronda '+kind,color,roughness,metalness,vertexColors,side});m.userData.rondaScan=kind;
    if(world){const tile=RONDA_SCANS[kind]?.tile||2;m.onBeforeCompile=shader=>{shader.vertexShader='varying vec3 vRondaP;\n'+shader.vertexShader.replace('#include <project_vertex>',`#include <project_vertex>
      vec4 rp=vec4(transformed,1.0);
      #ifdef USE_INSTANCING
      rp=instanceMatrix*rp;
      #endif
      rp=modelMatrix*rp;vec3 rn=abs(inverseTransformDirection(transformedNormal,viewMatrix));vec2 ruv=(rn.y>rn.x&&rn.y>rn.z?rp.xz:rn.x>rn.z?vec2(rp.z,rp.y):rp.xy)/${tile.toFixed(3)};
      #ifdef USE_MAP
      vMapUv=ruv;
      #endif
      #ifdef USE_NORMALMAP
      vNormalMapUv=ruv;
      #endif
      #ifdef USE_ROUGHNESSMAP
      vRoughnessMapUv=ruv;
      #endif
      #ifdef USE_AOMAP
      vAoMapUv=ruv;
      #endif`);};m.customProgramCacheKey=()=>'ronda-world:'+tile;}
    if(RONDA_SCANS[kind])scanned.push(m);return m;
  }
  const M={
    cliff:surf('cliff',0xe2cfa6,{world:false,vertexColors:true,roughness:.95}),
    gorgeCliff:null,
    sandstone:surf('sandstone',0xcdb08a,{roughness:.88}),
    roof:surf('roof',0xd0805a,{roughness:.86}),
    cobble:surf('cobble',0xcdbfa8,{roughness:.92}),
    road:surf('cobble',0x8f8578,{roughness:.9}),
    white:surf('whitewash',0xf6f2ea,{roughness:.93}),
    cream:surf('whitewash',0xf0dfb8,{roughness:.9}),
    ochre:surf('whitewash',0xe9c98f,{roughness:.9}),
    trim:new THREE.MeshStandardMaterial({color:0xe8dcc4,roughness:.8}),
    green:new THREE.MeshStandardMaterial({color:0x31533e,roughness:.7}),
    iron:new THREE.MeshStandardMaterial({color:0x1c1d1f,roughness:.5,metalness:.6}),
    wood:new THREE.MeshStandardMaterial({color:0x6b4a32,roughness:.75}),
    glass:new THREE.MeshStandardMaterial({color:0x223038,roughness:.15,metalness:.3}),
    sand:new THREE.MeshStandardMaterial({color:0xd9a865,roughness:1}),
    grass:visualKit.grass||new THREE.MeshStandardMaterial({color:0x6f8a4f,roughness:.95}),
    scrub:new THREE.MeshStandardMaterial({color:0x5f7a3c,roughness:.95}),
    water:new THREE.MeshStandardMaterial({color:0x3d6f6a,roughness:.12,metalness:.1,transparent:true,opacity:.86}),
    lamp:new THREE.MeshStandardMaterial({color:0xffe2a8,emissive:0xffc46b,emissiveIntensity:.1,roughness:.4}),
    pool:new THREE.MeshStandardMaterial({color:0x4fb3c9,roughness:.08})
  };
  glow(M.lamp,{day:.05,night:2.6,color:0xffc46b});
  // Warm floodlit stone after dark (the bridge and the parador glow orange at night).
  M.sandstone.emissive=new THREE.Color(0xff9a3c);glow(M.sandstone,{day:0,night:.16,color:0xff9a3c});
  for(const m of [M.white,M.cream])m.emissive=new THREE.Color(0xffd29a);glow(M.cream,{day:0,night:.05,color:0xffd29a});

  // ---------- instanced boxes (one draw per material) ----------
  const batches=new Map(),unit=new THREE.BoxGeometry(1,1,1);
  function box(mat,x,y,z,w,h,d,ry=0){if(!batches.has(mat))batches.set(mat,[]);batches.get(mat).push([x,y+h/2,z,w,h,d,ry]);}
  const solid=(x,z,w,d,kind='ronda')=>{const o={minX:x-w/2,maxX:x+w/2,minZ:z-d/2,maxZ:z+d/2,kind,ronda:true};obstacles.push(o);return o;};
  // Hip roofs: one shared unit geometry, scaled per house.
  const hipGeo=(()=>{const g=new THREE.BufferGeometry(),r=.22,v=[-.5,0,-.5, .5,0,-.5, .5,0,.5, -.5,0,.5, -.5+r,1,0, .5-r,1,0];
    const idx=[0,4,1, 1,4,5, 1,5,2, 2,5,4, 2,4,3, 3,4,0];const pos=[];for(const i of idx)pos.push(v[i*3],v[i*3+1],v[i*3+2]);g.setAttribute('position',new THREE.Float32BufferAttribute(pos,3));g.computeVertexNormals();return g;})();
  const roofs=[];function roof(x,y,z,w,h,d,ry=0){roofs.push([x,y,z,w,h,d,ry]);}

  // ---------- terrain: plateau, escarpment, gorge, valley ----------
  const plateauTop=0;
  // Countryside on the plateau beyond the town, town paving inside it.
  const groundMat=new THREE.MeshStandardMaterial({color:0x9c9461,roughness:.97});
  for(const [z0,z1] of [[1000,G.minZ],[G.maxZ,2600]])box(groundMat,(X0-300)/2,-.6,(z0+z1)/2,-300-X0,.53,z1-z0);box(groundMat,(XE-300)/2,-.6,(G.minZ+G.maxZ)/2,-300-XE,.53,G.maxZ-G.minZ);
  box(M.cobble,(X0+R.maxX)/2,-.08,(R.minZ+G.minZ)/2,R.maxX-X0,.08,G.minZ-R.minZ);
  box(M.cobble,(X0+R.maxX)/2,-.08,(G.maxZ+R.maxZ)/2,R.maxX-X0,.08,R.maxZ-G.maxZ);
  box(M.cobble,(XE+R.maxX)/2,-.08,(G.minZ+G.maxZ)/2,R.maxX-XE,.08,G.maxZ-G.minZ);
  groundSurfaces?.push({minX:X0,maxX:R.maxX,minZ:R.minZ,maxZ:R.maxZ,top:0,kind:'stone',ronda:true});

  // Rugged rock faces: a grid along a top edge, displaced outward by layered noise so
  // the limestone reads as stacked strata, pillars and overhangs (as in El Tajo).
  const cliffMeshes=[],greenery=[];
  function cliffFace({x1,z1,x2,z2,nx,nz,top=0,bottom,step=1.6,seed=1,reach=7}){
    const len=Math.hypot(x2-x1,z2-z1),nu=Math.max(2,Math.ceil(len/step)),pos=[],col=[],uv=[],idx=[];let nvMax=0;const rows=[];
    for(let i=0;i<=nu;i++){const t=i/nu,x=x1+(x2-x1)*t,z=z1+(z2-z1)*t,b=typeof bottom==='function'?bottom(x,z):bottom,nv=Math.max(2,Math.ceil((top-b)/step));rows.push({x,z,b,nv});nvMax=Math.max(nvMax,nv);}
    for(let i=0;i<=nu;i++){const {x,z,b}=rows[i],u=i/nu*len;
      for(let j=0;j<=nvMax;j++){const y=top-(top-b)*j/nvMax,depth=top-y,edge=smooth(0,3,depth)*smooth(-1,5,y-b);
        // Vertical limestone pillars split by deep fissures, stacked strata with
        // ledges, and a slow wobble of the whole face so it never reads as a wall.
        const warp=fbm(u*.05,y*.01,seed)*5,columns=(fbm(u*.07,y*.006,seed+3)-.45)*reach*1.5,crack=-reach*.55*Math.pow(Math.max(0,1-Math.abs(Math.sin(u*.27+warp))),14);
        const strata=Math.sin(y*.75+warp*.8)*.35+(fract(y/5.7+fbm(u*.03,y*.02,seed+5)*.4)<.1?.9:0),grain=(fbm(u*.3,y*.3,seed+7)-.5)*1.3,wobble=(fbm(u*.008,1.7,seed+9)-.5)*reach*1.4;
        const bulge=(fbm(u*.004,3.1,seed+27)-.5)*reach*2.6*smooth(0,25,depth),d=Math.max(-.6,columns+crack+strata+grain+wobble+bulge+reach*.45)*edge;pos.push(x+nx*d,y,z+nz*d);uv.push(u/RONDA_SCANS.cliff.tile,y/RONDA_SCANS.cliff.tile);
        const shade=.84+fbm(u*.05,y*.03,seed+11)*.3-(crack<-1?.22:0)+(strata>.6?.06:0),stain=fbm(u*.02,y*.05,seed+15)>.6?.86:1,green=fbm(u*.08,y*.1,seed+19)>.64&&depth>5?1:0;
        col.push(green?shade*.62:shade*stain,green?shade*.7:shade*.96*stain,green?shade*.46:shade*.88*stain);
        if(depth>4&&y-b>3&&hash2(i,j,seed+23)>(strata>.6?.93:.985))greenery.push([x+nx*(d+.6),y+.4,z+nz*(d+.6),.6+hash2(j,i,seed)*1.8]);}}
    const W=nvMax+1;for(let i=0;i<nu;i++)for(let j=0;j<nvMax;j++){const a=i*W+j,b2=(i+1)*W+j;idx.push(a,b2,a+1,b2,b2+1,a+1);}
    const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(pos,3));g.setAttribute('color',new THREE.Float32BufferAttribute(col,3));g.setAttribute('uv',new THREE.Float32BufferAttribute(uv,2));g.setIndex(idx);g.computeVertexNormals();
    // Faces wind toward +normal; flip if the computed normals point into the rock.
    const n=g.attributes.normal;let dot=0;for(let k=0;k<n.count;k+=37)dot+=n.getX(k)*nx+n.getZ(k)*nz;if(dot<0){for(let k=0;k<idx.length;k+=3){const t=idx[k];idx[k]=idx[k+1];idx[k+1]=t;}g.setIndex(idx);g.computeVertexNormals();}
    const mesh=new THREE.Mesh(g,M.cliff);mesh.receiveShadow=true;mesh.castShadow=!mobile;mesh.name='Ronda cliff';root.add(mesh);cliffMeshes.push(mesh);return mesh;
  }
  const coarse=mobile?2.6:1.7;
  // Western escarpment: long, with the gorge mouth open in the middle.
  cliffFace({x1:X0,z1:1000,x2:X0,z2:G.minZ+2,nx:-1,nz:0,bottom:VY-2,step:coarse*1.4,seed:2,reach:13});
  cliffFace({x1:X0,z1:G.maxZ-2,x2:X0,z2:2602,nx:-1,nz:0,bottom:VY-2,step:coarse*1.4,seed:5,reach:13});
  // Edges of the surrounding high ground, so the valley is a closed basin below the town.
  cliffFace({x1:-300,z1:2600,x2:X0-2,z2:2600,nx:0,nz:1,bottom:VY-2,step:coarse*2.2,seed:6,reach:8});cliffFace({x1:X0+2,z1:1000,x2:-900,z2:1000,nx:0,nz:1,bottom:VY-2,step:coarse*2.2,seed:7,reach:8});cliffFace({x1:-900,z1:1002,x2:-900,z2:-550,nx:-1,nz:0,bottom:VY-2,step:coarse*2.6,seed:9,reach:8});
  // The gorge walls face each other; the east end closes where the gorge shallows.
  cliffFace({x1:X0-5,z1:G.minZ,x2:XE+2,z2:G.minZ,nx:0,nz:1,bottom:(x)=>gorgeFloorY(x)-2,step:coarse,seed:8,reach:6});
  cliffFace({x1:XE+2,z1:G.maxZ,x2:X0-5,z2:G.maxZ,nx:0,nz:-1,bottom:(x)=>gorgeFloorY(x)-2,step:coarse,seed:13,reach:6});
  cliffFace({x1:XE,z1:G.maxZ+2,x2:XE,z2:G.minZ-2,nx:-1,nz:0,bottom:gorgeFloorY(XE)-2,step:coarse,seed:17,reach:3});

  // Bushes and fig trees clinging to ledges and fissures.
  {const n=Math.min(greenery.length,mobile?900:3200),g=new THREE.InstancedMesh(new THREE.IcosahedronGeometry(1,0),new THREE.MeshStandardMaterial({color:0x58703a,roughness:.95,flatShading:true}),n),m4=new THREE.Matrix4(),q=new THREE.Quaternion(),sc=new THREE.Vector3(),t=new THREE.Vector3();
    for(let i=0;i<n;i++){const [x,y,z,r]=greenery[Math.floor(i*greenery.length/n)];t.set(x,y,z);q.setFromAxisAngle(new THREE.Vector3(0,1,0),hash2(i,3)*6);sc.set(r*1.3,r*.8,r*1.2);g.setMatrixAt(i,m4.compose(t,q,sc));}g.castShadow=!mobile;g.receiveShadow=true;root.add(g);}

  // Gorge floor with the river, falls and greenery.
  {const nx=Math.ceil((XE-X0+10)/4),g=new THREE.PlaneGeometry(XE-X0+10,G.maxZ-G.minZ,nx,8);g.rotateX(-Math.PI/2);const p=g.attributes.position;
    for(let i=0;i<p.count;i++){const x=p.getX(i)+(X0+XE)/2-5,z=p.getZ(i)+(G.minZ+G.maxZ)/2,side=Math.abs(z-(G.minZ+G.maxZ)/2)/((G.maxZ-G.minZ)/2);p.setY(i,gorgeFloorY(x)+side*side*6+fbm(x*.1,z*.1,23)*1.5);}
    g.computeVertexNormals();const floor=new THREE.Mesh(g,M.scrub);floor.position.set((X0+XE)/2-5,0,(G.minZ+G.maxZ)/2);floor.receiveShadow=true;root.add(floor);}
  const river=new THREE.Mesh(new THREE.PlaneGeometry(XE-X0,5,40,1),M.water);river.rotation.x=-Math.PI/2;river.position.set((X0+XE)/2,0,(G.minZ+G.maxZ)/2);
  {const p=river.geometry.attributes.position;for(let i=0;i<p.count;i++){const x=p.getX(i)+(X0+XE)/2;p.setZ(i,gorgeFloorY(x)+.35);}river.geometry.computeVertexNormals();}root.add(river);

  // Waterfall: a scrolling sheet of white water from the ledge to the pool, with foam.
  const fallCanvas=globalThis.document?.createElement?.('canvas');let fallTexture=null;
  if(fallCanvas?.getContext){try{fallCanvas.width=64;fallCanvas.height=256;const q=fallCanvas.getContext('2d');q.fillStyle='#eef4f3';q.fillRect(0,0,64,256);for(let i=0;i<220;i++){q.fillStyle=`rgba(255,255,255,${.3+hash2(i,1)*.6})`;q.fillRect(hash2(i,2)*64,hash2(i,3)*256,1+hash2(i,4)*3,10+hash2(i,5)*50);}fallTexture=new THREE.CanvasTexture(fallCanvas);fallTexture.wrapS=fallTexture.wrapT=THREE.RepeatWrapping;fallTexture.repeat.set(1,3);fallTexture.colorSpace=THREE.SRGBColorSpace;}catch{fallTexture=null;}}
  const fallMat=new THREE.MeshStandardMaterial({color:0xffffff,map:fallTexture,transparent:true,opacity:.9,roughness:.3,emissive:0xd8e4e4,emissiveIntensity:.35,side:THREE.DoubleSide,depthWrite:false});
  const W=RONDA_PLACES.waterfall,fall=new THREE.Mesh(new THREE.PlaneGeometry(4.2,W.top-W.bottom,1,8),fallMat);fall.rotation.y=Math.PI/2;fall.position.set(W.x-1.2,(W.top+W.bottom)/2,(G.minZ+G.maxZ)/2-2);
  {const p=fall.geometry.attributes.position;for(let i=0;i<p.count;i++){const t=(p.getY(i)+(W.top-W.bottom)/2)/(W.top-W.bottom);p.setZ(i,(1-t)*(1-t)*2.2);}}root.add(fall);
  const foam=new THREE.Mesh(new THREE.CircleGeometry(4.5,24),new THREE.MeshStandardMaterial({color:0xf2f7f6,transparent:true,opacity:.75,roughness:.6,depthWrite:false}));foam.rotation.x=-Math.PI/2;foam.position.set(W.x-3.5,W.bottom+.5,(G.minZ+G.maxZ)/2-2);root.add(foam);

  // Valley: patchwork farmland, olive groves and lanes below the escarpment, rising
  // into the Serranía mountains far away.
  {const size=mobile?1024:2048,c=globalThis.document?.createElement?.('canvas');let map=null;
    if(c?.getContext){try{c.width=c.height=size;const q=c.getContext('2d'),cols=['#8d8a52','#a49a5c','#6f7a45','#b59f68','#7d8a4c','#a3864f','#93984f','#c0a874'];
      for(let i=0;i<620;i++){const x=hash2(i,1,3)*size,y=hash2(i,2,3)*size,w=40+hash2(i,3,3)*190,h=30+hash2(i,4,3)*150;q.save();q.translate(x,y);q.rotate((hash2(i,5,3)-.5)*.8);q.fillStyle=cols[i%cols.length];q.fillRect(-w/2,-h/2,w,h);
        if(i%3===0){q.fillStyle='rgba(60,80,40,.55)';for(let k=0;k<40;k++)q.fillRect(-w/2+hash2(i,k,9)*w,-h/2+hash2(k,i,9)*h,4,4);}q.restore();}
      q.strokeStyle='rgba(220,205,170,.85)';q.lineWidth=3;for(let r=0;r<9;r++){q.beginPath();let x=hash2(r,7)*size,y=0;q.moveTo(x,y);while(y<size){y+=40;x+=(hash2(r,y)-.5)*70;q.lineTo(x,y);}q.stroke();}
      map=new THREE.CanvasTexture(c);map.wrapS=map.wrapT=THREE.RepeatWrapping;map.colorSpace=THREE.SRGBColorSpace;map.anisotropy=4;}catch{map=null;}}
    const valleyMat=new THREE.MeshStandardMaterial({color:map?0xffffff:0x8d8a52,map,roughness:.98});
    const span=4200,seg=mobile?80:140,g=new THREE.PlaneGeometry(span,span,seg,seg);g.rotateX(-Math.PI/2);const p=g.attributes.position,uv=g.attributes.uv,cx=X0-span/2,cz=1750;
    for(let i=0;i<p.count;i++){const x=p.getX(i)+cx,z=p.getZ(i)+cz,far=Math.max(0,X0-x-250),mountains=smooth(1100,2000,far)*(220+fbm(x*.0016,z*.0016,31)*520),hills=fbm(x*.004,z*.004,29)*26*smooth(80,500,far);
      // Keep the strip under the escarpment flat so cliff bottoms meet the fields.
      p.setY(i,VY+(x>X0-40?-2:hills+mountains));uv.setXY(i,x/700,z/700);}
    g.computeVertexNormals();const valley=new THREE.Mesh(g,valleyMat);valley.position.set(cx,0,cz);valley.receiveShadow=true;valley.name='Ronda valley';root.add(valley);}
  // Olive trees and cypresses: instanced, scattered over the near valley.
  {const olives=mobile?700:2200,canopy=new THREE.InstancedMesh(new THREE.IcosahedronGeometry(1,1),new THREE.MeshStandardMaterial({color:0x5c6b44,roughness:.9}),olives),trunk=new THREE.InstancedMesh(new THREE.CylinderGeometry(.12,.18,1,5),M.wood,olives),m=new THREE.Matrix4(),q=new THREE.Quaternion(),s=new THREE.Vector3(),t=new THREE.Vector3();
    for(let i=0;i<olives;i++){const row=Math.floor(i/40),x=X0-60-hash2(i,1,41)*900,z=1000+hash2(i,2,41)*1600,sz=1.6+hash2(i,3,41)*1.4;t.set(x,VY+sz*.9,z);s.set(sz*1.15,sz*.75,sz*1.1);canopy.setMatrixAt(i,m.compose(t,q,s));t.set(x,VY+sz*.4,z);s.set(1,sz*.8,1);trunk.setMatrixAt(i,m.compose(t,q,s));}
    canopy.castShadow=false;root.add(canopy,trunk);}

  // ---------- Puente Nuevo ----------
  const B=RONDA_PLACES.bridge,bw=13,bridge=new THREE.Group();bridge.name='Puente Nuevo';root.add(bridge);
  {const zc=B.z,fy=B.floorY,shape=new THREE.Shape();shape.moveTo(G.minZ-14,fy-4);shape.lineTo(G.maxZ+14,fy-4);shape.lineTo(G.maxZ+14,1.2);shape.lineTo(G.minZ-14,1.2);shape.lineTo(G.minZ-14,fy-4);
    const arch=(z0,z1,yb,ys)=>{const r=(z1-z0)/2,h=new THREE.Path();h.moveTo(z0,yb);h.lineTo(z1,yb);h.lineTo(z1,ys);h.absarc((z0+z1)/2,ys,r,0,Math.PI,false);h.lineTo(z0,yb);shape.holes.push(h);};
    arch(zc-8,zc+8,-52,-22);arch(zc-4.5,zc+4.5,fy-3.5,-66);arch(G.minZ+2,G.minZ+9,-13,-6.5);arch(G.maxZ-9,G.maxZ-2,-13,-6.5);
    const g=new THREE.ExtrudeGeometry(shape,{depth:bw,bevelEnabled:false,curveSegments:16});g.rotateY(-Math.PI/2);g.translate(B.x+bw/2,0,0);
    const mesh=new THREE.Mesh(g,M.sandstone);mesh.castShadow=mesh.receiveShadow=true;bridge.add(mesh);
    // Pilasters, cornices and the chamber window above the central arch on both faces.
    for(const side of [-1,1]){const fx=B.x+side*(bw/2+.35);
      for(const z of [zc-11,zc+11])box(M.sandstone,fx,fy-3,z,.7,fy*-1-6,3.2);for(const y of [-52.5,-21,-1.2])box(M.sandstone,fx,y,zc,1.1,1,G.maxZ-G.minZ+22);
      box(M.sandstone,fx,-9.5,zc,.5,4.2,3);box(M.glass,fx+side*.28,-8.6,zc,.05,2.2,1.1);box(M.sandstone,fx+side*.1,-5.3,zc,.6,.6,3.6);}
    // Deck: road, pavements, parapets and lamps.
    box(M.cobble,B.x,0,zc,bw-1,.04,G.maxZ-G.minZ+28);for(const side of [-1,1]){box(M.sandstone,B.x+side*(bw/2-.35),0,zc,.7,1.15,G.maxZ-G.minZ+28);
      for(const z of [zc-14,zc-4,zc+6,zc+16]){box(M.iron,B.x+side*(bw/2-.35),1.15,z,.12,3.3,.12);box(M.lamp,B.x+side*(bw/2-.35),4.3,z,.38,.5,.38);}}
  }
  // Puente Viejo: a lower, single-arch stone bridge further up the gorge.
  {const P=RONDA_PLACES.oldBridge,fy=gorgeFloorY(P.x),shape=new THREE.Shape();shape.moveTo(G.minZ-6,fy-2);shape.lineTo(G.maxZ+6,fy-2);shape.lineTo(G.maxZ+6,1);shape.lineTo(G.minZ-6,1);shape.lineTo(G.minZ-6,fy-2);
    const h=new THREE.Path(),r=11;h.moveTo(P.z-r,fy-1);h.lineTo(P.z+r,fy-1);h.lineTo(P.z+r,-14);h.absarc(P.z,-14,r,0,Math.PI,false);h.lineTo(P.z-r,fy-1);shape.holes.push(h);
    const g=new THREE.ExtrudeGeometry(shape,{depth:5,bevelEnabled:false,curveSegments:14});g.rotateY(-Math.PI/2);g.translate(P.x+2.5,0,0);const mesh=new THREE.Mesh(g,M.sandstone);mesh.castShadow=mesh.receiveShadow=true;root.add(mesh);
    box(M.cobble,P.x,0,P.z,4.4,.04,G.maxZ-G.minZ+12);for(const s of [-1,1])box(M.sandstone,P.x+s*2.35,0,P.z,.45,1,G.maxZ-G.minZ+12);}

  // ---------- town ----------
  const places=RONDA_PLACES,houses=[];
  const keepClear=[ // streets, plazas, landmarks and the park stay open
    {minX:-660,maxX:-300,minZ:1394,maxZ:1406},{minX:-660,maxX:-300,minZ:1644,maxZ:1656},{minX:-526,maxX:-514,minZ:1150,maxZ:1850},{minX:-351,maxX:-339,minZ:1150,maxZ:1850},
    {minX:-548,maxX:-492,minZ:1432,maxZ:1478},{minX:-548,maxX:-492,minZ:1522,maxZ:1545},{minX:-600,maxX:-548,minZ:1438,maxZ:1478},{minX:places.arena.x-places.arena.r-4,maxX:places.arena.x+places.arena.r+4,minZ:places.arena.z-places.arena.r-4,maxZ:places.arena.z+places.arena.r+4},
    {minX:X0,maxX:-650,minZ:1240,maxZ:1440},{minX:-600,maxX:-530,minZ:1680,maxZ:1740},{minX:-416,maxX:-404,minZ:1150,maxZ:1850},{minX:-640,maxX:-300,minZ:1150,maxZ:1160},
    {minX:-330,maxX:-300,minZ:1470,maxZ:1530}];
  const clear=(x0,x1,z0,z1)=>!keepClear.some(k=>x1>k.minX&&x0<k.maxX&&z1>k.minZ&&z0<k.maxZ)&&!(z1>G.minZ-1&&z0<G.maxZ+1&&x0<XE+2)&&x0>X0+1.5&&x1<R.maxX-1&&z0>R.minZ&&z1<R.maxZ;
  const wallMats=[M.white,M.white,M.white,M.cream,M.white,M.ochre,M.white];
  function house(x,z,w,d,floors,seed,face){const h=floors*3.1+.4,mat=wallMats[Math.floor(hash2(seed,7)*wallMats.length)];box(mat,x,0,z,w,h,d);solid(x,z,w,d,'ronda-house');
    box(M.trim,x,h-.25,z,w+.18,.25,d+.18);roof(x,h,z,w+.5,1.2+Math.min(w,d)*.12,d+.5,w>=d?0:Math.PI/2);
    // Windows with green shutters and iron balconies on the two street-facing sides.
    for(const [fx,fz,len,ry] of [[0,d/2,w,0],[0,-d/2,w,Math.PI],[w/2,0,d,Math.PI/2],[-w/2,0,d,-Math.PI/2]]){if(face&&!face.includes(ry))continue;const n=Math.max(1,Math.floor(len/3.2));
      for(let f=0;f<floors;f++)for(let i=0;i<n;i++){const t=(i+.5)/n-.5,ox=Math.cos(ry)*t*len,oz=-Math.sin(ry)*t*len,wx=x+fx+ox+Math.sin(ry)*.03,wz=z+fz+oz+Math.cos(ry)*.03,y=f*3.1+(f===0?.9:1.1);
        const across=Math.abs(Math.sin(ry))>.5;box(M.glass,wx,y,wz,across?.06:1,1.5,across?1:.06);for(const s of [-1,1]){const sx=across?0:s*.82,sz=across?s*.82:0;box(M.green,wx+sx,y,wz+sz,across?.08:.55,1.55,across?.55:.08);}
        if(f>0&&hash2(seed,f*7+i)>.45){const bx=wx+Math.sin(ry)*.45,bz=wz+Math.cos(ry)*.45;box(M.iron,bx,y-.12,bz,across?.85:1.3,.06,across?1.3:.85);box(M.iron,bx+Math.sin(ry)*.4,y-.12,bz+Math.cos(ry)*.4,across?.04:1.3,.95,across?1.3:.04);
          if(hash2(seed,i)>.5)box(M.scrub,bx,y-.06,bz,across?.3:.9,.25,across?.9:.3);}}}
    houses.push({x,z,w,d,h});}
  // Dense blocks: back-to-back rows of attached houses (shared side walls), facing
  // narrow lanes, with varied widths, heights and slightly uneven facades.
  const lanesX=[-655,-612,-568,-482,-440,-385,-312];for(const x of lanesX)keepClear.push({minX:x-2.4,maxX:x+2.4,minZ:R.minZ,maxZ:R.maxZ});
  let seed=1;const rowDepth=10.5,lane=5;
  for(let z=R.minZ+14;z<R.maxZ-6;z+=rowDepth*2+lane)for(const [rz,face] of [[z+rowDepth/2,[Math.PI]],[z+rowDepth*1.5,[0]]]){
    // Outside the historic core the houses thin out into gardens and olive plots.
    const core=(rz>1240&&rz<G.minZ)||(rz>G.maxZ&&rz<1790);
    for(let x=X0+2.5;x<R.maxX-2;){const w=5+hash2(seed,1)*4.5,cx=x+w/2,d=rowDepth-.4-hash2(seed,2)*1.4,cz=rz+(face[0]===0?1:-1)*(rowDepth-d)/2+(hash2(seed,3)-.5)*.5;
      if(clear(cx-w/2,cx+w/2,cz-d/2-.2,cz+d/2+.2)&&(core||hash2(seed,4)>.62)){house(cx,cz,w,d,1+Math.floor(hash2(seed,5)*(core?2.7:1.6)),seed,face);x+=w;}else x+=core?1:3+hash2(seed,6)*6;seed++;}}
  // Houses hanging over the gorge rims and the western escarpment (as in the photos).
  for(let x=X0+6;x<XE-4;x+=11){for(const [z0,dir] of [[G.minZ-7,-1],[G.maxZ+7,1]]){const w=8+hash2(x,dir)*3,cz=z0+dir*hash2(x,9)*1.5;if(Math.abs(x-B.x)<16||Math.abs(x-places.oldBridge.x)<10||(dir<0&&x>-605&&x<-490)||(dir>0&&x>-548&&x<-492))continue;
      if(!houses.some(h=>Math.abs(h.x-x)<(h.w+w)/2+1&&Math.abs(h.z-cz)<(h.d+12)/2))house(x,cz,w,12,2+Math.floor(hash2(x,dir*3)*2),x*3+dir,[dir<0?0:Math.PI,Math.PI/2,-Math.PI/2]);}}
  for(let z=R.minZ+20;z<R.maxZ-10;z+=12){if(z>1230&&z<1450||z>G.minZ-12&&z<G.maxZ+12)continue;const w=10,cx=X0+7+hash2(z,4)*1.2;if(!houses.some(h=>Math.abs(h.x-cx)<(h.w+w)/2+1&&Math.abs(h.z-z)<(h.d+11)/2+1))house(cx,z,w,11,2+Math.floor(hash2(z,5)*2),z,[-Math.PI/2,0,Math.PI]);}

  // Parador: long cream building with ground-floor arcades beside the bridge.
  {const P=places.parador,h=P.h;box(M.cream,P.x,0,P.z,P.w,h,P.d);solid(P.x,P.z,P.w,P.d,'parador');box(M.trim,P.x,h,P.z,P.w+.4,.5,P.d+.4);roof(P.x,h+.5,P.z,P.w+.8,3,P.d+.8,0);
    for(const side of [-1,1]){const fz=P.z+side*(P.d/2+.02);for(let i=0;i<12;i++){const x=P.x-P.w/2+2+i*(P.w-4)/11;box(M.trim,x,0,fz+side*.25,.9,3.4,.5);box(M.glass,x+2,.2,fz+side*.04,2.4,2.6,.05);for(const y of [5,8.4])box(M.glass,x,y,fz+side*.04,1.2,1.9,.06);for(const y of [5,8.4])box(M.iron,x,y-.15,fz+side*.35,1.6,.9,.04);}}
    for(let i=0;i<9;i++)box(M.lamp,P.x-P.w/2+3+i*5.5,3.6,P.z+P.d/2+.45,.4,.4,.2);}
  // Plaza de España at the bridge's north end, a smaller square to the south.
  for(const [x,z] of [[-540,1440],[-500,1440],[-540,1470],[-500,1470],[-540,1530],[-500,1530]]){box(M.iron,x,0,z,.14,3.6,.14);box(M.lamp,x,3.6,z,.5,.6,.5);}
  box(M.sandstone,-503,0,1456,3.4,.5,3.4);box(M.sandstone,-503,.5,1456,1.2,2.2,1.2);solid(-503,1456,3.4,3.4,'fountain');
  // Shared streets: darker setts mark where cars may drive; the link road joins Sunshore.
  {const [a,b]=R.roads.ew,[c,d]=R.roads.ns,L=R.link;box(M.road,(-660+R.maxX)/2,-.05,a,R.maxX+660,.06,11);box(M.road,(-660+R.maxX)/2,-.05,b,R.maxX+660,.06,11);
    for(const [z0,z1] of [[1180,G.minZ-1],[G.maxZ+1,1820]])for(const x of [c,d])box(M.road,x,-.05,(z0+z1)/2,x===c?10.4:11,.06,z1-z0);
    box(visualKit.asphalt||M.road,(L.minX+L.maxX)/2,-.04,L.z,L.maxX-L.minX,.06,L.halfWidth*2);
    for(const x of [L.minX+6,L.maxX-6])for(const s of [-1,1]){box(M.iron,x,0,L.z+s*(L.halfWidth+.6),.14,4.2,.14);box(M.lamp,x,4.2,L.z+s*(L.halfWidth+.6),.45,.5,.45);}}

  // Historic arena: round white wall with arches, two tiers of seating under a tile roof.
  {const A=places.arena,seg=48,outer=A.r,inner=A.r-9;
    const ring=(r0,r1,y0,y1,mat)=>{const g=new THREE.CylinderGeometry(r1,r1,y1-y0,seg,1,true),m=new THREE.Mesh(g,mat);m.position.set(A.x,(y0+y1)/2,A.z);m.castShadow=m.receiveShadow=true;root.add(m);
      const g2=new THREE.CylinderGeometry(r0,r0,y1-y0,seg,1,true),m2=new THREE.Mesh(g2,mat);m2.material=mat.clone();m2.material.side=THREE.BackSide;m2.position.copy(m.position);root.add(m2);return m;};
    ring(outer-.6,outer,0,9,M.white);ring(inner,inner+.5,0,2,M.trim);
    const sand=new THREE.Mesh(new THREE.CircleGeometry(inner,seg),M.sand);sand.rotation.x=-Math.PI/2;sand.position.set(A.x,.05,A.z);sand.receiveShadow=true;root.add(sand);
    const seats=new THREE.Mesh(new THREE.CylinderGeometry(outer-1.2,inner+.6,4.5,seg,1,true),M.sandstone);seats.position.set(A.x,4,A.z);seats.material=M.sandstone;root.add(seats);
    const roofRing=new THREE.Mesh(new THREE.CylinderGeometry(outer-4.5,outer+.6,2,seg,1,true),M.roof);roofRing.position.set(A.x,9.6,A.z);roofRing.castShadow=true;root.add(roofRing);
    for(let i=0;i<seg;i++){const a=i/seg*Math.PI*2,x=A.x+Math.cos(a)*(outer+.05),z=A.z+Math.sin(a)*(outer+.05);box(M.trim,x,0,z,.6,.5,1.2,-a);if(i%2===0)box(M.green,x,1,z,.08,2.2,1.4,-a);box(M.trim,x,5.6,z,.15,1.5,1.2,-a);}
    const gate=Math.PI/2;box(M.sandstone,A.x,0,A.z+outer+.3,6,6.2,1.2);box(M.wood,A.x,0,A.z+outer+.9,3,4.2,.2);
    for(let k=0;k<seg;k++){const a=k/seg*Math.PI*2;if(Math.abs(a-gate)<.12)continue;solid(A.x+Math.cos(a)*(outer-.3),A.z+Math.sin(a)*(outer-.3),2.6,2.6,'arena');}}

  // Santa María la Mayor: church with a square bell tower in the old town.
  {const C=places.church;box(M.cream,C.x,0,C.z,34,13,20);solid(C.x,C.z,34,20,'church');roof(C.x,13,C.z,35,4,21,0);box(M.cream,C.x+19,0,C.z-6,8,26,8);solid(C.x+19,C.z-6,8,8,'church');box(M.trim,C.x+19,22,C.z-6,8.6,.6,8.6);
    for(const [dx,dz] of [[0,4.05],[0,-4.05],[4.05,0],[-4.05,0]])box(M.glass,C.x+19+dx,19,C.z-6+dz,Math.abs(dx)>0?.1:2,3.4,Math.abs(dz)>0?.1:2);roof(C.x+19,26,C.z-6,9,4,9,0);
    box(M.wood,C.x,0,C.z+10.05,3,5,.1);box(M.sandstone,C.x,0,C.z+10.1,6,7.5,.3);}
  // Alameda del Tajo: gardens with paths, trees and the cliff-top viewpoint gazebo.
  {const P=places.mirador;box(M.grass,(X0+(-650))/2,-.04,1340,50,.06,200);for(let z=1250;z<1440;z+=14){const t=visualKit.treeModel?.(-668+hash2(z,1)*10,z,.55);if(t)root.add(t);}
    box(M.sandstone,P.x,0,P.z,8,.4,8);for(let i=0;i<8;i++){const a=i/8*Math.PI*2;box(M.iron,P.x+Math.cos(a)*3.6,.4,P.z+Math.sin(a)*3.6,.12,3,.12);}
    const dome=new THREE.Mesh(new THREE.ConeGeometry(4.6,1.8,16),M.iron);dome.position.set(P.x,4.3,P.z);root.add(dome);}

  // Cliff-edge railings wherever the rim is open (iron rail on a low stone wall).
  function rail(x1,z1,x2,z2){const len=Math.hypot(x2-x1,z2-z1),cx=(x1+x2)/2,cz=(z1+z2)/2,ry=Math.atan2(x2-x1,z2-z1);box(M.sandstone,cx,0,cz,.45,.55,len,ry);box(M.iron,cx,1.05,cz,.06,.06,len,ry);for(let t=0;t<len;t+=2){const x=x1+(x2-x1)*t/len,z=z1+(z2-z1)*t/len;box(M.iron,x,.55,z,.05,.5,.05);}}
  rail(X0+.9,1180,X0+.9,G.minZ-1);rail(X0+.9,G.maxZ+1,X0+.9,R.maxZ-5);
  for(const [a,b] of [[X0+1,B.x-bw/2-.2],[B.x+bw/2+.2,places.oldBridge.x-3],[places.oldBridge.x+3,XE+1]]){rail(a,G.minZ-.9,b,G.minZ-.9);rail(a,G.maxZ+.9,b,G.maxZ+.9);}
  rail(XE+.9,G.minZ-1,XE+.9,G.maxZ+1);

  // Cypresses and shrubs: in the gorge, on ledges and in the gardens.
  {const n=mobile?120:340,cy=new THREE.InstancedMesh(new THREE.ConeGeometry(.9,1,7),new THREE.MeshStandardMaterial({color:0x2f4a2c,roughness:.9}),n),m=new THREE.Matrix4(),q=new THREE.Quaternion(),s=new THREE.Vector3(),t=new THREE.Vector3();let k=0;
    for(let i=0;i<n;i++){let x,z,y,h=6+hash2(i,2,61)*6;if(i%3===0){x=X0+10+hash2(i,3,61)*(XE-X0-20);z=(G.minZ+G.maxZ)/2+(hash2(i,4,61)-.5)*26;y=gorgeFloorY(x)+2;}else if(i%3===1){x=X0+3+hash2(i,5,61)*(R.maxX-X0-6);z=R.minZ+hash2(i,6,61)*(R.maxZ-R.minZ);if(!clear(x-1,x+1,z-1,z+1))continue;y=0;}else{x=X0-30-hash2(i,7,61)*400;z=1100+hash2(i,8,61)*1300;y=VY;}
      t.set(x,y+h/2,z);s.set(1+hash2(i,9,61)*.4,h,1+hash2(i,9,61)*.4);cy.setMatrixAt(k++,m.compose(t,q,s));}cy.count=k;cy.castShadow=!mobile;root.add(cy);
    if(visualKit.shrub)for(let i=0;i<(mobile?60:180);i++){const x=X0+6+hash2(i,1,71)*(XE-X0-12),z=(G.minZ+G.maxZ)/2+(hash2(i,2,71)-.5)*30;visualKit.shrub(x,gorgeFloorY(x)+.5,z,{width:2+hash2(i,3,71)*2.5,height:1.5+hash2(i,4,71)*1.5,tint:0x5f7a3c});}}

  // ---------- commit batches ----------
  const dummy=new THREE.Object3D(),meshes=[];
  for(const [mat,list] of batches){const mesh=new THREE.InstancedMesh(unit,mat,list.length);list.forEach(([x,y,z,w,h,d,ry],i)=>{dummy.position.set(x,y,z);dummy.rotation.set(0,ry,0);dummy.scale.set(w,h,d);dummy.updateMatrix();mesh.setMatrixAt(i,dummy.matrix);});
    mesh.castShadow=!mobile;mesh.receiveShadow=true;mesh.computeBoundingSphere();root.add(mesh);meshes.push(mesh);}
  {const mesh=new THREE.InstancedMesh(hipGeo,M.roof,roofs.length);roofs.forEach(([x,y,z,w,h,d,ry],i)=>{dummy.position.set(x,y,z);dummy.rotation.set(0,ry,0);dummy.scale.set(ry?d:w,h,ry?w:d);dummy.updateMatrix();mesh.setMatrixAt(i,dummy.matrix);});mesh.castShadow=!mobile;mesh.receiveShadow=true;mesh.computeBoundingSphere();root.add(mesh);meshes.push(mesh);}

  let time=0;
  return {
    root,houses,places:RONDA_PLACES,materials:M,scanned,cliffMeshes,batches:meshes,
    update(dt){time+=Math.min(.1,dt||0);if(fallTexture)fallTexture.offset.y=-time*1.4;foam.material.opacity=.6+Math.sin(time*3)*.12;},
    nearestLandmark(p,radius=7){const spots=[['bridge',RONDA_PLACES.bridge.x,RONDA_PLACES.bridge.z,9],['arena',RONDA_PLACES.arena.x,RONDA_PLACES.arena.z+RONDA_PLACES.arena.r+3,radius],['town',RONDA_PLACES.mirador.x+6,RONDA_PLACES.mirador.z,radius]];
      let best=null,dist=Infinity;for(const [id,x,z,r] of spots){const d=Math.hypot(p.x-x,p.z-z);if(d<r&&d<dist){dist=d;best={id,x,z,fact:RONDA_FACTS[id],name:id==='bridge'?'Puente Nuevo':id==='arena'?'Historic arena':'Alameda viewpoint'};}}return best;},
    walkable:rondaWalkable
  };
}

// Attach scans when they stream in; `load(url)` is the shared KTX2 loader.
export async function loadRondaScans(world,{load,size=1024,anisotropy=4}={}){
  const cache=new Map(),get=url=>{if(!cache.has(url))cache.set(url,Promise.resolve().then(()=>load(url)).then(t=>{t.wrapS=t.wrapT=THREE.RepeatWrapping;t.anisotropy=anisotropy;if(url.endsWith('-diff.ktx2'))t.colorSpace=THREE.SRGBColorSpace;return t;}).catch(()=>null));return cache.get(url);};
  let applied=0;
  await Promise.all(world.scanned.map(async m=>{const s=RONDA_SCANS[m.userData.rondaScan];if(!s)return;const base='./assets/ronda/textures/'+s.id+'-'+size+'-';
    const [diff,nor,arm]=await Promise.all(['diff','nor','arm'].map(k=>get(base+k+'.ktx2')));
    if(diff)m.map=diff;if(nor){m.normalMap=nor;}if(arm){m.roughnessMap=arm;m.aoMap=arm;}if(diff&&s.relief){/* whitewash keeps its paint colour; the scan only adds relief */m.map=null;}
    if(diff||nor||arm){m.needsUpdate=true;applied++;}}));
  return {applied};
}
