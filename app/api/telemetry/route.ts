import { NextRequest, NextResponse } from "next/server";
import {
  OpenMeteoWeatherResponseSchema,
  OpenMeteoAirQualityResponseSchema,
} from "@/lib/telemetry/schemas";
import { normalizeTelemetry } from "@/lib/telemetry/normalizer";
import {
  findLocationById,
  validateCoordinates,
  DEFAULT_LOCATION,
} from "@/lib/telemetry/locations";
import type { LocationMetadata, NormalizedTelemetry } from "@/lib/telemetry/types";

// In-memory cache for server-side response caching
interface CachedEntry {
  data: NormalizedTelemetry;
  expiresAt: number;
}
const cache = new Map<string, CachedEntry>();
const CACHE_TTL_MS = 10 * 60 * 1000; // 10 minutes

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

export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    const { searchParams } = new URL(request.url);
    const locationId = searchParams.get("locationId");
    const latParam = searchParams.get("lat");
    const lonParam = searchParams.get("lon");

    let location: LocationMetadata;

    if (latParam && lonParam) {
      const lat = parseFloat(latParam);
      const lon = parseFloat(lonParam);
      if (!validateCoordinates(lat, lon)) {
        return NextResponse.json(
          { error: "Invalid coordinate bounds. Latitude must be in [-90, 90], Longitude in [-180, 180]." },
          { status: 400 }
        );
      }
      location = {
        id: `custom-${lat.toFixed(4)}-${lon.toFixed(4)}`,
        name: searchParams.get("name") || "Custom Coordinates",
        region: searchParams.get("region") || "User Selected",
        country: searchParams.get("country") || "World",
        latitude: lat,
        longitude: lon,
        timezone: "auto",
        modelDomain: "CAMS Global (IFS-AER / ECMWF)",
      };
    } else if (locationId) {
      location = findLocationById(locationId);
    } else {
      location = DEFAULT_LOCATION;
    }

    const cacheKey = `${location.latitude.toFixed(4)},${location.longitude.toFixed(4)}`;
    const cached = cache.get(cacheKey);
    const now = Date.now();

    if (cached && cached.expiresAt > now) {
      return NextResponse.json(cached.data, {
        headers: {
          "Cache-Control": "public, s-maxage=600, stale-while-revalidate=120",
          "X-AERIS-Cache": "HIT",
        },
      });
    }

    // Build Open-Meteo Endpoints with explicit variable separation and 1-day history for rolling CPCB averages
    const weatherUrl = `https://api.open-meteo.com/v1/forecast?latitude=${location.latitude}&longitude=${location.longitude}&current=temperature_2m,relative_humidity_2m,apparent_temperature,weather_code,wind_speed_10m,wind_direction_10m,surface_pressure&hourly=temperature_2m,relative_humidity_2m,wind_speed_10m,weather_code&past_days=1&forecast_days=2&timezone=auto`;

    const airQualityUrl = `https://air-quality-api.open-meteo.com/v1/air-quality?latitude=${location.latitude}&longitude=${location.longitude}&current=european_aqi,us_aqi,pm10,pm2_5,carbon_monoxide,nitrogen_dioxide,sulphur_dioxide,ozone,dust&hourly=pm10,pm2_5,carbon_monoxide,nitrogen_dioxide,sulphur_dioxide,ozone,dust,us_aqi,european_aqi&past_days=1&forecast_days=2&timezone=auto`;

    // Parallel fetch with timeout protection
    const [weatherRes, airRes] = await Promise.all([
      fetchWithTimeout(weatherUrl),
      fetchWithTimeout(airQualityUrl),
    ]);

    if (!weatherRes.ok) {
      return NextResponse.json(
        { error: `Open-Meteo Weather API responded with HTTP ${weatherRes.status}` },
        { status: 502 }
      );
    }

    if (!airRes.ok) {
      return NextResponse.json(
        { error: `Open-Meteo Air Quality API responded with HTTP ${airRes.status}` },
        { status: 502 }
      );
    }

    const weatherJson = await weatherRes.json();
    const airJson = await airRes.json();

    // Strict Zod Validation
    const parsedWeather = OpenMeteoWeatherResponseSchema.safeParse(weatherJson);
    if (!parsedWeather.success) {
      return NextResponse.json(
        { error: "Weather payload failed schema validation", details: parsedWeather.error.format() },
        { status: 502 }
      );
    }

    const parsedAir = OpenMeteoAirQualityResponseSchema.safeParse(airJson);
    if (!parsedAir.success) {
      return NextResponse.json(
        { error: "Air quality payload failed schema validation", details: parsedAir.error.format() },
        { status: 502 }
      );
    }

    // Normalize Telemetry with scientific CPCB rolling window calculation
    const normalized = normalizeTelemetry(location, parsedWeather.data, parsedAir.data);

    // Save in Cache
    cache.set(cacheKey, {
      data: normalized,
      expiresAt: now + CACHE_TTL_MS,
    });

    return NextResponse.json(normalized, {
      headers: {
        "Cache-Control": "public, s-maxage=600, stale-while-revalidate=120",
        "X-AERIS-Cache": "MISS",
      },
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown server error";
    return NextResponse.json(
      { error: "Environmental telemetry service unavailable", details: message },
      { status: 504 }
    );
  }
}
