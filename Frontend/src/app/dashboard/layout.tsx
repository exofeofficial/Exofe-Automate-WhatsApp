"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import Sidebar, { getPageTitle } from "@/components/dashboard/Sidebar";
import Topbar from "@/components/dashboard/Topbar";
import PendingTasksWidget from "@/components/dashboard/PendingTasksWidget";
import TrialLockOverlay from "@/components/dashboard/TrialLockOverlay";
import { getToken } from "@/lib/auth";
import { getOnboardingStatus, getTrialStatus, type OnboardingStatus } from "@/lib/api";
import { buildOnboardingTasks, type TrialStatus } from "@/lib/trial";

// Fail-open default: if the trial-status fetch errors out (a network
// hiccup, the backend being briefly down), don't lock a paying customer
// out of their own dashboard over it.
const SAFE_DEFAULT_TRIAL: TrialStatus = {
  isTrialing: true,
  daysLeft: 7,
  trialLengthDays: 7,
  isExpired: false,
  currentPlan: "trial",
};

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [checked, setChecked] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [trial, setTrial] = useState<TrialStatus>(SAFE_DEFAULT_TRIAL);
  const [onboarding, setOnboarding] = useState<OnboardingStatus | null>(null);

  useEffect(() => {
    if (!getToken()) {
      router.replace("/login");
      return;
    }
    getTrialStatus()
      .then(setTrial)
      .catch(() => {})
      .finally(() => setChecked(true));
    getOnboardingStatus()
      .then(setOnboarding)
      .catch(() => {});
  }, [router]);

  // close the mobile drawer whenever the route changes
  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  if (!checked) {
    return <div className="flex min-h-screen items-center justify-center bg-[#F1F0FA]" />;
  }

  const title = getPageTitle(pathname);
  const isBillingPage = pathname === "/dashboard/billing";
  const showLock = trial.isExpired && !isBillingPage;

  return (
    <div className="flex min-h-screen bg-[#F1F0FA]">
      <div className="hidden lg:block">
        <Sidebar trial={trial} />
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
              <Sidebar trial={trial} onClose={() => setMobileOpen(false)} />
            </motion.div>
          </>
        )}
      </AnimatePresence>

      <div className="flex min-w-0 flex-1 flex-col">
        <Topbar onMenuClick={() => setMobileOpen(true)} title={title} />
        <main className="flex-1 p-4 sm:p-6">{children}</main>
      </div>

      {!showLock && <PendingTasksWidget trial={trial} tasks={buildOnboardingTasks(onboarding)} />}
      {showLock && <TrialLockOverlay trial={trial} />}
    </div>
  );
}
