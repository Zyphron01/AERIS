/**
 * AERIS — Official Indian CPCB National Air Quality Index (NAQI) Calculator
 * Based on Central Pollution Control Board (CPCB) India NAQI Guidelines (October 2014).
 *
 * Source: Ministry of Environment, Forest and Climate Change, Government of India:
 * "National Air Quality Index", CPCB Report, October 2014.
 *
 * Standard Formula:
 * Ip = [ (I_hi - I_lo) / (B_hi - B_lo) ] * (Cp - B_lo) + I_lo
 *
 * Mandatory CPCB Criteria:
 * 1. Averaging periods: 24-hour average for PM2.5, PM10, NO2, SO2, NH3, Pb.
 *    8-hour average for CO and O3.
 * 2. Units: CO is in mg/m³. All other pollutants are in µg/m³.
 * 3. Minimum Data Completeness:
 *    - 24-hr average requires ≥ 16 hours of valid data (≥ 66.7%).
 *    - 8-hr average requires ≥ 6 hours of valid data (≥ 75.0%).
 * 4. Overall AQI Eligibility:
 *    - Data must be available for at least 3 pollutants.
 *    - At least one of the pollutants must be PM2.5 or PM10.
 *    - Otherwise, AQI cannot be calculated and must be reported as unavailable.
 */

import type { CpcbAqiCategory } from "@/lib/telemetry/types";

export interface CpcbBreakpoint {
  readonly bLo: number;
  readonly bHi: number;
  readonly iLo: number;
  readonly iHi: number;
}

// CPCB concentration breakpoints
// Note: All pollutants use µg/m³, EXCEPT CO which uses mg/m³ as defined by CPCB.
export const CPCB_BREAKPOINTS: Record<string, readonly CpcbBreakpoint[]> = {
  // PM2.5 (24-hour average, µg/m³)
  pm2_5: [
    { bLo: 0, bHi: 30, iLo: 0, iHi: 50 },
    { bLo: 30, bHi: 60, iLo: 51, iHi: 100 },
    { bLo: 60, bHi: 90, iLo: 101, iHi: 200 },
    { bLo: 90, bHi: 120, iLo: 201, iHi: 300 },
    { bLo: 120, bHi: 250, iLo: 301, iHi: 400 },
    { bLo: 250, bHi: 500, iLo: 401, iHi: 500 },
  ],
  // PM10 (24-hour average, µg/m³)
  pm10: [
    { bLo: 0, bHi: 50, iLo: 0, iHi: 50 },
    { bLo: 50, bHi: 100, iLo: 51, iHi: 100 },
    { bLo: 100, bHi: 250, iLo: 101, iHi: 200 },
    { bLo: 250, bHi: 350, iLo: 201, iHi: 300 },
    { bLo: 350, bHi: 430, iLo: 301, iHi: 400 },
    { bLo: 430, bHi: 600, iLo: 401, iHi: 500 },
  ],
  // NO2 (24-hour average, µg/m³)
  no2: [
    { bLo: 0, bHi: 40, iLo: 0, iHi: 50 },
    { bLo: 40, bHi: 80, iLo: 51, iHi: 100 },
    { bLo: 80, bHi: 180, iLo: 101, iHi: 200 },
    { bLo: 180, bHi: 280, iLo: 201, iHi: 300 },
    { bLo: 280, bHi: 400, iLo: 301, iHi: 400 },
    { bLo: 400, bHi: 600, iLo: 401, iHi: 500 },
  ],
  // O3 (8-hour average, µg/m³)
  o3: [
    { bLo: 0, bHi: 50, iLo: 0, iHi: 50 },
    { bLo: 50, bHi: 100, iLo: 51, iHi: 100 },
    { bLo: 100, bHi: 168, iLo: 101, iHi: 200 },
    { bLo: 168, bHi: 208, iLo: 201, iHi: 300 },
    { bLo: 208, bHi: 748, iLo: 301, iHi: 400 },
    { bLo: 748, bHi: 1000, iLo: 401, iHi: 500 },
  ],
  // SO2 (24-hour average, µg/m³)
  so2: [
    { bLo: 0, bHi: 40, iLo: 0, iHi: 50 },
    { bLo: 40, bHi: 80, iLo: 51, iHi: 100 },
    { bLo: 80, bHi: 380, iLo: 101, iHi: 200 },
    { bLo: 380, bHi: 800, iLo: 201, iHi: 300 },
    { bLo: 800, bHi: 1600, iLo: 301, iHi: 400 },
    { bLo: 1600, bHi: 2000, iLo: 401, iHi: 500 },
  ],
  // CO (8-hour average, mg/m³)
  // Official CPCB breakpoints: 0-1.0 (Good), 1.1-2.0 (Satisfactory), 2.1-10 (Moderate),
  // 10.1-17 (Poor), 17.1-34 (Very Poor), 34+ (Severe).
  co: [
    { bLo: 0, bHi: 1.0, iLo: 0, iHi: 50 },
    { bLo: 1.0, bHi: 2.0, iLo: 51, iHi: 100 },
    { bLo: 2.0, bHi: 10.0, iLo: 101, iHi: 200 },
    { bLo: 10.0, bHi: 17.0, iLo: 201, iHi: 300 },
    { bLo: 17.0, bHi: 34.0, iLo: 301, iHi: 400 },
    { bLo: 34.0, bHi: 50.0, iLo: 401, iHi: 500 },
  ],
  // NH3 (24-hour average, µg/m³)
  nh3: [
    { bLo: 0, bHi: 200, iLo: 0, iHi: 50 },
    { bLo: 200, bHi: 400, iLo: 51, iHi: 100 },
    { bLo: 400, bHi: 800, iLo: 101, iHi: 200 },
    { bLo: 800, bHi: 1200, iLo: 201, iHi: 300 },
    { bLo: 1200, bHi: 1800, iLo: 301, iHi: 400 },
    { bLo: 1800, bHi: 2400, iLo: 401, iHi: 500 },
  ],
  // Pb (24-hour average, µg/m³)
  pb: [
    { bLo: 0, bHi: 0.5, iLo: 0, iHi: 50 },
    { bLo: 0.5, bHi: 1.0, iLo: 51, iHi: 100 },
    { bLo: 1.0, bHi: 2.0, iLo: 101, iHi: 200 },
    { bLo: 2.0, bHi: 3.0, iLo: 201, iHi: 300 },
    { bLo: 3.0, bHi: 3.5, iLo: 301, iHi: 400 },
    { bLo: 3.5, bHi: 5.0, iLo: 401, iHi: 500 },
  ],
};

/**
 * Converts concentration in µg/m³ to mg/m³ (1 mg/m³ = 1000 µg/m³).
 */
export function convertUgM3ToMgM3(ugM3: number): number {
  return ugM3 / 1000;
}

/**
 * Calculates pollutant sub-index based on CPCB linear interpolation formula.
 * Concentration units must match the CPCB specification:
 * - CO: mg/m³
 * - All other pollutants: µg/m³
 */
export function calculateSubIndex(pollutant: string, concentration: number): number | null {
  if (concentration < 0 || isNaN(concentration) || !isFinite(concentration)) {
    return null;
  }

  const key = pollutant.toLowerCase().trim();
  const breakpoints = CPCB_BREAKPOINTS[key];
  if (!breakpoints) return null;

  if (concentration === 0) {
    return breakpoints[0].iLo;
  }

  for (let i = 0; i < breakpoints.length; i++) {
    const bp = breakpoints[i];
    const isFirst = i === 0;
    const inRange = isFirst
      ? concentration >= bp.bLo && concentration <= bp.bHi
      : concentration > bp.bLo && concentration <= bp.bHi;

    if (inRange) {
      const subIndex =
        ((bp.iHi - bp.iLo) / (bp.bHi - bp.bLo)) * (concentration - bp.bLo) + bp.iLo;
      return Math.round(subIndex);
    }
  }

  // If concentration exceeds the highest breakpoint, cap at 500 as per CPCB scale
  const lastBp = breakpoints[breakpoints.length - 1];
  if (concentration > lastBp.bHi) {
    return 500;
  }

  return null;
}

/**
 * Maps an AQI index number to official CPCB health categories.
 */
export function getCpcbCategory(aqiValue: number): CpcbAqiCategory {
  if (aqiValue <= 50) return "Good";
  if (aqiValue <= 100) return "Satisfactory";
  if (aqiValue <= 200) return "Moderate";
  if (aqiValue <= 300) return "Poor";
  if (aqiValue <= 400) return "Very Poor";
  return "Severe";
}

/**
 * Returns Tailwind CSS styling classes corresponding to CPCB color coding.
 */
export function getCpcbColorClass(category: CpcbAqiCategory | "Unavailable"): string {
  switch (category) {
    case "Good":
      return "text-emerald-700 bg-emerald-50 border-emerald-300 dark:text-emerald-300 dark:bg-emerald-950/50 dark:border-emerald-800";
    case "Satisfactory":
      return "text-teal-700 bg-teal-50 border-teal-300 dark:text-teal-300 dark:bg-teal-950/50 dark:border-teal-800";
    case "Moderate":
      return "text-amber-700 bg-amber-50 border-amber-300 dark:text-amber-300 dark:bg-amber-950/50 dark:border-amber-800";
    case "Poor":
      return "text-orange-700 bg-orange-50 border-orange-300 dark:text-orange-300 dark:bg-orange-950/50 dark:border-orange-800";
    case "Very Poor":
      return "text-rose-700 bg-rose-50 border-rose-300 dark:text-rose-300 dark:bg-rose-950/50 dark:border-rose-800";
    case "Severe":
      return "text-red-900 bg-red-100 border-red-400 dark:text-red-300 dark:bg-red-950/70 dark:border-red-800";
    case "Unavailable":
    default:
      return "text-slate-600 bg-slate-100 border-slate-300 dark:text-slate-400 dark:bg-slate-800 dark:border-slate-700";
  }
}

/**
 * Computes a rolling average over a historical sequence of hourly values.
 * Enforces CPCB minimum data completeness requirements:
 * - 24-hr average requires ≥ 16 valid readings.
 * - 8-hr average requires ≥ 6 valid readings.
 */
export function computeRollingAverage(
  hourlyValues: readonly (number | null | undefined)[],
  windowSize: number,
  minRequiredCount: number
): {
  readonly average: number | null;
  readonly validCount: number;
  readonly isSufficient: boolean;
} {
  if (!hourlyValues || hourlyValues.length === 0) {
    return { average: null, validCount: 0, isSufficient: false };
  }

  // Extract the most recent `windowSize` hourly points
  const windowSlice = hourlyValues.slice(-windowSize);
  const validNumbers = windowSlice.filter(
    (v): v is number => v !== null && v !== undefined && !isNaN(v) && isFinite(v) && v >= 0
  );

  const validCount = validNumbers.length;
  if (validCount < minRequiredCount) {
    return { average: null, validCount, isSufficient: false };
  }

  const sum = validNumbers.reduce((acc, val) => acc + val, 0);
  const rawAvg = sum / validCount;
  // Round to 1 decimal place
  const average = Math.round(rawAvg * 10) / 10;

  return { average, validCount, isSufficient: true };
}

export interface CpcbAqiResult {
  readonly aqi: number | null;
  readonly category: CpcbAqiCategory | "Unavailable";
  readonly dominantPollutant?: string;
  readonly subIndices: Readonly<Record<string, number>>;
  readonly meetsCpcbCriteria: boolean;
  readonly unavailabilityReason?: string;
}

/**
 * Computes overall Indian National Air Quality Index (NAQI).
 * Strictly enforces CPCB 2014 regulatory criteria:
 * - Minimum 3 pollutants must be monitored.
 * - At least one particulate matter (PM2.5 or PM10) is mandatory.
 * - If conditions are not satisfied, aqi returns null with explanatory reason.
 */
export function calculateOverallCpcbAqi(
  pollutantAverages: Partial<Record<string, number | null | undefined>>
): CpcbAqiResult {
  const subIndices: Record<string, number> = {};
  let maxSubIndex = -1;
  let dominantPollutant: string | undefined = undefined;

  for (const [code, conc] of Object.entries(pollutantAverages)) {
    if (conc !== null && conc !== undefined && !isNaN(conc) && isFinite(conc) && conc >= 0) {
      const sub = calculateSubIndex(code, conc);
      if (sub !== null) {
        subIndices[code] = sub;
        if (sub > maxSubIndex) {
          maxSubIndex = sub;
          dominantPollutant = code.toUpperCase().replace("_", ".");
        }
      }
    }
  }

  const hasParticulate = subIndices.pm2_5 !== undefined || subIndices.pm10 !== undefined;
  const count = Object.keys(subIndices).length;
  const meetsCpcbCriteria = count >= 3 && hasParticulate;

  if (!meetsCpcbCriteria) {
    let reason = "Indian AQI estimate unavailable: Insufficient monitored parameters.";
    if (count < 3) {
      reason = `Indian AQI estimate unavailable: Minimum 3 pollutants required for CPCB NAQI calculation (found ${count}).`;
    } else if (!hasParticulate) {
      reason =
        "Indian AQI estimate unavailable: At least one particulate pollutant (PM2.5 or PM10) is mandatory under CPCB NAQI guidelines.";
    }

    return {
      aqi: null,
      category: "Unavailable",
      dominantPollutant: undefined,
      subIndices,
      meetsCpcbCriteria: false,
      unavailabilityReason: reason,
    };
  }

  const category = getCpcbCategory(maxSubIndex);
  return {
    aqi: maxSubIndex,
    category,
    dominantPollutant,
    subIndices,
    meetsCpcbCriteria: true,
  };
}
