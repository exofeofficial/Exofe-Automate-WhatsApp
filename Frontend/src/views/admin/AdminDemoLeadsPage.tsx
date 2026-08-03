"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { CalendarClock, Loader2 } from "lucide-react";
import { ApiError, getDemoLeads, type DemoLead } from "@/lib/api";

export default function AdminDemoLeadsPage() {
  const [leads, setLeads] = useState<DemoLead[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    getDemoLeads()
      .then((res) => setLeads(res.leads))
      .catch((err) => setError(err instanceof ApiError ? err.message : "Couldn't load demo requests."));
  }, []);

  if (error) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center rounded-2xl border border-dashed border-white/10 bg-zinc-950 p-8 text-center">
        <p className="text-sm text-red-400">{error}</p>
      </div>
    );
  }

  if (!leads) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center rounded-2xl border border-dashed border-white/10 bg-zinc-950">
        <Loader2 className="h-6 w-6 animate-spin text-[#45157b]" strokeWidth={2} />
      </div>
    );
  }

  if (leads.length === 0) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center rounded-2xl border border-dashed border-white/10 bg-zinc-950 p-8 text-center">
        <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[#45157b]/15 text-[#45157b]">
          <CalendarClock className="h-6 w-6" strokeWidth={2} />
        </span>
        <h2 className="mt-4 text-lg font-bold text-white">No demo requests yet</h2>
        <p className="mt-1.5 max-w-sm text-sm text-white/50">
          Submissions from the &quot;Book a Demo&quot; page will show up here.
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
          {leads.length} {leads.length === 1 ? "demo request" : "demo requests"}
        </p>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-white/10 text-xs uppercase tracking-wide text-white/40">
              <th className="px-5 py-3 font-medium">Name</th>
              <th className="px-5 py-3 font-medium">Email</th>
              <th className="px-5 py-3 font-medium">WhatsApp Number</th>
              <th className="px-5 py-3 font-medium">Billing Country</th>
              <th className="px-5 py-3 font-medium">Team</th>
              <th className="px-5 py-3 font-medium">Submitted</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {leads.map((lead) => (
              <tr key={lead.id} className="transition-colors hover:bg-white/[.03]">
                <td className="px-5 py-3.5 font-medium text-white">{lead.name}</td>
                <td className="px-5 py-3.5 text-white/60">
                  <a href={`mailto:${lead.email}`} className="hover:text-[#45157b] hover:underline">
                    {lead.email}
                  </a>
                </td>
                <td className="px-5 py-3.5 text-white/60">
                  <a
                    href={`https://wa.me/${lead.phone.replace(/\D/g, "")}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="hover:text-[#45157b] hover:underline"
                  >
                    {lead.countryCode} {lead.phone}
                  </a>
                </td>
                <td className="px-5 py-3.5 text-white/60">{lead.billingCountry}</td>
                <td className="px-5 py-3.5">
                  <span className="rounded-full bg-white/5 px-2.5 py-1 text-xs font-medium text-white/70">
                    {lead.team ?? "—"}
                  </span>
                </td>
                <td className="px-5 py-3.5 text-white/50">
                  {new Date(lead.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </motion.div>
  );
}
