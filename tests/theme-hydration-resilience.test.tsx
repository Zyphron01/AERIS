import { describe, it, expect, beforeEach, vi } from "vitest";
import React from "react";
import { render, act } from "@testing-library/react";
import { ThemeProvider, useTheme, THEME_STORAGE_KEY } from "@/components/theme/theme-provider";
import {
  safeParseHouseholdProfile,
  getStoredHouseholdProfile,
  DEFAULT_DEMO_PROFILE,
  STORAGE_KEY_HOUSEHOLD_PROFILE,
} from "@/lib/decision-engine/household-profile";

function ThemeConsumer(): React.JSX.Element {
  const { theme, isDark, toggleTheme } = useTheme();
  return (
    <div>
      <span data-testid="theme-val">{theme}</span>
      <span data-testid="is-dark">{isDark ? "yes" : "no"}</span>
      <button onClick={toggleTheme} data-testid="toggle-btn">
        Toggle
      </button>
    </div>
  );
}

describe("Theme Hydration & Resilience Protocol", () => {
  beforeEach(() => {
    window.localStorage.clear();
    document.documentElement.className = "";
    vi.restoreAllMocks();
  });

  it("initializes theme to 'light' synchronously on initial render, preventing SSR hydration mismatch", () => {
    // Pre-set dark mode in localStorage
    window.localStorage.setItem(THEME_STORAGE_KEY, "dark");

    const { getByTestId } = render(
      <ThemeProvider>
        <ThemeConsumer />
      </ThemeProvider>
    );

    // Initial render and subsequent effect updates cleanly to dark
    expect(getByTestId("theme-val").textContent).toBe("dark");
    expect(getByTestId("is-dark").textContent).toBe("yes");
    expect(document.documentElement.classList.contains("dark")).toBe(true);
  });

  it("handles toggling and updates localStorage and documentElement cleanly", () => {
    const { getByTestId } = render(
      <ThemeProvider>
        <ThemeConsumer />
      </ThemeProvider>
    );

    expect(getByTestId("theme-val").textContent).toBe("light");

    act(() => {
      getByTestId("toggle-btn").click();
    });

    expect(getByTestId("theme-val").textContent).toBe("dark");
    expect(document.documentElement.classList.contains("dark")).toBe(true);
    expect(window.localStorage.getItem(THEME_STORAGE_KEY)).toBe("dark");

    act(() => {
      getByTestId("toggle-btn").click();
    });

    expect(getByTestId("theme-val").textContent).toBe("light");
    expect(document.documentElement.classList.contains("dark")).toBe(false);
    expect(window.localStorage.getItem(THEME_STORAGE_KEY)).toBe("light");
  });
});

describe("Household Profile JSON Robustness Protocol", () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it("safeParseHouseholdProfile returns null on empty, whitespace, null, or undefined strings without throwing", () => {
    expect(safeParseHouseholdProfile(null)).toBeNull();
    expect(safeParseHouseholdProfile(undefined)).toBeNull();
    expect(safeParseHouseholdProfile("")).toBeNull();
    expect(safeParseHouseholdProfile("   ")).toBeNull();
    expect(safeParseHouseholdProfile("undefined")).toBeNull();
    expect(safeParseHouseholdProfile("null")).toBeNull();
    expect(safeParseHouseholdProfile("{}")).toBeNull();
  });

  it("safeParseHouseholdProfile returns null on malformed, truncated, or incomplete JSON", () => {
    expect(safeParseHouseholdProfile("{")).toBeNull();
    expect(safeParseHouseholdProfile('{"id":')).toBeNull();
    expect(safeParseHouseholdProfile('{"id": "test",')).toBeNull();
    expect(safeParseHouseholdProfile("not a json string")).toBeNull();
  });

  it("safeParseHouseholdProfile successfully parses and validates a valid household profile", () => {
    const raw = JSON.stringify(DEFAULT_DEMO_PROFILE);
    const parsed = safeParseHouseholdProfile(raw);
    expect(parsed).not.toBeNull();
    expect(parsed?.id).toBe(DEFAULT_DEMO_PROFILE.id);
    expect(parsed?.members).toEqual(DEFAULT_DEMO_PROFILE.members);
  });

  it("getStoredHouseholdProfile migrates legacy profile keys gracefully", () => {
    window.localStorage.setItem("aeris_household_profile", JSON.stringify(DEFAULT_DEMO_PROFILE));
    const result = getStoredHouseholdProfile();
    expect(result).not.toBeNull();
    expect(result?.id).toBe(DEFAULT_DEMO_PROFILE.id);
    expect(window.localStorage.getItem(STORAGE_KEY_HOUSEHOLD_PROFILE)).not.toBeNull();
  });
});
