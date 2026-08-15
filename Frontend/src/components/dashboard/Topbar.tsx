"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import { usePathname } from "next/navigation";
import {
  Bell,
  Bot,
  Crown,
  Grid3x3,
  HelpCircle,
  LayoutGrid,
  LogOut,
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
import { getNotifications, markNotificationsRead, type Notification } from "@/lib/api";
import { NAV, flatNavItemsWithIcons, getActiveNavHref } from "@/components/dashboard/Sidebar";

// Only the top-level links show up in the pill nav — a full flatten of NAV
// (including the Automation group's children) wouldn't fit in one bar. The
// account dropdown below still covers Team/Settings.
const PILL_NAV = NAV.filter((entry) => entry.type === "link").slice(0, 6);

// AI Assistant and Integrations sit past the first 6 links so they don't
// make PILL_NAV's cut, but they're too central to leave in the account
// dropdown only — icon-only slots at the end of the bar, same treatment
// as the Dashboard icon on the left.
const ICON_NAV = [
  { label: "AI Assistant", href: "/dashboard/ai-assistant", icon: Bot },
  { label: "Integrations", href: "/dashboard/integrations", icon: Plug },
];

const ALL_PAGES = flatNavItemsWithIcons();

const POLL_INTERVAL_MS = 30_000;

function timeAgo(iso: string): string {
  const diffMs = Date.now() - new Date(iso).getTime();
  const minutes = Math.floor(diffMs / 60_000);
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

const EASE = [0.22, 1, 0.36, 1] as const;

const MENU_ITEMS = [
  { label: "User Profile", href: "/dashboard/settings", icon: User },
  { label: "Integrations", href: "/dashboard/integrations", icon: Plug },
  { label: "Settings", href: "/dashboard/settings", icon: Settings },
  { label: "Team", href: "/dashboard/team", icon: UsersRound },
  { label: "Help Center", href: "/docs", icon: HelpCircle },
];

export default function Topbar({ title }: { title: string }) {
  const router = useRouter();
  const pathname = usePathname();
  const { theme, toggleTheme } = useTheme();
  const [open, setOpen] = useState(false);
  const [allPagesOpen, setAllPagesOpen] = useState(false);
  const [profile, setProfile] = useState<{ firstName: string; lastName?: string; email: string } | null>(null);

  const [notifOpen, setNotifOpen] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);

  // Reads localStorage, has to happen after mount so the server render
  // and first client render match (same pattern used across the
  // dashboard for client only data).
  useEffect(() => {
    setProfile(getUserProfile());
  }, []);

  useEffect(() => {
    const refresh = () => {
      getNotifications()
        .then((res) => {
          setNotifications(res.notifications);
          setUnreadCount(res.unreadCount);
        })
        .catch(() => {});
    };
    refresh();
    const id = setInterval(refresh, POLL_INTERVAL_MS);
    return () => clearInterval(id);
  }, []);

  const handleOpenNotifications = () => {
    const next = !notifOpen;
    setNotifOpen(next);
    if (next && unreadCount > 0) {
      markNotificationsRead()
        .then((res) => {
          setNotifications(res.notifications);
          setUnreadCount(res.unreadCount);
        })
        .catch(() => {});
    }
  };

  const handleLogout = () => {
    clearToken();
    router.push("/login");
  };

  const displayName = profile ? `${profile.firstName}${profile.lastName ? ` ${profile.lastName}` : ""}` : "Account";
  const initial = profile?.firstName?.[0]?.toUpperCase() ?? "?";
  const activeHref = getActiveNavHref(pathname);

  return (
    <header className="relative z-20 flex h-16 items-center justify-between gap-3 px-4 sm:px-6">
      <div className="flex shrink-0 items-center gap-3">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/logo-icon.png" alt="" className="h-6 w-auto" />
        <span className="hidden text-base font-bold tracking-tight text-foreground sm:inline">Exofe</span>
      </div>

      {/* dark pill nav — the primary navigation now that the sidebar is hidden.
          The "All pages" trigger lives outside the overflow-x-auto nav on
          purpose: a dropdown positioned inside a horizontally-scrolling
          container gets its own overflow-y forced to auto by the browser
          and clips vertically instead of floating over the page. */}
      <div className="hidden min-w-0 items-center gap-1.5 lg:flex">
        <nav className="flex min-w-0 items-center gap-0.5 overflow-x-auto rounded-full bg-[#171326] p-1.5 shadow-sm">
          <Link
            href="/dashboard"
            aria-label="Dashboard"
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-white/45 transition-colors hover:text-white"
          >
            <LayoutGrid className="h-4 w-4" strokeWidth={2} />
          </Link>
          {PILL_NAV.map((entry) => {
            const isActive = entry.href === activeHref;
            return (
              <Link
                key={entry.href}
                href={entry.href}
                className={`shrink-0 whitespace-nowrap rounded-full px-3.5 py-1.5 text-xs font-semibold transition-colors ${
                  isActive ? "bg-[#c4b5fd] text-[#171326]" : "text-white/55 hover:text-white"
                }`}
              >
                {entry.label}
              </Link>
            );
          })}
          <div className="mx-0.5 h-4 w-px shrink-0 bg-white/10" />
          {ICON_NAV.map((entry) => {
            const isActive = entry.href === activeHref;
            const Icon = entry.icon;
            return (
              <Link
                key={entry.href}
                href={entry.href}
                aria-label={entry.label}
                className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full transition-colors ${
                  isActive ? "bg-[#c4b5fd] text-[#171326]" : "text-white/45 hover:text-white"
                }`}
              >
                <Icon className="h-4 w-4" strokeWidth={2} />
              </Link>
            );
          })}
        </nav>

        <div className="relative shrink-0 rounded-full bg-[#171326] p-1.5 shadow-sm">
          <button
            type="button"
            onClick={() => setAllPagesOpen((v) => !v)}
            aria-label="All pages"
            className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full transition-colors ${
              allPagesOpen ? "bg-[#c4b5fd] text-[#171326]" : "text-white/45 hover:text-white"
            }`}
          >
            <Grid3x3 className="h-4 w-4" strokeWidth={2} />
          </button>

          <AnimatePresence>
            {allPagesOpen && (
              <>
                <button
                  type="button"
                  aria-label="Close all pages"
                  onClick={() => setAllPagesOpen(false)}
                  className="fixed inset-0 z-30 cursor-default"
                />
                <motion.div
                  initial={{ opacity: 0, y: -8, scale: 0.97 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: -8, scale: 0.97 }}
                  transition={{ duration: 0.15, ease: EASE }}
                  className="absolute left-1/2 z-40 mt-3 w-[23rem] -translate-x-1/2 overflow-hidden rounded-2xl border border-ink/[.06] bg-surface p-3 shadow-xl"
                >
                  <p className="px-2 pb-2 pt-1 text-xs font-bold uppercase tracking-wide text-foreground/40">All pages</p>
                  <div className="grid grid-cols-4 gap-1">
                    {ALL_PAGES.map((item, i) => {
                      const isActive = item.href === activeHref;
                      const Icon = item.icon;
                      return (
                        <motion.div
                          key={item.href}
                          initial={{ opacity: 0, y: 8 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ duration: 0.18, delay: i * 0.02, ease: EASE }}
                        >
                          <Link
                            href={item.href}
                            onClick={() => setAllPagesOpen(false)}
                            className="flex flex-col items-center gap-1.5 rounded-xl px-1 py-2.5 text-center transition-colors hover:bg-ink/[.04]"
                          >
                            <motion.span
                              whileHover={{ scale: 1.08 }}
                              whileTap={{ scale: 0.95 }}
                              className={`flex h-10 w-10 items-center justify-center rounded-xl transition-colors ${
                                isActive
                                  ? "bg-indigo-50 text-[#45157b] dark:bg-indigo-500/15 dark:text-[#c4b5fd]"
                                  : "bg-ink/[.04] text-foreground/60"
                              }`}
                            >
                              <Icon className="h-[18px] w-[18px]" strokeWidth={2} />
                            </motion.span>
                            <span
                              className={`text-[10.5px] leading-tight ${
                                isActive ? "font-semibold text-[#45157b] dark:text-[#c4b5fd]" : "text-foreground/70"
                              }`}
                            >
                              {item.label}
                            </span>
                          </Link>
                        </motion.div>
                      );
                    })}
                  </div>
                </motion.div>
              </>
            )}
          </AnimatePresence>
        </div>
      </div>

      <div className="flex shrink-0 items-center gap-1.5">
        <button
          type="button"
          aria-label="Search"
          className="hidden h-9 w-9 items-center justify-center rounded-full text-foreground/60 hover:bg-ink/[.03] sm:flex"
        >
          <Search className="h-[18px] w-[18px]" strokeWidth={2} />
        </button>
        <Link
          href="/dashboard/settings"
          aria-label="Settings"
          className="hidden h-9 w-9 items-center justify-center rounded-full text-foreground/60 hover:bg-ink/[.03] sm:flex"
        >
          <Settings className="h-[18px] w-[18px]" strokeWidth={2} />
        </Link>
        <div className="relative">
          <button
            type="button"
            aria-label="Notifications"
            onClick={handleOpenNotifications}
            className="relative flex h-9 w-9 items-center justify-center rounded-full text-foreground/60 hover:bg-ink/[.03]"
          >
            <Bell className="h-[18px] w-[18px]" strokeWidth={2} />
            {unreadCount > 0 && <span className="absolute right-2 top-2 h-1.5 w-1.5 rounded-full bg-red-500" />}
          </button>

          <AnimatePresence>
            {notifOpen && (
              <>
                <button
                  type="button"
                  aria-label="Close notifications"
                  onClick={() => setNotifOpen(false)}
                  className="fixed inset-0 z-30 cursor-default"
                />
                <motion.div
                  initial={{ opacity: 0, y: -8, scale: 0.97 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: -8, scale: 0.97 }}
                  transition={{ duration: 0.15, ease: EASE }}
                  className="absolute right-0 z-40 mt-2 w-80 overflow-hidden rounded-2xl border border-ink/[.06] bg-surface shadow-xl"
                >
                  <div className="border-b border-ink/[.06] px-4 py-3">
                    <p className="text-sm font-bold text-foreground">Notifications</p>
                  </div>
                  <div className="max-h-80 overflow-y-auto">
                    {notifications.length === 0 ? (
                      <p className="px-4 py-6 text-center text-xs text-foreground/45">No notifications yet.</p>
                    ) : (
                      notifications.map((n) => (
                        <div
                          key={n.id}
                          className={`border-b border-ink/[.04] px-4 py-3 last:border-b-0 ${
                            n.isRead ? "" : "bg-[#45157b]/[.04]"
                          }`}
                        >
                          <p className="text-sm font-semibold text-foreground">{n.title}</p>
                          <p className="mt-0.5 text-xs leading-relaxed text-foreground/60">{n.body}</p>
                          <p className="mt-1 text-[11px] text-foreground/35">{timeAgo(n.createdAt)}</p>
                        </div>
                      ))
                    )}
                  </div>
                </motion.div>
              </>
            )}
          </AnimatePresence>
        </div>

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
