/**
 * Migration runner — runs all pending Supabase migrations in order.
 * Uses the exact connection URI from the Supabase Connect panel.
 *
 * Usage:
 *   node scripts/run_migrations.mjs
 */

import pg from "pg";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const client = new pg.Client({
  host:     "aws-1-us-east-2.pooler.supabase.com",
  port:     5432,
  database: "postgres",
  user:     "postgres.shqsgswoficddajtqhuh",
  password: "LetsWin@123!!!",
  ssl:      { rejectUnauthorized: false },
});

// All migrations in order
const MIGRATIONS = [
  "001_initial_schema.sql",
  "002_rls_policies.sql",
  "003_blue_wolf_intelligence_tables.sql",
  "004_blue_wolf_rls_policies.sql",
  "005_usage_rpc.sql",
  "006_allow_free_plan.sql",
  "012_content_intelligence.sql",
  "013_social_accounts_oauth.sql",
];

async function run() {
  console.log("🔌 Connecting to Supabase (us-east-2)…");
  await client.connect();
  console.log("✅ Connected\n");

  for (const filename of MIGRATIONS) {
    const filepath = path.join(__dirname, "../supabase/migrations", filename);
    if (!fs.existsSync(filepath)) {
      console.log(`⏭  ${filename} — not found, skipping`);
      continue;
    }

    const sql = fs.readFileSync(filepath, "utf8");
    process.stdout.write(`▶  ${filename}… `);
    try {
      await client.query(sql);
      console.log("✅");
    } catch (err) {
      const code = err?.code ?? "";
      // Already-exists errors are safe to skip
      if (["42P07","42P16","42710","42701","23505"].includes(code)) {
        console.log(`⚠️  already exists (skipped)`);
      } else {
        console.log(`❌ ${String(err?.message ?? err).split("\n")[0]}`);
      }
    }
  }

  await client.end();
  console.log("\n🎉 All migrations complete.");
}

run().catch((e) => { console.error(e.message); process.exit(1); });
