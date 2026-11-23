/**
 * AERIS Gemini Intelligence — Deterministic Bilingual Fallback Generator
 * Provides 100% reliable, zero-hallucination explanations and chat responses
 * in English and Hindi when Gemini is unavailable, rate-limited, or disabled.
 */

import type {
  RecommendationAction,
} from "@/lib/decision-engine/types";
import type {
  AssistantLanguage,
  ModelGeneratedExplanation,
  ModelGeneratedChatResponse,
  TrustedActionMetadata,
} from "./types";

/**
 * Generates a deterministic, rule-grounded explanation.
 */
export function generateDeterministicExplanation(
  action: RecommendationAction,
  metadata: TrustedActionMetadata,
  language: AssistantLanguage = "en"
): ModelGeneratedExplanation {
  if (language === "hi") {
    return generateHindiExplanation(action, metadata);
  }

  const pmText = metadata.pm25Value !== null ? `${metadata.pm25Value} µg/m³` : "elevated levels";
  const aqiText = metadata.cpcbAqiValue !== null ? `NAQI ${metadata.cpcbAqiValue} (${metadata.cpcbAqiCategory})` : "elevated AQI";

  return {
    headline: `${action.title} (${metadata.priority.toUpperCase()} Priority)`,
    actionBreakdown: `Recommended Protocol: ${action.actionText} Trade-off considerations: ${action.tradeOffs}`,
    whyThisMatters: `Scientific Rationale: ${action.reason} Grounded in: ${metadata.evidenceReferences.join("; ")}.`,
    microclimateContext: `Regional air quality currently indicates ${aqiText} with PM2.5 at ${pmText}. ${
      metadata.isModelEstimate
        ? "Measurements are derived from atmospheric chemistry transport models (CAMS Global) using standard regulatory calculations."
        : "Measurements represent certified monitoring telemetry."
    }`,
  };
}

/**
 * Hindi deterministic explanation preserving exact units and citations.
 */
function generateHindiExplanation(
  action: RecommendationAction,
  metadata: TrustedActionMetadata
): ModelGeneratedExplanation {
  const pmText = metadata.pm25Value !== null ? `${metadata.pm25Value} µg/m³` : "उच्च स्तर";
  const aqiCategoryHi: Record<string, string> = {
    Good: "अच्छा (Good)",
    Satisfactory: "संतोषजनक (Satisfactory)",
    Moderate: "मध्यम (Moderate)",
    Poor: "खराब (Poor)",
    "Very Poor": "बहुत खराब (Very Poor)",
    Severe: "गंभीर (Severe)",
  };
  const catText = aqiCategoryHi[metadata.cpcbAqiCategory] ?? metadata.cpcbAqiCategory;

  return {
    headline: `${action.title} (${metadata.priority === "urgent" ? "अति आवश्यक (Urgent)" : metadata.priority === "high" ? "उच्च (High)" : "मध्यम (Moderate)"} प्राथमिकता)`,
    actionBreakdown: `अनुशंसित कार्रवाई: ${action.actionText} व्यावहारिक संतुलन: ${action.tradeOffs}`,
    whyThisMatters: `वैज्ञानिक आधार: ${action.reason} प्रमाण संदर्भ: ${metadata.evidenceReferences.join("; ")}।`,
    microclimateContext: `वर्तमान वायु गुणवत्ता श्रेणी: ${catText}, PM2.5 स्तर: ${pmText}। यह डेटा CAMS वायुमंडलीय मॉडल और CPCB 2014 दिशानिर्देशों पर आधारित है।`,
  };
}

/**
 * Generates a deterministic chat response for supported questions.
 */
export function generateDeterministicChatResponse(
  userQuery: string,
  action: RecommendationAction | null,
  metadata: TrustedActionMetadata | null,
  language: AssistantLanguage = "en"
): ModelGeneratedChatResponse {
  // Medical inquiry deflection with multilingual pattern matching
  const isMedicalQuery =
    /\b(?:prescri|medicin|medic|dos|inhal|diagnos|cur|therap|drug|pill|symptom)/i.test(userQuery) ||
    /दवा|खुराक|इलाज|डॉक्टर|औषधि|रोग|बीमारी/.test(userQuery);

  if (isMedicalQuery) {
    if (language === "hi") {
      return {
        answer:
          "AERIS एक पर्यावरणीय निर्णय-सहायक प्रणाली है और यह चिकित्सकीय परामर्श, निदान या दवा की सिफारिश प्रदान नहीं करती। कृपया व्यक्तिगत स्वास्थ्य और दवा संबंधी प्रश्नों के लिए किसी योग्य चिकित्सक से संपर्क करें।",
        contextCitation: "AERIS Permanent Rule 12 (No Medical Claims)",
        confidenceNotice: "Non-clinical health guidance boundary",
        isMedicalQuery: true,
      };
    }
    return {
      answer:
        "AERIS is an environmental decision-support companion and does not provide clinical diagnosis, prescriptions, or medical treatment plans. Please consult a licensed medical professional for personal clinical concerns.",
      contextCitation: "AERIS Permanent Rule 12 (No Medical Claims)",
      confidenceNotice: "Non-clinical health guidance boundary",
      isMedicalQuery: true,
    };
  }

  // Action specific queries
  if (action && metadata) {
    if (language === "hi") {
      return {
        answer: `इस कार्रवाई (#${action.applicableRuleId}) की सिफारिश इसलिए की गई है क्योंकि वर्तमान PM2.5 स्तर ${metadata.pm25Value ?? "elevated"} µg/m³ है (${metadata.cpcbAqiCategory} श्रेणी)। ${action.reason}`,
        contextCitation: metadata.evidenceReferences[0] ?? "CPCB NAQI Guidelines (2014)",
        confidenceNotice: "CPCB और WHO दिशानिर्देशों पर आधारित प्रमाण-समर्थित सलाह।",
        isMedicalQuery: false,
      };
    }
    return {
      answer: `This action (${action.applicableRuleId}) was prioritized because regional PM2.5 is currently ${metadata.pm25Value ?? "elevated"} µg/m³ (${metadata.cpcbAqiCategory} category). ${action.reason}`,
      contextCitation: metadata.evidenceReferences[0] ?? "CPCB NAQI Guidelines (2014)",
      confidenceNotice: "Evidence-based deterministic advice from verified guidelines.",
      isMedicalQuery: false,
    };
  }

  // General reading inquiry
  if (language === "hi") {
    return {
      answer:
        "AERIS भारतीय CPCB राष्ट्रीय वायु गुणवत्ता सूचकांक (NAQI) और PM2.5 सांद्रता के आधार पर व्यावहारिक जीवनशैली और जोखिम न्यूनीकरण सलाह प्रदान करता है।",
      contextCitation: "Central Pollution Control Board NAQI (2014)",
      confidenceNotice: "प्रमाणित वायु गुणवत्ता दिशानिर्देश।",
      isMedicalQuery: false,
    };
  }

  return {
    answer:
      "AERIS structures daily environmental guidance using official CPCB National Air Quality Index (NAQI) standards and WHO clean air targets to minimize personal particulate inhalation.",
    contextCitation: "Central Pollution Control Board NAQI (2014) & WHO (2021)",
    confidenceNotice: "Standard verified environmental guidance.",
    isMedicalQuery: false,
  };
}
