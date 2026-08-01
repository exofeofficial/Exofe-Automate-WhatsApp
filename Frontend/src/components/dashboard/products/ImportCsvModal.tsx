"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { Loader2, UploadCloud, X } from "lucide-react";

const EASE = [0.22, 1, 0.36, 1] as const;

export default function ImportCsvModal({
  onClose,
  onImport,
  importing,
  error,
}: {
  onClose: () => void;
  onImport: (file: File) => void;
  importing: boolean;
  error: string | null;
}) {
  const [file, setFile] = useState<File | null>(null);

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFile(e.target.files?.[0] ?? null);
  };

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
        className="w-full max-w-md rounded-3xl border border-ink/[.06] bg-surface p-6 shadow-2xl"
      >
        <div className="flex items-start justify-between">
          <div>
            <p className="text-sm font-bold text-foreground">Import products</p>
            <p className="mt-0.5 text-xs text-foreground/45">Upload a CSV with your product list</p>
          </div>
          <button type="button" onClick={onClose} aria-label="Close" className="text-foreground/40 hover:text-foreground">
            <X className="h-4 w-4" strokeWidth={2} />
          </button>
        </div>

        <div className="mt-5 rounded-2xl border border-ink/[.06] bg-ink/[.015] p-4">
          <p className="text-xs font-semibold text-foreground/60">Expected columns, in this order</p>
          <p className="mt-1.5 rounded-lg bg-surface px-3 py-2 text-[11px] text-foreground/50">
            name, category, price, stock
          </p>
          <p className="mt-2 text-[11px] text-foreground/40">
            The first row is treated as a header. Imported products are added as drafts so you can review them
            before they go live.
          </p>
        </div>

        <label className="mt-4 flex cursor-pointer flex-col items-center gap-2 rounded-2xl border-2 border-dashed border-ink/[.12] bg-ink/[.02] px-4 py-8 text-center hover:bg-ink/[.03]">
          <UploadCloud className="h-6 w-6 text-foreground/35" strokeWidth={2} />
          <span className="text-xs font-medium text-foreground/60">{file ? file.name : "Click to choose a .csv file"}</span>
          <input type="file" accept=".csv,text/csv" onChange={handleFile} className="hidden" />
        </label>

        {error && <p className="mt-3 text-xs font-medium text-red-500 dark:text-red-400">{error}</p>}

        <div className="mt-6 flex gap-3">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 rounded-xl bg-ink/[.04] py-2.5 text-xs font-semibold text-foreground/70 hover:bg-ink/[.07]"
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={!file || importing}
            onClick={() => file && onImport(file)}
            className="flex flex-1 items-center justify-center gap-2 rounded-xl shine-btn-gold relative overflow-hidden bg-[#45157b] py-2.5 text-xs font-semibold text-white shadow-sm hover:opacity-90 disabled:opacity-40"
          >
            {importing && <Loader2 className="h-3.5 w-3.5 animate-spin" strokeWidth={2} />}
            {importing ? "Importing..." : "Import"}
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}
