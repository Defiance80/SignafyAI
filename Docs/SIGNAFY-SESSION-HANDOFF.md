# SignafyAI — Session Handoff (Lead Generation & n8n Integration)

> **Purpose:** Bring Claude (or any collaborator) up to speed on SignafyAI lead generation architecture, decisions made, files created, gaps identified, and recommended next steps.
>
> **Last updated:** 2026-06-17

---

## 1. Project Overview

**SignafyAI** is a multi-tenant AI growth OS for agencies, consultants, and brands. Stack:

| Layer | Technology |
|-------|------------|
| Frontend | Next.js 15 + TypeScript + Tailwind + shadcn/ui |
| Auth | Clerk (organizations, roles) |
| Database | Supabase (Postgres + RLS) |
| Automation | n8n self-hosted on Hostinger (webhook-driven) |
| Deployment | Vercel |

**Core value:** Users configure brand/goals once; Signafy runs lead discovery, content, social, and SEO automation on their behalf.

**Product vision source:** `Docs/Details for WorkFlow.pdf` (Blue Wolf Solutions — Intent Intelligence & Customer Acquisition Engine)

---

## 2. Strategic Decision: Which Architecture to Follow

### Two parallel systems existed

| System | Location | Purpose | Connected to Signafy UI? |
|--------|----------|---------|--------------------------|
| **Legacy Signafy workflow** | `n8n-workflows/signafy-lead-generation.json` | Apify Google Maps + Yelp → Airtable → callback → `leads` table | **Yes** (via `/webhook/lead-discovery`) |
| **Blue Wolf workflows (new)** | `Docs/BW-WF0` through `BW-WF3` | Router + intent-based prospect/intent/asset engines | **No** (standalone n8n form triggers) |

### Decision

- **Follow the PDF + BW workflows (WF0–WF3)** as the target architecture — behavior/intent-based, not scrape-and-dump.
- **Retire `signafy-lead-generation.json`** as the long-term production path (keep only as short-term fallback).
- **They do not conflict** if BW workflows replace the old engine under the same Signafy webhook/callback contract.

### PDF vision (multi-engine)

```
User request (chat or discovery modal)
    → Router (WF0)
    → WF1 Business Prospect Finder (scored businesses)
    → WF2 Consumer Intent Finder (demand signals)
    → WF3 Funnel Asset Generator (landing pages, emails, scripts)
    → Supabase
    → Signafy UI
```

**Philosophy:** Demand Signal → Intent Analysis → Qualification → Conversion (not Keyword → Lead List).

---

## 3. Blue Wolf n8n Workflows (New)

All JSON files live in `Docs/`:

| File | Name | Trigger | What it does |
|------|------|---------|--------------|
| `BW-WF0-Router-Workflow.json` | Master Router | n8n Form Trigger | AI routes to WF1/WF2/WF3 based on Lead Type |
| `BW-WF1-Enhanced-Prospect-Finder.json` | Business Prospect Finder | n8n Form Trigger | Apify Google Places → AI opportunity scoring → Supabase `businesses` |
| `BW-WF2-Consumer-Intent-Finder.json` | Consumer Intent Finder | n8n Form Trigger | Reddit + Yelp → AI intent classification → Supabase `intent_signals` |
| `BW-WF3-Funnel-Asset-Generator.json` | Funnel Asset Generator | n8n Form Trigger | AI generates full funnel assets → Supabase `generated_assets` |

### WF0 routing logic

- **Business Prospects** → WF1 only
- **Consumer Intent** → WF2 only
- **Both** → WF1 + WF2 + WF3

WF0 triggers children via HTTP POST to form-trigger webhooks (placeholder `YOUR_N8N_BASE_URL` must be replaced).

### WF1 highlights

- Apify actor: `compass/crawler-google-places`
- Filters businesses with websites
- AI scores 0–100: opportunity_score, weaknesses, recommended_offer, pitch_angle, email_subject, email_body
- Filters score >= 60
- Writes to Supabase `businesses` table
- Creates Gmail draft for outreach

### WF2 highlights

- Reddit public search API + Apify Yelp scraper
- AI classifies: intent_score, buying_stage, urgency, question, is_relevant
- Filters relevant + intent_score >= 50
- Writes to Supabase `intent_signals` table

### WF3 highlights

- AI generates: landing page, FAQ, CTA, AI setter script, 3-email sequence, blog outline, social posts, video script, schema suggestion
- Writes to Supabase `generated_assets` table
- Sends Gmail summary

### Known issues in BW workflows

1. **Form triggers only** — not wired to Signafy webhooks
2. **No `org_id`, `run_id`, `callback_url`** in payloads or Supabase inserts
3. **Hardcoded Apify API token** in WF1/WF2 URLs — must move to `$env.APIFY_TOKEN`
4. **WF0 uses placeholder** `YOUR_N8N_BASE_URL`
5. **Supabase credential** placeholder `REPLACE_WITH_YOUR_SUPABASE_CREDENTIAL_ID`
6. **Child form triggers** may not accept arbitrary JSON the same way webhooks do — prefer webhook nodes or Execute Workflow nodes

---

## 4. Signafy App — Current Integration (Legacy Path)

### UI → API flow

| Component | Path |
|-----------|------|
| Leads page | `src/app/(app)/leads/page.tsx` |
| Discovery modal | Same file — `DiscoveryModal` component |
| React hook | `src/hooks/use-leads.ts` → `useDiscoverLeads()` |
| API route | `POST /api/leads` with `{ action: "discover", ... }` |
| API handler | `src/app/api/leads/route.ts` → `handleDiscover()` |
| n8n trigger | `src/lib/n8n.ts` → `triggerLeadDiscovery()` |
| n8n webhook | `POST {N8N_WEBHOOK_BASE_URL}/webhook/lead-discovery` |
| Callback | `POST {NEXT_PUBLIC_APP_URL}/api/webhooks/n8n` |
| Callback handler | `src/app/api/webhooks/n8n/route.ts` |

### Discovery modal fields (Signafy UI)

From the Leads page discovery modal:

| Field | API key | Notes |
|-------|---------|-------|
| Lead type B2B / B2C | `target_market` | `"b2b"` or `"b2c"` |
| B2B sources | `b2b_sources` | `linkedin`, `directories`, `company_websites` |
| B2C sources | `b2c_sources` | `reddit`, `review_platforms`, `directories` |
| Target industry | `industry` | Preset chips (Marketing Agency, Healthcare, etc.) |
| Location | `location` | Free text |
| Platforms to search | `platforms` | `instagram`, `linkedin`, `tiktok`, `twitter`, `facebook`, `google` |
| Keywords | `keywords` | Array, comma-separated input |
| Minimum lead score | `min_score` | Slider 0–100 |
| Save this search | `save_config_name` | Optional — persists to `lead_discovery_configs` |

### Fallback behavior (important)

If `N8N_WEBHOOK_BASE_URL` is not set or n8n is unreachable, the API **falls back to AI-generated fake leads** via `discoverLeads()` in `src/lib/ai.ts`. This makes the feature feel like "vanity" unless n8n is properly configured.

Check API response: `"n8n_triggered": true` means real n8n was called.

### Legacy n8n workflow

`n8n-workflows/signafy-lead-generation.json`:

- Webhook path: `lead-discovery` (POST)
- B2B → Apify Google Maps; B2C → Apify Yelp
- Normalizes leads, writes Airtable, posts signed callback
- **Bug:** Lead IDs like `apify-gmaps-{timestamp}` are NOT UUIDs — Supabase `leads.id` is UUID, so callbacks may fail
- Workflow JSON has `"active": false`

---

## 5. Field Mapping Gap (Signafy UI vs BW Workflows)

| Signafy field | WF0 | WF1/WF2 | Actually used in scraping? |
|---------------|-----|---------|---------------------------|
| `target_market` | Lead Type (partial) | Routes WF1 vs WF2 | Partial |
| `b2b_sources` / `b2c_sources` | Not passed | Not used | **No** |
| `industry` | Industry | Apify search (WF1) | Partial |
| `location` | Location | Apify + Reddit/Yelp | Yes |
| `keywords` | Maps to `service` (partial) | WF2 Reddit query | Weak |
| `platforms` | Not passed | Not used | **No** |
| `min_score` | Not passed | WF1 hardcodes >= 60 | **No** |
| `save_config_name` | N/A | Stored in Signafy only | Yes (Signafy DB) |

### What needs to change

**Both WF0 Router AND child workflows:**

1. **WF0:** Accept full Signafy payload; map `target_market` → routing; forward all fields + `org_id`, `run_id`, `callback_url`
2. **WF1:** Branch on `b2b_sources` + `platforms`; merge `keywords` into Apify query; apply UI `min_score`
3. **WF2:** Branch on `b2c_sources` (Reddit only if selected, Yelp only if review_platforms selected)
4. **WF3:** Trigger from real intent signals from WF2, not generic placeholder

---

## 6. Apify Coverage vs UI Promises

| UI selection | Apify / source | In workflows? |
|--------------|----------------|---------------|
| Google platform | Google Maps / Places | Yes (WF1, legacy workflow) |
| LinkedIn (B2B source/platform) | LinkedIn scraper actor | **No** |
| Company websites | Website contact crawler | **No** |
| Business directories | Google Places (partial) | Partial |
| Reddit (B2C) | Reddit public API | Yes (WF2) |
| Review platforms | Yelp Apify actor | Yes (WF2) |
| Instagram / TikTok / Twitter / Facebook | Platform-specific actors | **No** |

**Action required:** Verify Apify actor IDs, pricing, timeouts, and output fields for each source before demoing platform chips as functional.

Suggested WF1 Apify query fix:

```json
"searchStringsArray": ["{{ industry }} {{ keywords joined }} {{ location }}"]
```

---

## 7. Supabase Setup

### Project

- **URL:** `https://shqsgswoficddajtqhuh.supabase.co`
- **Secret key format:** `sb_secret_...` (new Supabase API key model — replaces legacy JWT `service_role`)
- **Publishable key:** Still needed for client — `NEXT_PUBLIC_SUPABASE_ANON_KEY` (get `sb_publishable_...` from Dashboard → API Keys)

### Connection verified

API key works (REST root returns 200). **`organizations` table did not exist** at time of check — migrations not yet applied.

### Migration files created this session

| File | Purpose |
|------|---------|
| `supabase/migrations/003_blue_wolf_intelligence_tables.sql` | `businesses`, `intent_signals`, `generated_assets` |
| `supabase/migrations/004_blue_wolf_rls_policies.sql` | RLS + Realtime for new tables |
| `supabase/migrations/005_usage_rpc.sql` | `increment_leads_usage`, `increment_content_usage` RPCs |
| `supabase/migrations/006_allow_free_plan.sql` | Allow `free` plan in organizations (onboarding uses it) |
| `supabase/SETUP-RUN-IN-SQL-EDITOR.sql` | **Bundled all migrations** — run this in Supabase SQL Editor |

### New tables (BW workflows)

**`businesses`** (WF1):
- `org_id`, `run_id`, `name`, `industry`, `service`, `location`, `website`, `phone`, `address`, `rating`, `reviews`, `opportunity_score`, `weaknesses`, `recommended_offer`, `pitch_angle`, `email_subject`, `email_body`, `scraped_at`

**`intent_signals`** (WF2):
- `org_id`, `run_id`, `source`, `service`, `industry`, `question`, `location`, `source_url`, `intent_score`, `buying_stage`, `urgency`, `date_found`

**`generated_assets`** (WF3):
- `org_id`, `run_id`, `signal_id`, `intent_signal`, `service`, `location`, `industry`, `landing_page`, `faq`, `cta`, `ai_script`, `email_sequence`, `blog_outline`, `social_posts`, `video_script`, `schema_suggestion`

### Existing tables (Signafy core)

- `organizations`, `users`, `org_members`, `leads`, `lead_activities`, `lead_discovery_configs`, `workflow_runs`, etc. — see `supabase/migrations/001_initial_schema.sql`

### Saved search settings (already supported)

`lead_discovery_configs.filters` (JSONB) stores all modal fields when user saves a search:

```json
{
  "target_market": "b2b",
  "b2b_sources": ["linkedin", "directories"],
  "industry": "Healthcare",
  "location": "Murrieta, CA",
  "platforms": ["linkedin", "google"],
  "keywords": ["CoolSculpting"],
  "min_score": 40
}
```

`workflow_runs.input_params` stores the same per run.

### Migration application status

- **Not applied automatically** — npm `pg` install failed (TLS cert error on machine); no `psql` available
- **Manual step:** Run `supabase/SETUP-RUN-IN-SQL-EDITOR.sql` in Supabase Dashboard → SQL Editor
- **Optional automation:** `scripts/apply-supabase-migrations.mjs` + `npm run db:migrate` (requires `SUPABASE_DB_PASSWORD` in `.env.local`)

---

## 8. Environment Configuration

### Files

| File | Status |
|------|--------|
| `.env.example` | Template (updated for new Supabase key format) |
| `.env.local` | **Created** with Supabase URL + secret key; gitignored |

### Required env vars for lead discovery

```env
NEXT_PUBLIC_APP_URL=http://localhost:3000          # or Vercel URL
NEXT_PUBLIC_SUPABASE_URL=https://shqsgswoficddajtqhuh.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=sb_publishable_...   # STILL NEEDED from dashboard
SUPABASE_SERVICE_ROLE_KEY=sb_secret_...            # server-side only

N8N_WEBHOOK_BASE_URL=https://n8n.yourdomain.com
N8N_API_KEY=...
N8N_HMAC_SECRET=...                                # same on Signafy + n8n
```

### Security note

Supabase secret key was shared in chat during setup — **rotate it** in Dashboard → API Keys when possible.

---

## 9. Target End-to-End Architecture

```
Signafy Leads UI (discovery modal — all fields)
    ↓
POST /api/leads { action: "discover", ... }
    ↓
Creates workflow_runs row (pending)
    ↓
POST /webhook/bw-router (WF0) — replace legacy lead-discovery
    ↓
WF0 AI Router → WF1 / WF2 / WF3 (based on target_market + sources)
    ↓
Apify + AI scoring/classification/generation
    ↓
POST /api/webhooks/n8n (signed callback)
    ↓
Supabase: businesses | intent_signals | generated_assets | leads
    ↓
Signafy UI: 3 result panels + realtime updates
```

### Callback contract (Signafy expects)

```json
{
  "run_id": "uuid",
  "workflow_type": "lead_discovery | prospect_discovery | intent_discovery | asset_generation",
  "status": "complete | failed",
  "org_id": "uuid",
  "leads": [...],
  "error_message": "..."
}
```

Header: `X-Signature: HMAC-SHA256(raw_json, N8N_HMAC_SECRET)`

See also: `N8N-LEAD-DISCOVERY-HANDOFF.md` (legacy contract doc)

---

## 10. UI Gaps (Why It Feels "Vanity" Today)

| Problem | Fix |
|---------|-----|
| n8n not configured → AI fake leads | Set env vars; gate/remove fallback in production |
| Progress banner never clears | Poll `workflow_runs` until complete/failed |
| No live lead updates | Supabase Realtime on `leads`, `businesses`, `intent_signals` |
| Rich data hidden | Show `opportunity_score`, `weaknesses`, `pitch_angle` in lead drawer |
| Platform/source chips don't do anything | Wire n8n branches OR disable chips until wired |
| `app-store.ts` has realtime state | Leads page doesn't use it yet |

---

## 11. Recommended Phased Rollout

### Phase A — Working demo (priority)

1. Run `SETUP-RUN-IN-SQL-EDITOR.sql` in Supabase
2. Add `NEXT_PUBLIC_SUPABASE_ANON_KEY` (publishable) to `.env.local`
3. Configure n8n env: `N8N_HMAC_SECRET`, `APIFY_TOKEN`, Supabase credentials
4. Convert WF0 to webhook trigger; point Signafy `triggerLeadDiscovery` at `/webhook/bw-router`
5. Fix UUID generation in lead/business IDs
6. Deploy Signafy to public URL (n8n callbacks can't reach localhost)

### Phase B — Match modal to engines

1. WF0 forwards all Signafy fields to children
2. WF1/WF2 source + platform branching
3. Apply `min_score` from UI in n8n filter nodes
4. Callback handler extended for `businesses`, `intent_signals`, `generated_assets`

### Phase C — Full PDF vision

1. Chat input + router (natural language queries)
2. Intent signals UI tab
3. Generated assets UI (link to content module)
4. Additional Apify actors for LinkedIn, social platforms

### Demo scenario (from PDF)

- Industry: MedSpa
- Location: Murrieta, CA
- Service/Keywords: CoolSculpting
- Lead type: Both
- Expected: businesses + intent signals + funnel assets

---

## 12. Key File Map

```
SignafyAI/
├── Docs/
│   ├── Details for WorkFlow.pdf          # Product blueprint (Blue Wolf vision)
│   ├── BW-WF0-Router-Workflow.json       # Master router
│   ├── BW-WF1-Enhanced-Prospect-Finder.json
│   ├── BW-WF2-Consumer-Intent-Finder.json
│   ├── BW-WF3-Funnel-Asset-Generator.json
│   └── SIGNAFY-SESSION-HANDOFF.md        # This file
├── N8N-LEAD-DISCOVERY-HANDOFF.md          # Legacy webhook/callback contract
├── n8n-workflows/
│   └── signafy-lead-generation.json        # Legacy (to retire)
├── supabase/
│   ├── migrations/001_initial_schema.sql
│   ├── migrations/002_rls_policies.sql
│   ├── migrations/003_blue_wolf_intelligence_tables.sql
│   ├── migrations/004_blue_wolf_rls_policies.sql
│   ├── migrations/005_usage_rpc.sql
│   ├── migrations/006_allow_free_plan.sql
│   └── SETUP-RUN-IN-SQL-EDITOR.sql         # Run this in Supabase dashboard
├── scripts/
│   └── apply-supabase-migrations.mjs       # Optional CLI migration runner
├── .env.local                              # Created (gitignored) — needs publishable key
├── .env.example                            # Updated template
├── src/
│   ├── app/(app)/leads/page.tsx            # Discovery modal + leads table
│   ├── app/api/leads/route.ts              # Discovery trigger + config save
│   ├── app/api/webhooks/n8n/route.ts       # Callback handler
│   ├── lib/n8n.ts                          # Webhook trigger + HMAC signing
│   ├── hooks/use-leads.ts                  # useDiscoverLeads mutation
│   └── stores/app-store.ts                 # Realtime state (not wired to UI yet)
└── .planning/PROJECT.md                    # High-level project requirements
```

---

## 13. Open Questions / Decisions Pending

1. **Replace or extend Leads page?** Show 3 tabs (Prospects / Intent / Assets) vs single leads table
2. **Mirror `businesses` → `leads`?** For backward compatibility with existing leads UI
3. **Which platform chips to enable for v1 demo?** Recommend: Google + directories only initially
4. **Router: Signafy API calls WF0 directly, or WF0 stays internal to n8n?** Recommend Signafy → WF0 webhook
5. **Rotate exposed Supabase secret key**
6. **Fix machine TLS issues** for npm install (blocks automated migrations)

---

## 14. Quick Checklist Before Showcase

- [ ] Supabase migrations applied (`SETUP-RUN-IN-SQL-EDITOR.sql`)
- [ ] `NEXT_PUBLIC_SUPABASE_ANON_KEY` set in `.env.local`
- [ ] `N8N_WEBHOOK_BASE_URL` + `N8N_HMAC_SECRET` configured
- [ ] BW workflows imported, activated, Apify token in env (not hardcoded)
- [ ] WF0 `YOUR_N8N_BASE_URL` replaced
- [ ] Signafy API points to WF0 router webhook
- [ ] Lead/business IDs are UUIDs in callbacks
- [ ] App deployed publicly (not localhost)
- [ ] Test run returns `"n8n_triggered": true`
- [ ] Results visible in Supabase tables + Signafy UI

---

*Generated from Cursor session covering SignafyAI lead generation architecture, n8n BW workflow integration, Supabase schema, and UI/backend gap analysis.*
