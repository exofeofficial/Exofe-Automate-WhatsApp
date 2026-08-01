"use client";

import { useRef } from "react";
import InsertVariablePanel from "./InsertVariablePanel";
import { renderPreview } from "./interactiveMessageHelpers";

export default function Step2Describe({
  bodyText,
  onChange,
  onNext,
  onBack,
}: {
  bodyText: string;
  onChange: (v: string) => void;
  onNext: () => void;
  onBack: () => void;
}) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  // Clicking a variable chip blurs the textarea first (it's a separate
  // button), so by the time the click handler runs, the browser has
  // already thrown away where the cursor was. Track it ourselves on every
  // click, key press, and selection change inside the textarea, and fall
  // back to that instead of trusting selectionStart read at click time.
  const cursorRef = useRef(bodyText.length);

  const trackCursor = (el: HTMLTextAreaElement | null) => {
    if (el) cursorRef.current = el.selectionStart ?? bodyText.length;
  };

  const insertVariable = (key: string) => {
    const token = `{{${key}}}`;
    const el = textareaRef.current;
    const pos = el && document.activeElement === el ? (el.selectionStart ?? cursorRef.current) : cursorRef.current;
    const next = bodyText.slice(0, pos) + token + bodyText.slice(pos);
    onChange(next);

    const newPos = pos + token.length;
    cursorRef.current = newPos;
    requestAnimationFrame(() => {
      const node = textareaRef.current;
      if (node) {
        node.focus();
        node.setSelectionRange(newPos, newPos);
      }
    });
  };

  return (
    <div className="flex flex-col gap-4">
      <div>
        <p className="text-sm font-bold text-foreground">Write your message</p>
        <p className="mt-1 text-xs text-foreground/50">
          Type it like a normal message, then click a variable below to drop in real customer or order details.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-[1fr_220px]">
        <textarea
          ref={textareaRef}
          value={bodyText}
          onChange={(e) => {
            onChange(e.target.value);
            cursorRef.current = e.target.selectionStart ?? e.target.value.length;
          }}
          onSelect={(e) => trackCursor(e.currentTarget)}
          onKeyUp={(e) => trackCursor(e.currentTarget)}
          onClick={(e) => trackCursor(e.currentTarget)}
          rows={7}
          placeholder="Hello {{customer_name}}, thank you for your order."
          className="w-full rounded-lg border border-ink/[.12] px-3.5 py-2.5 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-[#45157b]/30"
        />
        <InsertVariablePanel onInsert={insertVariable} />
      </div>

      <div>
        <p className="text-xs font-semibold text-foreground/60">Preview with sample data</p>
        <div className="mt-1.5 rounded-xl bg-[#e5ddd5] p-4">
          <div className="max-w-[260px] rounded-2xl rounded-tl-sm bg-surface px-3.5 py-3 shadow-sm">
            <p className="whitespace-pre-wrap text-sm text-foreground/85">
              {bodyText.trim() ? renderPreview(bodyText) : "Your message will appear here"}
            </p>
          </div>
        </div>
      </div>

      <div className="flex gap-3">
        <button
          type="button"
          onClick={onBack}
          className="flex-1 rounded-xl bg-ink/[.04] py-3 text-sm font-semibold text-foreground/70 hover:bg-ink/[.07]"
        >
          Back
        </button>
        <button
          type="button"
          onClick={onNext}
          disabled={!bodyText.trim()}
          className="flex-1 rounded-xl shine-btn-gold relative overflow-hidden bg-[#45157b] py-3 text-sm font-semibold text-white shadow-sm hover:opacity-90 disabled:opacity-40"
        >
          Continue
        </button>
      </div>
    </div>
  );
}
