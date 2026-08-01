"use client";

import { useState } from "react";
import Link from "next/link";
import { motion, type Variants } from "framer-motion";
import {
  BookOpen,
  ExternalLink,
  MessageCircle,
  Package,
  Rocket,
  ShieldCheck,
  Sparkles,
  Users,
  Wallet,
} from "lucide-react";

const EASE = [0.22, 1, 0.36, 1] as const;
const SCROLL_OFFSET = 96; // fixed navbar + a bit of breathing room

const item: Variants = {
  hidden: { y: 16, opacity: 0 },
  show: { y: 0, opacity: 1, transition: { duration: 0.45, ease: EASE } },
};

const SECTIONS = [
  { id: "getting-started", label: "Getting Started", icon: Rocket },
  { id: "connect-whatsapp", label: "Connect Your WhatsApp", icon: MessageCircle },
  { id: "catalog", label: "Building Your Catalog", icon: Package },
  { id: "ai-assistant", label: "Configuring the AI Assistant", icon: Sparkles },
  { id: "orders-payments", label: "Orders & Payments", icon: Wallet },
  { id: "team-roles", label: "Team & Roles", icon: Users },
  { id: "api-reference", label: "API Reference", icon: BookOpen },
  { id: "security", label: "Security", icon: ShieldCheck },
];

function CodeBlock({ children }: { children: string }) {
  return (
    <pre className="mt-3 overflow-x-auto rounded-xl bg-[#171326] p-4 text-xs leading-relaxed text-zinc-100">
      <code>{children}</code>
    </pre>
  );
}

function Callout({ children }: { children: React.ReactNode }) {
  return (
    <div className="mt-4 rounded-xl border border-indigo-100 bg-indigo-50/60 p-4 text-sm text-foreground/70">
      {children}
    </div>
  );
}

export default function DocsPage() {
  const [active, setActive] = useState(SECTIONS[0].id);

  const goTo = (e: React.MouseEvent<HTMLAnchorElement>, id: string) => {
    e.preventDefault();
    const el = document.getElementById(id);
    if (el) {
      const top = el.getBoundingClientRect().top + window.scrollY - SCROLL_OFFSET;
      window.scrollTo({ top, behavior: "smooth" });
    }
    setActive(id);
  };

  return (
    <main className="bg-white px-4 py-14 sm:px-6 lg:py-20">
      <div className="mx-auto flex w-full max-w-6xl gap-10">
        {/* sidebar — desktop only, mobile gets a horizontal scroller above the content */}
        <aside className="sticky top-24 hidden h-fit w-56 shrink-0 lg:block">
          <p className="px-3 text-xs font-bold uppercase tracking-wide text-foreground/40">On this page</p>
          <nav className="mt-3 flex flex-col gap-0.5">
            {SECTIONS.map((s) => {
              const Icon = s.icon;
              const isActive = active === s.id;
              return (
                <a
                  key={s.id}
                  href={`#${s.id}`}
                  onClick={(e) => goTo(e, s.id)}
                  className={`flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm transition-colors ${
                    isActive
                      ? "bg-indigo-50 font-semibold text-[#45157b]"
                      : "text-foreground/60 hover:bg-black/[.03] hover:text-foreground"
                  }`}
                >
                  <Icon className="h-4 w-4 shrink-0" strokeWidth={2} />
                  {s.label}
                </a>
              );
            })}
          </nav>
        </aside>

        {/* mobile section jump — horizontal scroller */}
        <nav className="fixed inset-x-0 top-20 z-30 flex gap-2 overflow-x-auto border-b border-black/[.06] bg-white/90 px-4 py-3 backdrop-blur lg:hidden">
          {SECTIONS.map((s) => (
            <a
              key={s.id}
              href={`#${s.id}`}
              onClick={(e) => goTo(e, s.id)}
              className={`shrink-0 rounded-full border px-3 py-1.5 text-xs font-medium transition-colors ${
                active === s.id
                  ? "border-[#45157b] bg-[#45157b] text-white"
                  : "border-black/[.1] text-foreground/60"
              }`}
            >
              {s.label}
            </a>
          ))}
        </nav>

        <div className="min-w-0 flex-1 pt-16 lg:pt-0">
          <motion.div initial="hidden" animate="show" variants={item}>
            <h1 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl">Documentation</h1>
            <p className="mt-3 max-w-2xl text-sm text-foreground/60 sm:text-base">
              Everything you need to connect WhatsApp, set up your catalog, and get Exofe&apos;s
              AI assistant taking orders for your business.
            </p>
          </motion.div>

          <div className="mt-12 flex flex-col gap-16">
            <motion.section
              id="getting-started"
              initial="hidden"
              whileInView="show"
              viewport={{ once: true, amount: 0.2 }}
              variants={item}
              className="scroll-mt-28"
            >
              <h2 className="text-xl font-bold text-foreground">Getting Started</h2>
              <p className="mt-3 text-sm leading-relaxed text-foreground/65">
                Create your Exofe account, verify your email, and you&apos;ll land on the setup
                checklist. The three things you need before your assistant can go live: a WhatsApp
                Business number, at least one product in your catalog, and a payment method turned on.
              </p>
              <ol className="mt-4 flex flex-col gap-2 text-sm text-foreground/65">
                <li>1. Sign up at <Link href="/signup" className="font-medium text-[#45157b] hover:underline">exofe.com/signup</Link></li>
                <li>2. Confirm your business email</li>
                <li>3. Follow the 3-step setup checklist in your dashboard</li>
              </ol>
            </motion.section>

            <motion.section
              id="connect-whatsapp"
              initial="hidden"
              whileInView="show"
              viewport={{ once: true, amount: 0.2 }}
              variants={item}
              className="scroll-mt-28"
            >
              <h2 className="text-xl font-bold text-foreground">Connect Your WhatsApp</h2>
              <p className="mt-3 text-sm leading-relaxed text-foreground/65">
                Exofe connects through the official Meta WhatsApp Cloud API — not an unofficial
                bridge, so your number stays safe from bans. From your dashboard, go to{" "}
                <span className="font-medium text-foreground">Settings → WhatsApp</span> and follow the
                guided Meta verification flow.
              </p>
              <Callout>
                Already using WhatsApp Business App on this number? You&apos;ll need to migrate it to
                the Cloud API first — Exofe walks you through this during setup, it takes about 5 minutes.
              </Callout>
            </motion.section>

            <motion.section
              id="catalog"
              initial="hidden"
              whileInView="show"
              viewport={{ once: true, amount: 0.2 }}
              variants={item}
              className="scroll-mt-28"
            >
              <h2 className="text-xl font-bold text-foreground">Building Your Catalog</h2>
              <p className="mt-3 text-sm leading-relaxed text-foreground/65">
                Add products manually, or import them in bulk from a CSV or your existing Google
                Sheet. Each product needs a name, price, and stock count — photos and descriptions
                are optional but make the AI&apos;s replies noticeably better.
              </p>
              <p className="mt-3 text-sm leading-relaxed text-foreground/65">
                Prices update instantly across every conversation. If an item runs out of stock,
                Exofe automatically stops offering it and tells the customer when it&apos;s expected back.
              </p>
            </motion.section>

            <motion.section
              id="ai-assistant"
              initial="hidden"
              whileInView="show"
              viewport={{ once: true, amount: 0.2 }}
              variants={item}
              className="scroll-mt-28"
            >
              <h2 className="text-xl font-bold text-foreground">Configuring the AI Assistant</h2>
              <p className="mt-3 text-sm leading-relaxed text-foreground/65">
                The assistant answers from your catalog and any FAQs you add in{" "}
                <span className="font-medium text-foreground">Settings → AI Assistant</span>. You can
                set its tone (friendly, formal, or brief), the languages it replies in, and when it
                should hand a conversation off to a real teammate.
              </p>
              <Callout>
                Handoff is automatic for anything the assistant isn&apos;t confident about — it never
                guesses on pricing or order details.
              </Callout>
            </motion.section>

            <motion.section
              id="orders-payments"
              initial="hidden"
              whileInView="show"
              viewport={{ once: true, amount: 0.2 }}
              variants={item}
              className="scroll-mt-28"
            >
              <h2 className="text-xl font-bold text-foreground">Orders & Payments</h2>
              <p className="mt-3 text-sm leading-relaxed text-foreground/65">
                Every order collected on WhatsApp lands in your Orders dashboard in real time.
                Supported payment methods depend on your region:
              </p>
              <ul className="mt-3 flex flex-col gap-1.5 text-sm text-foreground/65">
                <li>• Cash on Delivery — available everywhere</li>
                <li>• JazzCash & Easypaisa — Pakistan</li>
                <li>• Stripe — South Korea, UAE, and international cards</li>
              </ul>
            </motion.section>

            <motion.section
              id="team-roles"
              initial="hidden"
              whileInView="show"
              viewport={{ once: true, amount: 0.2 }}
              variants={item}
              className="scroll-mt-28"
            >
              <h2 className="text-xl font-bold text-foreground">Team & Roles</h2>
              <p className="mt-3 text-sm leading-relaxed text-foreground/65">
                Invite teammates from <span className="font-medium text-foreground">Settings → Team</span>.
                Admins manage billing and integrations, Agents can take over handed-off conversations,
                and Viewers get read-only access to orders and analytics.
              </p>
            </motion.section>

            <motion.section
              id="api-reference"
              initial="hidden"
              whileInView="show"
              viewport={{ once: true, amount: 0.2 }}
              variants={item}
              className="scroll-mt-28"
            >
              <h2 className="text-xl font-bold text-foreground">API Reference</h2>
              <p className="mt-3 text-sm leading-relaxed text-foreground/65">
                Every account gets an API key for reading orders and products programmatically, or
                pushing catalog updates from your own systems. Authenticate with a bearer token on
                every request:
              </p>
              <CodeBlock>{`curl https://api.exofe.com/v1/orders \\
  -H "Authorization: Bearer YOUR_API_KEY"`}</CodeBlock>
              <p className="mt-4 text-sm leading-relaxed text-foreground/65">
                Full endpoint reference and webhook payloads are published once your account is
                verified — reach out to support if you need early access.
              </p>
            </motion.section>

            <motion.section
              id="security"
              initial="hidden"
              whileInView="show"
              viewport={{ once: true, amount: 0.2 }}
              variants={item}
              className="scroll-mt-28"
            >
              <h2 className="text-xl font-bold text-foreground">Security</h2>
              <p className="mt-3 text-sm leading-relaxed text-foreground/65">
                Messages and customer data are encrypted in transit and at rest. Exofe never uses
                your conversations to train models for other businesses, and you can export or
                delete your data at any time from account settings.
              </p>
            </motion.section>

            <motion.div
              initial="hidden"
              whileInView="show"
              viewport={{ once: true, amount: 0.4 }}
              variants={item}
              className="rounded-2xl border border-black/[.06] bg-zinc-50 p-6 sm:p-8"
            >
              <p className="text-sm font-semibold text-foreground">Still stuck?</p>
              <p className="mt-1 text-sm text-foreground/60">
                Check the{" "}
                <a href="/#faq" className="font-medium text-[#45157b] hover:underline">
                  FAQ
                </a>{" "}
                or reach out and we&apos;ll help you get set up.
              </p>
              <a
                href="mailto:hello@exofe.com"
                className="mt-4 inline-flex items-center gap-1.5 text-sm font-semibold text-[#45157b] hover:underline"
              >
                hello@exofe.com
                <ExternalLink className="h-3.5 w-3.5" strokeWidth={2} />
              </a>
            </motion.div>
          </div>
        </div>
      </div>
    </main>
  );
}
