"use client";

import { useLayoutEffect, useRef } from "react";
import { motion, useScroll, useTransform, type Variants } from "framer-motion";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { SplitText } from "gsap/SplitText";
import { Check, MessageCircle, Package, Rocket } from "lucide-react";

const EASE = [0.22, 1, 0.36, 1] as const;

const item: Variants = {
  hidden: { y: 30, opacity: 0 },
  show: { y: 0, opacity: 1, transition: { duration: 0.6, ease: EASE } },
};

const STEPS = [
  {
    title: "Connect WhatsApp",
    badge: "5 mins",
    badgeClass: "bg-amber-100 text-amber-700",
    icon: MessageCircle,
    items: ["Verify business number", "Link Cloud API", "Set welcome message"],
  },
  {
    title: "Upload Catalog",
    badge: "10 mins",
    badgeClass: "bg-sky-100 text-sky-700",
    icon: Package,
    items: ["Add products & prices", "Set stock levels", "Upload product photos"],
  },
  {
    title: "Go Live & Sell",
    badge: "Instant",
    badgeClass: "bg-emerald-100 text-emerald-700",
    icon: Rocket,
    items: ["Activate AI assistant", "Start auto-replies", "Track orders live"],
  },
];

function StepCard({
  step,
  align,
  distance = 40,
  variant = "slide",
  delay = 0,
}: {
  step: (typeof STEPS)[number];
  align?: "left" | "right";
  distance?: number;
  variant?: "slide" | "pop";
  delay?: number;
}) {
  const Icon = step.icon;
  const motionProps =
    variant === "pop"
      ? { initial: { opacity: 0, scale: 0.92, y: 26 }, whileInView: { opacity: 1, scale: 1, y: 0 } }
      : { initial: { opacity: 0, x: align === "left" ? -distance : distance }, whileInView: { opacity: 1, x: 0 } };
  return (
    <motion.div
      {...motionProps}
      viewport={{ once: true, amount: 0.5 }}
      transition={{ duration: 0.55, delay, ease: EASE }}
      className="w-full rounded-2xl border border-black/[.06] bg-white p-5 shadow-sm"
    >
      <div className="flex items-start justify-between gap-3">
        <span className="flex items-center gap-2 text-base font-bold text-foreground">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-50 text-[#45157b]">
            <Icon className="h-4 w-4" strokeWidth={2.2} />
          </span>
          {step.title}
        </span>
        <span className={`shrink-0 rounded-full px-3 py-1 text-xs font-semibold ${step.badgeClass}`}>
          {step.badge}
        </span>
      </div>
      <ul className="mt-4 flex flex-col gap-2">
        {step.items.map((it) => (
          <li key={it} className="flex items-center gap-2 text-sm text-foreground/65">
            <Check className="h-4 w-4 shrink-0 text-emerald-500" strokeWidth={2.5} />
            {it}
          </li>
        ))}
      </ul>
    </motion.div>
  );
}

export default function GetStarted() {
  const sectionRef = useRef<HTMLElement>(null);
  const headingRef = useRef<HTMLHeadingElement>(null);
  const timelineRef = useRef<HTMLDivElement>(null);

  const { scrollYProgress: lineProgress } = useScroll({
    target: timelineRef,
    offset: ["start 75%", "end 60%"],
  });
  const lineScale = useTransform(lineProgress, [0, 1], [0, 1]);

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
    <section id="get-started" ref={sectionRef} className="relative scroll-mt-20 bg-white px-4 py-20 sm:px-6 sm:py-28">
      <div className="mx-auto w-full max-w-6xl">
        <div className="mx-auto max-w-2xl text-center">
          <h2
            ref={headingRef}
            className="text-3xl font-medium leading-tight tracking-tight text-foreground sm:text-5xl"
            style={{ perspective: 400 }}
          >
            Get Started in Just 3 Easy Steps
          </h2>
          <motion.p
            initial="hidden"
            whileInView="show"
            viewport={{ once: true, amount: 0.4 }}
            variants={item}
            className="mx-auto mt-4 max-w-md text-sm text-foreground/55 sm:text-base"
          >
            Get your WhatsApp shop live in just 3 easy steps with a guided
            setup designed for speed and simplicity.
          </motion.p>
        </div>

        {/* desktop: alternating timeline */}
        <div ref={timelineRef} className="relative mx-auto mt-20 hidden max-w-3xl lg:block">
          <motion.div
            style={{ scaleY: lineScale }}
            className="absolute bottom-0 left-1/2 top-0 w-px origin-top -translate-x-1/2 bg-black/[.1]"
          />

          <div className="flex flex-col gap-14">
            {STEPS.map((s, i) => {
              const isLeft = i % 2 === 0;
              return (
                <div key={s.title} className="grid grid-cols-[1fr_4rem_1fr] items-center gap-0">
                  <div className={isLeft ? "flex justify-end pr-6" : ""}>
                    {isLeft && <StepCard step={s} align="left" />}
                  </div>

                  <div className="relative flex items-center justify-center">
                    {isLeft ? (
                      <span className="absolute right-1/2 top-1/2 h-px w-6 -translate-y-1/2 bg-black/[.1]" />
                    ) : (
                      <span className="absolute left-1/2 top-1/2 h-px w-6 -translate-y-1/2 bg-black/[.1]" />
                    )}
                    <motion.div
                      initial={{ scale: 0, opacity: 0 }}
                      whileInView={{ scale: 1, opacity: 1 }}
                      viewport={{ once: true, amount: 0.6 }}
                      transition={{ duration: 0.4, delay: 0.2, ease: EASE }}
                      className="relative z-10 flex h-12 w-12 items-center justify-center rounded-full border-2 border-[#45157b] bg-white text-base font-bold text-[#45157b] shadow-sm"
                    >
                      {i + 1}
                    </motion.div>
                  </div>

                  <div className={!isLeft ? "flex justify-start pl-6" : ""}>
                    {!isLeft && <StepCard step={s} align="right" />}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* mobile / tablet: stacked cards, no step numbers */}
        <div className="mt-14 flex flex-col gap-5 lg:hidden">
          {STEPS.map((s, i) => (
            <StepCard key={s.title} step={s} variant="pop" delay={i * 0.12} />
          ))}
        </div>
      </div>
    </section>
  );
}
