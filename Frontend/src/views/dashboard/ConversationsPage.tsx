"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowLeft, Bot, MessageCircle, Plug, Search, Send, User } from "lucide-react";
import { getWhatsAppStatus } from "@/lib/whatsapp";

type Message = {
  id: string;
  from: "customer" | "ai" | "staff";
  text: string;
  time: string;
};

type Conversation = {
  id: string;
  name: string;
  lastMessage: string;
  time: string;
  unread: number;
  mode: "ai" | "human";
  gradient: string;
  messages: Message[];
};

// Empty by default, a real account starts with no conversations. Backend
// developer, here is what this screen needs from the API:
//
// - GET /conversations returns a list matching the Conversation shape
//   above (messages can be left out of the list response and fetched
//   with GET /conversations/:id when a conversation is opened, that
//   keeps the list endpoint light).
// - New messages need to reach this page in real time, a customer can
//   message at any moment. A WebSocket (something like
//   wss://api.exofe.com/ws/conversations) that pushes new messages and
//   updated unread counts is the right fit here, plain polling works too
//   as a first pass but will feel slow.
// - POST /conversations/:id/takeover and POST /conversations/:id/handback
//   for the Take Over / Hand Back to AI button, this is what flips `mode`.
// - POST /conversations/:id/messages to send a message as staff, this
//   should go out through the WhatsApp Cloud API server side, the
//   frontend never talks to Meta directly.
//
// See DEPLOYMENT.md, "WhatsApp integration, production checklist" for how
// incoming messages should reach the backend in the first place, through
// the webhook, a queue, and a background worker.
const INITIAL_CONVERSATIONS: Conversation[] = [];

const FILTERS = ["All", "Unread", "AI Handling", "Human Handling"] as const;

function Bubble({ message }: { message: Message }) {
  const isCustomer = message.from === "customer";
  return (
    <div className={`flex ${isCustomer ? "justify-start" : "justify-end"}`}>
      <div className={`max-w-[75%] rounded-2xl px-4 py-2.5 text-sm ${
        isCustomer
          ? "rounded-bl-sm bg-surface text-foreground shadow-sm"
          : message.from === "ai"
          ? "rounded-br-sm bg-indigo-50 dark:bg-indigo-500/15 text-foreground"
          : "rounded-br-sm bg-[#5B4FE9] text-white"
      }`}>
        {!isCustomer && (
          <span className={`mb-1 flex items-center gap-1 text-[10px] font-semibold ${message.from === "ai" ? "text-[#5B4FE9]" : "text-white/70"}`}>
            {message.from === "ai" ? <Bot className="h-3 w-3" strokeWidth={2.5} /> : <User className="h-3 w-3" strokeWidth={2.5} />}
            {message.from === "ai" ? "Exofe AI" : "You"}
          </span>
        )}
        <p>{message.text}</p>
        <p className={`mt-1 text-[10px] ${isCustomer ? "text-foreground/40" : message.from === "ai" ? "text-foreground/40" : "text-white/60"}`}>
          {message.time}
        </p>
      </div>
    </div>
  );
}

export default function ConversationsPage() {
  const [conversations, setConversations] = useState<Conversation[]>(INITIAL_CONVERSATIONS);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<(typeof FILTERS)[number]>("All");
  const [draft, setDraft] = useState("");
  const [whatsappConnected, setWhatsappConnected] = useState(false);

  // Reads localStorage, has to happen after mount, same pattern used on
  // the Integrations page, so the server render and first client render
  // match.
  useEffect(() => {
    setWhatsappConnected(getWhatsAppStatus().connected);
  }, []);

  const active = conversations.find((c) => c.id === activeId) ?? null;

  const filtered = conversations.filter((c) => {
    const matchesSearch = c.name.toLowerCase().includes(search.toLowerCase());
    const matchesFilter =
      filter === "All" ||
      (filter === "Unread" && c.unread > 0) ||
      (filter === "AI Handling" && c.mode === "ai") ||
      (filter === "Human Handling" && c.mode === "human");
    return matchesSearch && matchesFilter;
  });

  const handleTakeover = () => {
    if (!active) return;
    setConversations((prev) =>
      prev.map((c) =>
        c.id === active.id
          ? {
              ...c,
              mode: c.mode === "ai" ? "human" : "ai",
              messages: [
                ...c.messages,
                {
                  id: `sys-${Date.now()}`,
                  from: "staff",
                  text: c.mode === "ai" ? "You've taken over this conversation." : "Handed this conversation back to the AI.",
                  time: "Now",
                },
              ],
            }
          : c
      )
    );
  };

  const handleSend = () => {
    if (!draft.trim() || !active) return;
    setConversations((prev) =>
      prev.map((c) =>
        c.id === active.id
          ? {
              ...c,
              mode: "human",
              lastMessage: draft,
              messages: [...c.messages, { id: `${Date.now()}`, from: "staff", text: draft, time: "Now" }],
            }
          : c
      )
    );
    setDraft("");
  };

  if (conversations.length === 0) {
    return (
      <div className="flex h-[calc(100vh-8rem)] flex-col items-center justify-center gap-3 rounded-2xl border border-ink/[.06] bg-surface p-6 text-center shadow-sm">
        <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-indigo-50 dark:bg-indigo-500/15 text-[#5B4FE9]">
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
              className="mt-2 rounded-xl shine-btn-gold relative overflow-hidden bg-gradient-to-br from-[#5B4FE9] to-[#7C6FF5] px-5 py-2.5 text-xs font-semibold text-white shadow-sm hover:opacity-90"
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
      <div className={`flex w-full flex-col border-r border-ink/[.06] sm:w-80 sm:shrink-0 ${active ? "hidden sm:flex" : "flex"}`}>
        <div className="border-b border-ink/[.06] p-3">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-foreground/35" strokeWidth={2} />
            <input
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search conversations"
              className="w-full rounded-full border border-ink/[.08] bg-ink/[.03] py-2 pl-9 pr-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-[#5B4FE9]/25"
            />
          </div>
          <div className="mt-3 flex gap-1.5 overflow-x-auto">
            {FILTERS.map((f) => (
              <button
                key={f}
                type="button"
                onClick={() => setFilter(f)}
                className={`shrink-0 rounded-full px-3 py-1.5 text-xs font-medium transition-colors ${
                  filter === f ? "bg-[#5B4FE9] text-white" : "bg-ink/[.04] text-foreground/60 hover:bg-ink/[.07]"
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
              <span className={`h-10 w-10 shrink-0 rounded-full bg-gradient-to-br ${c.gradient}`} />
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between gap-2">
                  <p className="truncate text-sm font-semibold text-foreground">{c.name}</p>
                  <span className="shrink-0 text-[11px] text-foreground/40">{c.time}</span>
                </div>
                <div className="mt-0.5 flex items-center justify-between gap-2">
                  <p className="truncate text-xs text-foreground/50">{c.lastMessage}</p>
                  {c.unread > 0 && (
                    <span className="flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-[#5B4FE9] text-[10px] font-bold text-white">
                      {c.unread}
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
      {active ? (
        <div className={`flex min-w-0 flex-1 flex-col ${active ? "flex" : "hidden sm:flex"}`}>
          <div className="flex items-center justify-between gap-3 border-b border-ink/[.06] p-3 sm:p-4">
            <div className="flex min-w-0 items-center gap-3">
              <button type="button" onClick={() => setActiveId(null)} className="sm:hidden">
                <ArrowLeft className="h-5 w-5 text-foreground/60" />
              </button>
              <span className={`h-9 w-9 shrink-0 rounded-full bg-gradient-to-br ${active.gradient}`} />
              <div className="min-w-0">
                <p className="truncate text-sm font-bold text-foreground">{active.name}</p>
                <p className="text-xs text-foreground/45">
                  {active.mode === "ai" ? "AI is replying" : "You're handling this chat"}
                </p>
              </div>
            </div>
            <motion.button
              type="button"
              onClick={handleTakeover}
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.97 }}
              className={`flex shrink-0 items-center gap-1.5 rounded-full px-3.5 py-2 text-xs font-semibold transition-colors ${
                active.mode === "ai"
                  ? "shine-btn-gold relative overflow-hidden bg-[#5B4FE9] text-white hover:bg-[#4a3fd6]"
                  : "border border-ink/[.1] text-foreground/70 hover:bg-ink/[.03]"
              }`}
            >
              {active.mode === "ai" ? <User className="h-3.5 w-3.5" strokeWidth={2.2} /> : <Bot className="h-3.5 w-3.5" strokeWidth={2.2} />}
              {active.mode === "ai" ? "Take Over" : "Hand Back to AI"}
            </motion.button>
          </div>

          <div className="flex-1 space-y-3 overflow-y-auto bg-ink/[.03] p-4">
            {active.messages.map((m) => (
              <Bubble key={m.id} message={m} />
            ))}
          </div>

          <div className="flex items-center gap-2 border-t border-ink/[.06] p-3">
            <input
              type="text"
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSend()}
              placeholder="Type a message"
              className="flex-1 rounded-full border border-ink/[.1] bg-ink/[.03] px-4 py-2.5 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-[#5B4FE9]/25"
            />
            <motion.button
              type="button"
              onClick={handleSend}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#5B4FE9] text-white"
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
