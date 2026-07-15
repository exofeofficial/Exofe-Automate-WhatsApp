"use client";

import { useState } from "react";
import Link from "next/link";
import { AnimatePresence, motion } from "framer-motion";
import { ChevronRight, Circle, CircleCheck, Clock, ListChecks, X } from "lucide-react";
import { MOCK_ONBOARDING_TASKS, type TrialStatus } from "@/lib/trial";

const EASE = [0.22, 1, 0.36, 1] as const;

// Floating, dismissible checklist. This is on purpose not a blocking modal,
// login should never force a "connect your account" step, this widget just
// nudges the user while they're already using the dashboard normally.
export default function PendingTasksWidget({ trial }: { trial: TrialStatus }) {
  const [open, setOpen] = useState(false);
  const tasks = MOCK_ONBOARDING_TASKS;

  const doneCount = tasks.filter((t) => t.completed).length;
  const remaining = tasks.length - doneCount;

  if (remaining === 0 && !trial.isTrialing) return null;

  return (
    <div className="fixed bottom-4 right-4 z-50 flex flex-col items-end gap-3 sm:bottom-5 sm:right-5">
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 12, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 12, scale: 0.96 }}
            transition={{ duration: 0.2, ease: EASE }}
            className="flex max-h-[min(70vh,28rem)] w-[calc(100vw-2rem)] max-w-[320px] flex-col overflow-hidden rounded-2xl border border-black/[.06] bg-white shadow-xl"
          >
            <div className="flex shrink-0 items-start justify-between gap-3 border-b border-black/[.06] px-5 py-4">
              <div>
                <p className="text-sm font-bold text-foreground">Finish setting up Exofe</p>
                <p className="mt-0.5 text-xs text-foreground/50">
                  {doneCount} of {tasks.length} steps done
                </p>
              </div>
              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label="Close pending tasks"
                className="mt-0.5 shrink-0 text-foreground/40 transition-colors hover:text-foreground"
              >
                <X className="h-4 w-4" strokeWidth={2} />
              </button>
            </div>

            {trial.isTrialing && (
              <div className="flex shrink-0 items-center gap-2 border-b border-black/[.06] bg-indigo-50/60 px-5 py-3">
                <Clock className="h-4 w-4 shrink-0 text-[#5B4FE9]" strokeWidth={2} />
                <p className="text-xs font-medium text-[#5B4FE9]">
                  {trial.daysLeft} of {trial.trialLengthDays} trial days left
                </p>
              </div>
            )}

            <div className="flex min-h-0 flex-col divide-y divide-black/[.05] overflow-y-auto px-2 py-2">
              {tasks.map((task) => (
                <Link
                  key={task.id}
                  href={task.href}
                  className="group flex items-center gap-3 rounded-xl px-3 py-2.5 transition-colors hover:bg-black/[.03]"
                >
                  {task.completed ? (
                    <CircleCheck className="h-[18px] w-[18px] shrink-0 text-emerald-500" strokeWidth={2} />
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

            <div className="shrink-0 border-t border-black/[.06] px-5 py-3.5">
              <Link
                href="/dashboard/billing"
                className="text-xs font-semibold text-[#5B4FE9] hover:underline"
              >
                View plans and pricing
              </Link>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <motion.button
        type="button"
        onClick={() => setOpen((v) => !v)}
        whileHover={{ scale: 1.04 }}
        whileTap={{ scale: 0.96 }}
        className="flex items-center gap-2 rounded-full bg-gradient-to-br from-[#5B4FE9] to-[#7C6FF5] px-4 py-3 text-white shadow-lg shadow-indigo-500/25"
      >
        <ListChecks className="h-[18px] w-[18px]" strokeWidth={2} />
        <span className="text-xs font-semibold">Setup guide</span>
        {remaining > 0 && (
          <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-white px-1 text-[11px] font-bold text-[#5B4FE9]">
            {remaining}
          </span>
        )}
      </motion.button>
    </div>
  );
}
