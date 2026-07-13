"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import { AnimatePresence, motion, useMotionValueEvent, useScroll } from "framer-motion";
import { Play } from "lucide-react";

const NAV_LINKS = [
  { label: "Home", href: "#home" },
  { label: "Features", href: "#features" },
  { label: "Why Choose", href: "#why-choose" },
  { label: "Pricing", href: "#pricing" },
  { label: "FAQ", href: "#faq" },
];

const NAVBAR_OFFSET = 84; // fixed header height + a little breathing room

function Logo() {
  return (
    <Link href="/" className="flex items-center gap-2">
      <svg
        width="32"
        height="32"
        viewBox="0 0 32 32"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <path
          d="M4 18L12 10L16 14L20 10L28 18"
          stroke="#5B4FE9"
          strokeWidth="4"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <path
          d="M4 24L12 16L16 20L20 16L28 24"
          stroke="#5B4FE9"
          strokeWidth="4"
          strokeLinecap="round"
          strokeLinejoin="round"
          opacity="0.5"
        />
      </svg>
      <span className="text-xl font-bold tracking-tight text-foreground">Exofe</span>
    </Link>
  );
}

export default function Navbar() {
  const [isOpen, setIsOpen] = useState(false);

  const scrollToSection = (e: React.MouseEvent<HTMLAnchorElement>, href: string) => {
    e.preventDefault();
    const target = document.querySelector(href);
    if (target) {
      const top = target.getBoundingClientRect().top + window.scrollY - NAVBAR_OFFSET;
      window.scrollTo({ top, behavior: "smooth" });
    }
    setIsOpen(false);
  };

  // hide on scroll down, reappear with a bg on scroll up, transparent at the top
  const [hidden, setHidden] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const lastY = useRef(0);
  const { scrollY } = useScroll();

  useMotionValueEvent(scrollY, "change", (latest) => {
    const delta = latest - lastY.current;

    if (latest < 80) {
      setHidden(false);
      setScrolled(false);
    } else if (delta > 4) {
      setHidden(true);
    } else if (delta < -4) {
      setHidden(false);
      setScrolled(true);
    }

    lastY.current = latest;
  });

  return (
    <>
      <motion.header
        initial={{ y: -20, opacity: 0 }}
        animate={{ y: isOpen || !hidden ? 0 : "-100%", opacity: 1 }}
        transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
        className={`fixed top-0 z-50 w-full transition-colors duration-300 ${
          scrolled ? "border-b border-black/[.06] bg-white/85 shadow-sm backdrop-blur-md" : "bg-transparent"
        }`}
      >
        <nav className="mx-auto flex h-20 w-full max-w-7xl items-center justify-between px-6">
        <Logo />

        <ul className="hidden items-center gap-9 lg:flex">
          {NAV_LINKS.map((link) => (
            <li key={link.href}>
              <Link
                href={link.href}
                onClick={(e) => scrollToSection(e, link.href)}
                className="relative block h-[20px] overflow-hidden text-[15px] font-medium"
              >
                <motion.span
                  className="flex flex-col"
                  initial={false}
                  whileHover={{ y: -20 }}
                  transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
                >
                  <span className="leading-[20px] text-foreground/60">{link.label}</span>
                  <span className="leading-[20px] font-semibold text-[#171326]">{link.label}</span>
                </motion.span>
              </Link>
            </li>
          ))}
        </ul>

        <div className="hidden items-center gap-3 lg:flex">
          <motion.div whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.97 }}>
            <Link
              href="/demo"
              className="shine-btn relative flex items-center gap-1.5 overflow-hidden rounded-xl border border-indigo-100 bg-indigo-50 px-3.5 py-2 text-xs font-semibold text-[#5B4FE9] transition-colors hover:bg-indigo-100"
            >
              <span className="flex h-4 w-4 items-center justify-center rounded-full bg-[#5B4FE9]">
                <Play className="ml-0.5 h-2 w-2 fill-white text-white" strokeWidth={0} />
              </span>
              Book a Demo
            </Link>
          </motion.div>
          <motion.div whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.97 }}>
            <Link
              href="/signup"
              className="shine-btn relative flex items-center justify-center overflow-hidden rounded-xl bg-gradient-to-b from-[#2a2350] to-[#171326] px-3.5 py-2 text-xs font-semibold text-white shadow-lg shadow-indigo-900/25 transition-shadow hover:shadow-indigo-900/40"
            >
              Try Exofe for Free
            </Link>
          </motion.div>
        </div>

        <button
          type="button"
          aria-label={isOpen ? "Close menu" : "Open menu"}
          aria-expanded={isOpen}
          onClick={() => setIsOpen((prev) => !prev)}
          className="relative z-50 flex h-9 w-9 flex-col items-center justify-center gap-1.5 lg:hidden"
        >
          <motion.span
            animate={isOpen ? { rotate: 45, y: 6.5 } : { rotate: 0, y: 0 }}
            transition={{ duration: 0.25 }}
            className="h-0.5 w-6 rounded-full bg-foreground"
          />
          <motion.span
            animate={isOpen ? { opacity: 0 } : { opacity: 1 }}
            transition={{ duration: 0.2 }}
            className="h-0.5 w-6 rounded-full bg-foreground"
          />
          <motion.span
            animate={isOpen ? { rotate: -45, y: -6.5 } : { rotate: 0, y: 0 }}
            transition={{ duration: 0.25 }}
            className="h-0.5 w-6 rounded-full bg-foreground"
          />
        </button>
      </nav>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3, ease: "easeInOut" }}
            className="overflow-hidden border-t border-black/[.06] bg-white lg:hidden"
          >
            <ul className="flex flex-col gap-1 px-6 py-4">
              {NAV_LINKS.map((link, index) => (
                <motion.li
                  key={link.href}
                  initial={{ x: -16, opacity: 0 }}
                  animate={{ x: 0, opacity: 1 }}
                  transition={{ duration: 0.25, delay: index * 0.05 }}
                >
                  <Link
                    href={link.href}
                    onClick={(e) => scrollToSection(e, link.href)}
                    className="block rounded-lg px-3 py-2.5 text-base font-medium text-foreground/70 transition-colors hover:bg-black/[.04] hover:text-foreground"
                  >
                    {link.label}
                  </Link>
                </motion.li>
              ))}
              <motion.li
                initial={{ x: -16, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                transition={{ duration: 0.25, delay: NAV_LINKS.length * 0.05 }}
                className="flex flex-col gap-2 pt-2"
              >
                <Link
                  href="/demo"
                  onClick={() => setIsOpen(false)}
                  className="flex items-center justify-center gap-2 rounded-full border border-black/[.12] bg-white px-4 py-2.5 text-center text-sm font-semibold text-foreground transition-colors hover:bg-black/[.03]"
                >
                  <span className="flex h-5 w-5 items-center justify-center rounded-full bg-[#171326]">
                    <Play className="ml-0.5 h-2.5 w-2.5 fill-white text-white" strokeWidth={0} />
                  </span>
                  Book a Demo
                </Link>
                <Link
                  href="/signup"
                  onClick={() => setIsOpen(false)}
                  className="block rounded-full bg-gradient-to-b from-[#2a2350] to-[#171326] px-4 py-2.5 text-center text-sm font-semibold text-white shadow-lg shadow-indigo-900/25 transition-shadow hover:shadow-indigo-900/40"
                >
                  Try Exofe for Free
                </Link>
              </motion.li>
            </ul>
          </motion.div>
        )}
      </AnimatePresence>
      </motion.header>

      {/* fixed header no longer sits in flow — reserve its height so content doesn't jump */}
      <div className="h-20" />
    </>
  );
}
