-- Blue Wolf / SignafyAI intelligence tables
-- Supports n8n workflows WF1 (prospects), WF2 (intent), WF3 (assets)
-- Run AFTER 001_initial_schema.sql

-- ─── Businesses (WF1 — Enhanced Prospect Finder) ─────────────────────────────
CREATE TABLE businesses (
  id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  org_id              UUID REFERENCES organizations(id) ON DELETE CASCADE,
  run_id              UUID REFERENCES workflow_runs(id) ON DELETE SET NULL,
  name                TEXT NOT NULL,
  industry            TEXT,
  service             TEXT,
  location            TEXT,
  website             TEXT,
  email               TEXT,
  phone               TEXT,
  address             TEXT,
  category            TEXT,
  rating              NUMERIC(3, 1),
  reviews             INT NOT NULL DEFAULT 0,
  opportunity_score   INT NOT NULL DEFAULT 0 CHECK (opportunity_score BETWEEN 0 AND 100),
  weaknesses          TEXT,
  recommended_offer   TEXT,
  pitch_angle         TEXT,
  email_subject       TEXT,
  email_body          TEXT,
  scraped_at          TIMESTAMPTZ,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_businesses_org ON businesses(org_id);
CREATE INDEX idx_businesses_run ON businesses(run_id);
CREATE INDEX idx_businesses_score ON businesses(org_id, opportunity_score DESC);
CREATE INDEX idx_businesses_created ON businesses(org_id, created_at DESC);
CREATE UNIQUE INDEX idx_businesses_org_website
  ON businesses(org_id, website)
  WHERE website IS NOT NULL AND org_id IS NOT NULL;

-- ─── Intent Signals (WF2 — Consumer Intent Finder) ───────────────────────────
CREATE TABLE intent_signals (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  org_id          UUID REFERENCES organizations(id) ON DELETE CASCADE,
  run_id          UUID REFERENCES workflow_runs(id) ON DELETE SET NULL,
  source          TEXT NOT NULL,
  service         TEXT,
  industry        TEXT,
  question        TEXT NOT NULL,
  location        TEXT,
  source_url      TEXT,
  intent_score    INT NOT NULL DEFAULT 0 CHECK (intent_score BETWEEN 0 AND 100),
  buying_stage    TEXT CHECK (buying_stage IN (
                    'Research', 'Comparison', 'Vendor Selection', 'Ready To Buy'
                  )),
  urgency         TEXT CHECK (urgency IN ('High', 'Medium', 'Low')),
  date_found      TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_intent_signals_org ON intent_signals(org_id);
CREATE INDEX idx_intent_signals_run ON intent_signals(run_id);
CREATE INDEX idx_intent_signals_score ON intent_signals(org_id, intent_score DESC);
CREATE INDEX idx_intent_signals_stage ON intent_signals(org_id, buying_stage);
CREATE INDEX idx_intent_signals_found ON intent_signals(org_id, date_found DESC);

-- ─── Generated Assets (WF3 — Funnel Asset Generator) ─────────────────────────
CREATE TABLE generated_assets (
  id                      UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  org_id                  UUID REFERENCES organizations(id) ON DELETE CASCADE,
  run_id                  UUID REFERENCES workflow_runs(id) ON DELETE SET NULL,
  signal_id               UUID REFERENCES intent_signals(id) ON DELETE SET NULL,
  intent_signal           TEXT,
  service                 TEXT,
  location                TEXT,
  industry                TEXT,
  business_name           TEXT,
  landing_page            TEXT,
  landing_page_subheadline  TEXT,
  faq                     TEXT,
  cta                     TEXT,
  ai_script               TEXT,
  email_sequence          TEXT,
  blog_outline            TEXT,
  social_posts            TEXT,
  video_script            TEXT,
  schema_suggestion       TEXT,
  created_at              TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_generated_assets_org ON generated_assets(org_id);
CREATE INDEX idx_generated_assets_run ON generated_assets(run_id);
CREATE INDEX idx_generated_assets_signal ON generated_assets(signal_id);
CREATE INDEX idx_generated_assets_created ON generated_assets(org_id, created_at DESC);

-- Uses trigger_set_updated_at() from 001_initial_schema.sql
CREATE TRIGGER set_updated_at BEFORE UPDATE ON businesses
  FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();
