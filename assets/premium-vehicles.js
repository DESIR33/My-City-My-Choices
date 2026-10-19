import * as THREE from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {MeshoptDecoder} from 'three/addons/libs/meshopt_decoder.module.js';
import {mergeGeometries,mergeVertices} from 'three/addons/utils/BufferGeometryUtils.js';
import {VEHICLE} from './vehicle-physics.js';

const definitions = {
  senna: {name:'McLaren Senna',file:'senna.glb.gz'},
  gls: {name:'Mercedes GLS',file:'gls.glb.gz'},
};
const palette = {
  Chrome: {color:0xaab4bb,metalness:.96,roughness:.2},
  Alloy: {color:0x65717b,metalness:.92,roughness:.27},
  Rubber: {color:0x161a1d,metalness:0,roughness:.94},
  Trim: {color:0x172024,metalness:.18,roughness:.48},
  Carbon: {color:0x242b2e,metalness:.3,roughness:.35,clearcoat:.55},
  Leather: {color:0x292421,metalness:0,roughness:.88},
  SeatAccent: {color:0x865131,metalness:0,roughness:.82},
  Headlamp: {color:0xd8e4eb,metalness:.3,roughness:.16,emissive:0xc4ddf6,emissiveIntensity:.55},
  TailLamp: {color:0x8b1110,metalness:.12,roughness:.23,emissive:0xff2115,emissiveIntensity:.24},
  Plate: {color:0xd7d9ca,metalness:.1,roughness:.54},
  Caliper: {color:0x9c2d20,metalness:.35,roughness:.38},
};

function surfaceMaterial(category) {
  const m = category === 'Glass'
    ? new THREE.MeshPhysicalMaterial({color:0x304650,roughness:.07,metalness:0,ior:1.5,
      clearcoat:1,clearcoatRoughness:.045,transparent:true,opacity:.56,depthWrite:false,side:THREE.DoubleSide})
    : new THREE.MeshPhysicalMaterial(palette[category] || palette.Trim);
  m.name = 'Vehicle_' + category;
  // Low-contrast carbon weave is filtered away when its cells become subpixel.
  if(category === 'Carbon') {
    m.onBeforeCompile = shader => {
      shader.vertexShader = 'varying vec3 vehicleSurface;\n' + shader.vertexShader.replace('#include <begin_vertex>', '#include <begin_vertex>\nvehicleSurface=position;');
      shader.fragmentShader = 'varying vec3 vehicleSurface;\n' + shader.fragmentShader.replace('#include <color_fragment>', `#include <color_fragment>
        vec2 weaveUV=vec2(vehicleSurface.x+vehicleSurface.z,vehicleSurface.y+vehicleSurface.z)*180.0;
        float weave=mod(floor(weaveUV.x)+floor(weaveUV.y),2.0);
        float weaveFade=1.0-smoothstep(.35,1.0,max(fwidth(weaveUV.x),fwidth(weaveUV.y)));
        diffuseColor.rgb*=mix(1.0,mix(.82,1.1,weave),weaveFade);`);
    };
    m.customProgramCacheKey = () => 'vehicle-carbon-weave-v1';
  }
  return m;
}

function paintMaterial(color,modelId) {
  const finish=modelId==='gls'?{metalness:.26,roughness:.4,clearcoat:.7,clearcoatRoughness:.29}
    :{metalness:.42,roughness:.26,clearcoat:1,clearcoatRoughness:.115};
  return new THREE.MeshPhysicalMaterial({name:'Vehicle_Paint',color,...finish,envMapIntensity:1});
}

function worldClone(object) {
  const clone = object.clone(true);
  object.matrixWorld.decompose(clone.position,clone.quaternion,clone.scale);
  clone.updateMatrixWorld(true);
  return clone;
}

export function preparePremiumVehicleTemplate(scene, modelId) {
  if(!definitions[modelId])throw new Error('Unknown vehicle model: ' + modelId);
  scene.updateMatrixWorld(true);
  const materials = new Map(), originals = new Set();
  scene.traverse(o => {
    if(!o.isMesh)return;
    if(modelId==='senna'&&!Array.isArray(o.material)&&/^Vehicle_(Paint|Glass)$/.test(o.material.name)) {
      // Smooth within a surface material. Imported front/back materials stay
      // separate, and compression seams cannot turn into creases in the paint.
      const source=o.geometry,geometry=source.clone(),positions=source.attributes.position,points=new Float32Array(positions.count*3);
      for(let i=0;i<positions.count;i++){points[i*3]=positions.getX(i);points[i*3+1]=positions.getY(i);points[i*3+2]=positions.getZ(i);}
      geometry.setAttribute('position',new THREE.BufferAttribute(points,3));geometry.deleteAttribute('normal');
      o.geometry=mergeVertices(geometry,1e-5);o.geometry.computeVertexNormals();geometry.dispose();
    }
    const convert = old => {
      originals.add(old);
      const category=old.name.replace(/^Vehicle_/, '');
      if(!materials.has(category))materials.set(category,category==='Paint'?paintMaterial(0xffffff,modelId):surfaceMaterial(category));
      return materials.get(category);
    };
    o.material=Array.isArray(o.material)?o.material.map(convert):convert(o.material);
    o.castShadow=o.receiveShadow=true;
  });
  originals.forEach(m=>m.dispose());
  const levels=['near','mid','far'].map(name=>{
    const body=scene.getObjectByName(name+'_body');
    if(!body)throw new Error('Missing vehicle body: '+name);
    const wheels=['LF','RF','LR','RR'].map(id=>{
      const source=scene.getObjectByName(name+'_'+id);
      if(!source)throw new Error('Missing vehicle wheel: '+name+'_'+id);
      const bounds=new THREE.Box3().setFromObject(source),center=source.userData.wheelCenter
        ?new THREE.Vector3().fromArray(source.userData.wheelCenter):source.getWorldPosition(new THREE.Vector3());
      return {source,center,radius:source.userData.wheelRadius||(bounds.max.y-bounds.min.y)/2,front:id.endsWith('F'),side:Math.sign(center.x)};
    });
    return {body,wheels};
  });
  const bounds=new THREE.Box3().setFromObject(scene),size=bounds.getSize(new THREE.Vector3());
  if(size.x>VEHICLE.width+.015||size.z>VEHICLE.length+.015)throw new Error('Vehicle exceeds its collision footprint');
  return {kind:'premium',modelId,name:definitions[modelId].name,levels,materials,size,auxiliary:null};
}

export async function loadPremiumVehicleTemplates(baseURL=new URL('./vehicles/',import.meta.url)) {
  const loader=new GLTFLoader().setMeshoptDecoder(MeshoptDecoder);
  const results=await Promise.allSettled(Object.entries(definitions).map(async([id,definition])=>{
    const url=new URL(definition.file,baseURL),response=await fetch(url);
    if(!response.ok)throw new Error('Vehicle asset unavailable: '+id);
    const bytes=await new Response(response.body.pipeThrough(new DecompressionStream('gzip'))).arrayBuffer();
    const gltf=await loader.parseAsync(bytes,baseURL.href);
    return [id,preparePremiumVehicleTemplate(gltf.scene,id)];
  }));
  const templates=new Map();
  for(const result of results) {
    if(result.status==='fulfilled')templates.set(...result.value);
    else console.warn('A premium vehicle is unavailable; retaining the existing vehicle.',result.reason);
  }
  return templates;
}

function auxiliaryLights(template) {
  if(template.auxiliary)return template.auxiliary;
  const geometries={reverse:[],hazard:[]},body=template.levels[0].body;
  body.updateWorldMatrix(true,true);
  const ray=new THREE.Raycaster(),normal=new THREE.Vector3(),rotation=new THREE.Quaternion();
  const y=template.modelId==='senna'?.54:.67;
  for(const side of [-1,1])for(const [type,x,height,front] of [['reverse',side*.43,y,false],['hazard',side*.75,y+.08,false],['hazard',side*.75,y+.04,true]]) {
    ray.set(new THREE.Vector3(x,height,(front?1:-1)*(template.size.z/2+.4)),new THREE.Vector3(0,0,front?-1:1));
    const hit=ray.intersectObject(body,true)[0];
    if(!hit)continue;
    normal.copy(hit.face.normal).transformDirection(hit.object.matrixWorld);
    rotation.setFromUnitVectors(new THREE.Vector3(0,0,1),normal);
    geometries[type].push(new THREE.PlaneGeometry(type==='reverse'?.065:.045,.018).applyQuaternion(rotation).translate(...hit.point.clone().addScaledVector(normal,.003).toArray()));
  }
  template.auxiliary=Object.fromEntries(Object.entries(geometries).map(([key,parts])=>{
    const geometry=parts.length?mergeGeometries(parts):null;parts.forEach(p=>p.dispose());return[key,geometry];
  }));
  return template.auxiliary;
}

export function mountPremiumVehicle(group, template, color) {
  group.userData.vehicleVisual?.dispose?.();
  group.clear();
  const rig=new THREE.Group();rig.name=template.name+' rig';group.add(rig);
  const paint=paintMaterial(color,template.modelId),brakeMaterial=surfaceMaterial('TailLamp');
  const reverseMaterial=new THREE.MeshStandardMaterial({color:0xbac5cc,roughness:.23,emissive:0xe6f2ff,emissiveIntensity:0});
  const hazardMaterial=new THREE.MeshStandardMaterial({color:0xa45b13,roughness:.3,emissive:0xff8917,emissiveIntensity:0});
  const environment=template.materials.get('Paint').envMap;
  if(environment)paint.envMap=environment;
  const assign=object=>object.traverse(o=>{
    if(!o.isMesh)return;
    const material=m=>m.name==='Vehicle_Paint'?paint:m.name==='Vehicle_TailLamp'?brakeMaterial:m;
    o.material=Array.isArray(o.material)?o.material.map(material):material(o.material);
  });
  const auxiliary=auxiliaryLights(template);
  const levels=template.levels.map((source,index)=>{
    const root=new THREE.Group();root.name=['Near vehicle detail','Medium vehicle detail','Distant vehicle detail'][index];root.visible=index===2;rig.add(root);
    const body=new THREE.Group();root.add(body);
    const shell=worldClone(source.body);assign(shell);body.add(shell);
    for(const [name,geometry] of Object.entries(auxiliary))if(geometry)body.add(new THREE.Mesh(geometry,name==='reverse'?reverseMaterial:hazardMaterial));
    const wheels=source.wheels.map(w=>{
      const pivot=new THREE.Group(),spin=new THREE.Group(),mesh=worldClone(w.source);
      pivot.name='Wheel steering pivot';spin.name='Authored tire and alloy';
      pivot.position.copy(w.center);mesh.position.sub(w.center);assign(mesh);
      spin.add(mesh);pivot.add(spin);root.add(pivot);
      const fixedCalipers=[];
      mesh.traverse(o=>{if(o.isMesh&&o.material.name==='Vehicle_Caliper')fixedCalipers.push(o);});
      // Authored brake calipers steer with the hub but do not rotate with the tire.
      for(const caliper of fixedCalipers)pivot.attach(caliper);
      return {...w,pivot,spin,fixedCalipers};
    });
    return {root,body,wheels};
  });
  const front=levels[0].wheels.filter(w=>w.front),back=levels[0].wheels.filter(w=>!w.front);
  const data={kind:'premium',modelId:template.modelId,modelName:template.name,rig,levels,body:levels[2].body,wheels:levels[2].wheels,
    paint,brakeMaterial,reverseMaterial,hazardMaterial,travel:0,activeLevel:2,
    wheelbase:Math.abs(front[0].center.z-back[0].center.z),track:Math.abs(front[0].center.x-front[1].center.x),
    materials:[paint,brakeMaterial,reverseMaterial,hazardMaterial,...template.materials.values()],
    dispose(){paint.dispose();brakeMaterial.dispose();reverseMaterial.dispose();hazardMaterial.dispose();}};
  group.userData.vehicleVisual=data;
  group.userData.vehicleDimensions={width:VEHICLE.width,length:VEHICLE.length};
  return data;
}

export function updatePremiumVehicleVisual(group,state) {
  const data=group.userData.vehicleVisual,disabled=group.userData.disabled||state.disabled;
  const steering=state.steering||0,tan=Math.tan(steering),radius=Math.abs(tan)>.001?data.wheelbase/tan:1e6;
  for(const level of data.levels) {
    level.body.rotation.x=(state.pitch||0)+(disabled?.025:0);
    level.body.rotation.z=(state.roll||0)+(disabled?.018:0);
    level.body.position.y=-Math.min(.022,Math.abs(state.pitch||0)*.3+Math.abs(state.roll||0)*.2);
    for(const wheel of level.wheels) {
      if(wheel.front)wheel.pivot.rotation.y=Math.abs(tan)>.001?Math.atan(data.wheelbase/(radius-wheel.side*data.track/2)):0;
      wheel.spin.rotation.x=(state.wheelTravel||0)/wheel.radius;
    }
  }
  data.brakeMaterial.emissiveIntensity=(state.brake>.08||state.handbrake||disabled)?2.6:.24;
  data.reverseMaterial.emissiveIntensity=state.gear==='R'?1.4:0;
  data.hazardMaterial.emissiveIntensity=disabled?(Math.floor(performance.now()/380)%2?2.5:.05):0;
}

// Keep a bounded number of rich models nearby. Every level uses the same
// authored silhouette and independent wheel pivots, so no car turns into a box.
export function updateVehicleDetail(refs,camera,{mobile=false,focusVehicle=null}={}) {
  const cameraPosition=camera.getWorldPosition(new THREE.Vector3());
  const candidates=refs.map(ref=>ref.group||ref).filter(group=>group.userData.vehicleVisual?.kind==='premium')
    .map(group=>({group,distance:group.position.distanceTo(cameraPosition)}))
    .sort((a,b)=>(a.group===focusVehicle?-1:b.group===focusVehicle?1:a.distance-b.distance));
  let near=0,mid=0;
  for(const {group,distance} of candidates) {
    const data=group.userData.vehicleVisual,nearLimit=(mobile?14:24)*(data.activeLevel===0?1.15:1),midLimit=(mobile?42:72)*(data.activeLevel===1?1.1:1);
    const level=(group===focusVehicle||distance<nearLimit)&&near<(mobile?2:4)?(near++,0):distance<midLimit&&mid<(mobile?5:10)?(mid++,1):2;
    if(data.activeLevel===level)continue;
    data.levels.forEach((entry,i)=>entry.root.visible=i===level);
    data.activeLevel=level;data.body=data.levels[level].body;data.wheels=data.levels[level].wheels;
  }
}

export function setVehicleEnvironment(refs,templates,environment) {
  const materials=new Set();
  for(const template of templates.values())for(const material of template.materials.values())materials.add(material);
  for(const ref of refs) {
    const data=(ref.group||ref).userData.vehicleVisual;
    if(data?.kind==='premium')for(const material of data.materials)materials.add(material);
  }
  for(const material of materials)if(material.isMeshStandardMaterial) {
    material.envMap=environment;material.envMapIntensity=1;material.needsUpdate=true;
  }
}
