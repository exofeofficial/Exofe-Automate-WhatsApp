// Small brand glyphs for the Integrations page. Lucide doesn't ship brand
// logos, so these are simplified, colored SVG marks instead of pixel-exact
// logos, that's enough to make each card instantly recognizable.

export function WhatsAppIcon() {
  return (
    <svg viewBox="0 0 32 32" fill="none" className="h-6 w-6">
      <path
        d="M16 4C9.373 4 4 9.373 4 16c0 2.21.594 4.28 1.63 6.06L4 28l6.11-1.6A11.93 11.93 0 0 0 16 28c6.627 0 12-5.373 12-12S22.627 4 16 4Z"
        fill="#25D366"
      />
      <path
        d="M11.5 10.6c.28-.62.57-.63.83-.64.22-.01.46-.01.67-.01.21 0 .5-.08.78.6.28.68.96 2.34 1.04 2.51.08.17.14.37.03.6-.11.23-.17.37-.34.57-.17.2-.35.44-.5.6-.17.17-.34.36-.15.7.19.34.86 1.42 1.85 2.3 1.27 1.13 2.34 1.48 2.68 1.65.34.17.54.14.74-.08.2-.23.85-.99 1.08-1.33.23-.34.46-.28.77-.17.31.11 1.98.93 2.32 1.1.34.17.57.26.65.4.09.15.09.85-.2 1.67-.29.82-1.7 1.6-2.35 1.7-.6.1-1.36.14-2.2-.14-.5-.16-1.15-.38-1.98-.74-3.49-1.51-5.77-5.03-5.95-5.27-.17-.23-1.42-1.89-1.42-3.6 0-1.72.9-2.56 1.22-2.91Z"
        fill="#fff"
      />
    </svg>
  );
}

export function FacebookMark() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4 shrink-0">
      <circle cx="12" cy="12" r="12" fill="#fff" />
      <path
        d="M15.7 8.4h-1.6c-.4 0-.7.3-.7.8v1.7h2.2l-.3 2.1H13.4V19h-2.5v-6h-1.7v-2.1h1.7V9.1c0-1.7 1-2.8 2.7-2.8h2.1v2.1Z"
        fill="#1877F2"
      />
    </svg>
  );
}

export function GoogleSheetsIcon() {
  return (
    <svg viewBox="0 0 32 32" fill="none" className="h-6 w-6">
      <path d="M8 3h12l6 6v20a1.5 1.5 0 0 1-1.5 1.5h-16A1.5 1.5 0 0 1 7 28.5v-24A1.5 1.5 0 0 1 8 3Z" fill="#0F9D58" />
      <path d="M20 3v6h6l-6-6Z" fill="#87CEAC" />
      <rect x="10.5" y="14" width="11" height="9" rx="0.6" fill="#fff" />
      <path d="M10.5 17.3h11M10.5 20.3h11M14.6 14v9M18.4 14v9" stroke="#0F9D58" strokeWidth="0.9" />
    </svg>
  );
}

export function InstagramIcon() {
  return (
    <svg viewBox="0 0 32 32" fill="none" className="h-6 w-6">
      <rect x="3" y="3" width="26" height="26" rx="7" fill="url(#ig-grad)" />
      <rect x="9.5" y="9.5" width="13" height="13" rx="4.2" stroke="#fff" strokeWidth="1.8" />
      <circle cx="16" cy="16" r="3.6" stroke="#fff" strokeWidth="1.8" />
      <circle cx="22.2" cy="9.8" r="1.15" fill="#fff" />
      <defs>
        <linearGradient id="ig-grad" x1="3" y1="29" x2="29" y2="3" gradientUnits="userSpaceOnUse">
          <stop stopColor="#FEC053" />
          <stop offset="0.35" stopColor="#F2203E" />
          <stop offset="0.7" stopColor="#B729A8" />
          <stop offset="1" stopColor="#6B4FE9" />
        </linearGradient>
      </defs>
    </svg>
  );
}

export function TelegramIcon() {
  return (
    <svg viewBox="0 0 32 32" fill="none" className="h-6 w-6">
      <circle cx="16" cy="16" r="13" fill="#29A9EA" />
      <path
        d="M8.2 15.8 22 10.4c.62-.24 1.16.15.94.98l-2.5 11.8c-.18.83-.68 1.03-1.37.64l-3.8-2.8-1.83 1.77c-.2.2-.37.37-.76.37l.27-3.86 7.03-6.35c.3-.27-.07-.42-.47-.15l-8.7 5.48-3.75-1.17c-.81-.26-.83-.81.18-1.2Z"
        fill="#fff"
      />
    </svg>
  );
}

export function ShopifyIcon() {
  return (
    <svg viewBox="0 0 32 32" fill="none" className="h-6 w-6">
      <path d="M9 8.2 21.5 6l3 3.4-1.7 17.4-13.5-2.3.4-16.3Z" fill="#95BF47" />
      <path d="M21.5 6 9 8.2l1.2-1.9 8.8-1.9 2.5 1.6Z" fill="#5E8E3E" />
      <path
        d="M16.7 12.9s-1.1-.6-2.3-.5c-1.9.1-1.9 1.3-1.9 1.6 0 1.5 3.9 1.6 3.9 4.4 0 2.2-1.9 3.5-4.2 3.5-2.8 0-4.2-1.5-4.2-1.5l.6-1.8s1.5 1.2 2.9 1.2c.9 0 1.3-.5 1.3-1 0-1.7-3.2-1.8-3.2-4.3 0-2.1 1.7-4.1 4.7-4.1 1.2 0 1.9.4 1.9.4l-.5 2.1Z"
        fill="#fff"
      />
    </svg>
  );
}

export function KakaoIcon() {
  return (
    <svg viewBox="0 0 32 32" fill="none" className="h-6 w-6">
      <ellipse cx="16" cy="15.5" rx="13" ry="10.5" fill="#FEE500" />
      <path d="M11 22 9.6 27l4.6-3" fill="#FEE500" />
      <ellipse cx="10" cy="15" rx="1.4" ry="3.2" fill="#3C1E1E" />
      <ellipse cx="22" cy="15" rx="1.4" ry="3.2" fill="#3C1E1E" />
      <path d="M13 18.5c.9.8 2 1.2 3 1.2s2.1-.4 3-1.2" stroke="#3C1E1E" strokeWidth="1.4" strokeLinecap="round" />
    </svg>
  );
}

export function WooCommerceIcon() {
  return (
    <svg viewBox="0 0 32 32" fill="none" className="h-6 w-6">
      <rect x="3" y="7" width="26" height="18" rx="4" fill="#7F54B3" />
      <path
        d="M8 12.5h2.1l1 5.4 1.5-5.4h1.9l1.5 5.4 1-5.4H19l-2 8h-2.1l-1.4-4.9-1.4 4.9H10L8 12.5Z"
        fill="#fff"
      />
      <path d="M20.3 12.5h2l1.4 4.6 1.4-4.6h1.9l-2.6 8h-1.8l-2.3-8Z" fill="#fff" opacity="0.75" />
    </svg>
  );
}
