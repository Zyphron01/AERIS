/**
 * AERIS Decision Engine Rule: Commute & Transit Exposure Mitigation
 * Evaluates transport route exposure and protective equipment (respirators, vehicle cabin filtration).
 *
 * Authoritative Scientific References:
 * 1. US National Institute for Occupational Safety and Health (NIOSH): "Particulate Respirator Guidance (N95/FFP2)", 2020.
 * 2. CPCB India: "Advisory on Airborne Particulate Protection during Peak Traffic Hours", 2014.
 * 3. Goel & Kumar (2015): "Characterization of pedestrian and commuter particulate exposure in high-density urban corridors" (Atmospheric Environment).
 */

import type { HouseholdProfile, RecommendationAction } from "../types";
import type { NormalizedTelemetry } from "@/lib/telemetry/types";

export function evaluateCommuteProtectionRule(
  profile: HouseholdProfile,
  telemetry: NormalizedTelemetry
): RecommendationAction | null {
  // If user works from home, transit exposure is naturally minimized
  if (profile.primaryCommute === "work_from_home") {
    return null;
  }

  const pm25Value = telemetry.pollutants.find((p) => p.code === "pm2_5")?.value ?? null;
  const aqiValue = telemetry.aqi.cpcbAqi.value ?? telemetry.aqi.usAqi.value ?? null;
  const isElevated = (pm25Value !== null && pm25Value > 60) || (aqiValue !== null && aqiValue > 150);
  const isSevere = (pm25Value !== null && pm25Value > 120) || (aqiValue !== null && aqiValue > 300);

  // Active walking or cycling commuter
  if (profile.primaryCommute === "active_walking_biking") {
    const priority = isSevere ? "urgent" : isElevated ? "high" : "moderate";
    const title = isElevated
      ? "Wear Certified Particulate Respirator (N95/FFP2)"
      : "Active Commute Air Advisory";

    const actionText = isElevated
      ? "Wear a tight-fitting, certified N95 or FFP2 respirator with an adjustable nose clip along high-density traffic arteries, and choose secondary roads when feasible."
      : "Maintain moderate walking/cycling pace and avoid idling intersections where roadside black carbon clusters.";

    return {
      id: "commute-active-respirator-protection",
      category: "commute",
      priority,
      title,
      actionText,
      reason: `Direct roadside pedestrian/cyclist particulate exposure is typically 20–40% higher than ambient regional measurements due to localized tailpipe emissions and brake dust resuspension.`,
      evidenceReferences: [
        "NIOSH Guide to the Selection and Use of Particulate Respirators (42 CFR Part 84)",
        "Goel & Kumar (2015) — Pedestrian and cyclist exposure along arterial urban corridors",
        "WHO Air Quality Guidelines (2021) — Section 4 Interventions and Exposure Reduction",
      ],
      tradeOffs:
        "Properly sealed N95 respirators filter ≥ 95% of fine particles (0.3 µm) but introduce breathing resistance; ensure steady hydration and avoid all-out sprints.",
      impactClassification: "exposure_reduction",
      limitations:
        "Respirators must maintain a facial seal without air leakage; cloth masks or loose surgical masks do not provide equivalent particulate protection.",
      sourceValidityTimestamp: telemetry.timestamp,
      applicableRuleId: "AERIS-RULE-COMMUTE-ACTIVE-01",
      planB: {
        triggerCondition: "If regional chemical transport forecast indicates projected Severe conditions (modeled forecast AQI > 400) during peak transit hours",
        triggerVariable: "aqi",
        thresholdValue: 400,
        thresholdUnit: "projected CPCB Index Points",
        source: "Open-Meteo Chemical Transport Model Forecast (CAMS Global)",
        validForecastPeriod: "Peak Commute Hours (08:00–10:00 / 17:00–19:00)",
        alternativeAction: "Switch active cycling/walking commute to an enclosed metro rail or air-conditioned bus with sealed windows.",
        reasonForChange: "Severe ambient particulate pollution drastically elevates cardiopulmonary strain during physical exertion.",
      },
      explanation: {
        influencingFactors: [
          `Commute mode: ${profile.primaryCommute}`,
          `Ambient PM2.5: ${pm25Value ?? "N/A"} µg/m³`,
          `CPCB Category: ${telemetry.aqi.cpcbAqi.category}`,
        ],
        ruleTriggered: "AERIS-RULE-COMMUTE-ACTIVE-01",
        sourceAttribution: telemetry.source,
        dataTimestamp: telemetry.timestamp,
        assumptions: ["Commuter travels along urban roads with shared vehicular traffic."],
        uncertainties: ["Microenvironment concentrations directly behind heavy diesel trucks can exceed model background by 3–5x."],
      },
    };
  }

  // Personal vehicle commuter
  if (profile.primaryCommute === "personal_vehicle") {
    return {
      id: "commute-cabin-recirculation",
      category: "commute",
      priority: isElevated ? "moderate" : "low",
      title: "Activate Vehicle Cabin Recirculation",
      actionText: "Switch vehicle HVAC to internal recirculation mode with windows up while driving through highway congestion or signal bottlenecks.",
      reason: "Internal recirculation coupled with standard cabin micro-filters reduces in-cabin particulate levels by 60–80% compared to outside tunnel/roadside air.",
      evidenceReferences: [
        "Hudda et al. (2012) — Effect of in-cabin air recirculation on commuter exposure to ultrafine particles (Environ. Sci. Technol.)",
        "CPCB Guidelines on Commuter Exposure Controls (2014)",
      ],
      tradeOffs:
        "Long trips (> 30 min) in recirculation mode with multiple passengers can cause CO2 to build up; briefly crack windows in cleaner open stretches to refresh cabin oxygen.",
      impactClassification: "exposure_reduction",
      limitations: "Effectiveness relies on an intact, non-saturated cabin air filter replaced according to manufacturer schedule.",
      sourceValidityTimestamp: telemetry.timestamp,
      applicableRuleId: "AERIS-RULE-COMMUTE-CABIN-02",
      explanation: {
        influencingFactors: [
          `Commute mode: ${profile.primaryCommute}`,
          `Ambient PM2.5: ${pm25Value ?? "N/A"} µg/m³`,
        ],
        ruleTriggered: "AERIS-RULE-COMMUTE-CABIN-02",
        sourceAttribution: telemetry.source,
        dataTimestamp: telemetry.timestamp,
        assumptions: ["Vehicle has an operable HVAC recirculation damper and cabin filter."],
        uncertainties: ["Vehicle age and door seal integrity influence passive infiltration rates."],
      },
    };
  }

  // Public transit commuter
  if (profile.primaryCommute === "public_transit") {
    return {
      id: "commute-public-transit-buffer",
      category: "commute",
      priority: isElevated ? "high" : "low",
      title: "Platform & Station Transit Protocol",
      actionText: isElevated
        ? "Wear a protective mask on open-air bus stops and underground train platforms where braking friction generates localized particulate spikes."
        : "Board sealed, climate-controlled train cars or buses when available.",
      reason: "Subway platforms and roadside bus stops feature localized particulate and metal dust concentrations resulting from train/bus braking mechanisms.",
      evidenceReferences: [
        "Martins et al. (2016) — Sub-micron and fine particulate matter in underground railway systems (Atmospheric Environment)",
      ],
      tradeOffs: "Requires carrying a portable respirator for platform wait times.",
      impactClassification: "exposure_reduction",
      limitations: "Open-window non-AC public buses have internal particulate counts nearly identical to roadside ambient levels.",
      sourceValidityTimestamp: telemetry.timestamp,
      applicableRuleId: "AERIS-RULE-COMMUTE-TRANSIT-03",
      explanation: {
        influencingFactors: [
          `Commute mode: ${profile.primaryCommute}`,
          `Ambient PM2.5: ${pm25Value ?? "N/A"} µg/m³`,
        ],
        ruleTriggered: "AERIS-RULE-COMMUTE-TRANSIT-03",
        sourceAttribution: telemetry.source,
        dataTimestamp: telemetry.timestamp,
        assumptions: ["Commute involves boarding and waiting at open or semi-enclosed transit terminals."],
        uncertainties: ["Platform ventilation varies between open-air bus shelters and subterranean subway stations."],
      },
    };
  }

  return null;
}
