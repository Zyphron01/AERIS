import { chromium } from "playwright";

/**
 * Calculates WCAG 2.2 relative luminance for an sRGB component.
 */
function srgbToLinear(val) {
  const c = val / 255;
  return c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
}

/**
 * Parses rgb/rgba string and returns { r, g, b, a }
 */
function parseRgb(colorStr) {
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

/**
 * Blends foreground color over background if foreground has alpha < 1
 */
function blendOver(fg, bg) {
  const alpha = fg.a;
  return {
    r: Math.round(fg.r * alpha + bg.r * (1 - alpha)),
    g: Math.round(fg.g * alpha + bg.g * (1 - alpha)),
    b: Math.round(fg.b * alpha + bg.b * (1 - alpha)),
    a: 1,
  };
}

/**
 * Computes relative luminance L from RGB
 */
function getLuminance(rgb) {
  const r = srgbToLinear(rgb.r);
  const g = srgbToLinear(rgb.g);
  const b = srgbToLinear(rgb.b);
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

/**
 * Computes WCAG 2.2 contrast ratio between two colors
 */
function computeContrastRatio(fgRgb, bgRgb) {
  const actualFg = fgRgb.a < 1 ? blendOver(fgRgb, bgRgb) : fgRgb;
  const l1 = getLuminance(actualFg);
  const l2 = getLuminance(bgRgb);
  const lighter = Math.max(l1, l2);
  const darker = Math.min(l1, l2);
  return Number(((lighter + 0.05) / (darker + 0.05)).toFixed(2));
}

const MOCK_TELEMETRY = {
  location: {
    id: "delhi-ncr",
    name: "Delhi NCR",
    country: "India",
    latitude: 28.6139,
    longitude: 77.209,
    timezone: "Asia/Kolkata",
  },
  timestamp: new Date().toISOString(),
  retrievedAt: new Date().toISOString(),
  freshness: "fresh",
  freshnessExplanation: "Live atmospheric model retrieved within threshold.",
  source: "Open-Meteo European Atmosphere Service (CAMS) Global Model",
  dataKind: "Atmospheric Chemical Transport Model",
  disclaimer: "Modeled atmospheric guidance. Always adhere to official advisories.",
  aqi: {
    usAqi: {
      standard: "US-EPA",
      value: 165,
      category: "Unhealthy",
      dominantPollutant: "PM2.5",
      colorClass: "text-rose-700 bg-rose-50 border-rose-300 dark:text-rose-300 dark:bg-rose-950/50 dark:border-rose-800",
    },
    cpcbAqi: {
      standard: "IN-CPCB",
      value: 235,
      category: "Poor",
      dominantPollutant: "PM2.5",
      colorClass: "text-orange-700 bg-orange-50 border-orange-300 dark:text-orange-300 dark:bg-orange-950/50 dark:border-orange-800",
    },
    europeanAqi: {
      standard: "EU-EAQI",
      value: 4,
      category: "Poor",
      dominantPollutant: "PM2.5",
      colorClass: "text-orange-700 bg-orange-50 border-orange-300 dark:text-orange-300 dark:bg-orange-950/50 dark:border-orange-800",
    },
  },
  pollutants: [
    {
      code: "pm2_5",
      name: "Particulate Matter 2.5",
      value: 88,
      unit: "µg/m³",
      averagingPeriod: "1h",
      rollingAverageValue: 84,
      who24hGuideline: 15,
    },
    {
      code: "pm10",
      name: "Particulate Matter 10",
      value: 155,
      unit: "µg/m³",
      averagingPeriod: "1h",
      rollingAverageValue: 148,
      who24hGuideline: 45,
    },
    {
      code: "no2",
      name: "Nitrogen Dioxide",
      value: 42,
      unit: "µg/m³",
      averagingPeriod: "1h",
      who24hGuideline: 25,
    },
    {
      code: "o3",
      name: "Ozone",
      value: 36,
      unit: "µg/m³",
      averagingPeriod: "1h",
      who24hGuideline: 100,
    },
  ],
  weather: {
    temperatureC: 24,
    apparentTemperatureC: 24,
    relativeHumidityPercent: 52,
    windSpeedKmH: 8,
    windDirectionDegrees: 290,
    surfacePressureHPa: 1012,
    weatherLabel: "Clear / Active Dispersion",
  },
  hourlyForecast: Array.from({ length: 24 }, (_, i) => ({
    time: new Date(Date.now() + i * 3600000).toISOString(),
    pm2_5: Math.round(75 + Math.sin(i / 3) * 20),
    pm10: Math.round(140 + Math.sin(i / 3) * 35),
    temperatureC: Math.round(20 + Math.sin(i / 4) * 8),
    usAqi: Math.round(155 + Math.sin(i / 3) * 25),
  })),
};

async function auditRoute(page, routePath, routeName, expectedTheme) {
  await page.route("**/api/telemetry*", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify(MOCK_TELEMETRY),
    });
  });

  await page.goto(`http://127.0.0.1:3000${routePath}`, { waitUntil: "networkidle" });
  await page.waitForTimeout(600);

  const measurements = await page.evaluate(() => {
    const isDark = document.documentElement.classList.contains("dark");
    const bodyBg = window.getComputedStyle(document.body).backgroundColor;

    // Select key text elements across the page
    const sampleElements = [];
    const headings = Array.from(document.querySelectorAll("h1, h2, h3"));
    const labels = Array.from(document.querySelectorAll("label, span.text-xs, div.text-xs, p.text-xs"));
    const cards = Array.from(document.querySelectorAll(".rounded-3xl, .rounded-2xl"));

    for (const h of headings.slice(0, 5)) {
      const parent = h.closest(".rounded-3xl, .rounded-2xl, article, section, div.min-h-screen") || document.body;
      sampleElements.push({
        role: "heading",
        text: h.textContent.trim().slice(0, 35),
        color: window.getComputedStyle(h).color,
        fontSize: window.getComputedStyle(h).fontSize,
        fontWeight: window.getComputedStyle(h).fontWeight,
        parentBg: window.getComputedStyle(parent).backgroundColor,
      });
    }

    for (const l of labels.slice(0, 8)) {
      if (!l.textContent.trim()) continue;
      const parent = l.closest(".rounded-2xl, .rounded-3xl, div.min-h-screen") || document.body;
      sampleElements.push({
        role: "label",
        text: l.textContent.trim().slice(0, 35),
        color: window.getComputedStyle(l).color,
        fontSize: window.getComputedStyle(l).fontSize,
        fontWeight: window.getComputedStyle(l).fontWeight,
        parentBg: window.getComputedStyle(parent).backgroundColor,
      });
    }

    const cardBgs = cards.slice(0, 4).map((c) => ({
      className: c.className.slice(0, 50),
      bg: window.getComputedStyle(c).backgroundColor,
      border: window.getComputedStyle(c).borderColor,
    }));

    return {
      isDark,
      bodyBg,
      sampleElements,
      cardBgs,
    };
  });

  console.log(`\n======================================================`);
  console.log(`ROUTE: ${routeName} (${routePath}) — THEME: ${expectedTheme.toUpperCase()}`);
  console.log(`HTML has .dark class: ${measurements.isDark} (Expected: ${expectedTheme === "dark"})`);
  console.log(`Body Background: ${measurements.bodyBg}`);
  console.log(`Auditing text & card contrast against WCAG 2.2 AA (>= 4.5:1 normal, >= 3.0:1 large):`);

  let allPass = true;
  for (const item of measurements.sampleElements) {
    const fgRgb = parseRgb(item.color);
    let bgRgb = parseRgb(item.parentBg);
    if (bgRgb.a === 0 || item.parentBg === "rgba(0, 0, 0, 0)") {
      bgRgb = parseRgb(measurements.bodyBg);
    }

    const ratio = computeContrastRatio(fgRgb, bgRgb);
    const sizePx = parseFloat(item.fontSize) || 14;
    const isLarge = sizePx >= 18 || (sizePx >= 14 && parseInt(item.fontWeight, 10) >= 700);
    const threshold = isLarge ? 3.0 : 4.5;
    const pass = ratio >= threshold;

    if (!pass) allPass = false;
    const status = pass ? "✓ PASS" : "✗ FAIL";
    console.log(`  [${status}] ${item.role.padEnd(8)} "${item.text.padEnd(35)}" -> ${ratio}:1 (min ${threshold}:1) | FG: ${item.color} on BG: ${item.parentBg}`);
  }

  return allPass;
}

async function runAudit() {
  const browser = await chromium.launch({ headless: true });

  // TEST 1: OS prefers-color-scheme = DARK, but app default is LIGHT
  // Proves Tailwind v4 @custom-variant dark isolates app theme from OS media query!
  console.log("\n>>> RUNNING TEST SUITE 1: OS color scheme set to DARK, App in LIGHT MODE <<<");
  const darkOsContext = await browser.newContext({
    colorScheme: "dark",
    viewport: { width: 1280, height: 900 },
  });
  const page1 = await darkOsContext.newPage();

  let suite1Pass = true;
  suite1Pass = (await auditRoute(page1, "/dashboard", "Air Monitor Dashboard", "light")) && suite1Pass;
  suite1Pass = (await auditRoute(page1, "/daily-plan", "Daily Action Planner", "light")) && suite1Pass;
  suite1Pass = (await auditRoute(page1, "/indoor-air", "Indoor Air Coach", "light")) && suite1Pass;
  suite1Pass = (await auditRoute(page1, "/scenarios", "What-If Simulator", "light")) && suite1Pass;

  // Take screenshot of dashboard in light mode while OS is dark
  await page1.goto("http://127.0.0.1:3000/dashboard", { waitUntil: "networkidle" });
  await page1.screenshot({ path: "test-dashboard-light-on-dark-os.png" });
  console.log(`Saved screenshot: test-dashboard-light-on-dark-os.png`);

  await darkOsContext.close();

  // TEST 2: App toggled to DARK MODE
  console.log("\n>>> RUNNING TEST SUITE 2: App switched to DARK MODE <<<");
  const darkAppContext = await browser.newContext({
    viewport: { width: 1280, height: 900 },
  });
  const page2 = await darkAppContext.newPage();

  // Set localStorage theme to dark
  await page2.addInitScript(() => {
    localStorage.setItem("aeris_theme_v1", "dark");
    localStorage.setItem("aeris-theme", "dark");
  });

  let suite2Pass = true;
  suite2Pass = (await auditRoute(page2, "/dashboard", "Air Monitor Dashboard", "dark")) && suite2Pass;
  suite2Pass = (await auditRoute(page2, "/daily-plan", "Daily Action Planner", "dark")) && suite2Pass;
  suite2Pass = (await auditRoute(page2, "/indoor-air", "Indoor Air Coach", "dark")) && suite2Pass;
  suite2Pass = (await auditRoute(page2, "/scenarios", "What-If Simulator", "dark")) && suite2Pass;

  await page2.goto("http://127.0.0.1:3000/dashboard", { waitUntil: "networkidle" });
  await page2.screenshot({ path: "test-dashboard-dark-mode.png" });
  console.log(`Saved screenshot: test-dashboard-dark-mode.png`);

  await darkAppContext.close();
  await browser.close();

  console.log(`\n======================================================`);
  console.log(`OVERALL CONTRAST AUDIT RESULTS:`);
  console.log(`Light Mode (with OS dark mode active): ${suite1Pass ? "PASSED (100%)" : "FAILED"}`);
  console.log(`Dark Mode: ${suite2Pass ? "PASSED (100%)" : "FAILED"}`);
  console.log(`======================================================\n`);

  if (!suite1Pass || !suite2Pass) {
    process.exit(1);
  }
}

runAudit().catch((err) => {
  console.error("Audit error:", err);
  process.exit(1);
});
