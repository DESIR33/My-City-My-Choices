import * as THREE from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {MeshoptDecoder} from 'three/addons/libs/meshopt_decoder.module.js';
import {TOWERS} from './world-rules.js';
import {SKYLINE_LAYOUT} from './city/skyline/layout.js';

// Northstar's San Francisco skyline, built by tools/prepare-skyline.mjs from the
// owner-supplied city model:
//  - towers.glb: the 15 tallest downtown towers, each squared and fitted to one of
//    Northstar's tower lots (tallest to the tallest lot). The lots keep their names,
//    podiums, entrances, labels and colliders from north-world.js.
//  - skyline.glb: the rest of downtown, north of Northstar's last street, as
//    scenery (no colliders, never reachable). Phones load only the towers.
// The model has no usable textures, so one shader draws everything: vertex colours
// carry each building's tint (alpha marks facades) and `_LEVEL` its height above the
// street; floors, windows, storefronts and lit rooms at night come from world
// position, and the pattern fades to its average with distance to avoid shimmer.
// Until the models stream in, each lot shows a plain tower of the final height.
export const SKYLINE_URLS=Object.freeze({towers:'./assets/city/skyline/towers.glb',skyline:'./assets/city/skyline/skyline.glb'});
export const SKYLINE_FLOOR=3.8,SKYLINE_BAY=3.2;
export {SKYLINE_LAYOUT};
// Final tower heights and footprints per lot, in TOWERS order.
export const SKYLINE_TOWERS=Object.freeze(TOWERS.map((t,i)=>{const s=SKYLINE_LAYOUT.towers.find(q=>q.lot===i);return Object.freeze({...t,lot:i,height:s.height,footprint:s.footprint});}));

export function createSkylineMaterial(){
  const m=new THREE.MeshStandardMaterial({name:'Northstar skyline',vertexColors:true,roughness:.82,metalness:0,emissive:0xffc98a});
  m.onBeforeCompile=shader=>{
    shader.vertexShader=shader.vertexShader
      .replace('#include <common>','#include <common>\nattribute float _level;varying float vLevel;varying vec3 vSkyWorld;varying vec3 vSkyNormal;')
      .replace('#include <worldpos_vertex>','#include <worldpos_vertex>\nvLevel=_level;vSkyWorld=(modelMatrix*vec4(transformed,1.0)).xyz;vSkyNormal=normalize(mat3(modelMatrix)*objectNormal);')
      // The skyline is far away: thinner haze keeps its silhouette readable.
      .replace('#include <fog_vertex>','#include <fog_vertex>\n#ifdef USE_FOG\nvFogDepth*=.42;\n#endif');
    shader.fragmentShader=shader.fragmentShader.replace('#include <common>',`#include <common>
varying float vLevel;varying vec3 vSkyWorld;varying vec3 vSkyNormal;float skyWin=0.0,skyLit=0.0;
float skyHash(vec3 p){return fract(sin(dot(p,vec3(12.9898,78.233,37.719)))*43758.5453);}`)
      .replace('#include <color_fragment>',`#include <color_fragment>
#ifdef USE_COLOR_ALPHA
{float facade=step(.5,vColor.a);diffuseColor.a=1.0;
 vec2 t=normalize(vec2(-vSkyNormal.z,vSkyNormal.x)+1e-5);float u=dot(vSkyWorld.xz,t)/${SKYLINE_BAY.toFixed(2)},v=vLevel/${SKYLINE_FLOOR.toFixed(2)};
 float fade=1.0-smoothstep(.35,.9,max(fwidth(u),fwidth(v)));
 vec2 f=fract(vec2(u,v));float shop=step(vLevel,4.6);
 float w=step(.14,f.x)*step(f.x,.86)*mix(step(.28,f.y)*step(f.y,.86),step(.08,f.y),shop);
 float id=skyHash(vec3(floor(u),floor(v),floor(dot(vColor.rgb,vec3(97.0,13.0,41.0)))));
 skyWin=facade*mix(.55,w,fade);
 vec3 glass=mix(vec3(.10,.13,.16),vec3(.36,.44,.52),clamp(vSkyNormal.y*.5+.5+id*.25,0.,1.));
 diffuseColor.rgb=mix(diffuseColor.rgb,glass,skyWin*.85);
 diffuseColor.rgb*=mix(1.0,.9+.1*step(.94,f.y),facade*fade);
 skyLit=facade*mix(.32,w*step(.58,id),fade)*step(1.5,vLevel);}
#endif`)
      .replace('#include <roughnessmap_fragment>','#include <roughnessmap_fragment>\nroughnessFactor=mix(roughnessFactor,.2,skyWin);')
      .replace('#include <emissivemap_fragment>','#include <emissivemap_fragment>\ntotalEmissiveRadiance*=skyLit;');
  };
  m.customProgramCacheKey=()=>'northstar-skyline-v1';
  return m;
}

// A plain stand-in tower (facade colour, height levels) for a lot before the model arrives.
function standIn(lot,material){
  const [w,d]=lot.footprint,g=new THREE.BoxGeometry(w,lot.height,d);g.translate(0,lot.height/2,0);
  const n=g.attributes.position.count,col=new Float32Array(n*4),lev=new Float32Array(n);
  for(let i=0;i<n;i++){const facade=Math.abs(g.attributes.normal.getY(i))<.5;col.set(facade?[.84,.82,.78,1]:[.47,.48,.49,0],i*4);lev[i]=g.attributes.position.getY(i);}
  g.setAttribute('color',new THREE.BufferAttribute(col,4));g.setAttribute('_level',new THREE.BufferAttribute(lev,1));
  const mesh=new THREE.Mesh(g,material);mesh.position.set(lot.x,0,lot.z);mesh.name='Skyline stand-in '+lot.name;mesh.castShadow=mesh.receiveShadow=true;return mesh;}

export function createNorthstarSkyline({scene,visualKit}){
  const group=new THREE.Group();group.name='Northstar skyline';scene.add(group);
  const material=createSkylineMaterial();visualKit?.atmosphere?.registerGlow?.(material,{day:0,night:1.15,color:0xffc98a});
  const lots=SKYLINE_TOWERS.map(lot=>{const mesh=standIn(lot,material);group.add(mesh);return {lot,standIn:mesh,model:null};});
  const state={towers:false,skyline:false};
  const prepare=o=>o.traverse(c=>{if(c.isMesh){c.material=material;c.frustumCulled=true;}});
  function installTowers(source){prepare(source);
    for(const entry of lots){const node=source.getObjectByName('tower-'+entry.lot.lot);if(!node)continue;
      // The node keeps its own (dequantizing) transform; a holder places it on the lot.
      const holder=new THREE.Group();holder.name='Skyline tower '+entry.lot.name;holder.position.set(entry.lot.x,0,entry.lot.z);node.removeFromParent();holder.add(node);
      node.traverse(c=>{if(c.isMesh)c.castShadow=c.receiveShadow=true;});group.add(holder);holder.updateMatrixWorld(true);entry.model=holder;entry.standIn.visible=false;}
    state.towers=lots.every(e=>e.model);return state.towers;}
  function installSkyline(source){prepare(source);source.traverse(c=>{if(c.isMesh){c.castShadow=false;c.receiveShadow=false;}});source.name='Northstar downtown skyline';group.add(source);state.skyline=true;return source;}
  const newLoader=()=>new GLTFLoader().setMeshoptDecoder(MeshoptDecoder);
  async function loadTowers(loader=newLoader()){installTowers((await loader.loadAsync(SKYLINE_URLS.towers)).scene);return state;}
  async function load(loader=newLoader()){
    const [towers,skyline]=await Promise.all([loader.loadAsync(SKYLINE_URLS.towers),loader.loadAsync(SKYLINE_URLS.skyline)]);
    installTowers(towers.scene);installSkyline(skyline.scene);return state;}
  return {group,material,lots,installTowers,installSkyline,load,loadTowers,state,towers:SKYLINE_TOWERS,layout:SKYLINE_LAYOUT};
}
