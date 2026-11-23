/**
 * AERIS Indoor Air Quality & Guidance Domain Contracts
 * Strict TypeScript types with zero `any`.
 */

export type DimensionUnit = "meters" | "feet";

export interface RoomDimensions {
  readonly length: number;
  readonly width: number;
  readonly height: number;
  readonly unit: DimensionUnit;
}

export interface ExistingPurifierSpecs {
  readonly hasPurifier: boolean;
  readonly knownCadrM3h: number | null;
  readonly knownCadrCfm: number | null;
  readonly dailyOperatingHours: number;
  readonly ratedWattage: number | null;
}

export type CurrencyUnit = "INR" | "USD";

export interface CostParameters {
  readonly electricityTariffPerKwh: number;
  readonly annualFilterReplacementCost: number;
  readonly currency: CurrencyUnit;
}

export interface ExistingPurifierEvaluation {
  readonly status: "adequate" | "marginal" | "undersized" | "none";
  readonly achDelivered: number | null;
  readonly targetAch: number;
  readonly assessment: string;
}

export interface OperatingCostBreakdown {
  readonly estimatedPowerWatts: number;
  readonly dailyKwh: number;
  readonly annualKwh: number;
  readonly annualElectricityCost: number;
  readonly annualFilterCost: number;
  readonly totalAnnualCost: number;
  readonly monthlyCost: number;
  readonly currency: CurrencyUnit;
}

export interface PurifierAdvisorResult {
  readonly dimensions: RoomDimensions;
  readonly floorAreaSqM: number;
  readonly floorAreaSqFt: number;
  readonly roomVolumeCuM: number;
  readonly roomVolumeCuFt: number;
  readonly targetAch: number;
  readonly recommendedCadrM3h: number;
  readonly recommendedCadrCfm: number;
  readonly epaTwoThirdsRuleCfm: number;
  readonly isNewPurifierPurchaseRecommended: boolean;
  readonly zeroCostAlternativeAvailable: boolean;
  readonly recommendationReason: string;
  readonly existingPurifierEvaluation: ExistingPurifierEvaluation;
  readonly operatingCost: OperatingCostBreakdown;
  readonly scientificDisclaimers: readonly string[];
}

export type RoomType =
  | "bedroom"
  | "living_room"
  | "kitchen"
  | "home_office"
  | "nursery";

export type WindowState = "all_closed" | "cracked_open" | "wide_open";

export type IndoorCombustionSource =
  | "cooking_unvented"
  | "gas_stove"
  | "incense_candles"
  | "smoking"
  | "none";

export type IndoorDustActivity =
  | "sweeping"
  | "vacuuming"
  | "renovation"
  | "none";

export type PerceivedStuffiness =
  | "fresh"
  | "normal"
  | "stuffy_drowsy"
  | "odorous";

export type ThermalComfort = "comfortable" | "too_hot" | "too_cold";

export interface UserReportedIndoorConditions {
  readonly roomType: RoomType;
  readonly windowState: WindowState;
  readonly combustionSources: readonly IndoorCombustionSource[];
  readonly dustActivities: readonly IndoorDustActivity[];
  readonly occupancyCount: number;
  readonly perceivedStuffiness: PerceivedStuffiness;
  readonly hasExhaustFanRunning: boolean;
  readonly hasAirConditionerRunning: boolean;
  readonly thermalComfort: ThermalComfort;
}

export interface OptionalIndoorSensors {
  readonly pm25Value: number | null;
  readonly co2Ppm: number | null;
  readonly temperatureC: number | null;
  readonly humidityPercent: number | null;
  readonly deviceLabel?: string;
}

export type IndoorGuidanceCategory =
  | "ventilation"
  | "source_reduction"
  | "filtration"
  | "thermal_safety";

export type IndoorGuidancePriority = "urgent" | "high" | "moderate" | "low";

export type IndoorCostTier = "zero_cost" | "low_cost" | "equipment";

export interface IndoorGuidanceAction {
  readonly id: string;
  readonly category: IndoorGuidanceCategory;
  readonly priority: IndoorGuidancePriority;
  readonly costTier: IndoorCostTier;
  readonly title: string;
  readonly actionText: string;
  readonly whyItMatters: string;
  readonly evidenceReferences: readonly string[];
  readonly tradeOffs: string;
  readonly uncertaintyNotice: string;
  readonly assumptions: readonly string[];
}

export interface IndoorAirPlan {
  readonly outdoorContext: {
    readonly aqiValue: number | null;
    readonly aqiCategory: string;
    readonly pm25Value: number | null;
    readonly temperatureC: number | null;
    readonly humidityPercent: number | null;
    readonly windSpeedKmH: number | null;
    readonly dataTimestamp: string;
    readonly dataKind: string;
  };
  readonly indoorMeasurementStatus: "measured" | "unmeasured_modeled";
  readonly measuredSensors: OptionalIndoorSensors | null;
  readonly userConditions: UserReportedIndoorConditions;
  readonly actions: readonly IndoorGuidanceAction[];
  readonly purifierAdvisor: PurifierAdvisorResult;
  readonly summary: string;
}
