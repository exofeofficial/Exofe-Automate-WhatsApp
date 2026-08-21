"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { AnimatePresence, motion, useMotionValueEvent, useScroll } from "framer-motion";
import { Menu, Play, X } from "lucide-react";

const NAV_LINKS = [
  { label: "Home", href: "#home" },
  { label: "Features", href: "#features" },
  { label: "Why Choose", href: "#why-choose" },
  { label: "Pricing", href: "#pricing" },
  { label: "FAQ", href: "#faq" },
];

const NAVBAR_OFFSET = 84; // fixed header height + a little breathing room

export default function Navbar() {
  const [isOpen, setIsOpen] = useState(false);

  // Locks background scroll while the mobile menu is open, otherwise the
  // page behind the fixed header still scrolls/bounces underneath it.
  useEffect(() => {
    if (!isOpen) return;
    const { overflow } = document.body.style;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = overflow;
    };
  }, [isOpen]);

  const scrollToSection = (e: React.MouseEvent<HTMLAnchorElement>, href: string) => {
    e.preventDefault();
    const target = document.querySelector(href);
    if (target) {
      const top = target.getBoundingClientRect().top + window.scrollY - NAVBAR_OFFSET;
      window.scrollTo({ top, behavior: "smooth" });
    }
    setIsOpen(false);
  };

  // hide on scroll down, reappear on scroll up — the pill floats over the
  // page at every scroll position, so it always carries its own shadow
  // (no more "transparent at the top" state, there's no bar to blend in)
  const [hidden, setHidden] = useState(false);
  const lastY = useRef(0);
  const { scrollY } = useScroll();

  useMotionValueEvent(scrollY, "change", (latest) => {
    const delta = latest - lastY.current;

    if (latest < 80) {
      setHidden(false);
    } else if (delta > 4) {
      setHidden(true);
    } else if (delta < -4) {
      setHidden(false);
    }

    lastY.current = latest;
  });

  return (
    <>
      <motion.header
        initial={{ y: -20, opacity: 0 }}
        animate={{ y: isOpen || !hidden ? 0 : "-120%", opacity: 1 }}
        transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
        className="fixed inset-x-0 top-0 z-50 flex justify-center px-4 pt-3 sm:pt-4"
      >
        <div className="flex w-full max-w-3xl items-center gap-2">
          <nav className="flex min-w-0 flex-1 items-center gap-1 rounded-full border border-black/[.06] bg-white/95 py-1.5 pl-1.5 pr-2 shadow-lg shadow-black/[.06] backdrop-blur-md">
            {/* round icon-only logo */}
            <Link href="/" aria-label="Exofe" className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-full">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/NAVlogo.jpg" alt="" className="h-full w-full object-cover" />
            </Link>

            <ul className="hidden min-w-0 flex-1 items-center justify-center gap-0.5 lg:flex">
              {NAV_LINKS.map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    onClick={(e) => scrollToSection(e, link.href)}
                    className="block whitespace-nowrap rounded-full px-4 py-2 text-sm font-medium text-foreground/65 transition-colors hover:bg-black/[.04] hover:text-foreground"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>

            <button
              type="button"
              aria-label={isOpen ? "Close menu" : "Open menu"}
              aria-expanded={isOpen}
              onClick={() => setIsOpen((prev) => !prev)}
              className="ml-auto flex h-9 w-9 shrink-0 items-center justify-center rounded-full transition-colors hover:bg-black/[.04] lg:hidden"
            >
              <AnimatePresence mode="wait" initial={false}>
                {isOpen ? (
                  <motion.span
                    key="close"
                    initial={{ rotate: -90, opacity: 0 }}
                    animate={{ rotate: 0, opacity: 1 }}
                    exit={{ rotate: 90, opacity: 0 }}
                    transition={{ duration: 0.2 }}
                    className="flex"
                  >
                    <X className="h-5 w-5 text-foreground" strokeWidth={2} />
                  </motion.span>
                ) : (
                  <motion.span
                    key="open"
                    initial={{ rotate: 90, opacity: 0 }}
                    animate={{ rotate: 0, opacity: 1 }}
                    exit={{ rotate: -90, opacity: 0 }}
                    transition={{ duration: 0.2 }}
                    className="flex"
                  >
                    <Menu className="h-5 w-5 text-foreground" strokeWidth={2} />
                  </motion.span>
                )}
              </AnimatePresence>
            </button>
          </nav>

          <motion.div whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.97 }} className="hidden shrink-0 lg:block">
            <Link
              href="/signup"
              className="shine-btn relative flex items-center justify-center overflow-hidden rounded-full bg-gradient-to-b from-[#2a2350] to-[#171326] px-5 py-3 text-xs font-semibold text-white shadow-lg shadow-indigo-900/25 transition-shadow hover:shadow-indigo-900/40"
            >
              Try Exofe for Free
            </Link>
          </motion.div>
        </div>
      </motion.header>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
            className="fixed inset-x-4 top-[4.75rem] z-40 overflow-hidden rounded-3xl border border-black/[.06] bg-white shadow-xl shadow-black/10 lg:hidden"
          >
            <ul className="flex flex-col gap-1 p-4">
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
                    className="block rounded-xl px-3 py-2.5 text-base font-medium text-foreground/70 transition-colors hover:bg-black/[.04] hover:text-foreground"
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
    </>
  );
}
