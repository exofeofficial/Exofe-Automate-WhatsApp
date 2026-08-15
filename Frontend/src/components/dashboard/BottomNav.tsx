"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Bot, Grid3x3, LayoutGrid, MessageCircle, Package } from "lucide-react";
import { getActiveNavHref } from "@/components/dashboard/Sidebar";

// Small-screen primary nav — a fixed bottom tab bar instead of a slide-out
// sidebar, the pattern people already know from WhatsApp/Instagram. Only the
// highest-traffic pages get a permanent slot, everything else lives behind
// "More" (see MoreSheet).
const ITEMS = [
  { label: "Home", href: "/dashboard", icon: LayoutGrid },
  { label: "Chats", href: "/dashboard/conversations", icon: MessageCircle },
  { label: "Orders", href: "/dashboard/orders", icon: Package },
  { label: "AI", href: "/dashboard/ai-assistant", icon: Bot },
] as const;

export default function BottomNav({ onMoreClick }: { onMoreClick: () => void }) {
  const pathname = usePathname();
  const activeHref = getActiveNavHref(pathname);

  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 flex items-stretch justify-around border-t border-ink/[.06] bg-surface pb-[env(safe-area-inset-bottom)] shadow-[0_-4px_16px_rgba(0,0,0,0.05)] lg:hidden">
      {ITEMS.map((item) => {
        const isActive = item.href === activeHref;
        const Icon = item.icon;
        return (
          <Link
            key={item.href}
            href={item.href}
            className="flex flex-1 flex-col items-center justify-center gap-0.5 py-2"
          >
            <span
              className={`flex h-8 w-8 items-center justify-center rounded-full transition-colors ${
                isActive ? "bg-indigo-50 text-[#45157b] dark:bg-indigo-500/15 dark:text-[#c4b5fd]" : "text-foreground/45"
              }`}
            >
              <Icon className="h-[18px] w-[18px]" strokeWidth={2.2} />
            </span>
            <span className={`text-[10px] font-medium ${isActive ? "text-[#45157b] dark:text-[#c4b5fd]" : "text-foreground/45"}`}>
              {item.label}
            </span>
          </Link>
        );
      })}
      <button
        type="button"
        onClick={onMoreClick}
        aria-label="More pages"
        className="flex flex-1 flex-col items-center justify-center gap-0.5 py-2"
      >
        <span className="flex h-8 w-8 items-center justify-center rounded-full text-foreground/45">
          <Grid3x3 className="h-[18px] w-[18px]" strokeWidth={2.2} />
        </span>
        <span className="text-[10px] font-medium text-foreground/45">More</span>
      </button>
    </nav>
  );
}
