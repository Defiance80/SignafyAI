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
    ],
  },
  {
    label: "Content",
    items: [
      {
        label: "Content",
        href: "/content",
        icon: <svg width="15" height="15" viewBox="0 0 15 15" fill="none"><rect x="1.5" y="1.5" width="12" height="12" rx="2" stroke="currentColor" strokeWidth="1.4"/><path d="M4.5 5.5h6M4.5 8h4" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/></svg>,
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
];

const PLAN_COLORS: Record<string, { text: string; bg: string }> = {
  free:    { text: "#94a3b8", bg: "rgba(148,163,184,0.1)" },
  starter: { text: "#60a5fa", bg: "rgba(96,165,250,0.1)" },
  pro:     { text: "#a78bfa", bg: "rgba(167,139,250,0.1)" },
  agency:  { text: "#f59e0b", bg: "rgba(245,158,11,0.1)" },
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

  const orgName    = me?.org.name   ?? "My Workspace";
  const planName   = me?.org.plan   ?? "free";
  const userName   = me?.user.name  ?? "User";
  const userEmail  = me?.user.email ?? "";
  const userInitial = userName.charAt(0).toUpperCase();
  const orgInitial  = orgName.charAt(0).toUpperCase();
  const plan = PLAN_COLORS[planName] ?? PLAN_COLORS.free;

  return (
    <aside
      className="flex flex-col h-full"
      style={{
        background: "var(--color-surface)",
        borderRight: "1px solid var(--color-border)",
        width: mobile ? "260px" : "224px",
      }}
    >
      {/* Logo */}
      <div
        className="flex items-center gap-3 px-4 h-14 flex-shrink-0"
        style={{ borderBottom: "1px solid var(--color-border)" }}
      >
        <div
          className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0"
          style={{
            background: "linear-gradient(135deg, #7c3aed 0%, #4f46e5 100%)",
            boxShadow: "0 0 14px rgba(124,58,237,0.4)",
          }}
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
      <div className="px-3 pt-3 pb-2">
        <Link
          href="/settings"
          className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl transition-all duration-150"
          style={{ background: "var(--color-surface-2)", border: "1px solid var(--color-border-subtle)" }}
          onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.borderColor = "var(--color-border)"; }}
          onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.borderColor = "var(--color-border-subtle)"; }}
        >
          <div
            className="w-7 h-7 rounded-lg flex items-center justify-center text-xs font-bold flex-shrink-0"
            style={{ background: "rgba(124,58,237,0.18)", color: "#a78bfa" }}
          >
            {orgInitial}
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-xs font-semibold truncate" style={{ color: "var(--color-text-1)" }}>{orgName}</div>
            <div
              className="text-[10px] capitalize font-medium px-1 py-px rounded mt-0.5 w-fit"
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
        {NAV_SECTIONS.map((section) => (
          <div key={section.label} className="mb-1">
            <div className="px-3 pt-3 pb-1">
              <span
                className="text-[10px] font-semibold uppercase tracking-widest"
                style={{ color: "var(--color-text-muted)" }}
              >
                {section.label}
              </span>
            </div>
            <div className="space-y-0.5">
              {section.items.map((item) => {
                const isActive = pathname === item.href ||
                  (item.href !== "/dashboard" && pathname.startsWith(item.href));
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={onClose}
                    className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-sm font-medium transition-all duration-150"
                    style={{
                      background: isActive
                        ? "linear-gradient(135deg, rgba(124,58,237,0.85) 0%, rgba(79,70,229,0.85) 100%)"
                        : "transparent",
                      color: isActive ? "white" : "var(--color-text-2)",
                      boxShadow: isActive ? "0 2px 8px rgba(124,58,237,0.25)" : "none",
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
                    <span
                      className="flex-shrink-0"
                      style={{ color: isActive ? "rgba(255,255,255,0.9)" : "currentColor" }}
                    >
                      {item.icon}
                    </span>
                    <span className="flex-1">{item.label}</span>
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      {/* Bottom — settings + user */}
      <div
        className="px-3 pb-3 pt-3 space-y-1"
        style={{ borderTop: "1px solid var(--color-border-subtle)" }}
      >
        <Link
          href="/settings"
          onClick={onClose}
          className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-sm font-medium transition-all duration-150"
          style={{
            background: pathname === "/settings"
              ? "linear-gradient(135deg, rgba(124,58,237,0.85) 0%, rgba(79,70,229,0.85) 100%)"
              : "transparent",
            color: pathname === "/settings" ? "white" : "var(--color-text-2)",
            boxShadow: pathname === "/settings" ? "0 2px 8px rgba(124,58,237,0.25)" : "none",
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
          <svg width="15" height="15" viewBox="0 0 15 15" fill="none" style={{ flexShrink: 0 }}>
            <circle cx="7.5" cy="7.5" r="2.2" stroke="currentColor" strokeWidth="1.4"/>
            <path d="M7.5 1.5v1.2M7.5 12.3v1.2M1.5 7.5h1.2M12.3 7.5h1.2M3.2 3.2l.85.85M10.95 10.95l.85.85M3.2 11.8l.85-.85M10.95 4.05l.85-.85" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>
          </svg>
          Settings
        </Link>

        {/* User row */}
        <div
          className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl"
          style={{ background: "var(--color-surface-2)", border: "1px solid var(--color-border-subtle)" }}
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
              onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.color = "#f87171"; }}
              onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.color = "var(--color-text-muted)"; }}
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
