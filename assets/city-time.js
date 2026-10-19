// A visual city clock, deliberately independent from business days and payments.
const clamp = (value, low, high) => Math.max(low, Math.min(high, value));
export const CITY_LIGHT_PRESETS = Object.freeze({day:15, sunset:18.25, night:22});
export const CITY_DAY_SECONDS = 24 * 60;
export const CITY_LIGHT_STORAGE = 'mapleStreetCityLight';

export function restoreCityTime(value) {
  return {
    hour:Number.isFinite(value?.hour) ? ((value.hour % 24) + 24) % 24 : 15,
    cycling:value?.cycling === true,
  };
}

export function advanceCityTime(state, elapsed, paused = false) {
  if(!state.cycling || paused || !Number.isFinite(elapsed) || elapsed <= 0)return state;
  // Discard long background-tab gaps rather than skipping the sunset on return.
  state.hour = (state.hour + Math.min(elapsed, .1) * 24 / CITY_DAY_SECONDS) % 24;
  return state;
}

export function setCityLightPreset(state, preset) {
  if(!Object.hasOwn(CITY_LIGHT_PRESETS, preset))return false;
  state.hour = CITY_LIGHT_PRESETS[preset];state.cycling = false;
  return true;
}

export function formatCityTime(hour) {
  const minutes = Math.floor((((hour % 24) + 24) % 24) * 60 + 1e-7) % 1440;
  return `${Math.floor(minutes / 60) % 12 || 12}:${String(minutes % 60).padStart(2, '0')} ${minutes < 720 ? 'AM' : 'PM'}`;
}

// Sun, ambient fill, reflections, and practical lights use the same timeline.
// Night retains a moonlit ambient floor so walking remains playable.
const frames = [
  {hour:0, sun:.16, hemi:.42, exposure:1.02, env:.075, night:1, skyNight:1, fog:0x172639, sunColor:0xb3c9ef, top:0x7295c4, ground:0x303c4a},
  {hour:5, sun:.16, hemi:.42, exposure:1.02, env:.075, night:1, skyNight:1, fog:0x25344c, sunColor:0xb3c9ef, top:0x7295c4, ground:0x303c4a},
  {hour:6, sun:.5, hemi:.48, exposure:.94, env:.16, night:.75, skyNight:.6, fog:0x92757a, sunColor:0xffb886, top:0xb7b3ce, ground:0x494439},
  {hour:7.5, sun:1.9, hemi:.58, exposure:.86, env:.36, night:0, skyNight:0, fog:0xa7bec8, sunColor:0xffd2a1, top:0xc0d9ec, ground:0x38432f},
  {hour:12, sun:2.7, hemi:.58, exposure:.86, env:.42, night:0, skyNight:0, fog:0x8aafc3, sunColor:0xffe8c9, top:0xbdd7ee, ground:0x38432f},
  {hour:15, sun:2.5, hemi:.58, exposure:.86, env:.42, night:0, skyNight:0, fog:0x8aafc3, sunColor:0xffe1ad, top:0xbdd7ee, ground:0x38432f},
  {hour:17, sun:1.9, hemi:.52, exposure:.88, env:.33, night:.1, skyNight:0, fog:0xc0a08a, sunColor:0xffb56d, top:0xc4c4dd, ground:0x4a4234},
  {hour:18.25, sun:1.0, hemi:.48, exposure:.92, env:.22, night:.65, skyNight:.12, fog:0xb58273, sunColor:0xff9251, top:0xb1aacb, ground:0x4a3b35},
  {hour:19.5, sun:.16, hemi:.42, exposure:1.02, env:.08, night:1, skyNight:1, fog:0x263950, sunColor:0xb3c9ef, top:0x7295c4, ground:0x303c4a},
  {hour:22, sun:.16, hemi:.42, exposure:1.02, env:.075, night:1, skyNight:1, fog:0x172639, sunColor:0xb3c9ef, top:0x7295c4, ground:0x303c4a},
  {hour:24, sun:.16, hemi:.42, exposure:1.02, env:.075, night:1, skyNight:1, fog:0x172639, sunColor:0xb3c9ef, top:0x7295c4, ground:0x303c4a},
];
const mixColor = (a, b, t) => [16,8,0].reduce((value, shift) => value | Math.round(((a >> shift) & 255) * (1-t) + ((b >> shift) & 255) * t) << shift, 0);

export function cityLightingAt(hour) {
  hour = restoreCityTime({hour}).hour;
  let i = 0;while(i < frames.length-2 && hour > frames[i+1].hour)i++;
  const a = frames[i], b = frames[i+1], raw = (hour-a.hour)/(b.hour-a.hour), t = raw*raw*(3-2*raw);
  const sample = {hour};
  for(const key of ['sun','hemi','exposure','env','night','skyNight'])sample[key] = a[key]+(b[key]-a[key])*t;
  for(const key of ['fog','sunColor','top','ground'])sample[key] = mixColor(a[key],b[key],t);
  const angle = (hour-6.5)/24*Math.PI*2, elevation = Math.sin(angle);
  // Use the moon's higher angle after dark; keep the actual sun below the horizon.
  sample.sunDirection = {x:-Math.cos(angle)*.8, y:elevation*.9, z:-.55};
  const moon = clamp((sample.skyNight-.4)/.6,0,1), direction={...sample.sunDirection,y:Math.max(.055,sample.sunDirection.y)};
  sample.lightDirection = {x:direction.x*(1-moon)-.5*moon,y:direction.y*(1-moon)+.8*moon,z:direction.z*(1-moon)+.35*moon};
  sample.label = sample.night > .95 ? 'Night' : hour < 8 ? 'Morning' : hour >= 17 ? 'Sunset' : 'Daylight';
  sample.fogDensity = .00036 + clamp(sample.night,0,1)*.00012;
  return sample;
}
