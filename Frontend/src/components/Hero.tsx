"use client";

import { useLayoutEffect, useRef } from "react";
import Link from "next/link";
import { motion, type Variants } from "framer-motion";
import gsap from "gsap";
import { SplitText } from "gsap/SplitText";
import { ArrowRight, ChevronDown, Play, Sparkles, Code2, Webhook } from "lucide-react";
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
  const videoRef = useRef<HTMLVideoElement>(null);

  useLayoutEffect(() => {
    if (videoRef.current) videoRef.current.playbackRate = 0.5;
  }, []);

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

      gsap.fromTo(
        split.chars,
        { skewX: 30, opacity: 0 },
        { skewX: 0, opacity: 1, ease: "none", stagger: { each: 0.5 / split.chars.length, from: "start" } }
      );
    }, sectionRef);

    return () => {
      ctx.revert();
      split?.revert();
    };
  }, []);

  return (
    <>
      <section id="home" ref={sectionRef} className="relative flex h-screen min-h-[640px] flex-col overflow-hidden bg-[#171326] scroll-mt-20">
        {/* fullscreen background video, dulled and slowed down so it reads
            as ambient texture behind the text rather than competing for
            attention */}
        <video
          ref={videoRef}
          autoPlay
          muted
          loop
          playsInline
          className="absolute inset-0 h-full w-full object-cover brightness-[0.55] saturate-[0.8]"
        >
          <source src="/BV1.mp4" type="video/mp4" />
        </video>

        {/* dark overlay so the white text stays legible over any footage */}
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-black/75 via-black/55 to-black/80" />

        <motion.div
          ref={revealRef}
          variants={container}
          initial="hidden"
          animate="show"
          className="relative z-10 mx-auto flex w-full max-w-4xl flex-1 flex-col items-center justify-end px-4 pb-20 text-center sm:px-8 sm:pb-24"
        >
          {/* badge */}
          <motion.div variants={item}>
            <span className="inline-flex items-center gap-1.5 rounded-full border border-white/15 bg-white/10 px-4 py-1.5 text-[11px] font-semibold uppercase tracking-wide text-white/80 backdrop-blur">
              <Sparkles className="h-3 w-3 text-[#c4b5fd]" strokeWidth={2.4} />
              AI Commerce Automation
            </span>
          </motion.div>

          {/* heading GSAP SplitText letter reveal skewX + opacity */}
          <motion.h1
            ref={headingRef}
            variants={item}
            className="mt-6 text-[2.4rem] font-medium leading-[1.08] tracking-tight text-white sm:text-6xl md:text-[4rem]"
            style={{ perspective: 400 }}
          >
            Turn Every <span className="text-[#c4b5fd]">Conversation</span> Into a{" "}
            <span className="text-[#c4b5fd]">Sale.</span>
          </motion.h1>

          <motion.p variants={item} className="mt-6 max-w-xl text-sm leading-6 text-white/70 sm:text-base sm:leading-7">
            Exofe connects your business, products, customers, and WhatsApp conversations into one intelligent commerce platform.
          </motion.p>

          {/* CTAs */}
          <motion.div variants={item} className="mt-9 flex w-full flex-col items-center justify-center gap-4 sm:w-auto sm:flex-row">
            <motion.div whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.97 }} className="w-full sm:w-auto">
              <Link
                href="/signup"
                className="shine-btn relative flex w-full items-center justify-center gap-2 overflow-hidden rounded-full bg-[#c4b5fd] px-8 py-3.5 text-sm font-semibold text-[#171326] shadow-lg shadow-black/30 transition-shadow hover:shadow-black/50 sm:w-auto"
              >
                Get Started Free
                <ArrowRight className="h-3.5 w-3.5" strokeWidth={2.4} />
              </Link>
            </motion.div>
            <motion.div whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.97 }} className="w-full sm:w-auto">
              <Link
                href="/demo"
                className="flex w-full items-center justify-center gap-2 rounded-full border border-white/25 bg-white/10 px-8 py-3.5 text-sm font-semibold text-white backdrop-blur transition-colors hover:bg-white/20 sm:w-auto"
              >
                <span className="flex h-5 w-5 items-center justify-center rounded-full bg-white">
                  <Play className="ml-0.5 h-2.5 w-2.5 fill-[#171326] text-[#171326]" strokeWidth={0} />
                </span>
                See How It Works
              </Link>
            </motion.div>
          </motion.div>

          <motion.p variants={item} className="mt-4 text-xs text-white/50">
            No credit card required &middot; Setup in minutes
          </motion.p>
        </motion.div>

        {/* scroll cue */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1, y: [0, 6, 0] }}
          transition={{ opacity: { delay: 1, duration: 0.6 }, y: { delay: 1, duration: 1.6, repeat: Infinity, ease: "easeInOut" } }}
          className="absolute bottom-6 right-6 z-10 sm:bottom-8 sm:right-10"
        >
          <ChevronDown className="h-6 w-6 text-white/50" strokeWidth={2} />
        </motion.div>
      </section>

      {/* integrations row */}
      <div className="relative bg-white">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, ease: EASE }}
          className="relative z-10 mx-auto w-full max-w-[1600px] px-4 py-16 sm:px-8 sm:py-20 lg:px-16 xl:px-24"
        >
          <IntegrationsRow />
        </motion.div>
      </div>
    </>
  );
}
