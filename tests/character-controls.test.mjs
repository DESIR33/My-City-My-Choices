import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
const source = await readFile(new URL('../assets/character-controls.js', import.meta.url), 'utf8')
  .catch(() => readFile(new URL('../dist/assets/character-controls.js', import.meta.url), 'utf8'));
const {characterMovementVector, characterFacingYaw} = await import('data:text/javascript;base64,' + Buffer.from(source).toString('base64'));

const nearly = (a, b) => assert.ok(Math.abs(a - b) < 1e-10, `${a} should equal ${b}`);
for (const yaw of [0, Math.PI / 4, Math.PI / 2, Math.PI, -Math.PI / 3]) {
  const right = characterMovementVector(yaw, 0, 1);
  const cameraRight = {x: -Math.cos(yaw), z: -Math.sin(yaw)};
  nearly(right.x, cameraRight.x);
  nearly(right.z, cameraRight.z);
  const left = characterMovementVector(yaw, 0, -1);
  nearly(left.x, -right.x);
  nearly(left.z, -right.z);
  const forward = characterMovementVector(yaw, 1, 0);
  nearly(forward.x, -Math.sin(yaw));
  nearly(forward.z, Math.cos(yaw));
  nearly(forward.x * cameraRight.x + forward.z * cameraRight.z, 0);
}

nearly(characterFacingYaw(0, 1), 0);
nearly(characterFacingYaw(1, 0), Math.PI / 2);
nearly(characterFacingYaw(-1, 0), -Math.PI / 2);
nearly(Math.abs(characterFacingYaw(0, -1)), Math.PI);
assert.equal(characterFacingYaw(0, 0), null);

console.log('Character movement and facing passed: movement follows the camera axes and moving characters face their travel direction.');
