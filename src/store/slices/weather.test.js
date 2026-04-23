import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { create } from "zustand";

import { createWeatherSlice } from "./weather.js";

const mockFetch = vi.fn();
vi.stubGlobal("fetch", mockFetch);

const NOW = 1_746_000_000_000; // fixed "now" for deterministic tests

function makeHourlyResponse(weathercode = 0) {
  // 24 hourly slots starting from NOW
  const time = Array.from({ length: 24 }, (_, i) =>
    new Date(NOW + i * 3_600_000).toISOString().slice(0, 16),
  );
  return {
    hourly: {
      time,
      temperature_2m: time.map((_, i) => 10 + i),
      precipitation_probability: time.map(() => 20),
      weathercode: time.map(() => weathercode),
      windspeed_10m: time.map(() => 15),
    },
  };
}

function okFetch(weathercode = 0) {
  mockFetch.mockResolvedValue({
    ok: true,
    json: async () => makeHourlyResponse(weathercode),
  });
}

describe("weatherSlice", () => {
  let store;

  beforeEach(() => {
    vi.clearAllMocks();
    vi.setSystemTime(NOW);
    store = create((set) => ({ ...createWeatherSlice(set) }));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  // ── Initial state ─────────────────────────────────────────────────────────

  it("has empty forecasts initially", () => {
    expect(store.getState().weather.forecasts).toEqual({});
  });

  // ── Input guards ──────────────────────────────────────────────────────────

  it("does nothing with empty array", async () => {
    await store.getState().fetchWeatherForCheckpoints([]);
    expect(mockFetch).not.toHaveBeenCalled();
    expect(store.getState().weather.forecasts).toEqual({});
  });

  it("does nothing with null", async () => {
    await store.getState().fetchWeatherForCheckpoints(null);
    expect(mockFetch).not.toHaveBeenCalled();
  });

  it("filters out past checkpoints", async () => {
    await store
      .getState()
      .fetchWeatherForCheckpoints([
        { name: "A", lat: 45.0, lon: 2.0, etaMs: NOW - 1000 },
      ]);
    expect(mockFetch).not.toHaveBeenCalled();
  });

  it("filters out checkpoints beyond the 16-day window", async () => {
    await store
      .getState()
      .fetchWeatherForCheckpoints([
        { name: "A", lat: 45.0, lon: 2.0, etaMs: NOW + 17 * 86_400_000 },
      ]);
    expect(mockFetch).not.toHaveBeenCalled();
  });

  // ── Happy path ────────────────────────────────────────────────────────────

  it("stores forecast keyed by checkpoint name", async () => {
    okFetch(0);
    const etaMs = NOW + 2 * 3_600_000;

    await store
      .getState()
      .fetchWeatherForCheckpoints([
        { name: "Pertuyzat", lat: 45.5, lon: 2.1, etaMs },
      ]);

    const f = store.getState().weather.forecasts["Pertuyzat"];
    expect(f).toBeDefined();
    expect(f.icon).toBe("Sun");
    expect(typeof f.temp).toBe("number");
    expect(f.etaMs).toBe(etaMs);
  });

  it("stores wind and precipitation alongside temp", async () => {
    okFetch(0);
    await store
      .getState()
      .fetchWeatherForCheckpoints([
        { name: "A", lat: 45.0, lon: 2.0, etaMs: NOW + 3_600_000 },
      ]);
    const f = store.getState().weather.forecasts["A"];
    expect(f.wind).toBe(15);
    expect(f.precipitation).toBe(20);
    expect(f.weatherCode).toBe(0);
  });

  // ── Error handling ────────────────────────────────────────────────────────

  it("handles network failure gracefully — no crash, empty forecasts", async () => {
    mockFetch.mockRejectedValue(new TypeError("Failed to fetch"));

    await store
      .getState()
      .fetchWeatherForCheckpoints([
        { name: "A", lat: 45.0, lon: 2.0, etaMs: NOW + 3_600_000 },
      ]);

    expect(store.getState().weather.forecasts).toEqual({});
  });

  it("handles non-ok HTTP response gracefully", async () => {
    mockFetch.mockResolvedValue({ ok: false });

    await store
      .getState()
      .fetchWeatherForCheckpoints([
        { name: "A", lat: 45.0, lon: 2.0, etaMs: NOW + 3_600_000 },
      ]);

    expect(store.getState().weather.forecasts).toEqual({});
  });

  // ── Location deduplication ────────────────────────────────────────────────

  it("makes one fetch for two checkpoints within the same ~10 km grid cell", async () => {
    okFetch(0);

    await store.getState().fetchWeatherForCheckpoints([
      { name: "A", lat: 45.501, lon: 2.101, etaMs: NOW + 1 * 3_600_000 },
      { name: "B", lat: 45.502, lon: 2.102, etaMs: NOW + 2 * 3_600_000 },
    ]);

    expect(mockFetch).toHaveBeenCalledTimes(1);
    expect(store.getState().weather.forecasts["A"]).toBeDefined();
    expect(store.getState().weather.forecasts["B"]).toBeDefined();
  });

  it("makes separate fetches for checkpoints in different grid cells", async () => {
    okFetch(0);

    await store.getState().fetchWeatherForCheckpoints([
      { name: "A", lat: 45.0, lon: 2.0, etaMs: NOW + 1 * 3_600_000 },
      { name: "B", lat: 48.0, lon: 5.0, etaMs: NOW + 2 * 3_600_000 },
    ]);

    expect(mockFetch).toHaveBeenCalledTimes(2);
  });

  // ── WMO code → icon mapping ───────────────────────────────────────────────

  it.each([
    [0, "Sun"],
    [1, "Sun"],
    [2, "Cloud"],
    [3, "Cloud"],
    [45, "Wind"],
    [48, "Wind"],
    [51, "CloudDrizzle"],
    [55, "CloudDrizzle"],
    [61, "CloudRain"],
    [65, "CloudRain"],
    [66, "CloudSnow"],
    [71, "CloudSnow"],
    [75, "CloudSnow"],
    [80, "CloudRain"],
    [82, "CloudRain"],
    [85, "CloudSnow"],
    [95, "CloudLightning"],
    [99, "CloudLightning"],
  ])("WMO %i → %s", async (code, icon) => {
    okFetch(code);
    await store
      .getState()
      .fetchWeatherForCheckpoints([
        { name: "X", lat: 45.0, lon: 2.0, etaMs: NOW + 3_600_000 },
      ]);
    expect(store.getState().weather.forecasts["X"].icon).toBe(icon);
  });

  it("unknown WMO code falls back to Cloud", async () => {
    okFetch(999);
    await store
      .getState()
      .fetchWeatherForCheckpoints([
        { name: "X", lat: 45.0, lon: 2.0, etaMs: NOW + 3_600_000 },
      ]);
    expect(store.getState().weather.forecasts["X"].icon).toBe("Cloud");
  });
});
