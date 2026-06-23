-- ============================================================
-- Migration 011: Social Growth Intelligence Module
-- Tables: social_signals, growth_opportunities,
--         content_blueprints, content_calendar
-- ============================================================

-- ── Social Signals ─────────────────────────────────────────────────────────────
-- Raw conversations / posts / threads found across platforms
CREATE TABLE IF NOT EXISTS social_signals (
  id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id          UUID        NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  run_id          UUID,
  source          TEXT,                     -- reddit, youtube, linkedin, google_news, twitter
  topic           TEXT,
  question        TEXT        NOT NULL,     -- the actual text / question / post excerpt
  sentiment       TEXT,                     -- positive, negative, neutral, frustrated, excited
  signal_type     TEXT        DEFAULT 'discussion',  -- question, complaint, trend, discussion, buying_intent
  location        TEXT,
  source_url      TEXT,
  relevance_score INT         DEFAULT 50,
  engagement_hint TEXT,                     -- e.g. "847 upvotes" (textual, not structured)
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── Growth Opportunities ───────────────────────────────────────────────────────
-- AI-scored opportunities derived from signal clusters
CREATE TABLE IF NOT EXISTS growth_opportunities (
  id                  UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id              UUID        NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  run_id              UUID,
  title               TEXT        NOT NULL,
  description         TEXT,
  topic               TEXT,
  source              TEXT,                       -- comma-separated: "reddit,youtube"
  signal_count        INT         DEFAULT 1,
  audience_match      INT         DEFAULT 50,     -- 0-100
  trend_score         INT         DEFAULT 50,
  competition_score   INT         DEFAULT 50,
  local_relevance     INT         DEFAULT 0,
  lead_potential      INT         DEFAULT 50,
  authority_potential INT         DEFAULT 50,
  growth_score        INT         DEFAULT 50,     -- formula result
  content_formats     TEXT[]      DEFAULT '{}',   -- reel, blog, podcast, faq, interview, carousel
  hooks               TEXT[]      DEFAULT '{}',   -- 2-3 ready-to-use content hooks
  status              TEXT        DEFAULT 'new',  -- new, saved, in_progress, archived
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── Content Blueprints ─────────────────────────────────────────────────────────
-- Detailed content plans generated from opportunities
CREATE TABLE IF NOT EXISTS content_blueprints (
  id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id          UUID        NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  opportunity_id  UUID        REFERENCES growth_opportunities(id) ON DELETE SET NULL,
  run_id          UUID,
  title           TEXT,
  format          TEXT,           -- reel, blog, podcast_segment, carousel, interview, faq
  hook            TEXT,           -- the opening hook
  outline         TEXT,           -- structured outline
  cta             TEXT,
  platform        TEXT,           -- instagram, youtube, tiktok, linkedin, twitter
  growth_score    INT             DEFAULT 50,
  created_at      TIMESTAMPTZ     NOT NULL DEFAULT NOW()
);

-- ── Content Calendar ───────────────────────────────────────────────────────────
-- Scheduled / planned content items
CREATE TABLE IF NOT EXISTS content_calendar (
  id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id          UUID        NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  blueprint_id    UUID        REFERENCES content_blueprints(id) ON DELETE SET NULL,
  opportunity_id  UUID        REFERENCES growth_opportunities(id) ON DELETE SET NULL,
  title           TEXT        NOT NULL,
  format          TEXT,
  platform        TEXT,
  status          TEXT        DEFAULT 'planned',  -- planned, in_progress, published
  signal_type     TEXT,
  growth_score    INT         DEFAULT 50,
  trend_score     INT         DEFAULT 50,
  lead_score      INT         DEFAULT 50,
  scheduled_date  DATE,
  notes           TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── Row-Level Security ────────────────────────────────────────────────────────
ALTER TABLE social_signals       ENABLE ROW LEVEL SECURITY;
ALTER TABLE growth_opportunities ENABLE ROW LEVEL SECURITY;
ALTER TABLE content_blueprints   ENABLE ROW LEVEL SECURITY;
ALTER TABLE content_calendar     ENABLE ROW LEVEL SECURITY;

CREATE POLICY "members_own_org_signals"
  ON social_signals FOR ALL
  USING (org_id IN (SELECT org_id FROM memberships WHERE user_id = auth.uid()));

CREATE POLICY "members_own_org_opportunities"
  ON growth_opportunities FOR ALL
  USING (org_id IN (SELECT org_id FROM memberships WHERE user_id = auth.uid()));

CREATE POLICY "members_own_org_blueprints"
  ON content_blueprints FOR ALL
  USING (org_id IN (SELECT org_id FROM memberships WHERE user_id = auth.uid()));

CREATE POLICY "members_own_org_calendar"
  ON content_calendar FOR ALL
  USING (org_id IN (SELECT org_id FROM memberships WHERE user_id = auth.uid()));

-- Service role bypasses RLS (for n8n callbacks / server-side writes)
CREATE POLICY "service_role_signals"
  ON social_signals FOR ALL
  USING (auth.role() = 'service_role');

CREATE POLICY "service_role_opportunities"
  ON growth_opportunities FOR ALL
  USING (auth.role() = 'service_role');

CREATE POLICY "service_role_blueprints"
  ON content_blueprints FOR ALL
  USING (auth.role() = 'service_role');

CREATE POLICY "service_role_calendar"
  ON content_calendar FOR ALL
  USING (auth.role() = 'service_role');

-- ── Indexes ───────────────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS social_signals_org_id_idx       ON social_signals(org_id);
CREATE INDEX IF NOT EXISTS social_signals_run_id_idx       ON social_signals(run_id);
CREATE INDEX IF NOT EXISTS growth_opp_org_id_idx           ON growth_opportunities(org_id);
CREATE INDEX IF NOT EXISTS growth_opp_growth_score_idx     ON growth_opportunities(org_id, growth_score DESC);
CREATE INDEX IF NOT EXISTS content_blueprints_org_id_idx   ON content_blueprints(org_id);
CREATE INDEX IF NOT EXISTS content_calendar_org_date_idx   ON content_calendar(org_id, scheduled_date);
