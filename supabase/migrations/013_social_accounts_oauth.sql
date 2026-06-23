-- Migration 013: Social Accounts — OAuth enhancements
-- Adds scopes column, expands platform CHECK to include 'x',
-- and ensures the upsert conflict target exists.
-- Run in Supabase SQL Editor.

-- 1. Add scopes column (stores space/comma-separated granted scopes)
ALTER TABLE social_accounts
  ADD COLUMN IF NOT EXISTS scopes TEXT;

-- 2. Widen the platform CHECK to accept 'x' alongside 'twitter'
--    Drop the existing constraint and recreate it.
ALTER TABLE social_accounts
  DROP CONSTRAINT IF EXISTS social_accounts_platform_check;

ALTER TABLE social_accounts
  ADD CONSTRAINT social_accounts_platform_check
  CHECK (platform IN ('instagram','linkedin','tiktok','twitter','x','facebook'));

-- 3. Ensure the unique constraint the upsert ON CONFLICT clause targets still exists.
--    (It was already created in 001 as UNIQUE(org_id, platform, account_id),
--    so this is a no-op if it already exists.)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'social_accounts_org_id_platform_account_id_key'
      AND conrelid = 'social_accounts'::regclass
  ) THEN
    ALTER TABLE social_accounts
      ADD CONSTRAINT social_accounts_org_id_platform_account_id_key
      UNIQUE (org_id, platform, account_id);
  END IF;
END $$;
