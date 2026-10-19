import * as THREE from 'three';
import {mergeGeometries} from 'three/addons/utils/BufferGeometryUtils.js';
import {RoundedBoxGeometry} from 'three/addons/geometries/RoundedBoxGeometry.js';
import {VEHICLE} from './vehicle-physics.js';

const rubber = new THREE.MeshStandardMaterial({name:'Tire rubber',color:0x16191c,roughness:.9,metalness:0});
const alloy = new THREE.MeshStandardMaterial({name:'Graphite alloy spokes',color:0x637079,roughness:.28,metalness:.87});
const machined = new THREE.MeshStandardMaterial({name:'Machined wheel lip',color:0xaab6bd,roughness:.22,metalness:.94});
const rotor = new THREE.MeshStandardMaterial({name:'Brushed brake rotor',color:0x535b60,roughness:.51,metalness:.8});
const recess = new THREE.MeshStandardMaterial({name:'Wheel recesses',color:0x161b1e,roughness:.6,metalness:.35});
const caliper = new THREE.MeshStandardMaterial({name:'Brake caliper',color:0x9c3029,roughness:.33,metalness:.45});

function lathe(profile) {
  return new THREE.LatheGeometry(profile.map(([x,r])=>new THREE.Vector2(r,x)),64).rotateZ(-Math.PI/2);
}
function cylinder(radius,depth,x,segments=32) {
  return new THREE.CylinderGeometry(radius,radius,depth,segments).rotateZ(-Math.PI/2).translate(x,0,0);
}
function ring(radius,tube,x) {
  return new THREE.TorusGeometry(radius,tube,6,64).rotateY(Math.PI/2).translate(x,0,0);
}
function combine(parts) {
  const expanded=parts.map(g=>g.index?g.toNonIndexed():g),result=mergeGeometries(expanded,false);
  for(const g of new Set([...parts,...expanded]))g.dispose();result.computeBoundingBox();result.computeBoundingSphere();return result;
}
const templates = new Map();
function wheelTemplate(side) {
  if(templates.has(side))return templates.get(side);
  const r=VEHICLE.wheelRadius;
  // Rounded shoulders and recessed circumferential tread grooves; the tire is an
  // annular solid, never a silver cap covering the entire wheel face.
  const tire=lathe([[-.126,.228],[-.137,.253],[-.133,.288],[-.112,.313],[-.086,r],[-.055,r],[-.052,r-.006],[-.046,r-.006],[-.043,r],[-.005,r],[-.002,r-.006],[.004,r-.006],[.007,r],[.044,r],[.047,r-.006],[.053,r-.006],[.056,r],[.086,r],[.112,.313],[.133,.288],[.137,.253],[.126,.228],[-.126,.228]]);
  const tires=[tire,ring(.281,.0018,.135),ring(.289,.0014,.132),ring(.247,.002,.137)];
  const spokes=[],lip=[lathe([[-.103,.21],[-.103,.232],[.111,.238],[.126,.234],[.129,.226],[.116,.219],[.105,.224],[-.093,.22],[-.103,.21]]),ring(.232,.004,.127)];
  // Open split-five-spoke alloys. The empty spaces are real geometry gaps,
  // revealing the recessed rotor and the fixed caliper behind them.
  for(let i=0;i<5;i++)for(const branch of [-1,1]) {
    const shape=new THREE.Shape();
    const points=[[-.013,.054],[-.017,.105],[-.042,.207],[-.024,.225],[-.004,.217],[.008,.115],[.016,.065]];
    points.forEach(([x,y],n)=>n?shape.lineTo(x*branch,y):shape.moveTo(x*branch,y));shape.closePath();
    spokes.push(new THREE.ExtrudeGeometry(shape,{depth:.023,steps:1,bevelEnabled:true,bevelThickness:.003,bevelSize:.003,bevelSegments:2}).rotateZ(i*Math.PI*2/5).rotateY(Math.PI/2).translate(.085,0,0));
  }
  spokes.push(cylinder(.064,.035,.099));
  lip.push(cylinder(.039,.009,.125),ring(.043,.003,.13));
  for(let i=0;i<5;i++) {const a=i*Math.PI*2/5;lip.push(cylinder(.009,.012,.125,6).translate(0,Math.sin(a)*.049,Math.cos(a)*.049));}
  const disc=[cylinder(.186,.019,.024),ring(.179,.0025,.035)],details=[];
  for(let i=0;i<30;i++){const a=i*Math.PI*2/30;details.push(new THREE.CircleGeometry(.005,6).rotateY(Math.PI/2).translate(.0345,Math.sin(a)*.154,Math.cos(a)*.154));}
  const result=[['tire',combine(tires),rubber],['alloy',combine(spokes),alloy],['lip',combine(lip),machined],['rotor',combine(disc),rotor],['drilled holes',combine(details),recess]];
  if(side<0)for(const [,geometry] of result)geometry.rotateY(Math.PI);
  templates.set(side,result);return result;
}

const caliperGeometry=new RoundedBoxGeometry(.062,.18,.088,3,.015);
export function mountVehicleWheel(rig,center) {
  const pivot=new THREE.Group(),spin=new THREE.Group(),side=Math.sign(center.x)||1;
  pivot.name='Wheel steering pivot';spin.name='Wheel and brake rotor';pivot.position.copy(center);pivot.add(spin);rig.add(pivot);
  for(const [part,geometry,material] of wheelTemplate(side)) {
    const mesh=new THREE.Mesh(geometry,material);mesh.name='Wheel '+part;mesh.userData.wheelPart=part;
    mesh.castShadow=mesh.receiveShadow=true;spin.add(mesh);
  }
  const brake=new THREE.Mesh(caliperGeometry,caliper);brake.name='Fixed brake caliper';brake.position.set(side*.05,.01,.145);brake.castShadow=true;pivot.add(brake);
  return {pivot,spin,front:center.z>0,side,center:center.clone()};
}
