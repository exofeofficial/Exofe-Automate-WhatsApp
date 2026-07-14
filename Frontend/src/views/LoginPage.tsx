"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion, type Variants } from "framer-motion";
import { Eye, EyeOff, Loader2, Mail } from "lucide-react";
import { ApiError, login, loginWithProvider, requestOtp, verifyOtp } from "@/lib/api";
import { setToken } from "@/lib/auth";
import { ensureUserProfile } from "@/lib/user";

const EASE = [0.22, 1, 0.36, 1] as const;

const container: Variants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.08, delayChildren: 0.05 } },
};

const item: Variants = {
  hidden: { y: 16, opacity: 0 },
  show: { y: 0, opacity: 1, transition: { duration: 0.4, ease: EASE } },
};

type Mode = "password" | "otp-request" | "otp-verify";
type Errors = Partial<Record<"email" | "password" | "code" | "submit", string>>;

function isValidEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

export default function LoginPage() {
  const router = useRouter();
  const [mode, setMode] = useState<Mode>("password");
  const [status, setStatus] = useState<"idle" | "loading">("idle");
  const [errors, setErrors] = useState<Errors>({});
  const [socialNotice, setSocialNotice] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [rememberMe, setRememberMe] = useState(true);
  const [code, setCode] = useState("");

  const clearError = (key: keyof Errors) => {
    if (errors[key]) setErrors((prev) => ({ ...prev, [key]: undefined }));
  };

  const handlePasswordLogin = async (e: React.FormEvent) => {
    e.preventDefault();

    const fieldErrors: Errors = {};
    if (!isValidEmail(email)) fieldErrors.email = "Enter a valid email";
    if (!password) fieldErrors.password = "Enter your password";
    if (Object.keys(fieldErrors).length > 0) {
      setErrors(fieldErrors);
      return;
    }

    setStatus("loading");
    setErrors({});
    try {
      const { token } = await login({ email, password });
      setToken(token);
      ensureUserProfile(email);
      router.push("/dashboard");
    } catch (err) {
      setStatus("idle");
      setErrors({
        submit: err instanceof ApiError ? err.message : "Couldn't log in. Please try again.",
      });
    }
  };

  const handleRequestOtp = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!isValidEmail(email)) {
      setErrors({ email: "Enter a valid email" });
      return;
    }

    setStatus("loading");
    setErrors({});
    try {
      await requestOtp(email);
      setMode("otp-verify");
      setStatus("idle");
    } catch (err) {
      setStatus("idle");
      setErrors({
        submit: err instanceof ApiError ? err.message : "Couldn't send the code. Please try again.",
      });
    }
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!/^\d{6}$/.test(code)) {
      setErrors({ code: "Enter the 6-digit code" });
      return;
    }

    setStatus("loading");
    setErrors({});
    try {
      const { token } = await verifyOtp(email, code);
      setToken(token);
      ensureUserProfile(email);
      router.push("/dashboard");
    } catch (err) {
      setStatus("idle");
      setErrors({
        submit: err instanceof ApiError ? err.message : "That code didn't work. Please try again.",
      });
    }
  };

  const handleGoogle = async () => {
    setSocialNotice(null);
    try {
      await loginWithProvider("google");
    } catch (err) {
      setSocialNotice(err instanceof ApiError ? err.message : "Something went wrong.");
    }
  };

  return (
    <main className="flex min-h-[80vh] items-center justify-center bg-zinc-50 px-4 py-16">
      <motion.div
        initial="hidden"
        animate="show"
        variants={container}
        className="w-full max-w-md rounded-2xl border border-black/[.06] bg-white p-6 shadow-xl shadow-indigo-900/10 sm:p-8"
      >
        <motion.h1 variants={item} className="text-xl font-bold text-foreground">
          Log in to your account
        </motion.h1>

        {mode === "password" && (
          <motion.form variants={item} onSubmit={handlePasswordLogin} noValidate className="mt-6 flex flex-col gap-4">
            <div>
              <label className="text-xs font-semibold text-foreground/70">Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  clearError("email");
                }}
                placeholder="Enter your email"
                className={`mt-1.5 w-full rounded-lg border px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#5B4FE9]/30 ${
                  errors.email ? "border-red-400" : "border-black/[.12]"
                }`}
              />
              {errors.email && <p className="mt-1 text-xs text-red-500">{errors.email}</p>}
            </div>

            <div>
              <label className="text-xs font-semibold text-foreground/70">Password</label>
              <div className="relative mt-1.5">
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    clearError("password");
                  }}
                  placeholder="Enter your password"
                  className={`w-full rounded-lg border px-3.5 py-2.5 pr-10 text-sm focus:outline-none focus:ring-2 focus:ring-[#5B4FE9]/30 ${
                    errors.password ? "border-red-400" : "border-black/[.12]"
                  }`}
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
              {errors.password && <p className="mt-1 text-xs text-red-500">{errors.password}</p>}
            </div>

            <div className="flex items-center justify-between">
              <label className="flex items-center gap-2 text-sm text-foreground/70">
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="h-4 w-4 rounded border-black/[.2] text-[#5B4FE9] focus:ring-[#5B4FE9]/30"
                />
                Remember me
              </label>
              <Link href="/forgot-password" className="text-sm font-medium text-[#5B4FE9] hover:underline">
                Forgot password?
              </Link>
            </div>

            {errors.submit && <p className="rounded-lg bg-red-50 p-3 text-sm text-red-600">{errors.submit}</p>}

            <motion.button
              type="submit"
              disabled={status === "loading"}
              whileHover={{ scale: 1.01 }}
              whileTap={{ scale: 0.98 }}
              className="flex w-full items-center justify-center gap-2 rounded-full bg-[#5B4FE9] py-3 text-sm font-semibold text-white shadow-lg shadow-indigo-900/20 transition-colors hover:bg-[#4a3fd6] disabled:opacity-70"
            >
              {status === "loading" && <Loader2 className="h-4 w-4 animate-spin" strokeWidth={2.4} />}
              {status === "loading" ? "Logging in..." : "Login"}
            </motion.button>
          </motion.form>
        )}

        {mode === "otp-request" && (
          <motion.form variants={item} onSubmit={handleRequestOtp} noValidate className="mt-6 flex flex-col gap-4">
            <div>
              <label className="text-xs font-semibold text-foreground/70">Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  clearError("email");
                }}
                placeholder="Enter your email"
                className={`mt-1.5 w-full rounded-lg border px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#5B4FE9]/30 ${
                  errors.email ? "border-red-400" : "border-black/[.12]"
                }`}
              />
              {errors.email && <p className="mt-1 text-xs text-red-500">{errors.email}</p>}
            </div>

            {errors.submit && <p className="rounded-lg bg-red-50 p-3 text-sm text-red-600">{errors.submit}</p>}

            <motion.button
              type="submit"
              disabled={status === "loading"}
              whileHover={{ scale: 1.01 }}
              whileTap={{ scale: 0.98 }}
              className="flex w-full items-center justify-center gap-2 rounded-full bg-[#5B4FE9] py-3 text-sm font-semibold text-white shadow-lg shadow-indigo-900/20 transition-colors hover:bg-[#4a3fd6] disabled:opacity-70"
            >
              {status === "loading" && <Loader2 className="h-4 w-4 animate-spin" strokeWidth={2.4} />}
              {status === "loading" ? "Sending code..." : "Send Code"}
            </motion.button>
          </motion.form>
        )}

        {mode === "otp-verify" && (
          <motion.form variants={item} onSubmit={handleVerifyOtp} noValidate className="mt-6 flex flex-col gap-4">
            <p className="text-sm text-foreground/60">
              Enter the 6-digit code we sent to <span className="font-semibold text-foreground">{email}</span>.
            </p>
            <div>
              <label className="text-xs font-semibold text-foreground/70">Code</label>
              <input
                type="text"
                inputMode="numeric"
                maxLength={6}
                value={code}
                onChange={(e) => {
                  setCode(e.target.value.replace(/\D/g, ""));
                  clearError("code");
                }}
                placeholder="123456"
                className={`mt-1.5 w-full rounded-lg border px-3.5 py-2.5 text-center text-lg tracking-[0.4em] focus:outline-none focus:ring-2 focus:ring-[#5B4FE9]/30 ${
                  errors.code ? "border-red-400" : "border-black/[.12]"
                }`}
              />
              {errors.code && <p className="mt-1 text-xs text-red-500">{errors.code}</p>}
            </div>

            {errors.submit && <p className="rounded-lg bg-red-50 p-3 text-sm text-red-600">{errors.submit}</p>}

            <motion.button
              type="submit"
              disabled={status === "loading"}
              whileHover={{ scale: 1.01 }}
              whileTap={{ scale: 0.98 }}
              className="flex w-full items-center justify-center gap-2 rounded-full bg-[#5B4FE9] py-3 text-sm font-semibold text-white shadow-lg shadow-indigo-900/20 transition-colors hover:bg-[#4a3fd6] disabled:opacity-70"
            >
              {status === "loading" && <Loader2 className="h-4 w-4 animate-spin" strokeWidth={2.4} />}
              {status === "loading" ? "Verifying..." : "Verify & Login"}
            </motion.button>

            <button
              type="button"
              onClick={() => setMode("otp-request")}
              className="text-center text-sm font-medium text-[#5B4FE9] hover:underline"
            >
              Didn&apos;t get a code? Resend
            </button>
          </motion.form>
        )}

        {mode === "password" && (
          <>
            <motion.div variants={item} className="mt-6 flex items-center gap-3 text-xs text-foreground/40">
              <span className="h-px flex-1 bg-black/[.08]" />
              OR
              <span className="h-px flex-1 bg-black/[.08]" />
            </motion.div>

            <motion.button
              variants={item}
              type="button"
              onClick={handleGoogle}
              className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl border border-black/[.1] py-2.5 text-sm font-medium text-foreground/80 transition-colors hover:bg-black/[.03]"
            >
              <svg width="16" height="16" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M23.5 12.3c0-.8-.07-1.6-.2-2.3H12v4.4h6.5c-.28 1.5-1.13 2.8-2.4 3.6v3h3.9c2.28-2.1 3.6-5.2 3.6-8.7Z" />
                <path fill="#34A853" d="M12 24c3.24 0 5.96-1.07 7.95-2.9l-3.9-3c-1.08.73-2.47 1.16-4.05 1.16-3.11 0-5.75-2.1-6.69-4.92H1.28v3.09C3.25 21.3 7.3 24 12 24Z" />
                <path fill="#FBBC05" d="M5.31 14.34a7.2 7.2 0 0 1 0-4.62V6.63H1.28a12 12 0 0 0 0 10.8l4.03-3.09Z" />
                <path fill="#EA4335" d="M12 4.75c1.76 0 3.34.6 4.58 1.79l3.44-3.44C17.95 1.19 15.24 0 12 0 7.3 0 3.25 2.7 1.28 6.63l4.03 3.09C6.25 6.9 8.89 4.75 12 4.75Z" />
              </svg>
              Login with Google
            </motion.button>

            {socialNotice && <p className="mt-3 text-center text-xs text-amber-600">{socialNotice}</p>}

            <motion.button
              variants={item}
              type="button"
              onClick={() => {
                setErrors({});
                setMode("otp-request");
              }}
              className="mt-4 flex w-full items-center justify-center gap-1.5 text-sm font-medium text-foreground/60 hover:text-foreground"
            >
              <Mail className="h-4 w-4" strokeWidth={2} />
              Login with OTP
            </motion.button>
          </>
        )}

        {mode !== "password" && (
          <motion.button
            variants={item}
            type="button"
            onClick={() => {
              setErrors({});
              setCode("");
              setMode("password");
            }}
            className="mt-4 w-full text-center text-sm font-medium text-foreground/60 hover:text-foreground"
          >
            Back to password login
          </motion.button>
        )}

        <motion.p variants={item} className="mt-6 text-center text-sm text-foreground/55">
          Don&apos;t have an account?{" "}
          <Link href="/signup" className="font-semibold text-[#5B4FE9] hover:underline">
            Sign Up
          </Link>
        </motion.p>
      </motion.div>
    </main>
  );
}
