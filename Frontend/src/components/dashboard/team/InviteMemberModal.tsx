"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { Loader2, UserPlus, X } from "lucide-react";
import type { TeamRole } from "@/lib/api";

const EASE = [0.22, 1, 0.36, 1] as const;

const ROLES: { value: TeamRole; label: string; description: string }[] = [
  { value: "admin", label: "Admin", description: "Manage products, orders, team, and settings. No billing access." },
  { value: "staff", label: "Staff", description: "Handle conversations and view orders. Can't change settings or team." },
];

export default function InviteMemberModal({
  onClose,
  onInvite,
  inviting,
  error,
}: {
  onClose: () => void;
  onInvite: (email: string, role: TeamRole) => void;
  inviting: boolean;
  error: string | null;
}) {
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<TeamRole>("staff");
  const [emailError, setEmailError] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setEmailError("Enter a valid email");
      return;
    }
    setEmailError("");
    onInvite(email.trim(), role);
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.15 }}
      onClick={onClose}
      className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/40 p-4 backdrop-blur-sm"
    >
      <motion.div
        initial={{ opacity: 0, y: 12, scale: 0.97 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 10, scale: 0.98 }}
        transition={{ duration: 0.2, ease: EASE }}
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-sm rounded-3xl border border-black/[.06] bg-white p-6 shadow-2xl"
      >
        <div className="flex items-start justify-between">
          <div>
            <p className="text-sm font-bold text-foreground">Invite a team member</p>
            <p className="mt-0.5 text-xs text-foreground/45">They'll get an email to join Exofe</p>
          </div>
          <button type="button" onClick={onClose} aria-label="Close" className="text-foreground/40 hover:text-foreground">
            <X className="h-4 w-4" strokeWidth={2} />
          </button>
        </div>

        <form onSubmit={handleSubmit} noValidate className="mt-5 flex flex-col gap-4">
          <div>
            <label className="text-xs font-semibold text-foreground/70">* Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => {
                setEmail(e.target.value);
                setEmailError("");
              }}
              placeholder="teammate@yourbusiness.com"
              className={`mt-1.5 w-full rounded-lg border px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#5B4FE9]/30 ${
                emailError ? "border-red-400" : "border-black/[.12]"
              }`}
            />
            {emailError && <p className="mt-1 text-xs text-red-500">{emailError}</p>}
          </div>

          <div>
            <label className="text-xs font-semibold text-foreground/70">Role</label>
            <div className="mt-1.5 flex flex-col gap-2">
              {ROLES.map((r) => (
                <button
                  key={r.value}
                  type="button"
                  onClick={() => setRole(r.value)}
                  className={`rounded-xl border px-3.5 py-2.5 text-left transition-colors ${
                    role === r.value ? "border-[#5B4FE9] bg-indigo-50" : "border-black/[.1] hover:bg-black/[.03]"
                  }`}
                >
                  <p className={`text-sm font-semibold ${role === r.value ? "text-[#5B4FE9]" : "text-foreground/80"}`}>{r.label}</p>
                  <p className="mt-0.5 text-xs text-foreground/45">{r.description}</p>
                </button>
              ))}
            </div>
          </div>

          {error && <p className="rounded-lg bg-red-50 p-3 text-sm text-red-600">{error}</p>}

          <button
            type="submit"
            disabled={inviting}
            className="mt-1 flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-br from-[#5B4FE9] to-[#7C6FF5] py-3 text-sm font-semibold text-white shadow-sm hover:opacity-90 disabled:opacity-70"
          >
            {inviting ? <Loader2 className="h-4 w-4 animate-spin" strokeWidth={2.4} /> : <UserPlus className="h-4 w-4" strokeWidth={2} />}
            {inviting ? "Sending invite..." : "Send Invite"}
          </button>
        </form>
      </motion.div>
    </motion.div>
  );
}
