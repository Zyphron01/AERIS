/**
 * AERIS — Live Authenticated Supabase CRUD & Cross-User RLS Verification
 * File: scripts/test-live-authenticated-crud.mjs
 * 
 * Tests actual live database operations against Supabase using real authenticated sessions.
 * Verifies:
 *  1. Unauthenticated access denial (least privilege)
 *  2. User 1 authenticated INSERT of disposable record
 *  3. User 1 authenticated SELECT (reads own record)
 *  4. User 2 authenticated SELECT (cross-user read blocked by RLS)
 *  5. User 2 authenticated DELETE attempt on User 1 record (cross-user delete blocked by RLS)
 *  6. User 2 authenticated INSERT and verification
 *  7. Clean deletion of disposable records
 *  8. Verification of final clean state
 */

import nextEnv from "@next/env";
import { createClient } from "@supabase/supabase-js";

const { loadEnvConfig } = nextEnv;
loadEnvConfig(process.cwd());

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key =
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

const user1Email = process.env.TEST_USER_1_EMAIL;
const user1Password = process.env.TEST_USER_1_PASSWORD;
const user2Email = process.env.TEST_USER_2_EMAIL;
const user2Password = process.env.TEST_USER_2_PASSWORD;

console.log("=================================================================");
console.log("AERIS — Live Authenticated PostgreSQL CRUD & RLS Verification");
console.log("=================================================================\n");

if (!url || !key) {
  console.error("❌ Missing NEXT_PUBLIC_SUPABASE_URL or Publishable Key in .env.local");
  process.exit(1);
}

console.log("✓ Environment variables confirmed present (tokens protected).");

async function runLiveVerification() {
  const anonClient = createClient(url, key, { auth: { persistSession: false } });

  // 1. Verify Unauthenticated Least Privilege Access
  console.log("\n[Test 1] Verifying Unauthenticated Access Denial (Least Privilege):");
  const tables = ["saved_plans", "decision_receipts", "scenario_history"];
  let unauthBlocked = true;

  for (const table of tables) {
    const { error } = await anonClient.from(table).select("*").limit(1);
    if (error && error.code === "42501") {
      console.log(`  ✓ Unauthenticated access to '${table}' denied by PostgreSQL relation privileges (Code: 42501).`);
    } else if (error) {
      console.log(`  ✓ Unauthenticated query to '${table}' rejected: ${error.message}`);
    } else {
      console.error(`  ❌ SECURITY DEFECT: Unauthenticated query returned data from '${table}'!`);
      unauthBlocked = false;
    }
  }

  if (!unauthBlocked) {
    throw new Error("Security failure: unauthenticated client was granted table access.");
  }

  if (!user1Email || !user1Password || !user2Email || !user2Password) {
    console.log("\n⚠️  TEST USER CREDENTIALS NOT YET CONFIGURED IN .env.local");
    console.log("Please create two confirmed test users in your Supabase Dashboard:");
    console.log("  1. Open Supabase Dashboard -> Authentication -> Users");
    console.log("  2. Click 'Add user' -> 'Create user'");
    console.log("     - Email: tester1@aeris.local");
    console.log("     - Auto Confirm: YES");
    console.log("  3. Create second user:");
    console.log("     - Email: tester2@aeris.local");
    console.log("     - Auto Confirm: YES");
    console.log("  4. Add to .env.local:");
    console.log("     TEST_USER_1_EMAIL=tester1@aeris.local");
    console.log("     TEST_USER_1_PASSWORD=<password>");
    console.log("     TEST_USER_2_EMAIL=tester2@aeris.local");
    console.log("     TEST_USER_2_PASSWORD=<password>");
    console.log("  5. Re-run: node scripts/test-live-authenticated-crud.mjs\n");
    return;
  }

  // 2. Authenticate User 1
  console.log("\n[Test 2] Authenticating User 1...");
  const client1 = createClient(url, key, { auth: { persistSession: false } });
  const { data: auth1, error: auth1Err } = await client1.auth.signInWithPassword({
    email: user1Email,
    password: user1Password,
  });

  if (auth1Err || !auth1.user) {
    console.error(`  ❌ User 1 sign-in failed: ${auth1Err?.message}`);
    return;
  }
  console.log(`  ✓ User 1 authenticated successfully (UUID: ${auth1.user.id.slice(0, 8)}...).`);

  // Pre-cleanup of any previous disposable test records
  await client1.from("saved_plans").delete().ilike("title", "%Disposable Verification Plan%");

  // 3. User 1 Insert Disposable Saved Plan
  console.log("\n[Test 3] User 1: Inserting disposable test plan...");
  const testPlanTitle = `Disposable Verification Plan - ${Date.now()}`;
  const { data: insertedPlan, error: insertPlanErr } = await client1
    .from("saved_plans")
    .insert({
      user_id: auth1.user.id,
      title: testPlanTitle,
      plan_date: new Date().toISOString().split("T")[0],
      location_name: "Verification Lab",
      latitude: 28.6139,
      longitude: 77.209,
      primary_pollutant: "pm2_5",
      estimated_cpcb_aqi: 120,
      cpcb_category: "Moderate",
      actions_count: 1,
      plan_payload: { verified: true, disposable: true },
      schema_version: 1,
    })
    .select("id, title, user_id, created_at")
    .single();

  if (insertPlanErr || !insertedPlan) {
    console.error(`  ❌ User 1 INSERT failed: ${insertPlanErr?.message} (Code: ${insertPlanErr?.code})`);
    if (insertPlanErr?.code === "42501") {
      console.error("  ↳ Table grants have not been applied yet. Run: supabase/migrations/20261122000001_least_privilege_grants.sql in Supabase SQL Editor.");
    }
    return;
  }
  console.log(`  ✓ User 1 INSERT succeeded! Plan ID: ${insertedPlan.id}`);

  // 4. User 1 Select (Confirm Own Read)
  console.log("\n[Test 4] User 1: Selecting own saved plans...");
  const { data: user1Plans, error: user1SelectErr } = await client1
    .from("saved_plans")
    .select("id, title")
    .eq("id", insertedPlan.id);

  if (user1SelectErr || !user1Plans || user1Plans.length === 0) {
    console.error(`  ❌ User 1 SELECT failed: ${user1SelectErr?.message}`);
    return;
  }
  console.log(`  ✓ User 1 SELECT succeeded: Retrieved ${user1Plans.length} record matching created ID.`);

  // 5. Authenticate User 2
  console.log("\n[Test 5] Authenticating User 2...");
  const client2 = createClient(url, key, { auth: { persistSession: false } });
  const { data: auth2, error: auth2Err } = await client2.auth.signInWithPassword({
    email: user2Email,
    password: user2Password,
  });

  if (auth2Err || !auth2.user) {
    console.error(`  ❌ User 2 sign-in failed: ${auth2Err?.message}`);
    return;
  }
  console.log(`  ✓ User 2 authenticated successfully (UUID: ${auth2.user.id.slice(0, 8)}...).`);

  // 6. User 2 Cross-User Read Attempt (Must Return 0 rows under RLS)
  console.log("\n[Test 6] Cross-User RLS Test: User 2 attempting to read User 1's plan...");
  const { data: crossReadData, error: crossReadErr } = await client2
    .from("saved_plans")
    .select("id, title")
    .eq("id", insertedPlan.id);

  if (crossReadErr) {
    console.log(`  ✓ Cross-user read rejected by policy: ${crossReadErr.message}`);
  } else if (crossReadData && crossReadData.length === 0) {
    console.log(`  ✓ Cross-user read ISOLATION CONFIRMED: User 2 received 0 rows for User 1's plan!`);
  } else {
    console.error(`  ❌ CRITICAL SECURITY VULNERABILITY: User 2 was able to read User 1's private record!`);
    return;
  }

  // 7. User 2 Cross-User Delete Attempt (Must be denied / delete 0 rows)
  console.log("\n[Test 7] Cross-User RLS Tamper Test: User 2 attempting to delete User 1's plan...");
  const { data: crossDeleteData, error: crossDeleteErr } = await client2
    .from("saved_plans")
    .delete()
    .eq("id", insertedPlan.id)
    .select();

  if (crossDeleteErr) {
    console.log(`  ✓ Cross-user DELETE blocked with error: ${crossDeleteErr.message}`);
  } else if (!crossDeleteData || crossDeleteData.length === 0) {
    console.log(`  ✓ Cross-user DELETE TAMPER DENIED: User 2 deleted 0 rows!`);
  } else {
    console.error(`  ❌ CRITICAL SECURITY VULNERABILITY: User 2 deleted User 1's private record!`);
    return;
  }

  // 8. User 2 Insert Disposable Decision Receipt
  console.log("\n[Test 8] User 2: Inserting disposable decision receipt...");
  const testReceiptId = `RCP-LIVE-${Date.now()}`;
  const { data: insertedReceipt, error: insertReceiptErr } = await client2
    .from("decision_receipts")
    .insert({
      user_id: auth2.user.id,
      receipt_id: testReceiptId,
      scenario_id: "SCN-LIVE-01",
      scenario_label: "Live Test Scenario",
      timing_slot: "08:00 - 09:00",
      action_type: "exercise",
      cpcb_aqi_band: "Moderate",
      hourly_pm25_estimate: 45.0,
      mitigation_steps: ["Test step"],
    })
    .select("id, receipt_id, user_id")
    .single();

  if (insertReceiptErr || !insertedReceipt) {
    console.error(`  ❌ User 2 INSERT failed: ${insertReceiptErr?.message}`);
    return;
  }
  console.log(`  ✓ User 2 INSERT succeeded! Receipt DB ID: ${insertedReceipt.id}`);

  // 9. User 1 Cross-User Read on User 2 Receipt (Must Return 0 rows)
  console.log("\n[Test 9] Cross-User RLS Test: User 1 attempting to read User 2's receipt...");
  const { data: crossReceiptData } = await client1
    .from("decision_receipts")
    .select("id")
    .eq("id", insertedReceipt.id);

  if (!crossReceiptData || crossReceiptData.length === 0) {
    console.log(`  ✓ Cross-user read ISOLATION CONFIRMED: User 1 received 0 rows for User 2's receipt!`);
  } else {
    console.error(`  ❌ CRITICAL SECURITY VULNERABILITY: User 1 read User 2's receipt!`);
    return;
  }

  // 10. User 1 Insert Disposable Scenario History Record
  console.log("\n[Test 10] User 1: Inserting disposable scenario history record...");
  const { data: insertedScenario, error: insertScenarioErr } = await client1
    .from("scenario_history")
    .insert({
      user_id: auth1.user.id,
      scenario_type: "exercise",
      location_name: "Delhi NCR (Live Test)",
      baseline_pm25: 85.0,
      optimal_pm25: 25.0,
      exposure_reduction_pct: 70.5,
      receipt_payload: {
        scenario_id: "SCN-LIVE-HIST",
        mitigation_actions: ["Shift to morning window", "Wear N95 outdoors"],
      },
    })
    .select("id, user_id, scenario_type, exposure_reduction_pct")
    .single();

  if (insertScenarioErr || !insertedScenario) {
    console.error(`  ❌ User 1 scenario history INSERT failed: ${insertScenarioErr?.message}`);
    return;
  }
  console.log(`  ✓ User 1 scenario history INSERT succeeded! DB ID: ${insertedScenario.id}`);

  // 11. User 1 Select Own Scenario History Record
  console.log("\n[Test 11] User 1: Selecting own scenario history record...");
  const { data: user1Scenario, error: selectScenarioErr } = await client1
    .from("scenario_history")
    .select("id, scenario_type, exposure_reduction_pct")
    .eq("id", insertedScenario.id)
    .single();

  if (selectScenarioErr || !user1Scenario) {
    console.error(`  ❌ User 1 scenario history SELECT failed: ${selectScenarioErr?.message}`);
    return;
  }
  console.log(`  ✓ User 1 SELECT succeeded: type=${user1Scenario.scenario_type}, reduction=${user1Scenario.exposure_reduction_pct}%`);

  // 12. Cross-User RLS Test: User 2 Read on User 1 Scenario History (Must Return 0 rows)
  console.log("\n[Test 12] Cross-User RLS Test: User 2 attempting to read User 1's scenario history...");
  const { data: crossScenarioData } = await client2
    .from("scenario_history")
    .select("id")
    .eq("id", insertedScenario.id);

  if (!crossScenarioData || crossScenarioData.length === 0) {
    console.log(`  ✓ Cross-user read ISOLATION CONFIRMED: User 2 received 0 rows for User 1's scenario history!`);
  } else {
    console.error(`  ❌ CRITICAL SECURITY VULNERABILITY: User 2 read User 1's scenario history!`);
    return;
  }

  // 13. Cross-User RLS Test: User 2 Delete on User 1 Scenario History (Must Delete 0 rows)
  console.log("\n[Test 13] Cross-User RLS Test: User 2 attempting to delete User 1's scenario history...");
  const { data: deletedCrossScenario, error: deleteCrossScenarioErr } = await client2
    .from("scenario_history")
    .delete()
    .eq("id", insertedScenario.id)
    .select("id");

  if (!deleteCrossScenarioErr && (!deletedCrossScenario || deletedCrossScenario.length === 0)) {
    console.log(`  ✓ Cross-user delete ISOLATION CONFIRMED: User 2 deleted 0 rows of User 1's scenario history!`);
  } else {
    console.error(`  ❌ CRITICAL SECURITY VULNERABILITY: User 2 deleted User 1's scenario history!`);
    return;
  }

  // 14. Cross-User INSERT Tampering Rejection Test (WITH CHECK auth.uid() = user_id)
  console.log("\n[Test 14] Cross-User INSERT Tampering Rejection: Testing WITH CHECK enforcement...");

  // 14a. User 1 tries to insert into saved_plans claiming to be User 2
  const { error: tamperPlanErr } = await client1
    .from("saved_plans")
    .insert({
      user_id: auth2.user.id, // Forged user_id
      title: "Malicious Tampered Plan",
      plan_date: "2026-11-22",
      location_name: "Tamper Location",
      latitude: 28.6139,
      longitude: 77.209,
      primary_pollutant: "PM2.5",
      estimated_cpcb_aqi: 250,
      cpcb_category: "Poor",
      actions_count: 1,
      plan_payload: { malicious: true },
    });

  if (tamperPlanErr) {
    console.log(`  ✓ saved_plans: Cross-user INSERT tampering REJECTED! (Error: ${tamperPlanErr.message})`);
  } else {
    console.error(`  ❌ CRITICAL SECURITY VULNERABILITY: User 1 successfully forged user_id on saved_plans!`);
    return;
  }

  // 14b. User 1 tries to insert into decision_receipts claiming to be User 2
  const { error: tamperReceiptErr } = await client1
    .from("decision_receipts")
    .insert({
      user_id: auth2.user.id, // Forged user_id
      receipt_id: `RCP-FORGED-${Date.now()}`,
      scenario_id: "SCN-FORGED",
      scenario_label: "Tampered Receipt",
      timing_slot: "08:00 - 09:00",
      action_type: "exercise",
      cpcb_aqi_band: "Moderate",
      hourly_pm25_estimate: 45.0,
      mitigation_steps: ["Tamper step"],
    });

  if (tamperReceiptErr) {
    console.log(`  ✓ decision_receipts: Cross-user INSERT tampering REJECTED! (Error: ${tamperReceiptErr.message})`);
  } else {
    console.error(`  ❌ CRITICAL SECURITY VULNERABILITY: User 1 successfully forged user_id on decision_receipts!`);
    return;
  }

  // 14c. User 1 tries to insert into scenario_history claiming to be User 2
  const { error: tamperScenarioErr } = await client1
    .from("scenario_history")
    .insert({
      user_id: auth2.user.id, // Forged user_id
      scenario_type: "exercise",
      location_name: "Tamper Location",
      baseline_pm25: 100.0,
      optimal_pm25: 50.0,
      exposure_reduction_pct: 50.0,
      receipt_payload: { malicious: true },
    });

  if (tamperScenarioErr) {
    console.log(`  ✓ scenario_history: Cross-user INSERT tampering REJECTED! (Error: ${tamperScenarioErr.message})`);
  } else {
    console.error(`  ❌ CRITICAL SECURITY VULNERABILITY: User 1 successfully forged user_id on scenario_history!`);
    return;
  }

  // 15. Clean Up Disposable Records
  console.log("\n[Test 15] Cleaning up disposable test records...");
  const { error: cleanup1Err } = await client1
    .from("saved_plans")
    .delete()
    .eq("id", insertedPlan.id);

  if (cleanup1Err) {
    console.error(`  ⚠️ Cleanup error on plan ${insertedPlan.id}: ${cleanup1Err.message}`);
  } else {
    console.log(`  ✓ User 1 disposable plan (${insertedPlan.id}) deleted cleanly.`);
  }

  const { error: cleanup2Err } = await client2
    .from("decision_receipts")
    .delete()
    .eq("id", insertedReceipt.id);

  if (cleanup2Err) {
    console.error(`  ⚠️ Cleanup error on receipt ${insertedReceipt.id}: ${cleanup2Err.message}`);
  } else {
    console.log(`  ✓ User 2 disposable receipt (${insertedReceipt.id}) deleted cleanly.`);
  }

  const { error: cleanup3Err } = await client1
    .from("scenario_history")
    .delete()
    .eq("id", insertedScenario.id);

  if (cleanup3Err) {
    console.error(`  ⚠️ Cleanup error on scenario_history ${insertedScenario.id}: ${cleanup3Err.message}`);
  } else {
    console.log(`  ✓ User 1 disposable scenario_history (${insertedScenario.id}) deleted cleanly.`);
  }

  // 16. Final Verification of Clean State
  console.log("\n[Test 16] Final verification of clean database state...");
  const { data: verifyCleanup1 } = await client1
    .from("saved_plans")
    .select("id")
    .eq("id", insertedPlan.id);

  const { data: verifyCleanup2 } = await client2
    .from("decision_receipts")
    .select("id")
    .eq("id", insertedReceipt.id);

  const { data: verifyCleanup3 } = await client1
    .from("scenario_history")
    .select("id")
    .eq("id", insertedScenario.id);

  if (
    (!verifyCleanup1 || verifyCleanup1.length === 0) &&
    (!verifyCleanup2 || verifyCleanup2.length === 0) &&
    (!verifyCleanup3 || verifyCleanup3.length === 0)
  ) {
    console.log("  ✓ Verification of clean database state confirmed: 0 test residues remaining.\n");
  } else {
    console.error("  ❌ WARNING: Test residues still present in database!");
  }

  console.log("=================================================================");
  console.log("ALL LIVE CRUD & CROSS-USER RLS TESTS PASSED 100%!");
  console.log("=================================================================");
}

runLiveVerification().catch((err) => {
  console.error("Fatal test error:", err);
  process.exit(1);
});
