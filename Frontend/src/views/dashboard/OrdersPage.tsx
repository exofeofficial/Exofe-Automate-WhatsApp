"use client";

import { useEffect, useState } from "react";
import { motion, type Variants } from "framer-motion";
import { Inbox, Loader2, Package, Search } from "lucide-react";
import { ApiError, getOrder, getOrders, type OrderDetail, type OrderStatus, type OrderSummary } from "@/lib/api";
import OrderDetailPanel from "@/components/dashboard/orders/OrderDetailPanel";

const EASE = [0.22, 1, 0.36, 1] as const;

const container: Variants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.05 } },
};

const item: Variants = {
  hidden: { y: 12, opacity: 0 },
  show: { y: 0, opacity: 1, transition: { duration: 0.3, ease: EASE } },
};

const STATUS_META: Record<OrderStatus, { label: string; badge: string }> = {
  new: { label: "New", badge: "bg-sky-50 text-sky-600" },
  confirmed: { label: "Confirmed", badge: "bg-indigo-50 text-[#5B4FE9]" },
  shipped: { label: "Shipped", badge: "bg-amber-50 text-amber-600" },
  delivered: { label: "Delivered", badge: "bg-emerald-50 text-emerald-600" },
  canceled: { label: "Canceled", badge: "bg-red-50 text-red-600" },
};

const FILTERS: { value: OrderStatus | "all"; label: string }[] = [
  { value: "all", label: "All" },
  { value: "new", label: "New" },
  { value: "confirmed", label: "Confirmed" },
  { value: "shipped", label: "Shipped" },
  { value: "delivered", label: "Delivered" },
  { value: "canceled", label: "Canceled" },
];

function formatPrice(value: number) {
  return `PKR ${value.toLocaleString("en-PK")}`;
}

export default function OrdersPage() {
  const [orders, setOrders] = useState<OrderSummary[]>([]);
  const [counts, setCounts] = useState<Partial<Record<OrderStatus, number>>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<OrderStatus | "all">("all");

  const [selectedOrder, setSelectedOrder] = useState<OrderDetail | null>(null);
  const [loadingOrderId, setLoadingOrderId] = useState<string | null>(null);

  const load = () => {
    setLoading(true);
    getOrders({ status: statusFilter === "all" ? undefined : statusFilter, search: search || undefined })
      .then((res) => {
        setOrders(res.orders);
        setCounts(res.counts);
        setError(null);
      })
      .catch((err) => setError(err instanceof ApiError ? err.message : "Couldn't load orders right now."))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    const timer = setTimeout(load, search ? 300 : 0);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [statusFilter, search]);

  const openOrder = async (id: string) => {
    setLoadingOrderId(id);
    try {
      const { order } = await getOrder(id);
      setSelectedOrder(order);
    } catch {
      // swallow — row stays clickable, they can just try again
    } finally {
      setLoadingOrderId(null);
    }
  };

  const totalOrders = Object.values(counts).reduce((sum, n) => sum + (n ?? 0), 0);

  return (
    <motion.div initial="hidden" animate="show" variants={container} className="flex flex-col gap-6">
      <motion.div variants={item} className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
        <div className="rounded-2xl bg-gradient-to-br from-[#5B4FE9] to-[#4338CA] p-4 text-white shadow-sm">
          <p className="text-xs text-white/70">Total Orders</p>
          <p className="mt-1 text-xl font-extrabold">{totalOrders}</p>
        </div>
        {(["new", "confirmed", "shipped", "delivered", "canceled"] as OrderStatus[]).map((s) => (
          <div key={s} className="rounded-2xl border border-black/[.06] bg-white p-4 shadow-sm">
            <p className="text-xs text-foreground/45">{STATUS_META[s].label}</p>
            <p className="mt-1 text-xl font-extrabold text-foreground">{counts[s] ?? 0}</p>
          </div>
        ))}
      </motion.div>

      <motion.div variants={item} className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative w-full sm:max-w-xs">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-foreground/35" strokeWidth={2} />
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by customer or phone"
            className="w-full rounded-full border border-black/[.08] bg-white py-2 pl-9 pr-4 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-[#5B4FE9]/25"
          />
        </div>

        <div className="flex flex-wrap gap-1.5">
          {FILTERS.map((f) => (
            <button
              key={f.value}
              type="button"
              onClick={() => setStatusFilter(f.value)}
              className={`rounded-full px-3.5 py-1.5 text-xs font-semibold transition-colors ${
                statusFilter === f.value
                  ? "bg-[#5B4FE9] text-white"
                  : "bg-white text-foreground/60 shadow-sm hover:bg-black/[.03]"
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
      </motion.div>

      {error && (
        <motion.div variants={item} className="rounded-xl bg-red-50 p-3.5 text-sm text-red-600">
          {error}
        </motion.div>
      )}

      {loading ? (
        <div className="flex h-[calc(100vh-22rem)] items-center justify-center rounded-2xl border border-black/[.06] bg-white shadow-sm">
          <Loader2 className="h-6 w-6 animate-spin text-[#5B4FE9]" strokeWidth={2} />
        </div>
      ) : orders.length === 0 ? (
        <motion.div
          variants={item}
          className="flex h-[calc(100vh-22rem)] flex-col items-center justify-center gap-3 rounded-2xl border border-black/[.06] bg-white p-6 text-center shadow-sm"
        >
          <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-black/[.03] text-foreground/30">
            <Inbox className="h-5 w-5" strokeWidth={2} />
          </span>
          <p className="max-w-xs text-sm text-foreground/50">
            {search || statusFilter !== "all"
              ? "No orders match your filters."
              : "No orders yet. Once customers start ordering on WhatsApp, they'll show up here."}
          </p>
        </motion.div>
      ) : (
        <motion.div variants={item} className="overflow-x-auto rounded-2xl border border-black/[.06] bg-white shadow-sm">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-black/[.06] text-xs uppercase tracking-wide text-foreground/40">
                <th className="px-5 py-3 font-medium">Order</th>
                <th className="px-5 py-3 font-medium">Customer</th>
                <th className="px-5 py-3 font-medium">Items</th>
                <th className="px-5 py-3 font-medium">Total</th>
                <th className="px-5 py-3 font-medium">Status</th>
                <th className="px-5 py-3 font-medium">Date</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-black/[.05]">
              {orders.map((o) => (
                <tr
                  key={o.id}
                  onClick={() => openOrder(o.id)}
                  className="cursor-pointer transition-colors hover:bg-black/[.02]"
                >
                  <td className="flex items-center gap-2 px-5 py-3.5 font-semibold text-foreground">
                    <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-black/[.04] text-foreground/50">
                      <Package className="h-3.5 w-3.5" strokeWidth={2} />
                    </span>
                    #{o.id.slice(0, 8).toUpperCase()}
                    {loadingOrderId === o.id && <Loader2 className="h-3.5 w-3.5 animate-spin text-foreground/30" strokeWidth={2} />}
                  </td>
                  <td className="px-5 py-3.5">
                    <p className="text-foreground/80">{o.customerName ?? "Unknown"}</p>
                    <p className="text-xs text-foreground/40">{o.customerPhone}</p>
                  </td>
                  <td className="px-5 py-3.5 text-foreground/60">
                    {o.itemCount} {o.itemCount === 1 ? "item" : "items"}
                  </td>
                  <td className="px-5 py-3.5 font-semibold text-foreground">{formatPrice(o.total)}</td>
                  <td className="px-5 py-3.5">
                    <span className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${STATUS_META[o.status].badge}`}>
                      {STATUS_META[o.status].label}
                    </span>
                  </td>
                  <td className="px-5 py-3.5 text-foreground/50">
                    {new Date(o.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </motion.div>
      )}

      {selectedOrder && (
        <OrderDetailPanel
          order={selectedOrder}
          onClose={() => setSelectedOrder(null)}
          onUpdated={(updated) => {
            setSelectedOrder(updated);
            setOrders((prev) => prev.map((o) => (o.id === updated.id ? { ...o, status: updated.status } : o)));
            load();
          }}
        />
      )}
    </motion.div>
  );
}
