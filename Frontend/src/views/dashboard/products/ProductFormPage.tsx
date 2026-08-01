"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, ImagePlus, Loader2, Plus, RefreshCw, Trash2, X } from "lucide-react";
import {
  ApiError,
  createProduct,
  getProduct,
  getProducts,
  updateProduct,
  type Product,
  type ProductInput,
  type ProductStatus,
} from "@/lib/api";
import { validateImageFile } from "@/lib/imageValidation";

const MAX_IMAGES = 5;
const MAX_OPTIONS = 2;

const SIZE_PRESETS = ["XS", "S", "M", "L", "XL", "XXL"];
const COLOR_PRESETS = ["Black", "White", "Red", "Blue", "Green", "Yellow", "Pink", "Grey"];
const COLOR_SWATCHES: Record<string, string> = {
  black: "#111827",
  white: "#f8fafc",
  red: "#ef4444",
  blue: "#3b82f6",
  green: "#22c55e",
  yellow: "#eab308",
  pink: "#ec4899",
  grey: "#9ca3af",
  gray: "#9ca3af",
  purple: "#a855f7",
  orange: "#f97316",
  navy: "#1e3a8a",
  beige: "#e7dcc8",
  brown: "#78350f",
  maroon: "#7f1d1d",
  teal: "#14b8a6",
};

function swatchFor(value: string): string | null {
  return COLOR_SWATCHES[value.trim().toLowerCase()] ?? null;
}

const inputClass = (hasError: boolean) =>
  `mt-1.5 w-full rounded-lg border px-3.5 py-2.5 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-[#45157b]/30 ${
    hasError ? "border-red-400 dark:border-red-500/50" : "border-ink/[.12]"
  }`;

type OptionDraft = { name: string; values: string[] };
type VariantRow = { id: string; optionValues: string[]; sku: string; price: string; stock: string };

type FormState = {
  name: string;
  category: string;
  sku: string;
  price: string;
  compareAtPrice: string;
  stock: string;
  description: string;
  images: string[];
  hasVariants: boolean;
  options: OptionDraft[];
  variants: VariantRow[];
};

const EMPTY_FORM: FormState = {
  name: "",
  category: "",
  sku: "",
  price: "",
  compareAtPrice: "",
  stock: "",
  description: "",
  images: [],
  hasVariants: false,
  options: [],
  variants: [],
};

function toFormState(product: Product): FormState {
  return {
    name: product.name,
    category: product.category,
    sku: product.sku,
    price: String(product.price),
    compareAtPrice: product.compareAtPrice !== null ? String(product.compareAtPrice) : "",
    stock: String(product.stock),
    description: product.description,
    images: product.images,
    hasVariants: product.hasVariants,
    options: product.options.map((o) => ({ name: o.name, values: o.values })),
    variants: product.variants.map((v) => ({
      id: v.id,
      optionValues: v.optionValues,
      sku: v.sku,
      price: String(v.price),
      stock: String(v.stock),
    })),
  };
}

function cartesian(arrays: string[][]): string[][] {
  return arrays.reduce<string[][]>((acc, curr) => acc.flatMap((combo) => curr.map((v) => [...combo, v])), [[]]);
}

function regenerateVariants(options: OptionDraft[], existing: VariantRow[]): VariantRow[] {
  const valueArrays = options.map((o) => o.values).filter((arr) => arr.length > 0);
  if (valueArrays.length === 0) return [];

  return cartesian(valueArrays).map((combo) => {
    const match = existing.find((v) => v.optionValues.join(" / ") === combo.join(" / "));
    return match ?? { id: `${Date.now()}-${combo.join("-")}`, optionValues: combo, sku: "", price: "", stock: "" };
  });
}

function Card({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="rounded-2xl border border-ink/[.06] bg-surface p-5 shadow-sm sm:p-6">
      <p className="text-sm font-bold text-foreground">{title}</p>
      <div className="mt-4 flex flex-col gap-4">{children}</div>
    </div>
  );
}

function OptionCard({
  option,
  onChangeName,
  onAddValue,
  onRemoveValue,
  onRemoveOption,
}: {
  option: OptionDraft;
  onChangeName: (name: string) => void;
  onAddValue: (value: string) => void;
  onRemoveValue: (value: string) => void;
  onRemoveOption: () => void;
}) {
  const [draft, setDraft] = useState("");
  const nameLower = option.name.trim().toLowerCase();
  const isSize = nameLower.includes("size");
  const isColor = nameLower.includes("colo");
  const presets = isSize ? SIZE_PRESETS : isColor ? COLOR_PRESETS : [];

  const commitDraft = () => {
    if (draft.trim()) {
      onAddValue(draft.trim());
      setDraft("");
    }
  };

  return (
    <div className="rounded-xl border border-ink/[.08] bg-ink/[.015] p-3">
      <div className="flex items-center gap-2">
        <input
          type="text"
          value={option.name}
          onChange={(e) => onChangeName(e.target.value)}
          placeholder="Option name, e.g. Size or Color"
          className="flex-1 rounded-lg border border-ink/[.12] bg-surface px-3 py-2 text-sm text-foreground font-medium focus:outline-none focus:ring-2 focus:ring-[#45157b]/30"
        />
        <button
          type="button"
          onClick={onRemoveOption}
          aria-label="Remove option"
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-foreground/40 hover:bg-ink/[.05] hover:text-red-600 dark:text-red-400"
        >
          <Trash2 className="h-4 w-4" strokeWidth={2} />
        </button>
      </div>

      <div className="mt-2.5 flex flex-wrap items-center gap-1.5 rounded-lg border border-ink/[.1] bg-surface px-2 py-1.5">
        {option.values.map((v) => (
          <span
            key={v}
            className="flex items-center gap-1.5 rounded-full bg-indigo-50 dark:bg-indigo-500/15 py-1 pl-2.5 pr-1.5 text-xs font-medium text-[#45157b]"
          >
            {isColor && swatchFor(v) && (
              <span className="h-2.5 w-2.5 rounded-full border border-black/10" style={{ backgroundColor: swatchFor(v)! }} />
            )}
            {v}
            <button
              type="button"
              onClick={() => onRemoveValue(v)}
              aria-label={`Remove ${v}`}
              className="flex h-4 w-4 items-center justify-center rounded-full hover:bg-indigo-100 dark:bg-indigo-500/20"
            >
              <X className="h-2.5 w-2.5" strokeWidth={2.5} />
            </button>
          </span>
        ))}
        <input
          type="text"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === ",") {
              e.preventDefault();
              commitDraft();
            }
          }}
          onBlur={commitDraft}
          placeholder={option.values.length === 0 ? "Type a value and press Enter" : "Add another"}
          className="min-w-[110px] flex-1 border-none bg-transparent px-1 py-1 text-xs focus:outline-none"
        />
      </div>

      {presets.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-1.5">
          {presets.map((p) => {
            const active = option.values.includes(p);
            return (
              <button
                key={p}
                type="button"
                onClick={() => (active ? onRemoveValue(p) : onAddValue(p))}
                className={`flex items-center gap-1 rounded-full border px-2.5 py-1 text-[11px] font-medium transition-colors ${
                  active ? "border-[#45157b] bg-[#45157b] text-white" : "border-ink/[.1] bg-surface text-foreground/55 hover:bg-ink/[.03]"
                }`}
              >
                {isColor && swatchFor(p) && (
                  <span className="h-2 w-2 rounded-full border border-white/40" style={{ backgroundColor: swatchFor(p)! }} />
                )}
                {p}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default function ProductFormPage({ productId }: { productId?: string }) {
  const router = useRouter();
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(Boolean(productId));
  const [loadError, setLoadError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [categories, setCategories] = useState<string[]>([]);
  const [activeImage, setActiveImage] = useState(0);
  const [imageError, setImageError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    getProducts()
      .then((res) => setCategories(Array.from(new Set(res.products.map((p) => p.category))).sort()))
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (!productId) return;
    getProduct(productId)
      .then((res) => setForm(toFormState(res.product)))
      .catch(() => setLoadError("Couldn't load this product right now."))
      .finally(() => setLoading(false));
  }, [productId]);

  const setField = <K extends keyof FormState>(key: K, value: FormState[K]) => {
    setForm((f) => ({ ...f, [key]: value }));
    setErrors((e) => ({ ...e, [key]: "" }));
  };

  const handleImagePick = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []).slice(0, MAX_IMAGES - form.images.length);
    if (files.length === 0) return;

    const rejections: string[] = [];
    const validFiles = files.filter((file) => {
      const error = validateImageFile(file);
      if (error) rejections.push(error);
      return !error;
    });
    setImageError(rejections.length > 0 ? rejections.join(" ") : null);

    if (validFiles.length === 0) {
      e.target.value = "";
      return;
    }

    Promise.all(
      validFiles.map(
        (file) =>
          new Promise<string>((resolve) => {
            const reader = new FileReader();
            reader.onload = () => resolve(reader.result as string);
            reader.readAsDataURL(file);
          })
      )
    ).then((dataUrls) => {
      setForm((f) => ({ ...f, images: [...f.images, ...dataUrls].slice(0, MAX_IMAGES) }));
    });

    e.target.value = "";
  };

  const removeImage = (index: number) => {
    setForm((f) => ({ ...f, images: f.images.filter((_, i) => i !== index) }));
    setActiveImage((i) => Math.max(0, Math.min(i, form.images.length - 2)));
  };

  const addOption = (presetName?: string) => {
    if (form.options.length >= MAX_OPTIONS) return;
    setForm((f) => ({ ...f, options: [...f.options, { name: presetName ?? "", values: [] }] }));
  };

  const updateOptionName = (index: number, name: string) => {
    setForm((f) => ({ ...f, options: f.options.map((o, i) => (i === index ? { ...o, name } : o)) }));
  };

  const addOptionValue = (index: number, value: string) => {
    setForm((f) => ({
      ...f,
      options: f.options.map((o, i) => (i === index && !o.values.includes(value) ? { ...o, values: [...o.values, value] } : o)),
    }));
  };

  const removeOptionValue = (index: number, value: string) => {
    setForm((f) => ({
      ...f,
      options: f.options.map((o, i) => (i === index ? { ...o, values: o.values.filter((v) => v !== value) } : o)),
    }));
  };

  const removeOption = (index: number) => {
    setForm((f) => ({ ...f, options: f.options.filter((_, i) => i !== index) }));
  };

  const handleGenerateVariants = () => {
    setForm((f) => ({ ...f, variants: regenerateVariants(f.options, f.variants) }));
    setErrors((e) => ({ ...e, variants: "" }));
  };

  const updateVariant = (id: string, patch: Partial<VariantRow>) => {
    setForm((f) => ({ ...f, variants: f.variants.map((v) => (v.id === id ? { ...v, ...patch } : v)) }));
    setErrors((e) => ({ ...e, variants: "" }));
  };

  const buildPayload = (status: ProductStatus): ProductInput | null => {
    const next: Record<string, string> = {};

    if (!form.name.trim()) next.name = "Product name is required";
    if (!form.category.trim()) next.category = "Add a category";

    if (form.hasVariants) {
      if (form.variants.length === 0) {
        next.variants = "Add at least one option and generate variants";
      } else if (
        form.variants.some(
          (v) => !v.price.trim() || Number.isNaN(Number(v.price)) || !v.stock.trim() || Number.isNaN(Number(v.stock))
        )
      ) {
        next.variants = "Every variant needs a price and a stock quantity";
      }
    } else {
      if (!form.price.trim() || Number.isNaN(Number(form.price)) || Number(form.price) < 0) next.price = "Enter a valid price";
      if (form.compareAtPrice.trim() && (Number.isNaN(Number(form.compareAtPrice)) || Number(form.compareAtPrice) < 0)) {
        next.compareAtPrice = "Enter a valid price";
      }
      if (!form.stock.trim() || Number.isNaN(Number(form.stock)) || Number(form.stock) < 0) next.stock = "Enter a valid quantity";
    }

    setErrors(next);
    if (Object.keys(next).length > 0) return null;

    const variants = form.variants.map((v) => ({
      id: v.id,
      optionValues: v.optionValues,
      sku: v.sku.trim(),
      price: Number(v.price),
      stock: Number(v.stock),
    }));

    return {
      name: form.name.trim(),
      category: form.category.trim(),
      sku: form.hasVariants ? "" : form.sku.trim(),
      price: form.hasVariants ? Math.min(...variants.map((v) => v.price)) : Number(form.price),
      compareAtPrice: form.hasVariants ? null : form.compareAtPrice.trim() ? Number(form.compareAtPrice) : null,
      stock: form.hasVariants ? variants.reduce((sum, v) => sum + v.stock, 0) : Number(form.stock),
      description: form.description.trim(),
      status,
      images: form.images,
      hasVariants: form.hasVariants,
      options: form.hasVariants
        ? form.options.map((o) => ({ name: o.name.trim(), values: o.values })).filter((o) => o.name && o.values.length > 0)
        : [],
      variants: form.hasVariants ? variants : [],
    };
  };

  const handleSubmit = async (status: ProductStatus) => {
    const payload = buildPayload(status);
    if (!payload) return;

    setSaving(true);
    setSubmitError(null);
    try {
      if (productId) {
        await updateProduct(productId, payload);
      } else {
        await createProduct(payload);
      }
      router.push("/dashboard/products");
    } catch (err) {
      setSubmitError(err instanceof ApiError ? err.message : "Couldn't save this product right now. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex h-[calc(100vh-10rem)] items-center justify-center rounded-2xl border border-ink/[.06] bg-surface shadow-sm">
        <Loader2 className="h-6 w-6 animate-spin text-[#45157b]" strokeWidth={2} />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <Link
            href="/dashboard/products"
            aria-label="Back to products"
            className="flex h-9 w-9 items-center justify-center rounded-full text-foreground/50 hover:bg-ink/[.05]"
          >
            <ArrowLeft className="h-4 w-4" strokeWidth={2} />
          </Link>
          <p className="text-sm font-bold text-foreground">{productId ? "Edit Product" : "Add New Product"}</p>
        </div>
        <div className="flex gap-2">
          <Link
            href="/dashboard/products"
            className="rounded-xl bg-ink/[.04] px-4 py-2.5 text-xs font-semibold text-foreground/70 hover:bg-ink/[.07]"
          >
            Cancel
          </Link>
          <button
            type="button"
            disabled={saving}
            onClick={() => handleSubmit("draft")}
            className="rounded-xl border border-ink/[.12] px-4 py-2.5 text-xs font-semibold text-foreground/70 hover:bg-ink/[.03] disabled:opacity-60"
          >
            Save as Draft
          </button>
          <button
            type="button"
            disabled={saving}
            onClick={() => handleSubmit("active")}
            className="flex items-center gap-2 rounded-xl shine-btn-gold relative overflow-hidden bg-[#45157b] px-4 py-2.5 text-xs font-semibold text-white shadow-sm hover:opacity-90 disabled:opacity-70"
          >
            {saving && <Loader2 className="h-3.5 w-3.5 animate-spin" strokeWidth={2.4} />}
            {productId ? "Save changes" : "Add Product"}
          </button>
        </div>
      </div>

      {loadError && <p className="rounded-xl bg-red-50 dark:bg-red-500/15 p-3 text-sm text-red-600 dark:text-red-400">{loadError}</p>}
      {submitError && <p className="rounded-xl bg-red-50 dark:bg-red-500/15 p-3 text-sm text-red-600 dark:text-red-400">{submitError}</p>}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_360px] lg:items-start">
        <div className="flex flex-col gap-6">
          <Card title="General Information">
            <div>
              <label className="text-xs font-semibold text-foreground/70">* Product Name</label>
              <input
                type="text"
                value={form.name}
                onChange={(e) => setField("name", e.target.value)}
                placeholder="Puffer Jacket With Pocket Detail"
                className={inputClass(Boolean(errors.name))}
              />
              {errors.name && <p className="mt-1 text-xs text-red-500 dark:text-red-400">{errors.name}</p>}
            </div>
            <div>
              <label className="text-xs font-semibold text-foreground/70">Description</label>
              <textarea
                value={form.description}
                onChange={(e) => setField("description", e.target.value)}
                rows={4}
                placeholder="What should the AI tell customers about this product?"
                className="mt-1.5 w-full rounded-lg border border-ink/[.12] px-3.5 py-2.5 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-[#45157b]/30"
              />
            </div>
          </Card>

          <Card title="Options">
            <label className="flex items-center gap-2 rounded-xl border border-ink/[.08] bg-ink/[.015] px-3.5 py-3 text-sm text-foreground/75">
              <input
                type="checkbox"
                checked={form.hasVariants}
                onChange={(e) => setField("hasVariants", e.target.checked)}
                className="h-4 w-4 rounded border-ink/[.2] text-[#45157b] focus:ring-[#45157b]/30"
              />
              This product has options, like size or color
            </label>

            {form.hasVariants && (
              <>
                {form.options.length === 0 && (
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => addOption("Size")}
                      className="flex items-center gap-1 rounded-full border border-ink/[.1] px-3 py-1.5 text-xs font-semibold text-foreground/70 hover:bg-ink/[.03]"
                    >
                      <Plus className="h-3.5 w-3.5" strokeWidth={2.5} />
                      Size
                    </button>
                    <button
                      type="button"
                      onClick={() => addOption("Color")}
                      className="flex items-center gap-1 rounded-full border border-ink/[.1] px-3 py-1.5 text-xs font-semibold text-foreground/70 hover:bg-ink/[.03]"
                    >
                      <Plus className="h-3.5 w-3.5" strokeWidth={2.5} />
                      Color
                    </button>
                    <button
                      type="button"
                      onClick={() => addOption()}
                      className="flex items-center gap-1 rounded-full border border-ink/[.1] px-3 py-1.5 text-xs font-semibold text-foreground/70 hover:bg-ink/[.03]"
                    >
                      <Plus className="h-3.5 w-3.5" strokeWidth={2.5} />
                      Custom option
                    </button>
                  </div>
                )}

                {form.options.map((opt, i) => (
                  <OptionCard
                    key={i}
                    option={opt}
                    onChangeName={(name) => updateOptionName(i, name)}
                    onAddValue={(value) => addOptionValue(i, value)}
                    onRemoveValue={(value) => removeOptionValue(i, value)}
                    onRemoveOption={() => removeOption(i)}
                  />
                ))}

                <div className="flex items-center gap-3">
                  {form.options.length > 0 && form.options.length < MAX_OPTIONS && (
                    <button
                      type="button"
                      onClick={() => addOption()}
                      className="flex items-center gap-1 text-xs font-semibold text-[#45157b] hover:underline"
                    >
                      <Plus className="h-3.5 w-3.5" strokeWidth={2.5} />
                      Add another option
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={handleGenerateVariants}
                    disabled={form.options.every((o) => o.values.length === 0)}
                    className="flex items-center gap-1.5 rounded-lg bg-ink/[.05] px-3 py-1.5 text-xs font-semibold text-foreground/70 hover:bg-ink/[.08] disabled:opacity-40"
                  >
                    <RefreshCw className="h-3.5 w-3.5" strokeWidth={2} />
                    Generate variants
                  </button>
                </div>

                {form.variants.length > 0 && (
                  <div className="overflow-x-auto rounded-xl border border-ink/[.08]">
                    <div className="min-w-[480px]">
                      <div className="flex items-center gap-2 border-b border-ink/[.06] px-3 py-2 text-[10px] font-semibold uppercase tracking-wide text-foreground/40">
                        <span className="flex-1">Variant</span>
                        <span className="w-28 shrink-0">SKU</span>
                        <span className="w-24 shrink-0">Price</span>
                        <span className="w-20 shrink-0">Stock</span>
                      </div>
                      {form.variants.map((v) => (
                        <div key={v.id} className="flex items-center gap-2 border-b border-ink/[.04] px-3 py-2 last:border-b-0">
                          <span className="flex-1 truncate text-xs font-medium text-foreground/75">
                            {v.optionValues.join(" / ")}
                          </span>
                          <input
                            type="text"
                            value={v.sku}
                            onChange={(e) => updateVariant(v.id, { sku: e.target.value })}
                            placeholder="SKU"
                            className="w-28 shrink-0 rounded-md border border-ink/[.1] px-2 py-1.5 text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-[#45157b]/30"
                          />
                          <input
                            type="number"
                            min="0"
                            value={v.price}
                            onChange={(e) => updateVariant(v.id, { price: e.target.value })}
                            placeholder="PKR"
                            className="w-24 shrink-0 rounded-md border border-ink/[.1] px-2 py-1.5 text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-[#45157b]/30"
                          />
                          <input
                            type="number"
                            min="0"
                            value={v.stock}
                            onChange={(e) => updateVariant(v.id, { stock: e.target.value })}
                            placeholder="Qty"
                            className="w-20 shrink-0 rounded-md border border-ink/[.1] px-2 py-1.5 text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-[#45157b]/30"
                          />
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                {errors.variants && <p className="text-xs text-red-500 dark:text-red-400">{errors.variants}</p>}
              </>
            )}
          </Card>

          <Card title="Pricing and Stock">
            {form.hasVariants ? (
              <p className="text-sm text-foreground/50">Price and stock are set per variant in Options above.</p>
            ) : (
              <>
                <div>
                  <label className="text-xs font-semibold text-foreground/70">SKU</label>
                  <input
                    type="text"
                    value={form.sku}
                    onChange={(e) => setField("sku", e.target.value)}
                    placeholder="KUR-BLU-001"
                    className={inputClass(false)}
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs font-semibold text-foreground/70">* Base Pricing (PKR)</label>
                    <input
                      type="number"
                      min="0"
                      value={form.price}
                      onChange={(e) => setField("price", e.target.value)}
                      placeholder="2499"
                      className={inputClass(Boolean(errors.price))}
                    />
                    {errors.price && <p className="mt-1 text-xs text-red-500 dark:text-red-400">{errors.price}</p>}
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-foreground/70">* Stock</label>
                    <input
                      type="number"
                      min="0"
                      value={form.stock}
                      onChange={(e) => setField("stock", e.target.value)}
                      placeholder="20"
                      className={inputClass(Boolean(errors.stock))}
                    />
                    {errors.stock && <p className="mt-1 text-xs text-red-500 dark:text-red-400">{errors.stock}</p>}
                  </div>
                </div>
                <div>
                  <label className="text-xs font-semibold text-foreground/70">Compare at price</label>
                  <input
                    type="number"
                    min="0"
                    value={form.compareAtPrice}
                    onChange={(e) => setField("compareAtPrice", e.target.value)}
                    placeholder="Optional, shown crossed out to customers"
                    className={inputClass(Boolean(errors.compareAtPrice))}
                  />
                  {errors.compareAtPrice && <p className="mt-1 text-xs text-red-500 dark:text-red-400">{errors.compareAtPrice}</p>}
                </div>
              </>
            )}
          </Card>
        </div>

        <div className="flex flex-col gap-6">
          <Card title="Upload Image">
            <div className="flex aspect-square w-full items-center justify-center overflow-hidden rounded-xl bg-ink/[.03] text-foreground/25">
              {form.images[activeImage] ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={form.images[activeImage]} alt="" className="h-full w-full object-cover" />
              ) : (
                <ImagePlus className="h-8 w-8" strokeWidth={2} />
              )}
            </div>
            <div className="flex flex-wrap gap-2">
              {form.images.map((src, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => setActiveImage(i)}
                  className={`h-14 w-14 shrink-0 overflow-hidden rounded-lg border-2 ${
                    activeImage === i ? "border-[#45157b]" : "border-transparent"
                  }`}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={src} alt="" className="h-full w-full object-cover" />
                </button>
              ))}
              {form.images.length < MAX_IMAGES && (
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="flex h-14 w-14 shrink-0 items-center justify-center rounded-lg border border-dashed border-ink/[.15] bg-ink/[.02] text-foreground/35 hover:bg-ink/[.04]"
                >
                  <Plus className="h-4 w-4" strokeWidth={2} />
                </button>
              )}
            </div>
            <p className="text-[11px] text-foreground/40">JPG or WebP, up to 200KB each.</p>
            {imageError && <p className="text-xs text-red-500 dark:text-red-400">{imageError}</p>}
            {form.images.length > 0 && (
              <button
                type="button"
                onClick={() => removeImage(activeImage)}
                className="self-start text-xs font-medium text-red-500 dark:text-red-400 hover:underline"
              >
                Remove this photo
              </button>
            )}
            <input ref={fileInputRef} type="file" accept="image/jpeg,image/webp" multiple onChange={handleImagePick} className="hidden" />
          </Card>

          <Card title="Category">
            <div>
              <label className="text-xs font-semibold text-foreground/70">* Product Category</label>
              <input
                type="text"
                list="product-categories"
                value={form.category}
                onChange={(e) => setField("category", e.target.value)}
                placeholder="Kurtis"
                className={inputClass(Boolean(errors.category))}
              />
              <datalist id="product-categories">
                {categories.map((c) => (
                  <option key={c} value={c} />
                ))}
              </datalist>
              {errors.category && <p className="mt-1 text-xs text-red-500 dark:text-red-400">{errors.category}</p>}
              <p className="mt-1.5 text-[11px] text-foreground/40">Type a new name to create a category on the fly.</p>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
