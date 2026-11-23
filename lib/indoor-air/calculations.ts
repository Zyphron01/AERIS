/**
 * AERIS Indoor Air Quality — Engineering & Sizing Calculations
 * Implements authoritative EPA (Guide to Air Cleaners in the Home), AHAM AC-1, and ASHRAE 62.2 standards.
 * Zero `any`, strictly typed, unit-tested pure functions.
 *
 * EXACT UNIT CONVERSIONS:
 * 1 meter (m) = 3.28084 feet (ft)
 * 1 square meter (m²) = 10.76391 square feet (ft²)
 * 1 cubic meter (m³) = 35.31467 cubic feet (ft³)
 * 1 cubic foot per minute (CFM) = 1.699011 cubic meters per hour (m³/h)
 * 1 m³/h = 0.588578 CFM
 */

import type {
  RoomDimensions,
  ExistingPurifierSpecs,
  CostParameters,
  PurifierAdvisorResult,
  ExistingPurifierEvaluation,
  OperatingCostBreakdown,
} from "./types";

// Exact conversion constants
export const FEET_PER_METER = 3.28084;
export const METERS_PER_FOOT = 1 / FEET_PER_METER;
export const SQFT_PER_SQM = FEET_PER_METER * FEET_PER_METER; // ~10.76391
export const CUFT_PER_CUM = FEET_PER_METER * FEET_PER_METER * FEET_PER_METER; // ~35.31467
export const M3H_PER_CFM = 1.6990107955; // 1 CFM = 1.699011 m³/h
export const CFM_PER_M3H = 1 / M3H_PER_CFM; // ~0.588578 CFM / (m³/h)

/**
 * Standard Air Changes per Hour (ACH) for effective particulate clean-air delivery.
 * Recommended by EPA and AHAM as an engineering sizing benchmark: 4.5 to 5.0 ACH.
 * Note: This is an engineering sizing guideline, not a statutory regulation or medical requirement.
 */
export const TARGET_ACH = 5.0;

/**
 * Converts length, width, height into normalized metric and imperial values.
 * Accounts for variable ceiling height in total room volume.
 */
export function normalizeRoomGeometry(dimensions: RoomDimensions): {
  lengthM: number;
  widthM: number;
  heightM: number;
  areaSqM: number;
  areaSqFt: number;
  volumeCuM: number;
  volumeCuFt: number;
} {
  let lengthM: number;
  let widthM: number;
  let heightM: number;

  if (dimensions.unit === "meters") {
    lengthM = Math.max(0.5, dimensions.length);
    widthM = Math.max(0.5, dimensions.width);
    heightM = Math.max(1.5, dimensions.height);
  } else {
    lengthM = Math.max(0.5, dimensions.length * METERS_PER_FOOT);
    widthM = Math.max(0.5, dimensions.width * METERS_PER_FOOT);
    heightM = Math.max(1.5, dimensions.height * METERS_PER_FOOT);
  }

  const areaSqM = lengthM * widthM;
  const areaSqFt = areaSqM * SQFT_PER_SQM;
  const volumeCuM = areaSqM * heightM;
  const volumeCuFt = volumeCuM * CUFT_PER_CUM;

  return {
    lengthM,
    widthM,
    heightM,
    areaSqM: Math.round(areaSqM * 100) / 100,
    areaSqFt: Math.round(areaSqFt * 10) / 10,
    volumeCuM: Math.round(volumeCuM * 100) / 100,
    volumeCuFt: Math.round(volumeCuFt * 10) / 10,
  };
}

/**
 * Computes target CADR required to achieve target ACH in a room.
 * CADR (m³/h) = Volume (m³) * Target ACH.
 * CADR (CFM) = Volume (cu ft) * Target ACH / 60.
 */
export function calculateRequiredCadr(
  volumeCuM: number,
  targetAch: number = TARGET_ACH
): { cadrM3h: number; cadrCfm: number } {
  const cadrM3h = Math.round(volumeCuM * targetAch);
  const cadrCfm = Math.round(cadrM3h * CFM_PER_M3H);
  return { cadrM3h, cadrCfm };
}

/**
 * EPA "2/3 Rule" check for standard 8-foot (2.44 m) ceilings.
 * Recommended Smoke CADR (CFM) ≈ 2/3 of floor area in square feet.
 * Note: High ceilings (> 8 ft / 2.44 m) require proportionately higher CADR based on actual volume.
 */
export function calculateEpaTwoThirdsCadr(areaSqFt: number): number {
  return Math.round((2 / 3) * areaSqFt);
}

/**
 * Evaluates an existing purifier against room volume and target ACH.
 * Explicitly states particulate filtering bounds and clarifies that purifiers do not capture CO or all gases.
 */
export function evaluateExistingPurifier(
  specs: ExistingPurifierSpecs,
  volumeCuM: number,
  targetAch: number = TARGET_ACH
): ExistingPurifierEvaluation {
  if (!specs.hasPurifier) {
    return {
      status: "none",
      achDelivered: null,
      targetAch,
      assessment: "No mechanical air purifier declared for this room.",
    };
  }

  // Resolve CADR in m³/h
  let currentCadrM3h: number | null = specs.knownCadrM3h;
  if (currentCadrM3h === null && specs.knownCadrCfm !== null) {
    currentCadrM3h = specs.knownCadrCfm * M3H_PER_CFM;
  }

  if (currentCadrM3h === null || currentCadrM3h <= 0) {
    return {
      status: "marginal",
      achDelivered: null,
      targetAch,
      assessment:
        "Existing purifier present but rated CADR is unknown. Check manufacturer label for maximum clean air delivery rate.",
    };
  }

  const achDelivered = Math.round((currentCadrM3h / volumeCuM) * 10) / 10;

  if (achDelivered >= 4.5) {
    return {
      status: "adequate",
      achDelivered,
      targetAch,
      assessment: `Existing purifier delivers ~${achDelivered} ACH at maximum fan speed for particulate matter. Note: Particle filtration does not remove carbon monoxide, nitrogen dioxide, or chemical VOCs without dedicated chemical adsorbents, nor does it replace fresh air ventilation.`,
    };
  }

  if (achDelivered >= 3.0) {
    return {
      status: "marginal",
      achDelivered,
      targetAch,
      assessment: `Existing purifier provides ~${achDelivered} ACH at high fan speed. Provides particulate reduction, but clearance is slower during acute smoke or outdoor pollution spikes. Running on low sleep speeds will further reduce effective clean air delivery.`,
    };
  }

  return {
    status: "undersized",
    achDelivered,
    targetAch,
    assessment: `Existing purifier provides ~${achDelivered} ACH, below the 4.5–5.0 ACH engineering sizing benchmark for effective particulate suppression in a room of this volume.`,
  };
}

/**
 * Estimates modern brushless DC (BLDC) purifier power consumption from CADR.
 * Modern energy-efficient purifiers consume ~0.08 W to 0.12 W per m³/h CADR at medium fan speed.
 */
export function estimatePurifierPowerWatts(cadrM3h: number, userWattage?: number | null): number {
  if (userWattage && userWattage > 0) {
    return userWattage;
  }
  // Baseline scaling: 10W base + 0.08W per m³/h CADR, capped realistically between 15W and 75W
  const estimated = Math.round(10 + Math.max(0, cadrM3h) * 0.08);
  return Math.min(Math.max(estimated, 15), 75);
}

/**
 * Calculates annual electricity and filter operating costs.
 * Robust against zero operating hours, zero tariff, or missing parameters.
 */
export function calculateOperatingCosts(
  powerWatts: number,
  dailyHours: number,
  costParams: CostParameters
): OperatingCostBreakdown {
  const safeHours = Math.min(24, Math.max(0, dailyHours || 0));
  const safeWatts = Math.max(0, powerWatts || 0);
  const tariff = Math.max(0, costParams.electricityTariffPerKwh ?? 0);
  const filterCost = Math.max(0, costParams.annualFilterReplacementCost ?? 0);

  const dailyKwh = (safeWatts * safeHours) / 1000;
  const annualKwh = Math.round(dailyKwh * 365 * 10) / 10;
  const annualElectricityCost = Math.round(annualKwh * tariff);
  const totalAnnualCost = annualElectricityCost + filterCost;
  const monthlyCost = Math.round(totalAnnualCost / 12);

  return {
    estimatedPowerWatts: safeWatts,
    dailyKwh: Math.round(dailyKwh * 100) / 100,
    annualKwh,
    annualElectricityCost,
    annualFilterCost: filterCost,
    totalAnnualCost,
    monthlyCost,
    currency: costParams.currency,
  };
}

/**
 * Master Purifier Advisor Engine: Computes sizing, cost, and zero-cost alternatives.
 */
export function computePurifierAdvisor(
  dimensions: RoomDimensions,
  purifierSpecs: ExistingPurifierSpecs,
  costParams: CostParameters,
  outdoorPm25: number | null,
  budgetPreference: "no_cost" | "limited" | "flexible" = "limited"
): PurifierAdvisorResult {
  const geom = normalizeRoomGeometry(dimensions);
  const requiredCadr = calculateRequiredCadr(geom.volumeCuM, TARGET_ACH);
  const epaTwoThirdsCfm = calculateEpaTwoThirdsCadr(geom.areaSqFt);
  const existingEval = evaluateExistingPurifier(purifierSpecs, geom.volumeCuM, TARGET_ACH);

  // Power and cost calculation based on recommended or existing purifier
  const activeCadr =
    existingEval.status === "adequate" && purifierSpecs.knownCadrM3h
      ? purifierSpecs.knownCadrM3h
      : requiredCadr.cadrM3h;

  const powerWatts = estimatePurifierPowerWatts(activeCadr, purifierSpecs.ratedWattage);
  const operatingCost = calculateOperatingCosts(
    powerWatts,
    purifierSpecs.dailyOperatingHours,
    costParams
  );

  // Decision logic for recommending new purchase vs. zero-cost alternative
  const isOutdoorRelativelyFavorable = outdoorPm25 !== null && outdoorPm25 <= 35;
  const isExistingAdequate = existingEval.status === "adequate";
  const isZeroCostBudget = budgetPreference === "no_cost";

  let isNewPurifierPurchaseRecommended = true;
  let zeroCostAlternativeAvailable = false;
  let recommendationReason = "";

  if (isExistingAdequate) {
    isNewPurifierPurchaseRecommended = false;
    zeroCostAlternativeAvailable = true;
    recommendationReason =
      "Your existing air purifier is adequately sized for this room volume (~" +
      existingEval.achDelivered +
      " ACH at high speed). A new device purchase is not recommended.";
  } else if (isZeroCostBudget) {
    isNewPurifierPurchaseRecommended = false;
    zeroCostAlternativeAvailable = true;
    recommendationReason =
      "Based on your zero-cost budget preference, an equipment purchase is not recommended. Rigorous source elimination (flameless candles, covered cooking), damp microfiber cleaning, and door threshold weatherstripping achieve meaningful particle reduction without capital expenditure.";
  } else if (isOutdoorRelativelyFavorable) {
    isNewPurifierPurchaseRecommended = false;
    zeroCostAlternativeAvailable = true;
    recommendationReason =
      "Outdoor particulate concentrations are currently in a relatively lower dispersion window (PM2.5 ≤ 35 µg/m³). Natural cross-ventilation flushes metabolic CO2 and odors without requiring immediate equipment expenditure.";
  } else {
    isNewPurifierPurchaseRecommended = true;
    zeroCostAlternativeAvailable = true;
    recommendationReason = `Given elevated ambient particulate levels and room volume (${geom.volumeCuM} m³), an AHAM-certified True HEPA purifier rated for at least ${requiredCadr.cadrM3h} m³/h CADR (${requiredCadr.cadrCfm} CFM) is recommended to target 5.0 air changes per hour at maximum speed. Zero-cost source control should be practiced in parallel.`;
  }

  const scientificDisclaimers = [
    "Target 5.0 ACH is an engineering sizing benchmark (AHAM AC-1 / EPA guidance), not a statutory standard or medical guarantee against illness.",
    "Certified CADR ratings reflect performance at maximum fan speed in laboratory test chambers. Lower fan speeds (such as quiet or sleep modes) deliver significantly reduced clean air delivery; unless manufacturer test data specifies speed-specific CADR, low-speed performance is unverified and substantially below rated capacity.",
    "Mechanical HEPA filters capture airborne particulates (PM2.5, pollen, smoke particles), but do NOT remove carbon monoxide (CO), nitrogen dioxide, or chemical VOCs without dedicated chemical adsorbents.",
    "Without calibrated physical indoor sensors, estimated air quality improvements remain theoretical modeled reductions rather than verified measurements.",
  ];

  return {
    dimensions,
    floorAreaSqM: geom.areaSqM,
    floorAreaSqFt: geom.areaSqFt,
    roomVolumeCuM: geom.volumeCuM,
    roomVolumeCuFt: geom.volumeCuFt,
    targetAch: TARGET_ACH,
    recommendedCadrM3h: requiredCadr.cadrM3h,
    recommendedCadrCfm: requiredCadr.cadrCfm,
    epaTwoThirdsRuleCfm: epaTwoThirdsCfm,
    isNewPurifierPurchaseRecommended,
    zeroCostAlternativeAvailable,
    recommendationReason,
    existingPurifierEvaluation: existingEval,
    operatingCost,
    scientificDisclaimers,
  };
}
