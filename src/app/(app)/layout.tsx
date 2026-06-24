"use client";

import { useState } from "react";
import { Sidebar } from "@/components/app/sidebar";
import { Topbar } from "@/components/app/topbar";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div
      data-scheme="dark"
      style={{
        display: "flex", height: "100dvh", overflow: "hidden",
        background: "#09090f",
      }}
    >
      {/* Desktop sidebar — hidden on mobile */}
      <div style={{ display: "flex", flexDirection: "column", flexShrink: 0 }}
        className="sidebar-desktop"
      >
        <style>{`
          @media (max-width: 767px) { .sidebar-desktop { display: none !important; } }
        `}</style>
        <Sidebar />
      </div>

      {/* Mobile sidebar overlay */}
      {sidebarOpen && (
        <div style={{
          position: "fixed", inset: 0, zIndex: 50,
          display: "flex",
        }}
        className="md-hidden-overlay"
        >
          <div
            style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.7)", backdropFilter: "blur(4px)" }}
            onClick={() => setSidebarOpen(false)}
          />
          <div style={{ position: "relative", zIndex: 10 }}>
            <Sidebar mobile onClose={() => setSidebarOpen(false)} />
          </div>
        </div>
      )}

      {/* Main column */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column", minWidth: 0, overflow: "hidden" }}>

        {/* Mobile topbar */}
        <header
          className="mobile-topbar"
          style={{
            display: "none",
            alignItems: "center", justifyContent: "space-between",
            padding: "0 16px", height: 60, flexShrink: 0,
            background: "#0e0d18", borderBottom: "1px solid rgba(255,255,255,0.07)",
          }}
        >
          <style>{`
            @media (max-width: 767px) { .mobile-topbar { display: flex !important; } }
          `}</style>
          <button
            onClick={() => setSidebarOpen(true)}
            style={{
              padding: "8px", borderRadius: 10, border: "none", cursor: "pointer",
              color: "rgba(255,255,255,0.6)", background: "rgba(255,255,255,0.06)",
            }}
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <path d="M2 4.5h12M2 8h12M2 11.5h12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
            </svg>
          </button>

          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <div style={{
              width: 28, height: 28, borderRadius: 8,
              background: "linear-gradient(135deg, #7c3aed, #4f46e5)",
              display: "flex", alignItems: "center", justifyContent: "center",
            }}>
              <svg width="13" height="13" viewBox="0 0 15 15" fill="none">
                <path d="M2.5 7.5L6.5 3.5L8 5L5 7.5L8 10L6.5 11.5L2.5 7.5Z" fill="white" fillOpacity="0.9"/>
                <path d="M8 5L12.5 7.5L8 10L10 7.5L8 5Z" fill="white"/>
              </svg>
            </div>
            <span style={{ fontSize: 15, fontWeight: 700, color: "rgba(255,255,255,0.9)" }}>SignafyAI</span>
          </div>

          <button style={{
            padding: "8px", borderRadius: 10, border: "none", cursor: "pointer",
            color: "rgba(255,255,255,0.6)", background: "rgba(255,255,255,0.06)",
            position: "relative",
          }}>
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <path d="M8 2a5 5 0 0 1 5 5v2.2l1.3 2.3H1.7L3 9.2V7A5 5 0 0 1 8 2z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round"/>
              <path d="M6.5 13.5a1.5 1.5 0 0 0 3 0" stroke="currentColor" strokeWidth="1.5"/>
            </svg>
            <span style={{
              position: "absolute", top: 6, right: 6, width: 7, height: 7,
              borderRadius: "50%", background: "#ef4444", border: "2px solid #0e0d18",
            }} />
          </button>
        </header>

        {/* Desktop topbar */}
        <div className="desktop-topbar" style={{ flexShrink: 0 }}>
          <style>{`
            @media (max-width: 767px) { .desktop-topbar { display: none !important; } }
          `}</style>
          <Topbar />
        </div>

        {/* Page content */}
        <main style={{ flex: 1, overflowY: "auto" }}>
          {children}
        </main>
      </div>
    </div>
  );
}
