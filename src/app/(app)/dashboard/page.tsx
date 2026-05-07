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
  lead_discovery: "Lead Discovery",
  content_generation: "Content Generation",
  seo_research: "SEO Research",
  social_classification: "Social Classification",
};

const STATUS_STYLES: Record<string, { label: string; color: string; bg: string }> = {
  complete: { label: "Complete", color: "#34d399", bg: "rgba(52,211,153,0.1)" },
  running: { label: "Running", color: "#60a5fa", bg: "rgba(96,165,250,0.1)" },
  pending: { label: "Pending", color: "#fbbf24", bg: "rgba(251,191,36,0.1)" },
  failed: { label: "Failed", color: "#f87171", bg: "rgba(248,113,113,0.1)" },
};

const QUICK_ACTIONS = [
  { label: "Find Leads", description: "Launch a new lead discovery run", href: "/leads", color: "#6d28d9", icon: <svg width="20" height="20" viewBox="0 0 20 20" fill="none"><circle cx="10" cy="7" r="4" stroke="currentColor" strokeWidth="1.5"/><path d="M3 18c0-3.866 3.134-6 7-6s7 2.134 7 6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg> },
  { label: "Generate Content", description: "Create platform-ready posts", href: "/content", color: "#0891b2", icon: <svg width="20" height="20" viewBox="0 0 20 20" fill="none"><path d="M4 6h12M4 10h8M4 14h6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg> },
  { label: "SEO Research", description: "Generate keyword clusters", href: "/seo", color: "#059669", icon: <svg width="20" height="20" viewBox="0 0 20 20" fill="none"><circle cx="9" cy="9" r="6" stroke="currentColor" strokeWidth="1.5"/><path d="M13.5 13.5L17 17" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg> },
  { label: "Find Backlinks", description: "Discover link-building opportunities", href: "/backlinks", color: "#d97706", icon: <svg width="20" height="20" viewBox="0 0 20 20" fill="none"><path d="M8 12l-2 2a3 3 0 0 0 4.24 4.24l4-4A3 3 0 0 0 10 10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/><path d="M12 8l2-2a3 3 0 0 0-4.24-4.24l-4 4A3 3 0 0 0 10 10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg> },
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

export default function DashboardPage() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);

  const now = new Date();
  const hour = now.getHours();
  const greeting = hour < 12 ? "Good morning" : hour < 18 ? "Good afternoon" : "Good evening";

  useEffect(() => {
    fetch("/api/dashboard")
      .then((r) => r.json())
      .then((d) => setData(d))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const stats = data?.stats;
  const runs = data?.recent_runs ?? [];

  const STAT_CARDS = [
    {
      label: "Leads Found",
      value: loading ? "—" : (stats?.leads_total ?? 0).toLocaleString(),
      delta: loading ? "" : `+${stats?.leads_week ?? 0} this week`,
      up: (stats?.leads_week ?? 0) > 0,
      color: "#6d28d9",
      icon: <svg width="18" height="18" viewBox="0 0 18 18" fill="none"><circle cx="9" cy="6" r="3.5" stroke="currentColor" strokeWidth="1.5"/><path d="M2.5 16c0-3.59 2.91-6 6.5-6s6.5 2.41 6.5 6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg>,
    },
    {
      label: "Content Generated",
      value: loading ? "—" : (stats?.content_total ?? 0).toLocaleString(),
      delta: loading ? "" : `+${stats?.content_week ?? 0} this week`,
      up: (stats?.content_week ?? 0) > 0,
      color: "#0891b2",
      icon: <svg width="18" height="18" viewBox="0 0 18 18" fill="none"><rect x="2" y="2" width="14" height="14" rx="2.5" stroke="currentColor" strokeWidth="1.5"/><path d="M5.5 7h7M5.5 10h5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg>,
    },
    {
      label: "Workflow Runs",
      value: loading ? "—" : runs.length.toString(),
      delta: "Recent activity",
      up: null as boolean | null,
      color: "#059669",
      icon: <svg width="18" height="18" viewBox="0 0 18 18" fill="none"><path d="M2 9h14M9 2v14" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg>,
    },
    {
      label: "Active Campaigns",
      value: "—",
      delta: "Visit campaigns",
      up: null as boolean | null,
      color: "#d97706",
      icon: <svg width="18" height="18" viewBox="0 0 18 18" fill="none"><rect x="2" y="3.5" width="14" height="13" rx="2" stroke="currentColor" strokeWidth="1.5"/><path d="M5.5 2v3M12.5 2v3M2 8.5h14" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg>,
    },
  ];

  return (
    <div className="p-5 sm:p-8 max-w-[1400px] mx-auto space-y-8">
      {/* Page header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 animate-fade-up">
        <div>
          <p className="text-sm mb-1" style={{ color: "var(--color-text-2)" }}>
            {greeting}{data?.org.name ? `, ${data.org.name}` : ""}
          </p>
          <h1 className="text-2xl sm:text-3xl font-bold" style={{ fontFamily: "var(--font-syne)", color: "var(--color-text-1)" }}>
            Growth Dashboard
          </h1>
        </div>
        <Link
          href="/leads"
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all duration-200 w-fit"
          style={{ background: "linear-gradient(135deg, #7c3aed 0%, #4f46e5 100%)", color: "white", boxShadow: "0 4px 12px rgba(124,58,237,0.3)" }}
        >
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M7 2v10M2 7h10" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/></svg>
          Find Leads
        </Link>
      </div>

      {/* Stats cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        {STAT_CARDS.map((stat, i) => (
          <div
            key={stat.label}
            className="rounded-2xl p-5 animate-fade-up relative overflow-hidden group transition-all duration-300"
            style={{ background: "var(--color-surface)", border: "1px solid var(--color-border)", animationDelay: `${i * 0.07}s` }}
            onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.border = `1px solid ${stat.color}33`; (e.currentTarget as HTMLElement).style.boxShadow = `0 8px 24px ${stat.color}15`; }}
            onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.border = "1px solid var(--color-border)"; (e.currentTarget as HTMLElement).style.boxShadow = "none"; }}
          >
            <div className="absolute top-0 right-0 w-24 h-24 rounded-full pointer-events-none opacity-30" style={{ background: `radial-gradient(circle, ${stat.color}25 0%, transparent 70%)`, transform: "translate(25%, -25%)" }} />
            <div className="relative">
              <div className="flex items-center justify-between mb-4">
                <span className="p-2 rounded-xl" style={{ background: `${stat.color}18`, color: stat.color }}>{stat.icon}</span>
                {stat.up !== null && (
                  <span className="text-xs font-semibold flex items-center gap-1 px-2 py-1 rounded-lg" style={{ background: stat.up ? "rgba(52,211,153,0.1)" : "rgba(248,113,113,0.1)", color: stat.up ? "#34d399" : "#f87171" }}>
                    <svg width="10" height="10" viewBox="0 0 10 10" fill="none"><path d="M5 7V3M3 5l2-2 2 2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
                    Up
                  </span>
                )}
              </div>
              <div className={`text-3xl font-bold mb-1 ${loading ? "animate-pulse" : ""}`} style={{ fontFamily: "var(--font-syne)", color: "var(--color-text-1)" }}>
                {stat.value}
              </div>
              <div className="text-xs" style={{ color: "var(--color-text-2)" }}>
                <span style={{ color: "var(--color-text-muted)" }}>{stat.label}</span>
                {stat.delta && <><span className="mx-1.5">·</span>{stat.delta}</>}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Main content row */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        {/* Workflow runs */}
        <div className="xl:col-span-2 rounded-2xl animate-fade-up delay-200" style={{ background: "var(--color-surface)", border: "1px solid var(--color-border)" }}>
          <div className="flex items-center justify-between px-6 py-4" style={{ borderBottom: "1px solid var(--color-border-subtle)" }}>
            <h2 className="font-semibold text-sm" style={{ fontFamily: "var(--font-syne)", color: "var(--color-text-1)" }}>Recent Workflow Runs</h2>
            <Link href="/leads" className="text-xs font-medium transition-colors" style={{ color: "var(--color-accent-light)" }}>View leads →</Link>
          </div>

          {runs.length === 0 && !loading ? (
            <div className="px-6 py-10 text-center">
              <p className="text-sm" style={{ color: "var(--color-text-muted)" }}>No workflow runs yet. Start by finding leads or generating content.</p>
            </div>
          ) : (
            <div className="divide-y" style={{ borderColor: "var(--color-border-subtle)" }}>
              {(loading ? Array.from({ length: 4 }) : runs).map((run, idx) => {
                if (loading) {
                  return <div key={idx} className="h-16 animate-pulse mx-6 my-3 rounded-xl" style={{ background: "var(--color-surface-2)" }} />;
                }
                const r = run as WorkflowRun;
                const s = STATUS_STYLES[r.status] ?? STATUS_STYLES.pending;
                return (
                  <div key={r.id} className="flex items-center gap-4 px-6 py-4 transition-colors" onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = "var(--color-surface-2)"; }} onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = "transparent"; }}>
                    <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: s.color, boxShadow: r.status === "running" ? `0 0 6px ${s.color}` : "none" }} />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-sm font-medium" style={{ color: "var(--color-text-1)" }}>{TYPE_LABELS[r.workflow_type] ?? r.workflow_type}</span>
                        {r.output_summary?.leads_found != null && (
                          <span className="text-[10px] px-1.5 py-0.5 rounded-md font-semibold" style={{ background: "rgba(109,40,217,0.15)", color: "#a78bfa" }}>+{r.output_summary.leads_found} leads</span>
                        )}
                      </div>
                      <div className="text-xs mt-0.5" style={{ color: "var(--color-text-muted)" }}>{timeAgo(r.started_at)}</div>
                    </div>
                    <span className="text-[11px] font-semibold px-2.5 py-1 rounded-lg flex-shrink-0" style={{ background: s.bg, color: s.color }}>
                      {r.status === "running" ? (
                        <span className="flex items-center gap-1.5"><span className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: s.color }} />Running</span>
                      ) : s.label}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Quick actions */}
        <div className="rounded-2xl animate-fade-up delay-300" style={{ background: "var(--color-surface)", border: "1px solid var(--color-border)" }}>
          <div className="px-6 py-4" style={{ borderBottom: "1px solid var(--color-border-subtle)" }}>
            <h2 className="font-semibold text-sm" style={{ fontFamily: "var(--font-syne)", color: "var(--color-text-1)" }}>Quick Actions</h2>
          </div>
          <div className="p-4 space-y-2">
            {QUICK_ACTIONS.map((action) => (
              <Link
                key={action.label}
                href={action.href}
                className="flex items-center gap-3 p-3.5 rounded-xl transition-all duration-150"
                style={{ border: "1px solid var(--color-border-subtle)", background: "var(--color-surface-2)" }}
                onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.border = `1px solid ${action.color}35`; (e.currentTarget as HTMLElement).style.background = `${action.color}0a`; }}
                onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.border = "1px solid var(--color-border-subtle)"; (e.currentTarget as HTMLElement).style.background = "var(--color-surface-2)"; }}
              >
                <span className="p-2 rounded-xl flex-shrink-0" style={{ background: `${action.color}18`, color: action.color }}>{action.icon}</span>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-semibold" style={{ color: "var(--color-text-1)" }}>{action.label}</div>
                  <span className="text-xs" style={{ color: "var(--color-text-muted)" }}>{action.description}</span>
                </div>
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none" style={{ color: "var(--color-text-muted)", flexShrink: 0 }}><path d="M5 3l4 4-4 4" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/></svg>
              </Link>
            ))}
          </div>

          {data?.org && (
            <div className="mx-4 mb-4 p-4 rounded-xl" style={{ background: "rgba(124,58,237,0.06)", border: "1px solid rgba(124,58,237,0.15)" }}>
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs font-semibold capitalize" style={{ color: "#a78bfa" }}>{data.org.plan} Plan</span>
                <Link href="/settings" className="text-xs" style={{ color: "var(--color-text-muted)" }}>Manage →</Link>
              </div>
              <p className="text-xs" style={{ color: "var(--color-text-muted)" }}>
                {data.stats.leads_total} leads · {data.stats.content_total} content pieces
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
