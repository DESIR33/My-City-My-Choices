// Pointer IDs keep the movement thumb, camera finger, and action buttons independent.
export function createTouchControls({canvas, isBlocked, onLook, onInteract, onVehicle, onJump=()=>{}, onSignal=()=>{}}) {
  const root = document.querySelector('#mobileControls'), stick = document.querySelector('#moveStick');
  const knob = document.querySelector('#stickKnob'), action = document.querySelector('#touchInteract');
  const vehicle = document.querySelector('#touchVehicle'), run = document.querySelector('#touchRun');
  const jump=document.querySelector('#touchJump');
  const brake = document.querySelector('#touchBrake'), hint = document.querySelector('#touchHint');
  const state = {x: 0, forward: 0, run: false, brake: false};
  const coarse = window.matchMedia('(any-pointer: coarse)');
  let enabled = coarse.matches, movement = null, look = null, lastX = 0, lastY = 0;
  const held = new Map();
  function clear() {
    movement = look = null; held.clear(); state.x = state.forward = 0; state.run = state.brake = false;
    knob.style.transform = 'translate(-50%,-50%)';
    for (const button of [run, brake]) button.classList.remove('held');
  }
  function enable(value) { enabled = value; document.body.classList.toggle('touch-mode', value); if (!value) clear(); }
  enable(enabled); coarse.addEventListener('change', e => enable(e.matches));
  // Hybrid tablets can start with a mouse; a real touch enables the touch layout.
  window.addEventListener('pointerdown', e => { if (e.pointerType === 'touch' && !enabled) enable(true); }, {capture: true});
  function move(e) {
    const rect = stick.getBoundingClientRect(), radius = rect.width * .34;
    let x = (e.clientX - rect.left - rect.width / 2) / radius, y = (e.clientY - rect.top - rect.height / 2) / radius;
    const length = Math.hypot(x, y); if (length > 1) {x /= length; y /= length;}
    state.x = Math.abs(x) < .12 ? 0 : x; state.forward = Math.abs(y) < .12 ? 0 : -y;
    knob.style.transform = `translate(calc(-50% + ${x * radius}px),calc(-50% + ${y * radius}px))`;
  }
  stick.addEventListener('pointerdown', e => {
    if (!enabled || isBlocked() || movement !== null) return;
    e.preventDefault(); movement = e.pointerId; stick.setPointerCapture(e.pointerId); move(e);
  });
  stick.addEventListener('pointermove', e => {if (movement === e.pointerId && !isBlocked()) {e.preventDefault(); move(e);}});
  function releaseStick(e) {if (movement !== e.pointerId) return; movement = null; state.x = state.forward = 0; knob.style.transform = 'translate(-50%,-50%)';}
  for (const type of ['pointerup', 'pointercancel', 'lostpointercapture']) stick.addEventListener(type, releaseStick);
  canvas.addEventListener('pointerdown', e => {
    if (!enabled || e.pointerType === 'mouse' || isBlocked() || look !== null) return;
    e.preventDefault(); look = e.pointerId; lastX = e.clientX; lastY = e.clientY; canvas.setPointerCapture(e.pointerId);
    hint.classList.add('used');
  });
  canvas.addEventListener('pointermove', e => {
    if (look !== e.pointerId || isBlocked()) return;
    e.preventDefault(); onLook(e.clientX - lastX, e.clientY - lastY); lastX = e.clientX; lastY = e.clientY;
  });
  for (const type of ['pointerup', 'pointercancel', 'lostpointercapture']) canvas.addEventListener(type, e => {if (look === e.pointerId) look = null;});
  action.addEventListener('click', () => {if (enabled && !isBlocked()) onInteract();});
  jump.addEventListener('click',()=>{if(!enabled||isBlocked()||jump.hidden)return;if(signalKind)onSignal();else onJump();});
  vehicle.addEventListener('click', () => {if (enabled && !isBlocked()) onVehicle();});
  function hold(button, key) {
    button.addEventListener('pointerdown', e => {
      if (!enabled || isBlocked()) return; e.preventDefault(); button.setPointerCapture(e.pointerId);
      held.set(e.pointerId, key); state[key] = true; button.classList.add('held');
    });
    const end = e => {if (held.get(e.pointerId) !== key) return; held.delete(e.pointerId); state[key] = [...held.values()].includes(key); button.classList.toggle('held', state[key]);};
    for (const type of ['pointerup', 'pointercancel', 'lostpointercapture']) button.addEventListener(type, end);
  }
  hold(run, 'run'); hold(brake, 'brake');
  window.addEventListener('blur', clear); document.addEventListener('visibilitychange', () => {if (document.hidden) clear();});
  let lastMode = '', wasBlocked = false, signalKind=null;
  function update({driving, rideKind=null, canJump=true, near}) {
    const blocked = isBlocked(); root.hidden = !enabled || blocked;
    if (blocked && !wasBlocked) clear(); wasBlocked = blocked;
    if (!enabled) return;
    action.disabled = !near || driving; vehicle.disabled = !driving && !['car','ride'].includes(near?.kind);
    action.hidden = !near || driving || ['car','ride'].includes(near?.kind);
    vehicle.hidden = vehicle.disabled;
    vehicle.textContent = rideKind ? 'Dismount' : near?.kind==='ride' ? 'Ride' : driving ? 'Exit car' : 'Enter car';
    action.textContent = near?.kind==='courier'?(near.phase==='pickup'?'Collect parcel':'Deliver parcel'):near?.kind === 'stand' ? 'Stand up' : near?.kind === 'seat' ? 'Sit' : near?.kind === 'ride' ? 'Ride' : near?.kind === 'car' ? 'Enter car' : near?.kind === 'parent' || near?.kind === 'maya' ? 'Talk' : 'Interact';
    const mode = driving ? 'drive' : 'walk';
    if (mode !== lastMode) {clear(); lastMode = mode;}
    signalKind=driving?(rideKind||'car'):null;jump.hidden=!driving&&!canJump;jump.textContent=signalKind==='bicycle'?'Bell':signalKind?'Horn':'Jump';jump.setAttribute('aria-label',signalKind==='bicycle'?'Ring bicycle bell':signalKind?'Sound vehicle horn':'Jump');
    run.hidden = driving&&!rideKind;run.textContent=rideKind?'Walk back':'Run';brake.hidden=!driving;brake.textContent=rideKind?'Rear brake':'Handbrake';
    stick.setAttribute('aria-label', rideKind ? 'Drag up to pedal or accelerate, down to brake; hold Walk back with down to move backward' : driving ? 'Drag up to accelerate, down to brake or reverse; left and right to steer' : 'Drag to walk');
    document.querySelector('#stickLabel').textContent = driving ? 'STEER / DRIVE' : 'MOVE';
    hint.textContent = driving ? 'Drag the city to look · Stick to drive' : 'Drag the city to look around';
  }
  return {state, update, clear, get enabled() {return enabled;}};
}
