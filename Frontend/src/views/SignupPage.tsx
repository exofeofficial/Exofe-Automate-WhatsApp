"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion, type Variants } from "framer-motion";
import { CheckCircle2, Eye, EyeOff, Loader2, MailCheck } from "lucide-react";
import { ApiError, googleAuth, signUp, signUpWithProvider, verifyEmail, type SignUpPayload } from "@/lib/api";
import { COUNTRIES, PHONE_PLACEHOLDER } from "@/lib/countries";
import { setToken } from "@/lib/auth";
import { setUserProfile } from "@/lib/user";
import { decodeGoogleIdToken } from "@/lib/google";
import Dropdown from "@/components/ui/Dropdown";
import BrandLogo from "@/components/BrandLogo";
import CodeInput from "@/components/ui/CodeInput";
import GoogleSignInButton from "@/components/GoogleSignInButton";

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
  const router = useRouter();
  const [form, setForm] = useState<FormState>(initialForm);
  const [errors, setErrors] = useState<Errors>({});
  const [status, setStatus] = useState<"idle" | "loading" | "done">("idle");
  const [showPassword, setShowPassword] = useState(false);
  const [socialNotice, setSocialNotice] = useState<string | null>(null);

  const [pendingToken, setPendingToken] = useState<string | null>(null);
  const [code, setCode] = useState("");
  const [verifyStatus, setVerifyStatus] = useState<"idle" | "loading">("idle");
  const [verifyError, setVerifyError] = useState<string | null>(null);

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!/^\d{6}$/.test(code)) {
      setVerifyError("Enter the 6-digit code");
      return;
    }

    setVerifyStatus("loading");
    setVerifyError(null);
    try {
      await verifyEmail(form.email, code);
      // Only now does the account actually become usable — the token from
      // signup is withheld from storage until the email is confirmed.
      if (pendingToken) setToken(pendingToken);
      router.push("/dashboard");
    } catch (err) {
      setVerifyStatus("idle");
      setCode("");
      setVerifyError(err instanceof ApiError ? err.message : "That code didn't work. Please try again.");
    }
  };

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
      const { token } = await signUp(payload);
      setPendingToken(token);
      setUserProfile({ firstName: payload.firstName, lastName: payload.lastName, email: payload.email });
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

  const handleGoogleCredential = async (idToken: string) => {
    setSocialNotice(null);
    try {
      const { token } = await googleAuth(idToken);
      // Google already verifies the email, so unlike the password signup
      // flow there's no code-entry step — straight to the dashboard.
      setToken(token);
      const info = decodeGoogleIdToken(idToken);
      if (info) setUserProfile(info);
      router.push("/dashboard");
    } catch (err) {
      setSocialNotice(err instanceof ApiError ? err.message : "Something went wrong.");
    }
  };

  const handleSocial = async (provider: "facebook") => {
    setSocialNotice(null);
    try {
      await signUpWithProvider(provider);
    } catch (err) {
      setSocialNotice(err instanceof ApiError ? err.message : "Something went wrong.");
    }
  };

  if (status === "done") {
    return (
      <main className="flex min-h-[80vh] flex-col items-center justify-center px-4">
        <BrandLogo className="mb-8" />
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: EASE }}
          className="w-full max-w-md overflow-hidden rounded-2xl border border-black/[.06] bg-white shadow-xl shadow-indigo-900/10"
        >
          <div className="bg-gradient-to-br from-[#5B4FE9] to-[#4338CA] px-8 pb-8 pt-9 text-center">
            <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-white/15 backdrop-blur">
              <MailCheck className="h-7 w-7 text-white" strokeWidth={2} />
            </span>
            <h1 className="mt-4 text-xl font-bold text-white">Verify your email</h1>
            <p className="mt-1.5 text-sm text-white/70">
              Enter the 6-digit code we sent to
              <br />
              <span className="font-semibold text-white">{form.email}</span>
            </p>
          </div>

          <div className="px-8 py-8">
            <form onSubmit={handleVerify} noValidate className="flex flex-col items-center gap-5">
              <CodeInput
                value={code}
                onChange={(v) => {
                  setCode(v);
                  if (verifyError) setVerifyError(null);
                }}
                error={!!verifyError}
                disabled={verifyStatus === "loading"}
              />
              {verifyError && <p className="-mt-2 text-center text-xs font-medium text-red-500">{verifyError}</p>}

              <motion.button
                type="submit"
                disabled={verifyStatus === "loading" || code.length !== 6}
                whileHover={{ scale: 1.01 }}
                whileTap={{ scale: 0.98 }}
                className="flex w-full items-center justify-center gap-2 rounded-full bg-[#5B4FE9] py-3 text-sm font-semibold text-white shadow-lg shadow-indigo-900/20 transition-colors hover:bg-[#4a3fd6] disabled:opacity-50"
              >
                {verifyStatus === "loading" && <Loader2 className="h-4 w-4 animate-spin" strokeWidth={2.4} />}
                {verifyStatus === "loading" ? "Verifying..." : "Verify & Continue"}
              </motion.button>
            </form>

            <p className="mt-5 text-center text-xs leading-relaxed text-foreground/45">
              You need to verify your email before you can access your account.
              Check your spam folder if it hasn&apos;t arrived.
            </p>
          </div>
        </motion.div>
      </main>
    );
  }

  return (
    <main className="bg-zinc-50 px-4 py-10 sm:px-6 sm:py-16 lg:py-20">
      <div className="mx-auto w-full max-w-6xl">
        <BrandLogo className="mb-8 justify-center lg:justify-start" />
      </div>
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
            <GoogleSignInButton onCredential={handleGoogleCredential} text="signup_with" />
            <button
              type="button"
              onClick={() => handleSocial("facebook")}
              className="flex items-center justify-center gap-2 rounded border border-black/[.1] py-2.5 text-sm font-medium text-foreground/80 transition-colors hover:bg-black/[.03]"
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
              <div className="mt-1.5 flex flex-col gap-2 sm:flex-row">
                <Dropdown
                  value={form.countryCode}
                  onChange={(v) => setField("countryCode", v as FormState["countryCode"])}
                  options={COUNTRIES.map((c) => ({ value: c.code, label: `${c.flag} ${c.dial}` }))}
                  placeholder="Country"
                  className="w-full shrink-0 sm:w-28"
                />
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
              <Dropdown
                value={form.hearAbout}
                onChange={(v) => setField("hearAbout", v)}
                options={HEAR_OPTIONS.map((opt) => ({ value: opt, label: opt }))}
                placeholder="Select"
                error={!!errors.hearAbout}
                className="mt-1.5"
              />
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
          className="order-2 hidden flex-col justify-center lg:order-1 lg:flex"
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
