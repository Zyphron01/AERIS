/**
 * AERIS Decision Engine Rule: Indoor Ventilation & Infiltration Balance
 * Balances outdoor particulate ingress against indoor contaminant buildup (CO2, cooking VOCs).
 *
 * Authoritative Scientific References:
 * 1. ASHRAE Standard 62.2: "Ventilation and Acceptable Indoor Air Quality in Low-Rise Residential Buildings".
 * 2. EPA: "Indoor Air Quality in Homes — Ventilation and Infiltration", 2023.
 * 3. WHO: "Guidelines for Indoor Air Quality: Selected Pollutants", 2010.
 */

import type { HouseholdProfile, RecommendationAction } from "../types";
import type { NormalizedTelemetry } from "@/lib/telemetry/types";

export function evaluateIndoorVentilationRule(
  profile: HouseholdProfile,
  telemetry: NormalizedTelemetry
): RecommendationAction | null {
  const pm25Value = telemetry.pollutants.find((p) => p.code === "pm2_5")?.value ?? null;
  const hasIndoorCombustion =
    profile.indoorSources.includes("cooking_fumes") ||
    profile.indoorSources.includes("incense_candles") ||
    profile.indoorSources.includes("smoking");

  const isOutdoorPolluted = pm25Value !== null && pm25Value > 60;
  const isOutdoorVeryClean = pm25Value !== null && pm25Value <= 30;

  // Case 1: Outdoor air is clean -> Encourage natural ventilation
  if (isOutdoorVeryClean) {
    return {
      id: "ventilation-clean-air-flushing",
      category: "indoor_air",
      priority: "low",
      title: "Natural Air Exchange & Room Flushing",
      actionText: "Briefly open opposing windows (5 to 15 minutes depending on draft strength) to flush indoor air, dilute accumulated CO2, and dissipate indoor moisture.",
      reason: `Ambient outdoor PM2.5 is relatively lower (${pm25Value} µg/m³), presenting an opportune window to exchange stale indoor air with minimal particulate penalty.`,
      evidenceReferences: [
        "ASHRAE Standard 62.2 (2022) — Residential Air Exchange & Dilution Principles",
        "EPA Indoor Air Quality Guide: Chapter 3 Natural Ventilation Dynamics",
      ],
      tradeOffs: "Introduces outdoor air at ambient temperature and humidity; adjust HVAC/heating settings accordingly.",
      impactClassification: "exposure_reduction",
      limitations: "Ensure windows do not face direct alleyway garbage combustion or ground-floor idling vehicle exhausts.",
      sourceValidityTimestamp: telemetry.timestamp,
      applicableRuleId: "AERIS-RULE-VENTILATION-CLEAN-01",
      explanation: {
        influencingFactors: [
          `Outdoor PM2.5: ${pm25Value} µg/m³ (Favorable dispersion window ≤ 30 µg/m³)`,
          `Ventilation preference: ${profile.ventilationPreference}`,
        ],
        ruleTriggered: "AERIS-RULE-VENTILATION-CLEAN-01",
        sourceAttribution: telemetry.source,
        dataTimestamp: telemetry.timestamp,
        assumptions: ["Outdoor air in the vicinity does not contain unmodeled hyper-local odor or combustion sources."],
        uncertainties: ["Natural ventilation rate varies with outdoor wind velocity and indoor-outdoor temperature difference."],
      },
    };
  }

  // Case 2: Outdoor air is polluted AND household has active indoor combustion (cooking, incense)
  if (isOutdoorPolluted && hasIndoorCombustion) {
    return {
      id: "ventilation-cooking-exhaust-strategy",
      category: "indoor_air",
      priority: "high",
      title: "Run Kitchen Exhaust; Keep Living Areas Sealed",
      actionText: "Use localized kitchen exhaust fans or range hoods with kitchen doors closed while cooking, while keeping exterior windows in bedrooms and living rooms sealed.",
      reason: `Ambient PM2.5 is high (${pm25Value ?? "elevated"} µg/m³), meaning opening windows will cause outdoor particulate ingress (I/O ratio 0.7–0.9), while sealing cooking fumes traps indoor ultra-fine particles and VOCs.`,
      evidenceReferences: [
        "Lawrence Berkeley National Laboratory (LBNL) — Residential Kitchen Exhaust Capture Efficiency Studies",
        "EPA Guide to Air Cleaners and Ventilation in the Home (2023)",
      ],
      tradeOffs:
        "Kitchen exhaust removes indoor cooking emissions directly at the source, preventing them from mixing into living rooms, without requiring full-house window opening.",
      impactClassification: "exposure_reduction",
      limitations: "Exhaust fans create minor negative room pressure that can draw infiltration from unsealed window cracks.",
      sourceValidityTimestamp: telemetry.timestamp,
      applicableRuleId: "AERIS-RULE-VENTILATION-COMBUSTION-02",
      planB: {
        triggerCondition: "If hourly forecast PM2.5 exhibits a sustained relative drop below 40 µg/m³ during daytime dispersion",
        triggerVariable: "pm2_5",
        thresholdValue: 40,
        thresholdUnit: "µg/m³ (hourly forecast)",
        source: "Open-Meteo Air Quality Model Forecast (CAMS Global)",
        validForecastPeriod: "Next 12 Hours",
        alternativeAction: "Perform brief 10-minute cross-ventilation immediately after cooking concludes, then reseal exterior doors.",
        reasonForChange: "Lower ambient pollution reduces the penalty of natural ventilation air exchange.",
      },
      explanation: {
        influencingFactors: [
          `Outdoor PM2.5: ${pm25Value ?? "N/A"} µg/m³`,
          `Indoor source declared: ${profile.indoorSources.join(", ")}`,
        ],
        ruleTriggered: "AERIS-RULE-VENTILATION-COMBUSTION-02",
        sourceAttribution: telemetry.source,
        dataTimestamp: telemetry.timestamp,
        assumptions: ["Kitchen has a dedicated exhaust fan or range hood ducted outdoors."],
        uncertainties: ["Effectiveness depends on door sealing between kitchen and adjacent living quarters."],
      },
    };
  }

  // Case 3: Outdoor air is polluted with no significant indoor combustion
  if (isOutdoorPolluted) {
    const priority = pm25Value && pm25Value > 120 ? "urgent" : "high";
    return {
      id: "ventilation-seal-windows-filter",
      category: "indoor_air",
      priority,
      title: "Seal Windows & Suppress Infiltration",
      actionText: "Keep exterior windows and balcony doors sealed during current peak pollution hours to minimize outdoor particle ingress.",
      reason: `Outdoor PM2.5 concentration (${pm25Value ?? "elevated"} µg/m³) is substantially higher than typical indoor baseline levels. Infiltration through open windows rapidly equalizes indoor air to hazardous ambient levels.`,
      evidenceReferences: [
        "Chen & Zhao (2011) — Relationship between indoor and outdoor particles in residences: A review (Atmospheric Environment)",
        "CPCB National Air Quality Index (2014) — Indoor Advisory for Poor/Very Poor AQI",
      ],
      tradeOffs:
        "Window closure maintains lower particulate counts (I/O ratio drops to 0.2–0.4 with closed windows), but indoor CO2 will gradually rise over 4–6 hours in closed occupied bedrooms.",
      impactClassification: "exposure_reduction",
      limitations: "Cracks around older window frames and unsealed air-conditioner sleeves will still allow passive infiltration.",
      sourceValidityTimestamp: telemetry.timestamp,
      applicableRuleId: "AERIS-RULE-VENTILATION-SEAL-03",
      explanation: {
        influencingFactors: [
          `Outdoor PM2.5: ${pm25Value ?? "N/A"} µg/m³`,
          `Ventilation preference: ${profile.ventilationPreference}`,
        ],
        ruleTriggered: "AERIS-RULE-VENTILATION-SEAL-03",
        sourceAttribution: telemetry.source,
        dataTimestamp: telemetry.timestamp,
        assumptions: ["Living spaces are primarily occupied by household members with windows closed."],
        uncertainties: ["Building envelope air tightness varies significantly across architectural eras."],
      },
    };
  }

  return null;
}
