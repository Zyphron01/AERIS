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

async function recordScene2(browser) {
  const targetDurationSec = 20.0;
  console.log("=== Recording Scene 2 (Target: 20.0s) ===");
  const tempDir = path.join(SCENES_DIR, "temp_scene2");
  if (fs.existsSync(tempDir)) fs.rmSync(tempDir, { recursive: true, force: true });
  fs.mkdirSync(tempDir, { recursive: true });

  const context = await browser.newContext({
    viewport: { width: 1920, height: 1080 },
    recordVideo: { dir: tempDir, size: { width: 1920, height: 1080 } },
  });
  const page = await context.newPage();
  await page.addInitScript(() => {
    const style = document.createElement("style");
    style.textContent = "* { scroll-behavior: auto !important; }";
    document.head?.appendChild(style);
  });

  const startTime = Date.now();
  await page.goto(`${BASE_URL}/`, { waitUntil: "domcontentloaded", timeout: 8000 });
  await sleep(1500);

  // Smooth pointer interaction across sculpture
  const root = page.locator(".sh-root");
  for (let t = 0; t < Math.PI * 2.5; t += 0.3) {
    const cx = 960 + Math.sin(t) * 350;
    const cy = 480 + Math.sin(t * 2) * 180;
    await root.dispatchEvent("pointermove", { clientX: cx, clientY: cy });
    await sleep(250);
  }

  // Hover over primary CTA
  const cta = page.locator("a:has-text('Check My Air')").first();
  await cta.hover({ timeout: 3000 }).catch(() => {});
  await sleep(2000);

  // Pad to exact 20.0s
  const elapsed = (Date.now() - startTime) / 1000;
  const rem = Math.max(0, targetDurationSec - elapsed);
  if (rem > 0) await sleep(rem * 1000);

  await page.close();
  await context.close();

  const files = fs.readdirSync(tempDir).filter((f) => f.endsWith(".webm"));
  const src = path.join(tempDir, files[0]);
  const dest = path.join(SCENES_DIR, "scene2.webm");
  fs.copyFileSync(src, dest);
  fs.rmSync(tempDir, { recursive: true, force: true });
  console.log(`✓ Scene 2 updated cleanly: ${dest} (${fs.statSync(dest).size} bytes)`);
}

async function recordScene4(browser) {
  const targetDurationSec = 30.0;
  console.log("=== Recording Scene 4 (Target: 30.0s) ===");
  const tempDir = path.join(SCENES_DIR, "temp_scene4");
  if (fs.existsSync(tempDir)) fs.rmSync(tempDir, { recursive: true, force: true });
  fs.mkdirSync(tempDir, { recursive: true });

  const context = await browser.newContext({
    viewport: { width: 1920, height: 1080 },
    recordVideo: { dir: tempDir, size: { width: 1920, height: 1080 } },
  });
  const page = await context.newPage();
  await page.addInitScript(() => {
    const style = document.createElement("style");
    style.textContent = "* { scroll-behavior: auto !important; }";
    document.head?.appendChild(style);
  });

  const startTime = Date.now();
  await page.goto(`${BASE_URL}/daily-plan`, { waitUntil: "domcontentloaded", timeout: 8000 });
  await sleep(2000);

  // Open wizard
  const wizardBtn = page.locator("button:has-text('Set Up Household Profile'), button:has-text('Profile Active')").first();
  if (await wizardBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
    await wizardBtn.click({ timeout: 2000 }).catch(() => {});
    await sleep(3500);

    // Step 1 -> Step 2
    const nextBtn = page.locator("button:has-text('Next Step')").first();
    if (await nextBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
      await nextBtn.click({ timeout: 2000 }).catch(() => {});
      await sleep(3500);
      // Step 2 -> Step 3
      if (await nextBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
        await nextBtn.click({ timeout: 2000 }).catch(() => {});
        await sleep(3500);
      }
    }

    // Close wizard modal cleanly
    const closeBtn = page.locator("button:has-text('Cancel')").first();
    if (await closeBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
      await closeBtn.click({ timeout: 2000 }).catch(() => {});
      await sleep(1500);
    }
  }

  // Scroll smoothly through the generated ranked actions and Plan B card
  await page.evaluate(() => window.scrollBy({ top: 400, behavior: "smooth" }));
  await sleep(4000);
  await page.evaluate(() => window.scrollBy({ top: 400, behavior: "smooth" }));
  await sleep(4000);
  await page.evaluate(() => window.scrollTo({ top: 0, behavior: "smooth" }));

  // Pad to exact 30.0s
  const elapsed = (Date.now() - startTime) / 1000;
  const rem = Math.max(0, targetDurationSec - elapsed);
  if (rem > 0) await sleep(rem * 1000);

  await page.close();
  await context.close();

  const files = fs.readdirSync(tempDir).filter((f) => f.endsWith(".webm"));
  const src = path.join(tempDir, files[0]);
  const dest = path.join(SCENES_DIR, "scene4.webm");
  fs.copyFileSync(src, dest);
  fs.rmSync(tempDir, { recursive: true, force: true });
  console.log(`✓ Scene 4 updated cleanly: ${dest} (${fs.statSync(dest).size} bytes)`);
}

async function main() {
  console.log("=== Checking Next.js Server ===");
  let serverProcess = null;
  const isUp = await waitForServer(BASE_URL, 1500);
  if (!isUp) {
    console.log("Starting Next.js production server on 127.0.0.1:3000...");
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

  const browser = await chromium.launch({
    headless: true,
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
  });

  await recordScene2(browser);
  await recordScene4(browser);

  await browser.close();
  if (serverProcess) {
    serverProcess.kill();
  }
  console.log("Scene 2 and Scene 4 re-recorded successfully!");
}

main().catch((err) => {
  console.error("Error re-recording scenes:", err);
  process.exit(1);
});
