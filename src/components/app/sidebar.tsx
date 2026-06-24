"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { logoutAction } from "@/app/(auth)/sign-in/actions";

const NAV_SECTIONS = [
  {
    label: "Overview",
    items: [
      {
        label: "Dashboard",
        href: "/dashboard",
        icon: <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><rect x="1" y="1" width="6" height="6" rx="1.5" stroke="currentColor" strokeWidth="1.5"/><rect x="9" y="1" width="6" height="6" rx="1.5" stroke="currentColor" strokeWidth="1.5"/><rect x="1" y="9" width="6" height="6" rx="1.5" stroke="currentColor" strokeWidth="1.5"/><rect x="9" y="9" width="6" height="6" rx="1.5" stroke="currentColor" strokeWidth="1.5"/></svg>,
      },
      {
        label: "Analytics",
        href: "/analytics",
        icon: <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M2 12V8M5.5 12V5M9 12V7M12.5 12V3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg>,
      },
    ],
  },
  {
    label: "Growth",
    items: [
      {
        label: "Leads",
        href: "/leads",
        icon: <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><circle cx="8" cy="5" r="3" stroke="currentColor" strokeWidth="1.5"/><path d="M2 14.5c0-3.3 2.7-5.5 6-5.5s6 2.2 6 5.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg>,
      },
      {
        label: "Campaigns",
        href: "/campaigns",
        icon: <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><rect x="1.5" y="3" width="13" height="11" rx="1.5" stroke="currentColor" strokeWidth="1.5"/><path d="M5 2v2M11 2v2M1.5 7h13" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg>,
      },
      {
        label: "Social Inbox",
        href: "/social",
        icon: <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M14 8c0 3.3-2.7 5.5-6 5.5a7 7 0 0 1-2.4-.42L2 14.5l.85-3A5 5 0 0 1 2 8C2 4.7 4.7 2 8 2s6 2.7 6 6z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round"/></svg>,
      },
      {
        label: "Growth Intel",
        href: "/growth-intelligence",
        icon: <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><circle cx="8" cy="8" r="6" stroke="currentColor" strokeWidth="1.5"/><path d="M5.5 8c0-1.38 1.12-2.5 2.5-2.5S10.5 6.62 10.5 8 9.38 10.5 8 10.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/><circle cx="8" cy="8" r="1" fill="currentColor"/></svg>,
      },
    ],
  },
  {
    label: "Content",
    items: [
      {
        label: "Content Studio",
        href: "/content-studio",
        icon: <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M2 11L7 6l3 3 4-5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/><circle cx="13.5" cy="3" r="1.5" stroke="currentColor" strokeWidth="1.3"/></svg>,
      },
      {
        label: "Brand Studio",
        href: "/brand-studio",
        icon: <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M8 1.5l2 5h5.3l-4.3 3.1 1.6 5-4.6-2.4-4.6 2.4 1.6-5L.7 6.5H6z" stroke="currentColor" strokeWidth="1.3" strokeLinejoin="round"/></svg>,
      },
      {
        label: "SEO Lab",
        href: "/seo",
        icon: <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><circle cx="7" cy="7" r="4.5" stroke="currentColor" strokeWidth="1.5"/><path d="M11 11l3.5 3.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg>,
      },
      {
        label: "Backlinks",
        href: "/backlinks",
        icon: <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M7 10.5L5.5 12A2.5 2.5 0 0 1 2 8.5L5 5.5A2.5 2.5 0 0 1 8.9 5.6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/><path d="M9 5.5l1.5-1.5A2.5 2.5 0 0 1 14 7.5l-3 3A2.5 2.5 0 0 1 7.1 10.4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg>,
      },
    ],
  },
  {
    label: "Settings",
    items: [
      {
        label: "Social Accounts",
        href: "/settings/social",
        icon: <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><circle cx="5" cy="4.5" r="2" stroke="currentColor" strokeWidth="1.4"/><circle cx="11" cy="4.5" r="2" stroke="currentColor" strokeWidth="1.4"/><circle cx="5" cy="11.5" r="2" stroke="currentColor" strokeWidth="1.4"/><path d="M7 4.5h1.5M7 11.5h2a2 2 0 0 0 2-2V9" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/></svg>,
      },
      {
        label: "Brand Voice",
        href: "/settings/voice",
        icon: <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M3.5 8.5A4.5 4.5 0 0 1 8 4a4.5 4.5 0 0 1 4.5 4.5v3l1 1.5H2.5l1-1.5V8.5z" stroke="currentColor" strokeWidth="1.4"/><path d="M6.5 13.5a1.5 1.5 0 0 0 3 0" stroke="currentColor" strokeWidth="1.4"/></svg>,
      },
    ],
  },
];

const PLAN_COLORS: Record<string, { text: string; bg: string }> = {
  free:    { text: "#94a3b8", bg: "rgba(148,163,184,0.12)" },
  starter: { text: "#60a5fa", bg: "rgba(96,165,250,0.12)" },
  pro:     { text: "#a78bfa", bg: "rgba(167,139,250,0.12)" },
  agency:  { text: "#fbbf24", bg: "rgba(251,191,36,0.12)" },
};

interface MeData {
  user: { name: string; email: string; avatar_url: string | null };
  org: { id: string; name: string; plan: string; usage_leads_mo: number; limits_leads_mo: number };
  role: string;
}

interface SidebarProps {
  mobile?: boolean;
  onClose?: () => void;
}

export function Sidebar({ mobile, onClose }: SidebarProps) {
  const pathname = usePathname();
  const [me, setMe] = useState<MeData | null>(null);

  useEffect(() => {
    fetch("/api/me")
      .then((r) => r.ok ? r.json() : null)
      .then((d) => { if (d) setMe(d); })
      .catch(() => {});
  }, []);

  const orgName     = me?.org.name   ?? "My Workspace";
  const planName    = me?.org.plan   ?? "free";
  const userName    = me?.user.name  ?? "Demo User";
  const userEmail   = me?.user.email ?? "";
  const userInitial = userName.charAt(0).toUpperCase();
  const orgInitial  = orgName.charAt(0).toUpperCase();
  const plan        = PLAN_COLORS[planName] ?? PLAN_COLORS.free;

  return (
    <aside style={{
      display: "flex", flexDirection: "column", height: "100%",
      width: mobile ? 264 : 252,
      background: "#0e0d18",
      borderRight: "1px solid rgba(255,255,255,0.06)",
      flexShrink: 0,
    }}>

      {/* ── Logo ───────────────────────────────────────────────── */}
      <div style={{
        display: "flex", alignItems: "center", gap: 12,
        padding: "0 20px", height: 64, flexShrink: 0,
        borderBottom: "1px solid rgba(255,255,255,0.06)",
      }}>
        <div style={{
          width: 34, height: 34, borderRadius: 10, flexShrink: 0,
          background: "linear-gradient(135deg, #7c3aed 0%, #4f46e5 100%)",
          boxShadow: "0 0 16px rgba(124,58,237,0.35)",
          display: "flex", alignItems: "center", justifyContent: "center",
        }}>
          <svg width="15" height="15" viewBox="0 0 15 15" fill="none">
            <path d="M2.5 7.5L6.5 3.5L8 5L5 7.5L8 10L6.5 11.5L2.5 7.5Z" fill="white" fillOpacity="0.9"/>
            <path d="M8 5L12.5 7.5L8 10L10 7.5L8 5Z" fill="white"/>
          </svg>
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 15, fontWeight: 700, letterSpacing: "-0.03em", color: "rgba(255,255,255,0.92)" }}>
            SignafyAI
          </div>
          <div style={{ fontSize: 11, color: "rgba(255,255,255,0.3)", marginTop: 2 }}>Growth OS</div>
        </div>
        {mobile && (
          <button onClick={onClose} style={{
            padding: 6, borderRadius: 8, background: "none", border: "none",
            color: "rgba(255,255,255,0.4)", cursor: "pointer",
          }}>
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
              <path d="M3 3l8 8M11 3l-8 8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
            </svg>
          </button>
        )}
      </div>

      {/* ── Workspace selector ─────────────────────────────────── */}
      <div style={{ padding: "12px 12px 4px" }}>
        <Link href="/settings" onClick={onClose} style={{
          display: "flex", alignItems: "center", gap: 10,
          padding: "10px 12px", borderRadius: 10, textDecoration: "none",
          background: "rgba(255,255,255,0.04)",
          border: "1px solid rgba(255,255,255,0.07)",
          transition: "border-color 0.15s",
        }}
        onMouseEnter={e => { e.currentTarget.style.borderColor = "rgba(255,255,255,0.14)"; }}
        onMouseLeave={e => { e.currentTarget.style.borderColor = "rgba(255,255,255,0.07)"; }}
        >
          <div style={{
            width: 30, height: 30, borderRadius: 8, flexShrink: 0,
            background: "rgba(124,58,237,0.15)",
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: 13, fontWeight: 700, color: "#a78bfa",
          }}>
            {orgInitial}
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 13, fontWeight: 600, color: "rgba(255,255,255,0.82)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
              {orgName}
            </div>
            <div style={{
              display: "inline-block", marginTop: 3,
              fontSize: 10, fontWeight: 600, textTransform: "capitalize",
              padding: "1px 7px", borderRadius: 100,
              background: plan.bg, color: plan.text,
            }}>
              {planName}
            </div>
          </div>
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none" style={{ color: "rgba(255,255,255,0.25)", flexShrink: 0 }}>
            <path d="M3 4.5L6 7.5L9 4.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </Link>
      </div>

      {/* ── Navigation ─────────────────────────────────────────── */}
      <nav style={{ flex: 1, padding: "4px 12px 12px", overflowY: "auto" }}>
        {NAV_SECTIONS.map((section) => (
          <div key={section.label} style={{ marginBottom: 4 }}>

            {/* Section label */}
            <div style={{
              padding: "16px 8px 6px",
              fontSize: 10, fontWeight: 700, letterSpacing: "0.1em",
              textTransform: "uppercase", color: "rgba(255,255,255,0.22)",
            }}>
              {section.label}
            </div>

            {/* Items */}
            <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
              {section.items.map((item) => {
                const isActive = pathname === item.href ||
                  (item.href !== "/dashboard" && pathname.startsWith(item.href));
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={onClose}
                    style={{
                      display: "flex", alignItems: "center", gap: 10,
                      padding: "9px 10px", borderRadius: 9,
                      textDecoration: "none", transition: "all 0.13s",
                      fontSize: 14, fontWeight: isActive ? 600 : 450,
                      background: isActive ? "rgba(124,58,237,0.14)" : "transparent",
                      color: isActive ? "#c4b5fd" : "rgba(255,255,255,0.52)",
                      borderLeft: isActive ? "2px solid #7c3aed" : "2px solid transparent",
                    }}
                    onMouseEnter={e => {
                      if (!isActive) {
                        e.currentTarget.style.background = "rgba(255,255,255,0.05)";
                        e.currentTarget.style.color = "rgba(255,255,255,0.82)";
                      }
                    }}
                    onMouseLeave={e => {
                      if (!isActive) {
                        e.currentTarget.style.background = "transparent";
                        e.currentTarget.style.color = "rgba(255,255,255,0.52)";
                      }
                    }}
                  >
                    <span style={{ flexShrink: 0, opacity: isActive ? 1 : 0.7 }}>
                      {item.icon}
                    </span>
                    {item.label}
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      {/* ── Bottom — settings + user ───────────────────────────── */}
      <div style={{
        padding: "12px",
        borderTop: "1px solid rgba(255,255,255,0.06)",
        display: "flex", flexDirection: "column", gap: 4,
      }}>
        {/* Settings link */}
        <Link href="/settings" onClick={onClose} style={{
          display: "flex", alignItems: "center", gap: 10,
          padding: "9px 10px", borderRadius: 9,
          textDecoration: "none", transition: "all 0.13s",
          fontSize: 14, fontWeight: pathname === "/settings" ? 600 : 450,
          background: pathname === "/settings" ? "rgba(124,58,237,0.14)" : "transparent",
          color: pathname === "/settings" ? "#c4b5fd" : "rgba(255,255,255,0.52)",
        }}
        onMouseEnter={e => {
          if (pathname !== "/settings") {
            e.currentTarget.style.background = "rgba(255,255,255,0.05)";
            e.currentTarget.style.color = "rgba(255,255,255,0.82)";
          }
        }}
        onMouseLeave={e => {
          if (pathname !== "/settings") {
            e.currentTarget.style.background = "transparent";
            e.currentTarget.style.color = "rgba(255,255,255,0.52)";
          }
        }}
        >
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none" style={{ flexShrink: 0, opacity: 0.7 }}>
            <circle cx="8" cy="8" r="2.5" stroke="currentColor" strokeWidth="1.5"/>
            <path d="M8 1.5v1.3M8 13.2v1.3M1.5 8h1.3M13.2 8h1.3M3.4 3.4l.9.9M11.7 11.7l.9.9M3.4 12.6l.9-.9M11.7 4.3l.9-.9" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>
          </svg>
          Settings
        </Link>

        {/* User card */}
        <div style={{
          display: "flex", alignItems: "center", gap: 10,
          padding: "10px 12px", borderRadius: 10,
          background: "rgba(255,255,255,0.04)",
          border: "1px solid rgba(255,255,255,0.07)",
        }}>
          <div style={{
            width: 32, height: 32, borderRadius: 9, flexShrink: 0,
            background: "linear-gradient(135deg, #7c3aed, #4f46e5)",
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: 13, fontWeight: 700, color: "white",
          }}>
            {userInitial}
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 13, fontWeight: 600, color: "rgba(255,255,255,0.82)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
              {userName}
            </div>
            <div style={{ fontSize: 11, color: "rgba(255,255,255,0.3)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", marginTop: 2 }}>
              {userEmail}
            </div>
          </div>
          <form action={logoutAction}>
            <button
              type="submit"
              title="Sign out"
              style={{
                width: 28, height: 28, borderRadius: 7, border: "none",
                background: "transparent", cursor: "pointer", flexShrink: 0,
                display: "flex", alignItems: "center", justifyContent: "center",
                color: "rgba(255,255,255,0.3)", transition: "all 0.15s",
              }}
              onMouseEnter={e => {
                e.currentTarget.style.color = "#f87171";
                e.currentTarget.style.background = "rgba(220,38,38,0.1)";
              }}
              onMouseLeave={e => {
                e.currentTarget.style.color = "rgba(255,255,255,0.3)";
                e.currentTarget.style.background = "transparent";
              }}
            >
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                <path d="M5 12H3.5A1 1 0 0 1 2.5 11V3A1 1 0 0 1 3.5 2H5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>
                <path d="M9 10L12 7 9 4M12 7H5.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </button>
          </form>
        </div>
      </div>
    </aside>
  );
}
