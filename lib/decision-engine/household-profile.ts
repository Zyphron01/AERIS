/**
 * AERIS — Household Profile Storage & Validation Utilities
 * Pure client-side persistence adhering to privacy-by-design standards.
 * Zero personal identifiers, zero medical diagnoses, zero server-side health tracking.
 */

import { HouseholdProfileSchema } from "./schemas";
import type { HouseholdProfile } from "./types";

export const STORAGE_KEY_HOUSEHOLD_PROFILE = "aeris_household_profile_v1";

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
 * Retrieves the stored household profile from browser localStorage.
 * Returns null if not present, unparseable, or invalid according to Zod schema.
 */
export function getStoredHouseholdProfile(): HouseholdProfile | null {
  if (typeof window === "undefined") {
    return null;
  }

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY_HOUSEHOLD_PROFILE);
    if (!raw) {
      return null;
    }

    const parsedJson = JSON.parse(raw);
    const validated = HouseholdProfileSchema.safeParse(parsedJson);
    if (validated.success) {
      return validated.data;
    }

    console.warn("Stored household profile failed schema validation:", validated.error.format());
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
    window.localStorage.removeItem(STORAGE_KEY_HOUSEHOLD_PROFILE);
    window.dispatchEvent(new Event("aeris_profile_updated"));
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
  return window.localStorage.getItem(STORAGE_KEY_HOUSEHOLD_PROFILE);
}

/**
 * Server snapshot for useSyncExternalStore.
 */
export function getHouseholdProfileServerSnapshot(): null {
  return null;
}
