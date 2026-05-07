"use client";

import { useState, useTransition } from "react";
import { chooseFreeAction, choosePaidAction } from "./actions";
import type { Plan } from "@/lib/supabase/types";
import { PLAN_PRICES } from "@/lib/supabase/types";

type AccountType = "customer" | "vendor" | "staff";

const ACCOUNT_TYPES: Array<{
  id: AccountType;
  label: string;
  desc: string;
  icon: React.ReactNode;
}> = [
  {
    id: "customer",
    label: "Customer",
    desc: "Using SignafyAI to grow your brand, agency, or business.",
    icon: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
        <circle cx="12" cy="8" r="4" stroke="currentColor" strokeWidth="1.6"/>
        <path d="M4 20c0-4.418 3.582-7 8-7s8 2.582 8 7" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"/>
      </svg>
    ),
  },
  {
    id: "vendor",
    label: "Vendor / Publisher",
    desc: "Offering services like backlinks, sponsored content, or placements.",
    icon: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
        <rect x="3" y="7" width="18" height="13" rx="2" stroke="currentColor" strokeWidth="1.6"/>
        <path d="M8 7V5a4 4 0 0 1 8 0v2" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"/>
        <path d="M12 12v4M10 14h4" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>
      </svg>
    ),
  },
  {
    id: "staff",
    label: "Staff / Team Member",
    desc: "Internal team member — you'll receive an invite link from your admin.",
    icon: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
        <circle cx="9" cy="8" r="3.5" stroke="currentColor" strokeWidth="1.6"/>
        <path d="M2 19c0-3.866 3.134-6.5 7-6.5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"/>
        <circle cx="17" cy="14" r="3.5" stroke="currentColor" strokeWidth="1.6"/>
        <path d="M13.5 20.5c.5-2 1.5-3 3.5-3s3 1 3.5 3" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>
      </svg>
    ),
  },
];

const PLANS: Array<{
  id: Plan;
  name: string;
  badge?: string;
  description: string;
  features: string[];
}> = [
  {
    id: "free",
    name: "Free",
    description: "Explore SignafyAI at your own pace.",
    features: [
      "25 leads / month",
      "10 content pieces / month",
      "Basic analytics",
      "Manual lead entry",
      "1 brand voice",
    ],
  },
  {
    id: "starter",
    name: "Starter",
    description: "For growing teams ready to automate.",
    features: [
      "100 leads / month",
      "50 content pieces / month",
      "Lead discovery automation",
      "Full analytics dashboard",
      "3 brand voices",
      "Campaign management",
    ],
  },
  {
    id: "pro",
    name: "Pro",
    badge: "Most popular",
    description: "Built for agencies running at scale.",
    features: [
      "500 leads / month",
      "200 content pieces / month",
      "Priority lead discovery",
      "SEO research suite",
      "Backlink discovery",
      "Social inbox + AI replies",
      "10 brand voices",
    ],
  },
  {
    id: "agency",
    name: "Agency",
    description: "Maximum scale, everything included.",
    features: [
      "5,000 leads / month",
      "1,000 content pieces / month",
      "All Pro features",
      "Unlimited brand voices",
      "Dedicated onboarding",
      "Priority support",
    ],
  },
];

export default function OnboardingPage() {
  const [step, setStep] = useState<"role" | "plan">("role");
  const [accountType, setAccountType] = useState<AccountType>("customer");
  const [selected, setSelected] = useState<Plan>("pro");
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function handleRoleContinue() {
    if (accountType === "staff") {
      setError("Staff accounts are created by your workspace admin. Ask them to send you an invite link.");
      return;
    }
    setError(null);
    setStep("plan");
  }

  function handleContinue() {
    setError(null);
    startTransition(async () => {
      try {
        if (selected === "free") {
          await chooseFreeAction(accountType);
        } else {
          const result = await choosePaidAction(selected as Exclude<Plan, "free">, accountType);
          window.location.href = result.url;
        }
      } catch (e) {
        setError(e instanceof Error ? e.message : "Something went wrong. Please try again.");
      }
    });
  }

  return (
    <div className="text-center">
      {/* Logo */}
      <div className="flex items-center justify-center gap-3 mb-8">
        <div
          className="w-10 h-10 rounded-xl flex items-center justify-center"
          style={{ background: "linear-gradient(135deg, #7c3aed 0%, #4f46e5 100%)", boxShadow: "0 0 24px rgba(124,58,237,0.4)" }}
        >
          <svg width="20" height="20" viewBox="0 0 18 18" fill="none">
            <path d="M3 9L7.5 4.5L9 6L6 9L9 12L7.5 13.5L3 9Z" fill="white" fillOpacity="0.9" />
            <path d="M9 6L13.5 9L9 12L11 9L9 6Z" fill="white" />
          </svg>
        </div>
        <span className="text-2xl font-bold" style={{ fontFamily: "var(--font-syne)", color: "var(--color-text-1)" }}>
          SignafyAI
        </span>
      </div>

      {/* Step indicator */}
      <div className="flex items-center justify-center gap-2 mb-8">
        {(["role", "plan"] as const).map((s, i) => (
          <div key={s} className="flex items-center gap-2">
            <div
              className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-all"
              style={{
                background: step === s || (s === "role" && step === "plan") ? "#7c3aed" : "var(--color-surface-2)",
                color: step === s || (s === "role" && step === "plan") ? "white" : "var(--color-text-muted)",
                border: step === s ? "2px solid #a78bfa" : "2px solid transparent",
              }}
            >
              {s === "role" && step === "plan" ? (
                <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                  <path d="M2 6l3 3 5-5" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              ) : (
                i + 1
              )}
            </div>
            <span className="text-xs" style={{ color: step === s ? "var(--color-text-1)" : "var(--color-text-muted)" }}>
              {s === "role" ? "Account type" : "Choose plan"}
            </span>
            {i < 1 && <div className="w-8 h-px mx-1" style={{ background: step === "plan" ? "#7c3aed" : "var(--color-border)" }} />}
          </div>
        ))}
      </div>

      {/* ── Step 1: Role ── */}
      {step === "role" && (
        <>
          <div className="mb-8">
            <h1 className="text-3xl sm:text-4xl font-bold mb-3" style={{ fontFamily: "var(--font-syne)", color: "var(--color-text-1)" }}>
              What best describes you?
            </h1>
            <p className="text-base" style={{ color: "var(--color-text-2)" }}>
              Pick the account type that fits your role.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8 max-w-3xl mx-auto">
            {ACCOUNT_TYPES.map((at) => {
              const isSelected = accountType === at.id;
              return (
                <button
                  key={at.id}
                  type="button"
                  onClick={() => { setAccountType(at.id); setError(null); }}
                  className="relative rounded-2xl p-6 text-left transition-all duration-200"
                  style={{
                    background: isSelected ? "linear-gradient(135deg, rgba(124,58,237,0.18) 0%, rgba(79,70,229,0.12) 100%)" : "var(--color-surface)",
                    border: isSelected ? "1.5px solid rgba(124,58,237,0.6)" : "1.5px solid var(--color-border)",
                    boxShadow: isSelected ? "0 0 0 3px rgba(124,58,237,0.10), 0 8px 32px rgba(0,0,0,0.3)" : "0 2px 12px rgba(0,0,0,0.2)",
                  }}
                >
                  <div
                    className="w-12 h-12 rounded-xl flex items-center justify-center mb-4"
                    style={{
                      background: isSelected ? "rgba(124,58,237,0.2)" : "var(--color-surface-2)",
                      color: isSelected ? "#a78bfa" : "var(--color-text-muted)",
                    }}
                  >
                    {at.icon}
                  </div>
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="font-semibold text-sm" style={{ color: isSelected ? "#a78bfa" : "var(--color-text-1)", fontFamily: "var(--font-syne)" }}>
                      {at.label}
                    </h3>
                    <div
                      className="w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0"
                      style={{ borderColor: isSelected ? "#7c3aed" : "var(--color-border)", background: isSelected ? "#7c3aed" : "transparent" }}
                    >
                      {isSelected && (
                        <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                          <path d="M2 5L4.5 7.5L8 3" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                        </svg>
                      )}
                    </div>
                  </div>
                  <p className="text-xs leading-relaxed" style={{ color: "var(--color-text-2)" }}>{at.desc}</p>
                </button>
              );
            })}
          </div>

          {error && (
            <div className="mx-auto max-w-md rounded-xl px-4 py-3 text-sm mb-6" style={{ background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.2)", color: "#f87171" }}>
              {error}
            </div>
          )}

          <button
            type="button"
            onClick={handleRoleContinue}
            className="px-10 py-3.5 rounded-xl text-sm font-semibold transition-all duration-200"
            style={{ background: "linear-gradient(135deg, #7c3aed 0%, #4f46e5 100%)", color: "white", boxShadow: "0 4px 20px rgba(124,58,237,0.35)" }}
          >
            Continue →
          </button>
        </>
      )}

      {/* ── Step 2: Plan ── */}
      {step === "plan" && (
        <>
          <div className="mb-8">
            <h1 className="text-3xl sm:text-4xl font-bold mb-3" style={{ fontFamily: "var(--font-syne)", color: "var(--color-text-1)" }}>
              Choose your plan
            </h1>
            <p className="text-base" style={{ color: "var(--color-text-2)" }}>
              Start free and upgrade anytime. Cancel or downgrade whenever you want.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            {PLANS.map((plan) => {
              const isSelected = selected === plan.id;
              const price = PLAN_PRICES[plan.id];
              return (
                <button
                  key={plan.id}
                  type="button"
                  onClick={() => setSelected(plan.id)}
                  disabled={isPending}
                  className="relative rounded-2xl p-6 text-left transition-all duration-200 disabled:opacity-60"
                  style={{
                    background: isSelected ? "linear-gradient(135deg, rgba(124,58,237,0.18) 0%, rgba(79,70,229,0.12) 100%)" : "var(--color-surface)",
                    border: isSelected ? "1.5px solid rgba(124,58,237,0.6)" : "1.5px solid var(--color-border)",
                    boxShadow: isSelected ? "0 0 0 3px rgba(124,58,237,0.10), 0 8px 32px rgba(0,0,0,0.3)" : "0 2px 12px rgba(0,0,0,0.2)",
                  }}
                >
                  {plan.badge && (
                    <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full text-xs font-semibold whitespace-nowrap" style={{ background: "linear-gradient(135deg, #7c3aed, #4f46e5)", color: "white" }}>
                      {plan.badge}
                    </div>
                  )}
                  <div className="mb-4">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm font-semibold uppercase tracking-widest" style={{ color: isSelected ? "#a78bfa" : "var(--color-text-2)" }}>{plan.name}</span>
                      <div className="w-5 h-5 rounded-full border-2 flex items-center justify-center" style={{ borderColor: isSelected ? "#7c3aed" : "var(--color-border)", background: isSelected ? "#7c3aed" : "transparent" }}>
                        {isSelected && <svg width="10" height="10" viewBox="0 0 10 10" fill="none"><path d="M2 5L4.5 7.5L8 3" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>}
                      </div>
                    </div>
                    <div className="flex items-baseline gap-1 mb-2">
                      {price === 0 ? (
                        <span className="text-3xl font-bold" style={{ color: "var(--color-text-1)" }}>Free</span>
                      ) : (
                        <>
                          <span className="text-3xl font-bold" style={{ color: "var(--color-text-1)" }}>${price}</span>
                          <span className="text-sm" style={{ color: "var(--color-text-muted)" }}>/mo</span>
                        </>
                      )}
                    </div>
                    <p className="text-xs leading-relaxed" style={{ color: "var(--color-text-2)" }}>{plan.description}</p>
                  </div>
                  <ul className="space-y-2">
                    {plan.features.map((f) => (
                      <li key={f} className="flex items-start gap-2">
                        <svg className="flex-shrink-0 mt-0.5" width="13" height="13" viewBox="0 0 13 13" fill="none">
                          <circle cx="6.5" cy="6.5" r="6" fill={isSelected ? "rgba(124,58,237,0.25)" : "rgba(255,255,255,0.05)"}/>
                          <path d="M4 6.5L6 8.5L9.5 4.5" stroke={isSelected ? "#a78bfa" : "var(--color-text-muted)"} strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/>
                        </svg>
                        <span className="text-xs leading-relaxed" style={{ color: "var(--color-text-2)" }}>{f}</span>
                      </li>
                    ))}
                  </ul>
                </button>
              );
            })}
          </div>

          {error && (
            <div className="mx-auto max-w-md rounded-xl px-4 py-3 text-sm mb-6" style={{ background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.2)", color: "#f87171" }}>
              {error}
            </div>
          )}

          <div className="flex flex-col items-center gap-3">
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => setStep("role")}
                disabled={isPending}
                className="px-5 py-3.5 rounded-xl text-sm font-medium transition-all"
                style={{ background: "var(--color-surface)", border: "1px solid var(--color-border)", color: "var(--color-text-2)" }}
              >
                ← Back
              </button>
              <button
                type="button"
                onClick={handleContinue}
                disabled={isPending}
                className="px-10 py-3.5 rounded-xl text-sm font-semibold transition-all duration-200 disabled:opacity-60"
                style={{ background: "linear-gradient(135deg, #7c3aed 0%, #4f46e5 100%)", color: "white", boxShadow: "0 4px 20px rgba(124,58,237,0.35)" }}
              >
                {isPending ? (
                  <span className="flex items-center gap-2">
                    <svg className="animate-spin" width="14" height="14" viewBox="0 0 14 14" fill="none">
                      <circle cx="7" cy="7" r="5" stroke="rgba(255,255,255,0.3)" strokeWidth="2"/>
                      <path d="M7 2a5 5 0 0 1 5 5" stroke="white" strokeWidth="2" strokeLinecap="round"/>
                    </svg>
                    {selected === "free" ? "Setting up workspace…" : "Redirecting to checkout…"}
                  </span>
                ) : (
                  selected === "free" ? "Get started free" : `Continue with ${PLANS.find((p) => p.id === selected)?.name} — $${PLAN_PRICES[selected]}/mo`
                )}
              </button>
            </div>
            {selected !== "free" && (
              <p className="text-xs" style={{ color: "var(--color-text-muted)" }}>
                Secure checkout via Stripe · Cancel anytime · Lapses revert to Free plan
              </p>
            )}
          </div>
        </>
      )}
    </div>
  );
}
