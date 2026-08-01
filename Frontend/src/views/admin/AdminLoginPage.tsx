"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { motion, type Variants } from "framer-motion";
import { Eye, EyeOff, Loader2 } from "lucide-react";
import { ApiError, adminLogin } from "@/lib/api";
import { setAdminToken } from "@/lib/adminAuth";

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

export default function AdminLoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [status, setStatus] = useState<"idle" | "loading">("idle");
  const [errors, setErrors] = useState<Partial<Record<"email" | "password" | "submit", string>>>({});

  const clearError = (key: "email" | "password") => {
    if (errors[key]) setErrors((prev) => ({ ...prev, [key]: undefined }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const fieldErrors: typeof errors = {};
    if (!isValidEmail(email)) fieldErrors.email = "Enter a valid email";
    if (!password) fieldErrors.password = "Enter your password";
    if (Object.keys(fieldErrors).length > 0) {
      setErrors(fieldErrors);
      return;
    }

    setStatus("loading");
    setErrors({});
    try {
      const { token } = await adminLogin({ email, password });
      setAdminToken(token);
      router.push("/admin");
    } catch (err) {
      setStatus("idle");
      setErrors({
        submit: err instanceof ApiError ? err.message : "Couldn't log in. Please try again.",
      });
    }
  };

  return (
    <main className="flex min-h-screen items-center justify-center bg-zinc-950 px-4 py-16">
      <motion.div
        initial="hidden"
        animate="show"
        variants={container}
        className="w-full max-w-sm rounded-2xl border border-white/10 bg-zinc-900 p-6 shadow-2xl sm:p-8"
      >
        <motion.div variants={item} className="flex flex-col items-center text-center">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo-icon.png" alt="" className="h-11 w-auto" />
          <h1 className="mt-3 text-lg font-bold text-white">Exofe Admin</h1>
          <p className="mt-1 text-xs text-white/40">Internal access only</p>
        </motion.div>

        <motion.form variants={item} onSubmit={handleSubmit} noValidate className="mt-6 flex flex-col gap-4">
          <div>
            <label className="text-xs font-semibold text-white/60">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => {
                setEmail(e.target.value);
                clearError("email");
              }}
              placeholder="you@exofe.com"
              className={`mt-1.5 w-full rounded-lg border bg-white/5 px-3.5 py-2.5 text-sm text-white placeholder:text-white/25 focus:outline-none focus:ring-2 focus:ring-[#45157b]/40 ${
                errors.email ? "border-red-500/60" : "border-white/10"
              }`}
            />
            {errors.email && <p className="mt-1 text-xs text-red-400">{errors.email}</p>}
          </div>

          <div>
            <label className="text-xs font-semibold text-white/60">Password</label>
            <div className="relative mt-1.5">
              <input
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  clearError("password");
                }}
                placeholder="Enter your password"
                className={`w-full rounded-lg border bg-white/5 px-3.5 py-2.5 pr-10 text-sm text-white placeholder:text-white/25 focus:outline-none focus:ring-2 focus:ring-[#45157b]/40 ${
                  errors.password ? "border-red-500/60" : "border-white/10"
                }`}
              />
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                aria-label={showPassword ? "Hide password" : "Show password"}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-white/30 hover:text-white/60"
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
            {errors.password && <p className="mt-1 text-xs text-red-400">{errors.password}</p>}
          </div>

          {errors.submit && <p className="rounded-lg bg-red-500/10 p-3 text-sm text-red-400">{errors.submit}</p>}

          <motion.button
            type="submit"
            disabled={status === "loading"}
            whileHover={{ scale: 1.01 }}
            whileTap={{ scale: 0.98 }}
            className="mt-1 flex w-full items-center justify-center gap-2 rounded-lg bg-[#45157b] py-2.5 text-sm font-semibold text-white shadow-lg shadow-[#45157b]/20 transition-colors hover:opacity-90 disabled:opacity-70"
          >
            {status === "loading" && <Loader2 className="h-4 w-4 animate-spin" strokeWidth={2.4} />}
            {status === "loading" ? "Logging in..." : "Log in"}
          </motion.button>
        </motion.form>
      </motion.div>
    </main>
  );
}
