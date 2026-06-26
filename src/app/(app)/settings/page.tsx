"use client";

import { useState, useEffect } from "react";

const NOTIFICATIONS = [
  { label: "New leads discovered", description: "Get notified when new leads match your criteria", key: "leads", on: true },
  { label: "Content ready for review", description: "AI-generated content awaiting approval", key: "content", on: true },
  { label: "Social inbox messages", description: "New inbound messages from connected platforms", key: "social", on: true },
  { label: "Campaign status changes", description: "When campaigns start, pause, or complete", key: "campaigns", on: false },
  { label: "Weekly performance digest", description: "Summary of key metrics every Monday", key: "digest", on: true },
  { label: "SEO ranking changes", description: "Keyword position changes above threshold", key: "seo", on: false },
];

const PLAN_PRICES: Record<string, number> = { free: 0, starter: 49, pro: 149, agency: 399 };
const PLAN_COLORS: Record<string, string> = { free: "#94a3b8", starter: "#60a5fa", pro: "#a78bfa", agency: "#f59e0b" };

interface MeData {
  user: { name: string; email: string; avatar_url: string | null };
  org: { id: string; name: string; plan: string; subscription_status: string; stripe_customer_id: string | null; usage_leads_mo: number; limits_leads_mo: number; usage_content_mo: number; limits_content_mo: number };
  role: string;
}

export default function SettingsPage() {
  const [me, setMe] = useState<MeData | null>(null);
  const [notifs, setNotifs] = useState<Record<string, boolean>>(Object.fromEntries(NOTIFICATIONS.map((n) => [n.key, n.on])));
  const [isBillingLoading, setIsBillingLoading] = useState(false);
  const [billingError, setBillingError] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [company, setCompany] = useState("");
  const [savingProfile, setSavingProfile] = useState(false);
  const [profileSaved, setProfileSaved] = useState(false);

  useEffect(() => {
    fetch("/api/me")
      .then((r) => r.ok ? r.json() : null)
      .then((d: MeData | null) => {
        if (d) {
          setMe(d);
          setName(d.user.name ?? "");
          setCompany(d.org.name ?? "");
        }
      })
      .catch(() => {});
  }, []);

  const toggleNotif = (key: string) => setNotifs((prev) => ({ ...prev, [key]: !prev[key] }));

  async function handleManagePlan() {
    setBillingError(null);
    setIsBillingLoading(true);
    try {
      const res = await fetch("/api/billing/portal", { method: "POST" });
      const data = await res.json() as { url?: string; error?: string };
      if (!res.ok) throw new Error(data.error ?? "Billing unavailable");
      if (data.url) window.location.href = data.url;
    } catch (e) {
      setBillingError(e instanceof Error ? e.message : "Could not open billing portal.");
    } finally {
      setIsBillingLoading(false);
    }
  }

  async function handleSaveProfile() {
    setSavingProfile(true);
    setProfileSaved(false);
    try {
      const res = await fetch("/api/settings/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim(), org_name: company.trim() }),
      });
      if (!res.ok) {
        const d = await res.json() as { error?: string };
        throw new Error(d.error ?? "Save failed");
      }
      setProfileSaved(true);
      setTimeout(() => setProfileSaved(false), 2500);
    } catch {
      // silently ignore — user sees no feedback change
    } finally {
      setSavingProfile(false);
    }
  }

  const plan = me?.org.plan ?? "free";
  const price = PLAN_PRICES[plan] ?? 0;
  const planColor = PLAN_COLORS[plan] ?? "#94a3b8";
  const userInitial = (me?.user.name ?? "U").charAt(0).toUpperCase();

  return (
    <div style={{ padding: "36px 40px", maxWidth: 1000, margin: "0 auto", display: "flex", flexDirection: "column", gap: 28 }}>
      {/* Header */}
      <div className="animate-fade-up">
        <p className="text-sm mb-1" style={{ color: "var(--color-text-2)" }}>Configure your workspace</p>
        <h1 style={{ fontSize: 36, fontWeight: 800, letterSpacing: "-0.04em", color: "var(--c1)", margin: 0, lineHeight: 1.1 }}>Settings</h1>
      </div>

      {/* Profile */}
      <div className="animate-fade-up" style={{ borderRadius: 16, padding: "28px 32px", background: "var(--color-surface)", border: "1px solid var(--color-border)", animationDelay: "0.07s" }}>
        <h2 style={{ fontSize: 13, fontWeight: 700, marginBottom: 20, color: "var(--c2)", letterSpacing: "0.06em", textTransform: "uppercase" }}>Profile</h2>
        <div style={{ display: "flex", alignItems: "flex-start", gap: 20 }}>
          <div style={{ width: 60, height: 60, borderRadius: 14, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 22, fontWeight: 700, flexShrink: 0, background: "rgba(124,58,237,0.15)", color: "#a78bfa" }}>{userInitial}</div>
          <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 14 }}>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              <div>
                <label style={{ fontSize: 12, fontWeight: 500, display: "block", marginBottom: 6, color: "var(--c3)" }}>Name</label>
                <input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  style={{ width: "100%", padding: "10px 14px", borderRadius: 10, fontSize: 14, outline: "none", background: "var(--color-surface-2)", border: "1px solid var(--color-border-subtle)", color: "var(--c1)" }}
                />
              </div>
              <div>
                <label style={{ fontSize: 12, fontWeight: 500, display: "block", marginBottom: 6, color: "var(--c3)" }}>Email</label>
                <input
                  value={me?.user.email ?? ""}
                  readOnly
                  style={{ width: "100%", padding: "10px 14px", borderRadius: 10, fontSize: 14, outline: "none", background: "var(--color-surface-2)", border: "1px solid var(--color-border-subtle)", color: "var(--c3)", cursor: "default" }}
                />
              </div>
            </div>
            <div>
              <label style={{ fontSize: 12, fontWeight: 500, display: "block", marginBottom: 6, color: "var(--c3)" }}>Workspace name</label>
              <input
                value={company}
                onChange={(e) => setCompany(e.target.value)}
                style={{ width: "100%", padding: "10px 14px", borderRadius: 10, fontSize: 14, outline: "none", background: "var(--color-surface-2)", border: "1px solid var(--color-border-subtle)", color: "var(--c1)" }}
              />
            </div>
            <button
              onClick={handleSaveProfile}
              disabled={savingProfile}
              style={{
                alignSelf: "flex-start", padding: "10px 20px", borderRadius: 10, fontSize: 14, fontWeight: 600, cursor: savingProfile ? "not-allowed" : "pointer", transition: "all 0.15s",
                background: profileSaved ? "rgba(52,211,153,0.12)" : "rgba(124,58,237,0.12)",
                border: profileSaved ? "1px solid rgba(52,211,153,0.25)" : "1px solid rgba(124,58,237,0.25)",
                color: profileSaved ? "#34d399" : "#a78bfa",
              }}
            >
              {savingProfile ? "Saving…" : profileSaved ? "Saved!" : "Save changes"}
            </button>
          </div>
        </div>
      </div>

      {/* Usage */}
      {me && (
        <div className="animate-fade-up" style={{ borderRadius: 16, padding: "28px 32px", background: "var(--color-surface)", border: "1px solid var(--color-border)", animationDelay: "0.11s" }}>
          <h2 style={{ fontSize: 13, fontWeight: 700, marginBottom: 20, color: "var(--c2)", letterSpacing: "0.06em", textTransform: "uppercase" }}>Usage this month</h2>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
            {[
              { label: "Leads", used: me.org.usage_leads_mo, limit: me.org.limits_leads_mo, color: "#6d28d9" },
              { label: "Content pieces", used: me.org.usage_content_mo, limit: me.org.limits_content_mo, color: "#0891b2" },
            ].map((u) => {
              const pct = Math.min(100, Math.round((u.used / u.limit) * 100));
              return (
                <div key={u.label} style={{ borderRadius: 12, padding: "18px 20px", background: "var(--color-surface-2)", border: "1px solid var(--color-border-subtle)" }}>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
                    <span style={{ fontSize: 13, fontWeight: 500, color: "var(--c3)" }}>{u.label}</span>
                    <span style={{ fontSize: 13, fontWeight: 600, color: "var(--c1)" }}>{u.used.toLocaleString()} / {u.limit.toLocaleString()}</span>
                  </div>
                  <div style={{ width: "100%", height: 5, borderRadius: 999, background: "var(--o2)" }}>
                    <div style={{ height: 5, borderRadius: 999, transition: "all 0.3s", width: `${pct}%`, background: pct > 80 ? "#f87171" : u.color }} />
                  </div>
                  <span style={{ fontSize: 11, marginTop: 6, display: "block", color: "var(--c3)" }}>{pct}% used</span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Brand Voice */}
      <div className="animate-fade-up" style={{ borderRadius: 16, padding: "28px 32px", background: "var(--color-surface)", border: "1px solid var(--color-border)", animationDelay: "0.14s" }}>
        <h2 style={{ fontSize: 13, fontWeight: 700, marginBottom: 20, color: "var(--c2)", letterSpacing: "0.06em", textTransform: "uppercase" }}>Brand Voice</h2>
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <div>
            <label style={{ fontSize: 12, fontWeight: 500, display: "block", marginBottom: 8, color: "var(--c3)" }}>Tone</label>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
              {["Professional", "Warm", "Consultative", "Bold", "Casual"].map((t, i) => (
                <span key={t} style={{
                  padding: "7px 14px", borderRadius: 8, fontSize: 13, fontWeight: 500, cursor: "pointer", transition: "all 0.15s",
                  background: i < 3 ? "rgba(124,58,237,0.15)" : "var(--color-surface-2)",
                  border: i < 3 ? "1px solid rgba(124,58,237,0.3)" : "1px solid var(--color-border-subtle)",
                  color: i < 3 ? "#a78bfa" : "var(--c3)",
                }}>{t}</span>
              ))}
            </div>
          </div>
          <div>
            <label style={{ fontSize: 12, fontWeight: 500, display: "block", marginBottom: 8, color: "var(--c3)" }}>Brand description</label>
            <textarea
              defaultValue="We help marketing agencies and DTC brands scale with AI-powered lead generation, content creation, and social management."
              rows={3}
              style={{ width: "100%", padding: "10px 14px", borderRadius: 10, fontSize: 14, outline: "none", resize: "none", background: "var(--color-surface-2)", border: "1px solid var(--color-border-subtle)", color: "var(--c1)", lineHeight: 1.6 }}
            />
          </div>
        </div>
      </div>

      {/* Notifications */}
      <div className="animate-fade-up" style={{ borderRadius: 16, padding: "28px 32px", background: "var(--color-surface)", border: "1px solid var(--color-border)", animationDelay: "0.21s" }}>
        <h2 style={{ fontSize: 13, fontWeight: 700, marginBottom: 20, color: "var(--c2)", letterSpacing: "0.06em", textTransform: "uppercase" }}>Notifications</h2>
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {NOTIFICATIONS.map((n) => (
            <div key={n.key} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "16px 20px", borderRadius: 12, background: "var(--color-surface-2)", border: "1px solid var(--color-border-subtle)" }}>
              <div style={{ flex: 1, minWidth: 0, paddingRight: 16 }}>
                <div style={{ fontSize: 14, fontWeight: 500, color: "var(--c1)", marginBottom: 2 }}>{n.label}</div>
                <div style={{ fontSize: 13, color: "var(--c3)" }}>{n.description}</div>
              </div>
              <button
                onClick={() => toggleNotif(n.key)}
                style={{ width: 40, height: 24, borderRadius: 999, position: "relative", transition: "all 0.2s", flexShrink: 0, border: "none", cursor: "pointer", background: notifs[n.key] ? "#7c3aed" : "var(--c5)" }}
              >
                <div style={{ width: 16, height: 16, borderRadius: "50%", background: "white", position: "absolute", top: 4, transition: "all 0.2s", left: notifs[n.key] ? 20 : 4 }} />
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Billing */}
      <div className="animate-fade-up" style={{ borderRadius: 16, padding: "28px 32px", position: "relative", overflow: "hidden", background: "var(--color-surface)", border: "1px solid var(--color-border)", animationDelay: "0.28s" }}>
        <div style={{ position: "absolute", inset: 0, pointerEvents: "none", background: "radial-gradient(ellipse at 80% 50%, rgba(109,40,217,0.06) 0%, transparent 70%)" }} />
        <div style={{ position: "relative" }}>
          <h2 style={{ fontSize: 13, fontWeight: 700, marginBottom: 20, color: "var(--c2)", letterSpacing: "0.06em", textTransform: "uppercase" }}>Plan & Billing</h2>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16, padding: "18px 22px", borderRadius: 12, background: "rgba(124,58,237,0.08)", border: "1px solid rgba(124,58,237,0.2)", flexWrap: "wrap" }}>
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
                <span style={{ fontSize: 15, fontWeight: 700, textTransform: "capitalize", color: "var(--c1)" }}>{plan} Plan</span>
                <span style={{ fontSize: 11, padding: "3px 8px", borderRadius: 6, fontWeight: 600, textTransform: "capitalize", background: `${planColor}20`, color: planColor }}>
                  {me?.org.subscription_status ?? "active"}
                </span>
              </div>
              <div style={{ fontSize: 13, color: "var(--c3)" }}>
                {price > 0 ? `$${price}/month` : "Free forever"} ·{" "}
                {me?.org.usage_leads_mo ?? 0} of {me?.org.limits_leads_mo ?? 25} leads used this month
              </div>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {plan === "free" ? (
                <a
                  href="/onboarding"
                  style={{ padding: "10px 20px", borderRadius: 10, fontSize: 14, fontWeight: 600, textAlign: "center", textDecoration: "none", transition: "all 0.15s", background: "linear-gradient(135deg, #7c3aed 0%, #4f46e5 100%)", color: "white", boxShadow: "0 4px 12px rgba(124,58,237,0.3)" }}
                >
                  Upgrade Plan
                </a>
              ) : (
                <button
                  onClick={handleManagePlan}
                  disabled={isBillingLoading}
                  style={{ padding: "10px 20px", borderRadius: 10, fontSize: 14, fontWeight: 600, transition: "all 0.15s", cursor: isBillingLoading ? "not-allowed" : "pointer", opacity: isBillingLoading ? 0.6 : 1, border: "1px solid rgba(124,58,237,0.3)", background: "rgba(124,58,237,0.15)", color: "#a78bfa" }}
                >
                  {isBillingLoading ? "Opening…" : "Manage Plan"}
                </button>
              )}
              {billingError && (
                <p style={{ fontSize: 13, color: "#f87171" }}>{billingError}</p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
