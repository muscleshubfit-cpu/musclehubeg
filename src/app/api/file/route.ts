import { NextRequest, NextResponse } from "next/server";
import { requireUser, isAuthConfigured, type AuthUser } from "@/lib/auth-server";
import { supabaseAdmin, isSupabaseAdminConfigured } from "@/lib/supabase/admin";

/**
 * GET /api/file?bucket=…&path=… — authenticated Storage read proxy.
 *
 * Companion to POST /api/upload: objects in PRIVATE buckets (the buckets in
 * this app are private — see progress-photos signed-URL usage) cannot be
 * rendered by a plain <img src> forever, and signed URLs expire. Uploads
 * therefore store a permanent same-origin /api/file URL, and THIS route
 * authorizes + streams the bytes on every request.
 *
 * Authorization model:
 *   - any logged-in user may read an object that lives under THEIR OWN
 *     `<userId>/` prefix (their questionnaire photos, progress photos,
 *     receipts);
 *   - coaches may read any object in the allowlisted buckets (they review
 *     client questionnaires and payment receipts);
 *   - everyone else → 403. Anonymous → 401.
 *
 * Responses are streamed with `Cache-Control: private, max-age=300` so
 * repeat views inside a coaching session are cheap without leaking objects
 * into shared caches.
 */

const ALLOWED_BUCKETS = new Set([
  "questionnaire-photos",
  "progress-photos",
  "receipts",
]);

export async function GET(request: NextRequest) {
  let user: AuthUser | null = null;
  if (isAuthConfigured) {
    const auth = await requireUser(request);
    if (auth instanceof Response) return auth;
    user = auth;
  }

  if (!isSupabaseAdminConfigured || !supabaseAdmin) {
    return NextResponse.json({ error: "Server not configured" }, { status: 500 });
  }

  const { searchParams } = new URL(request.url);
  const bucket = searchParams.get("bucket") || "";
  const path = searchParams.get("path") || "";

  if (!ALLOWED_BUCKETS.has(bucket)) {
    return NextResponse.json({ error: "Unknown bucket" }, { status: 400 });
  }
  if (!path || path.includes("..")) {
    return NextResponse.json({ error: "Bad path" }, { status: 400 });
  }

  const isOwner = Boolean(user && user.id && path.startsWith(`${user.id}/`));
  // Staff (coach | admin) can read any client file (owner-or-coach rule).
  const isCoach = user?.role !== "client";
  if (!isOwner && !isCoach) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { data, error } = await supabaseAdmin.storage.from(bucket).download(path);
  if (error || !data) {
    console.error("[api/file] download failed:", error?.message);
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const buf = await data.arrayBuffer();
  const type =
    data.type && data.type !== "application/octet-stream"
      ? data.type
      : guessType(path);

  return new NextResponse(buf, {
    status: 200,
    headers: {
      "Content-Type": type,
      "Content-Length": String(buf.byteLength),
      "Cache-Control": "private, max-age=300",
      "X-Content-Type-Options": "nosniff",
    },
  });
}

function guessType(path: string): string {
  const ext = path.split(".").pop()?.toLowerCase();
  switch (ext) {
    case "jpg":
    case "jpeg":
      return "image/jpeg";
    case "png":
      return "image/png";
    case "webp":
      return "image/webp";
    case "heic":
      return "image/heic";
    case "heif":
      return "image/heif";
    case "pdf":
      return "application/pdf";
    default:
      return "application/octet-stream";
  }
}
