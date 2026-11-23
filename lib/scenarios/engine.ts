/**
 * AERIS What-If Scenario Simulator — Pure Deterministic Engine
 * Implements authoritative forecast comparisons, decision receipts, and low-emission alternatives.
 * Strictly adheres to AERIS Rule 10 (no silent simulation) and Rule 12 (no invented medical claims or personal dose reductions).
 */

import type { NormalizedTelemetry, HourlyForecastPoint } from "@/lib/telemetry/types";
import type { HouseholdProfile } from "@/lib/decision-engine/types";
import type {
  ScenarioComparisonResult,
  ScenarioState,
  EnvironmentalDelta,
  DecisionReceipt,
  LowEmissionAlternative,
} from "./types";
import type {
  OutdoorTimingInput,
  IndoorVsOutdoorInput,
  CommuteModeInput,
  FiltrationHypotheticalInput,
} from "./schemas";

/**
 * Resolves a forecast point by its ISO time string from normalized telemetry.
 */
export function findForecastPointByTime(
  telemetry: NormalizedTelemetry,
  targetTimeIso: string
): HourlyForecastPoint | null {
  if (!telemetry.hourlyForecast || telemetry.hourlyForecast.length === 0) {
    return null;
  }

  // Exact match first
  const exact = telemetry.hourlyForecast.find((p) => p.time === targetTimeIso);
  if (exact) return exact;

  // Prefix match (hour-level YYYY-MM-DDTHH)
  const targetHour = targetTimeIso.slice(0, 13);
  const hourMatch = telemetry.hourlyForecast.find((p) => p.time.startsWith(targetHour));
  return hourMatch ?? null;
}

/**
 * Maps US EPA AQI index value to its qualitative category.
 */
function getAqiCategory(aqiValue: number | null): string {
  if (aqiValue === null) return "Unavailable";
  if (aqiValue <= 50) return "Good";
  if (aqiValue <= 100) return "Moderate";
  if (aqiValue <= 150) return "Unhealthy for Sensitive Groups";
  if (aqiValue <= 200) return "Unhealthy";
  if (aqiValue <= 300) return "Very Unhealthy";
  return "Hazardous";
}

/**
 * Compares outdoor ambient conditions across two forecasted hours.
 */
export function compareOutdoorTiming(
  telemetry: NormalizedTelemetry,
  input: OutdoorTimingInput,
  profile: HouseholdProfile | null
): ScenarioComparisonResult {
  const baselinePoint = findForecastPointByTime(telemetry, input.baselineHourIso);
  const altPoint = findForecastPointByTime(telemetry, input.alternativeHourIso);

  const baselineTimeFormatted = baselinePoint ? new Date(baselinePoint.time).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : input.baselineHourIso;
  const altTimeFormatted = altPoint ? new Date(altPoint.time).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : input.alternativeHourIso;

  const baselineState: ScenarioState = {
    label: `Baseline Schedule (${baselineTimeFormatted})`,
    description: `Forecasted outdoor ambient conditions for scheduled ${input.activityType} at ${baselineTimeFormatted}.`,
    forecastTime: baselinePoint?.time,
    forecastedPm25: baselinePoint?.pm2_5 ?? null,
    forecastedAqi: baselinePoint?.usAqi ?? null,
    forecastedAqiCategory: getAqiCategory(baselinePoint?.usAqi ?? null),
    temperatureC: baselinePoint?.temperatureC ?? null,
    isHypotheticalSimulated: false,
    contextNotes: [
      baselinePoint
        ? `Atmospheric model forecast: ${baselinePoint.pm2_5 !== null ? `${baselinePoint.pm2_5} µg/m³ PM2.5` : "Data unavailable"}.`
        : "Forecast data unavailable for this hour.",
      "Reflects regional ambient chemical transport forecasts, not micro-environmental or kerbside measurements.",
    ],
  };

  const altState: ScenarioState = {
    label: `Alternative Schedule (${altTimeFormatted})`,
    description: `Forecasted outdoor ambient conditions if shifted to ${altTimeFormatted}.`,
    forecastTime: altPoint?.time,
    forecastedPm25: altPoint?.pm2_5 ?? null,
    forecastedAqi: altPoint?.usAqi ?? null,
    forecastedAqiCategory: getAqiCategory(altPoint?.usAqi ?? null),
    temperatureC: altPoint?.temperatureC ?? null,
    isHypotheticalSimulated: false,
    contextNotes: [
      altPoint
        ? `Atmospheric model forecast: ${altPoint.pm2_5 !== null ? `${altPoint.pm2_5} µg/m³ PM2.5` : "Data unavailable"}.`
        : "Forecast data unavailable for this hour.",
      "Reflects regional ambient chemical transport forecasts, not micro-environmental or kerbside measurements.",
    ],
  };

  let pm25Diff: number | null = null;
  let qualitativeAssessment: EnvironmentalDelta["qualitativeAssessment"] = "unknown";
  let summaryText = "Forecast data unavailable for comparison.";

  if (baselinePoint?.pm2_5 !== null && baselinePoint?.pm2_5 !== undefined && altPoint?.pm2_5 !== null && altPoint?.pm2_5 !== undefined) {
    pm25Diff = Math.round((altPoint.pm2_5 - baselinePoint.pm2_5) * 10) / 10;
    if (pm25Diff <= -15) {
      qualitativeAssessment = "substantially_better";
      summaryText = `Shifting activity to ${altTimeFormatted} aligns with a forecasted window of lower ambient fine particulate concentration (${Math.abs(pm25Diff)} µg/m³ lower).`;
    } else if (pm25Diff >= 15) {
      qualitativeAssessment = "worse";
      summaryText = `The alternative schedule at ${altTimeFormatted} coincides with higher forecasted ambient PM2.5 (+${pm25Diff} µg/m³ higher than baseline).`;
    } else {
      qualitativeAssessment = "comparable";
      summaryText = `Forecasted ambient fine particulate levels at both hours are comparable (difference within ±15 µg/m³).`;
    }
  }

  const receipt: DecisionReceipt = {
    receiptId: `rcpt-timing-${Date.now().toString(36)}`,
    generatedAt: new Date().toISOString(),
    locationName: telemetry.location.name,
    dataSource: telemetry.source,
    forecastFreshness: telemetry.freshnessExplanation,
    scenarioType: "outdoor_timing",
    baselineLabel: baselineState.label,
    alternativeLabel: altState.label,
    applicableRuleId: "aeris-rule-outdoor-exercise",
    ruleTitle: "Adaptive Outdoor Schedule & Dispersion Window Alignment",
    primaryFinding: summaryText,
    tradeOffs:
      "Rescheduling outdoor exertion requires shifting household or work routines. Ambient temperature and thermal comfort must also be checked.",
    assumptions: [
      "User exerts similar physical intensity across both time periods.",
      "Regional ambient forecast trajectory represents the overall city domain.",
      ...(profile?.declaredSensitivity ? [`Household profile considers declared sensitivity: ${profile.declaredSensitivity}.`] : []),
    ],
    scientificNotice:
      "Forecast comparison reflects ambient regional chemical transport modeling. It does not measure personal respiratory dose, lung deposition, or guarantee clinical outcomes.",
  };

  const lowEmissionAlternative: LowEmissionAlternative = {
    title: "Diurnal Dispersion Coordination",
    description:
      "Aligning physical recreation with mid-day or early-afternoon thermal dispersion reduces inhalation of trapped nocturnal inversion emissions.",
    emissionCategory: "zero_emission",
    actionText:
      "Avoid heavy cardiovascular exercise during winter dawn thermal inversion hours (06:00–08:30) when ground-level vehicular exhaust and biomass smoke are concentrated near the surface.",
    sustainabilityBenefit:
      "Encourages active mobility during clean atmospheric windows without adding motorized trip demand.",
  };

  return {
    scenarioType: "outdoor_timing",
    baseline: baselineState,
    alternative: altState,
    delta: {
      pm25Difference: pm25Diff,
      pm25Unit: "µg/m³",
      qualitativeAssessment,
      summaryText,
    },
    receipt,
    lowEmissionAlternative,
    disclaimer:
      "Comparison is based on validated hourly atmospheric forecasts. It does not promise medical risk elimination or measure personal intake.",
  };
}

/**
 * Compares outdoor activity with indoor alternatives under passive or filtered environments.
 */
export function compareIndoorVsOutdoor(
  telemetry: NormalizedTelemetry,
  input: IndoorVsOutdoorInput,
  profile: HouseholdProfile | null
): ScenarioComparisonResult {
  const point = findForecastPointByTime(telemetry, input.forecastHourIso);
  const timeFormatted = point ? new Date(point.time).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : input.forecastHourIso;

  const outdoorPm25 = point?.pm2_5 ?? null;
  const outdoorAqi = point?.usAqi ?? null;

  const baselineState: ScenarioState = {
    label: `Outdoor Activity (${timeFormatted})`,
    description: `Full exposure to forecasted ambient atmospheric conditions at ${timeFormatted}.`,
    forecastTime: point?.time,
    forecastedPm25: outdoorPm25,
    forecastedAqi: outdoorAqi,
    forecastedAqiCategory: getAqiCategory(outdoorAqi),
    temperatureC: point?.temperatureC ?? null,
    isHypotheticalSimulated: false,
    contextNotes: [
      `Forecasted ambient PM2.5: ${outdoorPm25 !== null ? `${outdoorPm25} µg/m³` : "Data unavailable"}.`,
      "Outdoor cardiovascular exercise increases respiratory minute ventilation (volume of air inhaled per minute) by 3x to 5x.",
    ],
  };

  const altState: ScenarioState = {
    label: input.indoorFiltrationActive ? "Indoor Activity (Filtered Air)" : "Indoor Activity (Passive Envelope)",
    description: input.indoorFiltrationActive
      ? "Activity moved indoors into a sealed room operating certified mechanical HEPA filtration."
      : "Activity moved indoors into a closed residential room without dedicated active filtration.",
    forecastTime: point?.time,
    forecastedPm25: null, // Strictly null per Rule 10: unmeasured indoor space is not given a fabricated number
    forecastedAqi: null,
    forecastedAqiCategory: "Indoor Microclimate (Unmeasured)",
    isHypotheticalSimulated: true,
    contextNotes: [
      "Per AERIS Rule 10, indoor PM2.5 is NOT assigned a fabricated sensor number.",
      input.indoorFiltrationActive
        ? "Hypothetical condition assumes certified mechanical HEPA filtration running in a sealed enclosure."
        : "Hypothetical condition assumes standard residential envelope with variable infiltration (typically 30%–80%+ per NIST/EPA literature).",
      "Indoor carbon dioxide (CO2) can accumulate if the room is tightly occupied without adequate ventilation.",
    ],
  };

  const qualitativeAssessment: EnvironmentalDelta["qualitativeAssessment"] =
    outdoorPm25 !== null && outdoorPm25 > 60 ? "substantially_better" : "comparable";

  const summaryText =
    outdoorPm25 !== null && outdoorPm25 > 60
      ? `Moving strenuous exertion indoors avoids direct exposure to elevated ambient particulate concentrations (${outdoorPm25} µg/m³ PM2.5). ${input.indoorFiltrationActive ? "Certified HEPA filtration further mitigates infiltrated outdoor particles." : "Ensure the room is sealed from exterior traffic corridors."}`
      : `Ambient particulate concentrations are in a relatively moderate range; shifting indoors provides protection against weather extremes or localized dust.`;

  const receipt: DecisionReceipt = {
    receiptId: `rcpt-indoor-${Date.now().toString(36)}`,
    generatedAt: new Date().toISOString(),
    locationName: telemetry.location.name,
    dataSource: telemetry.source,
    forecastFreshness: telemetry.freshnessExplanation,
    scenarioType: "indoor_vs_outdoor",
    baselineLabel: baselineState.label,
    alternativeLabel: altState.label,
    applicableRuleId: "aeris-rule-indoor-ventilation",
    ruleTitle: "Indoor Microclimate Protection & Exercise Location",
    primaryFinding: summaryText,
    tradeOffs:
      "Indoor exertion requires adequate floor space and temperature regulation. In tightly sealed spaces, metabolic CO2 will elevate over time.",
    assumptions: [
      "Indoor space is protected from active indoor combustion (e.g. unvented cooking, tobacco smoke, incense).",
      "Filtration assumption relies on properly maintained, undamaged HEPA filter media.",
      ...(profile?.filtration ? [`Household profile declared baseline filtration: ${profile.filtration}.`] : []),
    ],
    scientificNotice:
      "Indoor particulate levels vary widely with envelope airtightness, door traffic, and internal emission sources. No personalized exposure reduction percentage is guaranteed.",
  };

  const lowEmissionAlternative: LowEmissionAlternative = {
    title: "Local Home & Community Gym Substitution",
    description:
      "Transitioning from motorized transit to a distant fitness facility toward walking or bodyweight home routines minimizes transport emissions.",
    emissionCategory: "zero_emission",
    actionText:
      "On high ambient pollution days, substitute outdoor distance running with indoor yoga, calisthenics, or home resistance training instead of driving across town to a gym.",
    sustainabilityBenefit:
      "Eliminates tailpipe emissions from unnecessary vehicular trips while safeguarding cardiovascular health.",
  };

  return {
    scenarioType: "indoor_vs_outdoor",
    baseline: baselineState,
    alternative: altState,
    delta: {
      pm25Difference: null, // Not a fabricated number
      pm25Unit: "µg/m³",
      qualitativeAssessment,
      summaryText,
    },
    receipt,
    lowEmissionAlternative,
    disclaimer:
      "Indoor scenario is an illustrative hypothetical. AERIS does not manufacture indoor sensor readings without physical monitoring.",
  };
}

/**
 * Compares commute modes under forecasted ambient air quality.
 */
export function compareCommuteMode(
  telemetry: NormalizedTelemetry,
  input: CommuteModeInput,
  profile: HouseholdProfile | null
): ScenarioComparisonResult {
  const point = findForecastPointByTime(telemetry, input.forecastHourIso);
  const timeFormatted = point ? new Date(point.time).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : input.forecastHourIso;

  const modeDescriptions: Record<CommuteModeInput["baselineMode"], string> = {
    active_walking_biking: "Active Commute (Walking or Cycling)",
    open_two_wheeler_auto: "Open Motorized Transit (Two-Wheeler or Auto-Rickshaw)",
    closed_public_transit_metro: "Closed Public Transit (Electric Metro / Bus with AC)",
    private_car_ac: "Private Vehicle (Air-Conditioned Cabin with Cabin Air Filter)",
  };

  const outdoorPm25 = point?.pm2_5 ?? null;

  const baselineState: ScenarioState = {
    label: modeDescriptions[input.baselineMode],
    description: `Commute choice evaluated under ambient forecast of ${outdoorPm25 !== null ? `${outdoorPm25} µg/m³ PM2.5` : "ambient air"} at ${timeFormatted}.`,
    forecastTime: point?.time,
    forecastedPm25: outdoorPm25,
    forecastedAqi: point?.usAqi ?? null,
    forecastedAqiCategory: getAqiCategory(point?.usAqi ?? null),
    isHypotheticalSimulated: false,
    contextNotes: [
      `Mode: ${modeDescriptions[input.baselineMode]}.`,
      input.baselineMode === "active_walking_biking" || input.baselineMode === "open_two_wheeler_auto"
        ? "Direct kerbside exposure to vehicular tailpipe emissions, diesel exhaust, and resuspend road dust."
        : "Partial cabin barrier with HVAC recirculating air filtration.",
    ],
  };

  const altState: ScenarioState = {
    label: modeDescriptions[input.alternativeMode],
    description: `Alternative commute option evaluated under the same forecasted time window.`,
    forecastTime: point?.time,
    forecastedPm25: outdoorPm25,
    forecastedAqi: point?.usAqi ?? null,
    forecastedAqiCategory: getAqiCategory(point?.usAqi ?? null),
    isHypotheticalSimulated: true,
    contextNotes: [
      `Alternative Mode: ${modeDescriptions[input.alternativeMode]}.`,
      input.alternativeMode === "closed_public_transit_metro"
        ? "Electric metro rail isolates transit from ground-level roadway exhaust while maintaining high passenger throughput."
        : "Transit experience depends on cabin air filtration efficiency and route congestion.",
    ],
  };

  let qualitativeAssessment: EnvironmentalDelta["qualitativeAssessment"] = "comparable";
  let summaryText = "";

  if (
    (input.baselineMode === "active_walking_biking" || input.baselineMode === "open_two_wheeler_auto") &&
    (input.alternativeMode === "closed_public_transit_metro" || input.alternativeMode === "private_car_ac")
  ) {
    qualitativeAssessment = "substantially_better";
    summaryText = `Switching from open kerbside travel to enclosed transit (${modeDescriptions[input.alternativeMode]}) provides an exterior physical barrier against direct vehicle tailpipe exhaust, coarse tyre wear particles, and road dust.`;
  } else if (
    (input.baselineMode === "closed_public_transit_metro" || input.baselineMode === "private_car_ac") &&
    (input.alternativeMode === "active_walking_biking" || input.alternativeMode === "open_two_wheeler_auto")
  ) {
    qualitativeAssessment = "worse";
    summaryText = `Switching to open-air travel increases direct proximity to roadway emissions and tailpipe exhaust during high-pollution periods. A well-fitted particulate respirator (N95 / FFP2) is advised.`;
  } else {
    qualitativeAssessment = "comparable";
    summaryText = `Both commute choices feature similar micro-environmental exposure characteristics. Ensure cabin air recirculation or particulate filtration is maintained.`;
  }

  const receipt: DecisionReceipt = {
    receiptId: `rcpt-commute-${Date.now().toString(36)}`,
    generatedAt: new Date().toISOString(),
    locationName: telemetry.location.name,
    dataSource: telemetry.source,
    forecastFreshness: telemetry.freshnessExplanation,
    scenarioType: "commute_mode",
    baselineLabel: baselineState.label,
    alternativeLabel: altState.label,
    applicableRuleId: "aeris-rule-commute-protection",
    ruleTitle: "Commute Micro-Environment Exposure & Barrier Evaluation",
    primaryFinding: summaryText,
    tradeOffs:
      "Transit choice involves trade-offs between travel time, first/last-mile walking, financial cost, and carbon intensity.",
    assumptions: [
      "Cabin air filters in motorized vehicles are in clean, serviceable condition.",
      "Enclosed public transit systems operate operational air filtration and climate control.",
      ...(profile?.primaryCommute ? [`Household profile baseline commute: ${profile.primaryCommute}.`] : []),
    ],
    scientificNotice:
      "Comparison evaluates transit enclosure and barrier characteristics against ambient and roadway pollution. Individual inhaled dose depends on traffic congestion, route duration, and breathing rate.",
  };

  const lowEmissionAlternative: LowEmissionAlternative = {
    title: "Electric Metro & High-Efficiency Mass Transit",
    description:
      "Opting for electrified public mass transit (e.g. Delhi Metro) over private fossil-fuel automobiles achieves the optimal intersection of occupant protection and urban emission reduction.",
    emissionCategory: "mass_transit",
    actionText:
      "Choose electrified mass transit (Metro) for primary corridors. It carries zero tailpipe emissions per passenger-kilometer and operates in dedicated right-of-way free from ground-level vehicle exhaust queues.",
    sustainabilityBenefit:
      "Drastically reduces carbon footprint and urban NOx/PM2.5 emissions compared to single-occupancy gasoline or diesel driving.",
  };

  return {
    scenarioType: "commute_mode",
    baseline: baselineState,
    alternative: altState,
    delta: {
      pm25Difference: null,
      pm25Unit: "µg/m³",
      qualitativeAssessment,
      summaryText,
    },
    receipt,
    lowEmissionAlternative,
    disclaimer:
      "Commute evaluation characterizes physical barrier and transit modality differences. It does not calculate a medical exposure reduction figure.",
  };
}

/**
 * Compares hypothetical room filtration scenarios with explicit simulation labels.
 */
export function compareFiltrationHypothetical(
  telemetry: NormalizedTelemetry,
  input: FiltrationHypotheticalInput
): ScenarioComparisonResult {
  const outdoorPm25 = telemetry.pollutants.find((p) => p.code === "pm2_5")?.value ?? null;
  const achDelivered = Math.round((input.ratedCadrM3h / input.roomVolumeCuM) * 10) / 10;

  const baselineState: ScenarioState = {
    label: "Hypothetical Baseline: Unfiltered Sealed Room",
    description: `A ${input.roomVolumeCuM} m³ room without mechanical filtration under current ambient conditions (${outdoorPm25 !== null ? `${outdoorPm25} µg/m³` : "ambient"}).`,
    forecastedPm25: null, // Strictly null: unmeasured
    forecastedAqi: null,
    forecastedAqiCategory: "Unmeasured Infiltration",
    isHypotheticalSimulated: true,
    contextNotes: [
      "SIMULATED HYPOTHETICAL: No physical sensor is reporting.",
      "In unsealed rooms, literature infiltration rates range between 30% and 80%+ depending on window weatherization.",
      "Indoor cooking, smoking, or incense burning will add substantial internal particulate burden.",
    ],
  };

  const altState: ScenarioState = {
    label: `Hypothetical Filtration: ~${achDelivered} ACH (${input.fanSpeedMode === "maximum_certified" ? "Max Fan Speed" : "Low Sleep Speed"})`,
    description: `Operating a mechanical HEPA purifier rated at ${input.ratedCadrM3h} m³/h CADR in a closed ${input.roomVolumeCuM} m³ room.`,
    forecastedPm25: null,
    forecastedAqi: null,
    forecastedAqiCategory: "Simulated Mechanical Filtration",
    isHypotheticalSimulated: true,
    contextNotes: [
      "SIMULATED HYPOTHETICAL: Modeled engineering benchmark, not a verified real-time reading.",
      `Delivered clean air rate: ~${achDelivered} air changes per hour (ACH) based on volume and rated CADR.`,
      input.fanSpeedMode === "maximum_certified"
        ? "Operating at maximum fan speed matches certified laboratory test performance."
        : "Operating on quiet/sleep mode delivers unverified and substantially lower clean air delivery unless published speed-specific test data is provided.",
      "IMPORTANT: Mechanical HEPA filters capture airborne particles, but DO NOT remove carbon monoxide (CO), nitrogen dioxide (NO2), or chemical VOCs.",
    ],
  };

  const qualitativeAssessment: EnvironmentalDelta["qualitativeAssessment"] =
    achDelivered >= 4.5 ? "substantially_better" : achDelivered >= 3.0 ? "comparable" : "worse";

  const summaryText =
    achDelivered >= 4.5
      ? `A purifier delivering ${achDelivered} ACH meets the ANSI/AHAM AC-1 engineering benchmark (~5.0 ACH) for continuous particulate clearance in a ${input.roomVolumeCuM} m³ space.`
      : achDelivered >= 3.0
        ? `Delivering ${achDelivered} ACH provides moderate particulate air cleaning, but clearance will be noticeably slower during acute smoke infiltration or severe outdoor pollution spikes.`
        : `Delivering ${achDelivered} ACH is below the recommended 3.0 ACH minimum threshold; supplemental filtration or a higher-capacity unit is advised for this room volume.`;

  const receipt: DecisionReceipt = {
    receiptId: `rcpt-filter-${Date.now().toString(36)}`,
    generatedAt: new Date().toISOString(),
    locationName: telemetry.location.name,
    dataSource: telemetry.source,
    forecastFreshness: telemetry.freshnessExplanation,
    scenarioType: "filtration_hypothetical",
    baselineLabel: baselineState.label,
    alternativeLabel: altState.label,
    applicableRuleId: "aeris-rule-purifier-sizing",
    ruleTitle: "ANSI/AHAM AC-1 Engineering Sizing Benchmark Simulation",
    primaryFinding: summaryText,
    tradeOffs:
      "Continuous filtration requires electrical power and periodic filter media replacement. Higher fan speeds produce perceptible acoustic noise.",
    assumptions: [
      "Room is treated as a single, well-mixed continuous air volume without large open doorways.",
      "Purifier is fitted with genuine, undamaged True HEPA media (99.97% single-pass efficiency).",
    ],
    scientificNotice:
      "Calculations reflect idealized engineering air-exchange mathematics (CADR / Volume). Real-world particle clearance varies with room air mixing, furniture obstruction, and doorway exchange.",
  };

  const lowEmissionAlternative: LowEmissionAlternative = {
    title: "Localized 'Clean Haven' Sizing Strategy",
    description:
      "Rather than attempting to filter an entire unsealed home, concentrating filtration capacity into a single tightly sealed bedroom ('clean room strategy') minimizes electrical power and embodied filter waste.",
    emissionCategory: "energy_conservation",
    actionText:
      "Designate a single primary sleeping room as a clean haven during high-pollution episodes. Weatherstrip its door and operate a right-sized purifier there rather than running multiple undersized units across leaky living areas.",
    sustainabilityBenefit:
      "Saves up to 60% in household electricity consumption while ensuring clean air during critical nocturnal recovery hours.",
  };

  return {
    scenarioType: "filtration_hypothetical",
    baseline: baselineState,
    alternative: altState,
    delta: {
      pm25Difference: null,
      pm25Unit: "µg/m³",
      qualitativeAssessment,
      summaryText,
    },
    receipt,
    lowEmissionAlternative,
    disclaimer:
      "Simulated engineering scenario. AERIS does not fabricate indoor measurements without physical sensors.",
  };
}
