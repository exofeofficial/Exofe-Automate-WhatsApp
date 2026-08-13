"use client";

import { useLayoutEffect, useRef } from "react";
import Link from "next/link";
import { motion, type Variants } from "framer-motion";
import gsap from "gsap";
import { SplitText } from "gsap/SplitText";
import {
  ArrowRight,
  Bell,
  Play,
  Search,
  Sparkles,
  LayoutGrid,
  MessageSquare,
  Users,
  Package,
  ShoppingCart,
  Zap,
  BarChart3,
  Settings,
  HelpCircle,
  Send,
  Code2,
  ShoppingBag,
  Share2,
} from "lucide-react";

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

const SIDEBAR_ITEMS = [
  { label: "Overview", icon: LayoutGrid, active: true },
  { label: "Conversations", icon: MessageSquare, active: false },
  { label: "Customers", icon: Users, active: false },
  { label: "Products", icon: Package, active: false },
  { label: "Orders", icon: ShoppingCart, active: false },
  { label: "Automations", icon: Zap, active: false },
  { label: "Analytics", icon: BarChart3, active: false },
  { label: "Settings", icon: Settings, active: false },
] as const;

function MockCard({ title, children, badge }: { title: string; children: React.ReactNode; badge?: React.ReactNode }) {
  return (
    <div className="flex flex-col rounded-xl border border-black/[.06] bg-white p-3 shadow-sm">
      <div className="flex items-center justify-between">
        <p className="text-[10px] font-bold text-foreground">{title}</p>
        {badge}
      </div>
      <div className="mt-2 flex-1">{children}</div>
    </div>
  );
}

function DashboardMockup() {
  return (
    <div className="mx-auto w-full max-w-[640px] -rotate-1 overflow-hidden rounded-2xl border border-black/[.06] bg-white shadow-2xl shadow-indigo-900/20">
      {/* top bar */}
      <div className="flex items-center justify-between border-b border-black/[.06] px-4 py-3">
        <div className="flex items-center gap-1.5">
          <span className="flex h-5 w-5 items-center justify-center rounded-md bg-[#45157b] text-[9px] font-bold text-white">
            E
          </span>
          <span className="text-[11px] font-extrabold tracking-tight text-foreground">EXOFE</span>
        </div>
        <div className="flex items-center gap-3 text-foreground/40">
          <Search className="h-3 w-3" strokeWidth={2} />
          <Bell className="h-3 w-3" strokeWidth={2} />
          <div className="flex items-center gap-1.5">
            <span className="h-5 w-5 rounded-full bg-gradient-to-br from-indigo-200 to-fuchsia-200" />
            <span className="hidden text-[9px] font-semibold text-foreground/60 sm:inline">Alex Smith</span>
          </div>
        </div>
      </div>

      <div className="flex">
        {/* sidebar */}
        <div className="hidden w-24 shrink-0 flex-col gap-0.5 border-r border-black/[.06] p-2 sm:flex">
          {SIDEBAR_ITEMS.map(({ label, icon: Icon, active }) => (
            <div
              key={label}
              className={`flex items-center gap-1.5 rounded-md px-2 py-1.5 text-[8px] font-medium ${
                active ? "bg-indigo-50 text-[#45157b]" : "text-foreground/45"
              }`}
            >
              <Icon className="h-2.5 w-2.5 shrink-0" strokeWidth={2} />
              <span className="truncate">{label}</span>
            </div>
          ))}
          <div className="mt-auto flex items-center gap-1.5 px-2 py-1.5 text-[8px] font-medium text-foreground/35">
            <HelpCircle className="h-2.5 w-2.5 shrink-0" strokeWidth={2} />
            <span>Help</span>
          </div>
        </div>

        {/* main content */}
        <div className="min-w-0 flex-1 p-3 sm:p-4">
          <p className="text-[11px] font-bold text-foreground">Good morning, Alex 👋</p>
          <p className="text-[9px] text-foreground/45">Here&apos;s what&apos;s happening with your store today.</p>

          <div className="mt-3 grid grid-cols-3 gap-2.5">
            {/* WhatsApp conversation */}
            <MockCard
              title="WhatsApp Conversation"
              badge={<span className="flex items-center gap-1 text-[8px] text-emerald-600"><span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />Online</span>}
            >
              <div className="flex flex-col gap-1.5">
                <div className="max-w-[85%] rounded-lg rounded-tl-sm bg-black/[.04] px-2 py-1 text-[8px] leading-snug text-foreground/70">
                  Hi, I&apos;m looking for a moisturizer for dry skin
                </div>
                <div className="ml-auto max-w-[85%] rounded-lg rounded-tr-sm bg-indigo-50 px-2 py-1 text-[8px] leading-snug text-[#45157b]">
                  Sure! Here are some options for dry skin.
                </div>
                <div className="flex items-center gap-1.5 rounded-lg border border-black/[.06] p-1.5">
                  <span className="h-6 w-6 shrink-0 rounded bg-gradient-to-br from-indigo-100 to-fuchsia-100" />
                  <div className="min-w-0">
                    <p className="truncate text-[8px] font-semibold text-foreground">HydraGlow Moisturizer</p>
                    <p className="text-[8px] font-bold text-[#45157b]">$28.00</p>
                  </div>
                </div>
                <div className="ml-auto max-w-[85%] rounded-lg rounded-tr-sm bg-indigo-50 px-2 py-1 text-[8px] leading-snug text-[#45157b]">
                  Added to your cart ✅
                </div>
              </div>
              <div className="mt-1.5 flex items-center gap-1 rounded-full border border-black/[.08] px-2 py-1">
                <span className="flex-1 text-[7px] text-foreground/30">Type a message…</span>
                <Send className="h-2 w-2 text-[#45157b]" strokeWidth={2.5} />
              </div>
            </MockCard>

            {/* AI Automation */}
            <MockCard title="AI Automation" badge={<span className="rounded-full bg-emerald-50 px-1.5 py-0.5 text-[7px] font-semibold text-emerald-600">● Live</span>}>
              <div className="flex flex-col gap-2 border-l border-black/[.08] pl-2">
                {[
                  ["Intent detected", "Product search: moisturizer"],
                  ["Product recommendations", "3 products matched"],
                  ["Cart created", "1 item added"],
                  ["Order placed", "Order #10234 confirmed"],
                ].map(([title, sub]) => (
                  <div key={title} className="relative">
                    <span className="absolute -left-[9px] top-0.5 h-1.5 w-1.5 rounded-full bg-[#45157b]" />
                    <p className="text-[8px] font-semibold text-foreground">{title}</p>
                    <p className="text-[7px] text-foreground/40">{sub}</p>
                  </div>
                ))}
              </div>
            </MockCard>

            {/* Cart */}
            <MockCard title="Cart" badge={<span className="text-[7px] text-foreground/40">1 item</span>}>
              <div className="flex items-center gap-1.5 rounded-lg border border-black/[.06] p-1.5">
                <span className="h-6 w-6 shrink-0 rounded bg-gradient-to-br from-indigo-100 to-fuchsia-100" />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[8px] font-semibold text-foreground">HydraGlow Moisturizer</p>
                  <p className="text-[8px] font-bold text-[#45157b]">$28.00</p>
                </div>
              </div>
              <div className="mt-2 flex items-center justify-between rounded-md bg-black/[.03] px-1.5 py-1 text-[7px] font-semibold text-foreground/60">
                <span>Order Status</span>
                <span className="rounded-full bg-emerald-50 px-1.5 py-0.5 text-emerald-600">Confirmed</span>
              </div>
            </MockCard>
          </div>

          <div className="mt-2.5 grid grid-cols-2 gap-2.5">
            <MockCard title="Customers">
              <div className="flex items-center gap-1.5">
                <span className="h-5 w-5 shrink-0 rounded-full bg-gradient-to-br from-amber-200 to-rose-200" />
                <div className="min-w-0">
                  <p className="truncate text-[8px] font-semibold text-foreground">Sarah Johnson</p>
                  <p className="truncate text-[7px] text-foreground/40">sarah@example.com</p>
                </div>
                <span className="ml-auto shrink-0 rounded-full bg-amber-50 px-1.5 py-0.5 text-[7px] font-semibold text-amber-600">VIP</span>
              </div>
            </MockCard>
            <MockCard title="Real-time Activity">
              <div className="flex items-center gap-1.5">
                <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-emerald-500" />
                <div className="min-w-0">
                  <p className="truncate text-[8px] font-semibold text-foreground">New order received</p>
                  <p className="truncate text-[7px] text-foreground/40">Order #10234 from Sarah</p>
                </div>
              </div>
            </MockCard>
          </div>
        </div>
      </div>
    </div>
  );
}

const INTEGRATIONS = [
  { label: "WhatsApp", icon: MessageSquare, color: "text-emerald-500" },
  { label: "Shopify", icon: ShoppingBag, color: "text-emerald-600" },
  { label: "Custom APIs", icon: Code2, color: "text-[#45157b]" },
  { label: "Webhooks", icon: Share2, color: "text-[#45157b]" },
] as const;

function IntegrationsRow() {
  return (
    <div className="flex flex-col items-center gap-5">
      <p className="text-xs font-medium text-foreground/45">Works with the tools your business already uses</p>
      <div className="flex flex-wrap items-center justify-center gap-x-10 gap-y-4">
        {INTEGRATIONS.map(({ label, icon: Icon, color }) => (
          <div key={label} className="flex items-center gap-2">
            <Icon className={`h-4 w-4 ${color}`} strokeWidth={2} />
            <span className="text-sm font-semibold text-foreground/70">{label}</span>
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
    <section id="home" ref={sectionRef} className="relative overflow-hidden bg-white scroll-mt-20">
      {/* backdrop: soft glow + sparkles */}
      <div className="pointer-events-none absolute inset-0">
        <motion.div
          animate={{ opacity: [0.5, 0.8, 0.5] }}
          transition={{ duration: 9, repeat: Infinity, ease: "easeInOut" }}
          className="absolute right-[-10%] top-[10%] h-[42rem] w-[42rem] rounded-full bg-[radial-gradient(circle,_rgba(109,94,252,0.25)_0%,_rgba(217,70,239,0.12)_45%,_transparent_70%)] blur-2xl"
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
        className="relative mx-auto grid w-full max-w-7xl grid-cols-1 items-center gap-12 px-4 pt-16 sm:px-6 sm:pt-20 lg:grid-cols-2 lg:gap-8"
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
        className="relative z-10 mx-auto mt-16 w-full max-w-7xl px-4 pb-20 sm:px-6"
      >
        <IntegrationsRow />
      </motion.div>
    </section>
  );
}
