/**
 * AERIS Indoor Air Quality — Deterministic Guidance Rules Engine
 * Implements authoritative EPA (Indoor Air in Homes), ASHRAE 62.2, CDC Extreme Heat, and WHO Indoor Air Guidelines.
 * Strictly separates outdoor modeled context, user reports, and optional physical sensor readings.
 */

import type { NormalizedTelemetry } from "@/lib/telemetry/types";
import type {
  UserReportedIndoorConditions,
  OptionalIndoorSensors,
  PurifierAdvisorResult,
  IndoorGuidanceAction,
  IndoorAirPlan,
} from "./types";

/**
 * Evaluates window and ventilation guidance based on outdoor AQI, heat stress, and indoor state.
 */
export function evaluateWindowAndVentilation(
  telemetry: NormalizedTelemetry,
  userState: UserReportedIndoorConditions,
  sensors: OptionalIndoorSensors | null
): IndoorGuidanceAction {
  const pm25 = telemetry.pollutants.find((p) => p.code === "pm2_5")?.value ?? null;
  const tempC = telemetry.weather.temperatureC;

  // Relative dispersion window: outdoor particulate concentrations are comparatively lower,
  // acknowledging that WHO air quality guidelines indicate no zero-risk particulate threshold.
  const isOutdoorRelativelyFavorable = pm25 !== null && pm25 <= 35;
  const isOutdoorPolluted = pm25 !== null && pm25 > 60;

  const hasUnventedCombustion =
    userState.combustionSources.includes("cooking_unvented") ||
    userState.combustionSources.includes("gas_stove");

  const isHeatStressRisk =
    userState.thermalComfort === "too_hot" && !userState.hasAirConditionerRunning;

  // Metabolic CO2 is an indicator of ventilation adequacy (ASHRAE 62.1), not an acute chemical toxic hazard
  const isElevatedCo2Indicator =
    sensors?.co2Ppm !== null && sensors?.co2Ppm !== undefined && sensors.co2Ppm > 1100;
  const isStuffy = userState.perceivedStuffiness === "stuffy_drowsy" || isElevatedCo2Indicator;

  // PRIORITY 1: Heat Stress Life-Safety Override
  // Never advise sealing a residence if indoor heat poses acute hyperthermia risk.
  if (isHeatStressRisk && isOutdoorPolluted) {
    const isExtremeHeat = tempC >= 35;
    return {
      id: "indoor-action-thermal-safety-override",
      category: "thermal_safety",
      priority: "urgent",
      costTier: "zero_cost",
      title: "Heat Stress Safety Override: Controlled Ventilation & Cooling",
      actionText: isExtremeHeat
        ? "Thermal safety takes absolute priority over particulate sealing. CAUTION: At high ambient temperatures (approaching or exceeding ~35°C / 95°F), electric fans alone provide diminishing cooling and may accelerate dehydration if sweat cannot evaporate adequately in extreme or dry heat. In severe heat without air conditioning, combine fan airflow with skin wetting (sponging or misting), drink water continuously, take cool showers or baths, draw curtains against direct solar radiation, and relocate vulnerable individuals (infants, elderly) to cooled or air-conditioned spaces."
        : "Thermal safety takes priority over particulate sealing. Open windows slightly on the shaded or leeward side of the residence to allow convective airflow, draw curtains against direct solar radiation, and maintain hydration. Do not seal windows if indoor temperatures are rising toward hazardous levels.",
      whyItMatters:
        "Severe indoor heat stress causes acute cardiovascular strain, dehydration, and hyperthermia. CDC and EPA indoor safety protocols establish that thermal safety must never be compromised to prevent ambient particle infiltration. However, fan effectiveness drops sharply when temperatures approach or exceed skin temperature (~35°C / 95°F).",
      evidenceReferences: [
        "CDC & EPA Indoor Heat Safety Guidelines (2023) — Extreme Heat & Air Quality Compounding Risks",
        "WHO Extreme Heat Guidance — Clinical Heat Illness Prevention & Fan Limitations (2021)",
        "ASHRAE Standard 55 — Thermal Environmental Conditions for Human Occupancy",
      ],
      tradeOffs:
        "Allows a modest degree of outdoor particulate ingress (infiltration variable) to prevent acute heat illness. Relocate vulnerable members to cooled environments.",
      uncertaintyNotice:
        "Indoor temperatures vary significantly by floor level, direct solar gain, and roof insulation.",
      assumptions: [
        "Residence currently lacks working mechanical air conditioning or heat pump cooling.",
        "Occupants are experiencing discomfort from excessive indoor temperature.",
      ],
    };
  }

  // PRIORITY 2: Unvented Gas Cooking / Acute Indoor Combustion
  if (hasUnventedCombustion) {
    return {
      id: "indoor-action-combustion-dilution",
      category: "ventilation",
      priority: "urgent",
      costTier: "zero_cost",
      title: "Ventilate Kitchen Directly Outdoors; Isolate Living Areas",
      actionText:
        "Turn on the kitchen exhaust fan immediately or open the kitchen exterior window while keeping interior doors between the kitchen and living/sleeping rooms firmly closed. Cook with pots covered and prioritize rear burners under the exhaust hood. LIFE-SAFETY & APPLIANCE NOTICES: 1) URGENT GAS & CO EMERGENCY: If you smell gas (sulfur/mercaptan), hear hissing, or experience acute headaches, nausea, or dizziness, leave the building immediately, do not operate electrical switches, and call emergency services (112 in India / 911 in US) from outside. 2) APPLIANCE INSPECTION: If stove burner flames are persistently yellow or orange rather than steady blue, or leave soot on cookware, incomplete combustion is occurring; arrange professional inspection and servicing by a qualified gas technician. 3) FILTRATION LIMIT: Mechanical particle filters (HEPA) DO NOT remove carbon monoxide (CO), nitrogen dioxide (NO2), or combustible gases.",
      whyItMatters:
        "Unvented gas combustion and high-heat frying emit nitrogen dioxide (NO2), carbon monoxide (CO), and ultrafine particulates (PM0.1) directly into indoor air. Mechanical particle purifiers do not remove carbon monoxide or combustion gases; exterior-ducted exhaust is essential.",
      evidenceReferences: [
        "Lawrence Berkeley National Laboratory (LBNL) — Range Hood Capture Efficiency & Indoor NO2 Hazards",
        "WHO Guidelines for Indoor Air Quality: Selected Pollutants (2010) — Nitrogen Dioxide & Carbon Monoxide",
        "EPA Guide to Air Cleaners in the Home (2023) — Combustion Gaseous Pollutant Limitations",
      ],
      tradeOffs:
        "Exhausting kitchen air creates minor negative room pressure, but prevents toxic combustion byproducts from permeating sleeping quarters.",
      uncertaintyNotice:
        "Actual pollutant capture depends on range hood ducting, airflow rate, and interior door clearance.",
      assumptions: [
        "Kitchen can be physically partitioned from living and sleeping quarters.",
        "Exhaust fan or window vents directly to the exterior.",
      ],
    };
  }

  // CASE 3: Favorable Outdoor Relative Dispersion Window -> Natural Dilution
  if (isOutdoorRelativelyFavorable) {
    return {
      id: "indoor-action-clean-flushing",
      category: "ventilation",
      priority: "low",
      costTier: "zero_cost",
      title: "Natural Air Exchange & Room Flushing Window",
      actionText:
        "When outdoor ambient particulate concentrations are relatively low, brief cross-ventilation (typically 5 to 15 minutes, depending on wind speed and draft strength) helps dilute metabolic CO2 and dissipates indoor moisture. Monitor outdoor conditions and reseal windows if outdoor smoke, dust, or traffic odors become noticeable.",
      whyItMatters:
        `Ambient outdoor PM2.5 is relatively lower (${pm25} µg/m³), presenting a favorable window to exchange stagnant indoor air. Natural cross-ventilation dilutes occupant CO2 and VOCs, but also introduces ambient outdoor allergens, humidity, and fine particles.`,
      evidenceReferences: [
        "ASHRAE Standard 62.2 (2022) — Ventilation and Acceptable Indoor Air Quality in Residential Buildings",
        "EPA Indoor Air Quality in Homes — Ventilation Dynamics and Moisture Control",
      ],
      tradeOffs:
        "Introduces outdoor pollen, allergens, and ambient temperature; adjust heating or cooling settings as needed.",
      uncertaintyNotice:
        "Air exchange speed depends heavily on cross-draft velocity, building orientation, and temperature gradients.",
      assumptions: [
        "No hyper-local ground-level combustion sources (e.g. open waste burning, idling diesel engines) exist nearby.",
      ],
    };
  }

  // CASE 4: Outdoor is Polluted & Indoor is Stuffy / Elevated CO2 Indicator
  if (isOutdoorPolluted && isStuffy) {
    return {
      id: "indoor-action-micro-ventilation-burst",
      category: "ventilation",
      priority: "high",
      costTier: "zero_cost",
      title: "Controlled Brief Micro-Ventilation Draft",
      actionText:
        "Cracking a sheltered window 1–2 inches for a brief 3–5 minute period during midday dispersion (typically early afternoon) helps alleviate severe stuffiness and CO2 accumulation. Reseal promptly and operate particle air filtration if available to reduce incoming outdoor particles.",
      whyItMatters:
        "In tightly occupied, sealed rooms, metabolic CO2 accumulates and serves as an indicator of ventilation inadequacy, causing drowsiness and cognitive fatigue. Brief controlled drafts provide fresh air exchange with a manageable outdoor particle penalty.",
      evidenceReferences: [
        "ASHRAE Standard 62.1 — Ventilation for Acceptable Indoor Air Quality (CO2 as Ventilation Indicator)",
        "Allen et al. (Harvard T.H. Chan School of Public Health, 2016) — Cognitive Function and Indoor Air Dynamics",
      ],
      tradeOffs:
        "Allows a temporary pulse of outdoor particulates indoors that requires mechanical filtration or surface settling to clear.",
      uncertaintyNotice:
        "CO2 dissipation speed varies with indoor volume, occupant density, and exterior wind pressure.",
      assumptions: [
        "Room is occupied and has been sealed for multiple consecutive hours.",
      ],
    };
  }

  // CASE 5: Outdoor is Polluted & Indoor is Normal -> Sealed Envelope Strategy
  return {
    id: "indoor-action-seal-exterior-envelope",
    category: "ventilation",
    priority: "high",
    costTier: "zero_cost",
    title: "Maintain Sealed Building Envelope & Mitigate Infiltration",
    actionText:
      "Keep exterior windows and balcony doors firmly closed. Use window coverings to shield against drafts. Applying draft stoppers or rolled towels along bottom door thresholds reduces passive outdoor particle ingress.",
    whyItMatters:
      `Outdoor PM2.5 is elevated (${pm25 ?? "elevated"} µg/m³). In closed residences without active filtration, passive infiltration allows 30% to 80%+ of outdoor fine particulates to enter through perimeter gaps over several hours. Sealing cracks significantly lowers the infiltration rate.`,
    evidenceReferences: [
      "EPA Indoor Air Filtration & Wildfire Guidance (2023) — Creating a Clean Room",
      "NIST Technical Note 1887 — Measurement and Simulation of Building Envelope Air Tightness",
    ],
    tradeOffs:
      "Reduces fresh outdoor air supply; monitor for stuffiness or metabolic CO2 accumulation over extended occupancy.",
    uncertaintyNotice:
      "Building envelope tightness varies significantly between newer sealed constructions and older masonry structures.",
    assumptions: [
      "No active unvented combustion is occurring indoors simultaneously.",
    ],
  };
}

/**
 * Evaluates indoor source reduction actions (cooking, incense, dusting).
 */
export function evaluateSourceReduction(
  userState: UserReportedIndoorConditions
): IndoorGuidanceAction[] {
  const actions: IndoorGuidanceAction[] = [];

  // Incense & Candles Source Control
  if (userState.combustionSources.includes("incense_candles")) {
    actions.push({
      id: "indoor-action-eliminate-incense",
      category: "source_reduction",
      priority: "high",
      costTier: "zero_cost",
      title: "Substitute Burning Incense & Candles with Flameless Alternatives",
      actionText:
        "Extinguish burning incense sticks (agarbatti) and scented candles. Substitute with flameless LED candles or essential oil diffusers that do not involve thermal combustion.",
      whyItMatters:
        "A single incense stick emits 40–150 mg of fine and ultrafine particulate matter per hour, alongside benzene, toluene, and formaldehyde. EPA IAQ guidelines identify eliminating indoor combustion sources as the single most cost-effective clean-air intervention.",
      evidenceReferences: [
        "EPA Indoor Air Quality in Homes: Source Control (2023)",
        "Lin et al. (Science of the Total Environment, 2008) — Chemical Characteristics of Incense Smoke Particles",
      ],
      tradeOffs:
        "Zero equipment cost; completely removes a major indoor primary source of combustion particles.",
      uncertaintyNotice:
        "Fragrance oils from diffusers may still emit terpenes, but avoid carbonaceous combustion particles.",
      assumptions: ["Occupant is willing to adopt flameless spiritual or aromatic alternatives."],
    });
  }

  // Dusting & Cleaning Protocol
  if (userState.dustActivities.includes("sweeping")) {
    actions.push({
      id: "indoor-action-wet-cleaning-protocol",
      category: "source_reduction",
      priority: "moderate",
      costTier: "zero_cost",
      title: "Transition from Dry Sweeping to Damp Mopping",
      actionText:
        "Do not use dry brooms or feather dusters, which resuspend settled coarse particles into the breathing zone. Use a damp microfiber mop or cloth to capture dust and allergens effectively.",
      whyItMatters:
        "Dry sweeping resuspends coarse dust (PM10) and biological allergens into the air, keeping them airborne for hours. Wet wiping binds particles to cleaning cloths, permanently removing them from indoor surfaces.",
      evidenceReferences: [
        "EPA Indoor airPLUS: Construction and Cleaning Practices (2020)",
        "ASHRAE Indoor Air Quality Guide — Best Practices for Cleaning and Maintenance",
      ],
      tradeOffs:
        "Requires slightly more preparation and water; does not require specialized chemical agents.",
      uncertaintyNotice:
        "Resuspension rates vary with floor material (hard tile vs. carpet) and foot traffic.",
      assumptions: ["Hard-surface flooring (tile, wood, laminate) is present in common areas."],
    });
  }

  return actions;
}

/**
 * Evaluates filtration and clean room creation actions.
 */
export function evaluateFiltrationActions(
  purifierResult: PurifierAdvisorResult,
  userState?: UserReportedIndoorConditions
): IndoorGuidanceAction[] {
  const actions: IndoorGuidanceAction[] = [];
  const placementNote = userState?.roomType === "bedroom"
    ? " For sleeping areas, position the unit 1–2 meters from the head of the bed to maintain a clean breathing zone without direct cold drafts."
    : " Position the unit centrally away from walls and curtains to optimize convective air distribution.";

  // Low-Cost Weatherstripping Action
  actions.push({
    id: "indoor-action-perimeter-weatherstripping",
    category: "filtration",
    priority: "moderate",
    costTier: "low_cost",
    title: "Apply Self-Adhesive Foam/Silicone Weatherstripping",
    actionText:
      "Install low-cost silicone or foam weatherstripping tape along window frame perimeters and door jambs. Use a bottom door sweep to eliminate gaps beneath primary entry doors.",
    whyItMatters:
      "Perimeter gaps are the primary pathways for passive infiltration. Studies by NIST demonstrate that weatherstripping residential frames reduces outdoor particulate infiltration by 25–40% at modest material cost.",
    evidenceReferences: [
      "NIST Technical Note 1887 — Measurement and Simulation of Building Envelope Air Tightness",
      "EPA Wildfire Indoor Air Filtration: DIY Sealing Protocols (2023)",
    ],
    tradeOffs:
      "Requires one-time manual installation; semi-permanent and easily removable in rental units.",
    uncertaintyNotice:
      "Effectiveness depends on frame squareness and surface adhesion quality.",
    assumptions: ["Windows and doors have reachable perimeter frames."],
  });

  // Purifier Deployment Action
  if (purifierResult.isNewPurifierPurchaseRecommended) {
    actions.push({
      id: "indoor-action-purifier-sizing-deployment",
      category: "filtration",
      priority: "high",
      costTier: "equipment",
      title: `Deploy HEPA Purifier Sized for ~${purifierResult.recommendedCadrM3h} m³/h CADR`,
      actionText: `Select a mechanical True HEPA air purifier certified for at least ${purifierResult.recommendedCadrM3h} m³/h CADR (${purifierResult.recommendedCadrCfm} CFM). Note that standard CADR ratings apply to maximum fan speed; lower or sleep modes deliver unverified and significantly reduced clean air delivery unless speed-specific manufacturer test data is provided.${placementNote} IMPORTANT: HEPA filters particulate matter, but does NOT remove carbon monoxide (CO), nitrogen dioxide, or chemical VOCs without dedicated activated carbon adsorbents.`,
      whyItMatters:
        `To achieve the engineering sizing benchmark of ~5.0 air changes per hour (ACH) in this ${purifierResult.roomVolumeCuM} m³ room volume, the purifier must deliver clean air continuously. True HEPA filters capture at least 99.97% of particles down to 0.3 microns on a single pass.`,
      evidenceReferences: [
        "AHAM AC-1 (2020) — Method for Measuring Performance of Portable Household Electric Room Air Cleaners",
        "EPA Guide to Air Cleaners in the Home (2023) — Sizing, Placement & Gaseous Limitations",
      ],
      tradeOffs:
        `Equipment purchase cost plus annual operating cost (~${purifierResult.operatingCost.currency} ${purifierResult.operatingCost.totalAnnualCost}/yr). Provides mechanical particle reduction.`,
      uncertaintyNotice:
        "Real-world filtration speed decreases if doors remain open to unpurified adjacent corridors or if operating on quiet low-speed modes.",
      assumptions: [
        "Occupant has dedicated electrical outlet and floor space in the target room.",
      ],
    });
  } else if (purifierResult.existingPurifierEvaluation.status === "adequate") {
    actions.push({
      id: "indoor-action-purifier-speed-optimization",
      category: "filtration",
      priority: "moderate",
      costTier: "zero_cost",
      title: "Optimize Existing Purifier Fan Speeds & Pre-Sleep Cleaning",
      actionText:
        "Run your existing air purifier on high speed for 30–60 minutes before occupying the room to rapid-clean the air volume, then switch to a quieter medium mode for maintenance. Note that operating on low sleep modes significantly reduces effective CADR.",
      whyItMatters:
        "High fan speeds maximize clean air delivery rate (CADR) and accelerate particulate clearance during initial turn-on. Once background particulate counts stabilize, medium speeds maintain lower concentrations with reduced acoustic noise.",
      evidenceReferences: [
        "EPA Indoor Air Filtration & Clean Rooms Guidance (2023)",
        "ASHRAE Epidemic Task Force: Residential Air Cleaners Guidance (2021)",
      ],
      tradeOffs:
        "Higher fan speed creates temporary acoustic noise (~50–55 dB) during the pre-cleaning phase; no additional equipment purchase required.",
      uncertaintyNotice:
        "Filtration efficiency declines over time if pre-filters are clogged with pet hair or coarse lint.",
      assumptions: ["Existing purifier has multi-speed fan control."],
    });
  }

  return actions;
}

/**
 * Master Guidance Plan Generator: Synthesizes outdoor telemetry, user conditions, and purifier advisor.
 */
export function generateIndoorAirPlan(
  telemetry: NormalizedTelemetry,
  userState: UserReportedIndoorConditions,
  sensors: OptionalIndoorSensors | null,
  purifierResult: PurifierAdvisorResult
): IndoorAirPlan {
  const windowAction = evaluateWindowAndVentilation(telemetry, userState, sensors);
  const sourceActions = evaluateSourceReduction(userState);
  const filtrationActions = evaluateFiltrationActions(purifierResult, userState);

  const allActions: IndoorGuidanceAction[] = [
    windowAction,
    ...sourceActions,
    ...filtrationActions,
  ];

  // Prioritize urgent and zero-cost actions
  const priorityOrder: Record<string, number> = {
    urgent: 0,
    high: 1,
    moderate: 2,
    low: 3,
  };

  const rankedActions = allActions.sort(
    (a, b) => (priorityOrder[a.priority] ?? 2) - (priorityOrder[b.priority] ?? 2)
  );

  const hasSensors = sensors && sensors.pm25Value !== null;
  const measurementStatus = hasSensors ? "measured" : "unmeasured_modeled";

  const pm25 = telemetry.pollutants.find((p) => p.code === "pm2_5")?.value ?? null;
  const aqiCat = telemetry.aqi.cpcbAqi.category ?? "Moderate";

  let summary = "";
  if (hasSensors) {
    summary = `Indoor physical sensor reports ${sensors.pm25Value} µg/m³ PM2.5 while ambient outdoor air is ${pm25 ?? "N/A"} µg/m³ (${aqiCat}). Guidance prioritizes targeted source elimination and localized clean room containment.`;
  } else {
    summary = `Ambient outdoor air is ${pm25 ?? "N/A"} µg/m³ (${aqiCat}). Indoor PM2.5 is not measured. Guidance applies conservative building science principles emphasizing source elimination, window sealing, and properly sized mechanical filtration.`;
  }

  return {
    outdoorContext: {
      aqiValue: telemetry.aqi.cpcbAqi.value,
      aqiCategory: telemetry.aqi.cpcbAqi.category,
      pm25Value: pm25,
      temperatureC: telemetry.weather.temperatureC,
      humidityPercent: telemetry.weather.relativeHumidityPercent,
      windSpeedKmH: telemetry.weather.windSpeedKmH,
      dataTimestamp: telemetry.timestamp,
      dataKind: telemetry.dataKind,
    },
    indoorMeasurementStatus: measurementStatus,
    measuredSensors: sensors,
    userConditions: userState,
    actions: rankedActions,
    purifierAdvisor: purifierResult,
    summary,
  };
}
