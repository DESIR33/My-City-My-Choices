import assert from 'node:assert/strict';
import * as THREE from 'three';
import {createNorthWorld} from '../assets/north-world.js';
import {NORTH_CITY,worldDrivable} from '../assets/world-rules.js';
globalThis.document={createElement:()=>({getContext:()=>new Proxy({},{get:()=>()=>{}})})};
const scene=new THREE.Scene(),walks=[],obstacles=[],traffic=[],trees=[],mat=c=>new THREE.MeshStandardMaterial({color:c}),C={grass:mat(0x334433),road:mat(0x333333),walk:mat(0x999999)};
const world=createNorthWorld({scene,C,obstacles,buildings:[],traffic,trafficControllers:[],addCornerSignal(){},characters:{create(){}},visualKit:{masonry:mat,brick:mat,atmosphere:{registerGlow(){},addStreetLight(){}},treeModel:(x,z,size)=>{trees.push({x,z,size});return new THREE.Group()}},
 cube(parent,x,y,z,w,h,d,m){if(m===C.walk)walks.push({minX:x-w/2,maxX:x+w/2,minZ:z-d/2,maxZ:z+d/2});const mesh=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),m);mesh.position.set(x,y+h/2,z);parent.add(mesh);return mesh},car(x,z,c,h,moving,speed,axis){const mesh=new THREE.Group();mesh.position.set(x,0,z);if(moving)traffic.push({mesh,speed,axis});return mesh}});
const pavement=(x,z)=>walks.some(r=>x>r.minX+.001&&x<r.maxX-.001&&z>r.minZ+.001&&z<r.maxZ-.001);
for(const x of [-2.4,2.4])for(let z=-1100;z>=-1150;z-=.25)assert.equal(pavement(x,z),false,'No sidewalk across bridge approach at '+x+','+z);
for(const x of NORTH_CITY.avenues)for(let z=-1785;z<=-1140;z+=1)for(const side of [-2.4,2.4])assert.equal(pavement(x+side,z),false,'Avenue lane stays asphalt');
for(const z of NORTH_CITY.streets)for(let x=-235;x<=235;x+=1)for(const side of [-2.4,2.4])assert.equal(pavement(x,z+side),false,'Cross street lane stays asphalt');
for(const t of world.roadsideTrees){assert.equal(worldDrivable(t.x,t.z),false);assert.ok(!(Math.abs(t.x)<14&&t.z>=-1150&&t.z<=-165));for(const x of NORTH_CITY.avenues)assert.ok(Math.abs(t.x-x)>=13||t.z<-1808||t.z>-1117);}
assert.ok(world.roadsideTrees.length>20,'Keep street greenery in planted areas');assert.ok(!trees.some(t=>Math.abs(t.x)<14&&t.z===-1120),'The screenshot tree row leaves the actual northbound route clear');
console.log('Northstar roadside passed: bridge approach, all avenue/cross-street lanes clear of raised sidewalks, tree corridor exclusions and retained planted greenery.');
