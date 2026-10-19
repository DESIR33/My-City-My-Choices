// Road-scale, planar vehicle dynamics. Distances are metres; time is seconds.
// Fixed substeps keep keyboard and analog touch behavior independent of frame rate.
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const approach = (v, target, rate, dt) => v + (target - v) * (1 - Math.exp(-rate * dt));
const angleDifference = (a, b) => Math.atan2(Math.sin(a - b), Math.cos(a - b));
export const VEHICLE = Object.freeze({width: 2.02, length: 4.72, wheelbase: 2.79, track: 1.84, wheelRadius: .327, mass: 1480, maxSpeed: 18, maxReverse: 4.5});
export function createVehicleState(x = 0, z = 0, heading = 0) {
  return {x, z, heading, travelHeading: heading, speed: 0, steering: 0, yawRate: 0, acceleration: 0, lateralAcceleration: 0, throttle: 0, brake: 0, direction: 1, reverseWait: 0, wheelTravel: 0, pitch: 0, pitchVelocity: 0, roll: 0, rollVelocity: 0, rpm: 800, gear: 'P', impact: 0};
}
export function vehicleFootprint(x, z, heading, width = VEHICLE.width, length = VEHICLE.length) {
  const s = Math.sin(heading), c = Math.cos(heading);
  return [[-width / 2, -length / 2], [width / 2, -length / 2], [width / 2, length / 2], [-width / 2, length / 2]].map(([a, b]) => ({x: x + a * c + b * s, z: z - a * s + b * c}));
}
export function rectanglesOverlap(a, b) {
  for (const polygon of [a, b]) for (let i = 0; i < 2; i++) {
    const edge = {x: polygon[i + 1].x - polygon[i].x, z: polygon[i + 1].z - polygon[i].z}, axis = {x: -edge.z, z: edge.x};
    const range = points => points.map(p => p.x * axis.x + p.z * axis.z);
    const ap = range(a), bp = range(b);
    if (Math.max(...ap) <= Math.min(...bp) || Math.max(...bp) <= Math.min(...ap)) return false;
  }
  return true;
}
function suspension(state, key, target, dt) {
  const velocity = key + 'Velocity';
  state[velocity] += ((target - state[key]) * 75 - state[velocity] * 15) * dt;
  state[key] += state[velocity] * dt;
}
export function advanceVehicle(state, input, elapsed, canOccupy = () => true) {
  if(state.disabled){state.speed=state.throttle=state.yawRate=state.acceleration=0;state.brake=1;state.gear='P';state.rpm=0;return {collided:false,distance:0,impactSpeed:0};}
  const duration = clamp(Number.isFinite(elapsed) ? elapsed : 0, 0, .1);
  const direction = clamp(input.forward || 0, -1, 1), steer = clamp(input.steer || 0, -1, 1);
  const handbrake = !!input.handbrake;
  let remaining = duration, collided = false, distance = 0,impactSpeed=0;
  while (remaining > 1e-8) {
    const dt = Math.min(remaining, 1 / 120); remaining -= dt;
    const speed = state.speed, abs = Math.abs(speed), previousHeading = state.heading;
    const reversing = Math.abs(direction) > .08 && Math.sign(direction) !== state.direction;
    const opposite = Math.abs(direction) > .08 && abs > .1 && Math.sign(direction) !== Math.sign(speed);
    if (reversing && abs < .1) {
      state.reverseWait += dt;
      if (state.reverseWait >= .35) {state.direction = Math.sign(direction); state.reverseWait = 0;}
    } else state.reverseWait = 0;
    const braking = handbrake || opposite || (reversing && abs < .1);
    state.throttle = approach(state.throttle, braking ? 0 : Math.abs(direction), 7, dt);
    state.brake = approach(state.brake, braking ? (handbrake ? .8 : Math.abs(direction)) : 0, 16, dt);
    const cornerLoad=clamp(Math.abs(state.lateralAcceleration)/9.81,0,.85);
    const engine = state.throttle * (6500 / VEHICLE.mass) * (1 - .68 * clamp(abs / VEHICLE.maxSpeed, 0, 1))*(1-.25*cornerLoad);
    const resistance = abs > .02 ? .13 + .00042 * abs * abs + .012 * abs + (state.throttle<.05?.045*abs:0) : 0;
    let acceleration = state.direction * engine - Math.sign(speed) * (resistance + state.brake * 9.2);
    if (braking && abs < .1) {state.speed = 0; acceleration = 0; state.throttle = 0;}
    else {
      state.speed = clamp(speed + acceleration * dt, -VEHICLE.maxReverse, VEHICLE.maxSpeed);
      if ((braking || Math.abs(direction) < .08) && Math.sign(speed) !== Math.sign(state.speed)) state.speed = 0;
      if (Math.abs(state.speed) < .02 && Math.abs(direction) < .08) state.speed = 0;
    }
    state.acceleration = (state.speed - speed) / dt;
    const maxSteer = .57 / (1 + abs * .055);
    state.steering = approach(state.steering, steer * maxSteer, Math.abs(steer) > .05 ? 5.5 : 7, dt);
    const beta = Math.atan(.5 * Math.tan(state.steering));
    const grip = (handbrake ? .48 : .92) * 9.81;
    const desiredYaw = state.speed * Math.cos(beta) * Math.tan(state.steering) / VEHICLE.wheelbase;
    const limitedYaw = clamp(desiredYaw, -grip / Math.max(abs, 1), grip / Math.max(abs, 1));
    state.yawRate = Math.abs(state.speed) < .05 ? 0 : approach(state.yawRate, limitedYaw, 10, dt);
    state.heading += state.yawRate * dt;
    const targetHeading = state.heading + beta;
    const follow = clamp(angleDifference(targetHeading, state.travelHeading), -grip / Math.max(abs, 1) * dt, grip / Math.max(abs, 1) * dt);
    state.travelHeading += follow;
    if (abs < .1) state.travelHeading = state.heading;
    const step = state.speed * dt;
    const x = state.x + Math.sin(state.travelHeading) * step, z = state.z + Math.cos(state.travelHeading) * step;
    if (canOccupy(x, z, state.heading)) {state.x = x; state.z = z; state.wheelTravel += step; distance += Math.abs(step);}
    else {
      state.impact = Math.max(state.impact, Math.abs(state.speed));
      impactSpeed=Math.max(impactSpeed,Math.abs(state.speed));
      state.speed = 0; state.throttle = 0; state.yawRate = 0; state.heading = previousHeading; state.travelHeading = previousHeading;
      collided = true;
      remaining=0;
    }
    state.lateralAcceleration = state.speed * state.yawRate;
    suspension(state, 'pitch', clamp(state.acceleration * -.005, -.045, .035), dt);
    suspension(state, 'roll', clamp(state.lateralAcceleration * .006, -.055, .055), dt);
    state.impact *= Math.exp(-8 * dt);
  }
  const abs = Math.abs(state.speed), gear = abs < .04 && Math.abs(direction) < .08 ? 'P' : state.direction < 0 ? 'R' : String(abs < 5.5 ? 1 : abs < 10 ? 2 : abs < 15 ? 3 : 4);
  state.gear = gear;
  const ratio = gear === 'R' ? 3.1 : [0, 3.4, 2.2, 1.5, 1.05][Number(gear)] || 0;
  state.rpm = approach(state.rpm, Math.max(800 + state.throttle * 900, abs / VEHICLE.wheelRadius * 9.55 * ratio * 3.1), 7, duration);
  return {collided, distance,impactSpeed};
}
