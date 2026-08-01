"use client";

import { useState } from "react";
import Link from "next/link";
import { motion, type Variants } from "framer-motion";
import { CheckCircle2, Eye, EyeOff, KeyRound, Loader2 } from "lucide-react";
import { ApiError, forgotPassword, resetPassword } from "@/lib/api";
import BrandLogo from "@/components/BrandLogo";
import CodeInput from "@/components/ui/CodeInput";

const EASE = [0.22, 1, 0.36, 1] as const;

const container: Variants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.08, delayChildren: 0.05 } },
};

const item: Variants = {
  hidden: { y: 16, opacity: 0 },
  show: { y: 0, opacity: 1, transition: { duration: 0.4, ease: EASE } },
};

function isValidEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

type Step = "email" | "reset" | "done";

export default function ForgotPasswordPage() {
  const [step, setStep] = useState<Step>("email");
  const [status, setStatus] = useState<"idle" | "loading">("idle");

  const [email, setEmail] = useState("");
  const [emailError, setEmailError] = useState<string | null>(null);

  const [code, setCode] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [resetError, setResetError] = useState<string | null>(null);
  const [resendNotice, setResendNotice] = useState<string | null>(null);

  const handleSendCode = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isValidEmail(email)) {
      setEmailError("Enter a valid email");
      return;
    }

    setStatus("loading");
    setEmailError(null);
    try {
      await forgotPassword(email);
      setStep("reset");
    } catch (err) {
      setEmailError(err instanceof ApiError ? err.message : "Something went wrong. Please try again.");
    } finally {
      setStatus("idle");
    }
  };

  const handleResend = async () => {
    setResendNotice(null);
    try {
      await forgotPassword(email);
      setResendNotice("A new code is on its way.");
    } catch {
      setResendNotice("Couldn't resend the code. Please try again.");
    }
  };

  const handleReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setResetError(null);

    if (!/^\d{6}$/.test(code)) {
      setResetError("Enter the 6-digit code");
      return;
    }
    if (password.length < 8 || !/\d/.test(password)) {
      setResetError("Password needs at least 8 characters and a number");
      return;
    }
    if (password !== confirmPassword) {
      setResetError("Passwords don't match");
      return;
    }

    setStatus("loading");
    try {
      await resetPassword(email, code, password);
      setStep("done");
    } catch (err) {
      setResetError(err instanceof ApiError ? err.message : "That code didn't work. Please try again.");
    } finally {
      setStatus("idle");
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
        {step === "email" && (
          <>
            <motion.h1 variants={item} className="text-xl font-bold text-foreground">
              Forgot your password?
            </motion.h1>
            <motion.p variants={item} className="mt-1.5 text-sm text-foreground/55">
              Enter your email and we&apos;ll send you a code to reset it.
            </motion.p>

            <motion.form variants={item} onSubmit={handleSendCode} noValidate className="mt-6 flex flex-col gap-4">
              <div>
                <label className="text-xs font-semibold text-foreground/70">Email</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value);
                    if (emailError) setEmailError(null);
                  }}
                  placeholder="Enter your email"
                  className={`mt-1.5 w-full rounded-lg border px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#45157b]/30 ${
                    emailError ? "border-red-400" : "border-black/[.12]"
                  }`}
                />
                {emailError && <p className="mt-1 text-xs text-red-500">{emailError}</p>}
              </div>

              <motion.button
                type="submit"
                disabled={status === "loading"}
                whileHover={{ scale: 1.01 }}
                whileTap={{ scale: 0.98 }}
                className="flex w-full items-center justify-center gap-2 rounded-full bg-[#45157b] py-3 text-sm font-semibold text-white shadow-lg shadow-indigo-900/20 transition-colors hover:opacity-90 disabled:opacity-70"
              >
                {status === "loading" && <Loader2 className="h-4 w-4 animate-spin" strokeWidth={2.4} />}
                {status === "loading" ? "Sending..." : "Send Reset Code"}
              </motion.button>
            </motion.form>
          </>
        )}

        {step === "reset" && (
          <>
            <motion.h1 variants={item} className="text-xl font-bold text-foreground">
              Enter your code
            </motion.h1>
            <motion.p variants={item} className="mt-1.5 text-sm text-foreground/55">
              We sent a 6-digit code to <span className="font-semibold text-foreground">{email}</span>. Enter it
              below with your new password.
            </motion.p>

            <motion.form variants={item} onSubmit={handleReset} noValidate className="mt-6 flex flex-col gap-4">
              <div className="flex justify-center">
                <CodeInput
                  value={code}
                  onChange={(v) => {
                    setCode(v);
                    if (resetError) setResetError(null);
                  }}
                  error={!!resetError}
                  disabled={status === "loading"}
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-foreground/70">New Password</label>
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
                  placeholder="Re-enter your new password"
                  className="mt-1.5 w-full rounded-lg border border-black/[.12] px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#45157b]/30"
                />
              </div>

              {resetError && <p className="text-center text-xs font-medium text-red-500">{resetError}</p>}

              <motion.button
                type="submit"
                disabled={status === "loading"}
                whileHover={{ scale: 1.01 }}
                whileTap={{ scale: 0.98 }}
                className="flex w-full items-center justify-center gap-2 rounded-full bg-[#45157b] py-3 text-sm font-semibold text-white shadow-lg shadow-indigo-900/20 transition-colors hover:opacity-90 disabled:opacity-70"
              >
                {status === "loading" && <Loader2 className="h-4 w-4 animate-spin" strokeWidth={2.4} />}
                {status === "loading" ? "Resetting..." : "Reset Password"}
              </motion.button>

              <button
                type="button"
                onClick={handleResend}
                className="text-center text-sm font-medium text-[#45157b] hover:underline"
              >
                Didn&apos;t get a code? Resend
              </button>
              {resendNotice && <p className="text-center text-xs text-foreground/50">{resendNotice}</p>}
            </motion.form>
          </>
        )}

        {step === "done" && (
          <motion.div variants={item} className="flex flex-col items-center text-center">
            <span className="flex h-14 w-14 items-center justify-center rounded-full bg-emerald-50">
              <CheckCircle2 className="h-7 w-7 text-emerald-500" strokeWidth={2} />
            </span>
            <h1 className="mt-5 text-xl font-bold text-foreground">Password reset!</h1>
            <p className="mt-2 text-sm text-foreground/60">
              Your password has been changed. You can now log in with your new password.
            </p>
            <Link
              href="/login"
              className="mt-6 flex w-full items-center justify-center gap-2 rounded-full bg-[#45157b] py-3 text-sm font-semibold text-white shadow-lg shadow-indigo-900/20 transition-colors hover:opacity-90"
            >
              <KeyRound className="h-4 w-4" strokeWidth={2} />
              Back to Login
            </Link>
          </motion.div>
        )}

        {step !== "done" && (
          <motion.p variants={item} className="mt-6 text-center text-sm text-foreground/55">
            Remembered your password?{" "}
            <Link href="/login" className="font-semibold text-[#45157b] hover:underline">
              Log In
            </Link>
          </motion.p>
        )}
      </motion.div>
    </main>
  );
}
