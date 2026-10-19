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
  texture.anisotropy = 8;
  texture.generateMipmaps = true;
  texture.minFilter = THREE.LinearMipmapLinearFilter;
  texture.magFilter = THREE.LinearFilter;
  texture.needsUpdate = true;
  return texture;
}
function marble(tint, vein) {
  return dataTexture(512, 512, (x, y) => {
    const n = fbm(x*.008, y*.008), warp = fbm(x*.004+2, y*.004);
    const band = Math.abs(Math.sin(x*.008 + y*.003 + warp*4 + n*2));
    const v = Math.pow(band, 4)*.55;
    const grout = Math.min(x%256, 256-(x%256)) < 3 || Math.min(y%256, 256-(y%256)) < 3;
    const speckle = (hash(x, y)-.5)*5;
    return tint.map((channel, i) => {
      const stone = channel*(1-v)+vein[i]*v+speckle;
      return Math.max(0, Math.min(255, grout ? stone*.78 : stone));
    });
  }, 1, 1);
}
function wood() {
  return dataTexture(256, 256, (x, y) => {
    const g = Math.sin((y + fbm(x*.04, y*.01)*90)*.35)*.5+.5;
    const tone = 92+g*70+(hash(x,y)-.5)*12;
    return [tone*.62, tone*.4, tone*.24];
  });
}
function fabric(rgb) {
  return dataTexture(128, 128, (x, y) => {
    const weave = ((x+y)%4<2?.06:-.04)+(hash(x,y)-.5)*.08;
    return rgb.map(channel => Math.max(0, Math.min(255, channel*(1+weave))));
  });
}
function carpet() {
  return dataTexture(256, 256, (x, y) => {
    const pile = fbm(x*.08, y*.08);
    const dye = .9+pile*.12;
    return [92*dye, 78*dye, 70*dye];
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

export function createFlamingoHotel({scene, building, obstacles, groundSurfaces, visualKit}) {
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

  const plaster = new THREE.MeshStandardMaterial({color:0xf4f1eb, roughness:.86, metalness:0, side:THREE.DoubleSide, fog:false});
  const stoneMap = marble([232, 226, 218], [168, 160, 150]);
  stoneMap.repeat.set(.42, .42);
  const stone = new THREE.MeshPhysicalMaterial({map:stoneMap, bumpMap:stoneMap, bumpScale:.006, color:0xd9d0c6, roughness:.55, metalness:0, clearcoat:.08, clearcoatRoughness:.6, side:THREE.DoubleSide, fog:false});
  const darkStoneMap = marble([92, 90, 88], [48, 46, 44]);
  darkStoneMap.repeat.set(.55, .55);
  const darkStone = new THREE.MeshPhysicalMaterial({map:darkStoneMap, bumpMap:darkStoneMap, bumpScale:.008, roughness:.46, metalness:.08, clearcoat:.08, side:THREE.DoubleSide, fog:false});
  const woodMap = wood(); woodMap.repeat.set(1.1, 1.1);
  const walnut = new THREE.MeshStandardMaterial({map:woodMap, bumpMap:woodMap, bumpScale:.03, roughness:.48, metalness:0, side:THREE.DoubleSide, fog:false});
  const steel = new THREE.MeshPhysicalMaterial({color:0xc8ccd1, roughness:.24, metalness:1, clearcoat:.45, clearcoatRoughness:.2, envMapIntensity:1.15, side:THREE.DoubleSide, fog:false});
  const brass = new THREE.MeshPhysicalMaterial({color:0xb08d57, roughness:.3, metalness:1, clearcoat:.4, clearcoatRoughness:.22, envMapIntensity:1.25, side:THREE.DoubleSide, fog:false});
  const glass = new THREE.MeshPhysicalMaterial({color:0xe7eeea, roughness:.04, metalness:0, transmission:1, thickness:.04, ior:1.5, transparent:true, side:THREE.DoubleSide, fog:false});
  const charcoalMap = fabric([58, 60, 64]);
  const charcoal = new THREE.MeshStandardMaterial({map:charcoalMap, bumpMap:charcoalMap, bumpScale:.015, roughness:.92, side:THREE.DoubleSide, fog:false});
  const sandMap = fabric([214, 204, 190]);
  const sand = new THREE.MeshStandardMaterial({map:sandMap, bumpMap:sandMap, bumpScale:.012, roughness:.9, side:THREE.DoubleSide, fog:false});
  const carpetMap = carpet(); carpetMap.repeat.set(1.6, 1.6);
  const carpetMat = new THREE.MeshStandardMaterial({map:carpetMap, bumpMap:carpetMap, bumpScale:.04, roughness:.96, side:THREE.DoubleSide, fog:false});
  const linen = new THREE.MeshStandardMaterial({color:0xf7f4ef, roughness:.84, side:THREE.DoubleSide, fog:false});
  const leafMat = new THREE.MeshStandardMaterial({color:0x2d5a3c, roughness:.8, side:THREE.DoubleSide, fog:false});
  const glowMat = new THREE.MeshStandardMaterial({color:0xfff4e4, emissive:0xffe2b8, emissiveIntensity:2.4, roughness:.4, fog:false});
  const coveMat = new THREE.MeshStandardMaterial({color:0xfff6ea, emissive:0xffe6c4, emissiveIntensity:1.6, roughness:.5, side:THREE.DoubleSide, fog:false});
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

  const floorSurface = {minX:back+.7, maxX:front-.15, minZ:zNorth+.7, maxZ:zSouth-.7, top:floors[0].y};
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
  slab(interior, stone, floors[0].y);
  slab(interior, carpetMat, floors[1].y);
  slab(interior, carpetMat, floors[2].y);
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
  box(interior, darkStone, bx, .21, zSouth-.64, building.w-2.4, 1.08, .06);
  box(interior, brass, bx, 1.28, zSouth-.6, building.w-2.4, .035, .045);
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
  function table(x, z) {
    const g = new THREE.Group(); g.position.set(x, floors[0].y, z); interior.add(g);
    cyl(g, brass, 0, 0, 0, .04, .34, .04);
    cyl(g, brass, 0, .34, 0, .28, .025, .28);
    const top = new THREE.Mesh(new THREE.CylinderGeometry(.55, .55, .02, 32), glass);
    top.position.y = .38; g.add(top);
    blocker(x, z, 1.15, 1.15, floorSets[0]);
  }
  function tree(x, z, h = 2.5) {
    const g = new THREE.Group(); g.position.set(x, floors[0].y, z); interior.add(g);
    cyl(g, darkStone, 0, 0, 0, .32, .42, .32, 20);
    cyl(g, walnut, 0, .42, 0, .06, h*.45, .06, 8);
    for (let i = 0; i < 9; i++) {
      const leaf = new THREE.Mesh(new THREE.PlaneGeometry(.55, .28), leafMat);
      const a = i/9*Math.PI*2;
      leaf.position.set(Math.cos(a)*.28, .55+h*.45+Math.sin(i)* .08, Math.sin(a)*.28);
      leaf.rotation.y = a; leaf.rotation.x = -.4; g.add(leaf);
    }
    const crown = new THREE.Mesh(sphere, leafMat); crown.scale.set(.55, .7, .55); crown.position.y = .7+h*.45; g.add(crown);
    blocker(x, z, .7, .7, floorSets[0]);
  }
  sofa(X(9), Z(8), 0, charcoal, 2.7);
  sofa(X(9), Z(-8), Math.PI, sand, 2.7);
  sofa(X(-16), Z(6), Math.PI/2, charcoal, 2.3);
  chair(X(6.2), Z(5.2), .4);
  chair(X(7.4), Z(3.4), 2.2);
  chair(X(12.6), Z(5.6), -1.2);
  table(X(8.6), Z(4.6));
  table(X(-15.2), Z(-6));
  tree(X(16), Z(2), 2.6);
  tree(X(-16), Z(-4), 2.3);
  tree(X(16), Z(-14), 2.2);
  box(interior, carpetMat, X(8.4), floors[0].y+.01, Z(2.2), 8.4, .02, 9.2);
  box(interior, carpetMat, X(-6.2), floors[0].y+.01, Z(10.5), 3.2, .02, 8.4);

  // Reception: stone top, walnut case, monitor, lamp. East of the elevator aisle.
  const deskX = X(7.2), deskZ = Z(13.2);
  rounded(interior, walnut, deskX, floors[0].y, deskZ, 4.4, .92, .85, .04);
  rounded(interior, stone, deskX, floors[0].y+.92, deskZ, 4.6, .07, 1.0, .02);
  box(interior, steel, deskX+.2, floors[0].y+1.02, deskZ-.15, .72, .42, .04);
  box(interior, dark, deskX+.2, floors[0].y+1.44, deskZ-.15, .62, .03, .04);
  cyl(interior, brass, deskX-1.5, floors[0].y+1.02, deskZ, .04, .42, .04);
  const shade = new THREE.Mesh(sphere, glowMat); shade.scale.set(.16, .1, .16); shade.position.set(deskX-1.5, floors[0].y+1.5, deskZ); interior.add(shade);
  cyl(interior, darkStone, deskX+1.6, floors[0].y+1.05, deskZ+.05, .1, .28, .1, 16);
  const bloom = new THREE.Mesh(sphere, new THREE.MeshStandardMaterial({color:0xd9a598, roughness:.7, fog:false}));
  bloom.scale.set(.22, .16, .22); bloom.position.set(deskX+1.6, floors[0].y+1.42, deskZ+.05); interior.add(bloom);
  blocker(deskX, deskZ, 4.6, 1.05, floorSets[0]);
  const deskSign = plaque('RECEPTION', 1.8, .32, {bg:'#141311', fg:'#f3eee6', font:'500 54px sans-serif', accent:'#b08d57'});
  deskSign.position.set(deskX, floors[0].y+1.7, deskZ-.5); interior.add(deskSign);

  // Columns only collide on the lobby; upper floors keep this aisle clear.
  for (const [lx, lz] of [[14, -12], [-14, 12]]) {
    cyl(interior, stone, X(lx), floors[0].y, Z(lz), .32, 6.5, .32, 20);
    cyl(interior, brass, X(lx), floors[0].y+6.5, Z(lz), .38, .08, .38, 20);
    blocker(X(lx), Z(lz), .75, .75, floorSets[0]);
  }
  for (const lx of [-2, 4, 12]) {
    const pendant = new THREE.Group(); pendant.position.set(X(lx), 0, Z(2)); interior.add(pendant);
    cyl(pendant, brass, 0, 5.15, 0, .012, 1.5, .012, 8);
    const bulb = new THREE.Mesh(sphere, glowMat); bulb.scale.set(.22, .16, .22); bulb.position.y = 4.35; pendant.add(bulb);
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
    const lamp = new THREE.PointLight(0xfff1dd, 18, 4.5, 2); lamp.position.set(0, 2.35, 0); group.add(lamp); cabLights.push(lamp);
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

  // Sky lounge furnishings. Collision is active only on that floor.
  function loungeSeat(x, z, yaw) {
    const g = new THREE.Group(); g.position.set(x, floors[1].y, z); g.rotation.y = yaw; interior.add(g);
    rounded(g, charcoal, 0, .3, 0, 2.2, .26, .8, .05);
    rounded(g, charcoal, 0, .52, -.32, 2.2, .42, .14, .03);
    blocker(x, z, Math.abs(Math.cos(yaw))*2.2+Math.abs(Math.sin(yaw))*.85, Math.abs(Math.sin(yaw))*2.2+Math.abs(Math.cos(yaw))*.85, floorSets[1]);
  }
  loungeSeat(X(8), Z(6), .2);
  loungeSeat(X(-15), Z(4), Math.PI/2);
  const barX = X(14), barZ = Z(-6);
  rounded(interior, walnut, barX, floors[1].y, barZ, 3.6, 1.05, .7, .03);
  rounded(interior, stone, barX, floors[1].y+1.05, barZ, 3.8, .06, .85, .02);
  blocker(barX, barZ, 3.8, .9, floorSets[1]);
  for (let i = -1; i <= 1; i++) {
    cyl(interior, brass, barX+i*.8, floors[1].y, barZ-1.05, .16, .08, .16, 16);
    cyl(interior, steel, barX+i*.8, floors[1].y, barZ-1.05, .035, .7, .035, 10);
    blocker(barX+i*.8, barZ-1.05, .4, .4, floorSets[1]);
  }
  for (const lx of [-2, 6]) {
    cyl(interior, brass, X(lx), floors[1].y+3.4, Z(2), .012, 1.1, .012, 8);
    const bulb = new THREE.Mesh(sphere, glowMat); bulb.scale.set(.18, .14, .18); bulb.position.set(X(lx), floors[1].y+2.8, Z(2)); interior.add(bulb);
  }
  const loungeSign = plaque('SKY LOUNGE', 3.4, .48, {bg:'#141311', fg:'#f3eee6', font:'500 64px sans-serif', accent:'#b08d57'});
  loungeSign.position.set(X(8), floors[1].y+2.4, zSouth-1.05); loungeSign.rotation.y = Math.PI; interior.add(loungeSign);

  // Guest floor: a corridor out of the elevators and one open suite.
  const suiteWallZ = Z(8.6);
  blocker(X(-16), suiteWallZ, 12, .16, floorSets[2]);
  blocker(X(12), suiteWallZ, 16, .16, floorSets[2]);
  // Door gap around local x = 2 (world X(2)), between the two wall segments.
  const bedX = X(6), bedZ = Z(-8);
  rounded(interior, walnut, bedX, floors[2].y, bedZ-.7, 1.7, .7, .08, .02);
  rounded(interior, linen, bedX, floors[2].y+.15, bedZ+.15, 1.7, .28, 2.15, .05);
  rounded(interior, sand, bedX-.25, floors[2].y+.45, bedZ-.55, .55, .16, .35, .04);
  rounded(interior, sand, bedX+.25, floors[2].y+.45, bedZ-.55, .55, .16, .35, .04);
  blocker(bedX, bedZ, 1.9, 2.4, floorSets[2]);
  for (const side of [-1, 1]) {
    rounded(interior, walnut, bedX+side*1.25, floors[2].y, bedZ-.4, .48, .52, .42, .02);
    cyl(interior, brass, bedX+side*1.25, floors[2].y+.55, bedZ-.4, .03, .28, .03, 8);
    const lamp = new THREE.Mesh(sphere, glowMat); lamp.scale.set(.1, .08, .1); lamp.position.set(bedX+side*1.25, floors[2].y+.9, bedZ-.4); interior.add(lamp);
    blocker(bedX+side*1.25, bedZ-.4, .55, .5, floorSets[2]);
  }
  const suiteSign = plaque('SUITE  312', 2.2, .36, {bg:'#141311', fg:'#f6f1e8', font:'500 58px sans-serif'});
  suiteSign.position.set(X(2), floors[2].y+2.15, suiteWallZ-.12); interior.add(suiteSign);
  for (const lx of [-14, -8, 10, 16]) {
    box(interior, walnut, X(lx), floors[2].y, Z(12.2), 1.05, 2.25, .08);
    const num = plaque(String(300+Math.abs(lx)), .7, .28, {bg:'#1a1917', fg:'#f3eee6', font:'600 48px sans-serif'});
    num.position.set(X(lx), floors[2].y+1.45, Z(12.05)); interior.add(num);
  }

  // Sliding street doors in the deco opening.
  const doorL = box(entrance, glass, front-.15, .08, bz-doorHalf/2, .05, 2.85, doorHalf-.08);
  const doorR = box(entrance, glass, front-.15, .08, bz+doorHalf/2, .05, 2.85, doorHalf-.08);
  box(entrance, steel, front-.12, .08, bz-doorHalf, .1, 2.95, .08);
  box(entrance, steel, front-.12, .08, bz+doorHalf, .1, 2.95, .08);
  const doorHomeL = doorL.position.z, doorHomeR = doorR.position.z;

  const lights = [];
  function spot(x, y, z, tx, tz, intensity, distance) {
    const light = new THREE.SpotLight(0xfff0dc, intensity, distance, .75, .55, 1.3);
    light.position.set(x, y, z); light.target.position.set(tx, .2, tz);
    light.castShadow = false; scene.add(light, light.target); lights.push(light); return light;
  }
  spot(X(0), 6.2, Z(4), X(2), Z(8), 900, 18);
  spot(X(8), 5.8, Z(-2), X(9), Z(-6), 640, 16);
  spot(X(-8), 5.8, Z(8), X(-6), Z(14), 720, 16);
  spot(X(0), floors[1].y+3.2, Z(2), X(4), Z(4), 520, 12);
  spot(X(4), floors[2].y+2.8, Z(-2), bedX, bedZ, 420, 11);
  function warm(x, y, z, intensity, distance) {
    const light = new THREE.PointLight(0xffe3c4, intensity, distance, 2);
    light.position.set(x, y, z); light.castShadow = false; scene.add(light); lights.push(light);
  }
  warm(X(2), 3.4, Z(2), 90, 18);
  warm(X(8), 2.2, Z(6), 36, 8);
  warm(deskX, 2.15, deskZ-1.2, 28, 7);
  warm(X(-6), floors[1].y+2.2, Z(2), 46, 12);
  warm(X(2), floors[2].y+2.1, Z(0), 40, 11);
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
    shell.visible = entrance.visible = !cutaway;
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
    if (!cutaway || !sunLight) return;
    sunLight.intensity *= .1;
    if (hemiLight) hemiLight.intensity *= .28;
    scene.environmentIntensity = .55;
  }

  return {
    floors, inside, nearestElevator, rideTo, update, presentInterior,
    isRiding: () => ride.active,
    floorY: () => floorSurface.top,
    entrance: {x:front+5, z:bz},
    building,
  };
}
