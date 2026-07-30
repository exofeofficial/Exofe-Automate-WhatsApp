"use client";

import { useEffect, useState } from "react";
import { motion, type Variants } from "framer-motion";
import { Bot, CheckCircle2, Clock, Inbox, MessageCircle, Package, Wallet } from "lucide-react";
import { getUserProfile } from "@/lib/user";
import {
  ApiError,
  getDashboardActivity,
  getDashboardSummary,
  type ActivityItem,
  type DashboardSummary,
  type MetricValue,
} from "@/lib/api";

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

function ChangeBadge({ change, onDark }: { change: string | null; onDark?: boolean }) {
  if (!change) {
    return (
      <span
        className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${
          onDark ? "bg-white/15 text-white/60" : "bg-ink/[.04] text-foreground/35"
        }`}
      >
        —
      </span>
    );
  }
  const isUp = change.startsWith("+");
  return (
    <span
      className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${
        isUp ? "bg-emerald-50 dark:bg-emerald-500/15 text-emerald-600 dark:text-emerald-400" : "bg-red-50 dark:bg-red-500/15 text-red-600 dark:text-red-400"
      }`}
    >
      {change}
    </span>
  );
}

function getGreeting(hour: number) {
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
}

export default function DashboardHome() {
  const [firstName, setFirstName] = useState("there");
  const [now, setNow] = useState<Date | null>(null);
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [activity, setActivity] = useState<ActivityItem[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setFirstName(getUserProfile()?.firstName ?? "there");
    setNow(new Date());

    getDashboardSummary()
      .then((res) => setSummary(res.summary))
      .catch((err) => setError(err instanceof ApiError ? err.message : "Couldn't load dashboard stats."));

    getDashboardActivity()
      .then((res) => setActivity(res.activity))
      .catch(() => setActivity([]));
  }, []);

  const greeting = getGreeting(now?.getHours() ?? 9);
  const dateLabel = now?.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" }) ?? "";
  const stats = summary ? buildStats(summary) : null;

  return (
    <motion.div initial="hidden" animate="show" variants={container} className="flex flex-col gap-6">
      <motion.div variants={item}>
        {dateLabel && <p className="text-xs font-medium text-foreground/40">{dateLabel}</p>}
        <h1 className="mt-1 text-xl font-bold tracking-tight text-foreground sm:text-2xl">
          {greeting}, {firstName}
        </h1>
      </motion.div>

      {error && (
        <motion.div variants={item} className="rounded-2xl border border-red-200 dark:border-red-500/25 bg-red-50 dark:bg-red-500/10 p-4 text-sm text-red-600 dark:text-red-400">
          {error}
        </motion.div>
      )}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {(stats ?? Array.from({ length: 6 })).map((s, i) => {
          const featured = i === 0;
          const Icon = s ? s.icon : Package;
          return (
            <motion.div
              key={s ? s.label : i}
              variants={item}
              whileHover={{ y: -3 }}
              transition={{ duration: 0.2, ease: EASE }}
              className={`rounded-2xl p-5 shadow-sm transition-shadow hover:shadow-md ${
                featured
                  ? "bg-gradient-to-br from-[#5B4FE9] to-[#4338CA] shadow-indigo-900/20"
                  : "border border-ink/[.06] bg-surface"
              } ${!s ? "animate-pulse" : ""}`}
            >
              <div className="flex items-center justify-between">
                <span
                  className={`flex h-9 w-9 items-center justify-center rounded-xl ${
                    featured ? "bg-white/15 text-white" : "bg-ink/[.04] text-foreground/60"
                  }`}
                >
                  <Icon className="h-4 w-4" strokeWidth={2} />
                </span>
                {s && <ChangeBadge change={s.change} onDark={featured} />}
              </div>
              <p className={`mt-4 text-xs ${featured ? "text-white/70" : "text-foreground/45"}`}>{s ? s.label : ""}</p>
              <div className="mt-1 flex items-baseline gap-2">
                <p className={`text-2xl font-extrabold tracking-tight ${featured ? "text-white" : "text-foreground"}`}>
                  {s ? s.value : ""}
                </p>
                <p className={`text-[11px] ${featured ? "text-white/60" : "text-foreground/40"}`}>{s ? s.subtitle : ""}</p>
              </div>
            </motion.div>
          );
        })}
      </div>

      <motion.div variants={item} className="rounded-2xl border border-ink/[.06] bg-surface p-5 shadow-sm sm:p-6">
        <p className="text-sm font-bold text-foreground">Recent Activity</p>

        {!activity || activity.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-3 py-10 text-center">
            <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-ink/[.03] text-foreground/30">
              <Inbox className="h-5 w-5" strokeWidth={2} />
            </span>
            <p className="max-w-xs text-sm text-foreground/50">
              Nothing here yet. Once orders and messages start coming in, you will see them in this feed.
            </p>
          </div>
        ) : (
          <div className="mt-4 flex flex-col divide-y divide-ink/[.05]">
            {activity.map((a, i) => (
              <div key={i} className="flex items-center justify-between gap-4 py-3 first:pt-0 last:pb-0">
                <div className="min-w-0">
                  <p className="truncate text-sm text-foreground/80">{a.text}</p>
                  <p className="mt-0.5 text-xs text-foreground/40">{new Date(a.time).toLocaleString()}</p>
                </div>
                <span className="shrink-0 rounded-full bg-ink/[.04] px-2.5 py-1 text-[11px] font-medium text-foreground/55">
                  {a.tag}
                </span>
              </div>
            ))}
          </div>
        )}
      </motion.div>
    </motion.div>
  );
}
