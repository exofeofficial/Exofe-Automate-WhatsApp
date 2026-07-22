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
  return <img src="/logo-icon.png" alt="" className="h-[26px] w-auto" />;
}

export default function Sidebar({ onClose, trial }: { onClose?: () => void; trial: TrialStatus }) {
  const pathname = usePathname();
  const activeHref = getActiveNavHref(pathname);

  const [openGroup, setOpenGroup] = useState<string | null>(() => {
    const group = NAV.find((n): n is NavGroup => n.type === "group" && n.children.some((c) => c.href === activeHref));
    return group?.label ?? null;
  });

  return (
    <div className="sticky top-4 m-4 flex h-[calc(100vh-2rem)] w-64 shrink-0 flex-col rounded-3xl bg-surface shadow-sm">
      <div className="flex items-center justify-between px-5 py-5">
        <Link href="/dashboard" className="flex items-center gap-2">
          <LogoMark />
          <span className="text-lg font-bold tracking-tight text-foreground">Exofe</span>
        </Link>
        {onClose && (
          <button
            type="button"
            onClick={onClose}
            aria-label="Close menu"
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-foreground/50 transition-colors hover:bg-ink/[.04] hover:text-foreground lg:hidden"
          >
            <X className="h-[18px] w-[18px]" strokeWidth={2} />
          </button>
        )}
      </div>

      <nav className="flex flex-1 flex-col gap-0.5 overflow-y-auto px-3">
        {NAV.map((entry) => {
          const Icon = entry.icon;

          if (entry.type === "link") {
            const isActive = entry.href === activeHref;
            return (
              <Link
                key={entry.href}
                href={entry.href}
                onClick={onClose}
                className="relative flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors"
              >
                {isActive && (
                  <motion.span
                    layoutId="sidebar-active"
                    transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
                    className="absolute inset-0 rounded-xl bg-indigo-50 dark:bg-indigo-500/15"
                  />
                )}
                <Icon className={`relative h-[18px] w-[18px] shrink-0 ${isActive ? "text-[#5B4FE9]" : "text-foreground/45"}`} strokeWidth={2} />
                <span className={`relative ${isActive ? "text-[#5B4FE9]" : "text-foreground/70"}`}>{entry.label}</span>
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
                className={`flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors hover:bg-ink/[.03] ${
                  hasActiveChild ? "text-[#5B4FE9]" : "text-foreground/70"
                }`}
              >
                <Icon className={`h-[18px] w-[18px] shrink-0 ${hasActiveChild ? "text-[#5B4FE9]" : "text-foreground/45"}`} strokeWidth={2} />
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
                    <div className="ml-[27px] flex flex-col gap-0.5 border-l border-ink/[.06] py-1 pl-3">
                      {entry.children.map((child) => {
                        const isActive = child.href === activeHref;
                        return (
                          <Link
                            key={child.href}
                            href={child.href}
                            onClick={onClose}
                            className={`rounded-lg px-2.5 py-2 text-sm transition-colors ${
                              isActive ? "bg-indigo-50 dark:bg-indigo-500/15 font-medium text-[#5B4FE9]" : "text-foreground/60 hover:bg-ink/[.03]"
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

      <div className="border-t border-ink/[.06] p-3">
        <UpgradeCard trial={trial} />
      </div>
    </div>
  );
}
