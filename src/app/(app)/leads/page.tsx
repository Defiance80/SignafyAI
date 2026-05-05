"use client";

import { useState, useCallback } from "react";
import { useLeads, useUpdateLead, useDeleteLead, useDiscoverLeads, useLeadDetail } from "@/hooks/use-leads";
import { scoreColor, relativeTime, formatDate } from "@/lib/utils";
import type { Lead, LeadStatus } from "@/lib/supabase/types";

// ─── Constants ────────────────────────────────────────────────────────────────

const STATUS_MAP: Record<LeadStatus, { color: string; bg: string; label: string }> = {
  new:       { color: "#60a5fa", bg: "rgba(96,165,250,0.12)",  label: "New" },
  contacted: { color: "#a78bfa", bg: "rgba(167,139,250,0.12)", label: "Contacted" },
  qualified: { color: "#34d399", bg: "rgba(52,211,153,0.12)",  label: "Qualified" },
  converted: { color: "#fbbf24", bg: "rgba(251,191,36,0.12)",  label: "Converted" },
  lost:      { color: "#f87171", bg: "rgba(248,113,113,0.12)", label: "Lost" },
};

const PLATFORM_ICONS: Record<string, string> = {
  instagram: "IG", linkedin: "LI", tiktok: "TT", twitter: "TW", facebook: "FB", google: "G", manual: "—",
};

const PLATFORM_COLORS: Record<string, string> = {
  instagram: "#e040fb", linkedin: "#0a66c2", tiktok: "#00f2ea",
  twitter: "#8899a6", facebook: "#1877f2", google: "#4285f4", manual: "#6b7280",
};

const INDUSTRIES = [
  "Marketing Agency", "SaaS / Tech", "E-Commerce / DTC", "Professional Services",
  "Real Estate", "Healthcare", "Finance", "Education", "Media & Entertainment", "Other",
];

const PLATFORMS = ["instagram", "linkedin", "tiktok", "twitter", "facebook", "google"];
const B2C_SOURCES = [
  { id: "reddit", label: "Reddit conversations" },
  { id: "review_platforms", label: "Review platforms" },
  { id: "directories", label: "Consumer directories" },
] as const;
const B2B_SOURCES = [
  { id: "linkedin", label: "LinkedIn" },
  { id: "directories", label: "Business directories" },
  { id: "company_websites", label: "Company websites" },
] as const;

// ─── Score Bar ────────────────────────────────────────────────────────────────
function ScoreBar({ score }: { score: number }) {
  const { color, bg } = scoreColor(score);
  return (
    <div className="flex items-center gap-2">
      <div className="w-16 h-1.5 rounded-full overflow-hidden" style={{ background: "var(--color-surface-2)" }}>
        <div className="h-full rounded-full transition-all" style={{ width: `${score}%`, background: color }} />
      </div>
      <span className="text-xs font-semibold tabular-nums" style={{ color }}>{score}</span>
    </div>
  );
}

// ─── Platform Badge ───────────────────────────────────────────────────────────
function PlatformBadge({ platform }: { platform: string | null }) {
  if (!platform) return null;
  const color = PLATFORM_COLORS[platform] ?? "#6b7280";
  return (
    <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-md" style={{ background: `${color}18`, color }}>
      {PLATFORM_ICONS[platform] ?? platform.toUpperCase()}
    </span>
  );
}

// ─── Lead Detail Drawer ───────────────────────────────────────────────────────
function LeadDrawer({ leadId, onClose }: { leadId: string; onClose: () => void }) {
  const { data, isLoading } = useLeadDetail(leadId);
  const updateLead = useUpdateLead();
  const [note, setNote] = useState("");
  const [savingNote, setSavingNote] = useState(false);

  const lead = data?.lead;
  const activities = data?.activities ?? [];

  async function handleStatusChange(status: LeadStatus) {
    if (!lead) return;
    await updateLead.mutateAsync({ id: lead.id, status });
  }

  async function handleSaveNote() {
    if (!lead || !note.trim()) return;
    setSavingNote(true);
    await updateLead.mutateAsync({ id: lead.id, notes: note.trim() });
    setNote("");
    setSavingNote(false);
  }

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-40"
        style={{ background: "rgba(0,0,0,0.5)" }}
        onClick={onClose}
      />

      {/* Drawer */}
      <div
        className="fixed right-0 top-0 bottom-0 z-50 flex flex-col overflow-hidden"
        style={{
          width: "min(520px, 100vw)",
          background: "var(--color-surface)",
          borderLeft: "1px solid var(--color-border)",
          boxShadow: "-16px 0 64px rgba(0,0,0,0.4)",
        }}
      >
        {/* Header */}
        <div className="flex items-center gap-3 px-6 py-5" style={{ borderBottom: "1px solid var(--color-border-subtle)" }}>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg transition-colors"
            style={{ color: "var(--color-text-muted)" }}
            onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.color = "var(--color-text-1)"; }}
            onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.color = "var(--color-text-muted)"; }}
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <path d="M4 4l8 8M12 4l-8 8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
          </button>
          <div className="flex-1">
            {isLoading ? (
              <div className="h-5 w-40 rounded" style={{ background: "var(--color-surface-2)" }} />
            ) : (
              <h2 className="text-base font-bold" style={{ fontFamily: "var(--font-syne)", color: "var(--color-text-1)" }}>{lead?.name}</h2>
            )}
          </div>
        </div>

        {isLoading ? (
          <div className="flex-1 flex items-center justify-center" style={{ color: "var(--color-text-muted)" }}>
            Loading lead...
          </div>
        ) : !lead ? (
          <div className="flex-1 flex items-center justify-center" style={{ color: "var(--color-text-muted)" }}>
            Lead not found
          </div>
        ) : (
          <div className="flex-1 overflow-y-auto">
            {/* Profile */}
            <div className="px-6 py-5 space-y-4" style={{ borderBottom: "1px solid var(--color-border-subtle)" }}>
              {/* Score + Status */}
              <div className="flex items-center gap-3 flex-wrap">
                <ScoreBar score={lead.score} />
                <div className="flex gap-2 flex-wrap">
                  {(Object.keys(STATUS_MAP) as LeadStatus[]).map((s) => {
                    const style = STATUS_MAP[s];
                    const isActive = lead.status === s;
                    return (
                      <button
                        key={s}
                        onClick={() => handleStatusChange(s)}
                        className="text-xs font-semibold px-2.5 py-1 rounded-lg transition-all"
                        style={{
                          background: isActive ? style.bg : "var(--color-surface-2)",
                          color: isActive ? style.color : "var(--color-text-muted)",
                          border: isActive ? `1px solid ${style.color}40` : "1px solid var(--color-border-subtle)",
                          opacity: updateLead.isPending ? 0.6 : 1,
                        }}
                      >
                        {style.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Details grid */}
              <div className="grid grid-cols-2 gap-3">
                {lead.company && (
                  <div>
                    <div className="text-xs mb-0.5" style={{ color: "var(--color-text-muted)" }}>Company</div>
                    <div className="text-sm font-medium" style={{ color: "var(--color-text-1)" }}>{lead.company}</div>
                  </div>
                )}
                {lead.email && (
                  <div>
                    <div className="text-xs mb-0.5" style={{ color: "var(--color-text-muted)" }}>Email</div>
                    <a href={`mailto:${lead.email}`} className="text-sm font-medium" style={{ color: "#a78bfa" }}>{lead.email}</a>
                  </div>
                )}
                {lead.phone && (
                  <div>
                    <div className="text-xs mb-0.5" style={{ color: "var(--color-text-muted)" }}>Phone</div>
                    <div className="text-sm" style={{ color: "var(--color-text-2)" }}>{lead.phone}</div>
                  </div>
                )}
                {lead.platform && (
                  <div>
                    <div className="text-xs mb-0.5" style={{ color: "var(--color-text-muted)" }}>Platform</div>
                    <PlatformBadge platform={lead.platform} />
                  </div>
                )}
                {lead.industry && (
                  <div>
                    <div className="text-xs mb-0.5" style={{ color: "var(--color-text-muted)" }}>Industry</div>
                    <div className="text-sm" style={{ color: "var(--color-text-2)" }}>{lead.industry}</div>
                  </div>
                )}
                {lead.location && (
                  <div>
                    <div className="text-xs mb-0.5" style={{ color: "var(--color-text-muted)" }}>Location</div>
                    <div className="text-sm" style={{ color: "var(--color-text-2)" }}>{lead.location}</div>
                  </div>
                )}
              </div>

              {/* Tags */}
              {lead.tags && lead.tags.length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                  {lead.tags.map((tag) => (
                    <span key={tag} className="text-xs px-2 py-0.5 rounded-md" style={{ background: "rgba(124,58,237,0.1)", color: "#a78bfa", border: "1px solid rgba(124,58,237,0.2)" }}>
                      {tag}
                    </span>
                  ))}
                </div>
              )}
            </div>

            {/* Existing notes */}
            {lead.notes && (
              <div className="px-6 py-4" style={{ borderBottom: "1px solid var(--color-border-subtle)" }}>
                <div className="text-xs font-semibold mb-2" style={{ color: "var(--color-text-muted)" }}>NOTES</div>
                <p className="text-sm leading-relaxed" style={{ color: "var(--color-text-2)" }}>{lead.notes}</p>
              </div>
            )}

            {/* Add note */}
            <div className="px-6 py-4" style={{ borderBottom: "1px solid var(--color-border-subtle)" }}>
              <div className="text-xs font-semibold mb-2" style={{ color: "var(--color-text-muted)" }}>ADD NOTE</div>
              <textarea
                value={note}
                onChange={(e) => setNote(e.target.value)}
                rows={3}
                placeholder="Add a note about this lead..."
                className="w-full px-3 py-2 rounded-xl text-sm outline-none resize-none transition-all"
                style={{ background: "var(--color-surface-2)", border: "1px solid var(--color-border-subtle)", color: "var(--color-text-1)" }}
                onFocus={(e) => { (e.currentTarget as HTMLElement).style.borderColor = "rgba(124,58,237,0.4)"; }}
                onBlur={(e) => { (e.currentTarget as HTMLElement).style.borderColor = "var(--color-border-subtle)"; }}
              />
              <button
                onClick={handleSaveNote}
                disabled={!note.trim() || savingNote}
                className="mt-2 px-4 py-1.5 rounded-lg text-xs font-semibold transition-all"
                style={{
                  background: note.trim() ? "rgba(124,58,237,0.15)" : "var(--color-surface-2)",
                  color: note.trim() ? "#a78bfa" : "var(--color-text-muted)",
                  border: `1px solid ${note.trim() ? "rgba(124,58,237,0.3)" : "var(--color-border-subtle)"}`,
                }}
              >
                {savingNote ? "Saving..." : "Save Note"}
              </button>
            </div>

            {/* Activity timeline */}
            <div className="px-6 py-4">
              <div className="text-xs font-semibold mb-3" style={{ color: "var(--color-text-muted)" }}>ACTIVITY TIMELINE</div>
              {activities.length === 0 ? (
                <p className="text-sm" style={{ color: "var(--color-text-muted)" }}>No activity recorded yet.</p>
              ) : (
                <div className="space-y-3 relative">
                  <div className="absolute left-2.5 top-2 bottom-2 w-px" style={{ background: "var(--color-border-subtle)" }} />
                  {(activities as Array<{ id: string; type: string; description: string; created_at: string }>).map((act) => (
                    <div key={act.id} className="flex gap-3 relative pl-7">
                      <div className="absolute left-0 top-1.5 w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0" style={{ background: "var(--color-surface-2)", border: "1px solid var(--color-border)" }}>
                        <div className="w-1.5 h-1.5 rounded-full" style={{ background: "#7c3aed" }} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-xs font-medium" style={{ color: "var(--color-text-1)" }}>{act.type.replace(/_/g, " ")}</div>
                        {act.description && (
                          <div className="text-xs mt-0.5" style={{ color: "var(--color-text-muted)" }}>{act.description}</div>
                        )}
                        <div className="text-[10px] mt-1" style={{ color: "var(--color-text-muted)" }}>{relativeTime(act.created_at)}</div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Enrichment data */}
            {lead.enrichment_data && Object.keys(lead.enrichment_data).length > 0 && (
              <div className="px-6 py-4 mb-4">
                <div className="text-xs font-semibold mb-2" style={{ color: "var(--color-text-muted)" }}>ENRICHMENT DATA</div>
                <pre className="text-xs rounded-xl p-3 overflow-x-auto" style={{ background: "var(--color-surface-2)", color: "var(--color-text-2)", border: "1px solid var(--color-border-subtle)" }}>
                  {JSON.stringify(lead.enrichment_data, null, 2)}
                </pre>
              </div>
            )}
          </div>
        )}
      </div>
    </>
  );
}

// ─── Discovery Modal ──────────────────────────────────────────────────────────
function DiscoveryModal({ onClose, onLaunched }: { onClose: () => void; onLaunched: (runId: string) => void }) {
  const discover = useDiscoverLeads();
  const [targetMarket, setTargetMarket] = useState<"b2b" | "b2c">("b2b");
  const [b2cSources, setB2cSources] = useState<Array<"reddit" | "review_platforms" | "directories">>([
    "reddit",
    "review_platforms",
    "directories",
  ]);
  const [b2bSources, setB2bSources] = useState<Array<"linkedin" | "directories" | "company_websites">>([
    "linkedin",
    "directories",
  ]);
  const [industry, setIndustry] = useState("");
  const [location, setLocation] = useState("");
  const [platforms, setPlatforms] = useState<string[]>(["linkedin", "instagram"]);
  const [keywords, setKeywords] = useState("");
  const [minScore, setMinScore] = useState(40);
  const [saveName, setSaveName] = useState("");
  const [error, setError] = useState("");

  function togglePlatform(p: string) {
    setPlatforms((prev) =>
      prev.includes(p) ? prev.filter((x) => x !== p) : [...prev, p]
    );
  }

  function toggleB2cSource(source: "reddit" | "review_platforms" | "directories") {
    setB2cSources((prev) => prev.includes(source) ? prev.filter((x) => x !== source) : [...prev, source]);
  }

  function toggleB2bSource(source: "linkedin" | "directories" | "company_websites") {
    setB2bSources((prev) => prev.includes(source) ? prev.filter((x) => x !== source) : [...prev, source]);
  }

  async function handleLaunch() {
    setError("");
    if (!industry && !location && keywords.trim().length === 0) {
      setError("Add at least one filter: industry, location, or keywords.");
      return;
    }
    if (targetMarket === "b2c" && b2cSources.length === 0) {
      setError("Select at least one B2C source.");
      return;
    }
    if (targetMarket === "b2b" && b2bSources.length === 0) {
      setError("Select at least one B2B source.");
      return;
    }

    try {
      const result = await discover.mutateAsync({
        target_market: targetMarket,
        b2c_sources: targetMarket === "b2c" ? b2cSources : undefined,
        b2b_sources: targetMarket === "b2b" ? b2bSources : undefined,
        industry: industry || undefined,
        location: location || undefined,
        platforms: platforms.length > 0 ? platforms : undefined,
        keywords: keywords.trim() ? keywords.split(",").map((k) => k.trim()).filter(Boolean) : undefined,
        min_score: minScore,
        save_config_name: saveName.trim() || undefined,
      });
      onLaunched(result.run_id);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Discovery failed");
    }
  }

  return (
    <>
      <div className="fixed inset-0 z-40" style={{ background: "rgba(0,0,0,0.6)" }} onClick={onClose} />
      <div
        className="fixed left-1/2 top-1/2 z-50 w-full max-w-lg max-h-[90dvh] overflow-y-auto"
        style={{ transform: "translate(-50%, -50%)", background: "var(--color-surface)", border: "1px solid var(--color-border)", borderRadius: 20, boxShadow: "0 24px 80px rgba(0,0,0,0.5)", padding: 24 }}
      >
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-lg font-bold" style={{ fontFamily: "var(--font-syne)", color: "var(--color-text-1)" }}>Run Lead Discovery</h2>
            <p className="text-xs mt-0.5" style={{ color: "var(--color-text-muted)" }}>Configure your ideal prospect criteria</p>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg" style={{ color: "var(--color-text-muted)" }}>
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M4 4l8 8M12 4l-8 8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" /></svg>
          </button>
        </div>

        <div className="space-y-4">
          {/* Target market */}
          <div>
            <label className="text-xs font-semibold block mb-2" style={{ color: "var(--color-text-muted)" }}>LEAD TYPE</label>
            <div className="grid grid-cols-2 gap-2">
              {(["b2b", "b2c"] as const).map((market) => {
                const active = targetMarket === market;
                return (
                  <button
                    key={market}
                    onClick={() => setTargetMarket(market)}
                    className="text-xs px-3 py-2 rounded-lg text-left transition-all"
                    style={{
                      background: active ? "rgba(124,58,237,0.15)" : "var(--color-surface-2)",
                      border: active ? "1px solid rgba(124,58,237,0.3)" : "1px solid var(--color-border-subtle)",
                      color: active ? "#a78bfa" : "var(--color-text-2)",
                    }}
                  >
                    {market.toUpperCase()}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Source targeting */}
          <div>
            <label className="text-xs font-semibold block mb-1.5" style={{ color: "var(--color-text-muted)" }}>
              {targetMarket === "b2c" ? "B2C SOURCES" : "B2B SOURCES"}
            </label>
            <div className="flex flex-wrap gap-2">
              {targetMarket === "b2c"
                ? B2C_SOURCES.map((source) => {
                    const active = b2cSources.includes(source.id);
                    return (
                      <button
                        key={source.id}
                        onClick={() => toggleB2cSource(source.id)}
                        className="text-xs px-3 py-1.5 rounded-lg font-medium transition-all"
                        style={{
                          background: active ? "rgba(124,58,237,0.15)" : "var(--color-surface-2)",
                          border: active ? "1px solid rgba(124,58,237,0.3)" : "1px solid var(--color-border-subtle)",
                          color: active ? "#a78bfa" : "var(--color-text-muted)",
                        }}
                      >
                        {source.label}
                      </button>
                    );
                  })
                : B2B_SOURCES.map((source) => {
                    const active = b2bSources.includes(source.id);
                    return (
                      <button
                        key={source.id}
                        onClick={() => toggleB2bSource(source.id)}
                        className="text-xs px-3 py-1.5 rounded-lg font-medium transition-all"
                        style={{
                          background: active ? "rgba(124,58,237,0.15)" : "var(--color-surface-2)",
                          border: active ? "1px solid rgba(124,58,237,0.3)" : "1px solid var(--color-border-subtle)",
                          color: active ? "#a78bfa" : "var(--color-text-muted)",
                        }}
                      >
                        {source.label}
                      </button>
                    );
                  })}
            </div>
          </div>

          {/* Industry */}
          <div>
            <label className="text-xs font-semibold block mb-2" style={{ color: "var(--color-text-muted)" }}>TARGET INDUSTRY</label>
            <div className="grid grid-cols-2 gap-1.5">
              {INDUSTRIES.map((ind) => (
                <button
                  key={ind}
                  onClick={() => setIndustry(industry === ind ? "" : ind)}
                  className="text-xs px-2.5 py-1.5 rounded-lg text-left transition-all"
                  style={{
                    background: industry === ind ? "rgba(124,58,237,0.15)" : "var(--color-surface-2)",
                    border: industry === ind ? "1px solid rgba(124,58,237,0.3)" : "1px solid var(--color-border-subtle)",
                    color: industry === ind ? "#a78bfa" : "var(--color-text-2)",
                  }}
                >
                  {ind}
                </button>
              ))}
            </div>
          </div>

          {/* Location */}
          <div>
            <label className="text-xs font-semibold block mb-1.5" style={{ color: "var(--color-text-muted)" }}>LOCATION</label>
            <input
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              placeholder="e.g. New York, NY  or  United States"
              className="w-full px-3 py-2.5 rounded-xl text-sm outline-none"
              style={{ background: "var(--color-surface-2)", border: "1px solid var(--color-border-subtle)", color: "var(--color-text-1)" }}
              onFocus={(e) => { (e.currentTarget as HTMLElement).style.borderColor = "rgba(124,58,237,0.4)"; }}
              onBlur={(e) => { (e.currentTarget as HTMLElement).style.borderColor = "var(--color-border-subtle)"; }}
            />
          </div>

          {/* Platforms */}
          <div>
            <label className="text-xs font-semibold block mb-1.5" style={{ color: "var(--color-text-muted)" }}>PLATFORMS TO SEARCH</label>
            <div className="flex flex-wrap gap-2">
              {PLATFORMS.map((p) => {
                const color = PLATFORM_COLORS[p];
                const active = platforms.includes(p);
                return (
                  <button
                    key={p}
                    onClick={() => togglePlatform(p)}
                    className="text-xs px-3 py-1.5 rounded-lg font-medium transition-all"
                    style={{
                      background: active ? `${color}18` : "var(--color-surface-2)",
                      border: active ? `1px solid ${color}40` : "1px solid var(--color-border-subtle)",
                      color: active ? color : "var(--color-text-muted)",
                    }}
                  >
                    {p.charAt(0).toUpperCase() + p.slice(1)}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Keywords */}
          <div>
            <label className="text-xs font-semibold block mb-1.5" style={{ color: "var(--color-text-muted)" }}>KEYWORDS (comma-separated)</label>
            <input
              value={keywords}
              onChange={(e) => setKeywords(e.target.value)}
              placeholder="e.g. growth marketing, content strategy, paid ads"
              className="w-full px-3 py-2.5 rounded-xl text-sm outline-none"
              style={{ background: "var(--color-surface-2)", border: "1px solid var(--color-border-subtle)", color: "var(--color-text-1)" }}
              onFocus={(e) => { (e.currentTarget as HTMLElement).style.borderColor = "rgba(124,58,237,0.4)"; }}
              onBlur={(e) => { (e.currentTarget as HTMLElement).style.borderColor = "var(--color-border-subtle)"; }}
            />
          </div>

          {/* Min Score */}
          <div>
            <label className="text-xs font-semibold block mb-1.5" style={{ color: "var(--color-text-muted)" }}>
              MINIMUM LEAD SCORE: <span style={{ color: "#a78bfa" }}>{minScore}</span>
            </label>
            <input
              type="range"
              min={0}
              max={100}
              step={5}
              value={minScore}
              onChange={(e) => setMinScore(Number(e.target.value))}
              className="w-full"
              style={{ accentColor: "#7c3aed" }}
            />
            <div className="flex justify-between text-[10px] mt-1" style={{ color: "var(--color-text-muted)" }}>
              <span>0 (all)</span><span>50 (mid)</span><span>100 (perfect)</span>
            </div>
          </div>

          {/* Save config */}
          <div>
            <label className="text-xs font-semibold block mb-1.5" style={{ color: "var(--color-text-muted)" }}>SAVE THIS SEARCH (optional)</label>
            <input
              value={saveName}
              onChange={(e) => setSaveName(e.target.value)}
              placeholder="e.g. NY Marketing Agencies"
              className="w-full px-3 py-2.5 rounded-xl text-sm outline-none"
              style={{ background: "var(--color-surface-2)", border: "1px solid var(--color-border-subtle)", color: "var(--color-text-1)" }}
            />
          </div>

          {error && (
            <div className="px-3 py-2 rounded-xl text-xs" style={{ background: "rgba(248,113,113,0.1)", color: "#f87171", border: "1px solid rgba(248,113,113,0.2)" }}>
              {error}
            </div>
          )}

          <div className="flex gap-3 pt-1">
            <button
              onClick={onClose}
              className="flex-1 py-2.5 rounded-xl text-sm font-medium transition-all"
              style={{ background: "var(--color-surface-2)", border: "1px solid var(--color-border)", color: "var(--color-text-2)" }}
            >
              Cancel
            </button>
            <button
              onClick={handleLaunch}
              disabled={discover.isPending}
              className="flex-1 py-2.5 rounded-xl text-sm font-semibold transition-all"
              style={{ background: "linear-gradient(135deg, #7c3aed 0%, #4f46e5 100%)", color: "white", boxShadow: "0 4px 12px rgba(124,58,237,0.3)", opacity: discover.isPending ? 0.7 : 1 }}
            >
              {discover.isPending ? "Launching..." : "Launch Discovery"}
            </button>
          </div>
        </div>
      </div>
    </>
  );
}

// ─── Add Lead Modal ───────────────────────────────────────────────────────────
function AddLeadModal({ onClose }: { onClose: () => void }) {
  const [form, setForm] = useState({ name: "", company: "", email: "", phone: "", platform: "manual" as string, industry: "", location: "", notes: "" });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name.trim()) { setError("Name is required"); return; }
    setSaving(true);
    setError("");
    try {
      const res = await fetch("/api/leads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, platform: form.platform as "manual" }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error ?? "Failed to add lead");
      }
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed");
    } finally {
      setSaving(false);
    }
  }

  const field = (key: keyof typeof form, label: string, placeholder: string, type = "text") => (
    <div>
      <label className="text-xs font-medium block mb-1" style={{ color: "var(--color-text-muted)" }}>{label}</label>
      <input
        type={type}
        value={form[key]}
        onChange={(e) => setForm((f) => ({ ...f, [key]: e.target.value }))}
        placeholder={placeholder}
        className="w-full px-3 py-2.5 rounded-xl text-sm outline-none"
        style={{ background: "var(--color-surface-2)", border: "1px solid var(--color-border-subtle)", color: "var(--color-text-1)" }}
        onFocus={(e) => { (e.currentTarget as HTMLElement).style.borderColor = "rgba(124,58,237,0.4)"; }}
        onBlur={(e) => { (e.currentTarget as HTMLElement).style.borderColor = "var(--color-border-subtle)"; }}
      />
    </div>
  );

  return (
    <>
      <div className="fixed inset-0 z-40" style={{ background: "rgba(0,0,0,0.6)" }} onClick={onClose} />
      <div className="fixed left-1/2 top-1/2 z-50 w-full max-w-md max-h-[90dvh] overflow-y-auto" style={{ transform: "translate(-50%, -50%)", background: "var(--color-surface)", border: "1px solid var(--color-border)", borderRadius: 20, boxShadow: "0 24px 80px rgba(0,0,0,0.5)" }}>
        <div className="px-6 py-5" style={{ borderBottom: "1px solid var(--color-border-subtle)" }}>
          <h2 className="text-base font-bold" style={{ fontFamily: "var(--font-syne)", color: "var(--color-text-1)" }}>Add Lead Manually</h2>
        </div>
        <form onSubmit={handleSubmit} className="px-6 py-5 space-y-3">
          {field("name", "Name *", "Full name")}
          <div className="grid grid-cols-2 gap-3">
            {field("company", "Company", "Company name")}
            {field("email", "Email", "email@example.com", "email")}
          </div>
          <div className="grid grid-cols-2 gap-3">
            {field("phone", "Phone", "+1 555 000 0000")}
            <div>
              <label className="text-xs font-medium block mb-1" style={{ color: "var(--color-text-muted)" }}>Platform</label>
              <select
                value={form.platform}
                onChange={(e) => setForm((f) => ({ ...f, platform: e.target.value }))}
                className="w-full px-3 py-2.5 rounded-xl text-sm outline-none"
                style={{ background: "var(--color-surface-2)", border: "1px solid var(--color-border-subtle)", color: "var(--color-text-1)" }}
              >
                {["manual","instagram","linkedin","tiktok","twitter","facebook","google"].map((p) => (
                  <option key={p} value={p}>{p.charAt(0).toUpperCase() + p.slice(1)}</option>
                ))}
              </select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            {field("industry", "Industry", "Marketing Agency")}
            {field("location", "Location", "City, State")}
          </div>
          <div>
            <label className="text-xs font-medium block mb-1" style={{ color: "var(--color-text-muted)" }}>Notes</label>
            <textarea
              value={form.notes}
              onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
              rows={2}
              placeholder="Initial notes about this lead..."
              className="w-full px-3 py-2 rounded-xl text-sm outline-none resize-none"
              style={{ background: "var(--color-surface-2)", border: "1px solid var(--color-border-subtle)", color: "var(--color-text-1)" }}
            />
          </div>
          {error && <div className="text-xs px-3 py-2 rounded-xl" style={{ background: "rgba(248,113,113,0.1)", color: "#f87171" }}>{error}</div>}
          <div className="flex gap-3 pt-1">
            <button type="button" onClick={onClose} className="flex-1 py-2.5 rounded-xl text-sm font-medium" style={{ background: "var(--color-surface-2)", border: "1px solid var(--color-border)", color: "var(--color-text-2)" }}>Cancel</button>
            <button type="submit" disabled={saving} className="flex-1 py-2.5 rounded-xl text-sm font-semibold" style={{ background: "linear-gradient(135deg, #7c3aed 0%, #4f46e5 100%)", color: "white" }}>
              {saving ? "Adding..." : "Add Lead"}
            </button>
          </div>
        </form>
      </div>
    </>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function LeadsPage() {
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState("all");
  const [platformFilter, setPlatformFilter] = useState("");
  const [search, setSearch] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [sort, setSort] = useState<{ by: string; dir: "asc" | "desc" }>({ by: "score", dir: "desc" });
  const [selectedLeadId, setSelectedLeadId] = useState<string | null>(null);
  const [showDiscovery, setShowDiscovery] = useState(false);
  const [showAddLead, setShowAddLead] = useState(false);
  const [activeRunId, setActiveRunId] = useState<string | null>(null);
  const [view, setView] = useState<"table" | "kanban">("table");

  const { data, isLoading, isFetching } = useLeads({
    page,
    per_page: 25,
    status: statusFilter === "all" ? undefined : statusFilter,
    platform: platformFilter || undefined,
    search: search || undefined,
    sort: sort.by,
    dir: sort.dir,
  });

  const updateLead = useUpdateLead();
  const deleteLead = useDeleteLead();

  const leads = data?.data ?? [];
  const total = data?.total ?? 0;
  const totalPages = Math.ceil(total / 25);

  function handleSearchSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSearch(searchInput);
    setPage(1);
  }

  function handleSort(by: string) {
    setSort((s) => s.by === by ? { by, dir: s.dir === "asc" ? "desc" : "asc" } : { by, dir: "desc" });
  }

  function exportCsv() {
    if (!leads.length) return;
    const headers = ["Name","Company","Email","Platform","Score","Status","Industry","Location","Last Activity"];
    const rows = leads.map((l) => [
      l.name, l.company ?? "", l.email ?? "", l.platform ?? "", l.score, l.status,
      l.industry ?? "", l.location ?? "", l.last_activity ? relativeTime(l.last_activity) : "",
    ]);
    const csv = [headers, ...rows].map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = "leads.csv"; a.click();
    URL.revokeObjectURL(url);
  }

  // Kanban groups
  const kanbanGroups: { status: LeadStatus; leads: Lead[] }[] = (["new","contacted","qualified","converted","lost"] as LeadStatus[]).map((status) => ({
    status,
    leads: leads.filter((l) => l.status === status),
  }));

  const STAT_GROUPS = [
    { label: "Total Leads", value: total, color: "#7c3aed" },
    { label: "Qualified", value: leads.filter((l) => l.status === "qualified").length, color: "#34d399" },
    { label: "Avg Score", value: leads.length ? Math.round(leads.reduce((s, l) => s + l.score, 0) / leads.length) : 0, color: "#0891b2" },
    { label: "Converted", value: leads.filter((l) => l.status === "converted").length, color: "#fbbf24" },
  ];

  return (
    <div className="p-5 sm:p-8 max-w-[1500px] mx-auto space-y-6">

      {/* Discovery running banner */}
      {activeRunId && (
        <div className="rounded-2xl px-5 py-4 flex items-center gap-4 animate-fade-up" style={{ background: "rgba(124,58,237,0.08)", border: "1px solid rgba(124,58,237,0.2)" }}>
          <div className="w-5 h-5 rounded-full border-2 border-t-transparent animate-spin flex-shrink-0" style={{ borderColor: "#7c3aed", borderTopColor: "transparent" }} />
          <div className="flex-1">
            <div className="text-sm font-semibold" style={{ color: "var(--color-text-1)" }}>Lead discovery in progress</div>
            <div className="text-xs" style={{ color: "var(--color-text-muted)" }}>AI is searching, enriching, and scoring prospects. New leads will appear automatically.</div>
          </div>
          <button onClick={() => setActiveRunId(null)} className="text-xs px-3 py-1.5 rounded-lg" style={{ color: "var(--color-text-muted)", background: "var(--color-surface)" }}>Dismiss</button>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 animate-fade-up">
        <div>
          <p className="text-sm mb-1" style={{ color: "var(--color-text-2)" }}>Discover & manage</p>
          <h1 className="text-2xl sm:text-3xl font-bold" style={{ fontFamily: "var(--font-syne)", color: "var(--color-text-1)" }}>
            Lead Discovery
          </h1>
        </div>
        <div className="flex gap-2 flex-wrap">
          <button
            onClick={exportCsv}
            className="px-4 py-2.5 rounded-xl text-sm font-medium transition-all flex items-center gap-2"
            style={{ background: "var(--color-surface)", border: "1px solid var(--color-border)", color: "var(--color-text-2)" }}
          >
            <svg width="13" height="13" viewBox="0 0 13 13" fill="none"><path d="M6.5 1v7M3.5 5.5l3 3 3-3M1.5 9v1.5a1 1 0 0 0 1 1h8a1 1 0 0 0 1-1V9" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"/></svg>
            Export CSV
          </button>
          <button
            onClick={() => setShowAddLead(true)}
            className="px-4 py-2.5 rounded-xl text-sm font-medium transition-all flex items-center gap-2"
            style={{ background: "var(--color-surface)", border: "1px solid var(--color-border)", color: "var(--color-text-2)" }}
          >
            <svg width="13" height="13" viewBox="0 0 13 13" fill="none"><path d="M6.5 1v11M1 6.5h11" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg>
            Add Manually
          </button>
          <button
            onClick={() => setShowDiscovery(true)}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold transition-all"
            style={{ background: "linear-gradient(135deg, #7c3aed 0%, #4f46e5 100%)", color: "white", boxShadow: "0 4px 12px rgba(124,58,237,0.3)" }}
          >
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><circle cx="6" cy="6" r="4" stroke="currentColor" strokeWidth="1.5"/><path d="M9 9l3 3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg>
            Run Discovery
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
        {STAT_GROUPS.map((s, i) => (
          <div
            key={s.label}
            className="rounded-2xl p-5 animate-fade-up relative overflow-hidden transition-all duration-300"
            style={{ background: "var(--color-surface)", border: "1px solid var(--color-border)", animationDelay: `${i * 0.07}s` }}
            onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.border = `1px solid ${s.color}33`; (e.currentTarget as HTMLElement).style.boxShadow = `0 8px 24px ${s.color}15`; }}
            onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.border = "1px solid var(--color-border)"; (e.currentTarget as HTMLElement).style.boxShadow = "none"; }}
          >
            <div className="absolute top-0 right-0 w-24 h-24 rounded-full pointer-events-none opacity-30" style={{ background: `radial-gradient(circle, ${s.color}25 0%, transparent 70%)`, transform: "translate(25%,-25%)" }} />
            <div className="text-2xl font-bold mb-1" style={{ fontFamily: "var(--font-syne)", color: "var(--color-text-1)" }}>
              {isLoading ? "—" : s.value}
            </div>
            <div className="text-xs" style={{ color: "var(--color-text-muted)" }}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* Controls: search + filters + view toggle */}
      <div className="flex flex-col sm:flex-row gap-3 animate-fade-up" style={{ animationDelay: "0.15s" }}>
        <form onSubmit={handleSearchSubmit} className="flex-1 relative">
          <input
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            placeholder="Search name, company, email..."
            className="w-full pl-9 pr-4 py-2.5 rounded-xl text-sm outline-none transition-all"
            style={{ background: "var(--color-surface)", border: "1px solid var(--color-border)", color: "var(--color-text-1)" }}
            onFocus={(e) => { (e.currentTarget as HTMLElement).style.borderColor = "rgba(124,58,237,0.4)"; }}
            onBlur={(e) => { (e.currentTarget as HTMLElement).style.borderColor = "var(--color-border)"; }}
          />
          <svg className="absolute left-3 top-1/2 -translate-y-1/2" width="14" height="14" viewBox="0 0 14 14" fill="none" style={{ color: "var(--color-text-muted)" }}>
            <circle cx="6" cy="6" r="4" stroke="currentColor" strokeWidth="1.4"/>
            <path d="M9 9l3 3" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>
          </svg>
        </form>

        {/* Status filters */}
        <div className="flex gap-1.5 flex-wrap">
          {["all","new","contacted","qualified","converted","lost"].map((f) => (
            <button
              key={f}
              onClick={() => { setStatusFilter(f); setPage(1); }}
              className="px-3 py-2 rounded-xl text-xs font-medium transition-all capitalize"
              style={{
                background: statusFilter === f ? "rgba(124,58,237,0.15)" : "var(--color-surface)",
                border: statusFilter === f ? "1px solid rgba(124,58,237,0.3)" : "1px solid var(--color-border)",
                color: statusFilter === f ? "#a78bfa" : "var(--color-text-2)",
              }}
            >
              {f === "all" ? "All" : STATUS_MAP[f as LeadStatus]?.label ?? f}
            </button>
          ))}
        </div>

        {/* View toggle */}
        <div className="flex rounded-xl overflow-hidden" style={{ border: "1px solid var(--color-border)" }}>
          {(["table","kanban"] as const).map((v) => (
            <button
              key={v}
              onClick={() => setView(v)}
              className="px-3 py-2 text-xs font-medium transition-all capitalize"
              style={{
                background: view === v ? "rgba(124,58,237,0.15)" : "var(--color-surface)",
                color: view === v ? "#a78bfa" : "var(--color-text-2)",
              }}
            >
              {v}
            </button>
          ))}
        </div>
      </div>

      {/* Table View */}
      {view === "table" && (
        <div className="rounded-2xl overflow-hidden animate-fade-up" style={{ background: "var(--color-surface)", border: "1px solid var(--color-border)", animationDelay: "0.2s" }}>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr style={{ borderBottom: "1px solid var(--color-border-subtle)" }}>
                  {[
                    { key: "name", label: "Name" },
                    { key: "company", label: "Company" },
                    { key: "platform", label: "Platform" },
                    { key: "score", label: "Score" },
                    { key: "status", label: "Status" },
                    { key: "industry", label: "Industry" },
                    { key: "last_activity", label: "Last Activity" },
                    { key: "_actions", label: "" },
                  ].map(({ key, label }) => (
                    <th
                      key={key}
                      className={`text-left px-5 py-3.5 text-xs font-semibold ${key !== "_actions" ? "cursor-pointer select-none" : ""}`}
                      style={{ color: sort.by === key ? "#a78bfa" : "var(--color-text-muted)" }}
                      onClick={() => key !== "_actions" && handleSort(key)}
                    >
                      {label}
                      {sort.by === key && (
                        <span className="ml-1">{sort.dir === "asc" ? "↑" : "↓"}</span>
                      )}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {isLoading ? (
                  Array.from({ length: 8 }).map((_, i) => (
                    <tr key={i} style={{ borderBottom: "1px solid var(--color-border-subtle)" }}>
                      {Array.from({ length: 8 }).map((__, j) => (
                        <td key={j} className="px-5 py-3.5">
                          <div className="h-4 rounded" style={{ background: "var(--color-surface-2)", width: j === 0 ? 120 : j === 1 ? 100 : 60 }} />
                        </td>
                      ))}
                    </tr>
                  ))
                ) : leads.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="px-5 py-12 text-center text-sm" style={{ color: "var(--color-text-muted)" }}>
                      {search ? "No leads match your search." : "No leads yet. Run discovery to find prospects."}
                    </td>
                  </tr>
                ) : (
                  leads.map((lead) => {
                    const sc = scoreColor(lead.score);
                    const st = STATUS_MAP[lead.status];
                    const pc = lead.platform ? PLATFORM_COLORS[lead.platform] : "#6b7280";
                    return (
                      <tr
                        key={lead.id}
                        className="transition-colors cursor-pointer"
                        style={{ borderBottom: "1px solid var(--color-border-subtle)" }}
                        onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = "var(--color-surface-2)"; }}
                        onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = "transparent"; }}
                        onClick={() => setSelectedLeadId(lead.id)}
                      >
                        <td className="px-5 py-3.5 font-medium" style={{ color: "var(--color-text-1)" }}>{lead.name}</td>
                        <td className="px-5 py-3.5" style={{ color: "var(--color-text-2)" }}>{lead.company ?? "—"}</td>
                        <td className="px-5 py-3.5">
                          {lead.platform ? (
                            <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-md" style={{ background: `${pc}18`, color: pc }}>
                              {lead.platform.toUpperCase()}
                            </span>
                          ) : "—"}
                        </td>
                        <td className="px-5 py-3.5"><ScoreBar score={lead.score} /></td>
                        <td className="px-5 py-3.5">
                          <span className="text-xs font-semibold px-2.5 py-1 rounded-lg" style={{ background: st.bg, color: st.color }}>{st.label}</span>
                        </td>
                        <td className="px-5 py-3.5 text-xs" style={{ color: "var(--color-text-2)" }}>{lead.industry ?? "—"}</td>
                        <td className="px-5 py-3.5 text-xs" style={{ color: "var(--color-text-muted)" }}>
                          {lead.last_activity ? relativeTime(lead.last_activity) : "—"}
                        </td>
                        <td className="px-5 py-3.5" onClick={(e) => e.stopPropagation()}>
                          <button
                            onClick={(e) => { e.stopPropagation(); if (confirm("Delete this lead?")) deleteLead.mutate(lead.id); }}
                            className="p-1.5 rounded-lg opacity-0 group-hover:opacity-100 transition-all"
                            style={{ color: "var(--color-text-muted)" }}
                            onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.color = "#f87171"; (e.currentTarget as HTMLElement).style.opacity = "1"; }}
                            onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.color = "var(--color-text-muted)"; }}
                          >
                            <svg width="13" height="13" viewBox="0 0 13 13" fill="none"><path d="M2 3h9M5 3V2h3v1M10 3l-.5 8H3.5L3 3" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"/></svg>
                          </button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between px-5 py-3" style={{ borderTop: "1px solid var(--color-border-subtle)" }}>
              <span className="text-xs" style={{ color: "var(--color-text-muted)" }}>
                {(page - 1) * 25 + 1}–{Math.min(page * 25, total)} of {total}
              </span>
              <div className="flex gap-2">
                <button disabled={page <= 1} onClick={() => setPage((p) => p - 1)} className="px-3 py-1.5 rounded-lg text-xs font-medium transition-all" style={{ background: "var(--color-surface-2)", color: "var(--color-text-2)", border: "1px solid var(--color-border-subtle)", opacity: page <= 1 ? 0.4 : 1 }}>Previous</button>
                <button disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)} className="px-3 py-1.5 rounded-lg text-xs font-medium transition-all" style={{ background: "var(--color-surface-2)", color: "var(--color-text-2)", border: "1px solid var(--color-border-subtle)", opacity: page >= totalPages ? 0.4 : 1 }}>Next</button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Kanban View */}
      {view === "kanban" && (
        <div className="grid grid-cols-1 sm:grid-cols-3 lg:grid-cols-5 gap-4 animate-fade-up" style={{ animationDelay: "0.2s" }}>
          {kanbanGroups.map(({ status, leads: groupLeads }) => {
            const style = STATUS_MAP[status];
            return (
              <div key={status} className="rounded-2xl overflow-hidden" style={{ background: "var(--color-surface)", border: "1px solid var(--color-border)" }}>
                <div className="px-4 py-3 flex items-center justify-between" style={{ borderBottom: "1px solid var(--color-border-subtle)" }}>
                  <span className="text-xs font-semibold" style={{ color: style.color }}>{style.label}</span>
                  <span className="text-xs font-bold px-1.5 py-0.5 rounded-md" style={{ background: style.bg, color: style.color }}>{groupLeads.length}</span>
                </div>
                <div className="p-2 space-y-2 min-h-24">
                  {isLoading ? (
                    <div className="h-16 rounded-xl" style={{ background: "var(--color-surface-2)" }} />
                  ) : groupLeads.length === 0 ? (
                    <div className="text-center py-6 text-xs" style={{ color: "var(--color-text-muted)" }}>Empty</div>
                  ) : (
                    groupLeads.map((lead) => {
                      const sc = scoreColor(lead.score);
                      return (
                        <div
                          key={lead.id}
                          onClick={() => setSelectedLeadId(lead.id)}
                          className="rounded-xl p-3 cursor-pointer transition-all"
                          style={{ background: "var(--color-surface-2)", border: "1px solid var(--color-border-subtle)" }}
                          onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.border = `1px solid ${style.color}40`; }}
                          onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.border = "1px solid var(--color-border-subtle)"; }}
                        >
                          <div className="text-xs font-medium mb-0.5" style={{ color: "var(--color-text-1)" }}>{lead.name}</div>
                          {lead.company && <div className="text-[10px] mb-2" style={{ color: "var(--color-text-muted)" }}>{lead.company}</div>}
                          <div className="flex items-center justify-between">
                            <PlatformBadge platform={lead.platform} />
                            <span className="text-[10px] font-bold" style={{ color: sc.color }}>{lead.score}</span>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modals */}
      {showDiscovery && (
        <DiscoveryModal
          onClose={() => setShowDiscovery(false)}
          onLaunched={(runId) => setActiveRunId(runId)}
        />
      )}
      {showAddLead && <AddLeadModal onClose={() => setShowAddLead(false)} />}
      {selectedLeadId && <LeadDrawer leadId={selectedLeadId} onClose={() => setSelectedLeadId(null)} />}
    </div>
  );
}
