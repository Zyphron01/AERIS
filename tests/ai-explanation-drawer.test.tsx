import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, waitFor, act } from "@testing-library/react";
import React from "react";
import { AiExplanationDrawer } from "@/components/daily-plan/ai-explanation-drawer";
import { DEFAULT_DEMO_PROFILE } from "@/lib/decision-engine/household-profile";
import type { RecommendationAction } from "@/lib/decision-engine/types";

function makeAction(id: string, title: string): RecommendationAction {
  return {
    id,
    category: "outdoor_activity",
    priority: "urgent",
    title,
    actionText: "Shift outdoor exercise indoors.",
    reason: "Elevated PM2.5.",
    evidenceReferences: ["WHO (2021)"],
    tradeOffs: "Requires indoor alternative.",
    impactClassification: "exposure_reduction",
    limitations: "None",
    sourceValidityTimestamp: "2026-11-24T12:00:00Z",
    applicableRuleId: "AERIS-RULE-01",
    explanation: {
      influencingFactors: ["PM2.5 elevated"],
      ruleTriggered: "AERIS-RULE-01",
      sourceAttribution: "WHO (2021)",
      dataTimestamp: "2026-11-24T12:00:00Z",
      assumptions: [],
      uncertainties: [],
    },
  };
}

function makeExplainResponse(headline: string, actionId: string) {
  return {
    status: "fallback",
    attributionLabel: "Deterministic evidence-based explanation",
    language: "en",
    generatedAt: "2026-11-24T12:00:00Z",
    explanation: {
      headline,
      actionBreakdown: "Step-by-step guidance",
      whyThisMatters: "Scientific rationale",
      microclimateContext: "Current context",
    },
    trustedMetadata: {
      actionId,
      category: "outdoor_activity",
      priority: "urgent",
      applicableRuleId: "AERIS-RULE-01",
      evidenceReferences: ["WHO (2021)"],
      sourceValidityTimestamp: "2026-11-24T12:00:00Z",
      cpcbAqiValue: 260,
      cpcbAqiCategory: "Poor",
      pm25Value: 110,
      isModelEstimate: true,
    },
    disclaimer: "Deterministic guidance",
  };
}

describe("AiExplanationDrawer lifecycle & unified fetch", () => {
  const originalFetch = globalThis.fetch;

  beforeEach(() => {
    vi.restoreAllMocks();
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  it("retries failed explanation using unified fetch and prevents stale overwrite on action change", async () => {
    const signals: AbortSignal[] = [];
    const resolvers: Array<(res: Response) => void> = [];
    let failFirst = true;

    globalThis.fetch = vi.fn().mockImplementation((_url: string, init?: RequestInit) => {
      if (init?.signal) signals.push(init.signal);
      if (failFirst) {
        failFirst = false;
        return Promise.resolve(
          new Response(JSON.stringify({ error: "Temporary failure" }), { status: 500 })
        );
      }
      return new Promise<Response>((resolve) => {
        resolvers.push(resolve);
      });
    });

    const actionA = makeAction("action-a", "Action A");
    const actionB = makeAction("action-b", "Action B");

    const { rerender } = render(
      <AiExplanationDrawer
        isOpen={true}
        onClose={vi.fn()}
        action={actionA}
        profile={DEFAULT_DEMO_PROFILE}
        locationId="delhi-ncr"
      />
    );

    // Initial request fails and shows retry button
    await waitFor(() => {
      expect(screen.getByText("Temporary failure")).toBeDefined();
    });

    const retryBtn = screen.getByRole("button", { name: /^Retry$/i });
    fireEvent.click(retryBtn);

    // Now switch action to B while retry for A is still in flight
    rerender(
      <AiExplanationDrawer
        isOpen={true}
        onClose={vi.fn()}
        action={actionB}
        profile={DEFAULT_DEMO_PROFILE}
        locationId="mumbai"
      />
    );

    // Retry request (index 1) must be aborted when switching to actionB (index 2)
    expect(signals[1]?.aborted).toBe(true);
    expect(signals[2]?.aborted).toBe(false);

    // Stale Action A response arrives — must NOT overwrite Action B
    await act(async () => {
      resolvers[0](
        new Response(JSON.stringify(makeExplainResponse("Stale Headline A", "action-a")), {
          status: 200,
        })
      );
    });
    expect(screen.queryByText("Stale Headline A")).toBeNull();

    // Active Action B response arrives
    await act(async () => {
      resolvers[1](
        new Response(JSON.stringify(makeExplainResponse("Fresh Headline B", "action-b")), {
          status: 200,
        })
      );
    });

    await waitFor(() => {
      expect(screen.getByText("Fresh Headline B")).toBeDefined();
    });
  });
});
