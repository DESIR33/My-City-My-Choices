import * as THREE from 'three';
import {MAPLE_GROVE,COMMUNITY_HOMES,COMMUNITY_ROADS,communityRoadRect,mapleOnRoad,communityDriveway,communityReserved,withinRect} from './world-rules.js';
import { Sky } from 'three/addons/objects/Sky.js';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import {createCityMaterials} from './city-materials.js';
import { createCityAtmosphere } from './city-atmosphere.js';

// All surface textures are original, deterministic, and generated locally.
function randomSequence(seed = 1) {
  return () => ((seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0) / 4294967296);
}

function canvas(size = 512) {
  const image = document.createElement('canvas');
  image.width = image.height = size;
  return [image, image.getContext('2d')];
}

function texture(image, anisotropy, color = false) {
  const map = new THREE.CanvasTexture(image);
  map.wrapS = map.wrapT = THREE.RepeatWrapping;
  map.anisotropy = anisotropy;
  if (color) map.colorSpace = THREE.SRGBColorSpace;
  return map;
}

export function createCityVisuals(renderer, scene, {mobile = false} = {}) {
  const anisotropy = Math.min(mobile ? 2 : 8, renderer.capabilities.getMaxAnisotropy());
  const cache = new Map(),pbr=createCityMaterials({anisotropy});

  function surface(kind, hex) {
    if(kind!=='grass')return pbr.surface(kind,hex);
    const key = `${kind}:${hex}`;
    if (cache.has(key)) return cache.get(key);
    const [image, q] = canvas(mobile ? 256 : 512), [heightImage, h] = canvas(mobile ? 256 : 512);
    const rng = randomSequence(hex + kind.length * 379);
    const base = new THREE.Color(hex);
    q.fillStyle = `#${base.getHexString()}`;
    q.fillRect(0, 0, 512, 512);
    h.fillStyle = '#aaa'; h.fillRect(0, 0, 512, 512);
    if (kind === 'brick' || kind === 'stone') {
      const bh = kind === 'brick' ? 32 : 64, bw = kind === 'brick' ? 100 : 128;
      q.fillStyle = kind === 'brick' ? '#b1a28b' : '#8c8a80';
      q.fillRect(0, 0, 512, 512);
      h.fillStyle = '#555'; h.fillRect(0, 0, 512, 512);
      for (let row = 0; row < 512 / bh; row++) {
        for (let x = -(row % 2) * bw / 2; x < 512; x += bw) {
          const c = base.clone().multiplyScalar(.79 + rng() * .32);
          q.fillStyle = `#${c.getHexString()}`;
          q.fillRect(x + 2, row * bh + 2, bw - 4, bh - 4);
          h.fillStyle = `rgb(${170 + Math.floor(rng() * 45)},${170},${170})`;
          h.fillRect(x + 2, row * bh + 2, bw - 4, bh - 4);
          q.fillStyle = 'rgba(0,0,0,.09)';
          q.fillRect(x + 2, row * bh + bh - 5, bw - 4, 3);
        }
      }
    } else if (kind === 'siding' || kind === 'roof') {
      const step = kind === 'roof' ? 32 : 36;
      for (let y = 0; y < 512; y += step) {
        q.fillStyle = 'rgba(255,255,255,.12)'; q.fillRect(0, y, 512, 2);
        q.fillStyle = 'rgba(0,0,0,.2)'; q.fillRect(0, y + step - 3, 512, 3);
        h.fillStyle = '#555'; h.fillRect(0, y + step - 3, 512, 3);
        if (kind === 'roof') for (let x = (y / step % 2) * -38; x < 512; x += 76) {
          q.fillStyle = `rgba(0,0,0,${rng() * .18})`; q.fillRect(x, y + 2, 74, step - 5);
          h.fillStyle = '#555'; h.fillRect(x, y, 2, step);
        }
      }
    } else if (kind === 'concrete') {
      q.strokeStyle = 'rgba(55,53,47,.28)'; q.lineWidth = 2;
      h.strokeStyle = '#555'; h.lineWidth = 2;
      for (const c of [0, 256, 511]) {
        for (const ctx of [q, h]) {
          ctx.beginPath(); ctx.moveTo(c, 0); ctx.lineTo(c, 512);
          ctx.moveTo(0, c); ctx.lineTo(512, c); ctx.stroke();
        }
      }
    }
    const count = kind === 'asphalt' ? 18000 : kind === 'grass' ? 13000 : 6500;
    for (let i = 0; i < count; i++) {
      const x = rng() * 512, y = rng() * 512, bright = rng() > .5;
      const size = kind === 'grass' ? 1 + rng() * 6 : .5 + rng() * 1.8;
      q.fillStyle = bright ? 'rgba(255,255,235,.10)' : 'rgba(10,17,12,.13)';
      q.fillRect(x, y, size, kind === 'grass' ? size * .38 : size);
      h.fillStyle = bright ? '#b8b8b8' : '#777'; h.fillRect(x, y, 1.5, 1.5);
    }
    const mat = new THREE.MeshStandardMaterial({
      map: texture(image, anisotropy, true), bumpMap: texture(heightImage, anisotropy),
      bumpScale: kind === 'brick' ? .045 : kind === 'stone' ? .025 : .018,
      roughness: kind === 'roof' ? .9 : kind === 'grass' ? 1 : .91,
    });
    mat.userData.tileSize = kind === 'concrete' ? 3 : kind === 'grass' ? 6 : kind === 'roof' ? 2.5 : kind === 'brick' ? 1.2 : 2;
    cache.set(key, mat);
    return mat;
  }

  const windowMats = [];
  function windowMaterial(index = 0) {
    index = Math.abs(index) % 8;
    if (windowMats[index]) return windowMats[index];
    const [image, q] = canvas(128);
    const grad = q.createLinearGradient(0, 0, 60, 128);
    grad.addColorStop(0, '#77959e'); grad.addColorStop(.48, '#38505b'); grad.addColorStop(1, '#1c2b32');
    q.fillStyle = grad; q.fillRect(0, 0, 128, 128);
    q.fillStyle = index % 3 === 0 ? '#b3a587' : '#545f5a';
    q.fillRect(7, 7, 21 + index * 3, 114); q.fillRect(100 - index * 2, 7, 21, 114);
    q.fillStyle = 'rgba(9,17,21,.3)'; q.fillRect(0, 85, 128, 43);
    q.fillStyle = 'rgba(201,223,227,.12)';
    q.beginPath(); q.moveTo(0, 2); q.lineTo(45, 0); q.lineTo(128, 73); q.lineTo(128, 101); q.closePath(); q.fill();
    const material = windowMats[index] = new THREE.MeshPhysicalMaterial({
      map: texture(image, anisotropy, true), roughness: .23, metalness: .16,
      clearcoat: .85, clearcoatRoughness: .15, envMapIntensity: .85,
    });
    if(index % 3 === 0) {
      material.emissiveMap=material.map;
      atmosphere.registerGlow(material,{day:0,night:1.25,color:0xffd29a});
    }
    return material;
  }

  const [shadowImage, sq] = canvas(128);
  const gradient = sq.createRadialGradient(64, 64, 12, 64, 64, 64);
  gradient.addColorStop(0, 'rgba(8,15,18,.44)');
  gradient.addColorStop(.5, 'rgba(8,15,18,.23)'); gradient.addColorStop(1, 'rgba(8,15,18,0)');
  sq.fillStyle = gradient; sq.fillRect(0, 0, 128, 128);
  const shadowMaterial = new THREE.MeshBasicMaterial({ map: texture(shadowImage, 1), transparent: true, depthWrite: false, toneMapped: false });
  function contactShadow(width, depth, y) {
    const mesh = new THREE.Mesh(new THREE.PlaneGeometry(width, depth), shadowMaterial);
    mesh.rotation.x = -Math.PI / 2; mesh.position.y = y; mesh.renderOrder = 1;
    return mesh;
  }

  // Dense leaf sprays with transparent gaps, fine twigs, and species-specific color.
  // Three shared materials keep near trees and the forest economical on phones.
  const foliageMaterials = [0x426a32, 0x2e5940, 0x597437].map((tint, species) => {
    const [image, q] = canvas(256), rng = randomSequence(431 + species * 71);
    q.strokeStyle = '#51432c'; q.lineWidth = 2;
    for (let b = 0; b < 9; b++) {
      const angle = b * 2.399, ex = 128 + Math.cos(angle) * 104, ey = 128 + Math.sin(angle) * 104;
      q.beginPath(); q.moveTo(128, 138); q.lineTo(ex, ey); q.stroke();
    }
    for (let i = 0; i < 220; i++) {
      const a = rng() * Math.PI * 2, r = Math.sqrt(rng()) * 110;
      q.save(); q.translate(128 + Math.cos(a) * r, 128 + Math.sin(a) * r); q.rotate(a + rng());
      q.fillStyle = ['#284c25', '#416a30', '#5a803a', '#789749', '#355d2d'][i % 5];
      const len = 5 + rng() * 9, width = 3 + rng() * 4;
      q.beginPath(); q.moveTo(-len, 0); q.quadraticCurveTo(0, -width, len, 0);
      q.quadraticCurveTo(0, width, -len, 0); q.fill();
      q.strokeStyle = '#91a85c77'; q.lineWidth = .55;
      q.beginPath(); q.moveTo(-len, 0); q.lineTo(len, 0); q.stroke(); q.restore();
    }
    const mat = new THREE.MeshStandardMaterial({map: texture(image, anisotropy, true),
      color: tint, side: THREE.DoubleSide, alphaTest: .4, roughness: .92});
    // The texture carries the leaf hues; a restrained tint gives species variation.
    mat.color.lerp(new THREE.Color(0xffffff), .72);
    mat.name = 'Leaf sprays ' + species;
    return mat;
  });
  const branchGeometry = new THREE.CylinderGeometry(.63, 1, 1, 8);
  const [barkImage, bq] = canvas(256), barkRng = randomSequence(102);
  bq.fillStyle = '#514335'; bq.fillRect(0, 0, 256, 256);
  for (let i = 0; i < 650; i++) {
    bq.fillStyle = i % 3 ? '#302d25' : '#80705a';
    bq.fillRect(barkRng() * 256, barkRng() * 256, 1 + barkRng() * 3, 7 + barkRng() * 38);
  }
  const barkMap = texture(barkImage, anisotropy, true);
  const branchMaterial = new THREE.MeshStandardMaterial({map: barkMap, bumpMap: barkMap, bumpScale: .035, roughness: 1});
  const leafGeometry = new THREE.PlaneGeometry(1, 1);
  function treeModel(x, z, size = 1, distant = false, speciesOverride) {
    const group = new THREE.Group(); group.position.set(x, -.07, z); group.name = 'Natural tree';
    const rng = randomSequence(Math.abs(Math.round(x * 83 + z * 217)) + 19);
    const species = speciesOverride ?? Math.floor(rng() * 3), tall = species === 1;
    const height = (tall ? 7.6 : 5.6) * size, spread = (tall ? 1.55 : 2.7) * size;
    const branchParts = [];
    function branch(a, b, radius) {
      const delta = new THREE.Vector3().subVectors(b, a), dummy = new THREE.Object3D();
      dummy.position.copy(a).addScaledVector(delta, .5); dummy.scale.set(radius, delta.length(), radius);
      dummy.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), delta.normalize()); dummy.updateMatrix();
      branchParts.push(branchGeometry.clone().applyMatrix4(dummy.matrix));
    }
    branch(new THREE.Vector3(), new THREE.Vector3(.15 * size, height * .83, .07), .25 * size);
    const lobes = [];
    for (let i = 0; i < 11; i++) {
      const angle = i * 2.399 + rng() * .3, r = spread * (.48 + rng() * .42);
      const y = tall ? height * (.36 + i * .046) : height * (.57 + rng() * .29);
      const taper = tall ? 1 - i * .055 : 1;
      const tip = new THREE.Vector3(Math.cos(angle) * r * taper, y, Math.sin(angle) * r * taper);
      branch(new THREE.Vector3(.07, y * .69, 0), tip, (.065 + rng() * .035) * size);
      lobes.push(tip);
    }
    const woody = new THREE.Mesh(mergeGeometries(branchParts), branchMaterial);
    branchParts.forEach(g => g.dispose()); woody.castShadow = woody.receiveShadow = !distant; group.add(woody);
    const count = distant ? 62 : 240, leaves = new THREE.InstancedMesh(leafGeometry, foliageMaterials[species], count), dummy = new THREE.Object3D();
    for (let i = 0; i < count; i++) {
      const lobe = lobes[i % lobes.length], a = rng() * Math.PI * 2, r = Math.cbrt(rng());
      const extent = (tall ? .86 : 1.25) * size;
      dummy.position.set(lobe.x + Math.cos(a) * r * extent, lobe.y + (rng() - .4) * extent * 1.3, lobe.z + Math.sin(a) * r * extent);
      dummy.rotation.set((rng() - .5) * Math.PI, rng() * Math.PI * 2, rng() * Math.PI);
      const scale = (distant ? 1.9 : 1.1) * size * (.8 + rng() * .5);
      dummy.scale.set(scale, scale * (tall ? .72 : .9), scale); dummy.updateMatrix(); leaves.setMatrixAt(i, dummy.matrix);
      leaves.setColorAt(i, new THREE.Color().setHSL(.24 + rng() * .045, .22, .66 + rng() * .2));
    }
    leaves.castShadow = leaves.receiveShadow = !distant; leaves.computeBoundingSphere(); group.add(leaves);
    if (!distant) group.add(contactShadow(spread * 2, spread * 2, .008));
    return group;
  }

  function forestHeight(x, z) {
    const radius = Math.max(Math.abs(x), Math.abs(z)), t = THREE.MathUtils.smoothstep(radius, 167, 228);
    const corridor=Math.abs(z)>150?THREE.MathUtils.smoothstep(Math.abs(x),18,42):1;
    const clearance=Math.max(0,MAPLE_GROVE.minX-x,x-MAPLE_GROVE.maxX,MAPLE_GROVE.minZ-z,z-MAPLE_GROVE.maxZ);
    return -.07 + THREE.MathUtils.smoothstep(clearance,8,36) * corridor * t * (5 + 3.5 * Math.sin(x * .024) + 2.8 * Math.cos(z * .031));
  }
  function addForest() {
    // A continuous terrain skirt, with layered clusters and irregular gaps rather than a fence of repeated trees.
    const rings = 12, segments = 128, positions = [], indices = [];
    for (let r = 0; r <= rings; r++) for (let i = 0; i <= segments; i++) {
      const a = i / segments * Math.PI * 2, radius = 166 + r / rings * 103;
      const edge = Math.max(Math.abs(Math.sin(a)), Math.abs(Math.cos(a)));
      const x = Math.sin(a) * radius / edge, z = Math.cos(a) * radius / edge;
      positions.push(x, forestHeight(x, z), z);
      if (r < rings && i < segments) { const k = r * (segments + 1) + i; indices.push(k, k + segments + 1, k + 1, k + 1, k + segments + 1, k + segments + 2); }
    }
    const geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    geo.setAttribute('uv', new THREE.Float32BufferAttribute(positions.flatMap((v, i) => i % 3 === 0 ? [v / 6, positions[i + 2] / 6] : []), 2));
    geo.setIndex(indices); geo.computeVertexNormals();
    const land = new THREE.Mesh(geo, surface('grass', 0x365231)); land.receiveShadow = true; land.name = 'Forested foothills'; scene.add(land);
    const rng = randomSequence(981), transforms = [[], [], []];
    for (let i = 0; i < 470; i++) {
      const angle = i * 2.39996 + rng() * .16, radius = 181 + rng() * 39;
      const edge = Math.max(Math.abs(Math.sin(angle)), Math.abs(Math.cos(angle)));
      const x = Math.sin(angle) * radius / edge, z = Math.cos(angle) * radius / edge, species = i % 3;
      if(Math.abs(z)>150&&Math.abs(x)<34||communityReserved(x,z,18))continue;
      const dummy = new THREE.Object3D(); dummy.position.set(x, forestHeight(x, z), z);
      dummy.rotation.y = rng() * Math.PI * 2; dummy.scale.setScalar(.85 + rng() * .95); dummy.updateMatrix(); transforms[species].push(dummy.matrix.clone());
    }
    // Expand one specimen per species into shared geometry; instance whole trees in six draw calls.
    for (let species = 0; species < 3; species++) {
      const template = treeModel(0, 0, 1, true, species), trunk = template.children[0], leaves = template.children[1], cards = [], matrix = new THREE.Matrix4();
      for (let i = 0; i < leaves.count; i++) { leaves.getMatrixAt(i, matrix); cards.push(leafGeometry.clone().applyMatrix4(matrix)); }
      const crown = mergeGeometries(cards); cards.forEach(g => g.dispose());
      for (const [geometry, material] of [[trunk.geometry, branchMaterial], [crown, foliageMaterials[species]]]) {
        const batch = new THREE.InstancedMesh(geometry, material, transforms[species].length);
        transforms[species].forEach((matrix, i) => batch.setMatrixAt(i, matrix)); batch.computeBoundingSphere();
        batch.name = 'Distant forest ' + species; scene.add(batch);
      }
      leaves.dispose();
    }
  }

  const sky = new Sky(); sky.scale.setScalar(4500);
  const uniforms = sky.material.uniforms;
  uniforms.turbidity.value = 2.2; uniforms.rayleigh.value = 2.1;
  uniforms.mieCoefficient.value = .004; uniforms.mieDirectionalG.value = .82;
  const lightDirection = new THREE.Vector3(-75, 100, -55).normalize();
  uniforms.sunPosition.value.copy(lightDirection); scene.add(sky);
  scene.background = new THREE.Color(0x8aafc3);
  scene.fog = new THREE.FogExp2(0x8aafc3, .00036);
  const environmentScene = new THREE.Scene(); environmentScene.add(sky.clone());
  const pmrem = new THREE.PMREMGenerator(renderer);
  const environment = pmrem.fromScene(environmentScene, .06, .1, 10000);
  scene.environment = environment.texture; scene.environmentIntensity = .42; pmrem.dispose();
  const hemisphere = new THREE.HemisphereLight(0xbdd7ee, 0x38432f, .58);
  scene.add(hemisphere);
  const sun = new THREE.DirectionalLight(0xffe1ad, 2.5);
  sun.position.set(-75, 100, -55); sun.castShadow = true;
  const shadowSize = mobile ? 512 : 2048;
  sun.shadow.mapSize.set(shadowSize, shadowSize); sun.shadow.camera.near = 1; sun.shadow.camera.far = 250;
  Object.assign(sun.shadow.camera, { left: -70, right: 70, top: 70, bottom: -70 });
  sun.shadow.bias = -.00012; sun.shadow.normalBias = .025; sun.shadow.radius = 2;
  scene.add(sun, sun.target);
  let lastX = Infinity, lastZ = Infinity;
  const lastLightDirection=new THREE.Vector3();
  function updateLighting(position) {
    const x = Math.round(position.x / 6) * 6, z = Math.round(position.z / 6) * 6;
    if (x === lastX && z === lastZ && lastLightDirection.distanceToSquared(lightDirection)<1e-8) return;
    lastX = x; lastZ = z;lastLightDirection.copy(lightDirection);
    sun.position.set(x,0,z).addScaledVector(lightDirection,137);
    sun.target.position.set(x, 0, z); sun.target.updateMatrixWorld();
  }
  const atmosphere=createCityAtmosphere({renderer,scene,sky,sun,hemisphere,lightDirection,mobile});

  let vehicleEnvironment;
  function captureVehicleEnvironment(position, excluded = []) {
    // A six-face HDR capture can spike GPU memory on phones; the shared sky map
    // still gives vehicles a readable reflection without allocating a probe.
    if(mobile)return scene.environment;
    if(vehicleEnvironment)return vehicleEnvironment.texture;
    const target=new THREE.WebGLCubeRenderTarget(mobile?64:128,{type:THREE.HalfFloatType});
    const probe=new THREE.CubeCamera(.15,10000,target),generator=new THREE.PMREMGenerator(renderer);
    const visibility=excluded.map(object=>[object,object.visible]),shadows=renderer.shadowMap.enabled;
    probe.position.set(position.x,1.6,position.z);
    try {
      excluded.forEach(object=>object.visible=false);
      // A static reflection capture does not need six additional shadow passes.
      renderer.shadowMap.enabled=false;
      // Capture a neutral daytime reference even when a saved game opens at
      // night. Its intensity follows the current time without six new renders.
      vehicleEnvironment=atmosphere.captureDaylight(()=>{
        updateLighting(position);probe.update(renderer,scene);
        return generator.fromCubemap(target.texture);
      });
      return vehicleEnvironment.texture;
    } finally {
      visibility.forEach(([object,visible])=>object.visible=visible);
      renderer.shadowMap.enabled=shadows;
      updateLighting(position);
      generator.dispose();target.dispose();
    }
  }

  function shopSign(text, index) {
    const [image, q] = canvas(mobile ? 256 : 512); image.height = 128;
    const colors = ['#594733', '#374f49', '#55513f', '#3c5261', '#654b48'];
    q.fillStyle = colors[index % colors.length]; q.fillRect(0, 0, 512, 128);
    q.strokeStyle = '#b7aa84'; q.lineWidth = 10; q.strokeRect(4, 4, image.width - 8, 120);
    q.fillStyle = '#f1e6cc'; q.font = '700 39px Georgia'; q.textAlign = 'center'; q.textBaseline = 'middle';
    q.fillText(text, image.width / 2, 64, image.width - 48);
    const group = new THREE.Group(), frame = new THREE.Mesh(new THREE.BoxGeometry(1.035, 1.08, .16), new THREE.MeshStandardMaterial({ color: 0x343735, roughness: .6, metalness: .4 }));
    frame.castShadow = frame.receiveShadow = true; group.add(frame);
    const face = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), new THREE.MeshStandardMaterial({ map: texture(image, anisotropy, true), roughness: .7 }));
    face.position.z = .085; group.add(face); group.scale.set(5.5, 1.38, 1);
    group.userData.staticArchitecture = true; return group;
  }

  function decorateCity(streets, buildings, obstacles, seats = []) {
    const batches = new Map(), unitBox = new THREE.BoxGeometry(1, 1, 1);
    const curb = new THREE.MeshStandardMaterial({ color: 0xaca99f, roughness: .95 });
    const darkMetal = new THREE.MeshStandardMaterial({ color: 0x303b3c, roughness: .55, metalness: .6 });
    const wood = surface('wood',0x826342);
    const grate = new THREE.MeshStandardMaterial({ color: 0x252d2e, roughness: .88, metalness: .3 });
    function box(mat, x, y, z, w, h, d, rotation = 0) {
      if (!batches.has(mat)) batches.set(mat, []);
      batches.get(mat).push({ x, y: y + h / 2, z, w, h, d, rotation });
    }
    // Individual curb blocks follow each sidewalk segment; intersections remain clear.
    for (const road of streets) for (const side of [-1, 1]) {
      for (let p = -164; p < 164; p += 1.5) {
        const crossing=streets.some(cross=>Math.abs(p-cross)<10.2),westThrough=road===-120&&side===-1&&p>49.8;
        if((!crossing||westThrough)&&mapleOnRoad(road+side*7.4,p)&&!COMMUNITY_ROADS.some(r=>withinRect(road+side*7.57,p,communityRoadRect(r),.15))&&!COMMUNITY_HOMES.some(h=>withinRect(road+side*7.57,p,communityDriveway(h),.7)))box(curb, road + side * 7.57, .055, p, .16, .17, 1.47);
        if(!crossing&&mapleOnRoad(p,road+side*7.4)&&!COMMUNITY_ROADS.some(r=>withinRect(p,road+side*7.57,communityRoadRect(r),.15))&&!COMMUNITY_HOMES.some(h=>withinRect(p,road+side*7.57,communityDriveway(h),.7)))box(curb, p, .055, road + side * 7.57, 1.47, .17, .16);
      }
    }
    const [tactileImage, tq] = canvas(128);
    tq.fillStyle = '#beae77'; tq.fillRect(0, 0, 128, 128);
    for (let y = 12; y < 128; y += 18) for (let x = 12; x < 128; x += 18) {
      tq.fillStyle = '#8b805b'; tq.beginPath(); tq.arc(x, y, 4.5, 0, Math.PI * 2); tq.fill();
      tq.fillStyle = '#ddcc91'; tq.beginPath(); tq.arc(x - 1, y - 1, 3.1, 0, Math.PI * 2); tq.fill();
    }
    const tactile = new THREE.MeshStandardMaterial({ map: texture(tactileImage, anisotropy, true), bumpMap: texture(tactileImage, anisotropy), bumpScale: .014, roughness: .92 });
    for (const ix of [-60, 0, 60]) for (const iz of [-60, 0, 60]) for (const sx of [-1, 1]) for (const sz of [-1, 1]) {
      box(tactile, ix + sx * 9.22, .211, iz + sz * 9.22, 1.15, .015, 1.15);
    }
    function clear(x, z) {
      if(x>125&&(Math.abs(z+30)<18||Math.abs(z+90)<18))return false;
      return !obstacles.some(o => x > o.minX - 1.1 && x < o.maxX + 1.1 && z > o.minZ - 1.1 && z < o.maxZ + 1.1);
    }
    // Benches have connected legs, seat slats, and a supported back; bins sit on pavement.
    for (const road of [-120, -60, 0, 60, 120]) for (const side of [-1, 1]) for (const p of [-94, -34, 26, 86]) {
      const x = road + side * 9.6, z = p;
      if (!clear(x, z)) continue;
      for (const dz of [-.67, .67]) box(darkMetal, x, .21, z + dz, .52, .48, .075);
      for (const dx of [-.2, 0, .2]) box(wood, x + dx, .68, z, .16, .095, 1.7);
      for (const dz of [-.72, .72]) box(darkMetal, x + side * .27, .69, z + dz, .07, .62, .07);
      for (const y of [.89, 1.09, 1.29]) box(wood, x + side * .27, y, z, .075, .14, 1.7);
      seats.push({id:'bench-'+seats.length,type:'bench',x,z,height:.565,heading:side<0?Math.PI/2:-Math.PI/2,stand:{x:x-side*1.35,z}});
      const binX = x, binZ = z + 2.3;
      box(darkMetal, binX, .21, binZ, .47, .82, .47);
      box(grate, binX, 1.03, binZ, .51, .07, .51);
      obstacles.push({ minX: x - .4, maxX: x + .4, minZ: z - .94, maxZ: z + .94 });
      obstacles.push({ minX: binX - .24, maxX: binX + .24, minZ: binZ - .24, maxZ: binZ + .24 });
      const drainX = road + side * 7.15;
      box(grate, drainX, .061, z + 5, .5, .015, .9);
      for (let j = 0; j < 7; j++) box(darkMetal, drainX, .076, z + 4.62 + j * .12, .44, .013, .035);
    }
    for (const [material, transforms] of batches) {
      const mesh = new THREE.InstancedMesh(unitBox, material, transforms.length), dummy = new THREE.Object3D();
      transforms.forEach((p, i) => { dummy.position.set(p.x, p.y, p.z); dummy.rotation.y = p.rotation; dummy.scale.set(p.w, p.h, p.d); dummy.updateMatrix(); mesh.setMatrixAt(i, dummy.matrix); });
      mesh.castShadow = mesh.receiveShadow = true; mesh.computeBoundingSphere(); scene.add(mesh);
    }
    for (const b of buildings) {
      const shadow = contactShadow(b.w + 3.5, b.d + 3.5, -.062);
      shadow.position.x = b.x; shadow.position.z = b.z; scene.add(shadow);
    }
    const [coverImage, cq] = canvas(256);
    cq.fillStyle = '#485051'; cq.fillRect(0, 0, 256, 256); cq.strokeStyle = '#6b7271'; cq.lineWidth = 5;
    for (let v = 18; v < 256; v += 18) { cq.beginPath(); cq.moveTo(v, 0); cq.lineTo(v, 256); cq.moveTo(0, v); cq.lineTo(256, v); cq.stroke(); }
    cq.fillStyle = '#343c3d'; cq.fillRect(37, 107, 182, 40); cq.fillStyle = '#a0a4a0'; cq.font = 'bold 20px Arial'; cq.textAlign = 'center'; cq.fillText('MAPLE CITY', 128, 134);
    const coverMat = new THREE.MeshStandardMaterial({ map: texture(coverImage, anisotropy, true), roughness: .84, metalness: .45 });
    const coverGeo = new THREE.CircleGeometry(.62, 32);
    for (const road of [-60, 0, 60]) for (const p of [-36, 24, 84]) {
      const cover = new THREE.Mesh(coverGeo, coverMat); cover.rotation.x = -Math.PI / 2; cover.position.set(road + 2.2, .064, p); scene.add(cover);
    }
  }

  function batchArchitecture() {
    const groups = scene.children.filter(o => o.userData.staticArchitecture), batches = new Map();
    scene.updateMatrixWorld(true);
    for (const root of groups) root.traverse(mesh => {
      if (!mesh.isMesh || mesh.isInstancedMesh || Array.isArray(mesh.material)) return;
      const key = mesh.material.uuid + ':' + mesh.castShadow;
      if (!batches.has(key)) batches.set(key, { material: mesh.material, castShadow: mesh.castShadow, geometry: [] });
      let geo = mesh.geometry.index ? mesh.geometry.toNonIndexed() : mesh.geometry.clone();
      geo.applyMatrix4(mesh.matrixWorld);
      for (const attribute of Object.keys(geo.attributes)) if (!['position', 'normal', 'uv'].includes(attribute)) geo.deleteAttribute(attribute);
      batches.get(key).geometry.push(geo);
    });
    for (const batch of batches.values()) {
      const merged = mergeGeometries(batch.geometry, false);
      if (!merged) throw new Error('Static architecture could not be combined.');
      const mesh = new THREE.Mesh(merged, batch.material);
      mesh.castShadow = batch.castShadow; mesh.receiveShadow = true;
      mesh.name = 'Batched city architecture'; scene.add(mesh);
      for (const geo of batch.geometry) geo.dispose();
    }
    for (const group of groups) scene.remove(group);
    return { sourceGroups: groups.length, drawGroups: batches.size };
  }

  return {
    asphalt: surface('asphalt', 0x41484c), concrete: surface('concrete', 0x92948f),
    grass: surface('grass', 0x3c6335), masonry: hex => surface('stone', hex),
    brick: hex => surface('brick', hex), siding: hex => surface('siding', hex), roofing: hex => surface('roof', hex),
    stucco:hex=>surface('stucco',hex),wood:hex=>surface('wood',hex),pbr,windowMaterial, contactShadow, treeModel, addForest, forestHeight, shopSign, decorateCity, batchArchitecture, updateLighting, captureVehicleEnvironment, atmosphere,
  };
}
