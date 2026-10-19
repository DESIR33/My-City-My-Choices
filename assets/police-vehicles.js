import * as THREE from 'three';

const boxGeometry = new THREE.BoxGeometry(1, 1, 1);
function box(parent, material, x, y, z, w, h, d) {
  const mesh = new THREE.Mesh(boxGeometry, material);
  mesh.position.set(x, y, z); mesh.scale.set(w, h, d);
  mesh.castShadow = mesh.receiveShadow = true; parent.add(mesh); return mesh;
}

function doorDecal() {
  const canvas = document.createElement('canvas'); canvas.width = 512; canvas.height = 160;
  const c = canvas.getContext('2d');
  c.fillStyle = '#f4f1e8'; c.fillRect(0, 0, 512, 160);
  c.fillStyle = '#1b3248'; c.font = '900 72px system-ui'; c.textAlign = 'center'; c.textBaseline = 'middle';
  c.fillText('POLICE', 256, 83);
  c.strokeStyle = '#c4a65d'; c.lineWidth = 8; c.strokeRect(8, 8, 496, 144);
  const texture = new THREE.CanvasTexture(canvas); texture.colorSpace = THREE.SRGBColorSpace;
  const material = new THREE.MeshStandardMaterial({map: texture, roughness: .68, side: THREE.DoubleSide});
  return material;
}
const sharedDoorDecal = doorDecal();

export function addPoliceVehicleDetails(vehicle, index = 0) {
  const body = vehicle.userData.vehicleVisual?.body;
  if (!body) throw new Error('Police livery requires a mounted vehicle.');
  const navy = new THREE.MeshStandardMaterial({color:0x152433,roughness:.42,metalness:.2});
  const white = new THREE.MeshStandardMaterial({color:0xe8e6de,roughness:.54,metalness:.08});
  const trim = new THREE.MeshStandardMaterial({color:0x9e8952,roughness:.45,metalness:.35});
  const red = new THREE.MeshStandardMaterial({color:0xfa3343,roughness:.25,emissive:0xd31326,emissiveIntensity:.18});
  const blue = new THREE.MeshStandardMaterial({color:0x3589ff,roughness:.25,emissive:0x1455dc,emissiveIntensity:.18});

  // White side doors and readable city police markings.
  for (const side of [-1, 1]) {
    box(body, white, side*.932, .77, .06, .035, .38, 1.18);
    const decal = new THREE.Mesh(new THREE.PlaneGeometry(.92, .29), sharedDoorDecal);
    decal.position.set(side*.955, .78, .06); decal.rotation.y = side > 0 ? Math.PI/2 : -Math.PI/2;
    decal.castShadow = true; body.add(decal);
    box(body, trim, side*.94, .51, .08, .022, .045, 1.22);
  }

  // Low profile LED light bar with alternating red and blue modules.
  box(body, navy, 0, 1.365, -.02, .88, .075, .24);
  const redModule = box(body, red, -.24, 1.42, -.02, .28, .10, .2);
  const blueModule = box(body, blue, .24, 1.42, -.02, .28, .10, .2);
  box(body, trim, 0, 1.414, -.02, .12, .08, .19);
  const badge = new THREE.Mesh(new THREE.CircleGeometry(.105, 8), trim);
  badge.position.set(0, .92, 2.226); body.add(badge);

  vehicle.userData.policeVehicle = {red:redModule.material,blue:blueModule.material,phase:index%4*.11,active:false};
  vehicle.userData.role = 'police-patrol-car';
}

export function updatePoliceVehicleLights(vehicle, time) {
  const lights = vehicle.userData.policeVehicle;
  if (!lights) return;
  const phase = (time * 3.8 + lights.phase) % 1;
  lights.red.emissiveIntensity = lights.active && phase < .5 ? 3.2 : .18;
  lights.blue.emissiveIntensity = lights.active && phase >= .5 ? 3.2 : .18;
}
