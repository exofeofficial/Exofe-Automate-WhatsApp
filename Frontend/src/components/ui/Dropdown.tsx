"use client";

import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Check, ChevronDown } from "lucide-react";

const EASE = [0.22, 1, 0.36, 1] as const;

// Native <select> popups can't be restyled (the browser owns that chrome),
// so every dropdown in the app uses this custom listbox instead, to match
// the rounded-card + indigo-highlight look used everywhere else.
export default function Dropdown({
  value,
  onChange,
  options,
  placeholder,
  error,
  align = "left",
  className,
}: {
  value: string;
  onChange: (value: string) => void;
  options: { value: string; label: string }[];
  placeholder: string;
  error?: boolean;
  align?: "left" | "right";
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const selected = options.find((o) => o.value === value);

  return (
    <div className={`relative ${className ?? ""}`}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className={`flex w-full items-center justify-between gap-2 rounded-lg border bg-zinc-50 px-3.5 py-2.5 text-left text-sm transition-colors focus:outline-none focus:ring-2 focus:ring-[#5B4FE9]/30 ${
          error ? "border-red-400" : "border-black/[.1] hover:border-black/20"
        } ${selected ? "text-foreground" : "text-foreground/40"}`}
      >
        <span className="truncate">{selected ? selected.label : placeholder}</span>
        <ChevronDown
          className={`h-4 w-4 shrink-0 text-foreground/40 transition-transform ${open ? "rotate-180" : ""}`}
          strokeWidth={2}
        />
      </button>

      <AnimatePresence>
        {open && (
          <>
            <button
              type="button"
              aria-label="Close dropdown"
              onClick={() => setOpen(false)}
              className="fixed inset-0 z-30 cursor-default"
            />
            <motion.div
              initial={{ opacity: 0, y: -6, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -6, scale: 0.98 }}
              transition={{ duration: 0.15, ease: EASE }}
              className={`absolute z-40 mt-1.5 max-h-60 w-full min-w-max overflow-y-auto rounded-xl border border-black/[.06] bg-white p-1.5 shadow-xl ${
                align === "right" ? "right-0" : "left-0"
              }`}
            >
              {options.map((o) => {
                const isSelected = o.value === value;
                return (
                  <button
                    key={o.value}
                    type="button"
                    onClick={() => {
                      onChange(o.value);
                      setOpen(false);
                    }}
                    className={`flex w-full items-center justify-between gap-3 rounded-lg px-3 py-2 text-left text-sm transition-colors ${
                      isSelected ? "bg-indigo-50 font-medium text-[#5B4FE9]" : "text-foreground/75 hover:bg-black/[.03]"
                    }`}
                  >
                    {o.label}
                    {isSelected && <Check className="h-3.5 w-3.5 shrink-0" strokeWidth={2.5} />}
                  </button>
                );
              })}
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
