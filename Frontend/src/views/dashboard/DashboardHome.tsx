"use client";

import { useEffect, useState } from "react";
import { motion, type Variants } from "framer-motion";
import {
  Bot,
  CheckCircle2,
  Clock,
  Inbox,
  MessageCircle,
  Moon,
  Package,
  Sun,
  SunMedium,
  Wallet,
} from "lucide-react";
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
// the shape is {label, value, change, icon, tint} per card, see API.md.
const STATS = [
  { label: "Today's Orders", value: "0", change: "No orders yet", icon: Package, tint: "from-indigo-500 to-violet-500" },
  { label: "Pending Orders", value: "0", change: "Nothing to action", icon: Clock, tint: "from-amber-400 to-orange-500" },
  { label: "Completed Orders", value: "0", change: "All time", icon: CheckCircle2, tint: "from-emerald-400 to-teal-500" },
  { label: "Total Conversations", value: "0", change: "No chats yet", icon: MessageCircle, tint: "from-sky-400 to-blue-500" },
  { label: "Revenue", value: "PKR 0", change: "This month", icon: Wallet, tint: "from-violet-500 to-fuchsia-500" },
  { label: "AI Response Rate", value: "—", change: "Not enough data", icon: Bot, tint: "from-rose-400 to-pink-500" },
];

// Same idea, empty by default until GET /dashboard/activity has real events.
const ACTIVITY: { text: string; time: string; tag: string }[] = [];

function getGreeting(hour: number) {
  if (hour < 12) return { text: "Good morning", Icon: Sun };
  if (hour < 17) return { text: "Good afternoon", Icon: SunMedium };
  return { text: "Good evening", Icon: Moon };
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

  const { text: greeting, Icon: GreetingIcon } = getGreeting(now?.getHours() ?? 9);
  const dateLabel = now?.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" }) ?? "";

  return (
    <motion.div initial="hidden" animate="show" variants={container} className="flex flex-col gap-6">
      <motion.div
        variants={item}
        className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-[#4a3fd6] via-[#5B4FE9] to-[#7C6FF5] p-6 sm:p-8"
      >
        <span className="pointer-events-none absolute -right-10 -top-16 h-56 w-56 rounded-full bg-white/10 blur-3xl" />
        <span className="pointer-events-none absolute -bottom-20 left-1/3 h-56 w-56 rounded-full bg-white/10 blur-3xl" />

        <div className="relative flex items-start justify-between gap-4">
          <div>
            {dateLabel && <p className="text-xs font-medium text-white/60">{dateLabel}</p>}
            <h1 className="mt-1 text-2xl font-extrabold tracking-tight text-white sm:text-3xl">
              {greeting}, {firstName}
            </h1>
            <p className="mt-2 max-w-sm text-sm text-white/70">
              Here is what is happening with your store today.
            </p>
          </div>
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-white/10 text-white">
            <GreetingIcon className="h-5 w-5" strokeWidth={2} />
          </span>
        </div>
      </motion.div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {STATS.map((s) => {
          const Icon = s.icon;
          return (
            <motion.div
              key={s.label}
              variants={item}
              whileHover={{ y: -3 }}
              transition={{ duration: 0.2, ease: EASE }}
              className="rounded-2xl border border-black/[.06] bg-white p-5 shadow-sm transition-shadow hover:shadow-md"
            >
              <span className={`flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br ${s.tint} text-white shadow-sm`}>
                <Icon className="h-5 w-5" strokeWidth={2} />
              </span>
              <p className="mt-4 text-2xl font-extrabold tracking-tight text-foreground">{s.value}</p>
              <p className="mt-1 text-xs text-foreground/50">{s.label}</p>
              <p className="mt-2 text-[11px] font-medium text-foreground/40">{s.change}</p>
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
