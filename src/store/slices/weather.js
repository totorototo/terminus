const WMO_ICON = {
  0: "Sun",
  1: "Sun",
  2: "Cloud",
  3: "Cloud",
  45: "Wind",
  48: "Wind",
  51: "CloudDrizzle",
  53: "CloudDrizzle",
  55: "CloudDrizzle",
  56: "CloudDrizzle",
  57: "CloudDrizzle",
  61: "CloudRain",
  63: "CloudRain",
  65: "CloudRain",
  66: "CloudSnow",
  67: "CloudSnow",
  71: "CloudSnow",
  73: "CloudSnow",
  75: "CloudSnow",
  77: "CloudSnow",
  80: "CloudRain",
  81: "CloudRain",
  82: "CloudRain",
  85: "CloudSnow",
  86: "CloudSnow",
  95: "CloudLightning",
  96: "CloudLightning",
  99: "CloudLightning",
};

const MAX_FORECAST_MS = 16 * 24 * 60 * 60 * 1000;
const CACHE_TTL_MS = 60 * 60 * 1000;

// key: "lat,lon" (toFixed(2)) → { data, fetchedAt }
const responseCache = new Map();

export function clearWeatherCache() {
  responseCache.clear();
}

function isCached(key) {
  const entry = responseCache.get(key);
  return entry != null && Date.now() - entry.fetchedAt < CACHE_TTL_MS;
}

function wmoToIcon(code) {
  return WMO_ICON[code] ?? "Cloud";
}

function findClosestHourIndex(timestamps, etaMs) {
  let best = 0;
  let bestDiff = Infinity;
  for (let i = 0; i < timestamps.length; i++) {
    const diff = Math.abs(timestamps[i] - etaMs);
    if (diff < bestDiff) {
      bestDiff = diff;
      best = i;
    }
  }
  return best;
}

async function fetchOpenMeteo(key, lat, lon) {
  if (isCached(key)) return responseCache.get(key).data;

  const url =
    `https://api.open-meteo.com/v1/forecast` +
    `?latitude=${lat.toFixed(4)}&longitude=${lon.toFixed(4)}` +
    `&hourly=temperature_2m,precipitation_probability,weathercode,windspeed_10m` +
    `&timezone=auto&forecast_days=16`;

  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const res = await fetch(url);
      if (res.status === 429) {
        const header = res.headers.get("Retry-After");
        const delay =
          header != null && /^\d+$/.test(header.trim())
            ? parseInt(header, 10) * 1000
            : 2000;
        await new Promise((r) => setTimeout(r, delay));
        continue;
      }
      if (!res.ok) return null;
      const data = await res.json();
      responseCache.set(key, { data, fetchedAt: Date.now() });
      return data;
    } catch {
      return null;
    }
  }
  return null;
}

export const createWeatherSlice = (set) => ({
  weather: {
    forecasts: {},
  },

  /**
   * Fetch weather forecasts for the given checkpoints.
   * Caller is responsible for providing live ETAs (paceRatio-adjusted).
   *
   * checkpoints: Array<{ name: string, lat: number, lon: number, etaMs: number }>
   */
  fetchWeatherForCheckpoints: async (checkpoints) => {
    if (!checkpoints?.length) return;

    const now = Date.now();
    const eligible = checkpoints.filter(
      (cp) => cp.etaMs > now && cp.etaMs - now < MAX_FORECAST_MS,
    );
    if (!eligible.length) return;

    // Group by ~10 km grid to avoid redundant fetches for nearby checkpoints
    const byLocation = new Map();
    for (const cp of eligible) {
      const key = `${cp.lat.toFixed(2)},${cp.lon.toFixed(2)}`;
      if (!byLocation.has(key)) {
        byLocation.set(key, { key, lat: cp.lat, lon: cp.lon, checkpoints: [] });
      }
      byLocation.get(key).checkpoints.push(cp);
    }

    const locations = Array.from(byLocation.values());

    // Fetch cache misses sequentially to avoid burst 429s.
    // Cache hits skip the network entirely; only misses get the stagger.
    let stagger = false;
    for (const { key, lat, lon } of locations) {
      if (isCached(key)) continue;
      if (stagger) await new Promise((r) => setTimeout(r, 150));
      await fetchOpenMeteo(key, lat, lon);
      stagger = true;
    }

    const forecasts = {};
    for (const { key, lat, lon, checkpoints: cps } of locations) {
      const data = await fetchOpenMeteo(key, lat, lon);
      if (!data) continue;

      const {
        time,
        temperature_2m,
        precipitation_probability,
        weathercode,
        windspeed_10m,
      } = data.hourly;

      const timestamps = time.map((t) => new Date(t).getTime());

      for (const cp of cps) {
        const idx = findClosestHourIndex(timestamps, cp.etaMs);
        forecasts[cp.name] = {
          icon: wmoToIcon(weathercode[idx]),
          temp: Math.round(temperature_2m[idx]),
          wind: Math.round(windspeed_10m[idx]),
          precipitation: precipitation_probability?.[idx] ?? null,
          weatherCode: weathercode[idx],
          etaMs: cp.etaMs,
        };
      }
    }

    set(
      (state) => ({
        weather: {
          ...state.weather,
          forecasts: { ...state.weather.forecasts, ...forecasts },
        },
      }),
      undefined,
      "weather/setForecasts",
    );
  },
});
