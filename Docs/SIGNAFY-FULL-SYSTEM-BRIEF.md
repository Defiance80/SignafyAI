# SignafyAI — Full System Brief
**Last Updated:** June 2026
**Author:** Defiance80 + Claude (Anthropic)
**Status:** In Development — Core pipeline built, deployment blockers being resolved

---

## Table of Contents
1. [What Is SignafyAI?](#1-what-is-signafyai)
2. [The Problem Being Solved](#2-the-problem-being-solved)
3. [Intended Goals](#3-intended-goals)
4. [Tech Stack](#4-tech-stack)
5. [System Architecture](#5-system-architecture)
6. [The n8n Blue Wolf Engine](#6-the-n8n-blue-wolf-engine)
   - [WF0 — Router](#wf0--blue-wolf-router)
   - [WF1 — B2B Prospect Finder](#wf1--enhanced-prospect-finder-b2b)
   - [WF2 — B2C Intent Finder](#wf2--consumer-intent-finder-b2c)
   - [WF3 — Asset Generator](#wf3--funnel-asset-generator)
7. [How AI Interprets Signals](#7-how-ai-interprets-signals)
8. [Database Schema](#8-database-schema)
9. [Security Layer](#9-security-layer)
10. [What Has Been Accomplished](#10-what-has-been-accomplished)
11. [Speed Bumps Hit](#11-speed-bumps-hit)
12. [What Still Needs to Be Rectified](#12-what-still-needs-to-be-rectified)
13. [What "Fully Working" Looks Like](#13-what-fully-working-looks-like)
14. [File Reference Map](#14-file-reference-map)

---

## 1. What Is SignafyAI?

SignafyAI is a **Growth OS** — a SaaS platform built for marketing agencies, consultants, and service businesses that want to replace manual prospecting with an AI-driven pipeline.

**Live URL:** `https://signafy-ai.vercel.app`

The core promise: a user types a plain-English description of who they want to target, and the system automatically:
- Finds real businesses and real consumers actively looking to buy
- Scores each one on a 0–100 opportunity scale
- Generates pitch angles, cold email drafts, and landing pages
- Delivers everything into a clean dashboard in real time

It is not just a contact list tool. It reads **live signals** from the internet — Google Maps, Reddit, Yelp, Twitter, YouTube — to surface prospects who have a demonstrated need right now, not just businesses that exist in a static database.

---

## 2. The Problem Being Solved

Traditional lead generation has two failure modes:

**Problem A — B2B:** Agencies and consultants waste hours manually searching Google Maps, LinkedIn, and directories to find businesses they could pitch. Even when they find prospects, they have no context for why that business needs help or what to say. Cold outreach is generic and conversion rates are low.

**Problem B — B2C:** Service businesses (HVAC, MedSpa, Roofing, etc.) have no way to find consumers who are actively looking for their service RIGHT NOW. They spend money on ads hoping to intercept buyers, when those buyers are already self-identifying on Reddit, Yelp reviews, and Twitter.

**What SignafyAI Does Differently:**
- Reads weakness signals on existing businesses (B2B targeting)
- Reads buying intent signals from real consumer posts (B2C targeting)
- Uses AI to score, analyze, and generate personalized outreach for every result
- Does all of this automatically after a single plain-English description

---

## 3. Intended Goals

### Short-Term (MVP)
- [ ] User types a target description → system finds leads automatically
- [ ] B2B mode: returns scored businesses with pitch angles and email drafts
- [ ] B2C mode: returns consumer intent signals with urgency/buying stage classification
- [ ] Results appear in real time as Apify scrapes (progressive loading)
- [ ] Full Stack mode: runs B2B + B2C simultaneously and generates funnel assets for top signals

### Medium-Term
- [ ] Save and schedule recurring discovery runs (weekly auto-prospecting)
- [ ] CRM pipeline: move leads through New → Contacted → Qualified → Converted
- [ ] Campaign builder: turn scored businesses into outreach campaigns
- [ ] Social Inbox: monitor and reply to incoming DMs and comments
- [ ] Content engine: generate platform-specific posts from brand voice

### Long-Term
- [ ] White-label for agencies (find leads FOR clients)
- [ ] Stripe billing with tiered plans (Free / Starter / Pro / Agency)
- [ ] Apify-powered backlink intelligence
- [ ] SEO competitor gap analysis
- [ ] API access for programmatic integrations

---

## 4. Tech Stack

| Layer | Technology | Notes |
|---|---|---|
| **Frontend** | Next.js 15 + TypeScript | App Router, Server Components |
| **Styling** | Tailwind CSS + shadcn/ui | Custom dark theme, Plus Jakarta Sans + Syne fonts |
| **Auth** | Clerk | JWT-based, org/workspace model |
| **Database** | Supabase (PostgreSQL) | RLS enabled, Realtime subscriptions |
| **Automation** | n8n (self-hosted) | Hostinger VPS, Docker + Traefik |
| **Scraping** | Apify | Google Maps, Yelp, Twitter, YouTube actors |
| **AI** | OpenAI GPT-4.1-mini | Signal interpretation, scoring, pitch generation |
| **Hosting** | Vercel (Hobby) | Serverless, auto-deploys from GitHub main |
| **VPS** | Hostinger — `31.220.54.118` | n8n at `https://n8n.srv1104500.hstgr.cloud` |
| **Email** | Resend (planned) | Transactional notifications |
| **Billing** | Stripe (planned) | Subscription management |

---

## 5. System Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    SignafyAI (Vercel)                        │
│                                                             │
│  User types: "Marketing agencies in Austin TX that need     │
│  help with lead generation and run Facebook ads"            │
│                          │                                  │
│          POST /api/leads  │                                  │
│          (action: discover)                                  │
│                          │                                  │
│  ┌──────────────────────────────────────────────────┐       │
│  │  Creates workflow_run record in Supabase         │       │
│  │  Signs payload with HMAC-SHA256                  │       │
│  │  POSTs to n8n /webhook/bw-router                 │       │
│  └──────────────────────────────────────────────────┘       │
└─────────────────────────────────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────────┐
│              n8n VPS (Hostinger)                             │
│                                                             │
│  WF0 — Blue Wolf Router                                     │
│    Receives payload, routes to WF1 / WF2 / both             │
│         │                        │                          │
│         ▼                        ▼                          │
│  WF1 — B2B Prospect        WF2 — B2C Intent                 │
│        Finder                   Finder                      │
│         │                        │                          │
│  Apify Google Maps         Apify Reddit/Yelp/               │
│  scraper                   Twitter/YouTube                  │
│         │                        │                          │
│  GPT-4.1-mini              GPT-4.1-mini                     │
│  scores + pitches          classifies intent                │
│         │                        │                          │
│         └──────────┬─────────────┘                          │
│                    ▼                                        │
│  Writes directly to Supabase (businesses / intent_signals)  │
│                    │                                        │
│  POSTs callback to /api/webhooks/n8n (HMAC signed)         │
└─────────────────────────────────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────────┐
│                  Supabase (Database)                         │
│                                                             │
│  Realtime broadcasts new rows to subscribed browser clients │
│                          │                                  │
│                          ▼                                  │
│        SignafyAI Leads page updates live                    │
│        Prospects tab / Intent Signals tab populate          │
└─────────────────────────────────────────────────────────────┘
```

---

## 6. The n8n Blue Wolf Engine

The automation engine is called **"Blue Wolf"** — named for its role as a hunter that finds and qualifies targets. It runs on a self-hosted n8n instance on a Hostinger VPS.

All workflow JSON files are stored in the `Docs/` folder of the repository and are imported into n8n via the UI.

---

### WF0 — Blue Wolf Router

**File:** `Docs/BW-WF0-Router-Workflow.json`
**Webhook path:** `/webhook/bw-router`
**Triggered by:** SignafyAI POST to n8n

**Purpose:** Acts as the traffic controller. Receives the full discovery payload from SignafyAI, stores all parameters, then fires WF1 and/or WF2 depending on the `target_market` value.

**Input it receives:**
```json
{
  "run_id": "uuid — tracks this discovery session",
  "org_id": "uuid — which SignafyAI workspace",
  "callback_url": "https://signafy-ai.vercel.app/api/webhooks/n8n",
  "target_market": "b2b | b2c | both",
  "target_description": "plain English description of target",
  "location": "city, state",
  "industry": "optional vertical hint",
  "min_score": 40,
  "count": 50,
  "user_email": "for email delivery of results",
  "generate_landing_page": false,
  "for_client": false
}
```

**Routing logic:**
- `target_market = "b2b"` → triggers WF1 only
- `target_market = "b2c"` → triggers WF2 only
- `target_market = "both"` → triggers WF1 AND WF2 in parallel

---

### WF1 — Enhanced Prospect Finder (B2B)

**File:** `Docs/BW-WF1-Enhanced-Prospect-Finder.json`
**Webhook path:** `/webhook/bw-wf1`
**Apify actor:** `compass~crawler-google-places`
**AI model:** GPT-4.1-mini via n8n `informationExtractor` node

**Purpose:** Find real businesses that have weaknesses a service provider could fix. Score them, generate personalized outreach.

#### Step-by-Step Flow

**Step 1 — Store Inputs**
Captures run_id, org_id, target_description, location, b2b_vertical, min_score, callback_url into workflow memory.

**Step 2 — AI Parse Target Description** *(added this session)*
GPT-4.1-mini reads the plain-English target description and extracts:
- `search_terms`: what to search on Google Maps (multiple variations)
- `search_location`: the city/region to search in

> **Why this was added:** The old system used a static keyword lookup table. If a user typed something creative or industry-specific, it wouldn't match any table entry and would fall back to generic terms. The AI reads *meaning*, not keywords — it understands "agencies that help local businesses get more customers online" even if no keyword in that phrase appears in the lookup table.

Example transformation:
- **Input:** `"Marketing agencies in Austin TX that run Facebook ads and need help with lead generation"`
- **Output:** `search_terms = "marketing agency Austin, digital marketing Austin TX, social media agency Austin, Facebook ads agency Austin"`, `search_location = "Austin, TX"`

**Step 3 — Build Apify Queries**
Converts AI-extracted terms into Apify input format. Falls back to vertical keyword map if AI extraction fails.

**Step 4 — Apify Google Maps Scraper**
Runs `compass~crawler-google-places` against each search query. Returns raw business data:
- Name, address, phone, website URL
- Google Maps rating and review count
- Business category, hours, photos count

**Step 5 — Signafy Score Engine** (Code node)
Scores each business 0–100 based on weakness signals:
- No website listed → −20 points
- Rating below 3.5 → −15 points
- Fewer than 20 reviews → −10 points
- No phone number → −5 points
- Base score 60 + bonuses for strong match
- Drops any business below `min_score`

**Step 6 — AI Intelligence** (GPT-4.1-mini)
For each business passing the score filter, generates:
- `weaknesses`: specific digital gaps identified (e.g., "No online booking, last Google post 4 months ago, website has no contact form")
- `recommended_offer`: what service to pitch (e.g., "Done-for-you social media + Google My Business management")
- `pitch_angle`: single-sentence hook (e.g., "You have 87 reviews and a 4.2 rating — patients trust you, but you're losing them after hours because there's no online booking")
- `email_subject`: personalized subject line
- `email_body`: complete cold email draft

**Step 7 — Supabase Upsert**
Saves each business to `businesses` table. Uses `matchingColumns: ["org_id", "name"]` — upserts so the same business is never duplicated per org across multiple runs.

**Step 8 — Build HMAC Callback**
Code node computes HMAC-SHA256 signature of the callback payload using `$env.N8N_HMAC_SECRET`.

**Step 9 — Callback to SignafyAI**
HTTP POST to `/api/webhooks/n8n` with signature header:
```json
{
  "run_id": "...",
  "workflow_type": "prospect_discovery",
  "status": "complete",
  "org_id": "...",
  "output": { "businesses_found": 14 }
}
```

#### What Weakness Signals WF1 Reads

| Signal | What It Means | Score Impact |
|---|---|---|
| No website on Google Maps | Zero digital presence | −20 |
| Rating < 3.5 | Active customer problems | −15 |
| Reviews < 20 | Low visibility / new / ignored | −10 |
| No phone number | Can't be contacted easily | −5 |
| Photos < 3 | Weak visual presentation | −5 |
| Hours = weekdays only | Missing weekend customers | −5 |
| No Google Posts in 90+ days | Inactive, opportunity for content | noted in weaknesses |

---

### WF2 — Consumer Intent Finder (B2C)

**File:** `Docs/BW-WF2-Consumer-Intent-Finder.json`
**Webhook path:** `/webhook/bw-wf2`
**Apify actors:** `apify~yelp-scraper`, `quacker~twitter-scraper`, `streamers~youtube-scraper` + Reddit via HTTP API

**Purpose:** Find real consumers who are actively posting about needing a service. Classify their buying stage and urgency. Surface them as actionable leads for service businesses.

#### Step-by-Step Flow

**Step 1 — Store Inputs**
Captures run_id, org_id, target_description, b2c_sources, client_service, location, generate_landing_page, callback_url.

**Step 2 — AI Parse Target Description** *(added this session)*
GPT-4.1-mini reads the target description and extracts consumer-facing search terms — **what a buyer would type**, not what a business type is called.

Example transformation:
- **Input:** `"People looking for CoolSculpting in Southern California"`
- **Output:** `search_terms = "coolsculpting near me, body contouring Murrieta, how much does coolsculpting cost, best medspa Southern California, coolsculpting before and after"`, `search_location = "Southern California"`

> **Why this matters:** B2C signal detection only works if you search with buyer language. A business operator searches "medspa". A consumer searches "how much does coolsculpting cost" or "best place for botox in Temecula". GPT interprets the intent and generates buyer-language queries.

**Step 3 — Four Parallel Scrapers** (gated by `b2c_sources` array)

| Source | What It Scrapes | Best For |
|---|---|---|
| **Reddit** | Posts in relevant subreddits asking for recommendations, complaining about providers, or expressing intent | High-intent research-stage buyers |
| **Yelp** | Recent reviews mentioning "looking for", "need", "anyone recommend" | Actively comparison-shopping |
| **Twitter/X** | Tweets with buying language + location tags | High urgency, immediate need |
| **YouTube** | Comment sections on service-related videos | Research stage, early funnel |

**Step 4 — Merge + Extract Signals** (Code node)
Normalizes all sources into a unified `IntentSignal` format. Assigns:
- `intent_score`: 0–100 strength of buying intent
- `buying_stage`: Research / Comparison / Vendor Selection / Ready To Buy
- `urgency`: High / Medium / Low
- `question`: the actual post text
- `source_url`: link back to original post

**Step 5 — Filter**
Drops signals below `min_score` (default 40).

**Step 6 — Supabase Insert**
Saves to `intent_signals` table.

**Step 7 — Build HMAC Callback + Callback to SignafyAI**
Same pattern as WF1. Posts `workflow_type: "intent_discovery"`.

**Step 8 — Gate — Generate Assets?**
If `generate_landing_page: true`, fires WF3 with the top 3 signals.

#### What Intent Signals WF2 Reads

| Post Type | Buying Stage | Urgency |
|---|---|---|
| "Anyone know a good [service] in [city]?" | Comparison | Medium |
| "Need [service] ASAP, anyone available?" | Ready To Buy | High |
| "What should I look for when choosing a [service]?" | Research | Low |
| "Is [specific provider] worth it or should I try [other]?" | Vendor Selection | Medium |
| "Finally booked my [service] appointment!" | — | (competitor client, great to target) |
| "So frustrated, my [service] provider keeps cancelling" | Ready To Buy | High |
| "Anyone have experience with [service] costs?" | Research | Low |

---

### WF3 — Funnel Asset Generator

**File:** `Docs/BW-WF3-Asset-Generator.json` *(in Docs folder)*
**Webhook path:** `/webhook/bw-wf3`
**Triggered by:** WF2 when `generate_landing_page: true`

**Purpose:** Takes the top intent signals from WF2 and generates a complete funnel asset bundle for each one — everything a service business needs to capture that buyer.

**Assets generated per signal:**
- Landing page headline + subheadline
- FAQ section (3–5 questions buyers ask)
- CTA copy
- AI phone script (for follow-up calls)
- 3-email drip sequence
- Blog post outline targeting the signal keyword
- 3 social media posts (Instagram/Facebook ready)
- YouTube video script outline
- Schema markup suggestion for SEO

Saves to `generated_assets` table. Displays in the Funnel Assets tab in the UI.

---

## 7. How AI Interprets Signals

The most important design decision in SignafyAI is using **GPT-4.1-mini as an interpreter** rather than a lookup table.

### Old Approach (Pre-AI)
```
User types: "marketing agencies in Austin"
System checks: keyword_table["marketing agencies"] → ["marketing agency", "digital agency"]
Runs: Google Maps search for those exact terms
Result: rigid, misses context, fails on creative descriptions
```

### New Approach (AI-First)
```
User types: "small businesses in Phoenix that sell home services 
            and probably don't have a solid online presence yet"
AI extracts:
  search_terms: "HVAC company Phoenix, plumber Phoenix AZ, 
                 electrician Phoenix, handyman Phoenix, 
                 home repair Phoenix"
  search_location: "Phoenix, AZ"
Result: flexible, understands intent, works on any description
```

### The n8n informationExtractor Pattern

WF1 and WF2 use n8n's `@n8n/n8n-nodes-langchain.informationExtractor` node connected to a GPT-4.1-mini sub-node. This takes:
- **Input text:** the `target_description` from the user
- **Attribute list:** structured fields to extract (search_terms, search_location)
- **Output:** structured JSON that downstream nodes can use directly

This pattern is used in both WF1 (extracts business search terms) and WF2 (extracts consumer search terms) with different system prompts tuned for each use case.

---

## 8. Database Schema

### `businesses` — WF1 Output

```sql
CREATE TABLE businesses (
  id                UUID PRIMARY KEY,
  org_id            UUID REFERENCES organizations(id),
  run_id            UUID REFERENCES workflow_runs(id),
  name              TEXT NOT NULL,                    -- unique per org
  industry          TEXT,
  service           TEXT,                             -- what they provide
  location          TEXT,
  website           TEXT,
  email             TEXT,
  phone             TEXT,
  address           TEXT,
  category          TEXT,                             -- Google Maps category
  rating            NUMERIC(3,1),
  reviews           INT,
  opportunity_score INT CHECK (0–100),               -- AI weakness score
  weaknesses        TEXT,                             -- AI analysis
  recommended_offer TEXT,                             -- what to pitch
  pitch_angle       TEXT,                             -- one-line hook
  email_subject     TEXT,
  email_body        TEXT,
  scraped_at        TIMESTAMPTZ,
  created_at        TIMESTAMPTZ,
  updated_at        TIMESTAMPTZ
);

-- Unique constraints (prevent duplicates across runs)
CREATE UNIQUE INDEX ON businesses(org_id, name) WHERE org_id IS NOT NULL;
CREATE UNIQUE INDEX ON businesses(org_id, website) WHERE website IS NOT NULL;
```

### `intent_signals` — WF2 Output

```sql
CREATE TABLE intent_signals (
  id           UUID PRIMARY KEY,
  org_id       UUID REFERENCES organizations(id),
  run_id       UUID REFERENCES workflow_runs(id),
  source       TEXT NOT NULL,           -- reddit/yelp/twitter/youtube
  service      TEXT,
  industry     TEXT,
  question     TEXT NOT NULL,           -- the actual post text
  location     TEXT,
  source_url   TEXT,
  intent_score INT CHECK (0–100),
  buying_stage TEXT CHECK (IN ('Research','Comparison','Vendor Selection','Ready To Buy')),
  urgency      TEXT CHECK (IN ('High','Medium','Low')),
  date_found   TIMESTAMPTZ,
  created_at   TIMESTAMPTZ
);
```

### `generated_assets` — WF3 Output

```sql
CREATE TABLE generated_assets (
  id                        UUID PRIMARY KEY,
  org_id                    UUID REFERENCES organizations(id),
  run_id                    UUID REFERENCES workflow_runs(id),
  signal_id                 UUID REFERENCES intent_signals(id),
  service                   TEXT,
  location                  TEXT,
  landing_page              TEXT,
  landing_page_subheadline  TEXT,
  faq                       TEXT,
  cta                       TEXT,
  ai_script                 TEXT,
  email_sequence            TEXT,
  blog_outline              TEXT,
  social_posts              TEXT,
  video_script              TEXT,
  schema_suggestion         TEXT,
  created_at                TIMESTAMPTZ
);
```

### `workflow_runs` — Job Tracker

```sql
CREATE TABLE workflow_runs (
  id            UUID PRIMARY KEY,
  org_id        UUID REFERENCES organizations(id),
  workflow_type TEXT CHECK (IN (
    'lead_discovery','prospect_discovery','intent_discovery',
    'asset_generation','content_generation','seo_research','social_classification'
  )),
  status        TEXT CHECK (IN ('pending','running','complete','failed')),
  input_params  JSONB,
  output_summary JSONB,
  started_at    TIMESTAMPTZ,
  completed_at  TIMESTAMPTZ,
  error_message TEXT
);
```

---

## 9. Security Layer

### HMAC-SHA256 Request Signing

Every request between SignafyAI and n8n is signed to prevent spoofing.

**Outbound (Signafy → n8n):**
```typescript
// src/lib/n8n.ts
const signature = crypto
  .createHmac('sha256', N8N_HMAC_SECRET)
  .update(JSON.stringify(payload))
  .digest('hex');
// Sent as X-Signature header
```

**Inbound callback (n8n → Signafy):**
```javascript
// Inside WF1/WF2 "Build HMAC Callback" Code node
const secret = $env.N8N_HMAC_SECRET;
const signature = crypto
  .createHmac('sha256', secret)
  .update(payload)
  .digest('hex');
// Sent as X-Signature header with callback POST
```

**Verified at:** `POST /api/webhooks/n8n` — rejects any request with invalid or missing signature with HTTP 401.

**Shared secret:**
- Vercel env var: `N8N_HMAC_SECRET`
- n8n VPS env var: `N8N_HMAC_SECRET`
- Value: `be600a5bda38c209bd4d9a9150728bb207ba544a338438e8ed01c4ad9dbf440b`

### Supabase RLS (Row Level Security)

All tables have RLS enabled. Every row is scoped to `org_id`. Users can only read and write data belonging to their own organization. The service role key (used only on the server) bypasses RLS for admin operations.

### Key Security Rule
`SUPABASE_SERVICE_ROLE_KEY` is server-side only — it must never appear in browser-side code or be sent to the client. It gives full database access bypassing all RLS policies.

---

## 10. What Has Been Accomplished

### ✅ Foundation
- Full Next.js 15 app deployed to Vercel with App Router
- Clerk authentication integrated (sign in, sign up, onboarding)
- Two-step onboarding: role selection (agency / solo / startup) → workspace creation
- Supabase database schema designed and migration files written
- Row Level Security policies written for all tables
- Service role vs. anon key separation enforced throughout

### ✅ UI — Full Dark Dashboard
- **Sidebar:** Grouped navigation (Overview, Growth, Content), workspace selector with plan badge, user row with sign out
- **Topbar:** Browser-style back/forward navigation, breadcrumb, notification dropdown, user avatar
- **Dashboard page:** Stat cards with sparkline mini-charts and radial glows, workflow runs table with live status indicators, quick action cards
- **Leads page:** Full multi-tab interface (Leads / Prospects / Intent Signals / Funnel Assets)
- **B2B Discovery:** Blue Wolf Discovery modal with Agency Mode toggle, Full Stack mode, min-score slider, save-search option
- **Business Prospect drawer:** Full intelligence readout — score, weaknesses, recommended offer, pitch angle, draft outreach email with copy button
- **Intent Signal view:** Buying stage, urgency badge, intent score, link to original post
- **Funnel Assets view:** Asset bundle display per signal
- Additional pages: Analytics, Campaigns, Social Inbox (stubs with proper layouts), SEO Lab, Backlinks tool (functional)

### ✅ n8n Automation Engine
- **WF0 (Router):** Routes to WF1/WF2/both based on target_market
- **WF1 (B2B):** Full pipeline — AI query building → Apify Google Maps → score engine → AI intelligence → Supabase upsert → HMAC callback
- **WF2 (B2C):** Full pipeline — AI query building → 4 parallel scrapers → signal extraction → intent scoring → Supabase insert → HMAC callback → optional WF3 trigger
- **HMAC signing:** Both outbound (Signafy→n8n) and inbound (n8n→Signafy) requests are signed and verified
- All workflow JSONs stored in `Docs/` and version-controlled in GitHub

### ✅ API Layer
- `POST /api/leads` — triggers discovery, creates workflow_run, fires n8n, falls back to AI if n8n unavailable
- `GET /api/businesses` — returns prospect businesses with pagination, search, sort
- `GET /api/intent-signals` — returns consumer signals with stage/urgency filtering
- `GET /api/generated-assets` — returns funnel asset bundles
- `POST /api/webhooks/n8n` — receives n8n callbacks, verifies HMAC, updates workflow_run status, handles all workflow types
- `GET /api/me` — returns user/org context for UI components
- All routes implement demo mode fallback when Supabase not configured

### ✅ Real-Time Updates
- Supabase Realtime subscriptions on `businesses`, `intent_signals`, `generated_assets`, `leads` tables
- UI auto-refreshes when n8n writes new rows directly to Supabase
- 8-second polling fallback while run banner is active

### ✅ Code Quality & Security
- `.gitignore` updated to exclude `*.token`, `*.secret`, token files from `Docs/`
- Old Apify token identified as burned (in git history), replaced with new token
- HMAC secret standardized across both sides
- Service role key confirmed server-only
- New Apify token stored in git-ignored `Docs/Signafy-prod-token.txt`

---

## 11. Speed Bumps Hit

### 🔴 Bump 1 — Demo Data Always Showing
**What happened:** No matter what city or description was typed, the same two businesses always appeared: "Glow Medspa & Aesthetics" and "SculptBody Studio."

**Root cause:** `src/app/api/businesses/route.ts` has a demo fallback:
```typescript
const db = getSupabaseServiceClient();
if (!db) {
  return jsonResponse({ data: DEMO_BUSINESSES, ... }); // always these 2 MedSpas
}
```
`getSupabaseServiceClient()` returns `null` when `SUPABASE_SERVICE_ROLE_KEY` is not set. Since Vercel never had the env var, demo data always fired.

**Status:** Code is correct. Fix requires setting env vars in Vercel.

---

### 🔴 Bump 2 — n8n Never Gets Called
**What happened:** Discovery runs appeared to complete instantly (the spinner came and went) but no real results appeared.

**Root cause:** `src/lib/n8n.ts` checks `N8N_WEBHOOK_BASE_URL` before firing:
```typescript
if (!N8N_BASE) {
  console.warn("[n8n] N8N_WEBHOOK_BASE_URL not set — skipping");
  return { ok: false }; // silent failure
}
```
Without `N8N_WEBHOOK_BASE_URL` in Vercel, every discovery run silently no-ops. The n8n server confirmed **zero Blue Wolf executions** when the SQLite database was inspected via SSH.

**Status:** Fix requires adding env vars to Vercel.

---

### 🔴 Bump 3 — Infinite Spinner (UX Bug)
**What happened:** When discovery was launched, the "Intelligence engine running" banner with spinner appeared and ran for 3 minutes (the auto-dismiss timer) even though nothing was actually running.

**Root cause:** The UI set `activeRunId` regardless of whether n8n was actually triggered. The banner had a hardcoded 3-minute timeout with no awareness of whether the run was real.

**Fix applied:** `handleLaunched` now checks `n8n_triggered` from the API response. If false, shows a 12-second amber warning instead of the 3-minute spinning banner. Already pushed to GitHub.

---

### 🟡 Bump 4 — Wrong DB Unique Constraint for Upsert
**What happened:** WF1's Supabase node was configured to upsert using `matchingColumns: ["org_id", "name"]` but the database only had a unique index on `(org_id, website)`. Postgres would throw "there is no unique or exclusion constraint matching the ON CONFLICT specification."

**Why it happened:** The original WF1 used `(org_id, website)` for upserts. This was changed to `(org_id, name)` because ~30% of businesses have no website on Google Maps — null website would cause the upsert to fail or create duplicates.

**Fix applied:** Migration `008_businesses_name_unique.sql` creates the missing index. The webhook callback handler was also updated to use `onConflict: "org_id,name"`. Already pushed to GitHub.

---

### 🟡 Bump 5 — Old Apify Token Burned
**What happened:** The original Apify API token was committed to git history in an early push. GitHub secret scanning flagged it. Anyone with repo access could use the token.

**Fix applied:**
- New token obtained from Apify Dashboard
- Token stored in git-ignored `Docs/Signafy-prod-token.txt`
- `.gitignore` updated to block `*.token`, `*.secret`, `*token*`, `*secret*` from `Docs/`
- Old token needs to be invalidated in Apify Dashboard

---

### 🟡 Bump 6 — Vercel Env Vars Page Not Where Expected
**What happened:** The Vercel Settings sidebar shows "Environments" as a menu item. Clicking it shows a page about creating custom deployment environments (a Pro feature). The actual Environment Variables input is in a different location.

**Fix:** Environment Variables on Vercel are found at:
`https://vercel.com/{team}/{project}/settings/environment-variables`

Or under **Settings → General → scroll down** to find the Environment Variables section.

---

### 🟡 Bump 7 — SSH SQLite Query Failures
**What happened:** Multiple attempts to query n8n's execution history via SSH failed due to:
- `sqlite3` not in n8n Docker container PATH
- PowerShell interpreting `(app)` in the git path as a cmdlet
- Wrong volume name guessed (`root_n8n_data` vs actual `n8n_data`)

**Workaround:** Used `docker cp` to copy the SQLite database out of the container to the host, then queried it there. Confirmed zero Blue Wolf executions.

---

### 🟡 Bump 8 — Supabase Credential Not Mapped in n8n
**What happened:** WF1 and WF2 JSON files reference a Supabase credential by ID. When imported into n8n, the credential ID from development doesn't exist in the production instance.

**Fix required:** After importing WF1/WF2, manually click the Supabase node and select the correct credential from the dropdown. This must be done in the n8n UI — it cannot be automated.

---

## 12. What Still Needs to Be Rectified

### 🔴 Critical — App Broken Without These

**Action 1 — Add Vercel Environment Variables**

Navigate to: `https://vercel.com/defiance80s-projects/signafy-ai/settings/environment-variables`

Add these variables (set for all environments: Production, Preview, Development):

| Variable | Value |
|---|---|
| `NEXT_PUBLIC_APP_URL` | `https://signafy-ai.vercel.app` |
| `NEXT_PUBLIC_SUPABASE_URL` | `https://shqsgswoficddajtqhuh.supabase.co` |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Get from Supabase → Settings → API → "anon public" key |
| `SUPABASE_SERVICE_ROLE_KEY` | The sb_secret_ key (rotate after setup) |
| `N8N_WEBHOOK_BASE_URL` | `https://n8n.srv1104500.hstgr.cloud` |
| `N8N_HMAC_SECRET` | `be600a5bda38c209bd4d9a9150728bb207ba544a338438e8ed01c4ad9dbf440b` |
| `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` | From Clerk Dashboard → API Keys |
| `CLERK_SECRET_KEY` | From Clerk Dashboard → API Keys |
| `OPENAI_API_KEY` | From platform.openai.com |
| `AI_MODEL` | `gpt-4.1-mini` |

After adding: trigger a redeploy.

---

**Action 2 — Run Supabase SQL Migrations**

Go to Supabase → SQL Editor → New Query. Paste and run `supabase/SETUP-RUN-IN-SQL-EDITOR.sql`.

This creates all tables including:
- `organizations`, `users`, `org_members`
- `leads`, `lead_activities`
- `workflow_runs`
- `businesses` (WF1 output)
- `intent_signals` (WF2 output)
- `generated_assets` (WF3 output)
- Unique indexes, RLS policies, Realtime publications
- `increment_leads_usage` RPC function

---

**Action 3 — Reimport n8n Workflows**

In n8n UI → Import from file, in order:
1. `Docs/BW-WF0-Router-Workflow.json`
2. `Docs/BW-WF1-Enhanced-Prospect-Finder.json`
3. `Docs/BW-WF2-Consumer-Intent-Finder.json`

After importing WF1 and WF2: click the Supabase node and map the credential.

---

**Action 4 — Set n8n VPS Environment Variables**

SSH in and add to n8n's environment:
```env
N8N_HMAC_SECRET=be600a5bda38c209bd4d9a9150728bb207ba544a338438e8ed01c4ad9dbf440b
APIFY_API_KEY=<token from Docs/Signafy-prod-token.txt>
N8N_BASE_URL=https://n8n.srv1104500.hstgr.cloud
OPENAI_API_KEY=<same key as Vercel>
```
Then restart: `docker compose restart n8n`

---

### 🔐 Security — Do ASAP

- [ ] Rotate VPS root password (shared in chat history) — change at Hostinger VPS panel
- [ ] Rotate Supabase service role key — regenerate at Supabase → Settings → API Keys, update Vercel
- [ ] Invalidate old Apify token (the one in git history) — Apify Dashboard → Settings → Integrations

---

## 13. What "Fully Working" Looks Like

When all blockers are resolved, the expected end-to-end experience is:

### B2B Discovery (45–120 seconds)
1. User signs into SignafyAI at `https://signafy-ai.vercel.app`
2. Navigates to **Leads → Run Discovery**
3. Types: `"Marketing agencies in Austin TX that run Facebook ads and need help with lead generation"`
4. Selects **B2B Prospects** mode, location: `Austin, TX`
5. Clicks **Launch Discovery**
6. Purple banner appears: "Intelligence engine running — Finding businesses / AI scoring opportunities / Drafting outreach emails"
7. In n8n UI: WF0 → WF1 execution visible in real time
8. Apify scrapes Google Maps → returns 20–50 marketing agencies in Austin
9. Score engine filters to those with weaknesses
10. GPT-4.1-mini writes pitch angles for each
11. Businesses appear in **Prospects tab**, one by one, as Supabase Realtime pushes each insert
12. User clicks "Bloom Digital Agency" → drawer opens:
    - Opportunity score: 87
    - Weakness: "No Facebook pixel on website, last blog post 8 months ago, only 14 Google reviews"
    - Recommended offer: "Done-for-you lead generation + analytics setup"
    - Pitch angle: "You're running ads but not tracking conversions — you're flying blind. I can fix that in 2 days."
    - Ready-to-send email with subject + body

### B2C Discovery (60–180 seconds)
1. User types: `"Homeowners in Phoenix looking for HVAC repair this week"`
2. Selects **B2C Intent** mode
3. WF2 scrapes Reddit r/phoenix, Yelp reviews, Twitter
4. Surfaces posts like: *"AC went out, need a reliable HVAC company in Phoenix ASAP, recommendations?"*
5. Intent tab shows: Score 91, Ready To Buy, High Urgency
6. Clicking shows the original Reddit post link

### Full Stack Mode
- Runs B2B + B2C simultaneously
- If "Generate Landing Pages" is checked: WF3 fires for top 3 signals
- Funnel Assets tab populates with complete content bundles per signal

---

## 14. File Reference Map

```
SignafyAI/
│
├── src/
│   ├── app/
│   │   ├── (app)/
│   │   │   ├── layout.tsx              # App shell: sidebar + topbar + main
│   │   │   ├── dashboard/page.tsx      # Stats, sparklines, workflow runs, quick actions
│   │   │   ├── leads/page.tsx          # Main leads UI — all 4 tabs
│   │   │   ├── analytics/page.tsx      # Analytics (stub)
│   │   │   ├── campaigns/page.tsx      # Campaigns (stub)
│   │   │   ├── social/page.tsx         # Social Inbox (stub)
│   │   │   ├── seo/page.tsx            # SEO Lab (stub)
│   │   │   ├── content/page.tsx        # Content (stub)
│   │   │   └── backlinks/page.tsx      # Backlinks tool (functional)
│   │   ├── (auth)/
│   │   │   ├── sign-in/                # Clerk sign in
│   │   │   └── sign-up/                # Clerk sign up
│   │   ├── onboarding/page.tsx         # 2-step: role → workspace creation
│   │   └── api/
│   │       ├── leads/route.ts          # POST triggers discovery; GET returns leads
│   │       ├── businesses/route.ts     # GET businesses with pagination/search
│   │       ├── intent-signals/route.ts # GET intent signals with stage/urgency filter
│   │       ├── generated-assets/route.ts # GET funnel asset bundles
│   │       ├── me/route.ts             # GET user+org context
│   │       └── webhooks/
│   │           └── n8n/route.ts        # POST — n8n callback handler (HMAC verified)
│   ├── components/
│   │   ├── app/
│   │   │   ├── sidebar.tsx             # Navigation sidebar
│   │   │   └── topbar.tsx              # Breadcrumb + notifications + user
│   │   └── ui/                         # shadcn/ui components
│   ├── hooks/
│   │   └── use-leads.ts                # React Query hooks for all data fetching
│   └── lib/
│       ├── n8n.ts                      # triggerBWRouter(), verifyN8nSignature()
│       ├── ai.ts                       # OpenAI fallback lead discovery
│       ├── access.ts                   # guardApiRate(), guardLeadDiscoveryUsage()
│       ├── utils.ts                    # generateId(), scoreColor(), etc.
│       └── supabase/
│           ├── server.ts               # getSupabaseServiceClient(), getOrgContext()
│           ├── client.ts               # getSupabaseBrowserClient()
│           └── types.ts                # TypeScript types for all DB tables
│
├── Docs/
│   ├── BW-WF0-Router-Workflow.json           # n8n WF0 — router
│   ├── BW-WF1-Enhanced-Prospect-Finder.json  # n8n WF1 — B2B (with AI parse)
│   ├── BW-WF2-Consumer-Intent-Finder.json    # n8n WF2 — B2C (with AI parse)
│   ├── VERCEL-ENV-SETUP.md                   # Setup checklist
│   ├── SIGNAFY-FULL-SYSTEM-BRIEF.md          # This document
│   └── Signafy-prod-token.txt                # Apify token (git-ignored)
│
├── supabase/
│   ├── SETUP-RUN-IN-SQL-EDITOR.sql           # All migrations in one file (run this)
│   └── migrations/
│       ├── 001_initial_schema.sql
│       ├── 002_rls_policies.sql
│       ├── 003_blue_wolf_intelligence_tables.sql
│       ├── 004_blue_wolf_rls_policies.sql
│       ├── 005_usage_rpc.sql
│       ├── 006_allow_free_plan.sql
│       ├── 007_new_workflow_types.sql
│       └── 008_businesses_name_unique.sql     # Adds idx on (org_id, name)
│
├── .env.local                                 # Local dev (git-ignored)
├── .env.example                               # Template for all env vars
├── middleware.ts                              # Clerk auth + route protection
└── package.json
```

---

*End of brief. Last full sync: June 2026.*
*For setup instructions, see `Docs/VERCEL-ENV-SETUP.md`.*
*For the n8n workflows, import JSON files from `Docs/` in order: WF0 → WF1 → WF2.*
