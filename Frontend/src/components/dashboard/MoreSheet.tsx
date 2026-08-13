"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import { X } from "lucide-react";
import { NAV, getActiveNavHref } from "@/components/dashboard/Sidebar";

const EASE = [0.22, 1, 0.36, 1] as const;

// Everything that doesn't fit in BottomNav's four permanent slots — a
// bottom sheet grid instead of a left-slide drawer, so it matches the
// bottom tab bar it opens from rather than feeling like a leftover
// desktop pattern.
const ITEMS = NAV.flatMap((entry) =>
  entry.type === "link"
    ? [{ label: entry.label, href: entry.href, icon: entry.icon }]
    : entry.children.map((c) => ({ label: c.label, href: c.href, icon: entry.icon }))
);

export default function MoreSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const pathname = usePathname();
  const activeHref = getActiveNavHref(pathname);

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 z-40 bg-black/30 md:hidden"
          />
          <motion.div
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ duration: 0.25, ease: EASE }}
            className="fixed inset-x-0 bottom-0 z-50 max-h-[75vh] overflow-y-auto rounded-t-3xl bg-surface pb-[calc(1rem+env(safe-area-inset-bottom))] shadow-2xl md:hidden"
          >
            <div className="sticky top-0 flex items-center justify-between border-b border-ink/[.06] bg-surface px-5 py-4">
              <p className="text-sm font-bold text-foreground">All pages</p>
              <button
                type="button"
                onClick={onClose}
                aria-label="Close menu"
                className="text-foreground/50 transition-colors hover:text-foreground"
              >
                <X className="h-5 w-5" strokeWidth={2} />
              </button>
            </div>

            <div className="grid grid-cols-4 gap-1 p-4">
              {ITEMS.map((item) => {
                const isActive = item.href === activeHref;
                const Icon = item.icon;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={onClose}
                    className="flex flex-col items-center gap-1.5 rounded-2xl px-1 py-3 text-center"
                  >
                    <span
                      className={`flex h-11 w-11 items-center justify-center rounded-2xl ${
                        isActive ? "bg-indigo-50 text-[#45157b] dark:bg-indigo-500/15 dark:text-[#c4b5fd]" : "bg-ink/[.04] text-foreground/60"
                      }`}
                    >
                      <Icon className="h-5 w-5" strokeWidth={2} />
                    </span>
                    <span className={`text-[11px] leading-tight ${isActive ? "font-semibold text-[#45157b] dark:text-[#c4b5fd]" : "text-foreground/70"}`}>
                      {item.label}
                    </span>
                  </Link>
                );
              })}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
