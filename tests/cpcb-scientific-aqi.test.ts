/**
 * AERIS — Scientific Accuracy Test Suite for CPCB National AQI & Environmental Data Contracts
 * Validates against official Ministry of Environment, Forest & Climate Change (MoEFCC) CPCB guidelines (2014).
 */

import { describe, it, expect } from "vitest";
import {
  calculateSubIndex,
  calculateOverallCpcbAqi,
  computeRollingAverage,
} from "@/lib/aqi/cpcb-aqi";
import { normalizeTelemetry } from "@/lib/telemetry/normalizer";
import { DEFAULT_LOCATION } from "@/lib/telemetry/locations";
import type { RawOpenMeteoWeather, RawOpenMeteoAirQuality } from "@/lib/telemetry/schemas";

describe("AERIS Scientific Hardening — CPCB National AQI & Environmental Standards", () => {
  describe("Breakpoint Exact Boundary Verification for All Pollutants", () => {
    it("verifies NO2 breakpoints and boundaries (24-hr average in µg/m³)", () => {
      // 0-40 -> 0-50 (Good)
      expect(calculateSubIndex("no2", 0)).toBe(0);
      expect(calculateSubIndex("no2", 20)).toBe(25);
      expect(calculateSubIndex("no2", 40)).toBe(50);

      // 41-80 -> 51-100 (Satisfactory)
      expect(calculateSubIndex("no2", 60)).toBe(76);
      expect(calculateSubIndex("no2", 80)).toBe(100);

      // 81-180 -> 101-200 (Moderate)
      expect(calculateSubIndex("no2", 130)).toBe(151);
      expect(calculateSubIndex("no2", 180)).toBe(200);

      // 181-280 -> 201-300 (Poor)
      expect(calculateSubIndex("no2", 230)).toBe(251);
      expect(calculateSubIndex("no2", 280)).toBe(300);

      // 281-400 -> 301-400 (Very Poor)
      expect(calculateSubIndex("no2", 340)).toBe(351);
      expect(calculateSubIndex("no2", 400)).toBe(400);

      // 400+ -> 401-500 (Severe)
      expect(calculateSubIndex("no2", 500)).toBe(451);
      expect(calculateSubIndex("no2", 600)).toBe(500);
      expect(calculateSubIndex("no2", 700)).toBe(500); // capped at 500
    });

    it("verifies SO2 breakpoints and boundaries (24-hr average in µg/m³)", () => {
      expect(calculateSubIndex("so2", 20)).toBe(25);
      expect(calculateSubIndex("so2", 40)).toBe(50);
      expect(calculateSubIndex("so2", 60)).toBe(76);
      expect(calculateSubIndex("so2", 80)).toBe(100);
      expect(calculateSubIndex("so2", 230)).toBe(151);
      expect(calculateSubIndex("so2", 380)).toBe(200);
      expect(calculateSubIndex("so2", 590)).toBe(251);
      expect(calculateSubIndex("so2", 800)).toBe(300);
      expect(calculateSubIndex("so2", 1200)).toBe(351);
      expect(calculateSubIndex("so2", 1600)).toBe(400);
      expect(calculateSubIndex("so2", 1800)).toBe(451);
      expect(calculateSubIndex("so2", 2000)).toBe(500);
    });

    it("verifies Ozone (O3) breakpoints and boundaries (8-hr average in µg/m³)", () => {
      // 0-50 -> 0-50
      expect(calculateSubIndex("o3", 25)).toBe(25);
      expect(calculateSubIndex("o3", 50)).toBe(50);

      // 51-100 -> 51-100
      expect(calculateSubIndex("o3", 75)).toBe(76);
      expect(calculateSubIndex("o3", 100)).toBe(100);

      // 101-168 -> 101-200
      expect(calculateSubIndex("o3", 134)).toBe(151);
      expect(calculateSubIndex("o3", 168)).toBe(200);

      // 169-208 -> 201-300
      expect(calculateSubIndex("o3", 188)).toBe(251);
      expect(calculateSubIndex("o3", 208)).toBe(300);

      // 209-748 -> 301-400
      expect(calculateSubIndex("o3", 478)).toBe(351);
      expect(calculateSubIndex("o3", 748)).toBe(400);

      // 748+ -> 401-500
      expect(calculateSubIndex("o3", 874)).toBe(451);
      expect(calculateSubIndex("o3", 1000)).toBe(500);
    });

    it("verifies Carbon Monoxide (CO) breakpoints (8-hr average in mg/m³)", () => {
      expect(calculateSubIndex("co", 0.5)).toBe(25);
      expect(calculateSubIndex("co", 1.0)).toBe(50);
      expect(calculateSubIndex("co", 1.5)).toBe(76);
      expect(calculateSubIndex("co", 2.0)).toBe(100);
      expect(calculateSubIndex("co", 6.0)).toBe(151);
      expect(calculateSubIndex("co", 10.0)).toBe(200);
      expect(calculateSubIndex("co", 13.5)).toBe(251);
      expect(calculateSubIndex("co", 17.0)).toBe(300);
      expect(calculateSubIndex("co", 25.5)).toBe(351);
      expect(calculateSubIndex("co", 34.0)).toBe(400);
      expect(calculateSubIndex("co", 42.0)).toBe(451);
      expect(calculateSubIndex("co", 50.0)).toBe(500);
    });

    it("verifies NH3 and Pb breakpoints", () => {
      // NH3
      expect(calculateSubIndex("nh3", 100)).toBe(25);
      expect(calculateSubIndex("nh3", 200)).toBe(50);
      expect(calculateSubIndex("nh3", 300)).toBe(76);
      expect(calculateSubIndex("nh3", 600)).toBe(151);

      // Pb
      expect(calculateSubIndex("pb", 0.25)).toBe(25);
      expect(calculateSubIndex("pb", 0.5)).toBe(50);
      expect(calculateSubIndex("pb", 0.75)).toBe(76);
      expect(calculateSubIndex("pb", 1.5)).toBe(151);
    });
  });

  describe("Official CPCB Worked Example Validation", () => {
    it("evaluates official realistic scenario with dominant pollutant resolution", () => {
      // Worked example:
      // PM2.5 = 35.2 µg/m³ -> 59 (Satisfactory)
      // PM10 = 112 µg/m³   -> 109 (Moderate)
      // NO2 = 54 µg/m³     -> 68 (Satisfactory)
      // CO = 1.2 mg/m³     -> 61 (Satisfactory)
      // O3 = 28 µg/m³      -> 28 (Good)
      const input = {
        pm2_5: 35.2,
        pm10: 112,
        no2: 54,
        co: 1.2,
        o3: 28,
      };

      const result = calculateOverallCpcbAqi(input);
      expect(result.meetsCpcbCriteria).toBe(true);
      expect(result.subIndices.pm2_5).toBe(59);
      expect(result.subIndices.pm10).toBe(109);
      expect(result.subIndices.no2).toBe(68);
      expect(result.subIndices.co).toBe(61);
      expect(result.subIndices.o3).toBe(28);

      // Dominant pollutant is PM10 with index 109
      expect(result.aqi).toBe(109);
      expect(result.category).toBe("Moderate");
      expect(result.dominantPollutant).toBe("PM10");
    });
  });

  describe("Data Completeness & Rolling Averaging Periods", () => {
    it("verifies 24-hr rolling completeness requires minimum 16 hours", () => {
      // 16 valid hours out of 24 is accepted
      const readings16 = [...Array(16).fill(40), ...Array(8).fill(null)];
      const res16 = computeRollingAverage(readings16, 24, 16);
      expect(res16.isSufficient).toBe(true);
      expect(res16.average).toBe(40);

      // 15 valid hours out of 24 is rejected
      const readings15 = [...Array(15).fill(40), ...Array(9).fill(null)];
      const res15 = computeRollingAverage(readings15, 24, 16);
      expect(res15.isSufficient).toBe(false);
      expect(res15.average).toBeNull();
    });

    it("verifies 8-hr rolling completeness requires minimum 6 hours", () => {
      // 6 valid hours out of 8 is accepted
      const readings6 = [1.2, 1.4, 1.3, 1.5, 1.2, 1.4, null, null];
      const res6 = computeRollingAverage(readings6, 8, 6);
      expect(res6.isSufficient).toBe(true);
      expect(res6.average).toBe(1.3);

      // 5 valid hours out of 8 is rejected
      const readings5 = [1.2, 1.4, 1.3, 1.5, 1.2, null, null, null];
      const res5 = computeRollingAverage(readings5, 8, 6);
      expect(res5.isSufficient).toBe(false);
      expect(res5.average).toBeNull();
    });
  });

  describe("Scientific Telemetry Normalizer Integration", () => {
    const mockWeather: RawOpenMeteoWeather = {
      latitude: 28.6139,
      longitude: 77.209,
      current: {
        time: "2026-11-20T12:00:00Z",
        temperature_2m: 24.5,
        relative_humidity_2m: 55,
        wind_speed_10m: 8.2,
      },
      hourly: {
        time: Array.from({ length: 48 }, (_, i) => {
          const h = (i % 24).toString().padStart(2, "0");
          const day = i < 24 ? "19" : "20";
          return `2026-11-${day}T${h}:00:00Z`;
        }),
        temperature_2m: Array.from({ length: 48 }, () => 24.5),
        relative_humidity_2m: Array.from({ length: 48 }, () => 55),
        wind_speed_10m: Array.from({ length: 48 }, () => 8.2),
      },
    };

    const mockAirQuality: RawOpenMeteoAirQuality = {
      latitude: 28.6139,
      longitude: 77.209,
      current: {
        time: "2026-11-20T12:00:00Z",
        pm2_5: 85.0,
        pm10: 160.0,
        nitrogen_dioxide: 45.0,
        sulphur_dioxide: 20.0,
        ozone: 35.0,
        carbon_monoxide: 1500.0, // in µg/m³ (= 1.5 mg/m³)
        us_aqi: 166,
        european_aqi: 3,
      },
      hourly: {
        time: Array.from({ length: 48 }, (_, i) => {
          const h = (i % 24).toString().padStart(2, "0");
          const day = i < 24 ? "19" : "20";
          return `2026-11-${day}T${h}:00:00Z`;
        }),
        pm2_5: Array.from({ length: 48 }, () => 85.0),
        pm10: Array.from({ length: 48 }, () => 160.0),
        nitrogen_dioxide: Array.from({ length: 48 }, () => 45.0),
        sulphur_dioxide: Array.from({ length: 48 }, () => 20.0),
        ozone: Array.from({ length: 48 }, () => 35.0),
        carbon_monoxide: Array.from({ length: 48 }, () => 1500.0),
      },
    };

    it("accurately computes 24-hr rolling averages and converts CO units to mg/m³", () => {
      const normalized = normalizeTelemetry(
        DEFAULT_LOCATION,
        mockWeather,
        mockAirQuality,
        new Date("2026-11-20T12:15:00Z")
      );

      // Data Kind & Attribution
      expect(normalized.dataKind).toBe("modeled/forecast");
      expect(normalized.source).toContain("Open-Meteo Air Quality & Weather API");
      expect(normalized.source).toContain(DEFAULT_LOCATION.modelDomain!);

      // Pollutants verification
      const pm25 = normalized.pollutants.find((p) => p.code === "pm2_5");
      expect(pm25?.value).toBe(85.0);
      expect(pm25?.unit).toBe("µg/m³");
      expect(pm25?.averagingPeriod).toContain("24-hr rolling");
      expect(pm25?.rollingAverageValue).toBe(85.0);

      const co = normalized.pollutants.find((p) => p.code === "co");
      expect(co?.value).toBe(1500.0);
      expect(co?.unit).toBe("µg/m³");
      // Rolling average value in mg/m³
      expect(co?.rollingAverageValue).toBe(1.5);
      expect(co?.rollingAverageUnit).toBe("mg/m³");

      // CPCB NAQI evaluation
      const cpcb = normalized.aqi.cpcbAqi;
      expect(cpcb.methodology).toBe("model-derived-cpcb-method");
      expect(cpcb.value).toBe(184); // PM2.5 = 85 -> sub-index ~ 184 (Moderate)
      expect(cpcb.category).toBe("Moderate");
      expect(cpcb.dominantPollutant).toBe("PM2.5");

      // Dual Standards partition
      expect(normalized.aqi.usAqi.standard).toBe("US_EPA");
      expect(normalized.aqi.usAqi.value).toBe(166);
      expect(normalized.aqi.cpcbAqi.standard).toBe("IN_CPCB");
    });

    it("truthfully marks CPCB AQI as unavailable when insufficient historical data exists", () => {
      // Mock with incomplete hourly history (< 16 hours)
      const incompleteAir: RawOpenMeteoAirQuality = {
        ...mockAirQuality,
        hourly: {
          time: ["2026-11-20T11:00", "2026-11-20T12:00"], // only 2 hours
          pm2_5: [85.0, 85.0],
          pm10: [160.0, 160.0],
          nitrogen_dioxide: [45.0, 45.0],
        },
      };

      const normalized = normalizeTelemetry(
        DEFAULT_LOCATION,
        mockWeather,
        incompleteAir,
        new Date("2026-11-20T12:15:00Z")
      );

      expect(normalized.aqi.cpcbAqi.value).toBeNull();
      expect(normalized.aqi.cpcbAqi.category).toBe("Unavailable");
      expect(normalized.aqi.cpcbAqi.unavailabilityReason).toBeDefined();
    });

    it("verifies time freshness classification", () => {
      const now = new Date("2026-11-20T12:00:00Z");

      // Within 90 mins -> fresh
      const freshTelemetry = normalizeTelemetry(DEFAULT_LOCATION, mockWeather, mockAirQuality, now);
      expect(freshTelemetry.freshness).toBe("fresh");

      // 120 mins -> stale
      const staleTelemetry = normalizeTelemetry(
        DEFAULT_LOCATION,
        mockWeather,
        mockAirQuality,
        new Date("2026-11-20T14:10:00Z")
      );
      expect(staleTelemetry.freshness).toBe("stale");

      // 240 mins -> outdated
      const outdatedTelemetry = normalizeTelemetry(
        DEFAULT_LOCATION,
        mockWeather,
        mockAirQuality,
        new Date("2026-11-20T16:30:00Z")
      );
      expect(outdatedTelemetry.freshness).toBe("outdated");
    });
  });
});
