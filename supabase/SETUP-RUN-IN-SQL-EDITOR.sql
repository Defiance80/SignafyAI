-- SignafyAI initial schema
-- Run this in your Supabase SQL editor (Project â†’ SQL Editor â†’ New Query)

-- â”€â”€â”€ Extensions â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm"; -- for fuzzy text search on leads

-- â”€â”€â”€ Organizations â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
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

-- â”€â”€â”€ Users â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
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

-- â”€â”€â”€ Org Members â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
CREATE TABLE org_members (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  org_id      UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role        TEXT NOT NULL DEFAULT 'member'
                CHECK (role IN ('owner','admin','member','viewer')),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (org_id, user_id)
);

-- â”€â”€â”€ Leads â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
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

-- â”€â”€â”€ Lead Activities â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
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

-- â”€â”€â”€ Lead Discovery Configs â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
CREATE TABLE lead_discovery_configs (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  org_id      UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name        TEXT NOT NULL,
  filters     JSONB NOT NULL DEFAULT '{}',
  schedule    TEXT,
  last_run_at TIMESTAMPTZ,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- â”€â”€â”€ Brand Voices â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
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

-- â”€â”€â”€ Content Pieces â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
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

-- â”€â”€â”€ Social Accounts â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
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

-- â”€â”€â”€ Social Messages â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
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

-- â”€â”€â”€ Social Replies â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
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

-- â”€â”€â”€ SEO Projects â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
CREATE TABLE seo_projects (
  id               UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  org_id           UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name             TEXT NOT NULL,
  target_domain    TEXT,
  target_keywords  TEXT[] NOT NULL DEFAULT '{}',
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- â”€â”€â”€ SEO Keywords â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
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

-- â”€â”€â”€ SEO Competitors â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
CREATE TABLE seo_competitors (
  id                   UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id           UUID NOT NULL REFERENCES seo_projects(id) ON DELETE CASCADE,
  domain               TEXT NOT NULL,
  overlap_pct          INT,
  keywords_they_rank   TEXT[] NOT NULL DEFAULT '{}',
  domain_authority     INT,
  created_at           TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- â”€â”€â”€ Campaigns â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
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

-- â”€â”€â”€ Campaign Content â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
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

-- â”€â”€â”€ Analytics Daily â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
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

-- â”€â”€â”€ Content Performance â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
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

-- â”€â”€â”€ Workflow Runs â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
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

-- â”€â”€â”€ API Keys â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
CREATE TABLE api_keys (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  org_id       UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name         TEXT NOT NULL,
  key_hash     TEXT NOT NULL UNIQUE,  -- bcrypt hash
  key_prefix   TEXT NOT NULL,         -- first 8 chars shown to user (e.g. "sk_live_")
  last_used_at TIMESTAMPTZ,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- â”€â”€â”€ Updated_at triggers â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
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
-- Row Level Security policies â€” ALL data is scoped to org_id
-- Run this AFTER 001_initial_schema.sql

-- â”€â”€â”€ Enable RLS â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
ALTER TABLE organizations       ENABLE ROW LEVEL SECURITY;
ALTER TABLE users               ENABLE ROW LEVEL SECURITY;
ALTER TABLE org_members         ENABLE ROW LEVEL SECURITY;
ALTER TABLE leads               ENABLE ROW LEVEL SECURITY;
ALTER TABLE lead_activities     ENABLE ROW LEVEL SECURITY;
ALTER TABLE lead_discovery_configs ENABLE ROW LEVEL SECURITY;
ALTER TABLE brand_voices        ENABLE ROW LEVEL SECURITY;
ALTER TABLE content_pieces      ENABLE ROW LEVEL SECURITY;
ALTER TABLE social_accounts     ENABLE ROW LEVEL SECURITY;
ALTER TABLE social_messages     ENABLE ROW LEVEL SECURITY;
ALTER TABLE social_replies      ENABLE ROW LEVEL SECURITY;
ALTER TABLE seo_projects        ENABLE ROW LEVEL SECURITY;
ALTER TABLE seo_keywords        ENABLE ROW LEVEL SECURITY;
ALTER TABLE seo_competitors     ENABLE ROW LEVEL SECURITY;
ALTER TABLE campaigns           ENABLE ROW LEVEL SECURITY;
ALTER TABLE campaign_content    ENABLE ROW LEVEL SECURITY;
ALTER TABLE analytics_daily     ENABLE ROW LEVEL SECURITY;
ALTER TABLE content_performance ENABLE ROW LEVEL SECURITY;
ALTER TABLE workflow_runs       ENABLE ROW LEVEL SECURITY;
ALTER TABLE api_keys            ENABLE ROW LEVEL SECURITY;

-- â”€â”€â”€ Helper function: get current user's org IDs â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
-- When using Clerk JWT, auth.jwt()->'org_id' will contain the org.
-- When using service role, RLS is bypassed entirely.
CREATE OR REPLACE FUNCTION current_org_id()
RETURNS UUID AS $$
  SELECT NULLIF(current_setting('app.org_id', true), '')::UUID;
$$ LANGUAGE sql STABLE;

-- â”€â”€â”€ Organizations â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
CREATE POLICY "org_members_can_read_own_org"
  ON organizations FOR SELECT
  USING (
    id IN (SELECT org_id FROM org_members WHERE user_id = (
      SELECT id FROM users WHERE clerk_id = auth.jwt()->>'sub'
    ))
  );

-- â”€â”€â”€ Users â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
CREATE POLICY "users_read_own"
  ON users FOR SELECT
  USING (clerk_id = auth.jwt()->>'sub');

CREATE POLICY "users_update_own"
  ON users FOR UPDATE
  USING (clerk_id = auth.jwt()->>'sub');

-- â”€â”€â”€ Org Members â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
CREATE POLICY "members_read_same_org"
  ON org_members FOR SELECT
  USING (
    org_id IN (SELECT org_id FROM org_members WHERE user_id = (
      SELECT id FROM users WHERE clerk_id = auth.jwt()->>'sub'
    ))
  );

-- â”€â”€â”€ Leads â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
CREATE POLICY "leads_org_isolation"
  ON leads FOR ALL
  USING (
    org_id IN (SELECT org_id FROM org_members WHERE user_id = (
      SELECT id FROM users WHERE clerk_id = auth.jwt()->>'sub'
    ))
  )
  WITH CHECK (
    org_id IN (SELECT org_id FROM org_members WHERE user_id = (
      SELECT id FROM users WHERE clerk_id = auth.jwt()->>'sub'
    ))
  );

-- Same pattern for all org-scoped tables
CREATE POLICY "lead_activities_org_isolation"
  ON lead_activities FOR ALL
  USING (org_id IN (SELECT org_id FROM org_members WHERE user_id = (SELECT id FROM users WHERE clerk_id = auth.jwt()->>'sub')))
  WITH CHECK (org_id IN (SELECT org_id FROM org_members WHERE user_id = (SELECT id FROM users WHERE clerk_id = auth.jwt()->>'sub')));

CREATE POLICY "discovery_configs_org_isolation"
  ON lead_discovery_configs FOR ALL
  USING (org_id IN (SELECT org_id FROM org_members WHERE user_id = (SELECT id FROM users WHERE clerk_id = auth.jwt()->>'sub')))
  WITH CHECK (org_id IN (SELECT org_id FROM org_members WHERE user_id = (SELECT id FROM users WHERE clerk_id = auth.jwt()->>'sub')));

CREATE POLICY "brand_voices_org_isolation"
  ON brand_voices FOR ALL
  USING (org_id IN (SELECT org_id FROM org_members WHERE user_id = (SELECT id FROM users WHERE clerk_id = auth.jwt()->>'sub')))
  WITH CHECK (org_id IN (SELECT org_id FROM org_members WHERE user_id = (SELECT id FROM users WHERE clerk_id = auth.jwt()->>'sub')));

CREATE POLICY "content_pieces_org_isolation"
  ON content_pieces FOR ALL
  USING (org_id IN (SELECT org_id FROM org_members WHERE user_id = (SELECT id FROM users WHERE clerk_id = auth.jwt()->>'sub')))
  WITH CHECK (org_id IN (SELECT org_id FROM org_members WHERE user_id = (SELECT id FROM users WHERE clerk_id = auth.jwt()->>'sub')));

CREATE POLICY "social_accounts_org_isolation"
  ON social_accounts FOR ALL
  USING (org_id IN (SELECT org_id FROM org_members WHERE user_id = (SELECT id FROM users WHERE clerk_id = auth.jwt()->>'sub')))
  WITH CHECK (org_id IN (SELECT org_id FROM org_members WHERE user_id = (SELECT id FROM users WHERE clerk_id = auth.jwt()->>'sub')));

CREATE POLICY "social_messages_org_isolation"
  ON social_messages FOR ALL
  USING (org_id IN (SELECT org_id FROM org_members WHERE user_id = (SELECT id FROM users WHERE clerk_id = auth.jwt()->>'sub')))
  WITH CHECK (org_id IN (SELECT org_id FROM org_members WHERE user_id = (SELECT id FROM users WHERE clerk_id = auth.jwt()->>'sub')));

CREATE POLICY "social_replies_org_isolation"
  ON social_replies FOR ALL
  USING (org_id IN (SELECT org_id FROM org_members WHERE user_id = (SELECT id FROM users WHERE clerk_id = auth.jwt()->>'sub')))
  WITH CHECK (org_id IN (SELECT org_id FROM org_members WHERE user_id = (SELECT id FROM users WHERE clerk_id = auth.jwt()->>'sub')));

CREATE POLICY "seo_projects_org_isolation"
  ON seo_projects FOR ALL
  USING (org_id IN (SELECT org_id FROM org_members WHERE user_id = (SELECT id FROM users WHERE clerk_id = auth.jwt()->>'sub')))
  WITH CHECK (org_id IN (SELECT org_id FROM org_members WHERE user_id = (SELECT id FROM users WHERE clerk_id = auth.jwt()->>'sub')));

CREATE POLICY "seo_keywords_org_isolation"
  ON seo_keywords FOR ALL
  USING (org_id IN (SELECT org_id FROM org_members WHERE user_id = (SELECT id FROM users WHERE clerk_id = auth.jwt()->>'sub')))
  WITH CHECK (org_id IN (SELECT org_id FROM org_members WHERE user_id = (SELECT id FROM users WHERE clerk_id = auth.jwt()->>'sub')));

CREATE POLICY "seo_competitors_read"
  ON seo_competitors FOR SELECT
  USING (
    project_id IN (
      SELECT id FROM seo_projects WHERE org_id IN (
        SELECT org_id FROM org_members WHERE user_id = (SELECT id FROM users WHERE clerk_id = auth.jwt()->>'sub')
      )
    )
  );

CREATE POLICY "campaigns_org_isolation"
  ON campaigns FOR ALL
  USING (org_id IN (SELECT org_id FROM org_members WHERE user_id = (SELECT id FROM users WHERE clerk_id = auth.jwt()->>'sub')))
  WITH CHECK (org_id IN (SELECT org_id FROM org_members WHERE user_id = (SELECT id FROM users WHERE clerk_id = auth.jwt()->>'sub')));

CREATE POLICY "campaign_content_read"
  ON campaign_content FOR SELECT
  USING (
    campaign_id IN (
      SELECT id FROM campaigns WHERE org_id IN (
        SELECT org_id FROM org_members WHERE user_id = (SELECT id FROM users WHERE clerk_id = auth.jwt()->>'sub')
      )
    )
  );

CREATE POLICY "analytics_daily_org_isolation"
  ON analytics_daily FOR ALL
  USING (org_id IN (SELECT org_id FROM org_members WHERE user_id = (SELECT id FROM users WHERE clerk_id = auth.jwt()->>'sub')))
  WITH CHECK (org_id IN (SELECT org_id FROM org_members WHERE user_id = (SELECT id FROM users WHERE clerk_id = auth.jwt()->>'sub')));

CREATE POLICY "content_performance_org_isolation"
  ON content_performance FOR ALL
  USING (org_id IN (SELECT org_id FROM org_members WHERE user_id = (SELECT id FROM users WHERE clerk_id = auth.jwt()->>'sub')))
  WITH CHECK (org_id IN (SELECT org_id FROM org_members WHERE user_id = (SELECT id FROM users WHERE clerk_id = auth.jwt()->>'sub')));

CREATE POLICY "workflow_runs_org_isolation"
  ON workflow_runs FOR ALL
  USING (org_id IN (SELECT org_id FROM org_members WHERE user_id = (SELECT id FROM users WHERE clerk_id = auth.jwt()->>'sub')))
  WITH CHECK (org_id IN (SELECT org_id FROM org_members WHERE user_id = (SELECT id FROM users WHERE clerk_id = auth.jwt()->>'sub')));

CREATE POLICY "api_keys_org_isolation"
  ON api_keys FOR ALL
  USING (org_id IN (SELECT org_id FROM org_members WHERE user_id = (SELECT id FROM users WHERE clerk_id = auth.jwt()->>'sub')))
  WITH CHECK (org_id IN (SELECT org_id FROM org_members WHERE user_id = (SELECT id FROM users WHERE clerk_id = auth.jwt()->>'sub')));

-- â”€â”€â”€ Realtime publications â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
-- Enable realtime for tables that need live updates
ALTER PUBLICATION supabase_realtime ADD TABLE leads;
ALTER PUBLICATION supabase_realtime ADD TABLE workflow_runs;
ALTER PUBLICATION supabase_realtime ADD TABLE social_messages;
ALTER PUBLICATION supabase_realtime ADD TABLE content_pieces;
-- Blue Wolf / SignafyAI intelligence tables
-- Supports n8n workflows WF1 (prospects), WF2 (intent), WF3 (assets)
-- Run AFTER 001_initial_schema.sql

-- â”€â”€â”€ Businesses (WF1 â€” Enhanced Prospect Finder) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
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

-- â”€â”€â”€ Intent Signals (WF2 â€” Consumer Intent Finder) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
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

-- â”€â”€â”€ Generated Assets (WF3 â€” Funnel Asset Generator) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
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
-- RLS + Realtime for Blue Wolf intelligence tables
-- Run AFTER 003_blue_wolf_intelligence_tables.sql

ALTER TABLE businesses       ENABLE ROW LEVEL SECURITY;
ALTER TABLE intent_signals   ENABLE ROW LEVEL SECURITY;
ALTER TABLE generated_assets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "businesses_org_isolation"
  ON businesses FOR ALL
  USING (org_id IN (SELECT org_id FROM org_members WHERE user_id = (SELECT id FROM users WHERE clerk_id = auth.jwt()->>'sub')))
  WITH CHECK (org_id IN (SELECT org_id FROM org_members WHERE user_id = (SELECT id FROM users WHERE clerk_id = auth.jwt()->>'sub')));

CREATE POLICY "intent_signals_org_isolation"
  ON intent_signals FOR ALL
  USING (org_id IN (SELECT org_id FROM org_members WHERE user_id = (SELECT id FROM users WHERE clerk_id = auth.jwt()->>'sub')))
  WITH CHECK (org_id IN (SELECT org_id FROM org_members WHERE user_id = (SELECT id FROM users WHERE clerk_id = auth.jwt()->>'sub')));

CREATE POLICY "generated_assets_org_isolation"
  ON generated_assets FOR ALL
  USING (org_id IN (SELECT org_id FROM org_members WHERE user_id = (SELECT id FROM users WHERE clerk_id = auth.jwt()->>'sub')))
  WITH CHECK (org_id IN (SELECT org_id FROM org_members WHERE user_id = (SELECT id FROM users WHERE clerk_id = auth.jwt()->>'sub')));

-- Live updates during discovery runs
ALTER PUBLICATION supabase_realtime ADD TABLE businesses;
ALTER PUBLICATION supabase_realtime ADD TABLE intent_signals;
ALTER PUBLICATION supabase_realtime ADD TABLE generated_assets;
-- Usage counter RPC used by n8n callback handler
CREATE OR REPLACE FUNCTION increment_leads_usage(p_org_id UUID, p_amount INT)
RETURNS VOID AS $$
BEGIN
  UPDATE organizations
  SET usage_leads_mo = usage_leads_mo + GREATEST(p_amount, 0)
  WHERE id = p_org_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION increment_content_usage(p_org_id UUID, p_amount INT)
RETURNS VOID AS $$
BEGIN
  UPDATE organizations
  SET usage_content_mo = usage_content_mo + GREATEST(p_amount, 0)
  WHERE id = p_org_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
-- Allow free tier (used by Signafy onboarding)
ALTER TABLE organizations DROP CONSTRAINT IF EXISTS organizations_plan_check;
ALTER TABLE organizations ADD CONSTRAINT organizations_plan_check
  CHECK (plan IN ('free', 'starter', 'pro', 'agency'));
-- ─── 007: Extend workflow_runs for Blue Wolf Intelligence types ────────────────
ALTER TABLE workflow_runs DROP CONSTRAINT IF EXISTS workflow_runs_workflow_type_check;
ALTER TABLE workflow_runs ADD CONSTRAINT workflow_runs_workflow_type_check
  CHECK (workflow_type IN (
    'lead_discovery',
    'content_generation',
    'social_classification',
    'seo_research',
    'analytics_aggregation',
    'prospect_discovery',
    'intent_discovery',
    'asset_generation'
  ));
