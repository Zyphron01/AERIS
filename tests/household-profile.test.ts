import { describe, it, expect, beforeEach, vi } from "vitest";
import {
  HouseholdProfileSchema,
} from "@/lib/decision-engine/schemas";
import {
  getStoredHouseholdProfile,
  saveHouseholdProfile,
  clearHouseholdProfile,
  DEFAULT_DEMO_PROFILE,
  STORAGE_KEY_HOUSEHOLD_PROFILE,
} from "@/lib/decision-engine/household-profile";

describe("Household Profile Validation & Storage Protocols", () => {
  beforeEach(() => {
    // Clear localStorage mock
    window.localStorage.clear();
    vi.restoreAllMocks();
  });

  describe("HouseholdProfileSchema (Zod)", () => {
    it("validates a complete, compliant household profile", () => {
      const validProfile = {
        id: "profile-123",
        members: ["adults", "children"],
        declaredSensitivity: "respiratory_asthma",
        primaryCommute: "active_walking_biking",
        outdoorExercise: "early_morning",
        hasSchoolRoutine: true,
        filtration: "hepa_purifier",
        ventilationPreference: "natural_windows",
        indoorSources: ["cooking_fumes"],
        budgetPreference: "limited",
        updatedAt: "2026-11-21T06:00:00.000Z",
      };

      const parsed = HouseholdProfileSchema.safeParse(validProfile);
      expect(parsed.success).toBe(true);
    });

    it("rejects profiles with zero household members", () => {
      const invalidProfile = {
        ...DEFAULT_DEMO_PROFILE,
        members: [], // empty
      };

      const parsed = HouseholdProfileSchema.safeParse(invalidProfile);
      expect(parsed.success).toBe(false);
      if (!parsed.success) {
        expect(parsed.error.issues[0].message).toContain("at least one");
      }
    });

    it("rejects profiles with unapproved enum values", () => {
      const invalidProfile = {
        ...DEFAULT_DEMO_PROFILE,
        declaredSensitivity: "severe_chronic_illness", // invalid enum value
      };

      const parsed = HouseholdProfileSchema.safeParse(invalidProfile);
      expect(parsed.success).toBe(false);
    });

    it("applies default values for optional preferences", () => {
      const minimalProfile = {
        id: "minimal-1",
        members: ["adults"],
        updatedAt: "2026-11-21T06:00:00.000Z",
      };

      const parsed = HouseholdProfileSchema.safeParse(minimalProfile);
      expect(parsed.success).toBe(true);
      if (parsed.success) {
        expect(parsed.data.declaredSensitivity).toBe("none");
        expect(parsed.data.primaryCommute).toBe("public_transit");
        expect(parsed.data.filtration).toBe("none");
        expect(parsed.data.budgetPreference).toBe("no_cost");
      }
    });
  });

  describe("Client-Side Storage Operations", () => {
    it("returns null when no profile exists in localStorage", () => {
      const result = getStoredHouseholdProfile();
      expect(result).toBeNull();
    });

    it("saves and retrieves a valid household profile cleanly", () => {
      const saveResult = saveHouseholdProfile(DEFAULT_DEMO_PROFILE);
      expect(saveResult.success).toBe(true);
      expect(saveResult.data).toBeDefined();

      const retrieved = getStoredHouseholdProfile();
      expect(retrieved).not.toBeNull();
      expect(retrieved?.id).toBe(DEFAULT_DEMO_PROFILE.id);
      expect(retrieved?.members).toEqual(DEFAULT_DEMO_PROFILE.members);
    });

    it("clears stored profile cleanly", () => {
      saveHouseholdProfile(DEFAULT_DEMO_PROFILE);
      expect(getStoredHouseholdProfile()).not.toBeNull();

      clearHouseholdProfile();
      expect(getStoredHouseholdProfile()).toBeNull();
    });

    it("gracefully handles corrupted JSON and empty strings without throwing", () => {
      window.localStorage.setItem(STORAGE_KEY_HOUSEHOLD_PROFILE, "{invalid-json-data}");
      expect(getStoredHouseholdProfile()).toBeNull();

      window.localStorage.setItem(STORAGE_KEY_HOUSEHOLD_PROFILE, "");
      expect(getStoredHouseholdProfile()).toBeNull();

      window.localStorage.setItem(STORAGE_KEY_HOUSEHOLD_PROFILE, "   ");
      expect(getStoredHouseholdProfile()).toBeNull();

      window.localStorage.setItem(STORAGE_KEY_HOUSEHOLD_PROFILE, "undefined");
      expect(getStoredHouseholdProfile()).toBeNull();
    });

    it("migrates legacy profile keys to v1 key", () => {
      window.localStorage.setItem("aeris_household_profile", JSON.stringify(DEFAULT_DEMO_PROFILE));
      const retrieved = getStoredHouseholdProfile();
      expect(retrieved).not.toBeNull();
      expect(retrieved?.id).toBe(DEFAULT_DEMO_PROFILE.id);
      // Migrated to v1
      expect(window.localStorage.getItem(STORAGE_KEY_HOUSEHOLD_PROFILE)).not.toBeNull();
    });
  });
});
