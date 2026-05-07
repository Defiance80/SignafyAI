"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { logoutAction } from "@/app/(auth)/sign-in/actions";

const NAV = [
  {
    label: "Dashboard",
    href: "/dashboard",
    icon: <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><rect x="1" y="1" width="6" height="6" rx="1.5" stroke="currentColor" strokeWidth="1.4"/><rect x="9" y="1" width="6" height="6" rx="1.5" stroke="currentColor" strokeWidth="1.4"/><rect x="1" y="9" width="6" height="6" rx="1.5" stroke="currentColor" strokeWidth="1.4"/><rect x="9" y="9" width="6" height="6" rx="1.5" stroke="currentColor" strokeWidth="1.4"/></svg>,
  },
  {
    label: "Leads",
    href: "/leads",
    icon: <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><circle cx="8" cy="5" r="3" stroke="currentColor" strokeWidth="1.4"/><path d="M2 14c0-3.314 2.686-5 6-5s6 1.686 6 5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/></svg>,
  },
  {
    label: "Content",
    href: "/content",
    icon: <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><rect x="2" y="2" width="12" height="12" rx="2" stroke="currentColor" strokeWidth="1.4"/><path d="M5 6h6M5 8.5h4" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/></svg>,
  },
  {
    label: "Social Inbox",
    href: "/social",
    icon: <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M14 8c0 3.314-2.686 5.5-6 5.5a7.2 7.2 0 0 1-2.5-.44L2 14.5l.88-3.16A5.26 5.26 0 0 1 2 8c0-3.314 2.686-5.5 6-5.5S14 4.686 14 8z" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round"/></svg>,
  },
  {
    label: "SEO Lab",
    href: "/seo",
    icon: <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M2 12l3.5-4 3 3 3-5 2.5 3" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/></svg>,
  },
  {
    label: "Backlinks",
    href: "/backlinks",
    icon: <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M7 10l-1.5 1.5a2.5 2.5 0 0 1-3.54-3.54l3-3A2.5 2.5 0 0 1 8.5 5.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/><path d="M9 6l1.5-1.5a2.5 2.5 0 0 1 3.54 3.54l-3 3A2.5 2.5 0 0 1 7.5 10.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/></svg>,
  },
  {
    label: "Campaigns",
    href: "/campaigns",
    icon: <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><rect x="2" y="3" width="12" height="11" rx="1.5" stroke="currentColor" strokeWidth="1.4"/><path d="M5 2v2M11 2v2M2 7h12" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/></svg>,
  },
  {
    label: "Analytics",
    href: "/analytics",
    icon: <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M2 12V8M6 12V5M10 12V7M14 12V3" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/></svg>,
  },
];

const PLAN_COLORS: Record<string, string> = {
  free: "#94a3b8",
  starter: "#60a5fa",
  pro: "#a78bfa",
  agency: "#f59e0b",
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

  const orgName = me?.org.name ?? "My Workspace";
  const planName = me?.org.plan ?? "free";
  const userName = me?.user.name ?? "User";
  const userEmail = me?.user.email ?? "";
  const userInitial = userName.charAt(0).toUpperCase();
  const orgInitial = orgName.charAt(0).toUpperCase();

  return (
    <aside
      className="flex flex-col h-full"
      style={{ background: "var(--color-surface)", borderRight: "1px solid var(--color-border)", width: mobile ? "280px" : "240px" }}
    >
      {/* Logo */}
      <div className="flex items-center gap-3 px-5 py-5" style={{ borderBottom: "1px solid var(--color-border-subtle)" }}>
        <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: "linear-gradient(135deg, #7c3aed 0%, #4f46e5 100%)", boxShadow: "0 0 12px rgba(124,58,237,0.35)" }}>
          <svg width="15" height="15" viewBox="0 0 15 15" fill="none">
            <path d="M2.5 7.5L6.5 3.5L8 5L5 7.5L8 10L6.5 11.5L2.5 7.5Z" fill="white" fillOpacity="0.9"/>
            <path d="M8 5L12.5 7.5L8 10L10 7.5L8 5Z" fill="white"/>
          </svg>
        </div>
        <div>
          <div className="text-sm font-bold leading-none" style={{ fontFamily: "var(--font-syne)", color: "var(--color-text-1)" }}>SignafyAI</div>
          <div className="text-xs mt-0.5" style={{ color: "var(--color-text-muted)" }}>Growth OS</div>
        </div>
        {mobile && (
          <button onClick={onClose} className="ml-auto p-1.5 rounded-lg transition-colors" style={{ color: "var(--color-text-2)" }}>
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M4 4l8 8M12 4l-8 8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg>
          </button>
        )}
      </div>

      {/* Org selector */}
      <div className="px-3 py-3">
        <Link
          href="/settings"
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-150 text-left"
          style={{ background: "var(--color-surface-2)", border: "1px solid var(--color-border-subtle)" }}
        >
          <div className="w-7 h-7 rounded-lg flex items-center justify-center text-xs font-bold flex-shrink-0" style={{ background: "rgba(124,58,237,0.2)", color: "#a78bfa" }}>
            {orgInitial}
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-xs font-semibold truncate" style={{ color: "var(--color-text-1)" }}>{orgName}</div>
            <div className="text-xs capitalize" style={{ color: PLAN_COLORS[planName] ?? "var(--color-text-muted)" }}>
              {planName} Plan
            </div>
          </div>
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none" style={{ color: "var(--color-text-muted)", flexShrink: 0 }}>
            <path d="M3 4.5L6 7.5L9 4.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </Link>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 pb-3 overflow-y-auto space-y-0.5">
        <div className="px-3 pt-2 pb-1.5">
          <span className="text-[10px] font-semibold uppercase tracking-widest" style={{ color: "var(--color-text-muted)" }}>Platform</span>
        </div>
        {NAV.map((item) => {
          const isActive = pathname === item.href || (item.href !== "/dashboard" && pathname.startsWith(item.href));
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={onClose}
              className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-150 group relative"
              style={{
                background: isActive ? "rgba(124,58,237,0.12)" : "transparent",
                color: isActive ? "#a78bfa" : "var(--color-text-2)",
                border: isActive ? "1px solid rgba(124,58,237,0.2)" : "1px solid transparent",
              }}
              onMouseEnter={(e) => { if (!isActive) { (e.currentTarget as HTMLElement).style.background = "var(--color-surface-2)"; (e.currentTarget as HTMLElement).style.color = "var(--color-text-1)"; } }}
              onMouseLeave={(e) => { if (!isActive) { (e.currentTarget as HTMLElement).style.background = "transparent"; (e.currentTarget as HTMLElement).style.color = "var(--color-text-2)"; } }}
            >
              <span style={{ color: isActive ? "#a78bfa" : "currentColor", flexShrink: 0 }}>{item.icon}</span>
              <span className="flex-1 text-sm">{item.label}</span>
            </Link>
          );
        })}
      </nav>

      {/* Bottom section */}
      <div className="px-3 pb-3 space-y-0.5" style={{ borderTop: "1px solid var(--color-border-subtle)", paddingTop: "12px" }}>
        <Link
          href="/settings"
          onClick={onClose}
          className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-150"
          style={{ color: pathname === "/settings" ? "#a78bfa" : "var(--color-text-2)", background: pathname === "/settings" ? "rgba(124,58,237,0.12)" : "transparent" }}
          onMouseEnter={(e) => { if (pathname !== "/settings") { (e.currentTarget as HTMLElement).style.background = "var(--color-surface-2)"; (e.currentTarget as HTMLElement).style.color = "var(--color-text-1)"; } }}
          onMouseLeave={(e) => { if (pathname !== "/settings") { (e.currentTarget as HTMLElement).style.background = "transparent"; (e.currentTarget as HTMLElement).style.color = "var(--color-text-2)"; } }}
        >
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><circle cx="8" cy="8" r="2.5" stroke="currentColor" strokeWidth="1.4"/><path d="M8 1.5v1.3M8 13.2v1.3M1.5 8h1.3M13.2 8h1.3M3.4 3.4l.9.9M11.7 11.7l.9.9M3.4 12.6l.9-.9M11.7 4.3l.9-.9" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/></svg>
          Settings
        </Link>

        {/* User profile + logout */}
        <div className="flex items-center gap-3 px-3 py-2.5 rounded-xl mt-1" style={{ background: "var(--color-surface-2)", border: "1px solid var(--color-border-subtle)" }}>
          <div className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0" style={{ background: "linear-gradient(135deg, #7c3aed, #4f46e5)", color: "white" }}>
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
              className="p-1.5 rounded-lg transition-colors"
              style={{ color: "var(--color-text-muted)" }}
              onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.color = "#f87171"; }}
              onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.color = "var(--color-text-muted)"; }}
            >
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                <path d="M5 12H3a1 1 0 0 1-1-1V3a1 1 0 0 1 1-1h2" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>
                <path d="M9.5 10L12 7l-2.5-3M12 7H5.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </button>
          </form>
        </div>
      </div>
    </aside>
  );
}
