"use client";

import { ReactLenis, useLenis } from "lenis/react";
import { usePathname } from "next/navigation";
import { useEffect } from "react";

// Client-side navigation doesn't reload the document, so without this a
// new page can render already scrolled down to wherever the previous
// page left off — snap back to the top (instantly, not eased) whenever
// the route changes.
function ScrollResetOnNavigate() {
  const pathname = usePathname();
  const lenis = useLenis();

  useEffect(() => {
    lenis?.scrollTo(0, { immediate: true });
  }, [pathname, lenis]);

  return null;
}

export default function SmoothScroll({ children }: { children: React.ReactNode }) {
  return (
    <ReactLenis root options={{ duration: 1.2, smoothWheel: true }}>
      <ScrollResetOnNavigate />
      {children}
    </ReactLenis>
  );
}
