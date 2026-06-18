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
