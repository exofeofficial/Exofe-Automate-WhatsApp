"use client";

import { Sparkles } from "lucide-react";

// Placeholder for now. This step grows into business description, products,
// business hours, delivery settings, FAQs, AI personality, and human
// handover, each is its own sizable feature so they're being built next.
// Business owners can already skip ahead and configure those later from
// AI Assistant and Settings.
export default function Step4AISetup({
  description,
  onChange,
  onNext,
  onBack,
}: {
  description: string;
  onChange: (v: string) => void;
  onNext: () => void;
  onBack: () => void;
}) {
  return (
    <div className="flex flex-col gap-4">
      <div>
        <p className="text-sm font-bold text-foreground">Tell the AI about your business</p>
        <p className="mt-1 text-xs text-foreground/50">
          A short description is enough to get started, you can add products, hours, and FAQs later.
        </p>
      </div>

      <div>
        <label className="text-xs font-semibold text-foreground/70">Business Description</label>
        <textarea
          value={description}
          onChange={(e) => onChange(e.target.value)}
          rows={4}
          placeholder="We sell premium clothing for women."
          className="mt-1.5 w-full rounded-lg border border-ink/[.12] px-3.5 py-2.5 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-[#5B4FE9]/30"
        />
      </div>

      <div className="flex items-start gap-3 rounded-2xl border border-indigo-100 dark:border-indigo-500/25 bg-indigo-50 dark:bg-indigo-500/15/60 px-4 py-3">
        <Sparkles className="mt-0.5 h-4 w-4 shrink-0 text-[#5B4FE9]" strokeWidth={2} />
        <p className="text-xs leading-relaxed text-[#5B4FE9]">
          Products, business hours, delivery settings, FAQs, and AI personality are coming to this step soon.
          For now you can finish setup and add them from Products and AI Assistant.
        </p>
      </div>

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
          className="flex-1 rounded-xl shine-btn-gold relative overflow-hidden bg-gradient-to-br from-[#5B4FE9] to-[#7C6FF5] py-3 text-sm font-semibold text-white shadow-sm hover:opacity-90"
        >
          Finish setup
        </button>
      </div>
    </div>
  );
}
