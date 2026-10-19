import * as THREE from 'three';
import {RoundedBoxGeometry} from 'three/addons/geometries/RoundedBoxGeometry.js';

// Draw the symbols as filled silhouettes, then sample an LED matrix. No fonts,
// emoji, external images, or unreadable miniature WALK / DON'T WALK labels.
export function pedestrianSymbolCanvas(state) {
  const mask = document.createElement('canvas'); mask.width = mask.height = 256;
  const q = mask.getContext('2d'); q.fillStyle = '#fff';
  if (state === 'walk') {
    q.beginPath(); q.arc(137, 45, 17, 0, Math.PI * 2); q.fill();
    const shapes = [
      [[115,72],[139,72],[151,109],[145,144],[118,144],[106,108]],
      [[116,75],[98,87],[76,116],[89,127],[111,102],[127,94]],
      [[138,75],[160,95],[188,102],[184,119],[151,110],[130,93]],
      [[119,134],[139,138],[122,181],[86,220],[69,207],[101,169]],
      [[129,136],[147,133],[155,169],[181,207],[164,220],[136,179]],
    ];
    for (const points of shapes) {
      q.beginPath(); points.forEach(([x,y],i)=>i?q.lineTo(x,y):q.moveTo(x,y)); q.closePath(); q.fill();
    }
  } else {
    // Four distinct rounded fingers, a broad palm, bent thumb, and short wrist.
    for (const [x,y,w,h] of [[84,71,18,79],[107,48,18,91],[130,36,18,104],[153,54,18,97],[94,111,76,67],[110,170,43,42]]) {
      q.beginPath(); q.roundRect(x,y,w,h,9); q.fill();
    }
    q.beginPath(); q.moveTo(98,128); q.lineTo(76,109); q.bezierCurveTo(62,99,52,112,62,126);
    q.lineTo(83,161); q.bezierCurveTo(90,175,102,182,119,183); q.lineTo(158,179); q.lineTo(166,144); q.closePath(); q.fill();
  }
  const image = document.createElement('canvas'); image.width = image.height = 384;
  const c = image.getContext('2d'); c.fillStyle = '#070b0d'; c.fillRect(0,0,384,384);
  const pixels = q.getImageData(0,0,256,256).data, on = state === 'walk' ? '#f2f8ef' : '#ff8038';
  for (let row=0; row<64; row++) for (let col=0; col<64; col++) {
    const lit = pixels[((row*4+2)*256+col*4+2)*4+3] > 96;
    c.fillStyle = lit ? on : '#111719';
    c.beginPath(); c.arc(col*6+3,row*6+3,lit?2.6:1.25,0,Math.PI*2); c.fill();
  }
  return image;
}

const materials = new Map();
export function pedestrianSignalMaterial(state) {
  if (!materials.has(state)) {
    const map = new THREE.CanvasTexture(pedestrianSymbolCanvas(state));
    map.colorSpace = THREE.SRGBColorSpace; map.anisotropy = 4;
    const material = new THREE.MeshBasicMaterial({map, toneMapped:false});
    material.name = 'Pedestrian '+state+' LED display'; materials.set(state,material);
  }
  return materials.get(state);
}

const housingMaterial = new THREE.MeshStandardMaterial({color:0x20282b,metalness:.42,roughness:.48});
const bezelMaterial = new THREE.MeshStandardMaterial({color:0x101619,metalness:.23,roughness:.66});
const screwMaterial = new THREE.MeshStandardMaterial({color:0x929da0,metalness:.8,roughness:.35});
const housingGeometry = new RoundedBoxGeometry(.58,.65,.25,3,.038);
const bezelGeometry = new RoundedBoxGeometry(.51,.55,.025,2,.018);
const faceGeometry = new THREE.PlaneGeometry(.445,.445);
const screwGeometry = new THREE.SphereGeometry(.009,6,4);
export function createPedestrianSignal() {
  const group = new THREE.Group(); group.name = 'Pedestrian signal housing';
  const housing = new THREE.Mesh(housingGeometry,housingMaterial); housing.castShadow = housing.receiveShadow = true; group.add(housing);
  const bezel = new THREE.Mesh(bezelGeometry,bezelMaterial); bezel.position.z=.136; group.add(bezel);
  const face = new THREE.Mesh(faceGeometry,pedestrianSignalMaterial('stop')); face.name='Pedestrian LED face'; face.position.set(0,0,.151); group.add(face);
  // Recessed square lens and a three-sided sun hood maintain contrast in daylight.
  for (const side of [-1,1]) {
    const rail=new THREE.Mesh(new THREE.BoxGeometry(.028,.54,.13),housingMaterial); rail.position.set(side*.259,0,.192); rail.castShadow=true; group.add(rail);
    for (const y of [-.293,.293]) {const screw=new THREE.Mesh(screwGeometry,screwMaterial);screw.position.set(side*.251,y,.132);group.add(screw);}
  }
  const hood = new THREE.Mesh(new THREE.BoxGeometry(.546,.033,.16),housingMaterial); hood.position.set(0,.275,.198); hood.castShadow=true; group.add(hood);
  return {group,face};
}
