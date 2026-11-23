import { describe, it, expect } from "vitest";
import { evaluateOutdoorExerciseRule } from "@/lib/decision-engine/rules/outdoor-exercise.rule";
import { evaluateIndoorVentilationRule } from "@/lib/decision-engine/rules/indoor-ventilation.rule";
import { evaluateCommuteProtectionRule } from "@/lib/decision-engine/rules/commute-protection.rule";
import { evaluateAirFiltrationRule } from "@/lib/decision-engine/rules/air-filtration.rule";
import { evaluateVulnerableCareRule } from "@/lib/decision-engine/rules/vulnerable-care.rule";
import { DEFAULT_DEMO_PROFILE } from "@/lib/decision-engine/household-profile";
import type { HouseholdProfile } from "@/lib/decision-engine/types";
import type { NormalizedTelemetry } from "@/lib/telemetry/types";

describe("Deterministic Decision Engine Rule Modules", () => {
  // Base mock telemetry with Moderate PM2.5 (80 µg/m³) in Delhi NCR
  const mockTelemetryModerate: NormalizedTelemetry = {
    location: {
      id: "delhi-ncr",
      name: "Delhi NCR",
      region: "NCR",
      country: "India",
      latitude: 28.6139,
      longitude: 77.209,
      timezone: "Asia/Kolkata",
      modelDomain: "CAMS Global",
    },
    source: "Open-Meteo Air Quality & Weather API (CAMS Global)",
    dataKind: "modeled/forecast",
    timestamp: "2026-11-21T06:00:00Z",
    retrievedAt: "2026-11-21T06:10:00Z",
    freshness: "fresh",
    freshnessExplanation: "Fresh: telemetry received within last 90 minutes.",
    weather: {
      temperatureC: 18.2,
      apparentTemperatureC: 18.2,
      relativeHumidityPercent: 70,
      windSpeedKmH: 5.4,
      windDirectionDegrees: 290,
      surfacePressureHPa: 1016,
      weatherCode: 45,
      weatherLabel: "Foggy",
    },
    aqi: {
      usAqi: {
        standard: "US_EPA",
        name: "US EPA Air Quality Index",
        value: 164,
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
        name: "CPCB Indian National AQI",
        value: 167,
        category: "Moderate",
        dominantPollutant: "PM2.5",
        scaleMin: 0,
        scaleMax: 500,
        colorClass: "text-amber-700 bg-amber-50",
        methodology: "model-derived-cpcb-method",
      },
    },
    pollutants: [
      {
        code: "pm2_5",
        name: "Particulate Matter PM2.5",
        value: 80.0,
        unit: "µg/m³",
        averagingPeriod: "24-hr rolling (CPCB standard)",
        rollingAverageValue: 80.0,
        who24hGuideline: 15,
        status: "available",
      },
      {
        code: "pm10",
        name: "Particulate Matter PM10",
        value: 140.0,
        unit: "µg/m³",
        averagingPeriod: "24-hr rolling (CPCB standard)",
        rollingAverageValue: 140.0,
        who24hGuideline: 45,
        status: "available",
      },
    ],
    hourlyForecast: [
      {
        time: "2026-11-21T06:00:00Z",
        pm2_5: 80.0,
        pm10: 140.0,
        usAqi: 164,
        temperatureC: 18.2,
        humidityPercent: 70,
        windSpeedKmH: 5.4,
      },
      {
        time: "2026-11-21T14:00:00Z",
        pm2_5: 35.0, // Best window
        pm10: 75.0,
        usAqi: 99,
        temperatureC: 25.0,
        humidityPercent: 40,
        windSpeedKmH: 12.0,
      },
    ],
    disclaimer: "Modeled estimate.",
  };

  describe("Outdoor Exercise Rule", () => {
    it("returns null if user does not exercise outdoors", () => {
      const profileNoEx: HouseholdProfile = { ...DEFAULT_DEMO_PROFILE, outdoorExercise: "none" };
      const action = evaluateOutdoorExerciseRule(profileNoEx, mockTelemetryModerate);
      expect(action).toBeNull();
    });

    it("advises rescheduling early morning workout when PM2.5 is elevated", () => {
      const action = evaluateOutdoorExerciseRule(DEFAULT_DEMO_PROFILE, mockTelemetryModerate);
      expect(action).not.toBeNull();
      expect(action?.category).toBe("outdoor_activity");
      expect(action?.priority).toBe("urgent"); // elevated + children in profile
      expect(action?.actionText).toContain("Reschedule early morning run");
      expect(action?.planB).toBeDefined();
      expect(action?.planB?.triggerVariable).toBe("pm2_5");
      expect(action?.planB?.thresholdValue).toBe(60);
    });

    it("generates affirmative clean window advice when PM2.5 is low", () => {
      const cleanTelemetry: NormalizedTelemetry = {
        ...mockTelemetryModerate,
        pollutants: [
          {
            code: "pm2_5",
            name: "Particulate Matter PM2.5",
            value: 20.0, // clean
            unit: "µg/m³",
            averagingPeriod: "24-hr rolling (CPCB standard)",
            rollingAverageValue: 20.0,
            status: "available",
          },
        ],
        aqi: {
          ...mockTelemetryModerate.aqi,
          cpcbAqi: {
            ...mockTelemetryModerate.aqi.cpcbAqi,
            value: 33,
            category: "Good",
          },
        },
      };

      const action = evaluateOutdoorExerciseRule(DEFAULT_DEMO_PROFILE, cleanTelemetry);
      expect(action).not.toBeNull();
      expect(action?.priority).toBe("low");
      expect(action?.title).toContain("Optimal Outdoor Exercise Window");
    });
  });

  describe("Indoor Ventilation Rule", () => {
    it("advises kitchen exhaust usage while sealing living rooms during polluted air with cooking", () => {
      const cookingProfile: HouseholdProfile = {
        ...DEFAULT_DEMO_PROFILE,
        indoorSources: ["cooking_fumes"],
      };

      const action = evaluateIndoorVentilationRule(cookingProfile, mockTelemetryModerate);
      expect(action).not.toBeNull();
      expect(action?.category).toBe("indoor_air");
      expect(action?.title).toContain("Run Kitchen Exhaust; Keep Living Areas Sealed");
      expect(action?.tradeOffs).toContain("Kitchen exhaust removes indoor cooking emissions");
    });

    it("advises full room flushing when outdoor air is very clean", () => {
      const cleanTelemetry: NormalizedTelemetry = {
        ...mockTelemetryModerate,
        pollutants: [
          {
            code: "pm2_5",
            name: "Particulate Matter PM2.5",
            value: 15.0, // <= 30
            unit: "µg/m³",
            averagingPeriod: "24-hr rolling (CPCB standard)",
            status: "available",
          },
        ],
      };

      const action = evaluateIndoorVentilationRule(DEFAULT_DEMO_PROFILE, cleanTelemetry);
      expect(action).not.toBeNull();
      expect(action?.title).toContain("Natural Air Exchange & Room Flushing");
    });
  });

  describe("Commute Protection Rule", () => {
    it("returns null if user works from home", () => {
      const wfhProfile: HouseholdProfile = { ...DEFAULT_DEMO_PROFILE, primaryCommute: "work_from_home" };
      const action = evaluateCommuteProtectionRule(wfhProfile, mockTelemetryModerate);
      expect(action).toBeNull();
    });

    it("advises N95 respirator for active walking/biking commuters during elevated PM2.5", () => {
      const bikeProfile: HouseholdProfile = { ...DEFAULT_DEMO_PROFILE, primaryCommute: "active_walking_biking" };
      const action = evaluateCommuteProtectionRule(bikeProfile, mockTelemetryModerate);
      expect(action).not.toBeNull();
      expect(action?.category).toBe("commute");
      expect(action?.title).toContain("Wear Certified Particulate Respirator");
      expect(action?.impactClassification).toBe("exposure_reduction");
      expect(action?.planB).toBeDefined();
    });

    it("advises HVAC recirculation for vehicle commuters", () => {
      const carProfile: HouseholdProfile = { ...DEFAULT_DEMO_PROFILE, primaryCommute: "personal_vehicle" };
      const action = evaluateCommuteProtectionRule(carProfile, mockTelemetryModerate);
      expect(action).not.toBeNull();
      expect(action?.title).toContain("Activate Vehicle Cabin Recirculation");
    });
  });

  describe("Air Filtration Rule", () => {
    it("advises bedroom runtime prioritization for households with HEPA purifiers", () => {
      const hepaProfile: HouseholdProfile = { ...DEFAULT_DEMO_PROFILE, filtration: "hepa_purifier" };
      const action = evaluateAirFiltrationRule(hepaProfile, mockTelemetryModerate);
      expect(action).not.toBeNull();
      expect(action?.title).toContain("Deploy HEPA Purifier in Primary Sleeping Quarters");
      expect(action?.evidenceReferences[0]).toContain("CADR");
    });

    it("provides zero-cost damp wiping and draft sealing when no purifier is owned", () => {
      const noFilterProfile: HouseholdProfile = {
        ...DEFAULT_DEMO_PROFILE,
        filtration: "none",
        budgetPreference: "no_cost",
      };
      const action = evaluateAirFiltrationRule(noFilterProfile, mockTelemetryModerate);
      expect(action).not.toBeNull();
      expect(action?.title).toContain("Zero-Cost Indoor Dust Suppression");
      expect(action?.actionText).toContain("wet-mopping");
    });
  });

  describe("Vulnerable Member Care Rule", () => {
    it("returns null when household contains only healthy adults with no declared sensitivities", () => {
      const healthyAdultProfile: HouseholdProfile = {
        ...DEFAULT_DEMO_PROFILE,
        members: ["adults"],
        declaredSensitivity: "none",
        hasSchoolRoutine: false,
      };
      const action = evaluateVulnerableCareRule(healthyAdultProfile, mockTelemetryModerate);
      expect(action).toBeNull();
    });

    it("triggers school transit safeguard when children and school routine are present", () => {
      const schoolProfile: HouseholdProfile = {
        ...DEFAULT_DEMO_PROFILE,
        members: ["adults", "children"],
        hasSchoolRoutine: true,
      };
      const action = evaluateVulnerableCareRule(schoolProfile, mockTelemetryModerate);
      expect(action).not.toBeNull();
      expect(action?.title).toContain("School Routine & Children's Exposure Safeguards");
      expect(action?.actionText).toContain("youth-sized N95/KN95");
    });

    it("triggers fast-acting inhaler accessibility advisory when asthma sensitivity is declared", () => {
      const asthmaProfile: HouseholdProfile = {
        ...DEFAULT_DEMO_PROFILE,
        members: ["adults"],
        declaredSensitivity: "respiratory_asthma",
      };
      const action = evaluateVulnerableCareRule(asthmaProfile, mockTelemetryModerate);
      expect(action).not.toBeNull();
      expect(action?.title).toContain("Respiratory Care & Inhaler Accessibility");
    });
  });
});
