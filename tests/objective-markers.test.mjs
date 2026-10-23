import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import * as THREE from 'three';
import {BEAM_FADE,beamOpacity,createObjectiveMarker,updateObjectiveMarkers} from '../assets/objective-markers.js';

// Fade curve: invisible up close, full strength from across the street.
assert.equal(beamOpacity(0),0);assert.equal(beamOpacity(BEAM_FADE.near),0);assert.equal(beamOpacity(BEAM_FADE.far),BEAM_FADE.opacity);assert.equal(beamOpacity(500),BEAM_FADE.opacity);
assert.ok(beamOpacity(8)>0&&beamOpacity(8)<BEAM_FADE.opacity);

const scene=new THREE.Scene(),m=createObjectiveMarker(scene,-83,-27,0x9bd4ad),{ring,beam,arrow}=m.userData.objective;
assert.equal(m.parent,scene);assert.ok(ring&&beam&&arrow);
// The story starts with the camera 0.3 m from Mom's marker: the beam must not wash over the view.
updateObjectiveMarkers([m],new THREE.Vector3(-83,2.6,-27.3),0);assert.equal(beam.visible,false,'camera at the marker sees no column');assert.equal(beam.material.opacity,0);
assert.ok(ring.visible,'the ground ring still marks the spot');assert.equal(arrow.visible,false,'the arrow fades when the camera is beside it');
updateObjectiveMarkers([m],new THREE.Vector3(-83,1.7,-23),0);assert.ok(arrow.visible&&arrow.material.opacity>.5,'a few metres away the arrow shows over the target');assert.equal(beam.visible,false);
// From far away the beam guides the player there.
updateObjectiveMarkers([m],new THREE.Vector3(-83,2.6,10),0);assert.equal(beam.visible,true);assert.equal(beam.material.opacity,BEAM_FADE.opacity);
// The arrow bobs and turns over time; hidden markers are skipped.
const y0=arrow.position.y;updateObjectiveMarkers([m],new THREE.Vector3(-83,2.6,10),.4);assert.notEqual(arrow.position.y,y0);assert.ok(Math.abs(arrow.position.y-2.45)<=.091);
m.visible=false;beam.material.opacity=.05;updateObjectiveMarkers([m],new THREE.Vector3(-83,2,-27),1);assert.equal(beam.material.opacity,.05,'hidden markers are left alone');
for(const part of [ring,beam,arrow])assert.equal(part.material.depthWrite,false,'translucent parts never hide what is behind them');

const index=await readFile(new URL('../index.html',import.meta.url),'utf8');
assert.match(index,/function marker\(x,z,color\)\{const g=createObjectiveMarker\(scene,x,z,color\);objectiveMarkers\.push\(g\)/);
const after=index.indexOf('cameraFollow(dt);'),call=index.indexOf('updateObjectiveMarkers(objectiveMarkers,camera.position');assert.ok(after>0&&call>after&&call-after<600,'markers update after the camera moves, in the same frame');
console.log('Objective markers passed: beam fades near the camera (including the story start), guides from afar, ring and bobbing arrow up close, and game wiring.');
