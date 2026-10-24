import * as THREE from 'three';
import {RoundedBoxGeometry} from 'three/addons/geometries/RoundedBoxGeometry.js';

// The tall Flamingo keeps the coast's art-deco shell. Inside, a separate
// modern hotel replaces that look: stone, glass, metal, and warm light.
export const FLAMINGO_FLOORS = Object.freeze([
  {level:'L', name:'Lobby', blurb:'Reception, seating, and the Ocean Drive entrance.', y:0.21},
  {level:'2', name:'Sky Lounge', blurb:'A quiet lounge above the lobby.', y:8.35},
  {level:'3', name:'Guest Suites', blurb:'Guest corridor and an open suite.', y:13.15},
]);

const unit = new THREE.BoxGeometry(1,1,1);
const sphere = new THREE.SphereGeometry(1, 24, 16);
const cylinder = new THREE.CylinderGeometry(1,1,1, 24);

function hash(ix, iy) {
  let n = Math.imul(ix|0, 374761393) + Math.imul(iy|0, 668265263);
  n = (n ^ (n >>> 13)) >>> 0;
  return (n % 4096) / 4096;
}
function valueNoise(x, y) {
  const x0 = Math.floor(x), y0 = Math.floor(y), fx = x-x0, fy = y-y0;
  const sx = fx*fx*(3-2*fx), sy = fy*fy*(3-2*fy);
  const a = hash(x0,y0), b = hash(x0+1,y0), c = hash(x0,y0+1), d = hash(x0+1,y0+1);
  return a+(b-a)*sx+(c-a)*sy+(a-b-c+d)*sx*sy;
}
function fbm(x, y) {
  let v = 0, a = .5, f = 1;
  for (let i = 0; i < 5; i++) { v += a*valueNoise(x*f, y*f); a *= .5; f *= 2; }
  return v;
}
function dataTexture(w, h, paint, repeatX = 1, repeatY = 1) {
  const data = new Uint8Array(w*h*4);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const c = paint(x, y, w, h);
    const i = (y*w+x)*4;
    data[i] = c[0]; data[i+1] = c[1]; data[i+2] = c[2]; data[i+3] = c[3] ?? 255;
  }
  const texture = new THREE.DataTexture(data, w, h);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(repeatX, repeatY);
  texture.anisotropy = 16;
  texture.generateMipmaps = true;
  texture.minFilter = THREE.LinearMipmapLinearFilter;
  texture.magFilter = THREE.LinearFilter;
  texture.needsUpdate = true;
  return texture;
}
function marble(tint, vein, slab = 0) {
  return dataTexture(512, 512, (x, y) => {
    const shift = slab ? hash(Math.floor(x/slab), Math.floor(y/slab)) : 0;
    const n = fbm((x+shift*90)*.007, (y+shift*40)*.007);
    const warp = fbm(x*.0035+2.2, y*.003);
    const band = Math.abs(Math.sin(x*.007 + y*.0016 + warp*4.5 + n*2.2 + shift));
    const v = Math.pow(1-band, 2.6)*.72 + (n-.35)*.35;
    let joint = 0;
    if (slab) {
      const jx = Math.min(x%slab, slab-(x%slab)), jy = Math.min(y%slab, slab-(y%slab));
      joint = Math.max(0, 1-Math.min(jx, jy)/22);
    }
    const speckle = (hash(x, y)-.5)*8;
    return tint.map((channel, i) => {
      let stone = channel*(1-Math.max(0, Math.min(1, v))) + vein[i]*Math.max(0, Math.min(1, v)) + speckle;
      stone *= 1-joint*.34;
      return Math.max(0, Math.min(255, stone));
    });
  }, 1, 1);
}
function wood() {
  return dataTexture(256, 512, (x, y) => {
    const ring = Math.sin((y*.08) + fbm(x*.03, y*.008)*18)*.5+.5;
    const pore = hash(x, Math.floor(y/3)) > .82 ? -28 : 0;
    const tone = 78+ring*88+pore+(hash(x, y)-.5)*8;
    return [tone*.55, tone*.34, tone*.18];
  });
}
function fabric(rgb) {
  return dataTexture(128, 128, (x, y) => {
    const loop = fbm(x*.18, y*.18);
    const weave = ((x+y)%5<2?.05:-.03)+(loop-.5)*.18;
    return rgb.map(channel => Math.max(0, Math.min(255, channel*(1+weave))));
  });
}
function carpet(base, accent) {
  return dataTexture(256, 256, (x, y) => {
    const pile = fbm(x*.045, y*.045);
    const tuft = fbm(x*.16+3, y*.16);
    const motif = Math.sin(x*.035)*Math.sin(y*.035);
    const dye = .84+pile*.18+tuft*.05+motif*.035;
    return base.map((v, i) => Math.max(0, Math.min(255, (v*.78+accent[i]*.22)*dye+(hash(x, y)-.5)*5)));
  });
}
function softField(tint, vein) {
  return dataTexture(128, 128, (x, y) => {
    const n = fbm(x*.015, y*.015), m = fbm(x*.006+4, y*.006);
    const v = n*.6+m*.4;
    return tint.map((channel, i) => Math.max(0, Math.min(255, channel*(.82+v*.2)*.72+vein[i]*v*.4+(hash(x, y)-.5)*3)));
  });
}
function borderedRug() {
  return dataTexture(256, 256, (x, y) => {
    const u = x/255, v = y/255, edge = u<.07||u>.93||v<.07||v>.93;
    const pile = fbm(x*.05, y*.05);
    const src = edge ? [78, 54, 44] : [188, 164, 140];
    return src.map(channel => Math.max(0, Math.min(255, channel*(.9+pile*.12))));
  });
}

function plaque(text, w, h, {bg='#161513', fg='#f6f1e8', font='600 64px sans-serif', accent=null} = {}) {
  const canvas = document.createElement('canvas');
  canvas.width = 1024; canvas.height = 256;
  const q = canvas.getContext('2d');
  q.fillStyle = bg; q.fillRect(0, 0, 1024, 256);
  if (accent) { q.fillStyle = accent; q.fillRect(0, 228, 1024, 6); }
  q.fillStyle = fg; q.font = font; q.textAlign = 'center'; q.textBaseline = 'middle';
  q.fillText(text, 512, accent ? 118 : 128, 960);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.needsUpdate = true;
  const material = new THREE.MeshStandardMaterial({map:texture, roughness:.6, metalness:0, emissive:0xffffff, emissiveMap:texture, emissiveIntensity:.18, side:THREE.DoubleSide, fog:false});
  const mesh = new THREE.Mesh(new THREE.PlaneGeometry(w, h), material);
  return mesh;
}

export function createFlamingoHotel({scene, building, obstacles, groundSurfaces, visualKit, mobile=false}) {
  const floors = FLAMINGO_FLOORS.map(floor => ({...floor}));
  const bx = building.x, bz = building.z, hx = building.w/2, hz = building.d/2;
  const front = bx+hx, back = bx-hx, zNorth = bz-hz, zSouth = bz+hz;
  const X = local => bx+local, Z = local => bz+local;
  const shell = new THREE.Group(); shell.name = 'Flamingo art-deco shell'; scene.add(shell);
  const interior = new THREE.Group(); interior.name = 'Flamingo modern interior'; scene.add(interior);
  const entrance = new THREE.Group(); entrance.name = 'Flamingo entrance doors'; scene.add(entrance);

  const batches = new Map();
  function batch(mat, x, y, z, w, h, d) {
    if (!batches.has(mat)) batches.set(mat, []);
    batches.get(mat).push({x, y:y+h/2, z, w, h, d});
  }
  const geoCache = new Map();
  function sizedGeometry(w, h, d) {
    const key = [w, h, d].map(n => n.toFixed(3)).join('|');
    if (geoCache.has(key)) return geoCache.get(key);
    const geo = new THREE.BoxGeometry(Math.max(w, .001), Math.max(h, .001), Math.max(d, .001));
    const pos = geo.attributes.position, uv = geo.attributes.uv;
    for (let i = 0; i < pos.count; i++) {
      const px = pos.getX(i), py = pos.getY(i), pz = pos.getZ(i);
      const ax = Math.abs(px)/(w/2||1), ay = Math.abs(py)/(h/2||1), az = Math.abs(pz)/(d/2||1);
      const u = ax >= ay && ax >= az ? pz+d/2 : px+w/2;
      const v = ay >= ax && ay >= az ? pz+d/2 : py+h/2;
      uv.setXY(i, u, v);
    }
    uv.needsUpdate = true;
    geoCache.set(key, geo);
    return geo;
  }
  function box(parent, mat, x, y, z, w, h, d) {
    const mesh = new THREE.Mesh(sizedGeometry(w, h, d), mat);
    mesh.position.set(x, y+h/2, z);
    mesh.castShadow = mesh.receiveShadow = true; parent.add(mesh); return mesh;
  }
  function rounded(parent, mat, x, y, z, w, h, d, radius = .03) {
    const mesh = new THREE.Mesh(new RoundedBoxGeometry(Math.max(w, radius*2), Math.max(h, radius*2), Math.max(d, radius*2), 2, radius), mat);
    mesh.position.set(x, y+h/2, z); mesh.castShadow = mesh.receiveShadow = true; parent.add(mesh); return mesh;
  }
  function cyl(parent, mat, x, y, z, rx, h, rz, segments) {
    const geo = segments ? new THREE.CylinderGeometry(1, 1, 1, segments) : cylinder;
    const mesh = new THREE.Mesh(geo, mat);
    mesh.position.set(x, y+h/2, z); mesh.scale.set(rx, h, rz ?? rx);
    mesh.castShadow = mesh.receiveShadow = true; parent.add(mesh); return mesh;
  }
  const permanent = [], floorSets = [[], [], []];
  function blocker(x, z, w, d, bucket = permanent) {
    const o = {minX:x-w/2, maxX:x+w/2, minZ:z-d/2, maxZ:z+d/2, kind:'flamingo'};
    o.home = {minX:o.minX, maxX:o.maxX, minZ:o.minZ, maxZ:o.maxZ};
    obstacles.push(o); bucket.push(o); return o;
  }
  function activate(list, on) {
    for (const o of list) {
      if (on) Object.assign(o, o.home);
      else { o.minX = o.maxX = 1e7; o.minZ = o.maxZ = 1e7; }
    }
  }

  const plaster = new THREE.MeshStandardMaterial({color:0xd4cfc6, roughness:.9, metalness:0, side:THREE.DoubleSide, fog:false});
  const stoneMap = marble([186, 176, 164], [96, 86, 76], 0);
  stoneMap.repeat.set(.16, .16);
  const stone = new THREE.MeshPhysicalMaterial({map:stoneMap, bumpMap:stoneMap, bumpScale:.025, roughness:.62, metalness:.03, clearcoat:.04, clearcoatRoughness:.5, envMapIntensity:.25, side:THREE.DoubleSide, fog:false});
  const floorMap = softField([198, 184, 166], [150, 132, 112]);
  floorMap.repeat.set(.04, .04);
  const stoneFloor = new THREE.MeshPhysicalMaterial({map:floorMap, roughness:.55, metalness:.02, clearcoat:.08, clearcoatRoughness:.5, envMapIntensity:.12, color:0xfff3e6, side:THREE.DoubleSide, fog:false});
  const darkStoneMap = marble([72, 66, 60], [36, 32, 30], 0);
  darkStoneMap.repeat.set(.3, .3);
  const darkStone = new THREE.MeshPhysicalMaterial({map:darkStoneMap, bumpMap:darkStoneMap, bumpScale:.02, roughness:.46, metalness:.16, clearcoat:.08, side:THREE.DoubleSide, fog:false});
  const woodMap = wood(); woodMap.repeat.set(.85, 1.4);
  const walnut = new THREE.MeshStandardMaterial({map:woodMap, bumpMap:woodMap, bumpScale:.045, roughness:.42, metalness:0, envMapIntensity:.35, side:THREE.DoubleSide, fog:false});
  const steel = new THREE.MeshPhysicalMaterial({color:0xd2d6db, roughness:.18, metalness:1, clearcoat:.55, clearcoatRoughness:.16, envMapIntensity:1.35, side:THREE.DoubleSide, fog:false});
  const brass = new THREE.MeshPhysicalMaterial({color:0xc4a15a, roughness:.26, metalness:1, clearcoat:.5, clearcoatRoughness:.18, envMapIntensity:1.4, side:THREE.DoubleSide, fog:false});
  const glass = new THREE.MeshPhysicalMaterial({color:0xe7eeea, roughness:.05, metalness:0, transmission:.92, thickness:.12, ior:1.5, transparent:true, opacity:.45, side:THREE.DoubleSide, fog:false});
  const charcoalMap = fabric([62, 66, 72]);
  const charcoal = new THREE.MeshStandardMaterial({map:charcoalMap, bumpMap:charcoalMap, bumpScale:.02, roughness:.86, side:THREE.DoubleSide, fog:false});
  const sandMap = fabric([206, 190, 168]);
  const sand = new THREE.MeshStandardMaterial({map:sandMap, bumpMap:sandMap, bumpScale:.02, roughness:.84, side:THREE.DoubleSide, fog:false});
  const rustMap = fabric([120, 72, 58]);
  const rust = new THREE.MeshStandardMaterial({map:rustMap, bumpMap:rustMap, bumpScale:.02, roughness:.84, side:THREE.DoubleSide, fog:false});
  const carpetMap = softField([92, 78, 68], [58, 46, 40]); carpetMap.repeat.set(.045, .045);
  const carpetMat = new THREE.MeshStandardMaterial({map:carpetMap, roughness:.97, color:0xf0e4d8, side:THREE.DoubleSide, fog:false});
  const suiteCarpetMap = softField([120, 86, 72], [78, 52, 44]); suiteCarpetMap.repeat.set(.04, .04);
  const suiteCarpet = new THREE.MeshStandardMaterial({map:suiteCarpetMap, roughness:.97, color:0xf3e2d4, side:THREE.DoubleSide, fog:false});
  const linenMap = fabric([236, 228, 216]);
  const linen = new THREE.MeshStandardMaterial({map:linenMap, bumpMap:linenMap, bumpScale:.02, roughness:.8, side:THREE.DoubleSide, fog:false});
  const leafMat = new THREE.MeshStandardMaterial({color:0x2d5a3c, roughness:.8, side:THREE.DoubleSide, fog:false});
  const glowMat = new THREE.MeshStandardMaterial({color:0xfff4e4, emissive:0xffd7a2, emissiveIntensity:1.35, roughness:.4, fog:false});
  const coveMat = new THREE.MeshStandardMaterial({color:0xfff6ea, emissive:0xffe0b0, emissiveIntensity:1.15, roughness:.5, side:THREE.DoubleSide, fog:false});
  const lights = [];
  const cityGlass = visualKit?.windowMaterial?.(2) || glass;
  const stucco = new THREE.MeshStandardMaterial({color:0xe0becf, roughness:.82});
  const trim = new THREE.MeshStandardMaterial({color:0xf1ecd8, roughness:.78});
  const dark = new THREE.MeshStandardMaterial({color:0x263c46, roughness:.48, metalness:.25});
  const neon = new THREE.MeshStandardMaterial({color:0xffc980, roughness:.3, emissive:0xffc980, emissiveIntensity:.35});
  visualKit?.atmosphere?.registerGlow?.(neon, {day:.12, night:2.2, color:0xffc980});

  // Art-deco shell, matching the rest of Ocean Drive, with a real street door.
  const wallT = .55, doorHalf = 1.7;
  batch(stucco, bx, .06, zNorth+wallT/2, building.w, building.height, wallT);
  batch(stucco, bx, .06, zSouth-wallT/2, building.w, building.height, wallT);
  batch(stucco, back+wallT/2, .06, bz, wallT, building.height, building.d-wallT*2);
  const eastX = front-wallT/2;
  const sideSpan = hz-wallT-doorHalf, sideCenter = doorHalf+sideSpan/2;
  batch(stucco, eastX, .06, bz-sideCenter, wallT, 3.25, sideSpan);
  batch(stucco, eastX, .06, bz+sideCenter, wallT, 3.25, sideSpan);
  batch(stucco, eastX, 3.25, bz, wallT, building.height-3.25, building.d-wallT*2);
  batch(trim, bx, building.height, bz, building.w+1, .4, building.d+1);
  batch(stucco, bx, building.height+.4, bz, building.w-8, 1.4, building.d-8);
  batch(trim, bx, building.height+1.8, bz, building.w-7, .25, building.d-7);
  batch(trim, front+1.5, 3.6, bz, 3, .24, building.d-1);
  batch(neon, front+3.03, 3.65, bz, .06, .1, building.d-2);
  for (let y = 5; y < building.height-1; y += 3.5) {
    batch(trim, front+.55, y-.3, bz, 1.2, .2, building.d);
    batch(neon, front+1.17, y-.25, bz, .04, .07, building.d-1);
    for (let z = zNorth+3; z < zSouth-1; z += 4) {
      batch(cityGlass, front+.1, y, z, .07, 2.1, 2.5);
      batch(trim, front+.14, y, z, .1, 2.1, .09);
    }
    for (const side of [-1, 1]) for (let x = back+4; x < front-1; x += 5) batch(cityGlass, x, y, bz+side*(hz+.06), 2.1, 2, .08);
  }
  batch(trim, front+.9, 3.9, zNorth+2, 1.4, building.height-2.7, 3);
  batch(neon, front+1.66, 4.3, zNorth+2, .07, building.height-3.5, .11);
  for (let z = zNorth+wallT; z < bz-doorHalf-1.2; z += 3.2) batch(cityGlass, front+.08, .85, z, .08, 2.5, 2.4);
  for (let z = bz+doorHalf+1.2; z < zSouth-wallT; z += 3.2) batch(cityGlass, front+.08, .85, z, .08, 2.5, 2.4);
  const dummy = new THREE.Object3D();
  for (const [mat, items] of batches) {
    const mesh = new THREE.InstancedMesh(unit, mat, items.length);
    items.forEach((p, i) => { dummy.position.set(p.x, p.y, p.z); dummy.scale.set(p.w, p.h, p.d); dummy.updateMatrix(); mesh.setMatrixAt(i, dummy.matrix); });
    mesh.castShadow = mesh.receiveShadow = true; mesh.computeBoundingSphere(); shell.add(mesh);
  }
  function streetSign(text, x, y, z, w, h, color) {
    const canvas = document.createElement('canvas'); canvas.width = 512; canvas.height = 96;
    const q = canvas.getContext('2d'); q.fillStyle = color; q.fillRect(0, 0, 512, 96);
    q.fillStyle = '#fff0d1'; q.font = 'bold 36px sans-serif'; q.textAlign = 'center'; q.textBaseline = 'middle'; q.fillText(text, 256, 49, 490);
    const texture = new THREE.CanvasTexture(canvas); texture.colorSpace = THREE.SRGBColorSpace;
    const material = new THREE.MeshStandardMaterial({map:texture, emissiveMap:texture, emissive:0xffffff, emissiveIntensity:.2, roughness:.65, side:THREE.DoubleSide});
    visualKit?.atmosphere?.registerGlow?.(material, {day:.06, night:.8});
    const mesh = new THREE.Mesh(new THREE.PlaneGeometry(w, h), material);
    mesh.position.set(x, y, z); mesh.rotation.y = Math.PI/2; shell.add(mesh);
  }
  streetSign(building.name, front+1.75, 4.6, bz, Math.min(24, building.d-5), 1.2, '#54374c');
  streetSign('HOTEL', front+1.78, 3.0, bz, 9, .65, '#193b48');

  // Perimeter collision matches the shell, with a street door on the east face.
  blocker(bx, zNorth+wallT/2, building.w, wallT);
  blocker(bx, zSouth-wallT/2, building.w, wallT);
  blocker(back+wallT/2, bz, wallT, building.d-wallT*2);
  blocker(eastX, bz-sideCenter, wallT, sideSpan);
  blocker(eastX, bz+sideCenter, wallT, sideSpan);
  const entranceDoor = blocker(front-.2, bz, .16, doorHalf*2- .15);
  const floorSeal = blocker(front-1.1, bz, .4, doorHalf*2);

  const floorSurface = {minX:back+.7, maxX:front-.15, minZ:zNorth+.7, maxZ:zSouth-.7, top:floors[0].y,kind:'tile'};
  groundSurfaces?.push(floorSurface);

  const hole = {x0:X(-9.85), x1:X(-2.55), z0:Z(16.15), z1:Z(18.85)};
  const room = {x0:back+.7, x1:front-.55, z0:zNorth+.7, z1:zSouth-.7};
  function slab(parent, mat, walkY, height = .16) {
    const y = walkY-height;
    const parts = [
      [room.x0, hole.x0, room.z0, room.z1],
      [hole.x1, room.x1, room.z0, room.z1],
      [hole.x0, hole.x1, room.z0, hole.z0],
      [hole.x0, hole.x1, hole.z1, room.z1],
    ];
    for (const [a, b, c, d] of parts) {
      if (b-a < .08 || d-c < .08) continue;
      box(parent, mat, (a+b)/2, y, (c+d)/2, b-a, height, d-c);
    }
  }
  slab(interior, stoneFloor, floors[0].y);
  slab(interior, carpetMat, floors[1].y);
  slab(interior, suiteCarpet, floors[2].y);
  function ceiling(y, h = .12) {
    const parts = [
      [room.x0, hole.x0, room.z0, room.z1],
      [hole.x1, room.x1, room.z0, room.z1],
      [hole.x0, hole.x1, room.z0, hole.z0],
      [hole.x0, hole.x1, hole.z1, room.z1],
    ];
    for (const [a, b, c, d] of parts) {
      if (b-a < .08 || d-c < .08) continue;
      box(interior, plaster, (a+b)/2, y, (c+d)/2, b-a, h, d-c);
    }
  }
  ceiling(6.85); ceiling(11.55); ceiling(16.2);
  // Continuous inner lining. The street opening is only as tall as the doors.
  const innerT = .18;
  box(interior, plaster, bx, .21, zNorth+.78, building.w-1.6, 16, innerT);
  box(interior, stone, bx, .21, zSouth-.78, building.w-1.6, 16, innerT);
  box(interior, walnut, bx, .21, zSouth-.64, building.w-2.4, 1.05, .08);
  box(interior, brass, bx, 1.26, zSouth-.58, building.w-2.4, .04, .05);
  for (const y of [6.42, 11.15, 15.82]) {
    box(interior, walnut, bx, y, zSouth-1.02, building.w-2.3, .14, .16);
    box(interior, walnut, bx, y, zNorth+1.02, building.w-2.3, .14, .16);
    box(interior, walnut, back+1.05, y, bz, .16, .14, building.d-2.4);
    box(interior, walnut, front-.95, y, bz, .16, .14, building.d-2.4);
  }
  box(interior, plaster, back+.78, .21, bz, innerT, 16, building.d-1.8);
  box(interior, plaster, front-.7, 3.2, bz, innerT, 13, building.d-1.8);
  box(interior, plaster, front-.7, .21, bz-sideCenter, innerT, 3.0, sideSpan-.4);
  box(interior, plaster, front-.7, .21, bz+sideCenter, innerT, 3.0, sideSpan-.4);
  for (const z of [bz-doorHalf, bz+doorHalf]) {
    box(interior, steel, front-.62, .21, z, .12, 3.05, .08);
  }
  box(interior, steel, front-.62, 3.15, bz, .12, .1, doorHalf*2);
  // Glass storefront beside the opening, and a tall window band on the upper floors.
  for (const z of [bz-6.2, bz+6.2]) box(interior, glass, front-.78, .35, z, .04, 2.7, 3.4);
  for (const y of [9.05, 13.85]) for (const z of [-12, -4, 4, 12]) {
    box(interior, steel, front-.66, y, Z(z), .06, 2.15, 3.3);
    box(interior, glass, front-.72, y+.08, Z(z), .03, 1.9, 3.0);
  }
  for (const y of [6.55, 11.25, 15.9]) {
    box(interior, coveMat, bx, y, bz, building.w-2.4, .04, .08);
    box(interior, coveMat, bx, y, zNorth+1.3, building.w-2.4, .04, .08);
    box(interior, coveMat, bx, y, zSouth-1.3, building.w-2.4, .04, .08);
  }

  const word = plaque('THE FLAMINGO', 7.2, 1.15, {bg:'#141311', fg:'#f3eee6', font:'500 78px sans-serif', accent:'#b08d57'});
  word.position.set(X(6), 4.4, zSouth-1.05); word.rotation.y = Math.PI; interior.add(word);
  const art = new THREE.Mesh(new THREE.PlaneGeometry(3.2, 2.2), new THREE.MeshStandardMaterial({
    map:dataTexture(256, 192, (x, y, w, h) => {
      const nx = x/w, ny = y/h, wash = fbm(nx*3.2, ny*2.4);
      const blush = wash > .58 ? [196, 142, 128] : [226, 214, 202];
      const ink = Math.abs(nx-.7) < .012 || (ny > .72 && wash > .5);
      const grain = (hash(x, y)-.5)*12;
      const c = ink ? [42, 44, 46] : blush;
      return c.map(channel => Math.max(0, Math.min(255, channel+grain)));
    }), roughness:.55, fog:false, side:THREE.DoubleSide,
  }));
  art.position.set(X(-14), 3.6, zSouth-1.02); art.rotation.y = Math.PI; interior.add(art);
  box(interior, steel, X(-14), 2.4, zSouth-.96, 3.45, 2.45, .04);

  function sofa(x, z, yaw, material, length = 2.5) {
    const g = new THREE.Group(); g.position.set(x, floors[0].y, z); g.rotation.y = yaw; interior.add(g);
    rounded(g, material, 0, .28, 0, length, .28, .9, .06);
    rounded(g, material, 0, .56, -.38, length, .55, .16, .04);
    rounded(g, walnut, -length/2+.08, 0, 0, .1, .32, .86, .02);
    rounded(g, walnut, length/2-.08, 0, 0, .1, .32, .86, .02);
    blocker(x, z, Math.abs(Math.cos(yaw))*length+Math.abs(Math.sin(yaw))*.95, Math.abs(Math.sin(yaw))*length+Math.abs(Math.cos(yaw))*.95, floorSets[0]);
  }
  function chair(x, z, yaw) {
    const g = new THREE.Group(); g.position.set(x, floors[0].y, z); g.rotation.y = yaw; interior.add(g);
    rounded(g, sand, 0, .32, 0, .72, .22, .72, .05);
    rounded(g, sand, 0, .55, -.28, .72, .42, .12, .03);
    rounded(g, brass, 0, 0, 0, .5, .08, .5, .02);
    cyl(g, brass, -.24, 0, -.24, .035, .32, .035);
    cyl(g, brass, .24, 0, -.24, .035, .32, .035);
    cyl(g, brass, -.24, 0, .24, .035, .32, .035);
    cyl(g, brass, .24, 0, .24, .035, .32, .035);
    blocker(x, z, .8, .8, floorSets[0]);
  }
  function table(x, z, y = floors[0].y, bucket = floorSets[0]) {
    const g = new THREE.Group(); g.position.set(x, y, z); interior.add(g);
    cyl(g, brass, 0, 0, 0, .04, .34, .04);
    cyl(g, brass, 0, .34, 0, .28, .025, .28);
    const top = new THREE.Mesh(new THREE.CylinderGeometry(.55, .55, .02, 32), glass);
    top.position.y = .38; g.add(top);
    blocker(x, z, 1.15, 1.15, bucket);
  }
  function tree(x, z, h = 2.5, y = floors[0].y, bucket = floorSets[0]) {
    const g = new THREE.Group(); g.position.set(x, y, z); interior.add(g);
    cyl(g, darkStone, 0, 0, 0, .32, .42, .32, 20);
    cyl(g, walnut, 0, .42, 0, .06, h*.45, .06, 8);
    for (let i = 0; i < 9; i++) {
      const leaf = new THREE.Mesh(new THREE.PlaneGeometry(.55, .28), leafMat);
      const a = i/9*Math.PI*2;
      leaf.position.set(Math.cos(a)*.28, .55+h*.45+Math.sin(i)* .08, Math.sin(a)*.28);
      leaf.rotation.y = a; leaf.rotation.x = -.4; g.add(leaf);
    }
    const crown = new THREE.Mesh(sphere, leafMat); crown.scale.set(.55, .7, .55); crown.position.y = .7+h*.45; g.add(crown);
    blocker(x, z, .7, .7, bucket);
  }
  function floorLamp(x, z, y) {
    const g = new THREE.Group(); g.position.set(x, y, z); interior.add(g);
    cyl(g, brass, 0, 0, 0, .14, .025, .14, 14);
    cyl(g, brass, 0, .02, 0, .015, 1.38, .015, 8);
    const shade = new THREE.Mesh(new THREE.CylinderGeometry(.16, .2, .28, 18, 1, true), linen);
    shade.position.y = 1.48; g.add(shade);
    const bulb = new THREE.Mesh(sphere, glowMat); bulb.scale.set(.07, .07, .07); bulb.position.y = 1.46; g.add(bulb);
    if(!mobile){const lamp = new THREE.PointLight(0xffd7a4, 26, 7, 2); lamp.position.y = 1.46; g.add(lamp); lights.push(lamp);}
  }
  function books(x, z, y) {
    const g = new THREE.Group(); g.position.set(x, y, z); interior.add(g);
    box(g, rust, -.08, 0, 0, .16, .04, .22);
    box(g, charcoal, .08, 0, .02, .14, .035, .2);
    box(g, sand, 0, .04, -.02, .18, .028, .2);
  }
  function rug(x, y, z, w, d) {
    const map = borderedRug();
    map.repeat.set(1/Math.max(w, .2), 1/Math.max(d, .2));
    const mat = new THREE.MeshStandardMaterial({map, roughness:.94, side:THREE.DoubleSide, fog:false});
    box(interior, mat, x, y, z, w, .025, d);
  }
  // Main seating sits in the south view from the entrance aisle. The elevator
  // aisle (local x -8.3, z 0..15) stays clear.
  rug(X(5.2), floors[0].y+.01, Z(4.6), 7.4, 6.2);
  sofa(X(5.2), Z(6.6), Math.PI, charcoal, 2.8);
  sofa(X(5.2), Z(2.6), 0, sand, 2.6);
  chair(X(2.2), Z(4.6), .9);
  chair(X(8.2), Z(4.5), -1);
  table(X(5.2), Z(4.6));
  books(X(5.2), Z(4.6), floors[0].y+.4);
  floorLamp(X(1.1), Z(6.8), floors[0].y);
  floorLamp(X(9.2), Z(2.4), floors[0].y);
  sofa(X(-16), Z(4), Math.PI/2, rust, 2.4);
  chair(X(-13.2), Z(1.2), 1.2);
  table(X(-14.6), Z(-2.4));
  floorLamp(X(-16.8), Z(-2), floors[0].y);
  tree(X(16), Z(4), 2.6);
  tree(X(-16), Z(-8), 2.3);
  tree(X(14), Z(-12), 2.1);
  for (let i = 0; i < 3; i++) box(interior, walnut, X(5.2), 5.85, Z(3.1+i*1.7), 6.6, .1, .22);

  // Reception: stone top, walnut case, monitor, lamp. East of the elevator aisle.
  const deskX = X(7.2), deskZ = Z(13.2);
  rounded(interior, darkStone, deskX, floors[0].y, deskZ, 4.15, .12, .72, .02);
  rounded(interior, walnut, deskX, floors[0].y+.12, deskZ, 4.4, .8, .85, .04);
  box(interior, brass, deskX, floors[0].y+.46, deskZ-.4, 4.15, .035, .02);
  rounded(interior, stone, deskX, floors[0].y+.92, deskZ, 4.7, .08, 1.08, .02);
  rounded(interior, walnut, deskX-1.7, floors[0].y, deskZ-1.15, .7, .92, 1.5, .03);
  rounded(interior, stone, deskX-1.7, floors[0].y+.92, deskZ-1.15, .82, .07, 1.7, .02);
  box(interior, steel, deskX+.2, floors[0].y+1.02, deskZ-.15, .72, .42, .04);
  box(interior, dark, deskX+.2, floors[0].y+1.44, deskZ-.15, .62, .03, .04);
  cyl(interior, brass, deskX-1.5, floors[0].y+1.02, deskZ, .04, .42, .04);
  const shade = new THREE.Mesh(sphere, glowMat); shade.scale.set(.16, .1, .16); shade.position.set(deskX-1.5, floors[0].y+1.5, deskZ); interior.add(shade);
  cyl(interior, darkStone, deskX+1.6, floors[0].y+1.05, deskZ+.05, .1, .28, .1, 16);
  const bloom = new THREE.Mesh(sphere, new THREE.MeshStandardMaterial({color:0xd9a598, roughness:.7, fog:false}));
  bloom.scale.set(.22, .16, .22); bloom.position.set(deskX+1.6, floors[0].y+1.42, deskZ+.05); interior.add(bloom);
  blocker(deskX, deskZ, 4.7, 1.15, floorSets[0]);
  blocker(deskX-1.7, deskZ-1.15, .9, 1.7, floorSets[0]);
  const deskSign = plaque('RECEPTION', 1.8, .32, {bg:'#141311', fg:'#f3eee6', font:'500 54px sans-serif', accent:'#b08d57'});
  deskSign.position.set(deskX, floors[0].y+1.7, deskZ-.5); interior.add(deskSign);

  // Columns only collide on the lobby; upper floors keep this aisle clear.
  for (const [lx, lz] of [[14, -12], [-14, 12]]) {
    cyl(interior, stone, X(lx), floors[0].y, Z(lz), .32, 6.5, .32, 20);
    cyl(interior, brass, X(lx), floors[0].y+6.5, Z(lz), .38, .08, .38, 20);
    blocker(X(lx), Z(lz), .75, .75, floorSets[0]);
  }
  for (const lx of [2.2, 8.2]) {
    const pendant = new THREE.Group(); pendant.position.set(X(lx), 0, Z(4.6)); interior.add(pendant);
    cyl(pendant, brass, 0, 5.05, 0, .012, 1.35, .012, 8);
    const shade = new THREE.Mesh(new THREE.CylinderGeometry(.18, .26, .32, 18, 1, true), linen);
    shade.position.y = 4.28; pendant.add(shade);
    const bulb = new THREE.Mesh(sphere, glowMat); bulb.scale.set(.08, .08, .08); bulb.position.y = 4.28; pendant.add(bulb);
  }

  // Elevator bank against the south wall. Both cabs share one ride.
  const cabLocals = [-8.3, -4.1];
  const cabGroups = [];
  const doorLeaves = [];
  const cabLights = [];
  const indicatorCanvas = document.createElement('canvas'); indicatorCanvas.width = 256; indicatorCanvas.height = 128;
  const indicatorCtx = indicatorCanvas.getContext('2d');
  const indicatorTexture = new THREE.CanvasTexture(indicatorCanvas); indicatorTexture.colorSpace = THREE.SRGBColorSpace;
  const indicatorMat = new THREE.MeshStandardMaterial({map:indicatorTexture, emissiveMap:indicatorTexture, emissive:0xffe1a8, emissiveIntensity:.8, roughness:.4, fog:false});
  function drawLevel(level) {
    indicatorCtx.fillStyle = '#12110f'; indicatorCtx.fillRect(0, 0, 256, 128);
    indicatorCtx.fillStyle = '#f0d7a2'; indicatorCtx.font = '600 78px sans-serif';
    indicatorCtx.textAlign = 'center'; indicatorCtx.textBaseline = 'middle';
    indicatorCtx.fillText(level, 128, 64);
    indicatorTexture.needsUpdate = true;
  }
  drawLevel('L');
  const cabs = cabLocals.map(localX => {
    const x = X(localX), z = Z(17.35);
    const group = new THREE.Group(); group.name = 'Flamingo cab'; group.position.set(x, floors[0].y, z); scene.add(group); cabGroups.push(group);
    box(group, darkStone, 0, 0, 0, 2.35, .08, 2.15);
    box(group, steel, -1.2, .08, 0, .06, 2.55, 2.15);
    box(group, steel, 1.2, .08, 0, .06, 2.55, 2.15);
    box(group, steel, 0, .08, 1.08, 2.35, 2.55, .06);
    box(group, plaster, 0, 2.58, 0, 2.3, .06, 2.1);
    box(group, steel, 0, 1.15, 1.02, 1.7, .9, .02);
    box(group, brass, 0, 1.05, -1.0, 2.1, .04, .04);
    if(!mobile){const lamp = new THREE.PointLight(0xfff1dd, 18, 4.5, 2); lamp.position.set(0, 2.35, 0); group.add(lamp); cabLights.push(lamp);}
    const leafL = box(group, steel, -.58, .08, -1.12, 1.12, 2.45, .06);
    const leafR = box(group, steel, .58, .08, -1.12, 1.12, 2.45, .06);
    doorLeaves.push(leafL, leafR);
    // Portal, call buttons, and indicator live in the lobby and repeat upstairs.
    for (const floor of floors) {
      box(interior, steel, x, floor.y, Z(16.05), 2.7, 2.7, .08);
      box(interior, darkStone, x, floor.y, Z(16.02), 2.15, 2.35, .04);
      const indicator = new THREE.Mesh(new THREE.PlaneGeometry(.62, .32), indicatorMat);
      indicator.position.set(x, floor.y+2.95, Z(15.95)); interior.add(indicator);
      cyl(interior, brass, x-1.45, floor.y+.9, Z(15.9), .08, .22, .08, 12);
      const button = new THREE.Mesh(sphere, glowMat); button.scale.set(.04, .04, .04); button.position.set(x-1.45, floor.y+1.15, Z(15.78)); interior.add(button);
    }
    blocker(x, z+1.05, 2.5, .16); // back wall
    blocker(x-1.22, z, .16, 2.2);
    blocker(x+1.22, z, .16, 2.2);
    const door = blocker(x, Z(16.12), 2.15, .14);
    return {x, z, doorZ:Z(16.12), localX, door};
  });
  // Pier between the cabs and the stone return beside them.
  box(interior, darkStone, X(-6.2), .21, Z(17.4), .55, 16, 2.2);
  blocker(X(-6.2), Z(17.4), .7, 2.3);
  blocker(X(-11.2), Z(17.2), .4, 2.6);
  blocker(X(-1.3), Z(17.2), .4, 2.6);

  // Sky lounge: seating groups, a bar, and lamps. The elevator landing (local x -10..-2, z 12..17) stays open.
  const loungeY = floors[1].y;
  function loungeSofa(x, z, yaw, material, length = 2.4) {
    const g = new THREE.Group(); g.position.set(x, loungeY, z); g.rotation.y = yaw; interior.add(g);
    rounded(g, material, 0, .32, 0, length, .32, .92, .08);
    rounded(g, material, 0, .62, -.38, length, .58, .18, .05);
    rounded(g, material, -length/2, .4, .05, .16, .48, .92, .04);
    rounded(g, material, length/2, .4, .05, .16, .48, .92, .04);
    rounded(g, walnut, 0, 0, 0, length-.1, .08, .8, .02);
    blocker(x, z, Math.abs(Math.cos(yaw))*length+Math.abs(Math.sin(yaw))*1.05, Math.abs(Math.sin(yaw))*length+Math.abs(Math.cos(yaw))*1.05, floorSets[1]);
  }
  function loungeChair(x, z, yaw, y = loungeY, bucket = floorSets[1]) {
    const g = new THREE.Group(); g.position.set(x, y, z); g.rotation.y = yaw; interior.add(g);
    rounded(g, rust, 0, .34, 0, .78, .28, .78, .06);
    rounded(g, rust, 0, .58, -.28, .78, .5, .14, .04);
    cyl(g, brass, 0, 0, 0, .28, .08, .28, 16);
    blocker(x, z, .9, .9, bucket);
  }
  rug(X(3.2), loungeY+.015, Z(5.6), 6.8, 5.4);
  loungeSofa(X(3.2), Z(7.4), Math.PI, charcoal, 2.7);
  loungeSofa(X(3.2), Z(3.6), 0, sand, 2.5);
  loungeChair(X(0.4), Z(5.5), .7);
  loungeChair(X(6.2), Z(5.6), -.7);
  table(X(3.2), Z(5.5), loungeY, floorSets[1]);
  books(X(3.2), Z(5.5), loungeY+.4);
  floorLamp(X(-0.6), Z(7.6), loungeY);
  floorLamp(X(6.8), Z(3.4), loungeY);
  loungeSofa(X(-16), Z(2), Math.PI/2, charcoal, 2.6);
  loungeChair(X(-12.4), Z(-1.2), 1.4);
  table(X(-14.2), Z(2), loungeY, floorSets[1]);
  const barX = X(10.4), barZ = Z(8.2);
  const bar = new THREE.Group(); bar.position.set(barX, loungeY, barZ); interior.add(bar);
  rounded(bar, walnut, 0, 0, 0, 3.6, 1.05, .68, .03);
  rounded(bar, stone, 0, 1.05, 0, 3.8, .07, .86, .02);
  box(bar, brass, 0, .55, -.3, 3.4, .03, .02);
  blocker(barX, barZ, 3.9, 1.05, floorSets[1]);
  for (let i = -2; i <= 2; i++) {
    const stool = new THREE.Group(); stool.position.set(i*.68, 0, -1.05); bar.add(stool);
    cyl(stool, brass, 0, 0, 0, .04, .62, .04, 10);
    cyl(stool, rust, 0, .62, 0, .2, .06, .2, 16);
    cyl(stool, brass, 0, .78, 0, .16, .02, .16, 12);
    blocker(barX+i*.68, barZ-1.05, .46, .46, floorSets[1]);
  }
  for (const lx of [-1.2, 0, 1.2]) {
    cyl(bar, glass, lx, 1.16, .05, .055, .2, .055, 12);
    cyl(bar, brass, lx, 1.12, .05, .065, .02, .065, 12);
  }
  box(interior, walnut, X(-18), loungeY, Z(-8), 3.2, 2.2, .12);
  for (let i = 0; i < 8; i++) box(interior, brass, X(-18), loungeY+.2+i*.22, Z(-8.08), 2.8, .015, .02);
  tree(X(12.5), Z(4), 2.1, loungeY, floorSets[1]);
  const loungeSign = plaque('SKY LOUNGE', 4.6, .62, {bg:'#141311', fg:'#f6f1e8', font:'500 72px sans-serif', accent:'#c4a15a'});
  loungeSign.position.set(X(4), loungeY+2.15, zSouth-1.02); loungeSign.rotation.y = Math.PI; interior.add(loungeSign);
  for (const lx of [1.2, 5.2]) {
    cyl(interior, brass, X(lx), loungeY+2.85, Z(5.5), .012, .85, .012, 8);
    const shade = new THREE.Mesh(new THREE.CylinderGeometry(.16, .22, .26, 16, 1, true), linen);
    shade.position.set(X(lx), loungeY+2.35, Z(5.5)); interior.add(shade);
    const bulb = new THREE.Mesh(sphere, glowMat); bulb.scale.set(.07, .07, .07); bulb.position.set(X(lx), loungeY+2.35, Z(5.5)); interior.add(bulb);
  }
  for (let i = 0; i < 3; i++) box(interior, walnut, X(3.2), loungeY+2.55, Z(4+i*1.5), 5.8, .08, .18);

  // Guest floor: a furnished corridor and one open suite you can walk into.
  const suiteWallZ = Z(8.6);
  const suiteY = floors[2].y;
  blocker(X(-16), suiteWallZ, 12, .16, floorSets[2]);
  blocker(X(12), suiteWallZ, 16, .16, floorSets[2]);
  box(interior, walnut, X(-16), suiteY, suiteWallZ, 11.6, 2.7, .12);
  box(interior, walnut, X(12), suiteY, suiteWallZ, 15.6, 2.7, .12);
  box(interior, brass, X(-10.15), suiteY, suiteWallZ-.08, .08, 2.55, .08);
  box(interior, brass, X(4.15), suiteY, suiteWallZ-.08, .08, 2.55, .08);
  box(interior, brass, X(-3), suiteY+2.45, suiteWallZ-.08, 14.2, .08, .08);
  const suiteDoor = new THREE.Group(); suiteDoor.position.set(X(-9.7), suiteY, suiteWallZ); suiteDoor.rotation.y = .7; interior.add(suiteDoor);
  box(suiteDoor, walnut, .45, 0, 0, .9, 2.35, .05);
  box(suiteDoor, brass, .88, 1.05, .04, .04, .12, .04);
  rug(X(-6), suiteY+.01, Z(12.4), 2.1, 7.2);
  for (const lx of [-14, -8, 10, 16]) {
    box(interior, walnut, X(lx), suiteY, Z(12.4), 1.15, 2.35, .08);
    box(interior, brass, X(lx), suiteY+1.05, Z(12.28), .9, .04, .02);
    const num = plaque(String(300+Math.abs(lx)), .7, .28, {bg:'#1a1917', fg:'#f3eee6', font:'600 48px sans-serif'});
    num.position.set(X(lx), suiteY+1.55, Z(12.22)); interior.add(num);
    cyl(interior, brass, X(lx+.7), suiteY+1.35, Z(12.15), .04, .16, .04, 8);
    const sconce = new THREE.Mesh(sphere, glowMat); sconce.scale.set(.05,.05,.05); sconce.position.set(X(lx+.7), suiteY+1.5, Z(12.12)); interior.add(sconce);
  }
  const suiteSign = plaque('SUITE  312', 2.4, .42, {bg:'#141311', fg:'#f6f1e8', font:'500 60px sans-serif', accent:'#c4a15a'});
  suiteSign.position.set(X(-3), suiteY+2.05, suiteWallZ-.16); interior.add(suiteSign);

  const bedX = X(4), bedZ = Z(-3);
  rug(bedX, suiteY+.012, bedZ+.2, 4.2, 5.2);
  rounded(interior, walnut, bedX, suiteY, bedZ-1.15, 2.05, 1.15, .12, .03);
  for (let i = -3; i <= 3; i++) box(interior, walnut, bedX+i*.22, suiteY+.15, bedZ-1.22, .08, .95, .04);
  rounded(interior, walnut, bedX, suiteY, bedZ+.15, 1.9, .28, 2.15, .04);
  rounded(interior, linen, bedX, suiteY+.28, bedZ+.2, 1.85, .22, 2.05, .05);
  rounded(interior, sand, bedX, suiteY+.48, bedZ-.35, 1.7, .1, .7, .04);
  rounded(interior, linen, bedX-.32, suiteY+.52, bedZ-.7, .55, .16, .38, .04);
  rounded(interior, linen, bedX+.32, suiteY+.52, bedZ-.7, .55, .16, .38, .04);
  rounded(interior, rust, bedX+.55, suiteY+.5, bedZ+.55, .7, .08, .55, .03);
  blocker(bedX, bedZ, 2.1, 2.5, floorSets[2]);
  rounded(interior, walnut, bedX, suiteY, bedZ+1.45, 1.5, .42, .42, .03);
  blocker(bedX, bedZ+1.45, 1.55, .5, floorSets[2]);
  for (const side of [-1, 1]) {
    rounded(interior, walnut, bedX+side*1.35, suiteY, bedZ-.85, .52, .55, .42, .02);
    cyl(interior, brass, bedX+side*1.35, suiteY+.55, bedZ-.85, .035, .32, .035, 8);
    const shade = new THREE.Mesh(new THREE.CylinderGeometry(.1, .13, .16, 14, 1, true), linen);
    shade.position.set(bedX+side*1.35, suiteY+.95, bedZ-.85); interior.add(shade);
    const bulb = new THREE.Mesh(sphere, glowMat); bulb.scale.set(.05,.05,.05); bulb.position.set(bedX+side*1.35, suiteY+.94, bedZ-.85); interior.add(bulb);
    if(!mobile){const lamp = new THREE.PointLight(0xffd7a4, 16, 4.5, 2); lamp.position.set(bedX+side*1.35, suiteY+1, bedZ-.85); scene.add(lamp); lights.push(lamp);}
    blocker(bedX+side*1.35, bedZ-.85, .58, .5, floorSets[2]);
  }
  loungeChair(X(12), Z(-6), -1.2, suiteY, floorSets[2]);
  floorLamp(X(12.8), Z(-4.6), suiteY);
  const deskSX = X(16), deskSZ = Z(2);
  rounded(interior, walnut, deskSX, suiteY, deskSZ, 1.3, .75, .55, .03);
  box(interior, steel, deskSX, suiteY+.78, deskSZ-.1, .7, .4, .03);
  cyl(interior, brass, deskSX-.35, suiteY, deskSZ+.45, .16, .45, .16, 14);
  blocker(deskSX, deskSZ, 1.4, .7, floorSets[2]);
  box(interior, walnut, X(-14), suiteY, Z(-6), 1.3, 2.15, .55);
  box(interior, brass, X(-14), suiteY+1.7, Z(-6.3), 1.15, .02, .02);
  blocker(X(-14), Z(-6), 1.4, .7, floorSets[2]);
  box(interior, stone, X(-14), suiteY, Z(2), 1.6, .85, .5);
  box(interior, steel, X(-14), suiteY+.4, Z(2.28), 1.2, .7, .02);
  cyl(interior, brass, X(-14), suiteY+.9, Z(2.2), .03, .18, .03, 8);
  blocker(X(-14), Z(2), 1.7, .6, floorSets[2]);
  const bedArt = plaque('312', 1.4, .9, {bg:'#1c1916', fg:'#e7d3c4', font:'500 84px sans-serif', accent:'#c4a15a'});
  bedArt.position.set(bedX, suiteY+1.7, bedZ-1.28); interior.add(bedArt);

  // Sliding street doors in the deco opening.
  const doorL = box(entrance, glass, front-.15, .08, bz-doorHalf/2, .05, 2.85, doorHalf-.08);
  const doorR = box(entrance, glass, front-.15, .08, bz+doorHalf/2, .05, 2.85, doorHalf-.08);
  box(entrance, steel, front-.12, .08, bz-doorHalf, .1, 2.95, .08);
  box(entrance, steel, front-.12, .08, bz+doorHalf, .1, 2.95, .08);
  const doorHomeL = doorL.position.z, doorHomeR = doorR.position.z;

  function spot(x, y, z, tx, ty, tz, intensity, distance) {
    if(mobile)return;
    const light = new THREE.SpotLight(0xfff0dc, intensity, distance, .7, .5, 1.2);
    light.position.set(x, y, z); light.target.position.set(tx, ty, tz);
    light.castShadow = false; scene.add(light, light.target); lights.push(light); return light;
  }
  spot(X(5), 6.05, Z(4.6), X(5.2), floors[0].y, Z(4.6), 90, 12);
  spot(X(7), 5.4, Z(12), X(7.2), floors[0].y, Z(13), 55, 10);
  spot(X(-15), 5.5, Z(2), X(-16), floors[0].y, Z(4), 40, 9);
  spot(X(3.2), loungeY+2.7, Z(5.5), X(3.2), loungeY, Z(5.5), 70, 9);
  spot(barX, loungeY+2.3, barZ-.4, barX, loungeY, barZ, 36, 6);
  spot(bedX, suiteY+2.45, bedZ, bedX, suiteY, bedZ, 64, 8);
  spot(X(-2), suiteY+2.4, Z(12), X(-4), suiteY, Z(12), 42, 8);
  function warm(x, y, z, intensity, distance) {
    if(mobile)return;
    const light = new THREE.PointLight(0xffe3c4, intensity, distance, 2);
    light.position.set(x, y, z); light.castShadow = false; scene.add(light); lights.push(light);
  }
  warm(X(5), 3.2, Z(4.4), 18, 11);
  warm(X(8), 2.6, Z(8), 10, 8);
  warm(deskX, 2.4, deskZ-1.2, 12, 7);
  warm(X(3), loungeY+2.15, Z(5.4), 16, 9);
  warm(X(-15), loungeY+2.1, Z(2), 10, 6);
  warm(barX, loungeY+1.6, barZ-.6, 9, 5);
  warm(bedX, suiteY+1.9, bedZ, 18, 8);
  warm(X(-4), suiteY+2.15, Z(11), 12, 8);
  warm(X(12), suiteY+1.8, Z(-4), 8, 5);
  lights.push(...cabLights);

  let cutaway = false, entranceOpen = 0, doorOpen = 0, currentFloor = 0;
  const ride = {active:false, phase:'idle', time:0, fromY:floors[0].y, toY:floors[0].y, toIndex:0, actor:null, cab:cabs[0], startX:0, startZ:0};
  function setCabDoors(open) {
    const slide = open*1.05;
    for (let i = 0; i < doorLeaves.length; i += 2) {
      doorLeaves[i].position.x = -.58-slide;
      doorLeaves[i+1].position.x = .58+slide;
    }
    const shut = open < .72;
    for (const cab of cabs) activate([cab.door], shut);
  }
  function setHeight(y) {
    floorSurface.top = y;
    for (const group of cabGroups) group.position.y = y;
    if (ride.actor) ride.actor.position.y = y;
  }
  function applyFloor(index) {
    currentFloor = index;
    activate(floorSets[0], index === 0);
    activate(floorSets[1], index === 1);
    activate(floorSets[2], index === 2);
    activate([floorSeal], index !== 0);
    drawLevel(floors[index].level);
  }
  setCabDoors(0);

  function inside(p) {
    return !!p && p.x > back+.55 && p.x < front-.05 && p.z > zNorth+.55 && p.z < zSouth-.55;
  }
  function nearestElevator(p) {
    if (!p || ride.active) return null;
    let best = null, dist = 2.55;
    for (const cab of cabs) {
      const d = Math.hypot(p.x-cab.x, p.z-cab.doorZ);
      if (d < dist) { dist = d; best = {x:cab.x, z:cab.doorZ, prompt:'Use the elevator'}; }
    }
    return best;
  }
  function rideTo(index, actor) {
    if (ride.active || !floors[index] || !actor?.position) return false;
    let best = cabs[0], dist = Infinity;
    for (const cab of cabs) {
      const d = Math.hypot(actor.position.x-cab.x, actor.position.z-cab.doorZ);
      if (d < dist) { dist = d; best = cab; }
    }
    ride.active = true; ride.phase = 'open'; ride.time = 0; ride.cab = best;
    ride.fromY = floors[currentFloor].y; ride.toY = floors[index].y; ride.toIndex = index;
    ride.actor = actor; ride.startX = actor.position.x; ride.startZ = actor.position.z;
    return true;
  }
  function pin(actor, cab) { actor.position.x = cab.x; actor.position.z = cab.z; }
  applyFloor(0);
  function update(dt, position) {
    dt = Math.min(Math.max(dt || 0, 0), .05);
    if (position) {
      if (inside(position)) cutaway = true;
      else if (position.x > front+.8 || position.x < back-1 || Math.abs(position.z-bz) > hz+1) cutaway = false;
    }
    shell.visible = entrance.visible = true;
    interior.visible = !mobile || !!position && Math.hypot(position.x-bx,position.z-bz)<70;
    const approach = position && Math.abs(position.z-bz) < 2.4 && position.x > front-1.2 && position.x < front+8;
    const entranceTarget = (approach || cutaway) ? 1 : 0;
    entranceOpen += (entranceTarget-entranceOpen)*Math.min(1, dt*4.5);
    doorL.position.z = doorHomeL-entranceOpen*(doorHalf-.12);
    doorR.position.z = doorHomeR+entranceOpen*(doorHalf-.12);
    activate([entranceDoor], entranceOpen < .62 && currentFloor === 0);
    const near = position && Math.hypot(position.x-bx, position.z-bz) < 60;
    for (const light of lights) light.visible = !!near;

    if (!ride.active) { setCabDoors(doorOpen); return; }
    ride.time += dt;
    const cab = ride.cab, actor = ride.actor;
    const finish = (next) => { ride.phase = next; ride.time = 0; };
    if (ride.phase === 'open') {
      doorOpen = Math.min(1, ride.time/.55);
      if (ride.time >= .55) finish('board');
    } else if (ride.phase === 'board') {
      doorOpen = 1;
      const t = Math.min(1, ride.time/.5);
      if (actor) {
        actor.position.x = ride.startX+(cab.x-ride.startX)*t;
        actor.position.z = ride.startZ+(cab.z-ride.startZ)*t;
        actor.position.y = ride.fromY;
      }
      if (t >= 1) finish('close');
    } else if (ride.phase === 'close') {
      doorOpen = 1-Math.min(1, ride.time/.4);
      if (actor) pin(actor, cab);
      if (ride.time >= .4) { applyFloor(ride.toIndex); finish('move'); }
    } else if (ride.phase === 'move') {
      doorOpen = 0;
      const dur = Math.abs(ride.toY-ride.fromY) < .05 ? .2 : 2.35;
      const t = Math.min(1, ride.time/dur), eased = t<.5 ? 2*t*t : 1-Math.pow(-2*t+2, 2)/2;
      setHeight(ride.fromY+(ride.toY-ride.fromY)*eased);
      if (actor) pin(actor, cab);
      if (t >= 1) { currentFloor = ride.toIndex; finish('arrive'); }
    } else if (ride.phase === 'arrive') {
      doorOpen = Math.min(1, ride.time/.55);
      setHeight(ride.toY);
      if (actor) pin(actor, cab);
      if (ride.time >= .55) { ride.active = false; doorOpen = 1; }
    }
    setCabDoors(doorOpen);
  }

  let sunLight, hemiLight;
  function presentInterior() {
    if (!sunLight) {
      sunLight = scene.children.find(object => object.isDirectionalLight);
      hemiLight = scene.children.find(object => object.isHemisphereLight);
    }
    if (mobile || !cutaway || !sunLight) return;
    sunLight.intensity *= .08;
    if (hemiLight) hemiLight.intensity *= .22;
    scene.environmentIntensity = .42;
  }

  return {
    floors, inside, nearestElevator, rideTo, update, presentInterior,
    interior(p){if(!inside(p))return null;return {minX:room.x0+.3,maxX:room.x1-.3,minZ:room.z0+.3,maxZ:room.z1-.3,ceiling:[6.85,11.55,16.2][currentFloor]};},
    isRiding: () => ride.active,
    floorY: () => floorSurface.top,
    entrance: {x:front+5, z:bz},
    building,
  };
}

