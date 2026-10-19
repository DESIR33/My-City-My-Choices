// Axes describe travel direction, including pedestrians reading the far-side head.
export const SIGNAL_CYCLE = 22;
export function vehicleSignalState(axis, seconds) {
  const phase = ((seconds % SIGNAL_CYCLE) + SIGNAL_CYCLE) % SIGNAL_CYCLE;
  if (axis === 'NS') return phase < 8 ? 'green' : phase < 10 ? 'amber' : 'red';
  return phase >= 11 && phase < 19 ? 'green' : phase >= 19 && phase < 21 ? 'amber' : 'red';
}
export function pedestrianSignalState(axis, seconds) {
  return vehicleSignalState(axis, seconds) === 'green' ? 'walk' : 'stop';
}
