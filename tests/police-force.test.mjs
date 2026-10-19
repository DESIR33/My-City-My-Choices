import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
const source = await readFile(new URL('../assets/police-force.js', import.meta.url), 'utf8')
  .catch(() => readFile(new URL('../dist/assets/police-force.js', import.meta.url), 'utf8'));
const {POLICE_ROSTER,advancePolicePatrol} = await import('data:text/javascript;base64,' + Buffer.from(source).toString('base64'));
assert.equal(POLICE_ROSTER.length, 20);
assert.equal(new Set(POLICE_ROSTER.map(o => `${o.x},${o.z}`)).size, 20, 'Every officer has a distinct post');
assert.equal(new Set(POLICE_ROSTER.map(o => o.name)).size, 20, 'Every officer has a distinct name');
assert.ok(POLICE_ROSTER.every(o => [-120, -60, 0, 60, 120].some(street => Math.abs(Math.abs(o.x - street) - 9) < 1e-9)), 'Posts sit on sidewalk strips beside streets');
assert.ok(POLICE_ROSTER.every(o => [-90, 90].includes(o.z)), 'Posts stay between crossings');
assert.ok(POLICE_ROSTER.every(o => ['neighbor', 'casual', 'mom', 'maya'].includes(o.model)));
assert.ok(POLICE_ROSTER.every(o => o.patrolDistance > 0 && o.speed > 0));
const patrol={z:0,low:-2,high:2,speed:1,direction:1,dwell:0};
advancePolicePatrol(patrol,5);assert.equal(patrol.z,2);assert.equal(patrol.direction,-1);assert.equal(patrol.dwell,.7);
advancePolicePatrol(patrol,.4);assert.equal(patrol.z,2,'Officers pause briefly at the end of their beat');
advancePolicePatrol(patrol,.3);advancePolicePatrol(patrol,2);assert.equal(patrol.z,0);assert.equal(patrol.direction,-1);
console.log('Police roster passed: 20 unique officers on sidewalk patrol posts, with varied character models.');
