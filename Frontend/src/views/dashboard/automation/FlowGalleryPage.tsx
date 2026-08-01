"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Loader2, MessageSquarePlus, Workflow } from "lucide-react";
import { getInteractiveMessages, type InteractiveMessage } from "@/lib/api";
import { TEMPLATE_META, TRIGGER_META } from "@/components/dashboard/automation/interactiveMessageHelpers";

export default function FlowGalleryPage() {
  const [messages, setMessages] = useState<InteractiveMessage[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getInteractiveMessages()
      .then((res) => setMessages(res.messages))
      .catch(() => setMessages([]))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-sm font-bold text-foreground">All Flows</p>
          <p className="mt-0.5 text-sm text-foreground/55">
            Every automated conversation your AI can have — the built-in order flow, plus each interactive message you&apos;ve built.
          </p>
        </div>
        <Link
          href="/dashboard/automation/interactive-messages/new"
          className="flex shrink-0 items-center gap-1.5 rounded-xl shine-btn-gold relative overflow-hidden bg-[#45157b] px-4 py-2.5 text-xs font-semibold text-white shadow-sm hover:opacity-90"
        >
          <MessageSquarePlus className="h-3.5 w-3.5" strokeWidth={2} />
          New Flow
        </Link>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <Link
          href="/dashboard/automation/flow-builder/order-taking"
          className="group flex flex-col rounded-2xl border border-ink/[.06] bg-surface p-5 shadow-sm transition-colors hover:border-[#45157b]/30"
        >
          <div className="flex items-start justify-between gap-3">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-50 dark:bg-emerald-500/15 text-emerald-600 dark:text-emerald-400">
              <Workflow className="h-4 w-4" strokeWidth={2} />
            </span>
            <span className="rounded-full bg-ink/[.05] px-2.5 py-1 text-[11px] font-medium text-foreground/50">Built-in</span>
          </div>
          <p className="mt-3 text-sm font-bold text-foreground">Order-Taking Flow</p>
          <p className="mt-1.5 text-sm text-foreground/60">
            How your AI turns a WhatsApp message into a confirmed order — every branch, live.
          </p>
          <p className="mt-4 border-t border-ink/[.06] pt-3 text-xs font-semibold text-[#45157b] group-hover:underline">
            View flow →
          </p>
        </Link>

        {loading && (
          <div className="flex items-center justify-center rounded-2xl border border-ink/[.06] bg-surface p-5 shadow-sm">
            <Loader2 className="h-5 w-5 animate-spin text-[#45157b]" strokeWidth={2} />
          </div>
        )}

        {!loading &&
          messages.map((m) => (
            <Link
              key={m.id}
              href={`/dashboard/automation/flow-builder/message/${m.id}`}
              className="group flex flex-col rounded-2xl border border-ink/[.06] bg-surface p-5 shadow-sm transition-colors hover:border-[#45157b]/30"
            >
              <div className="flex items-start justify-between gap-3">
                <span className="rounded-full bg-indigo-50 dark:bg-indigo-500/15 px-2.5 py-1 text-[11px] font-medium text-[#45157b]">
                  {TEMPLATE_META[m.template].label}
                </span>
                <span
                  className={`rounded-full px-2.5 py-1 text-[11px] font-medium capitalize ${
                    m.status === "active" ? "bg-emerald-50 dark:bg-emerald-500/15 text-emerald-600 dark:text-emerald-400" : "bg-ink/[.05] text-foreground/45"
                  }`}
                >
                  {m.status}
                </span>
              </div>
              <p className="mt-3 line-clamp-2 text-sm text-foreground/70">{m.bodyText || "No message text yet"}</p>
              <p className="mt-2 text-xs text-foreground/40">{TRIGGER_META[m.trigger].label}</p>
              <p className="mt-4 border-t border-ink/[.06] pt-3 text-xs font-semibold text-[#45157b] group-hover:underline">
                Edit flow →
              </p>
            </Link>
          ))}
      </div>

      {!loading && messages.length === 0 && (
        <p className="text-center text-xs text-foreground/40">
          No interactive messages yet — create one to see it here as its own flow.
        </p>
      )}
    </div>
  );
}
