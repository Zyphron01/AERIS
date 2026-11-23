-- ==============================================================================
-- AERIS — Supabase PostgreSQL Cloud Persistence Migration
-- File: supabase/migrations/20261122000000_init_cloud_persistence.sql
-- Description:
--   Creates tables for saved daily plans, decision receipts, and scenario history.
--   Enforces strict Row Level Security (RLS) guaranteeing authenticated isolation:
--   auth.uid() = user_id on SELECT, INSERT, UPDATE, DELETE.
-- ==============================================================================

-- 1. Helper Function for updated_at timestamps
CREATE OR REPLACE FUNCTION set_updated_at_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 2. Saved Plans Table
CREATE TABLE IF NOT EXISTS saved_plans (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title text NOT NULL,
  plan_date date NOT NULL,
  location_name text NOT NULL,
  latitude double precision NOT NULL,
  longitude double precision NOT NULL,
  primary_pollutant text NOT NULL,
  estimated_cpcb_aqi integer NOT NULL,
  cpcb_category text NOT NULL,
  actions_count integer NOT NULL DEFAULT 0,
  plan_payload jsonb NOT NULL,
  schema_version integer NOT NULL DEFAULT 1,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Indexes for saved_plans
CREATE INDEX IF NOT EXISTS idx_saved_plans_user_created 
  ON saved_plans(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_saved_plans_user_date 
  ON saved_plans(user_id, plan_date DESC);

-- Trigger for updated_at
DROP TRIGGER IF EXISTS trg_saved_plans_updated_at ON saved_plans;
CREATE TRIGGER trg_saved_plans_updated_at
  BEFORE UPDATE ON saved_plans
  FOR EACH ROW
  EXECUTE FUNCTION set_updated_at_timestamp();

-- RLS for saved_plans
ALTER TABLE saved_plans ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their own saved plans" ON saved_plans;
CREATE POLICY "Users can view their own saved plans"
  ON saved_plans FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can create their own saved plans" ON saved_plans;
CREATE POLICY "Users can create their own saved plans"
  ON saved_plans FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their own saved plans" ON saved_plans;
CREATE POLICY "Users can update their own saved plans"
  ON saved_plans FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete their own saved plans" ON saved_plans;
CREATE POLICY "Users can delete their own saved plans"
  ON saved_plans FOR DELETE
  USING (auth.uid() = user_id);

-- 3. Decision Receipts Table
CREATE TABLE IF NOT EXISTS decision_receipts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  receipt_id text NOT NULL,
  scenario_id text NOT NULL,
  scenario_label text NOT NULL,
  timing_slot text NOT NULL,
  action_type text NOT NULL,
  cpcb_aqi_band text NOT NULL,
  hourly_pm25_estimate double precision NOT NULL,
  mitigation_steps jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Indexes for decision_receipts
CREATE INDEX IF NOT EXISTS idx_decision_receipts_user_created 
  ON decision_receipts(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_decision_receipts_receipt_id 
  ON decision_receipts(user_id, receipt_id);

-- RLS for decision_receipts
ALTER TABLE decision_receipts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their own decision receipts" ON decision_receipts;
CREATE POLICY "Users can view their own decision receipts"
  ON decision_receipts FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can create their own decision receipts" ON decision_receipts;
CREATE POLICY "Users can create their own decision receipts"
  ON decision_receipts FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete their own decision receipts" ON decision_receipts;
CREATE POLICY "Users can delete their own decision receipts"
  ON decision_receipts FOR DELETE
  USING (auth.uid() = user_id);

-- 4. Scenario History Table
CREATE TABLE IF NOT EXISTS scenario_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  scenario_type text NOT NULL,
  location_name text NOT NULL,
  baseline_pm25 double precision NOT NULL,
  optimal_pm25 double precision NOT NULL,
  exposure_reduction_pct double precision NOT NULL,
  receipt_payload jsonb NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Indexes for scenario_history
CREATE INDEX IF NOT EXISTS idx_scenario_history_user_created 
  ON scenario_history(user_id, created_at DESC);

-- RLS for scenario_history
ALTER TABLE scenario_history ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their own scenario history" ON scenario_history;
CREATE POLICY "Users can view their own scenario history"
  ON scenario_history FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can record their own scenario history" ON scenario_history;
CREATE POLICY "Users can record their own scenario history"
  ON scenario_history FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete their own scenario history" ON scenario_history;
CREATE POLICY "Users can delete their own scenario history"
  ON scenario_history FOR DELETE
  USING (auth.uid() = user_id);

-- 5. Least-Privilege Role Grants
-- Grants only required CRUD operations to the 'authenticated' role.
-- Zero table-level access is granted to 'anon' (unauthenticated guests).
-- Row Level Security (RLS) guarantees authenticated isolation (auth.uid() = user_id).
GRANT USAGE ON SCHEMA public TO authenticated;

REVOKE ALL ON TABLE saved_plans FROM anon;
REVOKE ALL ON TABLE decision_receipts FROM anon;
REVOKE ALL ON TABLE scenario_history FROM anon;

GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE saved_plans TO authenticated;
GRANT SELECT, INSERT, DELETE ON TABLE decision_receipts TO authenticated;
GRANT SELECT, INSERT, DELETE ON TABLE scenario_history TO authenticated;
