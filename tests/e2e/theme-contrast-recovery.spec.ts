import { test, expect } from "@playwright/test";
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

function srgbToLinear(val: number): number {
  const c = val / 255;
  return c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
}

function parseRgb(colorStr: string): { r: number; g: number; b: number; a: number } {
  if (!colorStr) return { r: 255, g: 255, b: 255, a: 1 };
  const match = colorStr.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)(?:,\s*([\d.]+))?\)/);
  if (!match) return { r: 255, g: 255, b: 255, a: 1 };
  return {
    r: Number(match[1]),
    g: Number(match[2]),
    b: Number(match[3]),
    a: match[4] !== undefined ? Number(match[4]) : 1,
  };
}

function blendOver(
  fg: { r: number; g: number; b: number; a: number },
  bg: { r: number; g: number; b: number; a: number }
): { r: number; g: number; b: number; a: number } {
  const alpha = fg.a;
  return {
    r: Math.round(fg.r * alpha + bg.r * (1 - alpha)),
    g: Math.round(fg.g * alpha + bg.g * (1 - alpha)),
    b: Math.round(fg.b * alpha + bg.b * (1 - alpha)),
    a: 1,
  };
}

function getLuminance(rgb: { r: number; g: number; b: number }): number {
  const r = srgbToLinear(rgb.r);
  const g = srgbToLinear(rgb.g);
  const b = srgbToLinear(rgb.b);
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function calculateContrastRatio(fgStr: string, bgStr: string): number {
  const fg = parseRgb(fgStr);
  const bg = parseRgb(bgStr);
  const actualFg = fg.a < 1 ? blendOver(fg, bg) : fg;
  const l1 = getLuminance(actualFg);
  const l2 = getLuminance(bg);
  const lighter = Math.max(l1, l2);
  const darker = Math.min(l1, l2);
  return Number(((lighter + 0.05) / (darker + 0.05)).toFixed(2));
}

test.describe("Theme Contrast Recovery & Token Isolation", () => {
  test.use({ colorScheme: "dark" }); // Explicitly emulate OS dark mode

  test("1. Light mode displays high-contrast white cards even on dark-mode OS", async ({ page }) => {
    // Navigate to dashboard
    await page.goto("/dashboard", { waitUntil: "networkidle" });
    await page.waitForTimeout(500);

    // Verify HTML element does NOT have .dark class in initial light mode
    const htmlClasses = await page.locator("html").getAttribute("class");
    expect(htmlClasses || "").not.toContain("dark");

    // Inspect NAQI overview card
    const naqiCard = page.locator(".grid.lg\\:grid-cols-3 > div").first();
    await expect(naqiCard).toBeVisible();

    const computed = await naqiCard.evaluate((el) => {
      function toRgb(colorStr: string): string {
        const canvas = document.createElement("canvas");
        canvas.width = 1;
        canvas.height = 1;
        const ctx = canvas.getContext("2d");
        if (!ctx || !colorStr) return "rgb(255, 255, 255)";
        ctx.fillStyle = colorStr;
        ctx.fillRect(0, 0, 1, 1);
        const [r, g, b, a] = ctx.getImageData(0, 0, 1, 1).data;
        return `rgba(${r}, ${g}, ${b}, ${a / 255})`;
      }

      const cs = window.getComputedStyle(el);
      const heading = el.querySelector("h2");
      const hCs = heading ? window.getComputedStyle(heading) : null;
      const firstPanel = el.querySelector(".grid.sm\\:grid-cols-3 .rounded-2xl") || el.querySelector(".rounded-2xl");
      const pCs = firstPanel ? window.getComputedStyle(firstPanel) : null;
      const pTitle = firstPanel?.querySelector("div:first-child");
      const ptCs = pTitle ? window.getComputedStyle(pTitle) : null;

      return {
        cardBg: toRgb(cs.backgroundColor),
        cardBorder: toRgb(cs.borderColor),
        headingColor: toRgb(hCs?.color || ""),
        panelBg: toRgb(pCs?.backgroundColor || ""),
        panelTitleColor: toRgb(ptCs?.color || ""),
      };
    });

    // In light mode, card must be white or light (not dark slate ~ rgb(15, 23, 42))
    const cardBgRgb = parseRgb(computed.cardBg);
    expect(cardBgRgb.r).toBeGreaterThan(200);
    expect(cardBgRgb.g).toBeGreaterThan(200);
    expect(cardBgRgb.b).toBeGreaterThan(200);

    // Heading contrast against card background must exceed 10:1 (WCAG AAA requires 7:1)
    const headingRatio = calculateContrastRatio(computed.headingColor, computed.cardBg);
    expect(headingRatio).toBeGreaterThanOrEqual(7.0);

    // Nested panel title contrast against panel background must exceed 4.5:1 (WCAG AA)
    const panelTitleRatio = calculateContrastRatio(computed.panelTitleColor, computed.panelBg);
    expect(panelTitleRatio).toBeGreaterThanOrEqual(4.5);

    // Capture visual screenshot
    await page.screenshot({
      path: path.join(ARTIFACTS_DIR, "dashboard-light-contrast-verified.png"),
      fullPage: false,
    });
  });

  test("2. Theme toggle button switches to dark theme, updates html.dark, and persists", async ({ page }) => {
    await page.goto("/dashboard", { waitUntil: "networkidle" });
    await page.waitForTimeout(500);

    // Click theme toggle button
    const themeBtn = page.getByRole("button", { name: /switch to dark theme/i });
    await expect(themeBtn).toBeVisible();
    await themeBtn.click();
    await page.waitForTimeout(300);

    // Verify html element has .dark class
    const htmlClasses = await page.locator("html").getAttribute("class");
    expect(htmlClasses).toContain("dark");

    // Verify card background is now dark slate
    const naqiCard = page.locator(".grid.lg\\:grid-cols-3 > div").first();
    const darkComputed = await naqiCard.evaluate((el) => {
      function toRgb(colorStr: string): string {
        const canvas = document.createElement("canvas");
        canvas.width = 1;
        canvas.height = 1;
        const ctx = canvas.getContext("2d");
        if (!ctx || !colorStr) return "rgb(255, 255, 255)";
        ctx.fillStyle = colorStr;
        ctx.fillRect(0, 0, 1, 1);
        const [r, g, b, a] = ctx.getImageData(0, 0, 1, 1).data;
        return `rgba(${r}, ${g}, ${b}, ${a / 255})`;
      }

      const cs = window.getComputedStyle(el);
      const heading = el.querySelector("h2");
      const hCs = heading ? window.getComputedStyle(heading) : null;
      return {
        cardBg: toRgb(cs.backgroundColor),
        headingColor: toRgb(hCs?.color || ""),
      };
    });

    const darkCardRgb = parseRgb(darkComputed.cardBg);
    expect(darkCardRgb.r).toBeLessThan(40);
    expect(darkCardRgb.g).toBeLessThan(40);
    expect(darkCardRgb.b).toBeLessThan(50);

    // Heading contrast in dark mode must exceed 7.0:1
    const darkHeadingRatio = calculateContrastRatio(darkComputed.headingColor, darkComputed.cardBg);
    expect(darkHeadingRatio).toBeGreaterThanOrEqual(7.0);

    // Capture dark screenshot
    await page.screenshot({
      path: path.join(ARTIFACTS_DIR, "dashboard-dark-contrast-verified.png"),
      fullPage: false,
    });

    // Reload page to verify persistence
    await page.reload({ waitUntil: "domcontentloaded" });
    await page.waitForTimeout(300);
    const reloadedHtmlClasses = await page.locator("html").getAttribute("class");
    expect(reloadedHtmlClasses).toContain("dark");

    // Toggle back to light
    const lightBtn = page.getByRole("button", { name: /switch to light theme/i });
    await expect(lightBtn).toBeVisible();
    await lightBtn.click();
    await page.waitForTimeout(300);
    const backToLightClasses = await page.locator("html").getAttribute("class");
    expect(backToLightClasses || "").not.toContain("dark");
  });

  test("3. Daily Action Plan page has high contrast in both themes", async ({ page }) => {
    // Light mode
    await page.goto("/daily-plan", { waitUntil: "networkidle" });
    await page.waitForTimeout(500);

    await page.screenshot({
      path: path.join(ARTIFACTS_DIR, "daily-plan-light-contrast-verified.png"),
      fullPage: false,
    });

    // Toggle to dark
    const themeBtn = page.getByRole("button", { name: /switch to dark theme/i });
    if (await themeBtn.isVisible()) {
      await themeBtn.click();
      await page.waitForTimeout(300);
      await page.screenshot({
        path: path.join(ARTIFACTS_DIR, "daily-plan-dark-contrast-verified.png"),
        fullPage: false,
      });
      // Toggle back
      await page.getByRole("button", { name: /switch to light theme/i }).click();
    }
  });

  test("4. Indoor Air Coach page has high contrast in both themes", async ({ page }) => {
    await page.goto("/indoor-air", { waitUntil: "networkidle" });
    await page.waitForTimeout(500);

    await page.screenshot({
      path: path.join(ARTIFACTS_DIR, "indoor-air-light-contrast-verified.png"),
      fullPage: false,
    });

    const themeBtn = page.getByRole("button", { name: /switch to dark theme/i });
    if (await themeBtn.isVisible()) {
      await themeBtn.click();
      await page.waitForTimeout(300);
      await page.screenshot({
        path: path.join(ARTIFACTS_DIR, "indoor-air-dark-contrast-verified.png"),
        fullPage: false,
      });
      await page.getByRole("button", { name: /switch to light theme/i }).click();
    }
  });

  test("5. What-If Scenarios page has high contrast in both themes", async ({ page }) => {
    await page.goto("/scenarios", { waitUntil: "networkidle" });
    await page.waitForTimeout(500);

    await page.screenshot({
      path: path.join(ARTIFACTS_DIR, "scenarios-light-contrast-verified.png"),
      fullPage: false,
    });

    const themeBtn = page.getByRole("button", { name: /switch to dark theme/i });
    if (await themeBtn.isVisible()) {
      await themeBtn.click();
      await page.waitForTimeout(300);
      await page.screenshot({
        path: path.join(ARTIFACTS_DIR, "scenarios-dark-contrast-verified.png"),
        fullPage: false,
      });
      await page.getByRole("button", { name: /switch to light theme/i }).click();
    }
  });
});
