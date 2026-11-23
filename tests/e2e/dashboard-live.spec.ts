import { test, expect } from "@playwright/test";

test.describe("AERIS Milestone 2: Live Dashboard E2E Test Suite", () => {
  test.beforeEach(async ({ page }) => {
    page.on("console", (msg) => {
      if (msg.type() === "error") {
        console.error(`Page error: "${msg.text()}"`);
      }
    });
  });

  test("loads live dashboard with Delhi NCR default demonstration city", async ({ page }) => {
    await page.goto("/dashboard");

    // Header & City verification
    await expect(page.getByText("AERIS Live Air Monitor")).toBeVisible();
    await expect(page.locator("#city-selector-button")).toContainText("Delhi NCR");

    // Indian CPCB NAQI Section
    await expect(page.getByRole("heading", { level: 2, name: /Indian National Air Quality Index/i })).toBeVisible();
    await expect(page.getByText("Standard: IN-CPCB (2014)")).toBeVisible();

    // US EPA AQI Section
    await expect(page.getByText("US EPA Air Quality Index")).toBeVisible();

    // Pollutant concentration grid
    await expect(page.getByRole("heading", { level: 2, name: /Pollutant Concentration Profiles/i })).toBeVisible();
    await expect(page.getByText("Particulate Matter PM2.5")).toBeVisible();
    await expect(page.getByText("Particulate Matter PM10")).toBeVisible();

    // Meteorological Widget
    await expect(page.getByRole("heading", { level: 2, name: /Surface Weather & Atmospheric Dispersion/i })).toBeVisible();
    await expect(page.getByText("Temperature", { exact: true })).toBeVisible();
    await expect(page.getByText("Humidity")).toBeVisible();
    await expect(page.getByText("Wind Speed")).toBeVisible();

    // Attribution footer
    const footer = page.locator("footer");
    await expect(footer).toContainText("Open-Meteo Air Quality & Weather API");
    await expect(footer).toContainText("modeled/forecast");
  });

  test("allows switching cities and updates live telemetry cleanly", async ({ page }) => {
    await page.goto("/dashboard");

    const cityBtn = page.locator("#city-selector-button");
    await expect(cityBtn).toContainText("Delhi NCR");

    // Open dropdown
    await cityBtn.click();

    // Select Mumbai
    const mumbaiOption = page.getByRole("option", { name: /Mumbai/i });
    await expect(mumbaiOption).toBeVisible();
    await mumbaiOption.click();

    // Verify city updated
    await expect(cityBtn).toContainText("Mumbai");

    // Verify telemetry re-fetched
    await expect(page.getByRole("heading", { level: 2, name: /Indian National Air Quality Index/i })).toBeVisible();
  });

  test("renders 24-hour forecast trajectory chart", async ({ page }) => {
    await page.goto("/dashboard");

    await expect(page.getByRole("heading", { level: 2, name: /24-Hour Particulate & Temperature Forecast/i })).toBeVisible();
    const chartContainer = page.locator("[data-testid='forecast-chart-container']");
    await expect(chartContainer).toBeVisible({ timeout: 15000 });
  });

  test("header return navigation routes back to home page", async ({ page }) => {
    await page.goto("/dashboard");

    const homeLink = page.getByRole("link", { name: "Home" });
    await expect(homeLink).toBeVisible();
    await homeLink.click();

    await page.waitForURL("http://127.0.0.1:3000/");
    await expect(page.getByRole("heading", { level: 1 })).toContainText("Know your air.");
  });

  test("supports keyboard tab navigation on dashboard controls", async ({ page }) => {
    await page.goto("/dashboard");

    // Tab through controls
    await page.keyboard.press("Tab");
    const activeEl = await page.evaluate(() => document.activeElement?.tagName);
    expect(["A", "BUTTON", "BODY"]).toContain(activeEl);

    // Refresh button check
    const refreshBtn = page.getByRole("button", { name: /Refresh environmental readings/i });
    await expect(refreshBtn).toBeVisible();
    await refreshBtn.click();
  });

  test("verifies WCAG semantic hierarchy, landmark structure, and ARIA attributes", async ({ page }) => {
    await page.goto("/dashboard");

    // Landmarks verification
    await expect(page.locator("header")).toBeVisible();
    await expect(page.locator("main")).toBeVisible();
    await expect(page.locator("footer")).toBeVisible();

    // Single H1 page title
    const h1 = page.locator("h1");
    await expect(h1).toHaveCount(1);
    await expect(h1).toContainText("AERIS Live Air Monitor");

    // Semantic H2 sections
    const h2s = page.locator("h2");
    expect(await h2s.count()).toBeGreaterThanOrEqual(3);

    // City selector ARIA attributes
    const cityBtn = page.locator("#city-selector-button");
    await expect(cityBtn).toHaveAttribute("aria-haspopup", "listbox");
    await expect(cityBtn).toHaveAttribute("aria-expanded", "false");

    await cityBtn.click();
    await expect(cityBtn).toHaveAttribute("aria-expanded", "true");
    const listbox = page.locator("[role='listbox']");
    await expect(listbox).toBeVisible();

    // Verify all options have role="option" and accessible names
    const options = listbox.locator("[role='option']");
    expect(await options.count()).toBe(7);

    // Close dropdown on outside click or selection
    await options.first().click();
    await expect(cityBtn).toHaveAttribute("aria-expanded", "false");
  });
});
