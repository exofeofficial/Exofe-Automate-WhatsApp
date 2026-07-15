"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { CheckCircle2, Loader2, Users, XCircle } from "lucide-react";
import { ApiError, getAdminUsers, type AdminUser } from "@/lib/api";

export default function AdminUsersPage() {
  const [users, setUsers] = useState<AdminUser[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    getAdminUsers()
      .then((res) => setUsers(res.users))
      .catch((err) => setError(err instanceof ApiError ? err.message : "Couldn't load users."));
  }, []);

  if (error) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center rounded-2xl border border-dashed border-white/10 bg-zinc-950 p-8 text-center">
        <p className="text-sm text-red-400">{error}</p>
      </div>
    );
  }

  if (!users) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center rounded-2xl border border-dashed border-white/10 bg-zinc-950">
        <Loader2 className="h-6 w-6 animate-spin text-[#7C6FF5]" strokeWidth={2} />
      </div>
    );
  }

  if (users.length === 0) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center rounded-2xl border border-dashed border-white/10 bg-zinc-950 p-8 text-center">
        <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[#5B4FE9]/15 text-[#7C6FF5]">
          <Users className="h-6 w-6" strokeWidth={2} />
        </span>
        <h2 className="mt-4 text-lg font-bold text-white">No users yet</h2>
        <p className="mt-1.5 max-w-sm text-sm text-white/50">
          Business owners and staff will show up here as soon as they sign up.
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
          {users.length} {users.length === 1 ? "user" : "users"}
        </p>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-white/10 text-xs uppercase tracking-wide text-white/40">
              <th className="px-5 py-3 font-medium">Name</th>
              <th className="px-5 py-3 font-medium">Email</th>
              <th className="px-5 py-3 font-medium">Business</th>
              <th className="px-5 py-3 font-medium">Role</th>
              <th className="px-5 py-3 font-medium">Verified</th>
              <th className="px-5 py-3 font-medium">Joined</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {users.map((u) => (
              <tr key={u.id} className="transition-colors hover:bg-white/[.03]">
                <td className="px-5 py-3.5 font-medium text-white">
                  {u.firstName} {u.lastName}
                </td>
                <td className="px-5 py-3.5 text-white/60">{u.email}</td>
                <td className="px-5 py-3.5 text-white/60">{u.businessName ?? "—"}</td>
                <td className="px-5 py-3.5">
                  <span className="rounded-full bg-white/5 px-2.5 py-1 text-xs font-medium capitalize text-white/70">
                    {u.role}
                  </span>
                </td>
                <td className="px-5 py-3.5">
                  {u.emailVerified ? (
                    <span className="flex items-center gap-1.5 text-xs font-medium text-emerald-400">
                      <CheckCircle2 className="h-3.5 w-3.5" strokeWidth={2.5} />
                      Verified
                    </span>
                  ) : (
                    <span className="flex items-center gap-1.5 text-xs font-medium text-white/35">
                      <XCircle className="h-3.5 w-3.5" strokeWidth={2} />
                      Unverified
                    </span>
                  )}
                </td>
                <td className="px-5 py-3.5 text-white/50">
                  {new Date(u.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </motion.div>
  );
}
