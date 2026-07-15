"use client";

import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Loader2, X } from "lucide-react";
import { ApiError, updateOrderStatus, type OrderDetail, type OrderStatus } from "@/lib/api";

const EASE = [0.22, 1, 0.36, 1] as const;

const STATUS_OPTIONS: { value: OrderStatus; label: string }[] = [
  { value: "new", label: "New" },
  { value: "confirmed", label: "Confirmed" },
  { value: "shipped", label: "Shipped" },
  { value: "delivered", label: "Delivered" },
  { value: "canceled", label: "Canceled" },
];

const PAYMENT_LABELS: Record<string, string> = {
  cod: "Cash on Delivery",
  jazzcash: "JazzCash",
  easypaisa: "EasyPaisa",
  stripe: "Card",
};

function formatPrice(value: number) {
  return `PKR ${value.toLocaleString("en-PK")}`;
}

export default function OrderDetailPanel({
  order,
  onClose,
  onUpdated,
}: {
  order: OrderDetail;
  onClose: () => void;
  onUpdated: (order: OrderDetail) => void;
}) {
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleStatusChange = async (status: OrderStatus) => {
    if (status === order.status) return;
    setSaving(true);
    setError(null);
    try {
      const { order: updated } = await updateOrderStatus(order.id, status);
      onUpdated(updated);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Couldn't update the order status. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="fixed inset-0 z-40 bg-black/30"
      />
      <motion.div
        initial={{ x: 420 }}
        animate={{ x: 0 }}
        exit={{ x: 420 }}
        transition={{ duration: 0.25, ease: EASE }}
        className="fixed inset-y-0 right-0 z-50 flex w-full max-w-md flex-col overflow-y-auto bg-white shadow-2xl"
      >
        <div className="flex items-center justify-between border-b border-black/[.06] px-6 py-4">
          <div>
            <p className="text-xs font-medium text-foreground/40">Order</p>
            <p className="text-sm font-bold text-foreground">#{order.id.slice(0, 8).toUpperCase()}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="flex h-8 w-8 items-center justify-center rounded-full text-foreground/40 transition-colors hover:bg-black/[.04] hover:text-foreground"
          >
            <X className="h-[18px] w-[18px]" strokeWidth={2} />
          </button>
        </div>

        <div className="flex flex-col gap-6 p-6">
          <div>
            <label className="text-xs font-semibold text-foreground/60">Status</label>
            <div className="mt-1.5 flex flex-wrap gap-1.5">
              {STATUS_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  disabled={saving}
                  onClick={() => handleStatusChange(opt.value)}
                  className={`rounded-full px-3 py-1.5 text-xs font-semibold transition-colors disabled:opacity-50 ${
                    order.status === opt.value
                      ? "bg-[#5B4FE9] text-white"
                      : "bg-black/[.04] text-foreground/60 hover:bg-black/[.07]"
                  }`}
                >
                  {opt.label}
                </button>
              ))}
              {saving && <Loader2 className="h-4 w-4 animate-spin text-foreground/40" strokeWidth={2} />}
            </div>
            {error && <p className="mt-1.5 text-xs text-red-500">{error}</p>}
          </div>

          <div>
            <p className="text-xs font-semibold text-foreground/60">Customer</p>
            <p className="mt-1 text-sm font-medium text-foreground">{order.customerName ?? "Unknown"}</p>
            <p className="text-xs text-foreground/45">{order.customerPhone}</p>
          </div>

          {order.deliveryAddress && (
            <div>
              <p className="text-xs font-semibold text-foreground/60">Delivery Address</p>
              <p className="mt-1 text-sm text-foreground/75">{order.deliveryAddress}</p>
            </div>
          )}

          <div>
            <p className="text-xs font-semibold text-foreground/60">Payment</p>
            <p className="mt-1 text-sm text-foreground/75">
              {PAYMENT_LABELS[order.paymentMethod] ?? order.paymentMethod}
            </p>
          </div>

          <div>
            <p className="text-xs font-semibold text-foreground/60">Items</p>
            <div className="mt-2 flex flex-col divide-y divide-black/[.05] rounded-xl border border-black/[.06]">
              {order.items.map((item) => (
                <div key={item.id} className="flex items-center justify-between px-3.5 py-2.5 text-sm">
                  <div className="min-w-0">
                    <p className="truncate font-medium text-foreground">{item.productName}</p>
                    <p className="text-xs text-foreground/45">
                      {item.quantity} × {formatPrice(item.unitPrice)}
                    </p>
                  </div>
                  <p className="shrink-0 font-semibold text-foreground">
                    {formatPrice(item.quantity * item.unitPrice)}
                  </p>
                </div>
              ))}
            </div>
          </div>

          <div className="flex flex-col gap-1.5 rounded-xl bg-black/[.02] p-4 text-sm">
            <div className="flex items-center justify-between text-foreground/60">
              <span>Subtotal</span>
              <span>{formatPrice(order.subtotal)}</span>
            </div>
            <div className="flex items-center justify-between text-foreground/60">
              <span>Delivery</span>
              <span>{formatPrice(order.deliveryCharge)}</span>
            </div>
            <div className="flex items-center justify-between text-foreground/60">
              <span>Tax</span>
              <span>{formatPrice(order.tax)}</span>
            </div>
            <div className="mt-1.5 flex items-center justify-between border-t border-black/[.06] pt-1.5 text-sm font-bold text-foreground">
              <span>Total</span>
              <span>{formatPrice(order.total)}</span>
            </div>
          </div>

          <p className="text-xs text-foreground/40">
            Placed {new Date(order.createdAt).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}
          </p>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
