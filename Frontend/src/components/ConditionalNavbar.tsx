"use client";

import { usePathname } from "next/navigation";
import Navbar from "@/components/Navbar";
import { HIDDEN_CHROME_ROUTES } from "@/lib/hidden-chrome-routes";

export default function ConditionalNavbar() {
  const pathname = usePathname();

  if (HIDDEN_CHROME_ROUTES.some((route) => pathname?.startsWith(route))) {
    return null;
  }

  return <Navbar />;
}
