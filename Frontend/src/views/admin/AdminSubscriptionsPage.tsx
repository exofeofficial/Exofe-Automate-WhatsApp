"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { CreditCard, Loader2 } from "lucide-react";
import { ApiError, activateSubscription, getAdminSubscriptions, type AdminSubscription } from "@/lib/api";
import { PLANS, type PlanId } from "@/lib/plans";

const STATUS_STYLES: Record<AdminSubscription["status"], string> = {
  active: "bg-emerald-500/15 text-emerald-400",
  trialing: "bg-amber-500/15 text-amber-400",
  past_due: "bg-red-500/15 text-red-400",
  canceled: "bg-white/10 text-white/50",
};

function ActivatePlanControl({
  subscription,
  onActivated,
}: {
  subscription: AdminSubscription;
  onActivated: (updated: AdminSubscription) => void;
}) {
  const [selectedPlan, setSelectedPlan] = useState<PlanId>(
    (subscription.plan === "trial" ? "starter" : subscription.plan) as PlanId
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleActivate = async () => {
    setSaving(true);
    setError(null);
    try {
      const plan = PLANS.find((p) => p.id === selectedPlan)!;
      const updated = await activateSubscription(subscription.businessId, { plan: plan.id, amount: plan.monthly });
      onActivated(updated);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Couldn't activate plan.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="flex flex-col items-end gap-1.5">
      <div className="flex items-center gap-2">
        <select
          value={selectedPlan}
          onChange={(e) => setSelectedPlan(e.target.value as PlanId)}
          disabled={saving}
          className="rounded-lg border border-white/10 bg-white/5 px-2.5 py-1.5 text-xs font-medium text-white capitalize focus:outline-none focus:ring-2 focus:ring-[#45157b]/40 disabled:opacity-60"
        >
          {PLANS.map((p) => (
            <option key={p.id} value={p.id} className="bg-zinc-900">
              {p.name} — PKR {p.monthly.toLocaleString()}/mo
            </option>
          ))}
        </select>
        <button
          type="button"
          onClick={handleActivate}
          disabled={saving}
          className="flex items-center gap-1.5 rounded-lg bg-[#45157b] px-3 py-1.5 text-xs font-semibold text-white transition-colors hover:opacity-90 disabled:opacity-60"
        >
          {saving && <Loader2 className="h-3 w-3 animate-spin" strokeWidth={2.5} />}
          Activate
        </button>
      </div>
      {error && <p className="text-xs text-red-400">{error}</p>}
    </div>
  );
}

export default function AdminSubscriptionsPage() {
  const [subscriptions, setSubscriptions] = useState<AdminSubscription[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    getAdminSubscriptions()
      .then((res) => setSubscriptions(res.subscriptions))
      .catch((err) => setError(err instanceof ApiError ? err.message : "Couldn't load subscriptions."));
  }, []);

  const handleActivated = (updated: AdminSubscription) => {
    setSubscriptions((prev) => prev?.map((s) => (s.businessId === updated.businessId ? updated : s)) ?? prev);
  };

  if (error) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center rounded-2xl border border-dashed border-white/10 bg-zinc-950 p-8 text-center">
        <p className="text-sm text-red-400">{error}</p>
      </div>
    );
  }

  if (!subscriptions) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center rounded-2xl border border-dashed border-white/10 bg-zinc-950">
        <Loader2 className="h-6 w-6 animate-spin text-[#45157b]" strokeWidth={2} />
      </div>
    );
  }

  if (subscriptions.length === 0) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center rounded-2xl border border-dashed border-white/10 bg-zinc-950 p-8 text-center">
        <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[#45157b]/15 text-[#45157b]">
          <CreditCard className="h-6 w-6" strokeWidth={2} />
        </span>
        <h2 className="mt-4 text-lg font-bold text-white">No subscriptions yet</h2>
        <p className="mt-1.5 max-w-sm text-sm text-white/50">
          Every business gets a trial subscription row at signup — they'll show up here once someone signs up.
        </p>
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
      className="overflow-hidden rounded-2xl border border-white/10 bg-zinc-950"
    >
      <div className="flex items-center justify-between border-b border-white/10 px-5 py-4">
        <p className="text-sm font-semibold text-white">
          {subscriptions.length} {subscriptions.length === 1 ? "subscription" : "subscriptions"}
        </p>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-white/10 text-xs uppercase tracking-wide text-white/40">
              <th className="px-5 py-3 font-medium">Business</th>
              <th className="px-5 py-3 font-medium">Plan</th>
              <th className="px-5 py-3 font-medium">Status</th>
              <th className="px-5 py-3 font-medium">Amount</th>
              <th className="px-5 py-3 font-medium">Renews</th>
              <th className="px-5 py-3 font-medium text-right">Manually activate a plan</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {subscriptions.map((s) => (
              <tr key={s.id} className="transition-colors hover:bg-white/[.03]">
                <td className="px-5 py-3.5 font-medium text-white">{s.businessName ?? "—"}</td>
                <td className="px-5 py-3.5 capitalize text-white/70">{s.plan}</td>
                <td className="px-5 py-3.5">
                  <span className={`rounded-full px-2.5 py-1 text-xs font-medium capitalize ${STATUS_STYLES[s.status]}`}>
                    {s.status.replace("_", " ")}
                  </span>
                </td>
                <td className="px-5 py-3.5 text-white/60">PKR {s.amount.toLocaleString()}</td>
                <td className="px-5 py-3.5 text-white/50">
                  {new Date(s.currentPeriodEnd).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                </td>
                <td className="px-5 py-3.5">
                  <ActivatePlanControl subscription={s} onActivated={handleActivated} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </motion.div>
  );
}
