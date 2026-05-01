-- SignafyAI initial schema
-- Run this in your Supabase SQL editor (Project → SQL Editor → New Query)

-- ─── Extensions ───────────────────────────────────────────────────────────────
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm"; -- for fuzzy text search on leads

-- ─── Organizations ────────────────────────────────────────────────────────────
CREATE TABLE organizations (
  id                        UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name                      TEXT NOT NULL,
  slug                      TEXT UNIQUE NOT NULL,
  owner_id                  UUID,
  plan                      TEXT NOT NULL DEFAULT 'starter' CHECK (plan IN ('starter','pro','agency')),
  stripe_customer_id        TEXT,
  stripe_subscription_id    TEXT,
  subscription_status       TEXT NOT NULL DEFAULT 'trialing'
                              CHECK (subscription_status IN ('trialing','active','past_due','canceled','paused')),
  usage_leads_mo            INT NOT NULL DEFAULT 0,
  usage_content_mo          INT NOT NULL DEFAULT 0,
  limits_leads_mo           INT NOT NULL DEFAULT 500,
  limits_content_mo         INT NOT NULL DEFAULT 100,
  created_at                TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at                TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ─── Users ────────────────────────────────────────────────────────────────────
CREATE TABLE users (
  id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  clerk_id          TEXT UNIQUE NOT NULL,
  email             TEXT NOT NULL,
  full_name         TEXT,
  avatar_url        TEXT,
  notification_prefs JSONB DEFAULT '{}',
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE organizations ADD CONSTRAINT fk_org_owner
  FOREIGN KEY (owner_id) REFERENCES users(id) ON DELETE SET NULL;

-- ─── Org Members ──────────────────────────────────────────────────────────────
CREATE TABLE org_members (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  org_id      UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role        TEXT NOT NULL DEFAULT 'member'
                CHECK (role IN ('owner','admin','member','viewer')),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (org_id, user_id)
);

-- ─── Leads ────────────────────────────────────────────────────────────────────
CREATE TABLE leads (
  id               UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  org_id           UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name             TEXT NOT NULL,
  company          TEXT,
  email            TEXT,
  phone            TEXT,
  platform         TEXT CHECK (platform IN ('instagram','linkedin','tiktok','twitter','facebook','google','manual')),
  source_url       TEXT,
  score            INT NOT NULL DEFAULT 0 CHECK (score BETWEEN 0 AND 100),
  status           TEXT NOT NULL DEFAULT 'new'
                     CHECK (status IN ('new','contacted','qualified','converted','lost')),
  industry         TEXT,
  location         TEXT,
  notes            TEXT,
  tags             TEXT[] NOT NULL DEFAULT '{}',
  enrichment_data  JSONB,
  last_activity    TIMESTAMPTZ,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_leads_org ON leads(org_id);
CREATE INDEX idx_leads_status ON leads(org_id, status);
CREATE INDEX idx_leads_score ON leads(org_id, score DESC);
CREATE INDEX idx_leads_created ON leads(org_id, created_at DESC);
-- Trigram index for fuzzy name/company search
CREATE INDEX idx_leads_name_trgm ON leads USING gin(name gin_trgm_ops);
CREATE INDEX idx_leads_company_trgm ON leads USING gin(company gin_trgm_ops);

-- ─── Lead Activities ──────────────────────────────────────────────────────────
CREATE TABLE lead_activities (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  lead_id      UUID NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
  org_id       UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  type         TEXT NOT NULL
                 CHECK (type IN ('discovered','scored','contacted','replied','status_changed','note_added')),
  description  TEXT,
  metadata     JSONB,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_lead_activities_lead ON lead_activities(lead_id, created_at DESC);

-- ─── Lead Discovery Configs ───────────────────────────────────────────────────
CREATE TABLE lead_discovery_configs (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  org_id      UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name        TEXT NOT NULL,
  filters     JSONB NOT NULL DEFAULT '{}',
  schedule    TEXT,
  last_run_at TIMESTAMPTZ,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ─── Brand Voices ─────────────────────────────────────────────────────────────
CREATE TABLE brand_voices (
  id             UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  org_id         UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name           TEXT NOT NULL DEFAULT 'Default',
  tone           TEXT,
  vocabulary     TEXT[] NOT NULL DEFAULT '{}',
  avoid_words    TEXT[] NOT NULL DEFAULT '{}',
  example_posts  TEXT[] NOT NULL DEFAULT '{}',
  cta_style      TEXT,
  platform_rules JSONB,
  is_default     BOOLEAN NOT NULL DEFAULT false,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Only one default voice per org
CREATE UNIQUE INDEX idx_brand_voices_default ON brand_voices(org_id) WHERE is_default = true;

-- ─── Content Pieces ───────────────────────────────────────────────────────────
CREATE TABLE content_pieces (
  id                    UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  org_id                UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  voice_id              UUID REFERENCES brand_voices(id) ON DELETE SET NULL,
  type                  TEXT NOT NULL
                          CHECK (type IN ('blog_post','social_caption','email_sequence','ad_copy','video_script')),
  platform              TEXT,
  prompt                TEXT,
  body                  TEXT NOT NULL,
  char_count            INT,
  engagement_prediction FLOAT,
  status                TEXT NOT NULL DEFAULT 'draft'
                          CHECK (status IN ('draft','approved','scheduled','published')),
  scheduled_at          TIMESTAMPTZ,
  published_at          TIMESTAMPTZ,
  metadata              JSONB,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_content_org ON content_pieces(org_id, created_at DESC);
CREATE INDEX idx_content_status ON content_pieces(org_id, status);

-- ─── Social Accounts ──────────────────────────────────────────────────────────
CREATE TABLE social_accounts (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  org_id        UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  platform      TEXT NOT NULL
                  CHECK (platform IN ('instagram','linkedin','tiktok','twitter','facebook')),
  account_name  TEXT NOT NULL,
  account_id    TEXT NOT NULL,
  -- Tokens are stored AES-256 encrypted via app-level encryption (never plaintext)
  access_token  TEXT,
  refresh_token TEXT,
  token_expires TIMESTAMPTZ,
  avatar_url    TEXT,
  is_active     BOOLEAN NOT NULL DEFAULT true,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (org_id, platform, account_id)
);

-- ─── Social Messages ──────────────────────────────────────────────────────────
CREATE TABLE social_messages (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  org_id          UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  account_id      UUID NOT NULL REFERENCES social_accounts(id) ON DELETE CASCADE,
  platform        TEXT NOT NULL,
  platform_msg_id TEXT,
  author_name     TEXT,
  author_handle   TEXT,
  author_avatar   TEXT,
  message_type    TEXT NOT NULL CHECK (message_type IN ('comment','dm','mention','reply')),
  body            TEXT NOT NULL,
  intent          TEXT CHECK (intent IN ('inquiry','complaint','praise','spam','partnership','purchase_intent')),
  sentiment       FLOAT CHECK (sentiment BETWEEN -1.0 AND 1.0),
  is_read         BOOLEAN NOT NULL DEFAULT false,
  status          TEXT NOT NULL DEFAULT 'pending'
                    CHECK (status IN ('pending','replied','dismissed','escalated')),
  parent_msg_id   UUID REFERENCES social_messages(id),
  received_at     TIMESTAMPTZ NOT NULL,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_messages_org ON social_messages(org_id, received_at DESC);
CREATE INDEX idx_messages_unread ON social_messages(org_id) WHERE is_read = false;

-- ─── Social Replies ───────────────────────────────────────────────────────────
CREATE TABLE social_replies (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  message_id  UUID NOT NULL REFERENCES social_messages(id) ON DELETE CASCADE,
  org_id      UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  body        TEXT NOT NULL,
  voice_id    UUID REFERENCES brand_voices(id) ON DELETE SET NULL,
  status      TEXT NOT NULL DEFAULT 'draft'
                CHECK (status IN ('draft','approved','sent','failed')),
  sent_at     TIMESTAMPTZ,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ─── SEO Projects ─────────────────────────────────────────────────────────────
CREATE TABLE seo_projects (
  id               UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  org_id           UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name             TEXT NOT NULL,
  target_domain    TEXT,
  target_keywords  TEXT[] NOT NULL DEFAULT '{}',
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ─── SEO Keywords ─────────────────────────────────────────────────────────────
CREATE TABLE seo_keywords (
  id               UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id       UUID NOT NULL REFERENCES seo_projects(id) ON DELETE CASCADE,
  org_id           UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  keyword          TEXT NOT NULL,
  search_volume    INT,
  difficulty       INT CHECK (difficulty BETWEEN 0 AND 100),
  difficulty_label TEXT CHECK (difficulty_label IN ('easy','medium','hard')),
  cpc              DECIMAL(10,2),
  intent           TEXT CHECK (intent IN ('informational','transactional','navigational','commercial')),
  trend            TEXT CHECK (trend IN ('up','down','stable')),
  cluster          TEXT,
  serp_features    TEXT[] NOT NULL DEFAULT '{}',
  position         INT,
  url_ranking      TEXT,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_keywords_project ON seo_keywords(project_id);
CREATE INDEX idx_keywords_volume ON seo_keywords(project_id, search_volume DESC NULLS LAST);

-- ─── SEO Competitors ──────────────────────────────────────────────────────────
CREATE TABLE seo_competitors (
  id                   UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id           UUID NOT NULL REFERENCES seo_projects(id) ON DELETE CASCADE,
  domain               TEXT NOT NULL,
  overlap_pct          INT,
  keywords_they_rank   TEXT[] NOT NULL DEFAULT '{}',
  domain_authority     INT,
  created_at           TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ─── Campaigns ────────────────────────────────────────────────────────────────
CREATE TABLE campaigns (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  org_id          UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name            TEXT NOT NULL,
  status          TEXT NOT NULL DEFAULT 'draft'
                    CHECK (status IN ('draft','active','paused','completed')),
  start_date      DATE,
  end_date        DATE,
  budget          DECIMAL(10,2),
  budget_spent    DECIMAL(10,2) NOT NULL DEFAULT 0,
  channels        TEXT[] NOT NULL DEFAULT '{}',
  goal            TEXT CHECK (goal IN ('awareness','engagement','leads','conversions')),
  target_audience TEXT,
  notes           TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_campaigns_org ON campaigns(org_id, created_at DESC);

-- ─── Campaign Content ─────────────────────────────────────────────────────────
CREATE TABLE campaign_content (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  campaign_id  UUID NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
  content_id   UUID NOT NULL REFERENCES content_pieces(id) ON DELETE CASCADE,
  scheduled_at TIMESTAMPTZ,
  published_at TIMESTAMPTZ,
  status       TEXT NOT NULL DEFAULT 'pending'
                 CHECK (status IN ('pending','published','failed')),
  performance  JSONB,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ─── Analytics Daily ──────────────────────────────────────────────────────────
CREATE TABLE analytics_daily (
  id                   UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  org_id               UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  date                 DATE NOT NULL,
  total_reach          INT NOT NULL DEFAULT 0,
  total_impressions    INT NOT NULL DEFAULT 0,
  total_engagement     INT NOT NULL DEFAULT 0,
  engagement_rate      FLOAT NOT NULL DEFAULT 0,
  leads_generated      INT NOT NULL DEFAULT 0,
  conversions          INT NOT NULL DEFAULT 0,
  revenue_attributed   DECIMAL(10,2) NOT NULL DEFAULT 0,
  platform_breakdown   JSONB,
  created_at           TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (org_id, date)
);

CREATE INDEX idx_analytics_org_date ON analytics_daily(org_id, date DESC);

-- ─── Content Performance ──────────────────────────────────────────────────────
CREATE TABLE content_performance (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  content_id      UUID NOT NULL REFERENCES content_pieces(id) ON DELETE CASCADE,
  org_id          UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  impressions     INT NOT NULL DEFAULT 0,
  clicks          INT NOT NULL DEFAULT 0,
  likes           INT NOT NULL DEFAULT 0,
  comments        INT NOT NULL DEFAULT 0,
  shares          INT NOT NULL DEFAULT 0,
  engagement_rate FLOAT NOT NULL DEFAULT 0,
  measured_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ─── Workflow Runs ────────────────────────────────────────────────────────────
CREATE TABLE workflow_runs (
  id               UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  org_id           UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  workflow_type    TEXT NOT NULL
                     CHECK (workflow_type IN ('lead_discovery','content_generation','social_classification','seo_research','analytics_aggregation')),
  n8n_execution_id TEXT,
  status           TEXT NOT NULL DEFAULT 'pending'
                     CHECK (status IN ('pending','running','complete','failed')),
  input_params     JSONB,
  output_summary   JSONB,
  started_at       TIMESTAMPTZ,
  completed_at     TIMESTAMPTZ,
  error_message    TEXT,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_workflow_runs_org ON workflow_runs(org_id, created_at DESC);

-- ─── API Keys ─────────────────────────────────────────────────────────────────
CREATE TABLE api_keys (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  org_id       UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name         TEXT NOT NULL,
  key_hash     TEXT NOT NULL UNIQUE,  -- bcrypt hash
  key_prefix   TEXT NOT NULL,         -- first 8 chars shown to user (e.g. "sk_live_")
  last_used_at TIMESTAMPTZ,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ─── Updated_at triggers ──────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION trigger_set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_updated_at BEFORE UPDATE ON organizations FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();
CREATE TRIGGER set_updated_at BEFORE UPDATE ON leads FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();
CREATE TRIGGER set_updated_at BEFORE UPDATE ON brand_voices FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();
CREATE TRIGGER set_updated_at BEFORE UPDATE ON content_pieces FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();
CREATE TRIGGER set_updated_at BEFORE UPDATE ON social_accounts FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();
CREATE TRIGGER set_updated_at BEFORE UPDATE ON seo_projects FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();
CREATE TRIGGER set_updated_at BEFORE UPDATE ON seo_keywords FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();
CREATE TRIGGER set_updated_at BEFORE UPDATE ON campaigns FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();
