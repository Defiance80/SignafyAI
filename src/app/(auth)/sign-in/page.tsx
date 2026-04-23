"use client";

import { useActionState, useEffect } from "react";
import { loginAction } from "./actions";
import Link from "next/link";

const DEMO_EMAIL = "demo@signafyai.com";
const DEMO_PASSWORD = "Demo1234!";

function SignafyLogo() {
  return (
    <div className="flex items-center gap-3">
      <div
        className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
        style={{
          background: "linear-gradient(135deg, #7c3aed 0%, #4f46e5 100%)",
          boxShadow: "0 0 20px rgba(124,58,237,0.4)",
        }}
      >
        <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
          <path d="M3 9L7.5 4.5L9 6L6 9L9 12L7.5 13.5L3 9Z" fill="white" fillOpacity="0.9" />
          <path d="M9 6L13.5 9L9 12L11 9L9 6Z" fill="white" />
        </svg>
      </div>
      <span
        className="text-xl font-bold tracking-tight"
        style={{ fontFamily: "var(--font-syne)", color: "var(--color-text-1)" }}
      >
        SignafyAI
      </span>
    </div>
  );
}

export default function SignInPage() {
  const [state, formAction, isPending] = useActionState(loginAction, null);

  function fillDemo() {
    const emailEl = document.getElementById("email") as HTMLInputElement;
    const passwordEl = document.getElementById("password") as HTMLInputElement;
    if (emailEl) emailEl.value = DEMO_EMAIL;
    if (passwordEl) passwordEl.value = DEMO_PASSWORD;
  }

  return (
    <div className="w-full max-w-md mx-auto animate-fade-up">
      {/* Card */}
      <div
        className="rounded-2xl p-8 sm:p-10"
        style={{
          background: "var(--color-surface)",
          border: "1px solid var(--color-border)",
          boxShadow: "0 25px 60px rgba(0,0,0,0.5), 0 0 0 1px rgba(255,255,255,0.03)",
        }}
      >
        {/* Logo */}
        <div className="mb-8">
          <SignafyLogo />
        </div>

        {/* Header */}
        <div className="mb-8">
          <h1
            className="text-2xl font-bold mb-2"
            style={{ fontFamily: "var(--font-syne)", color: "var(--color-text-1)" }}
          >
            Welcome back
          </h1>
          <p className="text-sm" style={{ color: "var(--color-text-2)" }}>
            Sign in to your SignafyAI dashboard
          </p>
        </div>

        {/* Demo callout */}
        <button
          type="button"
          onClick={fillDemo}
          className="w-full rounded-xl p-4 mb-6 text-left transition-all duration-200 group cursor-pointer"
          style={{
            background: "var(--color-accent-subtle)",
            border: "1px solid rgba(124,58,237,0.25)",
          }}
          onMouseEnter={(e) => {
            (e.currentTarget as HTMLElement).style.border = "1px solid rgba(124,58,237,0.45)";
            (e.currentTarget as HTMLElement).style.background = "rgba(124,58,237,0.16)";
          }}
          onMouseLeave={(e) => {
            (e.currentTarget as HTMLElement).style.border = "1px solid rgba(124,58,237,0.25)";
            (e.currentTarget as HTMLElement).style.background = "var(--color-accent-subtle)";
          }}
        >
          <div className="flex items-start gap-3">
            <div
              className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5"
              style={{ background: "rgba(124,58,237,0.2)" }}
            >
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                <circle cx="7" cy="7" r="6" stroke="#a78bfa" strokeWidth="1.5" />
                <path d="M7 4.5V7.5" stroke="#a78bfa" strokeWidth="1.5" strokeLinecap="round" />
                <circle cx="7" cy="9.5" r="0.75" fill="#a78bfa" />
              </svg>
            </div>
            <div>
              <p className="text-xs font-semibold mb-1.5" style={{ color: "#a78bfa" }}>
                Demo Account — click to auto-fill
              </p>
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="text-xs" style={{ color: "var(--color-text-2)" }}>Email:</span>
                  <code
                    className="text-xs px-1.5 py-0.5 rounded"
                    style={{
                      fontFamily: "var(--font-mono)",
                      background: "rgba(0,0,0,0.3)",
                      color: "var(--color-text-1)",
                    }}
                  >
                    {DEMO_EMAIL}
                  </code>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs" style={{ color: "var(--color-text-2)" }}>Password:</span>
                  <code
                    className="text-xs px-1.5 py-0.5 rounded"
                    style={{
                      fontFamily: "var(--font-mono)",
                      background: "rgba(0,0,0,0.3)",
                      color: "var(--color-text-1)",
                    }}
                  >
                    {DEMO_PASSWORD}
                  </code>
                </div>
              </div>
            </div>
          </div>
        </button>

        {/* Form */}
        <form action={formAction} className="space-y-5">
          {/* Error */}
          {state?.error && (
            <div
              className="rounded-xl px-4 py-3 text-sm animate-fade-in"
              style={{
                background: "rgba(239,68,68,0.08)",
                border: "1px solid rgba(239,68,68,0.2)",
                color: "#f87171",
              }}
            >
              {state.error}
            </div>
          )}

          {/* Email */}
          <div className="space-y-2">
            <label
              htmlFor="email"
              className="block text-sm font-medium"
              style={{ color: "var(--color-text-2)" }}
            >
              Email address
            </label>
            <input
              id="email"
              name="email"
              type="email"
              autoComplete="email"
              required
              placeholder="you@company.com"
              className="w-full rounded-xl px-4 py-3 text-sm transition-all duration-200 outline-none"
              style={{
                background: "var(--color-surface-2)",
                border: "1px solid var(--color-border)",
                color: "var(--color-text-1)",
              }}
              onFocus={(e) => {
                e.target.style.border = "1px solid var(--color-accent)";
                e.target.style.boxShadow = "0 0 0 3px rgba(124,58,237,0.12)";
              }}
              onBlur={(e) => {
                e.target.style.border = "1px solid var(--color-border)";
                e.target.style.boxShadow = "none";
              }}
            />
          </div>

          {/* Password */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label
                htmlFor="password"
                className="block text-sm font-medium"
                style={{ color: "var(--color-text-2)" }}
              >
                Password
              </label>
              <button
                type="button"
                className="text-xs transition-colors"
                style={{ color: "var(--color-accent-light)" }}
              >
                Forgot password?
              </button>
            </div>
            <input
              id="password"
              name="password"
              type="password"
              autoComplete="current-password"
              required
              placeholder="••••••••"
              className="w-full rounded-xl px-4 py-3 text-sm transition-all duration-200 outline-none"
              style={{
                background: "var(--color-surface-2)",
                border: "1px solid var(--color-border)",
                color: "var(--color-text-1)",
              }}
              onFocus={(e) => {
                e.target.style.border = "1px solid var(--color-accent)";
                e.target.style.boxShadow = "0 0 0 3px rgba(124,58,237,0.12)";
              }}
              onBlur={(e) => {
                e.target.style.border = "1px solid var(--color-border)";
                e.target.style.boxShadow = "none";
              }}
            />
          </div>

          {/* Submit */}
          <button
            type="submit"
            disabled={isPending}
            className="w-full rounded-xl py-3 text-sm font-semibold transition-all duration-200 mt-2 disabled:opacity-60 disabled:cursor-not-allowed"
            style={{
              background: "linear-gradient(135deg, #7c3aed 0%, #4f46e5 100%)",
              color: "white",
              boxShadow: "0 4px 15px rgba(124,58,237,0.3)",
            }}
            onMouseEnter={(e) => {
              if (!isPending) {
                (e.currentTarget as HTMLElement).style.boxShadow = "0 6px 20px rgba(124,58,237,0.45)";
                (e.currentTarget as HTMLElement).style.transform = "translateY(-1px)";
              }
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLElement).style.boxShadow = "0 4px 15px rgba(124,58,237,0.3)";
              (e.currentTarget as HTMLElement).style.transform = "translateY(0)";
            }}
          >
            {isPending ? (
              <span className="flex items-center justify-center gap-2">
                <svg className="animate-spin" width="14" height="14" viewBox="0 0 14 14" fill="none">
                  <circle cx="7" cy="7" r="5" stroke="rgba(255,255,255,0.3)" strokeWidth="2" />
                  <path d="M7 2a5 5 0 0 1 5 5" stroke="white" strokeWidth="2" strokeLinecap="round" />
                </svg>
                Signing in…
              </span>
            ) : (
              "Sign in"
            )}
          </button>
        </form>

        {/* Divider */}
        <div className="flex items-center gap-4 my-6">
          <div className="flex-1 h-px" style={{ background: "var(--color-border)" }} />
          <span className="text-xs" style={{ color: "var(--color-text-muted)" }}>or</span>
          <div className="flex-1 h-px" style={{ background: "var(--color-border)" }} />
        </div>

        {/* Social login placeholders */}
        <div className="grid grid-cols-2 gap-3">
          {["Google", "Microsoft"].map((provider) => (
            <button
              key={provider}
              type="button"
              className="flex items-center justify-center gap-2 rounded-xl py-2.5 text-sm font-medium transition-all duration-200"
              style={{
                background: "var(--color-surface-2)",
                border: "1px solid var(--color-border)",
                color: "var(--color-text-2)",
              }}
              onMouseEnter={(e) => {
                (e.currentTarget as HTMLElement).style.border = "1px solid #2a2a38";
                (e.currentTarget as HTMLElement).style.color = "var(--color-text-1)";
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLElement).style.border = "1px solid var(--color-border)";
                (e.currentTarget as HTMLElement).style.color = "var(--color-text-2)";
              }}
            >
              {provider === "Google" ? (
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                  <path d="M13.07 7.16c0-.47-.04-.93-.12-1.37H7v2.59h3.39a2.9 2.9 0 0 1-1.26 1.9v1.58h2.04c1.2-1.1 1.89-2.73 1.89-4.7z" fill="#4285F4"/>
                  <path d="M7 14c1.7 0 3.13-.56 4.17-1.53L9.13 10.9a4.2 4.2 0 0 1-2.13.59 4.2 4.2 0 0 1-3.95-2.9H.97v1.63A7 7 0 0 0 7 14z" fill="#34A853"/>
                  <path d="M3.05 8.59A4.2 4.2 0 0 1 2.84 7c0-.55.09-1.08.21-1.59V3.78H.97A7 7 0 0 0 0 7c0 1.13.27 2.2.97 3.22l2.08-1.63z" fill="#FBBC05"/>
                  <path d="M7 2.79a3.8 3.8 0 0 1 2.69 1.05l2.01-2.01A6.76 6.76 0 0 0 7 0 7 7 0 0 0 .97 3.78l2.08 1.63A4.2 4.2 0 0 1 7 2.79z" fill="#EA4335"/>
                </svg>
              ) : (
                <svg width="14" height="14" viewBox="0 0 14 14" fill="currentColor">
                  <path d="M0 0h6.65v6.65H0zm7.35 0H14v6.65H7.35zM0 7.35h6.65V14H0zm7.35 0H14V14H7.35z" />
                </svg>
              )}
              {provider}
            </button>
          ))}
        </div>

        {/* Sign up link */}
        <p className="text-center text-xs mt-6" style={{ color: "var(--color-text-muted)" }}>
          Don&apos;t have an account?{" "}
          <Link
            href={"#waitlist" as never}
            className="font-medium transition-colors"
            style={{ color: "var(--color-accent-light)" }}
          >
            Join the beta waitlist
          </Link>
        </p>
      </div>

      {/* Bottom note */}
      <p className="text-center text-xs mt-6" style={{ color: "var(--color-text-muted)" }}>
        By signing in, you agree to our{" "}
        <span className="underline cursor-pointer" style={{ color: "var(--color-text-2)" }}>Terms</span>{" "}
        and{" "}
        <span className="underline cursor-pointer" style={{ color: "var(--color-text-2)" }}>Privacy Policy</span>
      </p>
    </div>
  );
}
