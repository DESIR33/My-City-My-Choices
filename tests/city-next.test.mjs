import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
const read = path => readFile(new URL('../' + path, import.meta.url), 'utf8');
const load = async path => import('data:text/javascript;base64,' + Buffer.from(await read(path)).toString('base64'));
const next = await load('assets/city-next.js');
const world = await load('assets/world-rules.js');
const days = await load('assets/business-days.js');

const doorPath = (place, obstacles, stopZ) => {
  const front = place.z + place.d / 2;
  for (let z = front + 2; z >= stopZ; z -= 0.2) assert.equal(next.pointBlocked(obstacles, place.x, z), false, 'Door and aisle stay open at ' + place.x + ',' + z.toFixed(2));
};
doorPath(next.SCHOOL, next.shellObstacles(next.SCHOOL), next.SCHOOL.desk.z);
doorPath(next.GROCERY, next.groceryObstacles(), next.GROCERY.counter.z);
assert.equal(next.pointBlocked(next.groceryObstacles(), next.GROCERY.counter.x, next.GROCERY.counter.z), false, 'The grocery counter is reachable');
assert.equal(next.insideGrocery({x:next.GROCERY.counter.x, z:next.GROCERY.counter.z}), true);
assert.equal(next.insideSchool({x:next.SCHOOL.desk.x, z:next.SCHOOL.desk.z}), true);
assert.equal(next.insideSchool(next.SCHOOL.entry), false);
doorPath(next.NORTH_BLOCK, next.northBlockObstacles(), next.NORTH_BLOCK.lobby.z);
for (const room of [next.NORTH_BLOCK.restaurant, next.NORTH_BLOCK.office]) {
  for (let z = next.NORTH_BLOCK.lobby.z; z >= room.z; z -= 0.2) assert.equal(next.pointBlocked(next.northBlockObstacles(), room.x, z), false, 'Room door stays open');
}
for (const spot of [next.NORTH_BLOCK.lobby, next.NORTH_BLOCK.restaurant, next.NORTH_BLOCK.office]) {
  assert.equal(next.pointBlocked(next.northBlockObstacles(), spot.x, spot.z), false, 'North room spot stays open');
  assert.equal(next.insideNorthBlock(spot), true);
}
assert.equal(next.northRoom(next.NORTH_BLOCK.lobby), 'lobby');
assert.equal(next.northRoom(next.NORTH_BLOCK.restaurant), 'restaurant');
assert.equal(next.northRoom(next.NORTH_BLOCK.office), 'office');
assert.equal(next.northRoom({x:0, z:-1140}), null);

const price = next.schoolLessonFor(1), contract = next.schoolLessonFor(2), bus = next.schoolLessonFor(3);
assert.equal(price.kind, 'price'); assert.equal(contract.kind, 'contract'); assert.equal(bus.kind, 'timetable');
assert.equal(next.schoolLessonFor(4).kind, 'price');
assert.equal(next.groceryUnitPrice(next.GROCERY_AISLE[0], price), 75);
assert.equal(next.groceryUnitPrice(next.GROCERY_AISLE[0], contract), 100);

const short = next.fitGroceryBag(['cereal', 'bread', 'snacks', 'milk'], 200, null);
assert.equal(short.ok, true); assert.equal(short.smaller, true);
assert.deepEqual(short.kept.map(item => item.id), ['bread']);
assert.ok(short.dropped.some(item => item.id === 'milk'));
assert.equal(short.kept.reduce((sum, item) => sum + item.price, 0), short.spent);
assert.ok(short.spent <= 200);
assert.ok(short.dropped.some(item => item.id === 'cereal'));
const priced = next.fitGroceryBag(['bread', 'milk', 'apples'], 300, price);
assert.equal(priced.smaller, false); assert.equal(priced.spent, 300);
const broke = next.fitGroceryBag(['bread', 'snacks'], 0, null);
assert.equal(broke.ok, false); assert.equal(broke.wallet, 0); assert.equal(broke.spent, 0);
let bag = next.freshCityNext();
bag = next.toggleGroceryItem(bag, 'bread'); bag = next.toggleGroceryItem(bag, 'cereal'); bag = next.toggleGroceryItem(bag, 'snacks');
const bought = next.checkoutGrocery(bag, 120, null, 4);
assert.equal(bought.ok, true); assert.equal(bought.fit.smaller, true); assert.equal(bought.wallet, 20);
assert.deepEqual(bought.state.groceryBasket, []);
assert.equal(bought.state.groceryReceipts.length, 1);
assert.equal(next.checkoutGrocery(bought.state, 20, null).ok, false);
assert.equal(next.restoreCityNext(bought.state).grocerySpent, bought.state.grocerySpent);

const used = next.busFareQuote({walletCents:100, fuelLitres:8, burnPerMetre:0.006, fuelPackPrice:50, packSize:2, hasOwnCar:true});
const efficient = next.busFareQuote({walletCents:50, fuelLitres:8, burnPerMetre:0.0045, fuelPackPrice:40, packSize:2, hasOwnCar:true});
assert.equal(used.fare, 100); assert.ok(used.metres > 900 && used.metres < 1100);
assert.equal(used.cheaper, 'bus'); assert.equal(efficient.cheaper, 'drive');
assert.equal(efficient.canRide, false);
assert.equal(next.busFareQuote({hasOwnCar:false, walletCents:0}).cheaper, 'walk');
const walked = next.rideBus(50, 'maple');
assert.equal(walked.ok, false); assert.equal(walked.wallet, 50);
const rode = next.rideBus(100, 'northstar');
assert.equal(rode.ok, true); assert.equal(rode.wallet, 0); assert.equal(rode.to.id, 'maple');

assert.equal(next.buyNorthMeal(149, 'soup').ok, false);
assert.equal(next.buyNorthMeal(150, 'soup').wallet, 0);
assert.equal(next.askAboutRoom().rate, 4500);
let parcel = {status:'none', day:null};
parcel = next.takeParcel(parcel, 3).parcel;
assert.equal(next.dropParcel({status:'none'}, 3).ok, false);
const dropped = next.dropParcel(parcel, 3);
assert.equal(dropped.ok, true); assert.equal(next.takeParcel(dropped.parcel, 3).ok, false);
assert.equal(next.takeParcel(dropped.parcel, 4).ok, true);

const errandDay = 8;
assert.equal(next.errandDestination(errandDay), 'bakery');
assert.equal(next.errandDestination(7), 'market');
const early = next.pickupErrand({errand:next.freshErrand(), day:errandDay, jobStamp:null, stage:'customers'});
assert.equal(early.ok, false);
const picked = next.pickupErrand({errand:next.freshErrand(), day:errandDay, jobStamp:null, stage:'done'});
assert.equal(picked.errand.place, 'bakery'); assert.equal(picked.errand.status, 'carrying');
const wrong = next.deliverErrand({...picked, place:'market', day:errandDay, stage:'done'});
assert.equal(wrong.ok, false); assert.equal(wrong.pay, 0); assert.equal(wrong.jobStamp, undefined);
const paid = next.deliverErrand({errand:picked.errand, place:'bakery', day:errandDay, jobStamp:null, stage:'done'});
assert.equal(paid.ok, true); assert.equal(paid.pay, 200); assert.equal(paid.jobStamp, 'after-8');
assert.equal(next.deliverErrand({errand:paid.errand, place:'bakery', day:errandDay, jobStamp:paid.jobStamp, stage:'done'}).ok, false);
assert.equal(next.pickupErrand({errand:paid.errand, day:errandDay, jobStamp:paid.jobStamp, stage:'done'}).ok, false);

const rain = days.morningEvent(6, days.freshBusinessStory());
assert.equal(rain.id, 'rain');
const wet = next.cityAtmosphere({stage:'customers', eventId:rain.id, eventName:rain.name});
assert.equal(wet.rain, true); assert.equal(wet.walkScale, 0.82); assert.equal(wet.cafeBusy, true); assert.equal(wet.marketOpen, true); assert.equal(wet.evening, false);
const night = next.cityAtmosphere({stage:'done', eventName:'Rain in the forecast'});
assert.equal(night.evening, true); assert.equal(night.marketOpen, false); assert.ok(night.windowGlow > 0.5); assert.ok(night.headlight > 2);
const clear = next.cityAtmosphere({stage:'customers', eventId:'fair', eventName:'The neighborhood street fair'});
assert.equal(clear.rain, false); assert.equal(clear.walkScale, 1);

const park = world.RIVER_PARK;
assert.equal(world.worldWalkable((park.minX + park.maxX) / 2, (park.minZ + park.maxZ) / 2), true, 'The riverfront park is walkable');
assert.equal(world.worldWalkable(park.maxX, -330), true);
for (const x of [-15, 15, 60, -60]) assert.equal(world.worldWalkable(x, -660), false, 'The river stays closed');
assert.equal(world.worldDrivable(-30, -330), false, 'The park is not a road');
for (let z = -150; z >= -1150; z -= 2) assert.equal(world.worldWalkable(9.3, z), true);
assert.equal(next.restoreCityNext(null).busRides, 0);
assert.equal(next.restoreCityNext({schoolNote:{day:2, kind:'contract'}}).schoolNote.kind, 'contract');
assert.equal(next.restoreCityNext({schoolNote:{day:2, kind:'price'}}).schoolNote, null);
console.log('City next passed: school prices, smaller grocery bags, bus fare versus fuel, north rooms, walking errand, rain and evening, and the riverfront park.');
