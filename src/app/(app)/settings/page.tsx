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
    <div className="p-5 sm:p-8 max-w-[1000px] mx-auto space-y-8">
      {/* Header */}
      <div className="animate-fade-up">
        <p className="text-sm mb-1" style={{ color: "var(--color-text-2)" }}>Configure your workspace</p>
        <h1 className="text-2xl sm:text-3xl font-bold" style={{ fontFamily: "var(--font-syne)", color: "var(--color-text-1)" }}>Settings</h1>
      </div>

      {/* Profile */}
      <div className="rounded-2xl p-6 animate-fade-up" style={{ background: "var(--color-surface)", border: "1px solid var(--color-border)", animationDelay: "0.07s" }}>
        <h2 className="text-sm font-semibold mb-4" style={{ fontFamily: "var(--font-syne)", color: "var(--color-text-1)" }}>Profile</h2>
        <div className="flex items-start gap-5">
          <div className="w-16 h-16 rounded-2xl flex items-center justify-center text-xl font-bold flex-shrink-0" style={{ background: "rgba(124,58,237,0.15)", color: "#a78bfa" }}>{userInitial}</div>
          <div className="flex-1 space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-medium block mb-1" style={{ color: "var(--color-text-muted)" }}>Name</label>
                <input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl text-sm outline-none"
                  style={{ background: "var(--color-surface-2)", border: "1px solid var(--color-border-subtle)", color: "var(--color-text-1)" }}
                />
              </div>
              <div>
                <label className="text-xs font-medium block mb-1" style={{ color: "var(--color-text-muted)" }}>Email</label>
                <input
                  value={me?.user.email ?? ""}
                  readOnly
                  className="w-full px-3 py-2 rounded-xl text-sm outline-none"
                  style={{ background: "var(--color-surface-2)", border: "1px solid var(--color-border-subtle)", color: "var(--color-text-muted)", cursor: "default" }}
                />
              </div>
            </div>
            <div>
              <label className="text-xs font-medium block mb-1" style={{ color: "var(--color-text-muted)" }}>Workspace name</label>
              <input
                value={company}
                onChange={(e) => setCompany(e.target.value)}
                className="w-full px-3 py-2 rounded-xl text-sm outline-none"
                style={{ background: "var(--color-surface-2)", border: "1px solid var(--color-border-subtle)", color: "var(--color-text-1)" }}
              />
            </div>
            <button
              onClick={handleSaveProfile}
              disabled={savingProfile}
              className="px-4 py-2 rounded-xl text-sm font-medium transition-all"
              style={{
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
        <div className="rounded-2xl p-6 animate-fade-up" style={{ background: "var(--color-surface)", border: "1px solid var(--color-border)", animationDelay: "0.11s" }}>
          <h2 className="text-sm font-semibold mb-4" style={{ fontFamily: "var(--font-syne)", color: "var(--color-text-1)" }}>Usage this month</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {[
              { label: "Leads", used: me.org.usage_leads_mo, limit: me.org.limits_leads_mo, color: "#6d28d9" },
              { label: "Content pieces", used: me.org.usage_content_mo, limit: me.org.limits_content_mo, color: "#0891b2" },
            ].map((u) => {
              const pct = Math.min(100, Math.round((u.used / u.limit) * 100));
              return (
                <div key={u.label} className="rounded-xl p-4" style={{ background: "var(--color-surface-2)", border: "1px solid var(--color-border-subtle)" }}>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-medium" style={{ color: "var(--color-text-muted)" }}>{u.label}</span>
                    <span className="text-xs font-semibold" style={{ color: "var(--color-text-1)" }}>{u.used.toLocaleString()} / {u.limit.toLocaleString()}</span>
                  </div>
                  <div className="w-full h-1.5 rounded-full" style={{ background: "var(--color-border)" }}>
                    <div className="h-1.5 rounded-full transition-all" style={{ width: `${pct}%`, background: pct > 80 ? "#f87171" : u.color }} />
                  </div>
                  <span className="text-[10px] mt-1 block" style={{ color: "var(--color-text-muted)" }}>{pct}% used</span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Brand Voice */}
      <div className="rounded-2xl p-6 animate-fade-up" style={{ background: "var(--color-surface)", border: "1px solid var(--color-border)", animationDelay: "0.14s" }}>
        <h2 className="text-sm font-semibold mb-4" style={{ fontFamily: "var(--font-syne)", color: "var(--color-text-1)" }}>Brand Voice</h2>
        <div className="space-y-3">
          <div>
            <label className="text-xs font-medium block mb-1" style={{ color: "var(--color-text-muted)" }}>Tone</label>
            <div className="flex flex-wrap gap-2">
              {["Professional", "Warm", "Consultative", "Bold", "Casual"].map((t, i) => (
                <span key={t} className="px-3 py-1.5 rounded-lg text-xs font-medium cursor-pointer transition-all" style={{
                  background: i < 3 ? "rgba(124,58,237,0.15)" : "var(--color-surface-2)",
                  border: i < 3 ? "1px solid rgba(124,58,237,0.3)" : "1px solid var(--color-border-subtle)",
                  color: i < 3 ? "#a78bfa" : "var(--color-text-muted)",
                }}>{t}</span>
              ))}
            </div>
          </div>
          <div>
            <label className="text-xs font-medium block mb-1" style={{ color: "var(--color-text-muted)" }}>Brand description</label>
            <textarea
              defaultValue="We help marketing agencies and DTC brands scale with AI-powered lead generation, content creation, and social management."
              rows={3}
              className="w-full px-3 py-2 rounded-xl text-sm outline-none resize-none"
              style={{ background: "var(--color-surface-2)", border: "1px solid var(--color-border-subtle)", color: "var(--color-text-1)" }}
            />
          </div>
        </div>
      </div>

      {/* Notifications */}
      <div className="rounded-2xl p-6 animate-fade-up" style={{ background: "var(--color-surface)", border: "1px solid var(--color-border)", animationDelay: "0.21s" }}>
        <h2 className="text-sm font-semibold mb-4" style={{ fontFamily: "var(--font-syne)", color: "var(--color-text-1)" }}>Notifications</h2>
        <div className="space-y-3">
          {NOTIFICATIONS.map((n) => (
            <div key={n.key} className="flex items-center justify-between p-3.5 rounded-xl" style={{ background: "var(--color-surface-2)", border: "1px solid var(--color-border-subtle)" }}>
              <div>
                <div className="text-sm font-medium" style={{ color: "var(--color-text-1)" }}>{n.label}</div>
                <div className="text-xs mt-0.5" style={{ color: "var(--color-text-muted)" }}>{n.description}</div>
              </div>
              <button
                onClick={() => toggleNotif(n.key)}
                className="w-10 h-6 rounded-full relative transition-all flex-shrink-0"
                style={{ background: notifs[n.key] ? "#7c3aed" : "var(--color-border)" }}
              >
                <div className="w-4 h-4 rounded-full bg-white absolute top-1 transition-all" style={{ left: notifs[n.key] ? 20 : 4 }} />
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Billing */}
      <div className="rounded-2xl p-6 animate-fade-up relative overflow-hidden" style={{ background: "var(--color-surface)", border: "1px solid var(--color-border)", animationDelay: "0.28s" }}>
        <div className="absolute inset-0 pointer-events-none" style={{ background: "radial-gradient(ellipse at 80% 50%, rgba(109,40,217,0.06) 0%, transparent 70%)" }} />
        <div className="relative">
          <h2 className="text-sm font-semibold mb-4" style={{ fontFamily: "var(--font-syne)", color: "var(--color-text-1)" }}>Plan & Billing</h2>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 p-4 rounded-xl" style={{ background: "rgba(124,58,237,0.08)", border: "1px solid rgba(124,58,237,0.2)" }}>
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="text-sm font-bold capitalize" style={{ color: "var(--color-text-1)" }}>{plan} Plan</span>
                <span className="text-[10px] px-2 py-0.5 rounded-md font-semibold capitalize" style={{ background: `${planColor}20`, color: planColor }}>
                  {me?.org.subscription_status ?? "active"}
                </span>
              </div>
              <div className="text-xs" style={{ color: "var(--color-text-muted)" }}>
                {price > 0 ? `$${price}/month` : "Free forever"} ·{" "}
                {me?.org.usage_leads_mo ?? 0} of {me?.org.limits_leads_mo ?? 25} leads used this month
              </div>
            </div>
            <div className="flex flex-col gap-2">
              {plan === "free" ? (
                <a
                  href="/onboarding"
                  className="px-4 py-2 rounded-xl text-sm font-medium text-center transition-all"
                  style={{ background: "linear-gradient(135deg, #7c3aed 0%, #4f46e5 100%)", color: "white", boxShadow: "0 4px 12px rgba(124,58,237,0.3)" }}
                >
                  Upgrade Plan
                </a>
              ) : (
                <button
                  onClick={handleManagePlan}
                  disabled={isBillingLoading}
                  className="px-4 py-2 rounded-xl text-sm font-medium transition-all disabled:opacity-60"
                  style={{ background: "rgba(124,58,237,0.15)", border: "1px solid rgba(124,58,237,0.3)", color: "#a78bfa" }}
                >
                  {isBillingLoading ? "Opening…" : "Manage Plan"}
                </button>
              )}
              {billingError && (
                <p className="text-xs" style={{ color: "#f87171" }}>{billingError}</p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
