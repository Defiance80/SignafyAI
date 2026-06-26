"use client";

import { useState, useEffect } from "react";

const STATUS_STYLES: Record<string, { color: string; bg: string }> = {
  active:    { color: "#34d399", bg: "rgba(52,211,153,0.12)" },
  paused:    { color: "#fbbf24", bg: "rgba(251,191,36,0.12)" },
  completed: { color: "#60a5fa", bg: "rgba(96,165,250,0.12)" },
  draft:     { color: "#94a3b8", bg: "rgba(148,163,184,0.12)" },
};

const CHANNEL_OPTIONS = ["Instagram", "LinkedIn", "TikTok", "Twitter/X", "Facebook", "Google Ads", "Email"];
const GOAL_OPTIONS = ["awareness", "engagement", "leads", "conversions"] as const;

interface Campaign {
  id: string;
  name: string;
  status: string;
  start_date?: string | null;
  end_date?: string | null;
  budget?: number | null;
  budget_spent?: number;
  channels: string[];
  goal?: string | null;
  target_audience?: string | null;
  notes?: string | null;
  created_at: string;
}

function Sparkline({ color }: { color: string }) {
  const data = Array.from({ length: 12 }, () => Math.floor(Math.random() * 80) + 10);
  const max = Math.max(...data, 1);
  const w = 120, h = 32;
  const points = data.map((v, i) => `${(i / (data.length - 1)) * w},${h - (v / max) * h}`).join(" ");
  const areaPoints = `0,${h} ${points} ${w},${h}`;
  return (
    <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} className="flex-shrink-0">
      <polygon points={areaPoints} fill={`${color}15`} />
      <polyline points={points} fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

const CAMPAIGN_COLORS = ["#7c3aed", "#0891b2", "#059669", "#d97706", "#ef4444", "#a78bfa", "#f59e0b"];

function formatBudget(n?: number | null) {
  if (!n) return "$0";
  return `$${n.toLocaleString()}`;
}

function formatDates(start?: string | null, end?: string | null) {
  if (!start && !end) return "No dates set";
  const fmt = (d: string) => new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
  if (start && end) return `${fmt(start)} – ${fmt(end)}`;
  if (start) return `From ${fmt(start)}`;
  return `Until ${fmt(end!)}`;
}

const DEMO_CAMPAIGNS: Campaign[] = [
  { id: "dc1", name: "Q2 Brand Awareness Push", status: "active", start_date: "2025-04-01", end_date: "2025-06-30", budget: 12500, budget_spent: 4830, channels: ["Instagram", "LinkedIn", "TikTok"], goal: "awareness", created_at: new Date(Date.now() - 45 * 86400000).toISOString() },
  { id: "dc2", name: "Summer Lead Gen Sprint", status: "active", start_date: "2025-05-01", end_date: "2025-07-31", budget: 8000, budget_spent: 1200, channels: ["LinkedIn", "Facebook"], goal: "leads", created_at: new Date(Date.now() - 17 * 86400000).toISOString() },
  { id: "dc3", name: "Product Launch – SignafyAI v2", status: "draft", start_date: "2025-06-15", end_date: "2025-07-15", budget: 20000, budget_spent: 0, channels: ["Instagram", "LinkedIn", "Twitter/X", "TikTok"], goal: "awareness", created_at: new Date(Date.now() - 5 * 86400000).toISOString() },
  { id: "dc4", name: "Holiday Retargeting 2024", status: "completed", start_date: "2024-11-15", end_date: "2024-12-31", budget: 15000, budget_spent: 14820, channels: ["Instagram", "Facebook"], goal: "conversions", created_at: new Date(Date.now() - 180 * 86400000).toISOString() },
  { id: "dc5", name: "Thought Leadership Series", status: "paused", start_date: "2025-03-01", end_date: "2025-05-31", budget: 5000, budget_spent: 2100, channels: ["LinkedIn", "Twitter/X"], goal: "engagement", created_at: new Date(Date.now() - 60 * 86400000).toISOString() },
  { id: "dc6", name: "Agency Partner Outreach", status: "active", start_date: "2025-04-15", end_date: "2025-06-15", budget: 6500, budget_spent: 3900, channels: ["LinkedIn"], goal: "leads", created_at: new Date(Date.now() - 33 * 86400000).toISOString() },
];

export default function CampaignsPage() {
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [tab, setTab] = useState("All");
  const [showModal, setShowModal] = useState(false);
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

  // Form state
  const [form, setForm] = useState({
    name: "",
    status: "draft" as Campaign["status"],
    start_date: "",
    end_date: "",
    budget: "",
    channels: [] as string[],
    goal: "" as string,
    target_audience: "",
    notes: "",
  });

  useEffect(() => {
    fetch("/api/campaigns")
      .then((r) => r.ok ? r.json() : null)
      .then((d: { data?: Campaign[] } | null) => {
        const rows = d?.data ?? [];
        setCampaigns(rows.length > 0 ? rows : DEMO_CAMPAIGNS);
      })
      .catch(() => setCampaigns(DEMO_CAMPAIGNS))
      .finally(() => setIsLoading(false));
  }, []);

  const tabs = ["All", "active", "paused", "completed", "draft"];
  const filtered = campaigns.filter((c) => tab === "All" || c.status === tab);

  function toggleChannel(ch: string) {
    setForm((f) => ({
      ...f,
      channels: f.channels.includes(ch) ? f.channels.filter((c) => c !== ch) : [...f.channels, ch],
    }));
  }

  async function handleCreate() {
    if (!form.name.trim()) { setCreateError("Campaign name is required."); return; }
    setCreating(true);
    setCreateError(null);
    try {
      const res = await fetch("/api/campaigns", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: form.name.trim(),
          status: form.status,
          start_date: form.start_date || null,
          end_date: form.end_date || null,
          budget: form.budget ? parseFloat(form.budget) : null,
          channels: form.channels,
          goal: form.goal || null,
          target_audience: form.target_audience.trim() || null,
          notes: form.notes.trim() || null,
        }),
      });
      if (!res.ok) {
        const d = await res.json() as { error?: string };
        throw new Error(d.error ?? "Failed to create campaign");
      }
      const created = await res.json() as Campaign;
      setCampaigns((prev) => [created, ...prev]);
      setShowModal(false);
      setForm({ name: "", status: "draft", start_date: "", end_date: "", budget: "", channels: [], goal: "", target_audience: "", notes: "" });
    } catch (e) {
      setCreateError(e instanceof Error ? e.message : "Creation failed.");
    } finally {
      setCreating(false);
    }
  }

  return (
    <div style={{ padding: "36px 40px", maxWidth: 1440, margin: "0 auto", display: "flex", flexDirection: "column", gap: 28 }}>
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 animate-fade-up">
        <div>
          <p className="text-sm mb-1" style={{ color: "var(--color-text-2)" }}>Plan & execute</p>
          <h1 style={{ fontSize: 36, fontWeight: 800, letterSpacing: "-0.04em", color: "var(--c1)", margin: 0, lineHeight: 1.1 }}>Campaigns</h1>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold"
          style={{ background: "linear-gradient(135deg, #7c3aed 0%, #4f46e5 100%)", color: "white", boxShadow: "0 4px 12px rgba(124,58,237,0.3)" }}
        >
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M7 2v10M2 7h10" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/></svg>
          Create Campaign
        </button>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 animate-fade-up flex-wrap" style={{ animationDelay: "0.1s" }}>
        {tabs.map((t) => (
          <button key={t} onClick={() => setTab(t)} className="px-4 py-2 rounded-xl text-xs font-medium transition-all capitalize" style={{
            background: tab === t ? "rgba(124,58,237,0.15)" : "var(--color-surface)",
            border: tab === t ? "1px solid rgba(124,58,237,0.3)" : "1px solid var(--color-border)",
            color: tab === t ? "#a78bfa" : "var(--color-text-2)",
          }}>{t}</button>
        ))}
      </div>

      {/* Campaign Grid */}
      {isLoading ? (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 16 }}>
          {[1, 2, 3].map((i) => <div key={i} style={{ height: 180, borderRadius: 16, background: "var(--color-surface)" }} className="animate-pulse" />)}
        </div>
      ) : filtered.length === 0 ? (
        <div style={{ borderRadius: 16, padding: "48px 32px", textAlign: "center", background: "var(--color-surface)", border: "1px solid var(--color-border)" }}>
          <div style={{ width: 48, height: 48, borderRadius: 12, margin: "0 auto 14px", display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(124,58,237,0.1)", color: "#a78bfa" }}>
            <svg width="22" height="22" viewBox="0 0 22 22" fill="none"><path d="M11 4v14M4 11h14" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg>
          </div>
          <p style={{ fontSize: 15, fontWeight: 600, color: "var(--c1)", marginBottom: 4 }}>No campaigns yet</p>
          <p style={{ fontSize: 14, color: "var(--c3)" }}>Create your first campaign to get started.</p>
        </div>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 16 }}>
          {filtered.map((c, i) => {
            const s = STATUS_STYLES[c.status] ?? STATUS_STYLES.draft;
            const color = CAMPAIGN_COLORS[i % CAMPAIGN_COLORS.length];
            return (
              <div
                key={c.id}
                className="animate-fade-up"
                style={{
                  borderRadius: 16, padding: "24px 26px", position: "relative", overflow: "hidden",
                  background: "var(--color-surface)", border: "1px solid var(--color-border)",
                  animationDelay: `${0.15 + i * 0.07}s`, transition: "all 0.3s",
                }}
                onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.border = `1px solid ${color}33`; (e.currentTarget as HTMLElement).style.boxShadow = `0 8px 24px ${color}12`; }}
                onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.border = "1px solid var(--color-border)"; (e.currentTarget as HTMLElement).style.boxShadow = "none"; }}
              >
                <div style={{ position: "absolute", top: 0, right: 0, width: 80, height: 80, borderRadius: "50%", pointerEvents: "none", opacity: 0.2, background: `radial-gradient(circle, ${color}30 0%, transparent 70%)`, transform: "translate(25%, -25%)" }} />
                <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 14 }}>
                  <h3 style={{ fontSize: 15, fontWeight: 700, paddingRight: 10, color: "var(--c1)", margin: 0, lineHeight: 1.35 }}>{c.name}</h3>
                  <span style={{ fontSize: 11, fontWeight: 600, padding: "4px 10px", borderRadius: 8, flexShrink: 0, textTransform: "capitalize", background: s.bg, color: s.color }}>{c.status}</span>
                </div>
                <div style={{ fontSize: 13, marginBottom: 16, color: "var(--c3)", display: "flex", flexDirection: "column", gap: 6 }}>
                  <div>{formatDates(c.start_date, c.end_date)}</div>
                  <div style={{ display: "flex", gap: 12 }}>
                    <span>Budget: <span style={{ color: "var(--c2)" }}>{formatBudget(c.budget)}</span></span>
                    {c.budget_spent != null && <span>Spent: <span style={{ color: "var(--c2)" }}>{formatBudget(c.budget_spent)}</span></span>}
                  </div>
                </div>
                <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between" }}>
                  <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                    {c.channels.map((ch) => (
                      <span key={ch} style={{ fontSize: 11, padding: "3px 8px", borderRadius: 6, background: "var(--color-surface-2)", color: "var(--c3)", border: "1px solid var(--color-border-subtle)" }}>{ch}</span>
                    ))}
                  </div>
                  <Sparkline color={color} />
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Create Campaign Modal */}
      {showModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: "rgba(0,0,0,0.6)", backdropFilter: "blur(4px)" }}
          onClick={(e) => { if (e.target === e.currentTarget) setShowModal(false); }}
        >
          <div style={{ width: "100%", maxWidth: 560, borderRadius: 16, padding: "28px 32px", background: "var(--color-surface)", border: "1px solid var(--color-border)", maxHeight: "90vh", overflowY: "auto", display: "flex", flexDirection: "column", gap: 20 }}>
            <div className="flex items-center justify-between">
              <h2 className="text-base font-bold" style={{ color: "var(--color-text-1)" }}>New Campaign</h2>
              <button onClick={() => setShowModal(false)} className="w-8 h-8 rounded-lg flex items-center justify-center transition-colors" style={{ background: "var(--color-surface-2)", color: "var(--color-text-muted)" }}>
                <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M2 2l8 8M10 2l-8 8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg>
              </button>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              <div>
                <label className="text-xs font-medium block mb-1.5" style={{ color: "var(--color-text-muted)" }}>Campaign name *</label>
                <input
                  value={form.name}
                  onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                  placeholder="e.g. Q3 Brand Awareness"
                  className="w-full px-4 py-2.5 rounded-xl text-sm outline-none"
                  style={{ background: "var(--color-surface-2)", border: "1px solid var(--color-border-subtle)", color: "var(--color-text-1)" }}
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-medium block mb-1.5" style={{ color: "var(--color-text-muted)" }}>Status</label>
                  <select
                    value={form.status}
                    onChange={(e) => setForm((f) => ({ ...f, status: e.target.value }))}
                    className="w-full px-3 py-2.5 rounded-xl text-sm outline-none"
                    style={{ background: "var(--color-surface-2)", border: "1px solid var(--color-border-subtle)", color: "var(--color-text-1)" }}
                  >
                    <option value="draft">Draft</option>
                    <option value="active">Active</option>
                    <option value="paused">Paused</option>
                    <option value="completed">Completed</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs font-medium block mb-1.5" style={{ color: "var(--color-text-muted)" }}>Goal</label>
                  <select
                    value={form.goal}
                    onChange={(e) => setForm((f) => ({ ...f, goal: e.target.value }))}
                    className="w-full px-3 py-2.5 rounded-xl text-sm outline-none"
                    style={{ background: "var(--color-surface-2)", border: "1px solid var(--color-border-subtle)", color: "var(--color-text-1)" }}
                  >
                    <option value="">— Select goal —</option>
                    {GOAL_OPTIONS.map((g) => <option key={g} value={g} className="capitalize">{g.charAt(0).toUpperCase() + g.slice(1)}</option>)}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-medium block mb-1.5" style={{ color: "var(--color-text-muted)" }}>Start date</label>
                  <input
                    type="date"
                    value={form.start_date}
                    onChange={(e) => setForm((f) => ({ ...f, start_date: e.target.value }))}
                    className="w-full px-3 py-2.5 rounded-xl text-sm outline-none"
                    style={{ background: "var(--color-surface-2)", border: "1px solid var(--color-border-subtle)", color: "var(--color-text-1)" }}
                  />
                </div>
                <div>
                  <label className="text-xs font-medium block mb-1.5" style={{ color: "var(--color-text-muted)" }}>End date</label>
                  <input
                    type="date"
                    value={form.end_date}
                    onChange={(e) => setForm((f) => ({ ...f, end_date: e.target.value }))}
                    className="w-full px-3 py-2.5 rounded-xl text-sm outline-none"
                    style={{ background: "var(--color-surface-2)", border: "1px solid var(--color-border-subtle)", color: "var(--color-text-1)" }}
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-medium block mb-1.5" style={{ color: "var(--color-text-muted)" }}>Budget (USD)</label>
                <input
                  type="number"
                  value={form.budget}
                  onChange={(e) => setForm((f) => ({ ...f, budget: e.target.value }))}
                  placeholder="0"
                  min={0}
                  className="w-full px-4 py-2.5 rounded-xl text-sm outline-none"
                  style={{ background: "var(--color-surface-2)", border: "1px solid var(--color-border-subtle)", color: "var(--color-text-1)" }}
                />
              </div>

              <div>
                <label className="text-xs font-medium block mb-2" style={{ color: "var(--color-text-muted)" }}>Channels</label>
                <div className="flex flex-wrap gap-2">
                  {CHANNEL_OPTIONS.map((ch) => (
                    <button
                      key={ch}
                      type="button"
                      onClick={() => toggleChannel(ch)}
                      className="px-3 py-1.5 rounded-lg text-xs font-medium transition-all"
                      style={form.channels.includes(ch)
                        ? { background: "rgba(124,58,237,0.15)", border: "1px solid rgba(124,58,237,0.3)", color: "#a78bfa" }
                        : { background: "var(--color-surface-2)", border: "1px solid var(--color-border-subtle)", color: "var(--color-text-muted)" }}
                    >
                      {ch}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="text-xs font-medium block mb-1.5" style={{ color: "var(--color-text-muted)" }}>Target audience</label>
                <input
                  value={form.target_audience}
                  onChange={(e) => setForm((f) => ({ ...f, target_audience: e.target.value }))}
                  placeholder="e.g. Marketing agencies, 25-45, North America"
                  className="w-full px-4 py-2.5 rounded-xl text-sm outline-none"
                  style={{ background: "var(--color-surface-2)", border: "1px solid var(--color-border-subtle)", color: "var(--color-text-1)" }}
                />
              </div>

              <div>
                <label className="text-xs font-medium block mb-1.5" style={{ color: "var(--color-text-muted)" }}>Notes</label>
                <textarea
                  value={form.notes}
                  onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
                  rows={3}
                  placeholder="Campaign brief, goals, key messages..."
                  className="w-full px-4 py-2.5 rounded-xl text-sm outline-none resize-none"
                  style={{ background: "var(--color-surface-2)", border: "1px solid var(--color-border-subtle)", color: "var(--color-text-1)" }}
                />
              </div>
            </div>

            {createError && (
              <div className="rounded-xl px-4 py-2.5 text-sm" style={{ background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.2)", color: "#f87171" }}>
                {createError}
              </div>
            )}

            <div className="flex gap-3 pt-1">
              <button
                onClick={() => setShowModal(false)}
                className="flex-1 px-4 py-2.5 rounded-xl text-sm font-medium"
                style={{ background: "var(--color-surface-2)", border: "1px solid var(--color-border)", color: "var(--color-text-2)" }}
              >
                Cancel
              </button>
              <button
                onClick={handleCreate}
                disabled={creating}
                className="flex-1 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all disabled:opacity-60"
                style={{ background: "linear-gradient(135deg, #7c3aed 0%, #4f46e5 100%)", color: "white", boxShadow: "0 4px 12px rgba(124,58,237,0.3)" }}
              >
                {creating ? "Creating…" : "Create Campaign"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
