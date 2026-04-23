"use client";

import Link from "next/link";

const NAV_LINKS = ["Features", "Pricing", "Docs", "Blog"];

const MODULES = [
  {
    icon: "🎯",
    title: "Lead Generation",
    desc: "Find, score, and enrich prospects across industries. Filter by niche, city, intent, and source. Export ready-to-act lead lists.",
    color: "#7c3aed",
    stats: "2,847 leads found",
  },
  {
    icon: "✍️",
    title: "Content Engine",
    desc: "Generate on-brand captions, video hooks, and posts for all 6 platforms in one click — guided by your brand voice profile.",
    color: "#0891b2",
    stats: "184 posts created",
  },
  {
    icon: "💬",
    title: "Social Inbox",
    desc: "Classify inbound comments by intent. Get brand-matched reply drafts. Approve, edit, or escalate — full control over every response.",
    color: "#059669",
    stats: "943 replies handled",
  },
  {
    icon: "📈",
    title: "SEO Lab",
    desc: "Generate keyword clusters with intent mapping, local SEO combos, FAQ ideas, metadata, and landing page content briefs.",
    color: "#d97706",
    stats: "320 keywords clustered",
  },
];

const FEATURES = [
  { title: "Multi-Tenant Architecture", desc: "Each client brand is fully isolated. Perfect for agencies managing multiple accounts." },
  { title: "n8n Automation Backend", desc: "All heavy processing runs on your self-hosted n8n instance. You own the automation." },
  { title: "Brand Voice Engine", desc: "Define tone, vocabulary, CTA style, and paste examples. Every output sounds like you." },
  { title: "Real-Time Job Status", desc: "Supabase Realtime pushes updates as your automation workflows complete." },
  { title: "Role-Based Access", desc: "Admin, owner, member, and viewer roles with full permission enforcement." },
  { title: "Campaign Calendar", desc: "Schedule, stagger, and manage content across all channels from one view." },
];

const PLANS = [
  {
    name: "Starter",
    price: "$49",
    desc: "Perfect for solo consultants",
    features: ["1 brand workspace", "500 leads/mo", "100 content generations", "2 social accounts", "Email support"],
    cta: "Start free trial",
    highlight: false,
  },
  {
    name: "Pro",
    price: "$149",
    desc: "For growing teams",
    features: ["5 brand workspaces", "2,500 leads/mo", "500 content generations", "10 social accounts", "Priority support", "Campaign calendar"],
    cta: "Start free trial",
    highlight: true,
  },
  {
    name: "Agency",
    price: "$399",
    desc: "For agencies at scale",
    features: ["Unlimited workspaces", "10,000 leads/mo", "Unlimited content", "Unlimited social accounts", "Dedicated support", "Admin panel", "Custom workflows"],
    cta: "Contact sales",
    highlight: false,
  },
];

export default function LandingPage() {
  return (
    <div style={{ background: "var(--color-bg)", minHeight: "100dvh" }}>

      {/* Nav */}
      <nav
        className="sticky top-0 z-50 flex items-center justify-between px-5 sm:px-8 py-4"
        style={{
          background: "rgba(7,7,11,0.85)",
          backdropFilter: "blur(16px)",
          borderBottom: "1px solid rgba(255,255,255,0.05)",
        }}
      >
        {/* Logo */}
        <Link href="/" className="flex items-center gap-3">
          <div
            className="w-8 h-8 rounded-xl flex items-center justify-center"
            style={{
              background: "linear-gradient(135deg, #7c3aed 0%, #4f46e5 100%)",
              boxShadow: "0 0 16px rgba(124,58,237,0.4)",
            }}
          >
            <svg width="14" height="14" viewBox="0 0 15 15" fill="none">
              <path d="M2.5 7.5L6.5 3.5L8 5L5 7.5L8 10L6.5 11.5L2.5 7.5Z" fill="white" fillOpacity="0.9" />
              <path d="M8 5L12.5 7.5L8 10L10 7.5L8 5Z" fill="white" />
            </svg>
          </div>
          <span
            className="text-lg font-bold hidden sm:block"
            style={{ fontFamily: "var(--font-syne)", color: "var(--color-text-1)" }}
          >
            SignafyAI
          </span>
        </Link>

        {/* Desktop nav links */}
        <div className="hidden md:flex items-center gap-1">
          {NAV_LINKS.map((link) => (
            <a
              key={link}
              href={`#${link.toLowerCase()}`}
              className="px-4 py-2 rounded-lg text-sm font-medium transition-colors"
              style={{ color: "var(--color-text-2)" }}
              onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.color = "var(--color-text-1)"; }}
              onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.color = "var(--color-text-2)"; }}
            >
              {link}
            </a>
          ))}
        </div>

        {/* CTA buttons */}
        <div className="flex items-center gap-3">
          <Link
            href="/sign-in"
            className="text-sm font-medium transition-colors hidden sm:block"
            style={{ color: "var(--color-text-2)" }}
          >
            Sign in
          </Link>
          <Link
            href="/sign-in"
            className="px-4 py-2 rounded-xl text-sm font-semibold transition-all duration-200"
            style={{
              background: "linear-gradient(135deg, #7c3aed 0%, #4f46e5 100%)",
              color: "white",
              boxShadow: "0 4px 12px rgba(124,58,237,0.3)",
            }}
          >
            Get started
          </Link>
        </div>
      </nav>

      {/* Hero */}
      <section className="relative px-5 sm:px-8 pt-20 sm:pt-32 pb-20 sm:pb-32 overflow-hidden text-center">
        {/* Background effects */}
        <div
          className="absolute top-0 left-1/2 -translate-x-1/2 w-[900px] h-[600px] pointer-events-none"
          style={{
            background: "radial-gradient(ellipse at center top, rgba(109,40,217,0.18) 0%, transparent 70%)",
          }}
        />
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            backgroundImage: `linear-gradient(rgba(255,255,255,0.02) 1px, transparent 1px),
                              linear-gradient(90deg, rgba(255,255,255,0.02) 1px, transparent 1px)`,
            backgroundSize: "60px 60px",
            maskImage: "radial-gradient(ellipse at center, black 30%, transparent 80%)",
          }}
        />

        <div className="relative max-w-4xl mx-auto">
          {/* Badge */}
          <div className="inline-flex items-center gap-2 rounded-full px-4 py-2 text-xs font-semibold mb-8 animate-fade-up"
            style={{
              background: "rgba(124,58,237,0.1)",
              border: "1px solid rgba(124,58,237,0.3)",
              color: "#a78bfa",
            }}
          >
            <span className="w-1.5 h-1.5 rounded-full bg-violet-400 animate-pulse" />
            Now in Beta — Limited Spots Available
          </div>

          {/* Headline */}
          <h1
            className="text-4xl sm:text-5xl lg:text-6xl xl:text-7xl font-bold leading-[1.1] mb-6 animate-fade-up delay-100"
            style={{ fontFamily: "var(--font-syne)", color: "var(--color-text-1)" }}
          >
            Your AI-Powered{" "}
            <span className="gradient-text">Growth Operating</span>
            <br />System
          </h1>

          {/* Sub */}
          <p
            className="text-lg sm:text-xl max-w-2xl mx-auto mb-10 leading-relaxed animate-fade-up delay-200"
            style={{ color: "var(--color-text-2)" }}
          >
            Generate leads, create on-brand content, automate social responses, and drive traffic — all connected to your business profile and powered by your own n8n automation engine.
          </p>

          {/* CTAs */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 animate-fade-up delay-300">
            <Link
              href="/sign-in"
              className="w-full sm:w-auto px-8 py-4 rounded-2xl text-base font-semibold transition-all duration-200"
              style={{
                background: "linear-gradient(135deg, #7c3aed 0%, #4f46e5 100%)",
                color: "white",
                boxShadow: "0 8px 24px rgba(124,58,237,0.35)",
              }}
            >
              Try the demo →
            </Link>
            <a
              href="#features"
              className="w-full sm:w-auto px-8 py-4 rounded-2xl text-base font-semibold transition-all duration-200"
              style={{
                background: "transparent",
                border: "1px solid var(--color-border)",
                color: "var(--color-text-2)",
              }}
            >
              See how it works
            </a>
          </div>

          {/* Trust bar */}
          <div className="flex flex-wrap items-center justify-center gap-6 mt-14 animate-fade-up delay-500">
            {["No credit card required", "Setup in 5 minutes", "Cancel anytime"].map((t) => (
              <div key={t} className="flex items-center gap-2 text-sm" style={{ color: "var(--color-text-muted)" }}>
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                  <path d="M2.5 7l3 3 6-6" stroke="#34d399" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
                {t}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Modules */}
      <section id="features" className="px-5 sm:px-8 py-16 sm:py-24 max-w-7xl mx-auto">
        <div className="text-center mb-14">
          <p className="text-sm font-semibold mb-3" style={{ color: "var(--color-accent-light)" }}>
            Four Engines. One Platform.
          </p>
          <h2
            className="text-3xl sm:text-4xl font-bold mb-4"
            style={{ fontFamily: "var(--font-syne)", color: "var(--color-text-1)" }}
          >
            Everything your growth team needs
          </h2>
          <p className="text-base max-w-xl mx-auto" style={{ color: "var(--color-text-2)" }}>
            Each module is connected to a unified business profile and brand voice engine, so every output is consistent and on-brand.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
          {MODULES.map((mod, i) => (
            <div
              key={mod.title}
              className="rounded-2xl p-7 relative overflow-hidden group transition-all duration-300"
              style={{
                background: "var(--color-surface)",
                border: "1px solid var(--color-border)",
              }}
              onMouseEnter={(e) => {
                (e.currentTarget as HTMLElement).style.border = `1px solid ${mod.color}40`;
                (e.currentTarget as HTMLElement).style.boxShadow = `0 12px 32px ${mod.color}12`;
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLElement).style.border = "1px solid var(--color-border)";
                (e.currentTarget as HTMLElement).style.boxShadow = "none";
              }}
            >
              <div
                className="absolute top-0 right-0 w-48 h-48 pointer-events-none opacity-20"
                style={{
                  background: `radial-gradient(circle, ${mod.color}40 0%, transparent 70%)`,
                  transform: "translate(30%, -30%)",
                }}
              />
              <div className="relative">
                <div className="text-3xl mb-5">{mod.icon}</div>
                <h3
                  className="text-lg font-bold mb-3"
                  style={{ fontFamily: "var(--font-syne)", color: "var(--color-text-1)" }}
                >
                  {mod.title}
                </h3>
                <p className="text-sm leading-relaxed mb-5" style={{ color: "var(--color-text-2)" }}>
                  {mod.desc}
                </p>
                <div
                  className="inline-flex items-center gap-2 text-xs font-semibold px-3 py-1.5 rounded-full"
                  style={{ background: `${mod.color}15`, color: mod.color }}
                >
                  <span className="w-1.5 h-1.5 rounded-full" style={{ background: mod.color }} />
                  {mod.stats}
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Features grid */}
      <section className="px-5 sm:px-8 py-16 sm:py-24 max-w-7xl mx-auto border-t" style={{ borderColor: "var(--color-border-subtle)" }}>
        <div className="text-center mb-14">
          <h2
            className="text-3xl sm:text-4xl font-bold mb-4"
            style={{ fontFamily: "var(--font-syne)", color: "var(--color-text-1)" }}
          >
            Built for agencies and serious brands
          </h2>
          <p className="text-base max-w-xl mx-auto" style={{ color: "var(--color-text-2)" }}>
            Enterprise-grade architecture at an accessible price point.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {FEATURES.map((f) => (
            <div
              key={f.title}
              className="rounded-xl p-6 transition-all duration-200"
              style={{ background: "var(--color-surface)", border: "1px solid var(--color-border)" }}
              onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.border = "1px solid rgba(124,58,237,0.25)"; }}
              onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.border = "1px solid var(--color-border)"; }}
            >
              <div
                className="w-8 h-8 rounded-lg flex items-center justify-center mb-4"
                style={{ background: "rgba(124,58,237,0.12)" }}
              >
                <div className="w-2 h-2 rounded-full" style={{ background: "var(--color-accent-light)" }} />
              </div>
              <h3 className="font-semibold text-sm mb-2" style={{ color: "var(--color-text-1)", fontFamily: "var(--font-syne)" }}>
                {f.title}
              </h3>
              <p className="text-sm leading-relaxed" style={{ color: "var(--color-text-2)" }}>{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Pricing */}
      <section id="pricing" className="px-5 sm:px-8 py-16 sm:py-24 max-w-7xl mx-auto border-t" style={{ borderColor: "var(--color-border-subtle)" }}>
        <div className="text-center mb-14">
          <p className="text-sm font-semibold mb-3" style={{ color: "var(--color-accent-light)" }}>Pricing</p>
          <h2
            className="text-3xl sm:text-4xl font-bold mb-4"
            style={{ fontFamily: "var(--font-syne)", color: "var(--color-text-1)" }}
          >
            Simple, transparent pricing
          </h2>
          <p className="text-base" style={{ color: "var(--color-text-2)" }}>
            All plans include a 14-day free trial. No credit card required.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-5 max-w-5xl mx-auto">
          {PLANS.map((plan) => (
            <div
              key={plan.name}
              className="rounded-2xl p-7 flex flex-col relative overflow-hidden"
              style={{
                background: plan.highlight ? "rgba(124,58,237,0.08)" : "var(--color-surface)",
                border: plan.highlight
                  ? "1px solid rgba(124,58,237,0.4)"
                  : "1px solid var(--color-border)",
                boxShadow: plan.highlight ? "0 0 40px rgba(124,58,237,0.12)" : "none",
              }}
            >
              {plan.highlight && (
                <div
                  className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 px-3 py-1 rounded-full text-xs font-semibold"
                  style={{ background: "var(--color-accent)", color: "white" }}
                >
                  Most Popular
                </div>
              )}
              <div className="mb-6">
                <h3
                  className="font-bold text-base mb-1"
                  style={{ fontFamily: "var(--font-syne)", color: "var(--color-text-1)" }}
                >
                  {plan.name}
                </h3>
                <p className="text-xs mb-4" style={{ color: "var(--color-text-muted)" }}>{plan.desc}</p>
                <div className="flex items-baseline gap-1">
                  <span
                    className="text-4xl font-bold"
                    style={{ fontFamily: "var(--font-syne)", color: "var(--color-text-1)" }}
                  >
                    {plan.price}
                  </span>
                  <span className="text-sm" style={{ color: "var(--color-text-muted)" }}>/mo</span>
                </div>
              </div>
              <ul className="space-y-2.5 mb-8 flex-1">
                {plan.features.map((f) => (
                  <li key={f} className="flex items-center gap-2.5 text-sm" style={{ color: "var(--color-text-2)" }}>
                    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" className="flex-shrink-0">
                      <path d="M2.5 7l3 3 6-6" stroke="#a78bfa" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                    {f}
                  </li>
                ))}
              </ul>
              <Link
                href="/sign-in"
                className="block text-center py-3 rounded-xl text-sm font-semibold transition-all duration-200"
                style={
                  plan.highlight
                    ? {
                        background: "linear-gradient(135deg, #7c3aed 0%, #4f46e5 100%)",
                        color: "white",
                        boxShadow: "0 4px 12px rgba(124,58,237,0.35)",
                      }
                    : {
                        background: "var(--color-surface-2)",
                        border: "1px solid var(--color-border)",
                        color: "var(--color-text-1)",
                      }
                }
              >
                {plan.cta}
              </Link>
            </div>
          ))}
        </div>
      </section>

      {/* CTA Banner */}
      <section className="px-5 sm:px-8 py-16 sm:py-24 max-w-4xl mx-auto text-center">
        <div
          className="rounded-3xl p-10 sm:p-16 relative overflow-hidden"
          style={{
            background: "var(--color-surface)",
            border: "1px solid rgba(124,58,237,0.3)",
            boxShadow: "0 0 60px rgba(124,58,237,0.1)",
          }}
        >
          <div
            className="absolute inset-0 pointer-events-none"
            style={{
              background: "radial-gradient(ellipse at center, rgba(109,40,217,0.1) 0%, transparent 70%)",
            }}
          />
          <div className="relative">
            <div className="text-4xl mb-6">🚀</div>
            <h2
              className="text-3xl sm:text-4xl font-bold mb-4"
              style={{ fontFamily: "var(--font-syne)", color: "var(--color-text-1)" }}
            >
              Ready to grow on autopilot?
            </h2>
            <p className="text-base mb-8 max-w-lg mx-auto" style={{ color: "var(--color-text-2)" }}>
              Join agencies and brands already using SignafyAI to generate leads, create content, and handle social — without burning out their teams.
            </p>
            <Link
              href="/sign-in"
              className="inline-flex items-center gap-2 px-8 py-4 rounded-2xl text-base font-semibold transition-all duration-200"
              style={{
                background: "linear-gradient(135deg, #7c3aed 0%, #4f46e5 100%)",
                color: "white",
                boxShadow: "0 8px 24px rgba(124,58,237,0.35)",
              }}
            >
              Try the demo free
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                <path d="M3 8h10M9 4l4 4-4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer
        className="px-5 sm:px-8 py-8 flex flex-col sm:flex-row items-center justify-between gap-4"
        style={{ borderTop: "1px solid var(--color-border-subtle)" }}
      >
        <div className="flex items-center gap-3">
          <div
            className="w-7 h-7 rounded-lg flex items-center justify-center"
            style={{ background: "linear-gradient(135deg, #7c3aed 0%, #4f46e5 100%)" }}
          >
            <svg width="12" height="12" viewBox="0 0 15 15" fill="none">
              <path d="M2.5 7.5L6.5 3.5L8 5L5 7.5L8 10L6.5 11.5L2.5 7.5Z" fill="white" fillOpacity="0.9" />
              <path d="M8 5L12.5 7.5L8 10L10 7.5L8 5Z" fill="white" />
            </svg>
          </div>
          <span className="text-sm font-bold" style={{ fontFamily: "var(--font-syne)", color: "var(--color-text-1)" }}>
            SignafyAI
          </span>
          <span className="text-xs" style={{ color: "var(--color-text-muted)" }}>
            © {new Date().getFullYear()} All rights reserved.
          </span>
        </div>
        <div className="flex items-center gap-6">
          {["Privacy", "Terms", "Contact"].map((l) => (
            <a key={l} href="#" className="text-xs transition-colors" style={{ color: "var(--color-text-muted)" }}>
              {l}
            </a>
          ))}
        </div>
      </footer>
    </div>
  );
}
