import assert from 'node:assert/strict';
import {readFile,stat} from 'node:fs/promises';
import * as THREE from 'three';
import {INTERIOR_MODELS,INTERIOR_PAINTS,interiorScheme,createInteriorSurfaces,createInteriorProps,createRoomLights,placedPieceBoxes,ROOM_LIGHT,loadInteriorSurfaceMaps} from '../assets/home-interiors.js';
import {createPlannedCommunity} from '../assets/planned-community.js';
import {COMMUNITY_HOMES,communityPoint} from '../assets/world-rules.js';
import {cameraArchitectureBoxes} from '../assets/camera-geometry.js';
import {houseObstacleBlocks} from '../assets/house-rules.js';
import {localWalkPath,lineClear} from '../assets/city-navigation.js';

const file=p=>new URL('../'+p,import.meta.url);
// Owner models are present, small enough and carry their own materials (no missing textures).
for(const [id,budget] of [['bedroom',1.6e6],['cabinet',1.2e6]]){const glb=await readFile(file(INTERIOR_MODELS[id].url.slice(2)));assert.ok(glb.length<budget,id+' under budget');const json=JSON.parse(glb.subarray(20,20+glb.readUInt32LE(12)).toString('utf8'));assert.ok(!json.images,id+' has no external images');assert.ok(json.materials.length>=4,id+' has part materials');}
for(const id of ['chair','plant'])assert.ok((await stat(file(INTERIOR_MODELS[id].url.slice(2)))).size>0);

// Paint schemes: deterministic, varied across the street, real colours.
const schemes=COMMUNITY_HOMES.map(interiorScheme);assert.deepEqual(interiorScheme(COMMUNITY_HOMES[3]),schemes[3]);
assert.ok(new Set(schemes.map(s=>s.walls+s.accent+s.bedroom)).size>=4,'neighbouring homes are painted differently');
for(const s of schemes)for(const k of ['walls','accent','bedroom','bedAccent'])assert.ok(INTERIOR_PAINTS[s[k]]!==undefined);
const surfaces=createInteriorSurfaces({canvas:()=>null}),sage=surfaces.paint('sage');assert.equal(surfaces.paint('sage'),sage,'one material per colour');
assert.equal(sage.color.getHex(),INTERIOR_PAINTS.sage);assert.equal(sage.userData.texture,'painted_plaster_wall');assert.ok(surfaces.all.includes(sage));
assert.equal(surfaces.artwork(1).map,null,'prints fall back to plain canvas colour without a 2D canvas');
// Every paint receives the shared plaster relief when the scans arrive.
const loaded=[];const fake=url=>{loaded.push(url);return Promise.resolve(new THREE.Texture());};const r=await loadInteriorSurfaceMaps(surfaces,{load:fake,size:512});
assert.ok(sage.normalMap&&sage.normalMap===surfaces.materials.plaster.normalMap,'paints share the plaster relief');assert.ok(r.applied>=6);assert.ok(loaded.every(u=>u.includes('-512-')));
assert.ok(!loaded.some(u=>u.includes('painted_plaster_wall-512-diff')),'painted walls keep their paint colour (no plaster diffuse)');

// Placement maths: quarter-turn rotations keep boxes axis aligned and the right size.
const home={id:'t',x:0,z:0,w:14,d:12,heading:0,address:1,street:'Test'},bed=placedPieceBoxes(home,{x:-4,z:-5,yaw:Math.PI},'bedroom').find(b=>b.id==='bed');
assert.ok(Math.abs(bed.w-2.25)<1e-9&&Math.abs(bed.d-2.06)<1e-9);assert.ok(Math.abs(bed.z-(-5-(-.77+1.29)/2))<1e-9,'headboard turns toward the wall');

// Props: stand-ins first, the real model swaps in, colliders carry heights.
const scene=new THREE.Scene(),obstacles=[],solid=(h,x,z,w,d,kind)=>{const o={minX:x-w/2,maxX:x+w/2,minZ:z-d/2,maxZ:z+d/2,kind,homeId:h.id};obstacles.push(o);return o;};
const props=createInteriorProps({scene,solid}),e=props.add(home,'cabinet',{x:2,z:5});assert.equal(e.group.children[0].name,'stand-in');assert.equal(e.colliders[0].maxY,.3+.78);
props.update({x:0,z:0});assert.equal(e.group.visible,true);props.update({x:200,z:0});assert.equal(e.group.visible,false);
const model=new THREE.Group();model.add(new THREE.Mesh(new THREE.BoxGeometry(),new THREE.MeshStandardMaterial()));props.install('cabinet',model);assert.notEqual(e.group.children[0].name,'stand-in');assert.equal(e.group.children.length,1);
const late=props.add(home,'cabinet',{x:-2,z:5});assert.notEqual(late.group.children[0].name,'stand-in','placements after install use the model');

// Room lights: a fixed pool; entering or leaving only changes intensity.
const lightScene=new THREE.Scene(),lights=createRoomLights(lightScene);assert.equal(lightScene.children.length,2);
lights.update(home,[{x:1,z:1},{x:-2,z:-2}]);assert.ok(lights.lights.every(l=>l.intensity===ROOM_LIGHT.intensity));lights.update(null);assert.ok(lights.lights.every(l=>l.intensity===0));assert.equal(lightScene.children.length,2);

// The neighbourhood: every enterable home is lined, painted and lit; 139 has windows.
globalThis.document={createElement:()=>({width:0,height:0,getContext:()=>new Proxy({},{get:()=>()=>{}})})};
const mat=new THREE.MeshStandardMaterial(),m=()=>mat,visualKit={concrete:mat,grass:mat,asphalt:mat,wood:m,siding:m,brick:m,roofing:m,windowMaterial:m,treeModel:()=>new THREE.Group(),atmosphere:{registerGlow(){},addStreetLight(){}}};
const world=new THREE.Scene(),obs=[],community=createPlannedCommunity({scene:world,visualKit,obstacles:obs,groundSurfaces:[],buildings:[]});world.updateMatrixWorld(true);
const used=new Set(community.architectureBatches.map(b=>b.material));
for(const h of COMMUNITY_HOMES.filter(h=>h.id!=='maple-grove-1'))assert.ok(used.has(community.interiorSurfaces.paint(interiorScheme(h).walls)),h.id+' walls are painted');
assert.ok(community.interiorProps.placements.filter(p=>p.model==='cabinet').length>=15,'a media cabinet in every sofa-set home plus 139');
const h139=COMMUNITY_HOMES.find(h=>h.id==='maple-grove-20'),boxes=cameraArchitectureBoxes(world);
const through=(x,z,y)=>{const p=communityPoint(h139,x,z);return !boxes.some(b=>p.x>b.minX&&p.x<b.maxX&&p.z>b.minZ&&p.z<b.maxZ&&y>b.minY&&y<b.maxY);};
for(const [side,z] of [[1,-h139.d*.27],[1,h139.d*.24],[-1,h139.d*.24]])assert.ok(through(side*(h139.w/2-.07),z,1.9),'139 side window is open at '+side+','+z);
assert.ok(!through(-(h139.w/2-.07),-h139.d*.27,1.9),'the window behind the stairs stays dressed');
for(const x of [-h139.w*.29,0,h139.w*.29])assert.ok(through(x,h139.d/2-.07,5.0),'139 upstairs front window is open at '+x);
assert.ok(through(h139.w*.4,h139.d/2-.07,1.8),'139 front window is open');
const other=COMMUNITY_HOMES.find(h=>h.id==='maple-grove-2'),pOther=communityPoint(other,other.w/2,-other.d*.27);assert.ok(boxes.some(b=>pOther.x>=b.minX-.01&&pOther.x<=b.maxX+.01&&pOther.z>b.minZ&&pOther.z<b.maxZ&&1.9>b.minY&&1.9<b.maxY),'unfurnished shells keep closed walls');
let lit=null;community.update(1/60,{...communityPoint(h139,0,0),y:.3});lit=community.roomLights.current;assert.equal(lit,h139.id);community.update(1/60,{x:0,y:0,z:0});assert.equal(community.roomLights.current,null);

// Stairs and the upper storey in every enterable home.
for(const h of COMMUNITY_HOMES.filter(h=>h.id!=='maple-grove-1')){
  const S=community.stairsOf(h),cx=(S.x0+S.x1)/2,P=(x,z)=>communityPoint(h,x,z),first=P(cx,S.z0+.45);let last=community.floorAt(first.x,first.z,.3);assert.ok(last<.8,'the flight starts at the floor');
  const blockedAt=(x,z,y)=>obs.some(o=>(o.homeId===h.id||o.houseId===h.id)&&!o.vehicleOnly&&!o.dynamicDoor&&houseObstacleBlocks({...o,houseId:o.houseId??(o.minY!=null?h.id:undefined)},x,z,y));
  for(let z=S.z0+.45;z<=S.z1;z+=.1){const p=P(cx,z),y=community.floorAt(p.x,p.z,last);assert.ok(y>=last&&y-last<=.23,h.id+' climbs in small steps');assert.equal(blockedAt(p.x,p.z,y),false,h.id+' stair flight is clear at '+z.toFixed(2));last=y;}
  const top=P(cx,S.z1-.02),off=P(cx,S.z1+.3);assert.equal(community.floorAt(top.x,top.z,last),3.45,h.id+' the top tread is the upper floor');assert.equal(community.floorAt(off.x,off.z,3.45),3.45,h.id+' steps off onto the landing');
  const mid=P(h.w*.2,0);assert.equal(community.floorAt(mid.x,mid.z,3.45),3.45);assert.equal(community.floorAt(mid.x,mid.z,.3),.3);assert.equal(community.interior({...mid,y:3.45}).ceiling,6.28);
  // Upstairs: from the stair head to the main bedroom, bathroom and second bedroom.
  const valid=(x,z)=>{const q={x:(x-h.x)*(h.heading===0?1:-1),z:(z-h.z)*(h.heading===0?1:-1)};return Math.abs(q.x)<h.w/2-.2&&Math.abs(q.z)<h.d/2-.2&&!(q.x>=S.x0&&q.x<=S.x1&&q.z<S.z1-.05)&&!blockedAt(x,z,3.45);};
  const head=P(cx,S.z1+.5),fine=4,sv=(x,z)=>valid(x/fine,z/fine);assert.ok(valid(head.x,head.z),h.id+' stair head is open');
  for(const [name,x,z] of [['main bedroom',h.w/2-1.2,h.d/2-1.2],['bathroom',S.x1+1.6,-h.d/2+1.8],['second bedroom',h.w/2-2.6,-h.d/2+1.2]]){
    const t=P(x,z);assert.ok(valid(t.x,t.z),name+' is open upstairs in '+h.id);const path=localWalkPath({x:head.x*fine,z:head.z*fine},{x:t.x*fine,z:t.z*fine},sv);
    assert.ok(path&&path.slice(1).every((p,i)=>lineClear(path[i],p,sv)),'walk upstairs to the '+name+' in '+h.id);}
  // Floors never block each other: no upstairs collider stops a ground walker.
  const groundSpot=P(h.w*.25,-h.d/2+1.6);assert.ok(!obs.some(o=>o.houseId===h.id&&o.minY>=3.4&&houseObstacleBlocks(o,groundSpot.x,groundSpot.z,.3)));
}

// Game wiring: textures through the shared loader, models on desktop, stand-ins on phones.
const index=await readFile(file('index.html'),'utf8');
assert.match(index,/loadInteriorSurfaceMaps\(plannedCommunity\.interiorSurfaces,options\)/);assert.match(index,/residentialCommunity\?\.floorAt\?\.\(x,z,referenceY\)/);assert.match(index,/if\(props&&!mobileGraphics\)for\(const id of props\.modelIds\)/);assert.match(index,/INTERIOR_MODELS\[id\]\.url/);
console.log('Home interiors passed: owner models, stairs and upper floors in every home, varied paint schemes, shared relief maps, rotated colliders, stand-ins, fixed light pool, painted shells, real 139 windows and wiring.');
