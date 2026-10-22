import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { clone as cloneSkeleton } from 'three/addons/utils/SkeletonUtils.js';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import {footContactLift} from './character-grounding.js';
import { characterFacingYaw } from './character-controls.js';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { MODELS, crowdModel } from './character-roster.js';
import { AMBIENT_MOTIONS, PHONE_MOTIONS, ambientMotion } from './crowd-life.js';
export { MODELS, CROWD_ADULTS, CROWD_CHILDREN, crowdModel } from './character-roster.js';


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
    rect('#ffff00', .015, .57, .31, .43); rect('#ffff00', .68, .57, .31, .43);
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
  const rideHelmet=new THREE.Group(),cycleHelmet=new THREE.Group(),motorHelmet=new THREE.Group();
  const shell=new THREE.MeshPhysicalMaterial({color:0xeee9df,roughness:.26,metalness:.12,clearcoat:1});
  for(const [group,radius,depth] of [[cycleHelmet,.159,Math.PI/2],[motorHelmet,.173,Math.PI*.77]]){const cap=new THREE.Mesh(new THREE.SphereGeometry(radius,28,18,0,Math.PI*2,0,depth),shell);cap.position.y=.11;group.add(cap);}
  const dark=clothMaterial(0x17232b);for(const x of [-.09,-.045,0,.045,.09]){const vent=new THREE.Mesh(new RoundedBoxGeometry(.019,.013,.12,2,.005),dark);vent.position.set(x,.25-Math.abs(x)*.4,.025);cycleHelmet.add(vent);}
  const glass=new THREE.MeshPhysicalMaterial({color:0x182b38,metalness:.5,roughness:.12,clearcoat:1});const shield=new THREE.Mesh(new THREE.SphereGeometry(.178,28,12,Math.PI*-.36,Math.PI*.72,Math.PI*.32,Math.PI*.27),glass);shield.position.y=.11;motorHelmet.add(shield);const chin=new THREE.Mesh(new RoundedBoxGeometry(.25,.06,.13,3,.02),shell);chin.position.set(0,-.005,.10);motorHelmet.add(chin);rideHelmet.add(cycleHelmet,motorHelmet);head.add(rideHelmet);rideHelmet.visible=false;
  return { rideHelmet,cycleHelmet,motorHelmet, head, torso, hat, backpack, policeCap, policeBadge, fireHelmet,fireStripes,hair,hatMaterial:straw,backpackMaterial:fabric };
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

export function createCharacterSystem(scene, { groundHeight = ()=>-.07, onError = console.warn, baseURL = new URL('./characters/',import.meta.url).href, crowdLimit = {} } = {}) {
  const loader = new GLTFLoader();
  const templates = new Map(), animations = new Map(), actors = [];
  const masks = { head: maskTexture(true), body: maskTexture(false) };
  const pending = new Set();
  let crowdCount=0;const ambientClips=new Map();
  // Ambient clips download per animation set, only once someone needs them.
  function ambientMotions(set){if(!ambientClips.has(set))ambientClips.set(set,Promise.all(Object.entries(AMBIENT_MOTIONS).map(async ([name,file])=>({name,gltf:await load(set+'_'+file+'.glb')}))));return ambientClips.get(set);}
  function phoneProp(){const phone=new THREE.Mesh(new THREE.BoxGeometry(.072,.145,.011),new THREE.MeshStandardMaterial({color:0x15181c,roughness:.35,metalness:.4}));phone.name='Phone';phone.castShadow=true;phone.visible=false;return phone;}
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
    const material = original.clone(); material.roughness = original.roughnessMap ? 1 : head ? .7 : .9; material.metalness = 0;
    material.onBeforeCompile = shader => {
      Object.assign(shader.uniforms,uniforms,{ avatarMask: { value: head?masks.head:masks.body } });
      shader.fragmentShader = 'uniform sampler2D avatarMask;\nuniform vec3 avatarSkinRatio;\nuniform vec3 avatarShirt;\nuniform vec3 avatarPants;\nuniform float avatarPantsEnabled;\nuniform float avatarTopPattern;\nuniform vec3 avatarHair;\nuniform vec3 avatarShoes;\nuniform float avatarHairStyle;\n'+shader.fragmentShader;
      const tint = head ? `
        vec3 region = texture2D(avatarMask,vMapUv).rgb;
        if (avatarHairStyle != 1.0 && region.g > .4 && vMapUv.y > .66 && vMapUv.x > .5) discard;
        float shade = clamp(dot(diffuseColor.rgb,vec3(.2126,.7152,.0722))/.18,.25,1.8);
        diffuseColor.rgb = mix(diffuseColor.rgb,diffuseColor.rgb*avatarSkinRatio,region.r);
        diffuseColor.rgb = mix(diffuseColor.rgb,avatarHair*shade,region.g);
      ` : `
        vec3 region = texture2D(avatarMask,vMapUv).rgb;
        float shade = clamp(dot(diffuseColor.rgb,vec3(.2126,.7152,.0722))/.16,.24,1.8);
        float pantsRegion=step(.5,region.r)*step(.5,region.g);
        float shirtRegion=region.r*(1.0-pantsRegion);
        float stripes=mix(1.0,.58,step(.5,fract(vMapUv.y*32.0))*avatarTopPattern);
        diffuseColor.rgb = mix(diffuseColor.rgb,avatarShirt*shade*stripes,shirtRegion);
        diffuseColor.rgb = mix(diffuseColor.rgb,avatarPants*shade,pantsRegion*avatarPantsEnabled);
        diffuseColor.rgb = mix(diffuseColor.rgb,avatarShoes*shade,region.g*(1.0-pantsRegion));
        diffuseColor.rgb = mix(diffuseColor.rgb,diffuseColor.rgb*avatarSkinRatio,region.b);
      `;
      shader.fragmentShader=shader.fragmentShader.replace('#include <map_fragment>','#include <map_fragment>\n'+tint);
    };
    material.customProgramCacheKey=()=>head?'maple-child-head-v1':'maple-child-clothes-v2';
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
    data.fallback.children[0].material.color.setHex(data.appearance.shirt??0x496d84);
    for(const i of [2,4])data.fallback.children[i].material.color.setHex(data.appearance.pants??0x394852);
    if (!data.uniforms) return;
    const a=data.appearance;
    const skin=data.uniforms.avatarSkinRatio.value.setHex(a.skin??0xc99472),reference=new THREE.Color(0xddb399);skin.setRGB(skin.r/reference.r,skin.g/reference.g,skin.b/reference.b);
    data.uniforms.avatarShirt.value.setHex(a.shirt??0x496d84); data.uniforms.avatarHair.value.setHex(a.hair??0x483c35);
    data.uniforms.avatarShoes.value.setHex(a.shoes??0x303f52);
    data.uniforms.avatarPants.value.setHex(a.pants??0x9daab1);data.uniforms.avatarPantsEnabled.value=a.pants==null?0:1;data.uniforms.avatarTopPattern.value=a.topPattern?1:0;
    data.accessories.hatMaterial.color.setHex(a.hatColor??0xe0b957);data.accessories.backpackMaterial.color.setHex(a.backpackColor??0x657e92);
    data.uniforms.avatarHairStyle.value=a.style==='ponytail'?1:a.style==='bun'?2:0;
    data.accessories.hair.curls.visible=a.style==='curls'; data.accessories.hair.bun.visible=a.style==='bun';
    data.accessories.hair.material.color.setHex(a.hair??0x483c35);
    if(data.accessories.rideHelmet){data.accessories.rideHelmet.visible=!!data.riding;data.accessories.cycleHelmet.visible=data.riding?.kind==='bicycle';data.accessories.motorHelmet.visible=data.riding?.kind==='motorcycle';if(data.riding){data.accessories.hair.curls.visible=false;data.accessories.hair.bun.visible=false;}}
    data.accessories.hat.visible=!!a.wardrobe?.hat&&!data.riding;data.accessories.backpack.visible=!!a.wardrobe?.backpack;
  }
  function create({ x,z,model='neighbor',scale=1,shirt=0x6b8077,customizable=false,interactive=false,police=false,firefighter=false,seed,ambient,turn=0,ambientSeed }) {
    // Background townspeople ask for 'crowd' (or 'crowd-child'); outfit masks only fit the original six.
    const fromCrowd=(model==='crowd'||model==='crowd-child')&&!(customizable||police||firefighter),crowdSeed=seed??crowdCount;
    if(model==='crowd'||model==='crowd-child'){if(fromCrowd&&seed===undefined)crowdCount++;model=fromCrowd?crowdModel(crowdSeed,{child:model==='crowd-child',limit:model==='crowd-child'?crowdLimit.children:crowdLimit.adults}):(model==='crowd'?'neighbor':'boy');}
    // Townspeople fill standing time with ambient clips: 'loner' or 'talk' (turn 0/1 between partners).
    if(ambient===undefined&&fromCrowd)ambient='loner';
    if(!MODELS[model])throw new Error('Unknown character model '+model);
    const actor=new THREE.Group();actor.position.set(x,groundHeight(x,z),z);scene.add(actor);
    const fallback=placeholder(shirt);actor.add(fallback);
    const data={ model,customizable:customizable||police||firefighter,interactive,police,firefighter,fallback,appearance:police?{shirt:0x172b45,shoes:0x17212f}:firefighter?{shirt:0xa49158,shoes:0x17212f}:{},last:new THREE.Vector2(x,z),speed:0,active:null,phase:actors.length*.61,ambient:ambient||null,turn,seed:ambientSeed??(fromCrowd?crowdSeed:actors.length),life:0 };
    if(police)actor.userData.role='police-officer';
    actor.userData.character=data;actors.push(actor);
    const loading=Promise.all([template(model),motions(MODELS[model].set)]).then(([gltf,clips])=>{
      const source=cloneSkeleton(gltf.scene),visual=new THREE.Group();
      source.updateMatrixWorld(true);
      const bounds=new THREE.Box3().setFromObject(source),size=bounds.getSize(new THREE.Vector3()),center=bounds.getCenter(new THREE.Vector3());
      const ratio=MODELS[model].height*(.9+.1*scale)/size.y;
      source.position.set(-center.x,-bounds.min.y,-center.z);visual.scale.setScalar(ratio);visual.add(source);actor.add(visual);
      data.source=source;data.visual=visual;data.height=MODELS[model].height*(.9+.1*scale);
      const bones=MODELS[model].bones||'Bip01',head=source.getObjectByName(bones+'_Head');
      const leftEye=source.getObjectByName(bones+'_LEye');
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
        data.uniforms={avatarPants:{value:new THREE.Color(0x9daab1)},avatarPantsEnabled:{value:0},avatarTopPattern:{value:0},avatarSkinRatio:{value:new THREE.Color(1,1,1)},avatarShirt:{value:new THREE.Color(0x496d84)},avatarHair:{value:new THREE.Color(0x483c35)},avatarShoes:{value:new THREE.Color(0x303f52)},avatarHairStyle:{value:0}};
        data.accessories=makeAccessories();actor.add(data.accessories.head,data.accessories.torso);
      }
      source.traverse(mesh=>{if(!mesh.isMesh)return;mesh.castShadow=mesh.receiveShadow=true;mesh.frustumCulled=false;
        const prepare=m=>{if(data.customizable)return makeAvatarMaterial(m,/head/i.test(m.name),data.uniforms);const mat=m.clone();mat.metalness=0;mat.roughness=m.roughnessMap?1:.85;return mat};
        mesh.material=Array.isArray(mesh.material)?mesh.material.map(prepare):prepare(mesh.material);
      });
      actor.updateMatrixWorld(true);data.contacts=[];data.jumpBones=[];source.traverse(bone=>{if(bone.isBone&&/[ _](L|R)[ _](Thigh|Calf|UpperArm)$/.test(bone.name))data.jumpBones.push(bone);if(bone.isBone&&/[ _](L|R)[ _]Foot$/.test(bone.name)){const pos=bone.getWorldPosition(new THREE.Vector3());data.contacts.push({bone,soleDepth:pos.y-actor.position.y});}});
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
      if(data.ambient)ambientMotions(MODELS[model].set).then(list=>{for(const {name,gltf:motion} of list){const clip=retargetMotion(motion.animations[0],motion.scene,source);clip.name=name;data.actions[name]=data.mixer.clipAction(clip);}const hand=source.getObjectByName((MODELS[model].bones||'Bip01')+'_R_Hand');if(hand){data.phone=phoneProp();hand.add(data.phone);const s=hand.getWorldScale(new THREE.Vector3()).x;data.phone.scale.setScalar(.8/Math.max(1e-6,s));data.phone.position.set(.09/s,.015/s,.025/s);data.phone.rotation.set(Math.PI/2,0,Math.PI/2);}data.ambientReady=true;}).catch(error=>onError('Townsperson gestures could not load.',error));
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
  function setResting(actor,rest=null){const d=actor.userData.character;d.resting=rest;d.seated=null;if(d.visual){d.visual.rotation.x=0;d.visual.position.y=0;}}
  function restingPose(actor,data){if(!data.visual)return;data.visual.rotation.x=-Math.PI/2;data.visual.position.y=0;actor.updateMatrixWorld(true);const bounds=new THREE.Box3().setFromObject(data.visual,true);data.visual.position.y+=actor.position.y+data.resting.height-bounds.min.y;actor.updateMatrixWorld(true);}
  function setSeated(actor,seat=null){const d=actor.userData.character;d.seated=seat;if(!seat&&d.visual)d.visual.position.y=0;}
  function seatedPose(actor,data){
    const find=(side,part)=>{let result;data.source.traverse(b=>{if(b.isBone&&b.name.replaceAll('_',' ').endsWith((side?side+' ':'')+part))result=b;});return result;};
    const pelvis=find('', 'Pelvis');if(!pelvis)return;
    data.visual.position.y=0;actor.updateMatrixWorld(true);data.visual.position.y+=actor.position.y+data.seated.height+.04-pelvis.getWorldPosition(new THREE.Vector3()).y;actor.updateMatrixWorld(true);
    const forward=new THREE.Vector3(Math.sin(actor.rotation.y),0,Math.cos(actor.rotation.y));
    function aim(bone,child,direction){if(!bone||!child)return;const parent=bone.parent.getWorldQuaternion(new THREE.Quaternion()).invert();bone.quaternion.setFromUnitVectors(child.position.clone().normalize(),direction.clone().applyQuaternion(parent).normalize());actor.updateMatrixWorld(true);}
    for(const side of ['L','R']){const thigh=find(side,'Thigh'),calf=find(side,'Calf'),foot=find(side,'Foot');aim(thigh,calf,forward.clone().add(new THREE.Vector3(0,-.08,0)));aim(calf,foot,new THREE.Vector3(0,-1,0));const upper=find(side,'UpperArm'),fore=find(side,'Forearm'),hand=find(side,'Hand');aim(upper,fore,forward.clone().multiplyScalar(.22).add(new THREE.Vector3(0,-1,0)));aim(fore,hand,forward.clone().add(new THREE.Vector3(0,-.15,0)));}
  }
  function setRiding(actor,ride=null){const d=actor.userData.character;d.riding=ride;if(d.visual)d.visual.position.set(0,0,0);if(!ride){actor.rotation.x=actor.rotation.z=0;}setAppearance(actor,d.appearance);}
  function ridingPose(actor,data){
    const targets=data.riding.targets();if(!targets)return;
    const find=(side,part)=>{let found;data.source.traverse(b=>{if(b.isBone&&b.name.replaceAll('_',' ').endsWith((side?side+' ':'')+part))found=b;});return found;};
    const pelvis=find('','Pelvis');if(!pelvis)return;
    actor.updateMatrixWorld(true);const offset=actor.worldToLocal(targets.seat.clone()).sub(actor.worldToLocal(pelvis.getWorldPosition(new THREE.Vector3())));data.visual.position.add(offset);actor.updateMatrixWorld(true);
    function aim(bone,child,point){if(!bone||!child)return;const direction=point.clone().sub(bone.getWorldPosition(new THREE.Vector3())).applyQuaternion(bone.parent.getWorldQuaternion(new THREE.Quaternion()).invert()).normalize();bone.quaternion.setFromUnitVectors(child.position.clone().normalize(),direction);actor.updateMatrixWorld(true);}
    function solve(upper,lower,end,target,pole){if(!upper||!lower||!end)return;const a=upper.getWorldPosition(new THREE.Vector3()),b=lower.getWorldPosition(new THREE.Vector3()),c=end.getWorldPosition(new THREE.Vector3()),l1=a.distanceTo(b),l2=b.distanceTo(c),delta=target.clone().sub(a),distance=THREE.MathUtils.clamp(delta.length(),Math.abs(l1-l2)+.001,l1+l2-.001),axis=delta.normalize(),along=(l1*l1-l2*l2+distance*distance)/(2*distance),bend=pole.clone().addScaledVector(axis,-pole.dot(axis)).normalize(),joint=a.clone().addScaledVector(axis,along).addScaledVector(bend,Math.sqrt(Math.max(0,l1*l1-along*along)));aim(upper,lower,joint);aim(lower,end,a.clone().addScaledVector(axis,distance));}
    const forward=new THREE.Vector3(0,0,1).applyQuaternion(actor.quaternion),right=new THREE.Vector3(1,0,0).applyQuaternion(actor.quaternion);
    const spine=find('','Spine'),spine1=find('','Spine1');if(spine&&spine1){const posture=new THREE.Vector3(0,1,0).applyQuaternion(actor.quaternion).addScaledVector(forward,data.riding.kind==='motorcycle'?.85:.45);aim(spine,spine1,spine.getWorldPosition(new THREE.Vector3()).add(posture));}
    for(const side of ['L','R']){const upper=find(side,'UpperArm'),fore=find(side,'Forearm'),hand=find(side,'Hand'),thigh=find(side,'Thigh'),calf=find(side,'Calf'),foot=find(side,'Foot');if(!upper||!thigh)continue;const sign=actor.worldToLocal(upper.getWorldPosition(new THREE.Vector3())).x<0?-1:1,index=sign<0?0:1;solve(upper,fore,hand,targets.hands[index],right.clone().multiplyScalar(sign).addScaledVector(forward,-.35));solve(thigh,calf,foot,targets.feet[index],forward.clone().addScaledVector(right,sign*.25));}
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
      actor.position.y=actor===player&&actor.userData.vertical?.managed?actor.userData.vertical.y:groundHeight(x,z);
      if(!data.ready)continue;
      // Face the direction of travel from world-space movement so turnarounds and crossing paths
      // cannot leave the body facing backward while a walk or run clip is playing.
      if(!data.riding&&!data.seated&&!data.resting&&displacement>.025&&displacement<1){const heading=characterFacingYaw(dx,dz);if(heading!==null)actor.rotation.y=heading;}
      // Ignore teleports between businesses when selecting a movement animation.
      const speed=dt>0&&displacement<1?displacement/dt:0;data.speed=THREE.MathUtils.damp(data.speed,speed,12,dt);
      data.life+=dt;let state=actor.userData.vertical?.grounded===false||data.seated||data.resting||data.riding?'idle':data.speed>.15?(data.speed>3.2?'run':'walk'):'idle';
      if(state==='idle'&&data.ambientReady&&!data.seated&&!data.resting&&!data.riding&&!(data.activity&&data.activity.type!=='idle')){const pick=ambientMotion(data.ambient,data.life,{seed:data.seed,turn:data.turn});if(data.actions[pick])state=pick;}
      setMotion(data,state);if(data.phone)data.phone.visible=PHONE_MOTIONS.includes(state);
      data.actions[state].setEffectiveTimeScale(state==='walk'||state==='run'?THREE.MathUtils.clamp(data.speed/(state==='run'?3.8:1.35),.65,1.9):1);
      if(data.interactive&&player&&actor!==player&&data.speed<.15&&actor.position.distanceTo(player.position)<5){const angle=Math.atan2(player.position.x-x,player.position.z-z),delta=Math.atan2(Math.sin(angle-actor.rotation.y),Math.cos(angle-actor.rotation.y));actor.rotation.y+=delta*Math.min(1,dt*3);}
      data.phase+=dt;data.mixer.update(dt);if(data.resting)restingPose(actor,data);else if(data.seated)seatedPose(actor,data);else if(data.visual)data.visual.position.y=0;actor.updateMatrixWorld(true);
      if(data.riding)ridingPose(actor,data);else if(!data.resting)activityPose(actor,data);
      if(!data.riding&&!data.seated&&!data.resting&&actor.userData.vertical?.grounded===false){for(const bone of data.jumpBones||[])bone.rotation.x+=/Calf$/.test(bone.name)?.45:/Thigh$/.test(bone.name)?-.25:-.18;actor.updateMatrixWorld(true);}
      if(!data.riding&&!data.seated&&!data.resting&&actor.userData.vertical?.grounded!==false&&data.contacts?.length){actor.updateMatrixWorld(true);const points=data.contacts.map(({bone,soleDepth})=>({...bone.getWorldPosition(new THREE.Vector3()),soleDepth}));data.visual.position.y+=footContactLift(points,groundHeight);actor.updateMatrixWorld(true);}
      if(data.anchors)for(const frame of data.anchors)updateAnchor(actor,frame);
    }
  }
  return { create,setAppearance,setSeated,setResting,setRiding,setActivity,update,actors,ready:()=>Promise.all([...pending]) };
}
