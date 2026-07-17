"use client";

import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { Lock } from "lucide-react";
import { clearToken } from "@/lib/auth";
import type { TrialStatus } from "@/lib/trial";

const EASE = [0.22, 1, 0.36, 1] as const;

// Rendered on top of the whole dashboard once the 7 day trial runs out and
// no plan has been picked yet. The dashboard layout skips this on the
// Billing page itself, otherwise there would be no way to actually pick
// a plan and get unlocked.
export default function TrialLockOverlay({ trial }: { trial: TrialStatus }) {
  const router = useRouter();

  const handleLogout = () => {
    clearToken();
    router.push("/login");
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.2, ease: EASE }}
      className="fixed inset-0 z-[60] flex items-center justify-center bg-foreground/40 p-4 backdrop-blur-sm"
    >
      <motion.div
        initial={{ opacity: 0, y: 16, scale: 0.97 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.25, ease: EASE }}
        className="w-full max-w-md rounded-3xl border border-ink/[.06] bg-surface p-8 text-center shadow-2xl"
      >
        <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-indigo-50 dark:bg-indigo-500/15 text-[#5B4FE9]">
          <Lock className="h-6 w-6" strokeWidth={2} />
        </span>
        <h2 className="mt-5 text-lg font-bold text-foreground">Your free trial has ended</h2>
        <p className="mt-2 text-sm leading-relaxed text-foreground/60">
          Your {trial.trialLengthDays} day trial is over, so orders and conversations are paused for now.
          Pick a plan to keep automating your WhatsApp store.
        </p>

        <button
          type="button"
          onClick={() => router.push("/dashboard/billing")}
          className="mt-6 w-full rounded-xl shine-btn-gold relative overflow-hidden bg-gradient-to-br from-[#5B4FE9] to-[#7C6FF5] py-3 text-sm font-semibold text-white shadow-lg shadow-indigo-500/25 transition-transform hover:scale-[1.01]"
        >
          Choose a plan
        </button>
        <button
          type="button"
          onClick={handleLogout}
          className="mt-3 w-full py-2 text-xs font-medium text-foreground/45 hover:text-foreground/70"
        >
          Log out
        </button>
      </motion.div>
    </motion.div>
  );
}
