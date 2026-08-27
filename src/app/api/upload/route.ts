import { NextRequest, NextResponse } from "next/server";
import { requireUser, isAuthConfigured, type AuthUser } from "@/lib/auth-server";
import { supabaseAdmin, isSupabaseAdminConfigured } from "@/lib/supabase/admin";

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

export async function POST(request: NextRequest) {
  let user: AuthUser | null = null;
  if (isAuthConfigured) {
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
