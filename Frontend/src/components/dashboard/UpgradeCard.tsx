"use client";

import Link from "next/link";
import { Crown } from "lucide-react";
import type { TrialStatus } from "@/lib/trial";

// Only shown while the account is still on the trial plan, disappears the
// moment currentPlan is a paid plan.
export default function UpgradeCard({ trial }: { trial: TrialStatus }) {
  if (trial.currentPlan !== "trial") return null;

  return (
    <div className="relative mb-3 overflow-hidden rounded-2xl bg-gradient-to-br from-[#4a3fd6] via-[#5B4FE9] to-[#7C6FF5] p-4">
      <span className="pointer-events-none absolute -right-6 -top-8 h-20 w-20 rounded-full bg-white/10 blur-2xl" />

      <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-white/15 text-white">
        <Crown className="h-4 w-4" strokeWidth={2} />
      </span>
      <p className="relative mt-2.5 text-sm font-bold text-white">Upgrade to Premium</p>
      <p className="relative mt-1 text-xs leading-relaxed text-white/70">
        Unlock unlimited products, more conversations, and priority support.
      </p>
      <Link
        href="/dashboard/billing"
        className="relative mt-3 flex items-center justify-center rounded-lg bg-white py-2 text-xs font-semibold text-[#5B4FE9] transition-colors hover:bg-white/90"
      >
        Upgrade Now
      </Link>
    </div>
  );
}
