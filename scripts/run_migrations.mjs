/**
 * Migration runner — connects directly to Supabase PostgreSQL and
 * runs all pending migrations in order.
 *
 * Usage:
 *   SUPABASE_DB_PASSWORD=your_password node scripts/run_migrations.mjs
 */

import pg from "pg";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const PROJECT_REF = "shqsgswoficddajtqhuh";
const PASSWORD     = process.env.SUPABASE_DB_PASSWORD;

if (!PASSWORD) {
  console.error("❌ Set SUPABASE_DB_PASSWORD — find it in:");
  console.error("   Supabase Dashboard → Settings → Database → Connection string → Password");
  process.exit(1);
}

// Supabase connection pooler (port 6543 = transaction mode, works everywhere)
const client = new pg.Client({
  host:     `aws-0-us-east-1.pooler.supabase.com`,
  port:     6543,
  database: "postgres",
  user:     `postgres.${PROJECT_REF}`,
  password: PASSWORD,
  ssl:      { rejectUnauthorized: false },
});

// Migrations to run in order (only missing ones)
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
  console.log("🔌 Connecting to Supabase…");
  await client.connect();
  console.log("✅ Connected\n");

  for (const filename of MIGRATIONS) {
    const filepath = path.join(__dirname, "../supabase/migrations", filename);
    if (!fs.existsSync(filepath)) {
      console.log(`⏭  ${filename} — file not found, skipping`);
      continue;
    }

    const sql = fs.readFileSync(filepath, "utf8");
    console.log(`▶  Running ${filename}…`);
    try {
      await client.query(sql);
      console.log(`   ✅ Done`);
    } catch (err) {
      // Ignore "already exists" errors — migration is safe to re-run
      if (err.code === "42P07" || err.code === "42P16" || err.code === "42710") {
        console.log(`   ⚠️  Already exists — skipping (${err.message.split("\n")[0]})`);
      } else {
        console.error(`   ❌ Error in ${filename}: ${err.message}`);
        // Don't stop — continue with remaining migrations
      }
    }
  }

  await client.end();
  console.log("\n🎉 All migrations complete.");
}

run().catch((e) => { console.error(e); process.exit(1); });
