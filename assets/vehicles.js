import * as THREE from 'three';
import {mergeGeometries} from 'three/addons/utils/BufferGeometryUtils.js';
import {VEHICLE} from './vehicle-physics.js';
const unit = new THREE.BoxGeometry(1, 1, 1);
const metal = new THREE.MeshStandardMaterial({color: 0x85949c, metalness: .92, roughness: .24});
const dark = new THREE.MeshStandardMaterial({color: 0x11191e, roughness: .62, metalness: .25});
const rubber = new THREE.MeshStandardMaterial({color: 0x171b1e, roughness: .97});
const brakeRotor = new THREE.MeshStandardMaterial({color: 0x687077, metalness: .86, roughness: .38});
const brakeCaliper = new THREE.MeshStandardMaterial({color: 0x9d3528, metalness: .52, roughness: .32});
function box(parent, material, x, y, z, w, h, d) {
  const mesh = new THREE.Mesh(unit, material); mesh.position.set(x, y, z); mesh.scale.set(w, h, d);
  mesh.castShadow = mesh.receiveShadow = true; parent.add(mesh); return mesh;
}
function geometryFrom(parts, materialIndex, source, from, to, center, wheelIndex) {
  const positions = source.attributes.position, normals = source.attributes.normal;
  for (let i = from; i < to; i += 3) {
    let x = 0, z = 0;
    for (let j = 0; j < 3; j++) {x += positions.getX(i + j); z += positions.getZ(i + j);}
    const quadrant = (x > 0 ? 1 : 0) + (z > 0 ? 2 : 0);
    if (wheelIndex !== undefined && quadrant !== wheelIndex) continue;
    if (!parts.has(materialIndex)) parts.set(materialIndex, {position: [], normal: []});
    const part = parts.get(materialIndex);
    for (let j = 0; j < 3; j++) {
      part.position.push(positions.getX(i + j) - center.x, positions.getY(i + j) - center.y, positions.getZ(i + j) - center.z);
      part.normal.push(normals.getX(i + j), normals.getY(i + j), normals.getZ(i + j));
    }
  }
}
function packed(parts) {
  const geometries = [], names = [];
  for (const [name, part] of parts) {
    if (!part.position.length) continue;
    const geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.Float32BufferAttribute(part.position, 3));
    geo.setAttribute('normal', new THREE.Float32BufferAttribute(part.normal, 3));
    // UVs are unused by the source OBJ; provide a consistent attribute set.
    geo.setAttribute('uv', new THREE.Float32BufferAttribute(new Float32Array(part.position.length / 3 * 2), 2));
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
  const body = new Map(), wheels = [new Map(), new Map(), new Map(), new Map()];
  const wheelBounds = Array.from({length: 4}, () => new THREE.Box3());
  const tireGeometry = tire.geometry.clone().applyMatrix4(transform), pos = tireGeometry.attributes.position;
  for (let i = 0; i < pos.count; i++) {const p = new THREE.Vector3().fromBufferAttribute(pos, i); wheelBounds[(p.x > 0 ? 1 : 0) + (p.z > 0 ? 2 : 0)].expandByPoint(p);}
  const centers = wheelBounds.map(b => b.getCenter(new THREE.Vector3())); tireGeometry.dispose();
  // These export leftovers distort the car's scale; dense grille cylinders are replaced by actual dark grille slats.
  const omit = /Arches_Cylinder|^Grill_|^Left_and_Right_Grill/;
  for (const object of original.children) {
    if (!object.isMesh || omit.test(object.name)) continue;
    const geometry = object.geometry.clone().applyMatrix4(transform), materials = Array.isArray(object.material) ? object.material : [object.material];
    const groups = geometry.groups.length ? geometry.groups : [{start: 0, count: geometry.attributes.position.count, materialIndex: 0}];
    const moving = /Wheels_Cylinder|Rubber\/Brakes|Spokes_|Hub\./.test(object.name);
    for (const group of groups) {
      let name = materials[group.materialIndex]?.name || 'Matte_Black';
      if (name === 'None' || name === '') name = /Door_Panel|Bonnet/.test(object.name) ? 'PanelGap' : 'Matte_Black';
      if (moving) for (let wheel = 0; wheel < 4; wheel++) geometryFrom(wheels[wheel], name, geometry, group.start, group.start + group.count, centers[wheel], wheel);
      else geometryFrom(body, name, geometry, group.start, group.start + group.count, new THREE.Vector3());
    }
    geometry.dispose();
  }
  return {body: packed(body), wheels: wheels.map(packed), centers};
}
function physicalMaterial(name, paint) {
  let mat;
  if (name === 'Gloss_Red') mat = paint;
  else if (/Windows|Glass/.test(name)) mat = new THREE.MeshPhysicalMaterial({color: 0x243a46, metalness: .15, roughness: .12, clearcoat: 1, clearcoatRoughness: .07, envMapIntensity: 1.3});
  else if (/White_Light|Material.006/.test(name)) mat = new THREE.MeshStandardMaterial({color: 0xdcecff, metalness: .2, roughness: .22, emissive: 0xd1e4ff, emissiveIntensity: .45});
  else if (/Material.007/.test(name)) mat = new THREE.MeshStandardMaterial({color: 0xaa3e15, roughness: .3, metalness: .2});
  else if (name === 'Material.005') mat = dark;
  else if (/Mirror|Material.001/.test(name)) mat = metal;
  else if (name === 'Matte_Black') mat = rubber;
  else if (name === 'Gloss_Black') mat = new THREE.MeshStandardMaterial({color: 0x64727c, roughness: .28, metalness: .9});
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
export function mountVehicle(group, template, color, index = 0) {
  group.clear(); const paint = new THREE.MeshPhysicalMaterial({color, metalness: .48, roughness: .24, clearcoat: 1, clearcoatRoughness: .09, envMapIntensity: 1.25});
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
  const wheels = centers.map((center, i) => {
    const pivot = new THREE.Group(), spin = new THREE.Group(); pivot.position.copy(center); pivot.add(spin); rig.add(pivot);
    if (template) {const wheel = new THREE.Mesh(template.wheels[i].geometry, template.wheels[i].names.map(name => name === 'Gloss_Red' ? dark : material(name))); wheel.castShadow = wheel.receiveShadow = true; spin.add(wheel);}
    else {
      const tire = new THREE.Mesh(new THREE.CylinderGeometry(.327,.327,.245,32),rubber);tire.rotation.z=Math.PI/2;spin.add(tire);
      const rim = new THREE.Mesh(new THREE.CylinderGeometry(.225,.225,.252,24),metal);rim.rotation.z=Math.PI/2;spin.add(rim);
      for(let j=0;j<5;j++){const spoke=box(spin,dark,Math.sign(center.x)*.13,Math.sin(j*Math.PI/2.5)*.11,Math.cos(j*Math.PI/2.5)*.11,.012,.045,.2);spoke.rotation.x=-j*Math.PI/2.5;}
    }
    // Ventilated brake rotors rotate with the wheel; calipers stay fixed to the steering/suspension pivot.
    const rotor = new THREE.Mesh(new THREE.CylinderGeometry(.225,.225,.022,32),brakeRotor);rotor.rotation.z=Math.PI/2;spin.add(rotor);
    const caliper = box(pivot,brakeCaliper,Math.sign(center.x)*.055,.005,.125,.075,.19,.12);caliper.castShadow=true;
    // Fine tread blocks sit on the existing tyre surface, not oversized discs or floating rims.
    const tread = new THREE.InstancedMesh(unit,rubber,48), dummy = new THREE.Object3D();
    for(let j=0;j<48;j++){const a=j/48*Math.PI*2;dummy.position.set(0,Math.cos(a)*.324,Math.sin(a)*.324);dummy.rotation.x=a;dummy.scale.set(.21,.009,.018);dummy.updateMatrix();tread.setMatrixAt(j,dummy.matrix);}
    tread.castShadow=true;tread.computeBoundingSphere();spin.add(tread);
    return {pivot, spin, front:center.z>0, side:Math.sign(center.x), center:center.clone()};
  });
  // Real recessed dark grille, painted bumpers, a splitter, and supported lamp lenses.
  for(let i=0;i<6;i++)box(body,dark,0,.47+i*.043,2.19,1.28,.022,.055);
  box(body,dark,0,.30,2.24,1.56,.065,.1);
  const brakeMaterial = new THREE.MeshStandardMaterial({color:0x931c19,roughness:.27,emissive:0xff2415,emissiveIntensity:.28});
  const reverseMaterial = new THREE.MeshStandardMaterial({color:0xa9bac4,roughness:.3,emissive:0xe8f4ff,emissiveIntensity:0});
  const led = new THREE.MeshStandardMaterial({color:0xe7eff5,roughness:.2,emissive:0xcde5ff,emissiveIntensity:.65});
  for(const side of [-1,1]) {
    box(body,led,side*.69,.78,2.18,.38,.034,.035);
    for(let j=0;j<3;j++)box(body,brakeMaterial,side*(.49+j*.13),.77,-2.28,.065,.25,.035);
    box(body,reverseMaterial,side*.39,.59,-2.29,.1,.045,.03);
    const exhaust = new THREE.Mesh(new THREE.CylinderGeometry(.07,.07,.19,16,1,true),metal);exhaust.rotation.x=Math.PI/2;exhaust.position.set(side*.65,.31,-2.24);body.add(exhaust);
    box(body,dark,side*.94,.3,-.05,.08,.11,2.5);
    box(body,paint,side*1.00,1.02,.75,.18,.10,.24);
    box(body,dark,side*.95,.86,-.25,.025,.035,.20);
    box(body,dark,side*.95,.86,.65,.025,.035,.20);
  }
  // A visible cabin gives the glass depth, with seats and a steering wheel.
  for(const side of [-1,1]){box(body,dark,side*.43,.61,.18,.55,.17,.64);const back=box(body,dark,side*.43,.88,-.10,.54,.54,.14);back.rotation.x=-.13;box(body,dark,side*.43,1.17,-.13,.28,.18,.13);}
  const steeringWheel=new THREE.Mesh(new THREE.TorusGeometry(.16,.018,8,24),dark);steeringWheel.position.set(.43,.99,.70);steeringWheel.rotation.x=-.55;body.add(steeringWheel);
  const hazardMaterial=new THREE.MeshStandardMaterial({color:0xe9a03b,emissive:0xff8d13,emissiveIntensity:0,roughness:.3});
  for(const side of [-1,1])for(const z of [-2.29,2.2])box(body,hazardMaterial,side*.84,.7,z,.10,.08,.035);
  box(body,dark,0,.67,-2.28,.55,.19,.035);
  // A small stamped plate remains readable without adding another texture or web request.
  box(body,new THREE.MeshStandardMaterial({color:0xc6d0cb,roughness:.48}),0,.67,-2.305,.43,.12,.012);
  rig.traverse(o=>{if(o.isMesh)o.receiveShadow=true;});
  const data={rig,body,wheels,brakeMaterial,reverseMaterial,hazardMaterial,paint,travel:0,steering:0,pitch:0,roll:0};
  group.userData.vehicleVisual=data;group.userData.vehicleDimensions={width:VEHICLE.width,length:VEHICLE.length};
  return data;
}
export function updateVehicleVisual(group, state, dt) {
  const data=group.userData.vehicleVisual;if(!data)return;
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
