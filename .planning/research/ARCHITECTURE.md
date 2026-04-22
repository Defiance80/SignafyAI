# Architecture Patterns: SignafyAI

**Domain:** Multi-tenant AI SaaS — control dashboard + n8n automation backend
**Researched:** 2026-04-21
**Confidence note:** WebSearch and WebFetch were blocked in this environment. All patterns below are derived from the project spec (SignafyAI.txt), verified architectural knowledge of Next.js 15, Supabase RLS, Clerk organizations, and n8n webhook mechanics. Confidence is tagged per claim. Nothing is padded from unverified sources.

---

## 1. System Overview

SignafyAI is a two-plane system:

```
CONTROL PLANE (Next.js on Vercel)
  - Presents UI to tenant users
  - Owns the data model (Supabase)
  - Owns authentication and tenant identity (Clerk)
  - Dispatches work orders to the processing plane
  - Receives and stores results from the processing plane
  - Exposes real-time job status to the UI

PROCESSING PLANE (n8n self-hosted on Hostinger)
  - Executes all heavy/async AI workflows
  - Has NO direct database access (all writes go back through Next.js API)
  - Receives structured payloads from the control plane via webhook
  - Sends structured results back via callback URL
  - Has no user-facing surface
```

The two planes communicate exclusively through HTTP:
- Control → Processing: `POST /webhook/{workflow-name}` with signed payload
- Processing → Control: `POST /api/internal/n8n/callback` with signed result

---

## 2. Component Boundaries

| Component | Plane | Responsibility | Communicates With |
|-----------|-------|---------------|-------------------|
| Next.js App Router (pages/layouts) | Control | UI rendering, routing, user-facing pages | Supabase (read), Next.js API routes |
| Next.js API Routes (`/api/`) | Control | Business logic, auth validation, n8n dispatch, callback ingestion | Clerk (auth), Supabase (read/write), n8n (webhook out) |
| Clerk | External (Control) | Auth sessions, org membership, role claims | Next.js middleware, API routes |
| Supabase Postgres + RLS | Control | Persistent data store, tenant isolation, real-time push | Next.js API routes, Supabase Realtime → browser |
| Supabase Realtime | Control | Push job status changes to browser without polling | Browser SSE/WS, written by API route |
| n8n Webhooks (inbound) | Processing | Entry points for each workflow group | Next.js API routes (callers) |
| n8n Workflows | Processing | AI processing, enrichment, content generation, scheduling | External APIs (OpenAI, social platforms, etc.) |
| n8n Callback (outbound) | Processing | Returns results to control plane | Next.js `/api/internal/n8n/callback` |

**Hard boundary rule:** n8n never writes to Supabase directly. All database writes from the processing plane happen through authenticated Next.js API callback routes. This keeps RLS enforcement centralized and prevents credential sprawl.

**Confidence: HIGH** — This boundary is derived from the project spec's explicit design intent: "Next.js API route → n8n webhook → n8n processes → n8n calls back to Next.js API endpoint → stored in Supabase."

---

## 3. Data Flow Diagrams

### 3a. Standard Async Job (e.g., Lead Discovery)

```
Browser (Tenant User)
  │
  │  [1] POST /api/leads/run  { org_id, search_params }
  ▼
Next.js API Route: /api/leads/run
  │  [2] Validate Clerk session + org membership
  │  [3] INSERT workflow_runs row  { status: "queued", job_id: uuid }
  │  [4] POST to n8n webhook URL with { job_id, org_id, tenant_context, params }
  │       └─ n8n returns 200 immediately (fire-and-forget)
  │  [5] Return { job_id } to browser with 202 Accepted
  │
  ▼
Browser
  │  [6] Subscribes to Supabase Realtime channel: workflow_runs:id=eq.{job_id}
  │       (or polls GET /api/jobs/{job_id} every N seconds — fallback)
  │
  ▼
n8n Workflow (Hostinger, async)
  │  [7] Processes: AI calls, external APIs, enrichment
  │  [8] Builds result payload: { job_id, org_id, results: [...], status: "done" }
  │  [9] POST to https://app.signafyai.com/api/internal/n8n/callback
  │
  ▼
Next.js API Route: /api/internal/n8n/callback
  │  [10] Validate HMAC signature on payload
  │  [11] Resolve org_id from job_id (lookup workflow_runs)
  │  [12] INSERT leads rows (scoped to org_id)
  │  [13] UPDATE workflow_runs: { status: "complete", completed_at: now }
  │  [14] Supabase Realtime fires → browser receives update
  │
  ▼
Browser
  [15] UI updates: shows results, dismisses loading state
```

### 3b. Synchronous Quick Job (e.g., single content variant generation)

```
Browser
  │  [1] POST /api/content/generate  { org_id, content_params }
  ▼
Next.js API Route: /api/content/generate
  │  [2] Validate Clerk session
  │  [3] POST to n8n webhook (same as above, but n8n returns result inline)
  │       └─ n8n response body contains the result (< 5s jobs only)
  │  [4] INSERT content_items row with result
  │  [5] Return result to browser with 200
  ▼
Browser
  [6] UI updates immediately
```

**Note:** Only use synchronous (inline response) pattern for jobs reliably completing under Vercel's function timeout (default 10s, Pro plan 60s, Edge runtime 30s). All AI-heavy jobs must use the async pattern.

**Confidence: HIGH** — Vercel timeout limits are well-documented and this constraint drives the async/sync split.

### 3c. n8n → Supabase Realtime notification path (alternative to polling)

```
n8n callback hits /api/internal/n8n/callback
  │
  ▼
API route UPDATEs workflow_runs row in Supabase
  │
  ▼
Supabase Realtime broadcasts change on postgres_changes channel
  │
  ▼
Browser (subscribed via supabase-js Realtime client) receives event
  │
  ▼
React state update → UI renders results
```

This is preferred over client polling because it eliminates unnecessary requests and gives sub-second UI updates. Polling at 5s intervals is the fallback for environments where Realtime is flaky or the browser connection is dropped.

---

## 4. Multi-Tenant Isolation Strategy (Supabase RLS)

### 4a. Tenant Identity Flow

```
Clerk Session Token
  │ contains: { sub: user_id, org_id: "org_xxxx", org_role: "admin" }
  ▼
Next.js API Route extracts org_id from Clerk session
  ▼
All Supabase queries include .eq('org_id', org_id) at application layer
  ▼
RLS policies enforce same constraint at database layer (defense in depth)
```

### 4b. RLS Policy Pattern

Every tenant-scoped table has `org_id uuid NOT NULL` as a foreign key to the `organizations` table.

**Standard RLS policy for SELECT:**
```sql
CREATE POLICY "tenant_select"
ON leads
FOR SELECT
USING (
  org_id = (
    SELECT org_id
    FROM memberships
    WHERE user_id = auth.uid()
  )
);
```

**Standard RLS policy for INSERT:**
```sql
CREATE POLICY "tenant_insert"
ON leads
FOR INSERT
WITH CHECK (
  org_id = (
    SELECT org_id
    FROM memberships
    WHERE user_id = auth.uid()
  )
);
```

**For the n8n callback route** (service role key, not user JWT):
The callback API route uses the Supabase **service role key** (server-side only, never exposed to browser). It bypasses RLS but must validate the `org_id` from the resolved `workflow_runs` row before writing any data. This is the trust boundary: callback route is the only place service role is used, and it always resolves org_id from the verified job record.

**Confidence: HIGH** — Supabase RLS pattern for multi-tenant orgs using auth.uid() is well-documented in official Supabase guides and is the standard approach for this stack.

### 4c. Supabase Client Strategy

```
Browser (anon key + user JWT)  → RLS-enforced reads, never writes secrets
Next.js Server Components       → Service role for admin queries, anon key with session for user queries
API Routes (user actions)       → createServerClient() with user's JWT from Clerk
API Routes (n8n callbacks)      → createServiceRoleClient() — org_id validated manually
```

**Rule:** Never send the service role key to the browser. Never use it in client components.

### 4d. Critical Isolation Tables

```
organizations          ← root tenant entity
  │
  ├── memberships      ← user ↔ org relationship + role
  ├── business_profiles ← org-specific config (brand voice, etc.)
  ├── leads            ← all scoped to org_id
  ├── content_items    ← all scoped to org_id
  ├── workflow_runs    ← job tracking, scoped to org_id
  ├── social_messages  ← scoped to org_id
  ├── campaigns        ← scoped to org_id
  └── analytics_events ← scoped to org_id
```

---

## 5. Webhook Security Pattern

### 5a. Next.js → n8n (outbound)

The API route authenticates to n8n using a **shared secret in the Authorization header**:

```typescript
// Next.js API route dispatching to n8n
await fetch(process.env.N8N_WEBHOOK_URL_LEADS, {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${process.env.N8N_WEBHOOK_SECRET}`,
  },
  body: JSON.stringify({ job_id, org_id, params }),
})
```

In n8n, the Webhook node is configured to require a Header Auth credential matching this secret. Without it, n8n rejects the request.

**Confidence: HIGH** — n8n Webhook node supports Header Auth natively. This is the standard way to secure inbound n8n webhooks.

### 5b. n8n → Next.js (callback, inbound)

n8n POSTs results back with an HMAC-SHA256 signature header:

```typescript
// n8n Function node: sign payload before sending
const payload = JSON.stringify(resultData);
const signature = crypto.createHmac('sha256', process.env.CALLBACK_SECRET).update(payload).digest('hex');
// Sends X-Signify-Signature: sha256=<hex>
```

The Next.js callback route verifies before processing:

```typescript
// /api/internal/n8n/callback
export async function POST(req: Request) {
  const rawBody = await req.text();
  const signature = req.headers.get('x-signify-signature');
  const expected = `sha256=${createHmac('sha256', process.env.N8N_CALLBACK_SECRET!).update(rawBody).digest('hex')}`;

  if (!timingSafeEqual(Buffer.from(signature ?? ''), Buffer.from(expected))) {
    return new Response('Unauthorized', { status: 401 });
  }

  const data = JSON.parse(rawBody);
  // ... process
}
```

Additionally: the callback route is NOT protected by Clerk middleware (it's a machine-to-machine endpoint), but it IS protected by HMAC. Add it to the Clerk `publicRoutes` matcher so Clerk doesn't redirect it.

**Confidence: HIGH** — HMAC-SHA256 verification using `crypto.timingSafeEqual` is the standard pattern for webhook security, used by Stripe, GitHub, and documented extensively. The Clerk public routes pattern is documented in Clerk's official Next.js guide.

### 5c. IP Allowlisting (optional but recommended for Hostinger)

If the n8n Hostinger server has a static IP, allowlist it in the Next.js callback route as an additional defense layer. Check `req.headers.get('x-forwarded-for')` on Vercel (note: `x-real-ip` is more reliable on Vercel's infrastructure).

---

## 6. Async Job State Machine

Each workflow_run row tracks job lifecycle. All state transitions happen in the callback API route.

```
STATES:
  queued     → job_id created, payload sent to n8n, awaiting processing
  running    → n8n has acknowledged start (optional intermediate state)
  complete   → n8n returned results, data written to target tables
  failed     → n8n returned error OR callback timeout exceeded
  cancelled  → user cancelled before completion

TRANSITIONS:
  queued   → running   (n8n sends progress ping — optional)
  queued   → complete  (n8n sends result in single callback)
  queued   → failed    (n8n sends error callback OR timeout job fires)
  running  → complete
  running  → failed
  any      → cancelled (user action, API route flips state)

TIMEOUT HANDLING:
  A Vercel cron job (or Supabase scheduled function) runs every 15 minutes.
  Any workflow_run in state "queued" or "running" for > 30 minutes is
  flipped to "failed" with reason "timeout". This prevents UI from
  showing perpetual spinners.
```

```sql
CREATE TABLE workflow_runs (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id      uuid NOT NULL REFERENCES organizations(id),
  workflow    text NOT NULL,  -- e.g., 'lead_discovery', 'content_gen'
  status      text NOT NULL DEFAULT 'queued',
  payload     jsonb,          -- what was sent to n8n
  result      jsonb,          -- what came back (nullable until complete)
  error       text,
  created_at  timestamptz DEFAULT now(),
  updated_at  timestamptz DEFAULT now(),
  completed_at timestamptz
);
```

RLS: scoped to org_id via standard SELECT policy.

---

## 7. Real-Time Status Pattern

**Recommended:** Supabase Realtime on `workflow_runs` table.

```typescript
// Client-side: subscribe to a specific job
const channel = supabase
  .channel(`job:${jobId}`)
  .on('postgres_changes', {
    event: 'UPDATE',
    schema: 'public',
    table: 'workflow_runs',
    filter: `id=eq.${jobId}`,
  }, (payload) => {
    setJobStatus(payload.new.status);
    if (payload.new.status === 'complete') {
      refetchResults(); // fetch the actual result data
    }
  })
  .subscribe();

return () => supabase.removeChannel(channel);
```

**Fallback:** Poll `GET /api/jobs/{jobId}` every 5 seconds if Realtime subscription fails (network issues, browser tab in background).

**Do NOT** use Server-Sent Events (SSE) from a Next.js route for this — it works on Vercel but has edge cases with connection limits. Supabase Realtime is a better fit because it's already in the stack and handles reconnection.

**Confidence: MEDIUM** — Supabase Realtime postgres_changes API is documented and stable. The recommendation to prefer Supabase Realtime over Next.js SSE for this use case is based on operational simplicity, not a formal source comparison.

---

## 8. n8n Workflow Architecture

Each workflow group maps to one or more n8n webhook entry points:

```
WORKFLOW GROUP          N8N WEBHOOK URL                      TRIGGER SOURCE
─────────────────────────────────────────────────────────────────────────────
Lead Discovery          /webhook/lead-discovery              /api/leads/run
Content Intelligence    /webhook/content-generate            /api/content/generate
Social Response         /webhook/social-classify             /api/social/process
SEO Traffic Support     /webhook/seo-research                /api/seo/run
Campaign Scheduler      /webhook/campaign-schedule           /api/campaigns/schedule
Analytics Sync          /webhook/analytics-sync              Cron: /api/cron/analytics
```

**Each workflow internal structure:**
```
Webhook (entry) →
  [Validate secret] →
  [Parse payload, extract org_id + job_id] →
  [Execute AI/processing steps] →
  [Build result payload + sign] →
  HTTP Request node → POST /api/internal/n8n/callback
```

n8n should respond to the initial webhook with `{ status: "accepted", job_id }` immediately and process asynchronously. This avoids holding the Next.js API route open.

**Confidence: MEDIUM** — n8n's async webhook response pattern (respond immediately, process in background) is a known n8n pattern using the "Respond to Webhook" node + continued execution. The exact node configuration should be verified in n8n docs when building.

---

## 9. Next.js Project Structure (Recommended)

```
/app
  /(marketing)             ← public pages (homepage, pricing, etc.)
  /(auth)                  ← Clerk sign-in/sign-up pages
  /(app)                   ← authenticated app shell
    /dashboard
    /leads
    /content
    /social
    /seo
    /campaigns
    /analytics
    /settings
    /admin                 ← platform owner only (role check)
  /api
    /leads/run             ← dispatches to n8n
    /content/generate
    /social/process
    /seo/run
    /campaigns/schedule
    /jobs/[jobId]          ← job status endpoint (polling fallback)
    /internal
      /n8n/callback        ← receives n8n results (HMAC protected)
    /cron
      /analytics           ← Vercel cron job

/lib
  /supabase
    /client.ts             ← anon client (browser)
    /server.ts             ← server client (API routes, server components)
    /service.ts            ← service role client (callbacks only)
  /clerk
    /auth.ts               ← session extraction helpers
  /n8n
    /dispatch.ts           ← typed dispatch functions per workflow
    /verify.ts             ← HMAC verification
  /db
    /schema.ts             ← Supabase types (generated or manual)

/components
  /ui                      ← shadcn/ui components
  /dashboard               ← dashboard-specific components
  /leads
  /content
  /jobs
    /JobStatusBadge.tsx
    /useJobStatus.ts       ← Realtime subscription hook

/middleware.ts             ← Clerk auth middleware
```

---

## 10. Patterns to Follow

### Pattern 1: Tenant Context Propagation

Every API route extracts `org_id` from Clerk session at the top. Never trust `org_id` from the request body — derive it from the authenticated session.

```typescript
// /api/leads/run
import { auth } from '@clerk/nextjs/server';

export async function POST(req: Request) {
  const { userId, orgId } = await auth();
  if (!userId || !orgId) return new Response('Unauthorized', { status: 401 });

  // orgId is now verified by Clerk — safe to use for all DB queries
  const body = await req.json();
  // ...
}
```

**Confidence: HIGH** — Clerk server-side `auth()` returning `orgId` is documented in Clerk's Next.js App Router guide.

### Pattern 2: Structured n8n Payload Contract

Define a TypeScript interface for every n8n payload to catch mismatches at build time:

```typescript
// /lib/n8n/dispatch.ts
export interface LeadDiscoveryPayload {
  job_id: string;
  org_id: string;
  workflow: 'lead_discovery';
  params: {
    industry: string;
    location: string;
    keywords: string[];
    source?: string;
  };
  callback_url: string;
  callback_secret_hint: string; // hash prefix for HMAC verification context
}

export async function dispatchLeadDiscovery(
  payload: LeadDiscoveryPayload
): Promise<{ accepted: boolean }> {
  const res = await fetch(process.env.N8N_WEBHOOK_LEAD_DISCOVERY!, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${process.env.N8N_WEBHOOK_SECRET}`,
    },
    body: JSON.stringify(payload),
  });
  return { accepted: res.ok };
}
```

### Pattern 3: Callback Route as the Single Write Gate

The `/api/internal/n8n/callback` route is the only place results from n8n are written. It:
1. Verifies HMAC
2. Resolves org_id from job_id (never trusts org_id in callback body)
3. Uses service role client to write results
4. Updates workflow_run status
5. Returns 200 or 422 (never 500 — n8n may retry on 5xx)

```typescript
// Always return a definitive response to n8n — avoid retries on success
return Response.json({ received: true }, { status: 200 });
```

### Pattern 4: RLS + Application-Layer Defense in Depth

Never rely on RLS alone. Application layer always adds `.eq('org_id', orgId)` even when RLS would catch it. RLS is the last line of defense, not the first.

---

## 11. Anti-Patterns to Avoid

### Anti-Pattern 1: Direct Supabase Access from n8n

**What:** Giving n8n the Supabase service role key and having n8n write directly to tables.
**Why bad:** Bypasses RLS, creates credential sprawl, n8n has access to all tenant data, loses audit trail, callback pattern breaks.
**Instead:** All writes happen through the authenticated callback API route. n8n only ever calls `/api/internal/n8n/callback`.

### Anti-Pattern 2: Trusting org_id from Request Body

**What:** Using `req.body.org_id` to scope database queries instead of deriving org_id from Clerk session.
**Why bad:** Any authenticated user could pass any org_id and read/write another tenant's data (IDOR vulnerability).
**Instead:** Always derive org_id from `auth()` from Clerk. Reject if org_id in body doesn't match session org_id.

### Anti-Pattern 3: Synchronous n8n Calls for Heavy Jobs

**What:** Awaiting n8n webhook response for AI processing jobs within a Next.js API route.
**Why bad:** Vercel function timeout (10s default, 60s Pro) will kill the connection before n8n finishes. The UI gets a 504, the job may or may not have run.
**Instead:** Fire-and-forget to n8n (expect 200 immediately), return job_id with 202, let Realtime/polling deliver results.

### Anti-Pattern 4: Polling from Client on Every Page Load

**What:** Every component that cares about job status sets up its own polling interval.
**Why bad:** 10 components x 5s poll = 2 req/s per user. Suites get throttled quickly on Vercel + Supabase free tiers.
**Instead:** One global Realtime subscription per job, invalidate React Query cache on status change.

### Anti-Pattern 5: Unprotected Callback Endpoint

**What:** `/api/internal/n8n/callback` with no authentication — "it's internal, n8n is the only caller."
**Why bad:** The URL is discoverable. Anyone can POST fake results, mark jobs complete, inject data into tenant records.
**Instead:** HMAC verification on every request. Reject and log anything without valid signature.

### Anti-Pattern 6: Shared Supabase Tables Without org_id

**What:** Tables like `keyword_clusters` or `brand_voices` missing `org_id` because "each org only has one."
**Why bad:** One missing column breaks RLS for that table. As soon as you add the second tenant, data bleeds.
**Instead:** Every table that could ever be per-tenant gets `org_id NOT NULL` from day one.

---

## 12. Scalability Considerations

| Concern | At 100 tenants | At 1,000 tenants | At 10,000 tenants |
|---------|---------------|------------------|-------------------|
| n8n load | Single instance fine | Monitor queue depth; consider n8n queue mode | n8n queue mode + Redis required; consider n8n cloud |
| Supabase RLS | Negligible overhead | RLS policy indexes critical | Partition by org_id for large tables |
| Vercel functions | Well within limits | Monitor cold starts on burst | Consider edge functions for auth-only routes |
| Supabase Realtime | Fine on free tier | Monitor connection count (free: 200) | Need Pro plan for concurrent connections |
| Callback route | Single route handles all | Rate-limit by org_id to prevent abuse | Add queue (e.g., Upstash Redis) in front of callback |

**n8n queue mode note:** By default n8n uses in-memory execution. For production with concurrent users, n8n should be configured with queue mode using Redis (BullMQ). This is a Hostinger/server configuration concern, not a Next.js concern. Flag this for the n8n setup phase.

**Confidence: MEDIUM** — n8n queue mode with Redis is documented in n8n's self-hosting guide. The scaling thresholds are estimates based on Supabase's documented tier limits and Vercel's concurrency model.

---

## 13. Suggested Build Order (with Dependency Reasoning)

```
PHASE 1: Foundation (unblocks everything)
  ─ Supabase schema: organizations, memberships, workflow_runs tables
  ─ Supabase RLS policies on all tables
  ─ Clerk setup: organizations enabled, roles configured
  ─ Next.js middleware: Clerk auth guard
  ─ /api/internal/n8n/callback: HMAC-verified callback receiver + DB writer
  ─ /lib/n8n/dispatch.ts: typed dispatch helpers
  WHY FIRST: All features depend on auth + tenant isolation. Callback route
  is the integration seam — builds confidence in the n8n ↔ Next.js contract.

PHASE 2: n8n Workflow Skeleton (can parallel with Phase 1 frontend)
  ─ n8n webhook entry point per workflow group (6 webhooks)
  ─ n8n header auth on each webhook
  ─ n8n → Next.js callback with HMAC signing
  ─ workflow_runs state machine working end-to-end (queued → complete)
  WHY SECOND: The job dispatch/callback loop must be verified before
  building any feature that depends on it. One working workflow proves
  the entire async pattern.

PHASE 3: Onboarding + Business Profile
  ─ Clerk org creation flow
  ─ Business profile wizard → writes to business_profiles table
  ─ Brand voice storage
  WHY THIRD: All n8n payloads include business profile context. Nothing
  useful runs without this data. Must exist before any workflow is useful.

PHASE 4: Leads Module
  ─ /api/leads/run → dispatches lead discovery workflow
  ─ leads table + RLS
  ─ Realtime job status hook
  ─ Leads UI: launch, filter, table, status badge
  WHY FOURTH: Leads is the highest-value, most demonstrable feature.
  Proves the full async loop works with a real workflow.

PHASE 5: Content Module
  ─ /api/content/generate → dispatches content intelligence workflow
  ─ content_items + content_variants tables
  ─ Content UI: generate, draft approval, channel variants, queue
  WHY FIFTH: Builds on proven async pattern from Phase 4.

PHASE 6: Social Response Module
  ─ /api/social/process → dispatches social response workflow
  ─ social_messages + response_suggestions tables
  ─ Social inbox UI: inbound queue, AI reply review, approve/reject
  WHY SIXTH: Depends on brand voice from Phase 3.

PHASE 7: SEO + Campaigns
  ─ /api/seo/run and /api/campaigns/schedule
  ─ keyword_clusters, campaigns, campaign_schedules tables
  ─ SEO lab UI and campaign calendar UI
  WHY SEVENTH: These are valuable but not the core MVP hook.

PHASE 8: Analytics + Admin
  ─ Cron-triggered analytics sync
  ─ analytics_events table + dashboard cards
  ─ Admin panel: tenant list, workflow health, usage
  WHY LAST: Depends on data from all prior phases to be meaningful.
```

---

## 14. Environment Variables Required

```
# Clerk
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=
CLERK_SECRET_KEY=
NEXT_PUBLIC_CLERK_SIGN_IN_URL=/sign-in
NEXT_PUBLIC_CLERK_SIGN_UP_URL=/sign-up

# Supabase
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=       # server-only, never NEXT_PUBLIC_

# n8n
N8N_WEBHOOK_LEAD_DISCOVERY=      # full URL including path
N8N_WEBHOOK_CONTENT_GENERATE=
N8N_WEBHOOK_SOCIAL_CLASSIFY=
N8N_WEBHOOK_SEO_RESEARCH=
N8N_WEBHOOK_CAMPAIGN_SCHEDULE=
N8N_WEBHOOK_ANALYTICS_SYNC=
N8N_WEBHOOK_SECRET=              # shared secret for outbound auth header
N8N_CALLBACK_SECRET=             # HMAC secret for inbound callback verification

# App
NEXT_PUBLIC_APP_URL=             # https://app.signafyai.com
CRON_SECRET=                     # secret for protecting /api/cron/* routes
```

---

## 15. Sources and Confidence Summary

| Claim | Confidence | Basis |
|-------|-----------|-------|
| Two-plane architecture (control + processing) | HIGH | Derived from project spec explicit design intent |
| Clerk `auth()` returning `orgId` in App Router | HIGH | Clerk official Next.js documentation pattern |
| Supabase RLS per-org policy using `auth.uid()` | HIGH | Standard Supabase multi-tenant pattern, well documented |
| n8n webhook header authentication | HIGH | n8n Webhook node documented feature |
| HMAC-SHA256 callback verification | HIGH | Standard webhook security pattern (GitHub, Stripe, etc.) |
| Supabase Realtime postgres_changes for job status | MEDIUM | Documented feature, recommendation vs SSE is judgment call |
| n8n async response (respond immediately, process async) | MEDIUM | Known n8n pattern; exact node config needs verification |
| n8n queue mode with Redis for scale | MEDIUM | Documented in n8n self-hosting guide; scaling thresholds are estimates |
| Vercel function timeout (10s default, 60s Pro) | HIGH | Vercel official documentation |

**Note on tool access:** WebSearch and WebFetch were blocked during this research session. No external documentation was fetched. All MEDIUM-confidence claims should be verified against current n8n and Supabase docs when beginning implementation. HIGH-confidence claims reflect stable, well-established patterns that are unlikely to have changed materially.
