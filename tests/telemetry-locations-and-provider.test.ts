import { describe, it, expect } from "vitest";
import {
  DEFAULT_LOCATION,
  findLocationById,
  validateCoordinates,
} from "@/lib/telemetry/locations";
import {
  setCachedTelemetryForTesting,
  fetchServerTelemetry,
} from "@/lib/telemetry/server-provider";
import type { NormalizedTelemetry } from "@/lib/telemetry/types";

describe("Telemetry Locations Specification", () => {
  it("includes Delhi NCR as the default location", () => {
    expect(DEFAULT_LOCATION.id).toBe("delhi-ncr");
    expect(DEFAULT_LOCATION.latitude).toBeCloseTo(28.6139, 4);
    expect(DEFAULT_LOCATION.longitude).toBeCloseTo(77.209, 3);
  });

  it("finds locations by exact ID", () => {
    const mumbai = findLocationById("mumbai");
    expect(mumbai.id).toBe("mumbai");
    expect(mumbai.name).toBe("Mumbai");
    expect(mumbai.country).toBe("India");

    const london = findLocationById("london");
    expect(london.id).toBe("london");
    expect(london.country).toBe("United Kingdom");
  });

  it("falls back to DEFAULT_LOCATION for unknown IDs", () => {
    const unknown = findLocationById("non-existent-city");
    expect(unknown.id).toBe(DEFAULT_LOCATION.id);
  });

  it("validates valid coordinate pairs", () => {
    expect(validateCoordinates(28.6139, 77.209)).toBe(true);
    expect(validateCoordinates(-90, -180)).toBe(true);
    expect(validateCoordinates(90, 180)).toBe(true);
    expect(validateCoordinates(0, 0)).toBe(true);
  });

  it("rejects out-of-bounds coordinates", () => {
    expect(validateCoordinates(91, 0)).toBe(false);
    expect(validateCoordinates(-90.1, 0)).toBe(false);
    expect(validateCoordinates(0, 180.1)).toBe(false);
    expect(validateCoordinates(0, -181)).toBe(false);
    expect(validateCoordinates(NaN, 50)).toBe(false);
    expect(validateCoordinates(50, NaN)).toBe(false);
  });
});

describe("Server Telemetry Provider & Cache", () => {
  const dummyNormalized: NormalizedTelemetry = {
    location: DEFAULT_LOCATION,
    source: "Mock Server Provider",
    dataKind: "modeled/forecast",
    timestamp: "2026-11-24T12:00:00Z",
    retrievedAt: "2026-11-24T12:05:00Z",
    freshness: "fresh",
    freshnessExplanation: "Test fresh data",
    weather: {
      temperatureC: 22,
      apparentTemperatureC: 22,
      relativeHumidityPercent: 55,
      windSpeedKmH: 8.5,
      windDirectionDegrees: 180,
      surfacePressureHPa: 1013,
      weatherCode: 0,
      weatherLabel: "Clear sky",
    },
    aqi: {
      usAqi: {
        standard: "US_EPA",
        name: "US EPA Air Quality Index",
        value: 120,
        category: "Moderate",
        scaleMin: 0,
        scaleMax: 500,
        colorClass: "text-amber-700 bg-amber-50",
        methodology: "modeled-forecast",
      },
      europeanAqi: {
        standard: "EU_EAQI",
        name: "European Air Quality Index",
        value: 3,
        category: "Moderate",
        scaleMin: 1,
        scaleMax: 6,
        colorClass: "text-amber-700 bg-amber-50",
        methodology: "modeled-forecast",
      },
      cpcbAqi: {
        standard: "IN_CPCB",
        name: "Indian National AQI",
        value: 235,
        category: "Poor",
        scaleMin: 0,
        scaleMax: 500,
        colorClass: "text-orange-700 bg-orange-50",
        methodology: "modeled-forecast",
        dominantPollutant: "PM2.5",
      },
    },
    pollutants: [
      {
        code: "pm2_5",
        name: "Fine Particulate Matter (PM2.5)",
        value: 94,
        unit: "µg/m³",
        averagingPeriod: "1-hour modeled",
        status: "available",
      },
    ],
    hourlyForecast: [],
    disclaimer: "Modeled atmospheric forecasts derived from Open-Meteo CAMS Global.",
  };

  it("retrieves seeded test telemetry from server cache without external fetch", async () => {
    setCachedTelemetryForTesting("delhi-ncr", dummyNormalized);
    const result = await fetchServerTelemetry("delhi-ncr");
    expect(result.source).toBe("Mock Server Provider");
    expect(result.aqi.cpcbAqi?.value).toBe(235);
    const pm25 = result.pollutants.find((p) => p.code === "pm2_5");
    expect(pm25?.value).toBe(94);
  });
});
