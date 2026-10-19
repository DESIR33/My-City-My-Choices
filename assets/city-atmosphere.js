import * as THREE from 'three';
import {cityLightingAt} from './city-time.js';

// Practical lighting uses fixed pools of non-shadow-casting lights. There are
// never hundreds of real lights following the city's hundreds of fixtures.
export function createCityAtmosphere({renderer, scene, sky, sun, hemisphere, lightDirection, mobile=false}) {
  const streetLamps=[], glows=new Map(), vehicleCache=new WeakMap();
  const lampLights=[], headLights=[], vector=new THREE.Vector3(), target=new THREE.Vector3();
  const nightSky={value:0};
  sky.material.uniforms.cityNight=nightSky;
  sky.material.fragmentShader='uniform float cityNight;\n'+sky.material.fragmentShader.replace(
    'gl_FragColor = vec4( retColor, 1.0 );',
    'vec3 nightColor = mix(vec3(.023, .038, .068), vec3(.005, .011, .027), smoothstep(0.0, .7, direction.y));\nretColor = mix(retColor, nightColor, cityNight);\ngl_FragColor = vec4( retColor, 1.0 );'
  );
  sky.material.needsUpdate=true;

  function radialTexture() {
    const size=64, bytes=new Uint8Array(size*size*4);
    for(let y=0;y<size;y++)for(let x=0;x<size;x++) {
      const r=Math.hypot((x+.5)/size*2-1,(y+.5)/size*2-1),i=(y*size+x)*4;
      bytes[i]=bytes[i+1]=bytes[i+2]=255;bytes[i+3]=Math.round(Math.pow(Math.max(0,1-r*r),2)*255);
    }
    const texture=new THREE.DataTexture(bytes,size,size);texture.needsUpdate=true;
    texture.magFilter=texture.minFilter=THREE.LinearFilter;
    return texture;
  }
  const poolMaterial=new THREE.MeshBasicMaterial({name:'Soft street light pools',map:radialTexture(),color:0xffd6a0,
    transparent:true,opacity:0,depthWrite:false,blending:THREE.AdditiveBlending,toneMapped:false});
  let poolMesh=null;
  function addStreetLight({x,y,z,groundY=.23,pitch=0}) {
    if(![x,y,z,groundY].every(Number.isFinite))return;
    streetLamps.push({x,y,z,groundY,pitch});
  }
  function registerGlow(material,{day=0,night=1,color}={}) {
    if(!material?.emissive)return;
    if(color!==undefined)material.emissive.setHex(color);
    glows.set(material,{day,night});
  }
  function finalizeStreetLights() {
    if(poolMesh){scene.remove(poolMesh);poolMesh.geometry.dispose();poolMesh.dispose();poolMesh=null;}
    if(!streetLamps.length)return;
    poolMesh=new THREE.InstancedMesh(new THREE.PlaneGeometry(1,1),poolMaterial,streetLamps.length);
    const dummy=new THREE.Object3D();
    streetLamps.forEach((p,i)=>{
      dummy.position.set(p.x,p.groundY,p.z);dummy.rotation.set(-Math.PI/2+p.pitch,0,0);dummy.scale.set(14,14,1);dummy.updateMatrix();poolMesh.setMatrixAt(i,dummy.matrix);
    });
    poolMesh.computeBoundingSphere();poolMesh.name='Batched pools under city street lamps';poolMesh.renderOrder=2;poolMesh.visible=false;scene.add(poolMesh);
  }
  function pooledLight(name,color,distance,angle,penumbra) {
    const light=new THREE.SpotLight(color,0,distance,angle,penumbra,1.5);light.name=name;light.castShadow=false;light.visible=false;
    scene.add(light,light.target);return light;
  }
  for(let i=0;i<(mobile?2:4);i++)lampLights.push(pooledLight('Nearby street illumination',0xffdeb1,24,1.05,.7));
  for(let i=0;i<2;i++)headLights.push(pooledLight('Working vehicle low beam',0xe2efff,55,.32,.65));

  // One inexpensive sky batch; stars follow the observer instead of remaining
  // behind in the southern neighborhood during a trip to Northstar.
  const points=[];let seed=781;
  const random=()=>((seed=(Math.imul(seed,1664525)+1013904223)>>>0)/4294967296);
  for(let i=0;i<(mobile?180:360);i++) {
    const azimuth=random()*Math.PI*2,y=.14+random()*.85,r=Math.sqrt(1-y*y);
    points.push(Math.cos(azimuth)*r*2100,y*2100,Math.sin(azimuth)*r*2100);
  }
  const starGeometry=new THREE.BufferGeometry();starGeometry.setAttribute('position',new THREE.Float32BufferAttribute(points,3));
  const stars=new THREE.Points(starGeometry,new THREE.PointsMaterial({color:0xd8e7ff,size:1.35,sizeAttenuation:false,transparent:true,opacity:0,depthWrite:false,fog:false,toneMapped:false}));
  stars.name='Night sky stars';stars.visible=false;scene.add(stars);
  const moon=new THREE.Mesh(new THREE.SphereGeometry(11,16,10),new THREE.MeshBasicMaterial({color:0xd8e4f2,fog:false,toneMapped:false,transparent:true,opacity:0}));
  moon.name='Moon';moon.visible=false;scene.add(moon);

  let sample=cityLightingAt(15), lastHour=NaN, selectClock=Infinity, lastNight=NaN;
  let selectedLamps=[];
  function applyPalette(hour) {
    sample=cityLightingAt(hour);lastHour=hour;
    renderer.toneMappingExposure=sample.exposure;scene.environmentIntensity=sample.env;
    scene.background.setHex(sample.fog);scene.fog.color.setHex(sample.fog);scene.fog.density=sample.fogDensity;
    sun.color.setHex(sample.sunColor);sun.intensity=sample.sun;
    hemisphere.color.setHex(sample.top);hemisphere.groundColor.setHex(sample.ground);hemisphere.intensity=sample.hemi;
    lightDirection.set(sample.lightDirection.x,sample.lightDirection.y,sample.lightDirection.z).normalize();
    sky.material.uniforms.sunPosition.value.set(sample.sunDirection.x,sample.sunDirection.y,sample.sunDirection.z);
    sky.material.uniforms.turbidity.value=2.2+sample.night*1.3;nightSky.value=sample.skyNight;
    stars.material.opacity=sample.skyNight*.78;stars.visible=sample.skyNight>.02;
    moon.material.opacity=sample.skyNight;moon.visible=sample.skyNight>.02;
    for(const [material,values] of glows)material.emissiveIntensity=values.day+(values.night-values.day)*sample.night;
    poolMaterial.opacity=sample.night*.26;if(poolMesh)poolMesh.visible=sample.night>.02;
  }
  function updateVehicles(refs,focusVehicle) {
    const shared=new Set();
    for(const ref of refs) {
      const car=ref.group||ref, data=car.userData.vehicleVisual;if(!data)continue;
      let cached=vehicleCache.get(car);
      if(!cached||cached.rig!==data.rig) {
        const materials=new Set();
        data.rig.traverse(o=>{if(o.isMesh)for(const m of (Array.isArray(o.material)?o.material:[o.material]))if(m.isMeshStandardMaterial)materials.add(m);});
        cached={rig:data.rig,materials};vehicleCache.set(car,cached);
      }
      // Moving/response vehicles and the player's vehicle use auto low beams.
      const running=car===focusVehicle||car.userData.traffic||car.userData.responding;
      const enabled=!!running&&!car.userData.disabled;
      data.nightLevel=enabled?sample.night:0;
      if(data.headlampMaterial)data.headlampMaterial.emissiveIntensity=enabled?.35+sample.night*2:.06;
      if(data.brakeMaterial&&!data.braking)data.brakeMaterial.emissiveIntensity=.24+data.nightLevel*.4;
      for(const material of cached.materials)shared.add(material);
    }
    if(!Number.isFinite(lastNight)||Math.abs(lastNight-sample.night)>.003) {
      for(const material of shared)if(material.envMap)material.envMapIntensity=1-sample.night*.94;
      lastNight=sample.night;
    } else {
      // Newly loaded models also inherit the current reflection level.
      for(const material of shared)if(material.envMap&&Math.abs(material.envMapIntensity-(1-sample.night*.94))>.005)material.envMapIntensity=1-sample.night*.94;
    }
  }
  function update({hour,position,vehicles=[],focusVehicle=null,dt=0}) {
    if(!Number.isFinite(lastHour)||Math.abs(hour-lastHour)>.001)applyPalette(hour);
    sky.position.set(position.x,0,position.z);stars.position.set(position.x,0,position.z);moon.position.set(position.x-820,900,position.z-1480);
    selectClock+=Math.max(0,dt);
    if(selectClock>=.2) {
      selectedLamps=streetLamps.map(lamp=>({lamp,distance:Math.hypot(lamp.x-position.x,lamp.z-position.z)}))
        .filter(entry=>entry.distance<32).sort((a,b)=>a.distance-b.distance).slice(0,lampLights.length).map(entry=>entry.lamp);
      selectClock=0;
    }
    lampLights.forEach((light,i)=>{
      const lamp=selectedLamps[i];light.visible=!!lamp&&sample.night>.02;
      light.intensity=lamp?145*sample.night:0;
      if(lamp){light.position.set(lamp.x,lamp.y,lamp.z);light.target.position.set(lamp.x,lamp.groundY,lamp.z);light.target.updateMatrixWorld();}
    });
    updateVehicles(vehicles,focusVehicle);
    if(focusVehicle)focusVehicle.updateWorldMatrix(true,false);
    headLights.forEach((light,i)=>{
      const active=!!focusVehicle&&!focusVehicle.userData.disabled&&sample.night>.02;
      light.visible=active;light.intensity=active?210*sample.night:0;
      if(active){const side=i?1:-1,height=focusVehicle.userData.vehicleVisual?.modelId==='gls'?.86:.61;
        vector.set(side*.7,height,2.18);target.set(side*.95,.10,31);
        light.position.copy(focusVehicle.localToWorld(vector));light.target.position.copy(focusVehicle.localToWorld(target));light.target.updateMatrixWorld();}
    });
    return sample;
  }
  function captureDaylight(capture) {
    const hour=Number.isFinite(lastHour)?lastHour:15,lights=[...lampLights,...headLights],visible=lights.map(light=>light.visible);
    applyPalette(15);lights.forEach(light=>light.visible=false);
    try{return capture();}
    finally{applyPalette(hour);lights.forEach((light,i)=>light.visible=visible[i]);}
  }
  return {addStreetLight,registerGlow,finalizeStreetLights,update,captureDaylight,
    get sample(){return sample;},get streetLamps(){return streetLamps;},get lampLights(){return lampLights;},get headLights(){return headLights;},get poolMesh(){return poolMesh;}};
}
