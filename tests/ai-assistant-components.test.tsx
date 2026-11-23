import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import React from "react";
import { AiExplanationDrawer } from "@/components/daily-plan/ai-explanation-drawer";
import type {
  HouseholdProfile,
  RecommendationAction,
  DecisionExplanation,
} from "@/lib/decision-engine/types";
import type { ExplanationResponse } from "@/lib/gemini/types";

describe("AiExplanationDrawer Component", () => {
  const sampleProfile: HouseholdProfile = {
    id: "profile-delhi-test",
    members: ["adults", "children"],
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

  const sampleExplanation: DecisionExplanation = {
    influencingFactors: ["PM2.5: 165 µg/m³ (CPCB Very Poor)", "Children present in household"],
    ruleTriggered: "AERIS-RULE-EXERCISE-DISPERSION-02",
    sourceAttribution: "CPCB Guidelines (2014) & WHO (2021)",
    dataTimestamp: "2026-11-21T06:00:00Z",
    assumptions: ["Outdoor ambient air freely penetrates open doors"],
    uncertainties: ["Hyper-local topography variation"],
  };

  const sampleAction: RecommendationAction = {
    id: "rec-morning-exercise-shift",
    category: "outdoor_activity",
    priority: "urgent",
    title: "Shift Aerobic Exercise to Afternoon Window",
    actionText: "Relocate morning run or vigorous activity indoors, or delay until after 14:00.",
    reason: "Severe early morning surface boundary layer compression concentrates particulates.",
    evidenceReferences: [
      "WHO Global Air Quality Guidelines (2021)",
      "CPCB National Air Quality Index Documentation (2014)",
    ],
    tradeOffs: "Requires shifting routine from early morning to midday.",
    impactClassification: "exposure_reduction",
    limitations: "Midday schedule may conflict with office commitments.",
    sourceValidityTimestamp: "2026-11-21T06:00:00Z",
    applicableRuleId: "AERIS-RULE-EXERCISE-DISPERSION-02",
    explanation: sampleExplanation,
  };

  const mockExplanationResponse: ExplanationResponse = {
    status: "success",
    attributionLabel: "AI-generated explanation",
    language: "en",
    generatedAt: "2026-11-21T06:00:00Z",
    disclaimer: "Non-clinical health guidance",
    trustedMetadata: {
      actionId: "rec-morning-exercise-shift",
      category: "outdoor_activity",
      priority: "urgent",
      applicableRuleId: "AERIS-RULE-EXERCISE-DISPERSION-02",
      evidenceReferences: [
        "WHO Global Air Quality Guidelines (2021)",
        "CPCB National Air Quality Index Documentation (2014)",
      ],
      cpcbAqiCategory: "Very Poor",
      cpcbAqiValue: 380,
      pm25Value: 165,
      isModelEstimate: true,
      sourceValidityTimestamp: "2026-11-21T06:00:00Z",
    },
    explanation: {
      headline: "Shift Aerobic Exercise to Afternoon Window (URGENT Priority)",
      actionBreakdown: "Relocate vigorous running to indoor spaces or wait until 14:00.",
      whyThisMatters: "Ground-level thermal inversion traps microparticles during cool early hours.",
      microclimateContext: "Current ambient PM2.5 is 165 µg/m³ with CPCB Very Poor AQI.",
    },
  };

  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("does not render when isOpen is false", () => {
    const { container } = render(
      <AiExplanationDrawer
        isOpen={false}
        onClose={vi.fn()}
        action={sampleAction}
        profile={sampleProfile}
        locationId="delhi-anand-vihar"
      />
    );
    expect(container.firstChild).toBeNull();
  });

  it("renders drawer, loads explanation, and displays 'AI-generated explanation' label", async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => mockExplanationResponse,
    });

    render(
      <AiExplanationDrawer
        isOpen={true}
        onClose={vi.fn()}
        action={sampleAction}
        profile={sampleProfile}
        locationId="delhi-anand-vihar"
      />
    );

    // Initial state: Heading should be visible
    expect(screen.getByText("AERIS Air Intelligence")).toBeDefined();

    // Wait for explanation content to appear
    await waitFor(() => {
      expect(screen.getByText("AI-generated explanation")).toBeDefined();
    });

    // Verify truthfulness UI: deterministic evidence citations are distinct
    expect(screen.getByText("Authoritative Scientific Citations:")).toBeDefined();
    expect(screen.getByText("WHO Global Air Quality Guidelines (2021)")).toBeDefined();

    // Verify Non-clinical health guidance disclaimer
    expect(screen.getByText(/Non-clinical health guidance/i)).toBeDefined();
  });

  it("displays 'Deterministic evidence-based explanation' when backend returns a fallback", async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        ...mockExplanationResponse,
        status: "fallback",
        attributionLabel: "Deterministic evidence-based explanation",
      }),
    });

    render(
      <AiExplanationDrawer
        isOpen={true}
        onClose={vi.fn()}
        action={sampleAction}
        profile={sampleProfile}
        locationId="delhi-anand-vihar"
      />
    );

    await waitFor(() => {
      expect(screen.getByText("Deterministic evidence-based explanation")).toBeDefined();
    });
  });

  it("calls onClose when Close button is clicked", () => {
    const onClose = vi.fn();
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => mockExplanationResponse,
    });

    render(
      <AiExplanationDrawer
        isOpen={true}
        onClose={onClose}
        action={sampleAction}
        profile={sampleProfile}
        locationId="delhi-anand-vihar"
      />
    );

    const closeBtn = screen.getByRole("button", { name: /Close assistant drawer/i });
    fireEvent.click(closeBtn);
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
