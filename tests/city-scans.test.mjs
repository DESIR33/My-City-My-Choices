import assert from 'node:assert/strict';
import {readFile,stat} from 'node:fs/promises';
import * as THREE from 'three';
import {createCityMaterials,SURFACE_PROFILES} from '../assets/city-materials.js';
import {CITY_SCANS,cityScanFiles,upgradeCitySurfaces} from '../assets/city-scans.js';

const file=p=>new URL('../'+p,import.meta.url);
const KTX2=[0xab,0x4b,0x54,0x58,0x20,0x32,0x30,0xbb,0x0d,0x0a,0x1a,0x0a];

// Every procedural kind except grass has a scan; files exist, are KTX2 and fit budgets.
assert.deepEqual(Object.keys(CITY_SCANS).sort(),Object.keys(SURFACE_PROFILES).sort());
for(const size of [1024,512]){
 let bytes=0;const files=cityScanFiles(size);assert.equal(files.length,Object.keys(CITY_SCANS).length*3);
 for(const f of files){const path=file('assets/'+f.dir+'/textures/'+f.name),head=(await readFile(path)).subarray(0,12);assert.deepEqual([...head],KTX2,f.name+' is KTX2');if(f.dir==='city')bytes+=(await stat(path)).size;}
 assert.ok(bytes<(size===1024?3.4e6:1.1e6),'city scan download at '+size+' px: '+bytes);
}
// Rotated siding cannot share the house's unrotated maps.
assert.ok(cityScanFiles(1024).filter(f=>f.kind==='siding').every(f=>f.dir==='city'));
const attribution=await readFile(file('assets/city/textures/ATTRIBUTION.md'),'utf8');
for(const {id} of Object.values(CITY_SCANS))assert.ok(attribution.includes('polyhaven.com/a/'+id),id+' credited');

// Upgrading swaps shared maps for every tint, including tints created afterwards.
const pbr=createCityMaterials({anisotropy:4}),early=pbr.surface('roof',0x4a4f55),road=pbr.surface('asphalt',0x41484c),procedural=early.map;
const disposed=[];procedural.addEventListener('dispose',()=>disposed.push('map'));
const fake=new Map(),load=async url=>{if(url.includes('painted_plaster_wall-512-tone'))throw new Error('missing');if(!fake.has(url))fake.set(url,new THREE.Texture());return fake.get(url);};
const result=await upgradeCitySurfaces(pbr,{load,size:512});
assert.equal(result.upgraded,Object.keys(CITY_SCANS).length-1,'a missing kind is skipped');
assert.notEqual(early.map,procedural);assert.equal(early.map.colorSpace,THREE.SRGBColorSpace);assert.equal(early.map.wrapS,THREE.RepeatWrapping);
assert.equal(early.roughnessMap,early.aoMap);assert.equal(early.userData.tileSize,CITY_SCANS.roof.tile);assert.equal(early.roughness,CITY_SCANS.roof.roughness);
assert.deepEqual(disposed,['map'],'replaced procedural maps are released');
const late=pbr.surface('roof',0x6b4a3a);assert.equal(late.map,early.map,'later tints share the scan');assert.equal(late.userData.tileSize,CITY_SCANS.roof.tile);
assert.notEqual(early.color.getHex(),late.color.getHex(),'each building keeps its paint color');
assert.equal(pbr.surface('stucco',0xf0e6d6).userData.scanned,undefined,'failed kind keeps procedural maps');
// Shader tile follows the scan and the program cache key changes with it.
assert.match(early.customProgramCacheKey(),/:1\.5$/);const shader={vertexShader:'#include <project_vertex>',fragmentShader:'#include <map_fragment>'};early.onBeforeCompile(shader);assert.match(shader.vertexShader,/cityUV\/=1\.5000/);
// Lawns: grass is a shared PBR kind with an anti-tiling second sample; other kinds are not.
const lawn=pbr.surface('grass',0x3c6335),lawnShader={vertexShader:'#include <project_vertex>',fragmentShader:'#include <map_fragment>'};lawn.onBeforeCompile(lawnShader);
assert.match(lawnShader.fragmentShader,/cityMacroUv/);assert.match(lawnShader.fragmentShader,/cityPatch/);assert.equal(lawn.userData.tileSize,CITY_SCANS.grass.tile);
assert.doesNotMatch(shader.fragmentShader,/cityMacroUv/,'roofs do not get the lawn treatment');
const visualsSource=await readFile(file('assets/city-visuals.js'),'utf8');assert.match(visualsSource,/function surface\(kind, hex\) \{ return pbr\.surface\(kind,hex\); \}/,'city grass is the shared PBR material');assert.match(visualsSource,/grass: surface\('grass'/);
// Wet roads keep their scan roughness scale.
pbr.setWetness(1);assert.ok(Math.abs(road.roughness-.33*(CITY_SCANS.asphalt.roughness??1))<1e-6);pbr.setWetness(0);assert.equal(road.roughness,CITY_SCANS.asphalt.roughness??1);
// Shared house maps decode once when the same loader serves both.
const urls=[...fake.keys()];assert.equal(new Set(urls).size,urls.length);assert.ok(urls.some(u=>u.startsWith('./assets/house/textures/red_brick_03-512-nor')));
console.log('City scans passed: every surface kind including lawns, KTX2 files and budgets, attribution, shared upgrade with tint, tile, roughness and wetness, failed-kind fallback and shared house maps.');
