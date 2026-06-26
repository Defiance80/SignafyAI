"use client";

import { useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";

const CHALLENGES = [
  "Not getting enough leads online",
  "Low search engine visibility",
  "Website isn't converting visitors",
  "Social media isn't driving results",
  "Can't track what's working",
  "Competitors are outranking me",
  "Other",
];

const REVENUE_RANGES = [
  "Under $10K/month",
  "$10K – $50K/month",
  "$50K – $150K/month",
  "$150K – $500K/month",
  "$500K+/month",
  "Prefer not to say",
];

const INDUSTRIES = [
  "Healthcare / Medical",
  "Home Services",
  "Professional Services",
  "Restaurant / Food & Beverage",
  "Retail / E-commerce",
  "Real Estate",
  "Beauty / Wellness",
  "Legal",
  "Education / Coaching",
  "Other",
];

function inputStyle(focused: boolean): React.CSSProperties {
  return {
    width: "100%", padding: "12px 16px", borderRadius: 12, fontSize: 14,
    background: "rgba(255,255,255,0.05)",
    border: `1px solid ${focused ? "rgba(124,58,237,0.5)" : "rgba(255,255,255,0.1)"}`,
    color: "rgba(255,255,255,0.9)", outline: "none", transition: "border-color 0.15s",
    boxSizing: "border-box" as const,
  };
}

function selectStyle(focused: boolean): React.CSSProperties {
  return {
    ...inputStyle(focused),
    appearance: "none" as const,
    backgroundImage: `url("data:image/svg+xml,%3Csvg width='12' height='8' viewBox='0 0 12 8' fill='none' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M1 1l5 5 5-5' stroke='rgba(255,255,255,0.4)' stroke-width='1.5' stroke-linecap='round'/%3E%3C/svg%3E")`,
    backgroundRepeat: "no-repeat",
    backgroundPosition: "right 14px center",
    paddingRight: 40,
  };
}

function FormContent() {
  const searchParams = useSearchParams();
  const ref = searchParams.get("ref") ?? "";

  const [form, setForm] = useState({
    name: "", business_name: ref, email: "", website: "",
    phone: "", industry: "", challenge: "", revenue_range: "",
  });
  const [focused, setFocused] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState("");

  function set(key: string, value: string) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name || !form.email || !form.business_name) {
      setError("Please fill in your name, business name, and email.");
      return;
    }
    setError("");
    setSubmitting(true);
    try {
      await fetch("/api/audit-requests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, ref }),
      });
      setSubmitted(true);
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  if (submitted) {
    return (
      <div style={{
        minHeight: "100dvh", background: "#09090f", display: "flex",
        alignItems: "center", justifyContent: "center", padding: "40px 20px",
        fontFamily: "system-ui, -apple-system, sans-serif",
      }}>
        <div style={{ textAlign: "center", maxWidth: 480 }}>
          <div style={{ fontSize: 56, marginBottom: 24 }}>✓</div>
          <h1 style={{ fontSize: 28, fontWeight: 800, color: "rgba(255,255,255,0.95)", letterSpacing: "-0.03em", margin: "0 0 12px" }}>
            You're on the list.
          </h1>
          <p style={{ fontSize: 16, color: "rgba(255,255,255,0.5)", lineHeight: 1.7, margin: "0 0 32px" }}>
            We'll review {form.business_name || "your business"}'s digital presence and reach out within 1 business day with your full audit — no strings attached.
          </p>
          <div style={{ padding: "20px 24px", borderRadius: 14, background: "rgba(124,58,237,0.08)", border: "1px solid rgba(124,58,237,0.2)" }}>
            <p style={{ margin: 0, fontSize: 14, color: "rgba(255,255,255,0.55)", lineHeight: 1.6 }}>
              Check your inbox at <strong style={{ color: "#a78bfa" }}>{form.email}</strong> — we'll send you a detailed breakdown of what we found and exactly what we'd fix first.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={{
      minHeight: "100dvh", background: "#09090f",
      fontFamily: "system-ui, -apple-system, sans-serif",
    }}>
      {/* Header */}
      <div style={{ borderBottom: "1px solid rgba(255,255,255,0.06)", padding: "20px 40px" }}>
        <div style={{ maxWidth: 640, margin: "0 auto", display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{ width: 28, height: 28, borderRadius: 8, background: "linear-gradient(135deg, #7c3aed, #4f46e5)", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M7 1l1.5 4h4l-3.3 2.4 1.3 4L7 9 3.5 11.4l1.3-4L1.5 5h4z" fill="white"/></svg>
          </div>
          <span style={{ fontSize: 15, fontWeight: 700, color: "rgba(255,255,255,0.9)", letterSpacing: "-0.02em" }}>SignafyAI</span>
        </div>
      </div>

      <div style={{ maxWidth: 560, margin: "0 auto", padding: "48px 24px 80px" }}>
        {/* Hero text */}
        <div style={{ marginBottom: 36 }}>
          <p style={{ fontSize: 13, fontWeight: 600, color: "#a78bfa", letterSpacing: "0.06em", textTransform: "uppercase", marginBottom: 12 }}>
            Free Digital Presence Audit
          </p>
          <h1 style={{ fontSize: 32, fontWeight: 800, color: "rgba(255,255,255,0.95)", letterSpacing: "-0.04em", lineHeight: 1.15, margin: "0 0 14px" }}>
            See exactly what's holding your business back online.
          </h1>
          <p style={{ fontSize: 15, color: "rgba(255,255,255,0.45)", lineHeight: 1.7, margin: 0 }}>
            We'll do a full audit of your website, SEO, social presence, and conversion gaps — then send you a clear breakdown with the 3 highest-impact fixes. No pitch. Just data.
          </p>
        </div>

        {/* What's included */}
        <div style={{ padding: "16px 20px", borderRadius: 12, background: "rgba(124,58,237,0.06)", border: "1px solid rgba(124,58,237,0.15)", marginBottom: 32, display: "flex", flexDirection: "column", gap: 10 }}>
          {[
            "SEO audit — why you're ranking (or not) for your top keywords",
            "Website conversion analysis — where visitors are dropping off",
            "Social & reputation scan — what customers say when you're not in the room",
          ].map((item, i) => (
            <div key={i} style={{ display: "flex", gap: 10, alignItems: "flex-start" }}>
              <span style={{ fontSize: 14, color: "#34d399", flexShrink: 0, marginTop: 1 }}>✓</span>
              <span style={{ fontSize: 13, color: "rgba(255,255,255,0.55)", lineHeight: 1.55 }}>{item}</span>
            </div>
          ))}
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          {/* Name + Business */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <div>
              <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "rgba(255,255,255,0.38)", marginBottom: 6, letterSpacing: "0.04em", textTransform: "uppercase" }}>Your Name *</label>
              <input
                value={form.name}
                onChange={(e) => set("name", e.target.value)}
                onFocus={() => setFocused("name")}
                onBlur={() => setFocused(null)}
                placeholder="Jane Smith"
                style={inputStyle(focused === "name")}
                required
              />
            </div>
            <div>
              <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "rgba(255,255,255,0.38)", marginBottom: 6, letterSpacing: "0.04em", textTransform: "uppercase" }}>Business Name *</label>
              <input
                value={form.business_name}
                onChange={(e) => set("business_name", e.target.value)}
                onFocus={() => setFocused("business_name")}
                onBlur={() => setFocused(null)}
                placeholder="Acme Dental"
                style={inputStyle(focused === "business_name")}
                required
              />
            </div>
          </div>

          {/* Email + Phone */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <div>
              <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "rgba(255,255,255,0.38)", marginBottom: 6, letterSpacing: "0.04em", textTransform: "uppercase" }}>Email *</label>
              <input
                type="email"
                value={form.email}
                onChange={(e) => set("email", e.target.value)}
                onFocus={() => setFocused("email")}
                onBlur={() => setFocused(null)}
                placeholder="jane@acmedental.com"
                style={inputStyle(focused === "email")}
                required
              />
            </div>
            <div>
              <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "rgba(255,255,255,0.38)", marginBottom: 6, letterSpacing: "0.04em", textTransform: "uppercase" }}>Phone</label>
              <input
                type="tel"
                value={form.phone}
                onChange={(e) => set("phone", e.target.value)}
                onFocus={() => setFocused("phone")}
                onBlur={() => setFocused(null)}
                placeholder="(555) 000-0000"
                style={inputStyle(focused === "phone")}
              />
            </div>
          </div>

          {/* Website */}
          <div>
            <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "rgba(255,255,255,0.38)", marginBottom: 6, letterSpacing: "0.04em", textTransform: "uppercase" }}>Website</label>
            <input
              type="url"
              value={form.website}
              onChange={(e) => set("website", e.target.value)}
              onFocus={() => setFocused("website")}
              onBlur={() => setFocused(null)}
              placeholder="https://acmedental.com"
              style={inputStyle(focused === "website")}
            />
          </div>

          {/* Industry */}
          <div>
            <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "rgba(255,255,255,0.38)", marginBottom: 6, letterSpacing: "0.04em", textTransform: "uppercase" }}>Industry</label>
            <select
              value={form.industry}
              onChange={(e) => set("industry", e.target.value)}
              onFocus={() => setFocused("industry")}
              onBlur={() => setFocused(null)}
              style={selectStyle(focused === "industry")}
            >
              <option value="" style={{ background: "#1a1a2e" }}>Select your industry</option>
              {INDUSTRIES.map((ind) => (
                <option key={ind} value={ind} style={{ background: "#1a1a2e" }}>{ind}</option>
              ))}
            </select>
          </div>

          {/* Biggest challenge */}
          <div>
            <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "rgba(255,255,255,0.38)", marginBottom: 8, letterSpacing: "0.04em", textTransform: "uppercase" }}>Biggest challenge right now</label>
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              {CHALLENGES.map((c) => (
                <label key={c} style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 14px", borderRadius: 10, cursor: "pointer", transition: "background 0.12s", background: form.challenge === c ? "rgba(124,58,237,0.1)" : "transparent", border: `1px solid ${form.challenge === c ? "rgba(124,58,237,0.35)" : "rgba(255,255,255,0.07)"}` }}>
                  <input
                    type="radio"
                    name="challenge"
                    value={c}
                    checked={form.challenge === c}
                    onChange={() => set("challenge", c)}
                    style={{ accentColor: "#7c3aed", width: 14, height: 14, flexShrink: 0 }}
                  />
                  <span style={{ fontSize: 13, color: form.challenge === c ? "rgba(255,255,255,0.88)" : "rgba(255,255,255,0.5)" }}>{c}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Revenue range */}
          <div>
            <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "rgba(255,255,255,0.38)", marginBottom: 6, letterSpacing: "0.04em", textTransform: "uppercase" }}>Monthly revenue <span style={{ fontWeight: 400, textTransform: "none", letterSpacing: 0 }}>(optional)</span></label>
            <select
              value={form.revenue_range}
              onChange={(e) => set("revenue_range", e.target.value)}
              onFocus={() => setFocused("revenue")}
              onBlur={() => setFocused(null)}
              style={selectStyle(focused === "revenue")}
            >
              <option value="" style={{ background: "#1a1a2e" }}>Select a range</option>
              {REVENUE_RANGES.map((r) => (
                <option key={r} value={r} style={{ background: "#1a1a2e" }}>{r}</option>
              ))}
            </select>
          </div>

          {error && (
            <p style={{ fontSize: 13, color: "#f87171", margin: 0 }}>{error}</p>
          )}

          <button
            type="submit"
            disabled={submitting}
            style={{
              width: "100%", padding: "14px 24px", borderRadius: 12, fontSize: 15, fontWeight: 700,
              cursor: submitting ? "not-allowed" : "pointer", border: "none", marginTop: 8,
              background: "linear-gradient(135deg, #7c3aed 0%, #4f46e5 100%)",
              color: "white", boxShadow: "0 4px 20px rgba(124,58,237,0.35)",
              opacity: submitting ? 0.7 : 1, transition: "opacity 0.2s",
              letterSpacing: "-0.01em",
            }}
          >
            {submitting ? "Submitting…" : "Get My Free Audit →"}
          </button>

          <p style={{ fontSize: 12, color: "rgba(255,255,255,0.22)", textAlign: "center", margin: 0, lineHeight: 1.6 }}>
            No spam. No pitch calls unless you ask. We'll email your audit within 1 business day.
          </p>
        </form>
      </div>
    </div>
  );
}

export default function FreeAuditPage() {
  return (
    <Suspense fallback={
      <div style={{ minHeight: "100dvh", background: "#09090f", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <div style={{ width: 24, height: 24, borderRadius: "50%", border: "2px solid rgba(124,58,237,0.3)", borderTopColor: "#7c3aed", animation: "spin 0.8s linear infinite" }} />
      </div>
    }>
      <FormContent />
    </Suspense>
  );
}
