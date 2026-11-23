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
  timestamp: "2026-11-22T06:00:00Z",
  retrievedAt: "2026-11-22T06:10:00Z",
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
    usAqi: { standard: "US_EPA", name: "US EPA AQI", value: 175, category: "Unhealthy", scaleMin: 0, scaleMax: 500, colorClass: "text-rose-700 bg-rose-50", methodology: "modeled-forecast" },
    europeanAqi: { standard: "EU_EAQI", name: "EU AQI", value: 4, category: "Poor", scaleMin: 1, scaleMax: 6, colorClass: "text-orange-700 bg-orange-50", methodology: "modeled-forecast" },
    cpcbAqi: { standard: "IN_CPCB", name: "Indian National AQI", value: 260, category: "Poor", dominantPollutant: "PM2.5", scaleMin: 0, scaleMax: 500, colorClass: "text-orange-700 bg-orange-50", methodology: "model-derived-cpcb-method" },
  },
  pollutants: [
    { code: "pm2_5", name: "PM2.5", unit: "µg/m³", value: 110.0, averagingPeriod: "1-hour instantaneous", status: "available" },
  ],
  hourlyForecast: [
    { time: "2026-11-22T06:00:00Z", pm2_5: 140, pm10: 220, usAqi: 195, temperatureC: 18, humidityPercent: 75, windSpeedKmH: 4 },
    { time: "2026-11-22T08:00:00Z", pm2_5: 120, pm10: 190, usAqi: 184, temperatureC: 20, humidityPercent: 68, windSpeedKmH: 6 },
    { time: "2026-11-22T13:00:00Z", pm2_5: 65, pm10: 110, usAqi: 156, temperatureC: 26, humidityPercent: 45, windSpeedKmH: 12 },
    { time: "2026-11-22T17:00:00Z", pm2_5: 95, pm10: 160, usAqi: 172, temperatureC: 24, humidityPercent: 55, windSpeedKmH: 8 },
    { time: "2026-11-22T19:00:00Z", pm2_5: 160, pm10: 250, usAqi: 210, temperatureC: 21, humidityPercent: 65, windSpeedKmH: 5 },
  ],
  disclaimer: "Modeled CPCB AQI Estimate.",
};

test.describe("What-If Scenario Simulator Page (/scenarios)", () => {
  test.beforeEach(async ({ page }) => {
    await page.route("**/api/telemetry*", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(MOCK_TELEMETRY),
      });
    });
  });

  test("loads scenario simulator and verifies header, tabs, and decision receipt", async ({ page }) => {
    await page.goto("/scenarios");

    // Header & Title
    await expect(page.getByRole("heading", { level: 1 })).toContainText("What-If Scenario Simulator");

    // Navigation back link
    const backLink = page.getByRole("link", { name: /Back to Home/i });
    await expect(backLink).toBeVisible();

    // 4 Scenario tabs
    await expect(page.getByRole("tab", { name: /Outdoor Timing/i })).toBeVisible();
    await expect(page.getByRole("tab", { name: /Indoor vs. Outdoor/i })).toBeVisible();
    await expect(page.getByRole("tab", { name: /Commute Modality/i })).toBeVisible();
    await expect(page.getByRole("tab", { name: /Filtration Sizing/i })).toBeVisible();

    // Decision Receipt card
    await expect(page.getByText(/Decision Receipt/i).first()).toBeVisible();
    await expect(page.getByRole("button", { name: /Copy decision receipt text/i })).toBeVisible();

    // Low emission card
    await expect(page.getByText("Sustainable Choice & Clean Air Synergy")).toBeVisible();
  });

  test("switches between scenario tabs and verifies dynamic panel rendering", async ({ page }) => {
    await page.goto("/scenarios");

    // 1. Switch to Indoor vs Outdoor
    await page.getByRole("tab", { name: /Indoor vs. Outdoor/i }).click();
    await expect(page.getByText("Indoor Microclimate vs. Outdoor Ambient Air")).toBeVisible();
    await expect(page.getByText(/Per AERIS Rule 10, indoor PM2.5 is NOT assigned a fabricated sensor number/i)).toBeVisible();

    // 2. Switch to Commute Modality
    await page.getByRole("tab", { name: /Commute Modality/i }).click();
    await expect(page.getByRole("heading", { name: "Commute Modality & Physical Barrier Comparison" })).toBeVisible();
    await expect(page.getByLabel("Baseline Commute Mode")).toBeVisible();
    await expect(page.getByLabel("Alternative Modality to Test")).toBeVisible();

    // 3. Switch to Filtration Sizing
    await page.getByRole("tab", { name: /Filtration Sizing/i }).click();
    await expect(page.getByRole("heading", { name: "Mechanical Filtration Sizing & Air Exchange Simulation" })).toBeVisible();
    await expect(page.getByText("Hypothetical Simulation")).toBeVisible();
    await expect(page.getByText(/ACH/i).first()).toBeVisible();
  });

  test("adjusts outdoor timing hours and verifies environmental delta updates", async ({ page }) => {
    await page.goto("/scenarios");

    // Change baseline hour to 06:00 and alternative to 13:00 (midday)
    const selects = page.locator("select");
    const baselineSelect = selects.nth(1); // 0 is city, 1 is baseline hour, 2 is alt hour
    await baselineSelect.selectOption({ index: 0 }); // 06:00

    const altSelect = selects.nth(2);
    await altSelect.selectOption({ index: 2 }); // 13:00

    // Check delta summary
    await expect(page.getByText(/Environmental Delta Analysis/i)).toBeVisible();
    await expect(page.getByText(/lower ambient fine particulate concentration/i)).toBeVisible();
  });

  test("copies Decision Receipt to clipboard with visual confirmation", async ({ page, context }) => {
    await context.grantPermissions(["clipboard-read", "clipboard-write"]);
    await page.goto("/scenarios");

    const copyBtn = page.getByRole("button", { name: /Copy decision receipt text/i });
    await expect(copyBtn).toBeVisible();
    await copyBtn.click();

    // Check confirmation text
    await expect(page.getByText("Copied to Clipboard")).toBeVisible();
  });

  test("supports dark mode toggle smoothly", async ({ page }) => {
    await page.goto("/scenarios");

    const themeToggleBtn = page.getByRole("button", { name: /switch to dark theme/i });
    await themeToggleBtn.click();

    const html = page.locator("html");
    await expect(html).toHaveClass(/dark/);
  });
});
