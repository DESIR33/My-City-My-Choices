const streets = [-120, -60, 0, 60, 120];
const posts = [-90, 90];
const models = ['neighbor', 'casual', 'mom', 'maya'];
const names = [
  'Rivera', 'Brooks', 'Chen', 'Davis', 'Flores', 'Grant', 'Harris', 'James',
  'Kim', 'Lewis', 'Miller', 'Nguyen', 'Ortiz', 'Patel', 'Reed', 'Santos',
  'Taylor', 'Walker', 'Young', 'Zamora',
];

// Each beat is on a sidewalk, away from crosswalks and building footprints.
export const POLICE_ROSTER = streets.flatMap((street, streetIndex) =>
  [-1, 1].flatMap((side, sideIndex) => posts.map((z, postIndex) => {
    const index = streetIndex * 4 + sideIndex * 2 + postIndex;
    return {
      id: `maple-officer-${String(index + 1).padStart(2, '0')}`,
      name: `Officer ${names[index]}`,
      model: models[index % models.length],
      x: street + side * 9,
      z,
      heading: side < 0 ? Math.PI / 2 : -Math.PI / 2,
      patrolAxis: 'z',
      patrolDistance: 3.5,
      speed: .38 + (index % 3) * .06,
    };
  })),
);

export function advancePolicePatrol(patrol, dt) {
  if (patrol.dwell > 0) {
    patrol.dwell = Math.max(0, patrol.dwell - dt);
    return patrol;
  }
  patrol.z += patrol.direction * patrol.speed * dt;
  if (patrol.z >= patrol.high) {
    patrol.z = patrol.high;
    patrol.direction = -1;
    patrol.dwell = .7;
  } else if (patrol.z <= patrol.low) {
    patrol.z = patrol.low;
    patrol.direction = 1;
    patrol.dwell = .7;
  }
  return patrol;
}
