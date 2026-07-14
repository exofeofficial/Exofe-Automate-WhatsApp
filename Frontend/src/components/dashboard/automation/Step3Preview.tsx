"use client";

import { List, MessageSquareText, Plus, Trash2 } from "lucide-react";
import type { InteractiveButton, InteractiveListRow, InteractiveMessageKind } from "@/lib/api";
import { makeButton, makeListRow, renderPreview } from "./interactiveMessageHelpers";

const MAX_BUTTONS = 3;
const MAX_LIST_ROWS = 10;

export default function Step3Preview({
  bodyText,
  onBodyChange,
  kind,
  onKindChange,
  buttons,
  onButtonsChange,
  listButtonLabel,
  onListButtonLabelChange,
  listRows,
  onListRowsChange,
  onNext,
  onBack,
}: {
  bodyText: string;
  onBodyChange: (v: string) => void;
  kind: InteractiveMessageKind;
  onKindChange: (v: InteractiveMessageKind) => void;
  buttons: InteractiveButton[];
  onButtonsChange: (v: InteractiveButton[]) => void;
  listButtonLabel: string;
  onListButtonLabelChange: (v: string) => void;
  listRows: InteractiveListRow[];
  onListRowsChange: (v: InteractiveListRow[]) => void;
  onNext: () => void;
  onBack: () => void;
}) {
  const canContinue = bodyText.trim() && (kind === "buttons" ? buttons.length > 0 : listRows.length > 0);

  return (
    <div className="flex flex-col gap-5">
      <div>
        <p className="text-sm font-bold text-foreground">Your preview</p>
        <p className="mt-1 text-xs text-foreground/50">
          The preview on the right shows real sample values, the message on the left keeps the variables so they
          fill in correctly for every customer.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
        <div className="flex flex-col gap-4">
          <div>
            <label className="text-xs font-semibold text-foreground/70">Message text</label>
            <textarea
              value={bodyText}
              onChange={(e) => onBodyChange(e.target.value)}
              rows={3}
              className="mt-1.5 w-full rounded-lg border border-black/[.12] px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#5B4FE9]/30"
            />
          </div>

          <div className="flex overflow-hidden rounded-lg border border-black/[.12]">
            <button
              type="button"
              onClick={() => onKindChange("buttons")}
              className={`flex flex-1 items-center justify-center gap-1.5 py-2 text-xs font-semibold transition-colors ${
                kind === "buttons" ? "bg-[#5B4FE9] text-white" : "bg-white text-foreground/60 hover:bg-black/[.03]"
              }`}
            >
              <MessageSquareText className="h-3.5 w-3.5" strokeWidth={2} />
              Buttons
            </button>
            <button
              type="button"
              onClick={() => onKindChange("list")}
              className={`flex flex-1 items-center justify-center gap-1.5 py-2 text-xs font-semibold transition-colors ${
                kind === "list" ? "bg-[#5B4FE9] text-white" : "bg-white text-foreground/60 hover:bg-black/[.03]"
              }`}
            >
              <List className="h-3.5 w-3.5" strokeWidth={2} />
              List
            </button>
          </div>

          {kind === "buttons" ? (
            <div className="flex flex-col gap-2">
              <label className="text-xs font-semibold text-foreground/70">Buttons (up to {MAX_BUTTONS})</label>
              {buttons.map((b, i) => (
                <div key={b.id} className="flex items-center gap-2">
                  <input
                    type="text"
                    value={b.text}
                    onChange={(e) =>
                      onButtonsChange(buttons.map((btn, idx) => (idx === i ? { ...btn, text: e.target.value } : btn)))
                    }
                    className="flex-1 rounded-lg border border-black/[.12] px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#5B4FE9]/30"
                  />
                  <button
                    type="button"
                    onClick={() => onButtonsChange(buttons.filter((_, idx) => idx !== i))}
                    aria-label="Remove button"
                    className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-foreground/40 hover:bg-red-50 hover:text-red-600"
                  >
                    <Trash2 className="h-3.5 w-3.5" strokeWidth={2} />
                  </button>
                </div>
              ))}
              {buttons.length < MAX_BUTTONS && (
                <button
                  type="button"
                  onClick={() => onButtonsChange([...buttons, makeButton("")])}
                  className="flex items-center gap-1 self-start text-xs font-semibold text-[#5B4FE9] hover:underline"
                >
                  <Plus className="h-3.5 w-3.5" strokeWidth={2.5} />
                  Add button
                </button>
              )}
            </div>
          ) : (
            <div className="flex flex-col gap-2">
              <div>
                <label className="text-xs font-semibold text-foreground/70">Button label</label>
                <input
                  type="text"
                  value={listButtonLabel}
                  onChange={(e) => onListButtonLabelChange(e.target.value)}
                  className="mt-1.5 w-full rounded-lg border border-black/[.12] px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#5B4FE9]/30"
                />
              </div>
              <label className="text-xs font-semibold text-foreground/70">Options (up to {MAX_LIST_ROWS})</label>
              {listRows.map((row, i) => (
                <div key={row.id} className="flex items-center gap-2">
                  <input
                    type="text"
                    value={row.title}
                    onChange={(e) =>
                      onListRowsChange(listRows.map((r, idx) => (idx === i ? { ...r, title: e.target.value } : r)))
                    }
                    className="flex-1 rounded-lg border border-black/[.12] px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#5B4FE9]/30"
                  />
                  <button
                    type="button"
                    onClick={() => onListRowsChange(listRows.filter((_, idx) => idx !== i))}
                    aria-label="Remove option"
                    className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-foreground/40 hover:bg-red-50 hover:text-red-600"
                  >
                    <Trash2 className="h-3.5 w-3.5" strokeWidth={2} />
                  </button>
                </div>
              ))}
              {listRows.length < MAX_LIST_ROWS && (
                <button
                  type="button"
                  onClick={() => onListRowsChange([...listRows, makeListRow("")])}
                  className="flex items-center gap-1 self-start text-xs font-semibold text-[#5B4FE9] hover:underline"
                >
                  <Plus className="h-3.5 w-3.5" strokeWidth={2.5} />
                  Add option
                </button>
              )}
            </div>
          )}
        </div>

        <div className="flex items-start justify-center rounded-2xl bg-[#e5ddd5] p-5">
          <div className="w-full max-w-[260px] overflow-hidden rounded-2xl rounded-tl-sm bg-white shadow-sm">
            <div className="px-3.5 py-3">
              <p className="whitespace-pre-wrap text-sm text-foreground/85">
                {bodyText ? renderPreview(bodyText) : "Your message will appear here"}
              </p>
            </div>
            <div className="flex flex-col divide-y divide-black/[.06] border-t border-black/[.06]">
              {kind === "buttons"
                ? buttons.map((b) => (
                    <span key={b.id} className="px-3.5 py-2.5 text-center text-sm font-medium text-[#00a5f4]">
                      {b.text ? renderPreview(b.text) : "Button"}
                    </span>
                  ))
                : (
                    <>
                      <span className="px-3.5 py-2.5 text-center text-sm font-medium text-[#00a5f4]">
                        {listButtonLabel ? renderPreview(listButtonLabel) : "View Options"}
                      </span>
                      {listRows.length > 0 && (
                        <p className="px-3.5 py-2 text-center text-[11px] text-foreground/35">
                          Opens: {listRows.map((r) => renderPreview(r.title || "Option")).join(", ")}
                        </p>
                      )}
                    </>
                  )}
            </div>
          </div>
        </div>
      </div>

      <div className="flex gap-3">
        <button
          type="button"
          onClick={onBack}
          className="flex-1 rounded-xl bg-black/[.04] py-3 text-sm font-semibold text-foreground/70 hover:bg-black/[.07]"
        >
          Back
        </button>
        <button
          type="button"
          onClick={onNext}
          disabled={!canContinue}
          className="flex-1 rounded-xl bg-gradient-to-br from-[#5B4FE9] to-[#7C6FF5] py-3 text-sm font-semibold text-white shadow-sm hover:opacity-90 disabled:opacity-40"
        >
          Continue
        </button>
      </div>
    </div>
  );
}
