"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { AnimatePresence, motion } from "framer-motion";
import { Loader2, MessageSquarePlus, Pencil, Sparkles, Trash2, X } from "lucide-react";
import { ApiError, deleteInteractiveMessage, getInteractiveMessages, type InteractiveMessage } from "@/lib/api";
import { TEMPLATE_META, TRIGGER_META } from "@/components/dashboard/automation/interactiveMessageHelpers";

const EASE = [0.22, 1, 0.36, 1] as const;

function DeleteModal({
  name,
  onClose,
  onConfirm,
  deleting,
  error,
}: {
  name: string;
  onClose: () => void;
  onConfirm: () => void;
  deleting: boolean;
  error: string | null;
}) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.15 }}
      onClick={onClose}
      className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/40 p-4 backdrop-blur-sm"
    >
      <motion.div
        initial={{ opacity: 0, y: 12, scale: 0.97 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 10, scale: 0.98 }}
        transition={{ duration: 0.2, ease: EASE }}
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-sm rounded-3xl border border-black/[.06] bg-white p-6 shadow-2xl"
      >
        <div className="flex items-start justify-between">
          <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-red-50 text-red-600">
            <Trash2 className="h-5 w-5" strokeWidth={2} />
          </span>
          <button type="button" onClick={onClose} aria-label="Close" className="text-foreground/40 hover:text-foreground">
            <X className="h-4 w-4" strokeWidth={2} />
          </button>
        </div>
        <p className="mt-4 text-sm font-bold text-foreground">Delete &quot;{name}&quot;?</p>
        <p className="mt-2 text-xs leading-relaxed text-foreground/55">This automation will stop sending right away. This can&apos;t be undone.</p>
        {error && <p className="mt-4 text-xs font-medium text-red-500">{error}</p>}
        <div className="mt-6 flex gap-3">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 rounded-xl bg-black/[.04] py-2.5 text-xs font-semibold text-foreground/70 hover:bg-black/[.07]"
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={deleting}
            onClick={onConfirm}
            className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-red-600 py-2.5 text-xs font-semibold text-white hover:bg-red-700 disabled:opacity-70"
          >
            {deleting && <Loader2 className="h-3.5 w-3.5 animate-spin" strokeWidth={2} />}
            {deleting ? "Deleting..." : "Delete"}
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}

export default function InteractiveMessagesPage() {
  const [messages, setMessages] = useState<InteractiveMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleteTarget, setDeleteTarget] = useState<InteractiveMessage | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  // Backend developer: this is a real GET /automation/interactive-messages
  // call (see src/lib/api.ts), it will fail until that endpoint exists,
  // the page just falls back to the empty state below rather than fake data.
  useEffect(() => {
    getInteractiveMessages()
      .then((res) => setMessages(res.messages))
      .catch(() => setMessages([]))
      .finally(() => setLoading(false));
  }, []);

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    setDeleteError(null);
    try {
      await deleteInteractiveMessage(deleteTarget.id);
      setMessages((prev) => prev.filter((m) => m.id !== deleteTarget.id));
      setDeleteTarget(null);
    } catch (err) {
      setDeleteError(err instanceof ApiError ? err.message : "Couldn't delete this right now. Please try again.");
    } finally {
      setDeleting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex h-[calc(100vh-10rem)] items-center justify-center rounded-2xl border border-black/[.06] bg-white shadow-sm">
        <Loader2 className="h-6 w-6 animate-spin text-[#5B4FE9]" strokeWidth={2} />
      </div>
    );
  }

  if (messages.length === 0) {
    return (
      <div className="flex h-[calc(100vh-10rem)] flex-col items-center justify-center gap-3 rounded-2xl border border-black/[.06] bg-white p-6 text-center shadow-sm">
        <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-indigo-50 text-[#5B4FE9]">
          <Sparkles className="h-6 w-6" strokeWidth={2} />
        </span>
        <p className="text-sm font-bold text-foreground">No interactive messages yet</p>
        <p className="max-w-sm text-sm text-foreground/50">
          Create buttons and lists your AI assistant sends automatically, like an order confirmation with a
          Confirm and Cancel button. No technical setup, just describe what you want.
        </p>
        <Link
          href="/dashboard/automation/interactive-messages/new"
          className="mt-2 flex items-center gap-1.5 rounded-xl bg-gradient-to-br from-[#5B4FE9] to-[#7C6FF5] px-5 py-2.5 text-xs font-semibold text-white shadow-sm hover:opacity-90"
        >
          <MessageSquarePlus className="h-3.5 w-3.5" strokeWidth={2} />
          Create Interactive Message
        </Link>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-foreground/55">Buttons and lists your AI assistant sends automatically.</p>
        <Link
          href="/dashboard/automation/interactive-messages/new"
          className="flex items-center gap-1.5 rounded-xl bg-gradient-to-br from-[#5B4FE9] to-[#7C6FF5] px-4 py-2.5 text-xs font-semibold text-white shadow-sm hover:opacity-90"
        >
          <MessageSquarePlus className="h-3.5 w-3.5" strokeWidth={2} />
          Create Interactive Message
        </Link>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {messages.map((m) => (
          <div key={m.id} className="flex flex-col rounded-2xl border border-black/[.06] bg-white p-5 shadow-sm">
            <div className="flex items-start justify-between gap-3">
              <span className="rounded-full bg-indigo-50 px-2.5 py-1 text-[11px] font-medium text-[#5B4FE9]">
                {TEMPLATE_META[m.template].label}
              </span>
              <span
                className={`rounded-full px-2.5 py-1 text-[11px] font-medium capitalize ${
                  m.status === "active" ? "bg-emerald-50 text-emerald-600" : "bg-black/[.05] text-foreground/45"
                }`}
              >
                {m.status}
              </span>
            </div>

            <p className="mt-3 text-sm text-foreground/75">{m.bodyText}</p>

            <div className="mt-3 flex flex-wrap gap-1.5">
              {(m.kind === "buttons" ? m.buttons.map((b) => b.text) : [m.listButtonLabel]).map((label) => (
                <span key={label} className="rounded-full border border-black/[.1] px-2.5 py-1 text-[11px] font-medium text-foreground/60">
                  {label}
                </span>
              ))}
            </div>

            <p className="mt-3 text-xs text-foreground/40">{TRIGGER_META[m.trigger].label}</p>

            <div className="mt-4 flex gap-2 border-t border-black/[.06] pt-3">
              <Link
                href={`/dashboard/automation/interactive-messages/${m.id}/edit`}
                className="flex flex-1 items-center justify-center gap-1.5 rounded-lg bg-black/[.04] py-2 text-xs font-semibold text-foreground/70 hover:bg-black/[.07]"
              >
                <Pencil className="h-3.5 w-3.5" strokeWidth={2} />
                Edit
              </Link>
              <button
                type="button"
                onClick={() => setDeleteTarget(m)}
                className="flex h-8 w-8 items-center justify-center rounded-lg text-foreground/40 hover:bg-red-50 hover:text-red-600"
                aria-label="Delete"
              >
                <Trash2 className="h-3.5 w-3.5" strokeWidth={2} />
              </button>
            </div>
          </div>
        ))}
      </div>

      <AnimatePresence>
        {deleteTarget && (
          <DeleteModal
            name={TEMPLATE_META[deleteTarget.template].label}
            onClose={() => {
              setDeleteTarget(null);
              setDeleteError(null);
            }}
            onConfirm={handleDelete}
            deleting={deleting}
            error={deleteError}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
