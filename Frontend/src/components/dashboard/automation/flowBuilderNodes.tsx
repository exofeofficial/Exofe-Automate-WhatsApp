"use client";

import { Handle, Position, type NodeProps } from "@xyflow/react";
import { CircleHelp, MessageCircle, Play, Sparkles, SquareCheck } from "lucide-react";

// Five node "shapes" for the order-taking flow diagram — trigger (where a
// customer message enters), decision (a branch in the logic), ai (a real
// Gemini call), action (a plain backend step), and end (a terminal reply
// or hand-off). Each just needs to read clearly at a glance and hold up
// next to the AI Assistant / Automation pages' existing visual language.

const baseNode = "min-w-[220px] rounded-2xl border px-4 py-3 text-left shadow-sm";
const handleClass = "!h-2 !w-2 !border-2 !border-surface";

export function TriggerNode({ data }: NodeProps) {
  return (
    <div className={`${baseNode} border-emerald-500/30 bg-emerald-50 dark:bg-emerald-500/10`}>
      <div className="flex items-center gap-2">
        <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-emerald-500 text-white">
          <Play className="h-3.5 w-3.5" strokeWidth={2.5} fill="currentColor" />
        </span>
        <p className="text-sm font-bold text-foreground">{data.label as string}</p>
      </div>
      {!!data.sub && <p className="mt-1 pl-9 text-xs text-foreground/50">{data.sub as string}</p>}
      <Handle type="source" position={Position.Right} className={`${handleClass} !bg-emerald-500`} />
    </div>
  );
}

export function DecisionNode({ data }: NodeProps) {
  return (
    <div className={`${baseNode} border-secondary/40 bg-secondary/10`}>
      <Handle type="target" position={Position.Left} className={`${handleClass} !bg-secondary`} />
      <div className="flex items-center gap-2">
        <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-secondary text-[#1a1730]">
          <CircleHelp className="h-3.5 w-3.5" strokeWidth={2.5} />
        </span>
        <p className="text-sm font-bold text-foreground">{data.label as string}</p>
      </div>
      {!!data.sub && <p className="mt-1 pl-9 text-xs text-foreground/50">{data.sub as string}</p>}
      <Handle type="source" position={Position.Right} className={`${handleClass} !bg-secondary`} />
    </div>
  );
}

export function AINode({ data }: NodeProps) {
  return (
    <div className={`${baseNode} border-[#5B4FE9]/40 bg-gradient-to-br from-[#5B4FE9]/10 to-[#7C6FF5]/10`}>
      <Handle type="target" position={Position.Left} className={`${handleClass} !bg-[#5B4FE9]`} />
      <div className="flex items-center gap-2">
        <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-[#5B4FE9] to-[#7C6FF5] text-white">
          <Sparkles className="h-3.5 w-3.5" strokeWidth={2.5} />
        </span>
        <p className="text-sm font-bold text-foreground">{data.label as string}</p>
      </div>
      {!!data.sub && <p className="mt-1 pl-9 text-xs text-foreground/50">{data.sub as string}</p>}
      <Handle type="source" position={Position.Right} className={`${handleClass} !bg-[#5B4FE9]`} />
    </div>
  );
}

export function ActionNode({ data }: NodeProps) {
  return (
    <div className={`${baseNode} border-ink/[.1] bg-surface`}>
      <Handle type="target" position={Position.Left} className={`${handleClass} !bg-foreground/40`} />
      <div className="flex items-center gap-2">
        <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-ink/[.06] text-foreground/70">
          <MessageCircle className="h-3.5 w-3.5" strokeWidth={2.5} />
        </span>
        <p className="text-sm font-bold text-foreground">{data.label as string}</p>
      </div>
      {!!data.sub && <p className="mt-1 pl-9 text-xs text-foreground/50">{data.sub as string}</p>}
      <Handle type="source" position={Position.Right} className={`${handleClass} !bg-foreground/40`} />
    </div>
  );
}

export function EndNode({ data }: NodeProps) {
  return (
    <div className={`${baseNode} border-ink/[.08] bg-ink/[.03]`}>
      <Handle type="target" position={Position.Left} className={`${handleClass} !bg-foreground/30`} />
      <div className="flex items-center gap-2">
        <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-ink/[.08] text-foreground/60">
          <SquareCheck className="h-3.5 w-3.5" strokeWidth={2.5} />
        </span>
        <p className="text-sm font-bold text-foreground/85">{data.label as string}</p>
      </div>
      {!!data.sub && <p className="mt-1 pl-9 text-xs text-foreground/50">{data.sub as string}</p>}
    </div>
  );
}

export const NODE_TYPES = {
  trigger: TriggerNode,
  decision: DecisionNode,
  ai: AINode,
  action: ActionNode,
  end: EndNode,
};
