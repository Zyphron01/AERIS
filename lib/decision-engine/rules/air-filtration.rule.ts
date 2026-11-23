/**
 * AERIS Decision Engine Rule: Indoor Air Filtration & Clean Room Strategy
 * Tailors active air cleaning or zero-cost physical containment based on filtration hardware and budget.
 *
 * Authoritative Scientific References:
 * 1. US EPA: "Guide to Air Cleaners in the Home (2nd Edition)", EPA 402-F-08-004.
 * 2. Association of Home Appliance Manufacturers (AHAM): "Method for Measuring Performance of Portable Household Electric Cord-Connected Room Air Cleaners (ANSI/AHAM AC-1)".
 * 3. CPCB India: "Guidelines on In-Home Air Management During Severe Episodes", 2014.
 */

import type { HouseholdProfile, RecommendationAction } from "../types";
import type { NormalizedTelemetry } from "@/lib/telemetry/types";

export function evaluateAirFiltrationRule(
  profile: HouseholdProfile,
  telemetry: NormalizedTelemetry
): RecommendationAction | null {
  const pm25Value = telemetry.pollutants.find((p) => p.code === "pm2_5")?.value ?? null;
  const isElevated = pm25Value !== null && pm25Value > 60;
  const isSevere = pm25Value !== null && pm25Value > 120;

  // Case 1: Household owns a HEPA air purifier
  if (profile.filtration === "hepa_purifier") {
    const priority = isSevere ? "urgent" : isElevated ? "high" : "moderate";
    return {
      id: "filtration-hepa-bedroom-prioritization",
      category: "indoor_air",
      priority,
      title: "Deploy HEPA Purifier in Primary Sleeping Quarters",
      actionText: "Operate your HEPA purifier on continuous medium/high mode in the primary bedroom with doors and windows closed 1 hour before sleep.",
      reason: `Sleeping occupants spend 7–9 continuous hours in a single room. Pre-cleaning and running filtration overnight reduces respiratory particulate deposition by 65–85% during critical nocturnal recovery hours.`,
      evidenceReferences: [
        "EPA Guide to Air Cleaners in the Home — Clean Air Delivery Rate (CADR) & Room Sizing Rules",
        "Sublett et al. (2010) — Air filters and air cleaners: Rostrum (J. Allergy Clin. Immunol.)",
      ],
      tradeOffs:
        "High fan speeds maximize particle capture CADR but generate acoustic white noise (45–55 dB) and draw 30–60 W of electrical power.",
      impactClassification: "exposure_reduction",
      limitations:
        "A single portable unit cannot effectively clean multi-room apartments simultaneously; focus CADR on occupied bedrooms rather than open living rooms.",
      sourceValidityTimestamp: telemetry.timestamp,
      applicableRuleId: "AERIS-RULE-FILTRATION-HEPA-01",
      explanation: {
        influencingFactors: [
          `Installed filtration: ${profile.filtration}`,
          `Ambient PM2.5: ${pm25Value ?? "N/A"} µg/m³`,
          `Budget tier: ${profile.budgetPreference}`,
        ],
        ruleTriggered: "AERIS-RULE-FILTRATION-HEPA-01",
        sourceAttribution: telemetry.source,
        dataTimestamp: telemetry.timestamp,
        assumptions: ["Purifier has an unexpired true HEPA filter and appropriate CADR for room square footage."],
        uncertainties: ["Infiltration around door undercuts reduces effective steady-state particulate reduction."],
      },
    };
  }

  // Case 2: Household has HVAC filter or central filtration
  if (profile.filtration === "hvac_filter") {
    return {
      id: "filtration-hvac-fan-continuous",
      category: "indoor_air",
      priority: isElevated ? "high" : "low",
      title: "Switch HVAC Thermostat from 'Auto' to 'On'",
      actionText: "Set your central HVAC fan mode to 'On' rather than 'Auto' to ensure continuous recirculation through the central MERV/HEPA filter media.",
      reason: "Setting central fan mode to continuous recirculation ensures steady air movement across filtration media even when temperature heating/cooling cycles pause.",
      evidenceReferences: [
        "ASHRAE Epidemic Task Force: Filtration & Disinfection Guidelines for Residential Buildings (2021)",
      ],
      tradeOffs: "Increases continuous electricity consumption by 50–150 kWh/month depending on blower motor efficiency.",
      impactClassification: "exposure_reduction",
      limitations: "Standard MERV < 8 furnace filters capture coarse dust but have low single-pass efficiency for fine PM2.5.",
      sourceValidityTimestamp: telemetry.timestamp,
      applicableRuleId: "AERIS-RULE-FILTRATION-HVAC-02",
      explanation: {
        influencingFactors: [
          `Installed filtration: ${profile.filtration}`,
          `Ambient PM2.5: ${pm25Value ?? "N/A"} µg/m³`,
        ],
        ruleTriggered: "AERIS-RULE-FILTRATION-HVAC-02",
        sourceAttribution: telemetry.source,
        dataTimestamp: telemetry.timestamp,
        assumptions: ["Central HVAC system has clean, sealed ductwork without unconditioned attic leaks."],
        uncertainties: ["Filter efficiency depends on MERV rating of currently installed filter."],
      },
    };
  }

  // Case 3: No mechanical filtration hardware (Zero-cost physical containment)
  const priority = isSevere ? "high" : "moderate";
  return {
    id: "filtration-zero-cost-dust-containment",
    category: "indoor_air",
    priority,
    title: "Zero-Cost Indoor Dust Suppression & Micro-Zone Protocol",
    actionText: "Use damp-cloth wiping and wet-mopping (avoid dry sweeping), place rolled damp towels along exterior door bases, and designate one interior room as a clean micro-zone.",
    reason: `In the absence of mechanical filtration during elevated ambient PM2.5 (${pm25Value ?? "elevated"} µg/m³), dry dusting and sweeping resuspend settled particles into breathing zones. Damp wiping captures particles physically without new spending.`,
    evidenceReferences: [
      "CPCB In-Home Air Management Protocol (2014) — Non-Mechanical Clean Zone Creation",
      "EPA Indoor Air Quality: Source Control & Physical Cleaning Interventions",
    ],
    tradeOffs: "Requires manual daily labor; damp surfaces must dry properly to prevent localized mold spore germination.",
    impactClassification: "exposure_reduction",
    limitations: "Physical damp mopping captures settled coarse and fine dust, but cannot filter suspended aerosolized PM2.5 from indoor air.",
    sourceValidityTimestamp: telemetry.timestamp,
    applicableRuleId: "AERIS-RULE-FILTRATION-ZERO-COST-03",
    explanation: {
      influencingFactors: [
        `Installed filtration: ${profile.filtration} (None declared)`,
        `Budget preference: ${profile.budgetPreference} (Prioritizing zero-cost interventions)`,
        `Ambient PM2.5: ${pm25Value ?? "N/A"} µg/m³`,
      ],
      ruleTriggered: "AERIS-RULE-FILTRATION-ZERO-COST-03",
      sourceAttribution: telemetry.source,
      dataTimestamp: telemetry.timestamp,
      assumptions: ["Household has access to basic household water and microfiber or cotton cleaning towels."],
      uncertainties: ["Rate of resuspension depends on flooring type (tile/hardwood vs carpet)."],
    },
  };
}
