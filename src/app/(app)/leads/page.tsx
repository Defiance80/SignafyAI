"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import { useQueryClient } from "@tanstack/react-query";
import {
  useLeads, useUpdateLead, useDeleteLead, useDiscoverLeads, useLeadDetail,
  useBusinesses, useIntentSignals, useGeneratedAssets,
} from "@/hooks/use-leads";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import { scoreColor, relativeTime } from "@/lib/utils";
import type { Lead, LeadStatus, Business, IntentSignal, GeneratedAsset } from "@/lib/supabase/types";

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

const URGENCY_COLORS: Record<string, { color: string; bg: string }> = {
  High:   { color: "#f87171", bg: "rgba(248,113,113,0.12)" },
  Medium: { color: "#fbbf24", bg: "rgba(251,191,36,0.12)" },
  Low:    { color: "#34d399", bg: "rgba(52,211,153,0.12)" },
};
const STAGE_COLORS: Record<string, string> = {
  "Research":        "#60a5fa",
  "Comparison":      "#a78bfa",
  "Vendor Selection":"#fbbf24",
  "Ready To Buy":    "#34d399",
};

// ─── Shared sub-components ────────────────────────────────────────────────────

function ScoreBar({ score, color: forceColor }: { score: number; color?: string }) {
  const { color, bg } = scoreColor(score);
  const c = forceColor ?? color;
  return (
    <div className="flex items-center gap-2">
      <div className="w-16 h-1.5 rounded-full overflow-hidden" style={{ background: "var(--color-surface-2)" }}>
        <div className="h-full rounded-full transition-all" style={{ width: `${score}%`, background: c }} />
      </div>
      <span className="text-xs font-semibold tabular-nums" style={{ color: c }}>{score}</span>
    </div>
  );
}

function PlatformBadge({ platform }: { platform: string | null }) {
  if (!platform) return null;
  const color = PLATFORM_COLORS[platform] ?? "#6b7280";
  return (
    <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-md" style={{ background: `${color}18`, color }}>
      {PLATFORM_ICONS[platform] ?? platform.toUpperCase()}
    </span>
  );
}

function EmptyState({ icon, title, desc }: { icon: string; title: string; desc: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-20 gap-3">
      <div className="text-4xl">{icon}</div>
      <div className="text-base font-semibold" style={{ color: "var(--color-text-1)" }}>{title}</div>
      <div className="text-sm text-center max-w-xs" style={{ color: "var(--color-text-muted)" }}>{desc}</div>
    </div>
  );
}

function SearchBar({ value, onChange, placeholder }: { value: string; onChange: (v: string) => void; placeholder?: string }) {
  return (
    <div className="relative flex-1">
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder ?? "Search..."}
        className="w-full pl-9 pr-4 py-2.5 rounded-xl text-sm outline-none transition-all"
        style={{ background: "var(--color-surface)", border: "1px solid var(--color-border)", color: "var(--color-text-1)" }}
        onFocus={(e) => { (e.currentTarget).style.borderColor = "rgba(124,58,237,0.4)"; }}
        onBlur={(e) => { (e.currentTarget).style.borderColor = "var(--color-border)"; }}
      />
      <svg className="absolute left-3 top-1/2 -translate-y-1/2" width="14" height="14" viewBox="0 0 14 14" fill="none" style={{ color: "var(--color-text-muted)" }}>
        <circle cx="6" cy="6" r="4" stroke="currentColor" strokeWidth="1.4" />
        <path d="M9 9l3 3" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
      </svg>
    </div>
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
      <div className="fixed inset-0 z-40" style={{ background: "rgba(0,0,0,0.5)" }} onClick={onClose} />
      <div className="fixed right-0 top-0 bottom-0 z-50 flex flex-col overflow-hidden"
        style={{ width: "min(520px, 100vw)", background: "var(--color-surface)", borderLeft: "1px solid var(--color-border)", boxShadow: "-16px 0 64px rgba(0,0,0,0.4)" }}>
        <div className="flex items-center gap-3 px-6 py-5" style={{ borderBottom: "1px solid var(--color-border-subtle)" }}>
          <button onClick={onClose} className="p-1.5 rounded-lg" style={{ color: "var(--color-text-muted)" }}>
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M4 4l8 8M12 4l-8 8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" /></svg>
          </button>
          <div className="flex-1">
            {isLoading ? <div className="h-5 w-40 rounded" style={{ background: "var(--color-surface-2)" }} /> :
              <h2 className="text-base font-bold" style={{ fontFamily: "var(--font-syne)", color: "var(--color-text-1)" }}>{lead?.name}</h2>}
          </div>
        </div>
        {isLoading ? (
          <div className="flex-1 flex items-center justify-center" style={{ color: "var(--color-text-muted)" }}>Loading lead...</div>
        ) : !lead ? (
          <div className="flex-1 flex items-center justify-center" style={{ color: "var(--color-text-muted)" }}>Lead not found</div>
        ) : (
          <div className="flex-1 overflow-y-auto">
            <div className="px-6 py-5 space-y-4" style={{ borderBottom: "1px solid var(--color-border-subtle)" }}>
              <div className="flex items-center gap-3 flex-wrap">
                <ScoreBar score={lead.score} />
                <div className="flex gap-2 flex-wrap">
                  {(Object.keys(STATUS_MAP) as LeadStatus[]).map((s) => {
                    const style = STATUS_MAP[s];
                    const isActive = lead.status === s;
                    return (
                      <button key={s} onClick={() => handleStatusChange(s)}
                        className="text-xs font-semibold px-2.5 py-1 rounded-lg transition-all"
                        style={{ background: isActive ? style.bg : "var(--color-surface-2)", color: isActive ? style.color : "var(--color-text-muted)", border: isActive ? `1px solid ${style.color}40` : "1px solid var(--color-border-subtle)", opacity: updateLead.isPending ? 0.6 : 1 }}>
                        {style.label}
                      </button>
                    );
                  })}
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                {lead.company && <div><div className="text-xs mb-0.5" style={{ color: "var(--color-text-muted)" }}>Company</div><div className="text-sm font-medium" style={{ color: "var(--color-text-1)" }}>{lead.company}</div></div>}
                {lead.email && <div><div className="text-xs mb-0.5" style={{ color: "var(--color-text-muted)" }}>Email</div><a href={`mailto:${lead.email}`} className="text-sm font-medium" style={{ color: "#a78bfa" }}>{lead.email}</a></div>}
                {lead.phone && <div><div className="text-xs mb-0.5" style={{ color: "var(--color-text-muted)" }}>Phone</div><div className="text-sm" style={{ color: "var(--color-text-2)" }}>{lead.phone}</div></div>}
                {lead.platform && <div><div className="text-xs mb-0.5" style={{ color: "var(--color-text-muted)" }}>Platform</div><PlatformBadge platform={lead.platform} /></div>}
                {lead.industry && <div><div className="text-xs mb-0.5" style={{ color: "var(--color-text-muted)" }}>Industry</div><div className="text-sm" style={{ color: "var(--color-text-2)" }}>{lead.industry}</div></div>}
                {lead.location && <div><div className="text-xs mb-0.5" style={{ color: "var(--color-text-muted)" }}>Location</div><div className="text-sm" style={{ color: "var(--color-text-2)" }}>{lead.location}</div></div>}
              </div>
              {lead.tags && lead.tags.length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                  {lead.tags.map((tag) => <span key={tag} className="text-xs px-2 py-0.5 rounded-md" style={{ background: "rgba(124,58,237,0.1)", color: "#a78bfa", border: "1px solid rgba(124,58,237,0.2)" }}>{tag}</span>)}
                </div>
              )}
            </div>
            {lead.notes && (
              <div className="px-6 py-4" style={{ borderBottom: "1px solid var(--color-border-subtle)" }}>
                <div className="text-xs font-semibold mb-2" style={{ color: "var(--color-text-muted)" }}>NOTES</div>
                <p className="text-sm leading-relaxed" style={{ color: "var(--color-text-2)" }}>{lead.notes}</p>
              </div>
            )}
            <div className="px-6 py-4" style={{ borderBottom: "1px solid var(--color-border-subtle)" }}>
              <div className="text-xs font-semibold mb-2" style={{ color: "var(--color-text-muted)" }}>ADD NOTE</div>
              <textarea value={note} onChange={(e) => setNote(e.target.value)} rows={3} placeholder="Add a note..." className="w-full px-3 py-2 rounded-xl text-sm outline-none resize-none" style={{ background: "var(--color-surface-2)", border: "1px solid var(--color-border-subtle)", color: "var(--color-text-1)" }} />
              <button onClick={handleSaveNote} disabled={!note.trim() || savingNote} className="mt-2 px-4 py-1.5 rounded-lg text-xs font-semibold" style={{ background: note.trim() ? "rgba(124,58,237,0.15)" : "var(--color-surface-2)", color: note.trim() ? "#a78bfa" : "var(--color-text-muted)", border: `1px solid ${note.trim() ? "rgba(124,58,237,0.3)" : "var(--color-border-subtle)"}` }}>
                {savingNote ? "Saving..." : "Save Note"}
              </button>
            </div>
            <div className="px-6 py-4">
              <div className="text-xs font-semibold mb-3" style={{ color: "var(--color-text-muted)" }}>ACTIVITY TIMELINE</div>
              {activities.length === 0 ? (
                <p className="text-sm" style={{ color: "var(--color-text-muted)" }}>No activity recorded yet.</p>
              ) : (
                <div className="space-y-3 relative">
                  <div className="absolute left-2.5 top-2 bottom-2 w-px" style={{ background: "var(--color-border-subtle)" }} />
                  {(activities as Array<{ id: string; type: string; description: string; created_at: string }>).map((act) => (
                    <div key={act.id} className="flex gap-3 relative pl-7">
                      <div className="absolute left-0 top-1.5 w-5 h-5 rounded-full flex items-center justify-center" style={{ background: "var(--color-surface-2)", border: "1px solid var(--color-border)" }}>
                        <div className="w-1.5 h-1.5 rounded-full" style={{ background: "#7c3aed" }} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-xs font-medium" style={{ color: "var(--color-text-1)" }}>{act.type.replace(/_/g, " ")}</div>
                        {act.description && <div className="text-xs mt-0.5" style={{ color: "var(--color-text-muted)" }}>{act.description}</div>}
                        <div className="text-[10px] mt-1" style={{ color: "var(--color-text-muted)" }}>{relativeTime(act.created_at)}</div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
            {lead.enrichment_data && Object.keys(lead.enrichment_data).length > 0 && (
              <div className="px-6 py-4 mb-4">
                <div className="text-xs font-semibold mb-2" style={{ color: "var(--color-text-muted)" }}>ENRICHMENT DATA</div>
                <pre className="text-xs rounded-xl p-3 overflow-x-auto" style={{ background: "var(--color-surface-2)", color: "var(--color-text-2)", border: "1px solid var(--color-border-subtle)" }}>{JSON.stringify(lead.enrichment_data, null, 2)}</pre>
              </div>
            )}
          </div>
        )}
      </div>
    </>
  );
}

// ─── Business Prospect Drawer ─────────────────────────────────────────────────

function BusinessDrawer({ biz, onClose }: { biz: Business; onClose: () => void }) {
  const [copied, setCopied] = useState<string | null>(null);
  const copy = (text: string, key: string) => {
    navigator.clipboard.writeText(text).then(() => { setCopied(key); setTimeout(() => setCopied(null), 1500); });
  };
  const { color } = scoreColor(biz.opportunity_score);

  return (
    <>
      <div className="fixed inset-0 z-40" style={{ background: "rgba(0,0,0,0.5)" }} onClick={onClose} />
      <div className="fixed right-0 top-0 bottom-0 z-50 flex flex-col overflow-hidden"
        style={{ width: "min(560px, 100vw)", background: "var(--color-surface)", borderLeft: "1px solid var(--color-border)", boxShadow: "-16px 0 64px rgba(0,0,0,0.4)" }}>
        {/* Header */}
        <div className="flex items-center gap-3 px-6 py-5" style={{ borderBottom: "1px solid var(--color-border-subtle)" }}>
          <button onClick={onClose} className="p-1.5 rounded-lg" style={{ color: "var(--color-text-muted)" }}>
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M4 4l8 8M12 4l-8 8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" /></svg>
          </button>
          <div className="flex-1 min-w-0">
            <h2 className="text-base font-bold truncate" style={{ fontFamily: "var(--font-syne)", color: "var(--color-text-1)" }}>{biz.name}</h2>
            <div className="text-xs mt-0.5" style={{ color: "var(--color-text-muted)" }}>{biz.location ?? biz.industry ?? "Business"}</div>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="text-lg font-bold" style={{ color, fontFamily: "var(--font-syne)" }}>{biz.opportunity_score}</div>
            <div className="text-[10px]" style={{ color: "var(--color-text-muted)" }}>score</div>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto">
          {/* Contact info */}
          <div className="px-6 py-4 grid grid-cols-2 gap-3" style={{ borderBottom: "1px solid var(--color-border-subtle)" }}>
            {biz.website && <div><div className="text-xs mb-0.5" style={{ color: "var(--color-text-muted)" }}>Website</div><a href={biz.website} target="_blank" rel="noopener" className="text-sm font-medium" style={{ color: "#a78bfa" }}>{biz.website.replace(/^https?:\/\//, "")}</a></div>}
            {biz.phone && <div><div className="text-xs mb-0.5" style={{ color: "var(--color-text-muted)" }}>Phone</div><div className="text-sm" style={{ color: "var(--color-text-2)" }}>{biz.phone}</div></div>}
            {biz.email && <div><div className="text-xs mb-0.5" style={{ color: "var(--color-text-muted)" }}>Email</div><div className="text-sm" style={{ color: "var(--color-text-2)" }}>{biz.email}</div></div>}
            {biz.address && <div><div className="text-xs mb-0.5" style={{ color: "var(--color-text-muted)" }}>Address</div><div className="text-sm" style={{ color: "var(--color-text-2)" }}>{biz.address}</div></div>}
            {biz.rating != null && (
              <div><div className="text-xs mb-0.5" style={{ color: "var(--color-text-muted)" }}>Rating</div>
                <div className="text-sm font-medium" style={{ color: "#fbbf24" }}>★ {biz.rating} <span style={{ color: "var(--color-text-muted)", fontWeight: 400 }}>({biz.reviews} reviews)</span></div>
              </div>
            )}
          </div>

          {/* AI Intelligence */}
          {biz.weaknesses && (
            <div className="px-6 py-4" style={{ borderBottom: "1px solid var(--color-border-subtle)" }}>
              <div className="text-xs font-semibold mb-2" style={{ color: "#f87171" }}>⚠ WEAKNESSES IDENTIFIED</div>
              <p className="text-sm leading-relaxed" style={{ color: "var(--color-text-2)" }}>{biz.weaknesses}</p>
            </div>
          )}
          {biz.recommended_offer && (
            <div className="px-6 py-4" style={{ borderBottom: "1px solid var(--color-border-subtle)" }}>
              <div className="text-xs font-semibold mb-2" style={{ color: "#34d399" }}>✦ RECOMMENDED OFFER</div>
              <p className="text-sm leading-relaxed" style={{ color: "var(--color-text-2)" }}>{biz.recommended_offer}</p>
            </div>
          )}
          {biz.pitch_angle && (
            <div className="px-6 py-4" style={{ borderBottom: "1px solid var(--color-border-subtle)" }}>
              <div className="flex items-center justify-between mb-2">
                <div className="text-xs font-semibold" style={{ color: "#a78bfa" }}>💡 PITCH ANGLE</div>
                <button onClick={() => copy(biz.pitch_angle!, "pitch")} className="text-[10px] px-2 py-0.5 rounded" style={{ color: copied === "pitch" ? "#34d399" : "#a78bfa", background: "rgba(124,58,237,0.1)" }}>
                  {copied === "pitch" ? "Copied!" : "Copy"}
                </button>
              </div>
              <p className="text-sm leading-relaxed italic" style={{ color: "var(--color-text-1)" }}>&ldquo;{biz.pitch_angle}&rdquo;</p>
            </div>
          )}

          {/* Draft email */}
          {(biz.email_subject || biz.email_body) && (
            <div className="px-6 py-4" style={{ borderBottom: "1px solid var(--color-border-subtle)" }}>
              <div className="flex items-center justify-between mb-3">
                <div className="text-xs font-semibold" style={{ color: "var(--color-text-muted)" }}>✉ DRAFT OUTREACH EMAIL</div>
                {biz.email_body && (
                  <button onClick={() => copy(`Subject: ${biz.email_subject ?? ""}\n\n${biz.email_body}`, "email")} className="text-[10px] px-2 py-0.5 rounded" style={{ color: copied === "email" ? "#34d399" : "#a78bfa", background: "rgba(124,58,237,0.1)" }}>
                    {copied === "email" ? "Copied!" : "Copy Email"}
                  </button>
                )}
              </div>
              {biz.email_subject && <div className="text-xs font-semibold mb-2 px-3 py-2 rounded-lg" style={{ background: "var(--color-surface-2)", color: "var(--color-text-1)" }}>Subject: {biz.email_subject}</div>}
              {biz.email_body && <div className="text-sm leading-relaxed px-3 py-3 rounded-xl" style={{ background: "var(--color-surface-2)", color: "var(--color-text-2)", whiteSpace: "pre-wrap" }}>{biz.email_body}</div>}
            </div>
          )}

          <div className="px-6 py-4">
            <div className="text-xs" style={{ color: "var(--color-text-muted)" }}>
              Scraped {biz.scraped_at ? relativeTime(biz.scraped_at) : "recently"} · Opportunity score calculated by AI
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

// ─── Asset Drawer ─────────────────────────────────────────────────────────────

function AssetDrawer({ asset, onClose }: { asset: GeneratedAsset; onClose: () => void }) {
  const [copied, setCopied] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<string[]>(["landing_page"]);
  const copy = (text: string, key: string) => {
    navigator.clipboard.writeText(text).then(() => { setCopied(key); setTimeout(() => setCopied(null), 1500); });
  };
  const toggle = (key: string) => setExpanded((p) => p.includes(key) ? p.filter((x) => x !== key) : [...p, key]);

  const sections: { key: keyof GeneratedAsset; label: string; icon: string }[] = [
    { key: "landing_page", label: "Landing Page Headline", icon: "🏠" },
    { key: "faq", label: "FAQ Copy", icon: "❓" },
    { key: "cta", label: "Call to Action", icon: "🎯" },
    { key: "ai_script", label: "AI Setter Script", icon: "📞" },
    { key: "email_sequence", label: "Email Sequence", icon: "✉" },
    { key: "blog_outline", label: "Blog Outline", icon: "📝" },
    { key: "social_posts", label: "Social Posts", icon: "📱" },
    { key: "video_script", label: "Video Script", icon: "🎬" },
    { key: "schema_suggestion", label: "Schema Markup", icon: "🔧" },
  ];

  return (
    <>
      <div className="fixed inset-0 z-40" style={{ background: "rgba(0,0,0,0.5)" }} onClick={onClose} />
      <div className="fixed right-0 top-0 bottom-0 z-50 flex flex-col overflow-hidden"
        style={{ width: "min(640px, 100vw)", background: "var(--color-surface)", borderLeft: "1px solid var(--color-border)", boxShadow: "-16px 0 64px rgba(0,0,0,0.4)" }}>
        <div className="flex items-center gap-3 px-6 py-5" style={{ borderBottom: "1px solid var(--color-border-subtle)" }}>
          <button onClick={onClose} className="p-1.5 rounded-lg" style={{ color: "var(--color-text-muted)" }}>
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M4 4l8 8M12 4l-8 8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" /></svg>
          </button>
          <div className="flex-1">
            <h2 className="text-base font-bold" style={{ fontFamily: "var(--font-syne)", color: "var(--color-text-1)" }}>Funnel Asset Bundle</h2>
            <div className="text-xs mt-0.5" style={{ color: "var(--color-text-muted)" }}>{asset.service} · {asset.location}</div>
          </div>
        </div>
        {asset.intent_signal && (
          <div className="px-6 py-3" style={{ background: "rgba(124,58,237,0.06)", borderBottom: "1px solid var(--color-border-subtle)" }}>
            <div className="text-[10px] font-semibold mb-1" style={{ color: "var(--color-text-muted)" }}>TRIGGERED BY INTENT SIGNAL</div>
            <p className="text-xs leading-relaxed" style={{ color: "var(--color-text-2)" }}>&ldquo;{asset.intent_signal}&rdquo;</p>
          </div>
        )}
        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-2">
          {sections.map(({ key, label, icon }) => {
            const content = asset[key] as string | null;
            if (!content) return null;
            const isOpen = expanded.includes(key);
            return (
              <div key={key} className="rounded-xl overflow-hidden" style={{ border: "1px solid var(--color-border-subtle)" }}>
                <button
                  className="w-full flex items-center justify-between px-4 py-3 transition-colors"
                  style={{ background: isOpen ? "rgba(124,58,237,0.06)" : "var(--color-surface-2)" }}
                  onClick={() => toggle(key)}
                >
                  <span className="text-sm font-semibold" style={{ color: "var(--color-text-1)" }}>{icon} {label}</span>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={(e) => { e.stopPropagation(); copy(content, key); }}
                      className="text-[10px] px-2 py-0.5 rounded transition-colors"
                      style={{ color: copied === key ? "#34d399" : "#a78bfa", background: "rgba(124,58,237,0.1)" }}
                    >
                      {copied === key ? "Copied!" : "Copy"}
                    </button>
                    <svg width="12" height="12" viewBox="0 0 12 12" fill="none" style={{ color: "var(--color-text-muted)", transform: isOpen ? "rotate(180deg)" : "none", transition: "transform 0.2s" }}>
                      <path d="M2 4l4 4 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </div>
                </button>
                {isOpen && (
                  <div className="px-4 py-3" style={{ borderTop: "1px solid var(--color-border-subtle)" }}>
                    <p className="text-sm leading-relaxed" style={{ color: "var(--color-text-2)", whiteSpace: "pre-wrap" }}>{content}</p>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </>
  );
}

// ─── Discovery Modal ──────────────────────────────────────────────────────────

function DiscoveryModal({ onClose, onLaunched }: { onClose: () => void; onLaunched: (runId: string, market: string, n8nTriggered: boolean) => void }) {
  const discover = useDiscoverLeads();
  const [targetMarket, setTargetMarket] = useState<"b2b" | "b2c" | "both">("b2b");
  const [targetDescription, setTargetDescription] = useState("");
  const [location, setLocation] = useState("");
  const [clientService, setClientService] = useState("");
  const [keywords, setKeywords] = useState("");
  const [minScore, setMinScore] = useState(40);
  const [generateLandingPage, setGenerateLandingPage] = useState(false);
  const [forClient, setForClient] = useState(false);
  const [saveName, setSaveName] = useState("");
  const [error, setError] = useState("");

  async function handleLaunch() {
    setError("");
    if (!targetDescription.trim()) {
      setError("Describe who you want to target so the AI knows what to look for.");
      return;
    }
    try {
      const result = await discover.mutateAsync({
        target_market: targetMarket,
        target_description: targetDescription.trim(),
        location: location || undefined,
        client_service: clientService.trim() || undefined,
        keywords: keywords.trim() ? keywords.split(",").map((k) => k.trim()).filter(Boolean) : undefined,
        min_score: minScore,
        generate_landing_page: (targetMarket === "b2c" || targetMarket === "both") ? generateLandingPage || undefined : undefined,
        for_client: forClient || undefined,
        save_config_name: saveName.trim() || undefined,
      });
      onLaunched(result.run_id, result.target_market ?? targetMarket, result.n8n_triggered ?? false);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Discovery failed");
    }
  }

  const marketOptions = [
    { id: "b2b"  as const, label: "B2B Prospects", emoji: "🏢", desc: "Scored businesses ready for outreach" },
    { id: "b2c"  as const, label: "B2C Intent",    emoji: "🔍", desc: "Consumer signals & buying intent" },
    { id: "both" as const, label: "Full Stack",     emoji: "⚡", desc: "Prospects + intent + funnel assets" },
  ];

  const descPlaceholders: Record<typeof targetMarket, string> = {
    b2b:  "e.g. Marketing agencies in Austin TX running Facebook ads that need help with lead generation and client acquisition",
    b2c:  "e.g. Homeowners on Reddit asking about HVAC repair in Phoenix who are ready to book a service this week",
    both: "e.g. MedSpas in Southern California needing more patient bookings, and people searching for CoolSculpting treatments nearby",
  };

  const inputCls = "w-full px-3 py-2.5 rounded-xl text-sm outline-none transition-all";
  const inputStyle = { background: "var(--color-surface-2)", border: "1px solid var(--color-border-subtle)", color: "var(--color-text-1)" };
  const onFocusIn  = (e: React.FocusEvent<HTMLInputElement | HTMLTextAreaElement>) => { e.currentTarget.style.borderColor = "rgba(124,58,237,0.4)"; };
  const onFocusOut = (e: React.FocusEvent<HTMLInputElement | HTMLTextAreaElement>) => { e.currentTarget.style.borderColor = "var(--color-border-subtle)"; };

  return (
    <>
      <div className="fixed inset-0 z-40" style={{ background: "rgba(0,0,0,0.6)" }} onClick={onClose} />
      <div className="fixed left-1/2 top-1/2 z-50 w-full max-w-xl max-h-[92dvh] overflow-y-auto"
        style={{ transform: "translate(-50%, -50%)", background: "var(--color-surface)", border: "1px solid var(--color-border)", borderRadius: 20, boxShadow: "0 24px 80px rgba(0,0,0,0.5)", padding: 24 }}>

        {/* Header */}
        <div className="flex items-start justify-between mb-5">
          <div>
            <h2 className="text-lg font-bold" style={{ fontFamily: "var(--font-syne)", color: "var(--color-text-1)" }}>
              🐺 Blue Wolf Discovery
            </h2>
            <p className="text-xs mt-0.5" style={{ color: "var(--color-text-muted)" }}>
              AI scrapes, scores, and generates funnel assets — fully automated
            </p>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg mt-0.5" style={{ color: "var(--color-text-muted)" }}>
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M4 4l8 8M12 4l-8 8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" /></svg>
          </button>
        </div>

        <div className="space-y-5">

          {/* ── Agency Mode toggle ── */}
          <div className="flex items-center gap-3 px-3 py-2.5 rounded-xl"
            style={{ background: forClient ? "rgba(251,191,36,0.08)" : "var(--color-surface-2)", border: forClient ? "1px solid rgba(251,191,36,0.25)" : "1px solid var(--color-border-subtle)" }}>
            <div className="flex-1">
              <div className="text-xs font-semibold" style={{ color: forClient ? "#fbbf24" : "var(--color-text-2)" }}>Agency Mode</div>
              <div className="text-[10px] mt-0.5" style={{ color: "var(--color-text-muted)" }}>Finding leads for my clients, not my own business</div>
            </div>
            <button onClick={() => setForClient((v) => !v)}
              className="w-10 h-5 rounded-full transition-all relative flex-shrink-0"
              style={{ background: forClient ? "#fbbf24" : "var(--color-surface)" }}>
              <span className="absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-all"
                style={{ left: forClient ? "calc(100% - 18px)" : "2px" }} />
            </button>
          </div>

          {/* ── Discovery mode ── */}
          <div>
            <label className="text-xs font-semibold block mb-2" style={{ color: "var(--color-text-muted)" }}>DISCOVERY MODE</label>
            <div className="grid grid-cols-3 gap-2">
              {marketOptions.map(({ id, label, emoji, desc }) => {
                const active = targetMarket === id;
                return (
                  <button key={id} onClick={() => setTargetMarket(id)}
                    className="text-left px-3 py-2.5 rounded-xl text-xs transition-all"
                    style={{ background: active ? "rgba(124,58,237,0.15)" : "var(--color-surface-2)", border: active ? "1px solid rgba(124,58,237,0.3)" : "1px solid var(--color-border-subtle)", color: active ? "#a78bfa" : "var(--color-text-2)" }}>
                    <div className="font-semibold">{emoji} {label}</div>
                    <div className="mt-0.5 text-[10px]" style={{ color: active ? "#a78bfa99" : "var(--color-text-muted)" }}>{desc}</div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* ── AI Target Description ── */}
          <div>
            <label className="text-xs font-semibold block mb-1.5" style={{ color: "var(--color-text-muted)" }}>
              WHO DO YOU WANT TO TARGET? <span style={{ color: "#f87171" }}>*</span>
            </label>
            <textarea
              value={targetDescription}
              onChange={(e) => setTargetDescription(e.target.value)}
              rows={3}
              placeholder={descPlaceholders[targetMarket]}
              className="w-full px-3 py-2.5 rounded-xl text-sm outline-none resize-none transition-all"
              style={{ ...inputStyle, lineHeight: "1.5" }}
              onFocus={onFocusIn}
              onBlur={onFocusOut}
            />
            <div className="mt-1 text-[10px]" style={{ color: "var(--color-text-muted)" }}>
              The AI reads this to build search queries, score prospects, and craft your pitch angles.
            </div>
          </div>

          {/* ── Client service (agency mode / B2C) ── */}
          {(forClient || targetMarket === "b2c" || targetMarket === "both") && (
            <div>
              <label className="text-xs font-semibold block mb-1.5" style={{ color: "var(--color-text-muted)" }}>
                {forClient ? "CLIENT'S SERVICE / PRODUCT" : "SERVICE / PRODUCT"}
              </label>
              <input value={clientService} onChange={(e) => setClientService(e.target.value)}
                placeholder={forClient ? "e.g. CoolSculpting, HVAC Repair, Botox" : "e.g. CoolSculpting, Botox, HVAC Repair"}
                className={inputCls} style={inputStyle} onFocus={onFocusIn} onBlur={onFocusOut} />
            </div>
          )}

          {/* ── Location ── */}
          <div>
            <label className="text-xs font-semibold block mb-1.5" style={{ color: "var(--color-text-muted)" }}>LOCATION (optional)</label>
            <input value={location} onChange={(e) => setLocation(e.target.value)}
              placeholder="e.g. Murrieta, CA  or  United States"
              className={inputCls} style={inputStyle} onFocus={onFocusIn} onBlur={onFocusOut} />
          </div>

          {/* ── Keywords ── */}
          <div>
            <label className="text-xs font-semibold block mb-1.5" style={{ color: "var(--color-text-muted)" }}>KEYWORDS (comma-separated, optional)</label>
            <input value={keywords} onChange={(e) => setKeywords(e.target.value)}
              placeholder="e.g. lead generation, paid ads, conversion rate"
              className={inputCls} style={inputStyle} onFocus={onFocusIn} onBlur={onFocusOut} />
          </div>

          {/* ── Generate landing pages (B2C / both) ── */}
          {(targetMarket === "b2c" || targetMarket === "both") && (
            <div className="flex items-center gap-3 px-3 py-2.5 rounded-xl"
              style={{ background: generateLandingPage ? "rgba(167,139,250,0.08)" : "var(--color-surface-2)", border: generateLandingPage ? "1px solid rgba(167,139,250,0.25)" : "1px solid var(--color-border-subtle)" }}>
              <div className="flex-1">
                <div className="text-xs font-semibold" style={{ color: generateLandingPage ? "#a78bfa" : "var(--color-text-2)" }}>Generate Landing Pages</div>
                <div className="text-[10px] mt-0.5" style={{ color: "var(--color-text-muted)" }}>AI creates organic opt-in pages for top intent signals (WF3)</div>
              </div>
              <button onClick={() => setGenerateLandingPage((v) => !v)}
                className="w-10 h-5 rounded-full transition-all relative flex-shrink-0"
                style={{ background: generateLandingPage ? "#7c3aed" : "var(--color-surface)" }}>
                <span className="absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-all"
                  style={{ left: generateLandingPage ? "calc(100% - 18px)" : "2px" }} />
              </button>
            </div>
          )}

          {/* ── Min Score ── */}
          <div>
            <label className="text-xs font-semibold block mb-1.5" style={{ color: "var(--color-text-muted)" }}>
              MINIMUM SCORE: <span style={{ color: "#a78bfa" }}>{minScore}</span>
            </label>
            <input type="range" min={0} max={100} step={5} value={minScore} onChange={(e) => setMinScore(Number(e.target.value))} className="w-full" style={{ accentColor: "#7c3aed" }} />
            <div className="flex justify-between text-[10px] mt-1" style={{ color: "var(--color-text-muted)" }}>
              <span>0 (all)</span><span>50 (recommended)</span><span>100 (perfect)</span>
            </div>
          </div>

          {/* ── Save config ── */}
          <div>
            <label className="text-xs font-semibold block mb-1.5" style={{ color: "var(--color-text-muted)" }}>SAVE THIS SEARCH (optional)</label>
            <input value={saveName} onChange={(e) => setSaveName(e.target.value)}
              placeholder="e.g. Austin Marketing Agencies Q3"
              className={inputCls} style={inputStyle} onFocus={onFocusIn} onBlur={onFocusOut} />
          </div>

          {error && <div className="px-3 py-2 rounded-xl text-xs" style={{ background: "rgba(248,113,113,0.1)", color: "#f87171", border: "1px solid rgba(248,113,113,0.2)" }}>{error}</div>}

          <div className="flex gap-3 pt-1">
            <button onClick={onClose} className="flex-1 py-2.5 rounded-xl text-sm font-medium"
              style={{ background: "var(--color-surface-2)", border: "1px solid var(--color-border)", color: "var(--color-text-2)" }}>
              Cancel
            </button>
            <button onClick={handleLaunch} disabled={discover.isPending} className="flex-1 py-2.5 rounded-xl text-sm font-semibold"
              style={{ background: "linear-gradient(135deg, #7c3aed 0%, #4f46e5 100%)", color: "white", boxShadow: "0 4px 12px rgba(124,58,237,0.3)", opacity: discover.isPending ? 0.7 : 1 }}>
              {discover.isPending ? "Launching..." : "🚀 Launch Discovery"}
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
    setSaving(true); setError("");
    try {
      const res = await fetch("/api/leads", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...form, platform: form.platform as "manual" }) });
      if (!res.ok) { const err = await res.json(); throw new Error(err.error ?? "Failed"); }
      onClose();
    } catch (err) { setError(err instanceof Error ? err.message : "Failed"); }
    finally { setSaving(false); }
  }

  const field = (key: keyof typeof form, label: string, placeholder: string, type = "text") => (
    <div>
      <label className="text-xs font-medium block mb-1" style={{ color: "var(--color-text-muted)" }}>{label}</label>
      <input type={type} value={form[key]} onChange={(e) => setForm((f) => ({ ...f, [key]: e.target.value }))} placeholder={placeholder} className="w-full px-3 py-2.5 rounded-xl text-sm outline-none"
        style={{ background: "var(--color-surface-2)", border: "1px solid var(--color-border-subtle)", color: "var(--color-text-1)" }}
        onFocus={(e) => { (e.currentTarget).style.borderColor = "rgba(124,58,237,0.4)"; }}
        onBlur={(e) => { (e.currentTarget).style.borderColor = "var(--color-border-subtle)"; }} />
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
          <div className="grid grid-cols-2 gap-3">{field("company", "Company", "Company name")}{field("email", "Email", "email@example.com", "email")}</div>
          <div className="grid grid-cols-2 gap-3">{field("phone", "Phone", "+1 555 000 0000")}
            <div>
              <label className="text-xs font-medium block mb-1" style={{ color: "var(--color-text-muted)" }}>Platform</label>
              <select value={form.platform} onChange={(e) => setForm((f) => ({ ...f, platform: e.target.value }))} className="w-full px-3 py-2.5 rounded-xl text-sm outline-none" style={{ background: "var(--color-surface-2)", border: "1px solid var(--color-border-subtle)", color: "var(--color-text-1)" }}>
                {["manual","instagram","linkedin","tiktok","twitter","facebook","google"].map((p) => <option key={p} value={p}>{p.charAt(0).toUpperCase() + p.slice(1)}</option>)}
              </select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">{field("industry", "Industry", "Marketing Agency")}{field("location", "Location", "City, State")}</div>
          <div>
            <label className="text-xs font-medium block mb-1" style={{ color: "var(--color-text-muted)" }}>Notes</label>
            <textarea value={form.notes} onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))} rows={2} placeholder="Initial notes..." className="w-full px-3 py-2 rounded-xl text-sm outline-none resize-none" style={{ background: "var(--color-surface-2)", border: "1px solid var(--color-border-subtle)", color: "var(--color-text-1)" }} />
          </div>
          {error && <div className="text-xs px-3 py-2 rounded-xl" style={{ background: "rgba(248,113,113,0.1)", color: "#f87171" }}>{error}</div>}
          <div className="flex gap-3 pt-1">
            <button type="button" onClick={onClose} className="flex-1 py-2.5 rounded-xl text-sm font-medium" style={{ background: "var(--color-surface-2)", border: "1px solid var(--color-border)", color: "var(--color-text-2)" }}>Cancel</button>
            <button type="submit" disabled={saving} className="flex-1 py-2.5 rounded-xl text-sm font-semibold" style={{ background: "linear-gradient(135deg, #7c3aed 0%, #4f46e5 100%)", color: "white" }}>{saving ? "Adding..." : "Add Lead"}</button>
          </div>
        </form>
      </div>
    </>
  );
}

// ─── Tab panels ───────────────────────────────────────────────────────────────

type TabType = "leads" | "prospects" | "intent" | "assets";

function LeadsPanel({ onSelectLead }: { onSelectLead: (id: string) => void }) {
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [sort, setSort] = useState<{ by: string; dir: "asc" | "desc" }>({ by: "score", dir: "desc" });
  const [view, setView] = useState<"table" | "kanban">("table");

  const { data, isLoading } = useLeads({ page, per_page: 25, status: statusFilter === "all" ? undefined : statusFilter, search: search || undefined, sort: sort.by, dir: sort.dir });
  const deleteLead = useDeleteLead();

  const leads = data?.data ?? [];
  const total = data?.total ?? 0;
  const totalPages = Math.ceil(total / 25);

  function handleSort(by: string) {
    setSort((s) => s.by === by ? { by, dir: s.dir === "asc" ? "desc" : "asc" } : { by, dir: "desc" });
  }

  const kanbanGroups = (["new","contacted","qualified","converted","lost"] as LeadStatus[]).map((status) => ({
    status, leads: leads.filter((l) => l.status === status),
  }));

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row gap-3">
        <SearchBar value={searchInput} onChange={(v) => { setSearchInput(v); if (!v) setSearch(""); }}
          placeholder="Search name, company, email..." />
        <div className="flex gap-1.5 flex-wrap">
          {["all","new","contacted","qualified","converted","lost"].map((f) => (
            <button key={f} onClick={() => { setStatusFilter(f); setPage(1); }} className="px-3 py-2 rounded-xl text-xs font-medium capitalize"
              style={{ background: statusFilter === f ? "rgba(124,58,237,0.15)" : "var(--color-surface)", border: statusFilter === f ? "1px solid rgba(124,58,237,0.3)" : "1px solid var(--color-border)", color: statusFilter === f ? "#a78bfa" : "var(--color-text-2)" }}>
              {f === "all" ? "All" : STATUS_MAP[f as LeadStatus]?.label ?? f}
            </button>
          ))}
        </div>
        <div className="flex rounded-xl overflow-hidden" style={{ border: "1px solid var(--color-border)" }}>
          {(["table","kanban"] as const).map((v) => (
            <button key={v} onClick={() => setView(v)} className="px-3 py-2 text-xs font-medium capitalize"
              style={{ background: view === v ? "rgba(124,58,237,0.15)" : "var(--color-surface)", color: view === v ? "#a78bfa" : "var(--color-text-2)" }}>
              {v}
            </button>
          ))}
        </div>
      </div>

      {view === "table" ? (
        <div className="rounded-2xl overflow-hidden" style={{ background: "var(--color-surface)", border: "1px solid var(--color-border)" }}>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr style={{ borderBottom: "1px solid var(--color-border-subtle)" }}>
                  {[{key:"name",label:"Name"},{key:"company",label:"Company"},{key:"platform",label:"Platform"},{key:"score",label:"Score"},{key:"status",label:"Status"},{key:"industry",label:"Industry"},{key:"last_activity",label:"Last Activity"},{key:"_actions",label:""}].map(({ key, label }) => (
                    <th key={key} className={`text-left px-5 py-3.5 text-xs font-semibold ${key !== "_actions" ? "cursor-pointer select-none" : ""}`}
                      style={{ color: sort.by === key ? "#a78bfa" : "var(--color-text-muted)" }}
                      onClick={() => key !== "_actions" && handleSort(key)}>
                      {label}{sort.by === key && <span className="ml-1">{sort.dir === "asc" ? "↑" : "↓"}</span>}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {isLoading ? Array.from({ length: 6 }).map((_, i) => (
                  <tr key={i} style={{ borderBottom: "1px solid var(--color-border-subtle)" }}>
                    {Array.from({ length: 8 }).map((__, j) => <td key={j} className="px-5 py-3.5"><div className="h-4 rounded" style={{ background: "var(--color-surface-2)", width: j === 0 ? 120 : 60 }} /></td>)}
                  </tr>
                )) : leads.length === 0 ? (
                  <tr><td colSpan={8} className="px-5 py-12 text-center text-sm" style={{ color: "var(--color-text-muted)" }}>
                    {search ? "No leads match your search." : "No leads yet. Run discovery to find prospects."}
                  </td></tr>
                ) : leads.map((lead) => {
                  const sc = scoreColor(lead.score);
                  const st = STATUS_MAP[lead.status];
                  const pc = lead.platform ? PLATFORM_COLORS[lead.platform] : "#6b7280";
                  return (
                    <tr key={lead.id} className="transition-colors cursor-pointer" style={{ borderBottom: "1px solid var(--color-border-subtle)" }}
                      onMouseEnter={(e) => { (e.currentTarget).style.background = "var(--color-surface-2)"; }}
                      onMouseLeave={(e) => { (e.currentTarget).style.background = "transparent"; }}
                      onClick={() => onSelectLead(lead.id)}>
                      <td className="px-5 py-3.5 font-medium" style={{ color: "var(--color-text-1)" }}>{lead.name}</td>
                      <td className="px-5 py-3.5" style={{ color: "var(--color-text-2)" }}>{lead.company ?? "—"}</td>
                      <td className="px-5 py-3.5">{lead.platform ? <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-md" style={{ background: `${pc}18`, color: pc }}>{lead.platform.toUpperCase()}</span> : "—"}</td>
                      <td className="px-5 py-3.5"><ScoreBar score={lead.score} /></td>
                      <td className="px-5 py-3.5"><span className="text-xs font-semibold px-2.5 py-1 rounded-lg" style={{ background: st.bg, color: st.color }}>{st.label}</span></td>
                      <td className="px-5 py-3.5 text-xs" style={{ color: "var(--color-text-2)" }}>{lead.industry ?? "—"}</td>
                      <td className="px-5 py-3.5 text-xs" style={{ color: "var(--color-text-muted)" }}>{lead.last_activity ? relativeTime(lead.last_activity) : "—"}</td>
                      <td className="px-5 py-3.5" onClick={(e) => e.stopPropagation()}>
                        <button onClick={(e) => { e.stopPropagation(); if (confirm("Delete this lead?")) deleteLead.mutate(lead.id); }}
                          className="p-1.5 rounded-lg" style={{ color: "var(--color-text-muted)" }}
                          onMouseEnter={(e) => { (e.currentTarget).style.color = "#f87171"; }}
                          onMouseLeave={(e) => { (e.currentTarget).style.color = "var(--color-text-muted)"; }}>
                          <svg width="13" height="13" viewBox="0 0 13 13" fill="none"><path d="M2 3h9M5 3V2h3v1M10 3l-.5 8H3.5L3 3" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" /></svg>
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          {totalPages > 1 && (
            <div className="flex items-center justify-between px-5 py-3" style={{ borderTop: "1px solid var(--color-border-subtle)" }}>
              <span className="text-xs" style={{ color: "var(--color-text-muted)" }}>{(page - 1) * 25 + 1}–{Math.min(page * 25, total)} of {total}</span>
              <div className="flex gap-2">
                <button disabled={page <= 1} onClick={() => setPage((p) => p - 1)} className="px-3 py-1.5 rounded-lg text-xs font-medium" style={{ background: "var(--color-surface-2)", color: "var(--color-text-2)", border: "1px solid var(--color-border-subtle)", opacity: page <= 1 ? 0.4 : 1 }}>Previous</button>
                <button disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)} className="px-3 py-1.5 rounded-lg text-xs font-medium" style={{ background: "var(--color-surface-2)", color: "var(--color-text-2)", border: "1px solid var(--color-border-subtle)", opacity: page >= totalPages ? 0.4 : 1 }}>Next</button>
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-3 lg:grid-cols-5 gap-4">
          {kanbanGroups.map(({ status, leads: g }) => {
            const style = STATUS_MAP[status];
            return (
              <div key={status} className="rounded-2xl overflow-hidden" style={{ background: "var(--color-surface)", border: "1px solid var(--color-border)" }}>
                <div className="px-4 py-3 flex items-center justify-between" style={{ borderBottom: "1px solid var(--color-border-subtle)" }}>
                  <span className="text-xs font-semibold" style={{ color: style.color }}>{style.label}</span>
                  <span className="text-xs font-bold px-1.5 py-0.5 rounded-md" style={{ background: style.bg, color: style.color }}>{g.length}</span>
                </div>
                <div className="p-2 space-y-2 min-h-24">
                  {g.length === 0 ? <div className="text-center py-6 text-xs" style={{ color: "var(--color-text-muted)" }}>Empty</div> :
                    g.map((lead) => {
                      const sc = scoreColor(lead.score);
                      return (
                        <div key={lead.id} onClick={() => onSelectLead(lead.id)} className="rounded-xl p-3 cursor-pointer transition-all"
                          style={{ background: "var(--color-surface-2)", border: "1px solid var(--color-border-subtle)" }}
                          onMouseEnter={(e) => { (e.currentTarget).style.border = `1px solid ${style.color}40`; }}
                          onMouseLeave={(e) => { (e.currentTarget).style.border = "1px solid var(--color-border-subtle)"; }}>
                          <div className="text-xs font-medium mb-0.5" style={{ color: "var(--color-text-1)" }}>{lead.name}</div>
                          {lead.company && <div className="text-[10px] mb-2" style={{ color: "var(--color-text-muted)" }}>{lead.company}</div>}
                          <div className="flex items-center justify-between">
                            <PlatformBadge platform={lead.platform} />
                            <span className="text-[10px] font-bold" style={{ color: sc.color }}>{lead.score}</span>
                          </div>
                        </div>
                      );
                    })}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function ProspectsPanel({ onSelectBiz, activeRunId }: { onSelectBiz: (b: Business) => void; activeRunId?: string | null }) {
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [runFilter, setRunFilter] = useState<string | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // When a new run fires, auto-filter to it; once cleared, go back to "all"
  useEffect(() => {
    if (activeRunId) setRunFilter(activeRunId);
  }, [activeRunId]);

  const { data, isLoading } = useBusinesses({
    search: debouncedSearch || undefined,
    run_id: runFilter || undefined,
    sort: "opportunity_score",
  });
  const businesses = data?.data ?? [];
  const total = data?.total ?? 0;

  function onSearchChange(v: string) {
    setSearch(v);
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => setDebouncedSearch(v), 400);
  }

  if (isLoading) return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} className="rounded-2xl p-5 animate-pulse" style={{ background: "var(--color-surface)", border: "1px solid var(--color-border)", height: 180 }} />
      ))}
    </div>
  );

  return (
    <div className="space-y-4">
      {/* Run filter banner */}
      {runFilter && (
        <div className="flex items-center gap-3 px-4 py-2.5 rounded-xl text-xs" style={{ background: "rgba(124,58,237,0.08)", border: "1px solid rgba(124,58,237,0.2)", color: "#a78bfa" }}>
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><circle cx="6" cy="6" r="5" stroke="#a78bfa" strokeWidth="1.5"/><path d="M6 4v3M6 8.5v.5" stroke="#a78bfa" strokeWidth="1.5" strokeLinecap="round"/></svg>
          <span className="flex-1">Showing results from this discovery run</span>
          <button onClick={() => setRunFilter(null)} className="font-semibold underline hover:no-underline">Show all</button>
        </div>
      )}
      <div className="flex gap-3">
        <SearchBar value={search} onChange={onSearchChange} placeholder="Search businesses, location, service..." />
        {total > 0 && <div className="text-xs py-2 px-3 rounded-xl flex items-center" style={{ background: "var(--color-surface)", border: "1px solid var(--color-border)", color: "var(--color-text-muted)", whiteSpace: "nowrap" }}>{total} prospects</div>}
      </div>

      {businesses.length === 0 ? (
        <EmptyState icon="🏢" title="No prospects yet" desc="Run B2B discovery to find AI-scored businesses ready for outreach." />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {businesses.map((biz) => {
            const { color } = scoreColor(biz.opportunity_score);
            return (
              <div key={biz.id} onClick={() => onSelectBiz(biz)} className="rounded-2xl p-5 cursor-pointer transition-all group"
                style={{ background: "var(--color-surface)", border: "1px solid var(--color-border)" }}
                onMouseEnter={(e) => { (e.currentTarget).style.border = "1px solid rgba(124,58,237,0.3)"; (e.currentTarget).style.boxShadow = "0 8px 24px rgba(124,58,237,0.1)"; }}
                onMouseLeave={(e) => { (e.currentTarget).style.border = "1px solid var(--color-border)"; (e.currentTarget).style.boxShadow = "none"; }}>
                <div className="flex items-start justify-between gap-3 mb-3">
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-semibold truncate" style={{ color: "var(--color-text-1)" }}>{biz.name}</div>
                    <div className="text-xs mt-0.5" style={{ color: "var(--color-text-muted)" }}>{biz.location ?? biz.industry ?? "—"}</div>
                  </div>
                  <div className="flex flex-col items-end flex-shrink-0">
                    <div className="text-xl font-bold" style={{ color, fontFamily: "var(--font-syne)" }}>{biz.opportunity_score}</div>
                    <div className="text-[10px]" style={{ color: "var(--color-text-muted)" }}>opp. score</div>
                  </div>
                </div>

                {biz.rating != null && (
                  <div className="text-xs mb-2" style={{ color: "#fbbf24" }}>★ {biz.rating} <span style={{ color: "var(--color-text-muted)" }}>({biz.reviews} reviews)</span></div>
                )}

                {biz.weaknesses && (
                  <div className="text-xs mb-2 p-2 rounded-lg" style={{ background: "rgba(248,113,113,0.08)", color: "#f87171" }}>
                    ⚠ {biz.weaknesses.length > 80 ? biz.weaknesses.slice(0, 80) + "…" : biz.weaknesses}
                  </div>
                )}

                {biz.recommended_offer && (
                  <div className="text-xs p-2 rounded-lg" style={{ background: "rgba(52,211,153,0.08)", color: "#34d399" }}>
                    ✦ {biz.recommended_offer.length > 80 ? biz.recommended_offer.slice(0, 80) + "…" : biz.recommended_offer}
                  </div>
                )}

                <div className="mt-3 flex items-center justify-between">
                  {biz.website && <span className="text-[10px]" style={{ color: "var(--color-text-muted)" }}>{biz.website.replace(/^https?:\/\//, "").split("/")[0]}</span>}
                  <span className="text-[10px] font-semibold" style={{ color: "#a78bfa" }}>View intelligence →</span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function IntentPanel({ onSelectSignal }: { onSelectSignal: (s: IntentSignal) => void }) {
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [urgencyFilter, setUrgencyFilter] = useState("");
  const [stageFilter, setStageFilter] = useState("");
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const { data, isLoading } = useIntentSignals({ search: debouncedSearch || undefined, urgency: urgencyFilter || undefined, stage: stageFilter || undefined, sort: "intent_score" });
  const signals = data?.data ?? [];

  function onSearchChange(v: string) {
    setSearch(v);
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => setDebouncedSearch(v), 400);
  }

  if (isLoading) return (
    <div className="space-y-3">
      {Array.from({ length: 4 }).map((_, i) => <div key={i} className="rounded-2xl p-5 animate-pulse" style={{ background: "var(--color-surface)", border: "1px solid var(--color-border)", height: 100 }} />)}
    </div>
  );

  const stages = ["Research", "Comparison", "Vendor Selection", "Ready To Buy"];

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row gap-3">
        <SearchBar value={search} onChange={onSearchChange} placeholder="Search questions, service, location..." />
        <div className="flex gap-1.5 flex-wrap">
          <button onClick={() => setUrgencyFilter("")} className="px-3 py-2 rounded-xl text-xs font-medium" style={{ background: !urgencyFilter ? "rgba(124,58,237,0.15)" : "var(--color-surface)", border: !urgencyFilter ? "1px solid rgba(124,58,237,0.3)" : "1px solid var(--color-border)", color: !urgencyFilter ? "#a78bfa" : "var(--color-text-2)" }}>All</button>
          {["High","Medium","Low"].map((u) => {
            const uc = URGENCY_COLORS[u];
            return <button key={u} onClick={() => setUrgencyFilter(urgencyFilter === u ? "" : u)} className="px-3 py-2 rounded-xl text-xs font-medium" style={{ background: urgencyFilter === u ? uc.bg : "var(--color-surface)", border: urgencyFilter === u ? `1px solid ${uc.color}40` : "1px solid var(--color-border)", color: urgencyFilter === u ? uc.color : "var(--color-text-2)" }}>{u}</button>;
          })}
        </div>
      </div>

      {/* Stage pipeline tabs */}
      <div className="flex gap-2 overflow-x-auto pb-1">
        <button onClick={() => setStageFilter("")} className="px-3 py-1.5 rounded-lg text-xs font-medium flex-shrink-0"
          style={{ background: !stageFilter ? "rgba(124,58,237,0.15)" : "var(--color-surface-2)", border: !stageFilter ? "1px solid rgba(124,58,237,0.3)" : "1px solid var(--color-border-subtle)", color: !stageFilter ? "#a78bfa" : "var(--color-text-muted)" }}>All Stages</button>
        {stages.map((s) => {
          const c = STAGE_COLORS[s] ?? "#6b7280";
          const active = stageFilter === s;
          return <button key={s} onClick={() => setStageFilter(active ? "" : s)} className="px-3 py-1.5 rounded-lg text-xs font-medium flex-shrink-0"
            style={{ background: active ? `${c}18` : "var(--color-surface-2)", border: active ? `1px solid ${c}40` : "1px solid var(--color-border-subtle)", color: active ? c : "var(--color-text-muted)" }}>{s}</button>;
        })}
      </div>

      {signals.length === 0 ? (
        <EmptyState icon="📡" title="No intent signals yet" desc="Run B2C discovery to find consumers actively seeking your service." />
      ) : (
        <div className="space-y-3">
          {signals.map((sig) => {
            const uc = sig.urgency ? URGENCY_COLORS[sig.urgency] : null;
            const sc = sig.buying_stage ? STAGE_COLORS[sig.buying_stage] : "#6b7280";
            const { color: ic } = scoreColor(sig.intent_score);
            return (
              <div key={sig.id} onClick={() => onSelectSignal(sig)} className="rounded-2xl p-5 cursor-pointer transition-all"
                style={{ background: "var(--color-surface)", border: "1px solid var(--color-border)" }}
                onMouseEnter={(e) => { (e.currentTarget).style.border = "1px solid rgba(124,58,237,0.3)"; }}
                onMouseLeave={(e) => { (e.currentTarget).style.border = "1px solid var(--color-border)"; }}>
                <div className="flex items-start gap-3">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm leading-relaxed" style={{ color: "var(--color-text-1)" }}>
                      &ldquo;{sig.question.length > 180 ? sig.question.slice(0, 180) + "…" : sig.question}&rdquo;
                    </p>
                    <div className="flex items-center gap-2 mt-3 flex-wrap">
                      {sig.urgency && uc && (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-md" style={{ background: uc.bg, color: uc.color }}>
                          {sig.urgency.toUpperCase()} URGENCY
                        </span>
                      )}
                      {sig.buying_stage && (
                        <span className="text-[10px] font-semibold px-2 py-0.5 rounded-md" style={{ background: `${sc}18`, color: sc }}>
                          {sig.buying_stage}
                        </span>
                      )}
                      <span className="text-[10px] px-2 py-0.5 rounded-md capitalize" style={{ background: "var(--color-surface-2)", color: "var(--color-text-muted)" }}>
                        {sig.source}
                      </span>
                      {sig.location && <span className="text-[10px]" style={{ color: "var(--color-text-muted)" }}>📍 {sig.location}</span>}
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-1 flex-shrink-0">
                    <div className="text-lg font-bold" style={{ color: ic, fontFamily: "var(--font-syne)" }}>{sig.intent_score}</div>
                    <div className="text-[10px]" style={{ color: "var(--color-text-muted)" }}>intent</div>
                    {sig.source_url && (
                      <a href={sig.source_url} target="_blank" rel="noopener" onClick={(e) => e.stopPropagation()}
                        className="text-[10px] px-2 py-0.5 rounded transition-colors"
                        style={{ color: "#a78bfa", background: "rgba(124,58,237,0.1)" }}>View Post</a>
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

function AssetsPanel({ onSelectAsset }: { onSelectAsset: (a: GeneratedAsset) => void }) {
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const { data, isLoading } = useGeneratedAssets({ search: debouncedSearch || undefined });
  const assets = data?.data ?? [];

  function onSearchChange(v: string) {
    setSearch(v);
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => setDebouncedSearch(v), 400);
  }

  const assetTypes = [
    { key: "landing_page", icon: "🏠" },
    { key: "email_sequence", icon: "✉" },
    { key: "social_posts", icon: "📱" },
    { key: "ai_script", icon: "📞" },
    { key: "video_script", icon: "🎬" },
    { key: "blog_outline", icon: "📝" },
  ] as const;

  if (isLoading) return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {Array.from({ length: 4 }).map((_, i) => <div key={i} className="rounded-2xl p-5 animate-pulse" style={{ background: "var(--color-surface)", border: "1px solid var(--color-border)", height: 160 }} />)}
    </div>
  );

  return (
    <div className="space-y-4">
      <SearchBar value={search} onChange={onSearchChange} placeholder="Search service, location, content..." />
      {assets.length === 0 ? (
        <EmptyState icon="🎨" title="No funnel assets yet" desc='Run "Full Stack" discovery — AI generates landing pages, email sequences, social posts, and more.' />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {assets.map((asset) => (
            <div key={asset.id} onClick={() => onSelectAsset(asset)} className="rounded-2xl p-5 cursor-pointer transition-all"
              style={{ background: "var(--color-surface)", border: "1px solid var(--color-border)" }}
              onMouseEnter={(e) => { (e.currentTarget).style.border = "1px solid rgba(124,58,237,0.3)"; (e.currentTarget).style.boxShadow = "0 8px 24px rgba(124,58,237,0.1)"; }}
              onMouseLeave={(e) => { (e.currentTarget).style.border = "1px solid var(--color-border)"; (e.currentTarget).style.boxShadow = "none"; }}>
              <div className="mb-3">
                <div className="text-sm font-semibold" style={{ color: "var(--color-text-1)" }}>
                  {asset.service ?? "Funnel Assets"}{asset.location ? ` · ${asset.location}` : ""}
                </div>
                {asset.landing_page && (
                  <p className="text-xs mt-1 leading-relaxed" style={{ color: "var(--color-text-2)" }}>
                    {asset.landing_page.length > 80 ? asset.landing_page.slice(0, 80) + "…" : asset.landing_page}
                  </p>
                )}
              </div>
              <div className="flex flex-wrap gap-1.5">
                {assetTypes.map(({ key, icon }) => asset[key] && (
                  <span key={key} className="text-[10px] px-2 py-0.5 rounded-md" style={{ background: "rgba(124,58,237,0.08)", color: "#a78bfa" }}>
                    {icon} {key.replace(/_/g, " ")}
                  </span>
                ))}
              </div>
              <div className="mt-3 flex justify-between items-center">
                <div className="text-[10px]" style={{ color: "var(--color-text-muted)" }}>{relativeTime(asset.created_at)}</div>
                <span className="text-[10px] font-semibold" style={{ color: "#a78bfa" }}>View assets →</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function LeadsPage() {
  const qc = useQueryClient();
  const [activeTab, setActiveTab] = useState<TabType>("leads");
  const [showDiscovery, setShowDiscovery] = useState(false);
  const [showAddLead, setShowAddLead] = useState(false);
  const [selectedLeadId, setSelectedLeadId] = useState<string | null>(null);
  const [selectedBiz, setSelectedBiz] = useState<Business | null>(null);
  const [selectedSignal, setSelectedSignal] = useState<IntentSignal | null>(null);
  const [selectedAsset, setSelectedAsset] = useState<GeneratedAsset | null>(null);
  const [activeRunId, setActiveRunId] = useState<string | null>(null);
  const [activeRunMarket, setActiveRunMarket] = useState<string>("");
  const [discoveryWarning, setDiscoveryWarning] = useState<string | null>(null);
  const runPollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // ── Supabase Realtime: invalidate queries when new rows arrive ──────────────
  useEffect(() => {
    const sb = getSupabaseBrowserClient();
    if (!sb) return;

    const channel = sb
      .channel("leads-intelligence")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "leads" }, () => {
        qc.invalidateQueries({ queryKey: ["leads"] });
      })
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "businesses" }, () => {
        qc.invalidateQueries({ queryKey: ["businesses"] });
      })
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "intent_signals" }, () => {
        qc.invalidateQueries({ queryKey: ["intent-signals"] });
      })
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "generated_assets" }, () => {
        qc.invalidateQueries({ queryKey: ["generated-assets"] });
      })
      .subscribe();

    return () => { sb.removeChannel(channel); };
  }, [qc]);

  // ── Poll workflow_run status to clear banner when done ─────────────────────
  useEffect(() => {
    if (!activeRunId) return;

    async function checkRun() {
      if (!activeRunId) return;
      try {
        // Use the leads API indirectly — just invalidate all queries after 5s intervals
        // Full Realtime will push the data; this just clears the banner on timeout
        qc.invalidateQueries({ queryKey: ["leads"] });
        qc.invalidateQueries({ queryKey: ["businesses"] });
        qc.invalidateQueries({ queryKey: ["intent-signals"] });
        qc.invalidateQueries({ queryKey: ["generated-assets"] });
      } catch { /* ignore */ }
    }

    runPollRef.current = setInterval(checkRun, 8000);
    // Auto-dismiss banner after 3 minutes (n8n async timeout)
    const dismissTimer = setTimeout(() => setActiveRunId(null), 180_000);

    return () => {
      if (runPollRef.current) clearInterval(runPollRef.current);
      clearTimeout(dismissTimer);
    };
  }, [activeRunId, qc]);

  function handleLaunched(runId: string, market: string, n8nTriggered: boolean) {
    // Auto-switch to the relevant tab
    if (market === "b2b") setActiveTab("prospects");
    else if (market === "b2c") setActiveTab("intent");
    else setActiveTab("prospects"); // "both" — start at prospects

    if (!n8nTriggered) {
      // n8n not reachable — show a one-time warning instead of an infinite spinner
      setDiscoveryWarning("n8n automation is not connected — configure N8N_WEBHOOK_BASE_URL in Vercel to enable live discovery. Any AI-generated leads have been added.");
      setTimeout(() => setDiscoveryWarning(null), 12_000);
      return;
    }
    setActiveRunId(runId);
    setActiveRunMarket(market);
  }

  // Stat summaries per tab
  const { data: leadsData } = useLeads({ per_page: 100 });
  const { data: bizData } = useBusinesses({ per_page: 100 });
  const { data: intentData } = useIntentSignals({ per_page: 100 });
  const { data: assetsData } = useGeneratedAssets({ per_page: 100 });

  const leads = leadsData?.data ?? [];
  const businesses = bizData?.data ?? [];
  const signals = intentData?.data ?? [];
  const assets = assetsData?.data ?? [];

  const STATS: Record<TabType, { label: string; value: number | string; color: string }[]> = {
    leads: [
      { label: "Total Leads", value: leadsData?.total ?? 0, color: "#7c3aed" },
      { label: "Qualified", value: leads.filter((l) => l.status === "qualified").length, color: "#34d399" },
      { label: "Avg Score", value: leads.length ? Math.round(leads.reduce((s, l) => s + l.score, 0) / leads.length) : 0, color: "#0891b2" },
      { label: "Converted", value: leads.filter((l) => l.status === "converted").length, color: "#fbbf24" },
    ],
    prospects: [
      { label: "Total Prospects", value: bizData?.total ?? 0, color: "#7c3aed" },
      { label: "High Score (≥80)", value: businesses.filter((b) => b.opportunity_score >= 80).length, color: "#34d399" },
      { label: "Avg Opp. Score", value: businesses.length ? Math.round(businesses.reduce((s, b) => s + b.opportunity_score, 0) / businesses.length) : 0, color: "#0891b2" },
      { label: "Have Email", value: businesses.filter((b) => b.email).length, color: "#fbbf24" },
    ],
    intent: [
      { label: "Total Signals", value: intentData?.total ?? 0, color: "#7c3aed" },
      { label: "Ready To Buy", value: signals.filter((s) => s.buying_stage === "Ready To Buy").length, color: "#34d399" },
      { label: "High Urgency", value: signals.filter((s) => s.urgency === "High").length, color: "#f87171" },
      { label: "Avg Intent", value: signals.length ? Math.round(signals.reduce((a, s) => a + s.intent_score, 0) / signals.length) : 0, color: "#0891b2" },
    ],
    assets: [
      { label: "Total Assets", value: assetsData?.total ?? 0, color: "#7c3aed" },
      { label: "Landing Pages", value: assets.filter((a) => a.landing_page).length, color: "#34d399" },
      { label: "Email Seqs", value: assets.filter((a) => a.email_sequence).length, color: "#0891b2" },
      { label: "Social Posts", value: assets.filter((a) => a.social_posts).length, color: "#fbbf24" },
    ],
  };

  const TABS: { id: TabType; label: string; icon: string }[] = [
    { id: "leads", label: "Leads", icon: "👤" },
    { id: "prospects", label: "Prospects", icon: "🏢" },
    { id: "intent", label: "Intent Signals", icon: "📡" },
    { id: "assets", label: "Funnel Assets", icon: "🎨" },
  ];

  const bannerEngines: Record<string, string[]> = {
    b2b:  ["Finding businesses", "AI scoring opportunities", "Drafting outreach emails"],
    b2c:  ["Scanning Reddit & reviews", "Classifying buyer intent", "Generating funnel assets"],
    both: ["Scoring B2B prospects", "Detecting B2C intent", "Building funnel assets"],
  };
  const bannerTasks = bannerEngines[activeRunMarket] ?? bannerEngines.both;

  return (
    <div className="p-5 sm:p-8 max-w-[1500px] mx-auto space-y-6">

      {/* n8n not configured warning */}
      {discoveryWarning && (
        <div className="rounded-2xl px-5 py-4 animate-fade-up" style={{ background: "rgba(251,191,36,0.08)", border: "1px solid rgba(251,191,36,0.25)" }}>
          <div className="flex items-center gap-3">
            <span className="text-xl flex-shrink-0">⚠️</span>
            <p className="text-sm flex-1" style={{ color: "#fbbf24" }}>{discoveryWarning}</p>
            <button onClick={() => setDiscoveryWarning(null)} className="text-xs px-2 py-1 rounded-lg flex-shrink-0" style={{ color: "var(--color-text-muted)", background: "var(--color-surface)" }}>✕</button>
          </div>
        </div>
      )}

      {/* Discovery running banner */}
      {activeRunId && (
        <div className="rounded-2xl px-5 py-4 animate-fade-up" style={{ background: "rgba(124,58,237,0.08)", border: "1px solid rgba(124,58,237,0.2)" }}>
          <div className="flex items-center gap-4">
            <div className="w-5 h-5 rounded-full border-2 border-t-transparent animate-spin flex-shrink-0" style={{ borderColor: "#7c3aed", borderTopColor: "transparent" }} />
            <div className="flex-1">
              <div className="text-sm font-semibold" style={{ color: "var(--color-text-1)" }}>Intelligence engine running</div>
              <div className="flex gap-3 mt-1 flex-wrap">
                {bannerTasks.map((task, i) => (
                  <span key={i} className="text-[10px] px-2 py-0.5 rounded-md" style={{ background: "rgba(124,58,237,0.12)", color: "#a78bfa" }}>
                    ● {task}
                  </span>
                ))}
              </div>
            </div>
            <button onClick={() => setActiveRunId(null)} className="text-xs px-3 py-1.5 rounded-lg flex-shrink-0" style={{ color: "var(--color-text-muted)", background: "var(--color-surface)" }}>Dismiss</button>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 animate-fade-up">
        <div>
          <p className="text-sm mb-1" style={{ color: "var(--color-text-2)" }}>Discover & manage</p>
          <h1 className="text-2xl sm:text-3xl font-bold" style={{ fontFamily: "var(--font-syne)", color: "var(--color-text-1)" }}>
            Lead Intelligence
          </h1>
        </div>
        <div className="flex gap-2 flex-wrap">
          {activeTab === "leads" && (
            <button onClick={() => setShowAddLead(true)} className="px-4 py-2.5 rounded-xl text-sm font-medium flex items-center gap-2"
              style={{ background: "var(--color-surface)", border: "1px solid var(--color-border)", color: "var(--color-text-2)" }}>
              <svg width="13" height="13" viewBox="0 0 13 13" fill="none"><path d="M6.5 1v11M1 6.5h11" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" /></svg>
              Add Manually
            </button>
          )}
          <button onClick={() => setShowDiscovery(true)} className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold transition-all"
            style={{ background: "linear-gradient(135deg, #7c3aed 0%, #4f46e5 100%)", color: "white", boxShadow: "0 4px 12px rgba(124,58,237,0.3)" }}>
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><circle cx="6" cy="6" r="4" stroke="currentColor" strokeWidth="1.5" /><path d="M9 9l3 3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" /></svg>
            Run Discovery
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
        {STATS[activeTab].map((s, i) => (
          <div key={s.label} className="rounded-2xl p-5 animate-fade-up relative overflow-hidden transition-all duration-300"
            style={{ background: "var(--color-surface)", border: "1px solid var(--color-border)", animationDelay: `${i * 0.07}s` }}
            onMouseEnter={(e) => { (e.currentTarget).style.border = `1px solid ${s.color}33`; (e.currentTarget).style.boxShadow = `0 8px 24px ${s.color}15`; }}
            onMouseLeave={(e) => { (e.currentTarget).style.border = "1px solid var(--color-border)"; (e.currentTarget).style.boxShadow = "none"; }}>
            <div className="absolute top-0 right-0 w-24 h-24 rounded-full pointer-events-none opacity-30" style={{ background: `radial-gradient(circle, ${s.color}25 0%, transparent 70%)`, transform: "translate(25%,-25%)" }} />
            <div className="text-2xl font-bold mb-1" style={{ fontFamily: "var(--font-syne)", color: "var(--color-text-1)" }}>{s.value}</div>
            <div className="text-xs" style={{ color: "var(--color-text-muted)" }}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* Tab navigation */}
      <div className="flex gap-1 p-1 rounded-2xl" style={{ background: "var(--color-surface)", border: "1px solid var(--color-border)", width: "fit-content" }}>
        {TABS.map(({ id, label, icon }) => (
          <button key={id} onClick={() => setActiveTab(id)} className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-medium transition-all"
            style={{ background: activeTab === id ? "rgba(124,58,237,0.15)" : "transparent", color: activeTab === id ? "#a78bfa" : "var(--color-text-2)", border: activeTab === id ? "1px solid rgba(124,58,237,0.25)" : "1px solid transparent" }}>
            <span>{icon}</span>
            <span>{label}</span>
            {id === "prospects" && businesses.length > 0 && (
              <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full ml-0.5" style={{ background: "rgba(124,58,237,0.2)", color: "#a78bfa" }}>{businesses.length}</span>
            )}
            {id === "intent" && signals.length > 0 && (
              <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full ml-0.5" style={{ background: "rgba(124,58,237,0.2)", color: "#a78bfa" }}>{signals.length}</span>
            )}
            {id === "assets" && assets.length > 0 && (
              <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full ml-0.5" style={{ background: "rgba(124,58,237,0.2)", color: "#a78bfa" }}>{assets.length}</span>
            )}
          </button>
        ))}
      </div>

      {/* Tab content */}
      <div className="animate-fade-up" style={{ animationDelay: "0.1s" }}>
        {activeTab === "leads"     && <LeadsPanel     onSelectLead={(id) => setSelectedLeadId(id)} />}
        {activeTab === "prospects" && <ProspectsPanel  onSelectBiz={(b) => setSelectedBiz(b)} activeRunId={activeRunId} />}
        {activeTab === "intent"    && <IntentPanel     onSelectSignal={(s) => setSelectedSignal(s)} />}
        {activeTab === "assets"    && <AssetsPanel     onSelectAsset={(a) => setSelectedAsset(a)} />}
      </div>

      {/* Modals + Drawers */}
      {showDiscovery && <DiscoveryModal onClose={() => setShowDiscovery(false)} onLaunched={handleLaunched} />}
      {showAddLead && <AddLeadModal onClose={() => setShowAddLead(false)} />}
      {selectedLeadId && <LeadDrawer leadId={selectedLeadId} onClose={() => setSelectedLeadId(null)} />}
      {selectedBiz && <BusinessDrawer biz={selectedBiz} onClose={() => setSelectedBiz(null)} />}
      {selectedAsset && <AssetDrawer asset={selectedAsset} onClose={() => setSelectedAsset(null)} />}

      {/* Intent signal inline modal (simple overlay) */}
      {selectedSignal && (
        <>
          <div className="fixed inset-0 z-40" style={{ background: "rgba(0,0,0,0.5)" }} onClick={() => setSelectedSignal(null)} />
          <div className="fixed left-1/2 top-1/2 z-50 w-full max-w-lg max-h-[80dvh] overflow-y-auto"
            style={{ transform: "translate(-50%, -50%)", background: "var(--color-surface)", border: "1px solid var(--color-border)", borderRadius: 20, boxShadow: "0 24px 80px rgba(0,0,0,0.5)", padding: 24 }}>
            <div className="flex items-start justify-between gap-4 mb-4">
              <div className="flex flex-wrap gap-2">
                {selectedSignal.urgency && (
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-md" style={{ background: URGENCY_COLORS[selectedSignal.urgency]?.bg, color: URGENCY_COLORS[selectedSignal.urgency]?.color }}>
                    {selectedSignal.urgency.toUpperCase()} URGENCY
                  </span>
                )}
                {selectedSignal.buying_stage && (
                  <span className="text-xs font-semibold px-2 py-0.5 rounded-md" style={{ background: `${STAGE_COLORS[selectedSignal.buying_stage] ?? "#6b7280"}18`, color: STAGE_COLORS[selectedSignal.buying_stage] ?? "#6b7280" }}>
                    {selectedSignal.buying_stage}
                  </span>
                )}
              </div>
              <button onClick={() => setSelectedSignal(null)} style={{ color: "var(--color-text-muted)" }}>
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M4 4l8 8M12 4l-8 8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" /></svg>
              </button>
            </div>
            <blockquote className="text-base leading-relaxed mb-4" style={{ color: "var(--color-text-1)" }}>
              &ldquo;{selectedSignal.question}&rdquo;
            </blockquote>
            <div className="grid grid-cols-2 gap-3 text-xs" style={{ color: "var(--color-text-muted)" }}>
              {selectedSignal.source && <div><span className="font-semibold" style={{ color: "var(--color-text-2)" }}>Source</span><br />{selectedSignal.source}</div>}
              {selectedSignal.service && <div><span className="font-semibold" style={{ color: "var(--color-text-2)" }}>Service</span><br />{selectedSignal.service}</div>}
              {selectedSignal.location && <div><span className="font-semibold" style={{ color: "var(--color-text-2)" }}>Location</span><br />{selectedSignal.location}</div>}
              <div><span className="font-semibold" style={{ color: "var(--color-text-2)" }}>Intent Score</span><br />
                <span style={{ color: scoreColor(selectedSignal.intent_score).color, fontWeight: 700 }}>{selectedSignal.intent_score}/100</span>
              </div>
            </div>
            {selectedSignal.source_url && (
              <a href={selectedSignal.source_url} target="_blank" rel="noopener" className="mt-4 block text-center py-2 rounded-xl text-sm font-semibold"
                style={{ background: "rgba(124,58,237,0.12)", color: "#a78bfa", border: "1px solid rgba(124,58,237,0.2)" }}>
                View Original Post →
              </a>
            )}
          </div>
        </>
      )}
    </div>
  );
}
