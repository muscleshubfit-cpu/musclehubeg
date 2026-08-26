import { NextRequest, NextResponse } from "next/server";
import { requireCoach, isAuthConfigured } from "@/lib/auth-server";
import { generateImagePublic } from "@/lib/blog-images";

export const maxDuration = 60;

/**
 * Generate an AI image for a blog article (coach-only).
 *
 * OWNER DIRECTIVE (2026-08-27): all AI calls must go through OpenRouter /
 * Groq. Google Imagen 3 (native Gemini SDK) was removed — image generation
 * now uses the shared Pollinations pipeline in src/lib/blog-images.ts
 * (flux → turbo attempts), which is a plain CDN endpoint and not a Gemini
 * API call.
 *
 * M58 fix retained: POST only — prompt never appears in URLs (PII-safe).
 */
export async function POST(request: NextRequest) {
  if (isAuthConfigured) {
    const auth = await requireCoach(request);
    if (auth instanceof Response) return auth;
  }

  const body = await request.json().catch(() => ({}));
  const { prompt } = body;

  if (!prompt) {
    return NextResponse.json({ error: "Missing 'prompt' parameter" }, { status: 400 });
  }

  try {
    const result = await generateImagePublic(prompt);
    if (result) {
      return NextResponse.json({
        url: result.url,
        prompt,
        source: result.source,
      });
    }
  } catch (e: any) {
    console.error("[api/ai/generate-image] error:", e?.message || e);
  }

  return NextResponse.json(
    { error: "Failed to generate AI image" },
    { status: 500 },
  );
}
