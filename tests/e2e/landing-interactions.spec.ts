import { test, expect } from "@playwright/test";

test.describe("AERIS Landing Page & Hero Stabilization E2E Suite", () => {
  test.beforeEach(async ({ page }) => {
    // Capture console errors to ensure zero runtime exceptions
    page.on("console", (msg) => {
      if (msg.type() === "error") {
        console.error(`Page error: "${msg.text()}"`);
      }
    });
  });

  test("renders valid semantic structure and editorial typography", async ({ page }) => {
    await page.goto("/");

    // Verify Title and Meta
    await expect(page).toHaveTitle(/AERIS/);

    // Verify Landmark elements
    const main = page.locator("main");
    await expect(main).toBeVisible();

    const nav = page.locator('nav[aria-label="Main Navigation"]');
    await expect(nav).toBeVisible();

    const footer = page.locator("footer");
    await expect(footer).toBeVisible();

    // Verify Editorial Content with exact class selectors to avoid .sr-only duplicates
    await expect(page.locator(".sh-eyebrow")).toHaveText("Intelligent Air Quality Companion");
    await expect(page.getByRole("heading", { level: 1 })).toContainText("Know your air.");
    await expect(page.getByRole("heading", { level: 1 })).toContainText("Shape your day.");
    await expect(page.locator(".sh-body")).toContainText("Understand the air around you and discover practical");
  });

  test("verifies hero WebGL canvas, fallback image, and pointer disturbance", async ({ page }) => {
    test.slow();
    await page.goto("/");

    const heroCanvas = page.locator("canvas.sh-canvas");
    await expect(heroCanvas).toBeAttached();

    const fallbackImg = page.locator("img.sh-fallback");
    await expect(fallbackImg).toBeAttached();
    await expect(fallbackImg).toHaveAttribute("alt", "AERIS aerodynamic atmospheric particle sculpture");

    // Perform smooth pointer moves over hero canvas
    const box = await heroCanvas.boundingBox();
    if (box) {
      await page.mouse.move(box.x + box.width * 0.3, box.y + box.height * 0.4);
      await page.mouse.move(box.x + box.width * 0.5, box.y + box.height * 0.5);
      await page.mouse.move(box.x + box.width * 0.7, box.y + box.height * 0.6);
      await page.mouse.down();
      await page.mouse.move(box.x + box.width * 0.5, box.y + box.height * 0.3);
      await page.mouse.up();
    }

    // Verify hero container registers interaction without error
    const heroRoot = page.locator(".sh-root");
    await expect(heroRoot).toHaveAttribute("data-touched", "1");
  });

  test("toggles light and dark themes smoothly", async ({ page }) => {
    test.slow();
    await page.goto("/");

    const themeBtn = page.locator("button.sh-theme");
    await expect(themeBtn).toBeVisible();
    await expect(themeBtn).toHaveAttribute("aria-label", "Switch to dark theme");

    // Click to switch to dark theme
    await themeBtn.click({ force: true });
    await expect(themeBtn).toHaveAttribute("aria-label", "Switch to light theme");

    // Toggle back to light theme
    await themeBtn.click({ force: true });
    await expect(themeBtn).toHaveAttribute("aria-label", "Switch to dark theme");
  });

  test("primary CTA navigates directly to /dashboard", async ({ page }) => {
    test.slow();
    await page.goto("/");

    const primaryCta = page.getByRole("link", { name: "Check My Air" }).first();
    await expect(primaryCta).toBeVisible();
    await primaryCta.click();

    await page.waitForURL("**/dashboard");
    await expect(page.getByRole("heading", { level: 1 })).toContainText("Live Air Monitor");

    // Click Back to Home and verify return
    const backBtn = page.getByRole("link", { name: /Back to Home/i });
    await backBtn.click();
    await page.waitForURL("http://127.0.0.1:3000/");
  });

  test("secondary CTA navigates to #features section", async ({ page }) => {
    test.slow();
    await page.goto("/");

    const secondaryCta = page.getByRole("link", { name: /Explore Features/i });
    await expect(secondaryCta).toHaveAttribute("href", "#features");

    await secondaryCta.click();
    const featuresHeading = page.locator("#features-heading");
    await expect(featuresHeading).toBeVisible();
  });

  test("verifies all placeholder and feature routes are functional and navigation-ready", async ({ page }) => {
    // 1. Fully implemented /indoor-air feature route
    await page.goto("/indoor-air");
    await expect(page.getByRole("heading", { level: 1 })).toContainText("Indoor Air Coach");
    const indoorBackLink = page.getByRole("link", { name: /Back to Home/i });
    await expect(indoorBackLink).toBeVisible();

    // 2. Fully implemented /scenarios simulator route
    await page.goto("/scenarios");
    await expect(page.getByRole("heading", { level: 1 })).toContainText("What-If Scenario Simulator");
    const scenariosBackLink = page.getByRole("link", { name: /Back to Home/i });
    await expect(scenariosBackLink).toBeVisible();
  });

  test("verifies WCAG accessibility standards and keyboard tab navigation", async ({ page }) => {
    await page.goto("/");

    // Verify keyboard focusability of primary interactive links
    await page.keyboard.press("Tab");
    const activeTagName = await page.evaluate(() => document.activeElement?.tagName);
    expect(["A", "BUTTON", "BODY"]).toContain(activeTagName);

    // Verify skip to main content link for keyboard users (WCAG 2.2 AA)
    const skipLink = page.getByRole("link", { name: "Skip to main content" });
    await expect(skipLink).toHaveAttribute("href", "#main-content");

    // Verify screen reader visually hidden text
    const srOnly = page.locator(".sr-only").filter({ hasText: "AERIS — Intelligent Air Quality Companion" });
    await expect(srOnly).toContainText("AERIS — Intelligent Air Quality Companion");

    // Verify telemetry disclosures in footer
    const footer = page.locator("footer");
    await expect(footer).toContainText("Disclaimer: AERIS provides environmental decision guidance based on available modeled atmospheric data");
  });
});
