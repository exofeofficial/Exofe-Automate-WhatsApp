"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  BarChart3,
  Building2,
  CreditCard,
  Flag,
  LayoutDashboard,
  LifeBuoy,
  LogOut,
  ScrollText,
  ShieldCheck,
  Users,
} from "lucide-react";
import { clearAdminToken } from "@/lib/adminAuth";

export const ADMIN_NAV = [
  { label: "Overview", href: "/admin", icon: LayoutDashboard },
  { label: "Users", href: "/admin/users", icon: Users },
  { label: "Clients", href: "/admin/clients", icon: Building2 },
  { label: "Subscriptions", href: "/admin/subscriptions", icon: CreditCard },
  { label: "Revenue", href: "/admin/revenue", icon: BarChart3 },
  { label: "Analytics", href: "/admin/analytics", icon: BarChart3 },
  { label: "Logs", href: "/admin/logs", icon: ScrollText },
  { label: "Support", href: "/admin/support", icon: LifeBuoy },
  { label: "Feature Flags", href: "/admin/feature-flags", icon: Flag },
];

export default function AdminSidebar() {
  const pathname = usePathname();
  const router = useRouter();

  const handleLogout = () => {
    clearAdminToken();
    router.push("/admin/login");
  };

  return (
    <div className="sticky top-0 flex h-screen w-64 flex-col border-r border-white/10 bg-zinc-950">
      <div className="flex items-center gap-2 px-5 py-5">
        <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#5B4FE9]/15 text-[#7C6FF5]">
          <ShieldCheck className="h-4 w-4" strokeWidth={2} />
        </span>
        <div>
          <p className="text-sm font-bold text-white">Exofe Admin</p>
          <p className="text-[10px] text-white/35">Internal only</p>
        </div>
      </div>

      <nav className="flex flex-1 flex-col gap-0.5 overflow-y-auto px-3">
        {ADMIN_NAV.map((item) => {
          const isActive = pathname === item.href;
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors ${
                isActive ? "bg-[#5B4FE9]/15 text-[#7C6FF5]" : "text-white/55 hover:bg-white/5 hover:text-white/80"
              }`}
            >
              <Icon className="h-[18px] w-[18px] shrink-0" strokeWidth={2} />
              {item.label}
            </Link>
          );
        })}
      </nav>

      <div className="border-t border-white/10 p-3">
        <button
          type="button"
          onClick={handleLogout}
          className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-white/50 transition-colors hover:bg-white/5 hover:text-white/80"
        >
          <LogOut className="h-[18px] w-[18px]" strokeWidth={2} />
          Log out
        </button>
      </div>
    </div>
  );
}
