"use client";

import { useState } from "react";
import { Sparkles } from "lucide-react";
import type { InteractiveMessageTemplate } from "@/lib/api";
import { TEMPLATE_META } from "./interactiveMessageHelpers";

const TEMPLATES: InteractiveMessageTemplate[] = [
  "order_confirmation",
  "payment_reminder",
  "delivery_update",
  "welcome_message",
  "custom",
];

export default function Step1TemplateChoice({
  template,
  onPick,
  onNext,
  onQuickGenerate,
}: {
  template: InteractiveMessageTemplate | null;
  onPick: (template: InteractiveMessageTemplate) => void;
  onNext: () => void;
  onQuickGenerate: (prompt: string) => void;
}) {
  const [quickPrompt, setQuickPrompt] = useState("");

  return (
    <div className="flex flex-col gap-5">
      <div className="rounded-2xl border border-indigo-100 dark:border-indigo-500/25 bg-indigo-50 dark:bg-indigo-500/15/50 p-4">
        <p className="flex items-center gap-1.5 text-sm font-bold text-[#5B4FE9]">
          <Sparkles className="h-4 w-4" strokeWidth={2} />
          AI Mode
        </p>
        <p className="mt-1 text-xs text-foreground/55">
          Describe the whole thing in one sentence and Exofe builds the message, buttons, and trigger for you.
        </p>
        <textarea
          value={quickPrompt}
          onChange={(e) => setQuickPrompt(e.target.value)}
          rows={2}
          placeholder="After every order, ask the customer to confirm using buttons."
          className="mt-3 w-full rounded-lg border border-ink/[.12] bg-surface px-3.5 py-2.5 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-[#5B4FE9]/30"
        />
        <button
          type="button"
          disabled={!quickPrompt.trim()}
          onClick={() => onQuickGenerate(quickPrompt.trim())}
          className="mt-3 flex items-center gap-2 rounded-xl shine-btn-gold relative overflow-hidden bg-gradient-to-br from-[#5B4FE9] to-[#7C6FF5] px-4 py-2.5 text-xs font-semibold text-white shadow-sm hover:opacity-90 disabled:opacity-40"
        >
          <Sparkles className="h-3.5 w-3.5" strokeWidth={2} />
          Generate automatically
        </button>
      </div>

      <div className="flex items-center gap-3 text-xs text-foreground/35">
        <span className="h-px flex-1 bg-ink/[.08]" />
        or build it step by step
        <span className="h-px flex-1 bg-ink/[.08]" />
      </div>

      <div>
        <p className="text-sm font-bold text-foreground">What do you want to create?</p>
        <div className="mt-3 flex flex-col gap-2">
          {TEMPLATES.map((t) => {
            const meta = TEMPLATE_META[t];
            const active = template === t;
            return (
              <button
                key={t}
                type="button"
                onClick={() => onPick(t)}
                className={`flex items-center gap-3 rounded-xl border px-4 py-3 text-left transition-colors ${
                  active ? "border-[#5B4FE9] bg-indigo-50 dark:bg-indigo-500/15" : "border-ink/[.1] hover:bg-ink/[.03]"
                }`}
              >
                <span
                  className={`flex h-4 w-4 shrink-0 items-center justify-center rounded-full border-2 ${
                    active ? "border-[#5B4FE9]" : "border-ink/[.2]"
                  }`}
                >
                  {active && <span className="h-2 w-2 rounded-full bg-[#5B4FE9]" />}
                </span>
                <div>
                  <p className={`text-sm font-semibold ${active ? "text-[#5B4FE9]" : "text-foreground/80"}`}>{meta.label}</p>
                  <p className="mt-0.5 text-xs text-foreground/45">{meta.hint}</p>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      <button
        type="button"
        onClick={onNext}
        disabled={!template}
        className="mt-1 w-full rounded-xl shine-btn-gold relative overflow-hidden bg-gradient-to-br from-[#5B4FE9] to-[#7C6FF5] py-3 text-sm font-semibold text-white shadow-sm hover:opacity-90 disabled:opacity-40"
      >
        Continue
      </button>
    </div>
  );
}
