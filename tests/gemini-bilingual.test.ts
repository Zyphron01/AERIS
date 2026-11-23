import { describe, it, expect } from "vitest";
import {
  generateDeterministicExplanation,
  generateDeterministicChatResponse,
} from "@/lib/gemini/fallback";
import type { RecommendationAction, DecisionExplanation } from "@/lib/decision-engine/types";
import type { TrustedActionMetadata } from "@/lib/gemini/types";

describe("Deterministic Bilingual Fallbacks (English & Hindi)", () => {
  const sampleExplanation: DecisionExplanation = {
    influencingFactors: ["PM2.5: 145 µg/m³ (CPCB Very Poor)", "Asthma sensitivity declared"],
    ruleTriggered: "AERIS-RULE-EXERCISE-DISPERSION-02",
    sourceAttribution: "CPCB Guidelines (2014) & WHO (2021)",
    dataTimestamp: "2026-11-21T06:00:00Z",
    assumptions: ["Outdoor air freely penetrates open doors"],
    uncertainties: ["Hyper-local topography variation"],
  };

  const sampleAction: RecommendationAction = {
    id: "rec-morning-exercise-shift",
    category: "outdoor_activity",
    priority: "urgent",
    title: "Shift Aerobic Exercise to Afternoon Window",
    actionText: "Relocate morning run indoors or postpone until after 14:00 when dispersion improves.",
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

  const sampleMetadata: TrustedActionMetadata = {
    actionId: "rec-morning-exercise-shift",
    category: "outdoor_activity",
    priority: "urgent",
    applicableRuleId: "AERIS-RULE-EXERCISE-DISPERSION-02",
    evidenceReferences: [
      "WHO Global Air Quality Guidelines (2021)",
      "CPCB National Air Quality Index Documentation (2014)",
    ],
    cpcbAqiCategory: "Very Poor",
    cpcbAqiValue: 360,
    pm25Value: 145,
    isModelEstimate: true,
    sourceValidityTimestamp: "2026-11-21T06:00:00Z",
  };

  describe("English Deterministic Fallback", () => {
    it("generates structured explanation preserving exact numbers, units, and citations", () => {
      const output = generateDeterministicExplanation(sampleAction, sampleMetadata, "en");

      expect(output.headline).toContain("Shift Aerobic Exercise to Afternoon Window");
      expect(output.headline).toContain("URGENT Priority");
      expect(output.actionBreakdown).toContain(sampleAction.actionText);
      expect(output.whyThisMatters).toContain("WHO Global Air Quality Guidelines (2021)");
      expect(output.microclimateContext).toContain("145 µg/m³");
      expect(output.microclimateContext).toContain("NAQI 360 (Very Poor)");
      expect(output.microclimateContext).toContain("CAMS Global");
    });

    it("generates deterministic non-clinical deflection for medical queries", () => {
      const output = generateDeterministicChatResponse(
        "Can you prescribe me an asthma inhaler dosage?",
        sampleAction,
        sampleMetadata,
        "en"
      );

      expect(output.isMedicalQuery).toBe(true);
      expect(output.answer).toContain("does not provide clinical diagnosis, prescriptions");
      expect(output.confidenceNotice).toContain("Non-clinical health guidance boundary");
    });
  });

  describe("Hindi Deterministic Fallback", () => {
    it("generates structured Hindi explanation preserving units and scientific references", () => {
      const output = generateDeterministicExplanation(sampleAction, sampleMetadata, "hi");

      expect(output.headline).toContain("अति आवश्यक (Urgent)");
      expect(output.actionBreakdown).toContain("अनुशंसित कार्रवाई:");
      expect(output.actionBreakdown).toContain(sampleAction.actionText);
      expect(output.whyThisMatters).toContain("वैज्ञानिक आधार:");
      expect(output.microclimateContext).toContain("145 µg/m³");
      expect(output.microclimateContext).toContain("बहुत खराब (Very Poor)");
      expect(output.microclimateContext).toContain("CPCB 2014 दिशानिर्देशों");
    });

    it("generates Hindi medical deflection preserving non-clinical disclaimer", () => {
      const output = generateDeterministicChatResponse(
        "क्या मुझे अपनी दवा की खुराक बढ़ानी चाहिए?",
        sampleAction,
        sampleMetadata,
        "hi"
      );

      expect(output.isMedicalQuery).toBe(true);
      expect(output.answer).toContain("AERIS एक पर्यावरणीय निर्णय-सहायक प्रणाली है");
      expect(output.answer).toContain("चिकित्सकीय परामर्श, निदान या दवा की सिफारिश प्रदान नहीं करती");
    });
  });
});
