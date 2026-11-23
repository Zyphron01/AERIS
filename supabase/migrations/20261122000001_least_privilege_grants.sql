-- ==============================================================================
-- AERIS — Supabase PostgreSQL Least-Privilege Table Grants Migration
-- File: supabase/migrations/20261122000001_least_privilege_grants.sql
-- Description:
--   Enforces strict least-privilege role permissions for AERIS cloud persistence.
--   - Revokes any default or accidental permissions from the anonymous ('anon') role.
--   - Grants ONLY required CRUD operations to the 'authenticated' role.
--   - Decision receipts and scenario histories are immutable audit records (no UPDATE).
--   - Row Level Security (RLS) ensures authenticated users can only access their own rows.
-- ==============================================================================

-- 1. Ensure Schema Usage for Authenticated Role
GRANT USAGE ON SCHEMA public TO authenticated;

-- 2. Revoke All Table-Level Privileges from Anon Role (Zero Anonymous Access)
REVOKE ALL ON TABLE saved_plans FROM anon;
REVOKE ALL ON TABLE decision_receipts FROM anon;
REVOKE ALL ON TABLE scenario_history FROM anon;

-- 3. Grant Explicit Least-Privilege Access to Authenticated Role
-- saved_plans requires SELECT, INSERT, UPDATE, DELETE (users can rename or update plans)
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE saved_plans TO authenticated;

-- decision_receipts are immutable deterministic audit receipts (no UPDATE)
GRANT SELECT, INSERT, DELETE ON TABLE decision_receipts TO authenticated;

-- scenario_history contains immutable simulation logs (no UPDATE)
GRANT SELECT, INSERT, DELETE ON TABLE scenario_history TO authenticated;
