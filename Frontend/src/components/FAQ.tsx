"use client";

import { useLayoutEffect, useRef, useState } from "react";
import { AnimatePresence, motion, type Variants } from "framer-motion";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { SplitText } from "gsap/SplitText";
import { Plus } from "lucide-react";

const EASE = [0.22, 1, 0.36, 1] as const;

const item: Variants = {
  hidden: { y: 30, opacity: 0 },
  show: { y: 0, opacity: 1, transition: { duration: 0.6, ease: EASE } },
};

const FAQS = [
  {
    q: "What is Exofe and how does it work?",
    a: "Exofe connects to your WhatsApp Business number through the official Meta Cloud API and uses AI to reply to customers, share your catalog, answer questions, and collect order details automatically.",
  },
  {
    q: "Do I need technical knowledge to set it up?",
    a: "Not at all. Exofe's guided onboarding gets your WhatsApp shop live in minutes no coding, no developers required.",
  },
  {
    q: "Can I still reply to customers manually?",
    a: "Yes. You can hand off any conversation to a real team member at any time with our built-in human handoff option.",
  },
  {
    q: "Which payment methods are supported?",
    a: "Exofe supports Cash on Delivery, JazzCash, and Easypaisa locally, with Stripe available for international customers.",
  },
  {
    q: "Is there a free trial?",
    a: "Yes. Our Starter plan lets you test Exofe with up to 1,000 conversations before committing to a paid plan.",
  },
  {
    q: "Can I cancel anytime?",
    a: "Absolutely. There are no long-term contracts you can upgrade, downgrade, or cancel your plan whenever you like.",
  },
];

export default function FAQ() {
  const sectionRef = useRef<HTMLElement>(null);
  const headingRef = useRef<HTMLHeadingElement>(null);
  const [openIndex, setOpenIndex] = useState(0);

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
    <section id="faq" ref={sectionRef} className="relative scroll-mt-20 bg-white px-4 py-20 sm:px-6 sm:py-28">
      <div className="mx-auto w-full max-w-3xl">
        <div className="mx-auto max-w-2xl text-center">
          <h2
            ref={headingRef}
            className="text-3xl font-medium leading-tight tracking-tight text-foreground sm:text-5xl"
            style={{ perspective: 400 }}
          >
            Frequently Asked Questions
          </h2>
          <motion.p
            initial="hidden"
            whileInView="show"
            viewport={{ once: true, amount: 0.4 }}
            variants={item}
            className="mx-auto mt-4 max-w-md text-sm text-foreground/55 sm:text-base"
          >
            Everything you need to know before getting started. Can&apos;t
            find your answer? Reach out and we&apos;ll help.
          </motion.p>
        </div>

        <div className="mt-12 flex flex-col gap-3 sm:mt-14">
          {FAQS.map((f, i) => {
            const isOpen = i === openIndex;
            return (
              <motion.div
                key={f.q}
                initial="hidden"
                whileInView="show"
                viewport={{ once: true, amount: 0.4 }}
                variants={item}
                transition={{ delay: i * 0.06 }}
                className={`overflow-hidden rounded-2xl border shadow-sm transition-colors duration-300 ${
                  isOpen ? "border-[#5B4FE9]/25 bg-gradient-to-br from-indigo-50 to-white" : "border-black/[.06] bg-white"
                }`}
              >
                <button
                  type="button"
                  onClick={() => setOpenIndex(isOpen ? -1 : i)}
                  className="flex w-full items-center justify-between gap-4 p-5 text-left"
                >
                  <span className="text-sm font-bold text-foreground sm:text-base">{f.q}</span>
                  <motion.span
                    animate={{ rotate: isOpen ? 45 : 0 }}
                    transition={{ duration: 0.3, ease: EASE }}
                    className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full transition-colors duration-300 ${
                      isOpen ? "bg-[#5B4FE9] text-white" : "bg-black/[.05] text-foreground/60"
                    }`}
                  >
                    <Plus className="h-4 w-4" strokeWidth={2.4} />
                  </motion.span>
                </button>

                <AnimatePresence initial={false}>
                  {isOpen && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.35, ease: EASE }}
                      className="overflow-hidden"
                    >
                      <p className="px-5 pb-5 text-sm leading-relaxed text-foreground/60">{f.a}</p>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
