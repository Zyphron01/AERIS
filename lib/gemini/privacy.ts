/**
 * AERIS Gemini Intelligence — Privacy Preservation & Operational Logging
 *
 * Strict Privacy Mandate:
 * 1. Do NOT send full household profiles or chat history to Gemini by default.
 * 2. Send only the minimum information required to explain a specific recommendation.
 * 3. Never log raw household profiles, user text questions, or API credentials.
 */

import type {
  HouseholdProfile,
  RecommendationCategory,
} from "@/lib/decision-engine/types";

export interface SanitizedMinimalContext {
  readonly relevantFactor: string;
  readonly category: RecommendationCategory;
}

/**
 * Extracts only the minimal relevant attribute required for an action category.
 * Never serializes user demographic lists, medical sensitivities, or identifiers.
 */
export function extractMinimalContext(
  category: RecommendationCategory,
  profile: HouseholdProfile
): SanitizedMinimalContext {
  switch (category) {
    case "outdoor_activity":
      return {
        category,
        relevantFactor: `Workout timing: ${profile.outdoorExercise}`,
      };
    case "commute":
      return {
        category,
        relevantFactor: `Primary transit mode: ${profile.primaryCommute}`,
      };
    case "indoor_air":
      return {
        category,
        relevantFactor: `Air filtration hardware: ${profile.filtration}; ventilation: ${profile.ventilationPreference}`,
      };
    case "protective_measures": {
      const hasSensitive =
        profile.members.includes("children") ||
        profile.members.includes("older_adults") ||
        profile.declaredSensitivity !== "none";
      return {
        category,
        relevantFactor: hasSensitive
          ? "Household includes sensitive or vulnerable demographic consideration."
          : "Standard demographic consideration.",
      };
    }
  }
}

export interface OperationalLogEntry {
  readonly timestamp: string;
  readonly path: string;
  readonly actionId?: string;
  readonly clientIpRedacted: string;
  readonly durationMs: number;
  readonly status: "success" | "fallback" | "rate_limited" | "error";
  readonly errorType?: string;
}

/**
 * Redacted operational logger.
 * Never prints user text, profile fields, or secret keys.
 */
export function logOperationalMetric(entry: OperationalLogEntry): void {
  // Redact IP to preserve subnet privacy (e.g., 192.168.1.xxx or 2001:db8::xxxx)
  const redactedIp = entry.clientIpRedacted.includes(".")
    ? entry.clientIpRedacted.replace(/\.\d+$/, ".xxx")
    : "ipv6-redacted";

  // Structured console info without user identifiers
  if (process.env.NODE_ENV !== "test") {
    console.info(
      JSON.stringify({
        level: "info",
        timestamp: entry.timestamp,
        path: entry.path,
        actionId: entry.actionId ?? "none",
        ipSubnet: redactedIp,
        durationMs: entry.durationMs,
        status: entry.status,
        errorType: entry.errorType,
      })
    );
  }
}
