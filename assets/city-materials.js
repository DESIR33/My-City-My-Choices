import * as THREE from 'three';

export const SURFACE_PROFILES=Object.freeze({
 asphalt:{tile:3,roughness:.88,relief:.42},concrete:{tile:3,roughness:.91,relief:.36},brick:{tile:1.5,roughness:.86,relief:.7},stone:{tile:2.4,roughness:.78,relief:.48},stucco:{tile:2,roughness:.94,relief:.24},roof:{tile:2.4,roughness:.92,relief:.55},siding:{tile:2.4,roughness:.84,relief:.45},wood:{tile:1.8,roughness:.78,relief:.35}
});
const fract=x=>x-Math.floor(x),clamp=(x,a,b)=>Math.max(a,Math.min(b,x));
const hash=(x,y,seed)=>fract(Math.sin(x*127.1+y*311.7+seed*71.3)*43758.5453);
// Original seamless microstructure: colour, tangent normals and packed occlusion/roughness.
// Structural maps are shared by every tint, rather than downloaded once per building.
export function generateSurfaceMaps(kind,size=256){
 const spec=SURFACE_PROFILES[kind];if(!spec)throw new Error('Unknown surface '+kind);
 const color=new Uint8Array(size*size*4),orm=new Uint8Array(size*size*4),normal=new Uint8Array(size*size*4),height=new Float32Array(size*size);
 const seed=Object.keys(SURFACE_PROFILES).indexOf(kind)+1;
 for(let y=0;y<size;y++)for(let x=0;x<size;x++){
  const u=x/size,v=y/size,n=hash(x,y,seed),coarse=hash(Math.floor(u*32),Math.floor(v*32),seed);let value=.91+(n-.5)*.13,relief=.55+(n-.5)*.13,occlusion=1,rough=spec.roughness;
  if(kind==='brick'||kind==='stone'){
   const rows=kind==='brick'?12:6,cols=kind==='brick'?4:4,row=Math.floor(v*rows),joint=Math.min(fract(v*rows),1-fract(v*rows)),horizontal=fract(u*cols+(row%2)*.5),mortar=joint<.055||Math.min(horizontal,1-horizontal)<.022;
   const block=hash(Math.floor(u*cols+(row%2)*.5),row,seed);value=mortar?.75:.86+block*.14+(n-.5)*.07;relief=mortar?.18:.68+coarse*.1;occlusion=mortar?.68:1;rough=mortar?.98:spec.roughness+(n-.5)*.12;
  }else if(kind==='asphalt'){value=.80+(n-.5)*.25+(coarse-.5)*.08;relief=.5+(n-.5)*.25;rough=.76+n*.22;}
  else if(kind==='concrete'){const seam=Math.min(fract(u*2),1-fract(u*2),fract(v*2),1-fract(v*2))<.005;value=seam?.70:.91+(coarse-.5)*.045+(n-.5)*.055;relief=seam?.25:.6+(n-.5)*.07;occlusion=seam?.72:1;}
  else if(kind==='stucco'){value=.94+(n-.5)*.08;relief=.5+(n-.5)*.32;}
  else if(kind==='siding'||kind==='roof'){const row=Math.floor(v*12),seam=fract(v*12)<.075,vertical=kind==='roof'&&fract(u*8+(row%2)*.5)<.025;value=seam||vertical?.70:.87+coarse*.09;relief=seam||vertical?.22:.65;occlusion=seam?.75:1;}
  else if(kind==='wood'){const grain=Math.sin(u*180+Math.sin(v*25)*3);value=.85+grain*.07+(n-.5)*.07;relief=.5+grain*.12;}
  const k=(y*size+x)*4;for(let c=0;c<3;c++)color[k+c]=Math.round(clamp(value,0,1)*255);color[k+3]=255;orm[k]=Math.round(occlusion*255);orm[k+1]=Math.round(clamp(rough,.15,1)*255);orm[k+2]=0;orm[k+3]=255;height[y*size+x]=relief;
 }
 for(let y=0;y<size;y++)for(let x=0;x<size;x++){const at=(a,b)=>height[((b+size)%size)*size+(a+size)%size],dx=(at(x-1,y)-at(x+1,y))*spec.relief,dy=(at(x,y-1)-at(x,y+1))*spec.relief,length=Math.hypot(dx,dy,1),k=(y*size+x)*4;normal[k]=Math.round((dx/length*.5+.5)*255);normal[k+1]=Math.round((dy/length*.5+.5)*255);normal[k+2]=Math.round((1/length*.5+.5)*255);normal[k+3]=255;}
 return {color,normal,orm,size};
}
export function applyWorldSurfaceUV(shader,tile){
 // Compute metres after instance/model transforms, so a 150 m tower never stretches a single brick tile.
 shader.vertexShader='varying vec3 vCitySurfacePosition;\n'+shader.vertexShader;
 shader.fragmentShader='varying vec3 vCitySurfacePosition;\n'+shader.fragmentShader;
 shader.fragmentShader=shader.fragmentShader.replace('#include <map_fragment>', '#include <map_fragment>\nfloat cityMacro=.98+.012*sin(vCitySurfacePosition.x*.27+vCitySurfacePosition.y*.51)+.008*sin(vCitySurfacePosition.z*.38-vCitySurfacePosition.y*.13);\ndiffuseColor.rgb*=cityMacro;');
 shader.vertexShader=shader.vertexShader.replace('#include <project_vertex>',`#include <project_vertex>
 vec4 cityP=vec4(transformed,1.0);
 #ifdef USE_INSTANCING
 cityP=instanceMatrix*cityP;
 #endif
 cityP=modelMatrix*cityP;
 vCitySurfacePosition=cityP.xyz;
 vec3 cityN=abs(inverseTransformDirection(transformedNormal,viewMatrix));
 vec2 cityUV=cityN.y>cityN.x&&cityN.y>cityN.z?cityP.xz:cityN.x>cityN.z?vec2(cityP.z,cityP.y):cityP.xy;
 cityUV/=${Number(tile).toFixed(4)};
 #ifdef USE_MAP
 vMapUv=cityUV;
 #endif
 #ifdef USE_NORMALMAP
 vNormalMapUv=cityUV;
 #endif
 #ifdef USE_ROUGHNESSMAP
 vRoughnessMapUv=cityUV;
 #endif
 #ifdef USE_AOMAP
 vAoMapUv=cityUV;
 #endif`);
}
export function createCityMaterials({anisotropy=4}={}){
 const maps=new Map(),materials=new Map(),roads=new Set();let wetness=0;
 const map=(bytes,size,color=false)=>{const t=new THREE.DataTexture(bytes,size,size);t.wrapS=t.wrapT=THREE.RepeatWrapping;t.magFilter=THREE.LinearFilter;t.minFilter=THREE.LinearMipmapLinearFilter;t.generateMipmaps=true;t.anisotropy=anisotropy;if(color)t.colorSpace=THREE.SRGBColorSpace;t.needsUpdate=true;return t;};
 function surface(kind,hex){const key=kind+':'+hex;if(materials.has(key))return materials.get(key);const p=SURFACE_PROFILES[kind];if(!maps.has(kind)){const d=generateSurfaceMaps(kind);maps.set(kind,{map:map(d.color,d.size,true),normalMap:map(d.normal,d.size),packed:map(d.orm,d.size)});}const m=maps.get(kind),material=new THREE.MeshPhysicalMaterial({name:'PBR '+kind,color:hex,map:m.map,normalMap:m.normalMap,roughnessMap:m.packed,aoMap:m.packed,aoMapIntensity:.35,normalScale:new THREE.Vector2(1,1),roughness:1,metalness:0,clearcoat:kind==='asphalt'?.03:0});material.userData.tileSize=p.tile;material.userData.surfaceKind=kind;material.userData.baseColor=new THREE.Color(hex);material.onBeforeCompile=shader=>applyWorldSurfaceUV(shader,p.tile);material.customProgramCacheKey=()=>kind+'-metre-uv-v1';materials.set(key,material);if(kind==='asphalt'){roads.add(material);applyWetness(material);}return material;}
 function applyWetness(m){m.color.copy(m.userData.baseColor).multiplyScalar(1-wetness*.24);m.roughness=1-wetness*.67;m.clearcoat=.03+wetness*.75;m.clearcoatRoughness=.22;}
 return {surface,materials,maps,get wetness(){return wetness;},setWetness(value){wetness=clamp(Number(value)||0,0,1);for(const m of roads)applyWetness(m);},dispose(){for(const m of materials.values())m.dispose();for(const m of maps.values())for(const t of Object.values(m))t.dispose();}};
}
