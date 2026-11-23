/**
 * AERIS — Deterministic Decision Engine
 * Pure, isolated, fully testable function generating personalized daily action plans.
 * Zero external network calls, zero React dependencies, zero non-deterministic side-effects.
 */

import type { HouseholdProfile, DailyPlanResult, RecommendationAction } from "./types";
import type { NormalizedTelemetry } from "@/lib/telemetry/types";
import { evaluateOutdoorExerciseRule } from "./rules/outdoor-exercise.rule";
import { evaluateIndoorVentilationRule } from "./rules/indoor-ventilation.rule";
import { evaluateCommuteProtectionRule } from "./rules/commute-protection.rule";
import { evaluateAirFiltrationRule } from "./rules/air-filtration.rule";
import { evaluateVulnerableCareRule } from "./rules/vulnerable-care.rule";
import { buildDailyPlanResult } from "./ranker";

/**
 * Evaluates the full set of deterministic environmental rules against
 * a validated household profile and current environmental telemetry.
 */
export function evaluateDailyPlan(
  profile: HouseholdProfile,
  telemetry: NormalizedTelemetry
): DailyPlanResult {
  const candidateActions: RecommendationAction[] = [];

  // 1. Evaluate Exercise & Outdoor Exertion
  const exerciseAction = evaluateOutdoorExerciseRule(profile, telemetry);
  if (exerciseAction) candidateActions.push(exerciseAction);

  // 2. Evaluate Indoor Ventilation & Infiltration
  const ventilationAction = evaluateIndoorVentilationRule(profile, telemetry);
  if (ventilationAction) candidateActions.push(ventilationAction);

  // 3. Evaluate Commute & Transit Route Exposure
  const commuteAction = evaluateCommuteProtectionRule(profile, telemetry);
  if (commuteAction) candidateActions.push(commuteAction);

  // 4. Evaluate Air Cleaning & Filtration Management
  const filtrationAction = evaluateAirFiltrationRule(profile, telemetry);
  if (filtrationAction) candidateActions.push(filtrationAction);

  // 5. Evaluate Vulnerable Demographics & Care Safeguards
  const vulnerableAction = evaluateVulnerableCareRule(profile, telemetry);
  if (vulnerableAction) candidateActions.push(vulnerableAction);

  // Build, rank, and assemble the final immutable daily plan
  return buildDailyPlanResult(profile, candidateActions, telemetry);
}
