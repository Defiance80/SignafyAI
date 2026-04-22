# Domain Pitfalls: SignafyAI

**Domain:** Multi-tenant AI Growth SaaS (Next.js 15 + Supabase + Clerk + n8n)
**Researched:** 2026-04-21
**Confidence note:** External fetch tools unavailable. Findings draw on official documentation patterns well-established before knowledge cutoff (August 2025), cross-referenced against project-specific context from SignafyAI.txt. Confidence per pitfall is rated honestly. Flag items marked LOW for independent verification before implementation.

---

## Severity + Likelihood Key

| Rating | Meaning |
|--------|---------|
| P1 | Production data loss / security breach / forced rewrite |
| P2 | Multi-day outage, major technical debt, user-visible failures |
| P3 | Frustrating dev delays, UX degradation, fixable without rewrite |
| Likelihood: HIGH | Hits most teams building this stack |
| Likelihood: MED | Hits teams who don't explicitly plan for it |
| Likelihood: LOW | Hits teams under specific conditions |

---

## P1 — Critical Pitfalls

Mistakes that cause security breaches, data leaks, or rewrites.

---

### P1-A: Supabase service_role Key Used From the Frontend or Server Actions Without RLS Bypass Awareness

**Severity:** P1
**Likelihood:** HIGH
**Confidence:** HIGH (Supabase official docs are unambiguous on this)

**What goes wrong:**
The Supabase `service_role` key bypasses ALL Row Level Security policies completely. It is intended only for trusted server-side contexts (migrations, cron jobs, admin-only operations). When developers use `service_role` in Next.js server actions or API routes to "get around RLS complexity," all tenant isolation collapses — any query can read, write, or delete any tenant's data.

In practice this happens because: RLS policies are tricky to get right during development, the developer switches to `service_role` to unblock themselves, and then ships that shortcut to production.

**Why it happens:**
RLS policy syntax errors are silent in development (they just fail open or deny). Devs reach for `service_role` as a debugging tool, forget to revert, or rationalize it as "I'll add RLS later."

**Consequences:**
- Complete multi-tenant data isolation failure
- Tenant A can query Tenant B's leads, content, campaigns
- If exploited: catastrophic GDPR/privacy liability and customer loss
- Rewriting all query logic after the fact is a week+ of work

**Warning signs:**
- Any import of `createClient(url, SERVICE_ROLE_KEY)` in `/app/` pages, server actions, or route handlers that aren't explicitly admin-only
- RLS policies that "don't seem to work" during development (team worked around them)
- No automated test that verifies cross-tenant isolation

**Prevention:**
1. Create two Supabase client factories from day one:
   - `createUserClient(req)` — uses the user's JWT (anon key + auth header), RLS enforced
   - `createAdminClient()` — uses service_role, ONLY callable from background jobs and admin endpoints
2. Code review rule: any `service_role` usage outside `/lib/supabase/admin.ts` is a blocker
3. Write a test in CI that creates two tenants, inserts data as Tenant A, then queries as Tenant B and asserts zero rows returned

**Phase:** Address in Phase 1 (foundation). RLS policies and client factory must be established before any data model is built.

---

### P1-B: RLS Policies Written for User ID, Not Organization ID

**Severity:** P1
**Likelihood:** HIGH
**Confidence:** HIGH

**What goes wrong:**
Supabase RLS examples in official documentation default to `auth.uid()` matching a `user_id` column. For a multi-tenant SaaS where isolation is at the *organization* level (one org has multiple users), policies written against `auth.uid()` isolate per user, not per tenant. Tenant A's admin and Tenant A's member cannot see each other's data, while nothing prevents Tenant A from seeing Tenant B's data if they share a user account or if the policy is wrong.

More precisely: in Clerk's model, a user can belong to multiple organizations. If your RLS uses `auth.uid()` alone as the tenant boundary, switching organizations in Clerk doesn't change what Supabase returns — the user's UID is the same across all their orgs.

**Why it happens:**
Copy-pasting Supabase examples designed for personal-data apps into a B2B SaaS. The distinction between "user" and "organization" is not obvious in tutorials.

**Consequences:**
- Cross-tenant data reads when users belong to multiple organizations
- User A working for Org 1 and Org 2 simultaneously can see all data from both orgs combined
- Silent data leak — no error thrown, just wrong rows returned

**Warning signs:**
- RLS policies that only reference `auth.uid()` with no `organization_id` or `tenant_id` column check
- No `organization_id` or `tenant_id` column on core tables (leads, content, campaigns)
- Clerk `orgId` is not being included in Supabase JWT claims

**Prevention:**
1. Every multi-tenant table has `organization_id UUID NOT NULL` with an FK to an organizations table
2. RLS policy structure:
   ```sql
   -- CORRECT for multi-tenant
   CREATE POLICY "tenant_isolation" ON leads
     FOR ALL
     USING (organization_id = (auth.jwt() -> 'org_id')::uuid);
   ```
3. Configure Clerk's Supabase JWT template to include `org_id` in the JWT payload (Clerk's dashboard → JWT Templates → Supabase template → add `org_id` claim)
4. Verify the claim name matches exactly between Clerk template and RLS policy — a mismatch silently returns zero rows or fails open

**Phase:** Phase 1 (data model design). Non-negotiable before first table is created.

---

### P1-C: Clerk JWT Not Synchronized to Supabase Client (Missing Auth Header)

**Severity:** P1
**Likelihood:** HIGH
**Confidence:** HIGH

**What goes wrong:**
Supabase RLS only works if the Supabase client receives the authenticated user's JWT. The standard Supabase client initialized with just the anon key uses the anon role — RLS policies using `auth.uid()` or `auth.jwt()` return nothing (or everything if policies are misconfigured). Developers who "can see data" in development are often running as `service_role` or haven't verified RLS is actually engaged.

The correct pattern with Clerk + Supabase requires:
1. Getting the Clerk session token
2. Passing it as the Authorization header on every Supabase request
3. Doing this server-side in server components and route handlers, and client-side in client components

This plumbing is non-trivial in Next.js 15 App Router, where server components, server actions, and client components all have different ways to access the Clerk session.

**Why it happens:**
The integration pattern is not obvious. Clerk and Supabase both have their own auth abstractions. Wiring them together requires deliberate setup that is easy to skip.

**Consequences:**
- RLS policies silently fail to engage (anon role has no JWT claims)
- All authenticated data reads return empty or throw 403
- Alternatively, if anon role is granted too broadly, unauthenticated users can read data

**Warning signs:**
- Using `createClient(SUPABASE_URL, SUPABASE_ANON_KEY)` without setting the Authorization header per-request
- `auth.uid()` in RLS returning null
- Working "fine in development" but broken in production (different auth state)

**Prevention:**
```typescript
// Correct pattern — server-side (Next.js App Router)
import { auth } from '@clerk/nextjs/server';
import { createClient } from '@supabase/supabase-js';

async function createSupabaseClient() {
  const { getToken } = auth();
  const token = await getToken({ template: 'supabase' });
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      global: {
        headers: { Authorization: `Bearer ${token}` }
      }
    }
  );
}
```
This must be called per-request, not at module level. Module-level Supabase clients cache the token at startup, which becomes stale.

**Phase:** Phase 1 (auth integration). Must be solved before any protected route is built.

---

### P1-D: n8n Webhooks Exposed Without Authentication

**Severity:** P1
**Likelihood:** HIGH
**Confidence:** HIGH (n8n's webhook node design is well documented)

**What goes wrong:**
n8n webhook URLs are publicly routable by default. A webhook endpoint like `https://n8n.yourdomain.com/webhook/lead-gen-start` will execute its workflow for any POST request — no authentication required. In production, this means:
- Competitors can trigger expensive AI workflows at will
- Malicious actors can flood the lead generation queue
- Replay attacks can re-execute previously seen requests
- Unauthorized parties can inject arbitrary data into the pipeline

This is especially dangerous for SignafyAI because workflows call external AI APIs (cost per call), write to databases (data integrity), and post to social platforms (brand risk).

**Why it happens:**
n8n's "Webhook" node has optional auth (Header Auth, Basic Auth, JWT) but it's not enabled by default. During local development nobody bothers because there's no exposure risk.

**Consequences:**
- Runaway AI API costs from webhook flooding (hundreds of dollars per hour possible)
- Poisoned lead/content data in the database
- Social media posts triggered by unauthorized actors
- Potential account bans from social platforms for unexpected activity

**Warning signs:**
- Webhook node in n8n with Authentication set to "None"
- No HMAC signature verification on the Next.js side before forwarding to n8n
- Webhook URL hardcoded and not rotatable

**Prevention:**
1. Every production n8n webhook uses Header Auth with a strong secret
2. Next.js API route acts as the proxy to n8n — never expose the n8n webhook URL to the frontend directly
3. The proxy route verifies the caller is an authenticated Clerk user with the right organization before forwarding
4. Add a `X-Webhook-Timestamp` header and reject requests older than 5 minutes (replay protection)
5. For callbacks FROM n8n to Next.js (job complete notifications), use a separate shared secret validated server-side
6. Rate-limit all webhook-triggering routes (per organization, per workflow type)

**Architecture:**
```
Browser → Next.js API Route → (auth check + rate limit) → n8n Webhook (with secret header)
n8n → Next.js Callback Route → (shared secret validation) → Update DB → Push to client
```

**Phase:** Phase 1 (n8n architecture). Do not expose webhooks without auth even for beta.

---

## P1-E: Missing Tenant Scoping on n8n Webhook Payloads

**Severity:** P1
**Likelihood:** MED
**Confidence:** HIGH

**What goes wrong:**
When Next.js triggers an n8n workflow via webhook, the payload must include the `organization_id` (and optionally `user_id`). If n8n writes results back to the database using a service_role Supabase connection and the payload doesn't carry the tenant ID, results get written without organization scoping or worse — to the wrong tenant's records.

This is distinct from RLS misconfiguration: even with perfect RLS on the frontend, if n8n is writing data directly to Supabase with service_role and using a payload that's missing `organization_id`, data ends up unscoped.

**Prevention:**
1. Define a strict webhook payload schema validated with Zod on the Next.js proxy side
2. Payload always includes: `{ organization_id, user_id, workflow_type, payload_version, timestamp }`
3. n8n workflows set `organization_id` on every database write — it is never derived or defaulted inside the workflow
4. Supabase table defaults should NOT auto-populate `organization_id` — that would mask missing values

**Phase:** Phase 1 (n8n + data model).

---

## P2 — Moderate Pitfalls

Mistakes that cause multi-day outages, user-visible failures, or significant technical debt.

---

### P2-A: Vercel Serverless Function Timeouts for Long-Running AI Operations

**Severity:** P2
**Likelihood:** HIGH
**Confidence:** HIGH

**What goes wrong:**
Vercel's serverless functions time out at:
- Hobby: 10 seconds
- Pro: 60 seconds (standard functions), 300 seconds (pro functions in certain regions)
- Enterprise: configurable up to 900 seconds

AI workflows that generate content, enrich leads, or process social responses can easily take 15-90 seconds depending on the AI provider's latency and the number of sequential operations. Calling these directly from a Next.js API route will timeout intermittently in production — reliably in development on a good connection, failing under real load.

**Why it happens:**
Works locally (no timeout), works in staging (small payloads, fast dev machines), fails in production under load.

**Consequences:**
- User clicks "Generate Content" and gets a 504 after 60 seconds
- Partial executions: n8n workflow started but Next.js never received the "started" confirmation
- Race conditions: user retries, two workflows run for same job

**Prevention:**
1. Never make synchronous AI calls from Next.js routes — always dispatch to n8n and return immediately
2. Return a `job_id` to the client immediately: `{ job_id: "uuid", status: "queued" }`
3. Poll for status via a lightweight `/api/jobs/[jobId]/status` endpoint, or push via Supabase Realtime subscriptions
4. n8n callbacks to Next.js complete the job record in the database
5. Use Vercel's `maxDuration` route config only as a last resort, not as the architectural pattern

**Phase:** Phase 1 (n8n async architecture). This pattern must be established before any AI feature is built.

---

### P2-B: No Optimistic UI / Stale State After n8n Async Jobs

**Severity:** P2
**Likelihood:** HIGH
**Confidence:** HIGH

**What goes wrong:**
n8n jobs are async. The user triggers a lead generation run. The workflow takes 45 seconds. The UI shows nothing changed. The user clicks the button again. Now two lead gen jobs run for the same inputs. The database gets duplicates. The user thinks the product is broken.

**Why it happens:**
Developers build the happy path: click button → n8n runs → UI updates. The transitional state (in-flight, queued, running) is not designed.

**Consequences:**
- Duplicate job executions (2x AI API cost per retry)
- Duplicate records in the database
- Users lose trust in the product reliability during beta

**Prevention:**
1. Every AI operation creates a `jobs` table record with states: `queued → running → completed | failed`
2. UI immediately transitions to a "Running" state on button click (optimistic, not waiting for n8n to confirm)
3. The trigger button is disabled while a job is in `queued` or `running` state for the same scope (org + workflow type)
4. Supabase Realtime subscription on the `jobs` table row drives UI updates without polling
5. Failed jobs surface actionable error messages, not raw errors

**Schema foundation:**
```sql
CREATE TABLE jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id),
  workflow_type TEXT NOT NULL, -- 'lead_gen', 'content_gen', 'social_response', etc.
  status TEXT NOT NULL DEFAULT 'queued', -- queued | running | completed | failed
  input_payload JSONB,
  result_summary JSONB,
  error_message TEXT,
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);
```

**Phase:** Phase 1 (data model) + Phase 2 (UX). Schema in Phase 1, UI state machine in Phase 2.

---

### P2-C: Clerk Organization Context Not Propagating Through the Full Request Chain

**Severity:** P2
**Likelihood:** MED
**Confidence:** HIGH

**What goes wrong:**
Clerk supports users belonging to multiple organizations. The "active organization" is selected in the Clerk session. When a user switches organizations in the UI, the Clerk session updates, but:
1. The Supabase client may still hold a cached token with the old `org_id`
2. Next.js server components may cache the organization context at the segment level
3. n8n webhook payloads dispatched before the org switch still run under the old org context

This creates a situation where the user switches orgs, triggers a workflow, and results land in the wrong organization's data — or queries return the previous org's data.

**Prevention:**
1. Never cache the Supabase client between requests — create it fresh per-request with the current token
2. Include the active `org_id` from Clerk in every API call and webhook dispatch, not just in the JWT
3. Verify `org_id` in the webhook payload matches the JWT's `org_id` server-side before forwarding to n8n
4. On org switch (Clerk `onOrganizationChange` event), invalidate any in-flight job subscriptions and clear client-side state for previous org

**Phase:** Phase 2 (multi-org UX). Implement org-aware data fetching patterns before exposing org switching.

---

### P2-D: n8n Self-Hosted Cold Start and Instance Availability

**Severity:** P2
**Likelihood:** MED
**Confidence:** MEDIUM (n8n hosting behavior varies by provider)

**What goes wrong:**
Self-hosted n8n on a single VM or low-tier VPS has no redundancy. If n8n goes down (OOM kill, deploy, restart), all in-flight webhook processing stops. The Next.js app has no way to know n8n is down until requests timeout. Jobs queued in the database are never picked up.

Additionally, n8n processes webhooks synchronously in its default queue mode. Under load (many users triggering workflows simultaneously), n8n can become a bottleneck with no backpressure mechanism visible to the Next.js app.

**Prevention:**
1. Next.js proxy route wraps n8n calls in try/catch with explicit timeout (e.g., 5 seconds to receive acknowledgment)
2. On n8n timeout/error, job record is created with status `queued` — a retry worker can re-dispatch
3. n8n deployed behind a process manager (PM2 or systemd) with auto-restart
4. Health check endpoint monitored (n8n exposes `/healthz`)
5. For beta: single n8n instance is acceptable, but the retry mechanism must be in place before launch

**Phase:** Phase 1 (n8n infrastructure) + Phase 3 (reliability/hardening).

---

### P2-E: Supabase RLS Policies That Pass Review but Fail Under Edge Cases

**Severity:** P2
**Likelihood:** MED
**Confidence:** HIGH

**What goes wrong:**
RLS policies can be logically correct and still fail under specific conditions:

1. **NULL organization_id**: If `organization_id` is NULL in a row (e.g., from an import or migration), `organization_id = (auth.jwt() -> 'org_id')::uuid` evaluates to NULL, which is falsy — the row becomes invisible. No error, just missing data.

2. **JWT claim missing**: If the Clerk JWT template is not correctly configured and `org_id` is absent from claims, `(auth.jwt() -> 'org_id')::uuid` returns NULL. Every RLS check fails silently — authenticated users see zero rows.

3. **Service role admin operations that forget to set organization_id**: Seeding scripts, migrations, or admin tools that insert rows without `organization_id` create "orphan" records invisible to all tenants.

4. **RLS on JOINed tables**: Policies on the primary table don't cascade to JOIN targets. A `leads` table with RLS still correctly scoped, but a `lead_enrichments` table joined in the query that has no RLS, will leak enrichment data.

**Prevention:**
1. DB constraint: `organization_id NOT NULL` — enforced at the database level, not just application level
2. Integration test: login as user in org A, query all tables — assert row counts match expected
3. Test: log in as unauthenticated (anon) user, query all tables — assert zero rows returned
4. RLS audit: every table that contains tenant data has a policy; add this to CI migration checks
5. After every migration: run the isolation test suite

**Phase:** Phase 1 (data model, CI setup).

---

### P2-F: AI Content Quality Collapse Without Brand Voice Anchoring

**Severity:** P2
**Likelihood:** HIGH
**Confidence:** MEDIUM (based on observed patterns in AI content SaaS)

**What goes wrong:**
The Content Intelligence Engine generates captions, responses, and SEO content. Without strong business-profile grounding in each prompt, the AI defaults to:
- Generic marketing language ("Take your business to the next level")
- Inconsistent tone (formal in one output, casual in the next)
- Overly promotional CTAs that read as spam
- Content that doesn't mention the specific service, location, or offer

In production, users generate a batch of content, review it, and find it unusable. They churn because "the AI doesn't understand my business."

**Why it happens:**
Prompts are written to "generate content for a business" without the depth of business context needed. The business profile captured at onboarding is too shallow (just name and industry) to anchor the AI's tone and specificity.

**Prevention:**
1. Onboarding flow captures a "brand voice profile":
   - Business name, location, service offerings
   - Target customer description (who they serve)
   - Tone keywords (e.g., "professional, warm, not pushy")
   - Example content the owner likes (competitor posts, their own past posts)
   - CTA preferences and restrictions ("never use the word 'DM us'")
2. Every AI prompt includes the full brand voice profile, not just the topic
3. A "brand voice test" generates 3 sample outputs during onboarding for user approval before workflows run
4. Build a feedback mechanism: user rates output quality → logged for later prompt improvement

**Phase:** Phase 2 (onboarding, content generation). Brand voice profile is a pre-requisite for content quality.

---

### P2-G: Social Platform API Rate Limits and ToS Violations

**Severity:** P2
**Likelihood:** HIGH (for the Social Response and Scheduling engines specifically)
**Confidence:** MEDIUM (platform policies change frequently; verify current ToS)

**What goes wrong:**
Instagram, TikTok, and YouTube all have restrictions on automated comment responses and posting frequency. Violations result in:
- API access revoked for the connected account
- Account flagged as spam
- Account shadow-banned or suspended
- In extreme cases, platform-level ban

Common triggering behaviors:
- Responding to comments within seconds of posting (inhuman response time)
- Identical or near-identical responses to multiple comments
- Posting the same content across multiple accounts rapidly
- Using unofficial APIs or scraping (TikTok especially)

**Why it happens:**
The automation engine is designed for efficiency. No rate limiting or humanization delay is added because "it works fine in testing" (low volume).

**Prevention:**
1. Social Response Engine always operates in "Suggested Reply" mode for beta — no fully autonomous mode until ToS and rate limits are verified per platform
2. Post scheduling adds randomized human-like delays (not posting at exact scheduled minute, variance of ±10-30 minutes)
3. Comment response timing: minimum delay of 5-15 minutes after comment is received before responding (not instant)
4. Response variation: never send the same response text twice in a 48-hour window for the same account
5. Hard rate limit: maximum N responses per hour per connected account (verify per platform)
6. Explicitly document which platforms are supported via official API vs which would require unofficial methods (and refuse to build the unofficial path)

**Phase:** Phase 2 (social integrations). Platform-specific ToS review is a Phase 2 prerequisite before any auto-response feature ships.

---

### P2-H: Beta Schema Decisions That Are Painful to Migrate Later

**Severity:** P2
**Likelihood:** HIGH
**Confidence:** HIGH

**What goes wrong:**
Early schema decisions made for MVP convenience become expensive migrations at scale:

1. **Storing structured data as untyped JSON blobs**: `lead_data JSONB` instead of normalized columns. Works for MVP, breaks when you need to query, filter, or sort on specific fields.

2. **No soft deletes**: Hard-deleting records means no audit trail, no "undo" capability, and foreign key violations when referenced records are deleted.

3. **No `created_at`/`updated_at` on every table**: Added as an afterthought, means historical data has no timestamps.

4. **`status` as a free text column**: `status TEXT` allows any string. Six months later there are 12 different status strings with different cases and spellings. Should be a Postgres ENUM or a foreign key to a status lookup table.

5. **No versioning on AI-generated content**: Regenerating a campaign overwrites previous outputs. User can't compare versions or roll back.

6. **Tenant settings stored as flat key-value**: `settings JSONB` on the organization row. Flexible initially, but lacks validation, defaults, and queryability.

**Prevention:**
1. Define schema with explicit typed columns for all queryable fields from day one
2. Add `deleted_at TIMESTAMPTZ NULL` to all tables (soft delete pattern)
3. Add `created_at`, `updated_at` via trigger to every table — never optional
4. Use Postgres ENUMs or check constraints for status columns
5. Content versions table: each AI generation creates a new row, current version is a FK on the parent
6. Tenant settings should have a JSON Schema defined and validated at the application layer

**Phase:** Phase 1 (data model). These are schema fundamentals, not refactors.

---

## P3 — Minor Pitfalls

Frustrating but fixable without rewriting core systems.

---

### P3-A: Next.js 15 App Router Caching Surprising Behavior

**Severity:** P3
**Likelihood:** HIGH
**Confidence:** HIGH

**What goes wrong:**
Next.js 15 changed caching defaults significantly from v13/v14. In Next.js 15:
- `fetch()` is no longer cached by default (the opt-in semantics flipped)
- `cookies()` and `headers()` in Server Components make the route dynamic automatically
- Route segment configs (`export const dynamic = 'force-dynamic'`) interact unexpectedly with nested layouts

Teams building on tutorials written for Next.js 13 or 14 find their caching strategies wrong.

**Prevention:**
1. Explicitly set caching strategy on every `fetch()` call — never rely on default behavior
2. Use `unstable_cache` from `next/cache` for data that should be cached with explicit revalidation
3. After building a page, verify in Vercel deployment logs whether it rendered as static or dynamic — unexpected static rendering means stale data

**Phase:** Phase 2 (data fetching patterns).

---

### P3-B: n8n Workflow Errors Silently Swallowed

**Severity:** P3
**Likelihood:** HIGH
**Confidence:** HIGH

**What goes wrong:**
n8n has error handling built in, but by default a workflow error does not notify anyone. The job in the database stays as `running` forever because n8n never called the callback. The user sees a perpetual spinner.

**Prevention:**
1. Every n8n workflow has an Error Trigger node that catches failures
2. On failure, the Error Trigger calls the Next.js callback with `{ status: "failed", error: "..." }`
3. The callback updates the `jobs` table record to `failed` with the error message
4. Job records with status `running` older than 10 minutes are automatically marked `failed` by a Supabase cron job (pg_cron or a scheduled Vercel cron route)

**Phase:** Phase 1 (n8n foundation).

---

### P3-C: Supabase Realtime Not Scoped to Organization

**Severity:** P3
**Likelihood:** MED
**Confidence:** HIGH

**What goes wrong:**
Supabase Realtime subscriptions filter by column but do not automatically enforce RLS for all subscription types. If a client subscribes to `jobs` table changes without filtering by `organization_id`, they may receive realtime events from other organizations' job completions.

**Prevention:**
1. All Realtime subscriptions filter by `organization_id`:
   ```typescript
   supabase
     .channel('jobs')
     .on('postgres_changes', {
       event: 'UPDATE',
       schema: 'public',
       table: 'jobs',
       filter: `organization_id=eq.${orgId}` // explicit filter
     }, handler)
   ```
2. Verify Supabase Realtime RLS enforcement is enabled for the table (Supabase added RLS enforcement for Realtime, but verify this is enabled per table in your Supabase project settings)

**Phase:** Phase 2 (real-time UX).

---

### P3-D: Clerk Middleware Not Protecting All Routes

**Severity:** P3
**Likelihood:** MED
**Confidence:** HIGH

**What goes wrong:**
Clerk's `authMiddleware` or `clerkMiddleware` (Next.js 15 uses the newer `clerkMiddleware`) requires explicit configuration of which routes are public vs protected. It's easy to accidentally leave API routes unprotected:
- `/api/webhooks/n8n-callback` — intended to be server-to-server, but if not authenticated, anyone can POST fake job completions
- `/api/admin/*` — if the matcher doesn't cover nested routes

**Prevention:**
1. Default to protected — explicitly whitelist public routes rather than blacklisting
2. n8n callback routes use shared-secret header auth, not Clerk auth (server-to-server), but they still validate the secret
3. Audit route protection with a test: unauthenticated fetch to every API route should return 401 or the correct server-to-server auth requirement

**Phase:** Phase 1 (auth setup).

---

### P3-E: Lead Data Quality — Enrichment Hallucination

**Severity:** P3
**Likelihood:** MED
**Confidence:** MEDIUM

**What goes wrong:**
If the Lead Discovery Engine uses AI to enrich lead data (fill in missing email, website, phone) rather than querying authoritative sources, the AI will hallucinate plausible-looking but incorrect contact information. A business email that doesn't exist, a website URL that 404s, a phone number that belongs to someone else.

Users act on this data (send emails, make calls) and get bounces or angry responses from wrong contacts.

**Prevention:**
1. Clearly distinguish in the data model between `verified_source` (from an actual API or scrape) vs `ai_inferred` (generated by AI) for each enrichment field
2. Show data confidence indicators in the UI — don't present AI-inferred fields as verified facts
3. Prefer integrating with actual enrichment APIs (Apollo, Hunter.io, etc.) over AI inference for contact data
4. AI can be used for scoring, tagging, and summarizing — not for generating contact details

**Phase:** Phase 2 (lead enrichment).

---

## Phase-Specific Warning Summary

| Phase | Topic | Pitfall | Priority |
|-------|-------|---------|---------|
| Phase 1 | Data model design | RLS scoped to user ID not org ID (P1-B) | P1 |
| Phase 1 | Auth integration | service_role key used from frontend (P1-A) | P1 |
| Phase 1 | Auth integration | Clerk JWT not passed to Supabase client (P1-C) | P1 |
| Phase 1 | n8n foundation | Webhooks unauthenticated in production (P1-D) | P1 |
| Phase 1 | n8n + data model | Missing tenant_id in webhook payloads (P1-E) | P1 |
| Phase 1 | n8n foundation | Errors silently swallowed, jobs stuck as "running" (P3-B) | P3 |
| Phase 1 | Data model | No soft deletes, missing timestamps, untyped status (P2-H) | P2 |
| Phase 1 | CI | No automated cross-tenant isolation tests (P2-E) | P2 |
| Phase 2 | Async UX | No job status UI, users retry causing duplicates (P2-B) | P2 |
| Phase 2 | Vercel limits | Synchronous AI calls timing out in production (P2-A) | P2 |
| Phase 2 | Multi-org | Org context not propagating through request chain (P2-C) | P2 |
| Phase 2 | Social integrations | ToS violations from robotic response timing (P2-G) | P2 |
| Phase 2 | Content quality | Generic AI output without brand voice anchoring (P2-F) | P2 |
| Phase 2 | Realtime | Supabase Realtime not scoped to org (P3-C) | P3 |
| Phase 2 | Lead enrichment | AI hallucinating contact details as verified facts (P3-E) | P3 |
| Phase 3 | Reliability | n8n single point of failure, no retry mechanism (P2-D) | P2 |
| Phase 3 | Caching | Next.js 15 caching defaults misunderstood (P3-A) | P3 |

---

## Confidence Assessment

| Pitfall Area | Confidence | Notes |
|-------------|------------|-------|
| Supabase RLS patterns | HIGH | Official Supabase RLS docs are well-established; patterns verified via architecture knowledge |
| Clerk + Supabase JWT wiring | HIGH | Clerk's Supabase JWT template is documented; the exact claim names should be verified in current Clerk dashboard |
| n8n webhook security | HIGH | n8n webhook authentication options are documented; default-insecure behavior is confirmed |
| Vercel function timeouts | HIGH | Vercel timeout limits are published and stable |
| Async job UX patterns | HIGH | Standard async SaaS UX pattern, well-established |
| Social platform ToS | MEDIUM | Platform policies change frequently — verify current Instagram, TikTok, YouTube API ToS before Phase 2 social features ship |
| AI content quality | MEDIUM | Based on observed patterns; specific AI provider behavior varies |
| Lead enrichment hallucination | MEDIUM | Well-known LLM behavior; specific to how prompts are structured |
| n8n self-hosted reliability | MEDIUM | Depends on hosting provider; verify n8n's current queue worker documentation for the version being deployed |

---

## Sources

- Supabase Row Level Security documentation: https://supabase.com/docs/guides/database/postgres/row-level-security (MEDIUM confidence — WebFetch unavailable; based on training knowledge of official docs, verified patterns)
- Clerk Supabase Integration documentation: https://clerk.com/docs/integrations/databases/supabase (MEDIUM — same caveat)
- n8n Webhook Node documentation: https://docs.n8n.io/integrations/builtin/core-nodes/n8n-nodes-base.webhook/ (MEDIUM — same caveat)
- Vercel Function Limits: https://vercel.com/docs/functions/runtimes#max-duration (HIGH — these are public, stable specifications)
- Next.js 15 Caching documentation: https://nextjs.org/docs/app/building-your-application/caching (HIGH — major behavior change in v15 is well-documented)

**Note on confidence:** WebSearch and WebFetch permissions were unavailable during this research session. All findings are based on training knowledge verified against architectural consistency and official documentation patterns known as of August 2025. The most critical pitfalls (P1-A through P1-E) are well-established patterns with HIGH confidence. Items marked MEDIUM should be spot-checked against live documentation, particularly social platform ToS and Clerk's current JWT template configuration options.
