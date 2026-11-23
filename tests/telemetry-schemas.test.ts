import { describe, it, expect } from "vitest";
import {
  OpenMeteoWeatherResponseSchema,
  OpenMeteoAirQualityResponseSchema,
} from "@/lib/telemetry/schemas";
import { validateCoordinates, findLocationById } from "@/lib/telemetry/locations";

describe("Telemetry Zod Schemas & Location Validation", () => {
  it("validates legitimate Open-Meteo Weather responses", () => {
    const valid = {
      latitude: 28.6139,
      longitude: 77.209,
      current: {
        time: "2026-11-20T10:00",
        temperature_2m: 22.4,
        relative_humidity_2m: 60,
        wind_speed_10m: 11.2,
      },
    };

    const res = OpenMeteoWeatherResponseSchema.safeParse(valid);
    expect(res.success).toBe(true);
  });

  it("rejects malformed weather payloads missing required fields", () => {
    const invalid = {
      latitude: 28.6139,
      // missing longitude and current
    };

    const res = OpenMeteoWeatherResponseSchema.safeParse(invalid);
    expect(res.success).toBe(false);
  });

  it("validates Open-Meteo Air Quality response with nullable pollutant readings", () => {
    const valid = {
      latitude: 28.6139,
      longitude: 77.209,
      current: {
        time: "2026-11-20T10:00",
        pm2_5: 85.2,
        pm10: 140.0,
        ozone: null, // acceptable nullable
      },
    };

    const res = OpenMeteoAirQualityResponseSchema.safeParse(valid);
    expect(res.success).toBe(true);
  });

  it("validates coordinate boundaries correctly", () => {
    expect(validateCoordinates(28.6139, 77.209)).toBe(true); // Delhi
    expect(validateCoordinates(-33.8688, 151.2093)).toBe(true); // Sydney
    expect(validateCoordinates(95.0, 77.0)).toBe(false); // Lat > 90
    expect(validateCoordinates(28.0, 200.0)).toBe(false); // Lon > 180
    expect(validateCoordinates(NaN, 50.0)).toBe(false);
  });

  it("resolves default and existing locations cleanly", () => {
    const delhi = findLocationById("delhi-ncr");
    expect(delhi.name).toBe("Delhi NCR");
    expect(delhi.country).toBe("India");

    const fallback = findLocationById("non-existent-city");
    expect(fallback.name).toBe("Delhi NCR");
  });
});
