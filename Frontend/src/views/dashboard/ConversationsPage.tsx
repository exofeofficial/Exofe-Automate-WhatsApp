"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowLeft, Bot, MessageCircle, Plug, Search, Send, User } from "lucide-react";
import { getWhatsAppStatus } from "@/lib/whatsapp";
import {
  ApiError,
  getConversation,
  getConversations,
  handbackConversation,
  sendConversationMessage,
  takeoverConversation,
  type ConversationDetail,
  type ConversationMessage,
  type ConversationSummary,
} from "@/lib/api";

const LIST_POLL_MS = 8_000;
const ACTIVE_POLL_MS = 4_000;

const FILTERS = ["All", "Unread", "AI Handling", "Human Handling"] as const;

const GRADIENTS = [
  "from-[#45157b] to-[#7c3aed]",
  "from-[#0ea5e9] to-[#45157b]",
  "from-[#f59e0b] to-[#ef4444]",
  "from-[#10b981] to-[#0ea5e9]",
  "from-[#ec4899] to-[#7c3aed]",
  "from-[#f59e0b] to-[#10b981]",
];

function gradientFor(id: string) {
  let hash = 0;
  for (let i = 0; i < id.length; i++) hash = (hash * 31 + id.charCodeAt(i)) >>> 0;
  return GRADIENTS[hash % GRADIENTS.length];
}

function relativeTime(iso: string | null) {
  if (!iso) return "";
  const diffMs = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diffMs / 60_000);
  if (mins < 1) return "Now";
  if (mins < 60) return `${mins}m`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d`;
  return new Date(iso).toLocaleDateString();
}

function Bubble({ message }: { message: ConversationMessage }) {
  const isCustomer = message.from === "customer";
  return (
    <div className={`flex ${isCustomer ? "justify-start" : "justify-end"}`}>
      <div className={`max-w-[75%] rounded-2xl px-4 py-2.5 text-sm ${
        isCustomer
          ? "rounded-bl-sm bg-surface text-foreground shadow-sm"
          : message.from === "ai"
          ? "rounded-br-sm bg-indigo-50 dark:bg-indigo-500/15 text-foreground"
          : "rounded-br-sm bg-[#45157b] text-white"
      }`}>
        {!isCustomer && (
          <span className={`mb-1 flex items-center gap-1 text-[10px] font-semibold ${message.from === "ai" ? "text-[#45157b]" : "text-white/70"}`}>
            {message.from === "ai" ? <Bot className="h-3 w-3" strokeWidth={2.5} /> : <User className="h-3 w-3" strokeWidth={2.5} />}
            {message.from === "ai" ? "Exofe AI" : "You"}
          </span>
        )}
        <p>{message.text}</p>
        <p className={`mt-1 text-[10px] ${isCustomer ? "text-foreground/40" : message.from === "ai" ? "text-foreground/40" : "text-white/60"}`}>
          {new Date(message.time).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}
        </p>
      </div>
    </div>
  );
}

export default function ConversationsPage() {
  const [conversations, setConversations] = useState<ConversationSummary[] | null>(null);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [activeDetail, setActiveDetail] = useState<ConversationDetail | null>(null);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<(typeof FILTERS)[number]>("All");
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const [takeoverBusy, setTakeoverBusy] = useState(false);
  const [whatsappConnected, setWhatsappConnected] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setWhatsappConnected(getWhatsAppStatus().connected);
  }, []);

  // list, polled
  useEffect(() => {
    let cancelled = false;
    const refresh = () => {
      getConversations()
        .then((res) => {
          if (!cancelled) setConversations(res.conversations);
        })
        .catch(() => {
          if (!cancelled) setConversations((prev) => prev ?? []);
        });
    };
    refresh();
    const id = setInterval(refresh, LIST_POLL_MS);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, []);

  // active conversation detail, polled while open
  useEffect(() => {
    if (!activeId) {
      setActiveDetail(null);
      return;
    }
    let cancelled = false;
    const refresh = () => {
      getConversation(activeId)
        .then((detail) => {
          if (!cancelled) setActiveDetail(detail);
        })
        .catch(() => {});
    };
    refresh();
    const id = setInterval(refresh, ACTIVE_POLL_MS);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, [activeId]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [activeDetail?.messages.length]);

  const list = conversations ?? [];
  const filtered = list.filter((c) => {
    const matchesSearch = (c.name ?? c.whatsappNumber).toLowerCase().includes(search.toLowerCase());
    const matchesFilter =
      filter === "All" ||
      (filter === "Unread" && c.unreadCount > 0) ||
      (filter === "AI Handling" && c.mode === "ai") ||
      (filter === "Human Handling" && c.mode === "human");
    return matchesSearch && matchesFilter;
  });

  const handleTakeover = async () => {
    if (!activeDetail || takeoverBusy) return;
    setTakeoverBusy(true);
    try {
      const result =
        activeDetail.mode === "ai" ? await takeoverConversation(activeDetail.id) : await handbackConversation(activeDetail.id);
      setActiveDetail((prev) => (prev ? { ...prev, mode: result.mode } : prev));
      setConversations((prev) => prev?.map((c) => (c.id === activeDetail.id ? { ...c, mode: result.mode } : c)) ?? prev);
    } catch {
      // next poll will resync if this failed silently
    } finally {
      setTakeoverBusy(false);
    }
  };

  const handleSend = async () => {
    const text = draft.trim();
    if (!text || !activeDetail || sending) return;
    setSending(true);
    setDraft("");
    try {
      const { message } = await sendConversationMessage(activeDetail.id, text);
      setActiveDetail((prev) => (prev ? { ...prev, mode: "human", messages: [...prev.messages, message] } : prev));
      setConversations(
        (prev) =>
          prev?.map((c) =>
            c.id === activeDetail.id
              ? { ...c, mode: "human", lastMessage: text, lastMessageAt: message.time, lastDirection: "outbound", unreadCount: 0 }
              : c
          ) ?? prev
      );
    } catch (err) {
      setDraft(text);
      if (err instanceof ApiError) alert(err.message);
    } finally {
      setSending(false);
    }
  };

  if (conversations === null) {
    return (
      <div className="flex h-[calc(100vh-8rem)] items-center justify-center rounded-2xl border border-ink/[.06] bg-surface shadow-sm">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-[#45157b]/20 border-t-[#45157b]" />
      </div>
    );
  }

  if (conversations.length === 0) {
    return (
      <div className="flex h-[calc(100vh-8rem)] flex-col items-center justify-center gap-3 rounded-2xl border border-ink/[.06] bg-surface p-6 text-center shadow-sm">
        <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-indigo-50 dark:bg-indigo-500/15 text-[#45157b]">
          {whatsappConnected ? <MessageCircle className="h-6 w-6" strokeWidth={2} /> : <Plug className="h-6 w-6" strokeWidth={2} />}
        </span>
        {whatsappConnected ? (
          <>
            <p className="text-sm font-bold text-foreground">No conversations yet</p>
            <p className="max-w-xs text-sm text-foreground/50">
              When a customer messages your WhatsApp number, the conversation will show up here right away.
            </p>
          </>
        ) : (
          <>
            <p className="text-sm font-bold text-foreground">WhatsApp is not connected yet</p>
            <p className="max-w-xs text-sm text-foreground/50">
              Connect your WhatsApp Business number so customer conversations start showing up here.
            </p>
            <Link
              href="/dashboard/integrations"
              className="mt-2 rounded-xl shine-btn-gold relative overflow-hidden bg-[#45157b] px-5 py-2.5 text-xs font-semibold text-white shadow-sm hover:opacity-90"
            >
              Connect WhatsApp
            </Link>
          </>
        )}
      </div>
    );
  }

  return (
    <div className="flex h-[calc(100vh-8rem)] overflow-hidden rounded-2xl border border-ink/[.06] bg-surface shadow-sm">
      {/* conversation list */}
      <div className={`flex w-full flex-col border-r border-ink/[.06] sm:w-80 sm:shrink-0 ${activeId ? "hidden sm:flex" : "flex"}`}>
        <div className="border-b border-ink/[.06] p-3">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-foreground/35" strokeWidth={2} />
            <input
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search conversations"
              className="w-full rounded-full border border-ink/[.08] bg-ink/[.03] py-2 pl-9 pr-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-[#45157b]/25"
            />
          </div>
          <div className="mt-3 flex gap-1.5 overflow-x-auto">
            {FILTERS.map((f) => (
              <button
                key={f}
                type="button"
                onClick={() => setFilter(f)}
                className={`shrink-0 rounded-full px-3 py-1.5 text-xs font-medium transition-colors ${
                  filter === f ? "bg-[#45157b] text-white" : "bg-ink/[.04] text-foreground/60 hover:bg-ink/[.07]"
                }`}
              >
                {f}
              </button>
            ))}
          </div>
        </div>

        <div className="flex-1 overflow-y-auto">
          {filtered.map((c) => (
            <button
              key={c.id}
              type="button"
              onClick={() => setActiveId(c.id)}
              className={`flex w-full items-center gap-3 border-b border-ink/[.04] px-4 py-3 text-left transition-colors ${
                activeId === c.id ? "bg-indigo-50 dark:bg-indigo-500/15" : "hover:bg-ink/[.02]"
              }`}
            >
              <span className={`h-10 w-10 shrink-0 rounded-full bg-gradient-to-br ${gradientFor(c.id)}`} />
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between gap-2">
                  <p className="truncate text-sm font-semibold text-foreground">{c.name ?? c.whatsappNumber}</p>
                  <span className="shrink-0 text-[11px] text-foreground/40">{relativeTime(c.lastMessageAt)}</span>
                </div>
                <div className="mt-0.5 flex items-center justify-between gap-2">
                  <p className="truncate text-xs text-foreground/50">{c.lastMessage}</p>
                  {c.unreadCount > 0 && (
                    <span className="flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-[#45157b] text-[10px] font-bold text-white">
                      {c.unreadCount}
                    </span>
                  )}
                </div>
              </div>
            </button>
          ))}
          {filtered.length === 0 && (
            <p className="p-6 text-center text-sm text-foreground/40">No conversations match.</p>
          )}
        </div>
      </div>

      {/* chat window */}
      {activeDetail ? (
        <div className="flex min-w-0 flex-1 flex-col">
          <div className="flex items-center justify-between gap-3 border-b border-ink/[.06] p-3 sm:p-4">
            <div className="flex min-w-0 items-center gap-3">
              <button type="button" onClick={() => setActiveId(null)} className="sm:hidden">
                <ArrowLeft className="h-5 w-5 text-foreground/60" />
              </button>
              <span className={`h-9 w-9 shrink-0 rounded-full bg-gradient-to-br ${gradientFor(activeDetail.id)}`} />
              <div className="min-w-0">
                <p className="truncate text-sm font-bold text-foreground">{activeDetail.name ?? activeDetail.whatsappNumber}</p>
                <p className="text-xs text-foreground/45">
                  {activeDetail.mode === "ai" ? "AI is replying" : "You're handling this chat"}
                </p>
              </div>
            </div>
            <motion.button
              type="button"
              onClick={handleTakeover}
              disabled={takeoverBusy}
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.97 }}
              className={`flex shrink-0 items-center gap-1.5 rounded-full px-3.5 py-2 text-xs font-semibold transition-colors disabled:opacity-60 ${
                activeDetail.mode === "ai"
                  ? "shine-btn-gold relative overflow-hidden bg-[#45157b] text-white hover:opacity-90"
                  : "border border-ink/[.1] text-foreground/70 hover:bg-ink/[.03]"
              }`}
            >
              {activeDetail.mode === "ai" ? <User className="h-3.5 w-3.5" strokeWidth={2.2} /> : <Bot className="h-3.5 w-3.5" strokeWidth={2.2} />}
              {activeDetail.mode === "ai" ? "Take Over" : "Hand Back to AI"}
            </motion.button>
          </div>

          <div className="flex-1 space-y-3 overflow-y-auto bg-ink/[.03] p-4">
            {activeDetail.messages.map((m) => (
              <Bubble key={m.id} message={m} />
            ))}
            <div ref={messagesEndRef} />
          </div>

          <div className="flex items-center gap-2 border-t border-ink/[.06] p-3">
            <input
              type="text"
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSend()}
              placeholder="Type a message"
              className="flex-1 rounded-full border border-ink/[.1] bg-ink/[.03] px-4 py-2.5 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-[#45157b]/25"
            />
            <motion.button
              type="button"
              onClick={handleSend}
              disabled={sending || !draft.trim()}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#45157b] text-white disabled:opacity-60"
              aria-label="Send message"
            >
              <Send className="h-4 w-4" strokeWidth={2.2} />
            </motion.button>
          </div>
        </div>
      ) : (
        <div className="hidden flex-1 items-center justify-center text-sm text-foreground/40 sm:flex">
          Select a conversation
        </div>
      )}
    </div>
  );
}
