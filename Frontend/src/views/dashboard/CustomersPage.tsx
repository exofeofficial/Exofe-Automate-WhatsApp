"use client";

import { useEffect, useState } from "react";
import { motion, type Variants } from "framer-motion";
import { Loader2, Search, User, Users } from "lucide-react";
import { ApiError, getCustomer, getCustomers, type CustomerDetail, type CustomerSummary } from "@/lib/api";
import CustomerDetailPanel from "@/components/dashboard/customers/CustomerDetailPanel";

const EASE = [0.22, 1, 0.36, 1] as const;

const container: Variants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.05 } },
};

const item: Variants = {
  hidden: { y: 12, opacity: 0 },
  show: { y: 0, opacity: 1, transition: { duration: 0.3, ease: EASE } },
};

function formatPrice(value: number) {
  return `PKR ${value.toLocaleString("en-PK")}`;
}

export default function CustomersPage() {
  const [customers, setCustomers] = useState<CustomerSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");

  const [selected, setSelected] = useState<CustomerDetail | null>(null);
  const [loadingId, setLoadingId] = useState<string | null>(null);

  useEffect(() => {
    const timer = setTimeout(() => {
      setLoading(true);
      getCustomers(search || undefined)
        .then((res) => {
          setCustomers(res.customers);
          setError(null);
        })
        .catch((err) => setError(err instanceof ApiError ? err.message : "Couldn't load customers right now."))
        .finally(() => setLoading(false));
    }, search ? 300 : 0);
    return () => clearTimeout(timer);
  }, [search]);

  const openCustomer = async (id: string) => {
    setLoadingId(id);
    try {
      const { customer } = await getCustomer(id);
      setSelected(customer);
    } catch {
      // row stays clickable, they can just try again
    } finally {
      setLoadingId(null);
    }
  };

  return (
    <motion.div initial="hidden" animate="show" variants={container} className="flex flex-col gap-5">
      <motion.div variants={item} className="flex items-center justify-between gap-3">
        <h1 className="text-xl font-bold text-foreground sm:text-2xl">Customers</h1>
        <div className="relative w-full max-w-xs">
          <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-foreground/35" strokeWidth={2} />
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name or number"
            className="w-full rounded-full border border-ink/[.08] bg-surface py-2.5 pl-10 pr-4 text-sm text-foreground shadow-sm focus:outline-none focus:ring-2 focus:ring-[#45157b]/25"
          />
        </div>
      </motion.div>

      {error && (
        <motion.p variants={item} className="rounded-xl bg-red-50 dark:bg-red-500/15 p-3.5 text-sm text-red-600 dark:text-red-400">
          {error}
        </motion.p>
      )}

      {loading ? (
        <div className="flex h-[calc(100vh-14rem)] items-center justify-center rounded-2xl border border-ink/[.06] bg-surface shadow-sm">
          <Loader2 className="h-6 w-6 animate-spin text-[#45157b]" strokeWidth={2} />
        </div>
      ) : customers.length === 0 ? (
        <motion.div
          variants={item}
          className="flex h-[calc(100vh-14rem)] flex-col items-center justify-center gap-3 rounded-2xl border border-ink/[.06] bg-surface p-6 text-center shadow-sm"
        >
          <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-ink/[.03] text-foreground/30">
            <Users className="h-5 w-5" strokeWidth={2} />
          </span>
          <p className="max-w-xs text-sm text-foreground/50">
            {search ? "No customers match your search." : "No customers yet. Once someone messages you on WhatsApp, they'll show up here."}
          </p>
        </motion.div>
      ) : (
        <motion.div variants={item} className="overflow-x-auto rounded-2xl border border-ink/[.06] bg-surface shadow-sm">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-ink/[.06] text-xs uppercase tracking-wide text-foreground/40">
                <th className="px-5 py-3 font-medium">Customer</th>
                <th className="px-5 py-3 font-medium">WhatsApp Number</th>
                <th className="px-5 py-3 font-medium">Total Spent</th>
                <th className="px-5 py-3 font-medium">Joined</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-ink/[.05]">
              {customers.map((c) => (
                <tr
                  key={c.id}
                  onClick={() => openCustomer(c.id)}
                  className="cursor-pointer transition-colors hover:bg-ink/[.02]"
                >
                  <td className="flex items-center gap-2.5 px-5 py-3.5 font-medium text-foreground">
                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-indigo-300 to-purple-400 text-xs font-bold text-white">
                      {c.name?.[0]?.toUpperCase() ?? <User className="h-3.5 w-3.5" strokeWidth={2} />}
                    </span>
                    {c.name ?? "Unknown"}
                    {loadingId === c.id && <Loader2 className="h-3.5 w-3.5 animate-spin text-foreground/30" strokeWidth={2} />}
                  </td>
                  <td className="px-5 py-3.5 text-foreground/60">{c.whatsappNumber}</td>
                  <td className="px-5 py-3.5 font-semibold text-foreground">{formatPrice(c.totalSpent)}</td>
                  <td className="px-5 py-3.5 text-foreground/50">
                    {new Date(c.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </motion.div>
      )}

      {selected && <CustomerDetailPanel customer={selected} onClose={() => setSelected(null)} />}
    </motion.div>
  );
}
