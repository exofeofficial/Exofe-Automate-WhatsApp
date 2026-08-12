"use client";

import { useLayoutEffect, useRef } from "react";
import Link from "next/link";
import { motion, useScroll, useTransform, type Variants } from "framer-motion";
import gsap from "gsap";
import { SplitText } from "gsap/SplitText";
import { ArrowRight, Check, Play, Star } from "lucide-react";

const EASE = [0.22, 1, 0.36, 1] as const;

const container: Variants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.1, delayChildren: 0.1 } },
};

// Content stays fully opaque even before hydration/animation kicks in — only
// a subtle slide-up plays once JS is ready. Fading from opacity: 0 here left
// the hero blank (just the background sparkles) for however long hydration
// took on a cold load.
const item: Variants = {
  hidden: { y: 14, opacity: 1 },
  show: { y: 0, opacity: 1, transition: { duration: 0.5, ease: EASE } },
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

const TRUST_STATS = [
  ["10,000+", "Orders automated"],
  ["<2 min", "Avg. response time"],
  ["3", "Countries live"],
] as const;

function TrustBar() {
  return (
    <div className="flex flex-col items-center gap-4 sm:flex-row sm:gap-8">
      <div className="flex items-center gap-2">
        <div className="flex -space-x-2">
          {["#F59E0B", "#EC4899", "#6D5EFC", "#10B981"].map((c) => (
            <span
              key={c}
              className="h-7 w-7 rounded-full border-2 border-white shadow-sm"
              style={{ backgroundColor: c }}
            />
          ))}
        </div>
        <div className="flex flex-col items-start">
          <div className="flex items-center gap-0.5">
            {Array.from({ length: 5 }).map((_, i) => (
              <Star key={i} className="h-3 w-3 fill-amber-400 text-amber-400" strokeWidth={0} />
            ))}
          </div>
          <span className="text-[11px] text-foreground/50">Trusted by growing businesses</span>
        </div>
      </div>
      <div className="hidden h-8 w-px bg-black/[.08] sm:block" />
      <div className="flex items-center gap-5">
        {TRUST_STATS.map(([num, label]) => (
          <div key={label} className="text-center sm:text-left">
            <p className="text-sm font-bold leading-none text-foreground">{num}</p>
            <p className="mt-1 text-[11px] leading-none text-foreground/45">{label}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

const CHAT_MESSAGES = [
  { from: "customer", text: "Hi! Do you have this in blue?", delay: 1.1 },
  { from: "bot", text: "Yes! Here's what we have in stock 👇", delay: 1.6 },
  { from: "bot", product: true, delay: 1.9 },
  { from: "customer", text: "Perfect, I'll take 2", delay: 2.6 },
  { from: "bot", text: "Order confirmed ✅ Total: Rs 2,400. We'll notify you once it ships!", delay: 3.1 },
] as const;

function WhatsAppMockup() {
  return (
    <div className="mx-auto w-full max-w-[340px] overflow-hidden rounded-[2rem] border-[6px] border-[#171326] bg-white shadow-2xl shadow-indigo-900/25">
      {/* status bar */}
      <div className="flex items-center justify-between bg-[#075E54] px-4 pb-2 pt-2.5 text-white">
        <span className="text-[10px] font-medium opacity-80">9:41</span>
        <div className="flex items-center gap-1">
          <span className="h-1.5 w-1.5 rounded-full bg-white/70" />
          <span className="h-1.5 w-1.5 rounded-full bg-white/70" />
          <span className="h-1.5 w-1.5 rounded-full bg-white/70" />
        </div>
      </div>
      {/* chat header */}
      <div className="flex items-center gap-2.5 bg-[#075E54] px-4 pb-3">
        <span className="flex h-8 w-8 items-center justify-center rounded-full bg-white/15 text-xs font-bold text-white">
          E
        </span>
        <div>
          <p className="text-xs font-semibold text-white">Exofe Store</p>
          <p className="text-[10px] text-emerald-200">Online · Replies via AI</p>
        </div>
      </div>

      {/* chat body */}
      <div
        className="flex min-h-[380px] flex-col gap-2.5 p-3.5"
        style={{
          backgroundColor: "#E5DDD5",
          backgroundImage:
            "radial-gradient(circle at 20% 20%, rgba(0,0,0,0.02) 1px, transparent 1px), radial-gradient(circle at 60% 70%, rgba(0,0,0,0.02) 1px, transparent 1px)",
          backgroundSize: "24px 24px",
        }}
      >
        {CHAT_MESSAGES.map((msg, i) => {
          const isCustomer = msg.from === "customer";
          return (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 8 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.4, delay: msg.delay, ease: EASE }}
              className={`flex ${isCustomer ? "justify-end" : "justify-start"}`}
            >
              {"product" in msg && msg.product ? (
                <div className="w-[72%] rounded-xl rounded-tl-sm bg-white p-2.5 shadow-sm">
                  <div className="h-20 w-full rounded-lg bg-gradient-to-br from-indigo-100 to-fuchsia-100" />
                  <p className="mt-2 text-[11px] font-semibold text-foreground">Classic Tee — Blue</p>
                  <div className="mt-0.5 flex items-center justify-between">
                    <span className="text-[11px] font-bold text-[#075E54]">Rs 1,200</span>
                    <span className="rounded-full bg-[#075E54] px-2 py-0.5 text-[9px] font-semibold text-white">
                      Add to cart
                    </span>
                  </div>
                </div>
              ) : (
                <div
                  className={`max-w-[78%] rounded-xl px-3 py-2 text-[11px] leading-relaxed shadow-sm ${
                    isCustomer ? "rounded-tr-sm bg-[#DCF8C6] text-foreground/85" : "rounded-tl-sm bg-white text-foreground/85"
                  }`}
                >
                  {"text" in msg ? msg.text : null}
                </div>
              )}
            </motion.div>
          );
        })}
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

  useLayoutEffect(() => {
    gsap.registerPlugin(SplitText);

    let split: SplitText | undefined;

    // Plays directly on mount instead of behind a ScrollTrigger — the hero
    // heading is always in view on load anyway, and gating it on a scroll
    // measurement was the thing leaving it stuck invisible (opacity: 0 from
    // the `fromTo` below) whenever that measurement raced with late-loading
    // fonts on a cold reload.
    const ctx = gsap.context(() => {
      split = new SplitText(headingRef.current, { type: "words, chars", wordsClass: "split-word" });
      gsap.set(split.chars, { transformPerspective: 400 });

      gsap
        .timeline()
        .fromTo(
          split.chars,
          { skewX: 30, opacity: 0 },
          { skewX: 0, opacity: 1, ease: "none", stagger: { each: 0.5 / split.chars.length, from: "start" } }
        )
        .fromTo(
          ".reveal-word-para",
          { color: PARA_DIM },
          { color: PARA_FULL, stagger: 0.025, ease: "none" },
          "<+=0.3"
        );
    }, sectionRef);

    return () => {
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
          className="flex w-full flex-col items-center justify-center gap-4 sm:w-auto sm:flex-row"
        >
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

        {/* trust bar */}
        <motion.div variants={item} className="mt-10">
          <TrustBar />
        </motion.div>
      </motion.div>

      {/* product preview: real WhatsApp conversation, not abstract charts —
          shows what the business is actually buying */}
      <div ref={cardsRef} className="relative z-10 mx-auto mt-14 w-full max-w-7xl px-4 pb-0 sm:px-6">
        <motion.div
          style={{ y: yLeft }}
          initial={{ y: 60, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.9, delay: 0.5, ease: EASE }}
          className="relative mx-auto flex max-w-3xl items-end justify-center gap-6 will-change-transform"
        >
          {/* feature call-outs flanking the phone on larger screens */}
          <div className="hidden w-48 flex-col gap-4 pb-16 lg:flex">
            {[
              "AI replies in seconds, 24/7",
              "Full product catalog on WhatsApp",
            ].map((text) => (
              <div key={text} className="flex items-start gap-2 rounded-xl border border-black/[.06] bg-white/80 p-3 shadow-sm backdrop-blur">
                <span className="mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-emerald-100">
                  <Check className="h-2.5 w-2.5 text-emerald-600" strokeWidth={3} />
                </span>
                <span className="text-xs leading-snug text-foreground/70">{text}</span>
              </div>
            ))}
          </div>

          <WhatsAppMockup />

          <div className="hidden w-48 flex-col gap-4 pb-16 lg:flex">
            {[
              "Orders confirmed automatically",
              "Works with your existing number",
            ].map((text) => (
              <div key={text} className="flex items-start gap-2 rounded-xl border border-black/[.06] bg-white/80 p-3 shadow-sm backdrop-blur">
                <span className="mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-emerald-100">
                  <Check className="h-2.5 w-2.5 text-emerald-600" strokeWidth={3} />
                </span>
                <span className="text-xs leading-snug text-foreground/70">{text}</span>
              </div>
            ))}
          </div>
        </motion.div>
      </div>
    </section>
  );
}
