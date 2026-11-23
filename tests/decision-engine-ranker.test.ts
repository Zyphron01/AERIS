import { describe, it, expect } from "vitest";
import {
  rankRecommendations,
  generatePlanSummary,
  buildDailyPlanResult,
} from "@/lib/decision-engine/ranker";
import { evaluateDailyPlan } from "@/lib/decision-engine/engine";
import { DEFAULT_DEMO_PROFILE } from "@/lib/decision-engine/household-profile";
import type {
  RecommendationAction,
  HouseholdProfile,
} from "@/lib/decision-engine/types";
import type { NormalizedTelemetry } from "@/lib/telemetry/types";

describe("Decision Engine Ranker & Plan Aggregator", () => {
  const baseProfile: HouseholdProfile = {
    id: "test-profile-1",
    members: ["adults"],
    declaredSensitivity: "none",
    primaryCommute: "public_transit",
    outdoorExercise: "afternoon",
    hasSchoolRoutine: false,
    filtration: "none",
    ventilationPreference: "natural_windows",
    indoorSources: [],
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
        subIndices: {
          pm2_5: 260,
          pm10: 165,
        },
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
    hourlyForecast: [],
    disclaimer: "Modeled CPCB-method estimate.",
  };

  const createCandidateAction = (
    id: string,
    category: RecommendationAction["category"],
    priority: RecommendationAction["priority"]
  ): RecommendationAction => ({
    id,
    category,
    priority,
    title: `Action ${id}`,
    actionText: `Recommended actions for ${id}`,
    reason: `Scientific rationale for ${id}`,
    evidenceReferences: ["WHO Global Air Quality Guidelines (2021)"],
    tradeOffs: "Potential reduced ventilation",
    impactClassification: "exposure_reduction",
    limitations: "Requires disciplined habit change",
    sourceValidityTimestamp: "2026-11-21T06:00:00Z",
    applicableRuleId: `RULE_${id.toUpperCase()}`,
    explanation: {
      influencingFactors: ["PM2.5 concentration: 110 µg/m³"],
      ruleTriggered: `RULE_${id.toUpperCase()}`,
      sourceAttribution: "WHO Guidelines (2021)",
      dataTimestamp: "2026-11-21T06:00:00Z",
      assumptions: ["Standard respiration at rest"],
      uncertainties: ["Microclimate dispersion variance"],
    },
  });

  describe("rankRecommendations", () => {
    it("returns empty array when candidate actions are empty", () => {
      const result = rankRecommendations([], baseProfile);
      expect(result).toEqual([]);
    });

    it("prioritizes category diversity among top candidates", () => {
      const candidates: RecommendationAction[] = [
        createCandidateAction("rec-1", "outdoor_activity", "urgent"),
        createCandidateAction("rec-2", "outdoor_activity", "high"),
        createCandidateAction("rec-3", "indoor_air", "moderate"),
        createCandidateAction("rec-4", "commute", "low"),
      ];

      const ranked = rankRecommendations(candidates, baseProfile, 3);
      expect(ranked).toHaveLength(3);
      // Pass 1 picks rec-1 (outdoor_activity), rec-3 (indoor_air), rec-4 (commute)
      const categories = ranked.map((r) => r.category);
      expect(categories).toContain("outdoor_activity");
      expect(categories).toContain("indoor_air");
      expect(categories).toContain("commute");
    });

    it("backfills when candidates have fewer distinct categories than maxCount", () => {
      const candidates: RecommendationAction[] = [
        createCandidateAction("rec-1", "indoor_air", "urgent"),
        createCandidateAction("rec-2", "indoor_air", "high"),
        createCandidateAction("rec-3", "indoor_air", "moderate"),
      ];

      const ranked = rankRecommendations(candidates, baseProfile, 3);
      expect(ranked).toHaveLength(3);
      expect(ranked.map((r) => r.id)).toEqual(["rec-1", "rec-2", "rec-3"]);
    });

    it("deduplicates action IDs cleanly", () => {
      const duplicateCandidates: RecommendationAction[] = [
        createCandidateAction("rec-same", "commute", "urgent"),
        createCandidateAction("rec-same", "commute", "urgent"),
        createCandidateAction("rec-other", "indoor_air", "high"),
      ];

      const ranked = rankRecommendations(duplicateCandidates, baseProfile, 3);
      expect(ranked).toHaveLength(2);
      expect(ranked.map((r) => r.id)).toEqual(["rec-same", "rec-other"]);
    });

    it("boosts vulnerable household members for protective and outdoor categories", () => {
      const vulnerableProfile: HouseholdProfile = {
        ...baseProfile,
        members: ["children", "older_adults"],
        declaredSensitivity: "respiratory_asthma",
      };

      const actionA = createCandidateAction("action-a", "outdoor_activity", "moderate"); // 50 + 15 = 65
      const actionB = createCandidateAction("action-b", "commute", "moderate"); // 50

      const ranked = rankRecommendations([actionB, actionA], vulnerableProfile, 2);
      expect(ranked[0].id).toBe("action-a");
    });

    it("boosts commute category for active walking/biking commuters", () => {
      const activeCommuteProfile: HouseholdProfile = {
        ...baseProfile,
        primaryCommute: "active_walking_biking",
      };

      const commuteAction = createCandidateAction("commute-1", "commute", "moderate"); // 50 + 10 = 60
      const indoorAction = createCandidateAction("indoor-1", "indoor_air", "moderate"); // 50

      const ranked = rankRecommendations([indoorAction, commuteAction], activeCommuteProfile, 2);
      expect(ranked[0].id).toBe("commute-1");
    });

    it("boosts indoor air category when cooking fumes source is present", () => {
      const cookingProfile: HouseholdProfile = {
        ...baseProfile,
        indoorSources: ["cooking_fumes"],
      };

      const indoorAction = createCandidateAction("indoor-1", "indoor_air", "moderate"); // 50 + 5 = 55
      const otherAction = createCandidateAction("other-1", "protective_measures", "moderate"); // 50

      const ranked = rankRecommendations([otherAction, indoorAction], cookingProfile, 2);
      expect(ranked[0].id).toBe("indoor-1");
    });
  });

  describe("generatePlanSummary", () => {
    it("returns favorable message when action list is empty", () => {
      const summary = generatePlanSummary([], sampleTelemetry, baseProfile);
      expect(summary).toContain("favorable");
      expect(summary).toContain("Delhi NCR");
    });

    it("returns urgent alert summary when urgent or high actions exist", () => {
      const actions = [createCandidateAction("rec-1", "outdoor_activity", "urgent")];
      const summary = generatePlanSummary(actions, sampleTelemetry, baseProfile);
      expect(summary).toContain("exposure reduction");
      expect(summary).toContain("PM2.5: 110 µg/m³");
      expect(summary).toContain("Poor");
    });

    it("returns lifestyle adaptation summary when only moderate/low actions exist", () => {
      const actions = [createCandidateAction("rec-1", "indoor_air", "moderate")];
      const summary = generatePlanSummary(actions, sampleTelemetry, baseProfile);
      expect(summary).toContain("lifestyle adaptations");
    });
  });

  describe("buildDailyPlanResult", () => {
    it("assembles complete DailyPlanResult with environmental context", () => {
      const candidates = [
        createCandidateAction("rec-1", "outdoor_activity", "urgent"),
        createCandidateAction("rec-2", "indoor_air", "high"),
      ];

      const result = buildDailyPlanResult(baseProfile, candidates, sampleTelemetry);

      expect(result.profile).toEqual(baseProfile);
      expect(result.rankedActions).toHaveLength(2);
      expect(result.environmentalContext.aqiValue).toBe(260);
      expect(result.environmentalContext.aqiCategory).toBe("Poor");
      expect(result.environmentalContext.dominantPollutant).toBe("PM2.5");
      expect(result.environmentalContext.pm25Value).toBe(110.0);
      expect(result.environmentalContext.pm10Value).toBe(195.0);
      expect(result.environmentalContext.freshness).toBe("fresh");
      expect(result.environmentalContext.dataKind).toBe("modeled/forecast");
    });
  });

  describe("evaluateDailyPlan (Full Integration)", () => {
    it("evaluates deterministic daily plan across all 5 rules using default profile", () => {
      const result = evaluateDailyPlan(DEFAULT_DEMO_PROFILE, sampleTelemetry);

      expect(result.rankedActions.length).toBeGreaterThan(0);
      expect(result.rankedActions.length).toBeLessThanOrEqual(3);
      expect(result.summary).toBeTypeOf("string");
      expect(result.summary.length).toBeGreaterThan(20);

      // Verify each ranked action has valid explanation and citations
      for (const action of result.rankedActions) {
        expect(action.title).toBeTruthy();
        expect(action.actionText).toBeTruthy();
        expect(action.tradeOffs).toBeTruthy();
        expect(action.evidenceReferences.length).toBeGreaterThan(0);
        expect(action.explanation.ruleTriggered).toMatch(/^AERIS-RULE-/);
        expect(action.explanation.influencingFactors.length).toBeGreaterThan(0);
      }
    });
  });
});
