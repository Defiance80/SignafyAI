"use client";

import { useState, useCallback } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { scoreColor, relativeTime } from "@/lib/utils";
import type { GrowthOpportunity } from "@/app/api/growth/opportunities/route";
import type { SocialSignal } from "@/app/api/growth/signals/route";
import type { CalendarItem } from "@/app/api/growth/calendar/route";

// ─── Constants ────────────────────────────────────────────────────────────────

const FORMAT_META: Record<string, { icon: string; label: string; color: string }> = {
  reel:            { icon: "🎬", label: "Reel / Short",   color: "#e040fb" },
  blog:            { icon: "📝", label: "Blog Post",       color: "#60a5fa" },
  faq:             { icon: "❓", label: "FAQ",             color: "#fbbf24" },
  interview:       { icon: "🎤", label: "Interview",       color: "#34d399" },
  carousel:        { icon: "📱", label: "Carousel",        color: "#f87171" },
  podcast:         { icon: "🎙️", label: "Podcast Segment", color: "#a78bfa" },
  podcast_segment: { icon: "🎙️", label: "Podcast Segment", color: "#a78bfa" },
};

const PLATFORM_META: Record<string, { icon: string; color: string }> = {
  linkedin:     { icon: "💼", color: "#0a66c2" },
  tiktok:       { icon: "🎵", color: "#00f2ea" },
  instagram:    { icon: "📸", color: "#e040fb" },
  facebook:     { icon: "📘", color: "#1877f2" },
  x:            { icon: "𝕏",  color: "#e7e9ea" },
  reddit:       { icon: "🔴", color: "#ff4500" },
  youtube:      { icon: "▶",  color: "#ff0000" },
  twitter:      { icon: "𝕏",  color: "#e7e9ea" }, // alias for x
  google_news:  { icon: "📰", color: "#4285f4" },
};

const SIGNAL_TYPE_COLORS: Record<string, { color: string; bg: string }> = {
  question:      { color: "#60a5fa", bg: "rgba(96,165,250,0.12)" },
  complaint:     { color: "#f87171", bg: "rgba(248,113,113,0.12)" },
  trend:         { color: "#a78bfa", bg: "rgba(167,139,250,0.12)" },
  discussion:    { color: "#fbbf24", bg: "rgba(251,191,36,0.12)" },
  buying_intent: { color: "#34d399", bg: "rgba(52,211,153,0.12)" },
};

const SENTIMENT_COLORS: Record<string, string> = {
  positive:  "#34d399",
  excited:   "#34d399",
  negative:  "#f87171",
  frustrated: "#f87171",
  neutral:   "#6b7280",
};

type TabType = "opportunities" | "signals" | "calendar";

// ─── Hooks ────────────────────────────────────────────────────────────────────

function useOpportunities(params: { search?: string; min_score?: number } = {}) {
  const qs = new URLSearchParams();
  if (params.search) qs.set("search", params.search);
  if (params.min_score) qs.set("min_score", String(params.min_score));
  qs.set("per_page", "50");
  return useQuery({
    queryKey: ["growth-opportunities", params],
    queryFn: async () => {
      const res = await fetch(`/api/growth/opportunities?${qs}`);
      if (!res.ok) throw new Error("Failed");
      return res.json() as Promise<{ data: GrowthOpportunity[]; total: number }>;
    },
    staleTime: 30_000,
  });
}

function useSignals(params: { search?: string; source?: string; signal_type?: string } = {}) {
  const qs = new URLSearchParams();
  if (params.search) qs.set("search", params.search);
  if (params.source) qs.set("source", params.source);
  if (params.signal_type) qs.set("signal_type", params.signal_type);
  qs.set("per_page", "50");
  return useQuery({
    queryKey: ["growth-signals", params],
    queryFn: async () => {
      const res = await fetch(`/api/growth/signals?${qs}`);
      if (!res.ok) throw new Error("Failed");
      return res.json() as Promise<{ data: SocialSignal[]; total: number }>;
    },
    staleTime: 30_000,
  });
}

function useCalendar(days: number) {
  return useQuery({
    queryKey: ["growth-calendar", days],
    queryFn: async () => {
      const res = await fetch(`/api/growth/calendar?days=${days}`);
      if (!res.ok) throw new Error("Failed");
      return res.json() as Promise<{ data: CalendarItem[]; total: number; days: number }>;
    },
    staleTime: 60_000,
  });
}

// ─── Shared Components ────────────────────────────────────────────────────────

function SearchBar({ value, onChange, placeholder }: { value: string; onChange: (v: string) => void; placeholder?: string }) {
  return (
    <div className="relative flex-1">
      <svg className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" width="14" height="14" viewBox="0 0 14 14" fill="none" style={{ color: "var(--color-text-muted)" }}>
        <circle cx="6" cy="6" r="4" stroke="currentColor" strokeWidth="1.4" />
        <path d="M9 9l3 3" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
      </svg>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder ?? "Search…"}
        className="w-full pl-8 pr-3 py-2 rounded-xl text-sm outline-none"
        style={{ background: "var(--color-surface)", border: "1px solid var(--color-border)", color: "var(--color-text-1)" }}
      />
    </div>
  );
}

function EmptyState({ icon, title, desc, action }: { icon: string; title: string; desc: string; action?: React.ReactNode }) {
  return (
    <div className="text-center py-16 px-6">
      <div className="text-4xl mb-3">{icon}</div>
      <h3 className="text-base font-semibold mb-1" style={{ fontFamily: "var(--font-syne)", color: "var(--color-text-1)" }}>{title}</h3>
      <p className="text-sm mb-4" style={{ color: "var(--color-text-muted)" }}>{desc}</p>
      {action}
    </div>
  );
}

function GrowthScoreBar({ score }: { score: number }) {
  const { color } = scoreColor(score);
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-1.5 rounded-full overflow-hidden" style={{ background: "var(--color-surface-2)" }}>
        <div className="h-full rounded-full" style={{ width: `${score}%`, background: color }} />
      </div>
      <span className="text-xs font-bold tabular-nums w-6 text-right" style={{ color }}>{score}</span>
    </div>
  );
}

// ─── Opportunity Drawer ───────────────────────────────────────────────────────

function OpportunityDrawer({
  opp,
  onClose,
  onAddToCalendar,
}: {
  opp: GrowthOpportunity;
  onClose: () => void;
  onAddToCalendar: (opp: GrowthOpportunity) => void;
}) {
  const [copied, setCopied] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(opp.status === "saved");
  const { color: gc } = scoreColor(opp.growth_score);

  function copy(text: string, key: string) {
    navigator.clipboard.writeText(text).then(() => { setCopied(key); setTimeout(() => setCopied(null), 1500); });
  }

  async function toggleSave() {
    setSaving(true);
    try {
      await fetch(`/api/growth/opportunities?id=${opp.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: saved ? "new" : "saved" }),
      });
      setSaved((v) => !v);
    } catch { /* ignore */ } finally { setSaving(false); }
  }

  const sources = (opp.source ?? "").split(",").map((s) => s.trim()).filter(Boolean);

  return (
    <>
      <div className="fixed inset-0 z-40" style={{ background: "rgba(0,0,0,0.5)" }} onClick={onClose} />
      <div className="fixed right-0 top-0 bottom-0 z-50 flex flex-col overflow-hidden"
        style={{ width: "min(600px, 100vw)", background: "var(--color-surface)", borderLeft: "1px solid var(--color-border)", boxShadow: "-16px 0 64px rgba(0,0,0,0.4)" }}>

        {/* Header */}
        <div className="flex items-start gap-3 px-6 py-5" style={{ borderBottom: "1px solid var(--color-border-subtle)" }}>
          <button onClick={onClose} className="p-1.5 rounded-lg mt-0.5 flex-shrink-0" style={{ color: "var(--color-text-muted)" }}>
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M4 4l8 8M12 4l-8 8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" /></svg>
          </button>
          <div className="flex-1 min-w-0">
            <div className="flex gap-1.5 flex-wrap mb-1.5">
              {sources.map((s) => {
                const pm = PLATFORM_META[s];
                return pm ? (
                  <span key={s} className="text-[10px] px-2 py-0.5 rounded-md font-medium" style={{ background: `${pm.color}18`, color: pm.color }}>
                    {pm.icon} {s}
                  </span>
                ) : null;
              })}
              {opp.signal_count > 0 && (
                <span className="text-[10px] px-2 py-0.5 rounded-md" style={{ background: "var(--color-surface-2)", color: "var(--color-text-muted)" }}>
                  {opp.signal_count} discussions
                </span>
              )}
            </div>
            <h2 className="text-base font-bold leading-tight" style={{ fontFamily: "var(--font-syne)", color: "var(--color-text-1)" }}>{opp.title}</h2>
          </div>
          <div className="text-right flex-shrink-0">
            <div className="text-2xl font-bold" style={{ color: gc, fontFamily: "var(--font-syne)" }}>{opp.growth_score}</div>
            <div className="text-[10px]" style={{ color: "var(--color-text-muted)" }}>growth</div>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto">

          {/* Description */}
          <div className="px-6 py-5" style={{ borderBottom: "1px solid var(--color-border-subtle)" }}>
            <div className="text-[10px] font-semibold mb-2" style={{ color: "var(--color-text-muted)" }}>OPPORTUNITY ANALYSIS</div>
            <p className="text-sm leading-relaxed" style={{ color: "var(--color-text-1)" }}>{opp.description}</p>
          </div>

          {/* Growth Score breakdown */}
          <div className="px-6 py-4" style={{ borderBottom: "1px solid var(--color-border-subtle)" }}>
            <div className="text-[10px] font-semibold mb-3" style={{ color: "var(--color-text-muted)" }}>GROWTH SCORE BREAKDOWN</div>
            <div className="space-y-2.5">
              {[
                { label: "Trend Score",        value: opp.trend_score,         color: "#a78bfa" },
                { label: "Audience Match",      value: opp.audience_match,      color: "#34d399" },
                { label: "Lead Potential",      value: opp.lead_potential,      color: "#fbbf24" },
                { label: "Authority Potential", value: opp.authority_potential, color: "#60a5fa" },
                { label: "Local Relevance",     value: opp.local_relevance,     color: "#f87171" },
              ].map(({ label, value, color }) => (
                <div key={label} className="flex items-center gap-3">
                  <div className="text-xs w-36 flex-shrink-0" style={{ color: "var(--color-text-2)" }}>{label}</div>
                  <div className="flex-1 h-1.5 rounded-full overflow-hidden" style={{ background: "var(--color-surface-2)" }}>
                    <div className="h-full rounded-full" style={{ width: `${value}%`, background: color }} />
                  </div>
                  <span className="text-xs font-bold tabular-nums w-6 text-right" style={{ color }}>{value}</span>
                </div>
              ))}
              <div className="flex items-center gap-3 opacity-60">
                <div className="text-xs w-36 flex-shrink-0" style={{ color: "var(--color-text-muted)" }}>Competition (–)</div>
                <div className="flex-1 h-1.5 rounded-full overflow-hidden" style={{ background: "var(--color-surface-2)" }}>
                  <div className="h-full rounded-full bg-red-400" style={{ width: `${opp.competition_score}%` }} />
                </div>
                <span className="text-xs tabular-nums w-6 text-right" style={{ color: "var(--color-text-muted)" }}>−{opp.competition_score}</span>
              </div>
            </div>
          </div>

          {/* Content formats */}
          {opp.content_formats?.length > 0 && (
            <div className="px-6 py-4" style={{ borderBottom: "1px solid var(--color-border-subtle)" }}>
              <div className="text-[10px] font-semibold mb-3" style={{ color: "var(--color-text-muted)" }}>RECOMMENDED FORMATS</div>
              <div className="flex flex-wrap gap-2">
                {opp.content_formats.map((fmt) => {
                  const meta = FORMAT_META[fmt];
                  if (!meta) return null;
                  return (
                    <div key={fmt} className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium"
                      style={{ background: `${meta.color}12`, border: `1px solid ${meta.color}30`, color: meta.color }}>
                      {meta.icon} {meta.label}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Hooks */}
          {opp.hooks?.length > 0 && (
            <div className="px-6 py-4" style={{ borderBottom: "1px solid var(--color-border-subtle)" }}>
              <div className="text-[10px] font-semibold mb-3" style={{ color: "var(--color-text-muted)" }}>CONTENT HOOKS (COPY-READY)</div>
              <div className="space-y-2">
                {opp.hooks.map((hook, i) => (
                  <div key={i} className="flex items-start gap-2 px-3 py-2.5 rounded-xl group"
                    style={{ background: "var(--color-surface-2)", border: "1px solid var(--color-border-subtle)" }}>
                    <span className="text-xs font-semibold mt-0.5 flex-shrink-0" style={{ color: "#a78bfa" }}>{i + 1}</span>
                    <p className="text-sm flex-1 leading-relaxed" style={{ color: "var(--color-text-1)" }}>&ldquo;{hook}&rdquo;</p>
                    <button
                      onClick={() => copy(hook, `hook-${i}`)}
                      className="opacity-0 group-hover:opacity-100 text-[10px] px-2 py-0.5 rounded flex-shrink-0 transition-opacity"
                      style={{ color: copied === `hook-${i}` ? "#34d399" : "#a78bfa", background: "rgba(124,58,237,0.1)" }}>
                      {copied === `hook-${i}` ? "✓" : "Copy"}
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="px-6 py-5 space-y-3">
            <button
              onClick={() => onAddToCalendar(opp)}
              className="w-full py-3 rounded-xl text-sm font-semibold flex items-center justify-center gap-2"
              style={{ background: "linear-gradient(135deg, #7c3aed 0%, #4f46e5 100%)", color: "white", boxShadow: "0 4px 12px rgba(124,58,237,0.3)" }}>
              📅 Add to Content Calendar
            </button>
            <button
              onClick={toggleSave}
              disabled={saving}
              className="w-full py-2.5 rounded-xl text-sm font-medium"
              style={{ background: "var(--color-surface-2)", border: "1px solid var(--color-border)", color: saved ? "#34d399" : "var(--color-text-2)" }}>
              {saved ? "✓ Saved to Library" : "Save Opportunity"}
            </button>
          </div>
        </div>
      </div>
    </>
  );
}

// ─── Add to Calendar Modal ────────────────────────────────────────────────────

function AddToCalendarModal({ opp, onClose, onAdded }: { opp: GrowthOpportunity; onClose: () => void; onAdded: () => void }) {
  const [form, setForm] = useState({
    title: opp.hooks?.[0] ? opp.hooks[0] : opp.title,
    format: opp.content_formats?.[0] ?? "reel",
    platform: "instagram",
    scheduled_date: new Date(Date.now() + 3 * 86400000).toISOString().split("T")[0],
    notes: "",
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  async function save() {
    setSaving(true);
    setError("");
    try {
      const res = await fetch("/api/growth/calendar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          opportunity_id: opp.id,
          growth_score: opp.growth_score,
          trend_score: opp.trend_score,
          lead_score: opp.lead_potential,
          status: "planned",
        }),
      });
      if (!res.ok) throw new Error((await res.json()).error ?? "Failed");
      onAdded();
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to add");
    } finally { setSaving(false); }
  }

  const inputCls = "w-full px-3 py-2 rounded-xl text-sm outline-none";
  const inputStyle = { background: "var(--color-surface-2)", border: "1px solid var(--color-border-subtle)", color: "var(--color-text-1)" };

  return (
    <>
      <div className="fixed inset-0 z-50" style={{ background: "rgba(0,0,0,0.6)" }} onClick={onClose} />
      <div className="fixed left-1/2 top-1/2 z-[60] w-full max-w-md" style={{ transform: "translate(-50%, -50%)", background: "var(--color-surface)", borderRadius: 20, border: "1px solid var(--color-border)", boxShadow: "0 24px 80px rgba(0,0,0,0.5)", padding: 24 }}>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-base font-bold" style={{ fontFamily: "var(--font-syne)", color: "var(--color-text-1)" }}>Add to Calendar</h3>
          <button onClick={onClose} style={{ color: "var(--color-text-muted)" }}>
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M4 4l8 8M12 4l-8 8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" /></svg>
          </button>
        </div>
        <div className="space-y-3">
          <div>
            <label className="text-xs font-semibold block mb-1" style={{ color: "var(--color-text-muted)" }}>TITLE</label>
            <input className={inputCls} style={inputStyle} value={form.title} onChange={(e) => setForm((p) => ({ ...p, title: e.target.value }))} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold block mb-1" style={{ color: "var(--color-text-muted)" }}>FORMAT</label>
              <select className={inputCls} style={inputStyle} value={form.format} onChange={(e) => setForm((p) => ({ ...p, format: e.target.value }))}>
                {["reel", "blog", "carousel", "faq", "interview", "podcast"].map((f) => (
                  <option key={f} value={f}>{FORMAT_META[f]?.icon} {FORMAT_META[f]?.label ?? f}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-xs font-semibold block mb-1" style={{ color: "var(--color-text-muted)" }}>PLATFORM</label>
              <select className={inputCls} style={inputStyle} value={form.platform} onChange={(e) => setForm((p) => ({ ...p, platform: e.target.value }))}>
                {["instagram", "youtube", "tiktok", "linkedin", "twitter"].map((p) => (
                  <option key={p} value={p}>{PLATFORM_META[p]?.icon} {p}</option>
                ))}
              </select>
            </div>
          </div>
          <div>
            <label className="text-xs font-semibold block mb-1" style={{ color: "var(--color-text-muted)" }}>SCHEDULED DATE</label>
            <input type="date" className={inputCls} style={inputStyle} value={form.scheduled_date} onChange={(e) => setForm((p) => ({ ...p, scheduled_date: e.target.value }))} />
          </div>
          <div>
            <label className="text-xs font-semibold block mb-1" style={{ color: "var(--color-text-muted)" }}>NOTES (optional)</label>
            <textarea className={`${inputCls} resize-none`} style={inputStyle} rows={2} value={form.notes} onChange={(e) => setForm((p) => ({ ...p, notes: e.target.value }))} placeholder="Production notes, ideas…" />
          </div>
          {error && <p className="text-xs px-3 py-2 rounded-xl" style={{ background: "rgba(248,113,113,0.1)", color: "#f87171" }}>{error}</p>}
          <div className="flex gap-3 pt-1">
            <button onClick={onClose} className="flex-1 py-2.5 rounded-xl text-sm font-medium" style={{ background: "var(--color-surface-2)", border: "1px solid var(--color-border)", color: "var(--color-text-2)" }}>Cancel</button>
            <button onClick={save} disabled={saving} className="flex-1 py-2.5 rounded-xl text-sm font-semibold" style={{ background: "linear-gradient(135deg, #7c3aed 0%, #4f46e5 100%)", color: "white", opacity: saving ? 0.7 : 1 }}>
              {saving ? "Adding…" : "Add to Calendar"}
            </button>
          </div>
        </div>
      </div>
    </>
  );
}

// ─── Discovery Modal ──────────────────────────────────────────────────────────

function DiscoveryModal({ onClose, onLaunched }: {
  onClose: () => void;
  onLaunched: (runId: string, n8nTriggered: boolean, direct: { opportunities: GrowthOpportunity[]; signals: SocialSignal[] } | null) => void;
}) {
  const [industry, setIndustry] = useState("");
  const [audience, setAudience] = useState("");
  const [location, setLocation] = useState("");
  const [keywords, setKeywords] = useState("");
  const [platforms, setPlatforms] = useState(["linkedin", "tiktok", "instagram", "facebook", "x"]);
  const [focus, setFocus] = useState<"trends" | "local" | "competitor_gaps" | "all">("all");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  function togglePlatform(id: string) {
    setPlatforms((p) => p.includes(id) ? (p.length > 1 ? p.filter((x) => x !== id) : p) : [...p, id]);
  }

  async function launch() {
    if (!industry.trim()) { setError("Industry / niche is required."); return; }
    setError("");
    setLoading(true);
    try {
      const res = await fetch("/api/growth/discover", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          industry: industry.trim(),
          audience_description: audience.trim(),
          keywords: keywords.trim() ? keywords.split(",").map((k) => k.trim()).filter(Boolean) : [],
          location: location.trim(),
          platforms,
          focus,
        }),
      });
      const data = await res.json() as {
        status: string; run_id: string; n8n_triggered?: boolean;
        opportunities?: GrowthOpportunity[]; social_signals?: SocialSignal[];
      };
      if (!res.ok) throw new Error((data as { error?: string }).error ?? "Discovery failed");
      onLaunched(
        data.run_id,
        data.n8n_triggered ?? false,
        data.status === "complete" ? { opportunities: data.opportunities ?? [], signals: data.social_signals ?? [] } : null
      );
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Discovery failed");
    } finally { setLoading(false); }
  }

  const inputCls = "w-full px-3 py-2.5 rounded-xl text-sm outline-none transition-all";
  const inputStyle = { background: "var(--color-surface-2)", border: "1px solid var(--color-border-subtle)", color: "var(--color-text-1)" };

  return (
    <>
      <div className="fixed inset-0 z-40" style={{ background: "rgba(0,0,0,0.6)" }} onClick={onClose} />
      <div className="fixed left-1/2 top-1/2 z-50 w-full max-w-xl max-h-[92dvh] overflow-y-auto"
        style={{ transform: "translate(-50%, -50%)", background: "var(--color-surface)", border: "1px solid var(--color-border)", borderRadius: 20, boxShadow: "0 24px 80px rgba(0,0,0,0.5)", padding: 24 }}>

        <div className="flex items-start justify-between mb-5">
          <div>
            <h2 className="text-lg font-bold" style={{ fontFamily: "var(--font-syne)", color: "var(--color-text-1)" }}>🧠 Run Growth Intelligence Scan</h2>
            <p className="text-xs mt-0.5" style={{ color: "var(--color-text-muted)" }}>Find conversation opportunities across Reddit, YouTube, LinkedIn & more</p>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg" style={{ color: "var(--color-text-muted)" }}>
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M4 4l8 8M12 4l-8 8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" /></svg>
          </button>
        </div>

        <div className="space-y-5">
          {/* Industry */}
          <div>
            <label className="text-xs font-semibold block mb-1.5" style={{ color: "var(--color-text-muted)" }}>INDUSTRY / NICHE <span style={{ color: "#f87171" }}>*</span></label>
            <input value={industry} onChange={(e) => setIndustry(e.target.value)} placeholder="e.g. MedSpa, HVAC, Digital Marketing Agency, Real Estate"
              className={inputCls} style={inputStyle} />
          </div>

          {/* Audience */}
          <div>
            <label className="text-xs font-semibold block mb-1.5" style={{ color: "var(--color-text-muted)" }}>TARGET AUDIENCE (optional but recommended)</label>
            <textarea value={audience} onChange={(e) => setAudience(e.target.value)} rows={2}
              placeholder="e.g. Local homeowners in Phoenix looking for HVAC service, Female professionals 28-45 interested in aesthetic treatments"
              className="w-full px-3 py-2.5 rounded-xl text-sm outline-none resize-none" style={{ ...inputStyle, lineHeight: "1.5" }} />
          </div>

          {/* Location */}
          <div>
            <label className="text-xs font-semibold block mb-1.5" style={{ color: "var(--color-text-muted)" }}>LOCATION (for local intelligence)</label>
            <input value={location} onChange={(e) => setLocation(e.target.value)} placeholder="e.g. Murrieta CA, Phoenix AZ, Dallas TX"
              className={inputCls} style={inputStyle} />
          </div>

          {/* Keywords */}
          <div>
            <label className="text-xs font-semibold block mb-1.5" style={{ color: "var(--color-text-muted)" }}>KEYWORDS (comma-separated)</label>
            <input value={keywords} onChange={(e) => setKeywords(e.target.value)} placeholder="e.g. CoolSculpting, body contouring, fat loss, medspa near me"
              className={inputCls} style={inputStyle} />
          </div>

          {/* Platforms */}
          <div>
            <label className="text-xs font-semibold block mb-2" style={{ color: "var(--color-text-muted)" }}>SCAN PLATFORMS <span style={{ color: "var(--color-text-muted)", fontWeight: 400 }}>— select all that apply</span></label>
            <div className="grid grid-cols-2 gap-2">
              {([
                { id: "linkedin",    label: "LinkedIn",    icon: "💼", desc: "B2B conversations & pain points" },
                { id: "tiktok",      label: "TikTok",      icon: "🎵", desc: "Viral trends & creator discussions" },
                { id: "instagram",   label: "Instagram",   icon: "📸", desc: "Reels, posts & audience sentiment" },
                { id: "facebook",    label: "Facebook",    icon: "📘", desc: "Groups, communities & Q&A" },
                { id: "x",           label: "X (Twitter)", icon: "𝕏",  desc: "Real-time conversations & trends" },
                { id: "reddit",      label: "Reddit",      icon: "🔴", desc: "Deep community discussions & Q&A" },
                { id: "youtube",     label: "YouTube",     icon: "▶",  desc: "Comments & 'how to' searches" },
                { id: "google_news", label: "Google News", icon: "📰", desc: "Industry trends & news" },
              ] as const).map(({ id, label, icon, desc }) => {
                const active = platforms.includes(id);
                return (
                  <button key={id} onClick={() => togglePlatform(id)} type="button"
                    className="text-left px-3 py-2 rounded-xl text-xs transition-all"
                    style={{ background: active ? "rgba(124,58,237,0.12)" : "var(--color-surface-2)", border: active ? "1px solid rgba(124,58,237,0.35)" : "1px solid var(--color-border-subtle)", color: active ? "#a78bfa" : "var(--color-text-2)" }}>
                    <div className="font-semibold">{icon} {label}</div>
                    <div className="text-[10px] mt-0.5" style={{ color: active ? "#a78bfa88" : "var(--color-text-muted)" }}>{desc}</div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Focus */}
          <div>
            <label className="text-xs font-semibold block mb-2" style={{ color: "var(--color-text-muted)" }}>INTELLIGENCE FOCUS</label>
            <div className="grid grid-cols-2 gap-2">
              {([
                { id: "all" as const, label: "Full Scan", desc: "All opportunity types" },
                { id: "trends" as const, label: "Trends", desc: "Emerging topics & velocity" },
                { id: "local" as const, label: "Local", desc: "Community & event opportunities" },
                { id: "competitor_gaps" as const, label: "Competitor Gaps", desc: "Topics they're missing" },
              ]).map(({ id, label, desc }) => (
                <button key={id} onClick={() => setFocus(id)} type="button"
                  className="text-left px-3 py-2 rounded-xl text-xs transition-all"
                  style={{ background: focus === id ? "rgba(124,58,237,0.12)" : "var(--color-surface-2)", border: focus === id ? "1px solid rgba(124,58,237,0.35)" : "1px solid var(--color-border-subtle)", color: focus === id ? "#a78bfa" : "var(--color-text-2)" }}>
                  <div className="font-semibold">{label}</div>
                  <div className="text-[10px] mt-0.5" style={{ color: focus === id ? "#a78bfa88" : "var(--color-text-muted)" }}>{desc}</div>
                </button>
              ))}
            </div>
          </div>

          {error && <p className="text-xs px-3 py-2 rounded-xl" style={{ background: "rgba(248,113,113,0.1)", color: "#f87171" }}>{error}</p>}

          <div className="flex gap-3 pt-1">
            <button onClick={onClose} className="flex-1 py-2.5 rounded-xl text-sm font-medium" style={{ background: "var(--color-surface-2)", border: "1px solid var(--color-border)", color: "var(--color-text-2)" }}>Cancel</button>
            <button onClick={launch} disabled={loading}
              className="flex-1 py-2.5 rounded-xl text-sm font-semibold flex items-center justify-center gap-2"
              style={{ background: "linear-gradient(135deg, #7c3aed 0%, #4f46e5 100%)", color: "white", boxShadow: "0 4px 12px rgba(124,58,237,0.3)", opacity: loading ? 0.7 : 1 }}>
              {loading ? <><div className="w-4 h-4 rounded-full border-2 border-white border-t-transparent animate-spin" />Scanning…</> : <>🔍 Run Intelligence Scan</>}
            </button>
          </div>
        </div>
      </div>
    </>
  );
}

// ─── Opportunities Panel ──────────────────────────────────────────────────────

function OpportunitiesPanel({ onSelect }: { onSelect: (opp: GrowthOpportunity) => void }) {
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [minScore, setMinScore] = useState(0);
  const timerRef = { current: null as ReturnType<typeof setTimeout> | null };

  function onSearchChange(v: string) {
    setSearch(v);
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => setDebouncedSearch(v), 400);
  }

  const { data, isLoading } = useOpportunities({ search: debouncedSearch || undefined, min_score: minScore || undefined });
  const opps = data?.data ?? [];

  if (isLoading) return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
      {[1,2,3,4].map((i) => <div key={i} className="rounded-2xl animate-pulse" style={{ height: 180, background: "var(--color-surface)", border: "1px solid var(--color-border)" }} />)}
    </div>
  );

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row gap-3">
        <SearchBar value={search} onChange={onSearchChange} placeholder="Search opportunities, topics…" />
        <div className="flex items-center gap-2 flex-shrink-0">
          <label className="text-xs" style={{ color: "var(--color-text-muted)" }}>Min score:</label>
          <select value={minScore} onChange={(e) => setMinScore(Number(e.target.value))}
            className="px-2 py-1.5 rounded-lg text-xs outline-none"
            style={{ background: "var(--color-surface)", border: "1px solid var(--color-border)", color: "var(--color-text-2)" }}>
            <option value={0}>All</option>
            <option value={60}>60+</option>
            <option value={70}>70+</option>
            <option value={80}>80+</option>
            <option value={90}>90+</option>
          </select>
        </div>
      </div>

      {opps.length === 0 ? (
        <EmptyState icon="🧠" title="No opportunities yet" desc="Run a Growth Intelligence Scan to discover conversation opportunities across Reddit, YouTube, LinkedIn and more." />
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {opps.map((opp) => {
            const { color: gc } = scoreColor(opp.growth_score);
            const sources = (opp.source ?? "").split(",").map((s) => s.trim()).filter(Boolean);
            return (
              <div key={opp.id} onClick={() => onSelect(opp)}
                className="rounded-2xl p-5 cursor-pointer transition-all group"
                style={{ background: "var(--color-surface)", border: "1px solid var(--color-border)" }}
                onMouseEnter={(e) => { e.currentTarget.style.border = "1px solid rgba(124,58,237,0.3)"; e.currentTarget.style.boxShadow = "0 4px 20px rgba(124,58,237,0.08)"; }}
                onMouseLeave={(e) => { e.currentTarget.style.border = "1px solid var(--color-border)"; e.currentTarget.style.boxShadow = "none"; }}>

                {/* Header row */}
                <div className="flex items-start justify-between gap-2 mb-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5 flex-wrap mb-1">
                      {sources.map((s) => {
                        const pm = PLATFORM_META[s];
                        return pm ? (
                          <span key={s} className="text-[9px] px-1.5 py-0.5 rounded font-medium" style={{ background: `${pm.color}15`, color: pm.color }}>{pm.icon} {s}</span>
                        ) : null;
                      })}
                      {opp.signal_count > 0 && (
                        <span className="text-[9px] px-1.5 py-0.5 rounded" style={{ background: "var(--color-surface-2)", color: "var(--color-text-muted)" }}>{opp.signal_count} signals</span>
                      )}
                    </div>
                    <h3 className="text-sm font-semibold leading-tight" style={{ fontFamily: "var(--font-syne)", color: "var(--color-text-1)" }}>{opp.title}</h3>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <div className="text-xl font-bold" style={{ color: gc, fontFamily: "var(--font-syne)" }}>{opp.growth_score}</div>
                    <div className="text-[9px]" style={{ color: "var(--color-text-muted)" }}>growth</div>
                  </div>
                </div>

                {/* Description */}
                {opp.description && (
                  <p className="text-xs leading-relaxed mb-3" style={{ color: "var(--color-text-2)", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>
                    {opp.description}
                  </p>
                )}

                {/* Growth score bar */}
                <GrowthScoreBar score={opp.growth_score} />

                {/* Content formats */}
                {opp.content_formats?.length > 0 && (
                  <div className="flex gap-1.5 mt-3 flex-wrap">
                    {opp.content_formats.slice(0, 4).map((fmt) => {
                      const meta = FORMAT_META[fmt];
                      if (!meta) return null;
                      return (
                        <span key={fmt} className="text-[10px] px-1.5 py-0.5 rounded" style={{ background: `${meta.color}12`, color: meta.color }}>
                          {meta.icon} {meta.label}
                        </span>
                      );
                    })}
                  </div>
                )}

                {/* First hook preview */}
                {opp.hooks?.[0] && (
                  <div className="mt-3 px-2.5 py-1.5 rounded-lg text-[10px] italic" style={{ background: "rgba(124,58,237,0.06)", color: "#a78bfa", borderLeft: "2px solid rgba(124,58,237,0.3)" }}>
                    &ldquo;{opp.hooks[0].length > 80 ? opp.hooks[0].slice(0, 80) + "…" : opp.hooks[0]}&rdquo;
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ─── Signals Panel ────────────────────────────────────────────────────────────

function SignalsPanel() {
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [source, setSource] = useState("");
  const [signalType, setSignalType] = useState("");
  const timerRef = { current: null as ReturnType<typeof setTimeout> | null };

  function onSearchChange(v: string) {
    setSearch(v);
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => setDebouncedSearch(v), 400);
  }

  const { data, isLoading } = useSignals({ search: debouncedSearch || undefined, source: source || undefined, signal_type: signalType || undefined });
  const signals = data?.data ?? [];

  const types = ["question", "complaint", "trend", "discussion", "buying_intent"];

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row gap-3">
        <SearchBar value={search} onChange={onSearchChange} placeholder="Search conversations, topics…" />
        <div className="flex gap-1.5">
          <select value={source} onChange={(e) => setSource(e.target.value)}
            className="px-2 py-1.5 rounded-lg text-xs outline-none"
            style={{ background: "var(--color-surface)", border: "1px solid var(--color-border)", color: "var(--color-text-2)" }}>
            <option value="">All platforms</option>
            {["linkedin","tiktok","instagram","facebook","x","reddit","youtube","google_news"].map((s) => <option key={s} value={s}>{PLATFORM_META[s]?.icon} {s}</option>)}
          </select>
        </div>
      </div>

      {/* Signal type filter pills */}
      <div className="flex gap-1.5 flex-wrap">
        <button onClick={() => setSignalType("")} className="px-3 py-1.5 rounded-lg text-xs font-medium"
          style={{ background: !signalType ? "rgba(124,58,237,0.15)" : "var(--color-surface-2)", border: !signalType ? "1px solid rgba(124,58,237,0.3)" : "1px solid var(--color-border-subtle)", color: !signalType ? "#a78bfa" : "var(--color-text-muted)" }}>All types</button>
        {types.map((t) => {
          const c = SIGNAL_TYPE_COLORS[t];
          const active = signalType === t;
          return (
            <button key={t} onClick={() => setSignalType(active ? "" : t)} className="px-3 py-1.5 rounded-lg text-xs font-medium capitalize"
              style={{ background: active ? c.bg : "var(--color-surface-2)", border: active ? `1px solid ${c.color}40` : "1px solid var(--color-border-subtle)", color: active ? c.color : "var(--color-text-muted)" }}>
              {t.replace("_", " ")}
            </button>
          );
        })}
      </div>

      {isLoading ? (
        <div className="space-y-3">{[1,2,3].map((i) => <div key={i} className="rounded-2xl animate-pulse" style={{ height: 90, background: "var(--color-surface)", border: "1px solid var(--color-border)" }} />)}</div>
      ) : signals.length === 0 ? (
        <EmptyState icon="📡" title="No signals yet" desc="Run a Growth Intelligence Scan to capture real conversations from Reddit, YouTube, LinkedIn and more." />
      ) : (
        <div className="space-y-3">
          {signals.map((sig) => {
            const tc = SIGNAL_TYPE_COLORS[sig.signal_type ?? ""] ?? SIGNAL_TYPE_COLORS.discussion;
            const pm = PLATFORM_META[sig.source ?? ""];
            const sentColor = SENTIMENT_COLORS[sig.sentiment ?? "neutral"] ?? "#6b7280";
            return (
              <div key={sig.id} className="rounded-2xl p-4 transition-all"
                style={{ background: "var(--color-surface)", border: "1px solid var(--color-border)" }}>
                <div className="flex items-start gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5 flex-wrap mb-2">
                      {pm && <span className="text-[10px] px-1.5 py-0.5 rounded font-medium" style={{ background: `${pm.color}15`, color: pm.color }}>{pm.icon} {sig.source}</span>}
                      {sig.signal_type && (
                        <span className="text-[10px] px-1.5 py-0.5 rounded capitalize font-semibold" style={{ background: tc.bg, color: tc.color }}>{sig.signal_type.replace("_", " ")}</span>
                      )}
                      {sig.sentiment && (
                        <span className="text-[10px] px-1.5 py-0.5 rounded capitalize" style={{ color: sentColor, background: `${sentColor}12` }}>{sig.sentiment}</span>
                      )}
                      {sig.location && <span className="text-[10px]" style={{ color: "var(--color-text-muted)" }}>📍 {sig.location}</span>}
                    </div>
                    <p className="text-sm leading-relaxed" style={{ color: "var(--color-text-1)" }}>
                      &ldquo;{sig.question.length > 200 ? sig.question.slice(0, 200) + "…" : sig.question}&rdquo;
                    </p>
                    <div className="flex items-center gap-3 mt-2">
                      {sig.topic && <span className="text-[10px]" style={{ color: "var(--color-text-muted)" }}>Topic: {sig.topic}</span>}
                      {sig.engagement_hint && <span className="text-[10px]" style={{ color: "var(--color-text-muted)" }}>💬 {sig.engagement_hint}</span>}
                      <span className="text-[10px]" style={{ color: "var(--color-text-muted)" }}>{relativeTime(sig.created_at)}</span>
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-1 flex-shrink-0">
                    <div className="text-base font-bold" style={{ color: scoreColor(sig.relevance_score).color, fontFamily: "var(--font-syne)" }}>{sig.relevance_score}</div>
                    <div className="text-[9px]" style={{ color: "var(--color-text-muted)" }}>relevance</div>
                    {sig.source_url && (
                      <a href={sig.source_url} target="_blank" rel="noopener" onClick={(e) => e.stopPropagation()}
                        className="text-[10px] px-2 py-0.5 rounded mt-1"
                        style={{ color: "#a78bfa", background: "rgba(124,58,237,0.1)" }}>View →</a>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ─── Calendar Panel ───────────────────────────────────────────────────────────

function CalendarPanel({ onAddItem }: { onAddItem: () => void }) {
  const [days, setDays] = useState(30);
  const { data, isLoading, refetch } = useCalendar(days);
  const items = data?.data ?? [];

  async function updateStatus(id: string, status: string) {
    await fetch(`/api/growth/calendar?id=${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    refetch();
  }

  // Group by week
  const grouped = items.reduce<Record<string, CalendarItem[]>>((acc, item) => {
    const d = item.scheduled_date ? new Date(item.scheduled_date) : new Date();
    const weekStart = new Date(d);
    weekStart.setDate(d.getDate() - d.getDay());
    const key = weekStart.toLocaleDateString("en-US", { month: "short", day: "numeric" });
    if (!acc[key]) acc[key] = [];
    acc[key].push(item);
    return acc;
  }, {});

  const STATUS_STYLES: Record<string, { color: string; bg: string }> = {
    planned:     { color: "#6b7280", bg: "rgba(107,114,128,0.1)" },
    in_progress: { color: "#fbbf24", bg: "rgba(251,191,36,0.1)" },
    published:   { color: "#34d399", bg: "rgba(52,211,153,0.1)" },
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <div className="flex gap-1.5">
          {[7, 30, 90].map((d) => (
            <button key={d} onClick={() => setDays(d)} className="px-3 py-1.5 rounded-lg text-xs font-medium"
              style={{ background: days === d ? "rgba(124,58,237,0.15)" : "var(--color-surface-2)", border: days === d ? "1px solid rgba(124,58,237,0.3)" : "1px solid var(--color-border-subtle)", color: days === d ? "#a78bfa" : "var(--color-text-muted)" }}>
              {d}-Day
            </button>
          ))}
        </div>
        <button onClick={onAddItem} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium"
          style={{ background: "var(--color-surface)", border: "1px solid var(--color-border)", color: "var(--color-text-2)" }}>
          <svg width="11" height="11" viewBox="0 0 11 11" fill="none"><path d="M5.5 1v9M1 5.5h9" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" /></svg>
          Add Item
        </button>
      </div>

      {isLoading ? (
        <div className="space-y-3">{[1,2].map((i) => <div key={i} className="rounded-2xl animate-pulse" style={{ height: 80, background: "var(--color-surface)", border: "1px solid var(--color-border)" }} />)}</div>
      ) : items.length === 0 ? (
        <EmptyState
          icon="📅"
          title="Calendar is empty"
          desc="Add opportunities from the Opportunities tab to start building your content calendar."
          action={<button onClick={onAddItem} className="px-4 py-2 rounded-xl text-sm font-semibold" style={{ background: "linear-gradient(135deg, #7c3aed 0%, #4f46e5 100%)", color: "white" }}>+ Add First Item</button>}
        />
      ) : (
        <div className="space-y-6">
          {Object.entries(grouped).map(([week, weekItems]) => (
            <div key={week}>
              <div className="text-xs font-semibold mb-3 px-1" style={{ color: "var(--color-text-muted)" }}>WEEK OF {week.toUpperCase()}</div>
              <div className="space-y-2">
                {weekItems.map((item) => {
                  const fmt = FORMAT_META[item.format ?? ""];
                  const pm = PLATFORM_META[item.platform ?? ""];
                  const ss = STATUS_STYLES[item.status] ?? STATUS_STYLES.planned;
                  const { color: gc } = scoreColor(item.growth_score);
                  return (
                    <div key={item.id} className="rounded-2xl px-4 py-3 flex items-center gap-3 transition-all"
                      style={{ background: "var(--color-surface)", border: "1px solid var(--color-border)" }}>
                      <div className="w-10 text-center flex-shrink-0">
                        {item.scheduled_date && (
                          <>
                            <div className="text-xs font-bold" style={{ color: "var(--color-text-1)" }}>{new Date(item.scheduled_date).getDate()}</div>
                            <div className="text-[9px]" style={{ color: "var(--color-text-muted)" }}>{new Date(item.scheduled_date).toLocaleDateString("en-US", { month: "short" })}</div>
                          </>
                        )}
                      </div>
                      <div style={{ width: 1, height: 36, background: "var(--color-border)" }} />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5 mb-0.5">
                          {fmt && <span className="text-[10px]">{fmt.icon}</span>}
                          {pm && <span className="text-[10px] font-medium" style={{ color: pm.color }}>{pm.icon} {item.platform}</span>}
                        </div>
                        <p className="text-sm font-medium truncate" style={{ color: "var(--color-text-1)" }}>{item.title}</p>
                        {item.notes && <p className="text-[10px] mt-0.5 truncate" style={{ color: "var(--color-text-muted)" }}>{item.notes}</p>}
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        <span className="text-sm font-bold" style={{ color: gc }}>{item.growth_score}</span>
                        <select value={item.status} onChange={(e) => updateStatus(item.id, e.target.value)}
                          className="text-[10px] px-2 py-0.5 rounded-lg outline-none"
                          style={{ background: ss.bg, color: ss.color, border: "none" }}
                          onClick={(e) => e.stopPropagation()}>
                          <option value="planned">Planned</option>
                          <option value="in_progress">In Progress</option>
                          <option value="published">Published</option>
                        </select>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function GrowthIntelligencePage() {
  const qc = useQueryClient();
  const [activeTab, setActiveTab] = useState<TabType>("opportunities");
  const [showDiscovery, setShowDiscovery] = useState(false);
  const [selectedOpp, setSelectedOpp] = useState<GrowthOpportunity | null>(null);
  const [addToCalOpp, setAddToCalOpp] = useState<GrowthOpportunity | null>(null);
  const [activeRunId, setActiveRunId] = useState<string | null>(null);
  const [scanning, setScanning] = useState(false);

  const { data: oppData } = useOpportunities();
  const { data: sigData } = useSignals();
  const { data: calData } = useCalendar(30);

  const opps = oppData?.data ?? [];
  const sigs = sigData?.data ?? [];
  const cal = calData?.data ?? [];

  const STATS = [
    { label: "Opportunities", value: oppData?.total ?? opps.length, color: "#7c3aed" },
    { label: "High Growth (≥80)", value: opps.filter((o) => o.growth_score >= 80).length, color: "#34d399" },
    { label: "Active Signals", value: sigData?.total ?? sigs.length, color: "#60a5fa" },
    { label: "Calendar Items", value: calData?.total ?? cal.length, color: "#fbbf24" },
  ];

  const TABS: { id: TabType; label: string; icon: string; count?: number }[] = [
    { id: "opportunities", label: "Opportunities", icon: "🧠", count: oppData?.total },
    { id: "signals",       label: "Signals",       icon: "📡", count: sigData?.total },
    { id: "calendar",      label: "Calendar",      icon: "📅", count: calData?.total },
  ];

  const handleLaunched = useCallback((runId: string, n8nTriggered: boolean, direct: { opportunities: GrowthOpportunity[]; signals: SocialSignal[] } | null) => {
    if (direct) {
      // Direct GPT path — data is already in DB, just refresh
      qc.invalidateQueries({ queryKey: ["growth-opportunities"] });
      qc.invalidateQueries({ queryKey: ["growth-signals"] });
      setActiveTab("opportunities");
    } else {
      // n8n async path
      setActiveRunId(runId);
      setScanning(true);
      setActiveTab("opportunities");
      // Auto-dismiss after 3 min
      setTimeout(() => { setActiveRunId(null); setScanning(false); }, 180_000);
    }
  }, [qc]);

  return (
    <div className="p-5 sm:p-8 max-w-[1400px] mx-auto space-y-6">

      {/* Running banner */}
      {scanning && (
        <div className="rounded-2xl px-5 py-4 animate-fade-up" style={{ background: "rgba(124,58,237,0.08)", border: "1px solid rgba(124,58,237,0.2)" }}>
          <div className="flex items-center gap-4">
            <div className="w-5 h-5 rounded-full border-2 border-t-transparent animate-spin flex-shrink-0" style={{ borderColor: "#7c3aed", borderTopColor: "transparent" }} />
            <div className="flex-1">
              <div className="text-sm font-semibold" style={{ color: "var(--color-text-1)" }}>Scanning the internet for growth opportunities</div>
              <div className="flex gap-3 mt-1 flex-wrap">
                {["Monitoring Reddit & YouTube", "Analyzing conversation patterns", "Scoring growth opportunities"].map((t, i) => (
                  <span key={i} className="text-[10px] px-2 py-0.5 rounded-md" style={{ background: "rgba(124,58,237,0.12)", color: "#a78bfa" }}>● {t}</span>
                ))}
              </div>
            </div>
            <button onClick={() => { setScanning(false); setActiveRunId(null); }} className="text-xs px-3 py-1.5 rounded-lg flex-shrink-0" style={{ color: "var(--color-text-muted)", background: "var(--color-surface)" }}>Dismiss</button>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 animate-fade-up">
        <div>
          <p className="text-sm mb-1" style={{ color: "var(--color-text-2)" }}>Discover & capitalize on</p>
          <h1 className="text-2xl sm:text-3xl font-bold" style={{ fontFamily: "var(--font-syne)", color: "var(--color-text-1)" }}>
            Growth Intelligence
          </h1>
        </div>
        <button onClick={() => setShowDiscovery(true)}
          className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold self-start sm:self-auto transition-all"
          style={{ background: "linear-gradient(135deg, #7c3aed 0%, #4f46e5 100%)", color: "white", boxShadow: "0 4px 12px rgba(124,58,237,0.3)" }}>
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><circle cx="6" cy="6" r="4" stroke="currentColor" strokeWidth="1.5"/><path d="M9 9l3 3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg>
          Run Intelligence Scan
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-4 animate-fade-up" style={{ animationDelay: "0.05s" }}>
        {STATS.map((s, i) => (
          <div key={s.label} className="rounded-2xl p-5 relative overflow-hidden"
            style={{ background: "var(--color-surface)", border: "1px solid var(--color-border)", animationDelay: `${i * 0.07}s` }}>
            <div className="absolute top-0 right-0 w-24 h-24 rounded-full pointer-events-none opacity-30"
              style={{ background: `radial-gradient(circle, ${s.color}25 0%, transparent 70%)`, transform: "translate(25%,-25%)" }} />
            <div className="text-2xl font-bold mb-1" style={{ fontFamily: "var(--font-syne)", color: "var(--color-text-1)" }}>{s.value}</div>
            <div className="text-xs" style={{ color: "var(--color-text-muted)" }}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div className="flex gap-1.5 overflow-x-auto pb-1 animate-fade-up" style={{ animationDelay: "0.1s" }}>
        {TABS.map(({ id, label, icon, count }) => {
          const active = activeTab === id;
          return (
            <button key={id} onClick={() => setActiveTab(id)}
              className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-sm font-medium flex-shrink-0 transition-all"
              style={{ background: active ? "var(--color-surface)" : "transparent", border: active ? "1px solid var(--color-border)" : "1px solid transparent", color: active ? "var(--color-text-1)" : "var(--color-text-muted)", boxShadow: active ? "0 1px 3px rgba(0,0,0,0.06)" : "none" }}>
              <span>{icon}</span>
              <span>{label}</span>
              {count != null && count > 0 && (
                <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full" style={{ background: active ? "rgba(124,58,237,0.15)" : "var(--color-surface-2)", color: active ? "#a78bfa" : "var(--color-text-muted)" }}>{count}</span>
              )}
            </button>
          );
        })}
      </div>

      {/* Tab content */}
      <div className="animate-fade-up" style={{ animationDelay: "0.12s" }}>
        {activeTab === "opportunities" && <OpportunitiesPanel onSelect={(o) => setSelectedOpp(o)} />}
        {activeTab === "signals"       && <SignalsPanel />}
        {activeTab === "calendar"      && <CalendarPanel onAddItem={() => { /* todo: open add modal */ }} />}
      </div>

      {/* Modals + Drawers */}
      {showDiscovery && <DiscoveryModal onClose={() => setShowDiscovery(false)} onLaunched={handleLaunched} />}
      {selectedOpp && (
        <OpportunityDrawer
          opp={selectedOpp}
          onClose={() => setSelectedOpp(null)}
          onAddToCalendar={(o) => { setSelectedOpp(null); setAddToCalOpp(o); }}
        />
      )}
      {addToCalOpp && (
        <AddToCalendarModal
          opp={addToCalOpp}
          onClose={() => setAddToCalOpp(null)}
          onAdded={() => { qc.invalidateQueries({ queryKey: ["growth-calendar"] }); setActiveTab("calendar"); }}
        />
      )}
    </div>
  );
}
