"use client";

const STATS = [
  {
    label: "Leads Found",
    value: "2,847",
    delta: "+124 this week",
    up: true,
    color: "#6d28d9",
    icon: (
      <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
        <circle cx="9" cy="6" r="3.5" stroke="currentColor" strokeWidth="1.5" />
        <path d="M2.5 16c0-3.59 2.91-6 6.5-6s6.5 2.41 6.5 6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      </svg>
    ),
  },
  {
    label: "Content Generated",
    value: "184",
    delta: "+31 this week",
    up: true,
    color: "#0891b2",
    icon: (
      <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
        <rect x="2" y="2" width="14" height="14" rx="2.5" stroke="currentColor" strokeWidth="1.5" />
        <path d="M5.5 7h7M5.5 10h5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      </svg>
    ),
  },
  {
    label: "Social Replies",
    value: "943",
    delta: "+67 this week",
    up: true,
    color: "#059669",
    icon: (
      <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
        <path d="M16 9c0 3.866-3.134 6.5-7 6.5a8.3 8.3 0 0 1-2.917-.52L2 16.5l1.02-3.68A6.12 6.12 0 0 1 2 9C2 5.134 5.134 2.5 9 2.5S16 5.134 16 9z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
      </svg>
    ),
  },
  {
    label: "Active Campaigns",
    value: "12",
    delta: "3 launching soon",
    up: null,
    color: "#d97706",
    icon: (
      <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
        <rect x="2" y="3.5" width="14" height="13" rx="2" stroke="currentColor" strokeWidth="1.5" />
        <path d="M5.5 2v3M12.5 2v3M2 8.5h14" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      </svg>
    ),
  },
];

const WORKFLOW_RUNS = [
  { id: "wf-001", type: "Lead Discovery", org: "Acme Agency", status: "complete", duration: "1m 24s", time: "2 min ago", leads: 43 },
  { id: "wf-002", type: "Content Generation", org: "Acme Agency", status: "complete", duration: "38s", time: "15 min ago", leads: null },
  { id: "wf-003", type: "SEO Research", org: "Acme Agency", status: "running", duration: "—", time: "Just now", leads: null },
  { id: "wf-004", type: "Social Classification", org: "Acme Agency", status: "complete", duration: "12s", time: "1 hr ago", leads: null },
  { id: "wf-005", type: "Lead Discovery", org: "Acme Agency", status: "failed", duration: "—", time: "2 hr ago", leads: null },
];

const QUICK_ACTIONS = [
  {
    label: "Find Leads",
    description: "Launch a new lead discovery run",
    href: "/leads",
    color: "#6d28d9",
    icon: (
      <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
        <circle cx="10" cy="7" r="4" stroke="currentColor" strokeWidth="1.5" />
        <path d="M3 18c0-3.866 3.134-6 7-6s7 2.134 7 6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      </svg>
    ),
  },
  {
    label: "Generate Content",
    description: "Create platform-ready posts",
    href: "/content",
    color: "#0891b2",
    icon: (
      <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
        <path d="M4 6h12M4 10h8M4 14h6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      </svg>
    ),
  },
  {
    label: "SEO Research",
    description: "Generate keyword clusters",
    href: "/seo",
    color: "#059669",
    icon: (
      <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
        <circle cx="9" cy="9" r="6" stroke="currentColor" strokeWidth="1.5" />
        <path d="M13.5 13.5L17 17" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      </svg>
    ),
  },
  {
    label: "Review Inbox",
    description: "5 replies awaiting approval",
    href: "/social",
    color: "#ef4444",
    icon: (
      <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
        <path d="M18 10c0 4.418-3.582 7.5-8 7.5a9.5 9.5 0 0 1-3.334-.594L2 18.5l1.167-4.205A7.013 7.013 0 0 1 2 10C2 5.582 5.582 2.5 10 2.5S18 5.582 18 10z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
      </svg>
    ),
    alert: true,
  },
];

const STATUS_STYLES: Record<string, { label: string; color: string; bg: string }> = {
  complete: { label: "Complete", color: "#34d399", bg: "rgba(52,211,153,0.1)" },
  running: { label: "Running", color: "#60a5fa", bg: "rgba(96,165,250,0.1)" },
  failed: { label: "Failed", color: "#f87171", bg: "rgba(248,113,113,0.1)" },
};

export default function DashboardPage() {
  const now = new Date();
  const hour = now.getHours();
  const greeting = hour < 12 ? "Good morning" : hour < 18 ? "Good afternoon" : "Good evening";

  return (
    <div className="p-5 sm:p-8 max-w-[1400px] mx-auto space-y-8">
      {/* Page header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 animate-fade-up">
        <div>
          <p className="text-sm mb-1" style={{ color: "var(--color-text-2)" }}>
            {greeting}, Demo 👋
          </p>
          <h1
            className="text-2xl sm:text-3xl font-bold"
            style={{ fontFamily: "var(--font-syne)", color: "var(--color-text-1)" }}
          >
            Growth Dashboard
          </h1>
        </div>
        <div className="flex items-center gap-3">
          {/* Notification bell */}
          <button
            className="p-2.5 rounded-xl relative hidden sm:flex items-center justify-center"
            style={{
              background: "var(--color-surface)",
              border: "1px solid var(--color-border)",
              color: "var(--color-text-2)",
            }}
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <path d="M8 2a5 5 0 0 1 5 5v2l1.5 2.5H1.5L3 9V7a5 5 0 0 1 5-5z" stroke="currentColor" strokeWidth="1.4" />
              <path d="M6.5 13a1.5 1.5 0 0 0 3 0" stroke="currentColor" strokeWidth="1.4" />
            </svg>
            <span
              className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full"
              style={{ background: "#ef4444", border: "2px solid var(--color-bg)" }}
            />
          </button>

          <button
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all duration-200"
            style={{
              background: "linear-gradient(135deg, #7c3aed 0%, #4f46e5 100%)",
              color: "white",
              boxShadow: "0 4px 12px rgba(124,58,237,0.3)",
            }}
          >
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
              <path d="M7 2v10M2 7h10" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
            </svg>
            New Workflow
          </button>
        </div>
      </div>

      {/* Stats cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        {STATS.map((stat, i) => (
          <div
            key={stat.label}
            className="rounded-2xl p-5 animate-fade-up relative overflow-hidden group transition-all duration-300"
            style={{
              background: "var(--color-surface)",
              border: "1px solid var(--color-border)",
              animationDelay: `${i * 0.07}s`,
            }}
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLElement).style.border = `1px solid ${stat.color}33`;
              (e.currentTarget as HTMLElement).style.boxShadow = `0 8px 24px ${stat.color}15`;
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLElement).style.border = "1px solid var(--color-border)";
              (e.currentTarget as HTMLElement).style.boxShadow = "none";
            }}
          >
            {/* Ambient glow */}
            <div
              className="absolute top-0 right-0 w-24 h-24 rounded-full pointer-events-none opacity-30"
              style={{
                background: `radial-gradient(circle, ${stat.color}25 0%, transparent 70%)`,
                transform: "translate(25%, -25%)",
              }}
            />
            <div className="relative">
              <div className="flex items-center justify-between mb-4">
                <span
                  className="p-2 rounded-xl"
                  style={{ background: `${stat.color}18`, color: stat.color }}
                >
                  {stat.icon}
                </span>
                {stat.up !== null && (
                  <span
                    className="text-xs font-semibold flex items-center gap-1 px-2 py-1 rounded-lg"
                    style={{
                      background: stat.up ? "rgba(52,211,153,0.1)" : "rgba(248,113,113,0.1)",
                      color: stat.up ? "#34d399" : "#f87171",
                    }}
                  >
                    <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                      <path
                        d={stat.up ? "M5 7V3M3 5l2-2 2 2" : "M5 3v4M3 5l2 2 2-2"}
                        stroke="currentColor"
                        strokeWidth="1.5"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                    {stat.up ? "Up" : "Down"}
                  </span>
                )}
              </div>
              <div
                className="text-3xl font-bold mb-1"
                style={{ fontFamily: "var(--font-syne)", color: "var(--color-text-1)" }}
              >
                {stat.value}
              </div>
              <div className="text-xs" style={{ color: "var(--color-text-2)" }}>
                <span style={{ color: "var(--color-text-muted)" }}>{stat.label}</span>
                <span className="mx-1.5">·</span>
                {stat.delta}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Main content row */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        {/* Workflow runs */}
        <div
          className="xl:col-span-2 rounded-2xl animate-fade-up delay-200"
          style={{
            background: "var(--color-surface)",
            border: "1px solid var(--color-border)",
          }}
        >
          <div
            className="flex items-center justify-between px-6 py-4"
            style={{ borderBottom: "1px solid var(--color-border-subtle)" }}
          >
            <h2 className="font-semibold text-sm" style={{ fontFamily: "var(--font-syne)", color: "var(--color-text-1)" }}>
              Recent Workflow Runs
            </h2>
            <button className="text-xs font-medium transition-colors" style={{ color: "var(--color-accent-light)" }}>
              View all →
            </button>
          </div>

          <div className="divide-y" style={{ borderColor: "var(--color-border-subtle)" }}>
            {WORKFLOW_RUNS.map((run) => {
              const s = STATUS_STYLES[run.status];
              return (
                <div
                  key={run.id}
                  className="flex items-center gap-4 px-6 py-4 transition-colors"
                  style={{ cursor: "default" }}
                  onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = "var(--color-surface-2)"; }}
                  onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = "transparent"; }}
                >
                  {/* Status dot */}
                  <div
                    className="w-2 h-2 rounded-full flex-shrink-0"
                    style={{
                      background: s.color,
                      boxShadow: run.status === "running" ? `0 0 6px ${s.color}` : "none",
                    }}
                  />

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm font-medium" style={{ color: "var(--color-text-1)" }}>
                        {run.type}
                      </span>
                      {run.leads && (
                        <span
                          className="text-[10px] px-1.5 py-0.5 rounded-md font-semibold"
                          style={{ background: "rgba(109,40,217,0.15)", color: "#a78bfa" }}
                        >
                          +{run.leads} leads
                        </span>
                      )}
                    </div>
                    <div className="text-xs mt-0.5" style={{ color: "var(--color-text-muted)" }}>
                      {run.time} · {run.duration !== "—" ? `Ran in ${run.duration}` : "—"}
                    </div>
                  </div>

                  <span
                    className="text-[11px] font-semibold px-2.5 py-1 rounded-lg flex-shrink-0"
                    style={{ background: s.bg, color: s.color }}
                  >
                    {run.status === "running" ? (
                      <span className="flex items-center gap-1.5">
                        <span className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: s.color }} />
                        Running
                      </span>
                    ) : (
                      s.label
                    )}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Quick actions */}
        <div
          className="rounded-2xl animate-fade-up delay-300"
          style={{
            background: "var(--color-surface)",
            border: "1px solid var(--color-border)",
          }}
        >
          <div
            className="px-6 py-4"
            style={{ borderBottom: "1px solid var(--color-border-subtle)" }}
          >
            <h2 className="font-semibold text-sm" style={{ fontFamily: "var(--font-syne)", color: "var(--color-text-1)" }}>
              Quick Actions
            </h2>
          </div>
          <div className="p-4 space-y-2">
            {QUICK_ACTIONS.map((action) => (
              <a
                key={action.label}
                href={action.href}
                className="flex items-center gap-3 p-3.5 rounded-xl transition-all duration-150 group"
                style={{
                  border: "1px solid var(--color-border-subtle)",
                  background: "var(--color-surface-2)",
                }}
                onMouseEnter={(e) => {
                  (e.currentTarget as HTMLElement).style.border = `1px solid ${action.color}35`;
                  (e.currentTarget as HTMLElement).style.background = `${action.color}0a`;
                }}
                onMouseLeave={(e) => {
                  (e.currentTarget as HTMLElement).style.border = "1px solid var(--color-border-subtle)";
                  (e.currentTarget as HTMLElement).style.background = "var(--color-surface-2)";
                }}
              >
                <span
                  className="p-2 rounded-xl flex-shrink-0"
                  style={{ background: `${action.color}18`, color: action.color }}
                >
                  {action.icon}
                </span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold" style={{ color: "var(--color-text-1)" }}>
                      {action.label}
                    </span>
                    {action.alert && (
                      <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: "#ef4444" }} />
                    )}
                  </div>
                  <span className="text-xs" style={{ color: "var(--color-text-muted)" }}>
                    {action.description}
                  </span>
                </div>
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none" style={{ color: "var(--color-text-muted)", flexShrink: 0 }}>
                  <path d="M5 3l4 4-4 4" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </a>
            ))}
          </div>

          {/* n8n health */}
          <div
            className="mx-4 mb-4 p-4 rounded-xl"
            style={{ background: "rgba(52,211,153,0.06)", border: "1px solid rgba(52,211,153,0.15)" }}
          >
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold" style={{ color: "#34d399" }}>
                Automation Engine
              </span>
              <span className="flex items-center gap-1.5 text-xs" style={{ color: "#34d399" }}>
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                Online
              </span>
            </div>
            <div className="space-y-1.5">
              {["Lead Discovery", "Content Engine", "Social Response", "SEO Research"].map((wf) => (
                <div key={wf} className="flex items-center justify-between">
                  <span className="text-[11px]" style={{ color: "var(--color-text-muted)" }}>{wf}</span>
                  <span className="text-[11px]" style={{ color: "#34d399" }}>✓ Ready</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Brand voice summary */}
      <div
        className="rounded-2xl p-6 animate-fade-up delay-400 relative overflow-hidden"
        style={{
          background: "var(--color-surface)",
          border: "1px solid var(--color-border)",
        }}
      >
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background: "radial-gradient(ellipse at 80% 50%, rgba(109,40,217,0.06) 0%, transparent 70%)",
          }}
        />
        <div className="relative flex flex-col sm:flex-row sm:items-center gap-6">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2">
              <span
                className="p-1.5 rounded-lg"
                style={{ background: "rgba(124,58,237,0.15)", color: "#a78bfa" }}
              >
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                  <path d="M7 2l1.5 3.5L12 6.5 9 9l.5 3.5L7 11 4.5 12.5 5 9 2 6.5l3.5-1L7 2z" stroke="currentColor" strokeWidth="1.3" strokeLinejoin="round" />
                </svg>
              </span>
              <h3 className="text-sm font-semibold" style={{ fontFamily: "var(--font-syne)", color: "var(--color-text-1)" }}>
                Brand Voice Active
              </h3>
            </div>
            <p className="text-sm" style={{ color: "var(--color-text-2)" }}>
              All AI outputs are calibrated to{" "}
              <span style={{ color: "#a78bfa" }}>professional, warm, and consultative</span> tone.
              Platform-specific rules applied for Instagram, LinkedIn, and TikTok.
            </p>
          </div>
          <div className="flex items-center gap-3 flex-shrink-0">
            <a
              href="/settings"
              className="px-4 py-2 rounded-xl text-sm font-medium transition-all duration-150"
              style={{
                background: "var(--color-surface-2)",
                border: "1px solid var(--color-border)",
                color: "var(--color-text-2)",
              }}
            >
              Edit Voice
            </a>
            <a
              href="/content"
              className="px-4 py-2 rounded-xl text-sm font-semibold transition-all duration-150"
              style={{
                background: "rgba(124,58,237,0.15)",
                border: "1px solid rgba(124,58,237,0.3)",
                color: "#a78bfa",
              }}
            >
              Generate Content →
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
