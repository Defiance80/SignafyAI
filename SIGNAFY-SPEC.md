# SignafyAI — Full Product Specification

## What SignafyAI Is

SignafyAI is an AI-powered growth engine for agencies, consultants, and brand operators. It consolidates lead generation, content creation, social media management, SEO research, campaign orchestration, and performance analytics into a single SaaS platform — with AI doing the heavy lifting and the user maintaining full creative control.

**Target users:** Marketing agencies, freelance consultants, brand managers, small-to-mid business owners who manage multiple social channels and need to scale output without scaling headcount.

**Revenue model:** Tiered SaaS subscriptions (Starter $49/mo, Pro $149/mo, Agency $399/mo) with usage limits on leads, content generations, and connected social accounts per tier.

---

## Architecture Overview

```
┌──────────────────────────────────────────────────────────────┐
│                        FRONTEND                              │
│  Next.js 16 (App Router) — Vercel                           │
│  React 19 / TypeScript / Tailwind CSS 4                      │
│  Auth: Clerk (@clerk/nextjs)                                 │
│  State: Zustand (client) + React Query (server)              │
│  Forms: React Hook Form + Zod validation                     │
│  Tables: TanStack React Table                                │
│  Notifications: Sonner (toast)                               │
└──────────────┬───────────────────────────────────────────────┘
               │ API calls (REST + Realtime subscriptions)
┌──────────────▼───────────────────────────────────────────────┐
│                       BACKEND                                │
│  Supabase (PostgreSQL + Auth + Realtime + Storage)           │
│  n8n (self-hosted automation engine — webhook-triggered)     │
│  Resend (transactional email)                                │
│  Svix (webhook delivery to clients)                          │
└──────────────────────────────────────────────────────────────┘
```

### What's Already Built (Frontend Only)
- Landing page with pricing, features, module overview
- Demo login flow (hardcoded credentials, cookie-based session)
- Dashboard with mock stats, workflow runs, quick actions
- 7 tool pages with static mock data (no backend calls)
- Sidebar navigation, mobile layout, dark theme system
- Middleware for protected route redirects

### What's NOT Built Yet
- Database schema and Supabase integration
- Real authentication (Clerk is installed but not wired)
- Any backend logic or API routes
- n8n workflows
- AI/LLM integration for content generation and social replies
- Real data fetching on any page
- Billing/subscription enforcement (Stripe)
- Multi-tenant workspace isolation

---

## Database Schema (Supabase / PostgreSQL)

Every table below needs to be created in Supabase. All tables include `id` (UUID, primary key), `created_at`, and `updated_at` unless noted.

### Core Tables

```sql
-- Organizations (multi-tenant root)
organizations
  id              UUID PRIMARY KEY
  name            TEXT NOT NULL
  slug            TEXT UNIQUE NOT NULL
  owner_id        UUID REFERENCES users(id)
  plan            TEXT DEFAULT 'starter'  -- starter | pro | agency
  stripe_customer_id  TEXT
  stripe_subscription_id TEXT
  subscription_status   TEXT DEFAULT 'trialing'
  usage_leads_mo       INT DEFAULT 0
  usage_content_mo     INT DEFAULT 0
  limits_leads_mo      INT DEFAULT 500
  limits_content_mo    INT DEFAULT 100
  created_at      TIMESTAMPTZ DEFAULT now()
  updated_at      TIMESTAMPTZ DEFAULT now()

-- Users (synced from Clerk via webhook)
users
  id              UUID PRIMARY KEY
  clerk_id        TEXT UNIQUE NOT NULL
  email           TEXT NOT NULL
  full_name       TEXT
  avatar_url      TEXT
  created_at      TIMESTAMPTZ DEFAULT now()

-- Organization membership + roles
org_members
  id              UUID PRIMARY KEY
  org_id          UUID REFERENCES organizations(id) ON DELETE CASCADE
  user_id         UUID REFERENCES users(id) ON DELETE CASCADE
  role            TEXT DEFAULT 'member'  -- admin | owner | member | viewer
  created_at      TIMESTAMPTZ DEFAULT now()
  UNIQUE(org_id, user_id)
```

### Leads Module

```sql
leads
  id              UUID PRIMARY KEY
  org_id          UUID REFERENCES organizations(id) ON DELETE CASCADE
  name            TEXT NOT NULL
  company         TEXT
  email           TEXT
  phone           TEXT
  platform        TEXT          -- instagram | linkedin | tiktok | twitter | facebook | google | manual
  source_url      TEXT          -- profile URL or discovery source
  score           INT DEFAULT 0 -- 0-100 AI-calculated lead score
  status          TEXT DEFAULT 'new'  -- new | contacted | qualified | converted | lost
  industry        TEXT
  location        TEXT
  notes           TEXT
  tags            TEXT[]
  enrichment_data JSONB         -- raw data from enrichment APIs
  last_activity   TIMESTAMPTZ
  created_at      TIMESTAMPTZ DEFAULT now()
  updated_at      TIMESTAMPTZ DEFAULT now()

-- Lead activity log
lead_activities
  id              UUID PRIMARY KEY
  lead_id         UUID REFERENCES leads(id) ON DELETE CASCADE
  org_id          UUID REFERENCES organizations(id) ON DELETE CASCADE
  type            TEXT NOT NULL  -- discovered | scored | contacted | replied | status_changed | note_added
  description     TEXT
  metadata        JSONB
  created_at      TIMESTAMPTZ DEFAULT now()

-- Saved discovery configurations
lead_discovery_configs
  id              UUID PRIMARY KEY
  org_id          UUID REFERENCES organizations(id) ON DELETE CASCADE
  name            TEXT NOT NULL
  filters         JSONB NOT NULL  -- { industry, location, platforms[], keywords[], min_score }
  schedule        TEXT            -- cron expression for recurring runs (nullable = manual only)
  last_run_at     TIMESTAMPTZ
  created_at      TIMESTAMPTZ DEFAULT now()
```

### Content Module

```sql
-- Brand voice profiles
brand_voices
  id              UUID PRIMARY KEY
  org_id          UUID REFERENCES organizations(id) ON DELETE CASCADE
  name            TEXT DEFAULT 'Default'
  tone            TEXT          -- professional | casual | witty | inspirational | bold
  vocabulary      TEXT[]        -- preferred words/phrases
  avoid_words     TEXT[]        -- words to never use
  example_posts   TEXT[]        -- sample content for AI calibration
  cta_style       TEXT          -- how CTAs should be phrased
  platform_rules  JSONB         -- per-platform overrides { instagram: {...}, linkedin: {...} }
  is_default      BOOLEAN DEFAULT false
  created_at      TIMESTAMPTZ DEFAULT now()
  updated_at      TIMESTAMPTZ DEFAULT now()

-- Generated content pieces
content_pieces
  id              UUID PRIMARY KEY
  org_id          UUID REFERENCES organizations(id) ON DELETE CASCADE
  voice_id        UUID REFERENCES brand_voices(id)
  type            TEXT NOT NULL  -- blog_post | social_caption | email_sequence | ad_copy | video_script
  platform        TEXT          -- instagram | linkedin | tiktok | twitter | facebook | cross_platform
  prompt          TEXT          -- what the user asked for
  body            TEXT NOT NULL  -- the generated content
  char_count      INT
  engagement_prediction FLOAT   -- AI-estimated engagement score
  status          TEXT DEFAULT 'draft'  -- draft | approved | scheduled | published
  scheduled_at    TIMESTAMPTZ
  published_at    TIMESTAMPTZ
  metadata        JSONB         -- { hashtags, media_suggestions, ab_variants }
  created_at      TIMESTAMPTZ DEFAULT now()
  updated_at      TIMESTAMPTZ DEFAULT now()
```

### Social Inbox Module

```sql
-- Connected social accounts
social_accounts
  id              UUID PRIMARY KEY
  org_id          UUID REFERENCES organizations(id) ON DELETE CASCADE
  platform        TEXT NOT NULL  -- instagram | linkedin | tiktok | twitter | facebook
  account_name    TEXT NOT NULL
  account_id      TEXT NOT NULL  -- platform-specific ID
  access_token    TEXT          -- encrypted OAuth token
  refresh_token   TEXT          -- encrypted
  token_expires   TIMESTAMPTZ
  avatar_url      TEXT
  is_active       BOOLEAN DEFAULT true
  created_at      TIMESTAMPTZ DEFAULT now()
  updated_at      TIMESTAMPTZ DEFAULT now()

-- Inbound messages/comments
social_messages
  id              UUID PRIMARY KEY
  org_id          UUID REFERENCES organizations(id) ON DELETE CASCADE
  account_id      UUID REFERENCES social_accounts(id) ON DELETE CASCADE
  platform        TEXT NOT NULL
  platform_msg_id TEXT          -- original message ID on the platform
  author_name     TEXT
  author_handle   TEXT
  author_avatar   TEXT
  message_type    TEXT          -- comment | dm | mention | reply
  body            TEXT NOT NULL
  intent          TEXT          -- inquiry | complaint | praise | spam | partnership | purchase_intent
  sentiment       FLOAT         -- -1.0 to 1.0
  is_read         BOOLEAN DEFAULT false
  status          TEXT DEFAULT 'pending'  -- pending | replied | dismissed | escalated
  parent_msg_id   UUID REFERENCES social_messages(id)  -- for threading
  received_at     TIMESTAMPTZ NOT NULL
  created_at      TIMESTAMPTZ DEFAULT now()

-- AI-generated reply drafts
social_replies
  id              UUID PRIMARY KEY
  message_id      UUID REFERENCES social_messages(id) ON DELETE CASCADE
  org_id          UUID REFERENCES organizations(id) ON DELETE CASCADE
  body            TEXT NOT NULL
  voice_id        UUID REFERENCES brand_voices(id)
  status          TEXT DEFAULT 'draft'  -- draft | approved | sent | failed
  sent_at         TIMESTAMPTZ
  created_at      TIMESTAMPTZ DEFAULT now()
```

### SEO Module

```sql
-- SEO research projects
seo_projects
  id              UUID PRIMARY KEY
  org_id          UUID REFERENCES organizations(id) ON DELETE CASCADE
  name            TEXT NOT NULL
  target_domain   TEXT
  target_keywords TEXT[]
  created_at      TIMESTAMPTZ DEFAULT now()
  updated_at      TIMESTAMPTZ DEFAULT now()

-- Individual keyword data
seo_keywords
  id              UUID PRIMARY KEY
  project_id      UUID REFERENCES seo_projects(id) ON DELETE CASCADE
  org_id          UUID REFERENCES organizations(id) ON DELETE CASCADE
  keyword         TEXT NOT NULL
  search_volume   INT
  difficulty      INT           -- 0-100
  difficulty_label TEXT          -- easy | medium | hard
  cpc             DECIMAL(10,2)
  intent          TEXT          -- informational | transactional | navigational | commercial
  trend           TEXT          -- up | down | stable
  cluster         TEXT          -- cluster group name
  serp_features   TEXT[]        -- featured_snippet | people_also_ask | local_pack | video
  position        INT           -- current ranking position (null if not ranking)
  url_ranking     TEXT          -- which URL ranks for this
  created_at      TIMESTAMPTZ DEFAULT now()
  updated_at      TIMESTAMPTZ DEFAULT now()

-- Competitor analysis
seo_competitors
  id              UUID PRIMARY KEY
  project_id      UUID REFERENCES seo_projects(id) ON DELETE CASCADE
  domain          TEXT NOT NULL
  overlap_pct     INT           -- keyword overlap percentage
  keywords_they_rank TEXT[]     -- keywords they rank for that you don't
  domain_authority INT
  created_at      TIMESTAMPTZ DEFAULT now()
```

### Campaigns Module

```sql
campaigns
  id              UUID PRIMARY KEY
  org_id          UUID REFERENCES organizations(id) ON DELETE CASCADE
  name            TEXT NOT NULL
  status          TEXT DEFAULT 'draft'  -- draft | active | paused | completed
  start_date      DATE
  end_date        DATE
  budget          DECIMAL(10,2)
  budget_spent    DECIMAL(10,2) DEFAULT 0
  channels        TEXT[]        -- instagram | linkedin | tiktok | twitter | facebook | email | seo
  goal            TEXT          -- awareness | engagement | leads | conversions
  target_audience TEXT
  notes           TEXT
  created_at      TIMESTAMPTZ DEFAULT now()
  updated_at      TIMESTAMPTZ DEFAULT now()

-- Content assigned to campaigns
campaign_content
  id              UUID PRIMARY KEY
  campaign_id     UUID REFERENCES campaigns(id) ON DELETE CASCADE
  content_id      UUID REFERENCES content_pieces(id) ON DELETE CASCADE
  scheduled_at    TIMESTAMPTZ
  published_at    TIMESTAMPTZ
  status          TEXT DEFAULT 'pending'  -- pending | published | failed
  performance     JSONB         -- { impressions, clicks, engagement_rate, conversions }
  created_at      TIMESTAMPTZ DEFAULT now()
```

### Analytics Module

```sql
-- Daily aggregated metrics per organization
analytics_daily
  id              UUID PRIMARY KEY
  org_id          UUID REFERENCES organizations(id) ON DELETE CASCADE
  date            DATE NOT NULL
  total_reach     INT DEFAULT 0
  total_impressions INT DEFAULT 0
  total_engagement INT DEFAULT 0
  engagement_rate FLOAT DEFAULT 0
  leads_generated INT DEFAULT 0
  conversions     INT DEFAULT 0
  revenue_attributed DECIMAL(10,2) DEFAULT 0
  platform_breakdown JSONB      -- { instagram: { reach, engagement }, linkedin: {...} }
  created_at      TIMESTAMPTZ DEFAULT now()
  UNIQUE(org_id, date)

-- Per-content performance snapshots
content_performance
  id              UUID PRIMARY KEY
  content_id      UUID REFERENCES content_pieces(id) ON DELETE CASCADE
  org_id          UUID REFERENCES organizations(id) ON DELETE CASCADE
  impressions     INT DEFAULT 0
  clicks          INT DEFAULT 0
  likes           INT DEFAULT 0
  comments        INT DEFAULT 0
  shares          INT DEFAULT 0
  engagement_rate FLOAT DEFAULT 0
  measured_at     TIMESTAMPTZ DEFAULT now()
```

### Workflow Engine

```sql
-- n8n workflow run tracking
workflow_runs
  id              UUID PRIMARY KEY
  org_id          UUID REFERENCES organizations(id) ON DELETE CASCADE
  workflow_type   TEXT NOT NULL  -- lead_discovery | content_generation | social_classification | seo_research
  n8n_execution_id TEXT
  status          TEXT DEFAULT 'pending'  -- pending | running | complete | failed
  input_params    JSONB
  output_summary  JSONB         -- { leads_found: 43, duration_ms: 84000 }
  started_at      TIMESTAMPTZ
  completed_at    TIMESTAMPTZ
  error_message   TEXT
  created_at      TIMESTAMPTZ DEFAULT now()
```

---

## What Each Tool Needs to Become Functional

### 1. Leads — Real Lead Discovery

**What it does now:** Static table of 15 fake leads.

**What it needs:**

| Component | Details |
|-----------|---------|
| **API Routes** | `POST /api/leads/discover` — triggers n8n lead discovery workflow; `GET /api/leads` — fetch leads with filters, pagination, sorting; `PATCH /api/leads/[id]` — update status, notes, tags; `DELETE /api/leads/[id]` — remove lead |
| **n8n Workflow: Lead Discovery** | Triggered via webhook. Inputs: industry, location, platforms, keywords. Steps: (1) Query Apollo.io or Hunter.io API for contacts matching filters, (2) Enrich with LinkedIn data via Proxycurl or PhantomBuster, (3) Score each lead using AI (OpenAI/Claude) based on profile completeness, engagement signals, and fit criteria, (4) Write results to Supabase `leads` table, (5) Send Supabase Realtime event so frontend updates live |
| **Lead Scoring Model** | AI prompt that evaluates: profile completeness, company size, industry relevance, social engagement level, content recency. Outputs 0-100 score + reasoning |
| **External APIs Needed** | Apollo.io ($49+/mo) OR Hunter.io ($49+/mo) for email/contact discovery; Proxycurl ($10+/mo) or PhantomBuster for LinkedIn enrichment; OpenAI API for scoring |
| **Frontend Changes** | Replace mock data with React Query fetch from `/api/leads`; Add real search/filter with URL params (nuqs); Real-time updates via Supabase subscription; Add lead detail drawer with activity timeline from `lead_activities` |
| **Usage Tracking** | Increment `organizations.usage_leads_mo` on each discovery run; block if over plan limit |

### 2. Content — Real AI Content Generation

**What it does now:** Shows 4 pre-written mock content pieces with selectors that don't do anything.

**What it needs:**

| Component | Details |
|-----------|---------|
| **API Routes** | `POST /api/content/generate` — send prompt + type + platform + voice to AI; `GET /api/content` — list generated pieces with filters; `PATCH /api/content/[id]` — update status, edit body; `POST /api/content/[id]/schedule` — set publish time |
| **n8n Workflow: Content Generation** | Triggered via webhook. Inputs: content type, platform, tone, topic/prompt, brand voice ID. Steps: (1) Fetch brand voice profile from Supabase, (2) Construct system prompt with tone rules, vocabulary, platform constraints (char limits, hashtag conventions), (3) Call OpenAI/Claude API with the assembled prompt, (4) Post-process: add hashtags, enforce char limits, generate variants, (5) Calculate engagement prediction (historical data comparison or AI estimate), (6) Save to `content_pieces` table, (7) Return via Realtime |
| **Brand Voice Engine** | CRUD for `brand_voices` table. UI to define tone, upload example posts, set per-platform rules. The voice profile becomes part of every AI prompt's system instructions |
| **Social Publishing** | Integration with Buffer, Hootsuite, or direct platform APIs (Meta Graph API, LinkedIn Marketing API, Twitter API v2) to actually publish scheduled content. Alternatively: export to CSV/clipboard for manual posting (MVP approach) |
| **External APIs Needed** | OpenAI API ($) or Anthropic Claude API for generation; optionally Buffer/Hootsuite API for scheduling |
| **Frontend Changes** | Wire selectors to form state; Submit generates real content via API; Show loading state with Realtime progress; Content list from database with edit/approve/schedule actions; Character count + engagement prediction from AI response |
| **Usage Tracking** | Increment `organizations.usage_content_mo` per generation; block if over limit |

### 3. Social Inbox — Real Social Monitoring & Replies

**What it does now:** Static list of 8 fake messages with a hardcoded AI reply.

**What it needs:**

| Component | Details |
|-----------|---------|
| **API Routes** | `GET /api/social/messages` — fetch inbox with filters; `POST /api/social/messages/[id]/reply` — approve + send reply; `PATCH /api/social/messages/[id]` — mark read, dismiss, escalate; `GET /api/social/accounts` — list connected accounts; `POST /api/social/accounts/connect` — OAuth flow |
| **OAuth Integration per Platform** | **Instagram:** Meta Graph API — requires Facebook App, Instagram Business account; **LinkedIn:** LinkedIn Marketing API — OAuth 2.0 with `r_organization_social` scope; **TikTok:** TikTok for Developers — Content Posting API; **Twitter/X:** Twitter API v2 — OAuth 2.0 with PKCE; **Facebook:** Meta Graph API — Page access tokens |
| **n8n Workflow: Message Ingestion** | Runs on schedule (every 5-15 min) or via platform webhooks. Steps: (1) Poll each connected account for new comments/DMs/mentions, (2) Classify intent using AI (inquiry, complaint, praise, spam, partnership, purchase_intent), (3) Calculate sentiment (-1.0 to 1.0), (4) Generate AI reply draft using brand voice, (5) Save message + draft to Supabase, (6) Push Realtime notification |
| **n8n Workflow: Send Reply** | Triggered when user approves a reply. Steps: (1) Fetch reply + account tokens, (2) Post reply via platform API, (3) Update status to 'sent', (4) Log activity |
| **External APIs Needed** | Meta Graph API (free with Facebook App approval), LinkedIn API (requires partner program for full access), Twitter API ($100/mo Basic), TikTok API (free with approval) |
| **Frontend Changes** | Real message list from Supabase with Realtime subscription; OAuth connect buttons in Settings that redirect to platform auth; Real AI reply generation (editable before sending); Sent confirmation + error handling; Unread badge count from live data |
| **Compliance Note** | Each platform has review/approval processes for API access. Instagram requires Facebook Business verification. LinkedIn Marketing API requires a LinkedIn Page. Twitter API v2 requires a project + app approval. Budget 2-4 weeks for approvals. |

### 4. SEO — Real Keyword Research & Analysis

**What it does now:** Static table of 20 fake keywords with hardcoded competitors.

**What it needs:**

| Component | Details |
|-----------|---------|
| **API Routes** | `POST /api/seo/research` — trigger keyword research workflow; `GET /api/seo/projects` — list projects; `GET /api/seo/projects/[id]/keywords` — paginated keyword list; `GET /api/seo/projects/[id]/competitors` — competitor analysis; `POST /api/seo/projects/[id]/export` — generate CSV/PDF |
| **n8n Workflow: Keyword Research** | Triggered via webhook. Inputs: seed keyword or domain, location, language. Steps: (1) Query keyword API for seed expansions + metrics, (2) Cluster keywords by topic using AI, (3) Assign intent labels (informational/transactional/etc), (4) Check current rankings via SERP API, (5) Identify competitor domains ranking for same keywords, (6) Save all to Supabase tables, (7) Notify via Realtime |
| **n8n Workflow: Competitor Gap** | Steps: (1) Pull competitor's ranking keywords, (2) Compare against user's rankings, (3) Identify gaps (keywords they rank for, user doesn't), (4) Score opportunity based on volume × inverse difficulty |
| **External APIs Needed** | **DataForSEO** ($50+/mo) — keyword volume, difficulty, SERP data, competitor keywords; OR **SEMrush API** (enterprise pricing) or **Ahrefs API** (enterprise); **SerpAPI** ($50+/mo) — for live SERP checking; OpenAI for keyword clustering and content brief generation |
| **Frontend Changes** | Real search form that triggers workflow; Loading states during research; Keyword table from database with sort/filter via TanStack Table; Cluster visualization (grouped cards with expandable keyword lists); Competitor cards from real data; Export button generates actual CSV |

### 5. Campaigns — Real Campaign Management

**What it does now:** 6 static campaign cards with fake sparkline charts.

**What it needs:**

| Component | Details |
|-----------|---------|
| **API Routes** | `POST /api/campaigns` — create campaign; `GET /api/campaigns` — list with filters; `PATCH /api/campaigns/[id]` — update status, budget, dates; `DELETE /api/campaigns/[id]` — archive; `POST /api/campaigns/[id]/content` — assign content piece; `GET /api/campaigns/[id]/performance` — aggregated metrics |
| **Campaign Builder** | Form to define: name, goal, channels, date range, budget, target audience. Assign content pieces from the content library. Set publishing schedule per piece. |
| **Performance Tracking** | Pull metrics from connected social accounts (via platform APIs) for published campaign content. Aggregate into `campaign_content.performance` JSONB field. Calculate ROI based on budget vs. attributed revenue. |
| **Frontend Changes** | CRUD forms for campaigns; Real status management (draft → active → paused → completed); Content assignment from content library; Sparkline charts from real `analytics_daily` data; Budget tracking (spent vs. allocated); Calendar view using a lightweight calendar library |
| **Dependencies** | Requires Content module and Social Accounts to be functional first — campaigns orchestrate content across connected channels |

### 6. Analytics — Real Performance Data

**What it does now:** Mock metrics, a fake SVG chart, and static platform bars.

**What it needs:**

| Component | Details |
|-----------|---------|
| **API Routes** | `GET /api/analytics/overview?range=7d|30d|90d` — aggregated metrics; `GET /api/analytics/daily?from=&to=` — daily time series; `GET /api/analytics/platforms` — per-platform breakdown; `GET /api/analytics/top-content` — ranked content by engagement |
| **Data Aggregation** | n8n workflow runs daily (midnight): pulls metrics from all connected social accounts via platform APIs, calculates totals, writes to `analytics_daily` table. Or: triggered after each social sync. |
| **Charting Library** | Replace SVG mock with **Recharts** or **Tremor** — lightweight, React-native charting. Area chart for daily trends, bar chart for platform comparison, sparklines for content cards. |
| **Frontend Changes** | Date range selector that re-fetches data; Real charts from time-series data; Platform breakdown from actual connected account metrics; Top content list ranked by real engagement; Export/download report as PDF |
| **Dependencies** | Requires Social Accounts connected + data ingestion running |

### 7. Settings — Real Configuration

**What it does now:** Static form UI with toggles and cards that don't persist.

**What it needs:**

| Component | Details |
|-----------|---------|
| **Profile** | Pull from Clerk user object. Allow name/avatar update via Clerk API |
| **Brand Voice** | CRUD against `brand_voices` table. Sample output preview: call AI with test prompt using the configured voice to show live example |
| **Connected Accounts** | OAuth flow per platform (see Social module). Show connected accounts from `social_accounts` table. Disconnect = revoke token + soft delete |
| **Notifications** | Store preferences in `users` table (JSONB `notification_prefs` column). Control: email on new lead, email on campaign completion, in-app toast for social messages |
| **Billing** | Stripe Customer Portal embed via `stripe.billingPortal.sessions.create()`. Show current plan, usage vs. limits, upgrade/downgrade options. Stripe webhook handler to sync subscription status to `organizations` table |
| **API Keys** | Generate per-org API keys stored hashed in a `api_keys` table. Used for external integrations (Zapier, custom scripts). Show masked key with copy button |

---

## Authentication — Clerk Integration

Clerk is already installed (`@clerk/nextjs`). Currently bypassed with a demo cookie.

**To activate:**

1. Create Clerk application at clerk.com
2. Set environment variables:
   ```
   NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_...
   CLERK_SECRET_KEY=sk_...
   NEXT_PUBLIC_CLERK_SIGN_IN_URL=/sign-in
   NEXT_PUBLIC_CLERK_SIGN_UP_URL=/sign-up
   NEXT_PUBLIC_CLERK_AFTER_SIGN_IN_URL=/dashboard
   NEXT_PUBLIC_CLERK_AFTER_SIGN_UP_URL=/dashboard
   ```
3. Wrap root layout with `<ClerkProvider>`
4. Replace demo login page with Clerk's `<SignIn />` component
5. Replace middleware (`proxy.ts`) with Clerk's `clerkMiddleware()`
6. Set up Clerk webhook → Supabase to sync user records on signup/update
7. Use `auth()` server-side and `useUser()` client-side for session data

---

## n8n Automation Workflows Needed

All workflows are triggered via HTTP webhook from the Next.js API routes and write results back to Supabase. n8n is self-hosted on the VPS.

| # | Workflow | Trigger | What It Does | APIs Used |
|---|----------|---------|-------------|-----------|
| 1 | Lead Discovery | Webhook (POST) | Search for prospects, enrich profiles, score with AI, save to DB | Apollo/Hunter + Proxycurl + OpenAI |
| 2 | Lead Scoring | Webhook or schedule | Re-score existing leads based on new activity signals | OpenAI |
| 3 | Content Generation | Webhook (POST) | Generate content piece using brand voice + platform rules | OpenAI/Claude |
| 4 | Social Ingestion | Schedule (every 15m) | Poll connected accounts for new messages/comments | Meta/LinkedIn/Twitter/TikTok APIs |
| 5 | Social Classification | Internal (after ingestion) | Classify intent + sentiment + generate reply draft | OpenAI |
| 6 | Social Reply Send | Webhook (POST) | Post approved reply to the originating platform | Platform APIs |
| 7 | SEO Research | Webhook (POST) | Pull keyword data, cluster, analyze competitors | DataForSEO/SerpAPI + OpenAI |
| 8 | Analytics Aggregation | Schedule (daily midnight) | Pull metrics from all connected accounts, write daily rollup | Platform APIs |
| 9 | Usage Reset | Schedule (1st of month) | Reset `usage_leads_mo` and `usage_content_mo` to 0 | Supabase |

---

## External Services & API Keys Required

| Service | Purpose | Estimated Cost | Required For |
|---------|---------|---------------|-------------|
| **Supabase** | Database, auth bridge, realtime, storage | Free tier → $25/mo Pro | Everything |
| **Clerk** | User authentication, session management | Free tier → $25/mo Pro | Auth |
| **OpenAI API** | Content generation, lead scoring, intent classification, keyword clustering | ~$20-100/mo depending on volume | Content, Leads, Social, SEO |
| **Stripe** | Subscription billing, customer portal | 2.9% + $0.30 per transaction | Billing |
| **Apollo.io** or **Hunter.io** | Lead/contact discovery | $49-99/mo | Leads |
| **Proxycurl** | LinkedIn profile enrichment | $10+/mo | Leads |
| **DataForSEO** | Keyword data, SERP analysis | $50+/mo | SEO |
| **Meta Graph API** | Instagram + Facebook integration | Free (requires app approval) | Social |
| **LinkedIn Marketing API** | LinkedIn integration | Free (requires partner approval) | Social |
| **Twitter API v2** | Twitter/X integration | $100/mo Basic | Social |
| **TikTok API** | TikTok integration | Free (requires approval) | Social |
| **Resend** | Transactional emails (already installed) | Free tier → $20/mo | Notifications |
| **Svix** | Webhook delivery to clients | Free tier → $50/mo | API/Webhooks |
| **n8n** | Self-hosted automation engine | Free (self-hosted) | All workflows |
| **Vercel** | Frontend hosting | Free tier → $20/mo Pro | Hosting |

**Estimated total monthly cost at launch:** $250-450/mo (before revenue)

---

## Environment Variables Needed

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...

# Clerk
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_live_...
CLERK_SECRET_KEY=sk_live_...
CLERK_WEBHOOK_SECRET=whsec_...

# Stripe
STRIPE_SECRET_KEY=sk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_live_...

# OpenAI
OPENAI_API_KEY=sk-...

# Lead Discovery
APOLLO_API_KEY=...         # or HUNTER_API_KEY
PROXYCURL_API_KEY=...

# SEO
DATAFORSEO_LOGIN=...
DATAFORSEO_PASSWORD=...

# Social Platforms
META_APP_ID=...
META_APP_SECRET=...
LINKEDIN_CLIENT_ID=...
LINKEDIN_CLIENT_SECRET=...
TWITTER_CLIENT_ID=...
TWITTER_CLIENT_SECRET=...
TIKTOK_CLIENT_KEY=...
TIKTOK_CLIENT_SECRET=...

# n8n
N8N_WEBHOOK_BASE_URL=https://n8n.yourdomain.com
N8N_API_KEY=...

# Resend
RESEND_API_KEY=re_...

# Svix
SVIX_API_KEY=...
```

---

## Build Order (Recommended Phases)

### Phase 1 — Foundation (Week 1-2)
1. Set up Supabase project + run all SQL migrations
2. Activate Clerk authentication (replace demo login)
3. Build organization creation flow (post-signup)
4. Create API route layer with Supabase client helpers
5. Wire Settings page to real data (profile, connected accounts UI)

### Phase 2 — Content Engine (Week 3-4)
1. Build brand voice CRUD (Settings → Brand Voice)
2. Create n8n content generation workflow
3. Wire Content page: type/platform/voice selection → API → AI generation → save to DB → display
4. Add content list with edit/approve/schedule status management

### Phase 3 — Lead Discovery (Week 5-6)
1. Sign up for Apollo.io or Hunter.io
2. Build n8n lead discovery workflow (search → enrich → score → save)
3. Wire Leads page: run discovery → real-time results → filter/sort/search
4. Add lead detail drawer with activity timeline
5. Implement usage tracking against plan limits

### Phase 4 — Social Inbox (Week 7-9)
1. Create Meta/LinkedIn/Twitter developer apps + get API approval (start this early — takes time)
2. Build OAuth connect flows in Settings
3. Build n8n social ingestion workflow (poll accounts → classify → draft replies)
4. Wire Social page: real inbox → AI reply preview → approve & send
5. Build n8n reply-send workflow

### Phase 5 — SEO Research (Week 10-11)
1. Sign up for DataForSEO
2. Build n8n keyword research workflow
3. Build n8n competitor analysis workflow
4. Wire SEO page: search → research → clusters → competitor gaps → export

### Phase 6 — Campaigns & Analytics (Week 12-13)
1. Wire Campaigns page: CRUD campaigns, assign content, track status
2. Build n8n analytics aggregation workflow (daily metrics pull)
3. Add Recharts/Tremor for real charts on Analytics page
4. Wire Analytics page: date range queries → charts → platform breakdown

### Phase 7 — Billing & Polish (Week 14-15)
1. Set up Stripe products + pricing tiers
2. Build checkout flow (Stripe Checkout Sessions)
3. Build webhook handler for subscription events
4. Enforce usage limits per plan
5. Add Stripe Customer Portal for self-service billing management
6. End-to-end QA, mobile responsiveness, error handling, loading states

---

## File Structure (Target State)

```
src/
├── app/
│   ├── (app)/
│   │   ├── dashboard/page.tsx
│   │   ├── leads/page.tsx
│   │   ├── content/page.tsx
│   │   ├── social/page.tsx
│   │   ├── seo/page.tsx
│   │   ├── campaigns/page.tsx
│   │   ├── analytics/page.tsx
│   │   ├── settings/page.tsx
│   │   └── layout.tsx
│   ├── (auth)/
│   │   ├── sign-in/page.tsx
│   │   ├── sign-up/page.tsx        ← NEW
│   │   └── layout.tsx
│   ├── api/
│   │   ├── leads/
│   │   │   ├── route.ts            ← GET (list), POST (discover)
│   │   │   └── [id]/route.ts       ← PATCH, DELETE
│   │   ├── content/
│   │   │   ├── route.ts            ← GET (list), POST (generate)
│   │   │   └── [id]/route.ts       ← PATCH, POST schedule
│   │   ├── social/
│   │   │   ├── messages/route.ts
│   │   │   ├── messages/[id]/route.ts
│   │   │   ├── accounts/route.ts
│   │   │   └── accounts/connect/[platform]/route.ts  ← OAuth
│   │   ├── seo/
│   │   │   ├── projects/route.ts
│   │   │   └── projects/[id]/route.ts
│   │   ├── campaigns/
│   │   │   ├── route.ts
│   │   │   └── [id]/route.ts
│   │   ├── analytics/
│   │   │   └── route.ts
│   │   ├── webhooks/
│   │   │   ├── clerk/route.ts      ← Clerk user sync
│   │   │   ├── stripe/route.ts     ← Subscription events
│   │   │   └── n8n/route.ts        ← Workflow completion callbacks
│   │   └── billing/
│   │       └── portal/route.ts     ← Stripe portal session
│   ├── layout.tsx
│   └── page.tsx                    ← Landing page
├── components/
│   ├── app/
│   │   └── sidebar.tsx
│   └── ui/                         ← NEW: reusable components
│       ├── button.tsx
│       ├── input.tsx
│       ├── modal.tsx
│       ├── table.tsx
│       ├── badge.tsx
│       ├── card.tsx
│       ├── toast.tsx
│       └── dropdown.tsx
├── lib/
│   ├── supabase/
│   │   ├── client.ts               ← Browser client
│   │   ├── server.ts               ← Server client (with service role)
│   │   └── types.ts                ← Generated types from Supabase
│   ├── stripe.ts                   ← Stripe client + helpers
│   ├── n8n.ts                      ← n8n webhook trigger helpers
│   ├── ai.ts                       ← OpenAI client + prompt templates
│   └── utils.ts                    ← Formatting, date helpers
├── hooks/
│   ├── use-org.ts                  ← Current organization context
│   ├── use-realtime.ts             ← Supabase realtime subscription
│   └── use-usage.ts                ← Plan usage tracking
├── stores/
│   └── app-store.ts                ← Zustand global state
└── middleware.ts                   ← Clerk middleware (replace proxy.ts)
```

---

## Key Technical Decisions Still Needed

1. **AI Provider:** OpenAI (GPT-4o) vs. Anthropic (Claude) vs. both with fallback — affects content quality and cost
2. **Lead Data Provider:** Apollo.io vs. Hunter.io vs. both — affects data quality and coverage
3. **SEO Data Provider:** DataForSEO vs. SEMrush API vs. Ahrefs API — affects depth and pricing
4. **Social Publishing Strategy:** Direct platform APIs (more control, more dev work) vs. Buffer/Hootsuite API (simpler, added cost, less control)
5. **Charting Library:** Recharts (lightweight, popular) vs. Tremor (higher-level, opinionated) vs. Chart.js
6. **Self-hosted n8n Location:** Same VPS (85.31.232.102) or separate instance — affects resource allocation
7. **Mobile App:** Web-only for now, or plan native app shell (Capacitor/PWA) from the start?
