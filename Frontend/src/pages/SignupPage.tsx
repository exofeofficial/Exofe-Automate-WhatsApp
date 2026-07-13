"use client";

import { useState } from "react";
import Link from "next/link";
import { motion, type Variants } from "framer-motion";
import { CheckCircle2, Eye, EyeOff, Loader2 } from "lucide-react";
import { ApiError, signUp, signUpWithProvider, type SignUpPayload } from "@/lib/api";
import { COUNTRIES, PHONE_PLACEHOLDER } from "@/lib/countries";

const EASE = [0.22, 1, 0.36, 1] as const;

const container: Variants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.1, delayChildren: 0.05 } },
};

const item: Variants = {
  hidden: { y: 20, opacity: 0 },
  show: { y: 0, opacity: 1, transition: { duration: 0.5, ease: EASE } },
};

const HEAR_OPTIONS = ["Google Search", "Social Media", "Friend or Colleague", "Other"];

const VALUE_PROPS = [
  "Run WhatsApp order automation across Pakistan, South Korea, and the UAE from one dashboard",
  "Become 10x more productive with Exofe AI: auto-replies, catalog Q&A, and order bots",
  "Collaborate with your team in one shared inbox, synced in real time",
  "Enterprise-grade reliability with secure Cloud API infrastructure",
];

type FormState = {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  countryCode: (typeof COUNTRIES)[number]["code"];
  phone: string;
  hearAbout: string;
};

const initialForm: FormState = {
  firstName: "",
  lastName: "",
  email: "",
  password: "",
  countryCode: "PK",
  phone: "",
  hearAbout: "",
};

type Errors = Partial<Record<keyof FormState | "submit", string>>;

function validate(form: FormState): Errors {
  const errors: Errors = {};

  if (!form.firstName.trim()) errors.firstName = "Required";
  if (!form.lastName.trim()) errors.lastName = "Required";

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) {
    errors.email = "Enter a valid email";
  }

  if (form.password.length < 8) {
    errors.password = "At least 8 characters";
  } else if (!/\d/.test(form.password)) {
    errors.password = "Add at least one number";
  }

  const country = COUNTRIES.find((c) => c.code === form.countryCode)!;
  const digits = form.phone.replace(/\D/g, "");
  if (digits.length < country.minDigits || digits.length > country.maxDigits) {
    errors.phone = `Enter a valid ${country.label} number`;
  }

  if (!form.hearAbout) errors.hearAbout = "Please select one";

  return errors;
}

export default function SignupPage() {
  const [form, setForm] = useState<FormState>(initialForm);
  const [errors, setErrors] = useState<Errors>({});
  const [status, setStatus] = useState<"idle" | "loading" | "done">("idle");
  const [showPassword, setShowPassword] = useState(false);
  const [socialNotice, setSocialNotice] = useState<string | null>(null);

  const setField = <K extends keyof FormState>(key: K, value: FormState[K]) => {
    setForm((prev) => ({ ...prev, [key]: value }));
    // clear the field's error as soon as they start fixing it
    if (errors[key]) setErrors((prev) => ({ ...prev, [key]: undefined }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const fieldErrors = validate(form);
    if (Object.keys(fieldErrors).length > 0) {
      setErrors(fieldErrors);
      return;
    }

    setStatus("loading");
    setErrors({});

    const payload: SignUpPayload = {
      firstName: form.firstName.trim(),
      lastName: form.lastName.trim(),
      email: form.email.trim(),
      password: form.password,
      countryCode: form.countryCode,
      phone: form.phone.replace(/\D/g, ""),
      hearAbout: form.hearAbout,
    };

    try {
      await signUp(payload);
      setStatus("done");
    } catch (err) {
      setStatus("idle");
      if (err instanceof ApiError && err.fields) {
        setErrors(err.fields as Errors);
      } else {
        setErrors({
          submit: err instanceof ApiError ? err.message : "Something went wrong. Please try again.",
        });
      }
    }
  };

  const handleSocial = async (provider: "google" | "facebook") => {
    setSocialNotice(null);
    try {
      await signUpWithProvider(provider);
    } catch (err) {
      setSocialNotice(err instanceof ApiError ? err.message : "Something went wrong.");
    }
  };

  if (status === "done") {
    return (
      <main className="flex min-h-[80vh] items-center justify-center px-4">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: EASE }}
          className="w-full max-w-md rounded-2xl border border-black/[.06] bg-white p-8 text-center shadow-xl shadow-indigo-900/10"
        >
          <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-emerald-50">
            <CheckCircle2 className="h-7 w-7 text-emerald-500" strokeWidth={2} />
          </span>
          <h1 className="mt-5 text-xl font-bold text-foreground">You&apos;re in!</h1>
          <p className="mt-2 text-sm text-foreground/60">
            Check {form.email} to confirm your account and get started.
          </p>
        </motion.div>
      </main>
    );
  }

  return (
    <main className="bg-zinc-50 px-4 py-16 sm:px-6 lg:py-20">
      <div className="mx-auto grid w-full max-w-6xl grid-cols-1 items-start gap-10 lg:grid-cols-2 lg:gap-16">
        {/* form goes first in the DOM so it's what mobile users see immediately */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: EASE }}
          className="order-1 w-full rounded-2xl border border-black/[.06] bg-white p-6 shadow-xl shadow-indigo-900/10 sm:p-8 lg:order-2"
        >
          <h1 className="text-xl font-bold text-foreground">Start your free trial</h1>
          <p className="mt-1 text-sm text-foreground/55">Get started with a free Exofe account.</p>

          <div className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-2">
            <button
              type="button"
              onClick={() => handleSocial("google")}
              className="flex items-center justify-center gap-2 rounded-xl border border-black/[.1] py-2.5 text-sm font-medium text-foreground/80 transition-colors hover:bg-black/[.03]"
            >
              <svg width="16" height="16" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M23.5 12.3c0-.8-.07-1.6-.2-2.3H12v4.4h6.5c-.28 1.5-1.13 2.8-2.4 3.6v3h3.9c2.28-2.1 3.6-5.2 3.6-8.7Z" />
                <path fill="#34A853" d="M12 24c3.24 0 5.96-1.07 7.95-2.9l-3.9-3c-1.08.73-2.47 1.16-4.05 1.16-3.11 0-5.75-2.1-6.69-4.92H1.28v3.09C3.25 21.3 7.3 24 12 24Z" />
                <path fill="#FBBC05" d="M5.31 14.34a7.2 7.2 0 0 1 0-4.62V6.63H1.28a12 12 0 0 0 0 10.8l4.03-3.09Z" />
                <path fill="#EA4335" d="M12 4.75c1.76 0 3.34.6 4.58 1.79l3.44-3.44C17.95 1.19 15.24 0 12 0 7.3 0 3.25 2.7 1.28 6.63l4.03 3.09C6.25 6.9 8.89 4.75 12 4.75Z" />
              </svg>
              Google
            </button>
            <button
              type="button"
              onClick={() => handleSocial("facebook")}
              className="flex items-center justify-center gap-2 rounded-xl border border-black/[.1] py-2.5 text-sm font-medium text-foreground/80 transition-colors hover:bg-black/[.03]"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="#1877F2">
                <path d="M24 12.07C24 5.4 18.63 0 12 0S0 5.4 0 12.07C0 18.1 4.39 23.1 10.13 24v-8.44H7.08v-3.49h3.05V9.41c0-3.02 1.79-4.7 4.53-4.7 1.31 0 2.68.24 2.68.24v2.97h-1.51c-1.49 0-1.95.93-1.95 1.89v2.26h3.32l-.53 3.49h-2.79V24C19.61 23.1 24 18.1 24 12.07Z" />
              </svg>
              Facebook
            </button>
          </div>

          {socialNotice && <p className="mt-3 text-center text-xs text-amber-600">{socialNotice}</p>}

          <div className="mt-6 flex items-center gap-3 text-xs text-foreground/40">
            <span className="h-px flex-1 bg-black/[.08]" />
            or sign up with email
            <span className="h-px flex-1 bg-black/[.08]" />
          </div>

          <form onSubmit={handleSubmit} noValidate className="mt-6 flex flex-col gap-4">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label className="text-xs font-semibold text-foreground/70">* First Name</label>
                <input
                  type="text"
                  value={form.firstName}
                  onChange={(e) => setField("firstName", e.target.value)}
                  className={`mt-1.5 w-full rounded-lg border px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#5B4FE9]/30 ${
                    errors.firstName ? "border-red-400" : "border-black/[.12]"
                  }`}
                />
                {errors.firstName && <p className="mt-1 text-xs text-red-500">{errors.firstName}</p>}
              </div>
              <div>
                <label className="text-xs font-semibold text-foreground/70">* Last Name</label>
                <input
                  type="text"
                  value={form.lastName}
                  onChange={(e) => setField("lastName", e.target.value)}
                  className={`mt-1.5 w-full rounded-lg border px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#5B4FE9]/30 ${
                    errors.lastName ? "border-red-400" : "border-black/[.12]"
                  }`}
                />
                {errors.lastName && <p className="mt-1 text-xs text-red-500">{errors.lastName}</p>}
              </div>
            </div>

            <div>
              <label className="text-xs font-semibold text-foreground/70">* Business Email Address</label>
              <input
                type="email"
                value={form.email}
                onChange={(e) => setField("email", e.target.value)}
                className={`mt-1.5 w-full rounded-lg border px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#5B4FE9]/30 ${
                  errors.email ? "border-red-400" : "border-black/[.12]"
                }`}
              />
              {errors.email && <p className="mt-1 text-xs text-red-500">{errors.email}</p>}
            </div>

            <div>
              <label className="text-xs font-semibold text-foreground/70">* Password</label>
              <div className="relative mt-1.5">
                <input
                  type={showPassword ? "text" : "password"}
                  value={form.password}
                  onChange={(e) => setField("password", e.target.value)}
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

            <div>
              <label className="text-xs font-semibold text-foreground/70">* Phone Number</label>
              <div className="mt-1.5 flex gap-2">
                <select
                  value={form.countryCode}
                  onChange={(e) => setField("countryCode", e.target.value as FormState["countryCode"])}
                  className="w-28 shrink-0 rounded-lg border border-black/[.12] px-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#5B4FE9]/30"
                >
                  {COUNTRIES.map((c) => (
                    <option key={c.code} value={c.code}>
                      {c.flag} {c.dial}
                    </option>
                  ))}
                </select>
                <input
                  type="tel"
                  inputMode="numeric"
                  value={form.phone}
                  onChange={(e) => setField("phone", e.target.value)}
                  placeholder={PHONE_PLACEHOLDER[form.countryCode]}
                  className={`flex-1 rounded-lg border px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#5B4FE9]/30 ${
                    errors.phone ? "border-red-400" : "border-black/[.12]"
                  }`}
                />
              </div>
              {errors.phone && <p className="mt-1 text-xs text-red-500">{errors.phone}</p>}
            </div>

            <div>
              <label className="text-xs font-semibold text-foreground/70">* How did you hear about Exofe?</label>
              <select
                value={form.hearAbout}
                onChange={(e) => setField("hearAbout", e.target.value)}
                className={`mt-1.5 w-full rounded-lg border bg-white px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#5B4FE9]/30 ${
                  errors.hearAbout ? "border-red-400" : "border-black/[.12]"
                } ${form.hearAbout ? "text-foreground" : "text-foreground/40"}`}
              >
                <option value="" disabled>
                  Select
                </option>
                {HEAR_OPTIONS.map((opt) => (
                  <option key={opt} value={opt} className="text-foreground">
                    {opt}
                  </option>
                ))}
              </select>
              {errors.hearAbout && <p className="mt-1 text-xs text-red-500">{errors.hearAbout}</p>}
            </div>

            <p className="rounded-lg bg-black/[.03] p-3 text-xs leading-relaxed text-foreground/50">
              By signing up, you agree to Exofe&apos;s{" "}
              <Link href="/terms" className="font-medium text-[#5B4FE9] underline underline-offset-2">
                Terms & Conditions
              </Link>{" "}
              and{" "}
              <Link href="/privacy" className="font-medium text-[#5B4FE9] underline underline-offset-2">
                Privacy Policy
              </Link>
              .
            </p>

            {errors.submit && (
              <p className="rounded-lg bg-red-50 p-3 text-sm text-red-600">{errors.submit}</p>
            )}

            <motion.button
              type="submit"
              disabled={status === "loading"}
              whileHover={{ scale: 1.01 }}
              whileTap={{ scale: 0.98 }}
              className="mt-1 flex w-full items-center justify-center gap-2 rounded-full bg-[#5B4FE9] py-3 text-sm font-semibold text-white shadow-lg shadow-indigo-900/20 transition-colors hover:bg-[#4a3fd6] disabled:opacity-70"
            >
              {status === "loading" && <Loader2 className="h-4 w-4 animate-spin" strokeWidth={2.4} />}
              {status === "loading" ? "Creating account..." : "Start My Trial"}
            </motion.button>

            <p className="text-center text-sm text-foreground/55">
              Already have an account?{" "}
              <Link href="/login" className="font-semibold text-[#5B4FE9] hover:underline">
                Login
              </Link>
            </p>
          </form>
        </motion.div>

        {/* marketing panel */}
        <motion.div
          initial="hidden"
          animate="show"
          variants={container}
          className="order-2 flex flex-col justify-center lg:order-1"
        >
          <motion.h2 variants={item} className="text-3xl font-extrabold leading-tight tracking-tight text-foreground sm:text-4xl">
            WhatsApp orders made simple,
            <br />
            <span className="text-[#5B4FE9]">powered by AI</span>
          </motion.h2>

          <ul className="mt-8 flex flex-col gap-4">
            {VALUE_PROPS.map((text) => (
              <motion.li key={text} variants={item} className="flex items-start gap-3">
                <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-emerald-100">
                  <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" strokeWidth={2.5} />
                </span>
                <span className="text-sm text-foreground/70">{text}</span>
              </motion.li>
            ))}
          </ul>
        </motion.div>
      </div>
    </main>
  );
}
