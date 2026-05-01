-- Row Level Security policies — ALL data is scoped to org_id
-- Run this AFTER 001_initial_schema.sql

-- ─── Enable RLS ───────────────────────────────────────────────────────────────
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

-- ─── Helper function: get current user's org IDs ──────────────────────────────
-- When using Clerk JWT, auth.jwt()->'org_id' will contain the org.
-- When using service role, RLS is bypassed entirely.
CREATE OR REPLACE FUNCTION current_org_id()
RETURNS UUID AS $$
  SELECT NULLIF(current_setting('app.org_id', true), '')::UUID;
$$ LANGUAGE sql STABLE;

-- ─── Organizations ────────────────────────────────────────────────────────────
CREATE POLICY "org_members_can_read_own_org"
  ON organizations FOR SELECT
  USING (
    id IN (SELECT org_id FROM org_members WHERE user_id = (
      SELECT id FROM users WHERE clerk_id = auth.jwt()->>'sub'
    ))
  );

-- ─── Users ────────────────────────────────────────────────────────────────────
CREATE POLICY "users_read_own"
  ON users FOR SELECT
  USING (clerk_id = auth.jwt()->>'sub');

CREATE POLICY "users_update_own"
  ON users FOR UPDATE
  USING (clerk_id = auth.jwt()->>'sub');

-- ─── Org Members ──────────────────────────────────────────────────────────────
CREATE POLICY "members_read_same_org"
  ON org_members FOR SELECT
  USING (
    org_id IN (SELECT org_id FROM org_members WHERE user_id = (
      SELECT id FROM users WHERE clerk_id = auth.jwt()->>'sub'
    ))
  );

-- ─── Leads ────────────────────────────────────────────────────────────────────
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

-- ─── Realtime publications ────────────────────────────────────────────────────
-- Enable realtime for tables that need live updates
ALTER PUBLICATION supabase_realtime ADD TABLE leads;
ALTER PUBLICATION supabase_realtime ADD TABLE workflow_runs;
ALTER PUBLICATION supabase_realtime ADD TABLE social_messages;
ALTER PUBLICATION supabase_realtime ADD TABLE content_pieces;
