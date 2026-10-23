import * as THREE from 'three';
import {EffectComposer} from 'three/addons/postprocessing/EffectComposer.js';
import {RenderPass} from 'three/addons/postprocessing/RenderPass.js';
import {GTAOPass} from 'three/addons/postprocessing/GTAOPass.js';
import {UnrealBloomPass} from 'three/addons/postprocessing/UnrealBloomPass.js';
import {ShaderPass} from 'three/addons/postprocessing/ShaderPass.js';
import {OutputPass} from 'three/addons/postprocessing/OutputPass.js';
import {FXAAShader} from 'three/addons/shaders/FXAAShader.js';

export const GRAPHICS_STORAGE='mapleStreetGraphicsV1';
// Bound physical render pixels, not only device pixel ratio. HDR, AO and bloom
// use several full-screen buffers; a large/Retina display otherwise multiplies
// their memory even when the scene itself has a reasonable geometry budget.
export const RENDER_PIXEL_BUDGET=Object.freeze({cinematic:1250000,smooth:1750000,basic:2000000,mobile:800000});
export function renderPixelScale(width,height,pixelRatio=1,quality='smooth',mobile=false,adaptive=false,maxTextureSize=8192){
 const w=Math.max(1,Math.min(32768,Number.isFinite(width)?width:1)),h=Math.max(1,Math.min(32768,Number.isFinite(height)?height:1)),ratio=Number.isFinite(pixelRatio)&&pixelRatio>0?pixelRatio:1;
 const cap=quality==='basic'?1.15:quality==='smooth'?1.3:mobile?1.25:1.5,budget=mobile?RENDER_PIXEL_BUDGET.mobile:(RENDER_PIXEL_BUDGET[quality]||RENDER_PIXEL_BUDGET.smooth),textureLimit=Number.isFinite(maxTextureSize)&&maxTextureSize>0?maxTextureSize:8192;
 return Math.min(Math.min(ratio,cap)*(adaptive?.82:1),Math.sqrt(budget/(w*h)),textureLimit/w,textureLimit/h);
}
// Mobile browsers can terminate the page before WebGL recovery runs. Start each
// visit without HDR/bloom buffers; explicit quality changes still work in-session.
export function restoreGraphics(saved,mobile=false){return {quality:mobile?'basic':['cinematic','smooth','basic'].includes(saved?.quality)?saved.quality:'cinematic',wetness:saved?.wetness===1?1:0};}
export const CinemaGrade={name:'Maple cinematic grade',uniforms:{tDiffuse:{value:null},strength:{value:.28}},vertexShader:'varying vec2 vUv;void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);}',fragmentShader:`uniform sampler2D tDiffuse;uniform float strength;varying vec2 vUv;
void main(){vec4 source=texture2D(tDiffuse,vUv);vec3 c=max(source.rgb,vec3(0.0));float l=dot(c,vec3(.2126,.7152,.0722));float shadows=1.0-smoothstep(.08,.7,l);vec3 split=c*mix(vec3(1.025,1.0,.972),vec3(.955,1.006,1.035),shadows);c=mix(c,split,strength);float edge=dot((vUv-.5)*vec2(.95,1.0),(vUv-.5)*vec2(.95,1.0));c*=1.0-strength*.27*smoothstep(.10,.50,edge);gl_FragColor=vec4(c,source.a);}`};
export function createCinematicRenderer(renderer,scene,camera,{mobile=false,width=globalThis.innerWidth||1280,height=globalThis.innerHeight||720,pixelRatio=globalThis.devicePixelRatio||1,onFallback=console.warn}={}){
 let quality='basic',composer=null,ao=null,bloom=null,grade=null,fxaa=null,output=null,renderPass=null,slowFrames=0,adaptive=false,lastSize=[width,height,pixelRatio];
 function disposeComposer(){if(composer){for(const p of composer.passes)p.dispose?.();composer.dispose();}composer=null;ao=bloom=grade=fxaa=output=renderPass=null;}
 function build(){if(!composer){composer=new EffectComposer(renderer);renderPass=new RenderPass(scene,camera);composer.addPass(renderPass);bloom=new UnrealBloomPass(new THREE.Vector2(...lastSize.slice(0,2)),.16,.35,1.35);composer.addPass(bloom);grade=new ShaderPass(CinemaGrade);composer.addPass(grade);output=new OutputPass();composer.addPass(output);fxaa=new ShaderPass(FXAAShader);composer.addPass(fxaa);}if(quality==='cinematic'&&!mobile&&!ao){const scale=renderer.getPixelRatio();ao=new GTAOPass(scene,camera,Math.max(1,Math.floor(lastSize[0]*scale)),Math.max(1,Math.floor(lastSize[1]*scale)));ao.output=GTAOPass.OUTPUT.Default;ao.blendIntensity=.24;ao.updateGtaoMaterial({radius:.65,distanceExponent:1.6,thickness:1.1,samples:8});ao.updatePdMaterial({lumaPhi:10,depthPhi:2,normalPhi:3,radius:4,samples:8});composer.insertPass(ao,1);}}
 function releaseAO(){if(!ao)return;composer.removePass(ao);ao.dispose();ao=null;}
 function resize(w=lastSize[0],h=lastSize[1],ratio=lastSize[2]){w=Math.max(1,Math.min(32768,Number.isFinite(w)?w:1));h=Math.max(1,Math.min(32768,Number.isFinite(h)?h:1));lastSize=[w,h,ratio];const scale=renderPixelScale(w,h,ratio,quality,mobile,adaptive,renderer.capabilities?.maxTextureSize);renderer.setPixelRatio(scale);renderer.setSize(w,h);if(composer){composer.setPixelRatio(scale);composer.setSize(w,h);fxaa.uniforms.resolution.value.set(1/(w*scale),1/(h*scale));}return scale;}
 function setQuality(value){quality=['cinematic','smooth','basic'].includes(value)?value:'smooth';adaptive=false;slowFrames=0;
  if(quality==='basic'){disposeComposer();resize();return quality;}
  // Apply the pixel budget before allocating any postprocessing targets.
  resize();try{if(quality!=='cinematic'||mobile)releaseAO();build();if(bloom)bloom.enabled=true;resize();}catch(error){quality='basic';disposeComposer();resize();onFallback('Cinematic effects could not start; standard rendering remains available.',error);}return quality;
 }
 function render(dt=0){if(quality==='basic'||!composer){renderer.render(scene,camera);return;}try{composer.render(Math.min(.1,Math.max(0,dt)));}catch(error){quality='basic';disposeComposer();renderer.setRenderTarget(null);resize();onFallback('Cinematic effects were disabled after a rendering error.',error);renderer.render(scene,camera);return;}
  if(dt>.045&&dt<.2)slowFrames++;else slowFrames=Math.max(0,slowFrames-2);if(slowFrames>100&&!adaptive){adaptive=true;releaseAO();resize();}
 }
 return {setQuality,resize,render,get quality(){return quality;},get adaptive(){return adaptive;},get passes(){return composer?.passes||[];},dispose:disposeComposer};
}
