"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import {
  CheckCircle2,
  Clock,
  Code2,
  Eye,
  Loader2,
  MessageCircle,
  Package,
  Plus,
  Search,
  Truck,
  X,
  Zap,
} from "lucide-react";
import Dropdown from "@/components/ui/Dropdown";
import WhatsAppPreviewBubble from "@/components/dashboard/automation/WhatsAppPreviewBubble";
import { TEMPLATE_META, makeButton } from "@/components/dashboard/automation/interactiveMessageHelpers";
import {
  ApiError,
  createInteractiveMessage,
  type InteractiveMessageInput,
  type InteractiveMessageTemplate,
  type InteractiveMessageTrigger,
} from "@/lib/api";

const EASE = [0.22, 1, 0.36, 1] as const;

const STATUS_OPTIONS = [
  { value: "all", label: "All statuses" },
  { value: "active", label: "Active" },
  { value: "draft", label: "Draft" },
];

// The 4 real starting points, "custom" isn't a ready-made template — it's
// the blank-canvas option in the wizard.
const PREBUILT: { template: InteractiveMessageTemplate; trigger: InteractiveMessageTrigger; icon: typeof Package }[] = [
  { template: "order_confirmation", trigger: "after_order_created", icon: Package },
  { template: "payment_reminder", trigger: "after_order_created", icon: Clock },
  { template: "delivery_update", trigger: "after_shipping", icon: Truck },
  { template: "welcome_message", trigger: "manual", icon: MessageCircle },
];

function buildPayload(template: InteractiveMessageTemplate, trigger: InteractiveMessageTrigger): InteractiveMessageInput {
  const meta = TEMPLATE_META[template];
  return {
    template,
    prompt: meta.label,
    bodyText: meta.defaultBody,
    kind: "buttons",
    buttons: meta.defaultButtons.slice(0, 3).map(makeButton),
    listButtonLabel: "",
    listRows: [],
    trigger,
    status: "active",
  };
}

export default function TemplatesPage() {
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("all");
  const [previewing, setPreviewing] = useState<InteractiveMessageTemplate | null>(null);
  const [activating, setActivating] = useState<InteractiveMessageTemplate | null>(null);
  const [activated, setActivated] = useState<Set<InteractiveMessageTemplate>>(new Set());
  const [error, setError] = useState<string | null>(null);

  const visible = PREBUILT.filter((t) => {
    const meta = TEMPLATE_META[t.template];
    const matchesSearch = meta.label.toLowerCase().includes(search.toLowerCase());
    const isActive = activated.has(t.template);
    const matchesStatus = status === "all" || (status === "active" ? isActive : !isActive);
    return matchesSearch && matchesStatus;
  });

  const handleActivate = async (template: InteractiveMessageTemplate, trigger: InteractiveMessageTrigger) => {
    setActivating(template);
    setError(null);
    try {
      await createInteractiveMessage(buildPayload(template, trigger));
      setActivated((prev) => new Set(prev).add(template));
      setPreviewing(null);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Couldn't activate this template. Please try again.");
    } finally {
      setActivating(null);
    }
  };

  const previewingMeta = previewing ? TEMPLATE_META[previewing] : null;
  const previewingTrigger = previewing ? PREBUILT.find((t) => t.template === previewing)?.trigger : undefined;

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: EASE }}
      className="flex flex-col gap-5"
    >
      <div className="flex items-center justify-between gap-3">
        <h1 className="text-xl font-bold text-foreground sm:text-2xl">Templates</h1>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => router.push("/dashboard/automation/interactive-messages/new")}
            className="flex items-center gap-1.5 rounded-full shine-btn-gold relative overflow-hidden bg-[#5B4FE9] px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-[#4a3fd6]"
          >
            <Plus className="h-4 w-4" strokeWidth={2.5} />
            Create template
          </button>
          <button
            type="button"
            aria-label="View as code"
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-ink/[.08] bg-surface text-foreground/60 transition-colors hover:bg-ink/[.03]"
          >
            <Code2 className="h-4 w-4" strokeWidth={2} />
          </button>
        </div>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-foreground/35" strokeWidth={2} />
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search..."
            className="w-full rounded-full border border-ink/[.08] bg-surface py-2.5 pl-10 pr-4 text-sm text-foreground shadow-sm focus:outline-none focus:ring-2 focus:ring-[#5B4FE9]/25"
          />
        </div>
        <Dropdown
          value={status}
          onChange={setStatus}
          options={STATUS_OPTIONS}
          placeholder="All statuses"
          align="right"
          className="sm:w-44"
        />
      </div>

      {error && <p className="rounded-xl bg-red-50 dark:bg-red-500/15 p-3.5 text-sm text-red-600 dark:text-red-400">{error}</p>}

      {visible.length === 0 ? (
        <div className="flex min-h-[50vh] flex-col items-center justify-center rounded-2xl border border-ink/[.06] bg-surface p-8 text-center shadow-sm">
          <p className="text-sm text-foreground/50">No templates match your search.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {visible.map(({ template, trigger, icon: Icon }) => {
            const meta = TEMPLATE_META[template];
            const isActive = activated.has(template);
            const isActivating = activating === template;
            return (
              <div
                key={template}
                className="flex flex-col rounded-2xl border border-ink/[.06] bg-surface p-5 shadow-sm"
              >
                <div className="flex items-start justify-between gap-2">
                  <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-50 dark:bg-indigo-500/15 text-[#5B4FE9]">
                    <Icon className="h-5 w-5" strokeWidth={2} />
                  </span>
                  {isActive && (
                    <span className="flex items-center gap-1 rounded-full bg-emerald-50 dark:bg-emerald-500/15 px-2.5 py-1 text-[11px] font-semibold text-emerald-600 dark:text-emerald-400">
                      <CheckCircle2 className="h-3 w-3" strokeWidth={2.5} />
                      Active
                    </span>
                  )}
                </div>
                <p className="mt-3 text-sm font-bold text-foreground">{meta.label}</p>
                <p className="mt-1 flex-1 text-xs text-foreground/50">{meta.hint}</p>

                <div className="mt-4 flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setPreviewing(template)}
                    className="flex flex-1 items-center justify-center gap-1.5 rounded-full bg-ink/[.04] py-2 text-xs font-semibold text-foreground/70 transition-colors hover:bg-ink/[.07]"
                  >
                    <Eye className="h-3.5 w-3.5" strokeWidth={2} />
                    Preview
                  </button>
                  <button
                    type="button"
                    disabled={isActive || isActivating}
                    onClick={() => handleActivate(template, trigger)}
                    className="flex flex-1 items-center justify-center gap-1.5 rounded-full shine-btn-gold relative overflow-hidden bg-[#5B4FE9] py-2 text-xs font-semibold text-white transition-colors hover:bg-[#4a3fd6] disabled:opacity-50"
                  >
                    {isActivating ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" strokeWidth={2} />
                    ) : (
                      <Zap className="h-3.5 w-3.5" strokeWidth={2} />
                    )}
                    {isActive ? "Activated" : isActivating ? "Activating..." : "Activate"}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <AnimatePresence>
        {previewing && previewingMeta && previewingTrigger && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setPreviewing(null)}
              className="fixed inset-0 z-40 bg-black/30"
            />
            <motion.div
              initial={{ opacity: 0, y: 16, scale: 0.97 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 16, scale: 0.97 }}
              transition={{ duration: 0.2, ease: EASE }}
              className="fixed left-1/2 top-1/2 z-50 w-full max-w-md -translate-x-1/2 -translate-y-1/2 overflow-hidden rounded-2xl bg-surface shadow-2xl"
            >
              <div className="flex items-center justify-between border-b border-ink/[.06] px-5 py-4">
                <p className="text-sm font-bold text-foreground">{previewingMeta.label}</p>
                <button
                  type="button"
                  onClick={() => setPreviewing(null)}
                  aria-label="Close"
                  className="flex h-8 w-8 items-center justify-center rounded-full text-foreground/40 transition-colors hover:bg-ink/[.04] hover:text-foreground"
                >
                  <X className="h-[18px] w-[18px]" strokeWidth={2} />
                </button>
              </div>

              <div className="p-5">
                <p className="text-xs text-foreground/50">{previewingMeta.hint}</p>
                <div className="mt-4">
                  <WhatsAppPreviewBubble
                    bodyText={previewingMeta.defaultBody}
                    kind="buttons"
                    buttons={previewingMeta.defaultButtons.slice(0, 3).map(makeButton)}
                    listButtonLabel=""
                    listRows={[]}
                  />
                </div>

                <button
                  type="button"
                  disabled={activated.has(previewing) || activating === previewing}
                  onClick={() => handleActivate(previewing, previewingTrigger)}
                  className="mt-5 flex w-full items-center justify-center gap-2 rounded-full shine-btn-gold relative overflow-hidden bg-[#5B4FE9] py-3 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-[#4a3fd6] disabled:opacity-50"
                >
                  {activating === previewing ? (
                    <Loader2 className="h-4 w-4 animate-spin" strokeWidth={2} />
                  ) : (
                    <Zap className="h-4 w-4" strokeWidth={2} />
                  )}
                  {activated.has(previewing) ? "Already active" : activating === previewing ? "Activating..." : "Activate template"}
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
