"use client";

import { useEffect, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import { AlertTriangle, X } from "lucide-react";
import {
  GoogleSheetsIcon,
  KakaoIcon,
  ShopifyIcon,
  WhatsAppIcon,
  WooCommerceIcon,
} from "@/components/dashboard/IntegrationIcons";
import { getWhatsAppStatus, setWhatsAppDisconnected, type WhatsAppStatus } from "@/lib/whatsapp";

const EASE = [0.22, 1, 0.36, 1] as const;

type Integration = {
  id: string;
  name: string;
  description: string;
  icon: ReactNode;
  status: "active" | "soon";
};

// Only WhatsApp is live in the MVP. Everything else here matches the
// roadmap and is shown as "coming soon" so the page looks complete
// without claiming a connection that doesn't actually work yet.
const INTEGRATIONS: Integration[] = [
  { id: "whatsapp", name: "WhatsApp Business", description: "Connect your official WhatsApp number and take orders straight from chats.", icon: <WhatsAppIcon />, status: "active" },
  { id: "shopify", name: "Shopify", description: "Sync your catalog and orders both ways with Shopify.", icon: <ShopifyIcon />, status: "soon" },
  { id: "woocommerce", name: "WooCommerce", description: "Connect your WordPress store's products and orders.", icon: <WooCommerceIcon />, status: "soon" },
  { id: "sheets", name: "Google Sheets", description: "Keep a live copy of your orders and products in a spreadsheet.", icon: <GoogleSheetsIcon />, status: "soon" },
  { id: "kakaotalk", name: "KakaoTalk", description: "For the South Korea launch, chat with customers on KakaoTalk.", icon: <KakaoIcon />, status: "soon" },
];

export default function IntegrationsPage() {
  const router = useRouter();
  const [whatsapp, setWhatsapp] = useState<WhatsAppStatus | null>(null);
  const [confirmDisconnect, setConfirmDisconnect] = useState(false);

  // Reads localStorage, has to happen after mount so the server render and
  // the first client render match (same pattern as the auth check in
  // dashboard/layout.tsx).
  useEffect(() => {
    setWhatsapp(getWhatsAppStatus());
  }, []);

  const handleDisconnect = () => {
    setWhatsAppDisconnected();
    setWhatsapp(getWhatsAppStatus());
    setConfirmDisconnect(false);
  };

  return (
    <div className="flex flex-col gap-6">
      <p className="text-sm text-foreground/55">
        Connect the channels and tools Exofe uses to take orders and stay in sync with your store.
      </p>

      {whatsapp?.connected === false && (
        <div className="flex items-start gap-3 rounded-2xl border border-amber-200 dark:border-amber-500/25 bg-amber-50 dark:bg-amber-500/15 px-4 py-3">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-600 dark:text-amber-400" strokeWidth={2} />
          <div>
            <p className="text-xs font-semibold text-amber-800 dark:text-amber-300">WhatsApp is not connected yet</p>
            <p className="mt-0.5 text-xs text-amber-700 dark:text-amber-400/80">
              Connect it below so Exofe can start taking orders on your behalf.
            </p>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {INTEGRATIONS.map((integ) => (
          <IntegrationCard
            key={integ.id}
            integration={integ}
            connected={integ.id === "whatsapp" ? Boolean(whatsapp?.connected) : false}
            businessNumber={integ.id === "whatsapp" ? whatsapp?.businessNumber ?? undefined : undefined}
            onConnect={() => router.push("/dashboard/integrations/whatsapp")}
            onDisconnect={() => setConfirmDisconnect(true)}
          />
        ))}
      </div>

      <AnimatePresence>
        {confirmDisconnect && (
          <DisconnectConfirmModal onClose={() => setConfirmDisconnect(false)} onConfirm={handleDisconnect} />
        )}
      </AnimatePresence>
    </div>
  );
}

function IntegrationCard({
  integration,
  connected,
  businessNumber,
  onConnect,
  onDisconnect,
}: {
  integration: Integration;
  connected: boolean;
  businessNumber?: string;
  onConnect: () => void;
  onDisconnect: () => void;
}) {
  const isSoon = integration.status === "soon";

  return (
    <div className="flex flex-col rounded-2xl border border-ink/[.06] bg-surface p-5 shadow-sm transition-shadow hover:shadow-md">
      <div className="flex items-start justify-between gap-3">
        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-ink/[.03]">
          {integration.icon}
        </span>
        {isSoon ? (
          <span className="rounded-full bg-ink/[.05] px-2.5 py-1 text-[11px] font-medium text-foreground/45">
            Coming soon
          </span>
        ) : connected ? (
          <span className="flex items-center gap-1 rounded-full bg-emerald-50 dark:bg-emerald-500/15 px-2.5 py-1 text-[11px] font-medium text-emerald-600 dark:text-emerald-400">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
            Connected
          </span>
        ) : (
          <span className="rounded-full bg-ink/[.05] px-2.5 py-1 text-[11px] font-medium text-foreground/45">
            Not connected
          </span>
        )}
      </div>

      <p className="mt-4 text-sm font-bold text-foreground">{integration.name}</p>
      <p className="mt-1 flex-1 text-xs leading-relaxed text-foreground/50">
        {connected && businessNumber ? businessNumber : integration.description}
      </p>

      <button
        type="button"
        disabled={isSoon}
        onClick={connected ? onDisconnect : onConnect}
        className={`mt-4 w-full rounded-xl py-2.5 text-xs font-semibold transition-colors ${
          isSoon
            ? "cursor-not-allowed bg-ink/[.04] text-foreground/30"
            : connected
              ? "bg-ink/[.04] text-foreground/60 hover:bg-ink/[.07]"
              : "shine-btn-gold relative overflow-hidden bg-gradient-to-br from-[#5B4FE9] to-[#7C6FF5] text-white shadow-sm hover:opacity-90"
        }`}
      >
        {isSoon ? "Not available yet" : connected ? "Disconnect" : `Connect ${integration.name.split(" ")[0]}`}
      </button>
    </div>
  );
}

function DisconnectConfirmModal({ onClose, onConfirm }: { onClose: () => void; onConfirm: () => void }) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.15 }}
      onClick={onClose}
      className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/40 p-4 backdrop-blur-sm"
    >
      <motion.div
        initial={{ opacity: 0, y: 12, scale: 0.97 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 10, scale: 0.98 }}
        transition={{ duration: 0.2, ease: EASE }}
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-sm rounded-3xl border border-ink/[.06] bg-surface p-6 shadow-2xl"
      >
        <div className="flex items-start justify-between">
          <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-red-50 dark:bg-red-500/15 text-red-600 dark:text-red-400">
            <AlertTriangle className="h-5 w-5" strokeWidth={2} />
          </span>
          <button type="button" onClick={onClose} aria-label="Close" className="text-foreground/40 hover:text-foreground">
            <X className="h-4 w-4" strokeWidth={2} />
          </button>
        </div>
        <p className="mt-4 text-sm font-bold text-foreground">Disconnect WhatsApp?</p>
        <p className="mt-2 text-xs leading-relaxed text-foreground/55">
          Your AI assistant will stop responding to customers immediately. You can reconnect at any time.
        </p>
        <div className="mt-6 flex gap-3">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 rounded-xl bg-ink/[.04] py-2.5 text-xs font-semibold text-foreground/70 hover:bg-ink/[.07]"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className="flex-1 rounded-xl bg-red-600 py-2.5 text-xs font-semibold text-white hover:bg-red-700"
          >
            Disconnect
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}
