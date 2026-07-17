"use client";

import { useEffect, useState } from "react";
import { Check, CircleAlert, Loader2 } from "lucide-react";

const CHECKS = ["Access Token", "Phone Number", "Business Account", "Webhook", "Permissions"] as const;

type CheckState = "pending" | "checking" | "passed" | "failed";

export default function Step3Verification({ onNext, onBack }: { onNext: () => void; onBack: () => void }) {
  const [states, setStates] = useState<CheckState[]>(CHECKS.map(() => "pending"));

  // Backend developer: this is a stand-in for GET /integrations/whatsapp/verify,
  // which should check the token, number, WABA, webhook subscription, and
  // granted permissions server side and return pass or fail per item.
  useEffect(() => {
    const timers = CHECKS.map((_, i) =>
      setTimeout(() => {
        setStates((prev) => {
          const next = [...prev];
          next[i] = "checking";
          return next;
        });
        setTimeout(() => {
          setStates((prev) => {
            const next = [...prev];
            next[i] = "passed";
            return next;
          });
        }, 500);
      }, i * 650)
    );
    return () => timers.forEach(clearTimeout);
  }, []);

  const allPassed = states.every((s) => s === "passed");
  const anyFailed = states.some((s) => s === "failed");

  return (
    <div className="flex flex-col gap-4">
      <div>
        <p className="text-sm font-bold text-foreground">Verifying your connection</p>
        <p className="mt-1 text-xs text-foreground/50">This only takes a few seconds.</p>
      </div>

      <div className="flex flex-col divide-y divide-ink/[.05] rounded-2xl border border-ink/[.06]">
        {CHECKS.map((label, i) => (
          <div key={label} className="flex items-center justify-between px-4 py-3">
            <span className="text-sm text-foreground/75">{label}</span>
            {states[i] === "pending" && <span className="h-4 w-4 rounded-full border border-black/10" />}
            {states[i] === "checking" && <Loader2 className="h-4 w-4 animate-spin text-[#5B4FE9]" strokeWidth={2} />}
            {states[i] === "passed" && <Check className="h-4 w-4 text-emerald-500 dark:text-emerald-400" strokeWidth={2.5} />}
            {states[i] === "failed" && <CircleAlert className="h-4 w-4 text-red-500 dark:text-red-400" strokeWidth={2} />}
          </div>
        ))}
      </div>

      {allPassed && (
        <div className="rounded-2xl bg-emerald-50 dark:bg-emerald-500/15 px-4 py-3 text-center">
          <p className="text-xs font-semibold text-emerald-700 dark:text-emerald-400">Connected</p>
          <p className="mt-0.5 text-[11px] text-emerald-700 dark:text-emerald-400/70">Everything checks out, you&apos;re ready for the next step.</p>
        </div>
      )}
      {anyFailed && (
        <div className="rounded-2xl bg-red-50 dark:bg-red-500/15 px-4 py-3 text-center">
          <p className="text-xs font-semibold text-red-700 dark:text-red-400">Something didn&apos;t check out</p>
          <p className="mt-0.5 text-[11px] text-red-700 dark:text-red-400/70">Go back and double check the values from Meta for Developers.</p>

        </div>
      )}

      <div className="mt-2 flex gap-3">
        <button
          type="button"
          onClick={onBack}
          className="flex-1 rounded-xl bg-ink/[.04] py-3 text-sm font-semibold text-foreground/70 hover:bg-ink/[.07]"
        >
          Back
        </button>
        <button
          type="button"
          onClick={onNext}
          disabled={!allPassed}
          className="flex-1 rounded-xl shine-btn-gold relative overflow-hidden bg-gradient-to-br from-[#5B4FE9] to-[#7C6FF5] py-3 text-sm font-semibold text-white shadow-sm hover:opacity-90 disabled:opacity-40"
        >
          Continue
        </button>
      </div>
    </div>
  );
}
