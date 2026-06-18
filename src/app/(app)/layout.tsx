"use client";

import { useState } from "react";
import { Sidebar } from "@/components/app/sidebar";
import { Topbar } from "@/components/app/topbar";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="flex h-dvh overflow-hidden" style={{ background: "var(--color-bg)" }}>
      {/* Desktop sidebar */}
      <div className="hidden md:flex flex-col flex-shrink-0">
        <Sidebar />
      </div>

      {/* Mobile sidebar overlay */}
      {sidebarOpen && (
        <div className="md:hidden fixed inset-0 z-50 flex">
          <div
            className="absolute inset-0"
            style={{ background: "rgba(0,0,0,0.65)", backdropFilter: "blur(4px)" }}
            onClick={() => setSidebarOpen(false)}
          />
          <div className="relative z-10">
            <Sidebar mobile onClose={() => setSidebarOpen(false)} />
          </div>
        </div>
      )}

      {/* Main column */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">

        {/* Mobile topbar (hamburger + logo) */}
        <header
          className="md:hidden flex items-center justify-between px-4 h-14 flex-shrink-0"
          style={{ background: "var(--color-surface)", borderBottom: "1px solid var(--color-border)" }}
        >
          <button
            onClick={() => setSidebarOpen(true)}
            className="p-2 rounded-xl transition-colors"
            style={{ color: "var(--color-text-2)", background: "var(--color-surface-2)" }}
          >
            <svg width="15" height="15" viewBox="0 0 15 15" fill="none">
              <path d="M2 4.5h11M2 7.5h11M2 10.5h11" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
            </svg>
          </button>

          <div className="flex items-center gap-2">
            <div
              className="w-7 h-7 rounded-lg flex items-center justify-center"
              style={{ background: "linear-gradient(135deg, #7c3aed 0%, #4f46e5 100%)" }}
            >
              <svg width="13" height="13" viewBox="0 0 15 15" fill="none">
                <path d="M2.5 7.5L6.5 3.5L8 5L5 7.5L8 10L6.5 11.5L2.5 7.5Z" fill="white" fillOpacity="0.9"/>
                <path d="M8 5L12.5 7.5L8 10L10 7.5L8 5Z" fill="white"/>
              </svg>
            </div>
            <span className="text-sm font-bold" style={{ fontFamily: "var(--font-syne)", color: "var(--color-text-1)" }}>
              SignafyAI
            </span>
          </div>

          <button
            className="p-2 rounded-xl relative"
            style={{ color: "var(--color-text-2)", background: "var(--color-surface-2)" }}
          >
            <svg width="15" height="15" viewBox="0 0 15 15" fill="none">
              <path d="M7.5 2a4.5 4.5 0 0 1 4.5 4.5v2l1.3 2.2H2.2L3.5 8.5V6.5A4.5 4.5 0 0 1 7.5 2z" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round"/>
              <path d="M6 12.5a1.5 1.5 0 0 0 3 0" stroke="currentColor" strokeWidth="1.4"/>
            </svg>
            <span
              className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full"
              style={{ background: "#ef4444", border: "1.5px solid var(--color-surface)" }}
            />
          </button>
        </header>

        {/* Desktop topbar */}
        <div className="hidden md:block flex-shrink-0">
          <Topbar />
        </div>

        {/* Page content */}
        <main className="flex-1 overflow-y-auto">
          {children}
        </main>
      </div>
    </div>
  );
}
