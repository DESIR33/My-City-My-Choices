import * as THREE from 'three';
import {mergeGeometries,mergeVertices} from 'three/addons/utils/BufferGeometryUtils.js';
import {RoundedBoxGeometry} from 'three/addons/geometries/RoundedBoxGeometry.js';
import {mountVehicleWheel} from './vehicle-wheels.js';
import {VEHICLE} from './vehicle-physics.js';
import {mountPremiumVehicle,updatePremiumVehicleVisual} from './premium-vehicles.js';
const unit = new THREE.BoxGeometry(1, 1, 1);
const metal = new THREE.MeshStandardMaterial({color: 0x85949c, metalness: .92, roughness: .24});
const dark = new THREE.MeshStandardMaterial({color: 0x11191e, roughness: .62, metalness: .25});
const rubber = new THREE.MeshStandardMaterial({color: 0x171b1e, roughness: .97});
function box(parent, material, x, y, z, w, h, d) {
  const mesh = new THREE.Mesh(unit, material); mesh.position.set(x, y, z); mesh.scale.set(w, h, d);
  mesh.castShadow = mesh.receiveShadow = true; parent.add(mesh); return mesh;
}
function geometryFrom(parts, materialIndex, source, from, to) {
  const positions = source.attributes.position, normals = source.attributes.normal;
  for (let i = from; i < to; i += 3) {
    if (!parts.has(materialIndex)) parts.set(materialIndex, {position: [], normal: []});
    const part = parts.get(materialIndex);
    for (let j = 0; j < 3; j++) {
      part.position.push(positions.getX(i + j), positions.getY(i + j), positions.getZ(i + j));
      part.normal.push(normals.getX(i + j), normals.getY(i + j), normals.getZ(i + j));
    }
  }
}
function packed(parts) {
  const geometries = [], names = [];
  for (const [name, part] of parts) {
    if (!part.position.length) continue;
    let geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.Float32BufferAttribute(part.position, 3));
    geo.setAttribute('normal', new THREE.Float32BufferAttribute(part.normal, 3));
    // UVs are unused by the source OBJ; provide a consistent attribute set.
    geo.setAttribute('uv', new THREE.Float32BufferAttribute(new Float32Array(part.position.length / 3 * 2), 2));
    if(name==='Gloss_Red'||/Windows|Glass/.test(name)){
      // Weld the imported paint surface before computing smooth vertex normals.
      // Glass is smoothed too; hard trim edges retain their source normals.
      geo.deleteAttribute('normal');const smooth=mergeVertices(geo,1e-5);smooth.computeVertexNormals();geo.dispose();geo=smooth.toNonIndexed();smooth.dispose();
    }
    geometries.push(geo); names.push(name);
  }
  const geometry = mergeGeometries(geometries, true); geometries.forEach(g => g.dispose());
  geometry.computeBoundingBox(); geometry.computeBoundingSphere(); return {geometry, names};
}
export function prepareVehicleTemplate(original) {
  const bodyBounds = new THREE.Box3().setFromObject(original.getObjectByName('Body_Cube.001'));
  const tire = original.getObjectByName('Rubber/Brakes_Circle.004'), tireBounds = new THREE.Box3().setFromObject(tire);
  const scaleX = VEHICLE.width / (bodyBounds.max.x - bodyBounds.min.x), scaleY = .46, scaleZ = VEHICLE.length / 9.656605;
  const centerZ = (-4.622998 + 5.033607) / 2;
  // Normalize once. The original faces -Z; the game's vehicle forward is +Z.
  const transform = new THREE.Matrix4().set(-scaleX, 0, 0, 0, 0, scaleY, 0, .065 - tireBounds.min.y * scaleY, 0, 0, -scaleZ, centerZ * scaleZ, 0, 0, 0, 1);
  const body = new Map();
  const wheelBounds = Array.from({length: 4}, () => new THREE.Box3());
  const tireGeometry = tire.geometry.clone().applyMatrix4(transform), pos = tireGeometry.attributes.position;
  for (let i = 0; i < pos.count; i++) {const p = new THREE.Vector3().fromBufferAttribute(pos, i); wheelBounds[(p.x > 0 ? 1 : 0) + (p.z > 0 ? 2 : 0)].expandByPoint(p);}
  const centers = wheelBounds.map(b => b.getCenter(new THREE.Vector3())); tireGeometry.dispose();
  // These export leftovers distort the car's scale; dense grille cylinders are replaced by actual dark grille slats.
  const omit = /Arches_Cylinder|^Grill_|^Left_and_Right_Grill|Wheels_Cylinder|Rubber\/Brakes|Spokes_|Hub\.|^Rear_Splitters_|^Exhaust_|^Rear_Number_Plate|^Bonnet_gaps/;
  for (const object of original.children) {
    if (!object.isMesh || omit.test(object.name)) continue;
    const geometry = object.geometry.clone().applyMatrix4(transform), materials = Array.isArray(object.material) ? object.material : [object.material];
    const groups = geometry.groups.length ? geometry.groups : [{start: 0, count: geometry.attributes.position.count, materialIndex: 0}];
    for (const group of groups) {
      let name = materials[group.materialIndex]?.name || 'Matte_Black';
      if(/^Front_Bumper_|^Front_Bottom_Bumper_/.test(object.name))name='RadiatorGrille';
      else if (name === 'None' || name === '') name = /Door_Panel|Bonnet/.test(object.name) ? 'PanelGap' : 'Matte_Black';
      geometryFrom(body, name, geometry, group.start, group.start + group.count);
    }
    geometry.dispose();
  }
  const packedBody=packed(body),rearSurface=new THREE.Mesh(packedBody.geometry,new THREE.MeshBasicMaterial({side:THREE.DoubleSide}));rearSurface.updateMatrixWorld();
  return {body:packedBody,centers,rearSurface,rearPanels:new Map()};
}
function physicalMaterial(name, paint) {
  let mat;
  if (name === 'Gloss_Red') mat = paint;
  else if(name==='RadiatorGrille') {
    mat=new THREE.MeshStandardMaterial({color:0x182127,roughness:.76,metalness:.24});mat.name='Recessed radiator mesh';
    mat.onBeforeCompile=shader=>{
      shader.vertexShader='varying vec3 grillePosition;\n'+shader.vertexShader.replace('#include <begin_vertex>','#include <begin_vertex>\ngrillePosition=position;');
      shader.fragmentShader='varying vec3 grillePosition;\n'+shader.fragmentShader.replace('#include <color_fragment>','#include <color_fragment>\nfloat openings=step(.18,fract(grillePosition.y*55.0))*step(.16,fract(grillePosition.x*42.0));diffuseColor.rgb*=mix(.8,.055,openings);');
    };mat.customProgramCacheKey=()=> 'vehicle-radiator-mesh-v1';
  }
  else if (/Windows|Glass/.test(name)) mat = new THREE.MeshPhysicalMaterial({color: 0x182a33, metalness: .05, roughness: .09, clearcoat: 1, clearcoatRoughness: .055, envMapIntensity: 1.1, transparent:true, opacity:.82, depthWrite:false});
  else if (/White_Light|Material.006/.test(name)) mat = new THREE.MeshStandardMaterial({color: 0xdcecff, metalness: .2, roughness: .22, emissive: 0xd1e4ff, emissiveIntensity: .45});
  else if (/Material.007/.test(name)) mat = new THREE.MeshStandardMaterial({color: 0xaa3e15, roughness: .3, metalness: .2});
  else if (name === 'Material.005') mat = dark;
  else if (/Mirror|Material.001/.test(name)) mat = metal;
  else if (name === 'Matte_Black') mat = rubber;
  else if (name === 'Gloss_Black') mat = new THREE.MeshStandardMaterial({color: 0x10171c, roughness: .3, metalness: .25});
  else if (name === 'PanelGap') mat = dark;
  else mat = new THREE.MeshStandardMaterial({color: 0x263039, roughness: .6, metalness: .35});
  return mat;
}
function profileBody(paint) {
  // A sloping hood, raked windscreen, shaped roof and tapered rear replace the box fallback.
  const sections = [[-2.25,.67,.78],[-1.65,.9,.94],[-.85,1.25,.91],[.55,1.34,.88],[1.1,.91,.91],[2.25,.69,.79]];
  const vertices = [], indices = [];
  for (const [z, height, width] of sections) vertices.push(-width,.34,z,width,.34,z,-width,height,z,width,height,z);
  for (let i = 0; i < sections.length - 1; i++) {const a = i * 4, b = a + 4; for (const [p,q] of [[0,1],[1,3],[3,2],[2,0]]) indices.push(a+p,a+q,b+p,a+q,b+q,b+p);}
  indices.push(0,2,1,1,2,3,20,21,22,21,23,22);
  const geo = new THREE.BufferGeometry(); geo.setAttribute('position',new THREE.Float32BufferAttribute(vertices,3));geo.setIndex(indices);geo.computeVertexNormals();
  return new THREE.Mesh(geo,paint);
}
// Project the rear trim onto the imported body instead of attaching floating
// rectangular blocks to a fixed Z plane on a curved bumper.
function rearPanelGeometry(template,minX,minY,maxX,maxY,offset){
  const key=[minX,minY,maxX,maxY,offset].join(':');if(template.rearPanels.has(key))return template.rearPanels.get(key);
  const positions=[],uv=[],indices=[],nx=8,ny=4,ray=new THREE.Raycaster(new THREE.Vector3(),new THREE.Vector3(0,0,1));
  for(let y=0;y<=ny;y++)for(let x=0;x<=nx;x++){
    const px=minX+(maxX-minX)*x/nx,py=minY+(maxY-minY)*y/ny;ray.ray.origin.set(px,py,-3);
    const hit=ray.intersectObject(template.rearSurface,false)[0];positions.push(px,py,(hit?hit.point.z:-2.2)-offset);uv.push(x/nx,y/ny);
    if(x<nx&&y<ny){const a=y*(nx+1)+x;indices.push(a,a+nx+1,a+1,a+1,a+nx+1,a+nx+2);}
  }
  const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));g.setAttribute('uv',new THREE.Float32BufferAttribute(uv,2));g.setIndex(indices);g.computeVertexNormals();template.rearPanels.set(key,g);return g;
}
export function mountVehicle(group, template, color, index = 0) {
  if(template?.kind==='premium')return mountPremiumVehicle(group,template,color);
  group.userData.vehicleVisual?.dispose?.();
  group.clear(); const paint = new THREE.MeshPhysicalMaterial({color, metalness: .36, roughness: .29, clearcoat: 1, clearcoatRoughness: .13, envMapIntensity: 1.15});
  const rig = new THREE.Group(), body = new THREE.Group(); rig.name = 'Vehicle rig'; body.name = 'Sprung body'; rig.add(body); group.add(rig);
  const cache = new Map(); const material = name => {if (!cache.has(name)) cache.set(name, physicalMaterial(name, paint));return cache.get(name);};
  const mesh = template ? new THREE.Mesh(template.body.geometry, template.body.names.map(material)) : profileBody(paint);
  mesh.castShadow = mesh.receiveShadow = true; body.add(mesh);
  if (!template) {
    const glass = new THREE.MeshPhysicalMaterial({color:0x263f4d,roughness:.16,metalness:.25,clearcoat:1,side:THREE.DoubleSide});
    function panel(points){const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(points.flat(),3));g.setIndex([0,1,2,0,2,3]);g.computeVertexNormals();body.add(new THREE.Mesh(g,glass));}
    panel([[-.84,.96,1.07],[.84,.96,1.07],[.81,1.32,.57],[-.81,1.32,.57]]);
    panel([[-.84,.95,-1.57],[-.83,1.24,-.86],[.83,1.24,-.86],[.84,.95,-1.57]]);
    for(const side of [-1,1]){
      panel([[side*.932,.91,-1.48],[side*.922,1.22,-.81],[side*.902,1.3,.48],[side*.932,.94,.97]]);
      box(body,dark,side*.928,1.08,-.1,.035,.31,.055);
    }
  }
  const centers = template?.centers || [new THREE.Vector3(-.92,.392,-1.3),new THREE.Vector3(.92,.392,-1.3),new THREE.Vector3(-.92,.392,1.49),new THREE.Vector3(.92,.392,1.49)];
  // Replace the source's closed wheel caps with shared open alloy geometry.
  const wheels = centers.map(center => mountVehicleWheel(rig,center));
  // Real recessed dark grille, painted bumpers, a splitter, and supported lamp lenses.
  if(!template){for(let i=0;i<6;i++)box(body,dark,0,.57+i*.035,2.21,1.2,.014,.018);}
  box(body,dark,0,.30,2.24,1.56,.045,.075);
  const brakeMaterial = new THREE.MeshStandardMaterial({color:0x931c19,roughness:.27,emissive:0xff2415,emissiveIntensity:.28});
  const reverseMaterial = new THREE.MeshStandardMaterial({color:0xa9bac4,roughness:.3,emissive:0xe8f4ff,emissiveIntensity:0});
  const led = new THREE.MeshStandardMaterial({color:0xe7eff5,roughness:.2,emissive:0xcde5ff,emissiveIntensity:.65});
  for(const side of [-1,1]) {
    if(!template)box(body,led,side*.69,.78,2.18,.38,.034,.035);
    if(template){
      body.add(new THREE.Mesh(rearPanelGeometry(template,side*.62-.21,.82,side*.62+.21,1.015,.009),dark));
      for(let j=0;j<3;j++){const x=side*(.49+j*.13);body.add(new THREE.Mesh(rearPanelGeometry(template,x-.027,.85,x+.027,.985,.017),brakeMaterial));}
      const x=side*.39;body.add(new THREE.Mesh(rearPanelGeometry(template,x-.05,.70,x+.05,.735,.015),reverseMaterial));
    }else{for(let j=0;j<3;j++)box(body,brakeMaterial,side*(.49+j*.13),.77,-2.28,.054,.18,.018);box(body,reverseMaterial,side*.39,.59,-2.29,.1,.035,.012);}
    const exhaust = new THREE.Mesh(new THREE.CylinderGeometry(.055,.055,.13,24,1,true),metal);exhaust.rotation.x=Math.PI/2;exhaust.position.set(side*.57,.39,-2.19);body.add(exhaust);
    const exhaustInside=new THREE.Mesh(new THREE.CircleGeometry(.045,24),dark);exhaustInside.rotation.y=Math.PI;exhaustInside.position.set(side*.57,.39,-2.244);body.add(exhaustInside);
    box(body,dark,side*.88,.3,.08,.055,.075,1.93);
    // Small body-colour mirrors and a single flush handle per coupe door.
    if(!template){const mirror=new THREE.Mesh(new RoundedBoxGeometry(.17,.095,.235,3,.025),paint);mirror.position.set(side*.951,1.00,.72);mirror.castShadow=true;body.add(mirror);
    const mirrorGlass=new THREE.Mesh(new RoundedBoxGeometry(.125,.067,.016,2,.008),metal);mirrorGlass.position.set(side*.96,1.005,.61);body.add(mirrorGlass);}
    const handle=new THREE.Mesh(new RoundedBoxGeometry(.023,.029,.17,2,.009),metal);handle.position.set(side*.94,.89,-.24);body.add(handle);
  }
  // A visible cabin gives the glass depth, with seats and a steering wheel.
  const leather=new THREE.MeshStandardMaterial({color:0x20272b,roughness:.82});
  for(const side of [-1,1]){const cushion=new THREE.Mesh(new RoundedBoxGeometry(.49,.17,.60,3,.045),leather);cushion.position.set(side*.41,.62,.18);body.add(cushion);const back=new THREE.Mesh(new RoundedBoxGeometry(.48,.48,.14,3,.035),leather);back.position.set(side*.41,.89,-.08);back.rotation.x=-.13;body.add(back);const headrest=new THREE.Mesh(new RoundedBoxGeometry(.25,.17,.12,3,.035),leather);headrest.position.set(side*.41,1.16,-.12);body.add(headrest);}
  const dashboard=new THREE.Mesh(new RoundedBoxGeometry(1.52,.16,.28,3,.045),dark);dashboard.position.set(0,.87,.85);body.add(dashboard);box(body,dark,0,.65,.3,.21,.21,.78);
  const steeringWheel=new THREE.Mesh(new THREE.TorusGeometry(.16,.018,8,24),dark);steeringWheel.position.set(.43,.99,.70);steeringWheel.rotation.x=-.55;body.add(steeringWheel);
  const hazardMaterial=new THREE.MeshStandardMaterial({color:0xe9a03b,emissive:0xff8d13,emissiveIntensity:0,roughness:.3});
  for(const side of [-1,1]){
    if(template){for(const x of [side*.82])body.add(new THREE.Mesh(rearPanelGeometry(template,x-.025,.85,x+.025,.875,.018),hazardMaterial));}
    else box(body,hazardMaterial,side*.84,.75,-2.29,.08,.025,.012);
    box(body,hazardMaterial,side*.84,.75,2.21,.08,.025,.012);
  }
  const diffuser=new THREE.Mesh(new RoundedBoxGeometry(1.45,.12,.3,3,.025),dark);diffuser.position.set(0,.41,-2.10);body.add(diffuser);
  const plateMaterial=new THREE.MeshStandardMaterial({color:0xd4dbd5,roughness:.56});
  if(template){body.add(new THREE.Mesh(rearPanelGeometry(template,-.255,.59,.255,.77,.01),dark));body.add(new THREE.Mesh(rearPanelGeometry(template,-.215,.62,.215,.74,.019),plateMaterial));}
  else{box(body,dark,0,.67,-2.28,.55,.19,.035);box(body,plateMaterial,0,.67,-2.305,.43,.12,.012);}
  rig.traverse(o=>{if(o.isMesh)o.receiveShadow=true;});
  const data={rig,body,wheels,brakeMaterial,reverseMaterial,hazardMaterial,paint,travel:0,steering:0,pitch:0,roll:0};
  const sharedGeometry=new Set([unit,template?.body.geometry,...(template?.rearPanels.values()||[])]),ownedGeometry=new Set(),ownedMaterials=new Set();
  body.traverse(o=>{if(!o.isMesh)return;if(!sharedGeometry.has(o.geometry))ownedGeometry.add(o.geometry);for(const m of (Array.isArray(o.material)?o.material:[o.material]))if(![metal,dark,rubber].includes(m))ownedMaterials.add(m);});
  data.dispose=()=>{ownedGeometry.forEach(g=>g.dispose());ownedMaterials.forEach(m=>m.dispose());};
  group.userData.vehicleVisual=data;group.userData.vehicleDimensions={width:VEHICLE.width,length:VEHICLE.length};
  return data;
}
export function updateVehicleVisual(group, state, dt) {
  const data=group.userData.vehicleVisual;if(!data)return;
  if(data.kind==='premium'){updatePremiumVehicleVisual(group,state);return;}
  const disabled=group.userData.disabled||state.disabled,steering=state.steering||0;data.body.rotation.x=(state.pitch||0)+(disabled?.025:0);data.body.rotation.z=(state.roll||0)+(disabled?.018:0);
  // Small damped load transfer around the chassis; wheels remain planted on the road.
  data.body.position.y=-Math.min(.022,Math.abs(state.pitch||0)*.3+Math.abs(state.roll||0)*.2);
  for(const wheel of data.wheels) {
    if(wheel.front){const tan=Math.tan(steering),radius=Math.abs(tan)>.001?VEHICLE.wheelbase/tan:1e6;
      wheel.pivot.rotation.y=Math.abs(tan)>.001?Math.atan(VEHICLE.wheelbase/(radius-wheel.side*VEHICLE.track/2)):0;
    }
    wheel.spin.rotation.x=(state.wheelTravel||0)/VEHICLE.wheelRadius;
  }
  data.brakeMaterial.emissiveIntensity=(state.brake>.08||state.handbrake)?2.6:.28;
  data.reverseMaterial.emissiveIntensity=state.gear==='R'?1.4:0;
  if(data.hazardMaterial)data.hazardMaterial.emissiveIntensity=disabled?(Math.floor(performance.now()/380)%2?2.5:.05):0;
}
