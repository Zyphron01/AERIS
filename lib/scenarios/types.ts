/**
 * AERIS What-If Scenario Simulator — Domain Types
 * Strict TypeScript models with zero `any`.
 */

export type ScenarioType =
  | "outdoor_timing"
  | "indoor_vs_outdoor"
  | "commute_mode"
  | "filtration_hypothetical";

export type CommuteMode =
  | "active_walking_biking"
  | "open_two_wheeler_auto"
  | "closed_public_transit_metro"
  | "private_car_ac";

export type ActivityLocation = "outdoor" | "indoor_unfiltered" | "indoor_filtered";

export interface ScenarioState {
  readonly label: string;
  readonly description: string;
  readonly forecastTime?: string;
  readonly forecastedPm25: number | null;
  readonly forecastedAqi: number | null;
  readonly forecastedAqiCategory: string;
  readonly weatherLabel?: string;
  readonly temperatureC?: number | null;
  readonly isHypotheticalSimulated: boolean;
  readonly contextNotes: readonly string[];
}

export interface EnvironmentalDelta {
  readonly pm25Difference: number | null;
  readonly pm25Unit: "µg/m³";
  readonly qualitativeAssessment: "substantially_better" | "comparable" | "worse" | "unknown";
  readonly summaryText: string;
}

export interface DecisionReceipt {
  readonly receiptId: string;
  readonly generatedAt: string;
  readonly locationName: string;
  readonly dataSource: string;
  readonly forecastFreshness: string;
  readonly scenarioType: ScenarioType;
  readonly baselineLabel: string;
  readonly alternativeLabel: string;
  readonly applicableRuleId: string;
  readonly ruleTitle: string;
  readonly primaryFinding: string;
  readonly tradeOffs: string;
  readonly assumptions: readonly string[];
  readonly scientificNotice: string;
}

export interface LowEmissionAlternative {
  readonly title: string;
  readonly description: string;
  readonly emissionCategory: "zero_emission" | "mass_transit" | "energy_conservation";
  readonly actionText: string;
  readonly sustainabilityBenefit: string;
}

export interface ScenarioComparisonResult {
  readonly scenarioType: ScenarioType;
  readonly baseline: ScenarioState;
  readonly alternative: ScenarioState;
  readonly delta: EnvironmentalDelta;
  readonly receipt: DecisionReceipt;
  readonly lowEmissionAlternative: LowEmissionAlternative | null;
  readonly disclaimer: string;
}
