"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import Sidebar, { getPageTitle } from "@/components/dashboard/Sidebar";
import Topbar from "@/components/dashboard/Topbar";
import BottomNav from "@/components/dashboard/BottomNav";
import MoreSheet from "@/components/dashboard/MoreSheet";
import PendingTasksWidget from "@/components/dashboard/PendingTasksWidget";
import TrialLockOverlay from "@/components/dashboard/TrialLockOverlay";
import ThemeProvider from "@/components/dashboard/ThemeProvider";
import DashboardLoader from "@/components/dashboard/DashboardLoader";
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
    return (
      <ThemeProvider>
        <DashboardLoader />
      </ThemeProvider>
    );
  }

  const title = getPageTitle(pathname);
  const isBillingPage = pathname === "/dashboard/billing";
  const showLock = trial.isExpired && !isBillingPage;

  return (
    <ThemeProvider>
      <div className="flex min-h-screen bg-gradient-to-b from-indigo-100 via-indigo-50/40 to-white dark:bg-background dark:bg-none">
        <div className="hidden lg:block">
          <Sidebar trial={trial} />
        </div>

        <div className="flex min-w-0 flex-1 flex-col">
          <Topbar title={title} />
          <main className="flex-1 p-4 pb-24 sm:p-6 lg:pb-6">{children}</main>
        </div>

        <BottomNav onMoreClick={() => setMobileOpen(true)} />
        <MoreSheet open={mobileOpen} onClose={() => setMobileOpen(false)} />

        {!showLock && <PendingTasksWidget trial={trial} tasks={buildOnboardingTasks(onboarding)} />}
        {showLock && <TrialLockOverlay trial={trial} />}
      </div>
    </ThemeProvider>
  );
}
