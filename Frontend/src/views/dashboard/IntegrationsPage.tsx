"use client";

import { useEffect, useState, type ReactNode } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import { AlertTriangle, CheckCircle2, Loader2, X } from "lucide-react";
import {
  GoogleSheetsIcon,
  KakaoIcon,
  ShopifyIcon,
  WhatsAppIcon,
  WooCommerceIcon,
} from "@/components/dashboard/IntegrationIcons";
import { getWhatsAppStatus, setWhatsAppDisconnected, type WhatsAppStatus } from "@/lib/whatsapp";
import {
  ApiError,
  disconnectShopify,
  getShopifyStatus,
  installShopify,
  syncShopifyCatalog,
  type ShopifyConnectionStatus,
} from "@/lib/api";

const EASE = [0.22, 1, 0.36, 1] as const;

type Integration = {
  id: string;
  name: string;
  description: string;
  icon: ReactNode;
  status: "active" | "soon";
};

// Only WhatsApp and Shopify are live. Everything else here matches the
// roadmap and is shown as "coming soon" so the page looks complete
// without claiming a connection that doesn't actually work yet.
const INTEGRATIONS: Integration[] = [
  { id: "whatsapp", name: "WhatsApp Business", description: "Connect your official WhatsApp number and take orders straight from chats.", icon: <WhatsAppIcon />, status: "active" },
  { id: "shopify", name: "Shopify", description: "Sync your catalog in, and push completed WhatsApp orders back to your store.", icon: <ShopifyIcon />, status: "active" },
  { id: "woocommerce", name: "WooCommerce", description: "Connect your WordPress store's products and orders.", icon: <WooCommerceIcon />, status: "soon" },
  { id: "sheets", name: "Google Sheets", description: "Keep a live copy of your orders and products in a spreadsheet.", icon: <GoogleSheetsIcon />, status: "soon" },
  { id: "kakaotalk", name: "KakaoTalk", description: "For the South Korea launch, chat with customers on KakaoTalk.", icon: <KakaoIcon />, status: "soon" },
];

export default function IntegrationsPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [whatsapp, setWhatsapp] = useState<WhatsAppStatus | null>(null);
  const [confirmDisconnect, setConfirmDisconnect] = useState(false);

  const [shopify, setShopify] = useState<ShopifyConnectionStatus | null>(null);
  const [showConnectShopify, setShowConnectShopify] = useState(false);
  const [confirmDisconnectShopify, setConfirmDisconnectShopify] = useState(false);
  const [shopifyBanner, setShopifyBanner] = useState<"connected" | "error" | null>(null);
  const [syncing, setSyncing] = useState(false);
  const [syncMessage, setSyncMessage] = useState<string | null>(null);

  // Reads localStorage, has to happen after mount so the server render and
  // the first client render match (same pattern as the auth check in
  // dashboard/layout.tsx).
  useEffect(() => {
    setWhatsapp(getWhatsAppStatus());
  }, []);

  const refreshShopifyStatus = () => {
    getShopifyStatus()
      .then(setShopify)
      .catch(() => setShopify({ connected: false, shopDomain: null, connectedAt: null }));
  };

  // The install flow now opens in a new tab, so this tab has no idea
  // when (or if) it finishes — poll for a bit after the modal closes so
  // "Connected" appears here on its own instead of needing a manual
  // refresh once the user switches back.
  const pollForShopifyConnection = () => {
    let attempts = 0;
    const id = setInterval(() => {
      attempts += 1;
      getShopifyStatus()
        .then((res) => {
          setShopify(res);
          if (res.connected || attempts >= 40) clearInterval(id);
        })
        .catch(() => {
          if (attempts >= 40) clearInterval(id);
        });
    }, 3000);
  };

  useEffect(() => {
    refreshShopifyStatus();

    const result = searchParams.get("shopify");
    if (result === "connected" || result === "error") {
      setShopifyBanner(result);
      router.replace("/dashboard/integrations");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleDisconnect = () => {
    setWhatsAppDisconnected();
    setWhatsapp(getWhatsAppStatus());
    setConfirmDisconnect(false);
  };

  const handleDisconnectShopify = async () => {
    await disconnectShopify().catch(() => {});
    refreshShopifyStatus();
    setConfirmDisconnectShopify(false);
  };

  const handleSyncShopify = async () => {
    setSyncing(true);
    setSyncMessage(null);
    try {
      const res = await syncShopifyCatalog();
      setSyncMessage(`Synced ${res.synced} product${res.synced === 1 ? "" : "s"} from Shopify.`);
    } catch (err) {
      setSyncMessage(err instanceof ApiError ? err.message : "Couldn't sync right now — try again.");
    } finally {
      setSyncing(false);
    }
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

      {shopifyBanner === "connected" && (
        <div className="flex items-start gap-3 rounded-2xl border border-emerald-200 dark:border-emerald-500/25 bg-emerald-50 dark:bg-emerald-500/15 px-4 py-3">
          <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600 dark:text-emerald-400" strokeWidth={2} />
          <p className="text-xs font-semibold text-emerald-800 dark:text-emerald-300">
            Shopify connected! Click &quot;Sync catalog&quot; below to pull in your products.
          </p>
        </div>
      )}
      {shopifyBanner === "error" && (
        <div className="flex items-start gap-3 rounded-2xl border border-red-200 dark:border-red-500/25 bg-red-50 dark:bg-red-500/15 px-4 py-3">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-red-600 dark:text-red-400" strokeWidth={2} />
          <p className="text-xs font-semibold text-red-800 dark:text-red-300">
            Couldn&apos;t connect Shopify — the install link may have expired. Try again below.
          </p>
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {INTEGRATIONS.map((integ) => {
          if (integ.id === "shopify") {
            return (
              <IntegrationCard
                key={integ.id}
                integration={integ}
                connected={Boolean(shopify?.connected)}
                connectedSubtitle={shopify?.shopDomain ?? undefined}
                onConnect={() => setShowConnectShopify(true)}
                onDisconnect={() => setConfirmDisconnectShopify(true)}
                extraAction={
                  shopify?.connected
                    ? { label: syncing ? "Syncing..." : "Sync catalog", onClick: handleSyncShopify, disabled: syncing }
                    : undefined
                }
              />
            );
          }
          return (
            <IntegrationCard
              key={integ.id}
              integration={integ}
              connected={integ.id === "whatsapp" ? Boolean(whatsapp?.connected) : false}
              connectedSubtitle={integ.id === "whatsapp" ? whatsapp?.businessNumber ?? undefined : undefined}
              onConnect={() => router.push("/dashboard/integrations/whatsapp")}
              onDisconnect={() => setConfirmDisconnect(true)}
            />
          );
        })}
      </div>

      {syncMessage && <p className="text-xs text-foreground/55">{syncMessage}</p>}

      <AnimatePresence>
        {confirmDisconnect && (
          <DisconnectConfirmModal
            title="Disconnect WhatsApp?"
            body="Your AI assistant will stop responding to customers immediately. You can reconnect at any time."
            onClose={() => setConfirmDisconnect(false)}
            onConfirm={handleDisconnect}
          />
        )}
        {confirmDisconnectShopify && (
          <DisconnectConfirmModal
            title="Disconnect Shopify?"
            body="Products already synced into Exofe stay put, but new orders won't be mirrored back to your store anymore."
            onClose={() => setConfirmDisconnectShopify(false)}
            onConfirm={handleDisconnectShopify}
          />
        )}
        {showConnectShopify && (
          <ConnectShopifyModal
            onClose={() => setShowConnectShopify(false)}
            onConnected={() => {
              setShowConnectShopify(false);
              pollForShopifyConnection();
            }}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

function IntegrationCard({
  integration,
  connected,
  connectedSubtitle,
  onConnect,
  onDisconnect,
  extraAction,
}: {
  integration: Integration;
  connected: boolean;
  connectedSubtitle?: string;
  onConnect: () => void;
  onDisconnect: () => void;
  extraAction?: { label: string; onClick: () => void; disabled?: boolean };
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
        {connected && connectedSubtitle ? connectedSubtitle : integration.description}
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
              : "shine-btn-gold relative overflow-hidden bg-[#45157b] text-white shadow-sm hover:opacity-90"
        }`}
      >
        {isSoon ? "Not available yet" : connected ? "Disconnect" : `Connect ${integration.name.split(" ")[0]}`}
      </button>

      {extraAction && (
        <button
          type="button"
          onClick={extraAction.onClick}
          disabled={extraAction.disabled}
          className="mt-2 w-full rounded-xl py-2 text-xs font-semibold text-[#45157b] transition-colors hover:bg-[#45157b]/10 disabled:opacity-50"
        >
          {extraAction.label}
        </button>
      )}
    </div>
  );
}

function DisconnectConfirmModal({
  title,
  body,
  onClose,
  onConfirm,
}: {
  title: string;
  body: string;
  onClose: () => void;
  onConfirm: () => void;
}) {
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
        <p className="mt-4 text-sm font-bold text-foreground">{title}</p>
        <p className="mt-2 text-xs leading-relaxed text-foreground/55">{body}</p>
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

function ConnectShopifyModal({ onClose, onConnected }: { onClose: () => void; onConnected: () => void }) {
  const [shop, setShop] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleConnect = async () => {
    const trimmed = shop.trim().toLowerCase();
    if (!trimmed) {
      setError("Enter your store's domain first");
      return;
    }
    const normalized = trimmed.includes(".") ? trimmed : `${trimmed}.myshopify.com`;

    setLoading(true);
    setError(null);
    try {
      const { installUrl } = await installShopify(normalized);
      window.open(installUrl, "_blank", "noopener,noreferrer");
      onConnected();
    } catch (err) {
      setLoading(false);
      setError(err instanceof ApiError ? err.message : "Couldn't start the connection — try again.");
    }
  };

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
          <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#45157b]/10 text-[#45157b]">
            <ShopifyIcon />
          </span>
          <button type="button" onClick={onClose} aria-label="Close" className="text-foreground/40 hover:text-foreground">
            <X className="h-4 w-4" strokeWidth={2} />
          </button>
        </div>
        <p className="mt-4 text-sm font-bold text-foreground">Connect Shopify</p>
        <p className="mt-2 text-xs leading-relaxed text-foreground/55">
          Enter your store&apos;s domain — Shopify&apos;s approval screen will open in a new tab.
        </p>

        <input
          type="text"
          value={shop}
          onChange={(e) => setShop(e.target.value)}
          placeholder="your-store.myshopify.com"
          className={`mt-4 w-full rounded-lg border bg-zinc-50 px-3.5 py-2.5 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-[#45157b]/30 ${
            error ? "border-red-400" : "border-black/[.1]"
          }`}
        />
        {error && <p className="mt-1.5 text-xs text-red-500">{error}</p>}

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
            onClick={handleConnect}
            disabled={loading}
            className="flex flex-1 items-center justify-center gap-1.5 rounded-xl bg-[#45157b] py-2.5 text-xs font-semibold text-white hover:opacity-90 disabled:opacity-60"
          >
            {loading && <Loader2 className="h-3.5 w-3.5 animate-spin" strokeWidth={2.4} />}
            {loading ? "Connecting..." : "Connect"}
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}
