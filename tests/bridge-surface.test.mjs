import assert from 'node:assert/strict';
import * as THREE from 'three';
import {createNorthWorld} from '../assets/north-world.js';
import {BRIDGE,RIVER,bridgeHeight,bridgePitch,worldDrivable} from '../assets/world-rules.js';
import {advanceVehicle,createVehicleState,vehicleFootprint} from '../assets/vehicle-physics.js';

globalThis.document={createElement:()=>({getContext:()=>({fillRect(){},fillText(){}})})};
const scene=new THREE.Scene(),obstacles=[],traffic=[];
const C={road:new THREE.MeshStandardMaterial({color:0x252b30}),walk:new THREE.MeshStandardMaterial({color:0x92948f}),grass:new THREE.MeshStandardMaterial({color:0x446b43})};
function cube(parent,x,y,z,w,h,d,mat){const m=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),mat);m.position.set(x,y+h/2,z);parent.add(m);return m;}
const north=createNorthWorld({scene,visualKit:{treeModel:()=>new THREE.Group(),atmosphere:{registerGlow(){},addStreetLight(){}}},cube,C,obstacles,buildings:[],car(x,z,color,heading,moving,speed,axis='z'){traffic.push({mesh:{position:{x,z},rotation:{y:heading},userData:{}},speed,axis});},traffic,trafficControllers:[],addCornerSignal(){},characters:{create(){}}});
scene.updateMatrixWorld(true);const {surfaces,markings,supports}=north.bridge,road=surfaces[0],deck=supports.find(m=>m.name==='Bridge structural deck');
assert.equal(surfaces.length,3);assert.equal(markings.length,2,'Shaped markings use only two draw calls');assert.ok(road.geometry.attributes.position.count>1000,'The rendered bridge follows a dense smooth profile');
for(const mesh of surfaces){const p=mesh.geometry.attributes.position,n=mesh.geometry.attributes.normal;for(let i=0;i<p.count;i++){const rise=mesh===road?0:.15;assert.ok(Math.abs(p.getY(i)-bridgeHeight(p.getZ(i))-rise)<2e-5,'Rendered road and footpaths match gameplay height');assert.ok(n.getY(i)>.99,'Bridge surfaces face upward, including ramps');}}
// Cast through the actual geometry: the asphalt is always above structural concrete,
// rather than occupying the very same depth as in the reported screenshot.
for(let z=BRIDGE.south+.1;z>=BRIDGE.north-.1;z-=2.7){const zz=Math.max(BRIDGE.north,Math.min(BRIDGE.south,z));for(const x of [-7.3,-2.4,0,2.4,7.3]){const ray=new THREE.Raycaster(new THREE.Vector3(x,20,zz),new THREE.Vector3(0,-1,0)),hits=ray.intersectObjects([road,...supports]);assert.ok(hits.length);assert.equal(hits[0].object,road,'The visible road is asphalt everywhere, not concrete');const lower=ray.intersectObject(deck)[0];assert.ok(lower);assert.ok(hits[0].point.y-lower.point.y>.059,'Concrete has real vertical separation from the driving surface');}}
for(const m of markings){const p=m.geometry.attributes.position;for(let i=0;i<p.count;i++)assert.ok(Math.abs(p.getY(i)-bridgeHeight(p.getZ(i))-.018)<2e-5,'Every dash follows the slope instead of clipping into it');assert.ok(m.material.polygonOffset);}
for(const z of [BRIDGE.south,RIVER.south,RIVER.north,BRIDGE.north]){assert.ok(Math.abs(bridgePitch(0,z,0))<.00031,'Level/ramp transitions meet without a sharp pitch change');assert.ok(Math.abs(bridgeHeight(z+.001)-bridgeHeight(z-.001))<.00001);}
let maxGrade=0;for(let z=BRIDGE.south;z>=BRIDGE.north;z-=.1)maxGrade=Math.max(maxGrade,Math.abs(bridgeHeight(z-.05)-bridgeHeight(z+.05))/.1);assert.ok(maxGrade<.06,'The bridge has a natural road grade below six percent');
const allowed=(x,z,h)=>vehicleFootprint(x,z,h).every(p=>worldDrivable(p.x,p.z));
for(const [z,heading,finish] of [[-170,Math.PI,-1140],[-1140,0,-170]]){const car=createVehicleState(-2.4,z,heading);let lastY=bridgeHeight(z),lastPitch=bridgePitch(car.x,car.z,heading);for(let i=0;i<4000&&Math.abs(car.z-finish)>1;i++){const result=advanceVehicle(car,{forward:1},.04,allowed);assert.equal(result.collided,false);const y=bridgeHeight(car.z),pitch=bridgePitch(car.x,car.z,heading);assert.ok(Math.abs(y-lastY)<.045,'Road contact rises continuously');assert.ok(Math.abs(pitch-lastPitch)<.002,'Vehicle pitch changes smoothly at road speed');lastY=y;lastPitch=pitch;if(heading===0&&car.z>=finish||heading===Math.PI&&car.z<=finish)break;}assert.ok(Math.abs(car.z-finish)<2,'Drive across the bridge in both directions');}
console.log('Bridge surface passed: native Three road/deck separation, upward faces, slope-aligned paint, six-percent grade, smooth transitions, and bidirectional driving with continuous height/pitch.');
