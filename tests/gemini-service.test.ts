import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { getVerifiedExplanation } from "@/lib/gemini/service";
import { checkRateLimit, checkRateLimitAsync, resetRateLimiter } from "@/lib/gemini/rate-limiter";
import { executeWithTotalDeadline, CumulativeDeadlineExceededError } from "@/lib/gemini/resilience";
import { extractMinimalContext } from "@/lib/gemini/privacy";
import { setCachedTelemetryForTesting } from "@/lib/telemetry/server-provider";
import type { NormalizedTelemetry } from "@/lib/telemetry/types";
import type { HouseholdProfile } from "@/lib/decision-engine/types";

// Mock Telemetry Data
const mockTelemetry: NormalizedTelemetry = {
  timestamp: "2026-11-21T06:00:00.000Z",
  retrievedAt: "2026-11-21T06:05:00.000Z",
  location: {
    id: "delhi-anand-vihar",
    name: "Anand Vihar, Delhi",
    region: "Delhi",
    country: "India",
    latitude: 28.6469,
    longitude: 77.3164,
    timezone: "Asia/Kolkata",
    modelDomain: "CAMS Global",
  },
  source: "Open-Meteo Air Quality & Weather API (CAMS Global)",
  dataKind: "modeled/forecast",
  freshness: "fresh",
  freshnessExplanation: "Telemetry within valid fresh window.",
  weather: {
    temperatureC: 18.5,
    apparentTemperatureC: 18.5,
    relativeHumidityPercent: 78,
    windSpeedKmH: 4.2,
    windDirectionDegrees: 310,
    surfacePressureHPa: 1012,
    weatherCode: 1,
    weatherLabel: "Clear",
  },
  aqi: {
    cpcbAqi: {
      standard: "IN_CPCB",
      name: "Indian National AQI (CPCB Methodology)",
      value: 380,
      category: "Very Poor",
      dominantPollutant: "PM2.5",
      subIndices: { pm2_5: 380, pm10: 290 },
      scaleMin: 0,
      scaleMax: 500,
      colorClass: "text-red-700 bg-red-50",
      methodology: "model-derived-cpcb-method",
      calculationBasis: "Modeled CPCB-method estimate.",
    },
    europeanAqi: {
      standard: "EU_EAQI",
      name: "European Air Quality Index",
      value: 5,
      category: "Very Poor",
      scaleMin: 1,
      scaleMax: 6,
      colorClass: "text-purple-700 bg-purple-50",
      methodology: "modeled-forecast",
    },
    usAqi: {
      standard: "US_EPA",
      name: "US EPA Air Quality Index",
      value: 250,
      category: "Very Unhealthy",
      scaleMin: 0,
      scaleMax: 500,
      colorClass: "text-purple-700 bg-purple-50",
      methodology: "modeled-forecast",
    },
  },
  pollutants: [
    {
      code: "pm2_5",
      name: "PM2.5",
      value: 165,
      unit: "µg/m³",
      averagingPeriod: "24h",
      status: "available",
    },
    {
      code: "pm10",
      name: "PM10",
      value: 290,
      unit: "µg/m³",
      averagingPeriod: "24h",
      status: "available",
    },
  ],
  hourlyForecast: [
    {
      time: "2026-11-21T06:00:00Z",
      pm2_5: 165,
      pm10: 290,
      usAqi: 250,
      temperatureC: 18.5,
      humidityPercent: 78,
      windSpeedKmH: 4.2,
    },
  ],
  disclaimer: "Modeled CPCB-method estimate.",
};

const mockProfile: HouseholdProfile = {
  id: "profile-test-service",
  members: ["adults", "children", "older_adults"],
  declaredSensitivity: "respiratory_asthma",
  primaryCommute: "active_walking_biking",
  outdoorExercise: "early_morning",
  hasSchoolRoutine: true,
  filtration: "hepa_purifier",
  ventilationPreference: "natural_windows",
  indoorSources: ["cooking_fumes"],
  budgetPreference: "limited",
  updatedAt: "2026-11-21T06:00:00.000Z",
};

describe("Gemini Service & Server-Side Action Verification", () => {
  beforeEach(() => {
    resetRateLimiter();
    setCachedTelemetryForTesting("delhi-ncr", mockTelemetry);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("Server-Side Action Re-evaluation & Verification", () => {
    it("rejects forged or non-existent action IDs with an error", async () => {
      await expect(
        getVerifiedExplanation(
          {
            actionId: "forged-action-that-does-not-exist",
            locationId: "delhi-ncr",
            profile: mockProfile,
            language: "en",
          },
          "127.0.0.1"
        )
      ).rejects.toThrow(/Action 'forged-action-that-does-not-exist' is not part of the verified daily plan/);
    });

    it("rejects invalid or unknown location IDs with an error", async () => {
      await expect(
        getVerifiedExplanation(
          {
            actionId: "some-action-id",
            locationId: "unknown-location-xyz",
            profile: mockProfile,
            language: "en",
          },
          "127.0.0.1"
        )
      ).rejects.toThrow(/Unknown location ID/);
    });

    it("verifies and explains an authoritative action derived directly by the deterministic engine", async () => {
      // With poor PM2.5 and asthma/children, morning exercise relocation is triggered
      const response = await getVerifiedExplanation(
        {
          actionId: "outdoor-exercise-reschedule",
          locationId: "delhi-ncr",
          profile: mockProfile,
          language: "en",
        },
        "127.0.0.1"
      );

      expect(response).toBeDefined();
      expect(response.trustedMetadata.actionId).toBe("outdoor-exercise-reschedule");
      // Must bind server's trusted priority and evidence
      expect(response.trustedMetadata.priority).toBe("urgent");
      expect(response.trustedMetadata.evidenceReferences.length).toBeGreaterThan(0);
      expect(response.explanation.whyThisMatters).toBeTruthy();
      expect(response.explanation.microclimateContext).toBeTruthy();
      expect(response.explanation.actionBreakdown).toBeTruthy();
    });
  });

  describe("Production Rate Limiting", () => {
    it("permits requests within 15 requests/min and blocks subsequent requests", () => {
      const clientIp = "192.168.1.100";
      for (let i = 0; i < 15; i++) {
        const result = checkRateLimit(clientIp);
        expect(result.allowed).toBe(true);
      }
      const blocked = checkRateLimit(clientIp);
      expect(blocked.allowed).toBe(false);
      expect(blocked.remaining).toBe(0);
      expect(blocked.resetMs).toBeGreaterThan(0);
    });

    it("asynchronously checks distributed rate limit and falls back to in-memory", async () => {
      const result = await checkRateLimitAsync("10.0.0.1");
      expect(result.allowed).toBe(true);
      expect(result.remaining).toBeGreaterThan(0);
    });

    it("immediately rejects AI calls when AERIS_DISABLE_PUBLIC_AI is enabled", async () => {
      process.env.AERIS_DISABLE_PUBLIC_AI = "true";
      try {
        const result = await checkRateLimitAsync("192.168.1.200");
        expect(result.allowed).toBe(false);
        expect(result.reason).toContain("Public AI access is currently disabled");
      } finally {
        delete process.env.AERIS_DISABLE_PUBLIC_AI;
      }
    });
  });

  describe("Cumulative Request Deadline & Resilience", () => {
    it("aborts execution when cumulative deadline (8000ms) expires across operations", async () => {
      const mockSlowOperation = vi.fn().mockImplementation(async () => {
        await new Promise((resolve) => setTimeout(resolve, 150));
        throw new Error("Temporary network flake 503");
      });

      // 100ms total budget with 150ms operation should abort with CumulativeDeadlineExceededError
      await expect(
        executeWithTotalDeadline(mockSlowOperation, {
          totalDeadlineMs: 100,
          maxRetries: 3,
          initialBackoffMs: 20,
        })
      ).rejects.toThrow(CumulativeDeadlineExceededError);
    });

    it("does not retry non-retryable 4xx client/validation errors", async () => {
      const nonRetryableError = new Error("Invalid request schema: 400 Bad Request");
      const operation = vi.fn().mockRejectedValue(nonRetryableError);

      await expect(
        executeWithTotalDeadline(operation, {
          totalDeadlineMs: 5000,
          maxRetries: 3,
        })
      ).rejects.toThrow("Invalid request schema: 400 Bad Request");

      // Exactly 1 call, never retried
      expect(operation).toHaveBeenCalledTimes(1);
    });
  });

  describe("Privacy & Minimal Context Extraction", () => {
    it("extracts only category-relevant flags and redacts raw identity, timestamps, and free text", () => {
      const minimal = extractMinimalContext("outdoor_activity", mockProfile);

      expect(minimal.category).toBe("outdoor_activity");
      expect(minimal.relevantFactor).toContain("early_morning");
      // Unrelated demographic details are omitted
      expect("commuteMode" in minimal).toBe(false);
      expect("hasSchoolRoutine" in minimal).toBe(false);
      expect("id" in minimal).toBe(false);
    });
  });
});
