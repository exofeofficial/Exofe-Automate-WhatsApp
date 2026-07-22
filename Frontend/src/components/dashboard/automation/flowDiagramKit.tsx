"use client";

import { useEffect } from "react";
import { useReactFlow, useViewport } from "@xyflow/react";

// Shared rendering kit for every Flow Builder diagram (the read-only
// order-taking map and the editable per-message flows). React Flow's own
// edge renderer and `fitView` silently never painted anything on this
// build (nodes/pan/zoom all work fine — a known class of issue with this
// library version) so both are done by hand here: connectors as a plain
// SVG overlay kept in sync with pan/zoom via useViewport(), and "fit
// everything in view" as a direct setViewport() write watched by a
// ResizeObserver (the container isn't at its final size the instant a
// dashboard page mounts, so a one-shot measurement isn't enough).

export type Rect = { x: number; y: number; width: number; height: number };
export type DiagramEdge = { id: string; source: string; target: string; label?: string; tone?: "warn" | "success" };

type Side = "left" | "right" | "top" | "bottom";

function anchor(rect: Rect, side: Side) {
  switch (side) {
    case "right":
      return { x: rect.x + rect.width, y: rect.y + rect.height / 2 };
    case "left":
      return { x: rect.x, y: rect.y + rect.height / 2 };
    case "top":
      return { x: rect.x + rect.width / 2, y: rect.y };
    case "bottom":
      return { x: rect.x + rect.width / 2, y: rect.y + rect.height };
  }
}

// Picks the exit/entry sides from the actual direction between the two
// nodes' centers, instead of always leaving from the right — a target
// sitting straight above or below gets a clean vertical line out its
// top/bottom rather than an odd sideways jog.
function elbowPath(s: Rect, t: Rect) {
  const dx = t.x + t.width / 2 - (s.x + s.width / 2);
  const dy = t.y + t.height / 2 - (s.y + s.height / 2);

  if (Math.abs(dx) >= Math.abs(dy)) {
    const sp = anchor(s, dx >= 0 ? "right" : "left");
    const tp = anchor(t, dx >= 0 ? "left" : "right");
    const midX = sp.x + (tp.x - sp.x) / 2;
    return { d: `M ${sp.x} ${sp.y} L ${midX} ${sp.y} L ${midX} ${tp.y} L ${tp.x} ${tp.y}`, labelX: midX, labelY: (sp.y + tp.y) / 2 };
  }

  const sp = anchor(s, dy >= 0 ? "bottom" : "top");
  const tp = anchor(t, dy >= 0 ? "top" : "bottom");
  const midY = sp.y + (tp.y - sp.y) / 2;
  return { d: `M ${sp.x} ${sp.y} L ${sp.x} ${midY} L ${tp.x} ${midY} L ${tp.x} ${tp.y}`, labelX: (sp.x + tp.x) / 2, labelY: midY };
}

const EDGE_COLOR: Record<string, string> = { warn: "#ef4444", success: "#16a34a" };

export function FlowEdgeOverlay({ edges, rects }: { edges: DiagramEdge[]; rects: Map<string, Rect> }) {
  const { x, y, zoom } = useViewport();
  return (
    <svg className="pointer-events-none absolute inset-0 h-full w-full overflow-visible">
      <defs>
        <marker id="flow-arrow" markerWidth="9" markerHeight="9" refX="7" refY="4.5" orient="auto-start-reverse">
          <path d="M0,0 L9,4.5 L0,9 Z" fill="#5B4FE9" />
        </marker>
        <marker id="flow-arrow-warn" markerWidth="9" markerHeight="9" refX="7" refY="4.5" orient="auto-start-reverse">
          <path d="M0,0 L9,4.5 L0,9 Z" fill="#ef4444" />
        </marker>
        <marker id="flow-arrow-success" markerWidth="9" markerHeight="9" refX="7" refY="4.5" orient="auto-start-reverse">
          <path d="M0,0 L9,4.5 L0,9 Z" fill="#16a34a" />
        </marker>
      </defs>
      <g transform={`translate(${x},${y}) scale(${zoom})`}>
        {edges.map((edge) => {
          const s = rects.get(edge.source);
          const t = rects.get(edge.target);
          if (!s || !t) return null;
          const color = EDGE_COLOR[edge.tone ?? ""] ?? "#5B4FE9";
          const { d, labelX, labelY } = elbowPath(s, t);
          return (
            <g key={edge.id}>
              <path d={d} fill="none" stroke={color} strokeWidth={1.75} markerEnd={`url(#flow-arrow${edge.tone ? `-${edge.tone}` : ""})`} />
              {edge.label && (
                <g transform={`translate(${labelX},${labelY})`}>
                  <rect x={-(edge.label.length * 3.2 + 6)} y={-9} width={edge.label.length * 6.4 + 12} height={18} rx={4} fill="var(--surface)" opacity={0.95} />
                  <text textAnchor="middle" dominantBaseline="middle" fontSize={11} fontWeight={600} fill={color}>
                    {edge.label}
                  </text>
                </g>
              )}
            </g>
          );
        })}
      </g>
    </svg>
  );
}

export function computeBounds(rects: Map<string, Rect>) {
  const all = Array.from(rects.values());
  const minX = Math.min(...all.map((r) => r.x));
  const minY = Math.min(...all.map((r) => r.y));
  const maxX = Math.max(...all.map((r) => r.x + r.width));
  const maxY = Math.max(...all.map((r) => r.y + r.height));
  return { minX, minY, width: maxX - minX, height: maxY - minY };
}

export function AutoFit({ bounds }: { bounds: { minX: number; minY: number; width: number; height: number } }) {
  const { setViewport } = useReactFlow();

  useEffect(() => {
    const container = document.querySelector(".react-flow");
    if (!container) return;

    const fit = () => {
      const rect = container.getBoundingClientRect();
      if (rect.width === 0 || rect.height === 0 || bounds.width === 0 || bounds.height === 0) return;
      const padding = 60;
      const zoom = Math.min((rect.width - padding * 2) / bounds.width, (rect.height - padding * 2) / bounds.height, 1);
      const x = (rect.width - bounds.width * zoom) / 2 - bounds.minX * zoom;
      const y = (rect.height - bounds.height * zoom) / 2 - bounds.minY * zoom;
      setViewport({ x, y, zoom }, { duration: 0 });
    };

    fit();
    const observer = new ResizeObserver(fit);
    observer.observe(container);
    return () => observer.disconnect();
  }, [setViewport, bounds.minX, bounds.minY, bounds.width, bounds.height]);

  return null;
}
