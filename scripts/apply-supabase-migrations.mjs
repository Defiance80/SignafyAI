/**
 * Apply Supabase SQL migrations in order.
 * Requires SUPABASE_DB_PASSWORD in .env.local (Dashboard → Settings → Database).
 *
 * Usage: node scripts/apply-supabase-migrations.mjs
 */
import { readFileSync, readdirSync } from "fs";
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
  } catch {
    /* .env.local optional if env vars already set */
  }
}

loadEnvLocal();

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const password = process.env.SUPABASE_DB_PASSWORD;
const projectRef = url?.match(/https:\/\/([^.]+)\.supabase\.co/)?.[1];

if (!projectRef || !password) {
  console.error(
    "Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_DB_PASSWORD.\n" +
      "Add your database password to .env.local:\n" +
      "  SUPABASE_DB_PASSWORD=your-db-password\n" +
      "(Supabase Dashboard → Project Settings → Database → Database password)"
  );
  process.exit(1);
}

const connectionString =
  process.env.DATABASE_URL ??
  `postgresql://postgres.${projectRef}:${encodeURIComponent(password)}@aws-0-us-west-1.pooler.supabase.com:6543/postgres`;

const migrationsDir = join(root, "supabase", "migrations");
const files = readdirSync(migrationsDir)
  .filter((f) => f.endsWith(".sql"))
  .sort();

const client = new pg.Client({
  connectionString,
  ssl: { rejectUnauthorized: false },
});

async function main() {
  await client.connect();
  console.log(`Connected to Supabase (${projectRef})`);

  await client.query(`
    CREATE TABLE IF NOT EXISTS _signafy_migrations (
      filename TEXT PRIMARY KEY,
      applied_at TIMESTAMPTZ NOT NULL DEFAULT now()
    )
  `);

  for (const file of files) {
    const { rows } = await client.query(
      "SELECT 1 FROM _signafy_migrations WHERE filename = $1",
      [file]
    );
    if (rows.length > 0) {
      console.log(`Skip (already applied): ${file}`);
      continue;
    }

    const sql = readFileSync(join(migrationsDir, file), "utf8");
    console.log(`Applying: ${file}`);
    await client.query("BEGIN");
    try {
      await client.query(sql);
      await client.query("INSERT INTO _signafy_migrations (filename) VALUES ($1)", [file]);
      await client.query("COMMIT");
      console.log(`  ✓ ${file}`);
    } catch (err) {
      await client.query("ROLLBACK");
      console.error(`  ✗ ${file} failed:`, err.message);
      process.exit(1);
    }
  }

  // Verify key tables
  const { rows: tables } = await client.query(`
    SELECT table_name FROM information_schema.tables
    WHERE table_schema = 'public'
      AND table_name IN ('organizations', 'leads', 'businesses', 'intent_signals', 'generated_assets')
    ORDER BY table_name
  `);
  console.log("\nTables present:", tables.map((r) => r.table_name).join(", ") || "(none)");

  await client.end();
  console.log("\nDone.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
