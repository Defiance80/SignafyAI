/**
 * Creates the remaining tables from migration 001 that weren't created yet.
 * Uses IF NOT EXISTS everywhere — safe to re-run.
 */
import pg from "pg";

const client = new pg.Client({
  host: "aws-1-us-east-2.pooler.supabase.com", port: 5432,
  database: "postgres", user: "postgres.shqsgswoficddajtqhuh",
  password: "LetsWin@123!!!", ssl: { rejectUnauthorized: false },
});

const SQL = `
CREATE TABLE IF NOT EXISTS seo_projects (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  org_id          UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name            TEXT NOT NULL,
  target_domain   TEXT,
  target_keywords TEXT[] NOT NULL DEFAULT '{}',
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS seo_keywords (
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
CREATE INDEX IF NOT EXISTS idx_keywords_project ON seo_keywords(project_id);
CREATE INDEX IF NOT EXISTS idx_keywords_volume  ON seo_keywords(project_id, search_volume DESC NULLS LAST);

CREATE TABLE IF NOT EXISTS seo_competitors (
  id                 UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id         UUID NOT NULL REFERENCES seo_projects(id) ON DELETE CASCADE,
  domain             TEXT NOT NULL,
  overlap_pct        INT,
  keywords_they_rank TEXT[] NOT NULL DEFAULT '{}',
  domain_authority   INT,
  created_at         TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS campaigns (
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
CREATE INDEX IF NOT EXISTS idx_campaigns_org ON campaigns(org_id, created_at DESC);

CREATE TABLE IF NOT EXISTS campaign_content (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  campaign_id UUID NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
  content_id  UUID NOT NULL REFERENCES content_pieces(id) ON DELETE CASCADE,
  scheduled_at TIMESTAMPTZ,
  published_at TIMESTAMPTZ,
  status      TEXT NOT NULL DEFAULT 'pending'
                CHECK (status IN ('pending','published','failed')),
  performance JSONB,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS analytics_daily (
  id                 UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  org_id             UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  date               DATE NOT NULL,
  total_reach        INT NOT NULL DEFAULT 0,
  total_impressions  INT NOT NULL DEFAULT 0,
  total_engagement   INT NOT NULL DEFAULT 0,
  engagement_rate    FLOAT NOT NULL DEFAULT 0,
  leads_generated    INT NOT NULL DEFAULT 0,
  conversions        INT NOT NULL DEFAULT 0,
  revenue_attributed DECIMAL(10,2) NOT NULL DEFAULT 0,
  platform_breakdown JSONB,
  created_at         TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (org_id, date)
);
CREATE INDEX IF NOT EXISTS idx_analytics_org_date ON analytics_daily(org_id, date DESC);

CREATE TABLE IF NOT EXISTS content_performance (
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

CREATE TABLE IF NOT EXISTS api_keys (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  org_id       UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name         TEXT NOT NULL,
  key_hash     TEXT NOT NULL UNIQUE,
  key_prefix   TEXT NOT NULL,
  last_used_at TIMESTAMPTZ,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Triggers for new tables
DO $$ BEGIN
  CREATE TRIGGER set_updated_at BEFORE UPDATE ON seo_projects
    FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TRIGGER set_updated_at BEFORE UPDATE ON seo_keywords
    FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TRIGGER set_updated_at BEFORE UPDATE ON campaigns
    FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- RLS
ALTER TABLE seo_projects       ENABLE ROW LEVEL SECURITY;
ALTER TABLE seo_keywords        ENABLE ROW LEVEL SECURITY;
ALTER TABLE seo_competitors     ENABLE ROW LEVEL SECURITY;
ALTER TABLE campaigns           ENABLE ROW LEVEL SECURITY;
ALTER TABLE campaign_content    ENABLE ROW LEVEL SECURITY;
ALTER TABLE analytics_daily     ENABLE ROW LEVEL SECURITY;
ALTER TABLE content_performance ENABLE ROW LEVEL SECURITY;
ALTER TABLE api_keys            ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN CREATE POLICY "seo_projects_iso" ON seo_projects FOR ALL
  USING (org_id IN (SELECT org_id FROM org_members WHERE user_id IN (SELECT id FROM users WHERE clerk_id = auth.jwt()->>'sub')));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN CREATE POLICY "seo_keywords_iso" ON seo_keywords FOR ALL
  USING (org_id IN (SELECT org_id FROM org_members WHERE user_id IN (SELECT id FROM users WHERE clerk_id = auth.jwt()->>'sub')));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN CREATE POLICY "campaigns_iso" ON campaigns FOR ALL
  USING (org_id IN (SELECT org_id FROM org_members WHERE user_id IN (SELECT id FROM users WHERE clerk_id = auth.jwt()->>'sub')));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN CREATE POLICY "analytics_iso" ON analytics_daily FOR ALL
  USING (org_id IN (SELECT org_id FROM org_members WHERE user_id IN (SELECT id FROM users WHERE clerk_id = auth.jwt()->>'sub')));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
`;

await client.connect();
console.log("✅ Connected");
process.stdout.write("▶  Creating remaining schema tables… ");
try {
  await client.query(SQL);
  console.log("✅ Done");
} catch(e) {
  console.log("❌ " + e.message.split("\n")[0]);
}

const r = await client.query(
  "SELECT tablename FROM pg_tables WHERE schemaname='public' ORDER BY tablename"
);
console.log("\n📋 Final table list:", r.rows.map(x => x.tablename).join(", "));
await client.end();
console.log("\n🎉 Schema complete.");
