"use client";

import { motion } from "framer-motion";
import { type ReactNode } from "react";

export default function AdminComingSoon({
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
      className="flex min-h-[60vh] flex-col items-center justify-center rounded-2xl border border-dashed border-white/10 bg-zinc-950 p-8 text-center"
    >
      <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[#5B4FE9]/15 text-[#7C6FF5]">
        {icon}
      </span>
      <h2 className="mt-4 text-lg font-bold text-white">{title}</h2>
      <p className="mt-1.5 max-w-sm text-sm text-white/50">{description}</p>
      <span className="mt-4 rounded-full bg-white/5 px-3 py-1 text-xs font-medium text-white/45">Coming soon</span>
    </motion.div>
  );
}
