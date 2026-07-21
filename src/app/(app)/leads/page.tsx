"use client";

import { useState, useEffect, useRef, useMemo } from "react";
import { useQueryClient } from "@tanstack/react-query";
import {
  useLeads, useUpdateLead, useDeleteLead, useDiscoverLeads, useLeadDetail,
  useBusinesses, useGeneratedAssets,
  useWebsiteAudit, useSocialChatter,
} from "@/hooks/use-leads";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import { scoreColor, relativeTime } from "@/lib/utils";
import type { Lead, LeadStatus, Business, GeneratedAsset } from "@/lib/supabase/types";
import type { DemoReason } from "@/app/api/b2c/search/route";

// ─── Constants ────────────────────────────────────────────────────────────────

/**
 * Demo data means one of seven things went wrong. Four are server misconfiguration
 * and no amount of rewording the search will fix them — so say so plainly.
 */
const DEMO_REASON_MESSAGES: Record<DemoReason, string> = {
  no_ai_key: "the server has no OpenAI key configured. Set OPENAI_API_KEY and redeploy.",
  no_search_source: "no free search source responded. Reddit needs REDDIT_CLIENT_ID/SECRET to work from the server; DuckDuckGo throttles it. Open /api/b2c/diagnose.",
  search_api_error: "every search request was blocked or throttled. Usually Reddit is missing OAuth. Open /api/b2c/diagnose.",
  no_results: "the searches ran but found nothing local. Try a bigger nearby city, broaden the keywords, or check the location.",
  extraction_failed: "the AI call failed. Open /api/b2c/diagnose — it will name the cause.",
  extraction_truncated: "the AI response was cut off before it finished. Narrow the search and retry.",
  no_qualified_profiles: "conversations were found, but none were local buyers. Try broader keywords or a wider area.",
};

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

const B2C_PLATFORM: Record<string, { label: string; icon: string; color: string; dmVerb: string }> = {
  reddit:    { label: "Reddit",    icon: "🔴", color: "#ff4500", dmVerb: "Send DM" },
  twitter:   { label: "Twitter",   icon: "𝕏",  color: "#1da1f2", dmVerb: "Send DM" },
  youtube:   { label: "YouTube",   icon: "▶",  color: "#ff0000", dmVerb: "View Post" },
  google:    { label: "Google",    icon: "G",  color: "#4285f4", dmVerb: "View" },
  instagram: { label: "Instagram", icon: "📸", color: "#e040fb", dmVerb: "Send DM" },
  tiktok:    { label: "TikTok",    icon: "🎵", color: "#00f2ea", dmVerb: "View Profile" },
  facebook:  { label: "Facebook",  icon: "🔵", color: "#1877f2", dmVerb: "Message" },
  linkedin:  { label: "LinkedIn",  icon: "💼", color: "#0a66c2", dmVerb: "Connect" },
  yelp:      { label: "Yelp",      icon: "⭐", color: "#d32323", dmVerb: "View" },
  web:       { label: "Web",       icon: "🌐", color: "#6b7280", dmVerb: "View" },
};

interface SocialProfile {
  id: string;
  platform: string;
  username: string;
  display_name: string | null;
  first_name: string | null;
  last_name: string | null;
  profile_url: string | null;
  post_text: string;
  post_url: string | null;
  post_date: string | null;
  keywords_matched: string[];
  interest_score: number;
  purchase_intent: "browsing" | "researching" | "ready_to_buy" | null;
  consumer_signals: string[];
  is_seller: boolean;
  location_match?: "in_area" | "nearby" | "unknown";
  shopping_signals: {
    mentions_buying: boolean;
    platform_mentions: string[];
    frequency: "occasional" | "frequent" | null;
  };
  contact: {
    dm_url: string | null;
    type: "DM" | "Message" | "Inbox" | "Connect" | "View";
  };
  ai_message: string | null;
  similar_products: string[];
}

interface AudienceItem {
  id: string;
  name: string;
  members: Set<string>;
}

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
        <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "20px 24px", borderBottom: "1px solid var(--color-border-subtle)" }}>
          <button onClick={onClose} style={{ padding: 6, borderRadius: 8, background: "transparent", border: "none", cursor: "pointer", color: "var(--c3)" }}>
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M4 4l8 8M12 4l-8 8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" /></svg>
          </button>
          <div style={{ flex: 1 }}>
            {isLoading ? <div style={{ height: 20, width: 160, borderRadius: 6, background: "var(--color-surface-2)" }} /> :
              <h2 style={{ fontSize: 16, fontWeight: 700, color: "var(--c1)", margin: 0 }}>{lead?.name}</h2>}
          </div>
        </div>
        {isLoading ? (
          <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", color: "var(--c3)" }}>Loading lead...</div>
        ) : !lead ? (
          <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", color: "var(--c3)" }}>Lead not found</div>
        ) : (
          <div style={{ flex: 1, overflowY: "auto" }}>
            <div style={{ padding: "22px 24px", borderBottom: "1px solid var(--color-border-subtle)", display: "flex", flexDirection: "column", gap: 16 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
                <ScoreBar score={lead.score} />
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                  {(Object.keys(STATUS_MAP) as LeadStatus[]).map((s) => {
                    const style = STATUS_MAP[s];
                    const isActive = lead.status === s;
                    return (
                      <button key={s} onClick={() => handleStatusChange(s)}
                        style={{ fontSize: 12, fontWeight: 600, padding: "5px 12px", borderRadius: 8, transition: "all 0.15s", cursor: "pointer", border: "none", background: isActive ? style.bg : "var(--color-surface-2)", color: isActive ? style.color : "var(--c3)", outline: isActive ? `1px solid ${style.color}40` : "1px solid var(--color-border-subtle)", opacity: updateLead.isPending ? 0.6 : 1 }}>
                        {style.label}
                      </button>
                    );
                  })}
                </div>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
                {lead.company && <div><div style={{ fontSize: 11, marginBottom: 3, color: "var(--c3)", fontWeight: 500 }}>Company</div><div style={{ fontSize: 14, fontWeight: 500, color: "var(--c1)" }}>{lead.company}</div></div>}
                {lead.email && <div><div style={{ fontSize: 11, marginBottom: 3, color: "var(--c3)", fontWeight: 500 }}>Email</div><a href={`mailto:${lead.email}`} style={{ fontSize: 14, fontWeight: 500, color: "#a78bfa", textDecoration: "none" }}>{lead.email}</a></div>}
                {lead.phone && <div><div style={{ fontSize: 11, marginBottom: 3, color: "var(--c3)", fontWeight: 500 }}>Phone</div><div style={{ fontSize: 14, color: "var(--c2)" }}>{lead.phone}</div></div>}
                {lead.platform && <div><div style={{ fontSize: 11, marginBottom: 3, color: "var(--c3)", fontWeight: 500 }}>Platform</div><PlatformBadge platform={lead.platform} /></div>}
                {lead.industry && <div><div style={{ fontSize: 11, marginBottom: 3, color: "var(--c3)", fontWeight: 500 }}>Industry</div><div style={{ fontSize: 14, color: "var(--c2)" }}>{lead.industry}</div></div>}
                {lead.location && <div><div style={{ fontSize: 11, marginBottom: 3, color: "var(--c3)", fontWeight: 500 }}>Location</div><div style={{ fontSize: 14, color: "var(--c2)" }}>{lead.location}</div></div>}
              </div>
              {lead.tags && lead.tags.length > 0 && (
                <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                  {lead.tags.map((tag) => <span key={tag} style={{ fontSize: 12, padding: "3px 10px", borderRadius: 6, background: "rgba(124,58,237,0.1)", color: "#a78bfa", border: "1px solid rgba(124,58,237,0.2)" }}>{tag}</span>)}
                </div>
              )}
            </div>
            {lead.notes && (
              <div style={{ padding: "18px 24px", borderBottom: "1px solid var(--color-border-subtle)" }}>
                <div style={{ fontSize: 11, fontWeight: 600, marginBottom: 8, color: "var(--c3)", letterSpacing: "0.06em" }}>NOTES</div>
                <p style={{ fontSize: 14, lineHeight: 1.65, color: "var(--c2)" }}>{lead.notes}</p>
              </div>
            )}
            <div style={{ padding: "18px 24px", borderBottom: "1px solid var(--color-border-subtle)" }}>
              <div style={{ fontSize: 11, fontWeight: 600, marginBottom: 8, color: "var(--c3)", letterSpacing: "0.06em" }}>ADD NOTE</div>
              <textarea value={note} onChange={(e) => setNote(e.target.value)} rows={3} placeholder="Add a note..." style={{ width: "100%", padding: "10px 14px", borderRadius: 10, fontSize: 14, outline: "none", resize: "none", background: "var(--color-surface-2)", border: "1px solid var(--color-border-subtle)", color: "var(--c1)", lineHeight: 1.6 }} />
              <button onClick={handleSaveNote} disabled={!note.trim() || savingNote} style={{ marginTop: 8, padding: "8px 16px", borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: "pointer", border: "none", background: note.trim() ? "rgba(124,58,237,0.15)" : "var(--color-surface-2)", color: note.trim() ? "#a78bfa" : "var(--c3)", outline: `1px solid ${note.trim() ? "rgba(124,58,237,0.3)" : "var(--color-border-subtle)"}` }}>
                {savingNote ? "Saving..." : "Save Note"}
              </button>
            </div>
            <div style={{ padding: "18px 24px" }}>
              <div style={{ fontSize: 11, fontWeight: 600, marginBottom: 12, color: "var(--c3)", letterSpacing: "0.06em" }}>ACTIVITY TIMELINE</div>
              {activities.length === 0 ? (
                <p style={{ fontSize: 14, color: "var(--c3)" }}>No activity recorded yet.</p>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: 12, position: "relative" }}>
                  <div style={{ position: "absolute", left: 10, top: 8, bottom: 8, width: 1, background: "var(--color-border-subtle)" }} />
                  {(activities as Array<{ id: string; type: string; description: string; created_at: string }>).map((act) => (
                    <div key={act.id} style={{ display: "flex", gap: 12, position: "relative", paddingLeft: 28 }}>
                      <div style={{ position: "absolute", left: 0, top: 6, width: 20, height: 20, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", background: "var(--color-surface-2)", border: "1px solid var(--color-border)" }}>
                        <div style={{ width: 6, height: 6, borderRadius: "50%", background: "#7c3aed" }} />
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 13, fontWeight: 500, color: "var(--c1)" }}>{act.type.replace(/_/g, " ")}</div>
                        {act.description && <div style={{ fontSize: 12, marginTop: 2, color: "var(--c3)" }}>{act.description}</div>}
                        <div style={{ fontSize: 11, marginTop: 4, color: "var(--c4)" }}>{relativeTime(act.created_at)}</div>
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

// ─── Website Audit Section ────────────────────────────────────────────────────

function WebsiteAuditSection({ bizId }: { bizId: string }) {
  const [open, setOpen] = useState(false);
  const { data, isLoading, error } = useWebsiteAudit(open ? bizId : null);
  const audit = data?.audit;

  const ScorePill = ({ score, label }: { score: number; label: string }) => {
    const color = score >= 70 ? "#34d399" : score >= 45 ? "#fbbf24" : "#f87171";
    return (
      <div className="text-center px-3 py-2 rounded-xl" style={{ background: `${color}10`, border: `1px solid ${color}30` }}>
        <div className="text-lg font-bold" style={{ color }}>{score}</div>
        <div className="text-[10px]" style={{ color: "var(--color-text-muted)" }}>{label}</div>
      </div>
    );
  };

  return (
    <div style={{ borderBottom: "1px solid var(--color-border-subtle)" }}>
      <button
        className="w-full flex items-center justify-between px-6 py-3.5"
        onClick={() => setOpen((v) => !v)}
        style={{ background: open ? "rgba(14,165,233,0.05)" : "transparent" }}
      >
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold" style={{ color: "#0ea5e9" }}>🔍 WEBSITE AUDIT</span>
          {data?.cached && <span className="text-[10px] px-1.5 py-0.5 rounded" style={{ background: "rgba(14,165,233,0.1)", color: "#0ea5e9" }}>cached</span>}
          {isLoading && <span className="text-[10px]" style={{ color: "var(--color-text-muted)" }}>Running...</span>}
        </div>
        <svg width="12" height="12" viewBox="0 0 12 12" fill="none" style={{ color: "var(--color-text-muted)", transform: open ? "rotate(180deg)" : "none", transition: "transform 0.2s" }}>
          <path d="M2 4l4 4 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>

      {open && (
        <div className="px-6 pb-5">
          {isLoading && (
            <div className="flex items-center gap-3 py-4">
              <div className="w-4 h-4 rounded-full border-2 border-t-transparent animate-spin" style={{ borderColor: "#0ea5e9", borderTopColor: "transparent" }} />
              <span className="text-xs" style={{ color: "var(--color-text-muted)" }}>Scanning website and analyzing with AI…</span>
            </div>
          )}
          {error && <p className="text-xs py-3" style={{ color: "#f87171" }}>Audit failed — {error.message}</p>}
          {data?.error && <p className="text-xs py-3" style={{ color: "var(--color-text-muted)" }}>{data.error}</p>}
          {audit && (
            <div className="space-y-4">
              {/* Score row */}
              <div className="grid grid-cols-4 gap-2 pt-1">
                <ScorePill score={audit.overall_score} label="Overall" />
                <ScorePill score={audit.seo.score} label="SEO" />
                <ScorePill score={audit.design.score} label="Design" />
                <ScorePill score={audit.conversion.score} label="Conversion" />
              </div>

              {/* Opportunity */}
              <div className="px-3 py-3 rounded-xl text-xs leading-relaxed" style={{ background: "rgba(14,165,233,0.07)", color: "var(--color-text-1)", border: "1px solid rgba(14,165,233,0.15)" }}>
                💡 {audit.opportunity}
              </div>

              {/* Issues */}
              {audit.seo.issues.length > 0 && (
                <div>
                  <div className="text-[10px] font-semibold mb-1.5" style={{ color: "#f87171" }}>SEO ISSUES</div>
                  <ul className="space-y-1">
                    {audit.seo.issues.map((issue, i) => (
                      <li key={i} className="text-xs flex gap-2" style={{ color: "var(--color-text-2)" }}>
                        <span style={{ color: "#f87171" }}>✕</span>{issue}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              {audit.conversion.issues.length > 0 && (
                <div>
                  <div className="text-[10px] font-semibold mb-1.5" style={{ color: "#fbbf24" }}>CONVERSION GAPS</div>
                  <ul className="space-y-1">
                    {audit.conversion.issues.map((issue, i) => (
                      <li key={i} className="text-xs flex gap-2" style={{ color: "var(--color-text-2)" }}>
                        <span style={{ color: "#fbbf24" }}>△</span>{issue}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Recommendations */}
              <div>
                <div className="text-[10px] font-semibold mb-1.5" style={{ color: "#34d399" }}>TOP RECOMMENDATIONS</div>
                <ol className="space-y-1.5">
                  {audit.recommendations.map((rec, i) => (
                    <li key={i} className="text-xs flex gap-2" style={{ color: "var(--color-text-2)" }}>
                      <span className="font-bold flex-shrink-0" style={{ color: "#34d399" }}>{i + 1}.</span>{rec}
                    </li>
                  ))}
                </ol>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Social Chatter Section ───────────────────────────────────────────────────

function SocialChatterSection({ bizId }: { bizId: string }) {
  const [open, setOpen] = useState(false);
  const { data, isLoading, error } = useSocialChatter(open ? bizId : null);
  const social = data?.social;

  const sentimentColor: Record<string, string> = {
    positive: "#34d399", negative: "#f87171", mixed: "#fbbf24", neutral: "#6b7280",
  };
  const platformEmoji: Record<string, string> = {
    "Google Reviews": "⭐", Yelp: "🔴", Facebook: "📘", Instagram: "📸",
    Reddit: "🤖", Twitter: "🐦", "Google Maps": "📍",
  };

  return (
    <div style={{ borderBottom: "1px solid var(--color-border-subtle)" }}>
      <button
        className="w-full flex items-center justify-between px-6 py-3.5"
        onClick={() => setOpen((v) => !v)}
        style={{ background: open ? "rgba(168,85,247,0.05)" : "transparent" }}
      >
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold" style={{ color: "#a855f7" }}>📡 SOCIAL CHATTER</span>
          {data?.cached && <span className="text-[10px] px-1.5 py-0.5 rounded" style={{ background: "rgba(168,85,247,0.1)", color: "#a855f7" }}>cached</span>}
          {isLoading && <span className="text-[10px]" style={{ color: "var(--color-text-muted)" }}>Scanning...</span>}
        </div>
        <svg width="12" height="12" viewBox="0 0 12 12" fill="none" style={{ color: "var(--color-text-muted)", transform: open ? "rotate(180deg)" : "none", transition: "transform 0.2s" }}>
          <path d="M2 4l4 4 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>

      {open && (
        <div className="px-6 pb-5">
          {isLoading && (
            <div className="flex items-center gap-3 py-4">
              <div className="w-4 h-4 rounded-full border-2 border-t-transparent animate-spin" style={{ borderColor: "#a855f7", borderTopColor: "transparent" }} />
              <span className="text-xs" style={{ color: "var(--color-text-muted)" }}>Scanning online conversations…</span>
            </div>
          )}
          {error && <p className="text-xs py-3" style={{ color: "#f87171" }}>Scan failed — {error.message}</p>}
          {social && (
            <div className="space-y-4">
              {/* Opportunity relevance */}
              <div className="px-3 py-3 rounded-xl text-xs leading-relaxed" style={{ background: "rgba(168,85,247,0.07)", color: "var(--color-text-1)", border: "1px solid rgba(168,85,247,0.15)" }}>
                🎯 {social.opportunity_relevance}
              </div>

              {/* Mentions */}
              <div className="space-y-2">
                {social.mentions.map((m, i) => {
                  const sc = sentimentColor[m.sentiment] ?? "#6b7280";
                  const emoji = platformEmoji[m.platform] ?? "💬";
                  return (
                    <div key={i} className="px-3 py-2.5 rounded-xl" style={{ background: "var(--color-surface-2)", border: "1px solid var(--color-border-subtle)" }}>
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="text-[10px] font-semibold" style={{ color: "var(--color-text-muted)" }}>{emoji} {m.platform}</span>
                        <div className="flex items-center gap-2">
                          {m.date && <span className="text-[10px]" style={{ color: "var(--color-text-muted)" }}>{m.date}</span>}
                          <span className="text-[10px] font-bold px-1.5 py-0.5 rounded" style={{ background: `${sc}15`, color: sc }}>{m.sentiment}</span>
                        </div>
                      </div>
                      <p className="text-xs leading-relaxed" style={{ color: "var(--color-text-2)" }}>&ldquo;{m.text}&rdquo;</p>
                      {m.url && (
                        <a href={m.url} target="_blank" rel="noopener" className="text-[10px] mt-1 inline-block" style={{ color: "#a78bfa" }}>View source →</a>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Summary */}
              <p className="text-xs leading-relaxed" style={{ color: "var(--color-text-muted)" }}>{social.sentiment_summary}</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Export Button ────────────────────────────────────────────────────────────

function ExportButton({ businesses, runLabel }: { businesses: Business[]; runLabel?: string }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  function exportCSV() {
    const headers = ["Name", "Score", "Industry", "Location", "Website", "Phone", "Rating", "Reviews", "Weakness", "Offer", "Pitch Angle"];
    const rows = businesses.map((b) => [
      b.name, b.opportunity_score, b.industry ?? "", b.location ?? "",
      b.website ?? "", b.phone ?? "", b.rating ?? "", b.reviews,
      b.weaknesses ?? "", b.recommended_offer ?? "", b.pitch_angle ?? "",
    ]);
    const csv = [headers, ...rows].map((r) => r.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url; a.download = `prospects-${runLabel ?? "export"}.csv`; a.click();
    URL.revokeObjectURL(url); setOpen(false);
  }

  async function exportExcel() {
    const { utils, writeFile } = await import("xlsx");
    const ws = utils.json_to_sheet(businesses.map((b) => ({
      Name: b.name, "Opp. Score": b.opportunity_score, Industry: b.industry ?? "",
      Location: b.location ?? "", Website: b.website ?? "", Phone: b.phone ?? "",
      Rating: b.rating ?? "", Reviews: b.reviews, Weaknesses: b.weaknesses ?? "",
      "Recommended Offer": b.recommended_offer ?? "", "Pitch Angle": b.pitch_angle ?? "",
      "Email Subject": b.email_subject ?? "", "Email Body": b.email_body ?? "",
    })));
    const wb = utils.book_new(); utils.book_append_sheet(wb, ws, "Prospects");
    writeFile(wb, `prospects-${runLabel ?? "export"}.xlsx`);
    setOpen(false);
  }

  async function exportPDF() {
    const { default: jsPDF } = await import("jspdf");
    const { default: autoTable } = await import("jspdf-autotable");
    const doc = new jsPDF({ orientation: "landscape" });
    doc.setFontSize(14);
    doc.text(`SignafyAI Prospects${runLabel ? ` — ${runLabel}` : ""}`, 14, 16);
    doc.setFontSize(9);
    doc.text(`Exported ${new Date().toLocaleDateString()}  ·  ${businesses.length} prospects`, 14, 22);
    autoTable(doc, {
      startY: 28,
      head: [["Name", "Score", "Location", "Website", "Weakness (summary)", "Recommended Offer"]],
      body: businesses.map((b) => [
        b.name, b.opportunity_score, b.location ?? "—", (b.website ?? "").replace(/^https?:\/\//, ""),
        (b.weaknesses ?? "").slice(0, 60), (b.recommended_offer ?? "").slice(0, 60),
      ]),
      headStyles: { fillColor: [124, 58, 237] },
      styles: { fontSize: 7, cellPadding: 3 },
      alternateRowStyles: { fillColor: [248, 247, 255] },
    });
    doc.save(`prospects-${runLabel ?? "export"}.pdf`); setOpen(false);
  }

  function exportAirtable() {
    window.open("https://airtable.com/", "_blank");
    setOpen(false);
    alert("To import to Airtable:\n1. Export as CSV first\n2. In Airtable → Create a base → Import → CSV file\n\nOr add your Airtable API key in Settings → Integrations for automatic sync (coming soon).");
  }

  function exportGSheets() {
    setOpen(false);
    alert("To import to Google Sheets:\n1. Export as CSV first\n2. In Google Sheets → File → Import → Upload the CSV\n\nOr add your Google Service Account in Settings → Integrations for automatic sync (coming soon).");
  }

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium"
        style={{ background: "var(--color-surface)", border: "1px solid var(--color-border)", color: "var(--color-text-2)" }}
      >
        <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M6 1v7M3 5l3 3 3-3M2 10h8" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" /></svg>
        Export
        <svg width="10" height="10" viewBox="0 0 10 10" fill="none"><path d="M2 3.5l3 3 3-3" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" /></svg>
      </button>
      {open && (
        <div className="absolute right-0 top-full mt-1.5 z-50 rounded-xl overflow-hidden" style={{ background: "var(--color-surface)", border: "1px solid var(--color-border)", boxShadow: "0 8px 24px rgba(0,0,0,0.2)", minWidth: 160 }}>
          {[
            { label: "📄 CSV", action: exportCSV },
            { label: "📊 Excel (.xlsx)", action: exportExcel },
            { label: "🖨 PDF", action: exportPDF },
            { label: "🗄 Airtable", action: exportAirtable },
            { label: "📋 Google Sheets", action: exportGSheets },
          ].map(({ label, action }) => (
            <button key={label} onClick={action} className="w-full text-left px-4 py-2.5 text-xs font-medium transition-colors"
              style={{ color: "var(--color-text-2)" }}
              onMouseEnter={(e) => { (e.currentTarget).style.background = "var(--color-surface-2)"; }}
              onMouseLeave={(e) => { (e.currentTarget).style.background = "transparent"; }}>
              {label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Business Prospect Drawer ─────────────────────────────────────────────────

function BusinessDrawer({ biz, onClose }: { biz: Business; onClose: () => void }) {
  const [copied, setCopied] = useState<string | null>(null);
  const [emailSubject, setEmailSubject] = useState(biz.email_subject ?? "");
  const [emailBody, setEmailBody] = useState(biz.email_body ?? "");
  const [generatingEmail, setGeneratingEmail] = useState(false);
  const [emailError, setEmailError] = useState("");

  const copy = (text: string, key: string) => {
    navigator.clipboard.writeText(text).then(() => { setCopied(key); setTimeout(() => setCopied(null), 1500); });
  };
  const { color } = scoreColor(biz.opportunity_score);
  const hasEmail = !!(emailSubject || emailBody);

  function openGmailDraft() {
    const to = biz.email ?? "";
    const subject = encodeURIComponent(emailSubject || `Quick question for ${biz.name}`);
    const body = encodeURIComponent(emailBody);
    window.open(`https://mail.google.com/mail/?view=cm&to=${to}&su=${subject}&body=${body}`, "_blank");
  }

  async function handleGenerateEmail() {
    setGeneratingEmail(true);
    setEmailError("");
    try {
      const res = await fetch(`/api/businesses/${biz.id}/email`, { method: "POST" });
      if (!res.ok) throw new Error("Generation failed");
      const data = await res.json() as { subject: string; body: string };
      setEmailSubject(data.subject);
      setEmailBody(data.body);
    } catch {
      setEmailError("Could not generate email. Check your AI configuration.");
    } finally {
      setGeneratingEmail(false);
    }
  }

  return (
    <>
      <div style={{ position: "fixed", inset: 0, zIndex: 40, background: "rgba(0,0,0,0.5)" }} onClick={onClose} />
      <div style={{ position: "fixed", right: 0, top: 0, bottom: 0, zIndex: 50, display: "flex", flexDirection: "column", overflow: "hidden", width: "min(580px, 100vw)", background: "var(--color-surface)", borderLeft: "1px solid var(--color-border)", boxShadow: "-16px 0 64px rgba(0,0,0,0.4)" }}>
        {/* Header */}
        <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "20px 24px", borderBottom: "1px solid var(--color-border-subtle)", flexShrink: 0 }}>
          <button onClick={onClose} style={{ padding: 6, borderRadius: 8, background: "transparent", border: "none", cursor: "pointer", color: "var(--color-text-muted)" }}>
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M4 4l8 8M12 4l-8 8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" /></svg>
          </button>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 15, fontWeight: 700, color: "var(--color-text-1)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{biz.name}</div>
            <div style={{ fontSize: 12, marginTop: 2, color: "var(--color-text-muted)" }}>{biz.location ?? biz.industry ?? "Business"}</div>
          </div>
          <div style={{ display: "flex", alignItems: "baseline", gap: 4 }}>
            <div style={{ fontSize: 22, fontWeight: 800, color, lineHeight: 1 }}>{biz.opportunity_score}</div>
            <div style={{ fontSize: 11, color: "var(--color-text-muted)" }}>score</div>
          </div>
        </div>

        <div style={{ flex: 1, overflowY: "auto" }}>
          {/* Contact info */}
          <div style={{ padding: "16px 24px", display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, borderBottom: "1px solid var(--color-border-subtle)" }}>
            {biz.website && <div><div style={{ fontSize: 11, marginBottom: 3, color: "var(--color-text-muted)", fontWeight: 500 }}>Website</div><a href={biz.website} target="_blank" rel="noopener" style={{ fontSize: 13, fontWeight: 500, color: "#a78bfa", textDecoration: "none" }}>{biz.website.replace(/^https?:\/\//, "")}</a></div>}
            {biz.phone && <div><div style={{ fontSize: 11, marginBottom: 3, color: "var(--color-text-muted)", fontWeight: 500 }}>Phone</div><a href={`tel:${biz.phone}`} style={{ fontSize: 13, color: "var(--color-text-2)", textDecoration: "none" }}>{biz.phone}</a></div>}
            {biz.email && <div><div style={{ fontSize: 11, marginBottom: 3, color: "var(--color-text-muted)", fontWeight: 500 }}>Email</div><a href={`mailto:${biz.email}`} style={{ fontSize: 13, color: "#a78bfa", textDecoration: "none" }}>{biz.email}</a></div>}
            {biz.address && <div><div style={{ fontSize: 11, marginBottom: 3, color: "var(--color-text-muted)", fontWeight: 500 }}>Address</div><div style={{ fontSize: 13, color: "var(--color-text-2)" }}>{biz.address}</div></div>}
            {biz.rating != null && (
              <div><div style={{ fontSize: 11, marginBottom: 3, color: "var(--color-text-muted)", fontWeight: 500 }}>Rating</div>
                <div style={{ fontSize: 13, fontWeight: 600, color: "#fbbf24" }}>★ {biz.rating} <span style={{ color: "var(--color-text-muted)", fontWeight: 400 }}>({biz.reviews} reviews)</span></div>
              </div>
            )}
          </div>

          {/* AI Intelligence */}
          {biz.weaknesses && (
            <div style={{ padding: "16px 24px", borderBottom: "1px solid var(--color-border-subtle)" }}>
              <div style={{ fontSize: 11, fontWeight: 700, marginBottom: 8, color: "#f87171", letterSpacing: "0.04em" }}>⚠ WEAKNESSES IDENTIFIED</div>
              <p style={{ margin: 0, fontSize: 13, lineHeight: 1.65, color: "var(--color-text-2)" }}>{biz.weaknesses}</p>
            </div>
          )}
          {biz.recommended_offer && (
            <div style={{ padding: "16px 24px", borderBottom: "1px solid var(--color-border-subtle)" }}>
              <div style={{ fontSize: 11, fontWeight: 700, marginBottom: 8, color: "#34d399", letterSpacing: "0.04em" }}>✦ RECOMMENDED OFFER</div>
              <p style={{ margin: 0, fontSize: 13, lineHeight: 1.65, color: "var(--color-text-2)" }}>{biz.recommended_offer}</p>
            </div>
          )}
          {biz.pitch_angle && (
            <div style={{ padding: "16px 24px", borderBottom: "1px solid var(--color-border-subtle)" }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: "#a78bfa", letterSpacing: "0.04em" }}>💡 PITCH ANGLE</div>
                <button onClick={() => copy(biz.pitch_angle!, "pitch")} style={{ fontSize: 11, padding: "2px 8px", borderRadius: 6, cursor: "pointer", border: "none", color: copied === "pitch" ? "#34d399" : "#a78bfa", background: "rgba(124,58,237,0.1)" }}>
                  {copied === "pitch" ? "Copied!" : "Copy"}
                </button>
              </div>
              <p style={{ margin: 0, fontSize: 13, lineHeight: 1.65, fontStyle: "italic", color: "var(--color-text-1)" }}>&ldquo;{biz.pitch_angle}&rdquo;</p>
            </div>
          )}

          {/* Outreach Email — always shown, generate if missing */}
          <div style={{ padding: "18px 24px", borderBottom: "1px solid var(--color-border-subtle)" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: "var(--color-text-muted)", letterSpacing: "0.04em" }}>✉ OUTREACH EMAIL</div>
              <div style={{ display: "flex", gap: 8 }}>
                {hasEmail && (
                  <button onClick={() => copy(`Subject: ${emailSubject}\n\n${emailBody}`, "email")} style={{ fontSize: 11, padding: "4px 10px", borderRadius: 6, cursor: "pointer", border: "none", color: copied === "email" ? "#34d399" : "#a78bfa", background: "rgba(124,58,237,0.1)", transition: "all 0.15s" }}>
                    {copied === "email" ? "Copied!" : "Copy"}
                  </button>
                )}
                <button
                  onClick={handleGenerateEmail}
                  disabled={generatingEmail}
                  style={{ fontSize: 11, padding: "4px 10px", borderRadius: 6, cursor: generatingEmail ? "not-allowed" : "pointer", border: "1px solid rgba(124,58,237,0.3)", color: "#a78bfa", background: "rgba(124,58,237,0.08)", transition: "all 0.15s", opacity: generatingEmail ? 0.6 : 1 }}
                  onMouseEnter={(e) => { if (!generatingEmail) (e.currentTarget).style.background = "rgba(124,58,237,0.15)"; }}
                  onMouseLeave={(e) => { (e.currentTarget).style.background = "rgba(124,58,237,0.08)"; }}
                >
                  {generatingEmail ? "Generating…" : hasEmail ? "↻ Regenerate" : "✦ Generate Email"}
                </button>
              </div>
            </div>

            {emailError && <p style={{ margin: "0 0 12px", fontSize: 12, color: "#f87171" }}>{emailError}</p>}

            {generatingEmail && (
              <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "16px 0" }}>
                <div style={{ width: 14, height: 14, borderRadius: "50%", border: "2px solid rgba(124,58,237,0.3)", borderTopColor: "#7c3aed", animation: "spin 0.8s linear infinite", flexShrink: 0 }} />
                <span style={{ fontSize: 12, color: "var(--color-text-muted)" }}>Writing a personalised email for {biz.name}…</span>
              </div>
            )}

            {!generatingEmail && hasEmail && (
              <>
                {/* Subject line */}
                <div style={{ padding: "10px 14px", borderRadius: 10, marginBottom: 10, background: "rgba(124,58,237,0.07)", border: "1px solid rgba(124,58,237,0.18)" }}>
                  <div style={{ fontSize: 10, fontWeight: 700, color: "#a78bfa", letterSpacing: "0.06em", marginBottom: 4 }}>SUBJECT</div>
                  <div style={{ fontSize: 13, fontWeight: 600, color: "var(--c1)" }}>{emailSubject}</div>
                </div>
                {/* Body */}
                <div style={{ padding: "14px 16px", borderRadius: 10, marginBottom: 12, background: "var(--color-surface-2)", border: "1px solid var(--color-border-subtle)", fontSize: 13, lineHeight: 1.75, color: "var(--color-text-2)", whiteSpace: "pre-wrap" }}>
                  {emailBody}
                </div>
                {/* Gmail button */}
                <button
                  onClick={openGmailDraft}
                  style={{ width: "100%", display: "flex", alignItems: "center", justifyContent: "center", gap: 8, padding: "10px 18px", borderRadius: 10, fontSize: 13, fontWeight: 600, cursor: "pointer", border: "none", background: "linear-gradient(135deg, #ea4335 0%, #c5221f 100%)", color: "white", boxShadow: "0 3px 10px rgba(234,67,53,0.2)", transition: "opacity 0.15s" }}
                  onMouseEnter={(e) => { (e.currentTarget).style.opacity = "0.88"; }}
                  onMouseLeave={(e) => { (e.currentTarget).style.opacity = "1"; }}
                >
                  <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><rect x="1" y="2.5" width="12" height="9" rx="1.5" stroke="white" strokeWidth="1.3"/><path d="M1 4l6 4 6-4" stroke="white" strokeWidth="1.3" strokeLinecap="round"/></svg>
                  Open in Gmail
                </button>
              </>
            )}

            {!generatingEmail && !hasEmail && (
              <div style={{ padding: "20px 0", textAlign: "center" }}>
                <p style={{ margin: "0 0 4px", fontSize: 13, color: "var(--c3)" }}>No email drafted yet.</p>
                <p style={{ margin: 0, fontSize: 12, color: "var(--c4)" }}>Click Generate to write a personalised outreach email.</p>
              </div>
            )}
          </div>

          {/* Website Audit */}
          <WebsiteAuditSection bizId={biz.id} />

          {/* Social Chatter */}
          <SocialChatterSection bizId={biz.id} />

          <div style={{ padding: "14px 24px" }}>
            <div style={{ fontSize: 12, color: "var(--color-text-muted)" }}>
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
            <h2 className="text-base font-bold" style={{ color: "var(--color-text-1)" }}>Funnel Asset Bundle</h2>
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

function DiscoveryModal({
  onClose,
  onLaunched,
  onB2cSearchStart,
  initialMode = "b2b",
}: {
  onClose: () => void;
  onLaunched: (
    runId: string,
    market: string,
    n8nTriggered: boolean,
    b2cResult?: { profiles: SocialProfile[]; productContext: string; error?: string }
  ) => void;
  onB2cSearchStart?: () => void;
  initialMode?: "b2b" | "b2c" | "both";
}) {
  const discover = useDiscoverLeads();
  const [targetMarket, setTargetMarket] = useState<"b2b" | "b2c" | "both">(initialMode);
  const [targetDescription, setTargetDescription] = useState("");
  const [location, setLocation] = useState("");
  const [clientService, setClientService] = useState("");
  const [keywords, setKeywords] = useState("");
  const [minScore, setMinScore] = useState(40);
  const [generateLandingPage, setGenerateLandingPage] = useState(false);
  const [forClient, setForClient] = useState(false);
  const [saveName, setSaveName] = useState("");
  const [b2cPlatforms, setB2cPlatforms] = useState<string[]>(["reddit", "twitter", "linkedin", "instagram", "facebook", "tiktok", "youtube", "quora", "google", "craigslist", "yelp", "trustpilot"]);
  const [longTail, setLongTail] = useState("");
  const [b2cSearching, setB2cSearching] = useState(false);
  const [error, setError] = useState("");

  function toggleB2cPlatform(id: string) {
    setB2cPlatforms((prev) =>
      prev.includes(id) ? (prev.length > 1 ? prev.filter((s) => s !== id) : prev) : [...prev, id]
    );
  }

  async function handleLaunch() {
    setError("");
    if (!targetDescription.trim()) {
      setError("Describe who you want to target so the AI knows what to look for.");
      return;
    }

    const kwList = keywords.trim() ? keywords.split(",").map((k) => k.trim()).filter(Boolean) : undefined;
    const ltList = longTail.trim()
      ? longTail.split("\n").map((l) => l.trim()).filter(Boolean)
      : undefined;

    // B2C: call the conversation search API directly (no n8n)
    if (targetMarket === "b2c") {
      setB2cSearching(true);
      onB2cSearchStart?.(); // immediately switch tab + show loading in panel
      try {
        const resp = await fetch("/api/b2c/search", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            description: targetDescription.trim(),
            platforms: b2cPlatforms,
            keywords: kwList ?? [],
            product_context: clientService.trim() || undefined,
            location: location || undefined,
            radius_miles: 25, // local-only: search this area + towns within 25 miles
            long_tail: ltList ?? [],
          }),
          signal: AbortSignal.timeout(55000), // 55s client timeout — prevents infinite spinner
        });
        const data = await resp.json() as {
          profiles?: SocialProfile[];
          demo?: boolean;
          demo_reason?: DemoReason;
          hint?: string;
          error?: string;
        };
        if (!resp.ok) throw new Error(data.error ?? "Search failed");
        const profiles = data.profiles ?? [];
        if (data.demo) {
          // A demo fallback has seven distinct causes. Say which one, so the next
          // action is obvious instead of "try different keywords" for a 401.
          const reason = data.demo_reason;
          setError(
            reason && DEMO_REASON_MESSAGES[reason]
              ? `Demo results — ${DEMO_REASON_MESSAGES[reason]}`
              : `Demo results — ${data.hint ?? "the search returned nothing usable."}`
          );
        }
        onLaunched(`b2c-${Date.now()}`, "b2c", false, {
          profiles,
          productContext: clientService.trim(),
        });
        if (!data.demo) onClose();
      } catch (err) {
        const msg = err instanceof Error ? err.message : "Conversation search failed";
        setError(msg);
        // Pass error to parent panel so it shows even after modal closes
        onLaunched(`b2c-err-${Date.now()}`, "b2c", false, {
          profiles: [],
          productContext: clientService.trim(),
          error: msg,
        });
      } finally {
        setB2cSearching(false);
      }
      return;
    }

    // B2B (or "both"): call n8n discovery, plus run B2C if "both"
    try {
      const result = await discover.mutateAsync({
        target_market: targetMarket,
        target_description: targetDescription.trim(),
        location: location || undefined,
        client_service: clientService.trim() || undefined,
        keywords: kwList,
        min_score: minScore,
        b2c_sources: targetMarket === "both" ? (b2cPlatforms as Array<"reddit" | "twitter" | "yelp" | "youtube">) : undefined,
        generate_landing_page: targetMarket === "both" ? generateLandingPage || undefined : undefined,
        for_client: forClient || undefined,
        save_config_name: saveName.trim() || undefined,
      });

      // If "both", also run B2C search
      if (targetMarket === "both") {
        fetch("/api/b2c/search", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            description: targetDescription.trim(),
            platforms: b2cPlatforms,
            keywords: kwList ?? [],
            product_context: clientService.trim() || undefined,
            location: location || undefined,
            radius_miles: 25, // local-only: search this area + towns within 25 miles
            long_tail: ltList ?? [],
          }),
        })
          .then((r) => r.json() as Promise<{ profiles?: SocialProfile[] }>)
          .then((data) => {
            if (data.profiles?.length) {
              onLaunched(result.run_id, "both", result.n8n_triggered ?? false, {
                profiles: data.profiles,
                productContext: clientService.trim(),
              });
            }
          })
          .catch(() => {});
      }

      onLaunched(result.run_id, result.target_market ?? targetMarket, result.n8n_triggered ?? false);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Discovery failed");
    }
  }

  const marketOptions = [
    { id: "b2b"  as const, label: "B2B Prospects",        emoji: "🏢", desc: "AI finds scored businesses ready for outreach" },
    { id: "b2c"  as const, label: "B2C Conversations",    emoji: "💬", desc: "Find real people talking about what you sell" },
    { id: "both" as const, label: "Full Stack",            emoji: "⚡", desc: "Businesses + conversations + funnel assets" },
  ];

  const descPlaceholders: Record<typeof targetMarket, string> = {
    b2b:  "e.g. Marketing agencies in Austin TX running Facebook ads that need help with lead generation and client acquisition — be as specific as possible about size, tools, pain points",
    b2c:  "e.g. Homeowners on Reddit asking about HVAC repair in Phoenix who mentioned getting quotes but haven't hired anyone yet",
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
            <h2 className="text-lg font-bold" style={{ color: "var(--color-text-1)" }}>
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

          {/* ── Generate landing pages (B2B "both" only) ── */}
          {targetMarket === "both" && (
            <div className="flex items-center gap-3 px-3 py-2.5 rounded-xl"
              style={{ background: generateLandingPage ? "rgba(167,139,250,0.08)" : "var(--color-surface-2)", border: generateLandingPage ? "1px solid rgba(167,139,250,0.25)" : "1px solid var(--color-border-subtle)" }}>
              <div className="flex-1">
                <div className="text-xs font-semibold" style={{ color: generateLandingPage ? "#a78bfa" : "var(--color-text-2)" }}>Generate Landing Pages</div>
                <div className="text-[10px] mt-0.5" style={{ color: "var(--color-text-muted)" }}>AI creates opt-in pages for top signals</div>
              </div>
              <button onClick={() => setGenerateLandingPage((v) => !v)}
                className="w-10 h-5 rounded-full transition-all relative flex-shrink-0"
                style={{ background: generateLandingPage ? "#7c3aed" : "var(--color-surface)" }}>
                <span className="absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-all"
                  style={{ left: generateLandingPage ? "calc(100% - 18px)" : "2px" }} />
              </button>
            </div>
          )}

          {/* ── B2C: What you're selling ── */}
          {(targetMarket === "b2c" || targetMarket === "both") && (
            <div>
              <label className="text-xs font-semibold block mb-1.5" style={{ color: "var(--color-text-muted)" }}>
                WHAT YOU&apos;RE SELLING <span style={{ color: "#f87171" }}>*</span>
              </label>
              <input value={clientService} onChange={(e) => setClientService(e.target.value)}
                placeholder="e.g. HVAC repair services in Phoenix AZ starting at $89/visit"
                className={inputCls} style={inputStyle} onFocus={onFocusIn} onBlur={onFocusOut} />
              <div className="mt-1 text-[10px]" style={{ color: "var(--color-text-muted)" }}>
                Used to score relevance, find shopping signals, and craft personalized messages for each person found.
              </div>
            </div>
          )}

          {/* ── B2C Platform Sources ── */}
          {(targetMarket === "b2c" || targetMarket === "both") && (
            <div>
              <label className="text-xs font-semibold block mb-2" style={{ color: "var(--color-text-muted)" }}>
                PLATFORMS TO SEARCH <span style={{ color: "var(--color-text-muted)", fontWeight: 400 }}>(select at least 1)</span>
              </label>
              <div className="grid grid-cols-2 gap-2">
                {([
                  { id: "reddit",      label: "Reddit",        icon: "🔴", desc: "Forums · Q&A · community posts" },
                  { id: "twitter",     label: "Twitter / X",   icon: "𝕏",  desc: "Real-time · opinions · DMs" },
                  { id: "youtube",     label: "YouTube",       icon: "▶",  desc: "Comments · how-to · comparisons" },
                  { id: "google",      label: "Google / Web",  icon: "🌐", desc: "Reviews · blogs · forums" },
                  { id: "quora",       label: "Quora",         icon: "❓", desc: "Questions · answers · intent" },
                  { id: "yelp",        label: "Yelp",          icon: "⭐", desc: "Reviews · local · service seekers" },
                  { id: "trustpilot",  label: "Trustpilot",    icon: "✅", desc: "Reviews · comparisons · complaints" },
                  { id: "craigslist",  label: "Craigslist",    icon: "📋", desc: "Wanted · community · local services" },
                  { id: "instagram",   label: "Instagram",     icon: "📸", desc: "Posts · stories · hashtags" },
                  { id: "tiktok",      label: "TikTok",        icon: "🎵", desc: "Viral content · comments" },
                  { id: "facebook",    label: "Facebook",      icon: "🔵", desc: "Groups · Marketplace · comments" },
                  { id: "linkedin",    label: "LinkedIn",      icon: "💼", desc: "Professional posts · B2B signals" },
                ] as const).map(({ id, label, icon, desc }) => {
                  const active = b2cPlatforms.includes(id);
                  return (
                    <button key={id} onClick={() => toggleB2cPlatform(id)} type="button"
                      className="text-left px-3 py-2 rounded-xl text-xs transition-all"
                      style={{ background: active ? "rgba(124,58,237,0.12)" : "var(--color-surface-2)", border: active ? "1px solid rgba(124,58,237,0.35)" : "1px solid var(--color-border-subtle)", color: active ? "#a78bfa" : "var(--color-text-2)" }}>
                      <div className="font-semibold">{icon} {label}</div>
                      <div className="text-[10px] mt-0.5" style={{ color: active ? "#a78bfa88" : "var(--color-text-muted)" }}>{desc}</div>
                    </button>
                  );
                })}
              </div>

              {/* Long-tail queries */}
              <div className="mt-3">
                <label className="text-xs font-semibold block mb-1.5" style={{ color: "var(--color-text-muted)" }}>
                  LONG-TAIL &amp; ANSWER-BASED QUERIES <span style={{ color: "var(--color-text-muted)", fontWeight: 400 }}>(one per line, optional)</span>
                </label>
                <textarea
                  value={longTail}
                  onChange={(e) => setLongTail(e.target.value)}
                  rows={3}
                  placeholder={"best HVAC company Phoenix\nwhere to find AC repair near me\nhow much does HVAC repair cost"}
                  className="w-full px-3 py-2.5 rounded-xl text-sm outline-none resize-none transition-all"
                  style={{ ...inputStyle, lineHeight: "1.5", fontFamily: "monospace", fontSize: 11 }}
                  onFocus={onFocusIn}
                  onBlur={onFocusOut}
                />
                <div className="mt-1 text-[10px]" style={{ color: "var(--color-text-muted)" }}>
                  These are run as-is — great for question-style searches like &ldquo;how do I find...&rdquo; or &ldquo;best ... near me&rdquo;
                </div>
              </div>
            </div>
          )}

          {/* ── Min Score (B2B only) ── */}
          {targetMarket !== "b2c" && (
          <div>
            <label className="text-xs font-semibold block mb-1.5" style={{ color: "var(--color-text-muted)" }}>
              MINIMUM SCORE: <span style={{ color: "#a78bfa" }}>{minScore}</span>
            </label>
            <input type="range" min={0} max={100} step={5} value={minScore} onChange={(e) => setMinScore(Number(e.target.value))} className="w-full" style={{ accentColor: "#7c3aed" }} />
            <div className="flex justify-between text-[10px] mt-1" style={{ color: "var(--color-text-muted)" }}>
              <span>0 (all)</span><span>50 (recommended)</span><span>100 (perfect)</span>
            </div>
          </div>
          )}

          {/* ── Save config (B2B only) ── */}
          {targetMarket !== "b2c" && (
          <div>
            <label className="text-xs font-semibold block mb-1.5" style={{ color: "var(--color-text-muted)" }}>SAVE THIS SEARCH (optional)</label>
            <input value={saveName} onChange={(e) => setSaveName(e.target.value)}
              placeholder="e.g. Austin Marketing Agencies Q3"
              className={inputCls} style={inputStyle} onFocus={onFocusIn} onBlur={onFocusOut} />
          </div>
          )}

          {error && <div className="px-3 py-2 rounded-xl text-xs" style={{ background: "rgba(248,113,113,0.1)", color: "#f87171", border: "1px solid rgba(248,113,113,0.2)" }}>{error}</div>}

          <div className="flex gap-3 pt-1">
            <button onClick={onClose} className="flex-1 py-2.5 rounded-xl text-sm font-medium"
              style={{ background: "var(--color-surface-2)", border: "1px solid var(--color-border)", color: "var(--color-text-2)" }}>
              Cancel
            </button>
            <button
              onClick={handleLaunch}
              disabled={discover.isPending || b2cSearching}
              className="flex-1 py-2.5 rounded-xl text-sm font-semibold flex items-center justify-center gap-2"
              style={{ background: "linear-gradient(135deg, #7c3aed 0%, #4f46e5 100%)", color: "white", boxShadow: "0 4px 12px rgba(124,58,237,0.3)", opacity: (discover.isPending || b2cSearching) ? 0.7 : 1 }}>
              {(discover.isPending || b2cSearching) ? (
                <><div className="w-4 h-4 rounded-full border-2 border-white border-t-transparent animate-spin" />{targetMarket === "b2c" ? "Searching conversations..." : "Launching..."}</>
              ) : targetMarket === "b2c" ? (
                <>💬 Search Conversations</>
              ) : (
                <>🚀 Launch Discovery</>
              )}
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
          <h2 className="text-base font-bold" style={{ color: "var(--color-text-1)" }}>Add Lead Manually</h2>
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

type TabType = "leads" | "prospects" | "conversations" | "assets";

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
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
        <div style={{ flex: 1, minWidth: 220 }}>
          <SearchBar value={searchInput} onChange={(v) => { setSearchInput(v); if (!v) setSearch(""); }}
            placeholder="Search name, company, email..." />
        </div>
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
          {["all","new","contacted","qualified","converted","lost"].map((f) => (
            <button key={f} onClick={() => { setStatusFilter(f); setPage(1); }}
              style={{
                padding: "7px 14px", borderRadius: 10, fontSize: 12, fontWeight: 500, cursor: "pointer",
                textTransform: "capitalize", transition: "all 0.15s",
                background: statusFilter === f ? "rgba(124,58,237,0.15)" : "var(--color-surface)",
                border: statusFilter === f ? "1px solid rgba(124,58,237,0.3)" : "1px solid var(--color-border)",
                color: statusFilter === f ? "#a78bfa" : "var(--color-text-2)",
              }}>
              {f === "all" ? "All" : STATUS_MAP[f as LeadStatus]?.label ?? f}
            </button>
          ))}
        </div>
        <div style={{ display: "flex", borderRadius: 10, overflow: "hidden", border: "1px solid var(--color-border)" }}>
          {(["table","kanban"] as const).map((v) => (
            <button key={v} onClick={() => setView(v)}
              style={{
                padding: "7px 14px", fontSize: 12, fontWeight: 500, cursor: "pointer",
                textTransform: "capitalize" as const, transition: "background 0.15s",
                background: view === v ? "rgba(124,58,237,0.15)" : "var(--color-surface)",
                color: view === v ? "#a78bfa" : "var(--color-text-2)",
              }}>
              {v}
            </button>
          ))}
        </div>
      </div>

      {view === "table" ? (
        <div style={{ borderRadius: 16, overflow: "hidden", background: "var(--color-surface)", border: "1px solid var(--color-border)" }}>
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", fontSize: 14, borderCollapse: "collapse" }}>
              <thead>
                <tr style={{ borderBottom: "1px solid var(--color-border-subtle)" }}>
                  {[{key:"name",label:"Name"},{key:"company",label:"Company"},{key:"platform",label:"Platform"},{key:"score",label:"Score"},{key:"status",label:"Status"},{key:"industry",label:"Industry"},{key:"last_activity",label:"Last Activity"},{key:"_actions",label:""}].map(({ key, label }) => (
                    <th key={key}
                      style={{
                        textAlign: "left", padding: "14px 20px", fontSize: 11, fontWeight: 600,
                        letterSpacing: "0.03em", textTransform: "uppercase", whiteSpace: "nowrap",
                        cursor: key !== "_actions" ? "pointer" : "default",
                        userSelect: key !== "_actions" ? "none" : "auto",
                        color: sort.by === key ? "#a78bfa" : "var(--color-text-muted)",
                      }}
                      onClick={() => key !== "_actions" && handleSort(key)}>
                      {label}{sort.by === key && <span style={{ marginLeft: 4 }}>{sort.dir === "asc" ? "↑" : "↓"}</span>}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {isLoading ? Array.from({ length: 6 }).map((_, i) => (
                  <tr key={i} style={{ borderBottom: "1px solid var(--color-border-subtle)" }}>
                    {Array.from({ length: 8 }).map((__, j) => <td key={j} style={{ padding: "14px 20px" }}><div style={{ height: 16, borderRadius: 6, background: "var(--color-surface-2)", width: j === 0 ? 120 : 60 }} /></td>)}
                  </tr>
                )) : leads.length === 0 ? (
                  <tr><td colSpan={8} style={{ padding: "48px 20px", textAlign: "center", fontSize: 14, color: "var(--color-text-muted)" }}>
                    {search ? "No leads match your search." : "No leads yet. Run discovery to find prospects."}
                  </td></tr>
                ) : leads.map((lead) => {
                  const sc = scoreColor(lead.score);
                  const st = STATUS_MAP[lead.status];
                  const pc = lead.platform ? PLATFORM_COLORS[lead.platform] : "#6b7280";
                  return (
                    <tr key={lead.id} style={{ borderBottom: "1px solid var(--color-border-subtle)", cursor: "pointer", transition: "background 0.15s" }}
                      onMouseEnter={(e) => { (e.currentTarget).style.background = "var(--color-surface-2)"; }}
                      onMouseLeave={(e) => { (e.currentTarget).style.background = "transparent"; }}
                      onClick={() => onSelectLead(lead.id)}>
                      <td style={{ padding: "14px 20px", fontWeight: 500, color: "var(--color-text-1)" }}>{lead.name}</td>
                      <td style={{ padding: "14px 20px", color: "var(--color-text-2)" }}>{lead.company ?? "—"}</td>
                      <td style={{ padding: "14px 20px" }}>{lead.platform ? <span style={{ fontSize: 10, fontWeight: 700, padding: "3px 6px", borderRadius: 6, background: `${pc}18`, color: pc }}>{lead.platform.toUpperCase()}</span> : "—"}</td>
                      <td style={{ padding: "14px 20px" }}><ScoreBar score={lead.score} /></td>
                      <td style={{ padding: "14px 20px" }}><span style={{ fontSize: 12, fontWeight: 600, padding: "4px 10px", borderRadius: 8, background: st.bg, color: st.color }}>{st.label}</span></td>
                      <td style={{ padding: "14px 20px", fontSize: 13, color: "var(--color-text-2)" }}>{lead.industry ?? "—"}</td>
                      <td style={{ padding: "14px 20px", fontSize: 12, color: "var(--color-text-muted)" }}>{lead.last_activity ? relativeTime(lead.last_activity) : "—"}</td>
                      <td style={{ padding: "14px 20px" }} onClick={(e) => e.stopPropagation()}>
                        <button onClick={(e) => { e.stopPropagation(); if (confirm("Delete this lead?")) deleteLead.mutate(lead.id); }}
                          style={{ padding: "6px", borderRadius: 8, background: "transparent", border: "none", cursor: "pointer", color: "var(--color-text-muted)", transition: "color 0.15s" }}
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
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "12px 20px", borderTop: "1px solid var(--color-border-subtle)" }}>
              <span style={{ fontSize: 12, color: "var(--color-text-muted)" }}>{(page - 1) * 25 + 1}–{Math.min(page * 25, total)} of {total}</span>
              <div style={{ display: "flex", gap: 8 }}>
                <button disabled={page <= 1} onClick={() => setPage((p) => p - 1)} style={{ padding: "6px 14px", borderRadius: 8, fontSize: 12, fontWeight: 500, cursor: page <= 1 ? "not-allowed" : "pointer", background: "var(--color-surface-2)", color: "var(--color-text-2)", border: "1px solid var(--color-border-subtle)", opacity: page <= 1 ? 0.4 : 1 }}>Previous</button>
                <button disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)} style={{ padding: "6px 14px", borderRadius: 8, fontSize: 12, fontWeight: 500, cursor: page >= totalPages ? "not-allowed" : "pointer", background: "var(--color-surface-2)", color: "var(--color-text-2)", border: "1px solid var(--color-border-subtle)", opacity: page >= totalPages ? 0.4 : 1 }}>Next</button>
              </div>
            </div>
          )}
        </div>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: 16 }}>
          {kanbanGroups.map(({ status, leads: g }) => {
            const style = STATUS_MAP[status];
            return (
              <div key={status} style={{ borderRadius: 16, overflow: "hidden", background: "var(--color-surface)", border: "1px solid var(--color-border)" }}>
                <div style={{ padding: "12px 16px", display: "flex", alignItems: "center", justifyContent: "space-between", borderBottom: "1px solid var(--color-border-subtle)" }}>
                  <span style={{ fontSize: 12, fontWeight: 600, color: style.color }}>{style.label}</span>
                  <span style={{ fontSize: 11, fontWeight: 700, padding: "2px 6px", borderRadius: 6, background: style.bg, color: style.color }}>{g.length}</span>
                </div>
                <div style={{ padding: 8, display: "flex", flexDirection: "column", gap: 8, minHeight: 96 }}>
                  {g.length === 0 ? <div style={{ textAlign: "center", padding: "24px 0", fontSize: 12, color: "var(--color-text-muted)" }}>Empty</div> :
                    g.map((lead) => {
                      const sc = scoreColor(lead.score);
                      return (
                        <div key={lead.id} onClick={() => onSelectLead(lead.id)}
                          style={{ borderRadius: 10, padding: 12, cursor: "pointer", transition: "border-color 0.15s", background: "var(--color-surface-2)", border: "1px solid var(--color-border-subtle)" }}
                          onMouseEnter={(e) => { (e.currentTarget).style.borderColor = `${style.color}40`; }}
                          onMouseLeave={(e) => { (e.currentTarget).style.borderColor = "var(--color-border-subtle)"; }}>
                          <div style={{ fontSize: 12, fontWeight: 500, marginBottom: 2, color: "var(--color-text-1)" }}>{lead.name}</div>
                          {lead.company && <div style={{ fontSize: 11, marginBottom: 8, color: "var(--color-text-muted)" }}>{lead.company}</div>}
                          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                            <PlatformBadge platform={lead.platform} />
                            <span style={{ fontSize: 11, fontWeight: 700, color: sc.color }}>{lead.score}</span>
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

function BizCard({ biz, onSelectBiz }: { biz: Business; onSelectBiz: (b: Business) => void }) {
  const { color } = scoreColor(biz.opportunity_score);
  return (
    <div onClick={() => onSelectBiz(biz)} className="rounded-2xl p-5 cursor-pointer transition-all"
      style={{ background: "var(--color-surface)", border: "1px solid var(--color-border)" }}
      onMouseEnter={(e) => { (e.currentTarget).style.border = "1px solid rgba(124,58,237,0.3)"; (e.currentTarget).style.boxShadow = "0 8px 24px rgba(124,58,237,0.1)"; }}
      onMouseLeave={(e) => { (e.currentTarget).style.border = "1px solid var(--color-border)"; (e.currentTarget).style.boxShadow = "none"; }}>
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="flex-1 min-w-0">
          <div className="text-sm font-semibold truncate" style={{ color: "var(--color-text-1)" }}>{biz.name}</div>
          <div className="text-xs mt-0.5" style={{ color: "var(--color-text-muted)" }}>{biz.location ?? biz.industry ?? "—"}</div>
        </div>
        <div className="flex flex-col items-end flex-shrink-0">
          <div className="text-xl font-bold" style={{ color }}>{biz.opportunity_score}</div>
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
}

function ProspectsPanel({ onSelectBiz, activeRunId }: { onSelectBiz: (b: Business) => void; activeRunId?: string | null }) {
  const qc = useQueryClient();
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [collapsedRuns, setCollapsedRuns] = useState<Set<string>>(new Set());
  const [clearingAll, setClearingAll] = useState(false);
  const [clearingRun, setClearingRun] = useState<string | null>(null);

  async function handleClearAll() {
    if (!confirm(`Remove all ${allBiz.length} prospects? This cannot be undone.`)) return;
    setClearingAll(true);
    try {
      await fetch("/api/businesses", { method: "DELETE" });
      qc.invalidateQueries({ queryKey: ["businesses"] });
    } finally {
      setClearingAll(false);
    }
  }

  async function handleClearRun(runId: string, count: number) {
    if (!confirm(`Remove ${count} prospect${count !== 1 ? "s" : ""} from this scan? This cannot be undone.`)) return;
    setClearingRun(runId);
    try {
      await fetch(`/api/businesses?run_id=${encodeURIComponent(runId)}`, { method: "DELETE" });
      qc.invalidateQueries({ queryKey: ["businesses"] });
    } finally {
      setClearingRun(null);
    }
  }

  // Fetch ALL businesses (no per-run filter — we group client-side)
  const { data, isLoading } = useBusinesses({
    search: debouncedSearch || undefined,
    sort: "opportunity_score",
    per_page: 200,
  });
  const allBiz = data?.data ?? [];

  function onSearchChange(v: string) {
    setSearch(v);
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => setDebouncedSearch(v), 400);
  }

  // Group by run_id, newest first
  const runGroups = useMemo(() => {
    const map = new Map<string, Business[]>();
    const noRun: Business[] = [];
    allBiz.forEach((biz) => {
      if (!biz.run_id) { noRun.push(biz); return; }
      if (!map.has(biz.run_id)) map.set(biz.run_id, []);
      map.get(biz.run_id)!.push(biz);
    });
    const groups = Array.from(map.entries()).map(([runId, bizes]) => ({
      runId,
      bizes: bizes.sort((a, b) => b.opportunity_score - a.opportunity_score),
      latestAt: Math.max(...bizes.map((b) => new Date(b.created_at).getTime())),
      industry: bizes[0]?.industry ?? null,
      location: bizes[0]?.location ?? null,
      avgScore: Math.round(bizes.reduce((s, b) => s + b.opportunity_score, 0) / bizes.length),
    }));
    groups.sort((a, b) => b.latestAt - a.latestAt);
    if (noRun.length > 0) groups.push({ runId: "__no_run", bizes: noRun, latestAt: 0, industry: null, location: null, avgScore: 0 });
    return groups;
  }, [allBiz]);

  // Auto-expand the active run; collapse others if it's new
  useEffect(() => {
    if (activeRunId) {
      setCollapsedRuns((prev) => {
        const next = new Set(prev);
        next.delete(activeRunId); // ensure active run is expanded
        return next;
      });
    }
  }, [activeRunId]);

  function toggleCollapse(runId: string) {
    setCollapsedRuns((prev) => {
      const next = new Set(prev);
      if (next.has(runId)) next.delete(runId); else next.add(runId);
      return next;
    });
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
      {/* Toolbar */}
      <div className="flex gap-3 flex-wrap">
        <SearchBar value={search} onChange={onSearchChange} placeholder="Search businesses, location, service..." />
        {allBiz.length > 0 && (
          <div className="text-xs py-2 px-3 rounded-xl flex items-center" style={{ background: "var(--color-surface)", border: "1px solid var(--color-border)", color: "var(--color-text-muted)", whiteSpace: "nowrap" }}>
            {allBiz.length} total
          </div>
        )}
        {allBiz.length > 0 && <ExportButton businesses={allBiz} runLabel={runGroups[0]?.industry ?? undefined} />}
        {allBiz.length > 0 && (
          <button
            onClick={handleClearAll}
            disabled={clearingAll}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold transition-all"
            style={{ background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.2)", color: "#ef4444", cursor: clearingAll ? "not-allowed" : "pointer", opacity: clearingAll ? 0.6 : 1, whiteSpace: "nowrap" }}
            onMouseEnter={e => { if (!clearingAll) (e.currentTarget).style.background = "rgba(239,68,68,0.14)"; }}
            onMouseLeave={e => { (e.currentTarget).style.background = "rgba(239,68,68,0.08)"; }}
          >
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M2 3h8M4 3V2h4v1M5 5v4M7 5v4M2.5 3l.5 7h6l.5-7" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"/></svg>
            {clearingAll ? "Clearing…" : "Clear All"}
          </button>
        )}
      </div>

      {runGroups.length === 0 ? (
        <EmptyState icon="🏢" title="No prospects yet" desc="Run B2B discovery to find AI-scored businesses ready for outreach." />
      ) : (
        <div className="space-y-5">
          {runGroups.map((group, idx) => {
            const isActive = group.runId === activeRunId;
            const isLatest = idx === 0;
            const isCollapsed = collapsedRuns.has(group.runId);
            const runDate = group.latestAt ? new Date(group.latestAt) : null;
            const label = group.industry
              ? `${group.industry}${group.location ? ` · ${group.location}` : ""}`
              : group.location ?? "Discovery Run";
            const dateLabel = runDate ? runDate.toLocaleDateString("en-US", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" }) : "";

            return (
              <div key={group.runId}>
                {/* Run header */}
                <div className="flex items-center gap-3 mb-3">
                  <button
                    className="flex items-center gap-2.5 flex-1 min-w-0"
                    onClick={() => toggleCollapse(group.runId)}
                  >
                    {/* Collapse chevron */}
                    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" style={{ color: "var(--color-text-muted)", transform: isCollapsed ? "rotate(-90deg)" : "none", transition: "transform 0.2s", flexShrink: 0 }}>
                      <path d="M3 5l4 4 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                    <div className="flex items-center gap-2 flex-1 min-w-0">
                      {isActive && (
                        <div className="w-2 h-2 rounded-full animate-pulse flex-shrink-0" style={{ background: "#34d399" }} />
                      )}
                      {isLatest && !isActive && (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full flex-shrink-0" style={{ background: "rgba(124,58,237,0.15)", color: "#a78bfa" }}>LATEST</span>
                      )}
                      <span className="text-sm font-semibold truncate" style={{ color: "var(--color-text-1)" }}>{label}</span>
                      <span className="text-xs px-2 py-0.5 rounded-lg flex-shrink-0" style={{ background: "var(--color-surface-2)", color: "var(--color-text-muted)" }}>
                        {group.bizes.length} prospects
                      </span>
                      <span className="text-xs flex-shrink-0" style={{ color: "var(--color-text-muted)" }}>avg {group.avgScore}</span>
                    </div>
                  </button>
                  {dateLabel && <span className="text-[10px] flex-shrink-0" style={{ color: "var(--color-text-muted)" }}>{dateLabel}</span>}
                  {/* Per-run export */}
                  <ExportButton businesses={group.bizes} runLabel={group.industry ?? group.runId.slice(0, 8)} />
                  {group.runId !== "__no_run" && (
                    <button
                      onClick={() => handleClearRun(group.runId, group.bizes.length)}
                      disabled={clearingRun === group.runId}
                      title="Remove this scan's results"
                      className="flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-semibold transition-all flex-shrink-0"
                      style={{ background: "rgba(239,68,68,0.07)", border: "1px solid rgba(239,68,68,0.18)", color: "#f87171", cursor: clearingRun === group.runId ? "not-allowed" : "pointer", opacity: clearingRun === group.runId ? 0.5 : 1 }}
                      onMouseEnter={e => { if (!clearingRun) (e.currentTarget).style.background = "rgba(239,68,68,0.13)"; }}
                      onMouseLeave={e => { (e.currentTarget).style.background = "rgba(239,68,68,0.07)"; }}
                    >
                      {clearingRun === group.runId ? "…" : "×"} Clear
                    </button>
                  )}
                </div>

                {/* Active run live-update banner */}
                {isActive && (
                  <div className="flex items-center gap-2 px-3 py-2 rounded-xl mb-3 text-xs" style={{ background: "rgba(52,211,153,0.07)", border: "1px solid rgba(52,211,153,0.2)", color: "#34d399" }}>
                    <div className="w-1.5 h-1.5 rounded-full animate-pulse flex-shrink-0" style={{ background: "#34d399" }} />
                    Results updating live as AI processes each business
                  </div>
                )}

                {/* Business cards */}
                {!isCollapsed && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {group.bizes.map((biz) => (
                      <BizCard key={biz.id} biz={biz} onSelectBiz={onSelectBiz} />
                    ))}
                  </div>
                )}

                {/* Divider between runs */}
                {idx < runGroups.length - 1 && (
                  <div className="mt-5" style={{ borderBottom: "1px solid var(--color-border-subtle)" }} />
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ─── Social Profile Card ──────────────────────────────────────────────────────

function SocialProfileCard({
  profile,
  selected,
  onSelect,
  onClick,
  audiences,
  saved,
  onSave,
  connectedPlatforms,
  connectedHandle,
}: {
  profile: SocialProfile;
  selected: boolean;
  onSelect: () => void;
  onClick: () => void;
  audiences: AudienceItem[];
  saved?: boolean;
  onSave?: () => void;
  connectedPlatforms?: string[];
  connectedHandle?: Record<string, string>;
}) {
  const { color: ic } = scoreColor(profile.interest_score);
  const pInfo = B2C_PLATFORM[profile.platform] ?? { label: profile.platform, color: "#6b7280", icon: "🌐", dmVerb: "View" };

  const intentBadge: Record<string, { label: string; color: string }> = {
    ready_to_buy: { label: "Ready to Buy", color: "#34d399" },
    researching:  { label: "Researching",  color: "#60a5fa" },
    browsing:     { label: "Browsing",     color: "#a78bfa" },
  };
  const intent = profile.purchase_intent ? intentBadge[profile.purchase_intent] : null;
  const isConnected = connectedPlatforms?.includes(profile.platform);
  const replyHandle = connectedHandle?.[profile.platform];

  return (
    <div
      className="rounded-2xl overflow-hidden cursor-pointer transition-all"
      style={{
        background: "var(--color-surface)",
        border: selected ? "1px solid rgba(124,58,237,0.45)" : "1px solid var(--color-border)",
        boxShadow: selected ? "0 0 0 2px rgba(124,58,237,0.12)" : "none",
      }}
      onClick={onClick}
      onMouseEnter={(e) => { if (!selected) (e.currentTarget as HTMLElement).style.border = "1px solid rgba(124,58,237,0.25)"; }}
      onMouseLeave={(e) => { if (!selected) (e.currentTarget as HTMLElement).style.border = "1px solid var(--color-border)"; }}
    >
      {/* Card header */}
      <div className="flex items-center justify-between px-4 pt-4 pb-2">
        <div className="flex items-center gap-2 min-w-0">
          {/* Checkbox */}
          <button
            onClick={(e) => { e.stopPropagation(); onSelect(); }}
            className="w-4 h-4 rounded flex-shrink-0 flex items-center justify-center border transition-all"
            style={{ background: selected ? "#7c3aed" : "transparent", border: selected ? "1px solid #7c3aed" : "1px solid var(--color-border)" }}>
            {selected && <svg width="8" height="8" viewBox="0 0 8 8" fill="none"><path d="M1.5 4l2 2 3-3" stroke="white" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"/></svg>}
          </button>
          {/* Platform badge */}
          <span className="text-xs font-bold px-2 py-0.5 rounded-md flex-shrink-0"
            style={{ background: `${pInfo.color}18`, color: pInfo.color }}>
            {pInfo.icon} {pInfo.label}
          </span>
          {/* Username handle */}
          <span className="text-xs font-mono truncate" style={{ color: "var(--color-text-muted)" }}>
            @{profile.username}
          </span>
          {/* Local match badge — greenlights leads in the target area */}
          {profile.location_match === "in_area" && (
            <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded flex-shrink-0"
              style={{ background: "rgba(52,211,153,0.15)", color: "#34d399" }}>
              📍 In area
            </span>
          )}
          {profile.location_match === "nearby" && (
            <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded flex-shrink-0"
              style={{ background: "rgba(96,165,250,0.15)", color: "#60a5fa" }}>
              📍 Nearby
            </span>
          )}
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          {/* Save button */}
          {onSave && (
            <button
              onClick={(e) => { e.stopPropagation(); onSave(); }}
              title={saved ? "Unsave" : "Save profile"}
              className="p-1 rounded transition-all"
              style={{ color: saved ? "#fbbf24" : "var(--color-text-muted)", background: saved ? "rgba(251,191,36,0.1)" : "transparent" }}>
              <svg width="13" height="13" viewBox="0 0 13 13" fill="none">
                <path d="M6.5 1.5l1.4 3.1 3.3.4-2.4 2.4.6 3.3L6.5 9l-2.9 1.7.6-3.3L1.8 5l3.3-.4z"
                  stroke="currentColor" strokeWidth="1.2" strokeLinejoin="round"
                  fill={saved ? "currentColor" : "none"} />
              </svg>
            </button>
          )}
          {/* Interest score */}
          <div className="text-right">
            <div className="text-base font-bold tabular-nums" style={{ color: ic }}>{profile.interest_score}</div>
            <div className="text-[9px]" style={{ color: "var(--color-text-muted)" }}>interest</div>
          </div>
        </div>
      </div>

      {/* Identity row — distinct name fields */}
      <div className="px-4 pb-2 flex items-center gap-3 flex-wrap">
        {profile.first_name && (
          <div className="flex items-baseline gap-1">
            <span className="text-[9px] font-semibold uppercase tracking-wider" style={{ color: "var(--color-text-muted)" }}>First</span>
            <span className="text-sm font-semibold" style={{ color: "var(--color-text-1)" }}>{profile.first_name}</span>
          </div>
        )}
        {profile.last_name && (
          <div className="flex items-baseline gap-1">
            <span className="text-[9px] font-semibold uppercase tracking-wider" style={{ color: "var(--color-text-muted)" }}>Last</span>
            <span className="text-sm font-semibold" style={{ color: "var(--color-text-1)" }}>{profile.last_name}</span>
          </div>
        )}
        {!profile.first_name && !profile.last_name && profile.display_name && (
          <div className="flex items-baseline gap-1">
            <span className="text-[9px] font-semibold uppercase tracking-wider" style={{ color: "var(--color-text-muted)" }}>Name</span>
            <span className="text-sm" style={{ color: "var(--color-text-2)" }}>{profile.display_name}</span>
          </div>
        )}
      </div>

      {/* Post text */}
      <div className="px-4 pb-3">
        <p className="text-xs leading-relaxed line-clamp-3" style={{ color: "var(--color-text-2)", borderLeft: `2px solid ${ic}44`, paddingLeft: 10 }}>
          &ldquo;{profile.post_text}&rdquo;
        </p>
      </div>

      {/* Badges row */}
      <div className="px-4 pb-3 flex flex-wrap gap-1.5">
        {intent && (
          <span className="text-[10px] font-semibold px-2 py-0.5 rounded-md"
            style={{ background: `${intent.color}18`, color: intent.color }}>
            {intent.label}
          </span>
        )}
        {profile.shopping_signals.mentions_buying && (
          <span className="text-[10px] font-medium px-2 py-0.5 rounded-md"
            style={{ background: "rgba(251,191,36,0.12)", color: "#fbbf24" }}>
            💳 Mentions buying
          </span>
        )}
        {profile.shopping_signals.platform_mentions.map((p) => (
          <span key={p} className="text-[10px] font-medium px-2 py-0.5 rounded-md capitalize"
            style={{ background: "var(--color-surface-2)", color: "var(--color-text-muted)" }}>
            {p}
          </span>
        ))}
        {profile.keywords_matched.slice(0, 3).map((kw) => (
          <span key={kw} className="text-[10px] px-2 py-0.5 rounded-md"
            style={{ background: "rgba(124,58,237,0.08)", color: "#a78bfa" }}>
            {kw}
          </span>
        ))}
      </div>

      {/* Similar products */}
      {profile.similar_products.length > 0 && (
        <div className="px-4 pb-3">
          <div className="text-[9px] font-semibold mb-1" style={{ color: "var(--color-text-muted)" }}>ALSO INTERESTED IN</div>
          <div className="flex flex-wrap gap-1">
            {profile.similar_products.slice(0, 3).map((p) => (
              <span key={p} className="text-[10px] px-2 py-0.5 rounded-md"
                style={{ background: "var(--color-surface-2)", color: "var(--color-text-2)" }}>
                {p}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Action row */}
      <div
        className="px-4 py-3 flex items-center gap-2 flex-wrap"
        style={{ borderTop: "1px solid var(--color-border-subtle)" }}
        onClick={(e) => e.stopPropagation()}
      >
        {profile.contact.dm_url && (
          <a
            href={profile.contact.dm_url}
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs px-3 py-1.5 rounded-lg font-semibold transition-all"
            style={{ background: `${pInfo.color}14`, color: pInfo.color, border: `1px solid ${pInfo.color}30` }}
            onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = `${pInfo.color}28`; }}
            onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = `${pInfo.color}14`; }}
          >
            → {pInfo.dmVerb}
          </a>
        )}
        {isConnected && replyHandle && profile.contact.dm_url && (
          <a
            href={profile.contact.dm_url}
            target="_blank"
            rel="noopener noreferrer"
            className="text-[10px] px-2 py-1 rounded-lg font-semibold"
            style={{ background: "rgba(52,211,153,0.1)", color: "#34d399", border: "1px solid rgba(52,211,153,0.25)" }}
          >
            ↩ Reply as @{replyHandle}
          </a>
        )}
        {profile.profile_url && (
          <a
            href={profile.profile_url}
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs px-3 py-1.5 rounded-lg transition-all"
            style={{ background: "var(--color-surface-2)", color: "var(--color-text-muted)", border: "1px solid var(--color-border-subtle)" }}
          >
            Profile ↗
          </a>
        )}
        <span className="ml-auto text-[10px]" style={{ color: "var(--color-text-muted)" }}>
          {profile.post_date ? relativeTime(profile.post_date) : ""}
        </span>
      </div>
    </div>
  );
}

// ─── Conversations Panel ──────────────────────────────────────────────────────

function ConversationsPanel({
  profiles,
  productContext,
  onSearch,
  searching,
  searchError,
}: {
  profiles: SocialProfile[];
  productContext: string;
  onSearch: () => void;
  searching?: boolean;
  searchError?: string | null;
}) {
  const [search, setSearch] = useState("");
  const [platformFilter, setPlatformFilter] = useState("");
  const [intentFilter, setIntentFilter] = useState("");
  const [savedFilter, setSavedFilter] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [selectedProfile, setSelectedProfile] = useState<SocialProfile | null>(null);
  const [audiences, setAudiences] = useState<AudienceItem[]>([]);
  const [showAudienceModal, setShowAudienceModal] = useState(false);
  const [newAudienceName, setNewAudienceName] = useState("");
  const [creatingAudience, setCreatingAudience] = useState(false);
  // Saved profiles (localStorage fallback)
  const [savedIds, setSavedIds] = useState<Set<string>>(() => {
    try {
      const raw = localStorage.getItem("b2c_saved_ids");
      return raw ? new Set<string>(JSON.parse(raw) as string[]) : new Set<string>();
    } catch { return new Set<string>(); }
  });
  // Connected platform accounts
  const [connectedPlatforms, setConnectedPlatforms] = useState<string[]>([]);
  const [connectedHandles, setConnectedHandles] = useState<Record<string, string>>({});

  useEffect(() => {
    fetch("/api/social/accounts")
      .then((r) => r.ok ? r.json() as Promise<{ accounts?: Array<{ platform: string; handle?: string; username?: string }> }> : null)
      .then((data) => {
        if (!data?.accounts) return;
        const platforms: string[] = [];
        const handles: Record<string, string> = {};
        for (const acc of data.accounts) {
          if (acc.platform) {
            platforms.push(acc.platform);
            const h = acc.handle ?? acc.username ?? "";
            if (h) handles[acc.platform] = h.replace(/^@/, "");
          }
        }
        setConnectedPlatforms(platforms);
        setConnectedHandles(handles);
      })
      .catch(() => {});
  }, []);

  function toggleSave(profileId: string) {
    setSavedIds((prev) => {
      const next = new Set(prev);
      if (next.has(profileId)) {
        next.delete(profileId);
        // Fire delete (best-effort)
        fetch(`/api/b2c/saved?profile_id=${encodeURIComponent(profileId)}`, { method: "DELETE" }).catch(() => {});
      } else {
        next.add(profileId);
        const profile = profiles.find((p) => p.id === profileId);
        if (profile) {
          fetch("/api/b2c/saved", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ profile }) }).catch(() => {});
        }
      }
      try { localStorage.setItem("b2c_saved_ids", JSON.stringify([...next])); } catch { /* ignore */ }
      return next;
    });
  }

  const filtered = profiles.filter((p) => {
    if (
      search &&
      !p.post_text.toLowerCase().includes(search.toLowerCase()) &&
      !p.username.toLowerCase().includes(search.toLowerCase()) &&
      !(p.display_name ?? "").toLowerCase().includes(search.toLowerCase()) &&
      !(p.first_name ?? "").toLowerCase().includes(search.toLowerCase()) &&
      !(p.last_name ?? "").toLowerCase().includes(search.toLowerCase())
    )
      return false;
    if (platformFilter && p.platform !== platformFilter) return false;
    if (intentFilter && p.purchase_intent !== intentFilter) return false;
    if (savedFilter && !savedIds.has(p.id)) return false;
    return true;
  });

  const platforms = [...new Set(profiles.map((p) => p.platform))];

  function toggleSelect(id: string) {
    setSelected((prev) => {
      const n = new Set(prev);
      if (n.has(id)) n.delete(id);
      else n.add(id);
      return n;
    });
  }

  function exportCSV() {
    const toExport = selected.size > 0 ? profiles.filter((p) => selected.has(p.id)) : filtered;
    const headers = [
      "Username","Platform","Display Name","First Name","Last Name",
      "Post","Interest Score","Purchase Intent","Shopping Platforms",
      "Profile URL","Contact URL","Similar Products",
    ];
    const rows = toExport.map((p) => [
      p.username, p.platform, p.display_name ?? "", p.first_name ?? "", p.last_name ?? "",
      `"${(p.post_text ?? "").replace(/"/g, '""')}"`,
      p.interest_score, p.purchase_intent ?? "",
      p.shopping_signals.platform_mentions.join(";"),
      p.profile_url ?? "", p.contact.dm_url ?? "",
      p.similar_products.join(";"),
    ]);
    const csv = [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `b2c-conversations-${Date.now()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  async function createAudience() {
    if (!newAudienceName.trim()) return;
    setCreatingAudience(true);
    try {
      const resp = await fetch("/api/audiences", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newAudienceName.trim() }),
      });
      const data = await resp.json() as { audience?: { id: string; name: string } };
      if (data.audience) {
        setAudiences((prev) => [{ id: data.audience!.id, name: data.audience!.name, members: new Set<string>() }, ...prev]);
        setNewAudienceName("");
        setShowAudienceModal(false);
      }
    } finally {
      setCreatingAudience(false);
    }
  }

  // Loading state — show immediately when search starts
  if (searching) {
    return (
      <div className="flex flex-col items-center justify-center py-24 gap-6">
        <div className="relative">
          <div className="w-14 h-14 rounded-full border-4 border-t-transparent animate-spin"
            style={{ borderColor: "#7c3aed", borderTopColor: "transparent" }} />
          <div className="absolute inset-0 flex items-center justify-center text-xl">💬</div>
        </div>
        <div className="text-center">
          <div className="text-lg font-bold mb-2" style={{ color: "var(--color-text-1)" }}>Scanning conversations…</div>
          <div className="text-sm max-w-sm leading-relaxed" style={{ color: "var(--color-text-muted)" }}>
            AI is scanning social platforms and filtering for real consumers.
            This takes 10–20 seconds — results will appear here automatically.
          </div>
        </div>
        <div className="flex gap-2 flex-wrap justify-center mt-2">
          {["Generating queries", "Scanning platforms", "Filtering consumers", "Building profiles"].map((step) => (
            <span key={step} className="text-[10px] px-3 py-1 rounded-full animate-pulse"
              style={{ background: "rgba(124,58,237,0.12)", color: "#a78bfa" }}>
              ● {step}
            </span>
          ))}
        </div>
      </div>
    );
  }

  if (profiles.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-5">
        {searchError ? (
          <>
            <div style={{ fontSize: 48 }}>⚠️</div>
            <div className="text-center max-w-md">
              <div className="text-lg font-bold mb-2" style={{ color: "#f87171" }}>Search failed</div>
              <div className="text-sm leading-relaxed px-4 py-3 rounded-xl mb-2"
                style={{ background: "rgba(248,113,113,0.08)", color: "#fca5a5", border: "1px solid rgba(248,113,113,0.2)" }}>
                {searchError}
              </div>
              <div className="text-xs mt-2" style={{ color: "var(--color-text-muted)" }}>
                If you see a timeout or network error, the search is taking too long — try again or use fewer keywords.
              </div>
            </div>
          </>
        ) : (
          <>
            <div style={{ fontSize: 56 }}>💬</div>
            <div className="text-center">
              <div className="text-xl font-bold mb-2" style={{ color: "var(--color-text-1)" }}>Business to Conversation</div>
              <div className="text-sm max-w-md leading-relaxed" style={{ color: "var(--color-text-muted)" }}>
                Find real people talking about what you sell — on Reddit, Twitter, YouTube, and more.
                AI reads their exact conversations to build rich profiles and craft hyper-personalized messages.
              </div>
            </div>
          </>
        )}
        <button
          onClick={onSearch}
          className="flex items-center gap-2 px-6 py-3 rounded-xl text-sm font-semibold mt-2"
          style={{ background: "linear-gradient(135deg, #7c3aed 0%, #4f46e5 100%)", color: "white", boxShadow: "0 4px 12px rgba(124,58,237,0.3)" }}>
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><circle cx="6" cy="6" r="4" stroke="currentColor" strokeWidth="1.5"/><path d="M9 9l3 3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg>
          {searchError ? "Try Again" : "Search Conversations"}
        </button>
      </div>
    );
  }

  const intentFilterOptions = [
    { id: "ready_to_buy", label: "Ready to Buy", color: "#34d399" },
    { id: "researching",  label: "Researching",  color: "#60a5fa" },
    { id: "browsing",     label: "Browsing",     color: "#a78bfa" },
  ];

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center">
        <SearchBar value={search} onChange={setSearch} placeholder="Search posts, usernames..." />
        <div className="flex gap-1.5 flex-wrap">
          <button
            onClick={() => setPlatformFilter("")}
            className="px-3 py-2 rounded-xl text-xs font-medium"
            style={{ background: !platformFilter ? "rgba(124,58,237,0.15)" : "var(--color-surface)", border: !platformFilter ? "1px solid rgba(124,58,237,0.3)" : "1px solid var(--color-border)", color: !platformFilter ? "#a78bfa" : "var(--color-text-2)" }}>
            All
          </button>
          {platforms.map((p) => {
            const info = B2C_PLATFORM[p] ?? { label: p, color: "#6b7280", icon: "🌐" };
            const active = platformFilter === p;
            return (
              <button key={p} onClick={() => setPlatformFilter(active ? "" : p)}
                className="px-3 py-2 rounded-xl text-xs font-medium"
                style={{ background: active ? `${info.color}18` : "var(--color-surface)", border: active ? `1px solid ${info.color}40` : "1px solid var(--color-border)", color: active ? info.color : "var(--color-text-2)" }}>
                {info.icon} {info.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Intent filter + bulk actions */}
      <div className="flex items-center gap-2 flex-wrap">
        {intentFilterOptions.map(({ id, label, color }) => (
          <button key={id} onClick={() => setIntentFilter(intentFilter === id ? "" : id)}
            className="px-3 py-1.5 rounded-lg text-xs font-medium"
            style={{ background: intentFilter === id ? `${color}18` : "var(--color-surface-2)", border: intentFilter === id ? `1px solid ${color}40` : "1px solid var(--color-border-subtle)", color: intentFilter === id ? color : "var(--color-text-muted)" }}>
            {label}
          </button>
        ))}
        <button onClick={() => setSavedFilter((v) => !v)}
          className="px-3 py-1.5 rounded-lg text-xs font-medium"
          style={{ background: savedFilter ? "rgba(251,191,36,0.15)" : "var(--color-surface-2)", border: savedFilter ? "1px solid rgba(251,191,36,0.35)" : "1px solid var(--color-border-subtle)", color: savedFilter ? "#fbbf24" : "var(--color-text-muted)" }}>
          ★ Saved {savedIds.size > 0 ? `(${savedIds.size})` : ""}
        </button>
        <div className="ml-auto flex items-center gap-2">
          {selected.size > 0 && (
            <span className="text-xs px-3 py-1.5 rounded-lg" style={{ color: "#a78bfa", background: "rgba(124,58,237,0.1)" }}>
              {selected.size} selected
            </span>
          )}
          <button onClick={exportCSV}
            className="text-xs px-3 py-1.5 rounded-lg font-medium"
            style={{ background: "var(--color-surface)", border: "1px solid var(--color-border)", color: "var(--color-text-2)" }}>
            ↓ Export {selected.size > 0 ? `(${selected.size})` : "All"}
          </button>
          <button onClick={() => setShowAudienceModal(true)}
            className="text-xs px-3 py-1.5 rounded-lg font-medium"
            style={{ background: "rgba(124,58,237,0.1)", border: "1px solid rgba(124,58,237,0.25)", color: "#a78bfa" }}>
            + Audience
          </button>
        </div>
      </div>

      {/* Audiences strip */}
      {audiences.length > 0 && (
        <div className="flex gap-2 overflow-x-auto pb-1">
          {audiences.map((aud) => (
            <div key={aud.id} className="flex items-center gap-2 px-3 py-1.5 rounded-lg flex-shrink-0"
              style={{ background: "rgba(124,58,237,0.08)", border: "1px solid rgba(124,58,237,0.2)" }}>
              <span className="text-xs font-medium" style={{ color: "#a78bfa" }}>{aud.name}</span>
              <span className="text-[10px]" style={{ color: "var(--color-text-muted)" }}>{aud.members.size} members</span>
            </div>
          ))}
        </div>
      )}

      {/* Profile cards */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {filtered.map((profile) => (
          <SocialProfileCard
            key={profile.id}
            profile={profile}
            selected={selected.has(profile.id)}
            onSelect={() => toggleSelect(profile.id)}
            onClick={() => setSelectedProfile(profile)}
            audiences={audiences}
            saved={savedIds.has(profile.id)}
            onSave={() => toggleSave(profile.id)}
            connectedPlatforms={connectedPlatforms}
            connectedHandle={connectedHandles}
          />
        ))}
      </div>

      {filtered.length === 0 && profiles.length > 0 && (
        <EmptyState icon="🔍" title="No matches" desc="Try adjusting the platform or intent filter." />
      )}

      {/* Profile Drawer */}
      {selectedProfile && (
        <ProfileDrawer
          profile={selectedProfile}
          productContext={productContext}
          audiences={audiences}
          onAddToAudience={(audienceId) => {
            setAudiences((prev) =>
              prev.map((a) =>
                a.id === audienceId
                  ? { ...a, members: new Set([...a.members, selectedProfile.id]) }
                  : a
              )
            );
          }}
          onClose={() => setSelectedProfile(null)}
          onCreateAudience={() => setShowAudienceModal(true)}
          saved={savedIds.has(selectedProfile.id)}
          onSave={() => toggleSave(selectedProfile.id)}
          connectedPlatforms={connectedPlatforms}
          connectedHandles={connectedHandles}
        />
      )}

      {/* Create Audience Modal */}
      {showAudienceModal && (
        <>
          <div className="fixed inset-0 z-40" style={{ background: "rgba(0,0,0,0.5)" }} onClick={() => setShowAudienceModal(false)} />
          <div className="fixed left-1/2 top-1/2 z-50 w-full max-w-sm p-6 rounded-2xl"
            style={{ transform: "translate(-50%,-50%)", background: "var(--color-surface)", border: "1px solid var(--color-border)", boxShadow: "0 24px 80px rgba(0,0,0,0.5)" }}>
            <h3 className="text-base font-bold mb-4" style={{ color: "var(--color-text-1)" }}>Create Audience</h3>
            <input
              value={newAudienceName}
              onChange={(e) => setNewAudienceName(e.target.value)}
              placeholder="e.g. Phoenix HVAC — Ready to Buy"
              className="w-full px-3 py-2.5 rounded-xl text-sm outline-none mb-4"
              style={{ background: "var(--color-surface-2)", border: "1px solid var(--color-border)", color: "var(--color-text-1)" }}
              onKeyDown={(e) => { if (e.key === "Enter") createAudience(); }}
              autoFocus
            />
            <div className="flex gap-2">
              <button onClick={() => setShowAudienceModal(false)} className="flex-1 py-2.5 rounded-xl text-sm"
                style={{ background: "var(--color-surface-2)", border: "1px solid var(--color-border)", color: "var(--color-text-2)" }}>
                Cancel
              </button>
              <button onClick={createAudience} disabled={creatingAudience || !newAudienceName.trim()}
                className="flex-1 py-2.5 rounded-xl text-sm font-semibold"
                style={{ background: "linear-gradient(135deg, #7c3aed 0%, #4f46e5 100%)", color: "white", opacity: (creatingAudience || !newAudienceName.trim()) ? 0.6 : 1 }}>
                {creatingAudience ? "Creating..." : "Create"}
              </button>
            </div>
          </div>
        </>
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

// ─── Profile Drawer (B2C Conversation Detail) ─────────────────────────────────

function ProfileDrawer({
  profile,
  productContext,
  audiences,
  onAddToAudience,
  onClose,
  onCreateAudience,
  saved,
  onSave,
  connectedPlatforms,
  connectedHandles,
}: {
  profile: SocialProfile;
  productContext: string;
  audiences: AudienceItem[];
  onAddToAudience: (audienceId: string) => void;
  onClose: () => void;
  onCreateAudience: () => void;
  saved?: boolean;
  onSave?: () => void;
  connectedPlatforms?: string[];
  connectedHandles?: Record<string, string>;
}) {
  const { color: ic } = scoreColor(profile.interest_score);
  const pInfo = B2C_PLATFORM[profile.platform] ?? { label: profile.platform, color: "#6b7280", icon: "🌐", dmVerb: "View" };
  const [craftedMsg, setCraftedMsg] = useState(profile.ai_message ?? "");
  const [craftingMsg, setCraftingMsg] = useState(false);
  const [msgTone, setMsgTone] = useState<"casual" | "professional" | "friendly">("friendly");
  const [copied, setCopied] = useState(false);
  const [showAudiencePicker, setShowAudiencePicker] = useState(false);

  const intentBadge: Record<string, { label: string; color: string }> = {
    ready_to_buy: { label: "Ready to Buy", color: "#34d399" },
    researching:  { label: "Researching",  color: "#60a5fa" },
    browsing:     { label: "Browsing",     color: "#a78bfa" },
  };
  const intent = profile.purchase_intent ? intentBadge[profile.purchase_intent] : null;
  const isConnected = connectedPlatforms?.includes(profile.platform);
  const replyHandle = connectedHandles?.[profile.platform];

  async function craftMessage() {
    setCraftingMsg(true);
    try {
      const resp = await fetch("/api/b2c/message", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ profile, product_context: productContext, tone: msgTone }),
      });
      const data = await resp.json() as { message?: string; error?: string };
      if (!resp.ok) throw new Error(data.error ?? "Failed");
      setCraftedMsg(data.message ?? "");
    } catch {
      // silently fail
    } finally {
      setCraftingMsg(false);
    }
  }

  function copyMessage() {
    navigator.clipboard.writeText(craftedMsg).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

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
            <div className="flex items-center gap-2 flex-wrap mb-1">
              <span className="text-xs font-bold px-2 py-0.5 rounded-md" style={{ background: `${pInfo.color}18`, color: pInfo.color }}>
                {pInfo.icon} {pInfo.label}
              </span>
              {intent && (
                <span className="text-[10px] font-semibold px-2 py-0.5 rounded-md" style={{ background: `${intent.color}18`, color: intent.color }}>
                  {intent.label}
                </span>
              )}
              {profile.shopping_signals.mentions_buying && (
                <span className="text-[10px] px-2 py-0.5 rounded-md" style={{ background: "rgba(251,191,36,0.1)", color: "#fbbf24" }}>
                  💳 Buying intent
                </span>
              )}
            </div>
            <div className="font-mono text-sm" style={{ color: "var(--color-text-muted)" }}>@{profile.username}</div>
          </div>
          <div className="flex items-start gap-2 flex-shrink-0">
            {onSave && (
              <button
                onClick={onSave}
                title={saved ? "Unsave" : "Save profile"}
                className="p-1.5 rounded-lg transition-all mt-0.5"
                style={{ color: saved ? "#fbbf24" : "var(--color-text-muted)", background: saved ? "rgba(251,191,36,0.1)" : "transparent", border: saved ? "1px solid rgba(251,191,36,0.25)" : "1px solid transparent" }}>
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                  <path d="M7 1.5l1.6 3.5 3.7.5-2.7 2.7.7 3.8L7 10.3l-3.3 1.7.7-3.8L1.7 5.5l3.7-.5z"
                    stroke="currentColor" strokeWidth="1.2" strokeLinejoin="round"
                    fill={saved ? "currentColor" : "none"} />
                </svg>
              </button>
            )}
            <div className="text-right">
              <div className="text-2xl font-bold tabular-nums" style={{ color: ic }}>{profile.interest_score}</div>
              <div className="text-[10px]" style={{ color: "var(--color-text-muted)" }}>/ 100</div>
            </div>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto">

          {/* Identity fields — distinct labeled sections */}
          <div className="px-6 py-4" style={{ borderBottom: "1px solid var(--color-border-subtle)" }}>
            <div className="text-[10px] font-semibold mb-3" style={{ color: "var(--color-text-muted)" }}>PROFILE IDENTITY</div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <div className="text-[10px] mb-0.5 font-medium" style={{ color: "var(--color-text-muted)" }}>USERNAME / HANDLE</div>
                <div className="text-sm font-mono font-semibold" style={{ color: "var(--color-text-1)" }}>@{profile.username}</div>
              </div>
              <div>
                <div className="text-[10px] mb-0.5 font-medium" style={{ color: "var(--color-text-muted)" }}>FIRST NAME</div>
                <div className="text-sm font-semibold" style={{ color: profile.first_name ? "var(--color-text-1)" : "var(--color-text-muted)" }}>
                  {profile.first_name ?? "—"}
                </div>
              </div>
              <div>
                <div className="text-[10px] mb-0.5 font-medium" style={{ color: "var(--color-text-muted)" }}>LAST NAME</div>
                <div className="text-sm font-semibold" style={{ color: profile.last_name ? "var(--color-text-1)" : "var(--color-text-muted)" }}>
                  {profile.last_name ?? "—"}
                </div>
              </div>
              {profile.display_name && profile.display_name !== profile.username && (
                <div>
                  <div className="text-[10px] mb-0.5 font-medium" style={{ color: "var(--color-text-muted)" }}>DISPLAY NAME</div>
                  <div className="text-sm" style={{ color: "var(--color-text-2)" }}>{profile.display_name}</div>
                </div>
              )}
              <div>
                <div className="text-[10px] mb-0.5 font-medium" style={{ color: "var(--color-text-muted)" }}>PLATFORM</div>
                <div className="text-sm font-semibold" style={{ color: pInfo.color }}>{pInfo.icon} {pInfo.label}</div>
              </div>
              {profile.post_date && (
                <div>
                  <div className="text-[10px] mb-0.5 font-medium" style={{ color: "var(--color-text-muted)" }}>POSTED</div>
                  <div className="text-sm" style={{ color: "var(--color-text-2)" }}>{relativeTime(profile.post_date)}</div>
                </div>
              )}
            </div>
            {/* Connected account reply button */}
            {isConnected && replyHandle && profile.contact.dm_url && (
              <div className="mt-3">
                <a href={profile.contact.dm_url} target="_blank" rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold"
                  style={{ background: "rgba(52,211,153,0.1)", border: "1px solid rgba(52,211,153,0.25)", color: "#34d399" }}>
                  <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M2 2h8v6H4l-2 2V2z" stroke="currentColor" strokeWidth="1.2" strokeLinejoin="round"/></svg>
                  Reply as @{replyHandle} on {pInfo.label}
                </a>
              </div>
            )}
          </div>

          {/* The post */}
          <div className="px-6 py-5" style={{ borderBottom: "1px solid var(--color-border-subtle)" }}>
            <div className="text-[10px] font-semibold mb-2" style={{ color: "var(--color-text-muted)" }}>THEIR EXACT POST / COMMENT</div>
            <blockquote className="text-sm leading-relaxed" style={{ color: "var(--color-text-1)", borderLeft: `3px solid ${ic}`, paddingLeft: 12 }}>
              &ldquo;{profile.post_text}&rdquo;
            </blockquote>
            {profile.post_url && (
              <a href={profile.post_url} target="_blank" rel="noopener noreferrer"
                className="inline-flex items-center gap-1 mt-3 text-xs"
                style={{ color: "#a78bfa" }}>
                View original post ↗
              </a>
            )}
          </div>

          {/* Interest analysis */}
          <div className="px-6 py-4" style={{ borderBottom: "1px solid var(--color-border-subtle)" }}>
            <div className="text-[10px] font-semibold mb-2" style={{ color: "var(--color-text-muted)" }}>INTEREST LEVEL</div>
            <div className="flex items-center gap-3 mb-3">
              <div className="flex-1 h-2 rounded-full overflow-hidden" style={{ background: "var(--color-surface-2)" }}>
                <div className="h-full rounded-full" style={{ width: `${profile.interest_score}%`, background: `linear-gradient(90deg, ${ic}88, ${ic})` }} />
              </div>
              <span className="text-sm font-bold tabular-nums" style={{ color: ic }}>{profile.interest_score}/100</span>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {profile.keywords_matched.map((kw) => (
                <span key={kw} className="text-[10px] px-2 py-0.5 rounded-md" style={{ background: "rgba(124,58,237,0.08)", color: "#a78bfa" }}>{kw}</span>
              ))}
            </div>
          </div>

          {/* Shopping signals */}
          <div className="px-6 py-4" style={{ borderBottom: "1px solid var(--color-border-subtle)" }}>
            <div className="text-[10px] font-semibold mb-3" style={{ color: "var(--color-text-muted)" }}>SHOPPING BEHAVIOR</div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <div className="text-[10px] mb-0.5" style={{ color: "var(--color-text-muted)" }}>BUYING INTENT</div>
                <div className="text-xs font-semibold" style={{ color: profile.shopping_signals.mentions_buying ? "#34d399" : "var(--color-text-muted)" }}>
                  {profile.shopping_signals.mentions_buying ? "✓ Actively looking to buy" : "Not explicitly mentioned"}
                </div>
              </div>
              <div>
                <div className="text-[10px] mb-0.5" style={{ color: "var(--color-text-muted)" }}>SHOPPING FREQUENCY</div>
                <div className="text-xs font-semibold" style={{ color: "var(--color-text-2)" }}>
                  {profile.shopping_signals.frequency === "frequent" ? "🛍️ Frequent shopper" :
                   profile.shopping_signals.frequency === "occasional" ? "🛒 Occasional buyer" : "Unknown"}
                </div>
              </div>
            </div>
            {profile.shopping_signals.platform_mentions.length > 0 && (
              <div className="mt-3">
                <div className="text-[10px] mb-1.5" style={{ color: "var(--color-text-muted)" }}>MENTIONED PLATFORMS</div>
                <div className="flex flex-wrap gap-1.5">
                  {profile.shopping_signals.platform_mentions.map((p) => (
                    <span key={p} className="text-[10px] font-semibold px-2 py-0.5 rounded-md capitalize"
                      style={{ background: "rgba(251,191,36,0.1)", color: "#fbbf24" }}>
                      🛒 {p}
                    </span>
                  ))}
                </div>
              </div>
            )}
            {profile.consumer_signals && profile.consumer_signals.length > 0 && (
              <div className="mt-3">
                <div className="text-[10px] mb-1.5" style={{ color: "var(--color-text-muted)" }}>CONSUMER SIGNALS DETECTED</div>
                <div className="flex flex-col gap-1">
                  {profile.consumer_signals.map((s, i) => (
                    <div key={i} className="flex items-start gap-1.5">
                      <span style={{ color: "#34d399", marginTop: 1, flexShrink: 0 }}>✓</span>
                      <span className="text-xs" style={{ color: "var(--color-text-2)" }}>{s}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Similar products */}
          {profile.similar_products.length > 0 && (
            <div className="px-6 py-4" style={{ borderBottom: "1px solid var(--color-border-subtle)" }}>
              <div className="text-[10px] font-semibold mb-2" style={{ color: "var(--color-text-muted)" }}>SIMILAR PRODUCTS THEY MAY WANT</div>
              <div className="flex flex-wrap gap-1.5">
                {profile.similar_products.map((p) => (
                  <span key={p} className="text-xs px-2 py-1 rounded-lg" style={{ background: "var(--color-surface-2)", color: "var(--color-text-2)", border: "1px solid var(--color-border-subtle)" }}>
                    {p}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* AI Message Crafter */}
          <div className="px-6 py-5" style={{ borderBottom: "1px solid var(--color-border-subtle)" }}>
            <div className="text-[10px] font-semibold mb-3" style={{ color: "var(--color-text-muted)" }}>AI-CRAFTED MESSAGE</div>

            {/* Tone selector */}
            <div className="flex gap-2 mb-3">
              {(["friendly", "casual", "professional"] as const).map((tone) => (
                <button key={tone} onClick={() => setMsgTone(tone)}
                  className="px-3 py-1 rounded-lg text-xs font-medium capitalize transition-all"
                  style={{ background: msgTone === tone ? "rgba(124,58,237,0.15)" : "var(--color-surface-2)", border: msgTone === tone ? "1px solid rgba(124,58,237,0.3)" : "1px solid var(--color-border-subtle)", color: msgTone === tone ? "#a78bfa" : "var(--color-text-muted)" }}>
                  {tone}
                </button>
              ))}
            </div>

            {craftedMsg ? (
              <div className="space-y-3">
                <div className="p-4 rounded-xl text-sm leading-relaxed whitespace-pre-wrap"
                  style={{ background: "rgba(124,58,237,0.05)", border: "1px solid rgba(124,58,237,0.15)", color: "var(--color-text-1)" }}>
                  {craftedMsg}
                </div>
                <div className="flex gap-2">
                  <button onClick={copyMessage}
                    className="flex-1 py-2 rounded-xl text-xs font-semibold transition-all"
                    style={{ background: copied ? "rgba(52,211,153,0.15)" : "rgba(124,58,237,0.1)", border: copied ? "1px solid rgba(52,211,153,0.3)" : "1px solid rgba(124,58,237,0.2)", color: copied ? "#34d399" : "#a78bfa" }}>
                    {copied ? "✓ Copied!" : "Copy Message"}
                  </button>
                  <button onClick={craftMessage} disabled={craftingMsg}
                    className="flex-1 py-2 rounded-xl text-xs font-semibold"
                    style={{ background: "var(--color-surface-2)", border: "1px solid var(--color-border)", color: "var(--color-text-2)" }}>
                    {craftingMsg ? "Crafting..." : "↺ Regenerate"}
                  </button>
                </div>
              </div>
            ) : (
              <button onClick={craftMessage} disabled={craftingMsg}
                className="w-full py-3 rounded-xl text-sm font-semibold flex items-center justify-center gap-2 transition-all"
                style={{ background: "linear-gradient(135deg, #7c3aed 0%, #4f46e5 100%)", color: "white", boxShadow: "0 4px 12px rgba(124,58,237,0.25)", opacity: craftingMsg ? 0.7 : 1 }}>
                {craftingMsg ? (
                  <><div className="w-4 h-4 rounded-full border-2 border-white border-t-transparent animate-spin" />Crafting personalized message…</>
                ) : <>✨ Craft Personalized Message</>}
              </button>
            )}
          </div>

          {/* Contact + Audience actions */}
          <div className="px-6 py-5 space-y-3">
            <div className="text-[10px] font-semibold" style={{ color: "var(--color-text-muted)" }}>CONTACT &amp; ORGANIZE</div>

            {profile.contact.dm_url && (
              <a href={profile.contact.dm_url} target="_blank" rel="noopener noreferrer"
                className="w-full py-3 rounded-xl text-sm font-semibold flex items-center justify-center gap-2 transition-all"
                style={{ background: `${pInfo.color}14`, border: `1px solid ${pInfo.color}30`, color: pInfo.color }}>
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M1.5 2.5h11v8l-2-2h-9v-6z" stroke="currentColor" strokeWidth="1.3" strokeLinejoin="round"/></svg>
                {pInfo.dmVerb} on {pInfo.label}
              </a>
            )}

            {isConnected && replyHandle && profile.contact.dm_url && (
              <a href={profile.contact.dm_url} target="_blank" rel="noopener noreferrer"
                className="w-full py-3 rounded-xl text-sm font-semibold flex items-center justify-center gap-2 transition-all"
                style={{ background: "rgba(52,211,153,0.1)", border: "1px solid rgba(52,211,153,0.3)", color: "#34d399" }}>
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M2 2h10v7H5l-3 3V2z" stroke="currentColor" strokeWidth="1.3" strokeLinejoin="round"/></svg>
                Reply as @{replyHandle}
              </a>
            )}

            {profile.profile_url && (
              <a href={profile.profile_url} target="_blank" rel="noopener noreferrer"
                className="w-full py-2.5 rounded-xl text-sm font-medium flex items-center justify-center gap-2"
                style={{ background: "var(--color-surface-2)", border: "1px solid var(--color-border)", color: "var(--color-text-2)" }}>
                <svg width="13" height="13" viewBox="0 0 13 13" fill="none"><path d="M5 2H2a1 1 0 00-1 1v8a1 1 0 001 1h8a1 1 0 001-1V8M8 1h4m0 0v4m0-4L5 8" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"/></svg>
                View Profile ↗
              </a>
            )}

            {/* Add to audience */}
            <div className="relative">
              <button onClick={() => setShowAudiencePicker((v) => !v)}
                className="w-full py-2.5 rounded-xl text-sm font-medium flex items-center justify-center gap-2"
                style={{ background: "var(--color-surface-2)", border: "1px solid var(--color-border)", color: "var(--color-text-2)" }}>
                + Add to Audience
              </button>
              {showAudiencePicker && (
                <div className="absolute bottom-12 left-0 right-0 rounded-xl overflow-hidden z-10"
                  style={{ background: "var(--color-surface)", border: "1px solid var(--color-border)", boxShadow: "0 8px 32px rgba(0,0,0,0.3)" }}>
                  {audiences.length === 0 ? (
                    <div className="p-4 text-center">
                      <div className="text-xs mb-2" style={{ color: "var(--color-text-muted)" }}>No audiences yet</div>
                      <button onClick={() => { setShowAudiencePicker(false); onCreateAudience(); }}
                        className="text-xs font-semibold" style={{ color: "#a78bfa" }}>
                        + Create your first audience
                      </button>
                    </div>
                  ) : (
                    audiences.map((aud) => (
                      <button key={aud.id}
                        onClick={() => { onAddToAudience(aud.id); setShowAudiencePicker(false); }}
                        className="w-full flex items-center justify-between px-4 py-3 text-sm transition-all"
                        style={{ color: "var(--color-text-1)" }}
                        onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = "var(--o1)"; }}
                        onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = "transparent"; }}>
                        <span>{aud.name}</span>
                        <span className="text-[10px]" style={{ color: "var(--color-text-muted)" }}>{aud.members.size} members</span>
                      </button>
                    ))
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </>
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
  const [selectedAsset, setSelectedAsset] = useState<GeneratedAsset | null>(null);
  const [activeRunId, setActiveRunId] = useState<string | null>(null);
  const [activeRunMarket, setActiveRunMarket] = useState<string>("");
  const [discoveryWarning, setDiscoveryWarning] = useState<string | null>(null);
  const runPollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // B2C Conversation state
  const [b2cProfiles, setB2cProfiles] = useState<SocialProfile[]>([]);
  const [b2cProductContext, setB2cProductContext] = useState("");
  const [b2cSearching, setB2cSearching] = useState(false);
  const [b2cSearchKey, setB2cSearchKey] = useState(0); // increments to reset panel state
  const [b2cSearchError, setB2cSearchError] = useState<string | null>(null); // persists in panel after modal closes

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

  function handleB2cSearchStart() {
    // Called the moment the user hits "Search Conversations" — before the API call
    setB2cProfiles([]);          // clear old results immediately
    setB2cSearching(true);       // show spinner in panel
    setB2cSearchError(null);     // clear any previous error
    setB2cSearchKey((k) => k + 1); // reset panel's internal filter/selection state
    setActiveTab("conversations"); // switch tab right away so user sees it's working
  }

  function handleLaunched(
    runId: string,
    market: string,
    n8nTriggered: boolean,
    b2cResult?: { profiles: SocialProfile[]; productContext: string; error?: string }
  ) {
    // Always update B2C state when result is provided (even if empty — clears old data)
    if (b2cResult !== undefined) {
      setB2cProfiles(b2cResult.profiles ?? []);
      setB2cProductContext(b2cResult.productContext ?? "");
      setB2cSearching(false);
      if (b2cResult.error) setB2cSearchError(b2cResult.error);
    }

    // Auto-switch to the relevant tab
    if (market === "b2b") setActiveTab("prospects");
    else if (market === "b2c") setActiveTab("conversations");
    else setActiveTab("prospects"); // "both" — start at prospects

    if (!n8nTriggered && market !== "b2c") {
      setDiscoveryWarning("n8n automation is not connected — configure N8N_WEBHOOK_BASE_URL in Vercel to enable live discovery. Any AI-generated leads have been added.");
      setTimeout(() => setDiscoveryWarning(null), 12_000);
      return;
    }
    if (market !== "b2c") {
      setActiveRunId(runId);
      setActiveRunMarket(market);
    }
  }

  // Stat summaries per tab
  const { data: leadsData } = useLeads({ per_page: 100 });
  const { data: bizData } = useBusinesses({ per_page: 100 });
  const { data: assetsData } = useGeneratedAssets({ per_page: 100 });

  const leads = leadsData?.data ?? [];
  const businesses = bizData?.data ?? [];
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
    conversations: [
      { label: "Profiles Found", value: b2cProfiles.length, color: "#7c3aed" },
      { label: "Ready to Buy", value: b2cProfiles.filter((p) => p.purchase_intent === "ready_to_buy").length, color: "#34d399" },
      { label: "High Interest (≥75)", value: b2cProfiles.filter((p) => p.interest_score >= 75).length, color: "#f87171" },
      { label: "Avg Interest", value: b2cProfiles.length ? Math.round(b2cProfiles.reduce((a, p) => a + p.interest_score, 0) / b2cProfiles.length) : 0, color: "#0891b2" },
    ],
    assets: [
      { label: "Total Assets", value: assetsData?.total ?? 0, color: "#7c3aed" },
      { label: "Landing Pages", value: assets.filter((a) => a.landing_page).length, color: "#34d399" },
      { label: "Email Seqs", value: assets.filter((a) => a.email_sequence).length, color: "#0891b2" },
      { label: "Social Posts", value: assets.filter((a) => a.social_posts).length, color: "#fbbf24" },
    ],
  };

  const TABS: { id: TabType; label: string; icon: string }[] = [
    { id: "leads",         label: "Leads",          icon: "👤" },
    { id: "prospects",     label: "Prospects",       icon: "🏢" },
    { id: "conversations", label: "Conversations",   icon: "💬" },
    { id: "assets",        label: "Funnel Assets",   icon: "🎨" },
  ];

  const bannerEngines: Record<string, string[]> = {
    b2b:  ["Finding businesses", "AI scoring opportunities", "Drafting outreach emails"],
    b2c:  ["Scanning Reddit & reviews", "Classifying buyer intent", "Generating funnel assets"],
    both: ["Scoring B2B prospects", "Detecting B2C intent", "Building funnel assets"],
  };
  const bannerTasks = bannerEngines[activeRunMarket] ?? bannerEngines.both;

  return (
    <div style={{ padding: "36px 40px", maxWidth: 1500, margin: "0 auto", display: "flex", flexDirection: "column", gap: 24 }}>

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
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 16 }}>
        <div>
          <p style={{ fontSize: 14, color: "var(--c3)", marginBottom: 8, fontWeight: 500 }}>Discover & manage</p>
          <h1 style={{ fontSize: 36, fontWeight: 800, letterSpacing: "-0.04em", color: "var(--c1)", margin: 0, lineHeight: 1.1 }}>
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
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 14 }}>
        {STATS[activeTab].map((s, i) => (
          <div key={s.label}
            className="animate-fade-up"
            style={{
              borderRadius: 12, padding: "20px 22px",
              background: "var(--color-surface)",
              border: "1px solid var(--color-border)",
              borderTop: `3px solid ${s.color}`,
              animationDelay: `${i * 0.06}s`,
            }}>
            <div style={{ fontSize: 30, fontWeight: 800, letterSpacing: "-0.05em", lineHeight: 1, marginBottom: 6, color: s.color, fontVariantNumeric: "tabular-nums" }}>{s.value}</div>
            <div style={{ fontSize: 11, fontWeight: 600, color: "var(--c3)", letterSpacing: "0.04em", textTransform: "uppercase" }}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* Tab navigation */}
      <div style={{ display: "flex", gap: 4, padding: 4, borderRadius: 16, background: "var(--color-surface)", border: "1px solid var(--color-border)", width: "fit-content" }}>
        {TABS.map(({ id, label, icon }) => (
          <button key={id} onClick={() => setActiveTab(id)}
            style={{
              display: "flex", alignItems: "center", gap: 6, padding: "8px 16px", borderRadius: 12,
              fontSize: 13, fontWeight: 500, cursor: "pointer", transition: "all 0.15s",
              background: activeTab === id ? "rgba(124,58,237,0.15)" : "transparent",
              color: activeTab === id ? "#a78bfa" : "var(--color-text-2)",
              border: activeTab === id ? "1px solid rgba(124,58,237,0.25)" : "1px solid transparent",
            }}>
            <span>{icon}</span>
            <span>{label}</span>
            {id === "prospects" && businesses.length > 0 && (
              <span style={{ fontSize: 10, fontWeight: 700, padding: "2px 6px", borderRadius: 999, background: "rgba(124,58,237,0.2)", color: "#a78bfa" }}>{businesses.length}</span>
            )}
            {id === "conversations" && b2cProfiles.length > 0 && (
              <span style={{ fontSize: 10, fontWeight: 700, padding: "2px 6px", borderRadius: 999, background: "rgba(124,58,237,0.2)", color: "#a78bfa" }}>{b2cProfiles.length}</span>
            )}
            {id === "assets" && assets.length > 0 && (
              <span style={{ fontSize: 10, fontWeight: 700, padding: "2px 6px", borderRadius: 999, background: "rgba(124,58,237,0.2)", color: "#a78bfa" }}>{assets.length}</span>
            )}
          </button>
        ))}
      </div>

      {/* Tab content */}
      <div className="animate-fade-up" style={{ animationDelay: "0.1s" }}>
        {activeTab === "leads"         && <LeadsPanel          onSelectLead={(id) => setSelectedLeadId(id)} />}
        {activeTab === "prospects"     && <ProspectsPanel       onSelectBiz={(b) => setSelectedBiz(b)} activeRunId={activeRunId} />}
        {activeTab === "conversations" && (
          <ConversationsPanel
            key={b2cSearchKey}
            profiles={b2cProfiles}
            productContext={b2cProductContext}
            onSearch={() => { setShowDiscovery(true); }}
            searching={b2cSearching}
            searchError={b2cSearchError}
          />
        )}
        {activeTab === "assets"        && <AssetsPanel          onSelectAsset={(a) => setSelectedAsset(a)} />}
      </div>

      {/* Modals + Drawers */}
      {showDiscovery && (
        <DiscoveryModal
          onClose={() => setShowDiscovery(false)}
          onLaunched={handleLaunched}
          onB2cSearchStart={handleB2cSearchStart}
          initialMode={activeTab === "conversations" ? "b2c" : "b2b"}
        />
      )}
      {showAddLead && <AddLeadModal onClose={() => setShowAddLead(false)} />}
      {selectedLeadId && <LeadDrawer leadId={selectedLeadId} onClose={() => setSelectedLeadId(null)} />}
      {selectedBiz && <BusinessDrawer biz={selectedBiz} onClose={() => setSelectedBiz(null)} />}
      {selectedAsset && <AssetDrawer asset={selectedAsset} onClose={() => setSelectedAsset(null)} />}
    </div>
  );
}
