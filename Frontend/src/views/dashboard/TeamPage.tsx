"use client";

import { useEffect, useState } from "react";
import { AnimatePresence } from "framer-motion";
import { Loader2, Mail, UserPlus, UserX } from "lucide-react";
import {
  ApiError,
  getTeamMembers,
  inviteTeamMember,
  removeTeamMember,
  updateTeamMemberRole,
  type TeamMember,
  type TeamRole,
} from "@/lib/api";
import { getUserProfile } from "@/lib/user";
import InviteMemberModal from "@/components/dashboard/team/InviteMemberModal";
import RemoveMemberModal from "@/components/dashboard/team/RemoveMemberModal";

const ROLE_LABEL: Record<TeamRole, string> = { owner: "Owner", admin: "Admin", staff: "Staff" };

function fallbackOwner(): TeamMember[] {
  const profile = getUserProfile();
  return [
    {
      id: "owner",
      name: profile ? `${profile.firstName}${profile.lastName ? ` ${profile.lastName}` : ""}` : "You",
      email: profile?.email ?? "",
      role: "owner",
      status: "active",
    },
  ];
}

function initials(name: string) {
  return name
    .split(" ")
    .map((p) => p[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

export default function TeamPage() {
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [loading, setLoading] = useState(true);

  const [showInvite, setShowInvite] = useState(false);
  const [inviting, setInviting] = useState(false);
  const [inviteError, setInviteError] = useState<string | null>(null);

  const [removeTarget, setRemoveTarget] = useState<TeamMember | null>(null);
  const [removing, setRemoving] = useState(false);
  const [removeError, setRemoveError] = useState<string | null>(null);

  const [roleUpdatingId, setRoleUpdatingId] = useState<string | null>(null);

  // Backend developer: this is a real GET /team call (see src/lib/api.ts),
  // it will fail until that endpoint exists, which is expected. The page
  // falls back to just the signed in owner rather than an empty list,
  // since every account has at least one member.
  useEffect(() => {
    getTeamMembers()
      .then((res) => setMembers(res.members))
      .catch(() => setMembers(fallbackOwner()))
      .finally(() => setLoading(false));
  }, []);

  const handleInvite = async (email: string, role: TeamRole) => {
    setInviting(true);
    setInviteError(null);
    try {
      const { member } = await inviteTeamMember({ email, role });
      setMembers((prev) => [...prev, member]);
      setShowInvite(false);
    } catch (err) {
      setInviteError(err instanceof ApiError ? err.message : "Couldn't send this invite right now. Please try again.");
    } finally {
      setInviting(false);
    }
  };

  const handleRoleChange = async (member: TeamMember, role: TeamRole) => {
    setRoleUpdatingId(member.id);
    try {
      const { member: updated } = await updateTeamMemberRole(member.id, role);
      setMembers((prev) => prev.map((m) => (m.id === updated.id ? updated : m)));
    } catch {
      // inline role select has no room for an error message, the row just
      // keeps its previous role since state was never optimistically changed
    } finally {
      setRoleUpdatingId(null);
    }
  };

  const handleRemove = async () => {
    if (!removeTarget) return;
    setRemoving(true);
    setRemoveError(null);
    try {
      await removeTeamMember(removeTarget.id);
      setMembers((prev) => prev.filter((m) => m.id !== removeTarget.id));
      setRemoveTarget(null);
    } catch (err) {
      setRemoveError(err instanceof ApiError ? err.message : "Couldn't remove this member right now. Please try again.");
    } finally {
      setRemoving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex h-[calc(100vh-10rem)] items-center justify-center rounded-2xl border border-black/[.06] bg-white shadow-sm">
        <Loader2 className="h-6 w-6 animate-spin text-[#5B4FE9]" strokeWidth={2} />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-foreground/55">Invite staff, assign roles, and manage who can access your account.</p>
        <button
          type="button"
          onClick={() => setShowInvite(true)}
          className="flex items-center gap-1.5 rounded-xl bg-gradient-to-br from-[#5B4FE9] to-[#7C6FF5] px-4 py-2.5 text-xs font-semibold text-white shadow-sm hover:opacity-90"
        >
          <UserPlus className="h-3.5 w-3.5" strokeWidth={2.5} />
          Invite Member
        </button>
      </div>

      <div className="overflow-x-auto rounded-2xl border border-black/[.06] bg-white shadow-sm">
        <div className="min-w-[560px]">
          <div className="flex items-center gap-4 border-b border-black/[.06] px-4 py-3 text-[11px] font-semibold uppercase tracking-wide text-foreground/40">
            <span className="flex-1">Member</span>
            <span className="w-32 shrink-0">Role</span>
            <span className="w-24 shrink-0">Status</span>
            <span className="w-10 shrink-0 text-right">Actions</span>
          </div>

          {members.map((m) => (
            <div key={m.id} className="flex items-center gap-4 border-b border-black/[.04] px-4 py-3 last:border-b-0 hover:bg-black/[.01]">
              <div className="flex min-w-0 flex-1 items-center gap-3">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-indigo-300 to-purple-400 text-xs font-bold text-white">
                  {initials(m.name) || <Mail className="h-3.5 w-3.5" strokeWidth={2} />}
                </span>
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-foreground">{m.name || m.email}</p>
                  <p className="truncate text-xs text-foreground/45">{m.email}</p>
                </div>
              </div>

              <div className="w-32 shrink-0">
                {m.role === "owner" ? (
                  <span className="rounded-full bg-indigo-50 px-2.5 py-1 text-[11px] font-semibold text-[#5B4FE9]">Owner</span>
                ) : (
                  <select
                    value={m.role}
                    disabled={roleUpdatingId === m.id}
                    onChange={(e) => handleRoleChange(m, e.target.value as TeamRole)}
                    className="rounded-lg border border-black/[.1] bg-white px-2 py-1.5 text-xs font-medium text-foreground/70 focus:outline-none focus:ring-2 focus:ring-[#5B4FE9]/25 disabled:opacity-50"
                  >
                    <option value="admin">{ROLE_LABEL.admin}</option>
                    <option value="staff">{ROLE_LABEL.staff}</option>
                  </select>
                )}
              </div>

              <div className="w-24 shrink-0">
                <span
                  className={`rounded-full px-2.5 py-1 text-[11px] font-medium capitalize ${
                    m.status === "active" ? "bg-emerald-50 text-emerald-600" : "bg-amber-50 text-amber-600"
                  }`}
                >
                  {m.status === "invited" ? "Pending" : "Active"}
                </span>
              </div>

              <div className="flex w-10 shrink-0 justify-end">
                {m.role !== "owner" && (
                  <button
                    type="button"
                    onClick={() => setRemoveTarget(m)}
                    aria-label={`Remove ${m.name || m.email}`}
                    className="flex h-7 w-7 items-center justify-center rounded-lg text-foreground/40 hover:bg-red-50 hover:text-red-600"
                  >
                    <UserX className="h-3.5 w-3.5" strokeWidth={2} />
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      <AnimatePresence>
        {showInvite && (
          <InviteMemberModal
            onClose={() => {
              setShowInvite(false);
              setInviteError(null);
            }}
            onInvite={handleInvite}
            inviting={inviting}
            error={inviteError}
          />
        )}
        {removeTarget && (
          <RemoveMemberModal
            name={removeTarget.name || removeTarget.email}
            onClose={() => {
              setRemoveTarget(null);
              setRemoveError(null);
            }}
            onConfirm={handleRemove}
            removing={removing}
            error={removeError}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
