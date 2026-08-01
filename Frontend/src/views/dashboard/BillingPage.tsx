"use client";

import { useEffect, useState } from "react";
import { motion, type Variants } from "framer-motion";
import { Check, Clock, CreditCard, FileText, Loader2, Mail, ShieldCheck, Sparkles } from "lucide-react";
import { ApiError, getTrialStatus } from "@/lib/api";
import type { TrialStatus } from "@/lib/trial";
import { PLANS, type PlanId } from "@/lib/plans";

const EASE = [0.22, 1, 0.36, 1] as const;

const container: Variants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.06 } },
};

const item: Variants = {
  hidden: { y: 14, opacity: 0 },
  show: { y: 0, opacity: 1, transition: { duration: 0.35, ease: EASE } },
};

export default function BillingPage() {
  const [trial, setTrial] = useState<TrialStatus | null>(null);
  const [error, setError] = useState<string | null>(null);
  // No payment gateway is wired up yet, so "Subscribe" can't actually
  // activate a plan clicking it just reveals how to reach us instead
  // of silently granting a paid plan for free.
  const [interestedPlan, setInterestedPlan] = useState<PlanId | null>(null);

  useEffect(() => {
    getTrialStatus()
      .then(setTrial)
      .catch((err) => setError(err instanceof ApiError ? err.message : "Couldn't load your billing status."));
  }, []);

  if (error) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center rounded-2xl border border-ink/[.06] bg-surface p-8 text-center text-sm text-red-500 dark:text-red-400 shadow-sm">
        {error}
      </div>
    );
  }

  if (!trial) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center rounded-2xl border border-ink/[.06] bg-surface shadow-sm">
        <Loader2 className="h-6 w-6 animate-spin text-[#45157b]" strokeWidth={2} />
      </div>
    );
  }

  const progressPct = trial.isTrialing
    ? Math.max(4, Math.min(100, (trial.daysLeft / trial.trialLengthDays) * 100))
    : 100;

  return (
    <motion.div initial="hidden" animate="show" variants={container} className="flex flex-col gap-6">
      {/* status banner */}
      <motion.div
        variants={item}
        className={`overflow-hidden rounded-2xl p-6 shadow-sm sm:p-7 ${
          trial.isExpired
            ? "border border-red-100 dark:border-red-500/25 bg-red-50 dark:bg-red-500/15"
            : trial.isTrialing
              ? "bg-gradient-to-br from-[#45157b] to-[#4338CA] text-white"
              : "border border-emerald-100 dark:border-emerald-500/25 bg-emerald-50 dark:bg-emerald-500/15"
        }`}
      >
        {trial.isExpired ? (
          <div className="flex flex-col items-start gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-start gap-3">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-red-100 dark:bg-red-500/15 text-red-600 dark:text-red-400">
                <Clock className="h-5 w-5" strokeWidth={2} />
              </span>
              <div>
                <p className="text-sm font-bold text-red-700 dark:text-red-400">Your free trial has ended</p>
                <p className="mt-0.5 text-sm text-red-600 dark:text-red-400/80">
                  Pick a plan below to unlock your account and keep automating your WhatsApp store.
                </p>
              </div>
            </div>
          </div>
        ) : trial.isTrialing ? (
          <div>
            <div className="flex items-center justify-between gap-3">
              <span className="flex items-center gap-2 text-sm font-semibold text-white/90">
                <Sparkles className="h-4 w-4" strokeWidth={2} />
                Free trial
              </span>
              <span className="text-sm font-bold text-white">
                {trial.daysLeft} of {trial.trialLengthDays} days left
              </span>
            </div>
            <div className="mt-4 h-2 w-full overflow-hidden rounded-full bg-white/20">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${progressPct}%` }}
                transition={{ duration: 0.6, ease: EASE }}
                className="h-full rounded-full bg-surface"
              />
            </div>
            <p className="mt-3 text-sm text-white/70">
              Pick a plan any time to keep going after your trial ends, no interruption to your dashboard.
            </p>
          </div>
        ) : (
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-100 dark:bg-emerald-500/15 text-emerald-600 dark:text-emerald-400">
              <ShieldCheck className="h-5 w-5" strokeWidth={2} />
            </span>
            <div>
              <p className="text-sm font-bold text-emerald-700 dark:text-emerald-400 capitalize">You&apos;re on the {trial.currentPlan} plan</p>
              <p className="mt-0.5 text-sm text-emerald-600 dark:text-emerald-400/80">Your subscription renews automatically every month.</p>
            </div>
          </div>
        )}
      </motion.div>

      {/* plans */}
      <motion.div variants={item}>
        <h2 className="text-lg font-bold text-foreground">Plans</h2>
        <p className="mt-1 text-sm text-foreground/50">Every plan includes core WhatsApp order automation.</p>

        <div className="mt-5 grid grid-cols-1 gap-5 sm:grid-cols-3">
          {PLANS.map((plan) => {
            const isCurrent = trial.currentPlan === plan.id;
            return (
              <div
                key={plan.id}
                className={`relative flex flex-col rounded-2xl border p-6 shadow-sm transition-shadow ${
                  plan.popular ? "border-[#45157b]/30 shadow-md shadow-indigo-900/10" : "border-ink/[.06] bg-surface"
                } ${isCurrent ? "ring-2 ring-[#45157b]/40" : ""}`}
              >
                {plan.popular && !isCurrent && (
                  <span className="absolute right-5 top-5 rounded-full bg-[#45157b] px-2.5 py-1 text-[10px] font-bold text-white">
                    Most Popular
                  </span>
                )}
                {isCurrent && (
                  <span className="absolute right-5 top-5 rounded-full bg-emerald-500 px-2.5 py-1 text-[10px] font-bold text-white">
                    Current Plan
                  </span>
                )}

                <p className="text-base font-bold text-foreground">{plan.name}</p>
                <p className="mt-1 text-sm text-foreground/55">{plan.desc}</p>
                <div className="mt-4 flex items-end gap-1.5">
                  <span className="text-3xl font-extrabold tracking-tight text-foreground">
                    PKR {plan.monthly.toLocaleString()}
                  </span>
                  <span className="pb-1 text-xs text-foreground/45">/ month</span>
                </div>

                <ul className="mt-5 flex flex-1 flex-col gap-2.5">
                  {plan.features.map((f) => (
                    <li key={f} className="flex items-start gap-2 text-xs text-foreground/65">
                      <Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[#45157b]" strokeWidth={2.5} />
                      {f}
                    </li>
                  ))}
                </ul>

                <button
                  type="button"
                  disabled={isCurrent}
                  onClick={() => setInterestedPlan(plan.id)}
                  className={`mt-6 flex w-full items-center justify-center gap-2 rounded-full py-2.5 text-sm font-semibold shadow-sm transition-colors disabled:cursor-default ${
                    isCurrent
                      ? "bg-emerald-50 dark:bg-emerald-500/15 text-emerald-600 dark:text-emerald-400"
                      : "shine-btn-gold relative overflow-hidden bg-[#45157b] text-white hover:opacity-90"
                  }`}
                >
                  {isCurrent ? "Current Plan" : "Subscribe"}
                </button>

                {interestedPlan === plan.id && (
                  <motion.div
                    initial={{ opacity: 0, y: -6 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="mt-3 flex items-start gap-2 rounded-xl bg-indigo-50 dark:bg-indigo-500/15 p-3 text-xs leading-relaxed text-[#4338CA]"
                  >
                    <Mail className="mt-0.5 h-3.5 w-3.5 shrink-0" strokeWidth={2} />
                    <span>
                      Online payments aren&apos;t live yet. Email{" "}
                      <a href="mailto:hello@exofe.com" className="font-semibold underline underline-offset-2">
                        hello@exofe.com
                      </a>{" "}
                      to get the {plan.name} plan activated.
                    </span>
                  </motion.div>
                )}
              </div>
            );
          })}
        </div>
      </motion.div>

      {/* payment method + invoices, honest empty states */}
      <motion.div variants={item} className="grid grid-cols-1 gap-5 sm:grid-cols-2">
        <div className="rounded-2xl border border-ink/[.06] bg-surface p-6 shadow-sm">
          <p className="flex items-center gap-2 text-sm font-bold text-foreground">
            <CreditCard className="h-4 w-4 text-foreground/40" strokeWidth={2} />
            Payment method
          </p>
          <div className="mt-4 flex flex-col items-center justify-center gap-2 rounded-xl bg-ink/[.02] py-8 text-center">
            <p className="text-sm text-foreground/45">No payment method on file yet.</p>
          </div>
        </div>

        <div className="rounded-2xl border border-ink/[.06] bg-surface p-6 shadow-sm">
          <p className="flex items-center gap-2 text-sm font-bold text-foreground">
            <FileText className="h-4 w-4 text-foreground/40" strokeWidth={2} />
            Invoices
          </p>
          <div className="mt-4 flex flex-col items-center justify-center gap-2 rounded-xl bg-ink/[.02] py-8 text-center">
            <p className="text-sm text-foreground/45">No invoices yet.</p>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}
