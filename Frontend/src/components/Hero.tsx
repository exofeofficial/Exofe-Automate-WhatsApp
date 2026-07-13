"use client";

import { useLayoutEffect, useRef } from "react";
import Link from "next/link";
import { motion, useScroll, useTransform, type Variants } from "framer-motion";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { SplitText } from "gsap/SplitText";
import { ArrowRight, Play } from "lucide-react";

const EASE = [0.22, 1, 0.36, 1] as const;

const container: Variants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.1, delayChildren: 0.1 } },
};

const item: Variants = {
  hidden: { y: 28, opacity: 0 },
  show: { y: 0, opacity: 1, transition: { duration: 0.7, ease: EASE } },
};

/* fixed star positions */
const STARS = [
  [6, 12], [14, 34], [22, 8], [30, 22], [38, 15], [46, 6], [54, 18],
  [62, 10], [70, 26], [78, 7], [86, 16], [93, 30], [10, 55], [90, 55],
  [4, 78], [96, 72], [18, 68], [82, 80], [26, 88], [74, 90],
] as const;

/* GSAP text reveal: heading = SplitText chars (skewX + opacity), paragraph = word color fade */

const PARA_DIM = "rgba(23,23,23,0.28)";
const PARA_FULL = "rgba(23,23,23,0.62)";

const PARAGRAPH_WORDS =
  "From automating replies to tracking orders, we make it easy for you to connect with your customers and grow your business. Focus on what you do best we'll handle the rest."
    .split(" ")
    .map((text) => ({ text }));

function RevealWords({
  words,
  wordClass,
  dimColor,
  className,
}: {
  words: { text: string; italic?: boolean; breakAfter?: boolean }[];
  wordClass: string;
  dimColor: string;
  className?: string;
}) {
  return (
    <span className={className}>
      {words.map((w, i) => (
        <span key={i}>
          <span className={`${wordClass}${w.italic ? " italic" : ""}`} style={{ color: dimColor }}>
            {w.text}
          </span>
          {i < words.length - 1 && !w.breakAfter ? " " : ""}
          {w.breakAfter && <br className="hidden sm:block" />}
        </span>
      ))}
    </span>
  );
}

function HandArrow() {
  return (
    <svg width="90" height="110" viewBox="0 0 90 110" fill="none" className="text-foreground/70">
      <motion.path
        d="M62 6 C 30 18, 18 34, 30 46 C 38 54, 52 50, 50 40 C 48 31, 34 32, 26 42 C 16 55, 22 74, 44 88"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinecap="round"
        initial={{ pathLength: 0, opacity: 0 }}
        animate={{ pathLength: 1, opacity: 1 }}
        transition={{ duration: 1.2, delay: 0.9, ease: "easeInOut" }}
      />
      <motion.path
        d="M32 82 L 44 89 L 46 75"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
        initial={{ pathLength: 0, opacity: 0 }}
        animate={{ pathLength: 1, opacity: 1 }}
        transition={{ duration: 0.4, delay: 2.0, ease: "easeOut" }}
      />
    </svg>
  );
}

function OrdersReportCard() {
  return (
    <div className="w-full rounded-t-2xl border border-b-0 border-black/[.06] bg-white p-6 shadow-2xl shadow-indigo-900/15 sm:p-7">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-black/[.06] pb-4">
        <p className="text-base font-bold text-foreground">Orders Engagement Report</p>
        <div className="flex items-center gap-2 text-[11px] text-foreground/50">
          <span className="rounded-md border border-black/[.08] px-2.5 py-1">Total Orders ▾</span>
          <span className="rounded-md border border-black/[.08] px-2.5 py-1">Last 7 Days ▾</span>
        </div>
      </div>
      <div className="relative mt-4">
        <svg viewBox="0 0 420 120" fill="none" className="w-full">
          {[0, 30, 60, 90, 120].map((y) => (
            <line key={y} x1="0" y1={y} x2="420" y2={y} stroke="#00000008" strokeWidth="1" />
          ))}
          <motion.path
            d="M0 78 C 40 38, 70 30, 105 52 C 140 74, 160 96, 195 88 L 195 88 C 214 84, 224 60, 240 48 C 268 28, 300 30, 330 52 C 358 72, 388 80, 418 60"
            stroke="#6d5efc"
            strokeWidth="2.5"
            strokeLinecap="round"
            initial={{ pathLength: 0 }}
            animate={{ pathLength: 1 }}
            transition={{ duration: 1.6, delay: 0.8, ease: "easeInOut" }}
          />
          <circle cx="195" cy="88" r="5" fill="#fff" stroke="#6d5efc" strokeWidth="2.5" />
          <circle cx="330" cy="52" r="5" fill="#fff" stroke="#f43f5e" strokeWidth="2.5" />
        </svg>
        <div className="absolute right-24 top-0 hidden rounded-lg border border-black/[.06] bg-white p-2.5 shadow-lg sm:block">
          {[
            ["New", "46"],
            ["Confirmed", "34"],
            ["Shipped", "21"],
            ["Delivered", "18"],
          ].map(([k, v]) => (
            <div key={k} className="flex items-center justify-between gap-6 text-[10px] leading-4">
              <span className="text-foreground/50">{k}</span>
              <span className="font-semibold text-foreground">{v}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function EngagementScoresCard() {
  return (
    <div className="w-full rounded-t-2xl border border-b-0 border-black/[.06] bg-white p-6 shadow-2xl shadow-indigo-900/15 sm:p-7">
      <p className="border-b border-black/[.06] pb-4 text-base font-bold text-foreground">
        Customer Engagement Scores
      </p>
      <div className="mt-4 grid grid-cols-2 gap-3">
        {[
          ["Total Customers", "89", "+12% Last Week"],
          ["Total Orders", "142", "+8% Last Week"],
        ].map(([label, num, delta]) => (
          <div key={label} className="rounded-lg border border-black/[.06] p-4 text-center">
            <p className="text-xs text-foreground/50">{label}</p>
            <p className="mt-1.5 text-3xl font-extrabold text-foreground">{num}</p>
            <p className="mt-1.5 text-[11px] text-emerald-600">{delta}</p>
          </div>
        ))}
      </div>
      <div className="mt-4 grid grid-cols-3 gap-3">
        {[
          ["New", "text-rose-500", "bg-rose-500"],
          ["Shipped", "text-orange-500", "bg-orange-500"],
          ["Delivered", "text-emerald-500", "bg-emerald-500"],
        ].map(([label, txt, bar]) => (
          <div key={label} className="border-l-2 border-black/[.06] pl-2">
            <p className={`text-[11px] font-semibold ${txt}`}>{label}</p>
            <div className="mt-1.5 h-1 w-full rounded-full bg-black/[.06]">
              <div className={`h-1 w-2/3 rounded-full ${bar}`} />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function Hero() {
  const cardsRef = useRef<HTMLDivElement>(null);
  const revealRef = useRef<HTMLDivElement>(null);
  const sectionRef = useRef<HTMLElement>(null);
  const headingRef = useRef<HTMLHeadingElement>(null);
  const { scrollYProgress } = useScroll({
    target: cardsRef,
    offset: ["start end", "end start"],
  });
  const yLeft = useTransform(scrollYProgress, [0, 1], [0, -90]);
  const yRight = useTransform(scrollYProgress, [0, 1], [0, -90]);

  useLayoutEffect(() => {
    gsap.registerPlugin(ScrollTrigger, SplitText);

    let split: SplitText | undefined;

    const ctx = gsap.context(() => {
      split = new SplitText(headingRef.current, { type: "words, chars", wordsClass: "split-word" });
      gsap.set(split.chars, { transformPerspective: 400 });

      const tl = gsap.timeline({
        scrollTrigger: {
          // fires automatically on load (hero heading already sits within
          // the top 85% of the viewport at scroll 0), and re-triggers 
          // reverses if it's scrolled out of and back into view.
          trigger: headingRef.current,
          start: "top 85%",
          toggleActions: "play none none reverse",
        },
      });

      tl.fromTo(
        split.chars,
        { skewX: 30, opacity: 0 },
        { skewX: 0, opacity: 1, ease: "none", stagger: { each: 0.5 / split.chars.length, from: "start" } }
      ).fromTo(
        ".reveal-word-para",
        { color: PARA_DIM },
        { color: PARA_FULL, stagger: 0.025, ease: "none" },
        "<+=0.3"
      );
    }, sectionRef);

    // fonts / late layout shifts can throw off measurements taken too early
    const refreshTimer = setTimeout(() => ScrollTrigger.refresh(), 300);

    return () => {
      clearTimeout(refreshTimer);
      ctx.revert();
      split?.revert();
    };
  }, []);

  return (
    <section id="home" ref={sectionRef} className="relative overflow-hidden bg-white scroll-mt-20">
      {/* backdrop: soft glow + sparkles */}
      <div className="pointer-events-none absolute inset-0">
        <motion.div
          animate={{ opacity: [0.5, 0.8, 0.5] }}
          transition={{ duration: 9, repeat: Infinity, ease: "easeInOut" }}
          className="absolute right-[-10%] top-[20%] h-[42rem] w-[42rem] rounded-full bg-[radial-gradient(circle,_rgba(109,94,252,0.25)_0%,_rgba(217,70,239,0.12)_45%,_transparent_70%)] blur-2xl"
        />
        <div className="absolute left-[-15%] bottom-[-20%] h-96 w-96 rounded-full bg-sky-300/25 blur-3xl" />
        {STARS.map(([x, y], i) => (
          <motion.span
            key={i}
            animate={{ opacity: [0.15, 0.6, 0.15] }}
            transition={{ duration: 2.5 + (i % 5) * 0.7, repeat: Infinity, delay: (i % 7) * 0.4 }}
            className="absolute h-[3px] w-[3px] rounded-full bg-[#6d5efc]"
            style={{ left: `${x}%`, top: `${y}%` }}
          />
        ))}
      </div>

      <motion.div
        ref={revealRef}
        variants={container}
        initial="hidden"
        animate="show"
        className="relative mx-auto flex w-full max-w-4xl flex-col items-center px-4 pt-16 text-center sm:px-6 sm:pt-20"
      >
        {/* badge */}
        <motion.div variants={item}>
          <Link
            href="/docs"
            className="group inline-flex items-center gap-2 rounded-full border border-black/[.08] bg-white/70 px-4 py-1.5 text-xs text-foreground/60 shadow-sm backdrop-blur transition-colors hover:border-black/20 hover:text-foreground"
          >
            Exofe 2.0 is here
            <span className="flex items-center gap-1 font-semibold text-foreground">
              Read more
              <ArrowRight className="h-3 w-3 transition-transform group-hover:translate-x-0.5" strokeWidth={2.4} />
            </span>
          </Link>
        </motion.div>

        {/*  heading GSAP SplitText letter reveal skewX + opacity */ }
        <motion.h1
          ref={headingRef}
          variants={item}
          className="mt-6 text-[2.2rem] font-medium leading-[1.08] tracking-tight text-foreground sm:text-6xl md:text-[4.2rem]"
          style={{ perspective: 400 }}
        >
          Automate Your WhatsApp and Grow Your Business
        </motion.h1>

        <motion.p
          variants={item}
          className="mt-6 max-w-2xl text-sm leading-6 sm:text-base sm:leading-7"
        >
          <RevealWords words={PARAGRAPH_WORDS} wordClass="reveal-word-para" dimColor={PARA_DIM} />
        </motion.p>

        {/* CTAs */}
        <motion.div
          variants={item}
          className="relative mt-9 flex w-full flex-col items-center justify-center gap-4 sm:w-auto sm:flex-row"
        >
          <div className="absolute -left-2 top-[-70px] hidden md:-left-36 md:block">
            <HandArrow />
          </div>
          <motion.div whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.97 }} className="w-full sm:w-auto">
            <Link
              href="/signup"
              className="shine-btn relative flex w-full items-center justify-center overflow-hidden rounded-full bg-gradient-to-b from-[#2a2350] to-[#171326] px-8 py-3.5 text-sm font-semibold text-white shadow-lg shadow-indigo-900/25 transition-shadow hover:shadow-indigo-900/40 sm:w-auto"
            >
              Try Exofe for Free
            </Link>
          </motion.div>
          <motion.div whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.97 }} className="w-full sm:w-auto">
            <Link
              href="/demo"
              className="flex w-full items-center justify-center gap-2 rounded-full border border-black/[.12] bg-white/70 px-8 py-3.5 text-sm font-semibold text-foreground backdrop-blur transition-colors hover:border-black/25 hover:bg-white sm:w-auto"
            >
              <span className="flex h-5 w-5 items-center justify-center rounded-full bg-[#171326]">
                <Play className="ml-0.5 h-2.5 w-2.5 fill-white text-white" strokeWidth={0} />
              </span>
              Book a Demo
            </Link>
          </motion.div>
        </motion.div>
      </motion.div>

      {/* dashboard cards peeking from bottom */}
      <div
        ref={cardsRef}
        className="relative z-10 mx-auto mt-16 grid w-full max-w-7xl grid-cols-1 gap-6 px-4 pb-0 sm:px-6 md:grid-cols-[1.6fr_1fr] md:items-end"
      >
        <motion.div style={{ y: yLeft }} className="will-change-transform md:translate-y-6">
          <motion.div
            initial={{ y: 90, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ duration: 0.9, delay: 0.5, ease: EASE }}
          >
            <OrdersReportCard />
          </motion.div>
        </motion.div>
        <motion.div style={{ y: yRight }} className="will-change-transform md:translate-y-6">
          <motion.div
            initial={{ y: 80, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ duration: 0.9, delay: 0.65, ease: EASE }}
          >
            <EngagementScoresCard />
          </motion.div>
        </motion.div>
      </div>
    </section>
  );
}
