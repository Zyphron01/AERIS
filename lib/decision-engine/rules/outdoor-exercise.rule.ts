/**
 * AERIS Decision Engine Rule: Outdoor Exercise Scheduling
 * Evaluates aerobic exertion and outdoor workout timing against particulate concentrations.
 *
 * Authoritative Scientific References:
 * 1. World Health Organization (WHO): "Global Air Quality Guidelines", 2021 (PM2.5 24-hr interim target 1: 75 µg/m³; guideline: 15 µg/m³).
 * 2. CPCB India: "National Air Quality Index Public Health Guidance", 2014 (Moderate AQI > 100: Breathing discomfort to people with lung/asthma/heart disease).
 * 3. US EPA: "Air Quality Index Technical Assistance Document", 2018 (Air quality for outdoor exercise & athletic activity).
 */

import type { HouseholdProfile, RecommendationAction } from "../types";
import type { NormalizedTelemetry } from "@/lib/telemetry/types";

export function evaluateOutdoorExerciseRule(
  profile: HouseholdProfile,
  telemetry: NormalizedTelemetry
): RecommendationAction | null {
  // If user does not exercise outdoors, this rule is not applicable
  if (profile.outdoorExercise === "none") {
    return null;
  }

  const pm25Value = telemetry.pollutants.find((p) => p.code === "pm2_5")?.value ?? null;
  const aqiValue = telemetry.aqi.cpcbAqi.value ?? telemetry.aqi.usAqi.value ?? null;
  const hasVulnerable =
    profile.members.includes("children") ||
    profile.members.includes("older_adults") ||
    profile.declaredSensitivity !== "none";

  const isHighPollution = (pm25Value !== null && pm25Value > 60) || (aqiValue !== null && aqiValue > 150);
  const isModeratePollution = (pm25Value !== null && pm25Value > 30) || (aqiValue !== null && aqiValue > 100);

  // If air is clean (PM2.5 <= 30 and AQI <= 100), issue affirmative low-priority maintenance recommendation
  if (!isModeratePollution && !isHighPollution && pm25Value !== null) {
    return {
      id: "outdoor-exercise-clean-window",
      category: "outdoor_activity",
      priority: "low",
      title: "Optimal Outdoor Exercise Window",
      actionText: `Proceed with planned ${profile.outdoorExercise.replace("_", " ")} outdoor workout while atmospheric particulate levels remain within acceptable limits.`,
      reason: `Current PM2.5 concentration (${pm25Value} µg/m³) is within regional satisfactory limits, posing minimal acute risk for aerobic activities.`,
      evidenceReferences: [
        "WHO Global Air Quality Guidelines (2021) — Interim Target 3 (37.5 µg/m³ 24h)",
        "CPCB India NAQI Guidelines (2014) — Satisfactory Category (31–60 µg/m³)",
      ],
      tradeOffs: "Aerobic cardiovascular benefits outweigh micro-pollutant exposure risks during clean meteorological windows.",
      impactClassification: "exposure_reduction",
      limitations: "Local roadside vehicle corridors may exhibit transient particulate spikes not resolved by regional atmospheric models.",
      sourceValidityTimestamp: telemetry.timestamp,
      applicableRuleId: "AERIS-RULE-EXERCISE-CLEAN-01",
      explanation: {
        influencingFactors: [
          `Declared outdoor exercise timing: ${profile.outdoorExercise}`,
          `Current PM2.5: ${pm25Value} µg/m³`,
          `CPCB AQI Category: ${telemetry.aqi.cpcbAqi.category}`,
        ],
        ruleTriggered: "AERIS-RULE-EXERCISE-CLEAN-01",
        sourceAttribution: telemetry.source,
        dataTimestamp: telemetry.timestamp,
        assumptions: ["User exercises in a general urban/suburban park or residential setting away from direct tailpipes."],
        uncertainties: ["Regional chemical transport models have a grid resolution of 10–25 km; localized point sources are not reflected."],
      },
    };
  }

  // Elevated or High Pollution condition
  const priority = isHighPollution ? (hasVulnerable ? "urgent" : "high") : "moderate";
  const actionTitle = isHighPollution
    ? "Shift Workout Indoors or Reschedule to Midday"
    : "Moderate Outdoor Exertion & Time Exercise Wisely";

  const actionText =
    profile.outdoorExercise === "early_morning"
      ? "Reschedule early morning run to early afternoon (13:00–16:00) or substitute with an indoor workout."
      : "Lower aerobic intensity and avoid running near high-volume traffic corridors.";

  const reason =
    profile.outdoorExercise === "early_morning"
      ? `Morning temperature inversions trap fine particulates (${pm25Value ?? "elevated"} µg/m³) near ground level. Deep inhalation during running increases alveolar particulate deposition up to 4.5-fold.`
      : `Ambient PM2.5 (${pm25Value ?? "elevated"} µg/m³) exceeds health-protective thresholds, increasing respiratory irritation during strenuous cardiovascular exertion.`;

  // Determine forecast Plan B alternative using 24h hourly forecast
  let planBAlternative = undefined;
  if (telemetry.hourlyForecast && telemetry.hourlyForecast.length > 0) {
    // Find forecast window where PM2.5 is lowest
    const futurePoints = telemetry.hourlyForecast.slice(0, 24);
    const validPmPoints = futurePoints.filter((pt) => pt.pm2_5 !== null && pt.pm2_5 !== undefined);

    if (validPmPoints.length > 0) {
      const bestWindow = validPmPoints.reduce((min, pt) =>
        (pt.pm2_5 ?? Infinity) < (min.pm2_5 ?? Infinity) ? pt : min
      );

      const bestTimeFormatted = new Date(bestWindow.time).toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
        hour12: false,
      });

      planBAlternative = {
        triggerCondition: `If hourly forecast PM2.5 remains elevated (projected > 60 µg/m³ hourly trend) during your planned ${profile.outdoorExercise.replace("_", " ")} window`,
        triggerVariable: "pm2_5" as const,
        thresholdValue: 60,
        thresholdUnit: "µg/m³ (hourly forecast)",
        source: "Open-Meteo Atmospheric Chemistry Hourly Forecast (CAMS Global)",
        validForecastPeriod: `Next 24 Hours (Diurnal minimum projected near ${bestTimeFormatted})`,
        alternativeAction: `Transition morning run to an indoor bodyweight/treadmill session, or shift outdoor jogging to around ${bestTimeFormatted} when PM2.5 is projected to reach its diurnal minimum (~${bestWindow.pm2_5} µg/m³).`,
        reasonForChange:
          "Solar surface warming deepens the planetary boundary layer by early afternoon, enhancing convective particulate dilution compared to morning surface inversion trapping.",
      };
    }
  }

  return {
    id: "outdoor-exercise-reschedule",
    category: "outdoor_activity",
    priority,
    title: actionTitle,
    actionText,
    reason,
    evidenceReferences: [
      "WHO Global Air Quality Guidelines (2021) — Section 3.2 Health Effects of Particulate Matter Exposure",
      "CPCB National Air Quality Index (2014) — Health Advisory for Moderate & Poor Categories",
      "Giles & Koehle (2014) — Exercise and Air Pollution: Benefits, Risks, and Preventive Strategies (Sports Med)",
    ],
    tradeOffs:
      "Shifting exercise indoors maintains cardiovascular fitness while avoiding 70–85% of inhaled fine particulates. Indoor environments without air purifiers must maintain clean air to realize full benefit.",
    impactClassification: "exposure_reduction",
    limitations:
      "Regional chemical transport forecast indicates broad planetary boundary layer behavior; rain or microscale wind shifts may alter actual dispersion timing.",
    sourceValidityTimestamp: telemetry.timestamp,
    applicableRuleId: "AERIS-RULE-EXERCISE-DISPERSION-02",
    planB: planBAlternative,
    explanation: {
      influencingFactors: [
        `User schedule: ${profile.outdoorExercise} workout`,
        `Current PM2.5 (24-hour model-derived rolling average): ${pm25Value ?? "N/A"} µg/m³`,
        `Vulnerability profile: ${hasVulnerable ? "Contains sensitive/vulnerable members" : "Standard adult"}`,
      ],
      ruleTriggered: "AERIS-RULE-EXERCISE-DISPERSION-02",
      sourceAttribution: telemetry.source,
      dataTimestamp: telemetry.timestamp,
      assumptions: [
        "Aerobic exercise increases minute ventilation from ~6 L/min at rest to 40–80 L/min during running.",
        "Indoor exercise space has lower particulate levels than outdoor street level.",
      ],
      uncertainties: [
        "Forecasted dispersion timing depends on wind speed and solar radiation flux.",
      ],
    },
  };
}
