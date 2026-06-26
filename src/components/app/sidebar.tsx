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
        icon: <svg width="15" height="15" viewBox="0 0 15 15" fill="none"><rect x="1" y="1" width="5.5" height="5.5" rx="1.5" stroke="currentColor" strokeWidth="1.4"/><rect x="8.5" y="1" width="5.5" height="5.5" rx="1.5" stroke="currentColor" strokeWidth="1.4"/><rect x="1" y="8.5" width="5.5" height="5.5" rx="1.5" stroke="currentColor" strokeWidth="1.4"/><rect x="8.5" y="8.5" width="5.5" height="5.5" rx="1.5" stroke="currentColor" strokeWidth="1.4"/></svg>,
      },
      {
        label: "Analytics",
        href: "/analytics",
        icon: <svg width="15" height="15" viewBox="0 0 15 15" fill="none"><path d="M2 11.5V7.5M5.5 11.5V4.5M9 11.5V6.5M12.5 11.5V2.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/></svg>,
      },
    ],
  },
  {
    label: "Growth",
    items: [
      {
        label: "Leads",
        href: "/leads",
        icon: <svg width="15" height="15" viewBox="0 0 15 15" fill="none"><circle cx="7.5" cy="4.5" r="2.5" stroke="currentColor" strokeWidth="1.4"/><path d="M2 13c0-3 2.5-5 5.5-5s5.5 2 5.5 5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/></svg>,
      },
      {
        label: "Campaigns",
        href: "/campaigns",
        icon: <svg width="15" height="15" viewBox="0 0 15 15" fill="none"><rect x="1" y="2.5" width="13" height="10" rx="1.5" stroke="currentColor" strokeWidth="1.4"/><path d="M5 1.5v2M10 1.5v2M1 6.5h13" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/></svg>,
      },
      {
        label: "Social Inbox",
        href: "/social",
        icon: <svg width="15" height="15" viewBox="0 0 15 15" fill="none"><path d="M13 7.5c0 3-2.5 5-5.5 5a6.5 6.5 0 0 1-2.3-.4L1.5 13.5l.8-2.8A4.7 4.7 0 0 1 2 7.5C2 4.46 4.46 2 7.5 2s5.5 2.46 5.5 5.5z" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round"/></svg>,
      },
      {
        label: "Growth Intel",
        href: "/growth-intelligence",
        icon: <svg width="15" height="15" viewBox="0 0 15 15" fill="none"><circle cx="7.5" cy="7.5" r="5.5" stroke="currentColor" strokeWidth="1.4"/><path d="M5 7.5c0-1.38 1.12-2.5 2.5-2.5S10 6.12 10 7.5 8.88 10 7.5 10" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/><circle cx="7.5" cy="7.5" r="1" fill="currentColor"/></svg>,
      },
    ],
  },
  {
    label: "Content",
    items: [
      {
        label: "Content Studio",
        href: "/content-studio",
        icon: <svg width="15" height="15" viewBox="0 0 15 15" fill="none"><path d="M2 10.5L6.5 6l2.5 2.5 4-5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/><circle cx="12.5" cy="2.5" r="1.5" stroke="currentColor" strokeWidth="1.2"/></svg>,
      },
      {
        label: "Brand Studio",
        href: "/brand-studio",
        icon: <svg width="15" height="15" viewBox="0 0 15 15" fill="none"><path d="M7.5 1L9.3 5.5h4.7L10.2 8.4l1.5 4.6L7.5 10.5 3.3 13l1.5-4.6L1 5.5h4.7z" stroke="currentColor" strokeWidth="1.2" strokeLinejoin="round"/></svg>,
      },
      {
        label: "SEO Lab",
        href: "/seo",
        icon: <svg width="15" height="15" viewBox="0 0 15 15" fill="none"><circle cx="6.5" cy="6.5" r="4" stroke="currentColor" strokeWidth="1.4"/><path d="M10 10l3.5 3.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/></svg>,
      },
      {
        label: "Backlinks",
        href: "/backlinks",
        icon: <svg width="15" height="15" viewBox="0 0 15 15" fill="none"><path d="M6.5 9.5L5 11A2.5 2.5 0 0 1 1.5 7.5l3-3A2.5 2.5 0 0 1 8.4 4.6" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/><path d="M8.5 5.5L10 4A2.5 2.5 0 0 1 13.5 7.5l-3 3A2.5 2.5 0 0 1 6.6 10.4" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/></svg>,
      },
    ],
  },
];

const PLAN_BADGE: Record<string, { label: string; color: string; bg: string }> = {
  free:    { label: "Free",    color: "#6B7280", bg: "rgba(107,114,128,0.10)" },
  starter: { label: "Starter", color: "#3B82F6", bg: "rgba(59,130,246,0.10)"  },
  pro:     { label: "Pro",     color: "#7C3AED", bg: "rgba(124,58,237,0.10)"  },
  agency:  { label: "Agency",  color: "#F59E0B", bg: "rgba(245,158,11,0.10)"  },
};

interface MeData {
  user: { name: string; email: string; avatar_url: string | null };
  org:  { id: string; name: string; plan: string; usage_leads_mo: number; limits_leads_mo: number };
  role: string;
}

interface SidebarProps {
  mobile?:  boolean;
  onClose?: () => void;
}

export function Sidebar({ mobile, onClose }: SidebarProps) {
  const pathname = usePathname();
  const [me, setMe] = useState<MeData | null>(null);

  useEffect(() => {
    fetch("/api/me")
      .then((r) => r.ok ? r.json() : null)
      .then((d) => { if (d) setMe(d as MeData); })
      .catch(() => {});
  }, []);

  const orgName     = me?.org.name   ?? "My Workspace";
  const planKey     = me?.org.plan   ?? "free";
  const userName    = me?.user.name  ?? "Demo User";
  const userEmail   = me?.user.email ?? "";
  const userInitial = userName.charAt(0).toUpperCase();
  const orgInitial  = orgName.charAt(0).toUpperCase();
  const plan        = PLAN_BADGE[planKey] ?? PLAN_BADGE.free;

  const isActive = (href: string) =>
    pathname === href || (href !== "/dashboard" && pathname.startsWith(href));

  const isSettingsActive = pathname === "/settings" ||
    pathname.startsWith("/settings/");

  return (
    <aside style={{
      display:       "flex",
      flexDirection: "column",
      height:        "100%",
      width:         mobile ? 260 : 248,
      background:    "var(--nav-bg)",
      borderRight:   "1px solid var(--nav-border)",
      flexShrink:    0,
      transition:    "background 0.2s ease",
    }}>

      {/* ── Logo ──────────────────────────────────────────── */}
      <div style={{
        display:      "flex",
        alignItems:   "center",
        gap:          10,
        padding:      "0 16px",
        height:       60,
        flexShrink:   0,
        borderBottom: "1px solid var(--nav-border)",
      }}>
        {/* Icon mark */}
        <div style={{
          width:          32,
          height:         32,
          borderRadius:   9,
          flexShrink:     0,
          background:     "linear-gradient(135deg, #7c3aed 0%, #4f46e5 100%)",
          display:        "flex",
          alignItems:     "center",
          justifyContent: "center",
        }}>
          <svg width="14" height="14" viewBox="0 0 15 15" fill="none">
            <path d="M2.5 7.5L6.5 3.5L8 5L5 7.5L8 10L6.5 11.5L2.5 7.5Z" fill="white" fillOpacity="0.9"/>
            <path d="M8 5L12.5 7.5L8 10L10 7.5L8 5Z" fill="white"/>
          </svg>
        </div>

        {/* Wordmark */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{
            fontSize:      14,
            fontWeight:    700,
            letterSpacing: "-0.03em",
            color:         "var(--color-text-1)",
            lineHeight:    1.2,
          }}>
            SignafyAI
          </div>
          <div style={{
            fontSize:   10,
            color:      "var(--nav-section)",
            marginTop:  1,
            fontWeight: 500,
          }}>
            Growth OS
          </div>
        </div>

        {mobile && (
          <button
            onClick={onClose}
            style={{
              padding:    6,
              borderRadius: 8,
              background: "none",
              border:     "none",
              cursor:     "pointer",
              color:      "var(--nav-text-dim)",
              transition: "color 0.13s",
            }}
            onMouseEnter={e => { (e.currentTarget).style.color = "var(--color-text-1)"; }}
            onMouseLeave={e => { (e.currentTarget).style.color = "var(--nav-text-dim)"; }}
          >
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
              <path d="M3 3l8 8M11 3l-8 8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
            </svg>
          </button>
        )}
      </div>

      {/* ── Workspace pill ─────────────────────────────── */}
      <div style={{ padding: "10px 10px 4px" }}>
        <Link
          href="/settings"
          onClick={onClose}
          style={{
            display:        "flex",
            alignItems:     "center",
            gap:            9,
            padding:        "8px 10px",
            borderRadius:   9,
            textDecoration: "none",
            background:     "var(--o1)",
            border:         "1px solid var(--nav-border)",
            transition:     "border-color 0.15s, background 0.15s",
          }}
          onMouseEnter={e => {
            e.currentTarget.style.background    = "var(--o2)";
            e.currentTarget.style.borderColor   = "var(--o3)";
          }}
          onMouseLeave={e => {
            e.currentTarget.style.background    = "var(--o1)";
            e.currentTarget.style.borderColor   = "var(--nav-border)";
          }}
        >
          {/* Org avatar */}
          <div style={{
            width:          28,
            height:         28,
            borderRadius:   7,
            flexShrink:     0,
            background:     "rgba(124,58,237,0.12)",
            display:        "flex",
            alignItems:     "center",
            justifyContent: "center",
            fontSize:       12,
            fontWeight:     700,
            color:          "#7C3AED",
          }}>
            {orgInitial}
          </div>

          {/* Org name + plan */}
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{
              fontSize:       12,
              fontWeight:     600,
              color:          "var(--color-text-1)",
              whiteSpace:     "nowrap",
              overflow:       "hidden",
              textOverflow:   "ellipsis",
              lineHeight:     1.3,
            }}>
              {orgName}
            </div>
            <span style={{
              display:         "inline-block",
              marginTop:       2,
              fontSize:        10,
              fontWeight:      600,
              padding:         "1px 6px",
              borderRadius:    100,
              background:      plan.bg,
              color:           plan.color,
              letterSpacing:   "0.02em",
            }}>
              {plan.label}
            </span>
          </div>

          {/* Chevron */}
          <svg width="11" height="11" viewBox="0 0 11 11" fill="none" style={{ color: "var(--nav-text-dim)", flexShrink: 0 }}>
            <path d="M2.5 4L5.5 7L8.5 4" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </Link>
      </div>

      {/* ── Navigation ─────────────────────────────────── */}
      <nav style={{ flex: 1, padding: "0 10px 10px", overflowY: "auto" }}>
        {NAV_SECTIONS.map((section) => (
          <div key={section.label} style={{ marginBottom: 2 }}>

            {/* Section label */}
            <div style={{
              padding:       "14px 10px 5px",
              fontSize:      10,
              fontWeight:    700,
              letterSpacing: "0.08em",
              textTransform: "uppercase" as const,
              color:         "var(--nav-section)",
            }}>
              {section.label}
            </div>

            {/* Nav items */}
            <div style={{ display: "flex", flexDirection: "column", gap: 1 }}>
              {section.items.map((item) => {
                const active = isActive(item.href);
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={onClose}
                    style={{
                      display:        "flex",
                      alignItems:     "center",
                      gap:            9,
                      padding:        "8px 10px",
                      borderRadius:   8,
                      textDecoration: "none",
                      fontSize:       13.5,
                      fontWeight:     active ? 600 : 450,
                      letterSpacing:  active ? "-0.01em" : "0",
                      background:     active ? "var(--nav-active-bg)"   : "transparent",
                      color:          active ? "var(--nav-active-text)" : "var(--nav-text)",
                      transition:     "background 0.12s, color 0.12s",
                    }}
                    onMouseEnter={e => {
                      if (!active) {
                        e.currentTarget.style.background = "var(--nav-hover-bg)";
                        e.currentTarget.style.color      = "var(--color-text-1)";
                      }
                    }}
                    onMouseLeave={e => {
                      if (!active) {
                        e.currentTarget.style.background = "transparent";
                        e.currentTarget.style.color      = "var(--nav-text)";
                      }
                    }}
                  >
                    <span style={{ flexShrink: 0, opacity: active ? 1 : 0.65 }}>
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

      {/* ── Bottom — settings + user ───────────────────── */}
      <div style={{
        padding:    "8px 10px 12px",
        borderTop:  "1px solid var(--nav-border)",
        display:    "flex",
        flexDirection: "column",
        gap:        2,
      }}>

        {/* Settings */}
        <Link
          href="/settings"
          onClick={onClose}
          style={{
            display:        "flex",
            alignItems:     "center",
            gap:            9,
            padding:        "8px 10px",
            borderRadius:   8,
            textDecoration: "none",
            fontSize:       13.5,
            fontWeight:     isSettingsActive ? 600 : 450,
            background:     isSettingsActive ? "var(--nav-active-bg)"   : "transparent",
            color:          isSettingsActive ? "var(--nav-active-text)" : "var(--nav-text)",
            transition:     "background 0.12s, color 0.12s",
          }}
          onMouseEnter={e => {
            if (!isSettingsActive) {
              e.currentTarget.style.background = "var(--nav-hover-bg)";
              e.currentTarget.style.color      = "var(--color-text-1)";
            }
          }}
          onMouseLeave={e => {
            if (!isSettingsActive) {
              e.currentTarget.style.background = "transparent";
              e.currentTarget.style.color      = "var(--nav-text)";
            }
          }}
        >
          <span style={{ flexShrink: 0, opacity: isSettingsActive ? 1 : 0.65 }}>
            <svg width="15" height="15" viewBox="0 0 15 15" fill="none">
              <circle cx="7.5" cy="7.5" r="2" stroke="currentColor" strokeWidth="1.4"/>
              <path d="M7.5 1.5v1.2M7.5 12.3v1.2M1.5 7.5h1.2M12.3 7.5h1.2M3.3 3.3l.85.85M10.85 10.85l.85.85M3.3 11.7l.85-.85M10.85 4.15l.85-.85" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/>
            </svg>
          </span>
          Settings
        </Link>

        {/* User card */}
        <div style={{
          display:        "flex",
          alignItems:     "center",
          gap:            9,
          padding:        "9px 10px",
          marginTop:      4,
          borderRadius:   9,
          background:     "var(--o1)",
          border:         "1px solid var(--nav-border)",
        }}>
          {/* Avatar */}
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

          {/* Name + email */}
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{
              fontSize:      12,
              fontWeight:    600,
              color:         "var(--color-text-1)",
              overflow:      "hidden",
              textOverflow:  "ellipsis",
              whiteSpace:    "nowrap",
              lineHeight:    1.3,
            }}>
              {userName}
            </div>
            <div style={{
              fontSize:     10,
              color:        "var(--nav-text-dim)",
              overflow:     "hidden",
              textOverflow: "ellipsis",
              whiteSpace:   "nowrap",
              marginTop:    1,
            }}>
              {userEmail}
            </div>
          </div>

          {/* Logout */}
          <form action={logoutAction}>
            <button
              type="submit"
              title="Sign out"
              style={{
                width:          26,
                height:         26,
                borderRadius:   7,
                border:         "none",
                background:     "transparent",
                cursor:         "pointer",
                flexShrink:     0,
                display:        "flex",
                alignItems:     "center",
                justifyContent: "center",
                color:          "var(--nav-text-dim)",
                transition:     "all 0.15s",
              }}
              onMouseEnter={e => {
                e.currentTarget.style.color      = "#ef4444";
                e.currentTarget.style.background = "rgba(220,38,38,0.08)";
              }}
              onMouseLeave={e => {
                e.currentTarget.style.color      = "var(--nav-text-dim)";
                e.currentTarget.style.background = "transparent";
              }}
            >
              <svg width="13" height="13" viewBox="0 0 14 14" fill="none">
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
