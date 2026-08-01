"use client";

import { Check } from "lucide-react";

const STEPS = ["Type", "Describe", "Preview", "Trigger"];

export default function AutomationWizardProgress({ current }: { current: number }) {
  return (
    <div className="flex items-center">
      {STEPS.map((label, i) => {
        const stepNumber = i + 1;
        const isDone = stepNumber < current;
        const isCurrent = stepNumber === current;
        const isLast = i === STEPS.length - 1;

        return (
          <div key={label} className={`flex items-center ${isLast ? "" : "flex-1"}`}>
            <div className="flex flex-col items-center gap-1.5">
              <span
                className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-bold transition-colors ${
                  isDone
                    ? "bg-[#45157b] text-white"
                    : isCurrent
                      ? "bg-indigo-50 dark:bg-indigo-500/15 text-[#45157b] ring-2 ring-[#45157b]"
                      : "bg-ink/[.05] text-foreground/35"
                }`}
              >
                {isDone ? <Check className="h-4 w-4" strokeWidth={2.5} /> : stepNumber}
              </span>
              <span className={`hidden text-[11px] font-medium sm:block ${isCurrent ? "text-foreground" : "text-foreground/40"}`}>
                {label}
              </span>
            </div>
            {!isLast && <span className={`mx-2 h-0.5 flex-1 rounded-full ${isDone ? "bg-[#45157b]" : "bg-ink/[.08]"}`} />}
          </div>
        );
      })}
    </div>
  );
}
