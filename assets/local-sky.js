// Real local sunset. The art timeline in city-time.js stays the same;
// this maps the player's actual clock so sunset art lands on today's sunset.
const RAD = Math.PI / 180;
const DAY_MS = 86400000;
const J1970 = 2440588;
const J2000 = 2451545;
const OBLIQUITY = RAD * 23.4397;

const toDays = date => date.valueOf() / DAY_MS - 0.5 + J1970 - J2000;
const solarMeanAnomaly = d => RAD * (357.5291 + 0.98560028 * d);
const eclipticLongitude = M => M + RAD * (1.9148 * Math.sin(M) + 0.02 * Math.sin(2 * M) + 0.0003 * Math.sin(3 * M)) + RAD * 102.9372 + Math.PI;
const declination = (L, b = 0) => Math.asin(Math.sin(b) * Math.cos(OBLIQUITY) + Math.cos(b) * Math.sin(OBLIQUITY) * Math.sin(L));
const julianCycle = (d, lw) => Math.round(d - 0.0009 - lw / (2 * Math.PI));
const approxTransit = (Ht, lw, n) => 0.0009 + (Ht + lw) / (2 * Math.PI) + n;
const solarTransit = (ds, M, L) => J2000 + ds + 0.0053 * Math.sin(M) - 0.0069 * Math.sin(2 * L);
const hourAngle = (h, phi, dec) => {
  const cos = (Math.sin(h) - Math.sin(phi) * Math.sin(dec)) / (Math.cos(phi) * Math.cos(dec));
  if (cos >= 1) return 0;
  if (cos <= -1) return Math.PI;
  return Math.acos(cos);
};
const fromJulian = j => new Date((j + 0.5 - J1970) * DAY_MS);

export function guessLatitude(timeZone = '') {
  if (/Honolulu/.test(timeZone)) return 21;
  if (/Anchorage|Alaska/.test(timeZone)) return 61;
  if (/Los_Angeles|Vancouver|Tijuana|Phoenix/.test(timeZone)) return 34;
  if (/Denver|Boise|Edmonton/.test(timeZone)) return 40;
  if (/Chicago|Winnipeg|Mexico_City|Dallas/.test(timeZone)) return 42;
  if (/New_York|Toronto|Detroit|Miami|Atlanta/.test(timeZone)) return 41;
  if (/Halifax|Puerto_Rico/.test(timeZone)) return 45;
  if (/Sao_Paulo|Buenos_Aires/.test(timeZone)) return -23;
  if (/London|Lisbon|Dublin/.test(timeZone)) return 51;
  if (/Paris|Berlin|Madrid|Rome|Amsterdam|Warsaw|Prague/.test(timeZone)) return 49;
  if (/Cairo|Jerusalem|Athens|Helsinki|Kyiv/.test(timeZone)) return 38;
  if (/Dubai|Moscow/.test(timeZone)) return 55;
  if (/Kolkata|Colombo|Karachi/.test(timeZone)) return 23;
  if (/Bangkok|Jakarta|Ho_Chi_Minh|Singapore/.test(timeZone)) return 13;
  if (/Shanghai|Hong_Kong|Taipei|Manila/.test(timeZone)) return 31;
  if (/Tokyo|Seoul/.test(timeZone)) return 36;
  if (/Sydney|Melbourne/.test(timeZone)) return -34;
  if (/Auckland/.test(timeZone)) return -37;
  return 40;
}

// Absolute sunrise and sunset for a latitude (degrees north) and longitude (degrees east).
export function sunInstants(date, latitude, longitude) {
  const lw = RAD * -longitude;
  const phi = RAD * latitude;
  const d = toDays(date);
  const n = julianCycle(d, lw);
  const ds = approxTransit(0, lw, n);
  const M = solarMeanAnomaly(ds);
  const L = eclipticLongitude(M);
  const dec = declination(L, 0);
  const noon = solarTransit(ds, M, L);
  const set = (() => {
    const w = hourAngle(-0.833 * RAD, phi, dec);
    return solarTransit(approxTransit(w, lw, n), M, L);
  })();
  const rise = noon - (set - noon);
  return {sunrise: fromJulian(rise), sunset: fromJulian(set), noon: fromJulian(noon)};
}

export function clockHour(instant, offsetMinutes = 0) {
  const shifted = new Date(instant.getTime() + offsetMinutes * 60000);
  return shifted.getUTCHours() + shifted.getUTCMinutes() / 60 + shifted.getUTCSeconds() / 3600;
}

const localHour = date => date.getHours() + date.getMinutes() / 60 + date.getSeconds() / 3600;

// Stretch the real day so the painted sunset (6:15 PM on the art clock) happens at local sunset.
export function skyHourForLocal(realHour, sunrise, sunset) {
  const rise = Number.isFinite(sunrise) ? sunrise : 6.5;
  const set = Number.isFinite(sunset) && sunset > rise + 0.5 ? sunset : rise + 12;
  const hour = ((realHour % 24) + 24) % 24;
  if (hour <= rise) return 4.2 + (hour / Math.max(rise, 0.25)) * (6.5 - 4.2);
  if (hour >= set) {
    const after = hour - set;
    if (after <= 1.25) return 18.25 + after;
    return Math.min(23.5, 19.5 + (after - 1.25) * 0.85);
  }
  return 6.5 + ((hour - rise) / (set - rise)) * (18.25 - 6.5);
}

export function skyFromDate(date = new Date(), coords) {
  const latitude = Number.isFinite(coords?.latitude) ? coords.latitude : guessLatitude(Intl.DateTimeFormat().resolvedOptions().timeZone);
  const longitude = Number.isFinite(coords?.longitude) ? coords.longitude : -date.getTimezoneOffset() / 60 * 15;
  const times = sunInstants(date, latitude, longitude);
  const realHour = localHour(date);
  const sunrise = localHour(times.sunrise);
  const sunset = localHour(times.sunset);
  return {realHour, sunrise, sunset, skyHour: skyHourForLocal(realHour, sunrise, sunset), latitude, longitude};
}
