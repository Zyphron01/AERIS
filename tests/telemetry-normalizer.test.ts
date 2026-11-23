import { describe, it, expect } from "vitest";
import { normalizeTelemetry } from "@/lib/telemetry/normalizer";
import { DEFAULT_LOCATION } from "@/lib/telemetry/locations";
import type { RawOpenMeteoWeather, RawOpenMeteoAirQuality } from "@/lib/telemetry/schemas";

describe("Telemetry Normalizer & Attribution Protocol", () => {
  const times48 = Array.from({ length: 48 }, (_, i) => {
    const h = (i % 24).toString().padStart(2, "0");
    const day = i < 24 ? "19" : "20";
    return `2026-11-${day}T${h}:00:00Z`;
  });

  const mockWeather: RawOpenMeteoWeather = {
    latitude: 28.6139,
    longitude: 77.209,
    current: {
      time: "2026-11-20T12:00:00Z",
      temperature_2m: 24.5,
      relative_humidity_2m: 55,
      apparent_temperature: 26.1,
      wind_speed_10m: 8.4,
      wind_direction_10m: 140,
      surface_pressure: 1012,
      weather_code: 1,
    },
    hourly: {
      time: times48,
      temperature_2m: Array.from({ length: 48 }, () => 24.5),
      relative_humidity_2m: Array.from({ length: 48 }, () => 55),
      wind_speed_10m: Array.from({ length: 48 }, () => 8.4),
    },
  };

  const mockAirQuality: RawOpenMeteoAirQuality = {
    latitude: 28.6139,
    longitude: 77.209,
    current: {
      time: "2026-11-20T12:00:00Z",
      european_aqi: 4,
      us_aqi: 185,
      pm2_5: 98.4,
      pm10: 165.2,
      ozone: 45.0,
      nitrogen_dioxide: 52.1,
      sulphur_dioxide: 14.3,
      carbon_monoxide: 1200,
      dust: 30.0,
    },
    hourly: {
      time: times48,
      pm2_5: Array.from({ length: 48 }, () => 98.4),
      pm10: Array.from({ length: 48 }, () => 165.2),
      nitrogen_dioxide: Array.from({ length: 48 }, () => 52.1),
      sulphur_dioxide: Array.from({ length: 48 }, () => 14.3),
      ozone: Array.from({ length: 48 }, () => 45.0),
      carbon_monoxide: Array.from({ length: 48 }, () => 1200),
      us_aqi: Array.from({ length: 48 }, () => 185),
    },
  };

  it("normalizes complete payload with explicit units and standards", () => {
    const result = normalizeTelemetry(
      DEFAULT_LOCATION,
      mockWeather,
      mockAirQuality,
      new Date("2026-11-20T12:15:00Z")
    );

    // Attribution
    expect(result.dataKind).toBe("modeled/forecast");
    expect(result.source).toContain("Open-Meteo");
    expect(result.freshness).toBe("fresh");

    // Weather units
    expect(result.weather.temperatureC).toBe(24.5);
    expect(result.weather.relativeHumidityPercent).toBe(55);
    expect(result.weather.windSpeedKmH).toBe(8.4);
    expect(result.weather.weatherLabel).toBe("Mainly Clear");

    // Pollutants & units
    const pm25 = result.pollutants.find((p) => p.code === "pm2_5");
    expect(pm25?.value).toBe(98.4);
    expect(pm25?.unit).toBe("µg/m³");
    expect(pm25?.rollingAverageValue).toBe(98.4);

    // AQI distinct standards
    expect(result.aqi.usAqi.standard).toBe("US_EPA");
    expect(result.aqi.usAqi.value).toBe(185);
    expect(result.aqi.usAqi.category).toBe("Unhealthy");

    expect(result.aqi.cpcbAqi.standard).toBe("IN_CPCB");
    expect(result.aqi.cpcbAqi.value).toBe(229); // PM2.5 = 98.4 in [90, 120] -> ~229 (Poor)
    expect(result.aqi.cpcbAqi.category).toBe("Poor");
  });

  it("detects stale readings when timestamp difference exceeds 90 minutes", () => {
    const result = normalizeTelemetry(
      DEFAULT_LOCATION,
      mockWeather,
      mockAirQuality,
      new Date("2026-11-20T14:00:00Z") // 120 minutes later
    );

    expect(result.freshness).toBe("stale");
  });

  it("handles missing/null pollutant values without inventing data", () => {
    const partialAirQuality: RawOpenMeteoAirQuality = {
      latitude: 28.6139,
      longitude: 77.209,
      current: {
        time: "2026-11-20T12:00:00Z",
        pm2_5: 45.0,
        pm10: null, // missing
        ozone: null,
      },
    };

    const result = normalizeTelemetry(
      DEFAULT_LOCATION,
      mockWeather,
      partialAirQuality,
      new Date("2026-11-20T12:10:00Z")
    );

    const pm10 = result.pollutants.find((p) => p.code === "pm10");
    expect(pm10?.value).toBeNull();
    expect(pm10?.status).toBe("unavailable");

    const pm25 = result.pollutants.find((p) => p.code === "pm2_5");
    expect(pm25?.value).toBe(45.0);
    expect(pm25?.status).toBe("available");

    // Because fewer than 3 pollutants are present, CPCB AQI is strictly unavailable
    expect(result.aqi.cpcbAqi.value).toBeNull();
    expect(result.aqi.cpcbAqi.category).toBe("Unavailable");
  });
});
