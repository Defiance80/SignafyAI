-- Migration 009: drop FK constraints on run_id columns so n8n can write
-- businesses/intent_signals/generated_assets directly without requiring
-- workflow_runs to exist first.
--
-- Rationale:
--   • In production the Next.js API creates the workflow_runs row BEFORE calling
--     n8n, so referential integrity holds without a hard FK.
--   • Hard FK blocks direct n8n writes during testing and causes needless errors
--     when n8n is triggered outside the app (e.g. manual webhook tests).
--   • run_id is kept as a UUID column — the type still prevents garbage values.
--
-- Run this in: Supabase Dashboard → SQL Editor → New Query

-- businesses
ALTER TABLE businesses
  DROP CONSTRAINT IF EXISTS businesses_run_id_fkey;

-- intent_signals
ALTER TABLE intent_signals
  DROP CONSTRAINT IF EXISTS intent_signals_run_id_fkey;

-- generated_assets
ALTER TABLE generated_assets
  DROP CONSTRAINT IF EXISTS generated_assets_run_id_fkey;
