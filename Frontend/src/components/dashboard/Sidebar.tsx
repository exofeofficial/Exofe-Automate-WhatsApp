"use client";

import { useState, type ComponentType } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import {
  BarChart3,
  Bot,
  ChevronDown,
  CreditCard,
  LayoutDashboard,
  MessageCircle,
  Package,
  Plug,
  Settings,
  ShoppingBag,
  Users,
  UserCog,
  Workflow,
  X,
} from "lucide-react";
import UpgradeCard from "@/components/dashboard/UpgradeCard";
import type { TrialStatus } from "@/lib/trial";

type IconType = ComponentType<{ className?: string; strokeWidth?: number }>;
type NavLink = { type: "link"; label: string; href: string; icon: IconType };
type NavGroup = { type: "group"; label: string; icon: IconType; children: { label: string; href: string }[] };
type NavEntry = NavLink | NavGroup;

// Conversations sits right under Dashboard on purpose, this is a WhatsApp
// automation product, that's where people will spend most of their time.
export const NAV: NavEntry[] = [
  { type: "link", label: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { type: "link", label: "Conversations", href: "/dashboard/conversations", icon: MessageCircle },
  { type: "link", label: "Orders", href: "/dashboard/orders", icon: Package },
  { type: "link", label: "Products", href: "/dashboard/products", icon: ShoppingBag },
  { type: "link", label: "Customers", href: "/dashboard/customers", icon: Users },
  { type: "link", label: "Analytics", href: "/dashboard/analytics", icon: BarChart3 },
  { type: "link", label: "AI Assistant", href: "/dashboard/ai-assistant", icon: Bot },
  {
    type: "group",
    label: "Automation",
    icon: Workflow,
    children: [
      { label: "AI Automations", href: "/dashboard/automation/ai" },
      { label: "Interactive Messages", href: "/dashboard/automation/interactive-messages" },
      { label: "Templates", href: "/dashboard/automation/templates" },
      { label: "Flow Builder", href: "/dashboard/automation/flow-builder" },
    ],
  },
  { type: "link", label: "Team", href: "/dashboard/team", icon: UserCog },
  { type: "link", label: "Integrations", href: "/dashboard/integrations", icon: Plug },
  { type: "link", label: "Billing", href: "/dashboard/billing", icon: CreditCard },
  { type: "link", label: "Settings", href: "/dashboard/settings", icon: Settings },
];

function flatLinks(): { label: string; href: string }[] {
  return NAV.flatMap((entry) => (entry.type === "link" ? [{ label: entry.label, href: entry.href }] : entry.children));
}

// Same flatten, but keeps the icon (group children inherit their group's
// icon) — for the "all pages" grids (mobile MoreSheet).
export function flatNavItemsWithIcons(): { label: string; href: string; icon: IconType }[] {
  return NAV.flatMap((entry) =>
    entry.type === "link"
      ? [{ label: entry.label, href: entry.href, icon: entry.icon }]
      : entry.children.map((c) => ({ label: c.label, href: c.href, icon: entry.icon }))
  );
}

// Nested routes (like /dashboard/integrations/whatsapp) should still
// highlight their parent nav item and use its label as the page title.
// Picks the longest NAV href that prefixes the current path.
export function getActiveNavHref(pathname: string | null): string {
  const links = flatLinks();
  if (!pathname) return links[0].href;
  const match = [...links]
    .sort((a, b) => b.href.length - a.href.length)
    .find((n) => pathname === n.href || pathname.startsWith(`${n.href}/`));
  return match?.href ?? links[0].href;
}

// Used for the Topbar title, returns the matched link's own label, so a
// route inside the Automation group shows "Interactive Messages", not
// the group name "Automation".
export function getPageTitle(pathname: string | null): string {
  const activeHref = getActiveNavHref(pathname);
  return flatLinks().find((l) => l.href === activeHref)?.label ?? "Dashboard";
}

function LogoMark() {
  // eslint-disable-next-line @next/next/no-img-element
  return <img src="/logo-icon.png" alt="" className="h-7 w-auto" />;
}

const EASE = [0.22, 1, 0.36, 1] as const;

export default function Sidebar({ onClose, trial }: { onClose?: () => void; trial: TrialStatus }) {
  const pathname = usePathname();
  const activeHref = getActiveNavHref(pathname);

  const [openGroup, setOpenGroup] = useState<string | null>(() => {
    const group = NAV.find((n): n is NavGroup => n.type === "group" && n.children.some((c) => c.href === activeHref));
    return group?.label ?? null;
  });

  return (
    <div className="sticky top-4 m-4 flex h-[calc(100vh-2rem)] w-64 shrink-0 flex-col overflow-hidden rounded-3xl bg-[#171326] shadow-[0_24px_60px_-24px_rgba(24,19,43,0.55)]">
      {/* soft ambient glow behind the logo — a single restrained accent,
          not a repeated motif, so it reads as premium rather than busy */}
      <div className="pointer-events-none absolute -top-10 left-1/2 h-32 w-48 -translate-x-1/2 rounded-full bg-[#7c3aed]/25 blur-3xl" />

      <div className="relative flex items-center justify-between px-5 py-5">
        <Link href="/dashboard" className="flex items-center gap-2.5">
          <LogoMark />
          <span className="text-lg font-bold tracking-tight text-white">Exofe</span>
        </Link>
        {onClose && (
          <button
            type="button"
            onClick={onClose}
            aria-label="Close menu"
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-white/50 transition-colors hover:bg-white/[.08] hover:text-white lg:hidden"
          >
            <X className="h-[18px] w-[18px]" strokeWidth={2} />
          </button>
        )}
      </div>

      <nav className="relative flex flex-1 flex-col gap-0.5 overflow-y-auto px-3 pb-2">
        {NAV.map((entry) => {
          const Icon = entry.icon;

          if (entry.type === "link") {
            const isActive = entry.href === activeHref;
            return (
              <Link
                key={entry.href}
                href={entry.href}
                onClick={onClose}
                className="relative flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors hover:bg-white/[.05]"
              >
                {isActive && (
                  <motion.span
                    layoutId="sidebar-active"
                    transition={{ duration: 0.25, ease: EASE }}
                    className="absolute inset-0 rounded-xl bg-[#c4b5fd] shadow-[0_8px_20px_-6px_rgba(196,181,253,0.5)]"
                  />
                )}
                <Icon className={`relative h-[18px] w-[18px] shrink-0 ${isActive ? "text-[#171326]" : "text-white/50"}`} strokeWidth={2} />
                <span className={`relative ${isActive ? "font-semibold text-[#171326]" : "text-white/75"}`}>{entry.label}</span>
              </Link>
            );
          }

          const hasActiveChild = entry.children.some((c) => c.href === activeHref);
          const isOpen = openGroup === entry.label;

          return (
            <div key={entry.label}>
              <button
                type="button"
                onClick={() => setOpenGroup(isOpen ? null : entry.label)}
                className={`flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors hover:bg-white/[.05] ${
                  hasActiveChild ? "text-[#c4b5fd]" : "text-white/75"
                }`}
              >
                <Icon className={`h-[18px] w-[18px] shrink-0 ${hasActiveChild ? "text-[#c4b5fd]" : "text-white/50"}`} strokeWidth={2} />
                <span className="flex-1 text-left">{entry.label}</span>
                <ChevronDown className={`h-3.5 w-3.5 shrink-0 transition-transform ${isOpen ? "rotate-180" : ""}`} strokeWidth={2} />
              </button>
              <AnimatePresence initial={false}>
                {isOpen && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.2 }}
                    className="overflow-hidden"
                  >
                    <div className="ml-[27px] flex flex-col gap-0.5 border-l border-white/10 py-1 pl-3">
                      {entry.children.map((child) => {
                        const isActive = child.href === activeHref;
                        return (
                          <Link
                            key={child.href}
                            href={child.href}
                            onClick={onClose}
                            className={`rounded-lg px-2.5 py-2 text-sm transition-colors ${
                              isActive ? "bg-white/10 font-medium text-[#c4b5fd]" : "text-white/55 hover:bg-white/[.05]"
                            }`}
                          >
                            {child.label}
                          </Link>
                        );
                      })}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          );
        })}
      </nav>

      <div className="relative border-t border-white/10 p-3">
        <UpgradeCard trial={trial} />
      </div>
    </div>
  );
}
