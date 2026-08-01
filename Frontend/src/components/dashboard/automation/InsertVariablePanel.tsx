"use client";

import { Plus } from "lucide-react";
import { VARIABLE_GROUPS } from "./interactiveMessageHelpers";

export default function InsertVariablePanel({ onInsert }: { onInsert: (key: string) => void }) {
  return (
    <div className="rounded-xl border border-ink/[.08] bg-ink/[.015] p-3">
      <p className="text-xs font-semibold text-foreground/60">Insert Variable</p>
      <p className="mt-0.5 text-[11px] text-foreground/40">
        Click one to drop it into your message, real order and customer details fill it in automatically.
      </p>

      <div className="mt-3 flex max-h-72 flex-col gap-3 overflow-y-auto pr-1">
        {VARIABLE_GROUPS.map((g) => (
          <div key={g.group}>
            <p className="text-[10px] font-bold uppercase tracking-wide text-foreground/35">{g.group}</p>
            <div className="mt-1.5 flex flex-wrap gap-1.5">
              {g.variables.map((v) => (
                <button
                  key={v.key}
                  type="button"
                  onClick={() => onInsert(v.key)}
                  className="flex items-center gap-1 rounded-full border border-ink/[.1] bg-surface px-2.5 py-1 text-[11px] font-medium text-foreground/65 hover:border-[#45157b] hover:text-[#45157b]"
                >
                  <Plus className="h-3 w-3" strokeWidth={2.5} />
                  {v.label}
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
