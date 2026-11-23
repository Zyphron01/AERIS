import { test, expect } from "@playwright/test";
import path from "path";

const ASSETS_DIR = path.resolve(process.cwd(), "docs/assets");

const MOCK_PROFILE = {
  id: "delhi-family-profile",
  members: ["adults", "children", "elderly"],
  declaredSensitivity: "respiratory_asthma",
  primaryCommute: "active_walking_biking",
  outdoorExercise: "early_morning",
  hasSchoolRoutine: true,
  filtration: "hepa_purifier",
  ventilationPreference: "natural_windows",
  indoorSources: ["cooking_fumes"],
  budgetPreference: "moderate",
  updatedAt: new Date().toISOString(),
};

const MOCK_TELEMETRY = {
  location: {
    id: "delhi-ncr",
    name: "Delhi NCR",
    region: "National Capital Region",
    country: "India",
    latitude: 28.6139,
    longitude: 77.209,
    timezone: "Asia/Kolkata",
    modelDomain: "CAMS Global",
  },
  source: "Open-Meteo Air Quality & Weather API (CAMS Global)",
  dataKind: "modeled/forecast",
  timestamp: new Date().toISOString(),
  retrievedAt: new Date().toISOString(),
  freshness: "fresh",
  freshnessExplanation: "Live atmospheric telemetry: synchronized within active 90-minute model window.",
  disclaimer: "Modeled atmospheric guidance calibrated with CPCB, EPA, and EEA breakpoints. Not certified station measurements.",
  weather: {
    temperatureC: 24.5,
    apparentTemperatureC: 24.5,
    relativeHumidityPercent: 58,
    windSpeedKmH: 8.5,
    windDirectionDegrees: 285,
    surfacePressureHPa: 1013,
    weatherCode: 1,
    weatherLabel: "Mainly Clear",
  },
  aqi: {
    usAqi: {
      standard: "US_EPA",
      name: "US EPA Air Quality Index",
      value: 172,
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
      value: 254,
      category: "Poor",
      dominantPollutant: "PM2.5",
      subIndices: {
        pm2_5: 254,
        pm10: 160,
      },
      scaleMin: 0,
      scaleMax: 500,
      colorClass: "text-orange-700 bg-orange-50",
      methodology: "model-derived-cpcb-method",
      calculationBasis: "Modeled CPCB-method estimate with 24h rolling concentrations.",
    },
  },
  pollutants: [
    {
      code: "pm2_5",
      name: "PM2.5",
      value: 107.0,
      unit: "µg/m³",
      averagingPeriod: "24h",
      status: "available",
    },
    {
      code: "pm10",
      name: "PM10",
      value: 188.0,
      unit: "µg/m³",
      averagingPeriod: "24h",
      status: "available",
    },
    {
      code: "no2",
      name: "Nitrogen Dioxide (NO₂)",
      value: 42.0,
      unit: "µg/m³",
      averagingPeriod: "1h",
      status: "available",
    },
    {
      code: "o3",
      name: "Ozone (O₃)",
      value: 68.0,
      unit: "µg/m³",
      averagingPeriod: "8h",
      status: "available",
    },
    {
      code: "so2",
      name: "Sulfur Dioxide (SO₂)",
      value: 14.0,
      unit: "µg/m³",
      averagingPeriod: "24h",
      status: "available",
    },
    {
      code: "co",
      name: "Carbon Monoxide (CO)",
      value: 820.0,
      unit: "µg/m³",
      averagingPeriod: "8h",
      status: "available",
    },
  ],
  hourlyForecast: Array.from({ length: 24 }, (_, i) => {
    const d = new Date();
    d.setHours(d.getHours() + i);
    return {
      time: d.toISOString(),
      pm2_5: Math.round(90 + Math.sin(i * 0.4) * 35),
      pm10: Math.round(150 + Math.sin(i * 0.4) * 45),
      usAqi: Math.round(140 + Math.sin(i * 0.4) * 35),
      temperatureC: Math.round(20 + Math.cos(i * 0.3) * 6),
      humidityPercent: Math.round(55 + Math.sin(i * 0.3) * 15),
      windSpeedKmH: Math.round(7 + Math.cos(i * 0.5) * 5),
    };
  }),
};

const MOCK_AI_EXPLANATION = {
  status: "success",
  attributionLabel: "AI-generated contextual explanation powered by Google Gemini",
  language: "en",
  generatedAt: new Date().toISOString(),
  disclaimer: "Non-clinical environmental decision support. Consult medical professionals for clinical diagnosis.",
  trustedMetadata: {
    actionId: "outdoor-exercise-reschedule",
    category: "outdoor_activity",
    priority: "urgent",
    applicableRuleId: "AERIS-RULE-EXERCISE-DISPERSION-02",
    evidenceReferences: [
      "WHO Global Air Quality Guidelines (2021) — Section 3.2 Particulate Inhalation Rates",
      "CPCB National Air Quality Index (2014) — Vulnerable Group Activity Thresholds",
    ],
    cpcbAqiCategory: "Poor",
    cpcbAqiValue: 254,
    pm25Value: 107,
    isModelEstimate: true,
    sourceValidityTimestamp: new Date().toISOString(),
  },
  explanation: {
    headline: "Shift Morning Workout to Afternoon or Indoor Alternative (Urgent Priority)",
    actionBreakdown: "Reschedule early morning jog to midday (12:30–15:30) or exercise indoors in a HEPA-filtered room.",
    whyThisMatters: "Early morning radiation inversions trap fine particulates (PM2.5 107 µg/m³) within 50 meters of the surface. Vigorous aerobic breathing increases particulate intake into the alveoli up to 4.2-fold compared to rest.",
    microclimateContext: "Current regional CPCB AQI is 254 (Poor). Solar surface warming will expand the planetary boundary layer by 12:30, dispersing trapped ground-level particulate concentrations.",
  },
};

test.describe("AERIS README Gallery Production Capture", () => {
  test.beforeEach(async ({ page }) => {
    test.setTimeout(90000);

    page.on("dialog", async (dialog) => {
      await dialog.dismiss().catch(() => {});
    });

    // Disable smooth scrolling in test runs to prevent actionability delays
    await page.addInitScript(() => {
      const style = document.createElement("style");
      style.textContent = "* { scroll-behavior: auto !important; }";
      document.head?.appendChild(style);
    });

    page.on("console", (msg) => {
      console.log(`[Browser Console ${msg.type()}]: ${msg.text()}`);
    });
    page.on("pageerror", (err) => {
      console.error(`[Browser PageError]:`, err);
    });

    await page.route("**/api/telemetry*", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(MOCK_TELEMETRY),
      });
    });

    await page.route("**/api/assistant/explain*", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(MOCK_AI_EXPLANATION),
      });
    });
  });

  test("1. Capture Homepage Hero (Light & Dark)", async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto("/");
    await page.waitForLoadState("load");
    await page.waitForTimeout(2000);

    const root = page.locator(".sh-root");

    // Swirl particles
    await root.dispatchEvent("pointermove", { clientX: 720, clientY: 450 });
    await page.waitForTimeout(800);

    // Capture Light Mode Hero
    await page.screenshot({
      path: path.join(ASSETS_DIR, "homepage-hero-light.png"),
      clip: { x: 0, y: 0, width: 1440, height: 860 },
    });

    // Toggle to Dark Mode
    const themeBtn = page.getByRole("button", { name: /Switch to (dark|light) theme/i }).first();
    await themeBtn.click({ force: true });
    await page.waitForTimeout(1500);

    // Swirl particles in dark mode
    await root.dispatchEvent("pointermove", { clientX: 750, clientY: 420 });
    await page.waitForTimeout(800);

    // Capture Dark Mode Hero
    await page.screenshot({
      path: path.join(ASSETS_DIR, "homepage-hero-dark.png"),
      clip: { x: 0, y: 0, width: 1440, height: 860 },
    });
  });

  test("2. Capture Live Air Monitor Dashboard", async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto("/dashboard", { waitUntil: "domcontentloaded" });
    await expect(page.getByRole("heading", { name: /AERIS Live Air Monitor/i })).toBeVisible({ timeout: 10000 });
    await page.waitForTimeout(800);

    await page.screenshot({
      path: path.join(ASSETS_DIR, "air-monitor-dashboard.png"),
      clip: { x: 0, y: 0, width: 1440, height: 900 },
    });
  });

  test("3. Capture Personalized Daily Action Plan with AI Drawer", async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    // Pre-seed localStorage before navigation
    await page.addInitScript((profile) => {
      window.localStorage.setItem("aeris_household_profile_v1", JSON.stringify(profile));
    }, MOCK_PROFILE);

    await page.goto("/daily-plan", { waitUntil: "domcontentloaded" });
    await expect(page.locator("header")).toBeVisible({ timeout: 15000 });
    await page.waitForTimeout(1000);

    // Expand AI Explanation Drawer
    const explainBtn = page.getByRole("button", { name: /Explain .* with AI/i }).first();
    if (await explainBtn.isVisible()) {
      await explainBtn.click({ force: true });
      await expect(page.getByRole("dialog")).toBeVisible({ timeout: 5000 });
      await page.waitForTimeout(800);
    }

    await page.screenshot({
      path: path.join(ASSETS_DIR, "daily-action-plan.png"),
      clip: { x: 0, y: 0, width: 1440, height: 900 },
    });
  });

  test("4. Capture Indoor Air Coach", async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto("/indoor-air", { waitUntil: "domcontentloaded" });
    await expect(page.getByRole("heading", { name: /Indoor Air Coach/i })).toBeVisible({ timeout: 10000 });
    await page.waitForTimeout(800);

    await page.screenshot({
      path: path.join(ASSETS_DIR, "indoor-air-coach.png"),
      clip: { x: 0, y: 0, width: 1440, height: 900 },
    });
  });

  test("5. Capture What-If Scenario Simulator & Decision Receipt", async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto("/scenarios", { waitUntil: "domcontentloaded" });
    await expect(page.getByRole("heading", { name: /What-If Scenario Simulator/i })).toBeVisible({ timeout: 10000 });
    await page.waitForTimeout(800);

    // Capture main scenarios dashboard
    await page.screenshot({
      path: path.join(ASSETS_DIR, "what-if-scenarios.png"),
      clip: { x: 0, y: 0, width: 1440, height: 900 },
    });

    // Capture Decision Receipt card specifically
    const receiptCard = page.locator("section:has-text('Decision Receipt'), div:has-text('Deterministic Decision Receipt')").first();
    if (await receiptCard.isVisible()) {
      await receiptCard.scrollIntoViewIfNeeded();
      await page.waitForTimeout(400);
      await receiptCard.screenshot({
        path: path.join(ASSETS_DIR, "decision-receipt.png"),
      });
    } else {
      // Fallback capture of scenarios comparison panel
      await page.screenshot({
        path: path.join(ASSETS_DIR, "decision-receipt.png"),
        clip: { x: 400, y: 100, width: 950, height: 750 },
      });
    }
  });

  test("6. Capture Optional Supabase Cloud Saving & Auth Interface", async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto("/daily-plan", { waitUntil: "domcontentloaded" });

    // Open Auth modal
    const authBtn = page.getByRole("button", { name: /Sign In|Cloud Save|Save Plan/i }).first();
    if (await authBtn.isVisible()) {
      await authBtn.click({ force: true });
      await page.waitForTimeout(600);
    } else {
      // Open via evaluation if button text differs
      await page.evaluate(() => {
        const btn = document.querySelector("button[aria-label*='Sign In'], button[aria-label*='Save']") as HTMLButtonElement | null;
        btn?.click();
      });
      await page.waitForTimeout(600);
    }

    await page.screenshot({
      path: path.join(ASSETS_DIR, "cloud-saving-interface.png"),
      clip: { x: 0, y: 0, width: 1440, height: 900 },
    });
  });

  test("7. Capture Mobile Views", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });

    // Mobile Air Monitor
    await page.goto("/dashboard", { waitUntil: "domcontentloaded" });
    await page.waitForTimeout(800);
    await page.screenshot({
      path: path.join(ASSETS_DIR, "mobile-air-monitor.png"),
      clip: { x: 0, y: 0, width: 390, height: 844 },
    });

    // Mobile Daily Plan
    await page.goto("/daily-plan", { waitUntil: "domcontentloaded" });
    await page.evaluate((profile) => {
      window.localStorage.setItem("aeris_household_profile_v1", JSON.stringify(profile));
      window.dispatchEvent(new Event("aeris_profile_updated"));
    }, MOCK_PROFILE);
    await page.reload({ waitUntil: "domcontentloaded" });
    await page.waitForTimeout(800);

    await page.screenshot({
      path: path.join(ASSETS_DIR, "mobile-daily-plan.png"),
      clip: { x: 0, y: 0, width: 390, height: 844 },
    });
  });
});
