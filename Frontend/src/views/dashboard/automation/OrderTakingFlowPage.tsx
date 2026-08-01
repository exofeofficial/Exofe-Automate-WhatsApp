"use client";

import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { Background, BackgroundVariant, Controls, MiniMap, ReactFlow, ReactFlowProvider, type Node } from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { NODE_TYPES } from "@/components/dashboard/automation/flowBuilderNodes";
import { AutoFit, FlowEdgeOverlay, computeBounds, type DiagramEdge } from "@/components/dashboard/automation/flowDiagramKit";

// A read-only map of the actual order-taking flow — every node here is a
// real branch inside app/services/conversation_service.py, not a mockup.
// Positions are hand-placed to read top-to-bottom for the quick-reply
// lanes and left-to-right for the order-collection spine.
const NODES: (Node & { width: number; height: number })[] = [
  { id: "trigger", type: "trigger", position: { x: 40, y: 560 }, data: { label: "Customer sends a WhatsApp message" } },

  { id: "gate", type: "decision", position: { x: 360, y: 560 }, data: { label: "Within plan's AI usage?", sub: "24h conversation window + monthly quota" } },
  { id: "blocked", type: "end", position: { x: 360, y: 140 }, data: { label: "Hand off to your team", sub: "Plan limit reached — human takes over" } },

  { id: "hasDraft", type: "decision", position: { x: 700, y: 560 }, data: { label: "Order already in progress?" } },

  { id: "classify", type: "ai", position: { x: 1040, y: 300 }, data: { label: "Classify intent", sub: "Gemini — greeting / FAQ / order / unclear" } },
  { id: "continueDraft", type: "action", position: { x: 1040, y: 860 }, data: { label: "Resume the open draft", sub: "Same customer, same order" } },

  { id: "greeting", type: "end", position: { x: 1380, y: 20 }, data: { label: "Send greeting message", sub: "From your AI Behavior settings" } },
  { id: "faqCheck", type: "decision", position: { x: 1380, y: 180 }, data: { label: "Matching FAQ on file?" } },
  { id: "faqAnswer", type: "end", position: { x: 1700, y: 120 }, data: { label: "Send the FAQ answer" } },
  { id: "unclear", type: "decision", position: { x: 1380, y: 380 }, data: { label: "Handover enabled?", sub: "AI Behavior → handover toggle" } },
  { id: "handoff", type: "end", position: { x: 1700, y: 320 }, data: { label: "Hand off to your team" } },
  { id: "rephrase", type: "end", position: { x: 1700, y: 460 }, data: { label: "Ask the customer to rephrase" } },
  { id: "orderStart", type: "action", position: { x: 1380, y: 560 }, data: { label: "Start a new draft order" } },

  { id: "extract", type: "ai", position: { x: 1700, y: 700 }, data: { label: "Extract order details", sub: "Gemini — reads your live product catalog" } },
  { id: "outOfStock", type: "decision", position: { x: 2040, y: 700 }, data: { label: "Item out of stock?" } },
  { id: "askAlternative", type: "end", position: { x: 2380, y: 560 }, data: { label: "Ask for a different item", sub: "Draft stays open" } },
  { id: "saveDraft", type: "action", position: { x: 2380, y: 820 }, data: { label: "Save the updated draft" } },

  { id: "allComplete", type: "decision", position: { x: 2700, y: 820 }, data: { label: "Every required field filled?", sub: "product, qty, name, address, payment" } },
  { id: "askNext", type: "end", position: { x: 3020, y: 680 }, data: { label: "Ask the next question", sub: "One field at a time" } },

  { id: "confirmed", type: "decision", position: { x: 3020, y: 960 }, data: { label: "Customer confirmed?", sub: "Explicit \"yes\" — AI call or deterministic fallback" } },
  { id: "askConfirm", type: "end", position: { x: 3360, y: 820 }, data: { label: "Send order summary", sub: "\"Reply YES to confirm\"" } },

  { id: "finalize", type: "action", position: { x: 3360, y: 1080 }, data: { label: "Create the order", sub: "Decrements real stock" } },
  { id: "sendConfirmation", type: "end", position: { x: 3700, y: 1080 }, data: { label: "Send confirmation + total", sub: "Order lands in Orders" } },
].map((n) => ({
  // Explicit dimensions so React Flow can render nodes immediately
  // instead of waiting on a ResizeObserver pass, and so the connector
  // overlay (see flowDiagramKit) can compute exact anchor points
  // without needing to ask React Flow for measured sizes.
  ...n,
  width: 240,
  height: (n.data as { sub?: string }).sub ? 84 : 60,
}));

const EDGES: DiagramEdge[] = [
  { id: "e1", source: "trigger", target: "gate" },
  { id: "e2", source: "gate", target: "blocked", label: "Over limit", tone: "warn" },
  { id: "e3", source: "gate", target: "hasDraft", label: "OK" },
  { id: "e4", source: "hasDraft", target: "classify", label: "No" },
  { id: "e5", source: "hasDraft", target: "continueDraft", label: "Yes" },
  { id: "e6", source: "classify", target: "greeting", label: "Greeting" },
  { id: "e7", source: "classify", target: "faqCheck", label: "FAQ" },
  { id: "e8", source: "classify", target: "unclear", label: "Unclear" },
  { id: "e9", source: "classify", target: "orderStart", label: "Order" },
  { id: "e10", source: "faqCheck", target: "faqAnswer", label: "Found" },
  { id: "e11", source: "faqCheck", target: "unclear", label: "Not found" },
  { id: "e12", source: "unclear", target: "handoff", label: "Handover on" },
  { id: "e13", source: "unclear", target: "rephrase", label: "Handover off" },
  { id: "e14", source: "orderStart", target: "extract" },
  { id: "e15", source: "continueDraft", target: "extract" },
  { id: "e16", source: "extract", target: "outOfStock" },
  { id: "e17", source: "outOfStock", target: "askAlternative", label: "Yes" },
  { id: "e18", source: "outOfStock", target: "saveDraft", label: "No" },
  { id: "e19", source: "saveDraft", target: "allComplete" },
  { id: "e20", source: "allComplete", target: "askNext", label: "No" },
  { id: "e21", source: "allComplete", target: "confirmed", label: "Yes" },
  { id: "e22", source: "confirmed", target: "askConfirm", label: "No" },
  { id: "e23", source: "confirmed", target: "finalize", label: "Yes", tone: "success" },
  { id: "e24", source: "finalize", target: "sendConfirmation" },
];

const NODE_RECTS = new Map(NODES.map((n) => [n.id, { x: n.position.x, y: n.position.y, width: n.width, height: n.height }]));
const BOUNDS = computeBounds(NODE_RECTS);

export default function OrderTakingFlowPage() {
  return (
    <div className="flex flex-col gap-4">
      <div>
        <Link href="/dashboard/automation/flow-builder" className="flex items-center gap-1.5 text-xs font-semibold text-foreground/50 hover:text-foreground">
          <ArrowLeft className="h-3.5 w-3.5" strokeWidth={2} />
          All flows
        </Link>
        <p className="mt-2 text-sm font-bold text-foreground">Order-Taking Flow</p>
        <p className="mt-0.5 text-sm text-foreground/55">
          Exactly how your AI handles every inbound WhatsApp message today, end to end — scroll or drag to explore, pinch/scroll to zoom.
        </p>
      </div>

      <div className="relative h-[calc(100vh-15rem)] min-h-[480px] overflow-clip rounded-2xl border border-ink/[.06] bg-surface shadow-sm">
        <ReactFlowProvider>
          <ReactFlow
            nodes={NODES}
            edges={[]}
            nodeTypes={NODE_TYPES}
            minZoom={0.2}
            maxZoom={1.5}
            proOptions={{ hideAttribution: true }}
            nodesDraggable={false}
            nodesConnectable={false}
            elementsSelectable={false}
          >
            <Background variant={BackgroundVariant.Dots} gap={20} size={1} className="!bg-background" />
            <Controls showInteractive={false} className="!shadow-lg" />
            <MiniMap
              position="top-right"
              pannable
              zoomable
              className="!bg-surface"
              maskColor="rgba(91, 79, 233, 0.06)"
              nodeColor={(n) => (n.type === "end" ? "#9ca3af" : n.type === "decision" ? "#fcba03" : n.type === "ai" ? "#45157b" : "#10b981")}
            />
          </ReactFlow>
          <FlowEdgeOverlay edges={EDGES} rects={NODE_RECTS} />
          <AutoFit bounds={BOUNDS} />
        </ReactFlowProvider>
      </div>
    </div>
  );
}
