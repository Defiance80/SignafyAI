import pg from "pg";

const client = new pg.Client({
  host: "aws-1-us-east-2.pooler.supabase.com",
  port: 5432,
  database: "postgres",
  user: "postgres.shqsgswoficddajtqhuh",
  password: "LetsWin@123!!!",
  ssl: { rejectUnauthorized: false },
});

await client.connect();
const r = await client.query(
  "SELECT tablename FROM pg_tables WHERE schemaname='public' ORDER BY tablename"
);
console.log("Existing tables:", r.rows.map(x => x.tablename).join(", "));
await client.end();
