"use client";

import { useState } from "react";
import { Loader2, Pencil, Plus, Trash2 } from "lucide-react";
import { ApiError, createFaq, deleteFaq, updateFaq, type Faq } from "@/lib/api";

const inputClass =
  "w-full rounded-lg border border-black/[.12] px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#5B4FE9]/30";

function FaqForm({
  initial,
  onCancel,
  onSubmit,
  submitLabel,
}: {
  initial: { question: string; answer: string };
  onCancel: () => void;
  onSubmit: (question: string, answer: string) => Promise<void>;
  submitLabel: string;
}) {
  const [question, setQuestion] = useState(initial.question);
  const [answer, setAnswer] = useState(initial.answer);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!question.trim() || !answer.trim()) return;
    setSaving(true);
    setError(null);
    try {
      await onSubmit(question.trim(), answer.trim());
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Couldn't save this FAQ right now. Please try again.");
      setSaving(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-2.5 rounded-xl border border-black/[.08] bg-black/[.015] p-3.5">
      <input
        type="text"
        value={question}
        onChange={(e) => setQuestion(e.target.value)}
        placeholder="Question (e.g. Do you deliver outside Lahore?)"
        className={inputClass}
      />
      <textarea
        value={answer}
        onChange={(e) => setAnswer(e.target.value)}
        rows={2}
        placeholder="Answer"
        className={inputClass}
      />
      {error && <p className="text-xs text-red-500">{error}</p>}
      <div className="flex items-center gap-2">
        <button
          type="submit"
          disabled={saving || !question.trim() || !answer.trim()}
          className="flex items-center gap-1.5 rounded-lg bg-[#5B4FE9] px-3.5 py-2 text-xs font-semibold text-white hover:bg-[#4a3fd6] disabled:opacity-50"
        >
          {saving && <Loader2 className="h-3.5 w-3.5 animate-spin" strokeWidth={2} />}
          {submitLabel}
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="rounded-lg px-3.5 py-2 text-xs font-semibold text-foreground/60 hover:bg-black/[.04]"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}

export default function FaqSection({ initial }: { initial: Faq[] }) {
  const [faqs, setFaqs] = useState(initial);
  const [adding, setAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const handleAdd = async (question: string, answer: string) => {
    const { faq } = await createFaq({ question, answer });
    setFaqs((prev) => [faq, ...prev]);
    setAdding(false);
  };

  const handleEdit = async (id: string, question: string, answer: string) => {
    const { faq } = await updateFaq(id, { question, answer });
    setFaqs((prev) => prev.map((f) => (f.id === id ? faq : f)));
    setEditingId(null);
  };

  const handleDelete = async (id: string) => {
    setDeletingId(id);
    try {
      await deleteFaq(id);
      setFaqs((prev) => prev.filter((f) => f.id !== id));
    } catch {
      // row stays put, they can just try again
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="rounded-2xl border border-black/[.06] bg-white p-5 shadow-sm sm:p-6">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-bold text-foreground">FAQs</p>
          <p className="mt-1 text-xs text-foreground/50">Questions the AI can answer directly, in your own words.</p>
        </div>
        {!adding && (
          <button
            type="button"
            onClick={() => setAdding(true)}
            className="flex items-center gap-1.5 rounded-lg bg-black/[.04] px-3 py-2 text-xs font-semibold text-foreground/70 hover:bg-black/[.07]"
          >
            <Plus className="h-3.5 w-3.5" strokeWidth={2.5} />
            Add FAQ
          </button>
        )}
      </div>

      <div className="mt-4 flex flex-col gap-3">
        {adding && (
          <FaqForm
            initial={{ question: "", answer: "" }}
            onCancel={() => setAdding(false)}
            onSubmit={handleAdd}
            submitLabel="Add"
          />
        )}

        {faqs.length === 0 && !adding ? (
          <p className="py-2 text-center text-xs text-foreground/40">No FAQs yet. Add the questions customers ask most.</p>
        ) : (
          faqs.map((f) =>
            editingId === f.id ? (
              <FaqForm
                key={f.id}
                initial={{ question: f.question, answer: f.answer }}
                onCancel={() => setEditingId(null)}
                onSubmit={(q, a) => handleEdit(f.id, q, a)}
                submitLabel="Save"
              />
            ) : (
              <div key={f.id} className="flex items-start justify-between gap-3 rounded-xl bg-black/[.02] p-3.5">
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-foreground">{f.question}</p>
                  <p className="mt-1 text-sm text-foreground/60">{f.answer}</p>
                </div>
                <div className="flex shrink-0 items-center gap-1">
                  <button
                    type="button"
                    onClick={() => setEditingId(f.id)}
                    aria-label="Edit FAQ"
                    className="flex h-7 w-7 items-center justify-center rounded-lg text-foreground/40 hover:bg-black/[.05] hover:text-foreground"
                  >
                    <Pencil className="h-3.5 w-3.5" strokeWidth={2} />
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDelete(f.id)}
                    disabled={deletingId === f.id}
                    aria-label="Delete FAQ"
                    className="flex h-7 w-7 items-center justify-center rounded-lg text-foreground/40 hover:bg-red-50 hover:text-red-600 disabled:opacity-50"
                  >
                    {deletingId === f.id ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" strokeWidth={2} />
                    ) : (
                      <Trash2 className="h-3.5 w-3.5" strokeWidth={2} />
                    )}
                  </button>
                </div>
              </div>
            )
          )
        )}
      </div>
    </div>
  );
}
