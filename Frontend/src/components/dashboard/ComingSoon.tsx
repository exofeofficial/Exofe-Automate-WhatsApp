"use client";

import { motion } from "framer-motion";
import { type ReactNode } from "react";

export default function ComingSoon({
  icon,
  title,
  description,
}: {
  icon: ReactNode;
  title: string;
  description: string;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
      className="flex min-h-[60vh] flex-col items-center justify-center rounded-2xl border border-dashed border-ink/[.1] bg-surface p-8 text-center"
    >
      <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-indigo-50 dark:bg-indigo-500/15 text-[#5B4FE9]">
        {icon}
      </span>
      <h2 className="mt-4 text-lg font-bold text-foreground">{title}</h2>
      <p className="mt-1.5 max-w-sm text-sm text-foreground/55">{description}</p>
      <span className="mt-4 rounded-full bg-ink/[.04] px-3 py-1 text-xs font-medium text-foreground/50">
        Coming soon
      </span>
    </motion.div>
  );
}
