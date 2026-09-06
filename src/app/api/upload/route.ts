import { NextRequest, NextResponse } from "next/server";
import { requireUser, authRequired, type AuthUser } from "@/lib/auth-server";
import { supabaseAdmin, isSupabaseAdminConfigured } from "@/lib/supabase/admin";
import { rateLimit } from "@/lib/rate-limit";

/**
 * POST /api/upload — generic authenticated file upload to Supabase Storage.
 *
 * OWNER AUDIT FIX (2026-08-28): QuestionnairesView's photo-upload button has
 * ALWAYS called this endpoint, but the route never existed — every upload
 * silently fell back to a multi-megabyte base64 data URL stored inside the
 * questionnaire JSONB. This route makes the button do what it was designed
 * to do: store the file in Supabase Storage and return a stable, renderable
 * URL (served through /api/file, see below, so PRIVATE buckets stay viewable
 * forever — no signed-URL expiry).
 *
 * Contract (matches the existing QuestionnairesView call site):
 *   FormData { file: File, bucket: string, path?: string }
 *   → 200 { url: string, path: string }
 *
 * Security:
 *   - requireUser (any logged-in member; coaches included)
 *   - bucket allowlist (no arbitrary-bucket writes)
 *   - the client-supplied `path` is IGNORED for trust: the storage path is
 *     rebuilt server-side under the caller's own user id (no cross-user
 *     writes, no path traversal).
 *   - type allowlist (image/* + pdf for receipts) and 5MB cap.
 *
 * The client keeps its data-URL fallback as a graceful safety net if
 * Storage is misconfigured (e.g. bucket not yet created).
 */

const ALLOWED_BUCKETS = new Set([
  "questionnaire-photos",
  "progress-photos",
  "receipts",
]);

const ALLOWED_MIME = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/heic",
  "image/heif",
  "application/pdf",
]);

const MAX_BYTES = 5 * 1024 * 1024; // mirrors the client-side 5MB guard

/* SECURITY HARDENING (audit H2, 2026-09-07):
 *   - per-user rate limit: 30 uploads / 10 min (Upstash when configured,
 *     in-memory fallback in demo mode)
 *   - per-user object cap: 200 objects under the caller's uid prefix in
 *     the target bucket (listing failure degrades open — never breaks a
 *     legit upload on a storage hiccup)
 *   - magic-byte sniffing: the declared MIME comes from the multipart
 *     header and is client-spoofable; the first 16 bytes must MATCH the
 *     declared family before the upload is trusted. */
const UPLOAD_RATE_MAX = 30;
const UPLOAD_RATE_WINDOW = 10 * 60 * 1000;
const USER_OBJECT_CAP = 200;

async function sniffMimeFamily(file: File): Promise<"image" | "pdf" | null> {
  let head: Uint8Array;
  try {
    head = new Uint8Array(await file.slice(0, 16).arrayBuffer());
  } catch {
    return null;
  }
  const starts = (sig: number[]) => sig.every((b, i) => head[i] === b);
  const ascii = (i: number, s: string) =>
    s.split("").every((c, j) => head[i + j] === c.charCodeAt(0));
  if (starts([0xff, 0xd8, 0xff])) return "image"; // JPEG
  if (starts([0x89, 0x50, 0x4e, 0x47])) return "image"; // PNG
  if (starts([0x25, 0x50, 0x44, 0x46])) return "pdf"; // %PDF
  if (ascii(0, "RIFF") && ascii(8, "WEBP")) return "image"; // WEBP
  if (ascii(4, "ftyp")) return "image"; // HEIC/HEIF container
  return null;
}

export async function POST(request: NextRequest) {
  let user: AuthUser | null = null;
  if (authRequired) {
    const auth = await requireUser(request);
    if (auth instanceof Response) return auth;
    user = auth;
  }

  if (!isSupabaseAdminConfigured || !supabaseAdmin) {
    return NextResponse.json(
      { error: "Server not configured (set SUPABASE_SERVICE_ROLE_KEY)" },
      { status: 500 },
    );
  }

  // Per-user upload rate limit (H2) — authenticated members only; the
  // anonymous path is unreachable in production (authRequired forces a
  // session whenever the service key exists) and demo mode has no storage.
  if (user) {
    const rl = await rateLimit(`upload:${user.id}`, UPLOAD_RATE_MAX, UPLOAD_RATE_WINDOW);
    if (!rl.allowed) {
      return NextResponse.json(
        { error: "Too many uploads — try again later" },
        { status: 429, headers: { "Retry-After": String(Math.max(1, Math.ceil((rl.resetAt - Date.now()) / 1000))) } },
      );
    }
  }

  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return NextResponse.json({ error: "Expected multipart/form-data" }, { status: 400 });
  }

  const file = form.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "Missing file" }, { status: 400 });
  }
  if (file.size > MAX_BYTES) {
    return NextResponse.json({ error: "File too large (max 5MB)" }, { status: 413 });
  }
  const mime = (file.type || "application/octet-stream").toLowerCase();
  if (!ALLOWED_MIME.has(mime)) {
    return NextResponse.json(
      { error: `Unsupported file type: ${mime}` },
      { status: 415 },
    );
  }
  // Magic-byte verification (H2): the declared MIME family must match
  // the actual file signature — blocks polyglots and mislabeled payloads.
  const sniffed = await sniffMimeFamily(file);
  const declaredFamily = mime === "application/pdf" ? "pdf" : "image";
  if (sniffed === null || sniffed !== declaredFamily) {
    return NextResponse.json(
      { error: "File content does not match its declared type" },
      { status: 415 },
    );
  }

  const bucket = String(form.get("bucket") || "");
  if (!ALLOWED_BUCKETS.has(bucket)) {
    return NextResponse.json({ error: "Unknown bucket" }, { status: 400 });
  }

  // Storage path is rebuilt server-side: <userId>/<ts>-<sanitizedName>.
  // The client hint is used ONLY for the filename tail.
  const ownerId = user?.id || "anon";
  const rawName = file.name || "upload";
  const safeName =
    rawName
      .normalize("NFKD")
      .replace(/[^\w.\-]+/g, "-")
      .replace(/-+/g, "-")
      .replace(/^[-.]+|[-]+$/g, "")
      .slice(-80) || "upload";
  const storagePath = `${ownerId}/${Date.now()}-${safeName}`;

  // Per-user object cap (H2): bound the total objects a single member
  // can park in one bucket. Listing failure degrades open (never breaks
  // a legitimate upload on a transient storage error).
  if (user && ownerId !== "anon") {
    try {
      const { data: existing } = await supabaseAdmin.storage
        .from(bucket)
        .list(ownerId, { limit: USER_OBJECT_CAP + 1 });
      if (Array.isArray(existing) && existing.length > USER_OBJECT_CAP) {
        return NextResponse.json(
          { error: "Storage quota exceeded — delete old files first" },
          { status: 429 },
        );
      }
    } catch {
      // listing hiccup → proceed (rate limit + size cap still bound abuse)
    }
  }

  const { error: upErr } = await supabaseAdmin.storage
    .from(bucket)
    .upload(storagePath, file, { contentType: mime, upsert: false });

  if (upErr) {
    console.error("[api/upload] Storage upload failed:", upErr.message);
    return NextResponse.json(
      { error: `Upload failed: ${upErr.message}` },
      { status: 500 },
    );
  }

  // Permanent, same-origin render URL — /api/file authorizes on demand and
  // streams the object, so private buckets need no signed-URL expiry dance.
  const url = `/api/file?bucket=${encodeURIComponent(bucket)}&path=${encodeURIComponent(storagePath)}`;
  return NextResponse.json({ url, path: storagePath });
}
