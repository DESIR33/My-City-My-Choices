import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { clone as cloneSkeleton } from 'three/addons/utils/SkeletonUtils.js';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { characterFacingYaw } from './character-controls.js';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';

const MODELS = {
  child: { file: 'female-child-01.glb', set: 'f', height: 1.4 },
  boy: { file: 'male-child-01.glb', set: 'm', height: 1.38 },
  mom: { file: 'female-adult-01.glb', set: 'f', height: 1.72 },
  maya: { file: 'female-adult-05.glb', set: 'f', height: 1.7 },
  neighbor: { file: 'male-adult-02.glb', set: 'm', height: 1.8 },
  casual: { file: 'male-adult-09.glb', set: 'm', height: 1.76 },
};
const MOTIONS = { idle: 'idle_neutral_01', walk: 'walk_neutral_01', run: 'run_neutral_01' };
const UP = new THREE.Vector3(0, 1, 0);

function maskTexture(head) {
  const image = document.createElement('canvas'); image.width = image.height = 512;
  const q = image.getContext('2d'); q.fillStyle = '#000'; q.fillRect(0, 0, 512, 512);
  function rect(color, x, y, w, h) { q.fillStyle = color; q.fillRect(x * 512, y * 512, w * 512, h * 512); }
  if (head) {
    rect('#00ff00', 0, 0, 1, .48); rect('#00ff00', .5, .66, .5, .34);
    const outline = [[.49,.105],[.61,.13],[.67,.2],[.7,.27],[.77,.29],[.81,.37],[1,.45],[1,.6],[.82,.7],[.63,.77],[.49,.81],[.34,.77],[.19,.7],[0,.6],[0,.44],[.19,.39],[.22,.27],[.29,.24],[.34,.17]];
    q.fillStyle = '#ff0000'; q.beginPath(); outline.forEach(([x,y],i)=>i?q.lineTo(x*512,y*512):q.moveTo(x*512,y*512)); q.closePath(); q.fill();
    // Preserve photographed eyes and lips when changing skin tone.
    q.fillStyle = '#000';
    for (const [x,y,rx,ry] of [[.412,.283,.045,.018],[.586,.283,.045,.018],[.5,.405,.06,.021]]) {
      q.beginPath(); q.ellipse(x*512,y*512,rx*512,ry*512,0,0,Math.PI*2); q.fill();
    }
  } else {
    rect('#ff0000', .332, .062, .333, .713); rect('#ff0000', .35, .797, .3, .075);
    rect('#00ff00', .15, .17, .18, .13); rect('#00ff00', .67, .17, .18, .13);
    rect('#0000ff', 0, 0, .192, .278); rect('#0000ff', .808, 0, .192, .278);
  }
  const map = new THREE.CanvasTexture(image); map.flipY = false;
  return map;
}

function clothMaterial(color) {
  return new THREE.MeshStandardMaterial({ color, roughness: .86, metalness: 0 });
}

function makeHair() {
  const curls = new THREE.Group(), bun = new THREE.Group(), pieces = [];
  for (let i = 0; i < 40; i++) {
    const angle = i * 2.399, ring = .04 + (i % 4) * .022;
    const points = [];
    for (let j = 0; j <= 16; j++) {
      const t = j / 16, curl = t * Math.PI * 6 + angle;
      points.push(new THREE.Vector3(Math.cos(angle)*ring + Math.cos(curl)*.013, .19 - t*(.05+(i%3)*.034), Math.sin(angle)*ring-.025+Math.sin(curl)*.013));
    }
    pieces.push(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(points), 16, .009, 5, false));
  }
  const hair = clothMaterial(0x483c35), merged = mergeGeometries(pieces, false);
  const curled = new THREE.Mesh(merged, hair); curled.castShadow = true; curls.add(curled);
  for (const geo of pieces) geo.dispose();
  const bunMesh = new THREE.Mesh(new THREE.TorusKnotGeometry(.055,.026,60,8,2,3), hair);
  bunMesh.position.set(0,.15,-.11); bunMesh.scale.set(1,.9,.7); bunMesh.castShadow = true; bun.add(bunMesh);
  return { curls, bun, material: hair };
}

function makeAccessories() {
  const head = new THREE.Group(), torso = new THREE.Group(), hat = new THREE.Group(), backpack = new THREE.Group(), policeCap = new THREE.Group(), policeBadge = new THREE.Group(), fireHelmet=new THREE.Group(),fireStripes=new THREE.Group();
  const straw = clothMaterial(0xd7ba7a), ribbon = clothMaterial(0x5a6253), fabric = clothMaterial(0x657e92);
  const brim = new THREE.Mesh(new THREE.CylinderGeometry(.19,.19,.013,36), straw); brim.position.y = .2; hat.add(brim);
  const profile = [new THREE.Vector2(.126,0),new THREE.Vector2(.123,.025),new THREE.Vector2(.108,.1),new THREE.Vector2(.09,.125),new THREE.Vector2(0,.13)];
  const crown = new THREE.Mesh(new THREE.LatheGeometry(profile,32), straw); crown.position.y = .205; hat.add(crown);
  const band = new THREE.Mesh(new THREE.CylinderGeometry(.125,.128,.027,32,1,true), ribbon); band.position.y = .229; hat.add(band);
  const pack = new THREE.Mesh(new RoundedBoxGeometry(.25,.32,.105,4,.025), fabric); pack.position.set(0,-.035,-.15); backpack.add(pack);
  const pocket = new THREE.Mesh(new RoundedBoxGeometry(.2,.13,.045,3,.014), clothMaterial(0x536c80)); pocket.position.set(0,-.1,-.21); backpack.add(pocket);
  for (const side of [-1,1]) {
    const curve = new THREE.CatmullRomCurve3([new THREE.Vector3(side*.09,.09,-.15),new THREE.Vector3(side*.12,.14,-.01),new THREE.Vector3(side*.105,.01,.1),new THREE.Vector3(side*.1,-.14,.05),new THREE.Vector3(side*.09,-.16,-.12)]);
    backpack.add(new THREE.Mesh(new THREE.TubeGeometry(curve,14,.012,5,false),clothMaterial(0x41586b)));
  }
  hat.traverse(o=>{if(o.isMesh)o.castShadow=true}); backpack.traverse(o=>{if(o.isMesh)o.castShadow=true});
  const hair = makeHair(); head.add(hair.curls,hair.bun,hat); torso.add(backpack);
  const uniform = clothMaterial(0x172b45), uniformTrim = new THREE.MeshStandardMaterial({color:0xb6a56d,roughness:.42,metalness:.48});
  const cap = new THREE.Mesh(new RoundedBoxGeometry(.25,.14,.27,4,.035),uniform); cap.position.set(0,.195,-.015); policeCap.add(cap);
  const visor = new THREE.Mesh(new RoundedBoxGeometry(.27,.025,.19,3,.01),uniform); visor.position.set(0,.132,.065); policeCap.add(visor);
  const capBadge = new THREE.Mesh(new THREE.CircleGeometry(.035,8),uniformTrim); capBadge.position.set(0,.195,.123); policeCap.add(capBadge);
  const shieldShape = new THREE.Shape(); shieldShape.moveTo(-.035,.045); shieldShape.lineTo(.035,.045); shieldShape.lineTo(.031,-.005); shieldShape.lineTo(0,-.045); shieldShape.lineTo(-.031,-.005); shieldShape.closePath();
  const badge = new THREE.Mesh(new THREE.ShapeGeometry(shieldShape),uniformTrim); badge.position.set(.075,.045,.115); policeBadge.add(badge);
  const badgeCenter = new THREE.Mesh(new THREE.CircleGeometry(.009,8),uniform); badgeCenter.position.set(.075,.045,.117); policeBadge.add(badgeCenter);
  head.add(policeCap); torso.add(policeBadge);
  const yellow=clothMaterial(0xd5b84e),reflective=clothMaterial(0xd9de9c);
  const helmet=new THREE.Mesh(new THREE.SphereGeometry(.165,20,12,0,Math.PI*2,0,Math.PI/2),yellow);helmet.position.y=.13;fireHelmet.add(helmet);
  const helmetBrim=new THREE.Mesh(new THREE.CylinderGeometry(.205,.205,.025,24),yellow);helmetBrim.position.y=.13;fireHelmet.add(helmetBrim);
  for(const y of [-.13,.1]){const band=new THREE.Mesh(new RoundedBoxGeometry(.34,.045,.23,2,.012),reflective);band.position.set(0,y,0);fireStripes.add(band);}
  head.add(fireHelmet);torso.add(fireStripes);fireHelmet.visible=fireStripes.visible=false;
  hat.visible = backpack.visible = policeCap.visible = policeBadge.visible = false;
  policeCap.traverse(o=>{if(o.isMesh)o.castShadow=true}); policeBadge.traverse(o=>{if(o.isMesh)o.castShadow=true});
  return { head, torso, hat, backpack, policeCap, policeBadge, fireHelmet,fireStripes,hair };
}

// Only rotations and a proportionally scaled vertical root motion are retargeted.
// Adult translation tracks must never overwrite a child's native bone lengths.
export function retargetMotion(clip, source, target) {
  const targetRoot = target.getObjectByName('Bip02') || target.getObjectByName('Bip01');
  const sourceRoot = source.getObjectByName('Bip01');
  if (!targetRoot || !sourceRoot) throw new Error('Humanoid animation root is missing.');
  const ratio = targetRoot.position.y / sourceRoot.position.y, tracks = [];
  for (const track of clip.tracks) {
    const parsed = THREE.PropertyBinding.parseTrackName(track.name);
    const name = parsed.nodeName.replace(/^Bip01/,targetRoot.name);
    const bone = target.getObjectByName(name);
    if (!bone) continue;
    if (parsed.propertyName === 'quaternion') {
      const copy = track.clone(); copy.name = name+'.quaternion'; tracks.push(copy);
    } else if (parsed.propertyName === 'position' && name === targetRoot.name) {
      const copy = track.clone(); copy.name = name+'.position';
      for (let i=0;i<copy.values.length;i+=3) {
        copy.values[i]=targetRoot.position.x;
        copy.values[i+1]=targetRoot.position.y+(copy.values[i+1]-sourceRoot.position.y)*ratio;
        copy.values[i+2]=targetRoot.position.z;
      }
      tracks.push(copy);
    }
  }
  return new THREE.AnimationClip(clip.name,clip.duration,tracks);
}

export function createCharacterSystem(scene, { groundHeight = ()=>-.07, onError = console.warn, baseURL = new URL('./characters/',import.meta.url).href } = {}) {
  const loader = new GLTFLoader();
  const templates = new Map(), animations = new Map(), actors = [];
  const masks = { head: maskTexture(true), body: maskTexture(false) };
  const pending = new Set();
  function load(file) { return loader.loadAsync(new URL(file,baseURL).href); }
  function template(key) {
    if (!templates.has(key)) templates.set(key,load(MODELS[key].file));
    return templates.get(key);
  }
  function motions(set) {
    if (!animations.has(set)) animations.set(set,Promise.all(Object.entries(MOTIONS).map(async ([name,file])=>({ name, gltf: await load(set+'_'+file+'.glb') }))));
    return animations.get(set);
  }
  function placeholder(shirt) {
    const group = new THREE.Group(), skin = clothMaterial(0xb99178);
    const torso = new THREE.Mesh(new RoundedBoxGeometry(.36,.48,.22,3,.06),clothMaterial(shirt)); torso.position.y=.88; group.add(torso);
    const head = new THREE.Mesh(new THREE.SphereGeometry(.13,16,12),skin);head.scale.y=1.18;head.position.y=1.27;group.add(head);
    for (const side of [-1,1]) {
      const leg = new THREE.Mesh(new THREE.CapsuleGeometry(.068,.43,4,8),clothMaterial(0x394852));leg.position.set(side*.09,.33,0);group.add(leg);
      const arm = new THREE.Mesh(new THREE.CapsuleGeometry(.045,.36,4,8),skin);arm.position.set(side*.235,.85,0);group.add(arm);
    }
    return group;
  }
  function makeAvatarMaterial(original, head, uniforms) {
    const material = original.clone(); material.roughness = head ? .7 : .9; material.metalness = 0;
    material.onBeforeCompile = shader => {
      Object.assign(shader.uniforms,uniforms,{ avatarMask: { value: head?masks.head:masks.body } });
      shader.fragmentShader = 'uniform sampler2D avatarMask;\nuniform vec3 avatarSkinRatio;\nuniform vec3 avatarShirt;\nuniform vec3 avatarHair;\nuniform vec3 avatarShoes;\nuniform float avatarHairStyle;\n'+shader.fragmentShader;
      const tint = head ? `
        vec3 region = texture2D(avatarMask,vMapUv).rgb;
        if (avatarHairStyle != 1.0 && region.g > .4 && vMapUv.y > .66 && vMapUv.x > .5) discard;
        float shade = clamp(dot(diffuseColor.rgb,vec3(.2126,.7152,.0722))/.18,.25,1.8);
        diffuseColor.rgb = mix(diffuseColor.rgb,diffuseColor.rgb*avatarSkinRatio,region.r);
        diffuseColor.rgb = mix(diffuseColor.rgb,avatarHair*shade,region.g);
      ` : `
        vec3 region = texture2D(avatarMask,vMapUv).rgb;
        float shade = clamp(dot(diffuseColor.rgb,vec3(.2126,.7152,.0722))/.16,.24,1.8);
        diffuseColor.rgb = mix(diffuseColor.rgb,avatarShirt*shade,region.r);
        diffuseColor.rgb = mix(diffuseColor.rgb,avatarShoes*shade,region.g);
        diffuseColor.rgb = mix(diffuseColor.rgb,diffuseColor.rgb*avatarSkinRatio,region.b);
      `;
      shader.fragmentShader=shader.fragmentShader.replace('#include <map_fragment>','#include <map_fragment>\n'+tint);
    };
    material.customProgramCacheKey=()=>head?'maple-child-head-v1':'maple-child-clothes-v1';
    return material;
  }
  const tempPosition=new THREE.Vector3(),tempQuaternion=new THREE.Quaternion(),rootInverse=new THREE.Quaternion();
  function rememberAnchor(actor,bone,anchor) {
    actor.updateMatrixWorld(true);
    rootInverse.copy(actor.getWorldQuaternion(tempQuaternion)).invert();
    const rest = rootInverse.clone().multiply(bone.getWorldQuaternion(new THREE.Quaternion())).invert();
    return { bone, anchor, rest };
  }
  function updateAnchor(actor,frame) {
    actor.worldToLocal(frame.bone.getWorldPosition(tempPosition)); frame.anchor.position.copy(tempPosition);
    rootInverse.copy(actor.getWorldQuaternion(tempQuaternion)).invert();
    frame.anchor.quaternion.copy(rootInverse).multiply(frame.bone.getWorldQuaternion(tempQuaternion)).multiply(frame.rest);
  }
  function setAppearance(actor,appearance) {
    const data=actor.userData.character; data.appearance={...data.appearance,...appearance};
    if (!data.uniforms) return;
    const a=data.appearance;
    const skin=data.uniforms.avatarSkinRatio.value.setHex(a.skin??0xc99472),reference=new THREE.Color(0xddb399);skin.setRGB(skin.r/reference.r,skin.g/reference.g,skin.b/reference.b);
    data.uniforms.avatarShirt.value.setHex(a.shirt??0x496d84); data.uniforms.avatarHair.value.setHex(a.hair??0x483c35);
    data.uniforms.avatarShoes.value.setHex(a.shoes??0x303f52);
    data.uniforms.avatarHairStyle.value=a.style==='ponytail'?1:a.style==='bun'?2:0;
    data.accessories.hair.curls.visible=a.style==='curls'; data.accessories.hair.bun.visible=a.style==='bun';
    data.accessories.hair.material.color.setHex(a.hair??0x483c35);
    data.accessories.hat.visible=!!a.wardrobe?.hat;data.accessories.backpack.visible=!!a.wardrobe?.backpack;
  }
  function create({ x,z,model='neighbor',scale=1,shirt=0x6b8077,customizable=false,interactive=false,police=false,firefighter=false }) {
    const actor=new THREE.Group();actor.position.set(x,groundHeight(x,z),z);scene.add(actor);
    const fallback=placeholder(shirt);actor.add(fallback);
    const data={ model,customizable:customizable||police||firefighter,interactive,police,firefighter,fallback,appearance:police?{shirt:0x172b45,shoes:0x17212f}:firefighter?{shirt:0xa49158,shoes:0x17212f}:{},last:new THREE.Vector2(x,z),speed:0,active:null,phase:actors.length*.61 };
    if(police)actor.userData.role='police-officer';
    actor.userData.character=data;actors.push(actor);
    const loading=Promise.all([template(model),motions(MODELS[model].set)]).then(([gltf,clips])=>{
      const source=cloneSkeleton(gltf.scene),visual=new THREE.Group();
      source.updateMatrixWorld(true);
      const bounds=new THREE.Box3().setFromObject(source),size=bounds.getSize(new THREE.Vector3()),center=bounds.getCenter(new THREE.Vector3());
      const ratio=MODELS[model].height*(.9+.1*scale)/size.y;
      source.position.set(-center.x,-bounds.min.y,-center.z);visual.scale.setScalar(ratio);visual.add(source);actor.add(visual);
      data.source=source;data.visual=visual;data.height=MODELS[model].height*(.9+.1*scale);
      const head=source.getObjectByName(model==='child'||model==='boy'?'Bip02_Head':'Bip01_Head');
      const leftEye=source.getObjectByName(model==='child'||model==='boy'?'Bip02_LEye':'Bip01_LEye');
      actor.updateMatrixWorld(true);
      // Eyes sit in front of the head on these Rocketbox meshes (+Z in the actor's rest pose).
      // Measure that in actor space. World Z also includes the yaw already applied by a patrol
      // or crosswalk, so a character facing down the street looked "backward" and received a
      // permanent extra half-turn. The walk clips themselves face the same +Z direction.
      if(head&&leftEye){
        const headPosition=actor.worldToLocal(head.getWorldPosition(new THREE.Vector3()));
        const eyePosition=actor.worldToLocal(leftEye.getWorldPosition(new THREE.Vector3()));
        if(eyePosition.z<headPosition.z)visual.rotation.y=Math.PI;
      }
      if(data.customizable){
        data.uniforms={avatarSkinRatio:{value:new THREE.Color(1,1,1)},avatarShirt:{value:new THREE.Color(0x496d84)},avatarHair:{value:new THREE.Color(0x483c35)},avatarShoes:{value:new THREE.Color(0x303f52)},avatarHairStyle:{value:0}};
        data.accessories=makeAccessories();actor.add(data.accessories.head,data.accessories.torso);
      }
      source.traverse(mesh=>{if(!mesh.isMesh)return;mesh.castShadow=mesh.receiveShadow=true;mesh.frustumCulled=false;
        const prepare=m=>{if(data.customizable)return makeAvatarMaterial(m,/head/i.test(m.name),data.uniforms);const mat=m.clone();mat.metalness=0;mat.roughness=.85;return mat};
        mesh.material=Array.isArray(mesh.material)?mesh.material.map(prepare):prepare(mesh.material);
      });
      data.mixer=new THREE.AnimationMixer(source);data.actions={};
      for(const {name,gltf:motion} of clips){const clip=retargetMotion(motion.animations[0],motion.scene,source);clip.name=name;data.actions[name]=data.mixer.clipAction(clip);}
      if(data.customizable){
        const spine=source.getObjectByName('Bip02_Spine2')||source.getObjectByName('Bip01_Spine2')||source.getObjectByName('Bip02 Spine2')||source.getObjectByName('Bip01 Spine2');
        data.anchors=[rememberAnchor(actor,head,data.accessories.head),rememberAnchor(actor,spine,data.accessories.torso)];
        setAppearance(actor,data.appearance);
        data.accessories.policeCap.visible=data.police;
        data.accessories.policeBadge.visible=data.police;
        data.accessories.fireHelmet.visible=data.firefighter;data.accessories.fireStripes.visible=data.firefighter;
      }
      fallback.visible=false;data.ready=true;setMotion(data,'idle');data.actions.idle.time=data.phase%data.actions.idle.getClip().duration;
      data.mixer.update(0);actor.updateMatrixWorld(true);if(data.anchors)for(const frame of data.anchors)updateAnchor(actor,frame);
      return actor;
    }).catch(error=>{data.failed=true;data.ready=false;fallback.visible=true;if(data.visual)data.visual.visible=false;if(data.accessories){data.accessories.head.visible=false;data.accessories.torso.visible=false}onError('A detailed character could not load; a temporary character is being used.',error);return actor;});
    pending.add(loading);loading.finally(()=>pending.delete(loading));data.loading=loading;
    return actor;
  }
  function setMotion(data,name) {
    if(data.active===name)return;
    const previous=data.actions[data.active],next=data.actions[name];
    if(previous)previous.fadeOut(.2);
    next.reset().fadeIn(.2).play();data.active=name;
  }
  function setSeated(actor,seat=null){const d=actor.userData.character;d.seated=seat;if(!seat&&d.visual)d.visual.position.y=0;}
  function seatedPose(actor,data){
    const find=(side,part)=>{let result;data.source.traverse(b=>{if(b.isBone&&b.name.replaceAll('_',' ').endsWith((side?side+' ':'')+part))result=b;});return result;};
    const pelvis=find('', 'Pelvis');if(!pelvis)return;
    data.visual.position.y=0;actor.updateMatrixWorld(true);data.visual.position.y+=actor.position.y+data.seated.height+.04-pelvis.getWorldPosition(new THREE.Vector3()).y;actor.updateMatrixWorld(true);
    const forward=new THREE.Vector3(Math.sin(actor.rotation.y),0,Math.cos(actor.rotation.y));
    function aim(bone,child,direction){if(!bone||!child)return;const parent=bone.parent.getWorldQuaternion(new THREE.Quaternion()).invert();bone.quaternion.setFromUnitVectors(child.position.clone().normalize(),direction.clone().applyQuaternion(parent).normalize());actor.updateMatrixWorld(true);}
    for(const side of ['L','R']){const thigh=find(side,'Thigh'),calf=find(side,'Calf'),foot=find(side,'Foot');aim(thigh,calf,forward.clone().add(new THREE.Vector3(0,-.08,0)));aim(calf,foot,new THREE.Vector3(0,-1,0));const upper=find(side,'UpperArm'),fore=find(side,'Forearm'),hand=find(side,'Hand');aim(upper,fore,forward.clone().multiplyScalar(.22).add(new THREE.Vector3(0,-1,0)));aim(fore,hand,forward.clone().add(new THREE.Vector3(0,-.15,0)));}
  }
  function setActivity(actor,type='idle',held=null){actor.userData.character.activity={type,held};}
  function activityPose(actor,data){
    const activity=data.activity;if(!activity)return;
    const {type,held}=activity,forward=new THREE.Vector3(Math.sin(actor.rotation.y),0,Math.cos(actor.rotation.y));
    const find=(side,part)=>{let result;data.source.traverse(b=>{if(b.isBone&&b.name.replaceAll('_',' ').endsWith(side+' '+part))result=b;});return result;};
    function aim(bone,child,direction){if(!bone||!child)return;bone.quaternion.setFromUnitVectors(child.position.clone().normalize(),direction.clone().applyQuaternion(bone.parent.getWorldQuaternion(new THREE.Quaternion()).invert()).normalize());actor.updateMatrixWorld(true);}
    if(type!=='idle')for(const side of (type==='brew'?['L','R']:['R'])){const upper=find(side,'UpperArm'),fore=find(side,'Forearm'),hand=find(side,'Hand'),drinking=type==='sip'||type==='eat';
      aim(upper,fore,forward.clone().multiplyScalar(drinking?.35:.7).add(new THREE.Vector3(0,-.6,0)));
      aim(fore,hand,forward.clone().multiplyScalar(drinking?-.2:1).add(new THREE.Vector3(0,drinking?1:.1+Math.sin(data.phase*3)*.15,0)));
    }
    if(held&&held.visible){const hand=find('R','Hand');if(hand){held.position.copy(actor.worldToLocal(hand.getWorldPosition(new THREE.Vector3())));held.position.y+=.035;}else held.position.set(.25,1.1,.3);held.rotation.set(0,0,0);}
  }
  function update(dt,player) {
    for(const actor of actors){
      const data=actor.userData.character,x=actor.position.x,z=actor.position.z;
      const dx=x-data.last.x,dz=z-data.last.y,displacement=Math.hypot(dx,dz);data.last.set(x,z);
      if(!actor.visible)continue;
      actor.position.y=groundHeight(x,z);
      if(!data.ready)continue;
      // Face the direction of travel from world-space movement so turnarounds and crossing paths
      // cannot leave the body facing backward while a walk or run clip is playing.
      if(!data.seated&&displacement>.025&&displacement<1){const heading=characterFacingYaw(dx,dz);if(heading!==null)actor.rotation.y=heading;}
      // Ignore teleports between businesses when selecting a movement animation.
      const speed=dt>0&&displacement<1?displacement/dt:0;data.speed=THREE.MathUtils.damp(data.speed,speed,12,dt);
      const state=data.seated?'idle':data.speed>.15?(data.speed>3.2?'run':'walk'):'idle';setMotion(data,state);
      data.actions[state].setEffectiveTimeScale(state==='idle'?1:THREE.MathUtils.clamp(data.speed/(state==='run'?3.8:1.35),.65,1.9));
      if(data.interactive&&player&&actor!==player&&data.speed<.15&&actor.position.distanceTo(player.position)<5){const angle=Math.atan2(player.position.x-x,player.position.z-z),delta=Math.atan2(Math.sin(angle-actor.rotation.y),Math.cos(angle-actor.rotation.y));actor.rotation.y+=delta*Math.min(1,dt*3);}
      data.phase+=dt;data.mixer.update(dt);if(data.seated)seatedPose(actor,data);else if(data.visual)data.visual.position.y=0;actor.updateMatrixWorld(true);
      activityPose(actor,data);
      if(data.anchors)for(const frame of data.anchors)updateAnchor(actor,frame);
    }
  }
  return { create,setAppearance,setSeated,setActivity,update,actors,ready:()=>Promise.all([...pending]) };
}
