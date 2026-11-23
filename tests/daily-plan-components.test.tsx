import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import React from "react";
import { ProfileSummaryBar } from "@/components/daily-plan/profile-summary-bar";
import { RecommendationCard } from "@/components/daily-plan/recommendation-card";
import { PlanBCard } from "@/components/daily-plan/plan-b-card";
import { DecisionExplanationView } from "@/components/daily-plan/decision-explanation";
import { OnboardingWizard } from "@/components/daily-plan/onboarding-wizard";
import type {
  HouseholdProfile,
  RecommendationAction,
  PlanBAlternative,
  DecisionExplanation,
} from "@/lib/decision-engine/types";

describe("Daily Plan UI Components", () => {
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

  const samplePlanB: PlanBAlternative = {
    triggerCondition: "PM2.5 concentration exceeds 120 µg/m³ during commute hours",
    triggerVariable: "pm2_5",
    thresholdValue: 120,
    thresholdUnit: "µg/m³",
    source: "Open-Meteo Hourly CAMS Model",
    validForecastPeriod: "Next 12 Hours",
    alternativeAction: "Switch from cycling to metro transit and wear a sealed N95 respirator.",
    reasonForChange: "Exceeds acute airway hyperreactivity safety threshold.",
  };

  const sampleExplanation: DecisionExplanation = {
    influencingFactors: [
      "PM2.5 concentration: 145 µg/m³ (CPCB Poor)",
      "Vulnerable demographic: children present",
      "Declared sensitivity: asthma consideration",
    ],
    ruleTriggered: "AERIS-RULE-EXERCISE-DISPERSION-02",
    sourceAttribution: "CPCB Air Quality Guidelines (2014) & WHO Global Air Quality Guidelines (2021)",
    dataTimestamp: "2026-11-21T06:00:00Z",
    assumptions: ["Outdoor ambient pollution freely penetrates open doors"],
    uncertainties: ["Local hyper-local particulate traps near roadside"],
  };

  const sampleAction: RecommendationAction = {
    id: "rec-morning-exercise",
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
    planB: samplePlanB,
    explanation: sampleExplanation,
  };

  describe("ProfileSummaryBar", () => {
    it("renders household profile demographic pills and triggers edit and clear callbacks", () => {
      const onEdit = vi.fn();
      const onClear = vi.fn();

      render(
        <ProfileSummaryBar
          profile={sampleProfile}
          onEdit={onEdit}
          onClear={onClear}
        />
      );

      // Verify demographic items are rendered
      expect(screen.getByText("Active Household Profile")).toBeDefined();
      expect(screen.getByText("Adults, Children")).toBeDefined();
      expect(screen.getByText("Active (Walk/Bike)")).toBeDefined();
      expect(screen.getByText("HEPA Purifier")).toBeDefined();
      expect(screen.getByText("respiratory / asthma")).toBeDefined();

      // Trigger Edit
      const editButton = screen.getByRole("button", { name: /Edit household profile/i });
      fireEvent.click(editButton);
      expect(onEdit).toHaveBeenCalledTimes(1);

      // Trigger Clear
      const clearButton = screen.getByRole("button", { name: /Clear stored household profile/i });
      fireEvent.click(clearButton);
      expect(onClear).toHaveBeenCalledTimes(1);
    });
  });

  describe("PlanBCard", () => {
    it("renders trigger condition, threshold, forecast horizon, and alternative action", () => {
      render(<PlanBCard planB={samplePlanB} />);

      expect(screen.getByText(/Plan B — Conditional Forecast Alternative/i)).toBeDefined();
      expect(
        screen.getByText(/PM2.5 concentration exceeds 120 µg\/m³/i)
      ).toBeDefined();
      expect(screen.getByText(/Valid Horizon: Next 12 Hours/i)).toBeDefined();
      expect(
        screen.getByText(/Switch from cycling to metro transit/i)
      ).toBeDefined();
      expect(
        screen.getByText(/Exceeds acute airway hyperreactivity safety threshold/i)
      ).toBeDefined();
    });
  });

  describe("DecisionExplanationView", () => {
    it("renders rule triggered, attribution, input factors, assumptions, and uncertainties", () => {
      render(<DecisionExplanationView explanation={sampleExplanation} />);

      expect(screen.getByText("AERIS-RULE-EXERCISE-DISPERSION-02")).toBeDefined();
      expect(screen.getByText(/CPCB Air Quality Guidelines/i)).toBeDefined();
      expect(
        screen.getByText(/PM2.5 concentration: 145 µg\/m³/i)
      ).toBeDefined();
      expect(
        screen.getByText(/Outdoor ambient pollution freely penetrates open doors/i)
      ).toBeDefined();
      expect(
        screen.getByText(/Local hyper-local particulate traps near roadside/i)
      ).toBeDefined();
    });
  });

  describe("RecommendationCard", () => {
    it("renders rank, priority badge, title, trade-offs, and expands Plan B and explanation", () => {
      render(<RecommendationCard action={sampleAction} rank={1} />);

      // Rank & priority
      expect(screen.getByText("#1")).toBeDefined();
      expect(screen.getByText("urgent Priority")).toBeDefined();
      expect(screen.getByText("Outdoor & Exercise")).toBeDefined();
      expect(screen.getByText("Exposure Reduction")).toBeDefined();

      // Title & action text
      expect(
        screen.getByRole("heading", { name: "Shift Aerobic Exercise to Afternoon Window" })
      ).toBeDefined();
      expect(
        screen.getByText(/Relocate morning run or vigorous activity indoors/i)
      ).toBeDefined();

      // Citations & trade-offs
      expect(screen.getByText(/WHO Global Air Quality Guidelines/i)).toBeDefined();
      expect(
        screen.getByText(/Requires shifting routine from early morning to midday/i)
      ).toBeDefined();

      // Expand Plan B
      const planBButton = screen.getByRole("button", { name: /View Plan B/i });
      fireEvent.click(planBButton);
      expect(screen.getByText(/Plan B — Conditional Forecast Alternative/i)).toBeDefined();

      // Expand Decision Explanation
      const auditButton = screen.getByRole("button", { name: /Why am I seeing this/i });
      fireEvent.click(auditButton);
      expect(screen.getByText("AERIS-RULE-EXERCISE-DISPERSION-02")).toBeDefined();
    });
  });

  describe("OnboardingWizard", () => {
    it("allows stepping through wizard, configuring options, and saving completed profile", () => {
      const onSave = vi.fn();
      const onCancel = vi.fn();

      render(
        <OnboardingWizard
          initialProfile={null}
          onSave={onSave}
          onCancel={onCancel}
        />
      );

      // Step 1: Household Members & Considerations
      expect(screen.getByText(/Step 1 of 4/i)).toBeDefined();
      expect(screen.getByText(/Who is in your household\?/i)).toBeDefined();

      // Advance to Step 2
      const nextBtn1 = screen.getByRole("button", { name: /^Next$/i });
      fireEvent.click(nextBtn1);

      // Step 2: Commute & Daily Movement
      expect(screen.getByText(/Step 2 of 4/i)).toBeDefined();
      expect(screen.getByText(/What are your daily movement patterns\?/i)).toBeDefined();

      // Select active commute
      const walkRadio = screen.getByLabelText(/Walking \/ Cycling/i);
      fireEvent.click(walkRadio);

      // Advance to Step 3
      const nextBtn2 = screen.getByRole("button", { name: /^Next$/i });
      fireEvent.click(nextBtn2);

      // Step 3: Indoor Environment
      expect(screen.getByText(/Step 3 of 4/i)).toBeDefined();
      expect(screen.getByText(/What does your indoor environment look like\?/i)).toBeDefined();

      // Advance to Step 4
      const nextBtn3 = screen.getByRole("button", { name: /^Next$/i });
      fireEvent.click(nextBtn3);

      // Step 4: Budget & Practicality
      expect(screen.getByText(/Step 4 of 4/i)).toBeDefined();
      expect(screen.getByText(/What is your practical budget for interventions\?/i)).toBeDefined();

      // Complete setup
      const finishBtn = screen.getByRole("button", { name: /Generate My Daily Plan/i });
      fireEvent.click(finishBtn);

      // Verify onSave was called with valid profile
      expect(onSave).toHaveBeenCalledTimes(1);
      const saved = onSave.mock.calls[0][0] as HouseholdProfile;
      expect(saved.members.length).toBeGreaterThan(0);
      expect(saved.primaryCommute).toBe("active_walking_biking");
    });

    it("triggers onCancel when close button is clicked", () => {
      const onCancel = vi.fn();
      render(
        <OnboardingWizard
          onSave={vi.fn()}
          onCancel={onCancel}
        />
      );

      const cancelBtn = screen.getByRole("button", { name: /Close setup wizard/i });
      fireEvent.click(cancelBtn);
      expect(onCancel).toHaveBeenCalledTimes(1);
    });
  });
});
