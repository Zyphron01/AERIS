/**
 * AERIS — Personalized Daily Decision Engine Contracts
 * Strict TypeScript types with zero `any`.
 */

export type HouseholdMemberType = "adults" | "children" | "older_adults" | "infants";

export type DeclaredSensitivityType = "none" | "respiratory_asthma" | "cardiovascular";

export type CommuteMode =
  | "active_walking_biking"
  | "public_transit"
  | "personal_vehicle"
  | "work_from_home";

export type OutdoorExerciseTiming = "none" | "early_morning" | "afternoon" | "evening";

export type FiltrationType = "none" | "hepa_purifier" | "hvac_filter" | "simple_fan";

export type VentilationPreference = "natural_windows" | "mechanical" | "minimal";

export type IndoorSourceType =
  | "cooking_fumes"
  | "incense_candles"
  | "smoking"
  | "pet_dander"
  | "none";

export type BudgetPreference = "no_cost" | "limited" | "flexible";

export interface HouseholdProfile {
  readonly id: string;
  readonly members: readonly HouseholdMemberType[];
  /** Optional user-declared sensitivity consideration (strictly non-diagnostic) */
  readonly declaredSensitivity: DeclaredSensitivityType;
  readonly primaryCommute: CommuteMode;
  readonly outdoorExercise: OutdoorExerciseTiming;
  readonly hasSchoolRoutine: boolean;
  readonly filtration: FiltrationType;
  readonly ventilationPreference: VentilationPreference;
  readonly indoorSources: readonly IndoorSourceType[];
  readonly budgetPreference: BudgetPreference;
  readonly updatedAt: string; // ISO 8601
}

export type RecommendationCategory =
  | "outdoor_activity"
  | "indoor_air"
  | "commute"
  | "protective_measures";

export type RecommendationPriority = "urgent" | "high" | "moderate" | "low";

export interface PlanBAlternative {
  readonly triggerCondition: string;
  readonly triggerVariable: "pm2_5" | "pm10" | "aqi" | "temperature" | "weather";
  readonly thresholdValue: number;
  readonly thresholdUnit: string;
  readonly source: string;
  readonly validForecastPeriod: string;
  readonly alternativeAction: string;
  readonly reasonForChange: string;
}

export interface DecisionExplanation {
  readonly influencingFactors: readonly string[];
  readonly ruleTriggered: string;
  readonly sourceAttribution: string;
  readonly dataTimestamp: string;
  readonly assumptions: readonly string[];
  readonly uncertainties: readonly string[];
}

export interface RecommendationAction {
  readonly id: string;
  readonly category: RecommendationCategory;
  readonly priority: RecommendationPriority;
  readonly title: string;
  readonly actionText: string;
  readonly reason: string;
  readonly evidenceReferences: readonly string[];
  readonly tradeOffs: string;
  readonly impactClassification: "exposure_reduction" | "emission_reduction";
  readonly limitations: string;
  readonly sourceValidityTimestamp: string;
  readonly applicableRuleId: string;
  readonly planB?: PlanBAlternative;
  readonly explanation: DecisionExplanation;
}

export interface DailyPlanResult {
  readonly profile: HouseholdProfile;
  readonly rankedActions: readonly RecommendationAction[];
  readonly summary: string;
  readonly environmentalContext: {
    readonly aqiValue: number | null;
    readonly aqiCategory: string;
    readonly dominantPollutant?: string;
    readonly pm25Value: number | null;
    readonly pm10Value: number | null;
    readonly dataKind: string;
    readonly freshness: string;
    readonly timestamp: string;
  };
}
