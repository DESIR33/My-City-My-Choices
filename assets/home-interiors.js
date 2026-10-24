import * as THREE from 'three';
import {applyWorldSurfaceUV} from './city-materials.js';
import {HOUSE_TEXTURES} from './house-surfaces.js';
import {communityPoint} from './world-rules.js';

// Finished interiors for the neighborhood homes: scanned floor, plaster walls and
// ceilings, painted kitchen joinery, real furniture models and warm room lights.
// Scans reuse the CC0 Poly Haven KTX2 files already shipped for 101 Maple Grove
// (assets/house/textures); every material works untextured until they arrive.
export const INTERIOR_SURFACES=Object.freeze({
  floor:{texture:'laminate_floor_02',color:0xf2e6d6,roughness:1},
  plaster:{texture:'painted_plaster_wall',detail:true,color:0xeee6d8,roughness:1},
  ceiling:{texture:'painted_plaster_wall',detail:true,color:0xf7f3ec,roughness:1},
  accentWall:{texture:'painted_plaster_wall',detail:true,color:0x8d9a8b,roughness:1},
  trim:{color:0xf4f0e8,roughness:.45},
  cabinet:{color:0x6c7b6c,roughness:.5},                 // painted shaker fronts
  upper:{color:0xf1ede4,roughness:.42},
  oak:{texture:'kitchen_wood',color:0xf0c690,roughness:1},
  walnut:{texture:'wood_table_001',color:0xc8a98c,roughness:1},
  quartz:{color:0xebe7df,roughness:.22,physical:{clearcoat:.4,clearcoatRoughness:.15}},
  tile:{color:0xf2f1ec,roughness:.18,physical:{clearcoat:.5,clearcoatRoughness:.1}},
  steel:{color:0xc9ced2,roughness:.28,metalness:1},
  brass:{color:0xb8964f,roughness:.3,metalness:1},
  black:{color:0x1b1d1f,roughness:.5},
  screen:{color:0x07090b,roughness:.08,physical:{clearcoat:1,clearcoatRoughness:.04}},
  fabric:{texture:'fabric_pattern_07',color:0x8f9a8c,roughness:1},
  lamp:{color:0xfff3dc,roughness:.6,emissive:0xffe2b0,emissiveIntensity:1.6},
  glass:{color:0xdfe9ea,roughness:.04,physical:{transparent:true,opacity:.16,depthWrite:false,clearcoat:1}},
  curtain:{texture:'fabric_pattern_07',color:0xcbbfa8,roughness:1}
});

// Paint colours real homes use, mixed per house so no two interiors match.
export const INTERIOR_PAINTS=Object.freeze({
  greige:0xd4c8b6,linen:0xe6dccb,sage:0x9fae98,mist:0xa9b8bf,clay:0xc59a7c,blush:0xd8b9ab,
  terracotta:0xb06f52,navy:0x34475c,forest:0x3e5848,ochre:0xc8a45a,charcoal:0x4a4d50
});
const SCHEMES=[
  {walls:'greige',accent:'forest',bedroom:'mist',bedAccent:'navy',art:[0,3]},
  {walls:'linen',accent:'terracotta',bedroom:'sage',bedAccent:'forest',art:[1,4]},
  {walls:'mist',accent:'navy',bedroom:'blush',bedAccent:'clay',art:[2,5]},
  {walls:'sage',accent:'charcoal',bedroom:'linen',bedAccent:'terracotta',art:[3,1]},
  {walls:'linen',accent:'ochre',bedroom:'mist',bedAccent:'navy',art:[4,2]},
  {walls:'blush',accent:'forest',bedroom:'greige',bedAccent:'clay',art:[5,0]}
];
export function interiorScheme(home){let h=0;for(const c of home.id)h=(h*31+c.charCodeAt(0))>>>0;return SCHEMES[h%SCHEMES.length];}

// Six original abstract prints drawn once on canvases (no external art).
export function drawArtwork(index,canvas){
  const q=canvas.getContext('2d'),W=canvas.width,H=canvas.height,rand=(()=>{let t=index*9301+49297;return ()=>((t=(t*9301+49297)%233280)/233280);})();
  const sets=[['#e9e1d3','#2f4a3f','#c68c5a','#d9b98b'],['#f1ece2','#b8644a','#3b4a5c','#e2c79b'],['#e7e4dc','#6f8a8f','#c9a35e','#2e3436'],['#efe7da','#8a9a7b','#d7a68c','#47524c'],['#f3eee6','#1f3b52','#d9a441','#9fb3b8'],['#ebe3d7','#a8574a','#e4c5a1','#5c6f63']][index%6];
  q.fillStyle=sets[0];q.fillRect(0,0,W,H);
  if(index%3===0){for(let i=0;i<5;i++){q.fillStyle=sets[1+i%3];q.globalAlpha=.85;q.beginPath();q.arc(W*(.2+rand()*.6),H*(.2+rand()*.6),W*(.12+rand()*.2),0,Math.PI*2);q.fill();}}
  else if(index%3===1){for(let i=0;i<4;i++){q.fillStyle=sets[1+i%3];q.globalAlpha=.9;q.fillRect(W*rand()*.5,H*(i/4),W*(.4+rand()*.5),H*.22);}}
  else{q.globalAlpha=1;q.fillStyle=sets[3];q.fillRect(0,H*.55,W,H*.45);q.fillStyle=sets[1];q.beginPath();q.moveTo(0,H*.62);for(let x=0;x<=W;x+=W/8)q.lineTo(x,H*(.38+rand()*.22));q.lineTo(W,H*.62);q.fill();q.fillStyle=sets[2];q.beginPath();q.arc(W*.72,H*.24,W*.1,0,Math.PI*2);q.fill();}
  q.globalAlpha=1;return canvas;
}

export function createInteriorSurfaces({canvas=()=>globalThis.document?.createElement('canvas')}={}){
  const materials={},paints=new Map(),art=[];
  for(const [role,s] of Object.entries(INTERIOR_SURFACES)){
    const Material=s.physical?THREE.MeshPhysicalMaterial:THREE.MeshStandardMaterial;
    const m=new Material({name:'Home interior '+role,color:s.color,roughness:s.roughness??.8,metalness:s.metalness??0,...(s.physical||{}),...(s.emissive?{emissive:s.emissive,emissiveIntensity:s.emissiveIntensity}:{})});
    m.userData.interiorSurface=role;m.userData.texture=s.texture||null;
    if(s.texture){const tile=HOUSE_TEXTURES[s.texture].size;m.onBeforeCompile=shader=>applyWorldSurfaceUV(shader,tile);m.customProgramCacheKey=()=>'home-interior:'+tile;}
    materials[role]=m;
  }
  // A paint is the plaster scan in a colour; the same relief maps attach to all of them.
  function paint(name){const color=INTERIOR_PAINTS[name]??name;if(!paints.has(color)){const m=materials.plaster.clone();m.color.set(color);m.name='Home interior paint '+name;m.userData={...materials.plaster.userData};m.onBeforeCompile=materials.plaster.onBeforeCompile;m.customProgramCacheKey=materials.plaster.customProgramCacheKey;paints.set(color,m);}return paints.get(color);}
  // Soft furnishings: the woven fabric scan in a paint colour (bedding, rugs, throws).
  const fabrics=new Map();function fabric(name){const color=INTERIOR_PAINTS[name]??name;if(!fabrics.has(color)){const m=materials.fabric.clone();m.color.set(color);m.name='Home interior fabric '+name;m.userData={...materials.fabric.userData};m.onBeforeCompile=materials.fabric.onBeforeCompile;m.customProgramCacheKey=materials.fabric.customProgramCacheKey;fabrics.set(color,m);}return fabrics.get(color);}
  function artwork(index){const i=index%6;if(!art[i]){const c=canvas();let map=null;try{if(c?.getContext){c.width=256;c.height=320;drawArtwork(i,c);map=new THREE.CanvasTexture(c);map.colorSpace=THREE.SRGBColorSpace;}}catch{map=null;}art[i]=new THREE.MeshStandardMaterial({name:'Home interior print '+i,map,color:map?0xffffff:0xd8cfc0,roughness:.85});}return art[i];}
  return {materials,paint,fabric,artwork,get all(){return [...Object.values(materials),...paints.values(),...fabrics.values()];}};
}

// Attach the scans once they stream in; `load(url)` is the shared KTX2 loader.
export async function loadInteriorSurfaceMaps(surfaces,{load,base='./assets/house/textures/',size=1024,anisotropy=4}={}){
  const cache=new Map(),get=(id,map)=>{const url=base+id+'-'+size+'-'+map+'.ktx2';if(!cache.has(url))cache.set(url,Promise.resolve().then(()=>load(url)).then(t=>{t.wrapS=t.wrapT=THREE.RepeatWrapping;t.anisotropy=anisotropy;if(map==='diff')t.colorSpace=THREE.SRGBColorSpace;return t;}).catch(()=>null));return cache.get(url);};
  let applied=0;
  await Promise.all(surfaces.all.map(async m=>{
    const id=m.userData.texture;if(!id)return;const maps=HOUSE_TEXTURES[id].maps,detail=INTERIOR_SURFACES[m.userData.interiorSurface]?.detail;
    const [diff,nor,arm]=await Promise.all(['diff','nor','arm'].map(k=>maps.includes(k)&&!(detail&&k==='diff')?get(id,k):null));
    if(diff)m.map=diff;if(nor){m.normalMap=nor;m.normalScale.set(.8,.8);}if(arm){m.roughnessMap=arm;}
    if(diff||nor||arm){m.needsUpdate=true;applied++;}
  }));
  return {applied,textures:cache.size};
}

// Model space for each owner-supplied set, in metres (from tools/prepare-interior-models.mjs).
export const INTERIOR_MODELS=Object.freeze({
  bedroom:{url:'./assets/interior/bedroom-set.glb',pieces:{bed:{min:[-1.96,0,-.77],max:[.29,1.05,1.29]},'nightstand-left':{min:[-2.4,0,.75],max:[-1.9,.5,1.27]},'nightstand-right':{min:[.2,0,.75],max:[.7,.5,1.27]},ottoman:{min:[-1.43,0,-2.19],max:[-.98,.46,-1.74]}}},
  cabinet:{url:'./assets/interior/accent-cabinet.glb',pieces:{cabinet:{min:[-.4,0,-.2],max:[.4,.78,.2]}}},
  chair:{url:'./assets/house/furniture/dining_chair_02.glb',pieces:{chair:{min:[-.22,0,-.3],max:[.22,.97,.25]}}},
  plant:{url:'./assets/house/furniture/potted_plant_02.glb',pieces:{plant:{min:[-.3,0,-.3],max:[.3,.84,.3]}}}
});
export const INTERIOR_FLOOR=.3,INTERIOR_VISIBLE_DISTANCE=34;

// A piece's world collider for a placement (house-local x/z, yaw in quarter turns).
export function placedPieceBoxes(home,place,model){
  const c=Math.round(Math.cos(place.yaw||0)),s=Math.round(Math.sin(place.yaw||0));
  return Object.entries(INTERIOR_MODELS[model].pieces).map(([id,p])=>{
    const xs=[p.min[0],p.max[0]],zs=[p.min[2],p.max[2]],pts=xs.flatMap(x=>zs.map(z=>({x:place.x+x*c+z*s,z:place.z-x*s+z*c})));
    const minX=Math.min(...pts.map(q=>q.x)),maxX=Math.max(...pts.map(q=>q.x)),minZ=Math.min(...pts.map(q=>q.z)),maxZ=Math.max(...pts.map(q=>q.z));
    return {id,x:(minX+maxX)/2,z:(minZ+maxZ)/2,w:maxX-minX,d:maxZ-minZ,minY:INTERIOR_FLOOR+p.min[1],maxY:INTERIOR_FLOOR+p.max[1]};
  });
}

// Placed furniture models: colliders now, shared clones once each model streams in.
// Until a model arrives (or on phones, which skip the detailed models) each piece
// shows a simple stand-in block, so no collider is ever invisible.
const PROXY_COLORS={bedroom:{bed:0xe9e4da,'nightstand-left':0xb08a5e,'nightstand-right':0xb08a5e,ottoman:0x5a524a},cabinet:{cabinet:0xeee9df},chair:{chair:0xb08a5e},plant:{plant:0x5d6e48}};
export function createInteriorProps({scene,solid,visibleDistance=INTERIOR_VISIBLE_DISTANCE}){
  const placements=[],unit=new THREE.BoxGeometry(1,1,1),proxyMaterials=new Map(),models={};
  const proxyMaterial=color=>{if(!proxyMaterials.has(color))proxyMaterials.set(color,new THREE.MeshStandardMaterial({color,roughness:.8}));return proxyMaterials.get(color);};
  function proxy(model){const g=new THREE.Group();g.name='stand-in';for(const [id,p] of Object.entries(INTERIOR_MODELS[model].pieces)){const h=Math.min(p.max[1]-p.min[1],model==='chair'?.48:9);const m=new THREE.Mesh(unit,proxyMaterial(PROXY_COLORS[model]?.[id]??0xd8d2c6));m.scale.set(p.max[0]-p.min[0],h,p.max[2]-p.min[2]);m.position.set((p.min[0]+p.max[0])/2,p.min[1]+h/2,(p.min[2]+p.max[2])/2);m.castShadow=m.receiveShadow=true;g.add(m);}return g;}
  function add(home,model,place,{collide=true,name=model}={}){
    const world=communityPoint(home,place.x,place.z),group=new THREE.Group();group.name=name+' · '+home.address+' '+home.street;
    group.position.set(world.x,INTERIOR_FLOOR+(place.y||0),world.z);group.rotation.y=home.heading+(place.yaw||0);group.visible=false;group.add(models[model]?models[model].clone(true):proxy(model));scene.add(group);
    const colliders=collide?placedPieceBoxes(home,place,model).map(b=>Object.assign(solid(home,b.x,b.z,b.w,b.d,'community-furniture'),{houseId:home.id,fixtureId:name+'-'+b.id,minY:b.minY,maxY:b.maxY})):[];
    const entry={home,model,place,group,colliders,center:communityPoint(home,0,0)};placements.push(entry);return entry;
  }
  function install(id,source){models[id]=source;source.traverse(o=>{if(o.isMesh){o.castShadow=true;o.receiveShadow=true;}});for(const p of placements)if(p.model===id){p.group.clear();p.group.add(source.clone(true));}}
  function update(p){if(!p)return;const limit=visibleDistance*visibleDistance;for(const e of placements){const dx=p.x-e.center.x,dz=p.z-e.center.z;e.group.visible=dx*dx+dz*dz<limit;}}
  return {placements,add,install,update,get modelIds(){return [...new Set(placements.map(p=>p.model))];},installed:id=>!!models[id]};
}

// Two warm ceiling lights follow the player into whichever home they are in. Their
// count never changes (only intensity), so entering a house compiles no shaders.
export const ROOM_LIGHT={color:0xffe1b8,intensity:9,distance:9,decay:2,height:2.75};
export function createRoomLights(scene,count=2){
  const lights=Array.from({length:count},()=>{const l=new THREE.PointLight(ROOM_LIGHT.color,0,ROOM_LIGHT.distance,ROOM_LIGHT.decay);l.castShadow=false;scene.add(l);return l;});
  let current=null,key='';
  // spots: house-local {x,z,y} ceiling fixtures on the player's floor; the nearest two light up.
  function update(home,spots,p){
    if(!home||!spots?.length){if(current!==null){for(const l of lights)l.intensity=0;current=null;key='';}return;}
    const world=spots.map(s=>({s,w:communityPoint(home,s.x,s.z)})),near=p?world.slice().sort((a,b)=>Math.hypot(a.w.x-p.x,a.w.z-p.z)-Math.hypot(b.w.x-p.x,b.w.z-p.z)):world,pick=near.slice(0,count);
    const next=home.id+':'+pick.map(o=>o.s.x.toFixed(2)+','+o.s.z.toFixed(2)+','+(o.s.y??ROOM_LIGHT.height)).join('|');current=home.id;if(next===key)return;key=next;
    lights.forEach((l,i)=>{const o=pick[i];if(!o){l.intensity=0;return;}l.position.set(o.w.x,(o.s.y??ROOM_LIGHT.height+INTERIOR_FLOOR-.3)-.05,o.w.z);l.intensity=ROOM_LIGHT.intensity;});
  }
  return {lights,update,get current(){return current;}};
}
