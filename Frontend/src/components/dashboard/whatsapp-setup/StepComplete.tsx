"use client";

import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { PartyPopper } from "lucide-react";

export default function StepComplete({ businessNumber }: { businessNumber: string }) {
  const router = useRouter();

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="flex flex-col items-center gap-3 py-6 text-center"
    >
      <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-600">
        <PartyPopper className="h-7 w-7" strokeWidth={2} />
      </span>
      <p className="text-lg font-bold text-foreground">Congratulations!</p>
      <p className="max-w-sm text-sm text-foreground/55">
        Your WhatsApp Assistant is now live on {businessNumber}. Orders and messages will start showing up in
        Conversations right away.
      </p>

      <div className="mt-4 flex w-full max-w-xs flex-col gap-3">
        <button
          type="button"
          onClick={() => router.push("/dashboard/conversations")}
          className="w-full rounded-xl bg-gradient-to-br from-[#5B4FE9] to-[#7C6FF5] py-3 text-sm font-semibold text-white shadow-sm hover:opacity-90"
        >
          Go to Conversations
        </button>
        <button
          type="button"
          onClick={() => router.push("/dashboard/integrations")}
          className="w-full rounded-xl bg-black/[.04] py-3 text-sm font-semibold text-foreground/70 hover:bg-black/[.07]"
        >
          Back to Integrations
        </button>
      </div>
    </motion.div>
  );
}
