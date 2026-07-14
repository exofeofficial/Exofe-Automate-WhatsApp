"use client";

import { Loader2 } from "lucide-react";
import type { InteractiveMessageTrigger } from "@/lib/api";
import { TRIGGER_META } from "./interactiveMessageHelpers";

const TRIGGERS: InteractiveMessageTrigger[] = ["after_order_created", "after_payment", "after_shipping", "manual"];

export default function Step4Trigger({
  trigger,
  onChange,
  onBack,
  onSave,
  saving,
  error,
  isEdit,
}: {
  trigger: InteractiveMessageTrigger;
  onChange: (v: InteractiveMessageTrigger) => void;
  onBack: () => void;
  onSave: () => void;
  saving: boolean;
  error: string | null;
  isEdit: boolean;
}) {
  return (
    <div className="flex flex-col gap-4">
      <div>
        <p className="text-sm font-bold text-foreground">When should this message be sent?</p>
        <p className="mt-1 text-xs text-foreground/50">You can change this later.</p>
      </div>

      <div className="flex flex-col gap-2">
        {TRIGGERS.map((t) => {
          const meta = TRIGGER_META[t];
          const active = trigger === t;
          return (
            <button
              key={t}
              type="button"
              onClick={() => onChange(t)}
              className={`flex items-center gap-3 rounded-xl border px-4 py-3 text-left transition-colors ${
                active ? "border-[#5B4FE9] bg-indigo-50" : "border-black/[.1] hover:bg-black/[.03]"
              }`}
            >
              <span
                className={`flex h-4 w-4 shrink-0 items-center justify-center rounded-full border-2 ${
                  active ? "border-[#5B4FE9]" : "border-black/[.2]"
                }`}
              >
                {active && <span className="h-2 w-2 rounded-full bg-[#5B4FE9]" />}
              </span>
              <div>
                <p className={`text-sm font-semibold ${active ? "text-[#5B4FE9]" : "text-foreground/80"}`}>{meta.label}</p>
                <p className="mt-0.5 text-xs text-foreground/45">{meta.description}</p>
              </div>
            </button>
          );
        })}
      </div>

      {error && <p className="rounded-lg bg-red-50 p-3 text-sm text-red-600">{error}</p>}

      <div className="flex gap-3">
        <button
          type="button"
          onClick={onBack}
          className="flex-1 rounded-xl bg-black/[.04] py-3 text-sm font-semibold text-foreground/70 hover:bg-black/[.07]"
        >
          Back
        </button>
        <button
          type="button"
          onClick={onSave}
          disabled={saving}
          className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-gradient-to-br from-[#5B4FE9] to-[#7C6FF5] py-3 text-sm font-semibold text-white shadow-sm hover:opacity-90 disabled:opacity-70"
        >
          {saving && <Loader2 className="h-4 w-4 animate-spin" strokeWidth={2.4} />}
          {saving ? "Saving..." : isEdit ? "Save changes" : "Save Automation"}
        </button>
      </div>
    </div>
  );
}
