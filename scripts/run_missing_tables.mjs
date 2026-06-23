/**
 * Creates only the tables missing from migration 001:
 * content_pieces, social_accounts, social_messages, social_replies
 * Plus migration 013 additions to social_accounts.
 * Safe to re-run — uses IF NOT EXISTS everywhere.
 */
import pg from "pg";

const client = new pg.Client({
  host:     "aws-1-us-east-2.pooler.supabase.com",
  port:     5432,
  database: "postgres",
  user:     "postgres.shqsgswoficddajtqhuh",
  password: "LetsWin@123!!!",
  ssl:      { rejectUnauthorized: false },
});

const SQL = `
-- ── Prerequisite: updated_at trigger function ───────────────────
CREATE OR REPLACE FUNCTION trigger_set_updated_at()
RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$ LANGUAGE plpgsql;

-- ── Content Pieces ──────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS content_pieces (
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
CREATE INDEX IF NOT EXISTS idx_content_org    ON content_pieces(org_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_content_status ON content_pieces(org_id, status);

-- ── Social Accounts ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS social_accounts (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  org_id        UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  platform      TEXT NOT NULL
                  CHECK (platform IN ('instagram','linkedin','tiktok','twitter','x','facebook')),
  account_name  TEXT NOT NULL,
  account_id    TEXT NOT NULL,
  access_token  TEXT,
  refresh_token TEXT,
  token_expires TIMESTAMPTZ,
  avatar_url    TEXT,
  scopes        TEXT,
  is_active     BOOLEAN NOT NULL DEFAULT true,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (org_id, platform, account_id)
);

-- ── Social Messages ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS social_messages (
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
CREATE INDEX IF NOT EXISTS idx_messages_org    ON social_messages(org_id, received_at DESC);
CREATE INDEX IF NOT EXISTS idx_messages_unread ON social_messages(org_id) WHERE is_read = false;

-- ── Social Replies ──────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS social_replies (
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

-- ── RLS for new tables ──────────────────────────────────────────
ALTER TABLE content_pieces   ENABLE ROW LEVEL SECURITY;
ALTER TABLE social_accounts  ENABLE ROW LEVEL SECURITY;
ALTER TABLE social_messages  ENABLE ROW LEVEL SECURITY;
ALTER TABLE social_replies   ENABLE ROW LEVEL SECURITY;

-- content_pieces policy
DO $$ BEGIN
  CREATE POLICY "content_pieces_org_isolation" ON content_pieces FOR ALL
    USING (org_id IN (SELECT org_id FROM org_members WHERE user_id IN (
      SELECT id FROM users WHERE clerk_id = auth.jwt()->>'sub'
    )));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- social_accounts policy
DO $$ BEGIN
  CREATE POLICY "social_accounts_org_isolation" ON social_accounts FOR ALL
    USING (org_id IN (SELECT org_id FROM org_members WHERE user_id IN (
      SELECT id FROM users WHERE clerk_id = auth.jwt()->>'sub'
    )));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- social_messages policy
DO $$ BEGIN
  CREATE POLICY "social_messages_org_isolation" ON social_messages FOR ALL
    USING (org_id IN (SELECT org_id FROM org_members WHERE user_id IN (
      SELECT id FROM users WHERE clerk_id = auth.jwt()->>'sub'
    )));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- social_replies policy
DO $$ BEGIN
  CREATE POLICY "social_replies_org_isolation" ON social_replies FOR ALL
    USING (org_id IN (SELECT org_id FROM org_members WHERE user_id IN (
      SELECT id FROM users WHERE clerk_id = auth.jwt()->>'sub'
    )));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- updated_at triggers
DO $$ BEGIN
  CREATE TRIGGER set_updated_at BEFORE UPDATE ON content_pieces
    FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TRIGGER set_updated_at BEFORE UPDATE ON social_accounts
    FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
`;

await client.connect();
console.log("✅ Connected\n");

const steps = [
  ["content_pieces table",   `CREATE TABLE IF NOT EXISTS content_pieces`],
  ["social_accounts table",  `CREATE TABLE IF NOT EXISTS social_accounts`],
  ["social_messages table",  `CREATE TABLE IF NOT EXISTS social_messages`],
  ["social_replies table",   `CREATE TABLE IF NOT EXISTS social_replies`],
];

// Run the whole block
process.stdout.write("▶  Creating missing tables + RLS + triggers… ");
try {
  await client.query(SQL);
  console.log("✅ Done");
} catch(e) {
  console.log("❌ " + e.message.split("\n")[0]);
}

// Verify
const r = await client.query(
  `SELECT tablename FROM pg_tables WHERE schemaname='public' ORDER BY tablename`
);
console.log("\n📋 All tables now:", r.rows.map(x => x.tablename).join(", "));

// Also re-run migration 002 RLS for content_pieces now that the table exists
const rls002 = `
DO $$ BEGIN
  CREATE POLICY "content_pieces_org_isolation" ON content_pieces FOR ALL
    USING (org_id IN (SELECT org_id FROM org_members WHERE user_id IN (
      SELECT id FROM users WHERE clerk_id = auth.jwt()->>'sub'
    )));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
`;

await client.end();
console.log("\n🎉 All done.");
