# Research Summary: SignafyAI

**Synthesized:** 2026-04-21
**Sources:** STACK.md, FEATURES.md, ARCHITECTURE.md, PITFALLS.md

---

## Recommended Stack (Final)

| Layer | Technology | Version | Notes |
|-------|-----------|---------|-------|
| Framework | Next.js | 16.2.4 | Use v16 (current stable), NOT v15 — Turbopack default, React 19 |
| Language | TypeScript | 6.0.3 | Required |
| Styles | Tailwind CSS | 4.2.4 | v4 is current stable |
| Components | shadcn/ui (CLI) | 4.4.0 | Scaffolds components into your codebase |
| Auth | @clerk/nextjs | 7.2.3 | Organizations + roles built in; use proxy.ts in Next.js 16 |
| Database | @supabase/supabase-js | 2.104.0 | Direct client with Clerk JWT injection — NOT @supabase/ssr |
| Forms | react-hook-form + zod | 7.73.1 + 4.3.6 | Use Zod v4 (breaking from v3) |
| Server state | @tanstack/react-query | 5.99.2 | For polling, mutations, job status |
| Client state | zustand | 5.0.12 | UI state (sidebar, modals, active org) |
| URL state | nuqs | 2.8.9 | Filter/sort state in leads and content tables |
| Tables | @tanstack/react-table | 8.21.3 | Headless table for leads, content queue |
| Toast | sonner | 2.0.7 | shadcn/ui default |
| Icons | lucide-react | 1.8.0 | shadcn/ui default |
| Email | resend + react-email | 6.12.2 | Best DX for Next.js |
| Webhooks | svix | 1.91.1 | Clerk webhook verification |
| Env validation | @t3-oss/env-nextjs | 0.13.11 | Catches missing env vars at build time |
| Billing scaffold | stripe + @stripe/stripe-js | 22.0.2 / 9.2.0 | Architecture only in beta |

**Do NOT use:** @supabase/ssr, axios, redux, prisma, next-auth/Auth.js, Zod v3, SWR

---

## Table Stakes (Must Ship in Beta)

These are non-negotiable for the product to feel real to target users (agencies, consultants, brands):

**Platform-level:**
- Multi-tenant isolation (org-scoped Supabase RLS)
- Clerk auth with admin/owner/member/viewer roles
- Onboarding wizard → business profile
- Brand voice profile (tone, vocabulary, CTA rules, "sound like us" paste area)
- Main dashboard with summary cards
- Workflow run log (users need to debug)
- In-app notifications (approval needed, run complete)
- Plan limits with clear messaging

**Leads module:** search + filters, enrichment, scoring, status tagging, CSV export, duplicate detection, source tracking

**Content module:** AI generation, platform variants (all 6), draft statuses, approval/reject/edit flow, keyword inclusion, hashtag suggestions, content history

**Social response module:** comment classification, AI reply drafts, approval workflow, autonomy controls, banned phrases, response log — **approval mode only in beta, no auto-send**

**SEO module:** keyword cluster generation, search intent categorization, FAQ ideas, title/meta suggestions, landing page suggestions, internal link ideas

---

## Key Differentiators

SignafyAI's moat is cross-module continuity — no single competitor connects all four growth surfaces from one business profile:

1. **Unified business profile** drives all four modules (leads, content, SEO, social) — HubSpot + Jasper + Apollo + Sprout Social combined at SMB price
2. **Local market awareness** — city-aware content, local keyword clusters, local density lead views. Apollo is B2B enterprise; Ahrefs is national. This whitespace belongs to SMB agencies.
3. **Cross-module handoff** — lead → generate outreach content for that lead. No competitor does this in one UI.
4. **Autonomy controls** — per-module setting for how much AI does unsupervised. First-class control surface, not buried in settings.

---

## Architecture Overview

### Two-Plane System

```
CONTROL PLANE (Next.js / Vercel)
  - UI, routing, auth (Clerk), data (Supabase)
  - Dispatches work to processing plane
  - Receives and stores results
  - Pushes real-time status to browser via Supabase Realtime

PROCESSING PLANE (n8n / Hostinger)
  - All heavy AI + async processing
  - No direct Supabase access — writes through Next.js callback
  - Receives webhooks from control plane
  - Returns results via HMAC-signed callback
```

### Async Job Flow (Standard Pattern)

```
1. User action → POST /api/{module}/run
2. API route: validate Clerk session, extract org_id
3. INSERT workflow_runs { status: "queued", job_id }
4. POST to n8n webhook (fire-and-forget) with { job_id, org_id, params }
5. Return { job_id } with 202 to browser
6. Browser subscribes to Supabase Realtime: workflow_runs where id=job_id
7. n8n processes (seconds to minutes)
8. n8n POSTs to /api/internal/n8n/callback with HMAC-signed result
9. Callback route: verify HMAC, resolve org_id from job_id, write results
10. UPDATE workflow_runs { status: "complete" }
11. Supabase Realtime fires → browser updates UI
```

### Security Contract

- **Next.js → n8n**: Bearer token in Authorization header (n8n Header Auth node)
- **n8n → Next.js callback**: HMAC-SHA256 signature on payload body
- **org_id source**: ALWAYS from Clerk session, never from request body
- **service_role key**: ONLY in callback route and admin endpoints, never in pages/components

---

## Top P1 Pitfalls (Fix Before Writing Any Feature Code)

These five issues must be resolved in Phase 1 or they require a full rewrite:

| # | Pitfall | Prevention |
|---|---------|-----------|
| P1-A | `service_role` key used anywhere except the n8n callback route | Create two Supabase client factories: `createUserClient()` (anon + JWT) and `createAdminClient()` (service_role). Code review blocks any other use. |
| P1-B | RLS policies scope to `user_id` instead of `org_id` | Every table gets `org_id NOT NULL`. RLS policy: `org_id = (auth.jwt() -> 'org_id')::uuid`. Configure Clerk JWT template to include `org_id` claim. |
| P1-C | Clerk JWT not passed to Supabase client | Create Supabase client per-request with `Authorization: Bearer ${clerkToken}`. Never module-level singleton with anon key only. |
| P1-D | n8n webhooks exposed without authentication | All n8n webhooks use Header Auth. Next.js proxy route validates Clerk session before forwarding. HMAC on all callbacks. |
| P1-E | Tenant ID missing from n8n webhook payloads | Zod schema on every dispatch payload. Always include `{ org_id, user_id, job_id, workflow, timestamp }`. |

---

## Recommended Phase Order

Derived from feature dependency map and architecture build-order analysis:

```
Phase 1: Foundation + n8n Skeleton
  - Supabase schema (all tables, RLS, migrations)
  - Clerk setup (orgs, roles, JWT template for Supabase)
  - Next.js app shell (auth, middleware/proxy.ts, layouts)
  - n8n callback route with HMAC verification
  - n8n: 6 webhook entry points with Header Auth
  - One end-to-end async job loop (dispatch → n8n → callback → Realtime)
  WHY FIRST: unblocks all feature work; proves the integration contract

Phase 2: Onboarding + Business Profile
  - Onboarding wizard (business info, brand voice, "sound like us")
  - Business profile stored in Supabase
  WHY SECOND: all n8n payloads need business context; nothing useful runs without it

Phase 3: Leads Module
  - Lead search dispatch → n8n lead discovery workflow
  - Leads table, enrichment, scoring
  - Leads UI: search form, real-time status, filtered table, CSV export
  WHY THIRD: highest tangible proof-of-value; proves full async loop with real data

Phase 4: Content Module
  - Content generation dispatch → n8n content intelligence workflow
  - content_items + content_variants tables
  - Content UI: generate, draft approval, platform variants, queue
  WHY FOURTH: builds on proven async pattern; no dangerous API dependencies

Phase 5: SEO Module
  - SEO research dispatch → n8n SEO traffic workflow
  - keyword_clusters table
  - SEO lab UI: keyword clusters, FAQ ideas, meta suggestions, landing page briefs
  WHY FIFTH: LLM-only, no external API; adds high value at low risk

Phase 6: Social Response Module
  - Social inbox webhook receiver + n8n classification workflow
  - social_messages + response_suggestions tables
  - Social inbox UI: inbound queue, AI reply review, approve/reject, autonomy controls
  WHY SIXTH: depends on brand voice from Phase 2; scoped to approval-only in beta

Phase 7: Campaigns + Scheduling
  - campaign_schedules, campaign_scheduler n8n workflow
  - Campaign calendar UI: drag-and-drop timeline, status tracking
  WHY SEVENTH: depends on content module being stable

Phase 8: Analytics + Admin + Billing Scaffold
  - analytics_events, cron-triggered sync
  - Dashboard analytics cards
  - Admin panel: tenant list, workflow health, usage monitoring
  - Billing architecture (Stripe setup, plan limits, no payments in beta)
  WHY LAST: meaningful only once data exists from prior phases

Phase 9: Marketing Site
  - Homepage, features, pricing, beta waitlist, contact
  - Vercel deployment config, .env.example, README
```

---

## Open Questions (Resolve Before or During Build)

| Question | When to Resolve | Impact |
|----------|-----------------|--------|
| Next.js 16 proxy.ts + Clerk 7 compatibility — does `clerkMiddleware` work in proxy.ts or is there a `clerkProxy` export? | Phase 1, Day 1 | Blocks all auth setup |
| Exact Clerk JWT template claims for Supabase (`sub`, `org_id` claim names must match RLS policies exactly) | Phase 1 | Blocks all RLS policies |
| Which lead enrichment API? (Hunter.io, Apollo API, Clearbit/HubSpot, or scraping?) | Phase 3 | Affects lead data quality and cost model |
| Which social platforms ship in Phase 6 beta? (Instagram webhooks require Meta app review — weeks of lead time) | Phase 2 (start process early) | Could block Phase 6 entirely if not started early |
| n8n version on Hostinger: standard mode or queue mode with Redis? | Phase 1 | Affects n8n reliability under concurrent users |
| AI provider for content/SEO/social? (OpenAI GPT-4o vs Claude — cost, rate limits, quality tradeoffs differ) | Phase 2 | Affects n8n workflow design |
| Supabase Realtime RLS enforcement enabled per table? (Verify in Supabase project settings) | Phase 1 | Affects real-time security |

---

## Critical Integration Verify List

Before writing any feature code, manually verify these (LOW-to-MEDIUM confidence from research):

- [ ] `clerkMiddleware` in `proxy.ts` works correctly with Clerk 7.x in Next.js 16
- [ ] Clerk JWT template can include `org_id` claim that Supabase RLS reads as `(auth.jwt() -> 'org_id')::uuid`
- [ ] Supabase Realtime `postgres_changes` subscriptions enforce RLS (check table settings in Supabase dashboard)
- [ ] n8n "Respond to Webhook" node fires 200 immediately and continues execution asynchronously
- [ ] n8n Hostinger instance can POST HTTPS callbacks to Vercel (outbound HTTPS from Hostinger)
