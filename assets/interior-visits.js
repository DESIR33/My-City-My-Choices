// Neighbors walk in through a doorway, pause where the room is visible, then leave again.
export function createVisitor(points, {speed = 1.1, index = 0, dwell = 0} = {}) {
  const i = Math.max(0, Math.min(index, points.length - 1));
  const here = points[i];
  return {points, speed, index:i, x:here.x, z:here.z, dwell, holding:dwell > 0};
}

export function stepVisitor(visitor, dt) {
  if (!visitor?.points?.length || !Number.isFinite(dt) || dt <= 0) return visitor;
  const target = visitor.points[visitor.index];
  const dx = target.x - visitor.x, dz = target.z - visitor.z;
  const dist = Math.hypot(dx, dz);
  if (dist < 0.12) {
    if (!visitor.holding) {visitor.holding = true; visitor.dwell = visitor.index >= 2 ? 3.2 : 0.08;}
    visitor.dwell -= dt;
    if (visitor.dwell <= 0) {
      visitor.index = (visitor.index + 1) % visitor.points.length;
      visitor.holding = false;
      visitor.dwell = 0;
    }
    return visitor;
  }
  const step = Math.min(dist, visitor.speed * dt);
  visitor.x += dx / dist * step;
  visitor.z += dz / dist * step;
  visitor.holding = false;
  return visitor;
}

export function visitorInside(visitor, bounds) {
  return visitor.x > bounds.minX && visitor.x < bounds.maxX && visitor.z > bounds.minZ && visitor.z < bounds.maxZ;
}
