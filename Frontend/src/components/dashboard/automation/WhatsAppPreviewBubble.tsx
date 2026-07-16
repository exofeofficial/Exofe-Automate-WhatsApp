import type { InteractiveButton, InteractiveListRow, InteractiveMessageKind } from "@/lib/api";
import { renderPreview } from "./interactiveMessageHelpers";

// The read-only WhatsApp-style chat bubble used both in the wizard's live
// preview step and in the Templates gallery, so a template preview looks
// exactly like what building it by hand would produce.
export default function WhatsAppPreviewBubble({
  bodyText,
  kind,
  buttons,
  listButtonLabel,
  listRows,
}: {
  bodyText: string;
  kind: InteractiveMessageKind;
  buttons: InteractiveButton[];
  listButtonLabel: string;
  listRows: InteractiveListRow[];
}) {
  return (
    <div className="flex items-start justify-center rounded-2xl bg-[#e5ddd5] p-5">
      <div className="w-full max-w-[260px] overflow-hidden rounded-2xl rounded-tl-sm bg-white shadow-sm">
        <div className="px-3.5 py-3">
          <p className="whitespace-pre-wrap text-sm text-foreground/85">
            {bodyText ? renderPreview(bodyText) : "Your message will appear here"}
          </p>
        </div>
        <div className="flex flex-col divide-y divide-black/[.06] border-t border-black/[.06]">
          {kind === "buttons" ? (
            buttons.map((b) => (
              <span key={b.id} className="px-3.5 py-2.5 text-center text-sm font-medium text-[#00a5f4]">
                {b.text ? renderPreview(b.text) : "Button"}
              </span>
            ))
          ) : (
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
  );
}
