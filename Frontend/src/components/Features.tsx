"use client";

import { useLayoutEffect, useRef } from "react";
import { motion, useScroll, useTransform, type Variants } from "framer-motion";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { SplitText } from "gsap/SplitText";
import {
  Bell,
  Check,
  ChevronRight,
  MessageCircle,
  MoreHorizontal,
  Pencil,
  Plus,
} from "lucide-react";

const EASE = [0.22, 1, 0.36, 1] as const;

const container: Variants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.12, delayChildren: 0.1 } },
};

const item: Variants = {
  hidden: { y: 30, opacity: 0 },
  show: { y: 0, opacity: 1, transition: { duration: 0.6, ease: EASE } },
};

/* "Scroll into View" preset: move (Y 25px -> 0) + fade, no scale */
const cardExpand: Variants = {
  hidden: { opacity: 0, y: 25 },
  show: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.5, ease: "easeOut" },
  },
};

/* each card scales up individually as IT scrolls into view (not the whole grid at once) */
function ScaleCard({
  className,
  children,
}: {
  className?: string;
  children: React.ReactNode;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start end", "start center"],
  });
  const scale = useTransform(scrollYProgress, [0, 1], [0.9, 1]);

  return (
    <motion.div
      ref={ref}
      variants={cardExpand}
      whileHover={{ y: -4 }}
      transition={{ duration: 0.25 }}
      style={{ scale }}
      className={className}
    >
      {children}
    </motion.div>
  );
}


function OrdersMockup() {
  const rows = [
    { label: "New", value: "46 orders", color: "bg-sky-500" },
    { label: "Confirmed", value: "34 orders", color: "bg-[#5B4FE9]" },
    { label: "Shipped", value: "21 orders", color: "bg-orange-400" },
    { label: "Delivered", value: "18 orders", color: "bg-emerald-500" },
  ];
  return (
    <div className="rounded-xl border border-black/[.06] bg-white p-4 shadow-sm">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-[11px] text-foreground/45">Current Total</p>
          <p className="text-lg font-extrabold text-foreground">142 Orders</p>
        </div>
        <span className="inline-flex items-center gap-1 rounded-full border border-black/[.08] px-3 py-1.5 text-[11px] font-semibold text-foreground/70">
          View Details
          <ChevronRight className="h-3 w-3" strokeWidth={2.5} />
        </span>
      </div>
      <div className="mt-3 flex flex-col gap-2">
        {rows.map((r) => (
          <div key={r.label} className="flex items-center justify-between text-[11px]">
            <span className="flex items-center gap-1.5 font-medium text-foreground/70">
              <span className={`h-1.5 w-1.5 rounded-full ${r.color}`} />
              {r.label}
            </span>
            <span className="font-semibold text-foreground/80">{r.value}</span>
          </div>
        ))}
      </div>
      <div className="mt-3 flex h-1.5 w-full overflow-hidden rounded-full">
        <div className="w-[38%] bg-[#5B4FE9]" />
        <div className="w-[27%] bg-sky-500" />
        <div className="w-[20%] bg-orange-400" />
        <div className="w-[15%] bg-emerald-500" />
      </div>
    </div>
  );
}

function AutoReplyMockup() {
  return (
    <div className="rounded-xl border border-black/[.06] bg-white p-4 shadow-sm">
      <div className="flex items-center justify-between">
        <p className="text-sm font-bold text-foreground">Auto-Reply Queue</p>
        <Pencil className="h-3.5 w-3.5 text-foreground/40" strokeWidth={2} />
      </div>
      <div className="mt-3 rounded-lg border border-black/[.06] p-3">
        <div className="flex items-center justify-between">
          <span className="rounded-md bg-indigo-50 px-2 py-0.5 text-[10px] font-semibold text-[#5B4FE9]">
            WhatsApp
          </span>
          <MoreHorizontal className="h-3.5 w-3.5 text-foreground/30" strokeWidth={2} />
        </div>
        <p className="mt-2 text-xs font-semibold leading-snug text-foreground">
          &ldquo;Hi! Is this available in size M?&rdquo;
        </p>
        <div className="mt-2.5 flex items-center justify-between">
          <span className="rounded-full bg-rose-50 px-2 py-0.5 text-[10px] font-semibold text-rose-600">
            High Priority
          </span>
          <span className="h-6 w-6 rounded-full bg-gradient-to-br from-amber-300 to-orange-400" />
        </div>
      </div>
      <button className="mt-3 flex w-full items-center justify-center gap-1.5 rounded-lg bg-[#5B4FE9] py-2 text-[11px] font-semibold text-white">
        <Plus className="h-3.5 w-3.5" strokeWidth={2.5} />
        Send Quick Reply
      </button>
    </div>
  );
}

function ChatListMockup() {
  const chats = [
    { name: "Ayesha Khan", status: "Is Typing…", unread: 1 },
    { name: "Bilal Ahmed", status: "Online", unread: 0 },
    { name: "Hira Fatima", status: "Order confirmed ✓", unread: 1 },
    { name: "Zain Malik", status: "Online", unread: 0 },
  ];
  return (
    <div className="flex h-full flex-col rounded-xl border border-black/[.06] bg-white p-4 shadow-sm">
      <div className="flex items-center justify-between">
        <p className="flex items-center gap-1.5 text-sm font-bold text-foreground">
          New Messages
          <span className="flex h-4 w-4 items-center justify-center rounded-full bg-[#5B4FE9] text-[10px] font-bold text-white">
            3
          </span>
        </p>
        <Bell className="h-3.5 w-3.5 text-foreground/40" strokeWidth={2} />
      </div>
      <div className="mt-3 flex flex-1 flex-col gap-3">
        {chats.map((c, i) => (
          <div key={c.name} className="flex items-center gap-2.5">
            <span
              className={`h-8 w-8 shrink-0 rounded-full bg-gradient-to-br ${
                ["from-pink-300 to-rose-400", "from-sky-300 to-indigo-400", "from-amber-300 to-orange-400", "from-violet-300 to-purple-400"][i]
              }`}
            />
            <div className="min-w-0 flex-1">
              <p className="truncate text-xs font-semibold text-foreground">{c.name}</p>
              <p className="truncate text-[11px] text-foreground/45">{c.status}</p>
            </div>
            {c.unread ? (
              <span className="flex h-4 w-4 items-center justify-center rounded-full bg-[#5B4FE9] text-[9px] font-bold text-white">
                {c.unread}
              </span>
            ) : (
              <Check className="h-3.5 w-3.5 text-emerald-500" strokeWidth={2.5} />
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

function OrderOverviewMockup() {
  const rows = [
    { name: "Ayesha Boutique", g: ["from-pink-300 to-rose-400", "from-sky-300 to-indigo-400"] },
    { name: "Bilal Sneakers", g: ["from-amber-300 to-orange-400", "from-violet-300 to-purple-400", "from-emerald-300 to-teal-400"] },
    { name: "Noor Fabrics", g: ["from-sky-300 to-indigo-400", "from-pink-300 to-rose-400"] },
  ];
  return (
    <div className="w-full rounded-xl border border-black/[.06] bg-white p-4 shadow-sm sm:w-72">
      <p className="text-sm font-bold text-foreground">Order Overview</p>
      <div className="mt-3 flex items-center justify-between text-[10px] font-semibold uppercase tracking-wide text-foreground/40">
        <span>Shop</span>
        <span>Assigned</span>
      </div>
      <div className="mt-2 flex flex-col gap-3">
        {rows.map((r) => (
          <div key={r.name} className="flex items-center justify-between border-t border-black/[.05] pt-2 text-xs">
            <span className="font-medium text-foreground/80">{r.name}</span>
            <div className="flex -space-x-2">
              {r.g.map((g, i) => (
                <span key={i} className={`h-5 w-5 rounded-full border-2 border-white bg-gradient-to-br ${g}`} />
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

const CARDS = [
  {
    title: "Smart Order Organization",
    desc: "Create, categorize, and track every WhatsApp order with flexible boards and live status.",
    className: "bg-zinc-50",
    mockup: <OrdersMockup />,
  },
  {
    title: "Automated Replies",
    desc: "Answer FAQs and confirm orders instantly with AI replies tuned to your catalog.",
    className: "bg-white",
    mockup: <AutoReplyMockup />,
  },
];

export default function Features() {
  const sectionRef = useRef<HTMLElement>(null);
  const headingRef = useRef<HTMLHeadingElement>(null);

  useLayoutEffect(() => {
    gsap.registerPlugin(ScrollTrigger, SplitText);

    let split: SplitText | undefined;

    const ctx = gsap.context(() => {
      split = new SplitText(headingRef.current, { type: "words, chars", wordsClass: "split-word" });

      gsap.set(split.chars, { transformPerspective: 400 });

      gsap.fromTo(
        split.chars,
        { skewX: 30, opacity: 0 },
        {
          skewX: 0,
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
    <section id="features" ref={sectionRef} className="relative scroll-mt-20 bg-white px-4 py-20 sm:px-6 sm:py-28">
      <motion.div
        variants={container}
        initial="hidden"
        whileInView="show"
        viewport={{ once: true, amount: 0.2 }}
        className="mx-auto w-full max-w-6xl"
      >
        <div className="mx-auto max-w-2xl text-center">
          <h2
            ref={headingRef}
            className="text-3xl font-medium leading-tight tracking-tight text-foreground sm:text-5xl"
            style={{ perspective: 400 }}
          >
            Unlock Premium Benefits With Our Advanced Features.
          </h2>
          <motion.p variants={item} className="mx-auto mt-4 max-w-md text-sm text-foreground/55 sm:text-base">
            Everything you need to automate WhatsApp sales built for speed, and
            designed to scale with your business.
          </motion.p>
        </div>

        <div className="mt-14 grid grid-cols-1 gap-5 lg:grid-cols-3 lg:grid-rows-2">
          {CARDS.map((c) => (
            <ScaleCard
              key={c.title}
              className={`rounded-2xl border border-black/[.06] p-6 shadow-sm ${c.className}`}
            >
              <h3 className="text-lg font-bold text-foreground">{c.title}</h3>
              <p className="mt-1.5 text-sm text-foreground/55">{c.desc}</p>
              <div className="mt-5">{c.mockup}</div>
            </ScaleCard>
          ))}

          <ScaleCard className="flex flex-col rounded-2xl border border-black/[.06] bg-white p-6 shadow-sm lg:row-span-2">
            <h3 className="flex items-center gap-2 text-lg font-bold text-foreground">
              <MessageCircle className="h-5 w-5 text-[#5B4FE9]" strokeWidth={2} />
              Customer Chat Management
            </h3>
            <p className="mt-1.5 text-sm text-foreground/55">
              Every conversation, file, and comment in one thread nothing gets lost.
            </p>
            <div className="mt-5 flex-1">
              <ChatListMockup />
            </div>
          </ScaleCard>

          <ScaleCard className="flex flex-col items-center justify-between gap-6 rounded-2xl border border-black/[.06] bg-gradient-to-br from-zinc-50 to-indigo-50/60 p-6 shadow-sm sm:flex-row lg:col-span-2">
            <div className="text-center sm:text-left">
              <h3 className="text-lg font-bold text-foreground">Real-Time Order Tracking</h3>
              <p className="mt-1.5 max-w-xs text-sm text-foreground/55">
                Track deadlines, deliveries, and payment status with live updates across
                every shop.
              </p>
            </div>
            <OrderOverviewMockup />
          </ScaleCard>
        </div>
      </motion.div>
    </section>
  );
}
