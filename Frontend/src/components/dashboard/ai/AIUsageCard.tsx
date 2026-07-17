"use client";

import { Gauge } from "lucide-react";
import type { AIUsage } from "@/lib/api";

export default function AIUsageCard({ usage }: { usage: AIUsage }) {
  const unlimited = usage.monthLimit === null;
  const pct = unlimited ? 0 : Math.min(100, Math.round((usage.monthCount / Math.max(1, usage.monthLimit!)) * 100));
  const nearLimit = !unlimited && pct >= 80;

  return (
    <div className="rounded-2xl border border-ink/[.06] bg-surface p-5 shadow-sm sm:p-6">
      <div className="flex items-center gap-2">
        <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-50 dark:bg-indigo-500/15 text-[#5B4FE9]">
          <Gauge className="h-4 w-4" strokeWidth={2} />
        </span>
        <div>
          <p className="text-sm font-bold text-foreground">AI Usage</p>
          <p className="text-xs text-foreground/50">Conversations used this month, based on your plan.</p>
        </div>
      </div>

      <div className="mt-4">
        <div className="flex items-baseline justify-between">
          <span className="text-sm font-semibold text-foreground">
            {usage.monthCount.toLocaleString()} {unlimited ? "" : `/ ${usage.monthLimit!.toLocaleString()}`}
          </span>
          {unlimited && <span className="text-xs font-medium text-emerald-600 dark:text-emerald-400">Unlimited</span>}
        </div>
        {!unlimited && (
          <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-ink/[.06]">
            <div
              className={`h-full rounded-full transition-all ${nearLimit ? "bg-amber-500" : "bg-[#5B4FE9]"}`}
              style={{ width: `${pct}%` }}
            />
          </div>
        )}
      </div>

      {usage.blocked && (
        <p className="mt-4 rounded-lg bg-red-50 dark:bg-red-500/15 p-3 text-xs font-medium text-red-600 dark:text-red-400">
          You&apos;ve hit your plan&apos;s AI limit — conversations are being routed to your team for now.{" "}
          {usage.blockedUntil && (
            <>
              AI replies resume around{" "}
              {new Date(usage.blockedUntil).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })}.
            </>
          )}
        </p>
      )}
    </div>
  );
}
