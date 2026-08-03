// Sun altitude (elevation angle above the horizon) at an instant — low-precision
// NOAA/Meeus solar position formulas, the same public-domain astronomical
// algorithm SunCalc-style libraries are built on. Computed locally, no external
// API/dependency (per the JTBD doc's "SunCalc-style, no external API"
// requirement). Positive altitude = sun above the horizon (day), negative =
// below (night) — plotting this over distance produces the familiar smooth
// day/night sinusoid rather than a hard-edged banded classification.

const RAD = Math.PI / 180;
const DAY_MS = 1000 * 60 * 60 * 24;
const J1970 = 2440588;
const J2000 = 2451545;
const OBLIQUITY = RAD * 23.4397; // obliquity of the Earth

function toDays(timeMs) {
  return timeMs / DAY_MS - 0.5 + J1970 - J2000;
}

function solarMeanAnomaly(d) {
  return RAD * (357.5291 + 0.98560028 * d);
}

function eclipticLongitude(M) {
  const C =
    RAD *
    (1.9148 * Math.sin(M) + 0.02 * Math.sin(2 * M) + 0.0003 * Math.sin(3 * M));
  const P = RAD * 102.9372; // perihelion of Earth
  return M + C + P + Math.PI;
}

function declination(L) {
  return Math.asin(Math.sin(OBLIQUITY) * Math.sin(L));
}

function rightAscension(L) {
  return Math.atan2(Math.sin(L) * Math.cos(OBLIQUITY), Math.cos(L));
}

function siderealTime(d, lw) {
  return RAD * (280.16 + 360.9856235 * d) - lw;
}

/**
 * Sun altitude (degrees above the horizon) at `timeMs` (UTC epoch ms) for a
 * given coordinate. Negative below the horizon (night), positive above (day),
 * 90° at the zenith. Computed locally — no external API.
 */
export function sunAltitudeDeg(timeMs, lat, lon) {
  const lw = RAD * -lon;
  const phi = RAD * lat;
  const d = toDays(timeMs);
  const M = solarMeanAnomaly(d);
  const L = eclipticLongitude(M);
  const dec = declination(L);
  const ra = rightAscension(L);
  const H = siderealTime(d, lw) - ra;

  const altitudeRad = Math.asin(
    Math.sin(phi) * Math.sin(dec) + Math.cos(phi) * Math.cos(dec) * Math.cos(H),
  );
  return altitudeRad / RAD;
}
