"use client";

import { useLayoutEffect, useRef } from "react";
import { motion, type Variants } from "framer-motion";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { SplitText } from "gsap/SplitText";

const item: Variants = {
  hidden: { y: 30, opacity: 0 },
  show: { y: 0, opacity: 1, transition: { duration: 0.6, ease: [0.22, 1, 0.36, 1] } },
};

const STATS = [
  {
    value: "40%",
    desc: "Faster order replies and automated confirmations.",
    tall: true,
    className: "bg-gradient-to-br from-indigo-50 to-white",
  },
  {
    value: "3x",
    desc: "Higher response rate with real-time updates.",
    tall: false,
    className: "bg-zinc-50",
  },
  {
    value: "100%",
    desc: "Order visibility across and track every delivery.",
    tall: true,
    className: "bg-gradient-to-br from-indigo-50 to-white",
  },
  {
    value: "500+",
    desc: "Active shops boutiques, sellers growing daily.",
    tall: false,
    className: "bg-zinc-50",
  },
];

function Dot() {
  return (
    <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full border-2 border-[#45157b]/25">
      <span className="h-2 w-2 rounded-full bg-[#45157b]" />
    </span>
  );
}

export default function WhyChoose() {
  const sectionRef = useRef<HTMLElement>(null);
  const headingRef = useRef<HTMLHeadingElement>(null);
  const cardsRef = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    gsap.registerPlugin(ScrollTrigger, SplitText);

    let headingSplit: SplitText | undefined;
    let numberSplits: SplitText[] = [];

    const ctx = gsap.context(() => {
      // heading — same reveal as Features (SplitText words+chars, skewX/rotateZ, scrubbed)
      headingSplit = new SplitText(headingRef.current, {
        type: "words, chars",
        wordsClass: "split-word",
      });
      gsap.set(headingSplit.chars, { transformPerspective: 400 });
      gsap.fromTo(
        headingSplit.chars,
        { skewX: 14, rotateZ: -2, opacity: 0 },
        {
          skewX: 0,
          rotateZ: 0,
          opacity: 1,
          ease: "none",
          stagger: { each: 0.5 / headingSplit.chars.length, from: "start" },
          scrollTrigger: {
            trigger: headingRef.current,
            start: "top 90%",
            end: "top 40%",
            scrub: 0.8,
          },
        }
      );

      // stat numbers — split into letters for a staggered fade+skew reveal
      const numberEls = gsap.utils.toArray<HTMLElement>(".stat-number");
      numberSplits = numberEls.map(
        (el) => new SplitText(el, { type: "chars", charsClass: "stat-char" })
      );

      // cards — scroll-triggered translate3d + skew slide-in, numbers reveal alongside
      const tl = gsap.timeline({
        scrollTrigger: {
          trigger: cardsRef.current,
          start: "top 85%",
          toggleActions: "play none none reverse",
        },
      });

      tl.fromTo(
        ".teams-block",
        { autoAlpha: 0, x: -40, skewX: 8 },
        {
          autoAlpha: 1,
          x: 0,
          skewX: 0,
          duration: 0.7,
          stagger: 0.12,
          ease: "power3.out",
        }
      ).fromTo(
        ".stat-char",
        { opacity: 0, skewX: 20 },
        { opacity: 1, skewX: 0, stagger: 0.02, ease: "none", duration: 0.4 },
        "<+=0.15"
      );
    }, sectionRef);

    const refreshTimer = setTimeout(() => ScrollTrigger.refresh(), 300);

    return () => {
      clearTimeout(refreshTimer);
      ctx.revert();
      headingSplit?.revert();
      numberSplits.forEach((s) => s.revert());
    };
  }, []);

  return (
    <section id="why-choose" ref={sectionRef} className="relative scroll-mt-20 bg-white px-4 py-20 sm:px-6 sm:py-28">
      <div className="mx-auto w-full max-w-6xl">
        <div className="mx-auto max-w-2xl text-center">
          <h2
            ref={headingRef}
            className="text-3xl font-medium leading-tight tracking-tight text-foreground sm:text-5xl"
            style={{ perspective: 400 }}
          >
            Why Businesses Choose Exofe
          </h2>
          <motion.p
            initial="hidden"
            whileInView="show"
            viewport={{ once: true, amount: 0.4 }}
            variants={item}
            className="mx-auto mt-4 max-w-md text-sm text-foreground/55 sm:text-base"
          >
            Trusted by shops to manage orders more efficiently. Built to help
            you sell smarter, every single day.
          </motion.p>
        </div>

        <div
          ref={cardsRef}
          className="mt-14 grid grid-cols-2 gap-4 sm:grid-cols-4 sm:gap-5"
        >
          {STATS.map((s) => (
            <div
              key={s.value}
              className={`teams-block flex flex-col justify-between rounded-2xl border border-black/[.06] p-5 shadow-sm sm:p-6 ${s.className} ${
                s.tall ? "" : "sm:mt-10"
              }`}
              style={{ minHeight: s.tall ? 220 : 180 }}
            >
              <div className="flex items-start justify-between">
                <span className="stat-number text-3xl font-extrabold tracking-tight text-foreground sm:text-4xl">
                  {s.value}
                </span>
                <Dot />
              </div>
              <p className="mt-6 text-xs text-foreground/60 sm:text-sm">{s.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
