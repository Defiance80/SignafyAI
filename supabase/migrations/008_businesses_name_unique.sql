-- ─── 008: Add unique index on businesses(org_id, name) ──────────────────────
-- Required for WF1 Supabase node upsert using matchingColumns: ["org_id", "name"]
-- Without this, n8n's Supabase upsert throws:
--   "there is no unique or exclusion constraint matching the ON CONFLICT specification"
-- Run AFTER 003_blue_wolf_intelligence_tables.sql

CREATE UNIQUE INDEX IF NOT EXISTS idx_businesses_org_name
  ON businesses(org_id, name)
  WHERE org_id IS NOT NULL;
