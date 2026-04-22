# Technology Stack: SignafyAI

**Project:** SignafyAI — Multi-tenant AI Growth Operating System
**Researched:** 2026-04-21
**Overall Confidence:** HIGH (all versions verified via npm registry and official Next.js docs)

---

## CRITICAL: Next.js Version Decision Required

The project specified "Next.js 15" but **Next.js 16 is the current stable release** (published October 21, 2025). This has direct build implications.

| Version | npm tag | Status | Node.js Requirement |
|---------|---------|--------|---------------------|
| **16.2.4** | `latest` | Stable, current | **20.9+ required** |
| 15.3.9 | `next-15-3` | Maintained but superseded | 18.18+ |

**Recommendation: Use Next.js 16.** Rationale:
- Turbopack is stable and default — faster builds
- `middleware.ts` is deprecated; `proxy.ts` is the new file for request interception (Clerk uses this)
- React 19.2 is the bundled React version
- Clerk 7.x peer deps explicitly include `^16.0.10`
- Starting a greenfield project on a superseded version accrues immediate tech debt

**If you choose Next.js 15:** use `next@15.3.9` (latest 15.x). All libraries listed below are compatible with both.

---

## Recommended Stack

### Core Framework

| Technology | Version | Purpose | Why |
|------------|---------|---------|-----|
| `next` | **16.2.4** | App framework, SSR, API routes, server actions | Current stable. Turbopack default, React 19.2, Cache Components |
| `react` | **19.2.5** | UI runtime | Bundled with Next 16. View Transitions, `useEffectEvent`, `<Activity/>` |
| `react-dom` | **19.2.5** | DOM renderer | Matches React version |
| `typescript` | **6.0.3** | Type safety | Minimum 5.1 required for Next 16 |
| `tailwindcss` | **4.2.4** | Utility CSS | Current stable v4. shadcn/ui depends on it |
| `shadcn` (CLI) | **4.4.0** | Component scaffolding | CLI tool, not a runtime dep — adds components to your codebase |

### Auth + Multi-Tenancy

| Technology | Version | Purpose | Why |
|------------|---------|---------|-----|
| `@clerk/nextjs` | **7.2.3** | Auth, organizations, sessions, JWT | Explicit peer dep support for Next 15.x and `^16.0.10`. Organizations API handles multi-tenant isolation natively |

**Clerk + Supabase JWT Integration Pattern** (MEDIUM confidence — official docs inaccessible during research, pattern sourced from Clerk docs structure + npm package metadata):

Clerk issues JWTs. Supabase can be configured to accept a third-party JWT provider. The integration requires:

1. In Supabase dashboard: set "JWT Secret" to use Clerk's JWKS endpoint (`https://your-clerk-domain.clerk.accounts.dev/.well-known/jwks.json`)
2. In Clerk dashboard: create a JWT template that outputs `{ "role": "authenticated", "sub": "{{user.id}}" }` — Supabase reads `sub` for `auth.uid()`
3. On the client: use `clerk.session.getToken({ template: 'supabase' })` to get a Supabase-compatible JWT
4. Pass this token to `@supabase/supabase-js` via the `global.fetch` authorization header override or the `accessToken` option in `createClient`
5. RLS policies then use `auth.uid()` which resolves to the Clerk user ID

```typescript
// Supabase client with Clerk JWT (client component pattern)
import { createClient } from '@supabase/supabase-js'
import { useAuth } from '@clerk/nextjs'

function useSupabaseClient() {
  const { getToken } = useAuth()
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      global: {
        fetch: async (url, options = {}) => {
          const token = await getToken({ template: 'supabase' })
          return fetch(url, {
            ...options,
            headers: {
              ...options.headers,
              Authorization: `Bearer ${token}`,
            },
          })
        },
      },
    }
  )
}
```

**RLS policy pattern:**
```sql
-- Row-level security: tenant isolation via Clerk user_id
CREATE POLICY "tenant_isolation" ON leads
  FOR ALL
  USING (user_id = auth.uid());

-- For org-scoped data (multi-tenant via Clerk org_id):
-- Add org_id to JWT template: { "org_id": "{{org.id}}" }
-- Then in RLS: (auth.jwt() ->> 'org_id') = org_id
```

**Server-side Supabase client** (route handlers, server actions):
```typescript
import { auth } from '@clerk/nextjs/server'
import { createClient } from '@supabase/supabase-js'

async function createServerSupabaseClient() {
  const { getToken } = await auth()
  const token = await getToken({ template: 'supabase' })
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      global: {
        headers: { Authorization: `Bearer ${token}` },
      },
    }
  )
}
```

**Note on `@supabase/ssr`:** The `@supabase/ssr` package (0.10.2) is designed for Supabase's own auth. When using Clerk for auth, you do **not** need `@supabase/ssr` — use `@supabase/supabase-js` directly with the JWT injection pattern above. `@supabase/ssr` manages Supabase session cookies; Clerk manages sessions instead.

### Database

| Technology | Version | Purpose | Why |
|------------|---------|---------|-----|
| `@supabase/supabase-js` | **2.104.0** | Supabase client: queries, realtime, storage | Current stable. Do not use `@supabase/ssr` alongside Clerk (auth conflict) |

### proxy.ts (formerly middleware.ts) for Clerk in Next.js 16

Next.js 16 deprecates `middleware.ts` in favor of `proxy.ts`. Clerk's `clerkMiddleware` must be adapted:

```typescript
// proxy.ts (Next.js 16)
// Note: As of Clerk 7.2.3, verify whether Clerk has updated to export
// a clerkProxy function or if clerkMiddleware still works in proxy.ts.
// The function logic is identical — only the filename and export name change.
import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server'

const isPublicRoute = createRouteMatcher([
  '/',
  '/sign-in(.*)',
  '/sign-up(.*)',
  '/api/webhooks(.*)',
  '/api/n8n-webhook(.*)',
])

export default clerkMiddleware(async (auth, request) => {
  if (!isPublicRoute(request)) {
    await auth.protect()
  }
})

export const config = {
  matcher: ['/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)'],
}
```

**IMPORTANT:** Rename `middleware.ts` to `proxy.ts` and rename the exported function to `proxy` when using Next.js 16. Verify that Clerk 7.x is compatible with `proxy.ts` before building — this is a critical integration point (LOW confidence on exact Clerk proxy.ts support; verify against Clerk docs when starting the project).

---

## Form Handling + Validation

### Recommended: React Hook Form + Zod 4

| Library | Version | Purpose | Why |
|---------|---------|---------|-----|
| `react-hook-form` | **7.73.1** | Form state, validation, submission | Uncontrolled components = performant. React 19 compatible |
| `zod` | **4.3.6** | Schema validation | Latest stable is v4, not v3. Breaking API changes from v3 (see note below) |
| `@hookform/resolvers` | **5.2.2** | Connects Zod schemas to RHF | Supports Zod 4. Peer dep requires `react-hook-form ^7.55.0` ✓ |

**Zod v4 vs v3 warning:** Zod 4 is a breaking release. If you copy/paste v3 examples from the internet, some APIs have changed. Key differences:
- `z.string().nonempty()` removed — use `z.string().min(1)` 
- `z.union([])` behavior changes for discriminated unions
- Error message formatting changed

Verify any community examples against official Zod 4 docs before using them.

**Usage pattern for server actions:**
```typescript
// actions/leads.ts
'use server'
import { z } from 'zod'

const LeadSearchSchema = z.object({
  industry: z.string().min(1),
  location: z.string().min(1),
  keywords: z.array(z.string()).min(1),
})

export async function triggerLeadSearch(data: z.infer<typeof LeadSearchSchema>) {
  const parsed = LeadSearchSchema.parse(data) // throws on invalid
  // trigger n8n webhook...
}
```

### Alternative: next-safe-action

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| `next-safe-action` | **8.5.2** | Type-safe server actions with Zod validation built-in | Use if you want automatic input parsing + error handling on server actions. Peer deps: `next >= 14`, `react >= 18.2` ✓ |

`next-safe-action` is worth considering for this project because it eliminates boilerplate around server action input validation. It wraps actions with schema parsing and returns typed errors. For a SaaS with many form-to-action flows (lead search, content generation, settings), this reduces repetition.

---

## State Management

### Server State: TanStack Query

| Library | Version | Purpose | Why |
|---------|---------|---------|-----|
| `@tanstack/react-query` | **5.99.2** | Server state: fetching, caching, invalidation | Standard for dashboard SaaS. Handles stale-while-revalidate, background refetch, optimistic updates. Peer deps: `react ^18 || ^19` ✓ |

**Why not use Next.js fetch caching instead of TanStack Query?**

Next.js 16's caching model (Cache Components, `"use cache"`) is designed for static/incremental content. For a SaaS dashboard where users trigger workflows and see live results, you need:
- Polling for workflow status (n8n async jobs)
- Optimistic updates when approving content
- Manual invalidation when lead search completes
- Per-user cache isolation

TanStack Query handles all of these. It is client-component territory and complements Next.js server caching rather than replacing it.

```typescript
// Example: polling for n8n workflow completion
const { data } = useQuery({
  queryKey: ['workflow-run', runId],
  queryFn: () => fetchWorkflowRun(runId),
  refetchInterval: (data) => 
    data?.status === 'running' ? 2000 : false, // poll every 2s until done
})
```

### Client State: Zustand

| Library | Version | Purpose | Why |
|---------|---------|---------|-----|
| `zustand` | **5.0.12** | Global UI state | Minimal API. For cross-component state: active org, sidebar state, modal state, notification queue. Peer dep: `react >= 18` ✓ |

**What to put in Zustand vs TanStack Query:**
- Zustand: UI state that doesn't come from the server (sidebar open, selected tab, active filters UI)
- TanStack Query: Anything fetched from an API or Supabase

**Do not use:** Redux, MobX, Jotai — these are either overkill or have steeper learning curves for this use case.

### URL State: nuqs

| Library | Version | Purpose | Why |
|---------|---------|---------|-----|
| `nuqs` | **2.8.9** | Type-safe URL query string state | Replaces manual `useSearchParams` parsing. Essential for filterable tables (leads module, content module). Peer dep: `next >= 14.2` ✓ |

---

## Real-Time: Supabase Realtime

**Server Components vs Client Components — this is a critical constraint.**

Supabase Realtime subscriptions (WebSocket-based) can **only** be established from client components. Server components run once on the server and do not maintain connections. This is fundamental to how React Server Components work — they have no lifecycle, no effects, no persistent connections.

```typescript
// CORRECT: Real-time in a client component
'use client'
import { useEffect, useState } from 'react'
import { createClient } from '@supabase/supabase-js'

export function WorkflowStatusCard({ runId }: { runId: string }) {
  const [status, setStatus] = useState<string>()
  
  useEffect(() => {
    const supabase = createClient(url, anonKey) // with Clerk JWT injected
    
    const channel = supabase
      .channel(`workflow-run-${runId}`)
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'workflow_runs',
        filter: `id=eq.${runId}`,
      }, (payload) => {
        setStatus(payload.new.status)
      })
      .subscribe()
    
    return () => { supabase.removeChannel(channel) }
  }, [runId])
  
  return <div>{status}</div>
}
```

**Architecture pattern for real-time + RSC:**
- Server Component: fetches initial data (fast, SEO-friendly, no waterfall)
- Client Component (child): subscribes to real-time updates on top of server-fetched initial state

This is the correct hybrid pattern. Pass server-fetched data as props to client components that hold subscriptions.

**Supabase Realtime use cases in SignafyAI:**
- Workflow run status updates (n8n completes → writes to DB → real-time fires → UI updates)
- Lead search progress
- Content generation queue
- Notification toasts

---

## Email

| Library | Version | Purpose | Why |
|---------|---------|---------|-----|
| `resend` | **6.12.2** | Email delivery API | Best DX for Next.js/React. Vercel-native integration. No peer deps |
| `react-email` | **6.0.0** | React-based email templates | Build emails as React components. Works with Resend |
| `@react-email/components` | **1.0.12** | Pre-built email component primitives | Buttons, text, layouts that render to email-safe HTML |

**Why Resend over SendGrid/Mailgun:** Resend is built by the Next.js/Vercel ecosystem, has a React-first SDK, generous free tier (3,000 emails/month), and first-class TypeScript support. SendGrid requires a steeper setup for React templates.

**Usage pattern:**
```typescript
// app/api/email/welcome/route.ts
import { Resend } from 'resend'
import { WelcomeEmail } from '@/emails/welcome'

const resend = new Resend(process.env.RESEND_API_KEY)

export async function POST(req: Request) {
  const { email, orgName } = await req.json()
  
  await resend.emails.send({
    from: 'SignafyAI <noreply@signafy.ai>',
    to: email,
    subject: 'Welcome to SignafyAI',
    react: <WelcomeEmail orgName={orgName} />,
  })
  
  return Response.json({ success: true })
}
```

---

## Background Jobs + Webhook Handling

### n8n Webhook Pattern in Next.js

The SaaS acts as both a **webhook sender** (to n8n) and a **webhook receiver** (from n8n callbacks). Both use Next.js Route Handlers.

```typescript
// app/api/n8n/trigger/[workflow]/route.ts
// SENDS a job to n8n
import { auth } from '@clerk/nextjs/server'

export async function POST(
  request: Request,
  { params }: { params: Promise<{ workflow: string }> }
) {
  const { userId, orgId } = await auth()
  if (!userId) return new Response('Unauthorized', { status: 401 })
  
  const { workflow } = await params
  const body = await request.json()
  
  // Fire-and-forget to n8n (async pattern)
  const n8nResponse = await fetch(
    `${process.env.N8N_WEBHOOK_URL}/${workflow}`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-N8N-Secret': process.env.N8N_WEBHOOK_SECRET!,
      },
      body: JSON.stringify({ ...body, userId, orgId }),
    }
  )
  
  // Store the workflow run in Supabase
  // n8n will call back to /api/n8n/callback when done
  const runId = crypto.randomUUID()
  // ... insert workflow_runs row
  
  return Response.json({ runId })
}
```

```typescript
// app/api/n8n/callback/route.ts
// RECEIVES results from n8n
export async function POST(request: Request) {
  // Verify the request is from n8n
  const secret = request.headers.get('x-n8n-secret')
  if (secret !== process.env.N8N_WEBHOOK_SECRET) {
    return new Response('Unauthorized', { status: 401 })
  }
  
  const payload = await request.json()
  // Write results to Supabase
  // Supabase Realtime will notify the dashboard
  
  return new Response('OK', { status: 200 })
}
```

**Vercel serverless timeout constraint:** Vercel Hobby/Pro function max duration is 60s (Hobby) or 300s (Pro) for serverless functions. For long-running n8n workflows, use the **async pattern**: trigger n8n → store run ID → n8n calls back → Supabase Realtime notifies frontend. Never await long n8n operations inline.

**`export const maxDuration = 60`** in route handlers if you need to handle longer synchronous operations.

### Clerk Webhook Handling (Svix)

Clerk sends webhooks for user/org events (user.created, org.created, etc.). Verify them with Svix:

| Library | Version | Purpose | Why |
|---------|---------|---------|-----|
| `svix` | **1.91.1** | Webhook signature verification | Clerk uses Svix under the hood. Required for secure Clerk webhook handling |

```typescript
// app/api/webhooks/clerk/route.ts
import { Webhook } from 'svix'

export async function POST(req: Request) {
  const secret = process.env.CLERK_WEBHOOK_SECRET!
  const wh = new Webhook(secret)
  
  const headers = {
    'svix-id': req.headers.get('svix-id')!,
    'svix-timestamp': req.headers.get('svix-timestamp')!,
    'svix-signature': req.headers.get('svix-signature')!,
  }
  
  const payload = await req.text()
  const event = wh.verify(payload, headers) // throws if invalid
  
  // Handle org.created → create org in Supabase
  // Handle user.created → create user profile
  
  return new Response('OK')
}
```

### QStash (Optional — for reliable async job queue)

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| `@upstash/qstash` | **2.10.1** | Serverless-native message queue | Use if n8n callbacks sometimes fail and you need retry logic. Also useful for scheduled tasks (daily analytics sync) on Vercel without cron infrastructure |

QStash is a good fit for Vercel serverless because it handles retry, deduplication, and scheduling without requiring a persistent server. For SignafyAI, it's most useful for:
- Retrying failed n8n webhook deliveries
- Scheduling daily/weekly analytics reports
- Queuing email notifications without blocking requests

Not required for MVP — the direct n8n webhook pattern is sufficient to start.

---

## Supporting Libraries

### Data Display

| Library | Version | Purpose | Why |
|---------|---------|---------|-----|
| `@tanstack/react-table` | **8.21.3** | Headless table | For leads table, content queue, analytics. Composable with shadcn/ui table primitives |
| `sonner` | **2.0.7** | Toast notifications | shadcn/ui recommends Sonner. Beautiful, accessible, zero config |
| `lucide-react` | **1.8.0** | Icons | shadcn/ui default icon library. 1,000+ consistent icons |

### Environment + Config

| Library | Version | Purpose | Why |
|---------|---------|---------|-----|
| `@t3-oss/env-nextjs` | **0.13.11** | Type-safe env var validation | Validates `process.env` at build time against Zod/arktype/valibot schemas. Prevents runtime crashes from missing env vars. Supports Zod 4 (`^3.24.0 || ^4.0.0`) |

```typescript
// env.ts
import { createEnv } from '@t3-oss/env-nextjs'
import { z } from 'zod'

export const env = createEnv({
  server: {
    DATABASE_URL: z.string().url(),
    CLERK_SECRET_KEY: z.string().min(1),
    CLERK_WEBHOOK_SECRET: z.string().min(1),
    N8N_WEBHOOK_URL: z.string().url(),
    N8N_WEBHOOK_SECRET: z.string().min(1),
    RESEND_API_KEY: z.string().min(1),
  },
  client: {
    NEXT_PUBLIC_SUPABASE_URL: z.string().url(),
    NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(1),
    NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY: z.string().min(1),
  },
  runtimeEnv: process.env,
})
```

### URL State for Filterable Views

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| `nuqs` | **2.8.9** | URL-based filter/sort state | Leads table filters, content queue filters — state persists through page refresh and can be shared via URL |

### Stripe (Billing Scaffolding)

| Library | Version | Purpose | Notes |
|---------|---------|---------|-------|
| `stripe` | **22.0.2** | Billing server SDK | Node.js only — use in server actions / route handlers |
| `@stripe/stripe-js` | **9.2.0** | Billing client SDK | For Stripe Elements in client components |

---

## What NOT to Use (Anti-Recommendations)

| Avoid | Use Instead | Reason |
|-------|-------------|--------|
| `@supabase/ssr` | `@supabase/supabase-js` with Clerk JWT injection | `@supabase/ssr` manages Supabase Auth sessions. Since Clerk is the auth provider, `@supabase/ssr` adds confusion and conflicts with Clerk session management |
| `axios` | Native `fetch` | Next.js 16's `fetch` is instrumented for caching and deduplication. Axios bypasses this. Use fetch everywhere |
| `redux` / `redux-toolkit` | Zustand + TanStack Query | Redux is overkill for this architecture. Server state belongs in TanStack Query; UI state in Zustand |
| `react-query v4` | TanStack Query v5 | v4 is not React 19 compatible. v5 is the maintained version |
| `next-auth` (Auth.js) | Clerk | Clerk already handles auth + organizations + multi-tenancy. Adding next-auth would be redundant and creates Supabase JWT conflicts |
| `prisma` | Supabase JS client + raw SQL | Prisma adds an ORM layer over Supabase's Postgres, bypasses RLS unless carefully configured, and adds build complexity. Supabase's JS client with direct queries is idiomatic |
| `react-hook-form` with Zod v3 | Zod v4 | Zod v4 is the current stable. Starting with v3 means migrating later. Use v4 from the start |
| `pages/api/` routes | `app/api/` route handlers | SignafyAI uses the App Router. Pages Router API routes are a separate runtime and create confusion |
| `SWR` | TanStack Query | SWR lacks the mutation/optimistic update ecosystem that TanStack Query provides. For a dashboard with frequent mutations, TanStack Query is the right choice |

---

## Installation Commands

```bash
# Core framework
npm install next@latest react@latest react-dom@latest typescript@latest

# Auth
npm install @clerk/nextjs

# Database
npm install @supabase/supabase-js

# Forms + Validation
npm install react-hook-form @hookform/resolvers zod

# Optional: type-safe server actions
npm install next-safe-action

# Server + client state
npm install @tanstack/react-query zustand nuqs

# Email
npm install resend react-email @react-email/components

# Data display
npm install @tanstack/react-table sonner lucide-react

# Webhook verification (Clerk webhooks)
npm install svix

# Environment validation
npm install @t3-oss/env-nextjs

# Billing (scaffolding)
npm install stripe @stripe/stripe-js

# Optional: async job queue
npm install @upstash/qstash

# Dev dependencies
npm install -D tailwindcss @types/node @types/react @types/react-dom
```

```bash
# Add shadcn/ui (one-time setup)
npx shadcn@latest init
# Then add components as needed:
npx shadcn@latest add button card table dialog form input select
```

---

## Version Compatibility Matrix

| Library | Version | Next.js 16 | Next.js 15 | React 19 | Notes |
|---------|---------|-----------|-----------|----------|-------|
| @clerk/nextjs | 7.2.3 | ✓ | ✓ | ✓ | Explicit peer dep for ^16.0.10 |
| @supabase/supabase-js | 2.104.0 | ✓ | ✓ | ✓ | No framework peer deps |
| react-hook-form | 7.73.1 | ✓ | ✓ | ✓ | Peer: react ^16.8 || ^17 || ^18 || ^19 |
| zod | 4.3.6 | ✓ | ✓ | n/a | No React peer dep |
| @hookform/resolvers | 5.2.2 | ✓ | ✓ | ✓ | Peer: RHF ^7.55.0 ✓ |
| @tanstack/react-query | 5.99.2 | ✓ | ✓ | ✓ | Peer: react ^18 or ^19 |
| zustand | 5.0.12 | ✓ | ✓ | ✓ | Peer: react >= 18 |
| nuqs | 2.8.9 | ✓ | ✓ | ✓ | Peer: next >= 14.2 |
| resend | 6.12.2 | ✓ | ✓ | n/a | No framework peer dep |
| react-email | 6.0.0 | ✓ | ✓ | ✓ | Minimal peer deps |
| svix | 1.91.1 | ✓ | ✓ | n/a | No framework peer dep |
| next-safe-action | 8.5.2 | ✓ | ✓ | ✓ | Peer: next >= 14 |
| @t3-oss/env-nextjs | 0.13.11 | ✓ | ✓ | n/a | Peer: zod ^3.24 || ^4.0 ✓ |
| sonner | 2.0.7 | ✓ | ✓ | ✓ | Peer: react ^18 || ^19 |
| @tanstack/react-table | 8.21.3 | ✓ | ✓ | ✓ | Peer: react >= 16 |
| stripe | 22.0.2 | ✓ | ✓ | n/a | Server-only, no React peer dep |
| @upstash/qstash | 2.10.1 | ✓ | ✓ | n/a | No framework peer dep |

All libraries are confirmed compatible via npm registry peer dependency declarations.

---

## Confidence Assessment

| Area | Confidence | Basis |
|------|------------|-------|
| Version numbers | HIGH | npm registry — verified 2026-04-21 |
| Next.js 16 breaking changes | HIGH | Official nextjs.org upgrade guide |
| Next.js 15 vs 16 decision | HIGH | npm dist-tags + official blog |
| Clerk + Supabase JWT integration | MEDIUM | Pattern is documented in Clerk's integration directory; specific API calls not verified via Context7 (access denied during research) |
| Clerk proxy.ts compatibility | LOW | Next.js 16 `proxy.ts` is new; Clerk 7.x peer deps cover Next 16 but specific `proxy.ts` export naming unverified — validate against Clerk docs on project start |
| Supabase Realtime RSC constraint | HIGH | React Server Components architectural constraint — fundamental to RSC model |
| TanStack Query vs Next.js caching | HIGH | Clear architectural separation: client interactive state vs server static/incremental |
| n8n webhook pattern | HIGH | Standard Next.js Route Handler pattern, confirmed via official docs |
| Zod v4 breaking changes | HIGH | npm dist-tags confirm v4 is latest stable; T3 env peer deps confirm v4 support |

---

## Sources

- Next.js 16 official blog: https://nextjs.org/blog/next-16 (fetched 2026-04-21)
- Next.js 16 upgrade guide: https://nextjs.org/docs/app/guides/upgrading/version-16 (fetched 2026-04-21)
- Next.js Route Handler docs: https://nextjs.org/docs/app/api-reference/file-conventions/route (fetched 2026-04-21)
- npm registry: next, @clerk/nextjs, @supabase/supabase-js, react-hook-form, zod, @tanstack/react-query, zustand, nuqs, resend, svix, next-safe-action, @t3-oss/env-nextjs, sonner, stripe, @upstash/qstash — all verified 2026-04-21
