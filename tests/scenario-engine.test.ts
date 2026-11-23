import { describe, it, expect } from "vitest";
import {
  compareOutdoorTiming,
  compareIndoorVsOutdoor,
  compareCommuteMode,
  compareFiltrationHypothetical,
  findForecastPointByTime,
} from "@/lib/scenarios/engine";
import {
  OutdoorTimingInputSchema,
  IndoorVsOutdoorInputSchema,
  CommuteModeInputSchema,
  FiltrationHypotheticalInputSchema,
} from "@/lib/scenarios/schemas";
import type { NormalizedTelemetry } from "@/lib/telemetry/types";

describe("Scenario Simulator — Pure Deterministic Engine", () => {
  const sampleTelemetry: NormalizedTelemetry = {
    location: {
      id: "delhi-ncr",
      name: "Delhi NCR",
      region: "NCR",
      country: "India",
      latitude: 28.6139,
      longitude: 77.209,
      timezone: "Asia/Kolkata",
    },
    source: "Open-Meteo Air Quality & Weather API (CAMS Global)",
    dataKind: "modeled/forecast",
    timestamp: "2026-11-22T06:00:00Z",
    retrievedAt: "2026-11-22T06:10:00Z",
    freshness: "fresh",
    freshnessExplanation: "Telemetry verified within 15 minutes",
    weather: {
      temperatureC: 22,
      apparentTemperatureC: 22,
      relativeHumidityPercent: 60,
      windSpeedKmH: 8,
      windDirectionDegrees: 280,
      surfacePressureHPa: 1012,
      weatherCode: 1,
      weatherLabel: "Clear",
    },
    aqi: {
      usAqi: {
        standard: "US_EPA",
        name: "US EPA Air Quality Index",
        value: 175,
        category: "Unhealthy",
        scaleMin: 0,
        scaleMax: 500,
        colorClass: "text-rose-700 bg-rose-50",
        methodology: "modeled-forecast",
      },
      europeanAqi: {
        standard: "EU_EAQI",
        name: "European Air Quality Index",
        value: 4,
        category: "Poor",
        scaleMin: 1,
        scaleMax: 6,
        colorClass: "text-orange-700 bg-orange-50",
        methodology: "modeled-forecast",
      },
      cpcbAqi: {
        standard: "IN_CPCB",
        name: "Indian National AQI",
        value: 260,
        category: "Poor",
        dominantPollutant: "PM2.5",
        scaleMin: 0,
        scaleMax: 500,
        colorClass: "text-orange-700 bg-orange-50",
        methodology: "model-derived-cpcb-method",
      },
    },
    pollutants: [
      {
        code: "pm2_5",
        name: "PM2.5",
        value: 110,
        unit: "µg/m³",
        averagingPeriod: "1-hour instantaneous",
        status: "available",
      },
    ],
    hourlyForecast: [
      {
        time: "2026-11-22T06:00:00Z",
        pm2_5: 140,
        pm10: 220,
        usAqi: 195,
        temperatureC: 18,
        humidityPercent: 75,
        windSpeedKmH: 4,
      },
      {
        time: "2026-11-22T08:00:00Z",
        pm2_5: 120,
        pm10: 190,
        usAqi: 184,
        temperatureC: 20,
        humidityPercent: 68,
        windSpeedKmH: 6,
      },
      {
        time: "2026-11-22T13:00:00Z",
        pm2_5: 65,
        pm10: 110,
        usAqi: 156,
        temperatureC: 26,
        humidityPercent: 45,
        windSpeedKmH: 12,
      },
      {
        time: "2026-11-22T19:00:00Z",
        pm2_5: 160,
        pm10: 250,
        usAqi: 210,
        temperatureC: 21,
        humidityPercent: 65,
        windSpeedKmH: 5,
      },
    ],
    disclaimer: "Modeled CPCB AQI Estimate.",
  };

  describe("Zod Input Schemas", () => {
    it("validates valid OutdoorTimingInput", () => {
      const parsed = OutdoorTimingInputSchema.safeParse({
        scenarioType: "outdoor_timing",
        baselineHourIso: "2026-11-22T06:00:00Z",
        alternativeHourIso: "2026-11-22T13:00:00Z",
        activityType: "exercise",
      });
      expect(parsed.success).toBe(true);
    });

    it("rejects OutdoorTimingInput with empty hour strings", () => {
      const parsed = OutdoorTimingInputSchema.safeParse({
        scenarioType: "outdoor_timing",
        baselineHourIso: "",
        alternativeHourIso: "2026-11-22T13:00:00Z",
      });
      expect(parsed.success).toBe(false);
    });

    it("validates valid IndoorVsOutdoorInput", () => {
      const parsed = IndoorVsOutdoorInputSchema.safeParse({
        scenarioType: "indoor_vs_outdoor",
        forecastHourIso: "2026-11-22T06:00:00Z",
        indoorFiltrationActive: true,
        roomVentilationState: "sealed_windows",
      });
      expect(parsed.success).toBe(true);
    });

    it("validates valid CommuteModeInput", () => {
      const parsed = CommuteModeInputSchema.safeParse({
        scenarioType: "commute_mode",
        forecastHourIso: "2026-11-22T08:00:00Z",
        baselineMode: "open_two_wheeler_auto",
        alternativeMode: "closed_public_transit_metro",
      });
      expect(parsed.success).toBe(true);
    });

    it("validates valid FiltrationHypotheticalInput", () => {
      const parsed = FiltrationHypotheticalInputSchema.safeParse({
        scenarioType: "filtration_hypothetical",
        roomVolumeCuM: 45,
        ratedCadrM3h: 300,
        fanSpeedMode: "maximum_certified",
      });
      expect(parsed.success).toBe(true);
    });

    it("rejects non-positive room volume or CADR", () => {
      const parsed = FiltrationHypotheticalInputSchema.safeParse({
        scenarioType: "filtration_hypothetical",
        roomVolumeCuM: -10,
        ratedCadrM3h: 0,
      });
      expect(parsed.success).toBe(false);
    });
  });

  describe("compareOutdoorTiming", () => {
    it("identifies midday dispersion window as substantially better than early morning inversion", () => {
      const res = compareOutdoorTiming(
        sampleTelemetry,
        {
          scenarioType: "outdoor_timing",
          baselineHourIso: "2026-11-22T06:00:00Z",
          alternativeHourIso: "2026-11-22T13:00:00Z",
          activityType: "exercise",
        },
        null
      );

      expect(res.scenarioType).toBe("outdoor_timing");
      expect(res.baseline.forecastedPm25).toBe(140);
      expect(res.alternative.forecastedPm25).toBe(65);
      expect(res.delta.pm25Difference).toBe(-75);
      expect(res.delta.qualitativeAssessment).toBe("substantially_better");
      expect(res.delta.summaryText).toContain("lower ambient fine particulate concentration");
      expect(res.receipt.applicableRuleId).toBe("aeris-rule-outdoor-exercise");
      expect(res.lowEmissionAlternative).not.toBeNull();
      expect(res.lowEmissionAlternative?.title).toContain("Diurnal Dispersion Coordination");
    });

    it("identifies evening rush inversion as worse than midday baseline", () => {
      const res = compareOutdoorTiming(
        sampleTelemetry,
        {
          scenarioType: "outdoor_timing",
          baselineHourIso: "2026-11-22T13:00:00Z",
          alternativeHourIso: "2026-11-22T19:00:00Z",
          activityType: "commute",
        },
        null
      );

      expect(res.delta.pm25Difference).toBe(95);
      expect(res.delta.qualitativeAssessment).toBe("worse");
      expect(res.delta.summaryText).toContain("higher forecasted ambient PM2.5");
    });

    it("handles missing forecast hour gracefully without throwing", () => {
      const res = compareOutdoorTiming(
        sampleTelemetry,
        {
          scenarioType: "outdoor_timing",
          baselineHourIso: "2026-11-25T00:00:00Z", // Non-existent hour
          alternativeHourIso: "2026-11-22T13:00:00Z",
          activityType: "exercise",
        },
        null
      );

      expect(res.baseline.forecastedPm25).toBeNull();
      expect(res.delta.qualitativeAssessment).toBe("unknown");
    });
  });

  describe("compareIndoorVsOutdoor", () => {
    it("enforces Rule 10: does NOT fabricate an indoor PM2.5 sensor value", () => {
      const res = compareIndoorVsOutdoor(
        sampleTelemetry,
        {
          scenarioType: "indoor_vs_outdoor",
          forecastHourIso: "2026-11-22T06:00:00Z",
          indoorFiltrationActive: true,
          roomVentilationState: "sealed_windows",
        },
        null
      );

      // Must strictly be null — no fabricated indoor concentration
      expect(res.alternative.forecastedPm25).toBeNull();
      expect(res.alternative.isHypotheticalSimulated).toBe(true);
      expect(res.alternative.contextNotes.some((n) => n.includes("Rule 10"))).toBe(true);
      expect(res.delta.summaryText).toContain("Moving strenuous exertion indoors avoids direct exposure");
      expect(res.lowEmissionAlternative?.title).toContain("Home & Community Gym Substitution");
    });
  });

  describe("compareCommuteMode", () => {
    it("evaluates closed electric metro as substantially better physical barrier than open kerbside two-wheeler", () => {
      const res = compareCommuteMode(
        sampleTelemetry,
        {
          scenarioType: "commute_mode",
          forecastHourIso: "2026-11-22T08:00:00Z",
          baselineMode: "open_two_wheeler_auto",
          alternativeMode: "closed_public_transit_metro",
        },
        null
      );

      expect(res.delta.qualitativeAssessment).toBe("substantially_better");
      expect(res.delta.summaryText).toContain("Switching from open kerbside travel to enclosed transit");
      expect(res.receipt.applicableRuleId).toBe("aeris-rule-commute-protection");
      expect(res.lowEmissionAlternative?.emissionCategory).toBe("mass_transit");
      expect(res.lowEmissionAlternative?.title).toContain("Electric Metro");
    });

    it("evaluates open walking as worse exposure barrier than closed car during high-pollution hour", () => {
      const res = compareCommuteMode(
        sampleTelemetry,
        {
          scenarioType: "commute_mode",
          forecastHourIso: "2026-11-22T06:00:00Z",
          baselineMode: "private_car_ac",
          alternativeMode: "active_walking_biking",
        },
        null
      );

      expect(res.delta.qualitativeAssessment).toBe("worse");
      expect(res.delta.summaryText).toContain("Switching to open-air travel increases direct proximity to roadway emissions");
    });
  });

  describe("compareFiltrationHypothetical", () => {
    it("calculates air changes per hour (ACH) correctly and verifies AHAM benchmark", () => {
      // 300 m³/h CADR in 50 m³ volume = 6.0 ACH (>= 4.5 -> substantially better)
      const res = compareFiltrationHypothetical(sampleTelemetry, {
        scenarioType: "filtration_hypothetical",
        roomVolumeCuM: 50,
        ratedCadrM3h: 300,
        fanSpeedMode: "maximum_certified",
      });

      expect(res.delta.qualitativeAssessment).toBe("substantially_better");
      expect(res.delta.summaryText).toContain("6 ACH meets the ANSI/AHAM AC-1 engineering benchmark");
      expect(res.alternative.contextNotes.some((n) => n.includes("DO NOT remove carbon monoxide"))).toBe(true);
      expect(res.lowEmissionAlternative?.title).toContain("Clean Haven");
    });

    it("evaluates undersized filtration (< 3.0 ACH) as worse / below recommended threshold", () => {
      // 100 m³/h CADR in 50 m³ volume = 2.0 ACH (< 3.0 -> worse)
      const res = compareFiltrationHypothetical(sampleTelemetry, {
        scenarioType: "filtration_hypothetical",
        roomVolumeCuM: 50,
        ratedCadrM3h: 100,
        fanSpeedMode: "maximum_certified",
      });

      expect(res.delta.qualitativeAssessment).toBe("worse");
      expect(res.delta.summaryText).toContain("below the recommended 3.0 ACH minimum threshold");
    });

    it("includes low-speed unverified warning when low sleep fan speed mode is chosen", () => {
      const res = compareFiltrationHypothetical(sampleTelemetry, {
        scenarioType: "filtration_hypothetical",
        roomVolumeCuM: 30,
        ratedCadrM3h: 200,
        fanSpeedMode: "low_quiet_unverified",
      });

      expect(res.alternative.contextNotes.some((n) => n.includes("unverified and substantially lower clean air delivery"))).toBe(true);
    });
  });

  describe("findForecastPointByTime", () => {
    it("returns null if hourlyForecast array is empty", () => {
      const emptyTelemetry = { ...sampleTelemetry, hourlyForecast: [] };
      const pt = findForecastPointByTime(emptyTelemetry, "2026-11-22T06:00:00Z");
      expect(pt).toBeNull();
    });
  });
});
