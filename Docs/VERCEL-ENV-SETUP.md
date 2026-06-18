# SignafyAI — Vercel Environment Variables Setup

> **Run this checklist once** after every deploy or when env vars change.
> Missing even one of the critical vars below = the app falls into demo mode (hardcoded data, no n8n calls).

---

## 1. Add Variables in Vercel Dashboard

Go to: **Vercel Dashboard → SignafyAI project → Settings → Environment Variables**

Set each to apply to **all environments** (Production + Preview + Development) unless noted.

### 🔴 CRITICAL — App is broken without these

| Variable | Value | Notes |
|---|---|---|
| `NEXT_PUBLIC_APP_URL` | `https://signafy-ai.vercel.app` | Your Vercel URL |
| `NEXT_PUBLIC_SUPABASE_URL` | `https://shqsgswoficddajtqhuh.supabase.co` | From Supabase → Settings → API |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | `sb_publishable_...` | From Supabase → Settings → API → "anon public" |
| `SUPABASE_SERVICE_ROLE_KEY` | `sb_secret_-EFs-_...` | **Server-side only. Never expose to browser.** |
| `N8N_WEBHOOK_BASE_URL` | `https://n8n.srv1104500.hstgr.cloud` | Your Hostinger VPS n8n URL |
| `N8N_HMAC_SECRET` | `be600a5bda38c209bd4d9a9150728bb207ba544a338438e8ed01c4ad9dbf440b` | Must match n8n env var `N8N_HMAC_SECRET` |

### 🟡 REQUIRED for Auth (Clerk)

| Variable | Value | Notes |
|---|---|---|
| `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` | `pk_live_...` | From Clerk Dashboard → API Keys |
| `CLERK_SECRET_KEY` | `sk_live_...` | From Clerk Dashboard → API Keys |
| `CLERK_WEBHOOK_SECRET` | `whsec_...` | From Clerk → Webhooks → your endpoint |
| `NEXT_PUBLIC_CLERK_SIGN_IN_URL` | `/sign-in` | |
| `NEXT_PUBLIC_CLERK_SIGN_UP_URL` | `/sign-up` | |
| `NEXT_PUBLIC_CLERK_AFTER_SIGN_IN_URL` | `/dashboard` | |
| `NEXT_PUBLIC_CLERK_AFTER_SIGN_UP_URL` | `/dashboard` | |

### 🟡 REQUIRED for AI Lead Discovery (fallback when n8n fails)

| Variable | Value | Notes |
|---|---|---|
| `OPENAI_API_KEY` | `sk-...` | From platform.openai.com |
| `AI_PROVIDER` | `openai` | |
| `AI_MODEL` | `gpt-4.1-mini` | |

### 🟢 OPTIONAL (advanced features)

| Variable | Notes |
|---|---|
| `STRIPE_SECRET_KEY` | Billing |
| `STRIPE_WEBHOOK_SECRET` | Billing |
| `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | Billing |
| `N8N_API_KEY` | For n8n REST API calls (not webhooks) |
| `SUPER_ADMIN_CLERK_IDS` | Comma-separated Clerk user IDs, bypasses rate limits |
| `CRON_SECRET` | Authenticate cron job requests |

---

## 2. Redeploy After Adding Vars

After adding env vars, **trigger a manual redeploy**:

```
Vercel Dashboard → Deployments → click the latest → "Redeploy" button
```

OR push an empty commit:

```bash
git commit --allow-empty -m "chore: trigger redeploy for env vars"
git push
```

---

## 3. Run Supabase Migrations

The database tables must exist before any data flows through.

1. Go to: **Supabase Dashboard → SQL Editor → New Query**
2. Paste the contents of [`supabase/SETUP-RUN-IN-SQL-EDITOR.sql`](../supabase/SETUP-RUN-IN-SQL-EDITOR.sql)
3. Click **Run**
4. ✅ Expect: all tables created, no errors (idempotent — safe to re-run)

If tables already exist and you get "relation already exists" errors, just run the newer migrations individually (see `supabase/migrations/`).

**New migration to run if already set up:**
```sql
-- Paste this if businesses table already exists:
CREATE UNIQUE INDEX IF NOT EXISTS idx_businesses_org_name
  ON businesses(org_id, name)
  WHERE org_id IS NOT NULL;

ALTER TABLE workflow_runs DROP CONSTRAINT IF EXISTS workflow_runs_workflow_type_check;
ALTER TABLE workflow_runs ADD CONSTRAINT workflow_runs_workflow_type_check
  CHECK (workflow_type IN (
    'lead_discovery', 'content_generation', 'social_classification',
    'seo_research', 'analytics_aggregation',
    'prospect_discovery', 'intent_discovery', 'asset_generation'
  ));

ALTER TABLE organizations DROP CONSTRAINT IF EXISTS organizations_plan_check;
ALTER TABLE organizations ADD CONSTRAINT organizations_plan_check
  CHECK (plan IN ('free', 'starter', 'pro', 'agency'));
```

---

## 4. Import / Reimport n8n Workflows

After updating workflow JSON files, reimport into n8n:

1. Go to: **n8n UI → Workflows → Import from file**
2. Import in this order (dependencies):
   - `Docs/BW-WF0-Router-Workflow.json` (router)
   - `Docs/BW-WF1-Enhanced-Prospect-Finder.json`
   - `Docs/BW-WF2-Consumer-Intent-Finder.json`
3. **After importing WF1 and WF2**, map the Supabase credential:
   - Click the "Supabase - Upsert Business" node
   - Select your Supabase credential (the one with the service role key)
4. Make sure n8n environment variables are set in n8n's settings:
   - `N8N_HMAC_SECRET=be600a5bda38c209bd4d9a9150728bb207ba544a338438e8ed01c4ad9dbf440b`
   - `APIFY_API_KEY=<your-apify-api-token>` — from Apify Dashboard → Settings → Integrations
   - `N8N_BASE_URL=https://n8n.srv1104500.hstgr.cloud`

---

## 5. Configure n8n Environment Variables (VPS)

SSH into the VPS and update the `.env` file n8n reads:

```bash
ssh root@31.220.54.118
nano /opt/n8n/.env   # or wherever docker-compose .env lives
```

Required n8n env vars:

```env
N8N_HMAC_SECRET=be600a5bda38c209bd4d9a9150728bb207ba544a338438e8ed01c4ad9dbf440b
APIFY_API_KEY=<your-apify-api-token>
N8N_BASE_URL=https://n8n.srv1104500.hstgr.cloud
OPENAI_API_KEY=sk-...   # same key used by WF1/WF2 GPT-4.1-mini nodes
```

> The Apify token is stored in `Docs/Signafy-prod-token.txt` (git-ignored). Paste it above.

Then restart n8n:
```bash
docker compose restart n8n
```

---

## 6. Verify End-to-End

1. Sign in to SignafyAI → Leads → type a target description, e.g. "marketing agencies in Miami"
2. Click **Find Leads** → spinner should appear
3. Check n8n UI → Workflows → BW-WF0-Router → Executions → should show a new run
4. After ~90 seconds, businesses should appear in the Leads → Prospects tab
5. Check Supabase → Table Editor → `businesses` → rows should be populated

---

## 7. Security Rotations (Pending)

⚠️ **Do these ASAP:**

- [ ] Rotate VPS root password — was shared in chat history, change it at Hostinger VPS panel
- [ ] Rotate Supabase service role key — was shared in chat history; rotate in Supabase Dashboard → Settings → API Keys
- [ ] Invalidate old Apify token in Apify Dashboard → Settings → Integrations (the one committed in git history)
