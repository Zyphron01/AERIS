import { chromium } from "@playwright/test";
import { spawn } from "child_process";
import http from "http";
import fs from "fs";

const BASE_URL = "http://127.0.0.1:3000";
const RECORD_DIR = "C:/Users/kiran/AERIS-Submission/raw_recordings";

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

async function waitForServer(url, timeoutMs = 30000) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    try {
      await new Promise((resolve, reject) => {
        const req = http.get(url, (res) => {
          if (res.statusCode === 200) resolve();
          else reject();
        });
        req.on("error", reject);
      });
      return true;
    } catch {
      await sleep(500);
    }
  }
  return false;
}

async function run() {
  if (!fs.existsSync(RECORD_DIR)) {
    fs.mkdirSync(RECORD_DIR, { recursive: true });
  }

  console.log("=== Checking Next.js Server on port 3000 ===");
  let serverProcess = null;
  const isUp = await waitForServer(BASE_URL, 1500);
  if (!isUp) {
    console.log("Starting Next.js production server on 127.0.0.1:3000...");
    serverProcess = spawn("npx", ["next", "start", "-H", "127.0.0.1", "-p", "3000"], {
      stdio: "pipe",
      shell: true,
    });
    serverProcess.stdout.on("data", (d) => process.stdout.write(`[Next.js] ${d}`));
    serverProcess.stderr.on("data", (d) => process.stderr.write(`[Next.js ERR] ${d}`));
    const ready = await waitForServer(BASE_URL, 30000);
    if (!ready) {
      console.error("Failed to start Next.js server.");
      process.exit(1);
    }
    console.log("Next.js server is ready!");
  } else {
    console.log("Next.js server is already running on port 3000!");
  }

  console.log("=== Launching Playwright 1920x1080 Video Recorder ===");
  const browser = await chromium.launch({
    headless: true,
    args: [
      "--use-gl=angle",
      "--use-angle=d3d11",
      "--ignore-gpu-blocklist",
      "--enable-gpu-rasterization",
      "--no-sandbox",
    ],
  });

  const context = await browser.newContext({
    viewport: { width: 1920, height: 1080 },
    recordVideo: {
      dir: RECORD_DIR,
      size: { width: 1920, height: 1080 },
    },
  });

  const page = await context.newPage();

  // Disable smooth scroll to avoid actionability delays
  await page.addInitScript(() => {
    const style = document.createElement("style");
    style.textContent = "* { scroll-behavior: auto !important; }";
    document.head?.appendChild(style);
  });

  console.log("\n>>> SCENE 1 (00:00 - 00:25, 25.0s): The Problem Context");
  await page.goto(`${BASE_URL}/problem-intro.html`, { waitUntil: "domcontentloaded" });
  await sleep(4000);
  const qcards = page.locator(".q-card");
  for (let i = 0; i < 3; i++) {
    await qcards.nth(i).hover();
    await sleep(4000);
  }
  await sleep(8000); // Complete 25.0s

  console.log("\n>>> SCENE 2 (00:25 - 00:45, 20.0s): Introducing AERIS & Liquid Sculpture");
  await page.goto(`${BASE_URL}/`, { waitUntil: "domcontentloaded" });
  await page.waitForSelector(".sh-root[data-gl='on']", { timeout: 12000 }).catch(() => {});
  await sleep(1500);

  // Smooth mouse movement over sculpture to show live GPGPU particles
  const root = page.locator(".sh-root");
  for (let t = 0; t < Math.PI * 2; t += 0.3) {
    const cx = 960 + Math.sin(t) * 350;
    const cy = 480 + Math.sin(t * 2) * 180;
    await root.dispatchEvent("pointermove", { clientX: cx, clientY: cy });
    await sleep(200);
  }
  await sleep(1000);

  // Toggle theme to dark and back
  const themeToggle = page.locator("button.sh-theme");
  if (await themeToggle.isVisible()) {
    await themeToggle.click();
    await sleep(2500);
    await themeToggle.click();
    await sleep(1500);
  }

  // Click CTA to navigate
  await page.click("a.sh-primarycta, a.sh-navcta, a[href='/dashboard']");
  await sleep(4000); // Complete 20.0s

  console.log("\n>>> SCENE 3 (00:45 - 01:10, 25.0s): Live Air Monitor Dashboard");
  await page.goto(`${BASE_URL}/dashboard`, { waitUntil: "domcontentloaded" });
  await sleep(3000);

  // Hover over metric cards
  await page.hover("section, div.grid").catch(() => {});
  await sleep(2500);

  // Switch city from Delhi ITO to Mumbai BKC
  const locationBtn = page.locator("button:has-text('Delhi'), button:has-text('ITO'), button:has-text('Location')").first();
  if (await locationBtn.isVisible()) {
    await locationBtn.click();
    await sleep(1000);
    const mumbaiOpt = page.locator("button:has-text('Mumbai'), div:has-text('Mumbai')").first();
    if (await mumbaiOpt.isVisible()) {
      await mumbaiOpt.click();
      await sleep(2000);
    }
  }

  // Scroll smoothly down to forecast and attribution banner
  await page.evaluate(() => window.scrollBy({ top: 500, behavior: "smooth" }));
  await sleep(3500);
  await page.evaluate(() => window.scrollBy({ top: 400, behavior: "smooth" }));
  await sleep(4500);
  await page.evaluate(() => window.scrollTo({ top: 0, behavior: "smooth" }));
  await sleep(4500); // Complete 25.0s

  console.log("\n>>> SCENE 4 (01:10 - 01:40, 30.0s): Personalized Daily Action Plan & Wizard");
  await page.goto(`${BASE_URL}/daily-plan`, { waitUntil: "domcontentloaded" });
  await sleep(2500);

  // Click Onboarding / Edit Profile button
  const wizardBtn = page.locator("button:has-text('Set Up Household Profile'), button:has-text('Profile Active'), button:has-text('Edit Profile')").first();
  if (await wizardBtn.isVisible()) {
    await wizardBtn.click();
    await sleep(2000);

    // Step through wizard
    const stepNext = page.locator("button:has-text('Next Step'), button:has-text('Continue')");
    if (await stepNext.isVisible()) {
      await stepNext.click();
      await sleep(2000);
      if (await stepNext.isVisible()) {
        await stepNext.click();
        await sleep(2000);
        if (await stepNext.isVisible()) {
          await stepNext.click();
          await sleep(2000);
        }
      }
      const saveBtn = page.locator("button:has-text('Save'), button:has-text('Complete')");
      if (await saveBtn.isVisible()) {
        await saveBtn.click();
        await sleep(2500);
      }
    }
  }

  // Scroll through recommendations and Plan B card
  await page.evaluate(() => window.scrollBy({ top: 400, behavior: "smooth" }));
  await sleep(4000);
  await page.evaluate(() => window.scrollBy({ top: 400, behavior: "smooth" }));
  await sleep(5000);
  await page.evaluate(() => window.scrollTo({ top: 0, behavior: "smooth" }));
  await sleep(6000); // Complete 30.0s

  console.log("\n>>> SCENE 5 (01:40 - 02:00, 20.0s): Indoor Air Hygiene Coach");
  await page.goto(`${BASE_URL}/indoor-air`, { waitUntil: "domcontentloaded" });
  await sleep(3000);

  // Toggle window dropdown / room conditions
  const windowSelect = page.locator("select").first();
  if (await windowSelect.isVisible()) {
    await windowSelect.selectOption({ index: 1 }).catch(() => {});
    await sleep(2500);
    await windowSelect.selectOption({ index: 0 }).catch(() => {});
    await sleep(2500);
  }

  // Scroll through CADR purifier advisor
  await page.evaluate(() => window.scrollBy({ top: 450, behavior: "smooth" }));
  await sleep(4500);
  await page.evaluate(() => window.scrollTo({ top: 0, behavior: "smooth" }));
  await sleep(4500); // Complete 20.0s

  console.log("\n>>> SCENE 6 (02:00 - 02:25, 25.0s): What-If Scenario Simulator & Decision Receipts");
  await page.goto(`${BASE_URL}/scenarios`, { waitUntil: "domcontentloaded" });
  await sleep(3000);

  // Switch scenario tab
  const scenarioTabs = page.locator("button[role='tab']");
  if ((await scenarioTabs.count()) > 1) {
    await scenarioTabs.nth(1).click();
    await sleep(3000);
    await scenarioTabs.nth(2).click();
    await sleep(3000);
    await scenarioTabs.nth(0).click();
    await sleep(2000);
  }

  // Scroll to Decision Receipt Card
  await page.evaluate(() => window.scrollBy({ top: 500, behavior: "smooth" }));
  await sleep(4000);
  const receipt = page.locator("div:has-text('Decision Receipt'), div:has-text('SHA-256')").first();
  if (await receipt.isVisible()) {
    await receipt.hover();
    await sleep(5000);
  }
  await sleep(5000); // Complete 25.0s

  console.log("\n>>> SCENE 7 (02:25 - 02:45, 20.0s): Gemini AI & Cloud Saving");
  await page.goto(`${BASE_URL}/daily-plan`, { waitUntil: "domcontentloaded" });
  await sleep(2500);

  // Click AI Explanation button on top action
  const aiBtn = page.locator("button:has-text('Explain with AERIS AI'), button:has-text('AI Explanation')").first();
  if (await aiBtn.isVisible()) {
    await aiBtn.click();
    await sleep(4500);

    // Toggle language if available
    const langBtn = page.locator("button:has-text('Hindi'), button:has-text('हिंदी')").first();
    if (await langBtn.isVisible()) {
      await langBtn.click();
      await sleep(3000);
    }

    // Close drawer
    const closeBtn = page.locator("button[aria-label='Close drawer'], button:has-text('Close')").first();
    if (await closeBtn.isVisible()) {
      await closeBtn.click();
      await sleep(1500);
    }
  }

  // Open Save Plan Modal to show Supabase Cloud persistence
  const savePlanBtn = page.locator("button:has-text('Save Plan'), button:has-text('Cloud Save')").first();
  if (await savePlanBtn.isVisible()) {
    await savePlanBtn.click();
    await sleep(4000);
    const cancelModal = page.locator("button:has-text('Cancel'), button:has-text('Close')").first();
    if (await cancelModal.isVisible()) {
      await cancelModal.click();
      await sleep(1500);
    }
  }
  await sleep(3000); // Complete 20.0s

  console.log("\n>>> SCENE 8 (02:45 - 03:00, 15.0s): Closing Card & Impact");
  await page.goto(`${BASE_URL}/closing-card.html`, { waitUntil: "domcontentloaded" });
  await sleep(15000); // Complete 15.0s

  console.log("\n=== Finalizing Video Recording ===");
  await page.close();
  await context.close();
  await browser.close();

  if (serverProcess) {
    serverProcess.kill();
  }

  console.log("Browser recording closed cleanly!");
}

run().catch((err) => {
  console.error("Recording error:", err);
  process.exit(1);
});
