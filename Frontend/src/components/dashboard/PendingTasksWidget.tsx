"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { AnimatePresence, motion } from "framer-motion";
import { ChevronLeft, ChevronRight, Circle, CircleCheck, Clock, ListChecks, X } from "lucide-react";
import type { OnboardingTask, TrialStatus } from "@/lib/trial";

const EASE = [0.22, 1, 0.36, 1] as const;
const DOCKED_KEY = "exofe_setup_guide_docked";

// Docks to a small tab on the right edge of the screen instead of sitting
// open on top of the page — starts docked so it doesn't nag on every load,
// tap the tab to pull the full checklist out, tap X to send it back.
export default function PendingTasksWidget({ trial, tasks }: { trial: TrialStatus; tasks: OnboardingTask[] }) {
  const [docked, setDocked] = useState(true);

  const doneCount = tasks.filter((t) => t.completed).length;
  const remaining = tasks.length - doneCount;

  // Reads localStorage, has to happen after mount so the server render and
  // first client render match (same pattern used across the dashboard).
  useEffect(() => {
    const stored = localStorage.getItem(DOCKED_KEY);
    if (stored !== null) setDocked(stored === "true");
  }, []);

  const setAndPersist = (value: boolean) => {
    setDocked(value);
    localStorage.setItem(DOCKED_KEY, String(value));
  };

  if (remaining === 0 && !trial.isTrialing) return null;

  if (docked) {
    return (
      <motion.button
        type="button"
        onClick={() => setAndPersist(false)}
        aria-label="Show setup guide"
        initial={{ x: 12, opacity: 0 }}
        animate={{ x: 0, opacity: 1 }}
        whileHover={{ x: -3 }}
        className="fixed bottom-24 right-0 z-30 flex items-center gap-1 rounded-l-2xl bg-[#45157b] py-3 pl-3 pr-2 text-white shadow-lg shadow-indigo-500/25 md:bottom-6 md:z-50"
      >
        <ListChecks className="h-[18px] w-[18px]" strokeWidth={2} />
        {remaining > 0 && (
          <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-secondary px-1 text-[11px] font-bold text-[#1a1730]">
            {remaining}
          </span>
        )}
        <ChevronLeft className="h-3.5 w-3.5" strokeWidth={2.5} />
      </motion.button>
    );
  }

  return (
    <div className="fixed bottom-20 right-4 z-30 flex flex-col items-end gap-3 md:bottom-5 md:right-5 md:z-50">
      <AnimatePresence>
        <motion.div
          initial={{ opacity: 0, y: 12, scale: 0.96 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 12, scale: 0.96 }}
          transition={{ duration: 0.2, ease: EASE }}
          className="flex max-h-[min(70vh,28rem)] w-[calc(100vw-2rem)] max-w-[320px] flex-col overflow-hidden rounded-2xl border border-ink/[.06] bg-surface shadow-xl"
        >
          <div className="flex shrink-0 items-start justify-between gap-3 border-b border-ink/[.06] px-5 py-4">
            <div>
              <p className="text-sm font-bold text-foreground">Finish setting up Exofe</p>
              <p className="mt-0.5 text-xs text-foreground/50">
                {doneCount} of {tasks.length} steps done
              </p>
            </div>
            <button
              type="button"
              onClick={() => setAndPersist(true)}
              aria-label="Dock setup guide"
              className="mt-0.5 shrink-0 text-foreground/40 transition-colors hover:text-foreground"
            >
              <X className="h-4 w-4" strokeWidth={2} />
            </button>
          </div>

          {trial.isTrialing && (
            <div className="flex shrink-0 items-center gap-2 border-b border-ink/[.06] bg-indigo-50/60 dark:bg-indigo-500/15 px-5 py-3">
              <Clock className="h-4 w-4 shrink-0 text-[#45157b]" strokeWidth={2} />
              <p className="text-xs font-medium text-[#45157b]">
                {trial.daysLeft} of {trial.trialLengthDays} trial days left
              </p>
            </div>
          )}

          <div className="flex min-h-0 flex-col divide-y divide-ink/[.05] overflow-y-auto px-2 py-2">
            {tasks.map((task) => (
              <Link
                key={task.id}
                href={task.href}
                className="group flex items-center gap-3 rounded-xl px-3 py-2.5 transition-colors hover:bg-ink/[.03]"
              >
                {task.completed ? (
                  <CircleCheck className="h-[18px] w-[18px] shrink-0 text-emerald-500 dark:text-emerald-400" strokeWidth={2} />
                ) : (
                  <Circle className="h-[18px] w-[18px] shrink-0 text-foreground/25" strokeWidth={2} />
                )}
                <span
                  className={`flex-1 text-sm ${
                    task.completed ? "text-foreground/40 line-through" : "text-foreground/80"
                  }`}
                >
                  {task.label}
                </span>
                <ChevronRight className="h-4 w-4 shrink-0 text-foreground/25 transition-transform group-hover:translate-x-0.5" strokeWidth={2} />
              </Link>
            ))}
          </div>

          <div className="shrink-0 border-t border-ink/[.06] px-5 py-3.5">
            <Link
              href="/dashboard/billing"
              className="text-xs font-semibold text-[#45157b] hover:underline"
            >
              View plans and pricing
            </Link>
          </div>
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
