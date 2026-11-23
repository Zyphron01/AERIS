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

const MOCK_PROFILE = {
  id: "profile-test-assistant",
  members: ["adults", "children"],
  declaredSensitivity: "respiratory_asthma",
  primaryCommute: "active_walking_biking",
  outdoorExercise: "early_morning",
  hasSchoolRoutine: true,
  filtration: "hepa_purifier",
  ventilationPreference: "natural_windows",
  indoorSources: ["cooking_fumes"],
  budgetPreference: "limited",
  updatedAt: "2026-11-21T06:00:00Z",
};

const MOCK_EXPLANATION_RESPONSE = {
  status: "success",
  attributionLabel: "AI-generated explanation",
  language: "en",
  generatedAt: "2026-11-21T06:00:00Z",
  disclaimer: "Non-clinical health guidance",
  trustedMetadata: {
    actionId: "rec-morning-exercise-shift",
    category: "outdoor_activity",
    priority: "urgent",
    applicableRuleId: "AERIS-RULE-EXERCISE-DISPERSION-02",
    evidenceReferences: [
      "WHO Global Air Quality Guidelines (2021)",
      "CPCB National Air Quality Index Documentation (2014)",
    ],
    cpcbAqiCategory: "Poor",
    cpcbAqiValue: 260,
    pm25Value: 110,
    isModelEstimate: true,
    sourceValidityTimestamp: "2026-11-21T06:00:00Z",
  },
  explanation: {
    headline: "Shift Aerobic Exercise to Afternoon Window (URGENT Priority)",
    actionBreakdown: "Relocate morning run or vigorous activity indoors, or delay until after 14:00.",
    whyThisMatters: "Cool morning ground-level thermal inversions trap particulates near street level.",
    microclimateContext: "Current ambient PM2.5 is 110 µg/m³ with CPCB Poor AQI.",
  },
};

test.describe("AERIS Milestone 4: Gemini Air Intelligence E2E Suite", () => {
  test.beforeEach(async ({ page }) => {
    // Mock telemetry endpoint
    await page.route("**/api/telemetry*", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(MOCK_TELEMETRY),
      });
    });

    // Mock AI explanation endpoint
    await page.route("**/api/assistant/explain*", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(MOCK_EXPLANATION_RESPONSE),
      });
    });

    // Navigate and set active household profile
    await page.goto("/daily-plan");
    await page.evaluate((profile) => {
      window.localStorage.setItem("aeris_household_profile_v1", JSON.stringify(profile));
      window.dispatchEvent(new Event("aeris_profile_updated"));
    }, MOCK_PROFILE);
    await page.reload();
  });

  test("opens AI explanation drawer, displays verified explanation and citations, and closes cleanly", async ({
    page,
  }) => {
    // Verify recommendations are loaded
    await expect(page.getByRole("heading", { name: "Top Ranked Action Plan" })).toBeVisible();

    // Click "Explain with AI" on the first recommendation
    const explainAiBtn = page.getByRole("button", { name: /Explain .* with AI/i }).first();
    await expect(explainAiBtn).toBeVisible();
    await explainAiBtn.click();

    // Verify drawer slides in
    const drawer = page.getByRole("dialog");
    await expect(drawer).toBeVisible();
    await expect(drawer.getByRole("heading", { name: "AERIS Air Intelligence" })).toBeVisible();

    // Verify truthfulness UI labeling
    await expect(drawer.getByText("AI-generated explanation")).toBeVisible();

    // Verify deterministic citations are distinct from model output
    await expect(drawer.getByText("Authoritative Scientific Citations:")).toBeVisible();
    await expect(drawer.getByText("WHO Global Air Quality Guidelines (2021)")).toBeVisible();

    // Verify non-clinical guidance notice
    await expect(drawer.getByText(/Non-clinical health guidance/i)).toBeVisible();

    // Toggle language to Hindi
    const hindiBtn = drawer.getByRole("button", { name: /Switch to Hindi language/i });
    await expect(hindiBtn).toBeVisible();
    await hindiBtn.click();

    // Close drawer via close button
    const closeBtn = drawer.getByRole("button", { name: /Close assistant drawer/i });
    await closeBtn.click();

    // Verify drawer is closed
    await expect(drawer).not.toBeVisible();
  });

  test("closes AI explanation drawer on Escape key press", async ({ page }) => {
    const explainAiBtn = page.getByRole("button", { name: /Explain .* with AI/i }).first();
    await explainAiBtn.click();
    await expect(page.getByRole("heading", { name: "AERIS Air Intelligence" })).toBeVisible();

    // Press Escape
    await page.keyboard.press("Escape");
    await expect(page.getByRole("heading", { name: "AERIS Air Intelligence" })).not.toBeVisible();
  });
});
