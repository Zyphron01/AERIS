import { test, expect, Page } from "@playwright/test";

const MOCK_USER = {
  id: "14b18876-0000-4000-a000-000000000001",
  aud: "authenticated",
  role: "authenticated",
  email: "cloud-tester@aeris.internal",
  email_confirmed_at: "2026-11-21T00:00:00Z",
  created_at: "2026-11-21T00:00:00Z",
};

const MOCK_SESSION = {
  access_token: "mock-access-token-test",
  token_type: "bearer",
  expires_in: 3600,
  refresh_token: "mock-refresh-token-test",
  user: MOCK_USER,
};

const VALID_TEST_PROFILE = {
  id: "demo-profile-delhi",
  members: ["adults", "children"],
  declaredSensitivity: "none",
  primaryCommute: "active_walking_biking",
  outdoorExercise: "early_morning",
  hasSchoolRoutine: true,
  filtration: "hepa_purifier",
  ventilationPreference: "natural_windows",
  indoorSources: ["cooking_fumes"],
  budgetPreference: "limited",
  updatedAt: "2026-11-21T06:00:00Z",
};

async function setupMockSupabaseAuth(page: Page) {
  await page.route(/\/auth\/v1\/token/, async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify(MOCK_SESSION),
    });
  });

  await page.route(/\/auth\/v1\/user/, async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify(MOCK_USER),
    });
  });
}

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
      name: "CPCB National AQI (Model-Derived Estimate)",
      value: 245,
      category: "Poor",
      dominantPollutant: "pm2_5",
      scaleMin: 0,
      scaleMax: 500,
      colorClass: "text-orange-700 bg-orange-50",
      methodology: "model-derived-cpcb-method",
    },
  },
  pollutants: [
    {
      code: "pm2_5",
      name: "Particulate Matter < 2.5 µm",
      value: 110.0,
      unit: "µg/m³",
      averagingPeriod: "1-hour instantaneous modeled",
      rollingAverageValue: 98.0,
      rollingAverageUnit: "µg/m³",
      status: "available",
    },
    {
      code: "pm10",
      name: "Particulate Matter < 10 µm",
      value: 180.0,
      unit: "µg/m³",
      averagingPeriod: "1-hour instantaneous modeled",
      rollingAverageValue: 165.0,
      rollingAverageUnit: "µg/m³",
      status: "available",
    },
    {
      code: "no2",
      name: "Nitrogen Dioxide",
      value: 45.0,
      unit: "µg/m³",
      averagingPeriod: "1-hour instantaneous modeled",
      rollingAverageValue: 40.0,
      rollingAverageUnit: "µg/m³",
      status: "available",
    },
  ],
  hourlyForecast: [],
  disclaimer: "Modeled forecast estimate.",
};

test.describe("Supabase Cloud Persistence & Guest Mode Preservation", () => {
  test.beforeEach(async ({ page }) => {
    await page.route("**/api/telemetry?locationId=*", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(MOCK_TELEMETRY),
      });
    });
  });

  test("preserves guest onboarding without requiring account creation", async ({ page }) => {
    await page.goto("/daily-plan");
    await page.waitForLoadState("networkidle");

    // Guest onboarding callout must be visible
    await expect(page.locator("text=Personalize your daily air-quality decisions")).toBeVisible();
    await expect(page.locator("text=No account required")).toBeVisible();

    // Verify Cloud controls are accessible in the header
    const cloudBtn = page.getByRole("button", { name: "Cloud Account Sign In" });
    await expect(cloudBtn).toBeVisible();

    // Save Plan button should be present in header
    const saveBtn = page.getByRole("button", { name: "Save daily action plan to cloud" });
    await expect(saveBtn).toBeVisible();
  });

  test("triggers AuthModal with guest disclosure when clicking Save Plan as a guest", async ({ page }) => {
    await page.goto("/daily-plan");
    await page.waitForLoadState("networkidle");

    const saveBtn = page.getByRole("button", { name: /Save daily action plan to cloud/i });
    await saveBtn.click();

    // Auth modal should open
    const modal = page.locator('div[role="dialog"][aria-modal="true"]');
    await expect(modal).toBeVisible();
    await expect(page.locator("text=Sign In to AERIS Cloud")).toBeVisible();
    await expect(page.locator("text=Guest mode is always enabled")).toBeVisible();

    // Test tab toggle to Sign Up
    await page.getByRole("button", { name: "Sign Up" }).click();
    await expect(page.locator("text=Create Cloud Account")).toBeVisible();

    // Close via close button
    await page.getByLabel("Close dialog").click();
    await expect(modal).not.toBeVisible();
  });

  test("closes AuthModal on Escape key press", async ({ page }) => {
    await page.goto("/daily-plan");
    await page.waitForLoadState("networkidle");

    const cloudBtn = page.getByRole("button", { name: "Cloud Account Sign In" });
    await cloudBtn.click();

    const modal = page.locator('div[role="dialog"][aria-modal="true"]');
    await expect(modal).toBeVisible();

    await page.keyboard.press("Escape");
    await expect(modal).not.toBeVisible();
  });

  test("Scenario Simulator offers Save to Cloud for Decision Receipts", async ({ page }) => {
    await page.goto("/scenarios");
    await page.waitForLoadState("networkidle");

    // Check for Save to Cloud button on the Decision Receipt
    const saveReceiptBtn = page.getByRole("button", { name: /Save decision receipt to cloud/i });
    await expect(saveReceiptBtn).toBeVisible();

    // Clicking it as guest should open the AuthModal
    await saveReceiptBtn.click();
    const modal = page.locator('div[role="dialog"][aria-modal="true"]');
    await expect(modal).toBeVisible();
    await expect(page.locator("text=Sign In to AERIS Cloud")).toBeVisible();
  });

  test("allows a signed-in user to save a plan to the cloud with visual confirmation", async ({ page }) => {
    // Seed household profile in localStorage with valid profile schema
    await page.addInitScript((profile) => {
      window.localStorage.setItem("aeris_household_profile_v1", JSON.stringify(profile));
    }, VALID_TEST_PROFILE);

    // Mock Supabase Auth and PostgREST endpoints
    await setupMockSupabaseAuth(page);

    await page.route(/\/rest\/v1\/saved_plans/, async (route) => {
      if (route.request().method() === "POST") {
        await route.fulfill({
          status: 201,
          contentType: "application/json",
          body: JSON.stringify([
            {
              id: "99999999-9999-4999-a999-999999999999",
              user_id: "14b18876-0000-4000-a000-000000000001",
              title: "Action Plan for Delhi NCR",
              plan_date: "2026-11-22",
              location_name: "Delhi NCR",
              latitude: 28.6139,
              longitude: 77.209,
              primary_pollutant: "pm2_5",
              estimated_cpcb_aqi: 245,
              cpcb_category: "Poor",
              actions_count: 3,
              plan_payload: {},
              schema_version: 1,
              created_at: "2026-11-22T06:00:00Z",
            },
          ]),
        });
      } else {
        await route.continue();
      }
    });

    await page.goto("/daily-plan");
    await page.waitForLoadState("networkidle");

    // Open Auth modal and sign in
    const cloudBtn = page.getByRole("button", { name: "Cloud Account Sign In" });
    await cloudBtn.click();

    const authModal = page.locator('div[role="dialog"][aria-modal="true"]');
    await expect(authModal).toBeVisible();

    await page.getByLabel("Email Address").fill("cloud-tester@aeris.internal");
    await page.getByLabel("Password").fill("SafePassword123!");
    await page.locator('button[type="submit"]:has-text("Sign In")').click();

    // Verify modal auto-closing and authenticated session indicators
    await expect(authModal).not.toBeVisible({ timeout: 5000 });
    await expect(page.getByRole("button", { name: "View cloud-saved action plans" })).toBeVisible({ timeout: 5000 });

    // Save Daily Plan to Cloud
    const saveBtn = page.getByRole("button", { name: "Save daily action plan to cloud" });
    await saveBtn.click();

    // Button should visually confirm saved state
    await expect(
      page.getByRole("button", { name: "Action plan saved to cloud" })
    ).toBeVisible({ timeout: 5000 });
  });

  test("allows a signed-in user to view and delete cloud-saved plans in SavedPlansModal", async ({ page }) => {
    // Seed household profile in localStorage with valid profile schema
    await page.addInitScript((profile) => {
      window.localStorage.setItem("aeris_household_profile_v1", JSON.stringify(profile));
    }, VALID_TEST_PROFILE);

    let planDeleted = false;

    await setupMockSupabaseAuth(page);

    await page.route(/\/rest\/v1\/saved_plans/, async (route) => {
      const method = route.request().method();
      if (method === "GET") {
        if (planDeleted) {
          await route.fulfill({
            status: 200,
            contentType: "application/json",
            body: JSON.stringify([]),
          });
        } else {
          await route.fulfill({
            status: 200,
            contentType: "application/json",
            body: JSON.stringify([
              {
                id: "plan-delhi-101",
                user_id: "14b18876-0000-4000-a000-000000000001",
                title: "Action Plan for Delhi NCR",
                plan_date: "2026-11-22",
                location_name: "Delhi NCR",
                latitude: 28.6139,
                longitude: 77.209,
                primary_pollutant: "pm2_5",
                estimated_cpcb_aqi: 245,
                cpcb_category: "Poor",
                actions_count: 3,
                plan_payload: {},
                schema_version: 1,
                created_at: "2026-11-22T06:00:00Z",
              },
            ]),
          });
        }
      } else if (method === "DELETE") {
        planDeleted = true;
        await route.fulfill({
          status: 204,
          contentType: "application/json",
          body: "",
        });
      } else {
        await route.continue();
      }
    });

    await page.goto("/daily-plan");
    await page.waitForLoadState("networkidle");

    // Sign in
    await page.getByRole("button", { name: "Cloud Account Sign In" }).click();
    const authModal = page.locator('div[role="dialog"][aria-modal="true"]');
    await expect(authModal).toBeVisible();

    await page.getByLabel("Email Address").fill("cloud-tester@aeris.internal");
    await page.getByLabel("Password").fill("SafePassword123!");
    await page.locator('button[type="submit"]:has-text("Sign In")').click();
    await expect(authModal).not.toBeVisible({ timeout: 5000 });

    // Open Saved Plans Modal
    const savedPlansBtn = page.getByRole("button", { name: "View cloud-saved action plans" });
    await expect(savedPlansBtn).toBeVisible({ timeout: 5000 });
    await savedPlansBtn.click();

    // Verify modal is displayed with the saved plan
    const modal = page.locator('div[role="dialog"][aria-modal="true"]');
    await expect(modal).toBeVisible();
    await expect(page.locator("text=Cloud-Saved Action Plans")).toBeVisible();
    await expect(page.locator("text=Action Plan for Delhi NCR")).toBeVisible();
    await expect(page.locator("text=AQI 245 • Poor")).toBeVisible();

    // Delete the plan
    const deleteBtn = page.getByRole("button", { name: /Delete saved plan for Delhi NCR/i });
    await expect(deleteBtn).toBeVisible();
    await deleteBtn.click({ force: true });

    // Plan should be removed and empty state shown
    await expect(page.locator("text=No saved action plans found.")).toBeVisible({ timeout: 5000 });

    // Close the modal
    await page.getByRole("button", { name: "Close", exact: true }).click({ force: true });
    await expect(modal).not.toBeVisible({ timeout: 5000 });
  });

  test("allows a signed-in user to save a decision receipt in /scenarios to the cloud", async ({ page }) => {
    await setupMockSupabaseAuth(page);

    await page.route(/\/rest\/v1\/decision_receipts/, async (route) => {
      if (route.request().method() === "POST") {
        await route.fulfill({
          status: 201,
          contentType: "application/json",
          body: JSON.stringify([
            {
              id: "receipt-db-id-01",
              user_id: "14b18876-0000-4000-a000-000000000001",
              receipt_id: "RCP-MOCK-01",
              scenario_id: "SCN-EXERCISE",
              scenario_label: "Outdoor Exercise",
              timing_slot: "06:00 - 07:00",
              action_type: "exercise",
              cpcb_aqi_band: "Poor",
              hourly_pm25_estimate: 110.0,
              mitigation_steps: ["Shift to cleaner slot"],
              created_at: "2026-11-22T06:00:00Z",
            },
          ]),
        });
      } else {
        await route.continue();
      }
    });

    await page.goto("/scenarios");
    await page.waitForLoadState("networkidle");

    // Click Save to Cloud on the Decision Receipt card (opens AuthModal because not signed in yet)
    const saveReceiptBtn = page.getByRole("button", { name: /Save decision receipt to cloud/i });
    await expect(saveReceiptBtn).toBeVisible();
    await saveReceiptBtn.click();

    // Sign in through the AuthModal
    const authModal = page.locator('div[role="dialog"][aria-modal="true"]');
    await expect(authModal).toBeVisible();

    await page.getByLabel("Email Address").fill("cloud-tester@aeris.internal");
    await page.getByLabel("Password").fill("SafePassword123!");
    await page.locator('button[type="submit"]:has-text("Sign In")').click();
    await expect(authModal).not.toBeVisible({ timeout: 5000 });

    // Click Save to Cloud now that user is signed in
    await saveReceiptBtn.click();

    // Verify it transitions to "Saved to Cloud"
    await expect(page.locator("text=Saved to Cloud")).toBeVisible({ timeout: 5000 });
  });
});
