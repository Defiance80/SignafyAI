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

// Light-theme friendly status colors
const STATUS_STYLES: Record<string, { label: string; color: string; bg: string; dot?: boolean }> = {
  complete: { label: "Complete", color: "#059669", bg: "rgba(5,150,105,0.1)" },
  running:  { label: "Running",  color: "#2563eb", bg: "rgba(37,99,235,0.1)", dot: true },
  pending:  { label: "Pending",  color: "#d97706", bg: "rgba(217,119,6,0.1)" },
  failed:   { label: "Failed",   color: "#dc2626", bg: "rgba(220,38,38,0.1)" },
};

const QUICK_ACTIONS = [
  {
    label: "Find Leads",
    description: "Launch a new discovery run",
    href: "/leads",
    color: "#7c3aed",
    icon: <svg width="17" height="17" viewBox="0 0 17 17" fill="none"><circle cx="8.5" cy="6" r="3.2" stroke="currentColor" strokeWidth="1.5"/><path d="M3 15.5c0-3.314 2.686-5 5.5-5s5.5 1.686 5.5 5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg>,
  },
  {
    label: "Generate Content",
    description: "Create platform-ready posts",
    href: "/content",
    color: "#0891b2",
    icon: <svg width="17" height="17" viewBox="0 0 17 17" fill="none"><rect x="2" y="2" width="13" height="13" rx="2.5" stroke="currentColor" strokeWidth="1.5"/><path d="M5 6.5h7M5 9.5h5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg>,
  },
  {
    label: "SEO Research",
    description: "Generate keyword clusters",
    href: "/seo",
    color: "#059669",
    icon: <svg width="17" height="17" viewBox="0 0 17 17" fill="none"><circle cx="7.5" cy="7.5" r="5" stroke="currentColor" strokeWidth="1.5"/><path d="M12 12l3.5 3.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg>,
  },
  {
    label: "Find Backlinks",
    description: "Discover link opportunities",
    href: "/backlinks",
    color: "#d97706",
    icon: <svg width="17" height="17" viewBox="0 0 17 17" fill="none"><path d="M7 10.5l-1.8 1.8a2.8 2.8 0 0 1-3.96-3.96l3.75-3.75A2.8 2.8 0 0 1 9 4.7" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/><path d="M10 6.5l1.8-1.8a2.8 2.8 0 0 1 3.96 3.96l-3.75 3.75A2.8 2.8 0 0 1 8 12.3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg>,
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

// Minimal sparkline
function Sparkline({ color, up }: { color: string; up: boolean }) {
  const pts = up
    ? "0,18 10,14 20,16 30,10 40,12 50,6 60,8 70,4 80,6 90,2"
    : "0,4 10,6 20,4 30,8 40,6 50,10 60,8 70,12 80,10 90,14";
  return (
    <svg width="90" height="22" viewBox="0 0 90 22" fill="none">
      <polyline points={pts} stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" opacity="0.6"/>
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

  const doneCount = SETUP_CHECKLIST.filter((i) => i.done).length;
  const totalCount = SETUP_CHECKLIST.length;

  const STAT_CARDS = [
    {
      label: "Total Prospects",
      value: loading ? "—" : (stats?.leads_total ?? 0).toLocaleString(),
      delta: loading ? "" : `+${stats?.leads_week ?? 0} this week`,
      up:    (stats?.leads_week ?? 0) > 0,
      color: "#7c3aed",
      icon:  <svg width="17" height="17" viewBox="0 0 17 17" fill="none"><circle cx="8.5" cy="5.5" r="3" stroke="currentColor" strokeWidth="1.4"/><path d="M2.5 15c0-3.314 2.686-5 6-5s6 1.686 6 5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/></svg>,
    },
    {
      label: "Content Pieces",
      value: loading ? "—" : (stats?.content_total ?? 0).toLocaleString(),
      delta: loading ? "" : `+${stats?.content_week ?? 0} this week`,
      up:    (stats?.content_week ?? 0) > 0,
      color: "#0891b2",
      icon:  <svg width="17" height="17" viewBox="0 0 17 17" fill="none"><rect x="2" y="2" width="13" height="13" rx="2.5" stroke="currentColor" strokeWidth="1.4"/><path d="M5 6.5h7M5 9.5h5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/></svg>,
    },
    {
      label: "Workflow Runs",
      value: loading ? "—" : runs.length.toString(),
      delta: "Total recorded",
      up:    runs.length > 0,
      color: "#059669",
      icon:  <svg width="17" height="17" viewBox="0 0 17 17" fill="none"><path d="M8.5 3v11M3 8.5h11" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/></svg>,
    },
    {
      label: "Active Campaigns",
      value: "—",
      delta: "Coming soon",
      up:    null as boolean | null,
      color: "#d97706",
      icon:  <svg width="17" height="17" viewBox="0 0 17 17" fill="none"><rect x="2" y="3.5" width="13" height="11" rx="2" stroke="currentColor" strokeWidth="1.4"/><path d="M5.5 2v3M11.5 2v3M2 8h13" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/></svg>,
    },
  ];

  return (
    <div className="p-5 sm:p-7 max-w-[1400px] mx-auto space-y-5">

      {/* ── Welcome banner (LeadHub-style) ──────────────────────── */}
      <div
        className="rounded-2xl px-6 py-4 flex items-center justify-between animate-fade-up"
        style={{
          background: "var(--color-surface)",
          border: "1px solid var(--color-border)",
          boxShadow: "0 1px 3px rgba(0,0,0,0.06)",
        }}
      >
        <div>
          <p className="text-[11px] font-medium mb-0.5" style={{ color: "var(--color-text-muted)" }}>
            {greeting}{data?.org.name ? `, ${data.org.name}` : ""}
          </p>
          <h1
            className="text-xl font-bold"
            style={{ fontFamily: "var(--font-syne)", color: "var(--color-text-1)" }}
          >
            Growth Dashboard
          </h1>
          <p className="text-xs mt-1" style={{ color: "var(--color-text-muted)" }}>
            Live snapshot of your leads, prospects, and automation activity.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-[11px]" style={{ color: "var(--color-text-muted)" }}>
            Refreshes every 30s
          </span>
          <Link
            href="/leads"
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all duration-200"
            style={{
              background: "linear-gradient(135deg, #7c3aed 0%, #4f46e5 100%)",
              color: "white",
              boxShadow: "0 3px 12px rgba(124,58,237,0.3)",
            }}
          >
            <svg width="13" height="13" viewBox="0 0 13 13" fill="none">
              <path d="M6.5 2v9M2 6.5h9" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
            </svg>
            New Discovery
          </Link>
        </div>
      </div>

      {/* ── Setup checklist (collapsible) ───────────────────────── */}
      <div
        className="rounded-2xl overflow-hidden animate-fade-up delay-100"
        style={{
          background: "var(--color-surface)",
          border: "1px solid var(--color-border)",
          boxShadow: "0 1px 3px rgba(0,0,0,0.06)",
        }}
      >
        <button
          onClick={() => setChecklistOpen((v) => !v)}
          className="w-full flex items-center justify-between px-6 py-4 transition-colors"
          style={{ background: "transparent" }}
          onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = "var(--color-surface-2)"; }}
          onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = "transparent"; }}
        >
          <div className="flex items-center gap-3">
            <div>
              <h2 className="text-sm font-semibold text-left" style={{ color: "var(--color-text-1)" }}>
                Setup checklist
              </h2>
              <p className="text-[11px] text-left mt-0.5" style={{ color: "var(--color-text-muted)" }}>
                Complete these steps to get the most out of SignafyAI — {doneCount}/{totalCount} done
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {/* Progress bar */}
            <div className="hidden sm:flex items-center gap-2">
              <div className="w-32 h-1.5 rounded-full" style={{ background: "var(--color-border)" }}>
                <div
                  className="h-1.5 rounded-full transition-all duration-500"
                  style={{
                    background: "linear-gradient(90deg, #7c3aed, #4f46e5)",
                    width: `${(doneCount / totalCount) * 100}%`,
                  }}
                />
              </div>
              <span className="text-xs font-semibold" style={{ color: "#7c3aed" }}>
                {Math.round((doneCount / totalCount) * 100)}%
              </span>
            </div>
            <svg
              width="13" height="13" viewBox="0 0 13 13" fill="none"
              style={{
                color: "var(--color-text-muted)",
                transition: "transform 0.2s",
                transform: checklistOpen ? "rotate(0deg)" : "rotate(-90deg)",
              }}
            >
              <path d="M2 4.5L6.5 9L11 4.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </div>
        </button>

        {checklistOpen && (
          <div style={{ borderTop: "1px solid var(--color-border-subtle)" }}>
            <div className="px-6 py-3 grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-5 gap-2">
              {SETUP_CHECKLIST.map((item) => (
                <div key={item.key} className="flex items-center gap-2.5">
                  {item.done ? (
                    <div
                      className="w-4 h-4 rounded-full flex items-center justify-center flex-shrink-0"
                      style={{ background: "rgba(5,150,105,0.12)" }}
                    >
                      <svg width="9" height="9" viewBox="0 0 9 9" fill="none">
                        <path d="M1.5 4.5L3.5 6.5L7.5 2.5" stroke="#059669" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                    </div>
                  ) : (
                    <div
                      className="w-4 h-4 rounded-full flex-shrink-0"
                      style={{ border: "1.5px solid var(--color-border)" }}
                    />
                  )}
                  {item.href && !item.done ? (
                    <Link
                      href={item.href}
                      className="text-xs font-medium transition-colors"
                      style={{ color: "#7c3aed", textDecoration: "underline", textDecorationStyle: "dotted" }}
                    >
                      {item.label}
                    </Link>
                  ) : (
                    <span
                      className="text-xs font-medium"
                      style={{
                        color: item.done ? "var(--color-text-muted)" : "var(--color-text-2)",
                        textDecoration: item.done ? "line-through" : "none",
                      }}
                    >
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
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
        {STAT_CARDS.map((card, i) => (
          <div
            key={card.label}
            className="rounded-2xl p-5 animate-fade-up transition-all duration-200 cursor-default relative overflow-hidden"
            style={{
              background: "var(--color-surface)",
              border: "1px solid var(--color-border)",
              boxShadow: "0 1px 3px rgba(0,0,0,0.05)",
              animationDelay: `${(i + 2) * 0.06}s`,
            }}
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLElement).style.boxShadow = `0 6px 20px ${card.color}14`;
              (e.currentTarget as HTMLElement).style.borderColor = `${card.color}35`;
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLElement).style.boxShadow = "0 1px 3px rgba(0,0,0,0.05)";
              (e.currentTarget as HTMLElement).style.borderColor = "var(--color-border)";
            }}
          >
            {/* Subtle color wash top-right */}
            <div
              className="absolute top-0 right-0 w-24 h-24 rounded-full pointer-events-none"
              style={{
                background: `radial-gradient(circle, ${card.color}14 0%, transparent 70%)`,
                transform: "translate(40%, -40%)",
              }}
            />
            <div className="relative">
              <div className="flex items-center justify-between mb-3">
                <span
                  className="p-2 rounded-xl"
                  style={{ background: `${card.color}12`, color: card.color }}
                >
                  {card.icon}
                </span>
                {card.up !== null && (
                  <span
                    className="text-[10px] font-bold px-2 py-0.5 rounded-lg"
                    style={{
                      background: card.up ? "rgba(5,150,105,0.1)"  : "rgba(220,38,38,0.1)",
                      color:      card.up ? "#059669" : "#dc2626",
                    }}
                  >
                    {card.up ? "↑ Up" : "↓ Down"}
                  </span>
                )}
              </div>
              <div
                className={`text-3xl font-bold tabular-nums mb-0.5 ${loading ? "animate-pulse" : ""}`}
                style={{ fontFamily: "var(--font-syne)", color: "var(--color-text-1)" }}
              >
                {card.value}
              </div>
              <div className="text-xs font-medium" style={{ color: "var(--color-text-2)" }}>
                {card.label}
              </div>
              {card.delta && (
                <div className="text-[10px] mt-0.5" style={{ color: "var(--color-text-muted)" }}>
                  {card.delta}
                </div>
              )}
              {card.up !== null && (
                <div className="mt-3 -mb-1 -mx-1 opacity-50">
                  <Sparkline color={card.color} up={!!card.up} />
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* ── Main two-column row ─────────────────────────────────── */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-5">

        {/* Workflow runs */}
        <div
          className="xl:col-span-2 rounded-2xl animate-fade-up delay-300 overflow-hidden"
          style={{
            background: "var(--color-surface)",
            border: "1px solid var(--color-border)",
            boxShadow: "0 1px 3px rgba(0,0,0,0.05)",
          }}
        >
          <div
            className="flex items-center justify-between px-6 py-4"
            style={{ borderBottom: "1px solid var(--color-border-subtle)" }}
          >
            <div>
              <h2 className="text-sm font-semibold" style={{ color: "var(--color-text-1)" }}>
                Recent Workflow Runs
              </h2>
              <p className="text-[11px] mt-0.5" style={{ color: "var(--color-text-muted)" }}>
                Last {Math.min(runs.length, 8)} automation runs across all workflows
              </p>
            </div>
            <Link
              href="/leads"
              className="text-xs font-semibold px-3 py-1.5 rounded-lg transition-all"
              style={{ background: "rgba(124,58,237,0.08)", color: "#7c3aed" }}
              onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = "rgba(124,58,237,0.14)"; }}
              onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = "rgba(124,58,237,0.08)"; }}
            >
              View all →
            </Link>
          </div>

          {runs.length === 0 && !loading ? (
            <div className="px-6 py-12 text-center">
              <div
                className="w-12 h-12 rounded-2xl flex items-center justify-center mx-auto mb-3"
                style={{ background: "rgba(124,58,237,0.08)" }}
              >
                <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
                  <path d="M11 3v16M3 11h16" stroke="#7c3aed" strokeWidth="1.8" strokeLinecap="round"/>
                </svg>
              </div>
              <p className="text-sm font-semibold mb-1" style={{ color: "var(--color-text-1)" }}>No runs yet</p>
              <p className="text-xs" style={{ color: "var(--color-text-muted)" }}>
                Start by running a lead discovery or generating content
              </p>
            </div>
          ) : (
            <div>
              {(loading ? Array.from({ length: 5 }) : runs.slice(0, 8)).map((run, idx) => {
                if (loading) {
                  return (
                    <div
                      key={idx}
                      className="h-14 animate-pulse mx-5 my-2 rounded-xl"
                      style={{ background: "var(--color-surface-2)" }}
                    />
                  );
                }
                const r = run as WorkflowRun;
                const s = STATUS_STYLES[r.status] ?? STATUS_STYLES.pending;
                return (
                  <div
                    key={r.id}
                    className="flex items-center gap-4 px-6 py-3.5 transition-colors cursor-default"
                    style={{ borderBottom: "1px solid var(--color-border-subtle)" }}
                    onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = "var(--color-surface-2)"; }}
                    onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = "transparent"; }}
                  >
                    <div
                      className="w-2 h-2 rounded-full flex-shrink-0"
                      style={{
                        background: s.color,
                        boxShadow: s.dot ? `0 0 5px ${s.color}` : "none",
                      }}
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-sm font-medium" style={{ color: "var(--color-text-1)" }}>
                          {TYPE_LABELS[r.workflow_type] ?? r.workflow_type}
                        </span>
                        {r.output_summary?.leads_found != null && r.output_summary.leads_found > 0 && (
                          <span
                            className="text-[10px] px-1.5 py-0.5 rounded-md font-bold"
                            style={{ background: "rgba(124,58,237,0.1)", color: "#7c3aed" }}
                          >
                            +{r.output_summary.leads_found} leads
                          </span>
                        )}
                      </div>
                      <div className="text-[11px] mt-0.5" style={{ color: "var(--color-text-muted)" }}>
                        {timeAgo(r.started_at)}
                      </div>
                    </div>
                    <span
                      className="text-[11px] font-semibold px-2.5 py-1 rounded-lg flex-shrink-0"
                      style={{ background: s.bg, color: s.color }}
                    >
                      {s.dot ? (
                        <span className="flex items-center gap-1.5">
                          <span className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: s.color }} />
                          Running
                        </span>
                      ) : s.label}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Quick actions */}
        <div
          className="rounded-2xl animate-fade-up delay-400 flex flex-col overflow-hidden"
          style={{
            background: "var(--color-surface)",
            border: "1px solid var(--color-border)",
            boxShadow: "0 1px 3px rgba(0,0,0,0.05)",
          }}
        >
          <div
            className="px-5 py-4"
            style={{ borderBottom: "1px solid var(--color-border-subtle)" }}
          >
            <h2 className="text-sm font-semibold" style={{ color: "var(--color-text-1)" }}>Quick Actions</h2>
            <p className="text-[11px] mt-0.5" style={{ color: "var(--color-text-muted)" }}>Jump to any tool</p>
          </div>

          <div className="p-3 flex-1 space-y-1">
            {QUICK_ACTIONS.map((action) => (
              <Link
                key={action.label}
                href={action.href}
                className="flex items-center gap-3 p-3 rounded-xl transition-all duration-150 group"
                style={{ background: "transparent", border: "1px solid transparent" }}
                onMouseEnter={(e) => {
                  (e.currentTarget as HTMLElement).style.background = `${action.color}08`;
                  (e.currentTarget as HTMLElement).style.borderColor = `${action.color}25`;
                }}
                onMouseLeave={(e) => {
                  (e.currentTarget as HTMLElement).style.background = "transparent";
                  (e.currentTarget as HTMLElement).style.borderColor = "transparent";
                }}
              >
                <span
                  className="p-2 rounded-xl flex-shrink-0"
                  style={{ background: `${action.color}12`, color: action.color }}
                >
                  {action.icon}
                </span>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-semibold" style={{ color: "var(--color-text-1)" }}>{action.label}</div>
                  <div className="text-[11px]" style={{ color: "var(--color-text-muted)" }}>{action.description}</div>
                </div>
                <svg
                  width="13" height="13" viewBox="0 0 13 13" fill="none"
                  style={{ color: "var(--color-text-muted)", flexShrink: 0, opacity: 0 }}
                  className="group-hover:opacity-100 transition-opacity"
                >
                  <path d="M4.5 3l4 3.5-4 3.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </Link>
            ))}
          </div>

          {/* Plan / upgrade pill */}
          {data?.org && (
            <div className="px-4 pb-4">
              <div
                className="p-3.5 rounded-xl"
                style={{
                  background: "rgba(124,58,237,0.05)",
                  border: "1px solid rgba(124,58,237,0.12)",
                }}
              >
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-xs font-bold capitalize" style={{ color: "#7c3aed" }}>
                    {data.org.plan} Plan
                  </span>
                  <Link href="/settings" className="text-[10px] font-medium" style={{ color: "var(--color-text-muted)" }}>
                    Upgrade →
                  </Link>
                </div>
                <div className="text-[11px]" style={{ color: "var(--color-text-muted)" }}>
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