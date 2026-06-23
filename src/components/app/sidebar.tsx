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
        icon: <svg width="15" height="15" viewBox="0 0 15 15" fill="none"><path d="M1.5 11.5V7M5 11.5V4M8.5 11.5V6.5M12 11.5V2.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/></svg>,
      },
    ],
  },
  {
    label: "Growth",
    items: [
      {
        label: "Leads",
        href: "/leads",
        icon: <svg width="15" height="15" viewBox="0 0 15 15" fill="none"><circle cx="7.5" cy="4.5" r="2.8" stroke="currentColor" strokeWidth="1.4"/><path d="M2 13.5c0-3.038 2.462-4.8 5.5-4.8s5.5 1.762 5.5 4.8" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/></svg>,
      },
      {
        label: "Campaigns",
        href: "/campaigns",
        icon: <svg width="15" height="15" viewBox="0 0 15 15" fill="none"><rect x="1.5" y="3" width="12" height="10" rx="1.5" stroke="currentColor" strokeWidth="1.4"/><path d="M4.5 2v2M10.5 2v2M1.5 6.5h12" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/></svg>,
      },
      {
        label: "Social Inbox",
        href: "/social",
        icon: <svg width="15" height="15" viewBox="0 0 15 15" fill="none"><path d="M13 7.5c0 3.038-2.462 5-5.5 5a6.7 6.7 0 0 1-2.3-.404L2 13.5l.808-2.896A4.83 4.83 0 0 1 2 7.5C2 4.462 4.462 2 7.5 2S13 4.462 13 7.5z" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round"/></svg>,
      },
      {
        label: "Growth Intel",
        href: "/growth-intelligence",
        icon: <svg width="15" height="15" viewBox="0 0 15 15" fill="none"><circle cx="7.5" cy="7.5" r="5.5" stroke="currentColor" strokeWidth="1.4"/><path d="M5 7.5c0-1.38 1.12-2.5 2.5-2.5S10 6.12 10 7.5 8.88 10 7.5 10" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/><circle cx="7.5" cy="7.5" r="0.8" fill="currentColor"/></svg>,
      },
    ],
  },
  {
    label: "Content",
    items: [
      {
        label: "Content Studio",
        href: "/content-studio",
        icon: <svg width="15" height="15" viewBox="0 0 15 15" fill="none"><path d="M2 10.5L6.5 6l2.5 2.5L12 5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/><circle cx="12.5" cy="2.5" r="1.5" stroke="currentColor" strokeWidth="1.3"/></svg>,
      },
      {
        label: "Brand Studio",
        href: "/brand-studio",
        icon: <svg width="15" height="15" viewBox="0 0 15 15" fill="none"><path d="M7.5 1.5l1.8 3.7 4 .6-2.9 2.8.7 4-3.6-1.9-3.6 1.9.7-4L1.7 5.8l4-.6z" stroke="currentColor" strokeWidth="1.3" strokeLinejoin="round"/></svg>,
      },
      {
        label: "SEO Lab",
        href: "/seo",
        icon: <svg width="15" height="15" viewBox="0 0 15 15" fill="none"><circle cx="6.5" cy="6.5" r="4" stroke="currentColor" strokeWidth="1.4"/><path d="M10 10l3 3" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/></svg>,
      },
      {
        label: "Backlinks",
        href: "/backlinks",
        icon: <svg width="15" height="15" viewBox="0 0 15 15" fill="none"><path d="M6.5 9.5L5 11a2.3 2.3 0 0 1-3.25-3.25L4.5 5A2.3 2.3 0 0 1 7.9 5.1" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/><path d="M8.5 5.5L10 4a2.3 2.3 0 0 1 3.25 3.25L10.5 10A2.3 2.3 0 0 1 7.1 9.9" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/></svg>,
      },
    ],
  },
  {
    label: "Settings",
    items: [
      {
        label: "Social Accounts",
        href: "/settings/social",
        icon: <svg width="15" height="15" viewBox="0 0 15 15" fill="none"><circle cx="5" cy="4" r="2" stroke="currentColor" strokeWidth="1.3"/><circle cx="10.5" cy="4" r="2" stroke="currentColor" strokeWidth="1.3"/><circle cx="5" cy="11" r="2" stroke="currentColor" strokeWidth="1.3"/><path d="M7 4h1M7 11h1.5a2 2 0 0 0 2-2V8" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/></svg>,
      },
      {
        label: "Brand Voice",
        href: "/settings/voice",
        icon: <svg width="15" height="15" viewBox="0 0 15 15" fill="none"><path d="M3 7.5a4.5 4.5 0 0 1 9 0v3l1 1.5H2L3 10.5V7.5z" stroke="currentColor" strokeWidth="1.3"/><path d="M6 12.5a1.5 1.5 0 0 0 3 0" stroke="currentColor" strokeWidth="1.3"/></svg>,
      },
    ],
  },
];

const PLAN_COLORS: Record<string, { text: string; bg: string }> = {
  free:    { text: "#64748b", bg: "rgba(100,116,139,0.1)" },
  starter: { text: "#2563eb", bg: "rgba(37,99,235,0.1)" },
  pro:     { text: "#7c3aed", bg: "rgba(124,58,237,0.1)" },
  agency:  { text: "#d97706", bg: "rgba(217,119,6,0.1)" },
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
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());

  useEffect(() => {
    fetch("/api/me")
      .then((r) => r.ok ? r.json() : null)
      .then((d) => { if (d) setMe(d); })
      .catch(() => {});
  }, []);

  function toggleSection(key: string) {
    setCollapsed((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key); else next.add(key);
      return next;
    });
  }

  const orgName     = me?.org.name   ?? "My Workspace";
  const planName    = me?.org.plan   ?? "free";
  const userName    = me?.user.name  ?? "User";
  const userEmail   = me?.user.email ?? "";
  const userInitial = userName.charAt(0).toUpperCase();
  const orgInitial  = orgName.charAt(0).toUpperCase();
  const plan        = PLAN_COLORS[planName] ?? PLAN_COLORS.free;

  return (
    <aside
      className="flex flex-col h-full"
      style={{
        background: "var(--color-surface)",
        borderRight: "1px solid var(--color-border)",
        width: mobile ? "260px" : "224px",
        boxShadow: "1px 0 0 var(--color-border)",
      }}
    >
      {/* Logo */}
      <div
        className="flex items-center gap-3 px-4 h-14 flex-shrink-0"
        style={{ borderBottom: "1px solid var(--color-border)" }}
      >
        <div
          className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0"
          style={{ background: "linear-gradient(135deg, #7c3aed 0%, #4f46e5 100%)" }}
        >
          <svg width="15" height="15" viewBox="0 0 15 15" fill="none">
            <path d="M2.5 7.5L6.5 3.5L8 5L5 7.5L8 10L6.5 11.5L2.5 7.5Z" fill="white" fillOpacity="0.9"/>
            <path d="M8 5L12.5 7.5L8 10L10 7.5L8 5Z" fill="white"/>
          </svg>
        </div>
        <div className="flex-1 min-w-0">
          <div
            className="text-sm font-bold leading-none tracking-tight"
            style={{ fontFamily: "var(--font-syne)", color: "var(--color-text-1)" }}
          >
            SignafyAI
          </div>
          <div className="text-[10px] mt-0.5" style={{ color: "var(--color-text-muted)" }}>Growth OS</div>
        </div>
        {mobile && (
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg transition-colors flex-shrink-0"
            style={{ color: "var(--color-text-2)" }}
          >
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
              <path d="M3 3l8 8M11 3l-8 8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
            </svg>
          </button>
        )}
      </div>

      {/* Workspace selector */}
      <div className="px-3 pt-3 pb-1">
        <Link
          href="/settings"
          className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl transition-all duration-150"
          style={{
            background: "var(--color-surface-2)",
            border: "1px solid var(--color-border-subtle)",
          }}
          onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.borderColor = "var(--color-border)"; }}
          onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.borderColor = "var(--color-border-subtle)"; }}
        >
          <div
            className="w-7 h-7 rounded-lg flex items-center justify-center text-xs font-bold flex-shrink-0"
            style={{ background: "rgba(124,58,237,0.12)", color: "#7c3aed" }}
          >
            {orgInitial}
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-xs font-semibold truncate" style={{ color: "var(--color-text-1)" }}>{orgName}</div>
            <div
              className="text-[10px] capitalize font-medium px-1.5 py-px rounded mt-0.5 w-fit"
              style={{ background: plan.bg, color: plan.text }}
            >
              {planName}
            </div>
          </div>
          <svg width="11" height="11" viewBox="0 0 11 11" fill="none" style={{ color: "var(--color-text-muted)", flexShrink: 0 }}>
            <path d="M2.5 4L5.5 7L8.5 4" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </Link>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 pb-3 overflow-y-auto">
        {NAV_SECTIONS.map((section) => {
          const isCollapsed = collapsed.has(section.label);
          return (
            <div key={section.label} className="mb-0.5">
              {/* Section header — clickable to collapse */}
              <button
                onClick={() => toggleSection(section.label)}
                className="w-full flex items-center justify-between px-3 pt-3 pb-1.5 rounded-lg transition-colors group"
                style={{ color: "var(--color-text-muted)" }}
              >
                <span className="text-[10px] font-semibold uppercase tracking-widest">
                  {section.label}
                </span>
                <svg
                  width="11" height="11" viewBox="0 0 11 11" fill="none"
                  style={{
                    transition: "transform 0.2s ease",
                    transform: isCollapsed ? "rotate(-90deg)" : "rotate(0deg)",
                  }}
                >
                  <path d="M2.5 4L5.5 7L8.5 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </button>

              {/* Section items */}
              {!isCollapsed && (
                <div className="space-y-0.5">
                  {section.items.map((item) => {
                    const isActive = pathname === item.href ||
                      (item.href !== "/dashboard" && pathname.startsWith(item.href));
                    return (
                      <Link
                        key={item.href}
                        href={item.href}
                        onClick={onClose}
                        className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-sm transition-all duration-150"
                        style={{
                          background: isActive ? "rgba(124,58,237,0.09)" : "transparent",
                          color: isActive ? "#7c3aed" : "var(--color-text-2)",
                          fontWeight: isActive ? "600" : "500",
                        }}
                        onMouseEnter={(e) => {
                          if (!isActive) {
                            (e.currentTarget as HTMLElement).style.background = "var(--color-surface-2)";
                            (e.currentTarget as HTMLElement).style.color = "var(--color-text-1)";
                          }
                        }}
                        onMouseLeave={(e) => {
                          if (!isActive) {
                            (e.currentTarget as HTMLElement).style.background = "transparent";
                            (e.currentTarget as HTMLElement).style.color = "var(--color-text-2)";
                          }
                        }}
                      >
                        <span className="flex-shrink-0" style={{ color: isActive ? "#7c3aed" : "currentColor" }}>
                          {item.icon}
                        </span>
                        <span className="flex-1">{item.label}</span>
                        {isActive && (
                          <span
                            className="w-1.5 h-1.5 rounded-full flex-shrink-0"
                            style={{ background: "#7c3aed" }}
                          />
                        )}
                      </Link>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </nav>

      {/* Bottom — settings + user */}
      <div
        className="px-3 pb-3 pt-2.5 space-y-1"
        style={{ borderTop: "1px solid var(--color-border-subtle)" }}
      >
        <Link
          href="/settings"
          onClick={onClose}
          className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-sm transition-all duration-150"
          style={{
            background: pathname === "/settings" ? "rgba(124,58,237,0.09)" : "transparent",
            color: pathname === "/settings" ? "#7c3aed" : "var(--color-text-2)",
            fontWeight: pathname === "/settings" ? "600" : "500",
          }}
          onMouseEnter={(e) => {
            if (pathname !== "/settings") {
              (e.currentTarget as HTMLElement).style.background = "var(--color-surface-2)";
              (e.currentTarget as HTMLElement).style.color = "var(--color-text-1)";
            }
          }}
          onMouseLeave={(e) => {
            if (pathname !== "/settings") {
              (e.currentTarget as HTMLElement).style.background = "transparent";
              (e.currentTarget as HTMLElement).style.color = "var(--color-text-2)";
            }
          }}
        >
          <svg width="15" height="15" viewBox="0 0 15 15" fill="none"
            style={{ flexShrink: 0, color: pathname === "/settings" ? "#7c3aed" : "currentColor" }}
          >
            <circle cx="7.5" cy="7.5" r="2.2" stroke="currentColor" strokeWidth="1.4"/>
            <path d="M7.5 1.5v1.2M7.5 12.3v1.2M1.5 7.5h1.2M12.3 7.5h1.2M3.2 3.2l.85.85M10.95 10.95l.85.85M3.2 11.8l.85-.85M10.95 4.05l.85-.85" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>
          </svg>
          Settings
        </Link>

        {/* User row */}
        <div
          className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl"
          style={{
            background: "var(--color-surface-2)",
            border: "1px solid var(--color-border-subtle)",
          }}
        >
          <div
            className="w-7 h-7 rounded-lg flex items-center justify-center text-xs font-bold flex-shrink-0"
            style={{ background: "linear-gradient(135deg, #7c3aed, #4f46e5)", color: "white" }}
          >
            {userInitial}
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-xs font-semibold truncate" style={{ color: "var(--color-text-1)" }}>{userName}</div>
            <div className="text-[10px] truncate" style={{ color: "var(--color-text-muted)" }}>{userEmail}</div>
          </div>
          <form action={logoutAction}>
            <button
              type="submit"
              title="Sign out"
              className="p-1.5 rounded-lg transition-colors flex-shrink-0"
              style={{ color: "var(--color-text-muted)" }}
              onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.color = "#dc2626"; (e.currentTarget as HTMLElement).style.background = "rgba(220,38,38,0.06)"; }}
              onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.color = "var(--color-text-muted)"; (e.currentTarget as HTMLElement).style.background = "transparent"; }}
            >
              <svg width="13" height="13" viewBox="0 0 13 13" fill="none">
                <path d="M4.5 11H3a1 1 0 0 1-1-1V3a1 1 0 0 1 1-1h1.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>
                <path d="M8.5 9L11 6.5 8.5 4M11 6.5H5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </button>
          </form>
        </div>
      </div>
    </aside>
  );
}