"use client";

import { usePathname } from "next/navigation";
import Footer from "@/components/Footer";
import { HIDDEN_CHROME_ROUTES } from "@/lib/hidden-chrome-routes";

export default function ConditionalFooter() {
  const pathname = usePathname();

  if (!pathname || HIDDEN_CHROME_ROUTES.some((path) => pathname.startsWith(path))) {
    return null;
  }

  return <Footer />;
}
