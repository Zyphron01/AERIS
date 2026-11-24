import { test, expect, type Page } from "@playwright/test";
import path from "path";
import fs from "fs";

const ARTIFACTS_DIR =
  process.env.ARTIFACTS_DIR ||
  (process.platform === "win32" && fs.existsSync("C:\\Users\\kiran\\.gemini\\antigravity\\brain\\066f83fe-0496-4794-9a02-51b5f232f479")
    ? "C:\\Users\\kiran\\.gemini\\antigravity\\brain\\066f83fe-0496-4794-9a02-51b5f232f479"
    : path.join(process.cwd(), "test-results", "artifacts"));

if (!fs.existsSync(ARTIFACTS_DIR)) {
  try {
    fs.mkdirSync(ARTIFACTS_DIR, { recursive: true });
  } catch {
    // fallback or ignore if exists
  }
}

const MOCK_PROFILE = {
  id: "demo-profile-delhi",
  members: ["adults", "children"],
  declaredSensitivity: "respiratory_asthma",
  primaryCommute: "active_walking_biking",
  outdoorExercise: "early_morning",
  hasSchoolRoutine: true,
  filtration: "hepa_purifier",
  ventilationPreference: "natural_windows",
  indoorSources: ["cooking_fumes"],
  budgetPreference: "limited",
  updatedAt: new Date().toISOString(),
};

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

test.describe("AERIS Visual Capture Suite", () => {
  test("captures dashboard and daily plan on desktop", async ({ page }, testInfo) => {
    if (testInfo.project.name !== "chromium-desktop") {
      return;
    }

    await page.route("**/api/telemetry*", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(MOCK_TELEMETRY),
      });
    });

    // 1. Dashboard Desktop Light
    await page.goto("/dashboard", { waitUntil: "networkidle" });
    await page.waitForTimeout(1000);
    await page.screenshot({
      path: path.join(ARTIFACTS_DIR, "dashboard-desktop.png"),
      fullPage: true,
    });

    // 2. Dashboard Dark Mode
    const themeBtn = page.getByRole("button", { name: /Switch to dark theme|Switch to light theme/i });
    if (await themeBtn.isVisible()) {
      await themeBtn.click();
      await page.waitForTimeout(500);
      await page.screenshot({
        path: path.join(ARTIFACTS_DIR, "dashboard-dark.png"),
        fullPage: true,
      });
      // Switch back to light
      await themeBtn.click();
      await page.waitForTimeout(300);
    }

    // 3. Daily Plan Desktop Light
    await page.goto("/daily-plan", { waitUntil: "networkidle" });
    await page.evaluate((profile) => {
      window.localStorage.setItem("aeris_household_profile_v1", JSON.stringify(profile));
      window.dispatchEvent(new Event("aeris_profile_updated"));
    }, MOCK_PROFILE);
    await page.waitForTimeout(1000);

    // Expand the first action's Plan B and explanation for comprehensive audit showcase
    const firstArticle = page.locator("article").first();
    const planBBtn = firstArticle.getByRole("button", { name: /View Plan B/i });
    if (await planBBtn.isVisible()) {
      await planBBtn.click();
    }
    const auditBtn = firstArticle.getByRole("button", { name: /Why am I seeing this\?/i });
    if (await auditBtn.isVisible()) {
      await auditBtn.click();
    }
    await page.waitForTimeout(500);

    await page.screenshot({
      path: path.join(ARTIFACTS_DIR, "daily-plan-desktop.png"),
      fullPage: true,
    });

    // 4. Daily Plan Dark Mode
    const planThemeBtn = page.getByRole("button", { name: /Switch to dark theme|Switch to light theme/i });
    if (await planThemeBtn.isVisible()) {
      await planThemeBtn.click();
      await page.waitForTimeout(500);
      await page.screenshot({
        path: path.join(ARTIFACTS_DIR, "daily-plan-dark.png"),
        fullPage: true,
      });
      // Switch back to light
      await planThemeBtn.click();
      await page.waitForTimeout(300);
    }

    // 5. Daily Plan with Gemini AI Assistant Drawer (Desktop)
    await page.route("**/api/assistant/explain*", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          status: "success",
          attributionLabel: "AI-generated explanation",
          language: "en",
          generatedAt: "2026-11-21T06:00:00Z",
          disclaimer: "Non-clinical health guidance",
          trustedMetadata: {
            actionId: "outdoor-exercise-reschedule",
            category: "outdoor_activity",
            priority: "urgent",
            applicableRuleId: "AERIS-RULE-EXERCISE-DISPERSION-02",
            evidenceReferences: [
              "WHO Global Air Quality Guidelines (2021) — Section 3.2",
              "CPCB National Air Quality Index (2014) — Health Advisory",
            ],
            cpcbAqiCategory: "Poor",
            cpcbAqiValue: 260,
            pm25Value: 110,
            isModelEstimate: true,
            sourceValidityTimestamp: "2026-11-21T06:00:00Z",
          },
          explanation: {
            headline: "Shift Workout Indoors or Reschedule to Midday (URGENT Priority)",
            actionBreakdown: "Reschedule early morning run to early afternoon (13:00–16:00) or substitute with an indoor workout.",
            whyThisMatters: "Morning temperature inversions trap fine particulates (110 µg/m³) near ground level. Deep inhalation during running increases alveolar particulate deposition up to 4.5-fold.",
            microclimateContext: "Current ambient PM2.5 is 110 µg/m³ with CPCB Poor AQI. Solar surface warming deepens the boundary layer by early afternoon.",
          },
        }),
      });
    });

    const explainAiBtn = firstArticle.getByRole("button", { name: /Explain .* with AI/i });
    if (await explainAiBtn.isVisible()) {
      await explainAiBtn.click();
      await page.waitForTimeout(1000);
      await page.screenshot({
        path: path.join(ARTIFACTS_DIR, "daily-plan-ai-drawer-desktop.png"),
        fullPage: true,
      });

      // Switch to Hindi and capture
      const drawer = page.getByRole("dialog");
      const hindiBtn = drawer.getByRole("button", { name: /Switch to Hindi language/i });
      if (await hindiBtn.isVisible()) {
        await page.route("**/api/assistant/explain*", async (route) => {
          await route.fulfill({
            status: 200,
            contentType: "application/json",
            body: JSON.stringify({
              status: "success",
              attributionLabel: "AI-generated explanation",
              language: "hi",
              generatedAt: "2026-11-21T06:00:00Z",
              disclaimer: "गैर-चिकित्सीय स्वास्थ्य मार्गदर्शन",
              trustedMetadata: {
                actionId: "outdoor-exercise-reschedule",
                category: "outdoor_activity",
                priority: "urgent",
                applicableRuleId: "AERIS-RULE-EXERCISE-DISPERSION-02",
                evidenceReferences: [
                  "WHO Global Air Quality Guidelines (2021) — Section 3.2",
                  "CPCB National Air Quality Index (2014) — Health Advisory",
                ],
                cpcbAqiCategory: "Poor",
                cpcbAqiValue: 260,
                pm25Value: 110,
                isModelEstimate: true,
                sourceValidityTimestamp: "2026-11-21T06:00:00Z",
              },
              explanation: {
                headline: "कसरत को घर के अंदर करें या दोपहर में पुनर्निर्धारित करें (अति आवश्यक)",
                actionBreakdown: "सुबह की दौड़ को दोपहर (13:00–16:00) तक टालें या घर के अंदर इनडोर व्यायाम करें।",
                whyThisMatters: "सुबह का तापमान व्युत्क्रमण (Inversion) महीन कणों (110 µg/m³) को जमीन के पास रोक लेता है। दौड़ने के दौरान गहरी सांस लेने से फेफड़ों में सूक्ष्म कणों का जमाव 4.5 गुना तक बढ़ जाता है।",
                microclimateContext: "वर्तमान PM2.5 स्तर 110 µg/m³ है (खराब श्रेणी)। दोपहर तक सौर तापन से वायुमंडलीय मिश्रण बेहतर हो जाता है।",
              },
            }),
          });
        });
        await hindiBtn.click();
        await page.waitForTimeout(800);
        await page.screenshot({
          path: path.join(ARTIFACTS_DIR, "daily-plan-ai-drawer-hindi.png"),
          fullPage: true,
        });
      }
    }
  });

  test("captures dashboard and daily plan on mobile", async ({ page }, testInfo) => {
    if (testInfo.project.name !== "chromium-mobile") {
      return;
    }

    await page.route("**/api/telemetry*", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(MOCK_TELEMETRY),
      });
    });

    // 1. Dashboard Mobile
    await page.goto("/dashboard", { waitUntil: "networkidle" });
    await page.waitForTimeout(1000);
    await page.screenshot({
      path: path.join(ARTIFACTS_DIR, "dashboard-mobile.png"),
      fullPage: true,
    });

    // 2. Daily Plan Mobile
    await page.goto("/daily-plan", { waitUntil: "networkidle" });
    await page.evaluate((profile) => {
      window.localStorage.setItem("aeris_household_profile_v1", JSON.stringify(profile));
      window.dispatchEvent(new Event("aeris_profile_updated"));
    }, MOCK_PROFILE);
    await page.waitForTimeout(1000);

    const firstArticle = page.locator("article").first();
    const planBBtn = firstArticle.getByRole("button", { name: /View Plan B/i });
    if (await planBBtn.isVisible()) {
      await planBBtn.click();
    }
    await page.waitForTimeout(500);

    await page.screenshot({
      path: path.join(ARTIFACTS_DIR, "daily-plan-mobile.png"),
      fullPage: true,
    });

    // 3. Daily Plan with Gemini AI Assistant Drawer (Mobile)
    await page.route("**/api/assistant/explain*", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          status: "success",
          attributionLabel: "AI-generated explanation",
          language: "en",
          generatedAt: "2026-11-21T06:00:00Z",
          disclaimer: "Non-clinical health guidance",
          trustedMetadata: {
            actionId: "outdoor-exercise-reschedule",
            category: "outdoor_activity",
            priority: "urgent",
            applicableRuleId: "AERIS-RULE-EXERCISE-DISPERSION-02",
            evidenceReferences: [
              "WHO Global Air Quality Guidelines (2021)",
              "CPCB National Air Quality Index (2014)",
            ],
            cpcbAqiCategory: "Poor",
            cpcbAqiValue: 260,
            pm25Value: 110,
            isModelEstimate: true,
            sourceValidityTimestamp: "2026-11-21T06:00:00Z",
          },
          explanation: {
            headline: "Shift Workout Indoors or Reschedule to Midday (URGENT Priority)",
            actionBreakdown: "Reschedule early morning run to early afternoon or substitute with an indoor workout.",
            whyThisMatters: "Morning thermal inversions trap particulates near street level.",
            microclimateContext: "Current ambient PM2.5 is 110 µg/m³ with CPCB Poor AQI.",
          },
        }),
      });
    });

    const explainAiBtn = firstArticle.getByRole("button", { name: /Explain .* with AI/i });
    if (await explainAiBtn.isVisible()) {
      await explainAiBtn.click();
      await page.waitForTimeout(1000);
      await page.screenshot({
        path: path.join(ARTIFACTS_DIR, "daily-plan-ai-drawer-mobile.png"),
        fullPage: true,
      });
    }
  });

  test("captures Indoor Air Coach in Desktop, Dark Mode, and Mobile", async ({ page }) => {
    await page.route("**/api/telemetry*", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(MOCK_TELEMETRY),
      });
    });

    // 1. Desktop 1440x900 Light Mode
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto("/indoor-air");
    await page.waitForTimeout(1000);

    await page.screenshot({
      path: path.join(ARTIFACTS_DIR, "indoor-air-desktop.png"),
      fullPage: true,
    });

    // 2. Desktop 1440x900 Dark Mode
    const themeToggleBtn = page.getByRole("button", { name: /switch to dark theme/i });
    if (await themeToggleBtn.isVisible()) {
      await themeToggleBtn.click();
      await page.waitForTimeout(500);
      await page.screenshot({
        path: path.join(ARTIFACTS_DIR, "indoor-air-dark.png"),
        fullPage: true,
      });
    }

    // 3. Mobile Viewport 390x844
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/indoor-air");
    await page.waitForTimeout(1000);

    await page.screenshot({
      path: path.join(ARTIFACTS_DIR, "indoor-air-mobile.png"),
      fullPage: true,
    });
  });

  test("captures What-If Scenario Simulator in Desktop, Dark Mode, and Mobile", async ({ page }) => {
    await page.route("**/api/telemetry*", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(MOCK_TELEMETRY),
      });
    });

    // 1. Desktop 1440x900 Light Mode
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto("/scenarios");
    await page.waitForTimeout(1000);

    await page.screenshot({
      path: path.join(ARTIFACTS_DIR, "scenarios-desktop.png"),
      fullPage: true,
    });

    // 2. Desktop 1440x900 Dark Mode
    const themeToggleBtn = page.getByRole("button", { name: /switch to dark theme/i });
    if (await themeToggleBtn.isVisible()) {
      await themeToggleBtn.click();
      await page.waitForTimeout(500);
      await page.screenshot({
        path: path.join(ARTIFACTS_DIR, "scenarios-dark.png"),
        fullPage: true,
      });
    }

    // 3. Mobile Viewport 390x844
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/scenarios");
    await page.waitForTimeout(1000);

    await page.screenshot({
      path: path.join(ARTIFACTS_DIR, "scenarios-mobile.png"),
      fullPage: true,
    });
  });

  const captureHomepageViewport = async (
    page: Page,
    name: string,
    width: number,
    height: number
  ) => {
    await page.setViewportSize({ width, height });
    await page.goto("/", { waitUntil: "networkidle" });
    await page.waitForTimeout(800);

    // Light mode capture
    await page.screenshot({
      path: path.join(ARTIFACTS_DIR, `homepage-${name}-light.png`),
    });

    // Dark mode capture
    const themeBtn = page.getByRole("button", { name: /Switch to dark theme|Switch to light theme/i });
    if (await themeBtn.isVisible()) {
      await page.evaluate(() => {
        const btn = document.querySelector("button.sh-theme") as HTMLButtonElement | null;
        btn?.click();
      });
      // Allow 280ms texture swap timer and 250ms CSS transition to fully settle
      await page.waitForTimeout(1000);
      await page.screenshot({
        path: path.join(ARTIFACTS_DIR, `homepage-${name}-dark.png`),
      });
      // Switch back to light
      await page.evaluate(() => {
        const btn = document.querySelector("button.sh-theme") as HTMLButtonElement | null;
        btn?.click();
      });
      await page.waitForTimeout(800);
    }
  };

  test("captures Homepage in 1440px Desktop (Light & Dark)", async ({ page }, testInfo) => {
    if (testInfo.project.name !== "chromium-desktop") return;
    test.slow();
    await captureHomepageViewport(page, "desktop-1440", 1440, 900);
  });

  test("captures Homepage in 1280px Laptop (Light & Dark)", async ({ page }, testInfo) => {
    if (testInfo.project.name !== "chromium-desktop") return;
    test.slow();
    await captureHomepageViewport(page, "laptop-1280", 1280, 800);
  });

  test("captures Homepage in 768px Tablet (Light & Dark)", async ({ page }, testInfo) => {
    if (testInfo.project.name !== "chromium-desktop") return;
    test.slow();
    await captureHomepageViewport(page, "tablet-768", 768, 1024);
  });

  test("captures Homepage in 393px Mobile (Light & Dark)", async ({ page }, testInfo) => {
    if (testInfo.project.name !== "chromium-desktop") return;
    test.slow();
    await captureHomepageViewport(page, "mobile-393", 393, 852);
  });

  test("verifies core UI styling, typography, cards, and interactive hero in light and dark modes", async ({ page }, testInfo) => {
    if (testInfo.project.name !== "chromium-desktop") {
      return;
    }
    test.slow();

    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto("/", { waitUntil: "networkidle" });
    await page.waitForTimeout(800);

    // 1. Verify Hero WebGL is active in LIGHT MODE
    const heroRoot = page.locator(".sh-root");
    await page.waitForFunction(() => {
      const el = document.querySelector(".sh-root");
      return el?.getAttribute("data-gl") === "on";
    }, { timeout: 15000 });

    const heroCanvas = page.locator("canvas.sh-canvas");
    const canvasOpacity = await heroCanvas.evaluate((el) => window.getComputedStyle(el).opacity);
    expect(Number(canvasOpacity)).toBeGreaterThan(0.5);

    // Move pointer over canvas in light mode and verify interaction
    await page.mouse.move(720, 450);
    await page.mouse.down();
    await page.mouse.move(780, 500);
    await page.mouse.up();
    await expect(heroRoot).toHaveAttribute("data-touched", "1");

    // 2. Verify Tailwind CSS typography, layout, and card styling
    const featureCard = page.locator("#features .group").first();
    const cardStyles = await featureCard.evaluate((el) => {
      const cs = window.getComputedStyle(el);
      return {
        borderRadius: cs.borderRadius,
        boxShadow: cs.boxShadow,
        backgroundColor: cs.backgroundColor,
      };
    });
    // Tailwind rounded-2xl is 16px (1rem)
    expect(cardStyles.borderRadius).not.toBe("0px");
    expect(cardStyles.backgroundColor).not.toBe("rgba(0, 0, 0, 0)");

    // 3. Verify Dashboard styling and European EAQI Level display (1-6 scale)
    await page.goto("/dashboard", { waitUntil: "networkidle" });
    await page.waitForTimeout(800);

    const aqiLevelText = await page.locator("text=/Level [1-6] \\/ 6/").first().textContent();
    expect(aqiLevelText).toMatch(/Level [1-6] \/ 6/);
    expect(aqiLevelText).not.toContain("Level 84");

    // Verify Milestone 2 label is removed
    const milestoneText = await page.locator("text=/Milestone 2/").count();
    expect(milestoneText).toBe(0);
  });
});
