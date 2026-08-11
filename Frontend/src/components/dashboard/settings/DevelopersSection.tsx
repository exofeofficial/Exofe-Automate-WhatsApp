"use client";

import { useEffect, useState } from "react";
import { Boxes, Check, CheckCircle2, Copy, Key, Layers, Loader2, Plus, Trash2 } from "lucide-react";
import { ApiError, createApiKey, getSyncStats, listApiKeys, revokeApiKey, type ApiKey, type SyncStats } from "@/lib/api";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

function formatDate(iso: string | null) {
  if (!iso) return "Never";
  return new Date(iso).toLocaleDateString("en-US", { day: "numeric", month: "short", year: "numeric" });
}

export default function DevelopersSection() {
  const [keys, setKeys] = useState<ApiKey[]>([]);
  const [loading, setLoading] = useState(true);
  const [newName, setNewName] = useState("");
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [revealedKey, setRevealedKey] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [revokingId, setRevokingId] = useState<string | null>(null);
  const [stats, setStats] = useState<SyncStats | null>(null);

  useEffect(() => {
    listApiKeys()
      .then((res) => setKeys(res.keys))
      .catch(() => {})
      .finally(() => setLoading(false));
    getSyncStats()
      .then(setStats)
      .catch(() => {});
  }, []);

  const handleCreate = async () => {
    if (!newName.trim()) {
      setError("Give this key a name so you remember what it's for.");
      return;
    }
    setCreating(true);
    setError(null);
    try {
      const { key, rawKey } = await createApiKey(newName.trim());
      setKeys((prev) => [key, ...prev]);
      setRevealedKey(rawKey);
      setNewName("");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Couldn't create a key right now. Please try again.");
    } finally {
      setCreating(false);
    }
  };

  const handleRevoke = async (id: string) => {
    setRevokingId(id);
    try {
      await revokeApiKey(id);
      setKeys((prev) => prev.map((k) => (k.id === id ? { ...k, revokedAt: new Date().toISOString() } : k)));
    } catch {
      // leave the row as-is; the button just stops spinning
    } finally {
      setRevokingId(null);
    }
  };

  const copyRevealedKey = () => {
    if (!revealedKey) return;
    navigator.clipboard.writeText(revealedKey);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="flex flex-col gap-5">
      {stats && (
        <div className="rounded-2xl border border-ink/[.06] bg-surface p-5 shadow-sm sm:p-6">
          <p className="text-sm font-bold text-foreground">Sync Status</p>
          <p className="mt-1 text-xs text-foreground/50">
            What&apos;s actually landed in Exofe from your website so far — proves the
            integration is really pushing data in, not just that a key exists.
          </p>
          <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
            <div className="flex items-center gap-3 rounded-xl border border-ink/[.08] bg-ink/[.015] px-4 py-3.5">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-indigo-50 dark:bg-indigo-500/15">
                <Boxes className="h-4.5 w-4.5 text-[#45157b]" strokeWidth={2} />
              </span>
              <div>
                <p className="text-lg font-bold leading-tight text-foreground">{stats.totalProducts}</p>
                <p className="text-xs text-foreground/50">Total products</p>
              </div>
            </div>
            <div className="flex items-center gap-3 rounded-xl border border-ink/[.08] bg-ink/[.015] px-4 py-3.5">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-emerald-50 dark:bg-emerald-500/15">
                <CheckCircle2 className="h-4.5 w-4.5 text-emerald-600 dark:text-emerald-400" strokeWidth={2} />
              </span>
              <div>
                <p className="text-lg font-bold leading-tight text-foreground">{stats.activeProducts}</p>
                <p className="text-xs text-foreground/50">Live on WhatsApp</p>
              </div>
            </div>
            <div className="flex items-center gap-3 rounded-xl border border-ink/[.08] bg-ink/[.015] px-4 py-3.5">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-amber-50 dark:bg-amber-500/15">
                <Layers className="h-4.5 w-4.5 text-amber-600 dark:text-amber-400" strokeWidth={2} />
              </span>
              <div>
                <p className="text-lg font-bold leading-tight text-foreground">{stats.categories}</p>
                <p className="text-xs text-foreground/50">Categories</p>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="rounded-2xl border border-ink/[.06] bg-surface p-5 shadow-sm sm:p-6">
        <p className="text-sm font-bold text-foreground">API Keys</p>
        <p className="mt-1 text-xs text-foreground/50">
          Let a developer connect your own website or app to Exofe — sync products and shipping
          settings without logging in to the dashboard.
        </p>

        {revealedKey && (
          <div className="mt-5 rounded-xl border border-amber-300 bg-amber-50 p-4 dark:border-amber-500/30 dark:bg-amber-500/10">
            <p className="text-xs font-semibold text-amber-800 dark:text-amber-300">
              Copy this key now — you won&apos;t be able to see it again.
            </p>
            <div className="mt-2 flex items-center gap-2">
              <code className="min-w-0 flex-1 truncate rounded-lg bg-white px-3 py-2 text-xs text-foreground dark:bg-black/20">
                {revealedKey}
              </code>
              <button
                type="button"
                onClick={copyRevealedKey}
                className="flex shrink-0 items-center gap-1.5 rounded-lg bg-[#45157b] px-3 py-2 text-xs font-semibold text-white hover:opacity-90"
              >
                {copied ? <Check className="h-3.5 w-3.5" strokeWidth={2.5} /> : <Copy className="h-3.5 w-3.5" strokeWidth={2} />}
                {copied ? "Copied" : "Copy"}
              </button>
            </div>
            <button
              type="button"
              onClick={() => setRevealedKey(null)}
              className="mt-2 text-xs font-medium text-amber-800 underline underline-offset-2 dark:text-amber-300"
            >
              Done, I&apos;ve saved it
            </button>
          </div>
        )}

        <div className="mt-5 flex flex-col gap-2 sm:flex-row">
          <input
            type="text"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            placeholder="e.g. Storefront sync"
            className="flex-1 rounded-lg border border-ink/[.12] px-3.5 py-2.5 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-[#45157b]/30"
          />
          <button
            type="button"
            onClick={handleCreate}
            disabled={creating}
            className="flex items-center justify-center gap-2 rounded-xl bg-[#45157b] px-4 py-2.5 text-xs font-semibold text-white shadow-sm hover:opacity-90 disabled:opacity-70"
          >
            {creating ? <Loader2 className="h-3.5 w-3.5 animate-spin" strokeWidth={2} /> : <Plus className="h-3.5 w-3.5" strokeWidth={2.5} />}
            Generate new key
          </button>
        </div>
        {error && <p className="mt-3 rounded-lg bg-red-50 dark:bg-red-500/15 p-3 text-sm text-red-600 dark:text-red-400">{error}</p>}

        <div className="mt-5 flex flex-col gap-2">
          {loading && (
            <div className="flex justify-center py-6">
              <Loader2 className="h-5 w-5 animate-spin text-[#45157b]" strokeWidth={2} />
            </div>
          )}
          {!loading && keys.length === 0 && (
            <p className="rounded-xl border border-dashed border-ink/[.12] py-6 text-center text-xs text-foreground/45">
              No API keys yet. Generate one above to get started.
            </p>
          )}
          {keys.map((key) => {
            const isRevoked = !!key.revokedAt;
            return (
              <div
                key={key.id}
                className={`flex items-center justify-between rounded-xl border px-4 py-3 ${
                  isRevoked ? "border-ink/[.06] bg-ink/[.015] opacity-60" : "border-ink/[.08] bg-ink/[.015]"
                }`}
              >
                <div className="flex items-center gap-3">
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-indigo-50 dark:bg-indigo-500/15">
                    <Key className="h-4 w-4 text-[#45157b]" strokeWidth={2} />
                  </span>
                  <div>
                    <p className="text-sm font-semibold text-foreground">{key.name}</p>
                    <p className="text-xs text-foreground/45">
                      {key.keyPrefix}••••••••• · Created {formatDate(key.createdAt)} · Last used {formatDate(key.lastUsedAt)}
                      {isRevoked ? " · Revoked" : ""}
                    </p>
                  </div>
                </div>
                {!isRevoked && (
                  <button
                    type="button"
                    onClick={() => handleRevoke(key.id)}
                    disabled={revokingId === key.id}
                    className="flex shrink-0 items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-medium text-red-600 hover:bg-red-50 disabled:opacity-60 dark:text-red-400 dark:hover:bg-red-500/10"
                  >
                    {revokingId === key.id ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" strokeWidth={2} />
                    ) : (
                      <Trash2 className="h-3.5 w-3.5" strokeWidth={2} />
                    )}
                    Revoke
                  </button>
                )}
              </div>
            );
          })}
        </div>
      </div>

      <div className="rounded-2xl border border-ink/[.06] bg-surface p-5 shadow-sm sm:p-6">
        <p className="text-sm font-bold text-foreground">Quick start</p>
        <p className="mt-1 text-xs text-foreground/50">
          Send your key as the <code className="rounded bg-ink/[.06] px-1 py-0.5">X-API-Key</code> header on
          every request.
        </p>
        <pre className="mt-3 overflow-x-auto rounded-xl bg-[#0d0d12] p-4 text-xs leading-relaxed text-emerald-300">
{`curl ${API_BASE_URL}/public/products \\
  -H "X-API-Key: exf_live_..."

curl -X PATCH ${API_BASE_URL}/public/shipping \\
  -H "X-API-Key: exf_live_..." \\
  -H "Content-Type: application/json" \\
  -d '{"areas":"Lahore, Karachi","charge":150,"estimatedTime":"1-2 days","cashOnDelivery":true,"pickupAvailable":false}'`}
        </pre>
      </div>
    </div>
  );
}
