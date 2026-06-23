/**
 * One-shot: add audit_data, social_data, raw_data columns to businesses.
 * Requires SUPABASE_DB_PASSWORD in .env.local (Dashboard → Settings → Database).
 *
 * Usage: node scripts/run-migration-010.mjs
 */
import { readFileSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import pg from "pg";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..");

function loadEnvLocal() {
  try {
    const raw = readFileSync(join(root, ".env.local"), "utf8");
    for (const line of raw.split("\n")) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) continue;
      const eq = trimmed.indexOf("=");
      if (eq === -1) continue;
      const key = trimmed.slice(0, eq).trim();
      let val = trimmed.slice(eq + 1).trim();
      if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
        val = val.slice(1, -1);
      }
      if (!process.env[key]) process.env[key] = val;
    }
  } catch { /* .env.local optional */ }
}

loadEnvLocal();

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const password = process.env.SUPABASE_DB_PASSWORD;
const projectRef = url?.match(/https:\/\/([^.]+)\.supabase\.co/)?.[1];

if (!projectRef || !password) {
  console.error(
    "Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_DB_PASSWORD.\n" +
    "Add to .env.local:\n  SUPABASE_DB_PASSWORD=<your-db-password>\n" +
    "(Supabase Dashboard → Project Settings → Database → Database password)"
  );
  process.exit(1);
}

const connectionString =
  process.env.DATABASE_URL ??
  `postgresql://postgres.${projectRef}:${encodeURIComponent(password)}@aws-0-us-west-1.pooler.supabase.com:6543/postgres`;

const client = new pg.Client({ connectionString, ssl: { rejectUnauthorized: false } });

async function main() {
  await client.connect();
  console.log(`Connected to Supabase (${projectRef})`);

  await client.query(`
    ALTER TABLE businesses
      ADD COLUMN IF NOT EXISTS audit_data  JSONB DEFAULT NULL,
      ADD COLUMN IF NOT EXISTS social_data JSONB DEFAULT NULL,
      ADD COLUMN IF NOT EXISTS raw_data    TEXT  DEFAULT NULL
  `);
  console.log("✓ Migration 010 applied — audit_data, social_data, raw_data columns added");

  const { rows } = await client.query(
    "SELECT column_name FROM information_schema.columns WHERE table_name='businesses' AND column_name IN ('audit_data','social_data','raw_data')"
  );
  console.log("Verified columns:", rows.map((r) => r.column_name).join(", "));

  await client.end();
}

main().catch((err) => { console.error(err); process.exit(1); });
