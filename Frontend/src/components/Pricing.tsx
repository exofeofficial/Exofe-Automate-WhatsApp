"use client";

import { useLayoutEffect, useRef, useState } from "react";
import { AnimatePresence, motion, type Variants } from "framer-motion";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { SplitText } from "gsap/SplitText";
import { CheckCircle2 } from "lucide-react";

const EASE = [0.22, 1, 0.36, 1] as const;

const item: Variants = {
  hidden: { y: 30, opacity: 0 },
  show: { y: 0, opacity: 1, transition: { duration: 0.6, ease: EASE } },
};

const cardIn: Variants = {
  hidden: { y: 30, opacity: 0 },
  show: { y: 0, opacity: 1, transition: { duration: 0.5, ease: "easeOut" } },
};

function yearlyEquivalent(monthly: number) {
  // ~17% off (2 months free) when billed yearly
  return Math.round((monthly * 10) / 12 / 10) * 10;
}

const PLANS = [
  {
    name: "Starter",
    monthly: 2499,
    desc: "Home businesses & Instagram sellers.",
    popular: false,
    className: "from-zinc-50 to-white",
    features: [
      "WhatsApp order automation",
      "Basic AI replies",
      "1,000 conversations/month",
      "Order notifications",
      "Email support",
    ],
  },
  {
    name: "Growth",
    monthly: 4999,
    desc: "Small brands, restaurants & clothing stores.",
    popular: true,
    className: "from-indigo-50 to-white",
    features: [
      "Everything in Starter",
      "Unlimited products",
      "AI order taking",
      "Google Sheets integration",
      "Multiple team members",
      "5,000 conversations/month",
    ],
  },
  {
    name: "Business",
    monthly: 9999,
    desc: "High order volume businesses.",
    popular: false,
    className: "from-zinc-50 to-white",
    features: [
      "Everything in Growth",
      "Unlimited conversations",
      "Priority support",
      "Custom integrations",
      "Analytics dashboard",
      "API access",
    ],
  },
];

export default function Pricing() {
  const sectionRef = useRef<HTMLElement>(null);
  const headingRef = useRef<HTMLHeadingElement>(null);
  const [yearly, setYearly] = useState(false);

  useLayoutEffect(() => {
    gsap.registerPlugin(ScrollTrigger, SplitText);

    let split: SplitText | undefined;

    const ctx = gsap.context(() => {
      split = new SplitText(headingRef.current, { type: "words, chars", wordsClass: "split-word" });
      gsap.set(split.chars, { transformPerspective: 400 });
      gsap.fromTo(
        split.chars,
        { skewX: 14, rotateZ: -2, opacity: 0 },
        {
          skewX: 0,
          rotateZ: 0,
          opacity: 1,
          ease: "none",
          stagger: { each: 0.5 / split.chars.length, from: "start" },
          scrollTrigger: {
            trigger: headingRef.current,
            start: "top 90%",
            end: "top 40%",
            scrub: 0.8,
          },
        }
      );
    }, sectionRef);

    const refreshTimer = setTimeout(() => ScrollTrigger.refresh(), 300);

    return () => {
      clearTimeout(refreshTimer);
      ctx.revert();
      split?.revert();
    };
  }, []);

  return (
    <section id="pricing" ref={sectionRef} className="relative scroll-mt-20 bg-white px-4 py-20 sm:px-6 sm:py-28">
      <div className="mx-auto w-full max-w-6xl">
        <div className="mx-auto max-w-2xl text-center">
          <h2
            ref={headingRef}
            className="text-3xl font-medium leading-tight tracking-tight text-foreground sm:text-5xl"
            style={{ perspective: 400 }}
          >
            Flexible Pricing For Every Business
          </h2>
          <motion.p
            initial="hidden"
            whileInView="show"
            viewport={{ once: true, amount: 0.4 }}
            variants={item}
            className="mx-auto mt-4 max-w-md text-sm text-foreground/55 sm:text-base"
          >
            Choose a plan that fits your needs whether you&apos;re just
            starting out or scaling a high-volume shop.
          </motion.p>

          <motion.div
            initial="hidden"
            whileInView="show"
            viewport={{ once: true, amount: 0.6 }}
            variants={item}
            className="mx-auto mt-8 inline-flex items-center gap-1 rounded-full border border-black/[.08] bg-white p-1 shadow-sm"
          >
            <button
              type="button"
              onClick={() => setYearly(false)}
              className={`rounded-full px-5 py-2 text-sm font-semibold transition-colors duration-300 ${
                !yearly ? "bg-[#5B4FE9] text-white shadow-sm" : "text-foreground/60 hover:text-foreground"
              }`}
            >
              Monthly
            </button>
            <button
              type="button"
              onClick={() => setYearly(true)}
              className={`flex items-center gap-1.5 rounded-full px-5 py-2 text-sm font-semibold transition-colors duration-300 ${
                yearly ? "bg-[#5B4FE9] text-white shadow-sm" : "text-foreground/60 hover:text-foreground"
              }`}
            >
              Yearly
              <span
                className={`rounded-full px-1.5 py-0.5 text-[10px] font-bold ${
                  yearly ? "bg-white/20 text-white" : "bg-emerald-50 text-emerald-600"
                }`}
              >
                -17%
              </span>
            </button>
          </motion.div>
        </div>

        <div className="mt-14 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {PLANS.map((p, i) => {
            const price = yearly ? yearlyEquivalent(p.monthly) : p.monthly;
            return (
              <motion.div
                key={p.name}
                initial="hidden"
                whileInView="show"
                viewport={{ once: true, amount: 0.2 }}
                variants={cardIn}
                transition={{ delay: i * 0.1 }}
                whileHover={{ y: -6 }}
                className={`relative flex flex-col overflow-hidden rounded-3xl border shadow-sm transition-shadow duration-300 hover:shadow-xl ${
                  p.popular ? "border-[#5B4FE9]/30 shadow-lg shadow-indigo-900/10" : "border-black/[.06]"
                }`}
              >
                {p.popular && (
                  <span className="absolute right-5 top-5 rounded-full bg-[#5B4FE9] px-3 py-1 text-[11px] font-bold text-white shadow-sm">
                    Most Popular
                  </span>
                )}

                <div className={`bg-gradient-to-br p-6 ${p.className}`}>
                  <p className="text-lg font-bold text-foreground">{p.name}</p>
                  <p className="mt-1 text-sm text-foreground/55">{p.desc}</p>
                  <div className="mt-5 flex items-end gap-1.5">
                    <AnimatePresence mode="wait">
                      <motion.span
                        key={`${p.name}-${yearly}`}
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -8 }}
                        transition={{ duration: 0.25 }}
                        className="text-4xl font-extrabold tracking-tight text-foreground"
                      >
                        PKR {price.toLocaleString()}
                      </motion.span>
                    </AnimatePresence>
                    <span className="pb-1 text-sm text-foreground/50">/ month</span>
                  </div>
                </div>

                <div className="flex flex-1 flex-col bg-white p-6">
                  <p className="text-sm font-bold text-foreground">Features Included</p>
                  <ul className="mt-4 flex flex-1 flex-col gap-3">
                    {p.features.map((f) => (
                      <li key={f} className="flex items-start gap-2 text-sm text-foreground/65">
                        <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-[#5B4FE9]" strokeWidth={2} />
                        {f}
                      </li>
                    ))}
                  </ul>

                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    className={`mt-6 w-full rounded-full py-3 text-sm font-semibold shadow-sm transition-colors duration-300 ${
                      p.popular
                        ? "bg-[#5B4FE9] text-white hover:bg-[#4a3fd6]"
                        : "bg-black/[.05] text-foreground hover:bg-black/[.08]"
                    }`}
                  >
                    Get Started Free
                  </motion.button>
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
