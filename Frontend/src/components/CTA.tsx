"use client";

import { useState } from "react";
import Image from "next/image";
import { motion, type Variants } from "framer-motion";
import { ArrowRight, Loader2 } from "lucide-react";
import { ApiError, joinWaitlist } from "@/lib/api";

const EASE = [0.22, 1, 0.36, 1] as const;

const container: Variants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.1, delayChildren: 0.1 } },
};

const item: Variants = {
  hidden: { y: 24, opacity: 0 },
  show: { y: 0, opacity: 1, transition: { duration: 0.6, ease: EASE } },
};

export default function CTA() {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "done" | "error">("idle");
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || status === "loading") return;

    setStatus("loading");
    setError(null);

    try {
      await joinWaitlist(email);
      setStatus("done");
    } catch (err) {
      setStatus("error");
      setError(err instanceof ApiError ? err.message : "Something went wrong. Try again.");
    }
  };

  return (
    <section className="bg-white px-4 pb-20 sm:px-6 sm:pb-28">
      <motion.div
        initial="hidden"
        whileInView="show"
        viewport={{ once: true, amount: 0.3 }}
        variants={container}
        className="relative mx-auto w-full max-w-6xl overflow-hidden rounded-3xl bg-[#e9e6ff] px-6 py-16 shadow-xl shadow-indigo-900/10 sm:px-10 sm:py-24"
      >
        <Image
          src="/cta-clouds.jpg"
          alt=""
          fill
          className="object-cover opacity-40"
          sizes="(max-width: 1280px) 100vw, 1152px"
          priority={false}
        />

        <div className="relative mx-auto flex max-w-xl flex-col items-center text-center">
          <motion.h2
            variants={item}
            className="text-3xl font-extrabold leading-tight tracking-tight text-foreground sm:text-5xl"
          >
            Let&apos;s automate your
            <br />
            WhatsApp sales.
          </motion.h2>

          <motion.p variants={item} className="mt-4 max-w-md text-sm text-foreground/60 sm:text-base">
            Turn your chats into orders faster, smarter, and more
            effortlessly with Exofe.
          </motion.p>

          <motion.form
            variants={item}
            onSubmit={handleSubmit}
            className="mt-8 flex w-full max-w-md flex-col items-center gap-3 rounded-2xl bg-white/70 p-2 shadow-lg shadow-indigo-900/10 backdrop-blur sm:flex-row sm:rounded-full"
          >
            <input
              type="email"
              required
              disabled={status === "loading" || status === "done"}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Your email address"
              className="w-full flex-1 rounded-full bg-white px-5 py-3 text-sm text-foreground placeholder:text-foreground/40 focus:outline-none disabled:opacity-60 sm:bg-transparent"
            />
            <motion.button
              type="submit"
              disabled={status === "loading" || status === "done"}
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.97 }}
              className="flex w-full items-center justify-center gap-2 rounded-full bg-[#5B4FE9] px-6 py-3 text-sm font-semibold text-white shadow-md transition-colors duration-200 hover:bg-[#4a3fd6] disabled:opacity-70 sm:w-auto"
            >
              {status === "loading" ? (
                <Loader2 className="h-4 w-4 animate-spin" strokeWidth={2.4} />
              ) : status === "done" ? (
                "Request Sent"
              ) : (
                <>
                  Get Started
                  <ArrowRight className="h-4 w-4" strokeWidth={2.4} />
                </>
              )}
            </motion.button>
          </motion.form>

          {/* backend not reachable yet in dev? that's expected, it just surfaces here */}
          {status === "error" && (
            <p className="mt-3 text-sm text-red-600">{error}</p>
          )}
          {status === "done" && (
            <p className="mt-3 text-sm text-emerald-600">You&apos;re on the list — we&apos;ll be in touch.</p>
          )}
        </div>
      </motion.div>
    </section>
  );
}
