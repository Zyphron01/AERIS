/**
 * AERIS Server Telemetry Provider
 * Direct server-side data fetching and normalization for server endpoints and service layers.
 * Caches normalized results in memory with a 10-minute TTL.
 */

import {
  OpenMeteoWeatherResponseSchema,
  OpenMeteoAirQualityResponseSchema,
} from "./schemas";
import { normalizeTelemetry } from "./normalizer";
import { findLocationById, DEFAULT_LOCATION } from "./locations";
import type { LocationMetadata, NormalizedTelemetry } from "./types";

interface CachedEntry {
  data: NormalizedTelemetry;
  expiresAt: number;
}

const serverTelemetryCache = new Map<string, CachedEntry>();
const CACHE_TTL_MS = 10 * 60 * 1000; // 10 minutes

async function fetchWithTimeout(url: string, timeoutMs = 8000): Promise<Response> {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, {
      signal: controller.signal,
    });
    return res;
  } finally {
    clearTimeout(id);
  }
}

/**
 * Fetches authoritative telemetry for a supported location on the server.
 */
export async function fetchServerTelemetry(locationId?: string): Promise<NormalizedTelemetry> {
  const location: LocationMetadata = locationId
    ? findLocationById(locationId)
    : DEFAULT_LOCATION;

  const cacheKey = `${location.latitude.toFixed(4)},${location.longitude.toFixed(4)}`;
  const now = Date.now();
  const cached = serverTelemetryCache.get(cacheKey);

  if (cached && cached.expiresAt > now) {
    return cached.data;
  }

  const weatherUrl = `https://api.open-meteo.com/v1/forecast?latitude=${location.latitude}&longitude=${location.longitude}&current=temperature_2m,relative_humidity_2m,apparent_temperature,weather_code,wind_speed_10m,wind_direction_10m,surface_pressure&hourly=temperature_2m,relative_humidity_2m,wind_speed_10m,weather_code&past_days=1&forecast_days=2&timezone=auto`;
  const airQualityUrl = `https://air-quality-api.open-meteo.com/v1/air-quality?latitude=${location.latitude}&longitude=${location.longitude}&current=european_aqi,us_aqi,pm10,pm2_5,carbon_monoxide,nitrogen_dioxide,sulphur_dioxide,ozone,dust&hourly=pm10,pm2_5,carbon_monoxide,nitrogen_dioxide,sulphur_dioxide,ozone,dust,us_aqi,european_aqi&past_days=1&forecast_days=2&timezone=auto`;

  const [weatherRes, airRes] = await Promise.all([
    fetchWithTimeout(weatherUrl),
    fetchWithTimeout(airQualityUrl),
  ]);

  if (!weatherRes.ok) {
    throw new Error(`Open-Meteo Weather API responded with HTTP ${weatherRes.status}`);
  }
  if (!airRes.ok) {
    throw new Error(`Open-Meteo Air Quality API responded with HTTP ${airRes.status}`);
  }

  const weatherJson = await weatherRes.json();
  const airJson = await airRes.json();

  const parsedWeather = OpenMeteoWeatherResponseSchema.safeParse(weatherJson);
  if (!parsedWeather.success) {
    throw new Error("Weather payload failed schema validation");
  }

  const parsedAir = OpenMeteoAirQualityResponseSchema.safeParse(airJson);
  if (!parsedAir.success) {
    throw new Error("Air quality payload failed schema validation");
  }

  const normalized = normalizeTelemetry(location, parsedWeather.data, parsedAir.data);

  serverTelemetryCache.set(cacheKey, {
    data: normalized,
    expiresAt: now + CACHE_TTL_MS,
  });

  return normalized;
}

/**
 * Manually seeds the cache with a known telemetry object (for testing and offline deterministic mocking).
 */
export function setCachedTelemetryForTesting(locationId: string, telemetry: NormalizedTelemetry): void {
  const location = findLocationById(locationId);
  const cacheKey = `${location.latitude.toFixed(4)},${location.longitude.toFixed(4)}`;
  serverTelemetryCache.set(cacheKey, {
    data: telemetry,
    expiresAt: Date.now() + 60 * 60 * 1000,
  });
}

export function clearServerTelemetryCache(): void {
  serverTelemetryCache.clear();
}
