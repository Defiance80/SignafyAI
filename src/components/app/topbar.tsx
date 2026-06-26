"use client";

import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useTheme } from "@/lib/theme";

const PAGE_TITLES: Record<string, { title: string; parent?: string }> = {
  "/dashboard":           { title: "Dashboard" },
  "/leads":               { title: "Leads",           parent: "Growth" },
  "/campaigns":           { title: "Campaigns",       parent: "Growth" },
  "/social":              { title: "Social Inbox",    parent: "Growth" },
  "/growth-intelligence": { title: "Growth Intel",    parent: "Growth" },
  "/content-studio":      { title: "Content Studio",  parent: "Content" },
  "/brand-studio":        { title: "Brand Studio",    parent: "Content" },
  "/seo":                 { title: "SEO Lab",         parent: "Content" },
  "/backlinks":           { title: "Backlinks",       parent: "Content" },
  "/analytics":           { title: "Analytics",       parent: "Overview" },
  "/settings":            { title: "Settings" },
  "/settings/social":     { title: "Social Accounts", parent: "Settings" },
  "/settings/voice":      { title: "Brand Voice",     parent: "Settings" },
};

interface MeData {
  user: { name: string; email: string; avatar_url: string | null };
  org:  { name: string; plan: string };
}

export function Topbar() {
  const pathname   = usePathname();
  const router     = useRouter();
  const { theme, setTheme } = useTheme();
  const [me, setMe]           = useState<MeData | null>(null);
  const [notifOpen, setNotifOpen] = useState(false);

  useEffect(() => {
    fetch("/api/me")
      .then((r) => r.ok ? r.json() : null)
      .then((d) => { if (d) setMe(d as MeData); })
      .catch(() => {});
  }, []);

  const meta =
    PAGE_TITLES[pathname] ??
    Object.entries(PAGE_TITLES)
      .filter(([k]) => pathname.startsWith(k) && k !== "/")
      .sort((a, b) => b[0].length - a[0].length)[0]?.[1] ??
    { title: "SignafyAI" };

  const userInitial = me?.user.name?.charAt(0).toUpperCase() ?? "U";

  const iconBtn: React.CSSProperties = {
    width:          32,
    height:         32,
    borderRadius:   8,
    display:        "flex",
    alignItems:     "center",
    justifyContent: "center",
    background:     "transparent",
    border:         "none",
    cursor:         "pointer",
    color:          "var(--c3)",
    transition:     "background 0.13s, color 0.13s",
    flexShrink:     0,
  };

  function onIconEnter(e: React.MouseEvent<HTMLButtonElement>) {
    e.currentTarget.style.background = "var(--o2)";
    e.currentTarget.style.color      = "var(--color-text-1)";
  }
  function onIconLeave(e: React.MouseEvent<HTMLButtonElement>) {
    e.currentTarget.style.background = "transparent";
    e.currentTarget.style.color      = "var(--c3)";
  }

  return (
    <header style={{
      display:         "flex",
      alignItems:      "center",
      justifyContent:  "space-between",
      padding:         "0 24px",
      height:          56,
      flexShrink:      0,
      background:      "var(--nav-bg)",
      borderBottom:    "1px solid var(--nav-border)",
      position:        "sticky",
      top:             0,
      zIndex:          30,
      transition:      "background 0.2s ease",
    }}>

      {/* Left — nav arrows + breadcrumb */}
      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
        <div style={{ display: "flex", gap: 2 }}>
          <button
            onClick={() => router.back()}
            style={iconBtn}
            onMouseEnter={onIconEnter}
            onMouseLeave={onIconLeave}
            title="Back"
          >
            <svg width="13" height="13" viewBox="0 0 14 14" fill="none">
              <path d="M8.5 3L5 7l3.5 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </button>
          <button
            onClick={() => router.forward()}
            style={iconBtn}
            onMouseEnter={onIconEnter}
            onMouseLeave={onIconLeave}
            title="Forward"
          >
            <svg width="13" height="13" viewBox="0 0 14 14" fill="none">
              <path d="M5.5 3L9 7l-3.5 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </button>
        </div>

        {/* Divider */}
        <div style={{ width: 1, height: 18, background: "var(--color-border)" }} />

        {/* Breadcrumb */}
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          {meta.parent && (
            <>
              <span style={{ fontSize: 13, color: "var(--c3)", fontWeight: 450 }}>
                {meta.parent}
              </span>
              <svg width="11" height="11" viewBox="0 0 12 12" fill="none" style={{ color: "var(--c4)" }}>
                <path d="M4.5 3L7.5 6l-3 3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </>
          )}
          <span style={{ fontSize: 14, fontWeight: 600, color: "var(--color-text-1)", letterSpacing: "-0.015em" }}>
            {meta.title}
          </span>
        </div>
      </div>

      {/* Right — actions */}
      <div style={{ display: "flex", alignItems: "center", gap: 2 }}>

        {/* Theme toggle */}
        <button
          onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
          style={iconBtn}
          onMouseEnter={onIconEnter}
          onMouseLeave={onIconLeave}
          title={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
        >
          {theme === "dark" ? (
            /* Sun icon — shown in dark mode, click to go light */
            <svg width="15" height="15" viewBox="0 0 15 15" fill="none">
              <circle cx="7.5" cy="7.5" r="3" stroke="currentColor" strokeWidth="1.3"/>
              <path d="M7.5 1.5v1.5M7.5 12v1.5M1.5 7.5H3M12 7.5h1.5M3.5 3.5l1 1M10.5 10.5l1 1M3.5 11.5l1-1M10.5 4.5l1-1" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/>
            </svg>
          ) : (
            /* Moon icon — shown in light mode, click to go dark */
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
              <path d="M12 9.5A6 6 0 0 1 4.5 2a6 6 0 1 0 7.5 7.5z" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          )}
        </button>

        {/* Notifications */}
        <div style={{ position: "relative" }}>
          <button
            onClick={() => setNotifOpen((v) => !v)}
            style={{ ...iconBtn, position: "relative", background: notifOpen ? "var(--o2)" : "transparent" }}
            onMouseEnter={onIconEnter}
            onMouseLeave={e => {
              if (!notifOpen) onIconLeave(e);
            }}
            title="Notifications"
          >
            <svg width="15" height="15" viewBox="0 0 16 16" fill="none">
              <path d="M8 2a5 5 0 0 1 5 5v2.2l1.3 2.3H1.7L3 9.2V7A5 5 0 0 1 8 2z" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round"/>
              <path d="M6.5 13.5a1.5 1.5 0 0 0 3 0" stroke="currentColor" strokeWidth="1.4"/>
            </svg>
            <span style={{
              position:     "absolute",
              top:          6,
              right:        6,
              width:        6,
              height:       6,
              borderRadius: "50%",
              background:   "#ef4444",
              border:       "1.5px solid var(--nav-bg)",
            }} />
          </button>

          {notifOpen && (
            <>
              <div style={{ position: "fixed", inset: 0, zIndex: 40 }} onClick={() => setNotifOpen(false)} />
              <div style={{
                position:     "absolute",
                right:        0,
                top:          42,
                width:        300,
                zIndex:       50,
                background:   "var(--color-surface)",
                border:       "1px solid var(--color-border)",
                borderRadius: 14,
                boxShadow:    "0 12px 40px rgba(0,0,0,0.18), 0 2px 8px rgba(0,0,0,0.10)",
                overflow:     "hidden",
              }}>
                <div style={{
                  display:         "flex",
                  alignItems:      "center",
                  justifyContent:  "space-between",
                  padding:         "13px 16px",
                  borderBottom:    "1px solid var(--color-border-subtle)",
                }}>
                  <span style={{ fontSize: 14, fontWeight: 600, color: "var(--color-text-1)" }}>
                    Notifications
                  </span>
                  <span style={{
                    fontSize:     11,
                    fontWeight:   600,
                    padding:      "2px 8px",
                    borderRadius: 100,
                    background:   "rgba(124,58,237,0.12)",
                    color:        "#7C3AED",
                  }}>
                    3 new
                  </span>
                </div>

                <div style={{ padding: "6px", display: "flex", flexDirection: "column", gap: 1 }}>
                  {[
                    { title: "Lead discovery complete",  time: "2 min ago",  color: "#10b981" },
                    { title: "New intent signals found",  time: "1 hr ago",   color: "#7c3aed" },
                    { title: "Weekly report ready",       time: "Yesterday",  color: "#3b82f6" },
                  ].map((n) => (
                    <div
                      key={n.title}
                      style={{
                        display:    "flex",
                        alignItems: "flex-start",
                        gap:        10,
                        padding:    "10px 10px",
                        borderRadius: 9,
                        cursor:     "pointer",
                        transition: "background 0.12s",
                      }}
                      onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = "var(--o1)"; }}
                      onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = "transparent"; }}
                    >
                      <div style={{
                        width:       7,
                        height:      7,
                        borderRadius: "50%",
                        background:  n.color,
                        flexShrink:  0,
                        marginTop:   5,
                      }} />
                      <div>
                        <p style={{ fontSize: 13, fontWeight: 500, color: "var(--color-text-1)", margin: 0 }}>
                          {n.title}
                        </p>
                        <p style={{ fontSize: 11, color: "var(--c4)", margin: "3px 0 0" }}>
                          {n.time}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>

                <div style={{
                  padding:      "10px 16px",
                  borderTop:    "1px solid var(--color-border-subtle)",
                  textAlign:    "center",
                }}>
                  <button style={{
                    fontSize:   13,
                    fontWeight: 500,
                    color:      "var(--color-accent)",
                    background: "none",
                    border:     "none",
                    cursor:     "pointer",
                  }}>
                    Mark all as read
                  </button>
                </div>
              </div>
            </>
          )}
        </div>

        {/* Divider */}
        <div style={{ width: 1, height: 18, background: "var(--color-border)", margin: "0 4px" }} />

        {/* User pill */}
        <button
          style={{
            display:    "flex",
            alignItems: "center",
            gap:        8,
            padding:    "5px 10px 5px 5px",
            borderRadius: 9,
            background: "transparent",
            border:     "none",
            cursor:     "pointer",
            transition: "background 0.13s",
          }}
          onMouseEnter={e => { e.currentTarget.style.background = "var(--o2)"; }}
          onMouseLeave={e => { e.currentTarget.style.background = "transparent"; }}
        >
          <div style={{
            width:          30,
            height:         30,
            borderRadius:   8,
            flexShrink:     0,
            background:     "linear-gradient(135deg, #7c3aed, #4f46e5)",
            display:        "flex",
            alignItems:     "center",
            justifyContent: "center",
            fontSize:       12,
            fontWeight:     700,
            color:          "white",
          }}>
            {userInitial}
          </div>
          <div style={{ textAlign: "left" }}>
            <div style={{ fontSize: 13, fontWeight: 600, lineHeight: 1.2, color: "var(--color-text-1)", whiteSpace: "nowrap" }}>
              {me?.user.name ?? "User"}
            </div>
            <div style={{ fontSize: 11, marginTop: 2, textTransform: "capitalize", color: "var(--c4)" }}>
              {me?.org.plan ?? "free"} plan
            </div>
          </div>
        </button>
      </div>
    </header>
  );
}
