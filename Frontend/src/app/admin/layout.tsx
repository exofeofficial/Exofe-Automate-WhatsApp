"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import AdminSidebar, { ADMIN_NAV } from "@/components/admin/AdminSidebar";
import { getAdminToken } from "@/lib/adminAuth";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [checked, setChecked] = useState(false);

  const isLoginPage = pathname === "/admin/login";

  useEffect(() => {
    if (isLoginPage) {
      setChecked(true);
      return;
    }
    if (!getAdminToken()) {
      router.replace("/admin/login");
      return;
    }
    setChecked(true);
  }, [router, isLoginPage]);

  if (!checked) {
    return <div className="flex min-h-screen items-center justify-center bg-zinc-950" />;
  }

  if (isLoginPage) {
    return <>{children}</>;
  }

  const title = ADMIN_NAV.find((n) => n.href === pathname)?.label ?? "Admin";

  return (
    <div className="flex min-h-screen bg-zinc-900">
      <div className="hidden lg:block">
        <AdminSidebar />
      </div>
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-20 flex h-16 items-center border-b border-white/10 bg-zinc-900/90 px-4 backdrop-blur sm:px-6">
          <h1 className="text-base font-bold text-white sm:text-lg">{title}</h1>
        </header>
        <main className="flex-1 p-4 sm:p-6">{children}</main>
      </div>
    </div>
  );
}
