/**
 * AERIS Server Telemetry Provider
 * Single authoritative server-side data fetching, Zod validation, normalization,
 * and in-memory caching (10-minute TTL) shared by /api/telemetry and Gemini services.
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

export interface ServerTelemetryFetchResult {
  readonly data: NormalizedTelemetry;
  readonly cacheHit: boolean;
}

export class TelemetryUpstreamError extends Error {
  public readonly statusCode: 502 | 504;
  public readonly details?: unknown;

  constructor(statusCode: 502 | 504, message: string, details?: unknown) {
    super(message);
    this.name = "TelemetryUpstreamError";
    this.statusCode = statusCode;
    this.details = details;
  }
}

const serverTelemetryCache = new Map<string, CachedEntry>();
const CACHE_TTL_MS = 10 * 60 * 1000; // 10 minutes

function buildLocationCacheKey(location: LocationMetadata): string {
  return `${location.id}:${location.latitude.toFixed(4)},${location.longitude.toFixed(4)}:${location.name}`;
}

async function fetchWithTimeout(url: string, timeoutMs = 8000): Promise<Response> {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, {
      signal: controller.signal,
      next: { revalidate: 600 },
    });
    return res;
  } finally {
    clearTimeout(id);
  }
}

/**
 * Fetches authoritative telemetry for a supported location or custom LocationMetadata
 * and reports whether the response was served from the shared server cache.
 */
export async function fetchServerTelemetryWithMeta(
  locationOrId?: string | LocationMetadata
): Promise<ServerTelemetryFetchResult> {
  const location: LocationMetadata =
    typeof locationOrId === "string"
      ? findLocationById(locationOrId)
      : locationOrId ?? DEFAULT_LOCATION;

  const cacheKey = buildLocationCacheKey(location);
  const now = Date.now();
  const cached = serverTelemetryCache.get(cacheKey);

  if (cached && cached.expiresAt > now) {
    return { data: cached.data, cacheHit: true };
  }

  const weatherUrl = `https://api.open-meteo.com/v1/forecast?latitude=${location.latitude}&longitude=${location.longitude}&current=temperature_2m,relative_humidity_2m,apparent_temperature,weather_code,wind_speed_10m,wind_direction_10m,surface_pressure&hourly=temperature_2m,relative_humidity_2m,wind_speed_10m,weather_code&past_days=1&forecast_days=2&timezone=auto`;
  const airQualityUrl = `https://air-quality-api.open-meteo.com/v1/air-quality?latitude=${location.latitude}&longitude=${location.longitude}&current=european_aqi,us_aqi,pm10,pm2_5,carbon_monoxide,nitrogen_dioxide,sulphur_dioxide,ozone,dust&hourly=pm10,pm2_5,carbon_monoxide,nitrogen_dioxide,sulphur_dioxide,ozone,dust,us_aqi,european_aqi&past_days=1&forecast_days=2&timezone=auto`;

  const [weatherRes, airRes] = await Promise.all([
    fetchWithTimeout(weatherUrl),
    fetchWithTimeout(airQualityUrl),
  ]);

  if (!weatherRes.ok) {
    throw new TelemetryUpstreamError(
      502,
      `Open-Meteo Weather API responded with HTTP ${weatherRes.status}`
    );
  }
  if (!airRes.ok) {
    throw new TelemetryUpstreamError(
      502,
      `Open-Meteo Air Quality API responded with HTTP ${airRes.status}`
    );
  }

  const weatherJson = await weatherRes.json();
  const airJson = await airRes.json();

  const parsedWeather = OpenMeteoWeatherResponseSchema.safeParse(weatherJson);
  if (!parsedWeather.success) {
    throw new TelemetryUpstreamError(
      502,
      "Weather payload failed schema validation",
      parsedWeather.error.format()
    );
  }

  const parsedAir = OpenMeteoAirQualityResponseSchema.safeParse(airJson);
  if (!parsedAir.success) {
    throw new TelemetryUpstreamError(
      502,
      "Air quality payload failed schema validation",
      parsedAir.error.format()
    );
  }

  const normalized = normalizeTelemetry(location, parsedWeather.data, parsedAir.data);

  serverTelemetryCache.set(cacheKey, {
    data: normalized,
    expiresAt: now + CACHE_TTL_MS,
  });

  return { data: normalized, cacheHit: false };
}

/**
 * Fetches authoritative telemetry for a supported location on the server.
 */
export async function fetchServerTelemetry(locationId?: string): Promise<NormalizedTelemetry> {
  const { data } = await fetchServerTelemetryWithMeta(locationId);
  return data;
}

/**
 * Manually seeds the cache with a known telemetry object (for testing and offline deterministic mocking).
 */
export function setCachedTelemetryForTesting(locationId: string, telemetry: NormalizedTelemetry): void {
  const location = findLocationById(locationId);
  const cacheKey = buildLocationCacheKey(location);
  serverTelemetryCache.set(cacheKey, {
    data: telemetry,
    expiresAt: Date.now() + 60 * 60 * 1000,
  });
}

export function clearServerTelemetryCache(): void {
  serverTelemetryCache.clear();
}
