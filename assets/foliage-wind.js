// Shared wind for tree canopies and shrubs. One time and one strength uniform
// drive every foliage material; the game advances them each frame and raises the
// strength with the weather. Palms keep their own sway (palm-trees.js).
export const foliageWind={foliageWindTime:{value:0},foliageWindStrength:{value:.45}};

// Breeze in clear weather, stronger gusts in rain and heavy rain.
export function windStrength(rain=0){return .45+Math.max(0,Math.min(1,rain))*.85;}

export function advanceFoliageWind(dt,rain=0){
 foliageWind.foliageWindTime.value+=Math.max(0,Math.min(.25,dt||0));
 const target=windStrength(rain),s=foliageWind.foliageWindStrength;
 s.value+=(target-s.value)*Math.min(1,Math.max(0,dt||0)*.6);
 return s.value;
}

// rooted: displacement grows with height above the base (shrubs); otherwise the
// whole card moves (canopy leaves). amplitude is in the geometry's local units.
export function addFoliageWind(material,{rooted=false,amplitude=.05,height=1}={}){
 if(material.userData.foliageWind)return material;material.userData.foliageWind=true;
 const previous=material.onBeforeCompile,key=material.customProgramCacheKey;
 material.onBeforeCompile=(shader,renderer)=>{
  previous?.call(material,shader,renderer);Object.assign(shader.uniforms,foliageWind);
  shader.vertexShader='uniform float foliageWindTime;\nuniform float foliageWindStrength;\n'+shader.vertexShader.replace('#include <begin_vertex>',`#include <begin_vertex>
  {
   vec4 windOrigin=vec4(0.0,0.0,0.0,1.0);
   #ifdef USE_INSTANCING
    windOrigin=instanceMatrix*windOrigin;
   #endif
   windOrigin=modelMatrix*windOrigin;
   float windPhase=windOrigin.x*.19+windOrigin.z*.13;
   float windReach=${rooted?`clamp(transformed.y/${Number(height).toFixed(3)},0.0,1.0)`:'1.0'};
   windReach*=windReach;
   float sway=sin(foliageWindTime*1.6+windPhase)*.65+sin(foliageWindTime*3.7+windPhase*1.7+transformed.y*2.3)*.35;
   float flutter=sin(foliageWindTime*7.9+windPhase*3.1+transformed.x*5.0+transformed.z*4.0)*.25;
   transformed.x+=(sway+flutter)*${Number(amplitude).toFixed(4)}*foliageWindStrength*windReach;
   transformed.z+=(sin(foliageWindTime*1.2+windPhase*.8)*.6+flutter)*${Number(amplitude*.7).toFixed(4)}*foliageWindStrength*windReach;
   transformed.y+=flutter*${Number(amplitude*.25).toFixed(4)}*foliageWindStrength*windReach;
  }`);
 };
 material.customProgramCacheKey=()=>(key?.call(material)||'')+':foliage-wind:'+rooted+':'+amplitude;
 material.needsUpdate=true;return material;
}
