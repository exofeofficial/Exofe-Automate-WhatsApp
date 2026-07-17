"use client";

import type { ReactNode } from "react";
import { Check, Loader2 } from "lucide-react";

export default function SettingsSectionCard({
  title,
  description,
  children,
  onSave,
  saving,
  saved,
  error,
}: {
  title: string;
  description: string;
  children: ReactNode;
  onSave: () => void;
  saving: boolean;
  saved: boolean;
  error: string | null;
}) {
  return (
    <div className="rounded-2xl border border-ink/[.06] bg-surface p-5 shadow-sm sm:p-6">
      <p className="text-sm font-bold text-foreground">{title}</p>
      <p className="mt-1 text-xs text-foreground/50">{description}</p>

      <div className="mt-5 flex flex-col gap-4">{children}</div>

      {error && <p className="mt-4 rounded-lg bg-red-50 dark:bg-red-500/15 p-3 text-sm text-red-600 dark:text-red-400">{error}</p>}

      <div className="mt-5 flex items-center gap-3">
        <button
          type="button"
          onClick={onSave}
          disabled={saving}
          className="flex items-center gap-2 rounded-xl shine-btn-gold relative overflow-hidden bg-gradient-to-br from-[#5B4FE9] to-[#7C6FF5] px-5 py-2.5 text-xs font-semibold text-white shadow-sm hover:opacity-90 disabled:opacity-70"
        >
          {saving && <Loader2 className="h-3.5 w-3.5 animate-spin" strokeWidth={2} />}
          {saving ? "Saving..." : "Save changes"}
        </button>
        {saved && !saving && (
          <span className="flex items-center gap-1 text-xs font-medium text-emerald-600 dark:text-emerald-400">
            <Check className="h-3.5 w-3.5" strokeWidth={2.5} />
            Saved
          </span>
        )}
      </div>
    </div>
  );
}
