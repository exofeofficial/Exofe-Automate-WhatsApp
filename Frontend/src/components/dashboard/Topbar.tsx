"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import {
  Bell,
  Crown,
  HelpCircle,
  LogOut,
  Menu,
  Moon,
  Plug,
  Search,
  Settings,
  Sun,
  User,
  UsersRound,
} from "lucide-react";
import { clearToken } from "@/lib/auth";
import { getUserProfile } from "@/lib/user";
import { useTheme } from "@/components/dashboard/ThemeProvider";

const EASE = [0.22, 1, 0.36, 1] as const;

const MENU_ITEMS = [
  { label: "User Profile", href: "/dashboard/settings", icon: User },
  { label: "Integrations", href: "/dashboard/integrations", icon: Plug },
  { label: "Settings", href: "/dashboard/settings", icon: Settings },
  { label: "Team", href: "/dashboard/team", icon: UsersRound },
  { label: "Help Center", href: "/docs", icon: HelpCircle },
];

export default function Topbar({ onMenuClick, title }: { onMenuClick: () => void; title: string }) {
  const router = useRouter();
  const { theme, toggleTheme } = useTheme();
  const [open, setOpen] = useState(false);
  const [profile, setProfile] = useState<{ firstName: string; lastName?: string; email: string } | null>(null);

  // Reads localStorage, has to happen after mount so the server render
  // and first client render match (same pattern used across the
  // dashboard for client only data).
  useEffect(() => {
    setProfile(getUserProfile());
  }, []);

  const handleLogout = () => {
    clearToken();
    router.push("/login");
  };

  const displayName = profile ? `${profile.firstName}${profile.lastName ? ` ${profile.lastName}` : ""}` : "Account";
  const initial = profile?.firstName?.[0]?.toUpperCase() ?? "?";

  return (
    <header className="relative z-20 flex h-16 items-center justify-between gap-4 px-4 sm:px-6">
      <div className="flex items-center gap-3">
        <button type="button" onClick={onMenuClick} aria-label="Open menu" className="lg:hidden">
          <Menu className="h-5 w-5 text-foreground/60" />
        </button>
        <h1 className="text-base font-bold text-foreground sm:text-lg">{title}</h1>
      </div>

      <div className="flex items-center gap-3">
        <div className="relative hidden sm:block">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-foreground/35" strokeWidth={2} />
          <input
            type="search"
            placeholder="Search"
            className="w-56 rounded-full border border-ink/[.08] bg-ink/[.03] py-2 pl-9 pr-4 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-[#45157b]/25"
          />
        </div>
        <button
          type="button"
          aria-label="Notifications"
          className="relative flex h-9 w-9 items-center justify-center rounded-full text-foreground/60 hover:bg-ink/[.03]"
        >
          <Bell className="h-[18px] w-[18px]" strokeWidth={2} />
          <span className="absolute right-2 top-2 h-1.5 w-1.5 rounded-full bg-red-500" />
        </button>

        <div className="relative">
          <button
            type="button"
            onClick={() => setOpen((v) => !v)}
            aria-label="Account menu"
            className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-indigo-300 to-purple-400 text-xs font-bold text-white"
          >
            {initial}
          </button>

          <AnimatePresence>
            {open && (
              <>
                <button
                  type="button"
                  aria-label="Close account menu"
                  onClick={() => setOpen(false)}
                  className="fixed inset-0 z-30 cursor-default"
                />
                <motion.div
                  initial={{ opacity: 0, y: -8, scale: 0.97 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: -8, scale: 0.97 }}
                  transition={{ duration: 0.15, ease: EASE }}
                  className="absolute right-0 z-40 mt-2 w-72 overflow-hidden rounded-2xl border border-ink/[.06] bg-surface p-2 shadow-xl"
                >
                  <div className="flex items-center gap-3 px-2.5 py-2.5">
                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-indigo-300 to-purple-400 text-sm font-bold text-white">
                      {initial}
                    </span>
                    <div className="min-w-0">
                      <p className="truncate text-sm font-bold text-foreground">{displayName}</p>
                      <p className="truncate text-xs text-foreground/45">{profile?.email ?? ""}</p>
                    </div>
                  </div>

                  <Link
                    href="/dashboard/billing"
                    onClick={() => setOpen(false)}
                    className="mx-1 my-1.5 flex items-center justify-between rounded-xl shine-btn-gold relative overflow-hidden bg-[#45157b] px-3 py-2.5 text-sm font-semibold text-white shadow-sm hover:opacity-90"
                  >
                    <span className="flex items-center gap-2">
                      <Crown className="h-4 w-4" strokeWidth={2} />
                      Upgrade profile
                    </span>
                    <span className="rounded-full bg-secondary px-2 py-0.5 text-[10px] font-bold tracking-wide text-[#1a1730]">PRO</span>
                  </Link>

                  <div className="my-1 h-px bg-ink/[.06]" />

                  <nav className="flex flex-col gap-0.5">
                    {MENU_ITEMS.map((item) => {
                      const Icon = item.icon;
                      return (
                        <Link
                          key={item.label}
                          href={item.href}
                          onClick={() => setOpen(false)}
                          className="flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm text-foreground/70 hover:bg-ink/[.03] hover:text-foreground"
                        >
                          <Icon className="h-4 w-4 text-foreground/45" strokeWidth={2} />
                          {item.label}
                        </Link>
                      );
                    })}
                  </nav>

                  <div className="my-1 h-px bg-ink/[.06]" />

                  <div className="flex items-center justify-between rounded-lg px-2.5 py-2 text-sm text-foreground/70">
                    <span className="flex items-center gap-2.5">
                      {theme === "dark" ? (
                        <Moon className="h-4 w-4" strokeWidth={2} />
                      ) : (
                        <Sun className="h-4 w-4" strokeWidth={2} />
                      )}
                      Dark Mode
                    </span>
                    <button
                      type="button"
                      role="switch"
                      aria-checked={theme === "dark"}
                      aria-label="Toggle dark mode"
                      onClick={toggleTheme}
                      className={`flex h-5 w-9 shrink-0 items-center rounded-full px-0.5 transition-colors ${
                        theme === "dark" ? "bg-[#45157b]" : "bg-ink/[.15]"
                      }`}
                    >
                      <motion.span
                        layout
                        transition={{ duration: 0.15, ease: EASE }}
                        className="h-4 w-4 rounded-full bg-surface shadow-sm"
                        style={{ marginLeft: theme === "dark" ? "auto" : 0 }}
                      />
                    </button>
                  </div>

                  <div className="my-1 h-px bg-ink/[.06]" />

                  <button
                    type="button"
                    onClick={handleLogout}
                    className="flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm font-medium text-red-600 dark:text-red-400 hover:bg-red-50 dark:bg-red-500/15 dark:text-red-400 dark:hover:bg-red-500/10"
                  >
                    <LogOut className="h-4 w-4" strokeWidth={2} />
                    Log out
                  </button>
                </motion.div>
              </>
            )}
          </AnimatePresence>
        </div>
      </div>
    </header>
  );
}
