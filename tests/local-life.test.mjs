import assert from 'node:assert/strict';
import {cityLightingAt} from '../assets/city-time.js';
import {clockHour, skyFromDate, skyHourForLocal, sunInstants} from '../assets/local-sky.js';
import {clockInForJob, freshErrand, jobSteps, readJobBoard, restoreErrand, wearOutfit} from '../assets/city-errands.js';
import {createVisitor, stepVisitor, visitorInside} from '../assets/interior-visits.js';

const nyc = sunInstants(new Date(Date.UTC(2026, 9, 19, 16, 0, 0)), 40.7128, -74.006);
const sunset = clockHour(nyc.sunset, -4 * 60);
const sunrise = clockHour(nyc.sunrise, -4 * 60);
assert.ok(sunset > 17.7 && sunset < 18.8, `Oct 19 sunset in New York should be early evening, got ${sunset.toFixed(2)}`);
assert.ok(sunrise > 6.5 && sunrise < 7.8, `Oct 19 sunrise in New York should be morning, got ${sunrise.toFixed(2)}`);
assert.ok(Math.abs(skyHourForLocal(sunset, sunrise, sunset) - 18.25) < 1e-9, 'Painted sunset lands on the real sunset');
assert.ok(cityLightingAt(skyHourForLocal(sunset, sunrise, sunset)).night > .5, 'The sky is in sunset at local sunset');
assert.ok(cityLightingAt(skyHourForLocal(sunset + 2.5, sunrise, sunset)).night > .95, 'Night follows a real sunset');
assert.equal(cityLightingAt(skyHourForLocal((sunrise + sunset) / 2, sunrise, sunset)).night, 0, 'Midday stays daylight');
assert.equal(cityLightingAt(skyHourForLocal(sunrise + 2, sunrise, sunset)).night, 0, 'Side lights are off after morning');
const winter = sunInstants(new Date(Date.UTC(2026, 11, 21, 17, 0, 0)), 40.7128, -74.006);
const summer = sunInstants(new Date(Date.UTC(2026, 5, 21, 20, 0, 0)), 40.7128, -74.006);
assert.ok(clockHour(winter.sunset, -5 * 60) < clockHour(summer.sunset, -4 * 60) - 2, 'Summer sunset is hours later than winter sunset');
const live = skyFromDate(new Date());
assert.ok(live.skyHour >= 0 && live.skyHour < 24);
assert.ok(live.sunset > live.sunrise);

let errand = freshErrand();
assert.equal(clockInForJob(errand).ok, false);
errand = readJobBoard(errand);
assert.equal(jobSteps(errand)[0].done, true);
assert.equal(clockInForJob(errand).ok, false, 'Work clothes are required before the shift');
errand = wearOutfit(errand, 'work').state;
assert.equal(jobSteps(errand)[1].done, true);
assert.equal(errand.outfit, 'work');
const paid = clockInForJob(errand);
assert.equal(paid.ok, true);
assert.equal(paid.pay, 2);
assert.ok(jobSteps(paid.state).every(step => step.done));
assert.equal(clockInForJob(paid.state).ok, false, 'The same shift cannot pay twice');
assert.equal(restoreErrand(paid.state).paid, true);
assert.equal(restoreErrand({outfit:'nope'}).outfit, 'everyday');
const changed = wearOutfit(freshErrand(), 'market');
assert.equal(changed.outfit.shirt, 0xb85c4a);

const cafe = {minX:-40.5, maxX:-19.5, minZ:-40.5, maxZ:-27};
const route = [{x:-30, z:-21}, {x:-30, z:-26.15}, {x:-30, z:-30.2}, {x:-35.4, z:-28.35}];
let visitor = createVisitor(route, {index:0, speed:8});
assert.equal(visitorInside(visitor, cafe), false, 'The visit starts outside');
for (let i = 0; i < 40 && !visitorInside(visitor, cafe); i++) stepVisitor(visitor, .5);
assert.equal(visitorInside(visitor, cafe), true, 'The neighbor walks in through the door');
const startedInside = createVisitor(route, {index:3, dwell:2});
assert.equal(visitorInside(startedInside, cafe), true, 'A neighbor can already be visible inside');

console.log('Local life passed: real sunset, night after sunset, work clothes, one-time job pay, and a neighbor walking inside.');

