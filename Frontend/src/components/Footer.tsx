"use client";

import Link from "next/link";
import { motion, type Variants } from "framer-motion";

const EASE = [0.22, 1, 0.36, 1] as const;

const container: Variants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.1, delayChildren: 0.1 } },
};

const item: Variants = {
  hidden: { y: 20, opacity: 0 },
  show: { y: 0, opacity: 1, transition: { duration: 0.5, ease: EASE } },
};

const MENU_LINKS = [
  { label: "Home", href: "/" },
  { label: "Features", href: "/features" },
  { label: "Why Choose", href: "/why-choose" },
  { label: "Pricing", href: "/pricing" },
  { label: "FAQ", href: "/faq" },
];

const COMPANY_LINKS = [
  { label: "About Us", href: "/about" },
  { label: "Blog", href: "/blog" },
  { label: "Support", href: "/support" },
  { label: "Terms of Service", href: "/terms" },
  { label: "Privacy Policy", href: "/privacy" },
  { label: "Data Deletion", href: "/data-deletion" },
];

const SOCIALS = [
  {
    label: "Facebook",
    href: "https://facebook.com",
    path: "M13 22v-8h2.7l.4-3H13V9c0-.87.24-1.46 1.5-1.46H16V4.9c-.26-.04-1.16-.11-2.2-.11-2.18 0-3.67 1.33-3.67 3.77V11H7.4v3H10v8h3Z",
  },
  {
    label: "Instagram",
    href: "https://instagram.com",
    path: "M12 8.2A3.8 3.8 0 1 0 12 15.8 3.8 3.8 0 1 0 12 8.2ZM17.5 6.5a1 1 0 1 0 0 2 1 1 0 1 0 0-2ZM3 8c0-2.76 2.24-5 5-5h8c2.76 0 5 2.24 5 5v8c0 2.76-2.24 5-5 5H8c-2.76 0-5-2.24-5-5V8Zm2 0v8c0 1.66 1.34 3 3 3h8c1.66 0 3-1.34 3-3V8c0-1.66-1.34-3-3-3H8C6.34 5 5 6.34 5 8Z",
  },
  {
    label: "X",
    href: "https://x.com",
    path: "M4 4l7.2 9.4L4.3 20H6l6.1-5.9L16.8 20H20l-7.6-9.9L19.4 4h-1.7l-5.6 5.5L7.2 4H4Zm2.6 1.5h1.7l9.1 12.9h-1.7L6.6 5.5Z",
  },
  {
    label: "LinkedIn",
    href: "https://linkedin.com",
    path: "M4.98 3.5a2.5 2.5 0 1 0 0 5 2.5 2.5 0 0 0 0-5ZM3 9.5h4V21H3V9.5Zm7 0h3.8v1.6h.05c.53-1 1.83-2.06 3.77-2.06 4.03 0 4.78 2.65 4.78 6.1V21h-4v-5.3c0-1.26-.02-2.88-1.76-2.88-1.76 0-2.03 1.37-2.03 2.79V21h-4V9.5Z",
  },
];

function LogoMark() {
  // eslint-disable-next-line @next/next/no-img-element
  return <img src="/logo-icon.png" alt="" className="h-8 w-auto" />;
}

export default function Footer() {
  return (
    <footer className="relative overflow-hidden border-t border-black/[.06] bg-white px-4 pt-16 sm:px-6">
      <motion.div
        initial="hidden"
        whileInView="show"
        viewport={{ once: true, amount: 0.2 }}
        variants={container}
        className="mx-auto grid w-full max-w-6xl grid-cols-1 gap-10 pb-14 sm:grid-cols-2 lg:grid-cols-[1.4fr_1fr_1fr_1fr]"
      >
        <motion.div variants={item}>
          <Link href="/" className="flex items-center gap-2">
            <LogoMark />
            <span className="text-xl font-bold tracking-tight text-foreground">Exofe</span>
          </Link>
          <p className="mt-4 max-w-xs text-sm text-foreground/55">
            We help small businesses automate WhatsApp sales and grow faster.
          </p>
        </motion.div>

        <motion.div variants={item}>
          <p className="text-sm font-bold text-foreground">Menus</p>
          <ul className="mt-4 flex flex-col gap-3">
            {MENU_LINKS.map((l) => (
              <li key={l.label}>
                <Link
                  href={l.href}
                  className="text-sm text-foreground/60 transition-colors duration-200 hover:text-[#5B4FE9]"
                >
                  {l.label}
                </Link>
              </li>
            ))}
          </ul>
        </motion.div>

        <motion.div variants={item}>
          <p className="text-sm font-bold text-foreground">Company</p>
          <ul className="mt-4 flex flex-col gap-3">
            {COMPANY_LINKS.map((l) => (
              <li key={l.label}>
                <Link
                  href={l.href}
                  className="text-sm text-foreground/60 transition-colors duration-200 hover:text-[#5B4FE9]"
                >
                  {l.label}
                </Link>
              </li>
            ))}
          </ul>
        </motion.div>

        <motion.div variants={item}>
          <p className="text-sm font-bold text-foreground">Contact</p>
          <ul className="mt-4 flex flex-col gap-3 text-sm text-foreground/60">
            <li>
              <a href="mailto:hello@exofe.com" className="transition-colors duration-200 hover:text-[#5B4FE9]">
                hello@exofe.com
              </a>
            </li>
            <li>
              <a href="tel:+923001234567" className="transition-colors duration-200 hover:text-[#5B4FE9]">
                +92 300 1234567
              </a>
            </li>
            <li className="max-w-[14rem]">Gulberg III, Lahore, Pakistan</li>
          </ul>
        </motion.div>
      </motion.div>

      <div className="relative border-t border-black/[.06] py-8">
        <div className="mx-auto flex w-full max-w-6xl items-center justify-between">
          <motion.div
            initial="hidden"
            whileInView="show"
            viewport={{ once: true, amount: 0.6 }}
            variants={container}
            className="flex items-center gap-3"
          >
            {SOCIALS.map((s) => (
              <motion.a
                key={s.label}
                variants={item}
                whileHover={{ y: -3, scale: 1.05 }}
                href={s.href}
                target="_blank"
                rel="noopener noreferrer"
                aria-label={s.label}
                className="flex h-9 w-9 items-center justify-center rounded-full bg-black/[.05] text-foreground/70 transition-colors duration-200 hover:bg-[#5B4FE9] hover:text-white"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                  <path d={s.path} />
                </svg>
              </motion.a>
            ))}
          </motion.div>
        </div>

        <motion.p
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true, amount: 0.6 }}
          transition={{ duration: 0.6, delay: 0.2 }}
          className="relative mt-8 text-center text-xs text-foreground/45"
        >
          © {new Date().getFullYear()} Exofe. All rights reserved.
        </motion.p>
      </div>
    </footer>
  );
}
