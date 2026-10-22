import assert from 'node:assert/strict';
import * as THREE from 'three';
import {shrubGeometry,createShrubField} from '../assets/shrubs.js';
import {createPlannedCommunity} from '../assets/planned-community.js';
import {createCommunityPlaza} from '../assets/community-plaza.js';
import {COMMUNITY_HOMES} from '../assets/world-rules.js';

// Geometry: deterministic leaf cards plus an opaque core, about 2 m wide and 1.6 m tall.
const g=shrubGeometry(5),again=shrubGeometry(5);
assert.deepEqual(Array.from(g.attributes.position.array.slice(0,30)),Array.from(again.attributes.position.array.slice(0,30)));
const cards=72,box=g.boundingBox,size=box.getSize(new THREE.Vector3());
assert.ok(g.index.count/3>=cards*2,'two triangles per card plus the core');assert.ok(g.index.count/3<cards*2+200,'stays light: '+g.index.count/3);
assert.ok(box.min.y>=0,'sits on its base');assert.ok(Math.abs(size.y-1.6)<1e-5,'height '+size.y);assert.ok(Math.abs(size.x-2)<1e-5&&Math.abs(size.z-2)<1e-5,'width');
const uv=g.attributes.uv.array,n=g.attributes.normal,p=g.attributes.position;
for(const v of uv)assert.ok(v>=0&&v<=1);
for(let i=0;i<cards*4;i++)assert.ok(uv[i*2+1]>=.5,'cards use the leaf-cluster sprites');
for(let i=cards*4;i<p.count;i++)assert.ok(uv[i*2+1]<.5,'the core uses opaque foliage');
let outward=0;for(let i=0;i<p.count;i++){const nv=new THREE.Vector3().fromBufferAttribute(n,i);assert.ok(Math.abs(nv.length()-1)<1e-4);if(nv.dot(new THREE.Vector3(p.getX(i),p.getY(i)-.75,p.getZ(i)))>0)outward++;}
assert.ok(outward/p.count>.9,'normals point outward so the bush shades as one mass');

// Field: instanced, tinted per shrub, capacity-limited, alpha-tested double-sided leaves.
const ctx=new Proxy({},{get:()=>()=>{}});globalThis.document={createElement:()=>({width:0,height:0,getContext:()=>ctx})};
const scene=new THREE.Scene(),field=createShrubField(scene,{capacity:4});
assert.equal(field.meshes.length,3);assert.ok(field.meshes.every(m=>m.isInstancedMesh&&m.castShadow&&m.parent===scene));
assert.ok(field.material.alphaTest>0&&field.material.side===THREE.DoubleSide&&field.material.vertexColors);
for(let i=0;i<12;i++)assert.ok(field.add(i,0,0,{width:.9,height:.7}));assert.equal(field.add(0,0,0,{variant:0}),false,'full variant refuses more');
assert.equal(field.count,12);assert.deepEqual(field.meshes.map(m=>m.count),[4,4,4]);
const c0=new THREE.Color(),c1=new THREE.Color();field.meshes[0].getColorAt(0,c0);field.meshes[0].getColorAt(1,c1);assert.notEqual(c0.getHex(),c1.getHex(),'neighbouring shrubs vary in tone');
const m=new THREE.Matrix4(),pos=new THREE.Vector3(),q=new THREE.Quaternion(),s=new THREE.Vector3();field.meshes[0].getMatrixAt(0,m);m.decompose(pos,q,s);
assert.ok(Math.abs(s.x*2-.9)<1e-6&&Math.abs(s.y*1.6-.7)<1e-6,'instance scale maps to metres');

// Community and plaza use the shrub field when the visual kit provides it.
const material=new THREE.MeshStandardMaterial(),cache=new Map(),surface=(k,c)=>{const key=k+c;if(!cache.has(key)){const mat=new THREE.MeshStandardMaterial({color:c});mat.userData.tileSize=2;cache.set(key,mat);}return cache.get(key);};
const placed=[];const kit={concrete:material,asphalt:material,grass:new THREE.MeshStandardMaterial(),masonry:c=>surface('stone',c),wood:c=>surface('wood',c),brick:c=>surface('brick',c),roofing:c=>surface('roof',c),siding:c=>surface('siding',c),windowMaterial:()=>material,treeModel:()=>new THREE.Group(),atmosphere:{registerGlow(){},addStreetLight(){}},shrub:(x,y,z,o)=>{placed.push({x,y,z,...o});return true;}};
const world=new THREE.Scene();createPlannedCommunity({scene:world,visualKit:kit,obstacles:[],buildings:[],groundSurfaces:[]});
const beds=COMMUNITY_HOMES.filter(h=>!h.existing).length;
assert.ok(placed.length>=36+beds*4-12,'pockets and front beds planted: '+placed.length);
let oldShrubs=0;world.traverse(o=>{if(o.isMesh&&(o.geometry.type==='SphereGeometry'&&o.geometry.parameters.radius===.42||o.geometry.type==='IcosahedronGeometry'&&o.geometry.parameters.radius===.48))oldShrubs++;});
assert.equal(oldShrubs,0,'no ball shrubs remain when leaf shrubs are available');
for(const p of placed)assert.ok(p.y>=0&&p.y<.2&&p.width>.5&&p.height>.4);
const before=placed.length;createCommunityPlaza({scene:new THREE.Scene(),visualKit:kit,obstacles:[],groundSurfaces:[],seats:[]});assert.equal(placed.length-before,8,'four plaza planters with two shrubs each');
assert.ok(placed.slice(before).every(p=>Math.abs(p.y-.6)<1e-6),'planter shrubs sit on the soil');
console.log('Shrubs passed:',{triangles:g.index.count/3,communityShrubs:before,plazaShrubs:8});
