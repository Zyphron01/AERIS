import { describe, it, expect } from "vitest";
import {
  calculateSubIndex,
  getCpcbCategory,
  calculateOverallCpcbAqi,
  computeRollingAverage,
  convertUgM3ToMgM3,
} from "@/lib/aqi/cpcb-aqi";

describe("CPCB Indian National Air Quality Index (NAQI) Scientific Engine", () => {
  describe("calculateSubIndex across official CPCB (2014) breakpoints", () => {
    it("calculates PM2.5 sub-index correctly across all categories", () => {
      // Good category: 0-30 -> 0-50
      expect(calculateSubIndex("pm2_5", 15)).toBe(25);
      expect(calculateSubIndex("pm2_5", 30)).toBe(50);

      // Satisfactory: 31-60 -> 51-100
      expect(calculateSubIndex("pm2_5", 45)).toBe(76);
      expect(calculateSubIndex("pm2_5", 60)).toBe(100);

      // Moderate: 61-90 -> 101-200
      expect(calculateSubIndex("pm2_5", 75)).toBe(151);

      // Poor: 91-120 -> 201-300
      expect(calculateSubIndex("pm2_5", 105)).toBe(251);

      // Very Poor: 121-250 -> 301-400
      expect(calculateSubIndex("pm2_5", 185)).toBe(351);

      // Severe: 251-500 -> 401-500
      expect(calculateSubIndex("pm2_5", 375)).toBe(451);
    });

    it("calculates PM10 sub-index correctly across all categories", () => {
      expect(calculateSubIndex("pm10", 25)).toBe(25);
      expect(calculateSubIndex("pm10", 75)).toBe(76);
      expect(calculateSubIndex("pm10", 175)).toBe(151);
      expect(calculateSubIndex("pm10", 300)).toBe(251);
      expect(calculateSubIndex("pm10", 390)).toBe(351);
      expect(calculateSubIndex("pm10", 515)).toBe(451);
    });

    it("calculates Carbon Monoxide (CO) sub-index using official mg/m³ breakpoints", () => {
      // CPCB defines CO in mg/m³:
      // 0-1.0 -> 0-50 (Good)
      expect(calculateSubIndex("co", 0.5)).toBe(25);
      expect(calculateSubIndex("co", 1.0)).toBe(50);

      // 1.1-2.0 -> 51-100 (Satisfactory)
      expect(calculateSubIndex("co", 1.5)).toBe(76);
      expect(calculateSubIndex("co", 2.0)).toBe(100);

      // 2.1-10.0 -> 101-200 (Moderate)
      expect(calculateSubIndex("co", 6.0)).toBe(151);
      expect(calculateSubIndex("co", 10.0)).toBe(200);

      // 10.1-17.0 -> 201-300 (Poor)
      expect(calculateSubIndex("co", 13.5)).toBe(251);

      // 17.1-34.0 -> 301-400 (Very Poor)
      expect(calculateSubIndex("co", 25.5)).toBe(351);

      // 34.1-50.0 -> 401-500 (Severe)
      expect(calculateSubIndex("co", 42.0)).toBe(451);
    });

    it("converts µg/m³ to mg/m³ correctly for Open-Meteo CO readings", () => {
      expect(convertUgM3ToMgM3(1000)).toBe(1.0);
      expect(convertUgM3ToMgM3(2000)).toBe(2.0);
      expect(convertUgM3ToMgM3(6000)).toBe(6.0);
      expect(convertUgM3ToMgM3(450)).toBe(0.45);
    });

    it("handles zero values and caps extreme concentrations at 500", () => {
      expect(calculateSubIndex("pm2_5", 0)).toBe(0);
      expect(calculateSubIndex("pm10", 0)).toBe(0);
      expect(calculateSubIndex("co", 0)).toBe(0);
      expect(calculateSubIndex("pm2_5", 850)).toBe(500); // capped at CPCB maximum
      expect(calculateSubIndex("co", 100)).toBe(500); // capped at CPCB maximum
    });

    it("returns null for negative, NaN, infinite, or unknown inputs", () => {
      expect(calculateSubIndex("pm2_5", -10)).toBeNull();
      expect(calculateSubIndex("pm2_5", NaN)).toBeNull();
      expect(calculateSubIndex("pm2_5", Infinity)).toBeNull();
      expect(calculateSubIndex("unknown_gas", 50)).toBeNull();
    });
  });

  describe("getCpcbCategory mapping", () => {
    it("maps numerical index to official CPCB categories", () => {
      expect(getCpcbCategory(0)).toBe("Good");
      expect(getCpcbCategory(35)).toBe("Good");
      expect(getCpcbCategory(50)).toBe("Good");
      expect(getCpcbCategory(51)).toBe("Satisfactory");
      expect(getCpcbCategory(75)).toBe("Satisfactory");
      expect(getCpcbCategory(100)).toBe("Satisfactory");
      expect(getCpcbCategory(101)).toBe("Moderate");
      expect(getCpcbCategory(150)).toBe("Moderate");
      expect(getCpcbCategory(200)).toBe("Moderate");
      expect(getCpcbCategory(201)).toBe("Poor");
      expect(getCpcbCategory(250)).toBe("Poor");
      expect(getCpcbCategory(300)).toBe("Poor");
      expect(getCpcbCategory(301)).toBe("Very Poor");
      expect(getCpcbCategory(350)).toBe("Very Poor");
      expect(getCpcbCategory(400)).toBe("Very Poor");
      expect(getCpcbCategory(401)).toBe("Severe");
      expect(getCpcbCategory(450)).toBe("Severe");
      expect(getCpcbCategory(500)).toBe("Severe");
    });
  });

  describe("computeRollingAverage completeness enforcement", () => {
    it("calculates 24-hr average when completeness meets CPCB threshold (≥ 16 hours)", () => {
      const readings24 = Array.from({ length: 24 }, () => 50);
      const res = computeRollingAverage(readings24, 24, 16);
      expect(res.isSufficient).toBe(true);
      expect(res.validCount).toBe(24);
      expect(res.average).toBe(50);
    });

    it("calculates 24-hr average with 18 valid readings and 6 null readings", () => {
      const readings = [...Array.from({ length: 18 }, () => 60), ...Array.from({ length: 6 }, () => null)];
      const res = computeRollingAverage(readings, 24, 16);
      expect(res.isSufficient).toBe(true);
      expect(res.validCount).toBe(18);
      expect(res.average).toBe(60);
    });

    it("rejects 24-hr average when valid readings are below CPCB threshold (< 16 hours)", () => {
      const readings = [...Array.from({ length: 15 }, () => 60), ...Array.from({ length: 9 }, () => null)];
      const res = computeRollingAverage(readings, 24, 16);
      expect(res.isSufficient).toBe(false);
      expect(res.validCount).toBe(15);
      expect(res.average).toBeNull();
    });

    it("calculates 8-hr average for CO/O3 when completeness meets threshold (≥ 6 hours)", () => {
      const readings8 = Array.from({ length: 8 }, () => 2.0);
      const res = computeRollingAverage(readings8, 8, 6);
      expect(res.isSufficient).toBe(true);
      expect(res.validCount).toBe(8);
      expect(res.average).toBe(2.0);
    });

    it("rejects 8-hr average when valid readings are below threshold (< 6 hours)", () => {
      const readings = [2.0, 2.0, 2.0, 2.0, 2.0, null, null, null]; // 5 valid
      const res = computeRollingAverage(readings, 8, 6);
      expect(res.isSufficient).toBe(false);
      expect(res.validCount).toBe(5);
      expect(res.average).toBeNull();
    });
  });

  describe("calculateOverallCpcbAqi regulatory criteria", () => {
    it("determines overall AQI and dominant pollutant when all criteria are met", () => {
      const readings = {
        pm2_5: 110, // sub-index 267 (Poor)
        pm10: 80,   // sub-index 81 (Satisfactory)
        no2: 30,    // sub-index 38 (Good)
      };

      const result = calculateOverallCpcbAqi(readings);
      expect(result.aqi).toBe(267);
      expect(result.category).toBe("Poor");
      expect(result.dominantPollutant).toBe("PM2.5");
      expect(result.meetsCpcbCriteria).toBe(true);
      expect(result.unavailabilityReason).toBeUndefined();
    });

    it("strictly returns null and Unavailable when fewer than 3 pollutants are available", () => {
      const readings = {
        pm2_5: 80,
        pm10: 90,
      };

      const result = calculateOverallCpcbAqi(readings);
      expect(result.meetsCpcbCriteria).toBe(false);
      expect(result.aqi).toBeNull();
      expect(result.category).toBe("Unavailable");
      expect(result.unavailabilityReason).toContain("Minimum 3 pollutants required");
    });

    it("strictly returns null and Unavailable when at least 3 pollutants are present but NEITHER PM2.5 NOR PM10 is monitored", () => {
      const gasOnlyReadings = {
        no2: 50,
        so2: 30,
        co: 1.5,
      };

      const result = calculateOverallCpcbAqi(gasOnlyReadings);
      expect(result.meetsCpcbCriteria).toBe(false);
      expect(result.aqi).toBeNull();
      expect(result.category).toBe("Unavailable");
      expect(result.unavailabilityReason).toContain("At least one particulate pollutant (PM2.5 or PM10) is mandatory");
    });

    it("handles all-null readings gracefully without fabricating data", () => {
      const result = calculateOverallCpcbAqi({
        pm2_5: null,
        pm10: null,
      });

      expect(result.aqi).toBeNull();
      expect(result.category).toBe("Unavailable");
      expect(result.meetsCpcbCriteria).toBe(false);
    });
  });
});
