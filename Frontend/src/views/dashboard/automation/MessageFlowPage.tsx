"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowLeft, Loader2, MessageCircle, Plus, Settings2, X, Zap } from "lucide-react";
import { Background, BackgroundVariant, Controls, ReactFlow, ReactFlowProvider, Handle, Position, type Node, type NodeProps } from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import {
  ApiError,
  getInteractiveMessage,
  updateInteractiveMessage,
  type InteractiveButton,
  type InteractiveListRow,
  type InteractiveMessage,
  type InteractiveMessageInput,
  type InteractiveMessageTrigger,
} from "@/lib/api";
import { TEMPLATE_META, TRIGGER_META, makeButton, makeListRow } from "@/components/dashboard/automation/interactiveMessageHelpers";
import WhatsAppPreviewBubble from "@/components/dashboard/automation/WhatsAppPreviewBubble";
import Dropdown from "@/components/ui/Dropdown";
import { AutoFit, FlowEdgeOverlay, computeBounds, type DiagramEdge, type Rect } from "@/components/dashboard/automation/flowDiagramKit";

const MAX_BUTTONS = 3;
const MAX_LIST_ROWS = 10;
const NODE_W = 220;
const NODE_H = 60;
const SPACING = 88;
const CENTER_Y = 300;
const EASE = [0.22, 1, 0.36, 1] as const;

type NodeKind = "trigger" | "message" | "choice" | "add";

function stackY(index: number, total: number) {
  return CENTER_Y + (index - (total - 1) / 2) * SPACING;
}

function FlowNode({ data }: NodeProps) {
  const d = data as unknown as { label: string; sub?: string; kind: NodeKind; onClick: () => void };
  const isAdd = d.kind === "add";
  const styles: Record<NodeKind, string> = {
    trigger: "border-emerald-500/30 bg-emerald-50 dark:bg-emerald-500/10",
    message: "border-[#5B4FE9]/40 bg-gradient-to-br from-[#5B4FE9]/10 to-[#7C6FF5]/10",
    choice: "border-secondary/40 bg-secondary/10",
    add: "border-dashed border-ink/[.15] bg-ink/[.02] hover:border-[#5B4FE9]/40",
  };
  const icon = d.kind === "trigger" ? <Zap className="h-3.5 w-3.5" strokeWidth={2.5} /> : d.kind === "message" ? <MessageCircle className="h-3.5 w-3.5" strokeWidth={2.5} /> : d.kind === "add" ? <Plus className="h-3.5 w-3.5" strokeWidth={2.5} /> : null;

  return (
    <div
      onClick={d.onClick}
      // React Flow sets pointer-events: none on the node wrapper when
      // elementsSelectable is off (needed here to skip its selection
      // outline, which this editor doesn't use) — that would swallow a
      // real mouse click before it ever reaches onClick above, so this
      // opts the actual clickable surface back in explicitly.
      className={`pointer-events-auto min-w-[200px] cursor-pointer rounded-2xl border px-4 py-3 text-left shadow-sm transition-transform hover:scale-[1.03] ${styles[d.kind]}`}
    >
      <Handle type="target" position={Position.Left} className="!h-2 !w-2 !border-2 !border-surface !bg-foreground/30" />
      <div className="flex items-center gap-2">
        {icon && (
          <span className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-lg ${isAdd ? "text-foreground/40" : "bg-surface/70 text-foreground"}`}>
            {icon}
          </span>
        )}
        <p className={`truncate text-sm font-bold ${isAdd ? "text-foreground/50" : "text-foreground"}`}>{d.label}</p>
      </div>
      {d.sub && <p className="mt-1 truncate pl-8 text-xs text-foreground/50">{d.sub}</p>}
      <Handle type="source" position={Position.Right} className="!h-2 !w-2 !border-2 !border-surface !bg-foreground/30" />
    </div>
  );
}

const NODE_TYPES = { flow: FlowNode };

function TextFieldPanel({
  hint,
  initial,
  maxLength,
  multiline,
  onSave,
  onDelete,
  deleteLabel,
  saving,
  error,
}: {
  hint?: string;
  initial: string;
  maxLength: number;
  multiline?: boolean;
  onSave: (value: string) => void;
  onDelete?: () => void;
  deleteLabel?: string;
  saving: boolean;
  error: string | null;
}) {
  const [value, setValue] = useState(initial);
  const inputClass = "mt-3 w-full rounded-lg border border-ink/[.12] px-3.5 py-2.5 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-[#5B4FE9]/30";

  return (
    <>
      {hint && <p className="text-xs text-foreground/50">{hint}</p>}
      {multiline ? (
        <textarea rows={4} value={value} maxLength={maxLength} onChange={(e) => setValue(e.target.value)} className={inputClass} />
      ) : (
        <input type="text" value={value} maxLength={maxLength} onChange={(e) => setValue(e.target.value)} className={inputClass} />
      )}
      <p className="mt-1 text-right text-[11px] text-foreground/40">
        {value.length}/{maxLength}
      </p>
      {error && <p className="mt-2 text-xs font-medium text-red-500 dark:text-red-400">{error}</p>}
      <div className="mt-3 flex gap-2">
        <button
          type="button"
          onClick={() => onSave(value)}
          disabled={saving}
          className="flex flex-1 items-center justify-center gap-1.5 rounded-lg bg-[#5B4FE9] py-2.5 text-xs font-semibold text-white disabled:opacity-50"
        >
          {saving && <Loader2 className="h-3.5 w-3.5 animate-spin" strokeWidth={2} />}
          {saving ? "Saving…" : "Save"}
        </button>
        {onDelete && (
          <button
            type="button"
            onClick={onDelete}
            disabled={saving}
            className="rounded-lg px-3 py-2.5 text-xs font-semibold text-red-600 hover:bg-red-50 disabled:opacity-40 dark:text-red-400 dark:hover:bg-red-500/10"
          >
            {deleteLabel ?? "Delete"}
          </button>
        )}
      </div>
    </>
  );
}

export default function MessageFlowPage({ messageId }: { messageId: string }) {
  const [message, setMessage] = useState<InteractiveMessage | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [panelNodeId, setPanelNodeId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  useEffect(() => {
    getInteractiveMessage(messageId)
      .then((res) => setMessage(res.message))
      .catch((err) => setLoadError(err instanceof ApiError ? err.message : "Couldn't load this flow."))
      .finally(() => setLoading(false));
  }, [messageId]);

  const persist = async (patch: Partial<InteractiveMessageInput>, closeOnSuccess = true) => {
    if (!message) return;
    setSaving(true);
    setSaveError(null);
    const payload: InteractiveMessageInput = {
      template: message.template,
      prompt: message.prompt,
      bodyText: message.bodyText,
      kind: message.kind,
      buttons: message.buttons,
      listButtonLabel: message.listButtonLabel,
      listRows: message.listRows,
      trigger: message.trigger,
      status: message.status,
      ...patch,
    };
    try {
      const res = await updateInteractiveMessage(messageId, payload);
      setMessage(res.message);
      if (closeOnSuccess) setPanelNodeId(null);
    } catch (err) {
      setSaveError(err instanceof ApiError ? err.message : "Couldn't save changes. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  const diagram = useMemo(() => {
    if (!message) return null;
    const nodes: (Node & { width: number; height: number })[] = [];
    const edges: DiagramEdge[] = [];

    const push = (id: string, x: number, y: number, kind: NodeKind, label: string, sub?: string) => {
      nodes.push({ id, type: "flow", position: { x, y }, width: NODE_W, height: NODE_H, data: { label, sub, kind, onClick: () => setPanelNodeId(id) } });
    };

    push("trigger", 40, CENTER_Y, "trigger", TRIGGER_META[message.trigger].label, "Click to change");
    push("message", 340, CENTER_Y, "message", "Message", message.bodyText ? message.bodyText.slice(0, 42) : "Click to write your message");
    edges.push({ id: "e-trigger-message", source: "trigger", target: "message" });

    if (message.kind === "buttons") {
      const n = message.buttons.length;
      const canAdd = n < MAX_BUTTONS;
      const total = n + (canAdd ? 1 : 0);
      message.buttons.forEach((b, i) => {
        push(`btn-${b.id}`, 640, stackY(i, total), "choice", b.text || "Button", "Click to edit");
        edges.push({ id: `e-msg-btn-${b.id}`, source: "message", target: `btn-${b.id}` });
      });
      if (canAdd) {
        push("add-button", 640, stackY(n, total), "add", "Add button");
        edges.push({ id: "e-msg-add", source: "message", target: "add-button" });
      }
    } else {
      push("list-label", 640, CENTER_Y, "choice", message.listButtonLabel || "View Options", "Click to edit label");
      edges.push({ id: "e-msg-list", source: "message", target: "list-label" });

      const n = message.listRows.length;
      const canAdd = n < MAX_LIST_ROWS;
      const total = n + (canAdd ? 1 : 0);
      message.listRows.forEach((r, i) => {
        push(`row-${r.id}`, 940, stackY(i, total), "choice", r.title || "Option", "Click to edit");
        edges.push({ id: `e-list-row-${r.id}`, source: "list-label", target: `row-${r.id}` });
      });
      if (canAdd) {
        push("add-row", 940, stackY(n, total), "add", "Add option");
        edges.push({ id: "e-list-add", source: "list-label", target: "add-row" });
      }
    }

    const rects = new Map<string, Rect>(nodes.map((nd) => [nd.id, { x: nd.position.x, y: nd.position.y, width: nd.width, height: nd.height }]));
    return { nodes, edges, rects, bounds: computeBounds(rects) };
  }, [message]);

  const handleNodeClick = (id: string) => {
    if (!message) return;
    if (id === "add-button") {
      persist({ buttons: [...message.buttons, makeButton("New button")] }, false);
      return;
    }
    if (id === "add-row") {
      persist({ listRows: [...message.listRows, makeListRow("New option")] }, false);
      return;
    }
    setPanelNodeId(id);
    setSaveError(null);
  };

  // wire the real click handler now that persist/setPanelNodeId exist —
  // the diagram memo above builds nodes before this closure is available
  const nodesWithHandlers = useMemo(() => {
    if (!diagram) return [];
    return diagram.nodes.map((n) => ({ ...n, data: { ...n.data, onClick: () => handleNodeClick(n.id) } }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [diagram, message]);

  if (loading) {
    return (
      <div className="flex h-[calc(100vh-10rem)] items-center justify-center rounded-2xl border border-ink/[.06] bg-surface shadow-sm">
        <Loader2 className="h-6 w-6 animate-spin text-[#5B4FE9]" strokeWidth={2} />
      </div>
    );
  }

  if (loadError || !message || !diagram) {
    return (
      <div className="flex h-[calc(100vh-10rem)] flex-col items-center justify-center gap-2 rounded-2xl border border-ink/[.06] bg-surface p-6 text-center shadow-sm">
        <p className="text-sm font-bold text-foreground">Couldn&apos;t load this flow</p>
        <p className="text-sm text-foreground/55">{loadError ?? "This message may have been deleted."}</p>
        <Link href="/dashboard/automation/flow-builder" className="mt-2 text-xs font-semibold text-[#5B4FE9] hover:underline">
          Back to all flows
        </Link>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <Link href="/dashboard/automation/flow-builder" className="flex items-center gap-1.5 text-xs font-semibold text-foreground/50 hover:text-foreground">
            <ArrowLeft className="h-3.5 w-3.5" strokeWidth={2} />
            All flows
          </Link>
          <div className="mt-2 flex items-center gap-2">
            <p className="text-sm font-bold text-foreground">{TEMPLATE_META[message.template].label}</p>
            <button
              type="button"
              onClick={() => persist({ status: message.status === "active" ? "draft" : "active" })}
              disabled={saving}
              className={`rounded-full px-2.5 py-1 text-[11px] font-medium capitalize transition-colors ${
                message.status === "active"
                  ? "bg-emerald-50 dark:bg-emerald-500/15 text-emerald-600 dark:text-emerald-400"
                  : "bg-ink/[.05] text-foreground/45"
              }`}
            >
              {message.status}
            </button>
          </div>
          <p className="mt-0.5 text-sm text-foreground/55">Click a step to edit it. Changes save to this flow right away.</p>
        </div>
        <Link
          href={`/dashboard/automation/interactive-messages/${messageId}/edit`}
          className="flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-semibold text-foreground/50 transition-colors hover:bg-ink/[.04] hover:text-foreground"
        >
          <Settings2 className="h-3.5 w-3.5" strokeWidth={2} />
          Advanced editor
        </Link>
      </div>

      {saveError && !panelNodeId && <p className="text-xs font-medium text-red-500 dark:text-red-400">{saveError}</p>}

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1fr_260px]">
        <div className="relative h-[calc(100vh-17rem)] min-h-[420px] overflow-clip rounded-2xl border border-ink/[.06] bg-surface shadow-sm">
          <ReactFlowProvider>
            <ReactFlow
              nodes={nodesWithHandlers}
              edges={[]}
              nodeTypes={NODE_TYPES}
              minZoom={0.3}
              maxZoom={1.5}
              proOptions={{ hideAttribution: true }}
              nodesDraggable={false}
              nodesConnectable={false}
              elementsSelectable={false}
            >
              <Background variant={BackgroundVariant.Dots} gap={20} size={1} className="!bg-background" />
              <Controls showInteractive={false} className="!shadow-lg" />
            </ReactFlow>
            <FlowEdgeOverlay edges={diagram.edges} rects={diagram.rects} />
            <AutoFit bounds={diagram.bounds} />
          </ReactFlowProvider>
        </div>

        <div className="hidden lg:block">
          <p className="mb-2 text-xs font-semibold text-foreground/50">Live preview</p>
          <WhatsAppPreviewBubble
            bodyText={message.bodyText}
            kind={message.kind}
            buttons={message.buttons}
            listButtonLabel={message.listButtonLabel}
            listRows={message.listRows}
          />
        </div>
      </div>

      <AnimatePresence>
        {panelNodeId && (
          <>
            <motion.button
              type="button"
              aria-label="Close panel"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setPanelNodeId(null)}
              className="fixed inset-0 z-40 cursor-default bg-foreground/20 backdrop-blur-[1px]"
            />
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              transition={{ duration: 0.18, ease: EASE }}
              className="fixed right-4 top-1/2 z-50 w-[min(340px,calc(100vw-2rem))] -translate-y-1/2 rounded-2xl border border-ink/[.06] bg-surface p-5 shadow-2xl"
            >
              <PanelContent
                nodeId={panelNodeId}
                message={message}
                onClose={() => setPanelNodeId(null)}
                onSaveTrigger={(trigger) => persist({ trigger })}
                onSaveBody={(bodyText) => persist({ bodyText })}
                onSaveButton={(id, text) => persist({ buttons: message.buttons.map((b) => (b.id === id ? { ...b, text } : b)) })}
                onDeleteButton={(id) => persist({ buttons: message.buttons.filter((b) => b.id !== id) })}
                onSaveListLabel={(listButtonLabel) => persist({ listButtonLabel })}
                onSaveRow={(id, title) => persist({ listRows: message.listRows.map((r) => (r.id === id ? { ...r, title } : r)) })}
                onDeleteRow={(id) => persist({ listRows: message.listRows.filter((r) => r.id !== id) })}
                saving={saving}
                error={saveError}
              />
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}

function PanelContent({
  nodeId,
  message,
  onClose,
  onSaveTrigger,
  onSaveBody,
  onSaveButton,
  onDeleteButton,
  onSaveListLabel,
  onSaveRow,
  onDeleteRow,
  saving,
  error,
}: {
  nodeId: string;
  message: InteractiveMessage;
  onClose: () => void;
  onSaveTrigger: (trigger: InteractiveMessageTrigger) => void;
  onSaveBody: (bodyText: string) => void;
  onSaveButton: (id: string, text: string) => void;
  onDeleteButton: (id: string) => void;
  onSaveListLabel: (label: string) => void;
  onSaveRow: (id: string, title: string) => void;
  onDeleteRow: (id: string) => void;
  saving: boolean;
  error: string | null;
}) {
  const header = (title: string) => (
    <div className="mb-1 flex items-center justify-between">
      <p className="text-sm font-bold text-foreground">{title}</p>
      <button type="button" onClick={onClose} aria-label="Close" className="text-foreground/40 hover:text-foreground">
        <X className="h-4 w-4" strokeWidth={2} />
      </button>
    </div>
  );

  if (nodeId === "trigger") {
    return (
      <div key={nodeId}>
        {header("Trigger")}
        <p className="text-xs text-foreground/50">When should this message go out?</p>
        <Dropdown
          value={message.trigger}
          onChange={(v) => onSaveTrigger(v as InteractiveMessageTrigger)}
          options={(Object.keys(TRIGGER_META) as InteractiveMessageTrigger[]).map((t) => ({ value: t, label: TRIGGER_META[t].label }))}
          placeholder="Select trigger"
          className="mt-3"
        />
        {saving && <p className="mt-2 text-xs text-foreground/40">Saving…</p>}
        {error && <p className="mt-2 text-xs font-medium text-red-500 dark:text-red-400">{error}</p>}
      </div>
    );
  }

  if (nodeId === "message") {
    return (
      <div key={nodeId}>
        {header("Message")}
        <TextFieldPanel initial={message.bodyText} maxLength={1024} multiline onSave={onSaveBody} saving={saving} error={error} />
      </div>
    );
  }

  if (nodeId === "list-label") {
    return (
      <div key={nodeId}>
        {header("List button label")}
        <TextFieldPanel initial={message.listButtonLabel} maxLength={20} onSave={onSaveListLabel} saving={saving} error={error} />
      </div>
    );
  }

  if (nodeId.startsWith("btn-")) {
    const id = nodeId.slice(4);
    const button = message.buttons.find((b: InteractiveButton) => b.id === id);
    if (!button) return null;
    return (
      <div key={nodeId}>
        {header("Button")}
        <TextFieldPanel
          initial={button.text}
          maxLength={20}
          onSave={(v) => onSaveButton(id, v)}
          onDelete={message.buttons.length > 1 ? () => onDeleteButton(id) : undefined}
          deleteLabel="Delete button"
          saving={saving}
          error={error}
        />
      </div>
    );
  }

  if (nodeId.startsWith("row-")) {
    const id = nodeId.slice(4);
    const row = message.listRows.find((r: InteractiveListRow) => r.id === id);
    if (!row) return null;
    return (
      <div key={nodeId}>
        {header("List option")}
        <TextFieldPanel
          initial={row.title}
          maxLength={24}
          onSave={(v) => onSaveRow(id, v)}
          onDelete={message.listRows.length > 1 ? () => onDeleteRow(id) : undefined}
          deleteLabel="Delete option"
          saving={saving}
          error={error}
        />
      </div>
    );
  }

  return null;
}
