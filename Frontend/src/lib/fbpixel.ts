// Meta Pixel ID — used by MetaPixel.tsx (base script + SPA pageview
// tracking) and by the conversion events fired below.
export const FB_PIXEL_ID = "4595078340727895";

declare global {
  interface Window {
    fbq?: (...args: unknown[]) => void;
  }
}

export function pageview() {
  if (typeof window === "undefined" || !window.fbq) return;
  window.fbq("track", "PageView");
}

export function fbEvent(name: string, params?: Record<string, unknown>) {
  if (typeof window === "undefined" || !window.fbq) return;
  window.fbq("track", name, params);
}
