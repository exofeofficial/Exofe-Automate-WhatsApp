"use client";

import { useLayoutEffect, useRef } from "react";
import Image from "next/image";
import Link from "next/link";
import { motion, type Variants } from "framer-motion";
import gsap from "gsap";
import { SplitText } from "gsap/SplitText";
import { ArrowRight, Play, Sparkles, Code2, Webhook } from "lucide-react";
import { ShopifyIcon, WhatsAppIcon } from "@/components/dashboard/IntegrationIcons";

const EASE = [0.22, 1, 0.36, 1] as const;

const container: Variants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.1, delayChildren: 0.1 } },
};

// Content stays fully opaque even before hydration/animation kicks in — only
// a subtle slide-up plays once JS is ready. Fading from opacity: 0 here left
// the hero blank for however long hydration took on a cold load.
const item: Variants = {
  hidden: { y: 14, opacity: 1 },
  show: { y: 0, opacity: 1, transition: { duration: 0.5, ease: EASE } },
};

/* GSAP text reveal: heading = SplitText chars (skewX + opacity), paragraph = word color fade */

const PARA_DIM = "rgba(23,23,23,0.28)";
const PARA_FULL = "rgba(23,23,23,0.62)";

const PARAGRAPH_WORDS =
  "Exofe connects your business, products, customers, and WhatsApp conversations into one intelligent commerce platform."
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

function DashboardMockup() {
  return (
    <div className="relative mx-auto w-full max-w-[640px]" style={{ perspective: "1800px" }}>
      {/* soft ambient shadow beneath the tilted card — separate blurred
          blob reads better than a plain box-shadow once the card is
          actually rotated in 3D */}
      <div className="absolute inset-x-10 -bottom-6 h-20 rounded-full bg-[#45157b]/25 blur-3xl" />

      <div
        className="relative overflow-hidden rounded-2xl border border-black/[.06] bg-white shadow-[0_50px_100px_-25px_rgba(69,21,123,0.4)]"
        style={{ transform: "rotateY(-10deg) rotateX(4deg) rotateZ(-1deg)", transformStyle: "preserve-3d" }}
      >
        <div className="relative aspect-[16/10] w-full">
          <Image src="/dashboard-preview.png" alt="Exofe dashboard" fill className="object-cover object-top" priority />
        </div>
      </div>
    </div>
  );
}

const INTEGRATIONS = [
  { label: "WhatsApp", render: () => <span className="flex h-7 w-7 items-center justify-center [&>svg]:h-full [&>svg]:w-full sm:h-9 sm:w-9 lg:h-11 lg:w-11"><WhatsAppIcon /></span> },
  { label: "Shopify", render: () => <span className="flex h-7 w-7 items-center justify-center [&>svg]:h-full [&>svg]:w-full sm:h-9 sm:w-9 lg:h-11 lg:w-11"><ShopifyIcon /></span> },
  { label: "Custom APIs", render: () => <Code2 className="h-7 w-7 text-[#45157b] sm:h-9 sm:w-9 lg:h-12 lg:w-11" strokeWidth={2} /> },
  { label: "Webhooks", render: () => <Webhook className="h-7 w-7 text-[#45157b] sm:h-9 sm:w-9 lg:h-12 lg:w-11" strokeWidth={2} /> },
] as const;

function IntegrationsRow() {
  return (
    <div className="flex flex-col items-center gap-6 sm:gap-8">
      <p className="text-center text-xs text-foreground/45 sm:text-sm">Works with the tools your business already uses</p>
      <div className="grid w-full grid-cols-2 gap-x-3 gap-y-5 sm:flex sm:flex-wrap sm:items-center sm:justify-center sm:gap-x-3 sm:gap-y-3 lg:justify-between lg:gap-x-1 lg:divide-x lg:divide-black/[.08]">
        {INTEGRATIONS.map(({ label, render }) => (
          <div key={label} className="flex flex-1 items-center justify-center gap-1.5 sm:gap-2 lg:px-2 first:pl-0 last:pr-0">
            {render()}
            <span className="text-sm font-bold text-foreground/75 sm:text-base lg:text-xl">{label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function Hero() {
  const revealRef = useRef<HTMLDivElement>(null);
  const sectionRef = useRef<HTMLElement>(null);
  const headingRef = useRef<HTMLHeadingElement>(null);

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
    <section id="home" ref={sectionRef} className="relative flex min-h-[90vh] flex-col overflow-hidden bg-white scroll-mt-20">
      {/* backdrop: soft glow, no dot particles */}
      <div className="pointer-events-none absolute inset-0">
        <motion.div
          animate={{ opacity: [0.5, 0.8, 0.5] }}
          transition={{ duration: 9, repeat: Infinity, ease: "easeInOut" }}
          className="absolute right-[-10%] top-[10%] h-[42rem] w-[42rem] rounded-full bg-[radial-gradient(circle,_rgba(109,94,252,0.25)_0%,_rgba(217,70,239,0.12)_45%,_transparent_70%)] blur-2xl"
        />
        <div className="absolute left-[-15%] bottom-[-20%] h-96 w-96 rounded-full bg-sky-300/25 blur-3xl" />
      </div>

      <motion.div
        ref={revealRef}
        variants={container}
        initial="hidden"
        animate="show"
        className="relative mx-auto grid w-full max-w-[1600px] flex-1 content-center grid-cols-1 items-center gap-12 px-4 pt-16 sm:px-8 sm:pt-20 lg:grid-cols-2 lg:gap-8 lg:px-16 xl:px-24"
      >
        {/* left: copy */}
        <div className="flex flex-col items-center text-center lg:items-start lg:text-left">
          {/* badge */}
          <motion.div variants={item}>
            <span className="inline-flex items-center gap-1.5 rounded-full border border-black/[.08] bg-white/70 px-4 py-1.5 text-[11px] font-semibold uppercase tracking-wide text-foreground/60 shadow-sm backdrop-blur">
              <Sparkles className="h-3 w-3 text-[#45157b]" strokeWidth={2.4} />
              AI Commerce Automation
            </span>
          </motion.div>

          {/* heading GSAP SplitText letter reveal skewX + opacity */}
          <motion.h1
            ref={headingRef}
            variants={item}
            className="mt-6 text-[2.4rem] font-medium leading-[1.08] tracking-tight text-foreground sm:text-6xl md:text-[4rem]"
            style={{ perspective: 400 }}
          >
            Turn Every <span className="text-[#45157b]">Conversation</span> Into a{" "}
            <span className="text-[#45157b]">Sale.</span>
          </motion.h1>

          <motion.p variants={item} className="mt-6 max-w-xl text-sm leading-6 sm:text-base sm:leading-7">
            <RevealWords words={PARAGRAPH_WORDS} wordClass="reveal-word-para" dimColor={PARA_DIM} />
          </motion.p>

          {/* CTAs */}
          <motion.div
            variants={item}
            className="mt-9 flex w-full flex-col items-center justify-center gap-4 sm:w-auto sm:flex-row lg:justify-start"
          >
            <motion.div whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.97 }} className="w-full sm:w-auto">
              <Link
                href="/signup"
                className="shine-btn relative flex w-full items-center justify-center gap-2 overflow-hidden rounded-full bg-gradient-to-b from-[#2a2350] to-[#171326] px-8 py-3.5 text-sm font-semibold text-white shadow-lg shadow-indigo-900/25 transition-shadow hover:shadow-indigo-900/40 sm:w-auto"
              >
                Get Started Free
                <ArrowRight className="h-3.5 w-3.5" strokeWidth={2.4} />
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
                See How It Works
              </Link>
            </motion.div>
          </motion.div>

          <motion.p variants={item} className="mt-4 text-xs text-foreground/45">
            No credit card required &middot; Setup in minutes
          </motion.p>
        </div>

        {/* right: dashboard mockup */}
        <motion.div
          initial={{ y: 50, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.9, delay: 0.4, ease: EASE }}
          className="w-full"
        >
          <DashboardMockup />
        </motion.div>
      </motion.div>

      {/* integrations row */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.6, ease: EASE }}
        className="relative z-10 mx-auto w-full max-w-[1600px] px-4 pb-20 pt-24 sm:px-8 sm:pt-28 lg:px-16 xl:px-24"
      >
        <IntegrationsRow />
      </motion.div>
    </section>
  );
}
