import assert from 'node:assert/strict';
import {readFile,stat} from 'node:fs/promises';
import * as THREE from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {clone as cloneSkeleton} from 'three/addons/utils/SkeletonUtils.js';
import {MODELS,CROWD_ADULTS,CROWD_CHILDREN,crowdModel,roughnessFromSpecular} from '../assets/character-roster.js';
import {createCharacterSystem} from '../assets/characters.js';
import {PETS,createPetState,advancePet,neighborhoodPetSpots,fitPetModel} from '../assets/pets.js';
import {COMMUNITY_HOMES,communityDriveway,withinRect} from '../assets/world-rules.js';

const file=p=>new URL('../'+p,import.meta.url);
// Minimal GLB reader: JSON chunk only (no image decoding needed in Node).
async function glbJSON(path){const b=await readFile(path),len=b.readUInt32LE(12);assert.equal(b.toString('utf8',0,4),'glTF');return JSON.parse(b.toString('utf8',20,20+len));}

// Roster: crowd pools, deterministic picks, skeleton prefixes, roughness curve.
assert.ok(CROWD_ADULTS.length>=12,'at least a dozen crowd adults');assert.ok(CROWD_CHILDREN.length>=2,'crowd children');
assert.equal(crowdModel(3),crowdModel(3));assert.equal(new Set(CROWD_ADULTS.map((_,i)=>crowdModel(i))).size,CROWD_ADULTS.length,'every adult appears');
assert.ok(CROWD_CHILDREN.includes(crowdModel(1,{child:true})));
for(const k of Object.keys(MODELS))if(MODELS[k].source.startsWith('Children/'))assert.equal(MODELS[k].bones,'Bip02',k+' uses the child skeleton');
assert.equal(roughnessFromSpecular(0),.95);assert.equal(roughnessFromSpecular(1),.2);assert.ok(roughnessFromSpecular(.03)>roughnessFromSpecular(.1)&&roughnessFromSpecular(.1)>roughnessFromSpecular(.4),'shinier scans are smoother');

// Every model ships, has a full skeleton with a head, and carries a roughness map.
let crowdBytes=0;
for(const [key,spec] of Object.entries(MODELS)){
 const path=file('assets/characters/'+spec.file),gltf=await glbJSON(path),size=(await stat(path)).size;
 assert.equal(gltf.skins?.length,1,key+' skinned');const joints=gltf.skins[0].joints.map(i=>gltf.nodes[i].name);
 assert.ok(joints.length>=60,key+' full skeleton');assert.ok(joints.includes((spec.bones||'Bip01')+' Head'),key+' head bone '+(spec.bones||'Bip01'));
 assert.ok(gltf.materials.some(m=>m.pbrMetallicRoughness?.metallicRoughnessTexture),key+' has specular-derived roughness');
 for(const m of gltf.materials)if(/opacity/.test(m.name))assert.equal(m.alphaMode,'MASK',key+' hair is alpha-tested');
 if(spec.crowd){assert.ok(size<800e3,key+' under 800 KB: '+size);crowdBytes+=size;}
}
assert.ok(crowdBytes<9e6,'crowd download '+crowdBytes);
const crowdReadme=await readFile(file('assets/characters/crowd/README.md'),'utf8');for(const k of [...CROWD_ADULTS,...CROWD_CHILDREN])assert.ok(crowdReadme.includes(MODELS[k].source),k+' credited');

// 'crowd' resolves to varied crowd models; costumes and outfits stay on the original six.
globalThis.document={createElement:()=>({width:0,height:0,getContext:()=>new Proxy({},{get:()=>()=>{}})})};
const scene=new THREE.Scene(),chars=createCharacterSystem(scene,{onError:()=>{},baseURL:'file:///nowhere/'});
const crowd=[0,1,2,3].map(i=>chars.create({x:i,z:0,model:'crowd'}).userData.character.model);
assert.ok(crowd.every(m=>CROWD_ADULTS.includes(m)));assert.equal(new Set(crowd).size,4,'neighbours do not repeat');
assert.ok(CROWD_CHILDREN.includes(chars.create({x:0,z:2,model:'crowd-child'}).userData.character.model));
assert.equal(chars.create({x:0,z:3,model:'crowd',police:true}).userData.character.model,'neighbor','uniforms need the original rig');
assert.throws(()=>chars.create({x:0,z:4,model:'nobody'}),/Unknown character model/);
await chars.ready();

// Pets: wandering stays home, idles and moves; followers keep up with their owner.
for(const kind of ['dog','cat']){
 const s=createPetState({kind,x:10,z:-5,radius:3,seed:4});let moved=0,idle=0,last={x:s.x,z:s.z};
 for(let i=0;i<4000;i++){advancePet(s,1/30);assert.ok(Math.hypot(s.x-10,s.z+5)<=3.21,kind+' stays in its area');moved+=Math.hypot(s.x-last.x,s.z-last.z);last={x:s.x,z:s.z};if(s.mode==='idle')idle++;}
 assert.ok(moved>5,kind+' wanders');assert.ok(idle>400,kind+' rests');
}
const a=createPetState({kind:'dog',x:0,z:0,seed:2}),b=createPetState({kind:'dog',x:0,z:0,seed:2});for(let i=0;i<500;i++){advancePet(a,1/30);advancePet(b,1/30);}assert.deepEqual([a.x,a.z],[b.x,b.z],'same seed, same walk');
const owner={x:0,z:0,heading:0,speed:1.4},walker=createPetState({kind:'dog',x:0,z:-1,follow:owner});
for(let i=0;i<600;i++){owner.z+=1.4/30;advancePet(walker,1/30);}assert.ok(Math.hypot(walker.x-owner.x,walker.z-owner.z)<1.8,'dog keeps pace on the walk');assert.ok(walker.z<owner.z,'and walks behind');
for(let i=0;i<120;i++)advancePet(walker,1/30);assert.equal(walker.mode,'idle','sits when the owner stops');

// Spots: dogs inside fenced back yards, cats on lawns clear of driveways, one Commons dog.
const spots=neighborhoodPetSpots(COMMUNITY_HOMES),byId=Object.fromEntries(COMMUNITY_HOMES.map(h=>[h.id,h]));
assert.ok(spots.filter(s=>s.kind==='dog').length>=5&&spots.filter(s=>s.kind==='cat').length>=3);assert.ok(spots.some(s=>s.home==='maple-commons'));
for(const s of spots){const home=byId[s.home];if(!home)continue;
 const sign=home.heading===0?1:-1,localZ=(s.z-home.z)*sign,localX=(s.x-home.x)*sign;
 assert.ok(Math.abs(localX)+s.radius<home.lotWidth/2-.4,s.home+' pet stays inside the side fences');
 if(s.kind==='dog'){assert.ok(home.fenced);assert.ok(localZ+s.radius< -home.d/2,'dog yard is behind the house');assert.ok(Math.abs(s.z-home.rearZ)>s.radius,'and inside the rear fence');}
 else{assert.ok(localZ-s.radius>home.d/2,'cat is in front of the house');assert.ok(!withinRect(s.x,s.z,communityDriveway(home),s.radius),'and off the driveway');}
}

// Real models fit to real sizes and face +Z like every other character.
for(const kind of ['dog','cat']){
 const bytes=await readFile(file('assets/pets/'+kind+'.glb'));assert.ok(bytes.length<200e3);
 const gltf=await new GLTFLoader().parseAsync(bytes.buffer.slice(bytes.byteOffset,bytes.byteOffset+bytes.byteLength),'');
 assert.deepEqual(gltf.animations.map(c=>c.name).sort(),['idle','walk']);
 const {turn}=fitPetModel(cloneSkeleton(gltf.scene),kind),box=new THREE.Box3().setFromObject(turn,true),size=box.getSize(new THREE.Vector3());
 assert.ok(Math.abs(size.y-PETS[kind].height)<.01,kind+' height');assert.ok(Math.abs(box.min.y)<.01,kind+' stands on the ground');assert.ok(size.z>size.x*2,kind+' body runs along +Z');
}
const attribution=await readFile(file('assets/pets/ATTRIBUTION.md'),'utf8');assert.match(attribution,/CC0/);

// Game wiring: pets update every frame and townspeople use the crowd pool.
const index=await readFile(file('index.html'),'utf8');assert.match(index,/pets\.update\(dt\)/);assert.ok((index.match(/model:"crowd(-child)?"/g)||[]).length>=4);
console.log('People and pets passed:',{crowdAdults:CROWD_ADULTS.length,crowdChildren:CROWD_CHILDREN.length,crowdMB:+(crowdBytes/1e6).toFixed(2),petSpots:spots.length});
