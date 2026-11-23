/**
 * AERIS Decision Engine: Deterministic Action Ranker & Plan Aggregator
 * Prioritizes candidate actions based on risk magnitude, vulnerability relevance, and category diversity.
 */

import type { RecommendationAction, RecommendationPriority, DailyPlanResult, HouseholdProfile } from "./types";
import type { NormalizedTelemetry } from "@/lib/telemetry/types";

const PRIORITY_SCORES: Record<RecommendationPriority, number> = {
  urgent: 100,
  high: 75,
  moderate: 50,
  low: 25,
};

/**
 * Calculates a deterministic relevance score for each candidate action.
 */
function scoreAction(action: RecommendationAction, profile: HouseholdProfile): number {
  let score = PRIORITY_SCORES[action.priority];

  // Vulnerability relevance boost
  const hasVulnerable =
    profile.members.includes("children") ||
    profile.members.includes("older_adults") ||
    profile.declaredSensitivity !== "none";

  if (hasVulnerable && (action.category === "protective_measures" || action.category === "outdoor_activity")) {
    score += 15;
  }

  // Active commute relevance boost
  if (profile.primaryCommute === "active_walking_biking" && action.category === "commute") {
    score += 10;
  }

  // Indoor source mitigation boost
  if (profile.indoorSources.includes("cooking_fumes") && action.category === "indoor_air") {
    score += 5;
  }

  return score;
}

/**
 * Ranks candidate actions and selects the top 3 distinct, non-conflicting actions.
 * Prioritizes category diversity so user receives balanced guidance across:
 * 1. Outdoor activity & exercise
 * 2. Indoor air & filtration/ventilation
 * 3. Commute & protective measures
 */
export function rankRecommendations(
  candidates: readonly RecommendationAction[],
  profile: HouseholdProfile,
  maxCount = 3
): readonly RecommendationAction[] {
  if (candidates.length === 0) {
    return [];
  }

  // Score and sort candidates in descending order
  const scored = candidates.map((action) => ({
    action,
    score: scoreAction(action, profile),
  }));

  scored.sort((a, b) => b.score - a.score);

  const selected: RecommendationAction[] = [];
  const selectedCategories = new Set<string>();
  const selectedIds = new Set<string>();

  // Pass 0: Critical Safety Priority Override.
  // Urgent safety interventions (e.g. acute exposure alerts, severe vulnerable shielding)
  // must NEVER be dropped or bypassed to satisfy lifestyle category diversity.
  for (const item of scored) {
    if (selected.length >= maxCount) break;
    if (item.action.priority === "urgent" && !selectedIds.has(item.action.id)) {
      selected.push(item.action);
      selectedCategories.add(item.action.category);
      selectedIds.add(item.action.id);
    }
  }

  // Pass 1: Select highest-scoring action from each distinct category for remaining slots
  for (const item of scored) {
    if (selected.length >= maxCount) break;

    if (!selectedIds.has(item.action.id) && !selectedCategories.has(item.action.category)) {
      selected.push(item.action);
      selectedCategories.add(item.action.category);
      selectedIds.add(item.action.id);
    }
  }

  // Pass 2: If we have fewer than maxCount, backfill with remaining highest-scoring actions
  if (selected.length < maxCount) {
    for (const item of scored) {
      if (selected.length >= maxCount) break;

      if (!selectedIds.has(item.action.id)) {
        selected.push(item.action);
        selectedIds.add(item.action.id);
      }
    }
  }

  return selected;
}

/**
 * Generates an executive daily plan summary.
 */
export function generatePlanSummary(
  actions: readonly RecommendationAction[],
  telemetry: NormalizedTelemetry,
  profile: HouseholdProfile
): string {
  const cpcbCategory = telemetry.aqi.cpcbAqi.category;
  const pm25Val = telemetry.pollutants.find((p) => p.code === "pm2_5")?.value;
  const locationName = telemetry.location.name;

  if (actions.length === 0) {
    return `Environmental conditions in ${locationName} are favorable. Continue with normal daily routines while monitoring local updates.`;
  }

  const urgentCount = actions.filter((a) => a.priority === "urgent" || a.priority === "high").length;
  const isVulnerable =
    profile.members.includes("children") ||
    profile.members.includes("older_adults") ||
    profile.declaredSensitivity !== "none";

  if (urgentCount > 0) {
    const focus = isVulnerable
      ? "vulnerable members and active exposure shielding"
      : "active exposure reduction";
    return `Air quality in ${locationName} is ${cpcbCategory} (PM2.5: ${pm25Val ?? "—"} µg/m³). AERIS has generated ${actions.length} prioritized actions focused on ${focus} for your household.`;
  }

  return `Air quality in ${locationName} is currently ${cpcbCategory}. AERIS has structured ${actions.length} lifestyle adaptations to balance wellness and clean air protection.`;
}

/**
 * Assembles the full DailyPlanResult.
 */
export function buildDailyPlanResult(
  profile: HouseholdProfile,
  candidates: readonly RecommendationAction[],
  telemetry: NormalizedTelemetry
): DailyPlanResult {
  const rankedActions = rankRecommendations(candidates, profile, 3);
  const summary = generatePlanSummary(rankedActions, telemetry, profile);

  return {
    profile,
    rankedActions,
    summary,
    environmentalContext: {
      aqiValue: telemetry.aqi.cpcbAqi.value,
      aqiCategory: telemetry.aqi.cpcbAqi.category,
      dominantPollutant: telemetry.aqi.cpcbAqi.dominantPollutant,
      pm25Value: telemetry.pollutants.find((p) => p.code === "pm2_5")?.value ?? null,
      pm10Value: telemetry.pollutants.find((p) => p.code === "pm10")?.value ?? null,
      dataKind: telemetry.dataKind,
      freshness: telemetry.freshness,
      timestamp: telemetry.timestamp,
    },
  };
}
