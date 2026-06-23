"use client";

import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";

const PAGE_TITLES: Record<string, { title: string; parent?: string }> = {
  "/dashboard":  { title: "Dashboard" },
  "/leads":      { title: "Leads",          parent: "Dashboard" },
  "/content":    { title: "Content",        parent: "Dashboard" },
  "/social":     { title: "Social Inbox",   parent: "Dashboard" },
  "/seo":        { title: "SEO Lab",        parent: "Dashboard" },
  "/backlinks":  { title: "Backlinks",      parent: "Dashboard" },
  "/campaigns":  { title: "Campaigns",      parent: "Dashboard" },
  "/analytics":  { title: "Analytics",      parent: "Dashboard" },
  "/settings":   { title: "Settings",       parent: "Dashboard" },
};

interface MeData {
  user: { name: string; email: string; avatar_url: string | null };
  org: { name: string; plan: string };
}

export function Topbar() {
  const pathname = usePathname();
  const router = useRouter();
  const [me, setMe] = useState<MeData | null>(null);
  const [notifOpen, setNotifOpen] = useState(false);

  useEffect(() => {
    fetch("/api/me")
      .then((r) => r.ok ? r.json() : null)
      .then((d) => { if (d) setMe(d); })
      .catch(() => {});
  }, []);

  const meta = PAGE_TITLES[pathname] ?? { title: "Signafy" };
  const userInitial = me?.user.name?.charAt(0).toUpperCase() ?? "U";

  return (
    <header
      className="flex items-center justify-between px-6 h-14 flex-shrink-0"
      style={{
        background: "var(--color-surface)",
        borderBottom: "1px solid var(--color-border)",
        position: "sticky",
        top: 0,
        zIndex: 30,
      }}
    >
      {/* Left — nav arrows + breadcrumb */}
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-1">
          <button
            onClick={() => router.back()}
            className="w-7 h-7 rounded-lg flex items-center justify-center transition-all duration-150"
            style={{ color: "var(--color-text-muted)", background: "transparent" }}
            onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = "var(--color-surface-2)"; (e.currentTarget as HTMLElement).style.color = "var(--color-text-1)"; }}
            onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = "transparent"; (e.currentTarget as HTMLElement).style.color = "var(--color-text-muted)"; }}
          >
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
              <path d="M8.5 3L5 7l3.5 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </button>
          <button
            onClick={() => router.forward()}
            className="w-7 h-7 rounded-lg flex items-center justify-center transition-all duration-150"
            style={{ color: "var(--color-text-muted)", background: "transparent" }}
            onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = "var(--color-surface-2)"; (e.currentTarget as HTMLElement).style.color = "var(--color-text-1)"; }}
            onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = "transparent"; (e.currentTarget as HTMLElement).style.color = "var(--color-text-muted)"; }}
          >
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
              <path d="M5.5 3L9 7l-3.5 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </button>
        </div>

        {/* Divider */}
        <div className="w-px h-4" style={{ background: "var(--color-border)" }} />

        {/* Breadcrumb */}
        <div className="flex items-center gap-1.5">
          {meta.parent && (
            <>
              <span className="text-sm" style={{ color: "var(--color-text-muted)" }}>{meta.parent}</span>
              <svg width="12" height="12" viewBox="0 0 12 12" fill="none" style={{ color: "var(--color-border)" }}>
                <path d="M4.5 3L7.5 6l-3 3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </>
          )}
          <span className="text-sm font-semibold" style={{ color: "var(--color-text-1)" }}>{meta.title}</span>
        </div>
      </div>

      {/* Right — actions */}
      <div className="flex items-center gap-1">
        {/* Search */}
        <button
          className="w-8 h-8 rounded-xl flex items-center justify-center transition-all duration-150"
          style={{ color: "var(--color-text-muted)", background: "transparent" }}
          onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = "var(--color-surface-2)"; (e.currentTarget as HTMLElement).style.color = "var(--color-text-1)"; }}
          onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = "transparent"; (e.currentTarget as HTMLElement).style.color = "var(--color-text-muted)"; }}
        >
          <svg width="15" height="15" viewBox="0 0 15 15" fill="none">
            <circle cx="6.5" cy="6.5" r="4.5" stroke="currentColor" strokeWidth="1.4"/>
            <path d="M10 10l3 3" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>
          </svg>
        </button>

        {/* Notifications */}
        <div className="relative">
          <button
            onClick={() => setNotifOpen((v) => !v)}
            className="w-8 h-8 rounded-xl flex items-center justify-center transition-all duration-150 relative"
            style={{ color: "var(--color-text-muted)", background: notifOpen ? "var(--color-surface-2)" : "transparent" }}
            onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = "var(--color-surface-2)"; (e.currentTarget as HTMLElement).style.color = "var(--color-text-1)"; }}
            onMouseLeave={(e) => { if (!notifOpen) { (e.currentTarget as HTMLElement).style.background = "transparent"; (e.currentTarget as HTMLElement).style.color = "var(--color-text-muted)"; } }}
          >
            <svg width="15" height="15" viewBox="0 0 15 15" fill="none">
              <path d="M7.5 2a4.5 4.5 0 0 1 4.5 4.5v2l1.3 2.2H2.2L3.5 8.5V6.5A4.5 4.5 0 0 1 7.5 2z" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round"/>
              <path d="M6 12.5a1.5 1.5 0 0 0 3 0" stroke="currentColor" strokeWidth="1.4"/>
            </svg>
            <span
              className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full"
              style={{ background: "#ef4444", border: "2px solid var(--color-surface)" }}
            />
          </button>

          {notifOpen && (
            <>
              <div className="fixed inset-0 z-40" onClick={() => setNotifOpen(false)} />
              <div
                className="absolute right-0 top-10 w-72 rounded-2xl z-50 overflow-hidden"
                style={{
                  background: "var(--color-surface)",
                  border: "1px solid var(--color-border)",
                  boxShadow: "0 8px 30px rgba(0,0,0,0.12), 0 2px 8px rgba(0,0,0,0.06)",
                }}
              >
                <div
                  className="flex items-center justify-between px-4 py-3"
                  style={{ borderBottom: "1px solid var(--color-border-subtle)" }}
                >
                  <span className="text-sm font-semibold" style={{ color: "var(--color-text-1)" }}>Notifications</span>
                  <span
                    className="text-[10px] font-semibold px-2 py-0.5 rounded-full"
                    style={{ background: "rgba(124,58,237,0.1)", color: "#7c3aed" }}
                  >
                    3 new
                  </span>
                </div>
                <div className="p-2 space-y-1">
                  {[
                    { title: "Lead discovery complete", time: "2 min ago", color: "#10b981" },
                    { title: "New intent signals found", time: "1 hr ago",  color: "#7c3aed" },
                    { title: "Weekly report ready",      time: "Yesterday", color: "#3b82f6" },
                  ].map((n) => (
                    <div
                      key={n.title}
                      className="flex items-start gap-3 p-3 rounded-xl cursor-pointer transition-all"
                      style={{ background: "transparent" }}
                      onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = "var(--color-surface-2)"; }}
                      onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = "transparent"; }}
                    >
                      <div
                        className="w-2 h-2 rounded-full mt-1.5 flex-shrink-0"
                        style={{ background: n.color }}
                      />
                      <div>
                        <p className="text-xs font-medium" style={{ color: "var(--color-text-1)" }}>{n.title}</p>
                        <p className="text-[10px] mt-0.5" style={{ color: "var(--color-text-muted)" }}>{n.time}</p>
                      </div>
                    </div>
                  ))}
                </div>
                <div
                  className="px-4 py-2.5 text-center"
                  style={{ borderTop: "1px solid var(--color-border-subtle)" }}
                >
                  <button className="text-xs font-medium" style={{ color: "#7c3aed" }}>
                    Mark all as read
                  </button>
                </div>
              </div>
            </>
          )}
        </div>

        {/* Divider */}
        <div className="w-px h-4 mx-1" style={{ background: "var(--color-border)" }} />

        {/* User avatar */}
        <button
          className="flex items-center gap-2 pl-1 pr-2.5 py-1 rounded-xl transition-all duration-150"
          style={{ background: "transparent" }}
          onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = "var(--color-surface-2)"; }}
          onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = "transparent"; }}
        >
          <div
            className="w-7 h-7 rounded-lg flex items-center justify-center text-xs font-bold flex-shrink-0"
            style={{ background: "linear-gradient(135deg, #7c3aed, #4f46e5)", color: "white" }}
          >
            {userInitial}
          </div>
          <div className="hidden sm:block text-left">
            <div className="text-xs font-semibold leading-none" style={{ color: "var(--color-text-1)" }}>
              {me?.user.name ?? "User"}
            </div>
            <div className="text-[10px] mt-0.5 capitalize" style={{ color: "var(--color-text-muted)" }}>
              {me?.org.plan ?? "free"} plan
            </div>
          </div>
        </button>
      </div>
    </header>
  );
}