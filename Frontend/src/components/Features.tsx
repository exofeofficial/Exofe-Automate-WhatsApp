"use client";

import { useLayoutEffect, useRef } from "react";
import { motion, useScroll, useTransform, type Variants } from "framer-motion";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { SplitText } from "gsap/SplitText";
import { MessageCircle } from "lucide-react";

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


const CARDS = [
  {
    title: "Smart Order Organization",
    desc: "Create, categorize, and track every WhatsApp order with flexible boards and live status.",
    image: "/1.png",
    alt: "Order board illustration",
  },
  {
    title: "Automated Replies",
    desc: "Answer FAQs and confirm orders instantly with AI replies tuned to your catalog.",
    image: "/2.png",
    alt: "AI auto-reply illustration",
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

        <div className="mt-14 grid grid-cols-1 gap-5 lg:grid-cols-3 lg:grid-rows-[auto_auto]">
          {CARDS.map((c) => (
            <ScaleCard
              key={c.title}
              className="flex flex-col rounded-[20px] bg-[#F1F2F4] p-[18px]"
            >
              <h3 className="text-lg font-bold text-foreground">{c.title}</h3>
              <p className="mt-1.5 text-sm text-foreground/55">{c.desc}</p>
              <img src={c.image} alt={c.alt} className="mt-5 w-full rounded-xl" />
            </ScaleCard>
          ))}

          <ScaleCard className="flex flex-col rounded-[20px] bg-[#F1F2F4] p-[18px] lg:row-span-2">
            <h3 className="flex items-center gap-2 text-lg font-bold text-foreground">
              <MessageCircle className="h-5 w-5 text-[#5B4FE9]" strokeWidth={2} />
              Customer Chat Management
            </h3>
            <p className="mt-1.5 text-sm text-foreground/55">
              Every conversation, file, and comment in one thread nothing gets lost.
            </p>
            <div className="mt-5 min-h-0 flex-1">
              <img
                src="/3.png"
                alt="Unified chat inbox illustration"
                className="h-full w-full rounded-xl object-cover"
              />
            </div>
          </ScaleCard>

          <ScaleCard className="flex flex-col items-center justify-between gap-6 rounded-[20px] bg-[#F1F2F4] p-[18px] sm:flex-row lg:col-span-2">
            <div className="text-center sm:pl-4 sm:text-left">
              <h3 className="text-lg font-bold text-foreground">Real-Time Order Tracking</h3>
              <p className="mt-1.5 max-w-xs text-sm text-foreground/55">
                Track deadlines, deliveries, and payment status with live updates across
                every shop.
              </p>
            </div>
            <img
              src="/4.png"
              alt="Order tracking illustration"
              className="h-44 w-full rounded-xl object-cover sm:w-80"
            />
          </ScaleCard>
        </div>
      </motion.div>
    </section>
  );
}
