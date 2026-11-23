import { test, expect, type Page } from "@playwright/test";

const MOCK_TELEMETRY = {
  location: { id: "delhi-ncr", name: "Delhi NCR", country: "India", latitude: 28.6, longitude: 77.2, timezone: "Asia/Kolkata" },
  timestamp: new Date().toISOString(),
  retrievedAt: new Date().toISOString(),
  freshness: "fresh",
  freshnessExplanation: "Live telemetry",
  source: "Open-Meteo CAMS Global",
  dataKind: "modeled/forecast",
  disclaimer: "Modeled atmospheric guidance.",
  aqi: {
    usAqi: { standard: "US-EPA", value: 120, category: "Moderate", dominantPollutant: "PM2.5", colorClass: "text-amber-700 bg-amber-50" },
    cpcbAqi: { standard: "IN-CPCB", value: 160, category: "Moderate", dominantPollutant: "PM2.5", colorClass: "text-amber-700 bg-amber-50" },
    europeanAqi: { standard: "EU-EAQI", value: 3, category: "Moderate", dominantPollutant: "PM2.5", colorClass: "text-amber-700 bg-amber-50" },
  },
  pollutants: [],
  weather: { temperatureC: 25, apparentTemperatureC: 25, relativeHumidityPercent: 50, windSpeedKmH: 10, windDirectionDegrees: 180, surfacePressureHPa: 1010, weatherLabel: "Clear" },
  hourlyForecast: [],
};

async function verifySculptureInteractivity(page: Page, stepDescription: string): Promise<void> {
  const root = page.locator(".sh-root");
  await expect(root, `Hero root should be visible at ${stepDescription}`).toBeVisible({ timeout: 6000 });

  // WebGL engine must initialize and set data-gl="on"
  await expect(root, `WebGL engine should activate (data-gl="on") at ${stepDescription}`).toHaveAttribute("data-gl", "on", { timeout: 12000 });

  // Canvas must be rendered and visible
  const canvas = page.locator(".sh-canvas");
  await expect(canvas, `WebGL canvas must be visible at ${stepDescription}`).toBeVisible();

  // Pointer interaction test: dispatch pointer events directly to trigger particle swirl
  await root.dispatchEvent("pointermove", { clientX: 600, clientY: 400 });
  await root.dispatchEvent("pointerdown", { clientX: 600, clientY: 400 });
  await root.dispatchEvent("pointermove", { clientX: 650, clientY: 430 });
  await root.dispatchEvent("pointerup", { clientX: 650, clientY: 430 });

  // Pointer event must register
  await expect(root, `Pointer movement should trigger data-touched="1" at ${stepDescription}`).toHaveAttribute("data-touched", "1", { timeout: 4000 });
}

test.describe("AERIS WebGL Liquid Sculpture Hero Navigation Lifecycle", () => {
  test.beforeEach(async ({ page }) => {
    test.setTimeout(60000);

    // Disable smooth scrolling in test runs to prevent Playwright actionability hangs
    await page.addInitScript(() => {
      const style = document.createElement("style");
      style.textContent = "* { scroll-behavior: auto !important; }";
      document.head?.appendChild(style);
    });

    await page.route("**/api/telemetry*", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(MOCK_TELEMETRY),
      });
    });
  });

  test("1. Load / -> interact -> navigate to /dashboard -> return to / -> verify interactivity", async ({ page }) => {
    // 1. Initial load
    await page.goto("/", { waitUntil: "domcontentloaded" });
    await verifySculptureInteractivity(page, "Initial Homepage Load");

    // 2. Client-side navigation to /dashboard
    const dashboardLink = page.getByRole("link", { name: "Check My Air" }).first();
    await dashboardLink.click();
    await page.waitForURL("**/dashboard", { waitUntil: "domcontentloaded" });
    await expect(page.getByRole("heading", { name: /AERIS Live Air Monitor/i })).toBeVisible({ timeout: 10000 });

    // 3. Return to / via Home link
    const homeLink = page.getByRole("link", { name: /Home/i }).first();
    await homeLink.click();
    await page.waitForURL((url) => url.pathname === "/", { waitUntil: "domcontentloaded" });

    // 4. Verify sculpture resumed and responds to pointer
    await verifySculptureInteractivity(page, "Return from /dashboard");
  });

  test("2. Navigate / -> /scenarios -> return to / -> verify interactivity", async ({ page }) => {
    await page.goto("/scenarios", { waitUntil: "domcontentloaded" });
    await expect(page.getByRole("heading", { name: /What-If Scenario Simulator/i })).toBeVisible({ timeout: 10000 });

    // Return to / via Back to Home link
    const backLink = page.getByRole("link", { name: /Back to Home/i }).first();
    await backLink.click({ force: true });
    await page.waitForURL((url) => url.pathname === "/", { waitUntil: "domcontentloaded" });

    await verifySculptureInteractivity(page, "Return from /scenarios");
  });

  test("3. Navigate / -> /daily-plan -> browser back to / -> verify interactivity", async ({ page }) => {
    await page.goto("/", { waitUntil: "domcontentloaded" });
    await verifySculptureInteractivity(page, "Pre-navigation /");

    await page.goto("/daily-plan", { waitUntil: "domcontentloaded" });
    await expect(page.getByRole("heading", { name: /AERIS Daily Action Plan/i })).toBeVisible({ timeout: 10000 });

    // Browser back
    await page.goBack({ waitUntil: "domcontentloaded" });
    await page.waitForURL((url) => url.pathname === "/", { waitUntil: "domcontentloaded" });

    await verifySculptureInteractivity(page, "Browser Back from /daily-plan");
  });

  test("4. In-page anchor navigation: Explore Features -> scroll to hero -> verify interactivity", async ({ page }) => {
    await page.goto("/", { waitUntil: "domcontentloaded" });
    await verifySculptureInteractivity(page, "Initial anchor test");

    const exploreFeatures = page.getByRole("link", { name: "Explore Features" }).first();
    await exploreFeatures.click({ force: true });

    // Scroll back to top
    await page.evaluate(() => window.scrollTo(0, 0));
    await verifySculptureInteractivity(page, "After scrolling back to Hero");
  });

  test("5. Theme toggle light -> dark -> light before and after route navigation", async ({ page }) => {
    await page.goto("/", { waitUntil: "domcontentloaded" });
    await verifySculptureInteractivity(page, "Light Theme Initial");

    // Toggle theme to dark
    const themeBtn = page.getByRole("button", { name: /Switch to (dark|light) theme/i }).first();
    await themeBtn.click({ force: true });
    await verifySculptureInteractivity(page, "Dark Theme Toggled");

    // Navigate to /dashboard
    const dashboardLink = page.getByRole("link", { name: "Check My Air" }).first();
    await dashboardLink.click({ force: true });
    await page.waitForURL("**/dashboard", { waitUntil: "domcontentloaded" });

    // Return to /
    const homeLink = page.getByRole("link", { name: /Home/i }).first();
    await homeLink.click({ force: true });
    await page.waitForURL((url) => url.pathname === "/", { waitUntil: "domcontentloaded" });

    await verifySculptureInteractivity(page, "Dark Theme on Return");

    // Toggle back to light theme
    const themeBtnAfter = page.getByRole("button", { name: /Switch to (dark|light) theme/i }).first();
    await themeBtnAfter.click({ force: true });
    await verifySculptureInteractivity(page, "Light Theme on Return");
  });

  test("6. Rapid repeated navigation (5 cycles) between / and /dashboard", async ({ page }) => {
    await page.goto("/", { waitUntil: "domcontentloaded" });

    for (let i = 1; i <= 5; i++) {
      // Go to /dashboard
      const dashboardLink = page.getByRole("link", { name: "Check My Air" }).first();
      await dashboardLink.click({ force: true });
      await page.waitForURL("**/dashboard", { waitUntil: "domcontentloaded" });

      // Return to /
      const homeLink = page.getByRole("link", { name: /Home/i }).first();
      await homeLink.click({ force: true });
      await page.waitForURL((url) => url.pathname === "/", { waitUntil: "domcontentloaded" });

      // Verify on every iteration
      await verifySculptureInteractivity(page, `Rapid Navigation Cycle ${i}`);
    }
  });
});
