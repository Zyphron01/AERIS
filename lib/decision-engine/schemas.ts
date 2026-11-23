/**
 * AERIS — Zod Validation Schemas for Decision Engine & Household Profiles
 * Strict runtime validation rejecting invalid values or non-sanitized fields.
 */

import { z } from "zod";

export const HouseholdMemberTypeSchema = z.enum([
  "adults",
  "children",
  "older_adults",
  "infants",
]);

export const DeclaredSensitivityTypeSchema = z.enum([
  "none",
  "respiratory_asthma",
  "cardiovascular",
]);

export const CommuteModeSchema = z.enum([
  "active_walking_biking",
  "public_transit",
  "personal_vehicle",
  "work_from_home",
]);

export const OutdoorExerciseTimingSchema = z.enum([
  "none",
  "early_morning",
  "afternoon",
  "evening",
]);

export const FiltrationTypeSchema = z.enum([
  "none",
  "hepa_purifier",
  "hvac_filter",
  "simple_fan",
]);

export const VentilationPreferenceSchema = z.enum([
  "natural_windows",
  "mechanical",
  "minimal",
]);

export const IndoorSourceTypeSchema = z.enum([
  "cooking_fumes",
  "incense_candles",
  "smoking",
  "pet_dander",
  "none",
]);

export const BudgetPreferenceSchema = z.enum(["no_cost", "limited", "flexible"]);

export const HouseholdProfileSchema = z.object({
  id: z.string().min(1),
  members: z.array(HouseholdMemberTypeSchema).min(1, "Select at least one household member group."),
  declaredSensitivity: DeclaredSensitivityTypeSchema.default("none"),
  primaryCommute: CommuteModeSchema.default("public_transit"),
  outdoorExercise: OutdoorExerciseTimingSchema.default("none"),
  hasSchoolRoutine: z.boolean().default(false),
  filtration: FiltrationTypeSchema.default("none"),
  ventilationPreference: VentilationPreferenceSchema.default("natural_windows"),
  indoorSources: z.array(IndoorSourceTypeSchema).default(["none"]),
  budgetPreference: BudgetPreferenceSchema.default("no_cost"),
  updatedAt: z.string().min(1),
});

export const RecommendationCategorySchema = z.enum([
  "outdoor_activity",
  "indoor_air",
  "commute",
  "protective_measures",
]);

export const RecommendationPrioritySchema = z.enum([
  "urgent",
  "high",
  "moderate",
  "low",
]);

export const PlanBAlternativeSchema = z.object({
  triggerCondition: z.string().min(1),
  triggerVariable: z.enum(["pm2_5", "pm10", "aqi", "temperature", "weather"]),
  thresholdValue: z.number(),
  thresholdUnit: z.string().min(1),
  source: z.string().min(1),
  validForecastPeriod: z.string().min(1),
  alternativeAction: z.string().min(1),
  reasonForChange: z.string().min(1),
});

export const DecisionExplanationSchema = z.object({
  influencingFactors: z.array(z.string()),
  ruleTriggered: z.string().min(1),
  sourceAttribution: z.string().min(1),
  dataTimestamp: z.string().min(1),
  assumptions: z.array(z.string()),
  uncertainties: z.array(z.string()),
});

export const RecommendationActionSchema = z.object({
  id: z.string().min(1),
  category: RecommendationCategorySchema,
  priority: RecommendationPrioritySchema,
  title: z.string().min(1),
  actionText: z.string().min(1),
  reason: z.string().min(1),
  evidenceReferences: z.array(z.string()).min(1),
  tradeOffs: z.string().min(1),
  impactClassification: z.enum(["exposure_reduction", "emission_reduction"]),
  limitations: z.string().min(1),
  sourceValidityTimestamp: z.string().min(1),
  applicableRuleId: z.string().min(1),
  planB: PlanBAlternativeSchema.optional(),
  explanation: DecisionExplanationSchema,
});
