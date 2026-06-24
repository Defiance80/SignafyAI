"use client";

import Link from "next/link";

// ─── Data ──────────────────────────────────────────────────────────────────────

const NAV_LINKS = ["Features", "Pricing", "Docs", "Blog"];

const MODULES = [
  {
    icon: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
        <circle cx="12" cy="8" r="4" stroke="currentColor" strokeWidth="1.6"/>
        <path d="M4 20c0-4 3.6-7 8-7s8 3 8 7" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"/>
        <circle cx="19" cy="7" r="2.5" stroke="currentColor" strokeWidth="1.4"/>
        <path d="M16.5 13.5c.8-.3 2-.4 3 0" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>
      </svg>
    ),
    title: "Lead Generation",
    desc: "Find, score, and enrich prospects across industries. Filter by niche, city, intent, and source. Export ready-to-act lead lists.",
    color: "#7c3aed",
    bg: "rgba(124,58,237,0.07)",
    stats: "2,847 leads found",
  },
  {
    icon: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
        <rect x="3" y="3" width="18" height="18" rx="3" stroke="currentColor" strokeWidth="1.6"/>
        <path d="M7 9h10M7 13h7M7 17h5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
      </svg>
    ),
    title: "Content Engine",
    desc: "Generate on-brand captions, video hooks, and posts for all 6 platforms in one click — guided by your brand voice profile.",
    color: "#0891b2",
    bg: "rgba(8,145,178,0.07)",
    stats: "184 posts created",
  },
  {
    icon: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
        <path d="M21 11.5c0 4.7-4 7.5-9 7.5a11 11 0 0 1-3.5-.56L3 21l1.2-4.3A7.3 7.3 0 0 1 3 11.5C3 6.8 7 4 12 4s9 2.8 9 7.5z" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round"/>
        <path d="M9 12h6M9 9h4" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>
      </svg>
    ),
    title: "Social Inbox",
    desc: "Classify inbound comments by intent. Get brand-matched reply drafts. Approve, edit, or escalate — full control over every response.",
    color: "#059669",
    bg: "rgba(5,150,105,0.07)",
    stats: "943 replies handled",
  },
  {
    icon: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
        <path d="M3 17l5-6 4 3.5 4.5-7 4.5 4.5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
        <path d="M3 21h18" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeOpacity="0.35"/>
      </svg>
    ),
    title: "SEO Lab",
    desc: "Generate keyword clusters with intent mapping, local SEO combos, FAQ ideas, metadata, and landing page content briefs.",
    color: "#d97706",
    bg: "rgba(217,119,6,0.07)",
    stats: "320 keywords clustered",
  },
];

const FEATURES = [
  {
    icon: (
      <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
        <rect x="2" y="2" width="7" height="7" rx="1.5" stroke="#a78bfa" strokeWidth="1.4"/>
        <rect x="11" y="2" width="7" height="7" rx="1.5" stroke="#a78bfa" strokeWidth="1.4"/>
        <rect x="2" y="11" width="7" height="7" rx="1.5" stroke="#a78bfa" strokeWidth="1.4"/>
        <rect x="11" y="11" width="7" height="7" rx="1.5" stroke="#a78bfa" strokeWidth="1.4"/>
      </svg>
    ),
    title: "Multi-Tenant Architecture",
    desc: "Each client brand is fully isolated. Perfect for agencies managing multiple accounts.",
  },
  {
    icon: (
      <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
        <circle cx="10" cy="10" r="7.5" stroke="#a78bfa" strokeWidth="1.4"/>
        <path d="M10 6v4l2.5 2.5" stroke="#a78bfa" strokeWidth="1.4" strokeLinecap="round"/>
        <path d="M6 10H3M17 10h-3M10 3V1M10 19v-2" stroke="#a78bfa" strokeWidth="1.2" strokeLinecap="round" strokeOpacity="0.5"/>
      </svg>
    ),
    title: "AI-Powered Lead Discovery",
    desc: "Generate qualified leads from any niche with our AI engine — no n8n required.",
  },
  {
    icon: (
      <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
        <path d="M10 2C10 2 14 4.5 15.5 9C15.5 9 13.5 7.5 10 7.5C6.5 7.5 4.5 9 4.5 9C6 4.5 10 2 10 2Z" stroke="#a78bfa" strokeWidth="1.4" strokeLinejoin="round"/>
        <path d="M10 7.5v10" stroke="#a78bfa" strokeWidth="1.4" strokeLinecap="round"/>
        <path d="M7.5 15l2.5 2.5 2.5-2.5" stroke="#a78bfa" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"/>
      </svg>
    ),
    title: "Brand Voice Engine",
    desc: "Define tone, vocabulary, CTA style, and paste examples. Every output sounds like you.",
  },
  {
    icon: (
      <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
        <path d="M10 2l1.8 5.4H17l-4.4 3.2 1.7 5.4L10 13l-4.3 3 1.7-5.4L3 7.4h5.2L10 2z" stroke="#a78bfa" strokeWidth="1.4" strokeLinejoin="round"/>
      </svg>
    ),
    title: "Backlink Discovery",
    desc: "Find high-DA link building opportunities in your niche. Auto-draft outreach emails.",
  },
  {
    icon: (
      <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
        <circle cx="10" cy="6" r="3" stroke="#a78bfa" strokeWidth="1.4"/>
        <path d="M4 17c0-3.3 2.7-5.5 6-5.5s6 2.2 6 5.5" stroke="#a78bfa" strokeWidth="1.4" strokeLinecap="round"/>
        <path d="M14 8.5l1.5 1.5-1.5 1.5" stroke="#a78bfa" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" strokeOpacity="0.6"/>
      </svg>
    ),
    title: "Role-Based Access",
    desc: "Customer, vendor, and staff accounts with full permission enforcement.",
  },
  {
    icon: (
      <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
        <rect x="2" y="5" width="16" height="11" rx="2" stroke="#a78bfa" strokeWidth="1.4"/>
        <path d="M6 5V4a2 2 0 0 1 4 0v1M10 5V4a2 2 0 0 1 4 0v1" stroke="#a78bfa" strokeWidth="1.3" strokeLinecap="round" strokeOpacity="0.6"/>
        <path d="M6 11h8M6 14h4" stroke="#a78bfa" strokeWidth="1.3" strokeLinecap="round"/>
      </svg>
    ),
    title: "Stripe Billing",
    desc: "Subscription management built-in. Plans, upgrades, portal — all connected.",
  },
];

const PLANS = [
  {
    name: "Free",
    price: "$0",
    desc: "Explore at your own pace",
    features: ["25 leads/mo", "10 content pieces/mo", "Basic analytics", "Manual lead entry", "1 brand voice"],
    cta: "Get started free",
    highlight: false,
  },
  {
    name: "Starter",
    price: "$49",
    desc: "For growing teams ready to automate",
    features: ["100 leads/mo", "50 content pieces/mo", "Lead discovery automation", "Full analytics dashboard", "3 brand voices", "Campaign management"],
    cta: "Start free trial",
    highlight: false,
  },
  {
    name: "Pro",
    price: "$149",
    desc: "Built for agencies running at scale",
    features: ["500 leads/mo", "200 content pieces/mo", "Priority lead discovery", "SEO research suite", "Backlink discovery", "Social inbox + AI replies", "10 brand voices"],
    cta: "Start free trial",
    highlight: true,
  },
  {
    name: "Agency",
    price: "$399",
    desc: "Maximum scale, everything included",
    features: ["5,000 leads/mo", "1,000 content pieces/mo", "All Pro features", "Unlimited brand voices", "Dedicated onboarding", "Priority support"],
    cta: "Contact sales",
    highlight: false,
  },
];

// ─── Page ──────────────────────────────────────────────────────────────────────
export default function LandingPage() {
  return (
    <div data-scheme="dark" style={{ background: "#09090f", minHeight: "100vh", color: "rgba(255,255,255,0.88)" }}>

      {/* ── Nav ──────────────────────────────────────────────────── */}
      <nav style={{
        position: "sticky", top: 0, zIndex: 50,
        display: "flex", alignItems: "center", justifyContent: "space-between",
        padding: "0 32px", height: 60,
        background: "rgba(9,9,15,0.88)",
        backdropFilter: "blur(16px)",
        borderBottom: "1px solid rgba(255,255,255,0.06)",
      }}>
        <Link href="/" style={{ display: "flex", alignItems: "center", gap: 10, textDecoration: "none" }}>
          <div style={{
            width: 30, height: 30, borderRadius: 8, flexShrink: 0,
            background: "linear-gradient(135deg, #7c3aed 0%, #4f46e5 100%)",
            boxShadow: "0 0 14px rgba(124,58,237,0.4)",
            display: "flex", alignItems: "center", justifyContent: "center",
          }}>
            <svg width="13" height="13" viewBox="0 0 15 15" fill="none">
              <path d="M2.5 7.5L6.5 3.5L8 5L5 7.5L8 10L6.5 11.5L2.5 7.5Z" fill="white" fillOpacity="0.9"/>
              <path d="M8 5L12.5 7.5L8 10L10 7.5L8 5Z" fill="white"/>
            </svg>
          </div>
          <span style={{ fontSize: 16, fontWeight: 700, letterSpacing: "-0.03em", color: "rgba(255,255,255,0.92)" }}>
            SignafyAI
          </span>
        </Link>

        <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
          {NAV_LINKS.map(link => (
            <a key={link} href={`#${link.toLowerCase()}`} style={{
              padding: "6px 14px", borderRadius: 8,
              fontSize: 14, fontWeight: 500,
              color: "rgba(255,255,255,0.5)",
              textDecoration: "none", transition: "color 0.15s",
            }}
            onMouseEnter={e => { e.currentTarget.style.color = "rgba(255,255,255,0.9)"; }}
            onMouseLeave={e => { e.currentTarget.style.color = "rgba(255,255,255,0.5)"; }}
            >
              {link}
            </a>
          ))}
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <Link href="/sign-in" style={{
            padding: "7px 18px", borderRadius: 9, fontSize: 14, fontWeight: 500,
            color: "rgba(255,255,255,0.65)",
            background: "rgba(255,255,255,0.05)",
            border: "1px solid rgba(255,255,255,0.1)",
            textDecoration: "none",
          }}>
            Log In
          </Link>
          <Link href="/sign-in" style={{
            padding: "7px 18px", borderRadius: 9, fontSize: 14, fontWeight: 600,
            background: "linear-gradient(135deg, #7c3aed 0%, #4f46e5 100%)",
            color: "white", textDecoration: "none",
            boxShadow: "0 4px 14px rgba(124,58,237,0.35)",
          }}>
            Start Free Trial
          </Link>
        </div>
      </nav>

      {/* ── Hero ─────────────────────────────────────────────────── */}
      <section style={{
        position: "relative", overflow: "hidden",
        padding: "100px 24px 96px",
        textAlign: "center",
      }}>
        {/* Glow */}
        <div style={{
          position: "absolute", top: -120, left: "50%", transform: "translateX(-50%)",
          width: 800, height: 600, borderRadius: "50%", pointerEvents: "none",
          background: "radial-gradient(ellipse at center top, rgba(109,40,217,0.22) 0%, transparent 65%)",
          filter: "blur(40px)",
        }} />
        {/* Grid */}
        <div style={{
          position: "absolute", inset: 0, pointerEvents: "none",
          backgroundImage: `linear-gradient(rgba(255,255,255,0.025) 1px, transparent 1px),
                            linear-gradient(90deg, rgba(255,255,255,0.025) 1px, transparent 1px)`,
          backgroundSize: "56px 56px",
          WebkitMaskImage: "radial-gradient(ellipse at center, black 20%, transparent 75%)",
          maskImage: "radial-gradient(ellipse at center, black 20%, transparent 75%)",
        }} />

        <div style={{ position: "relative", maxWidth: 800, margin: "0 auto" }}>
          {/* Badge */}
          <div style={{
            display: "inline-flex", alignItems: "center", gap: 8,
            padding: "6px 16px", borderRadius: 100, marginBottom: 32,
            background: "rgba(124,58,237,0.1)",
            border: "1px solid rgba(124,58,237,0.28)",
            fontSize: 12, fontWeight: 600, color: "#a78bfa", letterSpacing: "0.01em",
          }}>
            <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#a78bfa" }} />
            Now in Beta — Limited Spots Available
          </div>

          {/* Headline */}
          <h1 style={{
            fontSize: "clamp(38px, 5.5vw, 68px)",
            fontWeight: 800, letterSpacing: "-0.04em",
            lineHeight: 1.08, margin: "0 0 24px",
            color: "rgba(255,255,255,0.95)",
          }}>
            Your AI-Powered{" "}
            <span style={{
              background: "linear-gradient(135deg, #a78bfa 0%, #7c3aed 50%, #4f46e5 100%)",
              WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent",
              backgroundClip: "text",
            }}>
              Growth Operating
            </span>
            <br />System
          </h1>

          {/* Sub */}
          <p style={{
            fontSize: "clamp(16px, 2vw, 19px)",
            lineHeight: 1.7, color: "rgba(255,255,255,0.48)",
            maxWidth: 580, margin: "0 auto 40px",
          }}>
            Generate leads, create on-brand content, automate social responses, and drive traffic — all connected to your business profile and powered by your own AI engine.
          </p>

          {/* CTAs */}
          <div style={{ display: "flex", flexWrap: "wrap", gap: 12, justifyContent: "center", marginBottom: 48 }}>
            <Link href="/sign-in" style={{
              display: "inline-flex", alignItems: "center", gap: 8,
              padding: "14px 32px", borderRadius: 12, fontSize: 16, fontWeight: 700,
              background: "linear-gradient(135deg, #7c3aed 0%, #4f46e5 100%)",
              color: "white", textDecoration: "none",
              boxShadow: "0 8px 32px rgba(124,58,237,0.4)",
              letterSpacing: "-0.01em",
            }}>
              Start Your Free Trial
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                <path d="M3 7h8M7 3l4 4-4 4" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </Link>
            <a href="#features" style={{
              display: "inline-flex", alignItems: "center",
              padding: "14px 32px", borderRadius: 12, fontSize: 16, fontWeight: 600,
              background: "rgba(255,255,255,0.05)",
              border: "1px solid rgba(255,255,255,0.12)",
              color: "rgba(255,255,255,0.75)", textDecoration: "none",
              letterSpacing: "-0.01em",
            }}>
              See How It Works
            </a>
          </div>

          {/* Trust bar */}
          <div style={{ display: "flex", flexWrap: "wrap", justifyContent: "center", gap: 28 }}>
            {["No credit card required", "Setup in 5 minutes", "Cancel anytime"].map(t => (
              <div key={t} style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 13, color: "rgba(255,255,255,0.35)" }}>
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                  <path d="M2.5 7l3 3 6-6" stroke="#34d399" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
                {t}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Modules ──────────────────────────────────────────────── */}
      <section id="features" style={{ padding: "80px 24px", maxWidth: 1200, margin: "0 auto" }}>
        <div style={{ textAlign: "center", marginBottom: 56 }}>
          <p style={{ fontSize: 12, fontWeight: 600, letterSpacing: "0.1em", textTransform: "uppercase", color: "#a78bfa", marginBottom: 12 }}>
            Four Engines. One Platform.
          </p>
          <h2 style={{ fontSize: "clamp(28px, 3.5vw, 42px)", fontWeight: 800, letterSpacing: "-0.04em", margin: "0 0 16px", color: "rgba(255,255,255,0.95)" }}>
            Everything your growth team needs
          </h2>
          <p style={{ fontSize: 16, color: "rgba(255,255,255,0.42)", maxWidth: 500, margin: "0 auto", lineHeight: 1.65 }}>
            Each module connects to a unified brand voice engine so every output is consistent and on-brand.
          </p>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 16 }}>
          {MODULES.map(mod => (
            <div
              key={mod.title}
              style={{
                background: "rgba(255,255,255,0.03)",
                border: "1px solid rgba(255,255,255,0.07)",
                borderRadius: 16, padding: "32px 28px",
                position: "relative", overflow: "hidden",
                transition: "border-color 0.2s, box-shadow 0.2s",
              }}
              onMouseEnter={e => {
                e.currentTarget.style.borderColor = `${mod.color}50`;
                e.currentTarget.style.boxShadow = `0 12px 40px ${mod.color}14`;
              }}
              onMouseLeave={e => {
                e.currentTarget.style.borderColor = "rgba(255,255,255,0.07)";
                e.currentTarget.style.boxShadow = "none";
              }}
            >
              <div style={{
                position: "absolute", top: -60, right: -60,
                width: 200, height: 200, borderRadius: "50%", pointerEvents: "none",
                background: `radial-gradient(circle, ${mod.color}25 0%, transparent 70%)`,
              }} />
              <div style={{ position: "relative" }}>
                <div style={{
                  display: "inline-flex", padding: 10, borderRadius: 12, marginBottom: 20,
                  background: mod.bg, color: mod.color,
                }}>
                  {mod.icon}
                </div>
                <h3 style={{ fontSize: 18, fontWeight: 700, letterSpacing: "-0.03em", margin: "0 0 10px", color: "rgba(255,255,255,0.92)" }}>
                  {mod.title}
                </h3>
                <p style={{ fontSize: 14, lineHeight: 1.7, color: "rgba(255,255,255,0.45)", margin: "0 0 20px" }}>
                  {mod.desc}
                </p>
                <div style={{
                  display: "inline-flex", alignItems: "center", gap: 7,
                  padding: "5px 12px", borderRadius: 100, fontSize: 12, fontWeight: 600,
                  background: mod.bg, color: mod.color,
                }}>
                  <span style={{ width: 5, height: 5, borderRadius: "50%", background: mod.color }} />
                  {mod.stats}
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ── Features ─────────────────────────────────────────────── */}
      <section style={{
        padding: "80px 24px",
        borderTop: "1px solid rgba(255,255,255,0.05)",
        maxWidth: 1200, margin: "0 auto",
      }}>
        <div style={{ textAlign: "center", marginBottom: 56 }}>
          <h2 style={{ fontSize: "clamp(28px, 3.5vw, 42px)", fontWeight: 800, letterSpacing: "-0.04em", margin: "0 0 16px", color: "rgba(255,255,255,0.95)" }}>
            Built for agencies and serious brands
          </h2>
          <p style={{ fontSize: 16, color: "rgba(255,255,255,0.42)", lineHeight: 1.65 }}>
            Enterprise-grade architecture at an accessible price point.
          </p>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 14 }}>
          {FEATURES.map(f => (
            <div
              key={f.title}
              style={{
                background: "rgba(255,255,255,0.03)",
                border: "1px solid rgba(255,255,255,0.07)",
                borderRadius: 14, padding: "24px 22px",
                transition: "border-color 0.2s",
              }}
              onMouseEnter={e => { e.currentTarget.style.borderColor = "rgba(124,58,237,0.3)"; }}
              onMouseLeave={e => { e.currentTarget.style.borderColor = "rgba(255,255,255,0.07)"; }}
            >
              <div style={{
                width: 38, height: 38, borderRadius: 10, marginBottom: 16,
                background: "rgba(124,58,237,0.1)",
                display: "flex", alignItems: "center", justifyContent: "center",
              }}>
                {f.icon}
              </div>
              <h3 style={{ fontSize: 15, fontWeight: 700, letterSpacing: "-0.02em", margin: "0 0 8px", color: "rgba(255,255,255,0.88)" }}>
                {f.title}
              </h3>
              <p style={{ fontSize: 13, lineHeight: 1.65, color: "rgba(255,255,255,0.4)", margin: 0 }}>
                {f.desc}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* ── Pricing ──────────────────────────────────────────────── */}
      <section id="pricing" style={{
        padding: "80px 24px",
        borderTop: "1px solid rgba(255,255,255,0.05)",
      }}>
        <div style={{ textAlign: "center", marginBottom: 56 }}>
          <p style={{ fontSize: 12, fontWeight: 600, letterSpacing: "0.1em", textTransform: "uppercase", color: "#a78bfa", marginBottom: 12 }}>
            Pricing
          </p>
          <h2 style={{ fontSize: "clamp(28px, 3.5vw, 42px)", fontWeight: 800, letterSpacing: "-0.04em", margin: "0 0 16px", color: "rgba(255,255,255,0.95)" }}>
            Simple, transparent pricing
          </h2>
          <p style={{ fontSize: 16, color: "rgba(255,255,255,0.42)" }}>
            All plans include a 14-day free trial. No credit card required.
          </p>
        </div>

        <div style={{
          display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 14,
          maxWidth: 1100, margin: "0 auto",
        }}>
          {PLANS.map(plan => (
            <div
              key={plan.name}
              style={{
                background: plan.highlight ? "rgba(124,58,237,0.08)" : "rgba(255,255,255,0.03)",
                border: plan.highlight ? "1px solid rgba(124,58,237,0.4)" : "1px solid rgba(255,255,255,0.07)",
                borderRadius: 16, padding: "28px 24px",
                display: "flex", flexDirection: "column",
                position: "relative", overflow: "hidden",
                boxShadow: plan.highlight ? "0 0 40px rgba(124,58,237,0.1)" : "none",
              }}
            >
              {plan.highlight && (
                <div style={{
                  position: "absolute", top: 0, left: "50%", transform: "translateX(-50%) translateY(-50%)",
                  padding: "4px 14px", borderRadius: 100, fontSize: 11, fontWeight: 700,
                  background: "linear-gradient(135deg, #7c3aed, #4f46e5)",
                  color: "white", whiteSpace: "nowrap",
                  boxShadow: "0 2px 10px rgba(124,58,237,0.4)",
                }}>
                  Most Popular
                </div>
              )}

              <div style={{ marginBottom: 24 }}>
                <h3 style={{ fontSize: 16, fontWeight: 700, letterSpacing: "-0.02em", margin: "0 0 4px", color: "rgba(255,255,255,0.92)" }}>
                  {plan.name}
                </h3>
                <p style={{ fontSize: 12, color: "rgba(255,255,255,0.35)", margin: "0 0 18px" }}>{plan.desc}</p>
                <div style={{ display: "flex", alignItems: "baseline", gap: 4 }}>
                  <span style={{ fontSize: 38, fontWeight: 800, letterSpacing: "-0.04em", color: "rgba(255,255,255,0.95)" }}>
                    {plan.price}
                  </span>
                  <span style={{ fontSize: 13, color: "rgba(255,255,255,0.35)" }}>/mo</span>
                </div>
              </div>

              <ul style={{ listStyle: "none", padding: 0, margin: "0 0 28px", flex: 1, display: "flex", flexDirection: "column", gap: 10 }}>
                {plan.features.map(f => (
                  <li key={f} style={{ display: "flex", alignItems: "flex-start", gap: 9, fontSize: 13, color: "rgba(255,255,255,0.55)", lineHeight: 1.4 }}>
                    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" style={{ flexShrink: 0, marginTop: 1 }}>
                      <path d="M2.5 7l3 3 6-6" stroke="#a78bfa" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                    {f}
                  </li>
                ))}
              </ul>

              <Link
                href="/sign-in"
                style={{
                  display: "block", textAlign: "center",
                  padding: "11px", borderRadius: 10,
                  fontSize: 14, fontWeight: 600, textDecoration: "none",
                  ...(plan.highlight
                    ? {
                        background: "linear-gradient(135deg, #7c3aed 0%, #4f46e5 100%)",
                        color: "white",
                        boxShadow: "0 4px 16px rgba(124,58,237,0.4)",
                      }
                    : {
                        background: "rgba(255,255,255,0.06)",
                        border: "1px solid rgba(255,255,255,0.12)",
                        color: "rgba(255,255,255,0.7)",
                      }
                  ),
                }}
              >
                {plan.cta}
              </Link>
            </div>
          ))}
        </div>
      </section>

      {/* ── CTA Banner ───────────────────────────────────────────── */}
      <section style={{ padding: "80px 24px" }}>
        <div style={{
          maxWidth: 740, margin: "0 auto", textAlign: "center",
          background: "rgba(255,255,255,0.025)",
          border: "1px solid rgba(124,58,237,0.25)",
          borderRadius: 24, padding: "64px 48px",
          position: "relative", overflow: "hidden",
          boxShadow: "0 0 80px rgba(124,58,237,0.08)",
        }}>
          <div style={{
            position: "absolute", inset: 0, pointerEvents: "none",
            background: "radial-gradient(ellipse at center, rgba(109,40,217,0.1) 0%, transparent 70%)",
          }} />
          <div style={{ position: "relative" }}>
            <h2 style={{ fontSize: "clamp(26px, 3.5vw, 40px)", fontWeight: 800, letterSpacing: "-0.04em", margin: "0 0 16px", color: "rgba(255,255,255,0.95)" }}>
              Ready to grow on autopilot?
            </h2>
            <p style={{ fontSize: 16, color: "rgba(255,255,255,0.42)", maxWidth: 440, margin: "0 auto 36px", lineHeight: 1.65 }}>
              Join agencies and brands already using SignafyAI to generate leads, create content, and handle social — without burning out their teams.
            </p>
            <Link href="/sign-in" style={{
              display: "inline-flex", alignItems: "center", gap: 8,
              padding: "14px 36px", borderRadius: 12, fontSize: 16, fontWeight: 700,
              background: "linear-gradient(135deg, #7c3aed 0%, #4f46e5 100%)",
              color: "white", textDecoration: "none",
              boxShadow: "0 8px 32px rgba(124,58,237,0.4)",
              letterSpacing: "-0.01em",
            }}>
              Start Your Free Trial
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                <path d="M3 7h8M7 3l4 4-4 4" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </Link>
          </div>
        </div>
      </section>

      {/* ── Footer ───────────────────────────────────────────────── */}
      <footer style={{
        borderTop: "1px solid rgba(255,255,255,0.05)",
        padding: "28px 32px",
        display: "flex", alignItems: "center", justifyContent: "space-between",
        flexWrap: "wrap", gap: 16,
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{
            width: 26, height: 26, borderRadius: 7,
            background: "linear-gradient(135deg, #7c3aed 0%, #4f46e5 100%)",
            display: "flex", alignItems: "center", justifyContent: "center",
          }}>
            <svg width="11" height="11" viewBox="0 0 15 15" fill="none">
              <path d="M2.5 7.5L6.5 3.5L8 5L5 7.5L8 10L6.5 11.5L2.5 7.5Z" fill="white" fillOpacity="0.9"/>
              <path d="M8 5L12.5 7.5L8 10L10 7.5L8 5Z" fill="white"/>
            </svg>
          </div>
          <span style={{ fontSize: 14, fontWeight: 700, letterSpacing: "-0.02em", color: "rgba(255,255,255,0.85)" }}>
            SignafyAI
          </span>
          <span style={{ fontSize: 12, color: "rgba(255,255,255,0.22)", marginLeft: 4 }}>
            © {new Date().getFullYear()} All rights reserved.
          </span>
        </div>
        <div style={{ display: "flex", gap: 24 }}>
          {["Privacy", "Terms", "Contact"].map(l => (
            <a key={l} href="#" style={{ fontSize: 13, color: "rgba(255,255,255,0.28)", textDecoration: "none" }}>
              {l}
            </a>
          ))}
        </div>
      </footer>
    </div>
  );
}
