import { test, expect } from "@playwright/test";

const MOCK_TELEMETRY = {
  location: {
    id: "delhi-ncr",
    name: "Delhi NCR",
    region: "NCR",
    country: "India",
    latitude: 28.6139,
    longitude: 77.209,
    timezone: "Asia/Kolkata",
    modelDomain: "CAMS Global",
  },
  source: "Open-Meteo Air Quality & Weather API (CAMS Global)",
  dataKind: "modeled/forecast",
  timestamp: "2026-11-21T06:00:00Z",
  retrievedAt: "2026-11-21T06:10:00Z",
  freshness: "fresh",
  freshnessExplanation: "Fresh: telemetry received within last 90 minutes.",
  weather: {
    temperatureC: 22.0,
    apparentTemperatureC: 22.0,
    relativeHumidityPercent: 65,
    windSpeedKmH: 6.0,
    windDirectionDegrees: 270,
    surfacePressureHPa: 1015,
    weatherCode: 1,
    weatherLabel: "Mainly Clear",
  },
  aqi: {
    usAqi: {
      standard: "US_EPA",
      name: "US EPA Air Quality Index",
      value: 175,
      category: "Unhealthy",
      scaleMin: 0,
      scaleMax: 500,
      colorClass: "text-rose-700 bg-rose-50",
      methodology: "modeled-forecast",
    },
    europeanAqi: {
      standard: "EU_EAQI",
      name: "European Air Quality Index",
      value: 4,
      category: "Poor",
      scaleMin: 1,
      scaleMax: 6,
      colorClass: "text-orange-700 bg-orange-50",
      methodology: "modeled-forecast",
    },
    cpcbAqi: {
      standard: "IN_CPCB",
      name: "Indian National AQI (CPCB Methodology)",
      value: 260,
      category: "Poor",
      dominantPollutant: "PM2.5",
      subIndices: {
        pm2_5: 260,
        pm10: 165,
      },
      scaleMin: 0,
      scaleMax: 500,
      colorClass: "text-orange-700 bg-orange-50",
      methodology: "model-derived-cpcb-method",
      calculationBasis: "Modeled CPCB-method estimate.",
    },
  },
  pollutants: [
    {
      code: "pm2_5",
      name: "PM2.5",
      value: 110.0,
      unit: "µg/m³",
      averagingPeriod: "24h",
      status: "available",
    },
    {
      code: "pm10",
      name: "PM10",
      value: 195.0,
      unit: "µg/m³",
      averagingPeriod: "24h",
      status: "available",
    },
  ],
  hourlyForecast: [
    {
      time: "2026-11-21T06:00:00Z",
      pm2_5: 110.0,
      pm10: 195.0,
      usAqi: 175,
      temperatureC: 22.0,
      humidityPercent: 65,
      windSpeedKmH: 6.0,
    },
    {
      time: "2026-11-21T14:00:00Z",
      pm2_5: 45.0,
      pm10: 85.0,
      usAqi: 120,
      temperatureC: 26.0,
      humidityPercent: 45,
      windSpeedKmH: 12.0,
    },
  ],
  disclaimer: "Modeled estimate.",
};

test.describe("AERIS Milestone 3: Personalized Daily Plan E2E Suite", () => {
  test.beforeEach(async ({ page }) => {
    // Deterministic mock for telemetry endpoint to prevent external 504 timeouts
    await page.route("**/api/telemetry*", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(MOCK_TELEMETRY),
      });
    });

    // Navigate and clear localStorage to ensure clean state
    await page.goto("/daily-plan");
    await page.evaluate(() => {
      window.localStorage.clear();
      window.dispatchEvent(new Event("aeris_profile_updated"));
    });
  });

  test("displays empty state onboarding prompt when no profile exists", async ({ page }) => {
    await page.goto("/daily-plan");

    // Header validation
    await expect(page.getByText("AERIS Daily Action Plan")).toBeVisible();
    await expect(page.locator("#city-selector-button")).toContainText("Delhi NCR");

    // Empty state banner
    await expect(page.getByText("Onboarding Step")).toBeVisible();
    await expect(
      page.getByRole("heading", { name: "Personalize your daily air-quality decisions." })
    ).toBeVisible();
    await expect(
      page.getByRole("main").getByRole("button", { name: /Set Up Household Profile/i })
    ).toBeVisible();
  });

  test("completes 4-step onboarding wizard and generates personalized ranked action plan", async ({ page }) => {
    await page.goto("/daily-plan");

    // Open Onboarding Wizard from main callout
    const setupBtn = page.getByRole("main").getByRole("button", { name: /Set Up Household Profile/i });
    await setupBtn.click();

    // Verify modal dialog
    const dialog = page.getByRole("dialog");
    await expect(dialog).toBeVisible();
    await expect(page.getByRole("heading", { name: "Who is in your household?" })).toBeVisible();
    await expect(page.getByText("Step 1 of 4")).toBeVisible();

    // Step 1: Select Children and Asthma Sensitivity
    await page.getByLabel("Children (2–17)").check();
    await page.getByLabel("Respiratory / Reactive Airways").check();
    await page.getByRole("button", { name: /^Next$/i }).click();

    // Step 2: Commute & Movement
    await expect(page.getByRole("heading", { name: "What are your daily movement patterns?" })).toBeVisible();
    await page.getByLabel("Walking / Cycling").check();
    await page.getByLabel("Early Morning (06:00–09:00)").check();
    await page.getByRole("button", { name: /^Next$/i }).click();

    // Step 3: Indoor Setup
    await expect(page.getByRole("heading", { name: "What does your indoor environment look like?" })).toBeVisible();
    await page.getByLabel("Portable HEPA Purifier").check();
    await page.getByRole("button", { name: /^Next$/i }).click();

    // Step 4: Budget & Practicality
    await expect(page.getByRole("heading", { name: "What is your practical budget for interventions?" })).toBeVisible();
    await page.getByLabel("Limited Budget (Consumables & Essentials)").check();

    // Submit Wizard
    await page.getByRole("button", { name: /Generate My Daily Plan/i }).click();

    // Modal should close
    await expect(dialog).not.toBeVisible();

    // Active Profile Bar should now be displayed
    await expect(page.getByText("Active Household Profile")).toBeVisible();
    await expect(page.getByText("Active (Walk/Bike)")).toBeVisible();
    await expect(page.getByText("HEPA Purifier")).toBeVisible();

    // Ambient context bar
    await expect(page.getByText("Delhi NCR Ambient Context:")).toBeVisible();

    // Today's Environmental Strategy
    await expect(page.getByRole("heading", { name: "Today's Environmental Strategy" })).toBeVisible();

    // Ranked Recommendations Section
    await expect(page.getByRole("heading", { name: "Top Ranked Action Plan" })).toBeVisible();

    // Verify at least one recommendation card is rendered
    const firstCard = page.locator("article").first();
    await expect(firstCard).toBeVisible();
    await expect(firstCard.getByText("#1")).toBeVisible();

    // Expand Plan B Alternative if present
    const planBTrigger = firstCard.getByRole("button", { name: /View Plan B/i });
    if (await planBTrigger.isVisible()) {
      await planBTrigger.click();
      await expect(firstCard.getByText(/Plan B — Conditional Forecast Alternative/i)).toBeVisible();
      await expect(firstCard.getByText(/Alternative Action/i)).toBeVisible();
    }

    // Expand "Why am I seeing this?"
    const explanationTrigger = firstCard.getByRole("button", { name: /Why am I seeing this\?/i });
    await expect(explanationTrigger).toBeVisible();
    await explanationTrigger.click();
    await expect(firstCard.getByText(/Decision Audit Trail/i)).toBeVisible();
    await expect(firstCard.getByText(/Rule Triggered:/i)).toBeVisible();
  });

  test("allows clearing the profile to reset to initial onboarding state", async ({ page }) => {
    // Seed localStorage with a demo profile
    await page.goto("/daily-plan");
    await page.evaluate(() => {
      window.localStorage.setItem(
        "aeris_household_profile_v1",
        JSON.stringify({
          id: "test-stored-profile",
          members: ["adults"],
          declaredSensitivity: "none",
          primaryCommute: "public_transit",
          outdoorExercise: "afternoon",
          hasSchoolRoutine: false,
          filtration: "none",
          ventilationPreference: "natural_windows",
          indoorSources: [],
          budgetPreference: "limited",
          updatedAt: new Date().toISOString(),
        })
      );
      window.dispatchEvent(new Event("aeris_profile_updated"));
    });

    // Active Profile should be visible
    await expect(page.getByText("Active Household Profile")).toBeVisible();

    // Clear Profile
    const clearBtn = page.getByRole("button", { name: /Clear/i });
    await expect(clearBtn).toBeVisible();
    await clearBtn.click();

    // Should return to empty state onboarding callout
    await expect(
      page.getByRole("heading", { name: "Personalize your daily air-quality decisions." })
    ).toBeVisible();
  });
});
