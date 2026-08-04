"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { AlertTriangle, Bell, CheckCircle2, Clock, Loader2, PauseCircle, XCircle } from "lucide-react";
import { ApiError, activateTemplate, getStarterTemplates, type StarterTemplate } from "@/lib/api";

const EASE = [0.22, 1, 0.36, 1] as const;

function StatusBadge({ status }: { status: StarterTemplate["status"] }) {
  if (status === "approved") {
    return (
      <span className="flex items-center gap-1 rounded-full bg-emerald-50 dark:bg-emerald-500/15 px-2.5 py-1 text-[11px] font-medium text-emerald-600 dark:text-emerald-400">
        <CheckCircle2 className="h-3 w-3" strokeWidth={2.5} />
        Approved
      </span>
    );
  }
  if (status === "pending") {
    return (
      <span className="flex items-center gap-1 rounded-full bg-amber-50 dark:bg-amber-500/15 px-2.5 py-1 text-[11px] font-medium text-amber-600 dark:text-amber-400">
        <Clock className="h-3 w-3" strokeWidth={2.5} />
        Pending review
      </span>
    );
  }
  if (status === "rejected") {
    return (
      <span className="flex items-center gap-1 rounded-full bg-red-50 dark:bg-red-500/15 px-2.5 py-1 text-[11px] font-medium text-red-600 dark:text-red-400">
        <XCircle className="h-3 w-3" strokeWidth={2.5} />
        Rejected
      </span>
    );
  }
  if (status === "paused") {
    return (
      <span className="flex items-center gap-1 rounded-full bg-ink/[.05] px-2.5 py-1 text-[11px] font-medium text-foreground/45">
        <PauseCircle className="h-3 w-3" strokeWidth={2.5} />
        Paused
      </span>
    );
  }
  return (
    <span className="rounded-full bg-ink/[.05] px-2.5 py-1 text-[11px] font-medium text-foreground/45">
      Not activated
    </span>
  );
}

export default function TemplatesPage() {
  const [templates, setTemplates] = useState<StarterTemplate[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [activating, setActivating] = useState<string | null>(null);
  const [activateError, setActivateError] = useState<Record<string, string>>({});

  const load = () => {
    getStarterTemplates()
      .then((res) => setTemplates(res.templates))
      .catch((err) => setError(err instanceof ApiError ? err.message : "Couldn't load templates."));
  };

  useEffect(load, []);

  const handleActivate = async (key: string) => {
    setActivating(key);
    setActivateError((prev) => ({ ...prev, [key]: "" }));
    try {
      await activateTemplate(key);
      load();
    } catch (err) {
      setActivateError((prev) => ({
        ...prev,
        [key]: err instanceof ApiError ? err.message : "Couldn't activate this template.",
      }));
    } finally {
      setActivating(null);
    }
  };

  if (error) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center rounded-2xl border border-dashed border-ink/[.1] bg-surface p-8 text-center">
        <p className="text-sm text-red-500">{error}</p>
      </div>
    );
  }

  if (!templates) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center rounded-2xl border border-dashed border-ink/[.1] bg-surface">
        <Loader2 className="h-6 w-6 animate-spin text-[#45157b]" strokeWidth={2} />
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: EASE }}
      className="flex flex-col gap-5"
    >
      <div>
        <h1 className="text-xl font-bold text-foreground sm:text-2xl">Templates</h1>
        <p className="mt-1 text-sm text-foreground/55">
          Ready-made WhatsApp message templates for order updates — activating one submits it to Meta for approval
          under your own connected WhatsApp account, so it can reach customers even outside a live conversation.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {templates.map((t) => {
          const isBusy = activating === t.key;
          const canActivate = t.status === null;
          return (
            <div key={t.key} className="flex flex-col rounded-2xl border border-ink/[.06] bg-surface p-5 shadow-sm">
              <div className="flex items-start justify-between gap-2">
                <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#45157b]/10 text-[#45157b]">
                  <Bell className="h-5 w-5" strokeWidth={2} />
                </span>
                <StatusBadge status={t.status} />
              </div>

              <p className="mt-3 text-sm font-bold text-foreground">{t.label}</p>
              <p className="mt-1 text-xs text-foreground/50">{t.hint}</p>

              <div className="mt-3 rounded-xl bg-ink/[.03] p-3 text-xs leading-relaxed text-foreground/70">
                {t.body}
              </div>
              <p className="mt-2 text-[11px] font-medium uppercase tracking-wide text-foreground/35">
                {t.category}
              </p>

              {t.status === "rejected" && t.rejectionReason && (
                <p className="mt-2 flex items-start gap-1.5 text-xs text-red-500">
                  <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" strokeWidth={2} />
                  {t.rejectionReason}
                </p>
              )}
              {activateError[t.key] && (
                <p className="mt-2 text-xs text-red-500">{activateError[t.key]}</p>
              )}

              <button
                type="button"
                disabled={!canActivate || isBusy}
                onClick={() => handleActivate(t.key)}
                className={`mt-4 flex w-full items-center justify-center gap-1.5 rounded-full py-2.5 text-xs font-semibold transition-colors ${
                  canActivate
                    ? "shine-btn-gold relative overflow-hidden bg-[#45157b] text-white shadow-sm hover:opacity-90 disabled:opacity-60"
                    : "cursor-not-allowed bg-ink/[.04] text-foreground/30"
                }`}
              >
                {isBusy && <Loader2 className="h-3.5 w-3.5 animate-spin" strokeWidth={2} />}
                {canActivate ? (isBusy ? "Activating..." : "Activate") : "Activated"}
              </button>
            </div>
          );
        })}
      </div>
    </motion.div>
  );
}
