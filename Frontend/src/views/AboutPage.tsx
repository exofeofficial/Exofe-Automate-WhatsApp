"use client";

import { motion, type Variants } from "framer-motion";
import { MessageCircle, ShieldCheck, Zap } from "lucide-react";
import CTA from "@/components/CTA";

const EASE = [0.22, 1, 0.36, 1] as const;

const container: Variants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.1, delayChildren: 0.1 } },
};

const item: Variants = {
  hidden: { y: 20, opacity: 0 },
  show: { y: 0, opacity: 1, transition: { duration: 0.5, ease: EASE } },
};

const VALUES = [
  {
    icon: MessageCircle,
    title: "Built for how people already chat",
    description:
      "No new app to download, no new habit to learn. Customers just message the WhatsApp number they already know.",
  },
  {
    icon: Zap,
    title: "Speed over busywork",
    description:
      "Every hour spent copy-pasting replies and writing down orders by hand is an hour not spent growing the business. We automate the busywork.",
  },
  {
    icon: ShieldCheck,
    title: "Your data stays yours",
    description:
      "Every business's conversations, orders, and customers are kept separate and private, never shared or mixed across accounts.",
  },
];

export default function AboutPage() {
  return (
    <main className="flex flex-1 flex-col bg-white">
      <section className="relative overflow-hidden px-4 pt-32 pb-20 sm:px-6 sm:pt-40 sm:pb-28">
        <motion.div
          initial="hidden"
          animate="show"
          variants={container}
          className="mx-auto flex max-w-3xl flex-col items-center text-center"
        >
          <motion.p variants={item} className="text-xs font-semibold uppercase tracking-wide text-[#45157b]">
            About Us
          </motion.p>
          <motion.h1
            variants={item}
            className="mt-3 text-4xl font-extrabold leading-tight tracking-tight text-foreground sm:text-5xl"
          >
            We&apos;re making WhatsApp selling effortless
          </motion.h1>
          <motion.p variants={item} className="mt-5 max-w-xl text-base leading-relaxed text-foreground/60">
            Exofe helps small and growing businesses turn WhatsApp conversations into organized, trackable orders
            without hiring someone to sit and reply all day.
          </motion.p>
        </motion.div>
      </section>

      <section className="px-4 pb-20 sm:px-6 sm:pb-28">
        <motion.div
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, amount: 0.3 }}
          variants={container}
          className="mx-auto grid w-full max-w-5xl gap-6 sm:grid-cols-2"
        >
          <motion.div variants={item} className="rounded-3xl border border-black/[.06] bg-white p-8 shadow-sm">
            <h2 className="text-lg font-bold text-foreground">Why we started Exofe</h2>
            <p className="mt-3 text-sm leading-relaxed text-foreground/60">
              Most small businesses in Pakistan already sell over WhatsApp, but every order still means scrolling
              through chats, writing details down by hand, and hoping nothing gets missed. We built Exofe so an AI
              assistant can answer the repetitive questions, take the order details, and hand the business owner a
              clean, organized dashboard instead of a messy chat thread.
            </p>
          </motion.div>
          <motion.div variants={item} className="rounded-3xl border border-black/[.06] bg-white p-8 shadow-sm">
            <h2 className="text-lg font-bold text-foreground">Where we&apos;re headed</h2>
            <p className="mt-3 text-sm leading-relaxed text-foreground/60">
              We&apos;re starting with businesses in Pakistan and building outward from there, one real WhatsApp
              conversation at a time. Every feature we ship is aimed at the same goal: let a business owner spend
              less time managing chats and more time running their business.
            </p>
          </motion.div>
        </motion.div>
      </section>

      <section className="px-4 pb-20 sm:px-6 sm:pb-28">
        <motion.div
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, amount: 0.2 }}
          variants={container}
          className="mx-auto w-full max-w-5xl"
        >
          <motion.h2
            variants={item}
            className="text-center text-2xl font-extrabold tracking-tight text-foreground sm:text-3xl"
          >
            What we care about
          </motion.h2>
          <div className="mt-10 grid gap-6 sm:grid-cols-3">
            {VALUES.map((v) => (
              <motion.div
                key={v.title}
                variants={item}
                className="rounded-3xl border border-black/[.06] bg-white p-6 shadow-sm"
              >
                <span className="flex h-10 w-10 items-center justify-center rounded-full bg-indigo-50 text-[#45157b]">
                  <v.icon className="h-5 w-5" strokeWidth={2} />
                </span>
                <h3 className="mt-4 text-sm font-bold text-foreground">{v.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-foreground/60">{v.description}</p>
              </motion.div>
            ))}
          </div>
        </motion.div>
      </section>

      <CTA />
    </main>
  );
}
