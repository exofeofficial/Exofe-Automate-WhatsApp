"use client";

import { useEffect, useMemo, useState } from "react";
import { motion, type Variants } from "framer-motion";
import { BarChart3, Loader2, Package, Wallet } from "lucide-react";
import { ApiError, getAnalytics, type AnalyticsPoint } from "@/lib/api";

const EASE = [0.22, 1, 0.36, 1] as const;

const container: Variants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.06 } },
};

const item: Variants = {
  hidden: { y: 12, opacity: 0 },
  show: { y: 0, opacity: 1, transition: { duration: 0.3, ease: EASE } },
};

const RANGES = [
  { value: 7, label: "7 days" },
  { value: 30, label: "30 days" },
  { value: 90, label: "90 days" },
];

function formatPrice(value: number) {
  return `PKR ${value.toLocaleString("en-PK")}`;
}

function OrdersRevenueChart({ points }: { points: AnalyticsPoint[] }) {
  const width = 700;
  const height = 220;
  const padding = 24;

  const maxOrders = Math.max(1, ...points.map((p) => p.orders));
  const maxRevenue = Math.max(1, ...points.map((p) => p.revenue));

  const barWidth = points.length > 0 ? (width - padding * 2) / points.length : 0;

  const revenuePath = points
    .map((p, i) => {
      const x = padding + barWidth * i + barWidth / 2;
      const y = height - padding - (p.revenue / maxRevenue) * (height - padding * 2);
      return `${i === 0 ? "M" : "L"} ${x} ${y}`;
    })
    .join(" ");

  // sparse x-axis labels so 90-day ranges don't overlap
  const labelEvery = Math.max(1, Math.ceil(points.length / 8));

  return (
    <svg viewBox={`0 0 ${width} ${height + 24}`} className="w-full">
      {[0, 0.5, 1].map((f) => (
        <line
          key={f}
          x1={padding}
          x2={width - padding}
          y1={padding + f * (height - padding * 2)}
          y2={padding + f * (height - padding * 2)}
          stroke="#00000008"
          strokeWidth={1}
        />
      ))}

      {points.map((p, i) => {
        const barHeight = (p.orders / maxOrders) * (height - padding * 2);
        const x = padding + barWidth * i + barWidth * 0.2;
        const y = height - padding - barHeight;
        return (
          <rect
            key={p.date}
            x={x}
            y={y}
            width={barWidth * 0.6}
            height={barHeight}
            rx={3}
            fill="#5B4FE9"
            opacity={0.85}
          />
        );
      })}

      <path d={revenuePath} fill="none" stroke="#10B981" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />

      {points.map((p, i) => {
        if (i % labelEvery !== 0) return null;
        const x = padding + barWidth * i + barWidth / 2;
        return (
          <text key={p.date} x={x} y={height + 16} textAnchor="middle" fontSize="10" fill="#00000055">
            {new Date(p.date).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
          </text>
        );
      })}
    </svg>
  );
}

export default function AnalyticsPage() {
  const [days, setDays] = useState(30);
  const [points, setPoints] = useState<AnalyticsPoint[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setPoints(null);
    getAnalytics(days)
      .then((res) => {
        setPoints(res.points);
        setError(null);
      })
      .catch((err) => setError(err instanceof ApiError ? err.message : "Couldn't load analytics right now."));
  }, [days]);

  const totals = useMemo(() => {
    if (!points) return null;
    const totalOrders = points.reduce((sum, p) => sum + p.orders, 0);
    const totalRevenue = points.reduce((sum, p) => sum + p.revenue, 0);
    const avgOrderValue = totalOrders > 0 ? totalRevenue / totalOrders : 0;
    return { totalOrders, totalRevenue, avgOrderValue };
  }, [points]);

  return (
    <motion.div initial="hidden" animate="show" variants={container} className="flex flex-col gap-5">
      <motion.div variants={item} className="flex items-center justify-between gap-3">
        <h1 className="text-xl font-bold text-foreground sm:text-2xl">Analytics</h1>
        <div className="flex gap-1.5">
          {RANGES.map((r) => (
            <button
              key={r.value}
              type="button"
              onClick={() => setDays(r.value)}
              className={`rounded-full px-3.5 py-1.5 text-xs font-semibold transition-colors ${
                days === r.value ? "bg-[#5B4FE9] text-white" : "bg-white text-foreground/60 shadow-sm hover:bg-black/[.03]"
              }`}
            >
              {r.label}
            </button>
          ))}
        </div>
      </motion.div>

      {error && (
        <motion.p variants={item} className="rounded-xl bg-red-50 p-3.5 text-sm text-red-600">
          {error}
        </motion.p>
      )}

      {!points ? (
        <div className="flex h-[calc(100vh-16rem)] items-center justify-center rounded-2xl border border-black/[.06] bg-white shadow-sm">
          <Loader2 className="h-6 w-6 animate-spin text-[#5B4FE9]" strokeWidth={2} />
        </div>
      ) : (
        <>
          <motion.div variants={item} className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div className="rounded-2xl bg-gradient-to-br from-[#5B4FE9] to-[#4338CA] p-5 text-white shadow-sm">
              <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/15">
                <Package className="h-4 w-4" strokeWidth={2} />
              </span>
              <p className="mt-4 text-xs text-white/70">Total Orders</p>
              <p className="mt-1 text-2xl font-extrabold">{totals?.totalOrders ?? 0}</p>
            </div>
            <div className="rounded-2xl border border-black/[.06] bg-white p-5 shadow-sm">
              <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-black/[.04] text-foreground/60">
                <Wallet className="h-4 w-4" strokeWidth={2} />
              </span>
              <p className="mt-4 text-xs text-foreground/45">Total Revenue</p>
              <p className="mt-1 text-2xl font-extrabold text-foreground">{formatPrice(totals?.totalRevenue ?? 0)}</p>
            </div>
            <div className="rounded-2xl border border-black/[.06] bg-white p-5 shadow-sm">
              <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-black/[.04] text-foreground/60">
                <BarChart3 className="h-4 w-4" strokeWidth={2} />
              </span>
              <p className="mt-4 text-xs text-foreground/45">Avg Order Value</p>
              <p className="mt-1 text-2xl font-extrabold text-foreground">{formatPrice(totals?.avgOrderValue ?? 0)}</p>
            </div>
          </motion.div>

          <motion.div variants={item} className="rounded-2xl border border-black/[.06] bg-white p-5 shadow-sm sm:p-6">
            <div className="flex items-center justify-between">
              <p className="text-sm font-bold text-foreground">Orders & Revenue</p>
              <div className="flex items-center gap-4 text-xs text-foreground/50">
                <span className="flex items-center gap-1.5">
                  <span className="h-2 w-2 rounded-full bg-[#5B4FE9]" />
                  Orders
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="h-2 w-2 rounded-full bg-emerald-500" />
                  Revenue
                </span>
              </div>
            </div>

            {points.length === 0 || totals?.totalOrders === 0 ? (
              <div className="flex h-48 items-center justify-center text-sm text-foreground/40">
                No orders in this period yet.
              </div>
            ) : (
              <div className="mt-4">
                <OrdersRevenueChart points={points} />
              </div>
            )}
          </motion.div>
        </>
      )}
    </motion.div>
  );
}
