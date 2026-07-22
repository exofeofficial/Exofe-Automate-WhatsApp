// Shared client-side gate for every image upload (product photos, business
// logo) — both currently go straight to a base64 data URL with no backend
// enforcement in between (see the R2-migration notes on Product.images /
// BusinessProfile.logo in lib/api.ts), so this is the only check in place
// until real server-side upload validation exists.
const ALLOWED_TYPES = new Set(["image/jpeg", "image/webp"]);
const MAX_SIZE_BYTES = 200 * 1024;

export function validateImageFile(file: File): string | null {
  if (!ALLOWED_TYPES.has(file.type)) {
    return `${file.name}: only JPG or WebP images are allowed`;
  }
  if (file.size > MAX_SIZE_BYTES) {
    return `${file.name}: must be under 200KB`;
  }
  return null;
}
