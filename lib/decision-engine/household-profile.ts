/**
 * AERIS — Household Profile Storage & Validation Utilities
 * Pure client-side persistence adhering to privacy-by-design standards.
 * Zero personal identifiers, zero medical diagnoses, zero server-side health tracking.
 */

import { HouseholdProfileSchema } from "./schemas";
import type { HouseholdProfile } from "./types";

export const STORAGE_KEY_HOUSEHOLD_PROFILE = "aeris_household_profile_v1";
export const LEGACY_STORAGE_KEYS = [
  "aeris_household_profile",
  "aeris-household-profile",
] as const;

export const DEFAULT_DEMO_PROFILE: HouseholdProfile = {
  id: "demo-profile-delhi",
  members: ["adults", "children"],
  declaredSensitivity: "none",
  primaryCommute: "active_walking_biking",
  outdoorExercise: "early_morning",
  hasSchoolRoutine: true,
  filtration: "hepa_purifier",
  ventilationPreference: "natural_windows",
  indoorSources: ["cooking_fumes"],
  budgetPreference: "limited",
  updatedAt: new Date().toISOString(),
};

/**
 * Safely parses and validates a raw household profile string.
 * Never throws SyntaxError on corrupted or empty input.
 */
export function safeParseHouseholdProfile(
  raw: string | null | undefined
): HouseholdProfile | null {
  if (!raw || typeof raw !== "string") {
    return null;
  }
  const trimmed = raw.trim();
  if (
    !trimmed ||
    trimmed === "undefined" ||
    trimmed === "null" ||
    trimmed === "{}"
  ) {
    return null;
  }
  try {
    const parsedJson = JSON.parse(trimmed);
    if (!parsedJson || typeof parsedJson !== "object") {
      return null;
    }
    const validated = HouseholdProfileSchema.safeParse(parsedJson);
    return validated.success ? validated.data : null;
  } catch {
    return null;
  }
}

/**
 * Retrieves the stored household profile from browser localStorage.
 * Returns null if not present, unparseable, or invalid according to Zod schema.
 */
export function getStoredHouseholdProfile(): HouseholdProfile | null {
  if (typeof window === "undefined") {
    return null;
  }

  try {
    // 1. Check primary v1 storage key
    const raw = window.localStorage.getItem(STORAGE_KEY_HOUSEHOLD_PROFILE);
    const parsed = safeParseHouseholdProfile(raw);
    if (parsed) {
      return parsed;
    }

    // 2. Check legacy storage keys and migrate forward if valid
    if (!raw) {
      for (const legacyKey of LEGACY_STORAGE_KEYS) {
        const legacyRaw = window.localStorage.getItem(legacyKey);
        const legacyParsed = safeParseHouseholdProfile(legacyRaw);
        if (legacyParsed) {
          saveHouseholdProfile(legacyParsed);
          return legacyParsed;
        }
      }
    }

    return null;
  } catch (err) {
    console.error("Error reading stored household profile:", err);
    return null;
  }
}

/**
 * Validates and saves the household profile to browser localStorage.
 */
export function saveHouseholdProfile(profile: unknown): { success: boolean; data?: HouseholdProfile; error?: string } {
  const validation = HouseholdProfileSchema.safeParse(profile);
  if (!validation.success) {
    const firstIssue = validation.error.issues[0]?.message || "Invalid profile data";
    return { success: false, error: firstIssue };
  }

  if (typeof window !== "undefined") {
    try {
      window.localStorage.setItem(STORAGE_KEY_HOUSEHOLD_PROFILE, JSON.stringify(validation.data));
      window.dispatchEvent(new Event("aeris_profile_updated"));
    } catch (err) {
      console.error("Failed to save household profile to localStorage:", err);
      return { success: false, error: "Local storage write failure" };
    }
  }

  return { success: true, data: validation.data };
}

/**
 * Clears the stored household profile from browser localStorage.
 */
export function clearHouseholdProfile(): void {
  if (typeof window !== "undefined") {
    try {
      window.localStorage.removeItem(STORAGE_KEY_HOUSEHOLD_PROFILE);
      for (const legacyKey of LEGACY_STORAGE_KEYS) {
        window.localStorage.removeItem(legacyKey);
      }
      window.dispatchEvent(new Event("aeris_profile_updated"));
    } catch {
      // storage unavailable
    }
  }
}

/**
 * useSyncExternalStore subscribe function for reactive household profile state.
 */
export function subscribeToHouseholdProfile(callback: () => void): () => void {
  if (typeof window === "undefined") {
    return () => {};
  }
  window.addEventListener("storage", callback);
  window.addEventListener("aeris_profile_updated", callback);
  return () => {
    window.removeEventListener("storage", callback);
    window.removeEventListener("aeris_profile_updated", callback);
  };
}

/**
 * Client snapshot for useSyncExternalStore.
 */
export function getHouseholdProfileSnapshot(): string | null {
  if (typeof window === "undefined") {
    return null;
  }
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY_HOUSEHOLD_PROFILE);
    if (raw && raw.trim() && raw.trim() !== "undefined" && raw.trim() !== "null") {
      return raw;
    }
    for (const legacyKey of LEGACY_STORAGE_KEYS) {
      const legacyRaw = window.localStorage.getItem(legacyKey);
      if (
        legacyRaw &&
        legacyRaw.trim() &&
        legacyRaw.trim() !== "undefined" &&
        legacyRaw.trim() !== "null"
      ) {
        return legacyRaw;
      }
    }
    return null;
  } catch {
    return null;
  }
}

/**
 * Server snapshot for useSyncExternalStore.
 */
export function getHouseholdProfileServerSnapshot(): null {
  return null;
}
