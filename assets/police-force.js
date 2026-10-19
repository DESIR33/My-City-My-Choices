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

export const POLICE_STATION = Object.freeze({x:150,z:-30});
export const STATION_CARS = Object.freeze([
  {x:136.4,z:-39,heading:-Math.PI/2},
  {x:136.4,z:-30,heading:-Math.PI/2},
  {x:136.4,z:-21,heading:-Math.PI/2},
]);
export const PATROL_CAR_ROUTES = Object.freeze([
  {x:125,z:-145,heading:0,speed:6},
  {x:115,z:145,heading:Math.PI,speed:-5.6},
]);

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
