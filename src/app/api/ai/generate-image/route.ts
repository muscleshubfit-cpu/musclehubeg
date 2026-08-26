import { NextRequest, NextResponse } from "next/server";
import { requireCoach, isAuthConfigured } from "@/lib/auth-server";
import { GoogleGenAI } from "@google/genai";
import { getGeminiApiKey } from "@/lib/gemini-wrapper";

export const maxDuration = 60;

// M58 fix: changed from GET to POST — prompt was in the URL (logged in
// Vercel access logs, may contain PII if coach pastes a client's name).
export async function POST(request: NextRequest) {
  if (isAuthConfigured) {
    const auth = await requireCoach(request);
    if (auth instanceof Response) return auth;
  }

  const body = await request.json().catch(() => ({}));
  const { prompt, aspectRatio = "16:9" } = body;

  if (!prompt) {
    return NextResponse.json({ error: "Missing 'prompt' parameter" }, { status: 400 });
  }

  // 1. Primary: Fast Pollinations AI CDN image generation (instant light URL)
  try {
    const encodedPrompt = encodeURIComponent(prompt);
    const seed = Math.floor(Math.random() * 100000);
    const pollinationsUrl = `https://image.pollinations.ai/prompt/${encodedPrompt}?width=1024&height=576&nologo=true&seed=${seed}&model=flux`;
    const res = await fetch(pollinationsUrl, { signal: AbortSignal.timeout(10_000) });
    if (res.ok) {
      return NextResponse.json({
        url: pollinationsUrl,
        prompt,
        source: "pollinations-ai",
      });
    }
  } catch (pErr: any) {
    console.warn("[api/ai/generate-image] Pollinations notice, trying Imagen fallback:", pErr?.message || pErr);
  }

  // 2. Secondary: Google Gemini Imagen 3
  try {
    const apiKey = getGeminiApiKey();
    if (apiKey) {
      const ai = new GoogleGenAI({ apiKey });
      const response = await ai.models.generateImages({
        model: "imagen-3.0-generate-002",
        prompt: prompt,
        config: {
          numberOfImages: 1,
          outputMimeType: "image/png",
          aspectRatio: aspectRatio as any,
        },
      });

      const base64Image = response.generatedImages?.[0]?.image?.imageBytes;
      if (base64Image) {
        return NextResponse.json({
          url: `data:image/png;base64,${base64Image}`,
          prompt,
          source: "imagen-3",
        });
      }
    }
  } catch (e: any) {
    console.warn("[api/ai/generate-image] Imagen error:", e?.message || e);
  }

  return NextResponse.json(
    { error: "Failed to generate AI image" },
    { status: 500 },
  );
}
