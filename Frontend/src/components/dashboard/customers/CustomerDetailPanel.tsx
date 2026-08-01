"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Loader2, MessageSquare, Package, Send, User, X } from "lucide-react";
import {
  ApiError,
  addCustomerNote,
  getCustomerNotes,
  type CustomerDetail,
  type CustomerNote,
  type OrderStatus,
} from "@/lib/api";

const EASE = [0.22, 1, 0.36, 1] as const;

const STATUS_BADGE: Record<OrderStatus, string> = {
  new: "bg-sky-50 dark:bg-sky-500/15 text-sky-600 dark:text-sky-400",
  confirmed: "bg-indigo-50 dark:bg-indigo-500/15 text-[#45157b]",
  shipped: "bg-amber-50 dark:bg-amber-500/15 text-amber-600 dark:text-amber-400",
  delivered: "bg-emerald-50 dark:bg-emerald-500/15 text-emerald-600 dark:text-emerald-400",
  canceled: "bg-red-50 dark:bg-red-500/15 text-red-600 dark:text-red-400",
};

function formatPrice(value: number) {
  return `PKR ${value.toLocaleString("en-PK")}`;
}

export default function CustomerDetailPanel({
  customer,
  onClose,
}: {
  customer: CustomerDetail;
  onClose: () => void;
}) {
  const [notes, setNotes] = useState<CustomerNote[] | null>(null);
  const [newNote, setNewNote] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    getCustomerNotes(customer.id)
      .then((res) => setNotes(res.notes))
      .catch(() => setNotes([]));
  }, [customer.id]);

  const handleAddNote = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newNote.trim()) return;

    setSaving(true);
    setError(null);
    try {
      const { note } = await addCustomerNote(customer.id, newNote.trim());
      setNotes((prev) => [note, ...(prev ?? [])]);
      setNewNote("");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Couldn't save that note. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="fixed inset-0 z-40 bg-black/30"
      />
      <motion.div
        initial={{ x: 420 }}
        animate={{ x: 0 }}
        exit={{ x: 420 }}
        transition={{ duration: 0.25, ease: EASE }}
        className="fixed inset-y-0 right-0 z-50 flex w-full max-w-md flex-col overflow-y-auto bg-surface shadow-2xl"
      >
        <div className="flex items-center justify-between border-b border-ink/[.06] px-6 py-4">
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-indigo-300 to-purple-400 text-sm font-bold text-white">
              {customer.name?.[0]?.toUpperCase() ?? <User className="h-4 w-4" strokeWidth={2} />}
            </span>
            <div>
              <p className="text-sm font-bold text-foreground">{customer.name ?? "Unknown"}</p>
              <p className="text-xs text-foreground/45">{customer.whatsappNumber}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-foreground/40 transition-colors hover:bg-ink/[.04] hover:text-foreground"
          >
            <X className="h-[18px] w-[18px]" strokeWidth={2} />
          </button>
        </div>

        <div className="flex flex-col gap-6 p-6">
          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-xl bg-ink/[.02] p-3.5">
              <p className="text-xs text-foreground/45">Total Spent</p>
              <p className="mt-1 text-lg font-bold text-foreground">{formatPrice(customer.totalSpent)}</p>
            </div>
            <div className="rounded-xl bg-ink/[.02] p-3.5">
              <p className="text-xs text-foreground/45">Orders</p>
              <p className="mt-1 text-lg font-bold text-foreground">{customer.orders.length}</p>
            </div>
          </div>

          <div>
            <p className="flex items-center gap-1.5 text-xs font-semibold text-foreground/60">
              <Package className="h-3.5 w-3.5" strokeWidth={2} />
              Order History
            </p>
            {customer.orders.length === 0 ? (
              <p className="mt-2 text-xs text-foreground/40">No orders yet.</p>
            ) : (
              <div className="mt-2 flex flex-col divide-y divide-ink/[.05] rounded-xl border border-ink/[.06]">
                {customer.orders.map((o) => (
                  <div key={o.id} className="flex items-center justify-between px-3.5 py-2.5 text-sm">
                    <div>
                      <p className="font-medium text-foreground">#{o.id.slice(0, 8).toUpperCase()}</p>
                      <p className="text-xs text-foreground/40">
                        {new Date(o.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${STATUS_BADGE[o.status]}`}>
                        {o.status}
                      </span>
                      <span className="font-semibold text-foreground">{formatPrice(o.total)}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div>
            <p className="flex items-center gap-1.5 text-xs font-semibold text-foreground/60">
              <MessageSquare className="h-3.5 w-3.5" strokeWidth={2} />
              Notes
            </p>

            <form onSubmit={handleAddNote} className="mt-2 flex items-start gap-2">
              <textarea
                value={newNote}
                onChange={(e) => setNewNote(e.target.value)}
                rows={2}
                placeholder="Add a note about this customer..."
                className="flex-1 rounded-lg border border-ink/[.12] px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-[#45157b]/30"
              />
              <button
                type="submit"
                disabled={saving || !newNote.trim()}
                aria-label="Add note"
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg shine-btn-gold relative overflow-hidden bg-[#45157b] text-white transition-colors hover:opacity-90 disabled:opacity-50"
              >
                {saving ? <Loader2 className="h-4 w-4 animate-spin" strokeWidth={2} /> : <Send className="h-4 w-4" strokeWidth={2} />}
              </button>
            </form>
            {error && <p className="mt-1.5 text-xs text-red-500 dark:text-red-400">{error}</p>}

            <div className="mt-3 flex flex-col gap-2.5">
              {notes === null ? (
                <Loader2 className="mx-auto h-4 w-4 animate-spin text-foreground/30" strokeWidth={2} />
              ) : notes.length === 0 ? (
                <p className="text-xs text-foreground/40">No notes yet.</p>
              ) : (
                notes.map((n) => (
                  <div key={n.id} className="rounded-lg bg-ink/[.02] p-3">
                    <p className="text-sm text-foreground/80">{n.note}</p>
                    <p className="mt-1 text-[11px] text-foreground/40">
                      {n.authorName} · {new Date(n.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                    </p>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
