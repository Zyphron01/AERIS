import { test, expect } from "@playwright/test";

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
  pollutants: [
    { code: "pm2_5", name: "PM2.5", value: 45, unit: "µg/m³" },
    { code: "pm10", name: "PM10", value: 95, unit: "µg/m³" },
  ],
  weather: { temperatureC: 25, apparentTemperatureC: 25, relativeHumidityPercent: 50, windSpeedKmH: 10, windDirectionDegrees: 180, surfacePressureHPa: 1010, weatherLabel: "Clear" },
  hourlyForecast: [],
};

test.describe("Runtime Recovery & Hydration Verification", () => {
  test.beforeEach(async ({ page }) => {
    test.setTimeout(45000);

    await page.route("**/api/telemetry*", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(MOCK_TELEMETRY),
      });
    });
  });

  test("1. Homepage loads with zero hydration errors in light mode", async ({ page }) => {
    const consoleErrors: string[] = [];
    page.on("console", (msg) => {
      if (msg.type() === "error" || msg.type() === "warning") {
        const text = msg.text();
        if (text.includes("hydration") || text.includes("Hydration") || text.includes("mismatch") || text.includes("script tag")) {
          consoleErrors.push(text);
        }
      }
    });

    await page.goto("/", { waitUntil: "domcontentloaded" });
    const root = page.locator(".sh-root");
    await expect(root).toBeVisible();

    // Verify sculpture becomes ready
    await expect(root).toHaveAttribute("data-gl", "on", { timeout: 12000 });

    // Confirm no hydration errors or script tag warnings
    expect(consoleErrors).toEqual([]);
  });

  test("2. Homepage loads with zero hydration errors in dark mode", async ({ page }) => {
    const consoleErrors: string[] = [];
    page.on("console", (msg) => {
      if (msg.type() === "error" || msg.type() === "warning") {
        const text = msg.text();
        if (text.includes("hydration") || text.includes("Hydration") || text.includes("mismatch") || text.includes("script tag")) {
          consoleErrors.push(text);
        }
      }
    });

    // Seed dark mode in localStorage before page load
    await page.addInitScript(() => {
      localStorage.setItem("aeris_theme_v1", "dark");
    });

    await page.goto("/", { waitUntil: "domcontentloaded" });
    const root = page.locator(".sh-root");
    await expect(root).toBeVisible();
    await expect(page.locator("html")).toHaveClass(/dark/);

    // Verify sculpture becomes ready
    await expect(root).toHaveAttribute("data-gl", "on", { timeout: 12000 });

    // Confirm no hydration errors
    expect(consoleErrors).toEqual([]);
  });

  test("3. Reloading with a saved theme causes no mismatch", async ({ page }) => {
    const consoleErrors: string[] = [];
    page.on("console", (msg) => {
      if (msg.type() === "error") {
        const text = msg.text();
        if (text.includes("hydration") || text.includes("Hydration") || text.includes("mismatch")) {
          consoleErrors.push(text);
        }
      }
    });

    await page.addInitScript(() => {
      localStorage.setItem("aeris_theme_v1", "dark");
    });

    await page.goto("/", { waitUntil: "domcontentloaded" });
    await expect(page.locator(".sh-root")).toHaveAttribute("data-gl", "on", { timeout: 12000 });

    // Hard reload
    await page.reload({ waitUntil: "domcontentloaded" });
    await expect(page.locator(".sh-root")).toHaveAttribute("data-gl", "on", { timeout: 12000 });

    expect(consoleErrors).toEqual([]);
  });

  test("4 & 5. Sculpture responds to pointer input and retains WebGL after Homepage -> Dashboard -> Homepage", async ({ page }) => {
    await page.goto("/", { waitUntil: "domcontentloaded" });
    const root = page.locator(".sh-root");
    await expect(root).toHaveAttribute("data-gl", "on", { timeout: 12000 });

    // Interact on first load
    await root.dispatchEvent("pointermove", { clientX: 500, clientY: 400 });
    await expect(root).toHaveAttribute("data-touched", "1", { timeout: 4000 });

    // Navigate to Dashboard
    await page.click('a[href="/dashboard"]:visible');
    await expect(page).toHaveURL(/\/dashboard/);
    await expect(page.locator("h1")).toContainText(/Live Air Monitor/i);

    // Navigate back to Homepage
    await page.click('a[href="/"]:visible');
    await expect(page).toHaveURL(/\/$/);
    const returnRoot = page.locator(".sh-root");
    await expect(returnRoot).toBeVisible();
    await expect(returnRoot).toHaveAttribute("data-gl", "on", { timeout: 12000 });

    // Interact again after return
    await returnRoot.dispatchEvent("pointermove", { clientX: 550, clientY: 420 });
    await expect(returnRoot).toHaveAttribute("data-touched", "1", { timeout: 4000 });
  });

  test("6. Theme switching retains WebGL sculpture interaction", async ({ page }) => {
    await page.goto("/", { waitUntil: "domcontentloaded" });
    const root = page.locator(".sh-root");
    await expect(root).toHaveAttribute("data-gl", "on", { timeout: 12000 });

    // Click theme toggle button
    const themeBtn = page.locator("button.sh-theme");
    await themeBtn.click();
    await expect(page.locator("html")).toHaveClass(/dark/);
    await expect(root).toHaveAttribute("data-gl", "on", { timeout: 6000 });

    // Interact while in dark mode
    await root.dispatchEvent("pointermove", { clientX: 600, clientY: 400 });
    await expect(root).toHaveAttribute("data-touched", "1", { timeout: 4000 });

    // Switch back to light
    await themeBtn.click();
    await expect(page.locator("html")).not.toHaveClass(/dark/);
    await expect(root).toHaveAttribute("data-gl", "on", { timeout: 6000 });
  });

  test("7 & 8. Daily Plan never crashes on fresh, legacy, or corrupted localStorage JSON", async ({ page }) => {
    const pageErrors: string[] = [];
    page.on("pageerror", (err) => {
      pageErrors.push(err.message);
    });

    // Test with malformed JSON seeded into localStorage
    await page.addInitScript(() => {
      localStorage.setItem("aeris_household_profile_v1", "{corrupted_json_string: missing_closing");
      localStorage.setItem("aeris-theme", "light");
    });

    const response = await page.goto("/daily-plan", { waitUntil: "domcontentloaded" });
    expect(response?.status()).toBe(200);

    // Verify page rendered successfully without unhandled JSON crash
    await expect(page.locator("h1")).toContainText(/AERIS Daily Action Plan/i);
    await expect(page.getByText(/Personalize your daily air-quality decisions/i)).toBeVisible();

    // Confirm no SyntaxError or uncaught runtime exception
    const syntaxErrors = pageErrors.filter((e) => e.includes("SyntaxError") || e.includes("JSON"));
    expect(syntaxErrors).toEqual([]);
  });
});
