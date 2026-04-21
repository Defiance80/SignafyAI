# SignafyAI

## What This Is

SignafyAI is a multi-tenant AI growth operating system for agencies, consultants, and brands. It connects a Next.js SaaS dashboard to self-hosted n8n automation workflows to deliver four core services: lead generation, SEO-driven content creation, social response automation, and traffic generation. Customers onboard their business profile once and the platform runs semi-autonomous growth operations on their behalf.

## Core Value

A business can configure their brand voice and goals once, then have SignafyAI continuously generate leads, create on-brand content, and handle social responses — without needing a dedicated marketing team.

## Requirements

### Validated

(None yet — ship to validate)

### Active

- [ ] Multi-tenant SaaS with isolated data per organization
- [ ] Clerk-powered auth with admin, tenant owner, team member, and viewer roles
- [ ] Onboarding wizard that creates a business profile powering all automation
- [ ] Lead discovery module — search, filter, score, tag, and export leads
- [ ] Content generation module — AI captions, platform variants, approval workflow
- [ ] Social response module — classify inbound, generate brand-matched replies, autonomy controls
- [ ] SEO module — keyword clusters, local SEO ideas, FAQ and metadata suggestions
- [ ] Campaign calendar — queue, schedule, and track post status across channels
- [ ] Analytics dashboard — lead counts, content metrics, engagement, traffic snapshots
- [ ] n8n webhook integration layer — trigger workflows, receive structured JSON, store results
- [ ] Brand voice engine — tone settings, vocabulary, CTA rules, "sound like us" training area
- [ ] Admin panel — tenant management, workflow health, usage monitoring
- [ ] Billing architecture scaffolding — plan limits (Starter/Pro/Agency/Enterprise)
- [ ] Marketing site — homepage, features, pricing, beta waitlist

### Out of Scope

- Real-time chat or DM sending — platform APIs restrict this; focus on comment/reply automation
- Native mobile app — web-first beta
- Built-in email outreach sequences — deferred to v2 CRM features
- Full Stripe billing implementation — architecture only in beta; payment processing in v2
- White-label/agency reseller mode — v2 after core platform validated

## Context

- **Stack**: Next.js 15 + TypeScript + Tailwind CSS + shadcn/ui, deployed to Vercel
- **Database**: Supabase (Postgres + Row Level Security for tenant isolation + Storage)
- **Auth**: Clerk (organizations, roles, multi-tenant isolation out of the box)
- **Automation**: n8n self-hosted on Hostinger — connected via secure webhooks
- **Build approach**: n8n workflow architecture first, then SaaS shell, then modules
- The spec document (SignafyAI.txt) in the repo root contains the full product vision and serves as the source of truth for feature decisions

## Constraints

- **Tech Stack**: Next.js + Supabase + Clerk + shadcn/ui — chosen and locked
- **Automation Engine**: n8n self-hosted on Hostinger — all workflow triggers go through webhooks
- **Deployment**: Vercel — must use Vercel-compatible patterns (edge-friendly, no persistent server processes)
- **Beta Scope**: Full platform MVP with all 4 modules working end-to-end
- **Security**: Tenant data must be strictly isolated via Supabase RLS; never cross-contaminate tenant data

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Clerk for auth | Best multi-tenant support for Next.js; organizations + roles built in | — Pending |
| Supabase for database | Postgres + RLS for tenant isolation + storage + realtime in one platform | — Pending |
| n8n as automation engine | Modular workflow design, self-hosted control, webhook-first architecture | — Pending |
| shadcn/ui component library | Premium SaaS aesthetic, fully customizable, pairs with Tailwind | — Pending |
| n8n workflows built first | Foundation for all automation — SaaS UI is a control layer over n8n | — Pending |

---
*Last updated: 2026-04-21 after initialization*
