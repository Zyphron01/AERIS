/**
 * AERIS Decision Engine Rule: Vulnerable Household Member Care
 * Protective behavioral shielding for households with children, older adults, or declared sensitivities.
 * Strictly non-diagnostic; provides behavioral and lifestyle exposure-reduction advice only.
 *
 * Authoritative Scientific References:
 * 1. World Health Organization (WHO): "Air Pollution and Child Health: Prescribing Clean Air", 2018.
 * 2. American Thoracic Society (ATS): "Health Effects of Outdoor Air Pollution on Vulnerable Populations", 2020.
 * 3. CPCB India: "Health Advisories for Sensitive Groups across NAQI Tiers", 2014.
 */

import type { HouseholdProfile, RecommendationAction } from "../types";
import type { NormalizedTelemetry } from "@/lib/telemetry/types";

export function evaluateVulnerableCareRule(
  profile: HouseholdProfile,
  telemetry: NormalizedTelemetry
): RecommendationAction | null {
  const hasChildren = profile.members.includes("children") || profile.members.includes("infants");
  const hasOlderAdults = profile.members.includes("older_adults");
  const hasDeclaredSensitivity = profile.declaredSensitivity !== "none";

  // If no sensitive or vulnerable members are present, this rule does not trigger
  if (!hasChildren && !hasOlderAdults && !hasDeclaredSensitivity) {
    return null;
  }

  const pm25Value = telemetry.pollutants.find((p) => p.code === "pm2_5")?.value ?? null;
  const aqiValue = telemetry.aqi.cpcbAqi.value ?? telemetry.aqi.usAqi.value ?? null;
  const isElevated = (pm25Value !== null && pm25Value > 45) || (aqiValue !== null && aqiValue > 100);
  const isSevere = (pm25Value !== null && pm25Value > 120) || (aqiValue !== null && aqiValue > 250);

  // If air is very clean, no protective intervention required
  if (!isElevated && pm25Value !== null && pm25Value <= 30) {
    return null;
  }

  const priority = isSevere ? "urgent" : isElevated ? "high" : "moderate";

  let title = "Protective Shielding for Vulnerable Household Members";
  let actionText = "";
  let reason = "";

  if (hasChildren && profile.hasSchoolRoutine) {
    title = "School Routine & Children's Exposure Safeguards";
    actionText =
      "Ensure children wear an appropriately fitted youth-sized N95/KN95 mask during school bus waits and request that active outdoor sports/recess be conducted indoors.";
    reason = `Children have higher respiratory rates relative to body mass (~400 mL/kg/day vs ~150 mL/kg/day in adults) and immature lung airways, resulting in up to 2-fold higher localized particulate deposition per unit lung surface area.`;
  } else if (hasDeclaredSensitivity && profile.declaredSensitivity === "respiratory_asthma") {
    title = "Respiratory Care & Inhaler Accessibility";
    actionText =
      "Keep prescribed fast-acting rescue inhalers immediately accessible, verify spacer seals, and avoid unventilated indoor spaces with strong chemical cleaners or aerosol sprays.";
    reason = `Elevated ambient PM2.5 (${pm25Value ?? "elevated"} µg/m³) triggers airway hyperresponsiveness and mucosal inflammation in individuals with declared reactive airway sensitivities.`;
  } else if (hasOlderAdults || (hasDeclaredSensitivity && profile.declaredSensitivity === "cardiovascular")) {
    title = "Cardiovascular & Senior Care Advisory";
    actionText =
      "Substitute outdoor brisk walking with gentle indoor stretching, maintain well-hydrated routines, and remain in air-filtered indoor micro-zones during morning stagnation hours.";
    reason = `Fine particulate inhalation induces acute systemic vascular oxidative stress, blood pressure fluctuations, and autonomic nervous system imbalance in older adults and individuals with cardiovascular considerations.`;
  } else {
    title = "Sensitive Household Member Advisory";
    actionText =
      "Minimize non-essential outdoor transit during peak pollution hours and prioritize indoor activities with closed windows.";
    reason = `Vulnerable household members experience biological airway irritation at lower ambient particulate concentrations (${pm25Value ?? "elevated"} µg/m³) than healthy adults.`;
  }

  return {
    id: "vulnerable-care-shielding",
    category: "protective_measures",
    priority,
    title,
    actionText,
    reason,
    evidenceReferences: [
      "WHO Report: Air Pollution and Child Health — Prescribing Clean Air (2018)",
      "American Thoracic Society: Clinical Guidelines on Air Pollution & Respiratory Disease (2020)",
      "CPCB National Air Quality Index Health Advisory: Sensitive Group Guidance (2014)",
    ],
    tradeOffs:
      "Limiting outdoor recess or sports can be frustrating for children, but prevents high-dose alveolar particulate deposition during developing lung growth stages.",
    impactClassification: "exposure_reduction",
    limitations:
      "AERIS provides behavioral and lifestyle guidance only; this advice does not constitute medical diagnosis, clinical prescription, or emergency care.",
    sourceValidityTimestamp: telemetry.timestamp,
    applicableRuleId: "AERIS-RULE-VULNERABLE-CARE-01",
    planB: {
      triggerCondition: "If regional forecast indicates PM2.5 escalation into Severe range (hourly projected PM2.5 > 250 µg/m³)",
      triggerVariable: "pm2_5",
      thresholdValue: 250,
      thresholdUnit: "µg/m³ (hourly projected trend)",
      source: "Open-Meteo Chemical Transport Model Forecast (CAMS Global)",
      validForecastPeriod: "Next 24 Hours",
      alternativeAction: "Transition all household activities strictly indoors with air purifiers on high; eliminate all non-essential outdoor transit.",
      reasonForChange: "Severe ambient particulate pollution triggers acute bronchial hyperreactivity and vascular stress in vulnerable demographics.",
    },
    explanation: {
      influencingFactors: [
        `Household composition: ${profile.members.join(", ")}`,
        `Declared sensitivity: ${profile.declaredSensitivity}`,
        `School routine: ${profile.hasSchoolRoutine ? "Yes" : "No"}`,
        `Ambient PM2.5: ${pm25Value ?? "N/A"} µg/m³`,
      ],
      ruleTriggered: "AERIS-RULE-VULNERABLE-CARE-01",
      sourceAttribution: telemetry.source,
      dataTimestamp: telemetry.timestamp,
      assumptions: [
        "Vulnerable members have access to indoor shelter and standard household protections.",
        "Guidance is strictly preventive and non-clinical.",
      ],
      uncertainties: [
        "Individual sensitivity thresholds vary widely based on baseline wellness, age, and acclimation.",
      ],
    },
  };
}
