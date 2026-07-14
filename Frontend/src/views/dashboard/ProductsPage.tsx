"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { AnimatePresence } from "framer-motion";
import { ApiError, deleteProducts, getProducts, importProductsCsv, type Product } from "@/lib/api";
import { FileUp, Loader2, Pencil, Plus, Search, ShoppingBag, Trash2 } from "lucide-react";
import DeleteConfirmModal from "@/components/dashboard/products/DeleteConfirmModal";
import ImportCsvModal from "@/components/dashboard/products/ImportCsvModal";

const STATUS_FILTERS = ["All", "Active", "Draft"] as const;

function formatPrice(value: number) {
  return `PKR ${value.toLocaleString("en-PK")}`;
}

export default function ProductsPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("All");
  const [statusFilter, setStatusFilter] = useState<(typeof STATUS_FILTERS)[number]>("All");
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const [showImport, setShowImport] = useState(false);
  const [importing, setImporting] = useState(false);
  const [importError, setImportError] = useState<string | null>(null);

  const [deleteTarget, setDeleteTarget] = useState<string[] | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  // Backend developer: this is a real GET /products call (see src/lib/api.ts),
  // it will fail until that endpoint exists, which is expected, the page
  // just falls back to the empty state below rather than showing fake data.
  useEffect(() => {
    getProducts()
      .then((res) => setProducts(res.products))
      .catch(() => setProducts([]))
      .finally(() => setLoading(false));
  }, []);

  const categories = useMemo(() => Array.from(new Set(products.map((p) => p.category))).sort(), [products]);

  const filtered = products.filter((p) => {
    const matchesSearch = p.name.toLowerCase().includes(search.toLowerCase());
    const matchesCategory = categoryFilter === "All" || p.category === categoryFilter;
    const matchesStatus = statusFilter === "All" || p.status === statusFilter.toLowerCase();
    return matchesSearch && matchesCategory && matchesStatus;
  });

  const toggleSelected = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleSelectAll = () => {
    setSelected((prev) => (prev.size === filtered.length ? new Set() : new Set(filtered.map((p) => p.id))));
  };

  const handleImport = async (file: File) => {
    setImporting(true);
    setImportError(null);
    try {
      await importProductsCsv(file);
      const res = await getProducts();
      setProducts(res.products);
      setShowImport(false);
    } catch (err) {
      setImportError(err instanceof ApiError ? err.message : "Couldn't import this file right now. Please try again.");
    } finally {
      setImporting(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    setDeleteError(null);
    try {
      await deleteProducts(deleteTarget);
      setProducts((prev) => prev.filter((p) => !deleteTarget.includes(p.id)));
      setSelected((prev) => {
        const next = new Set(prev);
        deleteTarget.forEach((id) => next.delete(id));
        return next;
      });
      setDeleteTarget(null);
    } catch (err) {
      setDeleteError(err instanceof ApiError ? err.message : "Couldn't delete right now. Please try again.");
    } finally {
      setDeleting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex h-[calc(100vh-10rem)] items-center justify-center rounded-2xl border border-black/[.06] bg-white shadow-sm">
        <Loader2 className="h-6 w-6 animate-spin text-[#5B4FE9]" strokeWidth={2} />
      </div>
    );
  }

  if (products.length === 0) {
    return (
      <div className="flex h-[calc(100vh-10rem)] flex-col items-center justify-center gap-3 rounded-2xl border border-black/[.06] bg-white p-6 text-center shadow-sm">
        <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-indigo-50 text-[#5B4FE9]">
          <ShoppingBag className="h-6 w-6" strokeWidth={2} />
        </span>
        <p className="text-sm font-bold text-foreground">No products yet</p>
        <p className="max-w-xs text-sm text-foreground/50">
          Add your first product so the AI assistant can start taking orders for it on WhatsApp.
        </p>
        <div className="mt-2 flex gap-3">
          <button
            type="button"
            onClick={() => setShowImport(true)}
            className="rounded-xl bg-black/[.04] px-5 py-2.5 text-xs font-semibold text-foreground/70 hover:bg-black/[.07]"
          >
            Import CSV
          </button>
          <Link
            href="/dashboard/products/new"
            className="rounded-xl bg-gradient-to-br from-[#5B4FE9] to-[#7C6FF5] px-5 py-2.5 text-xs font-semibold text-white shadow-sm hover:opacity-90"
          >
            Add product
          </Link>
        </div>

        <AnimatePresence>
          {showImport && (
            <ImportCsvModal
              onClose={() => {
                setShowImport(false);
                setImportError(null);
              }}
              onImport={handleImport}
              importing={importing}
              error={importError}
            />
          )}
        </AnimatePresence>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-foreground/55">Manage the catalog your AI assistant sells on WhatsApp.</p>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => setShowImport(true)}
            className="flex items-center gap-1.5 rounded-xl bg-black/[.04] px-4 py-2.5 text-xs font-semibold text-foreground/70 hover:bg-black/[.07]"
          >
            <FileUp className="h-3.5 w-3.5" strokeWidth={2} />
            Import CSV
          </button>
          <Link
            href="/dashboard/products/new"
            className="flex items-center gap-1.5 rounded-xl bg-gradient-to-br from-[#5B4FE9] to-[#7C6FF5] px-4 py-2.5 text-xs font-semibold text-white shadow-sm hover:opacity-90"
          >
            <Plus className="h-3.5 w-3.5" strokeWidth={2.5} />
            Add product
          </Link>
        </div>
      </div>

      {selected.size > 0 ? (
        <div className="flex items-center justify-between gap-3 rounded-2xl border border-indigo-100 bg-indigo-50/60 px-4 py-3">
          <p className="text-xs font-semibold text-[#5B4FE9]">{selected.size} selected</p>
          <button
            type="button"
            onClick={() => setDeleteTarget(Array.from(selected))}
            className="flex items-center gap-1.5 rounded-lg bg-red-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-red-700"
          >
            <Trash2 className="h-3.5 w-3.5" strokeWidth={2} />
            Delete
          </button>
        </div>
      ) : (
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative min-w-[180px] flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-foreground/35" strokeWidth={2} />
            <input
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search products"
              className="w-full rounded-full border border-black/[.08] bg-white py-2 pl-9 pr-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#5B4FE9]/25"
            />
          </div>
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="rounded-full border border-black/[.08] bg-white px-3 py-2 text-xs font-medium text-foreground/70 focus:outline-none focus:ring-2 focus:ring-[#5B4FE9]/25"
          >
            <option value="All">All categories</option>
            {categories.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
          <div className="flex gap-1.5">
            {STATUS_FILTERS.map((f) => (
              <button
                key={f}
                type="button"
                onClick={() => setStatusFilter(f)}
                className={`shrink-0 rounded-full px-3 py-2 text-xs font-medium transition-colors ${
                  statusFilter === f ? "bg-[#5B4FE9] text-white" : "bg-black/[.04] text-foreground/60 hover:bg-black/[.07]"
                }`}
              >
                {f}
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="overflow-x-auto rounded-2xl border border-black/[.06] bg-white shadow-sm">
        <div className="min-w-[720px]">
          <div className="flex items-center gap-4 border-b border-black/[.06] px-4 py-3 text-[11px] font-semibold uppercase tracking-wide text-foreground/40">
            <input
              type="checkbox"
              checked={selected.size > 0 && selected.size === filtered.length}
              onChange={toggleSelectAll}
              className="h-4 w-4 shrink-0 rounded border-black/[.2] text-[#5B4FE9] focus:ring-[#5B4FE9]/30"
            />
            <span className="flex-1">Product</span>
            <span className="w-28 shrink-0">Price</span>
            <span className="w-20 shrink-0">Stock</span>
            <span className="w-20 shrink-0">Status</span>
            <span className="w-16 shrink-0 text-right">Actions</span>
          </div>

          {filtered.map((p) => (
            <div key={p.id} className="flex items-center gap-4 border-b border-black/[.04] px-4 py-3 last:border-b-0 hover:bg-black/[.01]">
              <input
                type="checkbox"
                checked={selected.has(p.id)}
                onChange={() => toggleSelected(p.id)}
                className="h-4 w-4 shrink-0 rounded border-black/[.2] text-[#5B4FE9] focus:ring-[#5B4FE9]/30"
              />
              <div className="flex min-w-0 flex-1 items-center gap-3">
                <span className="flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-black/[.03] text-foreground/25">
                  {p.images[0] ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={p.images[0]} alt="" className="h-full w-full object-cover" />
                  ) : (
                    <ShoppingBag className="h-4 w-4" strokeWidth={2} />
                  )}
                </span>
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-foreground">{p.name}</p>
                  <p className="truncate text-xs text-foreground/45">
                    {p.category}
                    {p.hasVariants
                      ? ` · ${p.variants.length} variant${p.variants.length === 1 ? "" : "s"}`
                      : p.sku
                        ? ` · ${p.sku}`
                        : ""}
                  </p>
                </div>
              </div>
              <div className="w-28 shrink-0 text-sm text-foreground/75">
                {p.hasVariants && "From "}
                {formatPrice(p.price)}
                {p.compareAtPrice && (
                  <span className="ml-1.5 text-xs text-foreground/35 line-through">{formatPrice(p.compareAtPrice)}</span>
                )}
              </div>
              <div className="w-20 shrink-0">
                <span
                  className={`text-xs font-semibold ${
                    p.stock === 0 ? "text-red-500" : p.stock < 5 ? "text-amber-600" : "text-foreground/60"
                  }`}
                >
                  {p.stock}
                </span>
              </div>
              <div className="w-20 shrink-0">
                <span
                  className={`rounded-full px-2.5 py-1 text-[11px] font-medium capitalize ${
                    p.status === "active" ? "bg-emerald-50 text-emerald-600" : "bg-black/[.05] text-foreground/45"
                  }`}
                >
                  {p.status}
                </span>
              </div>
              <div className="flex w-16 shrink-0 justify-end gap-1">
                <Link
                  href={`/dashboard/products/${p.id}/edit`}
                  aria-label={`Edit ${p.name}`}
                  className="flex h-7 w-7 items-center justify-center rounded-lg text-foreground/40 hover:bg-black/[.05] hover:text-foreground"
                >
                  <Pencil className="h-3.5 w-3.5" strokeWidth={2} />
                </Link>
                <button
                  type="button"
                  onClick={() => setDeleteTarget([p.id])}
                  aria-label={`Delete ${p.name}`}
                  className="flex h-7 w-7 items-center justify-center rounded-lg text-foreground/40 hover:bg-red-50 hover:text-red-600"
                >
                  <Trash2 className="h-3.5 w-3.5" strokeWidth={2} />
                </button>
              </div>
            </div>
          ))}

          {filtered.length === 0 && (
            <p className="p-8 text-center text-sm text-foreground/40">No products match your filters.</p>
          )}
        </div>
      </div>

      <AnimatePresence>
        {showImport && (
          <ImportCsvModal
            onClose={() => {
              setShowImport(false);
              setImportError(null);
            }}
            onImport={handleImport}
            importing={importing}
            error={importError}
          />
        )}
        {deleteTarget && (
          <DeleteConfirmModal
            count={deleteTarget.length}
            onClose={() => {
              setDeleteTarget(null);
              setDeleteError(null);
            }}
            onConfirm={handleDelete}
            deleting={deleting}
            error={deleteError}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
