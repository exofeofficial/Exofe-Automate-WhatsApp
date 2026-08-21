"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { motion, type Variants } from "framer-motion";
import { Eye, EyeOff, Loader2, MailWarning, UserPlus } from "lucide-react";
import { ApiError, acceptInvite, getInviteDetails, type InviteDetails } from "@/lib/api";
import { goToDashboard, setToken } from "@/lib/auth";
import BrandLogo from "@/components/BrandLogo";

const EASE = [0.22, 1, 0.36, 1] as const;

const container: Variants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.08, delayChildren: 0.05 } },
};

const item: Variants = {
  hidden: { y: 16, opacity: 0 },
  show: { y: 0, opacity: 1, transition: { duration: 0.4, ease: EASE } },
};

const ROLE_LABEL: Record<string, string> = { admin: "an Admin", staff: "Staff" };

export default function AcceptInvitePage() {
  const router = useRouter();
  const token = useSearchParams().get("token");

  const [loading, setLoading] = useState(true);
  const [details, setDetails] = useState<InviteDetails | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  useEffect(() => {
    if (!token) {
      setLoadError("This invite link is missing its token. Ask whoever invited you for a fresh link.");
      setLoading(false);
      return;
    }
    getInviteDetails(token)
      .then(setDetails)
      .catch((err) => setLoadError(err instanceof ApiError ? err.message : "Couldn't load this invite. Please try again."))
      .finally(() => setLoading(false));
  }, [token]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitError(null);

    if (!firstName.trim() || !lastName.trim()) {
      setSubmitError("Enter your first and last name");
      return;
    }
    if (password.length < 8 || !/\d/.test(password)) {
      setSubmitError("Password needs at least 8 characters and a number");
      return;
    }
    if (password !== confirmPassword) {
      setSubmitError("Passwords don't match");
      return;
    }
    if (!token) return;

    setSubmitting(true);
    try {
      const { token: authToken } = await acceptInvite({ token, firstName, lastName, password });
      setToken(authToken);
      goToDashboard(router);
    } catch (err) {
      setSubmitError(err instanceof ApiError ? err.message : "Couldn't complete setup. Please try again.");
      setSubmitting(false);
    }
  };

  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-zinc-50 px-4 py-10">
      <BrandLogo className="mb-8" />
      <motion.div
        initial="hidden"
        animate="show"
        variants={container}
        className="w-full max-w-md rounded-2xl border border-black/[.06] bg-white p-6 shadow-xl shadow-indigo-900/10 sm:p-8"
      >
        {loading && (
          <motion.div variants={item} className="flex flex-col items-center py-6 text-center">
            <Loader2 className="h-6 w-6 animate-spin text-[#45157b]" strokeWidth={2} />
          </motion.div>
        )}

        {!loading && loadError && (
          <motion.div variants={item} className="flex flex-col items-center text-center">
            <span className="flex h-14 w-14 items-center justify-center rounded-full bg-red-50">
              <MailWarning className="h-7 w-7 text-red-500" strokeWidth={2} />
            </span>
            <h1 className="mt-5 text-xl font-bold text-foreground">This invite isn&apos;t valid</h1>
            <p className="mt-2 text-sm text-foreground/60">{loadError}</p>
            <Link
              href="/login"
              className="mt-6 flex w-full items-center justify-center gap-2 rounded-full bg-[#45157b] py-3 text-sm font-semibold text-white shadow-lg shadow-indigo-900/20 transition-colors hover:opacity-90"
            >
              Back to Login
            </Link>
          </motion.div>
        )}

        {!loading && !loadError && details && (
          <>
            <motion.div variants={item} className="flex items-center gap-2">
              <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-50 text-[#45157b]">
                <UserPlus className="h-4 w-4" strokeWidth={2} />
              </span>
              <div>
                <h1 className="text-lg font-bold text-foreground">You&apos;re invited!</h1>
              </div>
            </motion.div>
            <motion.p variants={item} className="mt-2 text-sm text-foreground/55">
              You&apos;ve been invited to join <span className="font-semibold text-foreground">{details.businessName}</span> on
              Exofe as {ROLE_LABEL[details.role] ?? details.role}. Set up your account below —{" "}
              <span className="font-semibold text-foreground">{details.email}</span> will be your login email.
            </motion.p>

            <motion.form variants={item} onSubmit={handleSubmit} noValidate className="mt-6 flex flex-col gap-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-foreground/70">First Name</label>
                  <input
                    type="text"
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    placeholder="Sara"
                    className="mt-1.5 w-full rounded-lg border border-black/[.12] px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#45157b]/30"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-foreground/70">Last Name</label>
                  <input
                    type="text"
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    placeholder="Khan"
                    className="mt-1.5 w-full rounded-lg border border-black/[.12] px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#45157b]/30"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-foreground/70">Password</label>
                <div className="relative mt-1.5">
                  <input
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="At least 8 characters"
                    className="w-full rounded-lg border border-black/[.12] px-3.5 py-2.5 pr-10 text-sm focus:outline-none focus:ring-2 focus:ring-[#45157b]/30"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((v) => !v)}
                    aria-label={showPassword ? "Hide password" : "Show password"}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-foreground/40 hover:text-foreground/70"
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-foreground/70">Confirm Password</label>
                <input
                  type={showPassword ? "text" : "password"}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Re-enter your password"
                  className="mt-1.5 w-full rounded-lg border border-black/[.12] px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#45157b]/30"
                />
              </div>

              {submitError && <p className="text-center text-xs font-medium text-red-500">{submitError}</p>}

              <motion.button
                type="submit"
                disabled={submitting}
                whileHover={{ scale: 1.01 }}
                whileTap={{ scale: 0.98 }}
                className="flex w-full items-center justify-center gap-2 rounded-full bg-[#45157b] py-3 text-sm font-semibold text-white shadow-lg shadow-indigo-900/20 transition-colors hover:opacity-90 disabled:opacity-70"
              >
                {submitting && <Loader2 className="h-4 w-4 animate-spin" strokeWidth={2.4} />}
                {submitting ? "Setting up..." : "Join the team"}
              </motion.button>
            </motion.form>
          </>
        )}
      </motion.div>
    </main>
  );
}
