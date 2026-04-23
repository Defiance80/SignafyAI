# Requirements: SignafyAI

**Defined:** 2026-04-22
**Core Value:** A business configures their brand voice and goals once, then SignafyAI continuously generates leads, creates on-brand content, and handles social responses — without needing a dedicated marketing team.

---

## v1 Requirements

### Foundation & Auth

- [ ] **FOUND-01**: User can sign up and create an organization (tenant) via Clerk onboarding
- [ ] **FOUND-02**: User can invite team members to their organization with role assignment (admin, owner, member, viewer)
- [ ] **FOUND-03**: User can sign in and session persists across browser refresh
- [ ] **FOUND-04**: Role-based access enforced throughout the app (viewers cannot trigger workflows, members cannot manage billing/settings)
- [ ] **FOUND-05**: Each organization's data is fully isolated — a user in Org A can never see Org B's data
- [ ] **FOUND-06**: Onboarding wizard collects: business name, website URL, niche/industry, service areas, target customer description, brand tone keywords, CTA preferences, main keywords, competitor examples, content goals
- [ ] **FOUND-07**: Onboarding wizard saves a business profile used by all automation workflows
- [ ] **FOUND-08**: Brand voice engine stores: tone settings, vocabulary restrictions, CTA style, emoji behavior, humor level, professionalism level, platform-specific tone rules
- [ ] **FOUND-09**: User can paste old captions, brand copy, and founder voice notes into a "sound like us" area that guides future AI outputs
- [ ] **FOUND-10**: User can update their business profile and brand voice settings at any time

### n8n Integration Layer

- [ ] **N8N-01**: Each major workflow has a secure trigger endpoint in the SaaS that validates tenant auth before dispatching
- [ ] **N8N-02**: All n8n webhooks are authenticated via shared secret (Header Auth)
- [ ] **N8N-03**: n8n callbacks to the SaaS are verified via HMAC-SHA256 signature before any data is written
- [ ] **N8N-04**: Every workflow dispatch creates a workflow_run record with status: queued → running → complete | failed
- [ ] **N8N-05**: User sees real-time job status updates in the UI without polling (Supabase Realtime)
- [ ] **N8N-06**: Timed-out workflow runs (>30 min in queued/running state) are automatically marked failed
- [ ] **N8N-07**: Failed workflow runs surface an actionable error message in the UI, not a raw error

### Leads Module

- [ ] **LEAD-01**: User can launch a lead search by specifying industry, location, target keywords, business type, and desired source
- [ ] **LEAD-02**: Lead search dispatches to n8n lead discovery workflow asynchronously; UI shows real-time progress
- [ ] **LEAD-03**: Discovered leads are enriched with: company name, website, email (if available), social links, phone (if available), niche tags, local relevance score
- [ ] **LEAD-04**: Each lead is scored based on data completeness and keyword/niche alignment
- [ ] **LEAD-05**: User sees a filterable, sortable leads list with columns for all enrichment fields
- [ ] **LEAD-06**: User can filter leads by: status, niche tag, score range, source, enrichment completeness
- [ ] **LEAD-07**: User can assign status tags to leads: new / contacted / qualified / disqualified
- [ ] **LEAD-08**: User can add custom tags to leads for campaign or audience segmentation
- [ ] **LEAD-09**: User can export selected leads or all filtered leads to CSV with field selection
- [ ] **LEAD-10**: Duplicate leads (same email or same domain within the same org) are flagged in the UI
- [ ] **LEAD-11**: User can view their lead run history and see search parameters used for each past run
- [ ] **LEAD-12**: Lead data is enrichment-source-labelled: verified API source vs AI-inferred (never presented the same way)

### Content Module

- [ ] **CONT-01**: User can trigger AI content generation by providing a topic/brief and selecting target platforms
- [ ] **CONT-02**: Content generation uses the business profile and brand voice engine to personalize output
- [ ] **CONT-03**: Generated content includes platform variants for all 6 platforms: Instagram, TikTok, YouTube, LinkedIn, Facebook, X
- [ ] **CONT-04**: Content variants respect platform-specific formatting (character limits, hashtag norms, tone differences)
- [ ] **CONT-05**: User can approve, reject, or inline-edit any content draft before it moves to queued status
- [ ] **CONT-06**: Content items have statuses: draft → queued → approved → posted | needs review
- [ ] **CONT-07**: User can view a content library filtered by platform, status, date range, and keyword
- [ ] **CONT-08**: Generated content includes target keyword suggestions that are woven naturally into copy (not keyword-stuffed)
- [ ] **CONT-09**: Generated content includes relevant hashtag suggestions per platform
- [ ] **CONT-10**: User can generate image/video brief prompts alongside copy (text descriptions for Canva/Midjourney, not actual images)
- [ ] **CONT-11**: Each content item tracks which keyword cluster it addresses

### SEO Module

- [ ] **SEO-01**: User can trigger keyword cluster generation for their niche; results appear in SEO Lab
- [ ] **SEO-02**: Generated keyword clusters are categorized by search intent: informational, local, commercial, transactional
- [ ] **SEO-03**: User can generate FAQ ideas for any keyword cluster
- [ ] **SEO-04**: User can generate title tag and meta description suggestions for any keyword or page brief
- [ ] **SEO-05**: User can generate a landing page content brief (sections, headlines, CTAs) based on a keyword + offer + location
- [ ] **SEO-06**: Local SEO clusters include city + service keyword combinations relevant to the business's service areas
- [ ] **SEO-07**: User can view all keyword clusters and their associated content ideas in one view

### Social Response Module

- [ ] **SOCIAL-01**: User can connect social accounts and receive inbound comments/questions via webhook integrations
- [ ] **SOCIAL-02**: Inbound social messages are classified by intent: question / objection / praise / complaint / buying signal / spam
- [ ] **SOCIAL-03**: The system generates a natural, brand-matched reply draft for each non-spam inbound message
- [ ] **SOCIAL-04**: Generated replies use the brand voice engine (tone, CTA style, banned phrases)
- [ ] **SOCIAL-05**: User sees an inbox of inbound messages with AI-generated reply drafts awaiting approval
- [ ] **SOCIAL-06**: User can approve, reject, or edit a reply draft before it is sent
- [ ] **SOCIAL-07**: Autonomy mode is set to "approval required" for all messages in beta — no auto-send
- [ ] **SOCIAL-08**: User can define banned phrases that are never used in any generated reply
- [ ] **SOCIAL-09**: High-sensitivity messages (pricing, legal, medical, political) are flagged for mandatory manual review regardless of autonomy settings
- [ ] **SOCIAL-10**: Every sent or approved reply is logged immutably with timestamp, platform, original message, response, and mode
- [ ] **SOCIAL-11**: Buying-signal messages trigger a notification alerting the user of high-intent engagement

### Campaign Calendar

- [ ] **CAMP-01**: User can view all queued and approved content in a calendar view organized by channel
- [ ] **CAMP-02**: User can schedule content items to specific dates and times
- [ ] **CAMP-03**: User can drag-and-drop to adjust scheduled timing on the calendar
- [ ] **CAMP-04**: User can see post status (queued / scheduled / posted / failed) for each calendar item
- [ ] **CAMP-05**: User can pause or resume an entire campaign's scheduled posts
- [ ] **CAMP-06**: Scheduled campaign dispatches n8n campaign scheduler workflow; timing is staggered to avoid spam patterns

### Analytics Module

- [ ] **ANAL-01**: Dashboard shows: total leads found, content items generated, social replies handled, posts scheduled
- [ ] **ANAL-02**: User can see workflow run counts and success/failure rates per workflow type
- [ ] **ANAL-03**: User can see top-performing content items by engagement (when engagement data is available)
- [ ] **ANAL-04**: Analytics data is scoped per organization and updated via n8n analytics sync workflow
- [ ] **ANAL-05**: User can see a traffic trend summary snapshot if their website is connected

### Admin Panel

- [ ] **ADMIN-01**: Platform owner can view all tenants (organizations) and their usage
- [ ] **ADMIN-02**: Platform owner can view workflow health across all tenants (run counts, failure rates)
- [ ] **ADMIN-03**: Platform owner can monitor API usage and flag high-cost tenants
- [ ] **ADMIN-04**: Platform owner can disable abusive or violating accounts
- [ ] **ADMIN-05**: Platform owner can review beta feedback flags submitted by users
- [ ] **ADMIN-06**: Platform owner can set per-plan usage limits (workflow runs, leads per month, content generations)

### Marketing Site

- [ ] **MKTG-01**: Homepage with hero section, product overview, feature highlights, and social proof area
- [ ] **MKTG-02**: Features page detailing all four modules with visuals
- [ ] **MKTG-03**: Pricing page with Starter / Pro / Agency / Enterprise plan tiers (amounts TBD; beta pricing)
- [ ] **MKTG-04**: Beta waitlist page with email capture form
- [ ] **MKTG-05**: Contact / demo request page
- [ ] **MKTG-06**: Marketing site is publicly accessible without authentication; app routes are protected

### Infrastructure & Deployment

- [ ] **INFRA-01**: App deploys to Vercel from GitHub with environment variable management
- [ ] **INFRA-02**: `.env.example` documents all required environment variables
- [ ] **INFRA-03**: All async n8n operations use fire-and-forget pattern; no synchronous AI calls from Vercel functions
- [ ] **INFRA-04**: Vercel cron job (or Supabase pg_cron) detects and marks timed-out workflow runs as failed
- [ ] **INFRA-05**: n8n instance on Hostinger is configured with Header Auth on all webhook entry points
- [ ] **INFRA-06**: README contains install instructions, local dev setup, and environment variable documentation

---

## v2 Requirements

Deferred to post-beta. Tracked but not in current roadmap.

### Outreach & CRM
- Direct email outreach sequencing
- CRM sync (HubSpot, Pipedrive export)
- Automated follow-up workflows

### Advanced Social
- Fully autonomous social response mode (auto-send without approval)
- DM / direct message handling
- Multi-platform scheduling via direct posting APIs (requires Meta/TikTok/LinkedIn developer app approvals)
- Competitor mention monitoring

### Analytics & SEO Depth
- SERP rank tracking
- Site crawling and technical SEO audit
- Backlink analysis
- Real keyword volume data integration (DataForSEO, SEMrush API)
- Content A/B testing

### Platform
- White-label / agency reseller mode
- Full Stripe billing implementation (payments, subscriptions, metered usage)
- Mobile-responsive native app
- Marketplace / integrations directory
- Topic map visualization

---

## Out of Scope

| Feature | Reason |
|---------|--------|
| Direct social media posting API | Platform developer app approvals take weeks and can be revoked; too risky for beta |
| Image or video generation | Separate product surface; generates Midjourney/Canva brief text instead |
| Long-form blog post generation (5000+ words) | Jasper dominates this; SignafyAI's edge is social + SEO briefs |
| Proprietary lead database | Requires massive data licensing; use enrichment APIs instead |
| Phone dialer / power dialer | Telephony compliance (TCPA) out of scope |
| Real-time SERP rank tracking | Per-query API cost with ongoing infrastructure requirement |
| Auto-send social responses in beta | Too risky before user trust is established; stays approval-only |
| Built-in grammar/plagiarism checker | Grammarly already handles this for users |

---

## Traceability

| Requirement | Phase | Status |
|-------------|-------|--------|
| FOUND-01 to FOUND-10 | Phase 1 | Pending |
| N8N-01 to N8N-07 | Phase 1 | Pending |
| INFRA-01 to INFRA-06 | Phase 1 | Pending |
| LEAD-01 to LEAD-12 | Phase 3 | Pending |
| CONT-01 to CONT-11 | Phase 4 | Pending |
| SEO-01 to SEO-07 | Phase 5 | Pending |
| SOCIAL-01 to SOCIAL-11 | Phase 6 | Pending |
| CAMP-01 to CAMP-06 | Phase 7 | Pending |
| ANAL-01 to ANAL-05 | Phase 8 | Pending |
| ADMIN-01 to ADMIN-06 | Phase 8 | Pending |
| MKTG-01 to MKTG-06 | Phase 9 | Pending |

**Coverage:**
- v1 requirements: 76 total
- Mapped to phases: 76
- Unmapped: 0 ✓

---
*Requirements defined: 2026-04-22*
*Last updated: 2026-04-22 after initial scoping session*
