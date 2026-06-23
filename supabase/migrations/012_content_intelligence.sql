-- ============================================================
-- Migration 012: Content Intelligence System
-- Tables: brand_profiles, inspiration_accounts,
--         calendar_settings, content_suggestions, content_variations
-- ============================================================

-- ── brand_profiles ────────────────────────────────────────────
-- Extended brand identity beyond brand_voices (tone/vocab).
-- One per org (enforced via UNIQUE constraint on org_id).

CREATE TABLE IF NOT EXISTS brand_profiles (
  id                         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id                     UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  -- Company classification
  company_type               TEXT NOT NULL DEFAULT 'business',
  -- Values: business | individual | creator | agency
  industry                   TEXT,
  description                TEXT,             -- elevator pitch / about
  -- Visual identity
  logo_url                   TEXT,
  primary_color              TEXT DEFAULT '#7c3aed',
  -- Personality & voice
  personality_traits         TEXT[] DEFAULT '{}',
  -- E.g.: authentic, educational, humorous, inspirational, bold,
  --       professional, casual, community-driven, storytelling
  background_story           TEXT,             -- founding / personal story
  interests                  TEXT[] DEFAULT '{}',
  content_themes             TEXT[] DEFAULT '{}',
  -- E.g.: behind-the-scenes, tips, client wins, industry news
  target_audience_description TEXT,
  posting_goals              TEXT[] DEFAULT '{}',
  -- E.g.: brand_awareness, lead_gen, community, sales, education
  hashtag_strategy           TEXT,
  created_at                 TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at                 TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(org_id)
);

-- ── inspiration_accounts ──────────────────────────────────────
-- Accounts the org looks at / wants to emulate.
-- AI uses these to study content style and suggest similar posts.

CREATE TABLE IF NOT EXISTS inspiration_accounts (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id       UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  platform     TEXT NOT NULL,   -- linkedin | instagram | tiktok | facebook | x | youtube
  handle       TEXT NOT NULL,   -- @handle or full profile URL
  display_name TEXT,
  why          TEXT,            -- "They nail short-form education content"
  category     TEXT DEFAULT 'inspiration',
  -- Values: inspiration | competitor | industry_leader | aspirational
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS inspiration_accounts_org_idx ON inspiration_accounts(org_id);

-- ── calendar_settings ─────────────────────────────────────────
-- Per-org content calendar configuration.
-- One row per org (UNIQUE org_id).

CREATE TABLE IF NOT EXISTS calendar_settings (
  id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id               UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  platforms            TEXT[] DEFAULT '{}',
  -- Frequency
  posting_frequency    TEXT DEFAULT 'daily',
  -- Values: daily | 3x_week | 5x_week | weekly | custom
  posts_per_week       INT DEFAULT 5,
  -- Timing: { "monday": ["09:00", "18:00"], "tuesday": ["12:00"], ... }
  posting_times        JSONB DEFAULT '{}',
  -- Content mix percentages (should sum to 100)
  -- { "educational": 40, "promotional": 20, "entertainment": 30, "behind_scenes": 10 }
  content_mix          JSONB DEFAULT '{"educational":40,"promotional":20,"entertainment":30,"behind_scenes":10}',
  -- Automation
  auto_approve         BOOLEAN DEFAULT false,
  auto_post_approved   BOOLEAN DEFAULT false,
  generate_variations  INT DEFAULT 3,       -- how many A/B/C per suggestion
  -- Which platforms to auto-post to when approved
  auto_post_platforms  TEXT[] DEFAULT '{}',
  created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(org_id)
);

-- ── content_suggestions ───────────────────────────────────────
-- AI-generated content suggestions with performance scoring.
-- Each suggestion has N variations (content_variations table).

CREATE TABLE IF NOT EXISTS content_suggestions (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id                UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  run_id                UUID,                         -- n8n run that created this
  -- Content metadata
  title                 TEXT NOT NULL,                -- "5 Ways to Close More Deals on LinkedIn"
  topic                 TEXT,
  content_type          TEXT DEFAULT 'educational',
  -- Values: educational | promotional | entertainment | behind_scenes
  --         trend | local_event | announcement | testimonial
  target_platforms      TEXT[] DEFAULT '{}',
  -- Scheduling
  best_posting_time     TEXT,                         -- "Tuesday 9am EST"
  week_of               DATE,                         -- which week this is for
  scheduled_for         TIMESTAMPTZ,
  -- Image guidance
  image_type            TEXT DEFAULT 'ai_generated',
  -- Values: ai_generated | stock_photo | local_event | screenshot | video | user_provided
  image_prompt          TEXT,                         -- DALL-E / Midjourney prompt
  image_keyword         TEXT,                         -- for Unsplash/stock photo search
  image_description     TEXT,                         -- human-readable description
  -- Performance prediction (0-100)
  performance_score     INT DEFAULT 50,
  virality_score        INT DEFAULT 50,
  engagement_prediction JSONB DEFAULT '{}',
  -- { "likes": 120, "comments": 15, "shares": 8, "reach": 2500 }
  -- Benchmark data
  benchmark_reference   TEXT,                         -- "Similar post from @garyvee got 45K likes because..."
  benchmark_data        JSONB DEFAULT '{}',
  optimization_tips     TEXT[] DEFAULT '{}',
  -- ["Add a hook in the first line", "Use 3-5 hashtags max", ...]
  -- Approval workflow
  status                TEXT DEFAULT 'pending',
  -- Values: pending | approved | declined | posted | archived
  declined_reason       TEXT,
  selected_variation_id UUID,                         -- FK to content_variations (set on approve)
  approved_at           TIMESTAMPTZ,
  approved_by           TEXT,
  posted_at             TIMESTAMPTZ,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS content_suggestions_org_idx    ON content_suggestions(org_id);
CREATE INDEX IF NOT EXISTS content_suggestions_status_idx ON content_suggestions(org_id, status);
CREATE INDEX IF NOT EXISTS content_suggestions_week_idx   ON content_suggestions(org_id, week_of);

-- ── content_variations ────────────────────────────────────────
-- Multiple caption versions (A/B/C) for each suggestion.
-- User picks one before approving.

CREATE TABLE IF NOT EXISTS content_variations (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  suggestion_id    UUID NOT NULL REFERENCES content_suggestions(id) ON DELETE CASCADE,
  org_id           UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  variation_label  TEXT NOT NULL,    -- 'A' | 'B' | 'C'
  caption          TEXT NOT NULL,    -- the full post text
  hashtags         TEXT[] DEFAULT '{}',
  hook             TEXT,             -- first line / attention grabber
  cta              TEXT,             -- call-to-action line
  tone             TEXT,             -- "conversational", "bold", "storytelling"
  predicted_reach  INT DEFAULT 0,
  is_selected      BOOLEAN DEFAULT false,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS content_variations_suggestion_idx ON content_variations(suggestion_id);

-- ── RLS Policies ──────────────────────────────────────────────
-- Pattern: org_id IN (orgs the JWT user belongs to)

ALTER TABLE brand_profiles        ENABLE ROW LEVEL SECURITY;
ALTER TABLE inspiration_accounts  ENABLE ROW LEVEL SECURITY;
ALTER TABLE calendar_settings     ENABLE ROW LEVEL SECURITY;
ALTER TABLE content_suggestions   ENABLE ROW LEVEL SECURITY;
ALTER TABLE content_variations    ENABLE ROW LEVEL SECURITY;

-- Helper: check membership via clerk_id JWT claim
-- reused across all tables below

DROP POLICY IF EXISTS "brand_profiles_select"  ON brand_profiles;
DROP POLICY IF EXISTS "brand_profiles_insert"  ON brand_profiles;
DROP POLICY IF EXISTS "brand_profiles_update"  ON brand_profiles;
DROP POLICY IF EXISTS "brand_profiles_delete"  ON brand_profiles;

CREATE POLICY "brand_profiles_select" ON brand_profiles FOR SELECT USING (
  org_id IN (
    SELECT org_id FROM org_members WHERE user_id = (
      SELECT id FROM users WHERE clerk_id = auth.jwt()->>'sub'
    )
  )
);
CREATE POLICY "brand_profiles_insert" ON brand_profiles FOR INSERT WITH CHECK (
  org_id IN (
    SELECT org_id FROM org_members WHERE user_id = (
      SELECT id FROM users WHERE clerk_id = auth.jwt()->>'sub'
    )
  )
);
CREATE POLICY "brand_profiles_update" ON brand_profiles FOR UPDATE USING (
  org_id IN (
    SELECT org_id FROM org_members WHERE user_id = (
      SELECT id FROM users WHERE clerk_id = auth.jwt()->>'sub'
    )
  )
);
CREATE POLICY "brand_profiles_delete" ON brand_profiles FOR DELETE USING (
  org_id IN (
    SELECT org_id FROM org_members WHERE user_id = (
      SELECT id FROM users WHERE clerk_id = auth.jwt()->>'sub'
    )
  )
);

-- inspiration_accounts
DROP POLICY IF EXISTS "inspiration_accounts_select" ON inspiration_accounts;
DROP POLICY IF EXISTS "inspiration_accounts_insert" ON inspiration_accounts;
DROP POLICY IF EXISTS "inspiration_accounts_update" ON inspiration_accounts;
DROP POLICY IF EXISTS "inspiration_accounts_delete" ON inspiration_accounts;

CREATE POLICY "inspiration_accounts_select" ON inspiration_accounts FOR SELECT USING (
  org_id IN (SELECT org_id FROM org_members WHERE user_id = (SELECT id FROM users WHERE clerk_id = auth.jwt()->>'sub'))
);
CREATE POLICY "inspiration_accounts_insert" ON inspiration_accounts FOR INSERT WITH CHECK (
  org_id IN (SELECT org_id FROM org_members WHERE user_id = (SELECT id FROM users WHERE clerk_id = auth.jwt()->>'sub'))
);
CREATE POLICY "inspiration_accounts_update" ON inspiration_accounts FOR UPDATE USING (
  org_id IN (SELECT org_id FROM org_members WHERE user_id = (SELECT id FROM users WHERE clerk_id = auth.jwt()->>'sub'))
);
CREATE POLICY "inspiration_accounts_delete" ON inspiration_accounts FOR DELETE USING (
  org_id IN (SELECT org_id FROM org_members WHERE user_id = (SELECT id FROM users WHERE clerk_id = auth.jwt()->>'sub'))
);

-- calendar_settings
DROP POLICY IF EXISTS "calendar_settings_select" ON calendar_settings;
DROP POLICY IF EXISTS "calendar_settings_insert" ON calendar_settings;
DROP POLICY IF EXISTS "calendar_settings_update" ON calendar_settings;

CREATE POLICY "calendar_settings_select" ON calendar_settings FOR SELECT USING (
  org_id IN (SELECT org_id FROM org_members WHERE user_id = (SELECT id FROM users WHERE clerk_id = auth.jwt()->>'sub'))
);
CREATE POLICY "calendar_settings_insert" ON calendar_settings FOR INSERT WITH CHECK (
  org_id IN (SELECT org_id FROM org_members WHERE user_id = (SELECT id FROM users WHERE clerk_id = auth.jwt()->>'sub'))
);
CREATE POLICY "calendar_settings_update" ON calendar_settings FOR UPDATE USING (
  org_id IN (SELECT org_id FROM org_members WHERE user_id = (SELECT id FROM users WHERE clerk_id = auth.jwt()->>'sub'))
);

-- content_suggestions
DROP POLICY IF EXISTS "content_suggestions_select" ON content_suggestions;
DROP POLICY IF EXISTS "content_suggestions_insert" ON content_suggestions;
DROP POLICY IF EXISTS "content_suggestions_update" ON content_suggestions;

CREATE POLICY "content_suggestions_select" ON content_suggestions FOR SELECT USING (
  org_id IN (SELECT org_id FROM org_members WHERE user_id = (SELECT id FROM users WHERE clerk_id = auth.jwt()->>'sub'))
);
CREATE POLICY "content_suggestions_insert" ON content_suggestions FOR INSERT WITH CHECK (
  org_id IN (SELECT org_id FROM org_members WHERE user_id = (SELECT id FROM users WHERE clerk_id = auth.jwt()->>'sub'))
);
CREATE POLICY "content_suggestions_update" ON content_suggestions FOR UPDATE USING (
  org_id IN (SELECT org_id FROM org_members WHERE user_id = (SELECT id FROM users WHERE clerk_id = auth.jwt()->>'sub'))
);

-- content_variations (via suggestion's org)
DROP POLICY IF EXISTS "content_variations_select" ON content_variations;
DROP POLICY IF EXISTS "content_variations_insert" ON content_variations;
DROP POLICY IF EXISTS "content_variations_update" ON content_variations;
DROP POLICY IF EXISTS "content_variations_delete" ON content_variations;

CREATE POLICY "content_variations_select" ON content_variations FOR SELECT USING (
  org_id IN (SELECT org_id FROM org_members WHERE user_id = (SELECT id FROM users WHERE clerk_id = auth.jwt()->>'sub'))
);
CREATE POLICY "content_variations_insert" ON content_variations FOR INSERT WITH CHECK (
  org_id IN (SELECT org_id FROM org_members WHERE user_id = (SELECT id FROM users WHERE clerk_id = auth.jwt()->>'sub'))
);
CREATE POLICY "content_variations_update" ON content_variations FOR UPDATE USING (
  org_id IN (SELECT org_id FROM org_members WHERE user_id = (SELECT id FROM users WHERE clerk_id = auth.jwt()->>'sub'))
);
CREATE POLICY "content_variations_delete" ON content_variations FOR DELETE USING (
  org_id IN (SELECT org_id FROM org_members WHERE user_id = (SELECT id FROM users WHERE clerk_id = auth.jwt()->>'sub'))
);

-- ── Realtime ──────────────────────────────────────────────────
ALTER PUBLICATION supabase_realtime ADD TABLE content_suggestions;
ALTER PUBLICATION supabase_realtime ADD TABLE content_variations;
