"use client";

import { motion } from "framer-motion";
import { Loader2, Trash2, X } from "lucide-react";

const EASE = [0.22, 1, 0.36, 1] as const;

export default function DeleteConfirmModal({
  count,
  onClose,
  onConfirm,
  deleting,
  error,
}: {
  count: number;
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
        <p className="mt-4 text-sm font-bold text-foreground">
          Delete {count > 1 ? `${count} products` : "this product"}?
        </p>
        <p className="mt-2 text-xs leading-relaxed text-foreground/55">
          The AI assistant will stop offering {count > 1 ? "these products" : "this product"} to customers right away. This cannot be undone.
        </p>
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
