// Convert camera-relative walking input into world movement.
// The follow camera sits behind the player and looks toward the city, so its
// screen-right axis points opposite the naive world-X direction at yaw zero.
export function characterMovementVector(yaw, forward, right) {
  return {
    x: -Math.sin(yaw) * forward - Math.cos(yaw) * right,
    z: Math.cos(yaw) * forward - Math.sin(yaw) * right,
  };
}
