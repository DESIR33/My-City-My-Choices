import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
const source = await readFile(new URL('../assets/touch-controls.js', import.meta.url), 'utf8').catch(() => readFile(new URL('../assets/touch-controls.js', import.meta.url), 'utf8'));
const {createTouchControls} = await import('data:text/javascript;base64,' + Buffer.from(source).toString('base64'));
class Element {
  constructor() {this.events = new Map(); this.style = {}; this.hidden = false; this.disabled = false; this.classes = new Set(); this.classList = {add: c => this.classes.add(c), remove: c => this.classes.delete(c), toggle: (c, on) => on ? this.classes.add(c) : this.classes.delete(c)};}
  addEventListener(type, fn) {if (!this.events.has(type)) this.events.set(type, []); this.events.get(type).push(fn);}
  emit(type, values = {}) {const e = {pointerId: 1, pointerType: 'touch', clientX: 68, clientY: 68, preventDefault() {}, ...values}; for (const fn of this.events.get(type) || []) fn(e);}
  setPointerCapture(id) {this.captured = id;}
  setAttribute(name, value) {this[name] = value;}
  getBoundingClientRect() {return {left: 0, top: 0, width: 136, height: 136};}
}
function setup(touch = true) {
  const elements = new Map(), body = new Element(), doc = new Element(), win = new Element(), media = new Element();
  doc.body = body; doc.querySelector = id => {if (!elements.has(id)) elements.set(id, new Element()); return elements.get(id);};
  media.matches = touch; win.matchMedia = () => media; globalThis.document = doc; globalThis.window = win;
  const canvas = new Element(), looks = []; let blocked = false, interactions = 0, vehicles = 0, jumps = 0, signals = 0;
  const controls = createTouchControls({canvas, isBlocked: () => blocked, onLook: (...d) => looks.push(d), onInteract: () => interactions++, onVehicle: () => vehicles++, onJump: () => jumps++, onSignal:()=>signals++});
  return {controls, canvas, looks, body, doc, win, media, el: id => doc.querySelector(id), block: b => blocked = b, jumpCount:()=>jumps,signalCount:()=>signals, counts: () => ({interactions, vehicles})};
}
{
  const t = setup(); const {controls: c} = t;
  c.update({driving: false, near: {kind: 'parent'}});
  assert.ok(c.enabled && t.body.classes.has('touch-mode')); assert.equal(t.el('#mobileControls').hidden, false);
  assert.equal(t.el('#touchInteract').textContent, 'Talk'); assert.equal(t.el('#touchVehicle').disabled, true);
  t.el('#moveStick').emit('pointerdown', {clientX: 114, clientY: 22});
  assert.ok(c.state.forward > .6 && c.state.x > .6); assert.ok(Math.hypot(c.state.forward, c.state.x) <= 1.00001);
  t.canvas.emit('pointerdown', {pointerId: 2, clientX: 230, clientY: 90});
  t.canvas.emit('pointermove', {pointerId: 3, clientX: 290, clientY: 95}); assert.equal(t.looks.length, 0);
  t.canvas.emit('pointermove', {pointerId: 2, clientX: 250, clientY: 105}); assert.deepEqual(t.looks, [[20, 15]]);
  assert.ok(c.state.forward > .6, 'Looking leaves movement active');
  t.el('#touchRun').emit('pointerdown', {pointerId: 3}); assert.ok(c.state.run);
  t.el('#touchRun').emit('pointercancel', {pointerId: 3}); assert.equal(c.state.run, false);
  t.el('#moveStick').emit('lostpointercapture'); assert.equal(c.state.forward, 0); assert.equal(c.state.x, 0);
  t.el('#touchInteract').emit('click'); assert.equal(t.counts().interactions, 1);
  c.update({driving:false,near:{kind:'courier',phase:'pickup'}});assert.equal(t.el('#touchInteract').textContent,'Collect parcel');c.update({driving:false,near:{kind:'courier',phase:'delivery'}});assert.equal(t.el('#touchInteract').textContent,'Deliver parcel');
  c.update({driving: true, near: null}); assert.equal(t.el('#touchRun').hidden, true); assert.equal(t.el('#touchBrake').hidden, false);
  assert.equal(t.el('#touchVehicle').textContent, 'Exit car'); assert.equal(t.el('#touchVehicle').disabled, false);
  t.el('#touchBrake').emit('pointerdown', {pointerId: 4}); assert.ok(c.state.brake);
  t.win.emit('blur'); assert.equal(c.state.brake, false);
  c.update({driving:true,rideKind:'motorcycle',near:null});assert.equal(t.el('#touchRun').hidden,false);assert.equal(t.el('#touchRun').textContent,'Walk back');assert.equal(t.el('#touchVehicle').textContent,'Dismount');t.el('#touchRun').emit('pointerdown',{pointerId:8});assert.ok(c.state.run);t.el('#touchRun').emit('pointerup',{pointerId:8});assert.equal(c.state.run,false);
  t.el('#touchVehicle').emit('click'); assert.equal(t.counts().vehicles, 1);
  t.el('#moveStick').emit('pointerdown', {clientY: 15}); assert.ok(c.state.forward > 0);
  t.block(true); c.update({driving: false, near: null}); assert.equal(t.el('#mobileControls').hidden, true); assert.equal(c.state.forward, 0);
  t.el('#touchInteract').emit('click'); t.el('#touchVehicle').emit('click'); assert.deepEqual(t.counts(), {interactions: 1, vehicles: 1});
  t.block(false); c.update({driving: false, near: null}); assert.equal(t.el('#touchInteract').disabled, true);
  t.el('#touchRun').emit('pointerdown', {pointerId: 5}); t.doc.hidden = true; t.doc.emit('visibilitychange'); assert.equal(c.state.run, false);
}
{
  const t = setup(false); t.controls.update({driving: false, near: null});
  assert.equal(t.controls.enabled, false); assert.equal(t.el('#mobileControls').hidden, true); assert.equal(t.body.classes.has('touch-mode'), false);
  t.win.emit('pointerdown', {pointerType: 'mouse'}); assert.equal(t.controls.enabled, false);
  t.win.emit('pointerdown', {pointerType: 'touch'}); assert.equal(t.controls.enabled, true);
  t.media.emit('change', {matches: false}); assert.equal(t.controls.enabled, false);
}
console.log('Touch input passed: simultaneous movement/camera, pointer ownership, cancellation, actions, driving controls, menu/focus resets, and desktop-only keyboard layout.');

{
 const t=setup();t.controls.update({driving:false,near:null});assert.equal(t.el('#touchInteract').hidden,true);assert.equal(t.el('#touchVehicle').hidden,true);assert.equal(t.el('#touchRun').hidden,false);
 t.controls.update({driving:false,near:{kind:'parent'}});assert.equal(t.el('#touchInteract').hidden,false);assert.equal(t.el('#touchVehicle').hidden,true);
 t.controls.update({driving:false,near:{kind:'car'}});assert.equal(t.el('#touchInteract').hidden,true);assert.equal(t.el('#touchVehicle').hidden,false,'Only one enter-vehicle action appears');
 t.controls.update({driving:true,near:null});assert.equal(t.el('#touchInteract').hidden,true);assert.equal(t.el('#touchVehicle').hidden,false);assert.equal(t.el('#touchRun').hidden,true);assert.equal(t.el('#touchBrake').hidden,false);
 t.controls.update({driving:true,rideKind:'bicycle',near:null});assert.equal(t.el('#touchRun').hidden,false);assert.equal(t.el('#touchVehicle').textContent,'Dismount');
}
const jumpUI=setup(true);jumpUI.controls.update({driving:false,near:null});assert.equal(jumpUI.el('#touchJump').hidden,false);jumpUI.el('#touchJump').emit('click');assert.equal(jumpUI.jumpCount(),1);jumpUI.block(true);jumpUI.el('#touchJump').emit('click');assert.equal(jumpUI.jumpCount(),1);jumpUI.block(false);jumpUI.controls.update({driving:true,rideKind:'motorcycle',near:null});assert.equal(jumpUI.el('#touchJump').hidden,false);assert.equal(jumpUI.el('#touchJump').textContent,'Horn');jumpUI.el('#touchJump').emit('click');assert.equal(jumpUI.signalCount(),1);assert.equal(jumpUI.jumpCount(),1);jumpUI.controls.update({driving:true,rideKind:'bicycle',near:null});assert.equal(jumpUI.el('#touchJump').textContent,'Bell');jumpUI.el('#touchJump').emit('click');assert.equal(jumpUI.signalCount(),2);jumpUI.controls.update({driving:true,near:null});assert.equal(jumpUI.el('#touchJump').textContent,'Horn');jumpUI.controls.update({driving:false,canJump:false,near:null});assert.equal(jumpUI.el('#touchJump').hidden,true);
