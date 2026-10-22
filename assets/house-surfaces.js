import * as THREE from 'three';
import {applyWorldSurfaceUV} from './city-materials.js';

// Materials for the furnished Maple House. Scanned surfaces are CC0 textures from
// Poly Haven (see assets/house/textures/ATTRIBUTION.md), compressed to KTX2 by
// tools/prepare-house-textures.mjs. Every material works untextured first: maps
// arrive asynchronously, and tests or failed downloads keep the plain colors.
// `tile` is the real-world size of one texture repeat in metres. `albedo` is the
// average reflectance the light bake uses for one bounce of indirect light.
export const HOUSE_TEXTURES=Object.freeze({
 laminate_floor_02:{maps:['diff','nor','arm'],size:1.7},
 painted_plaster_wall:{maps:['diff','nor','arm'],size:2},
 red_brick_03:{maps:['diff','nor','arm'],size:1},
 grey_roof_tiles_02:{maps:['diff','nor','arm'],size:1.5},
 concrete_pavement:{maps:['diff','nor','arm'],size:1.8},
 kitchen_wood:{maps:['diff','nor','arm'],size:.6},
 wood_table_001:{maps:['diff','nor','arm'],size:1.5},
 fabric_pattern_07:{maps:['nor','arm'],size:.4},
 fabric_pattern_05:{maps:['nor','arm'],size:.5}
});
export const HOUSE_SURFACES=Object.freeze({
 floor:{texture:'laminate_floor_02',color:0xffffff,roughness:1,albedo:.4},
 // Painted walls read as flat paint: only the surface relief and roughness are scanned.
 plaster:{texture:'painted_plaster_wall',detail:true,color:0xf4ede0,roughness:1,albedo:.74},
 stucco:{texture:'painted_plaster_wall',color:0xf3e6cf,roughness:1,albedo:.66,scale:1.12},
 brick:{texture:'red_brick_03',color:0xffffff,roughness:1,albedo:.26,scale:1.25},
 roof:{texture:'grey_roof_tiles_02',color:0xd8d8d8,roughness:1,albedo:.17},
 paving:{texture:'concrete_pavement',color:0xf2eee6,roughness:1,albedo:.42},
 oak:{texture:'kitchen_wood',color:0xf0c690,roughness:1,albedo:.34},
 walnut:{texture:'wood_table_001',color:0xc8a98c,roughness:1,albedo:.12},
 fabric:{texture:'fabric_pattern_07',color:0x819385,roughness:1,albedo:.3},
 linen:{texture:'fabric_pattern_07',color:0xd9d0b9,roughness:1,albedo:.6},
 rug:{texture:'fabric_pattern_05',color:0x9a8671,roughness:1,albedo:.3},
 quartz:{color:0xe8e4dc,roughness:.24,albedo:.7,physical:{clearcoat:.35,clearcoatRoughness:.18}},
 trim:{color:0xf2ece0,roughness:.5,albedo:.76},
 metal:{color:0x303c39,roughness:.42,metalness:.6,albedo:.08},
 brass:{color:0xa58b55,roughness:.3,metalness:.75,albedo:.35},
 dark:{color:0x1e2829,roughness:.55,albedo:.05},
 ceramic:{color:0xe4e2d8,roughness:.16,albedo:.75,physical:{clearcoat:.6,clearcoatRoughness:.08}},
 water:{color:0x6ba2ac,roughness:.08,metalness:.1,albedo:.3}
});

// Indirect light from the offline bake (see house-bake.js). One shared set of
// uniforms: loading the lightmap updates every house material at once.
const white=new THREE.DataTexture(new Uint8Array([255,255,255,255]),1,1);white.needsUpdate=true;
// Gamma < 1 lifts dark interiors the way eyes adapt indoors; floor keeps corners readable.
export const houseBakeUniforms={houseBakeMap:{value:white},houseBakeStrength:{value:0},houseBakeFloor:{value:.08},houseBakeGamma:{value:.5}};
export function addHouseBake(shader){
 Object.assign(shader.uniforms,houseBakeUniforms);
 shader.vertexShader='attribute vec2 houseBakeUv;\nvarying vec2 vHouseBakeUv;\n'+shader.vertexShader.replace('#include <begin_vertex>','#include <begin_vertex>\nvHouseBakeUv=houseBakeUv;');
 // The bake stores sqrt(visibility) for precision in dark corners. It scales only
 // indirect light (sky, hemisphere, bounce), so the moving sun and lamps stay live.
 shader.fragmentShader='uniform sampler2D houseBakeMap;\nuniform float houseBakeStrength;\nuniform float houseBakeFloor;\nuniform float houseBakeGamma;\nvarying vec2 vHouseBakeUv;\n'+shader.fragmentShader.replace('#include <aomap_fragment>','#include <aomap_fragment>\n{float houseBake=texture2D(houseBakeMap,vHouseBakeUv).r;houseBake=max(pow(houseBake*houseBake*1.25,houseBakeGamma),houseBakeFloor);houseBake=mix(1.0,houseBake,houseBakeStrength);reflectedLight.indirectDiffuse*=houseBake;reflectedLight.indirectSpecular*=houseBake;}');
}

export function createHouseSurfaces(){
 const materials={};
 for(const [role,s] of Object.entries(HOUSE_SURFACES)){
  const Material=s.physical?THREE.MeshPhysicalMaterial:THREE.MeshStandardMaterial;
  const m=new Material({name:'Maple House '+role,color:s.color,roughness:s.roughness??.85,metalness:s.metalness??0,...(s.physical||{})});
  if(s.scale)m.color.multiplyScalar(s.scale);
  const tile=s.texture?HOUSE_TEXTURES[s.texture].size:1;
  m.userData.houseSurface=role;m.userData.albedo=s.albedo;m.userData.texture=s.texture||null;
  m.onBeforeCompile=shader=>{applyWorldSurfaceUV(shader,tile);addHouseBake(shader);};
  m.customProgramCacheKey=()=>'maple-house:'+tile;
  materials[role]=m;
 }
 // Small colored accents (plants, cushions, books) share the bake but no textures.
 const extra=new Map();
 function tinted(color,roughness=.85,metalness=0,albedo=.35){const key=[color,roughness,metalness].join(':');if(!extra.has(key)){const m=new THREE.MeshStandardMaterial({name:'Maple House accent',color,roughness,metalness});m.userData.albedo=albedo;m.userData.houseSurface='accent';m.onBeforeCompile=addHouseBake;m.customProgramCacheKey=()=>'maple-house-accent';extra.set(key,m);}return extra.get(key);}
 return {materials,tinted,get all(){return [...Object.values(materials),...extra.values()];}};
}

// Attach scanned maps once they load. `load(url)` returns a Promise<Texture>,
// normally a configured KTX2Loader. Missing files leave the plain material.
export async function loadHouseSurfaceMaps(surfaces,{load,base='./assets/house/textures/',size=1024,anisotropy=4}={}){
 const cache=new Map(),get=(id,map)=>{const url=base+id+'-'+size+'-'+map+'.ktx2';if(!cache.has(url))cache.set(url,load(url).then(t=>{t.wrapS=t.wrapT=THREE.RepeatWrapping;t.anisotropy=anisotropy;if(map==='diff')t.colorSpace=THREE.SRGBColorSpace;return t}).catch(()=>null));return cache.get(url);};
 let applied=0;
 await Promise.all(Object.values(surfaces.materials).map(async m=>{
  const id=m.userData.texture;if(!id)return;const maps=HOUSE_TEXTURES[id].maps;
  const detail=HOUSE_SURFACES[m.userData.houseSurface]?.detail,[diff,nor,arm]=await Promise.all(['diff','nor','arm'].map(k=>maps.includes(k)&&!(detail&&k==='diff')?get(id,k):null));
  if(diff)m.map=diff;if(nor){m.normalMap=nor;m.normalScale.set(1,1);}if(arm){m.aoMap=arm;m.roughnessMap=arm;}
  if(diff||nor||arm){m.needsUpdate=true;applied++;}
 }));
 return {applied,textures:cache.size};
}

// The same curve the shader applies, for code that lights things from probes.
export function bakeResponse(factor){const u=houseBakeUniforms,lit=Math.max(Math.pow(Math.max(0,factor),u.houseBakeGamma.value),u.houseBakeFloor.value);return 1+(lit-1)*u.houseBakeStrength.value;}

// Characters move, so they cannot use the lightmap. Each one gets its own
// uniform that the game eases toward the probe value at its chest height, so
// a kid walking indoors darkens like the walls around them instead of glowing.
const shaded=new WeakMap();
export function shadeCharacter(root,factor,dt=1/60){
 let entry=shaded.get(root);
 if(!entry){entry={uniform:{value:1},materials:new WeakSet()};shaded.set(root,entry);}
 const target=bakeResponse(factor),u=entry.uniform;
 if(u.value===1&&target===1)return u.value;
 root.traverse(m=>{if(!m.isMesh)return;for(const material of [].concat(m.material)){if(!material||entry.materials.has(material)||material.userData.indoorShade)continue;entry.materials.add(material);material.userData.indoorShade=true;const previous=material.onBeforeCompile,key=material.customProgramCacheKey;material.onBeforeCompile=(shader,renderer)=>{previous?.call(material,shader,renderer);shader.uniforms.characterIndirect=u;shader.fragmentShader='uniform float characterIndirect;\n'+shader.fragmentShader.replace('#include <aomap_fragment>','#include <aomap_fragment>\nreflectedLight.indirectDiffuse*=characterIndirect;reflectedLight.indirectSpecular*=characterIndirect;');};material.customProgramCacheKey=()=>(key?.call(material)||'')+':indoor-shade';material.needsUpdate=true;}});
 u.value+=(target-u.value)*(1-Math.exp(-dt*6));if(Math.abs(u.value-target)<.002)u.value=target;
 return u.value;
}
