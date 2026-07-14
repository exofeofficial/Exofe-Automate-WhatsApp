"use client";

import { ShieldCheck } from "lucide-react";

export default function AdminOverviewPage() {
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center rounded-2xl border border-dashed border-white/10 bg-zinc-950 p-8 text-center">
      <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[#5B4FE9]/15 text-[#7C6FF5]">
        <ShieldCheck className="h-6 w-6" strokeWidth={2} />
      </span>
      <h2 className="mt-4 text-lg font-bold text-white">You&apos;re logged in</h2>
      <p className="mt-1.5 max-w-sm text-sm text-white/50">
        Platform wide stats (businesses, revenue, active users) will show up here once the admin data endpoints
        are built. Use the sidebar to jump to a section.
      </p>
    </div>
  );
}
