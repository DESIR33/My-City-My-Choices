import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import * as THREE from 'three';
import {foliageWind,windStrength,advanceFoliageWind,addFoliageWind} from '../assets/foliage-wind.js';
import {createShrubField} from '../assets/shrubs.js';

const file=p=>new URL('../'+p,import.meta.url);
// Strength: a breeze when clear, gusts in heavy rain, eased rather than snapped.
assert.equal(windStrength(0),.45);assert.ok(windStrength(1)>windStrength(.5)&&windStrength(.5)>windStrength(0));assert.equal(windStrength(5),windStrength(1),'clamped');
foliageWind.foliageWindStrength.value=.45;foliageWind.foliageWindTime.value=0;
const s1=advanceFoliageWind(1/60,1);assert.ok(s1>.45&&s1<.5,'eases toward rain wind');
for(let i=0;i<600;i++)advanceFoliageWind(1/60,1);assert.ok(Math.abs(foliageWind.foliageWindStrength.value-windStrength(1))<.01);
const t=foliageWind.foliageWindTime.value;advanceFoliageWind(5,0);assert.ok(foliageWind.foliageWindTime.value-t<=.25,'long pauses do not jump the sway');

// Shader: shared uniforms, rooted vs free, original hook kept, distinct program keys.
const compile=m=>{const shader={uniforms:{},vertexShader:'#include <begin_vertex>',fragmentShader:''};m.onBeforeCompile(shader,{});return shader;};
const prior=new THREE.MeshStandardMaterial();let priorRan=false;prior.onBeforeCompile=()=>{priorRan=true;};
const free=addFoliageWind(prior,{amplitude:.07}),sf=compile(free);assert.ok(priorRan,'existing shader hooks still run');
assert.equal(sf.uniforms.foliageWindTime,foliageWind.foliageWindTime,'one shared clock');assert.match(sf.vertexShader,/windReach=1\.0/);
const rooted=addFoliageWind(new THREE.MeshStandardMaterial(),{rooted:true,height:1.6,amplitude:.06}),sr=compile(rooted);
assert.match(sr.vertexShader,/clamp\(transformed\.y\/1\.600/,'shrubs stay anchored at the base');assert.notEqual(free.customProgramCacheKey(),rooted.customProgramCacheKey());
assert.equal(addFoliageWind(free),free);assert.equal((compile(free).vertexShader.match(/foliageWindStrength/g)||[]).length>0,true);
// Bounded sway: the GLSL weights sum to at most 1.25 of amplitude per axis at full gusts.
const maxStrength=windStrength(1);assert.ok(1.25*.07*maxStrength<.12,'canopy cards move under 12 cm');

// Wiring: shrubs and tree canopies use the wind; the game advances it with the weather.
globalThis.document={createElement:()=>({width:0,height:0,getContext:()=>new Proxy({},{get:()=>()=>{}})})};
const field=createShrubField(new THREE.Scene());assert.equal(field.material.userData.foliageWind,true);assert.match(compile(field.material).vertexShader,/clamp\(transformed\.y/);
assert.match(await readFile(file('assets/city-visuals.js'),'utf8'),/foliageMaterials\.forEach\(m => addFoliageWind\(m/);
assert.match(await readFile(file('index.html'),'utf8'),/advanceFoliageWind\(frameTime,weather\.intensity\)/);
console.log('Foliage wind passed: shared clock and strength, weather gusts, anchored shrubs, free canopies, bounded sway and game wiring.');
