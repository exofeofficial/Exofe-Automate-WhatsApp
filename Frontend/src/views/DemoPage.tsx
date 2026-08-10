"use client";

import { useState } from "react";
import { motion, type Variants } from "framer-motion";
import { Check, CheckCircle2, Loader2 } from "lucide-react";
import { ApiError, bookDemo, type DemoBookingPayload } from "@/lib/api";
import { COUNTRIES, PHONE_PLACEHOLDER } from "@/lib/countries";
import Dropdown from "@/components/ui/Dropdown";
import { fbEvent } from "@/lib/fbpixel";

const EASE = [0.22, 1, 0.36, 1] as const;

const container: Variants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.08, delayChildren: 0.05 } },
};

const item: Variants = {
  hidden: { y: 18, opacity: 0 },
  show: { y: 0, opacity: 1, transition: { duration: 0.45, ease: EASE } },
};

// billing country is a free-text-ish select, separate from the phone country
// code below — a UK founder can still book a demo for a Pakistan-based shop
const BILLING_COUNTRIES = ["Pakistan", "South Korea", "United Arab Emirates", "Other"];

const TEAMS = [
  "Marketing",
  "Sales",
  "Support",
  "Admin / Founder / Business Owner",
  "IT / Developer / Product Manager",
  "HR",
  "Others",
];

const HIGHLIGHTS = [
  "Enjoy a personalized guided tour, not a group webinar",
  "See how Exofe automates your WhatsApp catalog and orders",
  "Demos are given by our team, not a bot",
  "We'll show you how Exofe helps you grow your business",
];

type FormState = {
  name: string;
  email: string;
  billingCountry: string;
  countryCode: (typeof COUNTRIES)[number]["code"];
  phone: string;
  team: string;
};

const initialForm: FormState = {
  name: "",
  email: "",
  billingCountry: "",
  countryCode: "PK",
  phone: "",
  team: "",
};

type Errors = Partial<Record<keyof FormState | "terms" | "submit", string>>;

function validate(form: FormState, agreedToTerms: boolean): Errors {
  const errors: Errors = {};

  if (!form.name.trim()) errors.name = "Required";

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) {
    errors.email = "Enter a valid email";
  }

  if (!form.billingCountry) errors.billingCountry = "Please select one";

  const country = COUNTRIES.find((c) => c.code === form.countryCode)!;
  const digits = form.phone.replace(/\D/g, "");
  if (digits.length < country.minDigits || digits.length > country.maxDigits) {
    errors.phone = `Enter a valid ${country.label} number`;
  }

  if (!form.team) errors.team = "Please pick one";

  if (!agreedToTerms) errors.terms = "You need to agree before we can book this";

  return errors;
}

export default function DemoPage() {
  const [form, setForm] = useState<FormState>(initialForm);
  const [agreedToTerms, setAgreedToTerms] = useState(false);
  const [errors, setErrors] = useState<Errors>({});
  const [status, setStatus] = useState<"idle" | "loading" | "done">("idle");

  const setField = <K extends keyof FormState>(key: K, value: FormState[K]) => {
    setForm((prev) => ({ ...prev, [key]: value }));
    if (errors[key]) setErrors((prev) => ({ ...prev, [key]: undefined }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const fieldErrors = validate(form, agreedToTerms);
    if (Object.keys(fieldErrors).length > 0) {
      setErrors(fieldErrors);
      return;
    }

    setStatus("loading");
    setErrors({});

    const payload: DemoBookingPayload = {
      name: form.name.trim(),
      email: form.email.trim(),
      billingCountry: form.billingCountry,
      countryCode: form.countryCode,
      phone: form.phone.replace(/\D/g, ""),
      team: form.team,
    };

    try {
      await bookDemo(payload);
      fbEvent("Lead", { content_name: "Demo Booking" });
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

  if (status === "done") {
    return (
      <main className="flex min-h-[70vh] items-center justify-center px-4 py-16">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: EASE }}
          className="w-full max-w-md rounded-2xl border border-black/[.06] bg-white p-8 text-center shadow-xl shadow-indigo-900/10"
        >
          <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-emerald-50">
            <CheckCircle2 className="h-7 w-7 text-emerald-500" strokeWidth={2} />
          </span>
          <h1 className="mt-5 text-xl font-bold text-foreground">Demo booked!</h1>
          <p className="mt-2 text-sm text-foreground/60">
            We&apos;ll reach out on WhatsApp at {form.phone ? `+${COUNTRIES.find((c) => c.code === form.countryCode)?.dial.replace("+", "")}${form.phone}` : "your number"} to schedule a time.
          </p>
        </motion.div>
      </main>
    );
  }

  return (
    <main className="bg-white px-4 py-10 sm:px-6 sm:py-16 lg:py-20">
      <div className="mx-auto w-full max-w-4xl">
        <motion.div initial="hidden" animate="show" variants={container}>
          <motion.div variants={item} className="flex items-center gap-3">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/logo-icon.png" alt="" className="h-7 w-auto" />
            <h1 className="text-2xl font-bold text-foreground sm:text-3xl">Book your free demo</h1>
          </motion.div>

          <motion.p variants={item} className="mt-3 max-w-2xl text-sm text-foreground/60 sm:text-base">
            We really encourage you to see how Exofe lets you use WhatsApp as a channel to sell,
            confirm orders, and support customers more efficiently.
          </motion.p>

          <motion.div variants={item} className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-2">
            {HIGHLIGHTS.map((text) => (
              <div key={text} className="flex items-start gap-2.5">
                <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 border-[#45157b]">
                  <Check className="h-2.5 w-2.5 text-[#45157b]" strokeWidth={3} />
                </span>
                <span className="text-sm text-foreground/70">{text}</span>
              </div>
            ))}
          </motion.div>
        </motion.div>

        <motion.form
          onSubmit={handleSubmit}
          noValidate
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.2, ease: EASE }}
          className="mt-10 flex flex-col gap-5 rounded-2xl border border-black/[.08] bg-white p-6 shadow-xl shadow-indigo-900/10 sm:p-8"
        >
          <div>
            <label className="text-sm font-semibold text-foreground">
              Name<span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={form.name}
              onChange={(e) => setField("name", e.target.value)}
              className={`mt-1.5 w-full rounded-lg border bg-zinc-50 px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#45157b]/30 ${
                errors.name ? "border-red-400" : "border-black/[.1]"
              }`}
            />
            {errors.name && <p className="mt-1 text-xs text-red-500">{errors.name}</p>}
          </div>

          <div>
            <label className="text-sm font-semibold text-foreground">
              Email<span className="text-red-500">*</span>
            </label>
            <p className="text-xs text-foreground/50">To book a 1-on-1 demo, please use your business email.</p>
            <input
              type="email"
              value={form.email}
              onChange={(e) => setField("email", e.target.value)}
              className={`mt-1.5 w-full rounded-lg border bg-zinc-50 px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#45157b]/30 ${
                errors.email ? "border-red-400" : "border-black/[.1]"
              }`}
            />
            {errors.email && <p className="mt-1 text-xs text-red-500">{errors.email}</p>}
          </div>

          <div>
            <label className="text-sm font-semibold text-foreground">
              Country Origin / Billing Country<span className="text-red-500">*</span>
            </label>
            <div className="mt-1.5">
              <Dropdown
                value={form.billingCountry}
                onChange={(v) => setField("billingCountry", v)}
                options={BILLING_COUNTRIES.map((c) => ({ value: c, label: c }))}
                placeholder="Please Select"
                error={!!errors.billingCountry}
              />
            </div>
            {errors.billingCountry && <p className="mt-1 text-xs text-red-500">{errors.billingCountry}</p>}
          </div>

          <div>
            <label className="text-sm font-semibold text-foreground">
              Your WhatsApp Number we&apos;ll reach out to you here<span className="text-red-500">*</span>
            </label>
            <div className="mt-1.5 flex flex-col gap-2 sm:flex-row">
              <div className="w-full shrink-0 sm:w-36">
                <Dropdown
                  value={form.countryCode}
                  onChange={(v) => setField("countryCode", v as FormState["countryCode"])}
                  options={COUNTRIES.map((c) => ({ value: c.code, label: `${c.flag} ${c.label}` }))}
                  placeholder="Country"
                />
              </div>
              <input
                type="tel"
                inputMode="numeric"
                value={form.phone}
                onChange={(e) => setField("phone", e.target.value)}
                placeholder={PHONE_PLACEHOLDER[form.countryCode]}
                className={`flex-1 rounded-lg border bg-zinc-50 px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#45157b]/30 ${
                  errors.phone ? "border-red-400" : "border-black/[.1]"
                }`}
              />
            </div>
            {errors.phone && <p className="mt-1 text-xs text-red-500">{errors.phone}</p>}
          </div>

          <div>
            <label className="text-sm font-semibold text-foreground">
              Which team or function will primarily use Exofe?<span className="text-red-500">*</span>
            </label>
            <div
              role="radiogroup"
              className={`mt-2 grid grid-cols-1 gap-2 sm:grid-cols-3 ${
                errors.team ? "rounded-xl ring-1 ring-red-300" : ""
              }`}
            >
              {TEAMS.map((t) => {
                const selected = form.team === t;
                return (
                  <motion.button
                    key={t}
                    type="button"
                    role="radio"
                    aria-checked={selected}
                    onClick={() => setField("team", t)}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.97 }}
                    className={`relative rounded-xl border py-2.5 pl-3.5 text-left text-sm font-medium transition-colors duration-200 ${
                      selected ? "pr-9" : "pr-3.5"
                    } ${
                      selected
                        ? "border-[#45157b] bg-[#45157b] text-white shadow-md shadow-indigo-900/20"
                        : "border-black/[.1] bg-zinc-50 text-foreground/70 hover:border-[#45157b]/40 hover:bg-white"
                    }`}
                  >
                    {t}
                    {selected && (
                      <CheckCircle2
                        className="absolute right-2 top-1/2 h-4 w-4 -translate-y-1/2 text-white"
                        strokeWidth={2.5}
                      />
                    )}
                  </motion.button>
                );
              })}
            </div>
            {errors.team && <p className="mt-1 text-xs text-red-500">{errors.team}</p>}
          </div>

          <div>
            <label className="flex items-start gap-2.5 text-xs leading-relaxed text-foreground/60">
              <input
                type="checkbox"
                checked={agreedToTerms}
                onChange={(e) => {
                  setAgreedToTerms(e.target.checked);
                  if (errors.terms) setErrors((prev) => ({ ...prev, terms: undefined }));
                }}
                className="mt-0.5 h-4 w-4 shrink-0 rounded border-black/[.2] text-[#45157b] focus:ring-[#45157b]/30"
              />
              <span>
                By submitting, you agree to Exofe&apos;s{" "}
                <a href="/terms" className="font-medium text-[#45157b] underline underline-offset-2">
                  Terms & Conditions
                </a>{" "}
                and{" "}
                <a href="/privacy" className="font-medium text-[#45157b] underline underline-offset-2">
                  Privacy Policy
                </a>
                , and consent to receive communications from Exofe.
              </span>
            </label>
            {errors.terms && <p className="mt-1 text-xs text-red-500">{errors.terms}</p>}
          </div>

          {errors.submit && <p className="rounded-lg bg-red-50 p-3 text-sm text-red-600">{errors.submit}</p>}

          <motion.button
            type="submit"
            disabled={status === "loading"}
            whileHover={{ scale: 1.01 }}
            whileTap={{ scale: 0.98 }}
            className="flex w-full items-center justify-center gap-2 rounded-full bg-[#45157b] py-3 text-sm font-semibold text-white shadow-lg shadow-indigo-900/20 transition-colors hover:opacity-90 disabled:opacity-70 sm:w-auto sm:px-8"
          >
            {status === "loading" && <Loader2 className="h-4 w-4 animate-spin" strokeWidth={2.4} />}
            {status === "loading" ? "Scheduling..." : "Schedule Demo"}
          </motion.button>
        </motion.form>
      </div>
    </main>
  );
}
