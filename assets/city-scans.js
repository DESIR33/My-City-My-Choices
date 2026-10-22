import * as THREE from 'three';
import {HOUSE_TEXTURES} from './house-surfaces.js';

// Scanned CC0 Poly Haven surfaces that replace the procedural city maps once they
// load (see assets/city/textures/ATTRIBUTION.md). Each kind keeps its per-building
// paint color: the scan becomes a grayscale "tone" map with the same average
// brightness as the procedural map, so tinting still decides the color.
// `tile` is the real-world size of one repeat in metres. `rotate` turns the
// source a quarter turn (vertical boards become horizontal lap siding).
// `roughness` scales the scanned roughness so sky reflections match real
// materials (shingles and brick are matte; the scans read glossy at grazing angles).
// Normal and roughness maps for textures the house already ships are shared.
export const CITY_SCANS=Object.freeze({
 asphalt:{id:'clean_asphalt',tile:2.1},
 concrete:{id:'concrete_pavement',tile:1.8},
 brick:{id:'red_brick_03',tile:1,roughness:1.45},
 stone:{id:'t_concrete_wall_002',tile:3},
 stucco:{id:'painted_plaster_wall',tile:2},
 roof:{id:'grey_roof_tiles_02',tile:1.5,roughness:1.6},
 siding:{id:'white_planks_clean',tile:1.8,rotate:true,roughness:1.2},
 wood:{id:'wood_table_001',tile:1.5}
});
// Average sRGB value of every tone map; matches the procedural maps' ~.9.
export const CITY_TONE_MEAN=.9;

export function cityScanFiles(size){
 const files=[];
 for(const [kind,scan] of Object.entries(CITY_SCANS)){
  const shared=!!HOUSE_TEXTURES[scan.id]&&!scan.rotate;
  files.push({kind,map:'tone',dir:'city',name:scan.id+'-'+size+'-tone.ktx2'});
  for(const map of ['nor','arm'])files.push({kind,map,dir:shared?'house':'city',name:scan.id+'-'+size+'-'+map+'.ktx2'});
 }
 return files;
}

// Swap the shared procedural maps for scans. `load(url)` returns Promise<Texture>;
// pass the same memoised loader the house uses so shared files decode once.
export async function upgradeCitySurfaces(pbr,{load,size=1024,anisotropy=4,cityBase='./assets/city/textures/',houseBase='./assets/house/textures/'}={}){
 const byKind={};
 await Promise.all(cityScanFiles(size).map(async f=>{
  const texture=await load((f.dir==='city'?cityBase:houseBase)+f.name).catch(()=>null);
  if(!texture)return;texture.wrapS=texture.wrapT=THREE.RepeatWrapping;texture.anisotropy=anisotropy;if(f.map==='tone')texture.colorSpace=THREE.SRGBColorSpace;
  (byKind[f.kind]||={})[f.map]=texture;
 }));
 let upgraded=0;
 for(const [kind,maps] of Object.entries(byKind)){if(!maps.tone||!maps.nor||!maps.arm)continue;pbr.upgrade(kind,{map:maps.tone,normalMap:maps.nor,packed:maps.arm,tile:CITY_SCANS[kind].tile,roughness:CITY_SCANS[kind].roughness??1});upgraded++;}
 return {upgraded};
}
