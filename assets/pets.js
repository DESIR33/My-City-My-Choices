import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { clone as cloneSkeleton } from 'three/addons/utils/SkeletonUtils.js';
import { communityPoint, communityDriveway, withinRect } from './world-rules.js';

// Neighborhood dogs and cats (Quaternius CC0, see assets/pets/ATTRIBUTION.md).
// Pets are scenery: no collision, no story state, nothing saved. Each one either
// wanders around a home point (a yard, a porch, the Commons lawn) or trots
// behind an owner while the owner walks.
export const PETS=Object.freeze({
 dog:{file:'dog.glb',height:.56,walk:1.05,trot:2.2,clipSpeed:1.1,coats:[0xc79a62,0x3a2e28,0xe6dccb,0x8b6743,0x7a7a78,0xd2b48c]},
 cat:{file:'cat.glb',height:.3,walk:.55,trot:1.5,clipSpeed:.6,coats:[0xffffff]}
});

// Deterministic randomness: the same pet wanders the same way after a reload.
export function petRandom(seed){let a=(seed>>>0)||1;return ()=>{a=(a+0x6d2b79f5)>>>0;let t=a;t=Math.imul(t^t>>>15,t|1);t^=t+Math.imul(t^t>>>7,t|61);return ((t^t>>>14)>>>0)/4294967296;};}

export function createPetState({kind='dog',x=0,z=0,radius=3,follow=null,seed=1}={}){
 const spec=PETS[kind];if(!spec)throw new Error('Unknown pet '+kind);
 return {kind,x,z,home:{x,z},radius,follow,heading:0,speed:0,mode:'idle',wait:1,target:null,rng:petRandom(seed)};
}

// One step of pet behaviour. Returns the state (mutated) so tests can inspect it.
export function advancePet(s,dt){
 const spec=PETS[s.kind];if(!(dt>0))return s;
 let goal=null,pace=spec.walk;
 if(s.follow){
  // Stay about a metre behind the owner's heading; catch up at a trot when far.
  const o=s.follow,behind=o.heading??0;goal={x:o.x-Math.sin(behind)*.9+Math.cos(behind)*.35,z:o.z-Math.cos(behind)*.9-Math.sin(behind)*.35};
  const gap=Math.hypot(goal.x-s.x,goal.z-s.z);if(gap<.25)goal=null;else pace=gap>2.5?spec.trot:Math.max(spec.walk,Math.min(spec.trot,(o.speed??spec.walk)*1.05));
  s.mode=goal?'walk':'idle';
 }else{
  if(s.mode==='idle'){s.wait-=dt;if(s.wait<=0){const a=s.rng()*Math.PI*2,r=s.radius*Math.sqrt(s.rng());s.target={x:s.home.x+Math.cos(a)*r,z:s.home.z+Math.sin(a)*r};s.mode='walk';}}
  if(s.mode==='walk'&&s.target){goal=s.target;if(Math.hypot(goal.x-s.x,goal.z-s.z)<.15){s.mode='idle';s.target=null;s.wait=1.5+s.rng()*(s.kind==='cat'?7:4);goal=null;}}
 }
 if(goal){
  const dx=goal.x-s.x,dz=goal.z-s.z,d=Math.hypot(dx,dz),want=Math.atan2(dx,dz),turn=Math.atan2(Math.sin(want-s.heading),Math.cos(want-s.heading));
  s.heading+=turn*Math.min(1,dt*6);
  s.speed=THREE.MathUtils.damp(s.speed,Math.abs(turn)>1.4?pace*.3:pace,6,dt);
  const step=Math.min(d,s.speed*dt);s.x+=Math.sin(s.heading)*step;s.z+=Math.cos(s.heading)*step;
 }else s.speed=THREE.MathUtils.damp(s.speed,0,8,dt);
 // A wandering pet never leaves its area, even after a bad target or a long frame.
 if(!s.follow){const hx=s.x-s.home.x,hz=s.z-s.home.z,h=Math.hypot(hx,hz),max=s.radius+.2;if(h>max){s.x=s.home.x+hx/h*max;s.z=s.home.z+hz/h*max;}}
 return s;
}

// Where neighborhood pets live: dogs in every third fenced backyard, cats on the
// front lawn of a few homes without a dog (clear of the driveway), and one dog on the Maple Commons lawn.
export function neighborhoodPetSpots(homes,{commons={x:101.5,z:-20.5}}={}){
 const spots=[],fenced=homes.filter(h=>h.fenced);
 fenced.forEach((home,i)=>{if(i%3)return;const back=Math.abs(home.z-home.rearZ)-home.d/2,p=communityPoint(home,0,-(home.d/2+back/2));spots.push({kind:'dog',home:home.id,x:p.x,z:p.z,radius:Math.max(.8,Math.min(4,back/2-1.2,home.lotWidth/2-1.2)),seed:spots.length+11});});
 homes.filter(h=>!h.fenced&&h.id!=='maple-grove-1').forEach((home,i)=>{if(i%2)return;const drive=communityDriveway(home),p=[-.36,.36].map(f=>communityPoint(home,home.w*f,home.d/2+5)).find(c=>!withinRect(c.x,c.z,drive,2.5));if(p)spots.push({kind:'cat',home:home.id,x:p.x,z:p.z,radius:1.1,seed:spots.length+11});});
 spots.push({kind:'dog',home:'maple-commons',x:commons.x,z:commons.z,radius:3,seed:7});
 return spots;
}

// Scale a pet to its real height, stand it on the ground and turn it to face +Z
// like every other character (the models face +X). Skeletons are posed first:
// an unposed clone measures in raw centimetres and would shrink 100×.
export function fitPetModel(model,kind){
 const spec=PETS[kind],turn=new THREE.Group();turn.rotation.y=-Math.PI/2;turn.add(model);
 turn.updateMatrixWorld(true);model.traverse(o=>{if(o.isSkinnedMesh)o.skeleton.update();});
 const box=new THREE.Box3().setFromObject(model,true),scale=spec.height/Math.max(1e-6,box.max.y-box.min.y);
 turn.scale.setScalar(scale);model.position.y=-box.min.y;turn.updateMatrixWorld(true);
 return {model,turn,scale};
}

export function createPetSystem(scene,{groundHeight=()=>0,onError=console.warn,baseURL=new URL('./pets/',import.meta.url).href}={}){
 const loader=new GLTFLoader(),templates=new Map(),pets=[],pending=new Set();
 const template=kind=>{if(!templates.has(kind))templates.set(kind,loader.loadAsync(new URL(PETS[kind].file,baseURL).href));return templates.get(kind);};
 // `owner` is any Object3D (a townsperson); the pet follows while it moves.
 function create({kind='dog',x,z,radius=3,owner=null,coat=null,seed=pets.length+1}){
  const spec=PETS[kind],state=createPetState({kind,x,z,radius,seed,follow:owner?{x,z,heading:0,speed:0}:null});
  const root=new THREE.Group();root.name='Pet '+kind;root.position.set(x,groundHeight(x,z),z);scene.add(root);
  const pet={kind,root,state,owner,last:owner?owner.position.clone():null,ready:false};pets.push(pet);
  const loading=template(kind).then(gltf=>{
   const {model,turn}=fitPetModel(cloneSkeleton(gltf.scene),kind);
   const tint=coat??spec.coats[Math.floor(state.rng()*spec.coats.length)];
   model.traverse(m=>{if(!m.isMesh)return;m.castShadow=m.receiveShadow=true;m.frustumCulled=false;m.material=m.material.clone();if(m.material.name==='Dog')m.material.color.setHex(tint);m.material.flatShading=true;});
   root.add(turn);pet.mixer=new THREE.AnimationMixer(model);pet.actions={};
   for(const clip of gltf.animations)pet.actions[clip.name]=pet.mixer.clipAction(clip);
   pet.actions.idle?.play();pet.current='idle';pet.ready=true;pet.mixer.update(state.rng()*2);
  }).catch(error=>{onError('A pet could not load.',error);root.visible=false;});
  pending.add(loading);loading.finally(()=>pending.delete(loading));
  return pet;
 }
 function update(dt){
  for(const pet of pets){
   const s=pet.state;
   if(pet.owner&&dt>0){const p=pet.owner.position,dx=p.x-pet.last.x,dz=p.z-pet.last.z,moved=Math.hypot(dx,dz);if(moved<1){s.follow.speed=THREE.MathUtils.damp(s.follow.speed,moved/dt,8,dt);if(moved>.01)s.follow.heading=Math.atan2(dx,dz);}else{s.x=p.x;s.z=p.z;}s.follow.x=p.x;s.follow.z=p.z;pet.last.copy(p);pet.root.visible=pet.owner.visible;}
   advancePet(s,dt);
   pet.root.position.set(s.x,groundHeight(s.x,s.z),s.z);pet.root.rotation.y=s.heading;
   if(!pet.ready)continue;
   const want=s.speed>.12?'walk':'idle';
   if(want!==pet.current&&pet.actions[want]){pet.actions[want].reset().fadeIn(.25).play();pet.actions[pet.current]?.fadeOut(.25);pet.current=want;}
   if(want==='walk')pet.actions.walk.setEffectiveTimeScale(THREE.MathUtils.clamp(s.speed/PETS[pet.kind].clipSpeed,.6,2.2));
   pet.mixer.update(dt);
  }
 }
 return {create,update,pets,ready:()=>Promise.all([...pending])};
}
