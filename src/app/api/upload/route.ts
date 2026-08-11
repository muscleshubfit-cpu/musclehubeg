import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

/**
 * File upload endpoint — accepts a file via multipart/form-data and uploads
 * it to Supabase Storage. Returns the public URL.
 *
 * POST /api/upload
 * FormData:
 *   - file: File (required)
 *   - bucket: string (required, e.g. "questionnaire-photos", "progress-photos")
 *   - path: string (required, e.g. "{userId}/{timestamp}-{filename}")
 *
 * Returns: { url: string }
 *
 * Uses the service_role key (server-only) so we can write to any bucket
 * without RLS restrictions. The bucket must exist in Supabase Storage.
 *
 * If Supabase is not configured, returns 503 and the client falls back to
 * a base64 data URL.
 */
export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get("file") as File | null;
    const bucket = (formData.get("bucket") as string) || "questionnaire-photos";
    const path = formData.get("path") as string;

    if (!file) {
      return NextResponse.json({ error: "Missing 'file' field" }, { status: 400 });
    }
    if (!path) {
      return NextResponse.json({ error: "Missing 'path' field" }, { status: 400 });
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!supabaseUrl || !serviceKey) {
      return NextResponse.json(
        { error: "Supabase not configured — client should fall back to base64 data URL." },
        { status: 503 },
      );
    }

    // Use service_role client (server-only) so we can upload to any bucket
    // regardless of RLS policies.
    const supabase = createClient(supabaseUrl, serviceKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    // Convert the File to a Buffer for Supabase upload
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Determine content type
    const contentType = file.type || "application/octet-stream";

    // Upload to Supabase Storage
    const { data, error } = await supabase.storage
      .from(bucket)
      .upload(path, buffer, {
        contentType,
        upsert: false,
      });

    if (error) {
      console.error("[api/upload] Supabase upload error:", error);
      // If the bucket doesn't exist, try to create it (best-effort)
      if (error.message?.includes("not found") || error.message?.includes("Bucket")) {
        try {
          await supabase.storage.createBucket(bucket, { public: true });
          // Retry the upload
          const { data: retryData, error: retryError } = await supabase.storage
            .from(bucket)
            .upload(path, buffer, { contentType, upsert: false });
          if (retryError) throw retryError;
          const { data: pub } = supabase.storage.from(bucket).getPublicUrl(path);
          return NextResponse.json({ url: pub.publicUrl });
        } catch (createErr: any) {
          return NextResponse.json(
            { error: `Failed to create bucket: ${createErr.message}` },
            { status: 500 },
          );
        }
      }
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Get the public URL
    const { data: publicUrlData } = supabase.storage.from(bucket).getPublicUrl(path);
    return NextResponse.json({ url: publicUrlData.publicUrl });
  } catch (e: any) {
    console.error("[api/upload] Error:", e?.message || e);
    return NextResponse.json(
      { error: e?.message || "Failed to upload file" },
      { status: 500 },
    );
  }
}
