"use client";

import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";

const PAGE_TITLES: Record<string, { title: string; parent?: string }> = {
  "/dashboard":           { title: "Dashboard" },
  "/leads":               { title: "Leads",            parent: "Growth" },
  "/campaigns":           { title: "Campaigns",        parent: "Growth" },
  "/social":              { title: "Social Inbox",     parent: "Growth" },
  "/growth-intelligence": { title: "Growth Intel",     parent: "Growth" },
  "/content-studio":      { title: "Content Studio",   parent: "Content" },
  "/brand-studio":        { title: "Brand Studio",     parent: "Content" },
  "/seo":                 { title: "SEO Lab",          parent: "Content" },
  "/backlinks":           { title: "Backlinks",        parent: "Content" },
  "/analytics":           { title: "Analytics",        parent: "Overview" },
  "/settings":            { title: "Settings" },
  "/settings/social":     { title: "Social Accounts",  parent: "Settings" },
  "/settings/voice":      { title: "Brand Voice",      parent: "Settings" },
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

  const meta = PAGE_TITLES[pathname] ??
    Object.entries(PAGE_TITLES)
      .filter(([k]) => pathname.startsWith(k) && k !== "/")
      .sort((a, b) => b[0].length - a[0].length)[0]?.[1] ??
    { title: "SignafyAI" };

  const userInitial = me?.user.name?.charAt(0).toUpperCase() ?? "U";

  return (
    <header style={{
      display: "flex", alignItems: "center", justifyContent: "space-between",
      padding: "0 28px", height: 64, flexShrink: 0,
      background: "#0e0d18",
      borderBottom: "1px solid rgba(255,255,255,0.06)",
      position: "sticky", top: 0, zIndex: 30,
    }}>

      {/* Left — nav arrows + breadcrumb */}
      <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
        <div style={{ display: "flex", gap: 4 }}>
          {/* Back */}
          <button onClick={() => router.back()} style={{
            width: 30, height: 30, borderRadius: 8,
            display: "flex", alignItems: "center", justifyContent: "center",
            background: "transparent", border: "none", cursor: "pointer",
            color: "rgba(255,255,255,0.35)", transition: "all 0.13s",
          }}
          onMouseEnter={e => { e.currentTarget.style.background = "rgba(255,255,255,0.06)"; e.currentTarget.style.color = "rgba(255,255,255,0.8)"; }}
          onMouseLeave={e => { e.currentTarget.style.background = "transparent"; e.currentTarget.style.color = "rgba(255,255,255,0.35)"; }}
          >
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
              <path d="M8.5 3L5 7l3.5 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </button>
          {/* Forward */}
          <button onClick={() => router.forward()} style={{
            width: 30, height: 30, borderRadius: 8,
            display: "flex", alignItems: "center", justifyContent: "center",
            background: "transparent", border: "none", cursor: "pointer",
            color: "rgba(255,255,255,0.35)", transition: "all 0.13s",
          }}
          onMouseEnter={e => { e.currentTarget.style.background = "rgba(255,255,255,0.06)"; e.currentTarget.style.color = "rgba(255,255,255,0.8)"; }}
          onMouseLeave={e => { e.currentTarget.style.background = "transparent"; e.currentTarget.style.color = "rgba(255,255,255,0.35)"; }}
          >
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
              <path d="M5.5 3L9 7l-3.5 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </button>
        </div>

        {/* Divider */}
        <div style={{ width: 1, height: 20, background: "rgba(255,255,255,0.08)" }} />

        {/* Breadcrumb */}
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          {meta.parent && (
            <>
              <span style={{ fontSize: 14, color: "rgba(255,255,255,0.3)" }}>{meta.parent}</span>
              <svg width="12" height="12" viewBox="0 0 12 12" fill="none" style={{ color: "rgba(255,255,255,0.18)" }}>
                <path d="M4.5 3L7.5 6l-3 3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </>
          )}
          <span style={{ fontSize: 15, fontWeight: 600, color: "rgba(255,255,255,0.88)" }}>
            {meta.title}
          </span>
        </div>
      </div>

      {/* Right — actions */}
      <div style={{ display: "flex", alignItems: "center", gap: 4 }}>

        {/* Search */}
        <button style={{
          width: 30, height: 30, borderRadius: 8,
          display: "flex", alignItems: "center", justifyContent: "center",
          background: "transparent", border: "none", cursor: "pointer",
          color: "rgba(255,255,255,0.35)", transition: "all 0.13s",
        }}
        onMouseEnter={e => { e.currentTarget.style.background = "rgba(255,255,255,0.06)"; e.currentTarget.style.color = "rgba(255,255,255,0.8)"; }}
        onMouseLeave={e => { e.currentTarget.style.background = "transparent"; e.currentTarget.style.color = "rgba(255,255,255,0.35)"; }}
        >
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
            <circle cx="7" cy="7" r="4.5" stroke="currentColor" strokeWidth="1.5"/>
            <path d="M11 11l3 3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
          </svg>
        </button>

        {/* Notifications */}
        <div style={{ position: "relative" }}>
          <button
            onClick={() => setNotifOpen((v) => !v)}
            style={{
              width: 30, height: 30, borderRadius: 8, position: "relative",
              display: "flex", alignItems: "center", justifyContent: "center",
              background: notifOpen ? "rgba(255,255,255,0.06)" : "transparent",
              border: "none", cursor: "pointer",
              color: "rgba(255,255,255,0.35)", transition: "all 0.13s",
            }}
            onMouseEnter={e => { e.currentTarget.style.background = "rgba(255,255,255,0.06)"; e.currentTarget.style.color = "rgba(255,255,255,0.8)"; }}
            onMouseLeave={e => {
              if (!notifOpen) { e.currentTarget.style.background = "transparent"; e.currentTarget.style.color = "rgba(255,255,255,0.35)"; }
            }}
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <path d="M8 2a5 5 0 0 1 5 5v2.2l1.3 2.3H1.7L3 9.2V7A5 5 0 0 1 8 2z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round"/>
              <path d="M6.5 13.5a1.5 1.5 0 0 0 3 0" stroke="currentColor" strokeWidth="1.5"/>
            </svg>
            <span style={{
              position: "absolute", top: 5, right: 5, width: 7, height: 7,
              borderRadius: "50%", background: "#ef4444",
              border: "2px solid #0e0d18",
            }} />
          </button>

          {notifOpen && (
            <>
              <div style={{ position: "fixed", inset: 0, zIndex: 40 }} onClick={() => setNotifOpen(false)} />
              <div style={{
                position: "absolute", right: 0, top: 42, width: 300, zIndex: 50,
                background: "#16151f",
                border: "1px solid rgba(255,255,255,0.1)",
                borderRadius: 14,
                boxShadow: "0 12px 40px rgba(0,0,0,0.5)",
                overflow: "hidden",
              }}>
                <div style={{
                  display: "flex", alignItems: "center", justifyContent: "space-between",
                  padding: "14px 16px",
                  borderBottom: "1px solid rgba(255,255,255,0.06)",
                }}>
                  <span style={{ fontSize: 14, fontWeight: 600, color: "rgba(255,255,255,0.88)" }}>Notifications</span>
                  <span style={{
                    fontSize: 11, fontWeight: 600, padding: "2px 8px", borderRadius: 100,
                    background: "rgba(124,58,237,0.15)", color: "#a78bfa",
                  }}>3 new</span>
                </div>
                <div style={{ padding: "8px", display: "flex", flexDirection: "column", gap: 2 }}>
                  {[
                    { title: "Lead discovery complete", time: "2 min ago", color: "#10b981" },
                    { title: "New intent signals found",  time: "1 hr ago",  color: "#7c3aed" },
                    { title: "Weekly report ready",       time: "Yesterday", color: "#3b82f6" },
                  ].map((n) => (
                    <div key={n.title} style={{
                      display: "flex", alignItems: "flex-start", gap: 12,
                      padding: "10px", borderRadius: 10, cursor: "pointer",
                      transition: "background 0.13s",
                    }}
                    onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = "rgba(255,255,255,0.04)"; }}
                    onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = "transparent"; }}
                    >
                      <div style={{ width: 8, height: 8, borderRadius: "50%", background: n.color, flexShrink: 0, marginTop: 4 }} />
                      <div>
                        <p style={{ fontSize: 13, fontWeight: 500, color: "rgba(255,255,255,0.82)", margin: 0 }}>{n.title}</p>
                        <p style={{ fontSize: 11, color: "rgba(255,255,255,0.3)", margin: "3px 0 0" }}>{n.time}</p>
                      </div>
                    </div>
                  ))}
                </div>
                <div style={{ padding: "10px 16px", borderTop: "1px solid rgba(255,255,255,0.06)", textAlign: "center" }}>
                  <button style={{ fontSize: 13, fontWeight: 500, color: "#7c3aed", background: "none", border: "none", cursor: "pointer" }}>
                    Mark all as read
                  </button>
                </div>
              </div>
            </>
          )}
        </div>

        {/* Divider */}
        <div style={{ width: 1, height: 20, background: "rgba(255,255,255,0.08)", margin: "0 6px" }} />

        {/* User pill */}
        <button style={{
          display: "flex", alignItems: "center", gap: 9,
          padding: "5px 10px 5px 5px", borderRadius: 10,
          background: "transparent", border: "none", cursor: "pointer",
          transition: "background 0.13s",
        }}
        onMouseEnter={e => { e.currentTarget.style.background = "rgba(255,255,255,0.05)"; }}
        onMouseLeave={e => { e.currentTarget.style.background = "transparent"; }}
        >
          <div style={{
            width: 30, height: 30, borderRadius: 9, flexShrink: 0,
            background: "linear-gradient(135deg, #7c3aed, #4f46e5)",
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: 13, fontWeight: 700, color: "white",
          }}>
            {userInitial}
          </div>
          <div style={{ textAlign: "left" }}>
            <div style={{ fontSize: 13, fontWeight: 600, lineHeight: 1.2, color: "rgba(255,255,255,0.82)", whiteSpace: "nowrap" }}>
              {me?.user.name ?? "User"}
            </div>
            <div style={{ fontSize: 11, marginTop: 2, textTransform: "capitalize", color: "rgba(255,255,255,0.3)" }}>
              {me?.org.plan ?? "free"} plan
            </div>
          </div>
        </button>
      </div>
    </header>
  );
}
