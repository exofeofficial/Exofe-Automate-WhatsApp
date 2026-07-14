"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import Sidebar, { getPageTitle } from "@/components/dashboard/Sidebar";
import Topbar from "@/components/dashboard/Topbar";
import PendingTasksWidget from "@/components/dashboard/PendingTasksWidget";
import TrialLockOverlay from "@/components/dashboard/TrialLockOverlay";
import { getToken } from "@/lib/auth";
import { MOCK_TRIAL_STATUS } from "@/lib/trial";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [checked, setChecked] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    if (!getToken()) {
      router.replace("/login");
      return;
    }
    setChecked(true);
  }, [router]);

  // close the mobile drawer whenever the route changes
  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  if (!checked) {
    return <div className="flex min-h-screen items-center justify-center bg-white" />;
  }

  const title = getPageTitle(pathname);

  // Backend developer: swap MOCK_TRIAL_STATUS for the real trial-status
  // fetch, see the comment in src/lib/trial.ts for the expected shape.
  const trial = MOCK_TRIAL_STATUS;
  const isBillingPage = pathname === "/dashboard/billing";
  const showLock = trial.isExpired && !isBillingPage;

  return (
    <div className="flex min-h-screen bg-zinc-50">
      <div className="hidden lg:block">
        <Sidebar />
      </div>

      <AnimatePresence>
        {mobileOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setMobileOpen(false)}
              className="fixed inset-0 z-40 bg-black/30 lg:hidden"
            />
            <motion.div
              initial={{ x: -280 }}
              animate={{ x: 0 }}
              exit={{ x: -280 }}
              transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
              className="fixed inset-y-0 left-0 z-50 lg:hidden"
            >
              <Sidebar onClose={() => setMobileOpen(false)} />
            </motion.div>
          </>
        )}
      </AnimatePresence>

      <div className="flex min-w-0 flex-1 flex-col">
        <Topbar onMenuClick={() => setMobileOpen(true)} title={title} />
        <main className="flex-1 p-4 sm:p-6">{children}</main>
      </div>

      {!showLock && <PendingTasksWidget />}
      {showLock && <TrialLockOverlay trial={trial} />}
    </div>
  );
}
