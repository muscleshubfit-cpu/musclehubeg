// ============================================================================
// Browser-side image compression — Phase 98 (owner speed/compression quest
// «هل فى طريقة اخرى لتحسين السرعه وضغط الصور خارج فيرسال؟»)
// ============================================================================
// WHY: the heaviest images on the site are USER uploads (avatars, progress
// photos, questionnaire photos, coach-public photos) — modern phone cameras
// produce 3-8 MB JPEGs that then live forever in Supabase Storage and get
// downloaded on every profile/progress/questionnaire render. Vercel's
// optimizer is switched off (Phase 97 free-tier quota guard), so the
// ORIGINAL bytes ship to the browser. Compressing ON THE DEVICE, BEFORE
// the upload, is: free (no vendor, no quota), permanent (smaller bytes
// stored once, served everywhere), and privacy-safe (nothing leaves the
// browser before the user's own upload action).
//
// SAFETY CONTRACT (money-path law — an upload must NEVER break):
//   - Anything unexpected (bitmap decode failure, canvas error, Safari
//     without WebP encoding, anything) → the ORIGINAL File is returned and
//     the upload proceeds exactly as before.
//   - If the compressed output is not actually SMALLER than the original
//     (already-optimized input), the original wins.
//   - GIFs/SVGs/animated formats are passed through untouched.
// ============================================================================

export interface CompressOptions {
  /** Longest edge cap in px (default 1600 — crisp on retina phones) */
  maxDim?: number;
  /** WebP/JPEG quality 0-1 (default 0.82) */
  quality?: number;
}

const DEFAULTS: Required<CompressOptions> = { maxDim: 1600, quality: 0.82 };

/** Formats we never touch (transparency/vector/animation semantics) */
const PASSTHROUGH_TYPES = new Set(["image/gif", "image/svg+xml", "image/webp"]);

/** Encode canvas → Blob, trying WebP first, falling back to JPEG */
function canvasToBlob(
  canvas: HTMLCanvasElement,
  type: string,
  quality: number,
): Promise<Blob | null> {
  return new Promise((resolve) => {
    try {
      canvas.toBlob((blob) => resolve(blob), type, quality);
    } catch {
      resolve(null);
    }
  });
}

/** Decode a File to a bitmap, honoring EXIF orientation; null on failure */
async function decodeImage(file: File): Promise<ImageBitmap | null> {
  if (typeof createImageBitmap === "function") {
    try {
      return await createImageBitmap(file, {
        imageOrientation: "from-image",
      });
    } catch {
      /* fall through to <img> decoding */
    }
  }
  try {
    const url = URL.createObjectURL(file);
    try {
      const img = new Image();
      img.decoding = "async";
      await new Promise<void>((resolve, reject) => {
        img.onload = () => resolve();
        img.onerror = () => reject(new Error("decode failed"));
        img.src = url;
      });
      return (await createImageBitmap(img)) as ImageBitmap;
    } finally {
      URL.revokeObjectURL(url);
    }
  } catch {
    return null;
  }
}

/**
 * Compress an image File in the browser. Returns a WebP File when the
 * browser can encode it (every modern browser since Safari 16.4), a JPEG
 * File otherwise, or the ORIGINAL File untouched whenever compression is
 * impossible or would not help. Never throws.
 */
export async function compressImageFile(
  file: File,
  opts: CompressOptions = {},
): Promise<File> {
  try {
    const { maxDim, quality } = { ...DEFAULTS, ...opts };
    // Non-images, passthrough types, tiny files and giganto safety rails
    if (!file.type.startsWith("image/") || PASSTHROUGH_TYPES.has(file.type)) {
      return file;
    }
    if (file.size <= 80 * 1024) return file; // already tiny — leave it
    const bitmap = await decodeImage(file);
    if (!bitmap) return file;
    try {
      const { width, height } = bitmap;
      const scale = Math.min(1, maxDim / Math.max(width, height));
      const w = Math.max(1, Math.round(width * scale));
      const h = Math.max(1, Math.round(height * scale));
      const canvas = document.createElement("canvas");
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext("2d");
      if (!ctx) return file;
      ctx.drawImage(bitmap, 0, 0, w, h);

      // WebP first (smallest); JPEG fallback for older Safari
      let blob = await canvasToBlob(canvas, "image/webp", quality);
      const outType = blob ? "image/webp" : "image/jpeg";
      if (!blob) {
        blob = await canvasToBlob(canvas, "image/jpeg", quality);
      }
      if (!blob || blob.size >= file.size) return file; // not worth it

      const ext = outType === "image/webp" ? ".webp" : ".jpg";
      const baseName = file.name.replace(/\.[^./\\]+$/, "");
      return new File([blob], `${baseName}${ext}`, {
        type: outType,
        lastModified: Date.now(),
      });
    } finally {
      bitmap.close?.();
    }
  } catch {
    // Absolute safety net: the caller's upload flow must never break
    return file;
  }
}
