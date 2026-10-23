import * as THREE from 'three';

// Objective markers: a soft ring on the ground, a tall light beam you can spot
// from across the city, and a small arrow that bobs above the spot. The beam
// fades out as the camera comes close, so a camera standing at (or inside) a
// marker never looks through a coloured column; up close, the ring and arrow
// do the work, like the subtle markers in modern open-world games.
export const BEAM_FADE=Object.freeze({near:4,far:12,opacity:.14});
const ARROW_OPACITY=.92;

export function beamOpacity(distance){const {near,far,opacity}=BEAM_FADE;return opacity*Math.min(1,Math.max(0,(distance-near)/(far-near)));}

export function createObjectiveMarker(scene,x,z,color){
 const g=new THREE.Group();g.position.set(x,0,z);g.name='Objective marker';
 const ring=new THREE.Mesh(new THREE.TorusGeometry(1.15,.06,8,32),new THREE.MeshBasicMaterial({color,transparent:true,opacity:.85,depthWrite:false}));ring.rotation.x=-Math.PI/2;ring.position.y=.08;g.add(ring);
 const beam=new THREE.Mesh(new THREE.CylinderGeometry(.04,.26,3.5,10,1,true),new THREE.MeshBasicMaterial({color,transparent:true,opacity:0,depthWrite:false}));beam.position.y=1.8;beam.visible=false;g.add(beam);
 const arrow=new THREE.Mesh(new THREE.ConeGeometry(.17,.34,4),new THREE.MeshBasicMaterial({color,transparent:true,opacity:ARROW_OPACITY,depthWrite:false}));arrow.rotation.x=Math.PI;arrow.position.y=2.45;g.add(arrow);
 g.userData.objective={ring,beam,arrow,phase:(x*.37+z*.11)%(Math.PI*2)};
 scene.add(g);return g;
}

const world=new THREE.Vector3();
// Call once per frame after the camera moves.
export function updateObjectiveMarkers(markers,cameraPosition,time=0){
 for(const g of markers){const m=g.userData.objective;if(!m||!g.visible)continue;
  g.getWorldPosition(world);const d=Math.hypot(cameraPosition.x-world.x,cameraPosition.z-world.z),o=beamOpacity(d);
  m.beam.material.opacity=o;m.beam.visible=o>.001;
  m.arrow.position.y=2.45+Math.sin(time*2.2+m.phase)*.09;m.arrow.rotation.y=time*1.4+m.phase;
  // The arrow floats at head height; fade it when the camera is right beside it.
  const close=Math.hypot(d,cameraPosition.y-(world.y+2.45));m.arrow.material.opacity=ARROW_OPACITY*Math.min(1,Math.max(0,(close-1.5)/2));m.arrow.visible=m.arrow.material.opacity>.001;
 }
}
