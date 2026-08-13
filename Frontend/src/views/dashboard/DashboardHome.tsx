"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { motion, type Variants } from "framer-motion";
import { ArrowUpRight, Bot, CheckCircle2, Clock, Inbox, MessageCircle, Package, Wallet } from "lucide-react";
import { getUserProfile } from "@/lib/user";
import {
  ApiError,
  getDashboardActivity,
  getDashboardSummary,
  getTrialStatus,
  type ActivityItem,
  type DashboardSummary,
  type MetricValue,
} from "@/lib/api";

const PLAN_LABELS = {
  trial: "Free Trial",
  starter: "Starter",
  growth: "Growth",
  business: "Business",
} as const;

const EASE = [0.22, 1, 0.36, 1] as const;

const container: Variants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.06 } },
};

const item: Variants = {
  hidden: { y: 12, opacity: 0 },
  show: { y: 0, opacity: 1, transition: { duration: 0.35, ease: EASE } },
};

function formatChange(changePercent: number | null): string | null {
  if (changePercent === null) return null;
  const sign = changePercent >= 0 ? "+" : "";
  return `${sign}${changePercent}%`;
}

function buildStats(summary: DashboardSummary) {
  const metric = (m: MetricValue, format: (v: number) => string) => ({
    value: m.value === null ? "—" : format(m.value),
    change: formatChange(m.changePercent),
  });

  return [
    { label: "Today's Orders", subtitle: "vs last month", icon: Package, ...metric(summary.todaysOrders, (v) => String(v)) },
    { label: "Pending Orders", subtitle: "needs action", icon: Clock, ...metric(summary.pendingOrders, (v) => String(v)) },
    { label: "Completed Orders", subtitle: "all time", icon: CheckCircle2, ...metric(summary.completedOrders, (v) => String(v)) },
    { label: "Total Conversations", subtitle: "vs last week", icon: MessageCircle, ...metric(summary.totalConversations, (v) => String(v)) },
    { label: "Revenue", subtitle: "this month", icon: Wallet, ...metric(summary.revenueThisMonth, (v) => `PKR ${v.toLocaleString()}`) },
    { label: "AI Response Rate", subtitle: "last 7 days", icon: Bot, ...metric(summary.aiResponseRate, (v) => `${v}%`) },
  ];
}

function getGreeting(hour: number) {
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
}

export default function DashboardHome() {
  const [firstName, setFirstName] = useState("there");
  const [lastName, setLastName] = useState("");
  const [plan, setPlan] = useState<keyof typeof PLAN_LABELS | null>(null);
  const [now, setNow] = useState<Date | null>(null);
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [activity, setActivity] = useState<ActivityItem[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [selectedActivity, setSelectedActivity] = useState(0);

  useEffect(() => {
    const profile = getUserProfile();
    setFirstName(profile?.firstName ?? "there");
    setLastName(profile?.lastName ?? "");
    setNow(new Date());

    getDashboardSummary()
      .then((res) => setSummary(res.summary))
      .catch((err) => setError(err instanceof ApiError ? err.message : "Couldn't load dashboard stats."));

    getDashboardActivity()
      .then((res) => setActivity(res.activity))
      .catch(() => setActivity([]));

    getTrialStatus()
      .then((res) => setPlan(res.currentPlan))
      .catch(() => {});
  }, []);

  const greeting = getGreeting(now?.getHours() ?? 9);
  const dateLabel = now?.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" }) ?? "";
  const stats = summary ? buildStats(summary) : null;
  const featuredStats = stats ? stats.slice(0, 3) : null;

  return (
    <motion.div initial="hidden" animate="show" variants={container} className="flex flex-col gap-6">
      <motion.div
        variants={item}
        className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between lg:gap-8"
      >
        <div className="shrink-0">
          {dateLabel && <p className="text-xs font-medium text-foreground/40 dark:text-white/35">{dateLabel}</p>}
          <p className="mt-1 text-sm font-semibold text-foreground/60 dark:text-white/55">{greeting},</p>
          <div className="mt-0.5 flex flex-wrap items-center gap-3">
            <h1 className="text-4xl font-black tracking-tight text-foreground dark:text-white sm:text-5xl">
              {firstName}
              {lastName ? ` ${lastName}` : ""}
            </h1>
            {plan && (
              <span className="rounded-full bg-indigo-50 px-3 py-1 text-xs font-semibold text-[#45157b] dark:bg-[#a78bfa]/15 dark:text-[#c4b5fd]">
                {PLAN_LABELS[plan]}
              </span>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3 lg:w-auto lg:flex-1 lg:max-w-2xl">
          {(featuredStats ?? Array.from({ length: 3 })).map((s, i) => {
            const highlighted = i === 2;
            const Icon = s ? s.icon : Package;
            return (
              <motion.div
                key={s ? s.label : i}
                initial={{ opacity: 0, y: 16, scale: 0.96 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                transition={{ duration: 0.45, delay: 0.15 + i * 0.1, ease: EASE }}
                whileHover={{ y: -5, scale: 1.03 }}
                className={`min-w-[11rem] rounded-2xl p-5 shadow-sm transition-shadow hover:shadow-lg ${
                  highlighted ? "bg-[#c4b5fd]" : "bg-ink/[.04] dark:bg-white/[.06]"
                } ${!s ? "animate-pulse" : ""}`}
              >
                <div className="flex items-center justify-between">
                  <span
                    className={`flex h-8 w-8 items-center justify-center rounded-full ${
                      highlighted ? "bg-[#171326]/10 text-[#171326]" : "bg-ink/[.06] text-foreground/60 dark:bg-white/10 dark:text-white/70"
                    }`}
                  >
                    <Icon className="h-4 w-4" strokeWidth={2} />
                  </span>
                  {s && (
                    <span
                      className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                        highlighted
                          ? "bg-[#171326]/10 text-[#171326]/70"
                          : "bg-ink/[.05] text-foreground/50 dark:bg-white/10 dark:text-white/60"
                      }`}
                    >
                      {s.change ?? "—"}
                    </span>
                  )}
                </div>
                <p className={`mt-3 text-xs ${highlighted ? "text-[#171326]/70" : "text-foreground/45 dark:text-white/45"}`}>
                  {s ? s.label : ""}
                </p>
                <p
                  className={`mt-0.5 text-2xl font-extrabold tracking-tight ${
                    highlighted ? "text-[#171326]" : "text-foreground dark:text-white"
                  }`}
                >
                  {s ? s.value : ""}
                </p>
              </motion.div>
            );
          })}
        </div>
      </motion.div>

      {error && (
        <motion.div variants={item} className="rounded-2xl border border-red-200 dark:border-red-500/25 bg-red-50 dark:bg-red-500/10 p-4 text-sm text-red-600 dark:text-red-400">
          {error}
        </motion.div>
      )}

      {!activity || activity.length === 0 ? (
        <motion.div variants={item} className="rounded-2xl border border-ink/[.06] bg-surface p-5 shadow-sm sm:p-6">
          <p className="text-sm font-bold text-foreground">Recent Activity</p>
          <div className="flex flex-col items-center justify-center gap-3 py-10 text-center">
            <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-ink/[.03] text-foreground/30">
              <Inbox className="h-5 w-5" strokeWidth={2} />
            </span>
            <p className="max-w-xs text-sm text-foreground/50">
              Nothing here yet. Once orders and messages start coming in, you will see them in this feed.
            </p>
          </div>
        </motion.div>
      ) : (
        <motion.div variants={item} className="grid grid-cols-1 gap-4 overflow-hidden rounded-3xl lg:grid-cols-[minmax(0,1fr)_minmax(0,1.4fr)]">
          {/* left: activity list, dark panel */}
          <div className="rounded-3xl bg-[#171326] p-4">
            <p className="px-2 py-1 text-sm font-bold text-white">Recent Conversations</p>
            <div className="mt-2 flex flex-col gap-1">
              {activity.map((a, i) => {
                const isSelected = i === selectedActivity;
                const initial = a.text.replace(/^[^:]*:\s*/, "").trim().charAt(0).toUpperCase() || "?";
                return (
                  <button
                    key={i}
                    type="button"
                    onClick={() => setSelectedActivity(i)}
                    className={`flex items-center gap-3 rounded-2xl px-3 py-2.5 text-left transition-colors ${
                      isSelected ? "bg-white/10" : "hover:bg-white/[.04]"
                    }`}
                  >
                    <span
                      className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-xs font-bold text-[#171326]"
                      style={{ backgroundColor: "#FCBA03" }}
                    >
                      {initial}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-white/90">{a.text}</p>
                      <p className="mt-0.5 text-xs text-white/40">{new Date(a.time).toLocaleString()}</p>
                    </div>
                    <span className="shrink-0 rounded-full bg-white/10 px-2.5 py-1 text-[10px] font-semibold text-white/60">
                      {a.tag}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* right: selected item detail */}
          <div className="rounded-3xl border border-ink/[.06] bg-surface p-5 shadow-sm sm:p-6">
            {activity[selectedActivity] && (
              <>
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <span
                      className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full text-base font-bold text-[#171326]"
                      style={{ backgroundColor: "#FCBA03" }}
                    >
                      {(activity[selectedActivity].text.replace(/^[^:]*:\s*/, "").trim().charAt(0) || "?").toUpperCase()}
                    </span>
                    <div className="min-w-0">
                      <p className="truncate text-base font-bold text-foreground">{activity[selectedActivity].text}</p>
                      <p className="mt-0.5 text-xs text-foreground/45">
                        {new Date(activity[selectedActivity].time).toLocaleString()}
                      </p>
                    </div>
                  </div>
                  <span className="shrink-0 rounded-full bg-indigo-50 px-3 py-1 text-xs font-semibold text-[#45157b] dark:bg-[#a78bfa]/15 dark:text-[#c4b5fd]">
                    {activity[selectedActivity].tag}
                  </span>
                </div>

                <Link
                  href="/dashboard/conversations"
                  className="mt-6 flex w-full items-center justify-center gap-2 rounded-full px-5 py-3 text-sm font-bold text-[#171326] transition-transform hover:scale-[1.02]"
                  style={{ backgroundColor: "#FCBA03" }}
                >
                  View conversation
                  <ArrowUpRight className="h-4 w-4" strokeWidth={2.5} />
                </Link>
              </>
            )}
          </div>
        </motion.div>
      )}
    </motion.div>
  );
}
