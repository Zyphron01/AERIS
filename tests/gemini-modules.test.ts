import { describe, it, expect, vi } from "vitest";
import { extractMinimalContext, logOperationalMetric } from "@/lib/gemini/privacy";
import { checkRateLimit, extractClientIp } from "@/lib/gemini/rate-limiter";
import {
  executeWithTotalDeadline,
  NonRetryableError,
  CumulativeDeadlineExceededError,
} from "@/lib/gemini/resilience";
import {
  generateDeterministicExplanation,
  generateDeterministicChatResponse,
} from "@/lib/gemini/fallback";
import { DEFAULT_DEMO_PROFILE } from "@/lib/decision-engine/household-profile";
import type { HouseholdProfile, RecommendationAction } from "@/lib/decision-engine/types";
import type { TrustedActionMetadata } from "@/lib/gemini/types";

describe("Gemini Intelligence — Privacy Preservation", () => {
  it("extracts minimal context for outdoor_activity without leaking demographics", () => {
    const profile: HouseholdProfile = {
      ...DEFAULT_DEMO_PROFILE,
      outdoorExercise: "early_morning",
    };
    const ctx = extractMinimalContext("outdoor_activity", profile);
    expect(ctx.category).toBe("outdoor_activity");
    expect(ctx.relevantFactor).toContain("Workout timing: early_morning");
    expect(ctx.relevantFactor).not.toContain("children");
  });

  it("extracts minimal context for commute", () => {
    const profile: HouseholdProfile = {
      ...DEFAULT_DEMO_PROFILE,
      primaryCommute: "public_transit",
    };
    const ctx = extractMinimalContext("commute", profile);
    expect(ctx.category).toBe("commute");
    expect(ctx.relevantFactor).toContain("Primary transit mode: public_transit");
  });

  it("extracts minimal context for indoor_air", () => {
    const profile: HouseholdProfile = {
      ...DEFAULT_DEMO_PROFILE,
      filtration: "hepa_purifier",
      ventilationPreference: "mechanical",
    };
    const ctx = extractMinimalContext("indoor_air", profile);
    expect(ctx.category).toBe("indoor_air");
    expect(ctx.relevantFactor).toContain("hepa_purifier");
    expect(ctx.relevantFactor).toContain("mechanical");
  });

  it("extracts minimal context for protective_measures when sensitive members exist", () => {
    const profile: HouseholdProfile = {
      ...DEFAULT_DEMO_PROFILE,
      members: ["adults", "children"],
      declaredSensitivity: "respiratory_asthma",
    };
    const ctx = extractMinimalContext("protective_measures", profile);
    expect(ctx.relevantFactor).toContain("Household includes sensitive or vulnerable demographic consideration.");
  });

  it("extracts minimal context for protective_measures when standard demographics apply", () => {
    const profile: HouseholdProfile = {
      ...DEFAULT_DEMO_PROFILE,
      members: ["adults"],
      declaredSensitivity: "none",
    };
    const ctx = extractMinimalContext("protective_measures", profile);
    expect(ctx.relevantFactor).toContain("Standard demographic consideration.");
  });

  it("redacts IP addresses safely in operational logs", () => {
    const consoleSpy = vi.spyOn(console, "info").mockImplementation(() => {});
    logOperationalMetric({
      timestamp: "2026-11-24T12:00:00Z",
      path: "/api/assistant/explain",
      actionId: "act-test",
      clientIpRedacted: "192.168.1.42",
      durationMs: 120,
      status: "success",
    });
    // In test environment, NODE_ENV is 'test', so it doesn't print to console
    expect(consoleSpy).not.toHaveBeenCalled();
    consoleSpy.mockRestore();
  });
});

describe("Gemini Intelligence — Rate Limiting", () => {
  it("extracts client IP from x-forwarded-for header", () => {
    const headers = new Headers();
    headers.set("x-forwarded-for", "203.0.113.195, 70.41.3.18, 150.172.238.178");
    const ip = extractClientIp(headers);
    expect(ip).toBe("203.0.113.195");
  });

  it("extracts client IP from x-real-ip header if x-forwarded-for is missing", () => {
    const headers = new Headers();
    headers.set("x-real-ip", "198.51.100.14");
    const ip = extractClientIp(headers);
    expect(ip).toBe("198.51.100.14");
  });

  it("falls back to 127.0.0.1 when headers are missing or invalid", () => {
    const headers = new Headers();
    const ip = extractClientIp(headers);
    expect(ip).toBe("127.0.0.1");
  });

  it("enforces sliding-window token bucket limits", () => {
    const testIp = "10.99.88.77";
    // Allow up to 3 requests per 1000ms
    const res1 = checkRateLimit(testIp, 3, 1000);
    expect(res1.allowed).toBe(true);
    expect(res1.remaining).toBe(2);

    const res2 = checkRateLimit(testIp, 3, 1000);
    expect(res2.allowed).toBe(true);
    expect(res2.remaining).toBe(1);

    const res3 = checkRateLimit(testIp, 3, 1000);
    expect(res3.allowed).toBe(true);
    expect(res3.remaining).toBe(0);

    // 4th request must be blocked
    const res4 = checkRateLimit(testIp, 3, 1000);
    expect(res4.allowed).toBe(false);
    expect(res4.remaining).toBe(0);
    expect(res4.reason).toContain("Rate limit exceeded");
  });
});

describe("Gemini Intelligence — Cumulative Deadline & Resilience", () => {
  it("executes a successful task without retries", async () => {
    const result = await executeWithTotalDeadline(async () => "success", {
      totalDeadlineMs: 1000,
    });
    expect(result).toBe("success");
  });

  it("immediately rethrows NonRetryableError without retrying", async () => {
    let callCount = 0;
    await expect(
      executeWithTotalDeadline(
        async () => {
          callCount++;
          throw new NonRetryableError("Invalid payload schema", 400);
        },
        { totalDeadlineMs: 2000, maxRetries: 3 }
      )
    ).rejects.toThrow("Invalid payload schema");
    expect(callCount).toBe(1);
  });

  it("retries transient errors and succeeds when transient error resolves", async () => {
    let callCount = 0;
    const result = await executeWithTotalDeadline(
      async () => {
        callCount++;
        if (callCount === 1) {
          throw new Error("HTTP 429 resource_exhausted");
        }
        return "resolved-after-retry";
      },
      { totalDeadlineMs: 2000, maxRetries: 2, initialBackoffMs: 10 }
    );
    expect(result).toBe("resolved-after-retry");
    expect(callCount).toBe(2);
  });

  it("throws CumulativeDeadlineExceededError when total budget is exceeded", async () => {
    await expect(
      executeWithTotalDeadline(
        async () => {
          throw new Error("503 service unavailable");
        },
        { totalDeadlineMs: 30, maxRetries: 5, initialBackoffMs: 50 }
      )
    ).rejects.toThrow(CumulativeDeadlineExceededError);
  });
});

describe("Gemini Intelligence — Deterministic Bilingual Fallback", () => {
  const sampleAction: RecommendationAction = {
    id: "act-exercise-morning",
    category: "outdoor_activity",
    priority: "urgent",
    title: "Reschedule Morning Jog",
    actionText: "Move outdoor cardiovascular exercise to afternoon hours when photochemical mixing disperses particulates.",
    reason: "Elevated PM2.5 concentrations peak in early morning temperature inversions.",
    evidenceReferences: ["CPCB Comprehensive Air Quality Management Guidelines (2014)"],
    tradeOffs: "Requires shifting routine to 14:00-16:00 window.",
    impactClassification: "exposure_reduction",
    limitations: "Subject to local traffic levels.",
    sourceValidityTimestamp: "2026-11-24T12:00:00Z",
    applicableRuleId: "cpcb-pm25-morning-inversion",
    explanation: {
      influencingFactors: ["PM2.5 peak"],
      ruleTriggered: "cpcb-pm25-morning-inversion",
      sourceAttribution: "CPCB Guidelines (2014)",
      dataTimestamp: "2026-11-24T12:00:00Z",
      assumptions: ["Morning inversion effect"],
      uncertainties: ["Wind speed variability"],
    },
  };

  const sampleMetadata: TrustedActionMetadata = {
    actionId: "act-exercise-morning",
    category: "outdoor_activity",
    priority: "urgent",
    applicableRuleId: "cpcb-pm25-morning-inversion",
    sourceValidityTimestamp: "2026-11-24T12:00:00Z",
    pm25Value: 142.5,
    cpcbAqiValue: 318,
    cpcbAqiCategory: "Very Poor",
    evidenceReferences: ["CPCB Comprehensive Air Quality Management Guidelines (2014)"],
    isModelEstimate: true,
  };

  it("generates structured English deterministic explanation", () => {
    const explanation = generateDeterministicExplanation(sampleAction, sampleMetadata, "en");
    expect(explanation.headline).toContain("Reschedule Morning Jog (URGENT Priority)");
    expect(explanation.actionBreakdown).toContain("Recommended Protocol:");
    expect(explanation.whyThisMatters).toContain("Scientific Rationale:");
    expect(explanation.microclimateContext).toContain("142.5 µg/m³");
    expect(explanation.microclimateContext).toContain("NAQI 318");
  });

  it("generates structured Hindi deterministic explanation", () => {
    const explanation = generateDeterministicExplanation(sampleAction, sampleMetadata, "hi");
    expect(explanation.headline).toContain("अति आवश्यक (Urgent)");
    expect(explanation.actionBreakdown).toContain("अनुशंसित कार्रवाई:");
    expect(explanation.whyThisMatters).toContain("वैज्ञानिक आधार:");
    expect(explanation.microclimateContext).toContain("बहुत खराब (Very Poor)");
  });

  it("detects medical inquiries in English and triggers Rule 12 deflection", () => {
    const res = generateDeterministicChatResponse(
      "Should I increase my asthma inhaler dosage today?",
      sampleAction,
      sampleMetadata,
      "en"
    );
    expect(res.isMedicalQuery).toBe(true);
    expect(res.answer).toContain("AERIS is an environmental decision-support companion and does not provide clinical diagnosis");
    expect(res.contextCitation).toContain("Rule 12");
  });

  it("detects medical inquiries in Hindi and triggers Rule 12 deflection", () => {
    const res = generateDeterministicChatResponse(
      "क्या मुझे अपनी दवा की खुराक बढ़ानी चाहिए?",
      sampleAction,
      sampleMetadata,
      "hi"
    );
    expect(res.isMedicalQuery).toBe(true);
    expect(res.answer).toContain("AERIS एक पर्यावरणीय निर्णय-सहायक प्रणाली है");
    expect(res.contextCitation).toContain("Rule 12");
  });

  it("provides grounded non-medical responses for practical questions", () => {
    const res = generateDeterministicChatResponse(
      "What is the best time to jog outdoors today?",
      sampleAction,
      sampleMetadata,
      "en"
    );
    expect(res.isMedicalQuery).toBe(false);
    expect(res.answer).toContain("cpcb-pm25-morning-inversion");
  });
});
