import * as THREE from 'three';
import {EffectComposer} from 'three/addons/postprocessing/EffectComposer.js';
import {RenderPass} from 'three/addons/postprocessing/RenderPass.js';
import {GTAOPass} from 'three/addons/postprocessing/GTAOPass.js';
import {UnrealBloomPass} from 'three/addons/postprocessing/UnrealBloomPass.js';
import {ShaderPass} from 'three/addons/postprocessing/ShaderPass.js';
import {OutputPass} from 'three/addons/postprocessing/OutputPass.js';
import {FXAAShader} from 'three/addons/shaders/FXAAShader.js';

export const GRAPHICS_STORAGE='mapleStreetGraphicsV1';
export function restoreGraphics(saved,mobile=false){return {quality:['cinematic','smooth','basic'].includes(saved?.quality)?saved.quality:mobile?'smooth':'cinematic',wetness:saved?.wetness===1?1:0};}
export const CinemaGrade={name:'Maple cinematic grade',uniforms:{tDiffuse:{value:null},strength:{value:.28}},vertexShader:'varying vec2 vUv;void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);}',fragmentShader:`uniform sampler2D tDiffuse;uniform float strength;varying vec2 vUv;
void main(){vec4 source=texture2D(tDiffuse,vUv);vec3 c=max(source.rgb,vec3(0.0));float l=dot(c,vec3(.2126,.7152,.0722));float shadows=1.0-smoothstep(.08,.7,l);vec3 split=c*mix(vec3(1.025,1.0,.972),vec3(.955,1.006,1.035),shadows);c=mix(c,split,strength);float edge=dot((vUv-.5)*vec2(.95,1.0),(vUv-.5)*vec2(.95,1.0));c*=1.0-strength*.27*smoothstep(.10,.50,edge);gl_FragColor=vec4(c,source.a);}`};
export function createCinematicRenderer(renderer,scene,camera,{mobile=false,width=globalThis.innerWidth||1280,height=globalThis.innerHeight||720,pixelRatio=globalThis.devicePixelRatio||1,onFallback=console.warn}={}){
 let quality='basic',composer=null,ao=null,bloom=null,grade=null,fxaa=null,output=null,renderPass=null,slowFrames=0,adaptive=false,lastSize=[width,height,pixelRatio];
 function build(){if(!composer){composer=new EffectComposer(renderer);renderPass=new RenderPass(scene,camera);composer.addPass(renderPass);bloom=new UnrealBloomPass(new THREE.Vector2(width,height),.16,.35,1.35);composer.addPass(bloom);grade=new ShaderPass(CinemaGrade);composer.addPass(grade);output=new OutputPass();composer.addPass(output);fxaa=new ShaderPass(FXAAShader);composer.addPass(fxaa);}if(quality==='cinematic'&&!mobile&&!ao){ao=new GTAOPass(scene,camera,Math.max(1,width),Math.max(1,height));ao.output=GTAOPass.OUTPUT.Default;ao.blendIntensity=.24;ao.updateGtaoMaterial({radius:.65,distanceExponent:1.6,thickness:1.1,samples:8});ao.updatePdMaterial({lumaPhi:10,depthPhi:2,normalPhi:3,radius:4,samples:8});composer.insertPass(ao,1);}}

 function resize(w=lastSize[0],h=lastSize[1],ratio=lastSize[2]){w=Math.max(1,w);h=Math.max(1,h);lastSize=[w,h,ratio];const cap=quality==='basic'?1.15:quality==='smooth'?1.3:mobile?1.25:1.5,scale=Math.min(ratio,cap)*(adaptive?.82:1);renderer.setPixelRatio(scale);renderer.setSize(w,h);if(composer){composer.setPixelRatio(scale);composer.setSize(w,h);fxaa.uniforms.resolution.value.set(1/(w*scale),1/(h*scale));}return scale;}
 function setQuality(value){quality=['cinematic','smooth','basic'].includes(value)?value:'smooth';adaptive=false;slowFrames=0;if(quality!=='basic')try{build();if(ao)ao.enabled=quality==='cinematic'&&!mobile;bloom.enabled=true;}catch(error){quality='basic';onFallback('Cinematic effects could not start; standard rendering remains available.',error);}resize();return quality;}
 function render(dt=0){if(quality==='basic'||!composer){renderer.render(scene,camera);return;}try{composer.render(Math.min(.1,Math.max(0,dt)));}catch(error){quality='basic';onFallback('Cinematic effects were disabled after a rendering error.',error);renderer.setRenderTarget(null);renderer.render(scene,camera);return;}
  // Sustained slow frames lower expensive effects once; settings retain the player's preference.
  if(dt>.045&&dt<.2)slowFrames++;else slowFrames=Math.max(0,slowFrames-2);if(slowFrames>100&&!adaptive){adaptive=true;if(ao)ao.enabled=false;resize();}
 }
 return {setQuality,resize,render,get quality(){return quality;},get adaptive(){return adaptive;},get passes(){return composer?.passes||[];},dispose(){if(composer){for(const p of composer.passes)p.dispose?.();composer.dispose();}composer=null;}};
}
