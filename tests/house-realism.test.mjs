import assert from 'node:assert/strict';
import {readFile,stat} from 'node:fs/promises';
import {inflateSync} from 'node:zlib';
import * as THREE from 'three';
import {createLandmarkHouse} from '../assets/landmark-house.js';
import {MODEL_HOME as H} from '../assets/house-rules.js';
import {HOUSE_TEXTURES,HOUSE_SURFACES,addHouseBake,createHouseSurfaces,houseBakeUniforms,bakeResponse,shadeCharacter} from '../assets/house-surfaces.js';
import {BAKE_WIDTH,BAKE_BORDER} from '../assets/house-bake.js';
import {HOUSE_FURNITURE_MODELS,fitFurniture} from '../assets/house-furniture.js';
import {cameraArchitectureBoxes} from '../assets/camera-geometry.js';

const q=new Proxy({},{get:()=>()=>{}});globalThis.document={createElement:()=>({width:0,height:0,getContext:()=>q})};
const scene=new THREE.Scene(),obstacles=[],home=createLandmarkHouse({scene,visualKit:{},obstacles,groundSurfaces:[]});
const layout=home.bakeLayout,file=p=>new URL('../'+p,import.meta.url);

// House-owned materials: scanned roles exist and city materials are not touched.
const roles=new Set(home.batches.flatMap(m=>[].concat(m.material)).map(m=>m.userData.houseSurface).filter(Boolean));
for(const role of ['floor','plaster','stucco','brick','roof','paving','quartz','oak','trim'])assert.ok(roles.has(role),'house uses '+role);
// Slabs: wood faces up on the upper floor, plaster faces down as the ceiling below.
const facing=(role,y,dir)=>home.batches.some(m=>{if(m.material.userData.houseSurface!==role)return false;const p=m.geometry.attributes.position,n=m.geometry.attributes.normal;for(let i=0;i<p.count;i++)if(Math.abs(p.getY(i)-y)<.02&&Math.sign(n.getY(i))===dir&&Math.abs(n.getY(i))>.9)return true;return false;});
assert.ok(facing('floor',H.upper,1),'the upper floor is wood');assert.ok(facing('plaster',H.upper-.12,-1),'the ground-floor ceiling is plaster');assert.ok(!facing('floor',H.upper-.12,-1),'no wood-grain ceiling');
// The brick front wall is brick outside and plaster inside.
const faceOn=(role,z,dir)=>home.batches.some(m=>{if(m.material.userData.houseSurface!==role)return false;const p=m.geometry.attributes.position,n=m.geometry.attributes.normal;for(let i=0;i<p.count;i++)if(Math.abs(p.getZ(i)-(H.z+z))<.02&&Math.sign(n.getZ(i))===dir&&Math.abs(n.getZ(i))>.9&&p.getY(i)>1&&p.getY(i)<6)return true;return false;});
assert.ok(faceOn('brick',5.9+.11,1),'brick faces the street');assert.ok(faceOn('plaster',5.9-.11,-1),'the inside of the front wall is plaster');assert.ok(!faceOn('brick',5.9-.11,-1));

// Lightmap atlas: every chart is inside the atlas and no two charts overlap.
assert.equal(layout.width,BAKE_WIDTH);assert.ok(layout.height<=2048&&layout.density>=8);
const rects=layout.charts.map(c=>[c.x,c.y,c.x+c.w+2*BAKE_BORDER,c.y+c.h+2*BAKE_BORDER]);
for(const r of rects)assert.ok(r[0]>=0&&r[1]>=0&&r[2]<=layout.width&&r[3]<=layout.height,'chart inside atlas');
const sorted=rects.map((r,i)=>[...r,i]).sort((a,b)=>a[0]-b[0]);
for(let i=0;i<sorted.length;i++)for(let j=i+1;j<sorted.length&&sorted[j][0]<sorted[i][2];j++){const a=sorted[i],b=sorted[j];assert.ok(a[3]<=b[1]||b[3]<=a[1],'charts '+a[4]+' and '+b[4]+' overlap');}
for(const m of home.batches){const uv=m.geometry.attributes.houseBakeUv;assert.ok(uv,'merged meshes carry a lightmap UV');for(let i=0;i<uv.count;i++){assert.ok(uv.getX(i)>0&&uv.getX(i)<1&&uv.getY(i)>0&&uv.getY(i)<1);}}
let dynamicMeshes=0;home.root.traverse(m=>{if(!m.isMesh)return;dynamicMeshes++;const uv=m.geometry.attributes.houseBakeUv;assert.ok(uv,'moving parts sample a probe chart');assert.equal(new Set(Array.from(uv.array).map(v=>v.toFixed(6))).size<=2,true);});
assert.ok(dynamicMeshes>20);

// The committed bake matches this exact geometry. Re-run tools/bake-house-light.mjs after any house change.
const bake=JSON.parse(await readFile(file('assets/house/bake/bake.json'),'utf8'));
assert.equal(bake.signature,layout.signature,'assets/house/bake is stale: run node tools/bake-house-light.mjs');
assert.equal(bake.width,layout.width);assert.equal(bake.height,layout.height);
// Decode the 8-bit grayscale PNG and check that the light behaves like light.
function decodeGray(buf){assert.equal(buf.readUInt32BE(12),0x49484452);const w=buf.readUInt32BE(16),h=buf.readUInt32BE(20);assert.equal(buf[24],8);assert.equal(buf[25],0,'grayscale');const idat=[];for(let o=8;o<buf.length;){const len=buf.readUInt32BE(o),type=buf.toString('ascii',o+4,o+8);if(type==='IDAT')idat.push(buf.subarray(o+8,o+8+len));o+=12+len;}const raw=inflateSync(Buffer.concat(idat)),out=new Uint8Array(w*h);let p=0;for(let y=0;y<h;y++){const f=raw[p++];for(let x=0;x<w;x++){const a=x?out[y*w+x-1]:0,b=y?out[(y-1)*w+x]:0,c=x&&y?out[(y-1)*w+x-1]:0;let v=raw[p++];if(f===1)v+=a;else if(f===2)v+=b;else if(f===3)v+=(a+b)>>1;else if(f===4){const pa=Math.abs(b-c),pb=Math.abs(a-c),pc=Math.abs(a+b-2*c);v+=pa<=pb&&pa<=pc?a:pb<=pc?b:c;}out[y*w+x]=v&255;}}return {w,h,data:out};}
const image=decodeGray(await readFile(file('assets/house/bake/lightmap.png')));
assert.equal(image.w,layout.width);assert.equal(image.h,layout.height);
const factor=v=>(v/255)**2*bake.factorMax;
// Sample the lightmap at a world point on a merged surface facing a direction.
function sampleAt(role,x,y,z,normal){let best=null;for(const m of home.batches){if(role&&m.material.userData.houseSurface!==role)continue;const p=m.geometry.attributes.position,n=m.geometry.attributes.normal,uv=m.geometry.attributes.houseBakeUv;for(let i=0;i<p.count;i+=3){const c=[0,1,2].map(k=>new THREE.Vector3(p.getX(i+k),p.getY(i+k),p.getZ(i+k))),tri=new THREE.Triangle(...c),pt=new THREE.Vector3(x,y,z),closest=tri.closestPointToPoint(pt,new THREE.Vector3()),d=closest.distanceTo(pt);if(d>.03||n.getX(i)*normal[0]+n.getY(i)*normal[1]+n.getZ(i)*normal[2]<.9)continue;const bc=tri.getBarycoord(closest,new THREE.Vector3()),u=[0,1,2].reduce((s,k)=>s+uv.getX(i+k)*bc.getComponent(k),0),v=[0,1,2].reduce((s,k)=>s+uv.getY(i+k)*bc.getComponent(k),0);if(!best||d<best.d)best={d,u,v};}}assert.ok(best,'no surface at '+[x,y,z]);const px=Math.min(image.w-1,Math.floor(best.u*image.w)),py=Math.min(image.h-1,Math.floor((1-best.v)*image.h));return factor(image.data[py*image.w+px]);}
// Roof slope: centre (3.55, 7.58), tilted .31 rad, top face .09 m along its normal.
const roof=sampleAt('roof',H.x+3.55+.09*Math.sin(.31),7.58+.09*Math.cos(.31),H.z,[Math.sin(.31),Math.cos(.31),0]),lawnFacingWall=sampleAt('stucco',H.x+6.81,4.5,H.z-1,[1,0,0]),livingFloor=sampleAt('floor',H.x-3.1,.3,H.z+.6,[0,1,0]),underBed=sampleAt('floor',H.x-3.5,H.upper,H.z+4.1,[0,1,0]),ceiling=sampleAt('plaster',H.x-1.5,H.upper-.12,H.z+2.5,[0,-1,0]);
console.log('Baked light factors',{roof,lawnFacingWall,livingFloor,underBed,ceiling});
assert.ok(roof>.85,'open roof is fully lit');assert.ok(lawnFacingWall>.6,'outside walls stay bright');
assert.ok(livingFloor<roof*.6,'indoor floors get less sky light than the roof');assert.ok(underBed<livingFloor,'under the bed is darker than the open floor');assert.ok(ceiling>.02&&ceiling<livingFloor+.2,'bounce light reaches the ceiling');
// Probe grid: characters dim indoors and are unchanged outside.
const {dims,values}=bake.probes;assert.equal(values.length,dims[0]*dims[1]*dims[2]);
home.applyBake(null,bake);const inside=home.indirectAt({x:H.x-3,y:.3,z:H.z-2}),outside=home.indirectAt({x:H.x+30,y:.3,z:H.z});
assert.equal(outside,1);assert.ok(inside>0&&inside<.75,'indoors is darker for characters: '+inside);

// Shader hook: only indirect light is scaled; the hook adds its attribute and uniforms.
const shader={uniforms:{},vertexShader:'#include <begin_vertex>',fragmentShader:'#include <aomap_fragment>'};addHouseBake(shader);
assert.match(shader.vertexShader,/attribute vec2 houseBakeUv/);assert.match(shader.fragmentShader,/indirectDiffuse\*=houseBake/);assert.ok(!/directDiffuse\*=/.test(shader.fragmentShader.replace(/indirectDiffuse/g,'')));assert.ok(shader.uniforms.houseBakeMap&&shader.uniforms.houseBakeStrength);

// Textures: every referenced map exists in both sizes as KTX2, within download budgets.
let desktop=0,mobile=0;
for(const [id,spec] of Object.entries(HOUSE_TEXTURES))for(const map of spec.maps)for(const size of [1024,512]){const f=file('assets/house/textures/'+id+'-'+size+'-'+map+'.ktx2'),head=(await readFile(f)).subarray(0,12);assert.deepEqual([...head],[0xAB,0x4B,0x54,0x58,0x20,0x32,0x30,0xBB,0x0D,0x0A,0x1A,0x0A],'KTX2 header '+f.pathname);const bytes=(await stat(f)).size;if(size===1024)desktop+=bytes;else mobile+=bytes;}
assert.ok(desktop<5.5e6,'desktop textures '+desktop);assert.ok(mobile<1.6e6,'phone textures '+mobile);
for(const role of Object.values(HOUSE_SURFACES))if(role.texture)assert.ok(HOUSE_TEXTURES[role.texture],role.texture);

// Furniture: each model exists, is compressed and stays within its triangle budget.
let furnitureTriangles=0;
for(const [id,spec] of Object.entries(HOUSE_FURNITURE_MODELS)){const glb=await readFile(file('assets/house/furniture/'+id+'.glb'));assert.equal(glb.readUInt32LE(0),0x46546C67,'glTF binary');const json=JSON.parse(glb.toString('utf8',20,20+glb.readUInt32LE(12)));assert.ok((json.extensionsUsed||[]).includes('KHR_texture_basisu'),id+' uses KTX2 textures');let tris=0;for(const mesh of json.meshes)for(const p of mesh.primitives)tris+=(p.indices!==undefined?json.accessors[p.indices].count:json.accessors[p.attributes.POSITION].count)/3;assert.ok(tris<=spec.triangles*1.02,id+' '+tris+' triangles');furnitureTriangles+=tris;}
const used=home.furnitureProxies.reduce((n,p)=>n+0,0);
const perProxy=home.furnitureProxies.map(p=>p.model);for(const id of perProxy)assert.ok(HOUSE_FURNITURE_MODELS[id],id);
const installedTriangles=perProxy.reduce((n,id)=>n,0);
console.log('Furniture models',{models:Object.keys(HOUSE_FURNITURE_MODELS).length,standIns:perProxy.length,modelTriangles:furnitureTriangles});
assert.ok(perProxy.length>=9);

// Fitting a model keeps colliders and seats, hides only the stand-in visuals.
const before=obstacles.length,seatsBefore=home.seats.length,chair=home.furnitureProxies.find(p=>p.id==='dining-front');
const fake=new THREE.Group();fake.add(new THREE.Mesh(new THREE.BoxGeometry(2,4,2),new THREE.MeshStandardMaterial()));
const fitted=home.installFurniture({dining_chair_02:fake});assert.equal(fitted.installed,3);
const box=new THREE.Box3().setFromObject(chair.installed,true),size=box.getSize(new THREE.Vector3());
assert.ok(Math.abs(box.min.y-.3)<.01,'model stands on the floor');assert.ok(size.y>.9&&size.y<1.3,'scaled to the chair height');assert.ok(Math.max(size.x,size.z)<1.0,'footprint stays near the stand-in');
assert.equal(obstacles.length,before);assert.equal(home.seats.length,seatsBefore);
let hidden=0,visibleModel=0;chair.group.traverse(m=>{if(!m.isMesh)return;if(m.userData.furnitureModel)visibleModel+=m.visible?1:0;else hidden+=m.visible?0:1;});
assert.ok(hidden>=4&&visibleModel===1);
assert.deepEqual(Array.from(chair.installed.children[0].geometry.attributes.houseBakeUv.array.slice(0,2)),chair.bakeUv.map(v=>Math.fround(v)));
assert.equal(home.installFurniture({dining_chair_02:fake}).installed,0,'installing twice does nothing');

// Characters: indoors they ease toward the probe light; outdoors nothing is patched.
{const kid=new THREE.Group(),coat=new THREE.MeshStandardMaterial();kid.add(new THREE.Mesh(new THREE.BoxGeometry(1,1,1),coat));
 assert.equal(shadeCharacter(kid,1),1);assert.equal(coat.userData.indoorShade,true,'indoor shader is prepared on first appearance');const preparedVersion=coat.version,preparedKey=coat.customProgramCacheKey();
 const strength=houseBakeUniforms.houseBakeStrength.value;houseBakeUniforms.houseBakeStrength.value=1;
 const dim=bakeResponse(.02);assert.ok(dim<.25&&dim>=houseBakeUniforms.houseBakeFloor.value);
 let v=1;for(let i=0;i<120;i++)v=shadeCharacter(kid,.02,1/60);assert.ok(Math.abs(v-dim)<.01,'eases to the indoor level');assert.equal(coat.userData.indoorShade,true);
 const shader={uniforms:{},vertexShader:'',fragmentShader:'#include <aomap_fragment>'};coat.onBeforeCompile(shader);assert.match(shader.fragmentShader,/indirectDiffuse\*=characterIndirect/);assert.equal(shader.uniforms.characterIndirect.value,v);
 for(let i=0;i<1000;i++)shadeCharacter(kid,i%2?.02:1,1/60);assert.equal(coat.version,preparedVersion,'repeated house entry cannot invalidate the material');assert.equal(coat.customProgramCacheKey(),preparedKey);
 houseBakeUniforms.houseBakeStrength.value=strength;}

// Camera collision uses the merged meshes' per-piece boxes, not one house-sized box.
const camBoxes=cameraArchitectureBoxes(scene),houseWide=camBoxes.filter(b=>b.maxX-b.minX>13&&b.maxZ-b.minZ>11&&b.maxY-b.minY>5);
assert.equal(houseWide.length,0,'no box swallows the whole house');assert.ok(camBoxes.length>200);
console.log('House realism passed: scanned house materials, per-face walls and slabs, valid lightmap atlas, current bake signature, plausible baked light, character probes and indoor shading, KTX2 budgets, furniture budgets and fitting, and camera boxes.');
