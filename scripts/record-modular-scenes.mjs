import { chromium } from "@playwright/test";
import { spawn } from "child_process";
import http from "http";
import path from "path";
import fs from "fs";

const BASE_URL = "http://127.0.0.1:3000";
const SUBMISSION_DIR = "C:/Users/kiran/AERIS-Submission";
const SCENES_DIR = path.join(SUBMISSION_DIR, "scenes");

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
      await sleep(400);
    }
  }
  return false;
}

const SCENE_CONFIGS = [
  {
    id: "scene1",
    name: "The Problem Context",
    durationSec: 25.0,
    run: async (page) => {
      console.log("  [Scene 1] Navigating to /problem-intro.html");
      await page.goto(`${BASE_URL}/problem-intro.html`, { waitUntil: "domcontentloaded", timeout: 10000 });
      await sleep(3000);
      const cards = page.locator(".q-card");
      for (let i = 0; i < 3; i++) {
        console.log(`  [Scene 1] Hovering card ${i + 1}`);
        await cards.nth(i).hover({ timeout: 5000 }).catch(() => {});
        await sleep(3500);
      }
    },
  },
  {
    id: "scene2",
    name: "Introducing AERIS & Liquid Sculpture",
    durationSec: 20.0,
    run: async (page) => {
      console.log("  [Scene 2] Navigating to /");
      await page.goto(`${BASE_URL}/`, { waitUntil: "domcontentloaded", timeout: 10000 });
      await sleep(2000);

      const root = page.locator(".sh-root");
      console.log("  [Scene 2] Simulating smooth cursor disturbance over Liquid Sculpture");
      for (let t = 0; t < Math.PI * 2; t += 0.4) {
        const cx = 960 + Math.sin(t) * 320;
        const cy = 480 + Math.sin(t * 2) * 160;
        await root.dispatchEvent("pointermove", { clientX: cx, clientY: cy });
        await sleep(200);
      }

      console.log("  [Scene 2] Toggling light/dark theme");
      const themeToggle = page.locator("button.sh-theme");
      if (await themeToggle.isVisible({ timeout: 5000 }).catch(() => false)) {
        await themeToggle.click();
        await sleep(2000);
        await themeToggle.click();
        await sleep(1500);
      }

      console.log("  [Scene 2] Hovering primary CTA");
      const cta = page.locator("a.sh-primarycta, a[href='/dashboard']").first();
      await cta.hover({ timeout: 5000 }).catch(() => {});
      await sleep(2000);
    },
  },
  {
    id: "scene3",
    name: "Live Air Monitor Dashboard",
    durationSec: 25.0,
    run: async (page) => {
      console.log("  [Scene 3] Navigating to /dashboard");
      await page.goto(`${BASE_URL}/dashboard`, { waitUntil: "domcontentloaded", timeout: 10000 });
      await sleep(3000);

      console.log("  [Scene 3] Inspecting location selector");
      const locBtn = page.locator("button:has-text('Delhi'), button:has-text('Location')").first();
      if (await locBtn.isVisible({ timeout: 5000 }).catch(() => false)) {
        await locBtn.click();
        await sleep(1200);
        const mumbai = page.locator("button:has-text('Mumbai')").first();
        if (await mumbai.isVisible({ timeout: 5000 }).catch(() => false)) {
          await mumbai.click();
          await sleep(2500);
        }
      }

      console.log("  [Scene 3] Scrolling through 24h rolling forecast chart and attribution");
      await page.evaluate(() => window.scrollBy({ top: 450, behavior: "smooth" }));
      await sleep(3500);
      await page.evaluate(() => window.scrollBy({ top: 400, behavior: "smooth" }));
      await sleep(4000);
      await page.evaluate(() => window.scrollTo({ top: 0, behavior: "smooth" }));
      await sleep(3000);
    },
  },
  {
    id: "scene4",
    name: "Personalized Daily Plan & Wizard",
    durationSec: 30.0,
    run: async (page) => {
      console.log("  [Scene 4] Navigating to /daily-plan");
      await page.goto(`${BASE_URL}/daily-plan`, { waitUntil: "domcontentloaded", timeout: 10000 });
      await sleep(2500);

      const wizardBtn = page.locator("button:has-text('Set Up Household Profile'), button:has-text('Profile Active'), button:has-text('Edit Profile')").first();
      if (await wizardBtn.isVisible({ timeout: 5000 }).catch(() => false)) {
        console.log("  [Scene 4] Opening onboarding wizard");
        await wizardBtn.click();
        await sleep(2000);

        const stepNext = page.locator("button:has-text('Next Step'), button:has-text('Continue')");
        for (let s = 1; s <= 3; s++) {
          if (await stepNext.isVisible({ timeout: 3000 }).catch(() => false)) {
            console.log(`  [Scene 4] Stepping wizard step ${s}`);
            await stepNext.click();
            await sleep(1500);
          }
        }
        const saveBtn = page.locator("button:has-text('Save'), button:has-text('Complete')");
        if (await saveBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
          console.log("  [Scene 4] Saving profile");
          await saveBtn.click();
          await sleep(2000);
        }
      }

      console.log("  [Scene 4] Reviewing ranked actions and Plan B card");
      await page.evaluate(() => window.scrollBy({ top: 380, behavior: "smooth" }));
      await sleep(4000);
      await page.evaluate(() => window.scrollBy({ top: 400, behavior: "smooth" }));
      await sleep(4000);
      await page.evaluate(() => window.scrollTo({ top: 0, behavior: "smooth" }));
      await sleep(3000);
    },
  },
  {
    id: "scene5",
    name: "Indoor Air Hygiene Coach",
    durationSec: 20.0,
    run: async (page) => {
      console.log("  [Scene 5] Navigating to /indoor-air");
      await page.goto(`${BASE_URL}/indoor-air`, { waitUntil: "domcontentloaded", timeout: 10000 });
      await sleep(2500);

      const windowSelect = page.locator("select").first();
      if (await windowSelect.isVisible({ timeout: 5000 }).catch(() => false)) {
        console.log("  [Scene 5] Toggling window infiltration conditions");
        await windowSelect.selectOption({ index: 1 }).catch(() => {});
        await sleep(2500);
        await windowSelect.selectOption({ index: 0 }).catch(() => {});
        await sleep(2500);
      }

      console.log("  [Scene 5] Inspecting purifier CADR room sizing");
      await page.evaluate(() => window.scrollBy({ top: 450, behavior: "smooth" }));
      await sleep(4000);
      await page.evaluate(() => window.scrollTo({ top: 0, behavior: "smooth" }));
      await sleep(3000);
    },
  },
  {
    id: "scene6",
    name: "What-If Simulator & Decision Receipts",
    durationSec: 25.0,
    run: async (page) => {
      console.log("  [Scene 6] Navigating to /scenarios");
      await page.goto(`${BASE_URL}/scenarios`, { waitUntil: "domcontentloaded", timeout: 10000 });
      await sleep(2500);

      const tabs = page.locator("button[role='tab']");
      if ((await tabs.count()) > 1) {
        console.log("  [Scene 6] Selecting scenario tabs");
        await tabs.nth(1).click();
        await sleep(2500);
        await tabs.nth(0).click();
        await sleep(2500);
      }

      console.log("  [Scene 6] Scrolling to Cryptographic Decision Receipt");
      await page.evaluate(() => window.scrollBy({ top: 520, behavior: "smooth" }));
      await sleep(4000);
      const receipt = page.locator("div:has-text('Decision Receipt'), div:has-text('SHA-256')").first();
      if (await receipt.isVisible({ timeout: 5000 }).catch(() => false)) {
        await receipt.hover().catch(() => {});
        await sleep(4000);
      }
      await page.evaluate(() => window.scrollTo({ top: 0, behavior: "smooth" }));
      await sleep(3000);
    },
  },
  {
    id: "scene7",
    name: "Gemini AI & Cloud Persistence",
    durationSec: 20.0,
    run: async (page) => {
      console.log("  [Scene 7] Navigating to /daily-plan");
      await page.goto(`${BASE_URL}/daily-plan`, { waitUntil: "domcontentloaded", timeout: 10000 });
      await sleep(2500);

      console.log("  [Scene 7] Opening AI explanation drawer");
      const aiBtn = page.locator("button:has-text('Explain with AERIS AI'), button:has-text('AI Explanation')").first();
      if (await aiBtn.isVisible({ timeout: 5000 }).catch(() => false)) {
        await aiBtn.click();
        await sleep(4000);

        const closeBtn = page.locator("button[aria-label='Close drawer'], button:has-text('Close')").first();
        if (await closeBtn.isVisible({ timeout: 4000 }).catch(() => false)) {
          await closeBtn.click();
          await sleep(1500);
        }
      }

      console.log("  [Scene 7] Showing Cloud Save modal");
      const saveBtn = page.locator("button:has-text('Save Plan'), button:has-text('Cloud Save')").first();
      if (await saveBtn.isVisible({ timeout: 5000 }).catch(() => false)) {
        await saveBtn.click();
        await sleep(3500);
        const cancelBtn = page.locator("button:has-text('Cancel'), button:has-text('Close')").first();
        if (await cancelBtn.isVisible({ timeout: 4000 }).catch(() => false)) {
          await cancelBtn.click();
          await sleep(1500);
        }
      }
    },
  },
  {
    id: "scene8",
    name: "Impact & Closing",
    durationSec: 15.0,
    run: async (page) => {
      console.log("  [Scene 8] Navigating to /closing-card.html");
      await page.goto(`${BASE_URL}/closing-card.html`, { waitUntil: "domcontentloaded", timeout: 10000 });
      await sleep(12000);
    },
  },
];

async function recordSingleScene(browser, sceneConfig) {
  const finalScenePath = path.join(SCENES_DIR, `${sceneConfig.id}.webm`);
  if (fs.existsSync(finalScenePath) && fs.statSync(finalScenePath).size > 100000) {
    console.log(`[${sceneConfig.id}] Already recorded (${fs.statSync(finalScenePath).size} bytes). Skipping.`);
    return finalScenePath;
  }

  console.log(`\n======================================================`);
  console.log(`STARTING RECORDING: ${sceneConfig.id} (${sceneConfig.name})`);
  console.log(`Target Duration: ${sceneConfig.durationSec.toFixed(1)}s`);
  console.log(`======================================================`);

  const tempRecordDir = path.join(SCENES_DIR, `temp_${sceneConfig.id}`);
  if (fs.existsSync(tempRecordDir)) {
    fs.rmSync(tempRecordDir, { recursive: true, force: true });
  }
  fs.mkdirSync(tempRecordDir, { recursive: true });

  const context = await browser.newContext({
    viewport: { width: 1920, height: 1080 },
    recordVideo: {
      dir: tempRecordDir,
      size: { width: 1920, height: 1080 },
    },
  });

  const page = await context.newPage();
  await page.addInitScript(() => {
    const style = document.createElement("style");
    style.textContent = "* { scroll-behavior: auto !important; }";
    document.head?.appendChild(style);
  });

  const startTime = Date.now();
  try {
    await sceneConfig.run(page);
  } catch (err) {
    console.warn(`[${sceneConfig.id}] Non-fatal action warning:`, err.message);
  }

  // Pad exactly to target duration
  const elapsed = (Date.now() - startTime) / 1000;
  const remaining = Math.max(0, sceneConfig.durationSec - elapsed);
  if (remaining > 0) {
    console.log(`  [${sceneConfig.id}] Padding ${remaining.toFixed(2)}s to meet exact scene length...`);
    await sleep(remaining * 1000);
  }

  console.log(`  [${sceneConfig.id}] Closing page & context to finalize video...`);
  await page.close();
  await context.close();

  // Find generated webm
  const files = fs.readdirSync(tempRecordDir).filter((f) => f.endsWith(".webm"));
  if (files.length === 0) {
    throw new Error(`No webm file produced in ${tempRecordDir}`);
  }
  const generatedFile = path.join(tempRecordDir, files[0]);
  fs.copyFileSync(generatedFile, finalScenePath);
  fs.rmSync(tempRecordDir, { recursive: true, force: true });

  const fileSize = fs.statSync(finalScenePath).size;
  console.log(`✓ [${sceneConfig.id}] Successfully recorded: ${finalScenePath} (${fileSize} bytes)`);
  return finalScenePath;
}

async function main() {
  if (!fs.existsSync(SCENES_DIR)) {
    fs.mkdirSync(SCENES_DIR, { recursive: true });
  }

  console.log("=== Checking Next.js Server ===");
  let serverProcess = null;
  const isUp = await waitForServer(BASE_URL, 1500);
  if (!isUp) {
    console.log("Starting Next.js production server...");
    serverProcess = spawn("npx", ["next", "start", "-H", "127.0.0.1", "-p", "3000"], {
      stdio: "pipe",
      shell: true,
    });
    const ready = await waitForServer(BASE_URL, 30000);
    if (!ready) {
      console.error("Could not reach Next.js server on 127.0.0.1:3000");
      process.exit(1);
    }
  }

  console.log("=== Launching Playwright Chromium (Stable No-GPU Flags) ===");
  const browser = await chromium.launch({
    headless: true,
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
  });

  const recordedScenes = [];
  for (const scene of SCENE_CONFIGS) {
    let success = false;
    for (let attempt = 1; attempt <= 2; attempt++) {
      try {
        const scenePath = await recordSingleScene(browser, scene);
        recordedScenes.push(scenePath);
        success = true;
        break;
      } catch (err) {
        console.error(`Attempt ${attempt} for ${scene.id} failed:`, err);
        await sleep(2000);
      }
    }
    if (!success) {
      console.error(`Fatal: Failed to record ${scene.id} after 2 attempts.`);
      break;
    }
  }

  await browser.close();
  if (serverProcess) {
    serverProcess.kill();
  }

  console.log("\n======================================================");
  console.log(`All ${recordedScenes.length}/8 scenes recorded cleanly!`);
  console.log("======================================================");
}

main().catch((err) => {
  console.error("Master recording pipeline error:", err);
  process.exit(1);
});
