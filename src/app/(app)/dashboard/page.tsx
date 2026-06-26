"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

interface DashboardStats {
  leads_total: number;
  leads_week: number;
  content_total: number;
  content_week: number;
}

interface WorkflowRun {
  id: string;
  workflow_type: string;
  status: string;
  started_at: string;
  completed_at?: string;
  output_summary?: { leads_found?: number } | null;
}

interface DashboardData {
  stats: DashboardStats;
  recent_runs: WorkflowRun[];
  org: { name: string; plan: string };
}

const TYPE_LABELS: Record<string, string> = {
  lead_discovery:        "Lead Discovery",
  content_generation:    "Content Generation",
  seo_research:          "SEO Research",
  social_classification: "Social Classification",
  prospect_discovery:    "Prospect Discovery",
  intent_discovery:      "Intent Discovery",
};

const STATUS_STYLES: Record<string, { label: string; color: string; bg: string; pulse?: boolean }> = {
  complete: { label: "Complete", color: "#10b981", bg: "rgba(16,185,129,0.12)" },
  running:  { label: "Running",  color: "#60a5fa", bg: "rgba(96,165,250,0.12)", pulse: true },
  pending:  { label: "Pending",  color: "#fbbf24", bg: "rgba(251,191,36,0.12)" },
  failed:   { label: "Failed",   color: "#f87171", bg: "rgba(248,113,113,0.12)" },
};

const QUICK_ACTIONS = [
  {
    label: "Find Leads",
    description: "Launch a new discovery run",
    href: "/leads",
    color: "#a78bfa",
    icon: <svg width="18" height="18" viewBox="0 0 18 18" fill="none"><circle cx="9" cy="6.5" r="3.5" stroke="currentColor" strokeWidth="1.6"/><path d="M2.5 16c0-3.5 2.9-5.5 6.5-5.5s6.5 2 6.5 5.5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"/></svg>,
  },
  {
    label: "Generate Content",
    description: "Create platform-ready posts",
    href: "/content-studio",
    color: "#38bdf8",
    icon: <svg width="18" height="18" viewBox="0 0 18 18" fill="none"><rect x="2" y="2" width="14" height="14" rx="3" stroke="currentColor" strokeWidth="1.6"/><path d="M5.5 7h7M5.5 10.5h5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"/></svg>,
  },
  {
    label: "SEO Research",
    description: "Generate keyword clusters",
    href: "/seo",
    color: "#34d399",
    icon: <svg width="18" height="18" viewBox="0 0 18 18" fill="none"><circle cx="8" cy="8" r="5.5" stroke="currentColor" strokeWidth="1.6"/><path d="M13 13l3.5 3.5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"/></svg>,
  },
  {
    label: "Find Backlinks",
    description: "Discover link opportunities",
    href: "/backlinks",
    color: "#fb923c",
    icon: <svg width="18" height="18" viewBox="0 0 18 18" fill="none"><path d="M7.5 11l-2 2a3 3 0 0 1-4.24-4.24l4-4A3 3 0 0 1 9.5 4.9" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"/><path d="M10.5 7l2-2a3 3 0 0 1 4.24 4.24l-4 4A3 3 0 0 1 8.5 13.1" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"/></svg>,
  },
];

const SETUP_CHECKLIST = [
  { key: "workspace",  label: "Create your workspace",               done: true },
  { key: "ai",         label: "Configure AI discovery settings",     done: true },
  { key: "discovery",  label: "Run your first lead discovery",       done: false, href: "/leads" },
  { key: "gmail",      label: "Connect Gmail for email drafts",      done: false, href: "/settings" },
  { key: "n8n",        label: "Set up your n8n automation workflow", done: false, href: "/settings" },
];

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "Just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

function Sparkline({ color, up }: { color: string; up: boolean }) {
  const pts = up
    ? "0,20 15,15 30,17 45,10 60,13 75,5 90,7 105,2"
    : "0,3 15,7 30,5 45,9 60,7 75,12 90,10 105,14";
  return (
    <svg width="105" height="24" viewBox="0 0 105 24" fill="none">
      <polyline points={pts} stroke={color} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" opacity="0.5"/>
    </svg>
  );
}

export default function DashboardPage() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [checklistOpen, setChecklistOpen] = useState(true);

  const now = new Date();
  const hour = now.getHours();
  const greeting = hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";

  useEffect(() => {
    fetch("/api/dashboard")
      .then((r) => r.json())
      .then((d) => setData(d))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const stats = data?.stats;
  const runs  = data?.recent_runs ?? [];
  const doneCount  = SETUP_CHECKLIST.filter((i) => i.done).length;
  const totalCount = SETUP_CHECKLIST.length;

  const STAT_CARDS = [
    {
      label: "Total Prospects",
      value: loading ? "—" : (stats?.leads_total ?? 0).toLocaleString(),
      delta: loading ? "" : `+${stats?.leads_week ?? 0} this week`,
      up: (stats?.leads_week ?? 0) > 0,
      color: "#a78bfa",
      icon: <svg width="18" height="18" viewBox="0 0 18 18" fill="none"><circle cx="9" cy="6" r="3.2" stroke="currentColor" strokeWidth="1.6"/><path d="M2 16c0-3.5 3.1-5.5 7-5.5s7 2 7 5.5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"/></svg>,
    },
    {
      label: "Content Pieces",
      value: loading ? "—" : (stats?.content_total ?? 0).toLocaleString(),
      delta: loading ? "" : `+${stats?.content_week ?? 0} this week`,
      up: (stats?.content_week ?? 0) > 0,
      color: "#38bdf8",
      icon: <svg width="18" height="18" viewBox="0 0 18 18" fill="none"><rect x="2" y="2" width="14" height="14" rx="3" stroke="currentColor" strokeWidth="1.6"/><path d="M5.5 7h7M5.5 10.5h5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"/></svg>,
    },
    {
      label: "Workflow Runs",
      value: loading ? "—" : runs.length.toString(),
      delta: "Total recorded",
      up: runs.length > 0,
      color: "#34d399",
      icon: <svg width="18" height="18" viewBox="0 0 18 18" fill="none"><path d="M9 3v12M3 9h12" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"/></svg>,
    },
    {
      label: "Active Campaigns",
      value: "—",
      delta: "Coming soon",
      up: null as boolean | null,
      color: "#fb923c",
      icon: <svg width="18" height="18" viewBox="0 0 18 18" fill="none"><rect x="2" y="4" width="14" height="12" rx="2" stroke="currentColor" strokeWidth="1.6"/><path d="M6 2v3M12 2v3M2 8.5h14" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"/></svg>,
    },
  ];

  return (
    <div style={{ padding: "36px 40px", maxWidth: 1440, margin: "0 auto", display: "flex", flexDirection: "column", gap: 28 }}>

      {/* ── Page header ──────────────────────────────────────────── */}
      <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", paddingBottom: 4 }}>
        <div>
          <p style={{ fontSize: 14, color: "var(--c3)", marginBottom: 8, fontWeight: 500, letterSpacing: "0.01em" }}>
            {greeting}{data?.org.name ? `, ${data.org.name}` : ""}
          </p>
          <h1 style={{ fontSize: 36, fontWeight: 800, letterSpacing: "-0.04em", color: "var(--c1)", margin: 0, lineHeight: 1.1 }}>
            Growth Dashboard
          </h1>
          <p style={{ fontSize: 15, color: "rgba(255,255,255,0.36)", marginTop: 10, lineHeight: 1.5 }}>
            Live snapshot of your leads, prospects, and automation activity
          </p>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 14, flexShrink: 0 }}>
          <span style={{ fontSize: 12, color: "var(--c4)" }}>Refreshes every 30s</span>
          <Link href="/leads" style={{
            display: "inline-flex", alignItems: "center", gap: 8,
            padding: "11px 22px", borderRadius: 11, fontSize: 14, fontWeight: 600,
            background: "linear-gradient(135deg, #7c3aed 0%, #4f46e5 100%)",
            color: "white", textDecoration: "none",
            boxShadow: "0 4px 20px rgba(124,58,237,0.4)",
            letterSpacing: "-0.01em",
          }}>
            <svg width="13" height="13" viewBox="0 0 13 13" fill="none">
              <path d="M6.5 2v9M2 6.5h9" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
            </svg>
            New Discovery
          </Link>
        </div>
      </div>

      {/* ── Setup checklist ──────────────────────────────────────── */}
      <div style={{
        borderRadius: 16, overflow: "hidden",
        background: "var(--o1)",
        border: "1px solid rgba(255,255,255,0.07)",
      }}>
        {/* Header row */}
        <button
          onClick={() => setChecklistOpen((v) => !v)}
          style={{
            width: "100%", display: "flex", alignItems: "center", justifyContent: "space-between",
            padding: "20px 28px", background: "transparent", border: "none", cursor: "pointer",
            textAlign: "left", transition: "background 0.15s",
          }}
          onMouseEnter={e => { e.currentTarget.style.background = "var(--o1)"; }}
          onMouseLeave={e => { e.currentTarget.style.background = "transparent"; }}
        >
          <div>
            <h2 style={{ fontSize: 15, fontWeight: 700, color: "var(--c1)", margin: 0 }}>
              Setup checklist
            </h2>
            <p style={{ fontSize: 13, marginTop: 5, color: "var(--c3)", margin: "5px 0 0" }}>
              Complete these steps to get the most out of SignafyAI — {doneCount}/{totalCount} done
            </p>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 16, flexShrink: 0 }}>
            {/* Progress bar */}
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <div style={{ width: 120, height: 4, borderRadius: 4, background: "var(--o2)" }}>
                <div style={{
                  height: 4, borderRadius: 4, transition: "width 0.5s ease",
                  background: "linear-gradient(90deg, #7c3aed, #4f46e5)",
                  width: `${(doneCount / totalCount) * 100}%`,
                }} />
              </div>
              <span style={{ fontSize: 13, fontWeight: 700, color: "#a78bfa" }}>
                {Math.round((doneCount / totalCount) * 100)}%
              </span>
            </div>
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none" style={{
              color: "var(--c3)",
              transition: "transform 0.2s",
              transform: checklistOpen ? "rotate(0deg)" : "rotate(-90deg)",
            }}>
              <path d="M2.5 5L7 9.5L11.5 5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </div>
        </button>

        {checklistOpen && (
          <div style={{ borderTop: "1px solid rgba(255,255,255,0.05)", padding: "20px 28px" }}>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))", gap: 14 }}>
              {SETUP_CHECKLIST.map((item) => (
                <div key={item.key} style={{ display: "flex", alignItems: "center", gap: 12 }}>
                  {item.done ? (
                    <div style={{
                      width: 20, height: 20, borderRadius: "50%", flexShrink: 0,
                      background: "rgba(16,185,129,0.15)",
                      display: "flex", alignItems: "center", justifyContent: "center",
                    }}>
                      <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                        <path d="M2 5L4.2 7.2L8.5 2.5" stroke="#10b981" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                    </div>
                  ) : (
                    <div style={{
                      width: 20, height: 20, borderRadius: "50%", flexShrink: 0,
                      border: "2px solid rgba(255,255,255,0.12)",
                    }} />
                  )}
                  {item.href && !item.done ? (
                    <Link href={item.href} style={{
                      fontSize: 14, fontWeight: 500, color: "#a78bfa",
                      textDecoration: "underline", textDecorationStyle: "dotted",
                      textDecorationColor: "rgba(167,139,250,0.4)",
                    }}>
                      {item.label}
                    </Link>
                  ) : (
                    <span style={{
                      fontSize: 14, fontWeight: 450,
                      color: item.done ? "var(--c4)" : "rgba(255,255,255,0.68)",
                      textDecoration: item.done ? "line-through" : "none",
                    }}>
                      {item.label}
                    </span>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* ── Stat cards ──────────────────────────────────────────── */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 18 }}>
        {STAT_CARDS.map((card) => (
          <div key={card.label} style={{
            borderRadius: 16, padding: "26px 24px",
            background: "var(--o1)",
            border: "1px solid rgba(255,255,255,0.07)",
            position: "relative", overflow: "hidden",
            transition: "border-color 0.2s, box-shadow 0.2s",
          }}
          onMouseEnter={e => {
            e.currentTarget.style.boxShadow = `0 8px 32px ${card.color}18`;
            e.currentTarget.style.borderColor = `${card.color}35`;
          }}
          onMouseLeave={e => {
            e.currentTarget.style.boxShadow = "none";
            e.currentTarget.style.borderColor = "var(--o2)";
          }}
          >
            {/* Colour wash */}
            <div style={{
              position: "absolute", top: 0, right: 0, width: 100, height: 100,
              borderRadius: "50%", pointerEvents: "none",
              background: `radial-gradient(circle, ${card.color}18 0%, transparent 70%)`,
              transform: "translate(40%, -40%)",
            }} />
            <div style={{ position: "relative" }}>
              {/* Icon row */}
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
                <span style={{
                  padding: "9px", borderRadius: 11,
                  background: `${card.color}14`, color: card.color,
                  display: "flex", alignItems: "center",
                }}>
                  {card.icon}
                </span>
                {card.up !== null && (
                  <span style={{
                    fontSize: 11, fontWeight: 700, padding: "3px 8px", borderRadius: 8,
                    background: card.up ? "rgba(16,185,129,0.12)" : "rgba(248,113,113,0.12)",
                    color: card.up ? "#34d399" : "#f87171",
                  }}>
                    {card.up ? "↑ Up" : "↓ Down"}
                  </span>
                )}
              </div>
              {/* Value */}
              <div style={{
                fontSize: 36, fontWeight: 800, letterSpacing: "-0.04em",
                color: "var(--c1)", lineHeight: 1,
                opacity: loading ? 0.3 : 1, transition: "opacity 0.3s",
              }}>
                {card.value}
              </div>
              {/* Label */}
              <div style={{ fontSize: 14, fontWeight: 500, color: "var(--c2)", marginTop: 8 }}>
                {card.label}
              </div>
              {/* Delta */}
              {card.delta && (
                <div style={{ fontSize: 12, marginTop: 4, color: "var(--c4)" }}>
                  {card.delta}
                </div>
              )}
              {/* Sparkline */}
              {card.up !== null && (
                <div style={{ marginTop: 16, marginLeft: -4, opacity: 0.55 }}>
                  <Sparkline color={card.color} up={!!card.up} />
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* ── Main two-column row ─────────────────────────────────── */}
      <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: 18 }}>

        {/* Workflow runs panel */}
        <div style={{
          borderRadius: 16, overflow: "hidden",
          background: "var(--o1)",
          border: "1px solid rgba(255,255,255,0.07)",
          display: "flex", flexDirection: "column",
        }}>
          {/* Panel header */}
          <div style={{
            display: "flex", alignItems: "center", justifyContent: "space-between",
            padding: "22px 28px", borderBottom: "1px solid rgba(255,255,255,0.06)",
          }}>
            <div>
              <h2 style={{ fontSize: 16, fontWeight: 700, color: "var(--c1)", margin: 0 }}>
                Recent Workflow Runs
              </h2>
              <p style={{ fontSize: 13, marginTop: 5, color: "var(--c3)", margin: "5px 0 0" }}>
                Last {Math.min(runs.length || 8, 8)} automation runs
              </p>
            </div>
            <Link href="/leads" style={{
              fontSize: 13, fontWeight: 600, padding: "7px 14px", borderRadius: 8, textDecoration: "none",
              background: "rgba(124,58,237,0.1)", color: "#a78bfa",
              transition: "background 0.15s",
            }}
            onMouseEnter={e => { e.currentTarget.style.background = "rgba(124,58,237,0.18)"; }}
            onMouseLeave={e => { e.currentTarget.style.background = "rgba(124,58,237,0.1)"; }}
            >
              View all →
            </Link>
          </div>

          {/* Rows */}
          <div style={{ flex: 1 }}>
            {runs.length === 0 && !loading ? (
              <div style={{ padding: "60px 28px", textAlign: "center" }}>
                <div style={{
                  width: 52, height: 52, borderRadius: 16, margin: "0 auto 16px",
                  background: "rgba(124,58,237,0.1)",
                  display: "flex", alignItems: "center", justifyContent: "center",
                }}>
                  <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
                    <path d="M11 3v16M3 11h16" stroke="#a78bfa" strokeWidth="1.8" strokeLinecap="round"/>
                  </svg>
                </div>
                <p style={{ fontSize: 15, fontWeight: 600, color: "var(--c2)", margin: "0 0 6px" }}>No runs yet</p>
                <p style={{ fontSize: 13, color: "var(--c3)", margin: 0 }}>
                  Start by running a lead discovery or generating content
                </p>
              </div>
            ) : (
              (loading ? Array.from({ length: 5 }) : runs.slice(0, 8)).map((run, idx) => {
                if (loading) {
                  return (
                    <div key={idx} style={{
                      margin: "12px 20px", height: 56, borderRadius: 12,
                      background: "var(--o1)",
                      animation: "pulse 1.5s ease-in-out infinite",
                    }} />
                  );
                }
                const r = run as WorkflowRun;
                const s = STATUS_STYLES[r.status] ?? STATUS_STYLES.pending;
                return (
                  <div key={r.id} style={{
                    display: "flex", alignItems: "center", gap: 16,
                    padding: "16px 28px",
                    borderBottom: "1px solid rgba(255,255,255,0.04)",
                    transition: "background 0.13s",
                  }}
                  onMouseEnter={e => { e.currentTarget.style.background = "rgba(255,255,255,0.025)"; }}
                  onMouseLeave={e => { e.currentTarget.style.background = "transparent"; }}
                  >
                    <div style={{
                      width: 9, height: 9, borderRadius: "50%", flexShrink: 0,
                      background: s.color,
                      boxShadow: s.pulse ? `0 0 8px ${s.color}` : "none",
                    }} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                        <span style={{ fontSize: 14, fontWeight: 500, color: "var(--c2)" }}>
                          {TYPE_LABELS[r.workflow_type] ?? r.workflow_type}
                        </span>
                        {r.output_summary?.leads_found != null && r.output_summary.leads_found > 0 && (
                          <span style={{
                            fontSize: 11, padding: "2px 8px", borderRadius: 6, fontWeight: 700,
                            background: "rgba(167,139,250,0.14)", color: "#a78bfa",
                          }}>
                            +{r.output_summary.leads_found} leads
                          </span>
                        )}
                      </div>
                      <div style={{ fontSize: 12, marginTop: 4, color: "var(--c4)" }}>
                        {timeAgo(r.started_at)}
                      </div>
                    </div>
                    <span style={{
                      fontSize: 12, fontWeight: 600, padding: "4px 10px", borderRadius: 8, flexShrink: 0,
                      background: s.bg, color: s.color,
                    }}>
                      {s.label}
                    </span>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Quick actions panel */}
        <div style={{
          borderRadius: 16, overflow: "hidden", display: "flex", flexDirection: "column",
          background: "var(--o1)",
          border: "1px solid rgba(255,255,255,0.07)",
        }}>
          <div style={{
            padding: "22px 24px", borderBottom: "1px solid rgba(255,255,255,0.06)",
          }}>
            <h2 style={{ fontSize: 16, fontWeight: 700, color: "var(--c1)", margin: 0 }}>Quick Actions</h2>
            <p style={{ fontSize: 13, marginTop: 5, color: "var(--c3)", margin: "5px 0 0" }}>Jump to any tool instantly</p>
          </div>

          <div style={{ padding: "12px", display: "flex", flexDirection: "column", gap: 4, flex: 1 }}>
            {QUICK_ACTIONS.map((action) => (
              <Link key={action.label} href={action.href} style={{
                display: "flex", alignItems: "center", gap: 14,
                padding: "14px 14px", borderRadius: 12, textDecoration: "none",
                background: "transparent",
                border: "1px solid transparent",
                transition: "all 0.13s",
              }}
              onMouseEnter={e => {
                e.currentTarget.style.background = `${action.color}0d`;
                e.currentTarget.style.borderColor = `${action.color}28`;
              }}
              onMouseLeave={e => {
                e.currentTarget.style.background = "transparent";
                e.currentTarget.style.borderColor = "transparent";
              }}
              >
                <span style={{
                  width: 40, height: 40, borderRadius: 11, flexShrink: 0,
                  background: `${action.color}14`, color: action.color,
                  display: "flex", alignItems: "center", justifyContent: "center",
                }}>
                  {action.icon}
                </span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 14, fontWeight: 600, color: "var(--c1)" }}>{action.label}</div>
                  <div style={{ fontSize: 13, marginTop: 3, color: "var(--c3)" }}>{action.description}</div>
                </div>
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none" style={{ color: "var(--c4)", flexShrink: 0 }}>
                  <path d="M5 3.5l4 3.5-4 3.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </Link>
            ))}
          </div>

          {/* Plan chip */}
          {data?.org && (
            <div style={{ padding: "0 16px 16px" }}>
              <div style={{
                padding: "14px 16px", borderRadius: 12,
                background: "rgba(124,58,237,0.07)",
                border: "1px solid rgba(124,58,237,0.14)",
              }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
                  <span style={{ fontSize: 13, fontWeight: 700, color: "#a78bfa", textTransform: "capitalize" }}>
                    {data.org.plan} Plan
                  </span>
                  <Link href="/settings" style={{ fontSize: 12, color: "var(--c4)", textDecoration: "none" }}>
                    Upgrade →
                  </Link>
                </div>
                <div style={{ fontSize: 12, color: "var(--c4)", lineHeight: 1.6 }}>
                  {data.stats.leads_total.toLocaleString()} leads · {data.stats.content_total.toLocaleString()} content pieces
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
