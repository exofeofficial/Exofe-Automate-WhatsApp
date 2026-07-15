"use client";

import { useEffect, useState } from "react";
import { motion, type Variants } from "framer-motion";
import { Bot, CheckCircle2, Clock, Inbox, MessageCircle, Package, Wallet } from "lucide-react";
import { getUserProfile } from "@/lib/user";

const EASE = [0.22, 1, 0.36, 1] as const;

const container: Variants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.06 } },
};

const item: Variants = {
  hidden: { y: 12, opacity: 0 },
  show: { y: 0, opacity: 1, transition: { duration: 0.35, ease: EASE } },
};

// Zero state on purpose, a real new account has no orders or revenue yet.
// Backend developer: swap this for a real fetch to GET /dashboard/summary,
// the shape is {label, value, subtitle, change, icon} per card, see
// API.md. change is a signed percentage string like "+12%" or "-4%",
// null when there isn't enough data yet to compare against.
const STATS: {
  label: string;
  value: string;
  subtitle: string;
  change: string | null;
  icon: typeof Package;
}[] = [
  { label: "Today's Orders", value: "0", subtitle: "vs last month", change: null, icon: Package },
  { label: "Pending Orders", value: "0", subtitle: "needs action", change: null, icon: Clock },
  { label: "Completed Orders", value: "0", subtitle: "all time", change: null, icon: CheckCircle2 },
  { label: "Total Conversations", value: "0", subtitle: "vs last week", change: null, icon: MessageCircle },
  { label: "Revenue", value: "PKR 0", subtitle: "this month", change: null, icon: Wallet },
  { label: "AI Response Rate", value: "—", subtitle: "last 7 days", change: null, icon: Bot },
];

function ChangeBadge({ change, onDark }: { change: string | null; onDark?: boolean }) {
  if (!change) {
    return (
      <span
        className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${
          onDark ? "bg-white/15 text-white/60" : "bg-black/[.04] text-foreground/35"
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
        isUp ? "bg-emerald-50 text-emerald-600" : "bg-red-50 text-red-600"
      }`}
    >
      {change}
    </span>
  );
}

// Same idea, empty by default until GET /dashboard/activity has real events.
const ACTIVITY: { text: string; time: string; tag: string }[] = [];

function getGreeting(hour: number) {
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
}

export default function DashboardHome() {
  const [firstName, setFirstName] = useState("there");
  const [now, setNow] = useState<Date | null>(null);

  // Reads localStorage and the current time, has to happen after mount so
  // the server render and first client render match.
  useEffect(() => {
    setFirstName(getUserProfile()?.firstName ?? "there");
    setNow(new Date());
  }, []);

  const greeting = getGreeting(now?.getHours() ?? 9);
  const dateLabel = now?.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" }) ?? "";

  return (
    <motion.div initial="hidden" animate="show" variants={container} className="flex flex-col gap-6">
      <motion.div variants={item}>
        {dateLabel && <p className="text-xs font-medium text-foreground/40">{dateLabel}</p>}
        <h1 className="mt-1 text-xl font-bold tracking-tight text-foreground sm:text-2xl">
          {greeting}, {firstName}
        </h1>
      </motion.div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {STATS.map((s, i) => {
          const Icon = s.icon;
          const featured = i === 0;
          return (
            <motion.div
              key={s.label}
              variants={item}
              whileHover={{ y: -3 }}
              transition={{ duration: 0.2, ease: EASE }}
              className={`rounded-2xl p-5 shadow-sm transition-shadow hover:shadow-md ${
                featured
                  ? "bg-gradient-to-br from-[#5B4FE9] to-[#4338CA] shadow-indigo-900/20"
                  : "border border-black/[.06] bg-white"
              }`}
            >
              <div className="flex items-center justify-between">
                <span
                  className={`flex h-9 w-9 items-center justify-center rounded-xl ${
                    featured ? "bg-white/15 text-white" : "bg-black/[.04] text-foreground/60"
                  }`}
                >
                  <Icon className="h-4 w-4" strokeWidth={2} />
                </span>
                <ChangeBadge change={s.change} onDark={featured} />
              </div>
              <p className={`mt-4 text-xs ${featured ? "text-white/70" : "text-foreground/45"}`}>{s.label}</p>
              <div className="mt-1 flex items-baseline gap-2">
                <p className={`text-2xl font-extrabold tracking-tight ${featured ? "text-white" : "text-foreground"}`}>
                  {s.value}
                </p>
                <p className={`text-[11px] ${featured ? "text-white/60" : "text-foreground/40"}`}>{s.subtitle}</p>
              </div>
            </motion.div>
          );
        })}
      </div>

      <motion.div variants={item} className="rounded-2xl border border-black/[.06] bg-white p-5 shadow-sm sm:p-6">
        <p className="text-sm font-bold text-foreground">Recent Activity</p>

        {ACTIVITY.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-3 py-10 text-center">
            <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-black/[.03] text-foreground/30">
              <Inbox className="h-5 w-5" strokeWidth={2} />
            </span>
            <p className="max-w-xs text-sm text-foreground/50">
              Nothing here yet. Once orders and messages start coming in, you will see them in this feed.
            </p>
          </div>
        ) : (
          <div className="mt-4 flex flex-col divide-y divide-black/[.05]">
            {ACTIVITY.map((a) => (
              <div key={a.text} className="flex items-center justify-between gap-4 py-3 first:pt-0 last:pb-0">
                <div className="min-w-0">
                  <p className="truncate text-sm text-foreground/80">{a.text}</p>
                  <p className="mt-0.5 text-xs text-foreground/40">{a.time}</p>
                </div>
                <span className="shrink-0 rounded-full bg-black/[.04] px-2.5 py-1 text-[11px] font-medium text-foreground/55">
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
