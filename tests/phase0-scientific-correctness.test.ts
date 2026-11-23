import { describe, it, expect } from "vitest";
import { rankRecommendations } from "@/lib/decision-engine/ranker";
import { evaluateOutdoorExerciseRule } from "@/lib/decision-engine/rules/outdoor-exercise.rule";
import { evaluateCommuteProtectionRule } from "@/lib/decision-engine/rules/commute-protection.rule";
import { evaluateIndoorVentilationRule } from "@/lib/decision-engine/rules/indoor-ventilation.rule";
import { evaluateVulnerableCareRule } from "@/lib/decision-engine/rules/vulnerable-care.rule";
import { evaluateWindowAndVentilation, generateIndoorAirPlan } from "@/lib/indoor-air/rules";
import { computePurifierAdvisor } from "@/lib/indoor-air/calculations";
import { verifyRateLimitStore } from "@/lib/gemini/rate-limiter";
import type { HouseholdProfile, RecommendationAction } from "@/lib/decision-engine/types";
import type { NormalizedTelemetry } from "@/lib/telemetry/types";

describe("Phase 0 — Scientific Correctness & Safety Priority Invariants", () => {
  const baseProfile: HouseholdProfile = {
    id: "profile-test-safety",
    members: ["adults", "children", "older_adults"],
    declaredSensitivity: "respiratory_asthma",
    primaryCommute: "active_walking_biking",
    outdoorExercise: "early_morning",
    hasSchoolRoutine: true,
    filtration: "hepa_purifier",
    ventilationPreference: "natural_windows",
    indoorSources: ["cooking_fumes"],
    budgetPreference: "limited",
    updatedAt: "2026-11-21T06:00:00Z",
  };

  const sampleTelemetry: NormalizedTelemetry = {
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
      temperatureC: 22.0,
      apparentTemperatureC: 22.0,
      relativeHumidityPercent: 65,
      windSpeedKmH: 6.0,
      windDirectionDegrees: 270,
      surfacePressureHPa: 1015,
      weatherCode: 1,
      weatherLabel: "Mainly Clear",
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
        name: "Indian National AQI (CPCB Methodology)",
        value: 260,
        category: "Poor",
        dominantPollutant: "PM2.5",
        subIndices: { pm2_5: 260, pm10: 165 },
        scaleMin: 0,
        scaleMax: 500,
        colorClass: "text-orange-700 bg-orange-50",
        methodology: "model-derived-cpcb-method",
        calculationBasis: "Modeled CPCB-method estimate.",
      },
    },
    pollutants: [
      {
        code: "pm2_5",
        name: "PM2.5",
        value: 110.0,
        unit: "µg/m³",
        averagingPeriod: "24h",
        status: "available",
      },
      {
        code: "pm10",
        name: "PM10",
        value: 195.0,
        unit: "µg/m³",
        averagingPeriod: "24h",
        status: "available",
      },
    ],
    hourlyForecast: [
      {
        time: "2026-11-21T06:00:00Z",
        pm2_5: 110.0,
        pm10: 195.0,
        usAqi: 175,
        temperatureC: 22.0,
        humidityPercent: 65,
        windSpeedKmH: 6.0,
      },
      {
        time: "2026-11-21T14:00:00Z",
        pm2_5: 45.0,
        pm10: 85.0,
        usAqi: 120,
        temperatureC: 26.0,
        humidityPercent: 45,
        windSpeedKmH: 12.0,
      },
    ],
    disclaimer: "Modeled CPCB-method estimate.",
  };

  const createDummyAction = (
    id: string,
    category: RecommendationAction["category"],
    priority: RecommendationAction["priority"]
  ): RecommendationAction => ({
    id,
    category,
    priority,
    title: `Action ${id}`,
    actionText: `Steps for ${id}`,
    reason: `Reason for ${id}`,
    evidenceReferences: ["CPCB NAQI Guidelines (2014)"],
    tradeOffs: "Minor trade-off",
    impactClassification: "exposure_reduction",
    limitations: "Guidance only",
    sourceValidityTimestamp: "2026-11-21T06:00:00Z",
    applicableRuleId: `AERIS-RULE-${id.toUpperCase()}`,
    explanation: {
      influencingFactors: ["Factor 1"],
      ruleTriggered: `AERIS-RULE-${id.toUpperCase()}`,
      sourceAttribution: "Open-Meteo",
      dataTimestamp: "2026-11-21T06:00:00Z",
      assumptions: ["Standard respiration"],
      uncertainties: ["Spatial resolution"],
    },
  });

  describe("Critical Safety Priority vs. Category Diversity Invariant", () => {
    it("never drops or bypasses urgent actions in favor of lower priority actions for diversity", () => {
      // Scenario: Two urgent actions in 'protective_measures' and one in 'outdoor_activity'
      // plus a low-priority action in 'indoor_air'
      const candidates: RecommendationAction[] = [
        createDummyAction("urgent-pediatric", "protective_measures", "urgent"),
        createDummyAction("urgent-asthma", "protective_measures", "urgent"),
        createDummyAction("urgent-exercise", "outdoor_activity", "urgent"),
        createDummyAction("low-ventilation", "indoor_air", "low"),
      ];

      const ranked = rankRecommendations(candidates, baseProfile, 3);

      expect(ranked).toHaveLength(3);
      // All 3 selected actions MUST be the urgent ones; low-ventilation must NOT displace an urgent action!
      expect(ranked.map((a) => a.id)).toEqual([
        "urgent-pediatric",
        "urgent-asthma",
        "urgent-exercise",
      ]);
      expect(ranked.every((a) => a.priority === "urgent")).toBe(true);
    });

    it("applies category diversity across non-urgent actions when slots remain", () => {
      const candidates: RecommendationAction[] = [
        createDummyAction("urgent-1", "protective_measures", "urgent"),
        createDummyAction("high-outdoor-1", "outdoor_activity", "high"),
        createDummyAction("high-outdoor-2", "outdoor_activity", "high"),
        createDummyAction("moderate-indoor", "indoor_air", "moderate"),
      ];

      const ranked = rankRecommendations(candidates, baseProfile, 3);

      expect(ranked).toHaveLength(3);
      expect(ranked[0].id).toBe("urgent-1"); // Urgent picked first
      // Remaining 2 slots pick distinct categories: outdoor_activity and indoor_air
      const categories = ranked.map((a) => a.category);
      expect(categories).toContain("protective_measures");
      expect(categories).toContain("outdoor_activity");
      expect(categories).toContain("indoor_air");
    });
  });

  describe("Plan B Scientific Defensibility & Averaging Period Invariants", () => {
    it("outdoor exercise rule explicitly identifies hourly forecast trend rather than official 24h breakpoint", () => {
      const action = evaluateOutdoorExerciseRule(baseProfile, sampleTelemetry);
      expect(action).not.toBeNull();
      expect(action?.planB).toBeDefined();

      const planB = action!.planB!;
      // Must state hourly forecast trend
      expect(planB.triggerCondition).toContain("hourly forecast");
      expect(planB.thresholdUnit).toContain("hourly forecast");
      // Must attribute chemical transport forecast, not official station data
      expect(planB.source).toContain("Open-Meteo");
    });

    it("commute protection rule attributes forecast model to projected AQI points", () => {
      const action = evaluateCommuteProtectionRule(baseProfile, sampleTelemetry);
      expect(action).not.toBeNull();
      expect(action?.planB).toBeDefined();

      const planB = action!.planB!;
      expect(planB.triggerCondition).toContain("projected Severe conditions");
      expect(planB.thresholdUnit).toContain("projected");
      expect(planB.source).toContain("Chemical Transport Model Forecast");
    });

    it("indoor ventilation rule frames threshold around daytime hourly dispersion drop", () => {
      const action = evaluateIndoorVentilationRule(baseProfile, sampleTelemetry);
      expect(action).not.toBeNull();
      expect(action?.planB).toBeDefined();

      const planB = action!.planB!;
      expect(planB.triggerCondition).toContain("hourly forecast PM2.5");
      expect(planB.thresholdUnit).toContain("hourly forecast");
    });

    it("vulnerable care rule attributes projected trend and cites ATS and WHO clinical guidelines", () => {
      const action = evaluateVulnerableCareRule(baseProfile, sampleTelemetry);
      expect(action).not.toBeNull();
      expect(action?.planB).toBeDefined();

      const planB = action!.planB!;
      expect(planB.triggerCondition).toContain("hourly projected PM2.5 > 250");
      expect(planB.thresholdUnit).toContain("hourly projected trend");

      // Verifies documented scientific guidance citations
      expect(action!.evidenceReferences.some((r) => r.includes("WHO"))).toBe(true);
      expect(action!.evidenceReferences.some((r) => r.includes("American Thoracic Society"))).toBe(true);
    });
  });

  describe("Milestone 6 Phase 0 — Scientific Invariants & Rate Limiter Store Verification", () => {
    it("distinguishes appliance inspection from acute gas/CO evacuation emergencies", () => {
      const userState = {
        roomType: "kitchen" as const,
        windowState: "all_closed" as const,
        combustionSources: ["cooking_unvented" as const],
        dustActivities: ["none" as const],
        occupancyCount: 1,
        perceivedStuffiness: "odorous" as const,
        hasExhaustFanRunning: false,
        hasAirConditionerRunning: false,
        thermalComfort: "comfortable" as const,
      };

      const action = evaluateWindowAndVentilation(sampleTelemetry, userState, null);
      expect(action.actionText).toContain("1) URGENT GAS & CO EMERGENCY:");
      expect(action.actionText).toContain("2) APPLIANCE INSPECTION:");
      expect(action.actionText).toContain("3) FILTRATION LIMIT:");
      expect(action.actionText).toContain("persistently yellow or orange");
      expect(action.actionText).toContain("professional inspection and servicing by a qualified gas technician");
    });

    it("uses context-dependent heat warnings rather than absolute fan prohibitions", () => {
      const hotTelemetry = {
        ...sampleTelemetry,
        weather: {
          ...sampleTelemetry.weather,
          temperatureC: 38.0,
        },
      };

      const userState = {
        roomType: "bedroom" as const,
        windowState: "all_closed" as const,
        combustionSources: ["none" as const],
        dustActivities: ["none" as const],
        occupancyCount: 1,
        perceivedStuffiness: "stuffy_drowsy" as const,
        hasExhaustFanRunning: false,
        hasAirConditionerRunning: false,
        thermalComfort: "too_hot" as const,
      };

      const action = evaluateWindowAndVentilation(hotTelemetry, userState, null);
      expect(action.actionText).toContain("diminishing cooling and may accelerate dehydration");
      expect(action.actionText).toContain("combine fan airflow with skin wetting");
      expect(action.actionText).not.toContain("electric fans alone do NOT prevent heat illness in extreme heat");
    });

    it("does not state universal 50%-70% purifier sleep-mode derating without verified data", () => {
      const purifier = computePurifierAdvisor(
        { length: 4, width: 3, height: 2.5, unit: "meters" },
        { hasPurifier: false, knownCadrM3h: null, knownCadrCfm: null, dailyOperatingHours: 8, ratedWattage: null },
        { electricityTariffPerKwh: 8.0, annualFilterReplacementCost: 2500, currency: "INR" },
        145,
        "limited"
      );

      const plan = generateIndoorAirPlan(
        sampleTelemetry,
        {
          roomType: "bedroom" as const,
          windowState: "all_closed" as const,
          combustionSources: ["none" as const],
          dustActivities: ["none" as const],
          occupancyCount: 1,
          perceivedStuffiness: "normal" as const,
          hasExhaustFanRunning: false,
          hasAirConditionerRunning: false,
          thermalComfort: "comfortable" as const,
        },
        null,
        purifier
      );

      const deployAction = plan.actions.find((a) => a.id === "indoor-action-purifier-sizing-deployment");
      expect(deployAction).toBeDefined();
      expect(deployAction?.actionText).not.toContain("50%–70%");
      expect(deployAction?.actionText).toContain("unverified and significantly reduced clean air delivery unless speed-specific manufacturer test data is provided");
    });

    it("verifies rate limiter store honesty (detects unconfigured or unreachable Redis)", async () => {
      const status = await verifyRateLimitStore();

      expect(status.storeType).toBe("in_memory_fallback");
      expect(status.isDistributed).toBe(false);
      expect(["unconfigured", "unreachable"]).toContain(status.status);
    });
  });
});
