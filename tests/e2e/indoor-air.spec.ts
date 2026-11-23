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
    temperatureC: 38.0,
    apparentTemperatureC: 41.0,
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
      validity: {
        isRegulatoryValid: false,
        pollutantCount: 2,
        hasPm: true,
        disclaimer: "Modeled CPCB AQI Estimate.",
      },
    },
  },
  pollutants: [
    {
      code: "pm2_5",
      name: "PM2.5",
      unit: "µg/m³",
      value: 110.0,
      averagingPeriod: "1-hour instantaneous",
      status: "available",
    },
    {
      code: "pm10",
      name: "PM10",
      unit: "µg/m³",
      value: 180.0,
      averagingPeriod: "1-hour instantaneous",
      status: "available",
    },
  ],
  hourlyForecast: [],
  disclaimer: "Modeled CPCB AQI Estimate.",
};

test.describe("Indoor Air Coach Page", () => {
  test.beforeEach(async ({ page }) => {
    await page.route("**/api/telemetry*", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(MOCK_TELEMETRY),
      });
    });
  });

  test("loads indoor air coach page and verifies scientific layout", async ({ page }) => {
    await page.goto("/indoor-air");

    // Header & Title
    await expect(page.getByText("Indoor Air Coach").first()).toBeVisible();

    // Verification of measured vs unmeasured disclaimer
    await expect(page.getByText("Indoor PM2.5 not measured")).toBeVisible();
    await expect(page.getByText(/Notice: Unmeasured Estimate & Illustrative Sensitivity Exercise/i)).toBeVisible();
    await expect(page.getByText(/never a personalized prediction interval/i)).toBeVisible();

    // Outdoor vs Indoor cards
    await expect(page.getByText("Outdoor Ambient Air")).toBeVisible();
    await expect(page.getByText("Indoor Status")).toBeVisible();

    // Purifier sizing widget
    await expect(
      page.getByRole("heading", { name: "Budget-Aware Purifier Sizing & Cost Advisor" })
    ).toBeVisible();
    await expect(page.getByText("Target Clean Air Rate")).toBeVisible();
    await expect(page.getByText("EPA 2/3 Benchmark")).toBeVisible();
  });

  test("adjusts room dimensions and toggles measurement unit", async ({ page }) => {
    await page.goto("/indoor-air");

    // Verify initial metric values (Length input)
    const lengthInput = page.locator("input[type='number']").first();
    await expect(lengthInput).toBeVisible();

    // Toggle unit to feet
    const feetBtn = page.getByRole("button", { name: "Feet (ft)" });
    await feetBtn.click();

    // Unit toggle updates inputs and displays imperial units
    await expect(page.getByText(/cu ft/i)).toBeVisible();
  });

  test("triggers heat stress override when thermal comfort is set to dangerously hot", async ({ page }) => {
    await page.goto("/indoor-air");

    // Select "Too Hot (Heat Stress Risk)" from thermal sensation select dropdown
    const thermalSelect = page.locator("select").nth(2);
    await thermalSelect.selectOption("too_hot");

    // Heat stress override recommendation must appear
    await expect(page.getByText(/Heat Stress Safety Override/i)).toBeVisible();
  });

  test("supports dark mode toggle", async ({ page }) => {
    await page.goto("/indoor-air");

    const themeToggleBtn = page.getByRole("button", { name: /switch to dark theme/i });
    await themeToggleBtn.click();

    const html = page.locator("html");
    await expect(html).toHaveClass(/dark/);
  });
});
