import { NextRequest, NextResponse } from "next/server";

/**
 * AI Image Generation endpoint — generates an image from a text prompt
 * using the z-ai-web-dev-sdk (free, no external API key needed).
 *
 * GET /api/ai/generate-image?prompt=...
 *
 * Returns: { url: string } — a data URL (base64-encoded PNG) that can be
 * used directly in <img src="..."> or saved to Supabase Storage.
 *
 * Used as a fallback for blog featured images when no stock photo matches.
 */
export const maxDuration = 60;

export async function GET(request: NextRequest) {
  const url = new URL(request.url);
  const prompt = url.searchParams.get("prompt");

  if (!prompt) {
    return NextResponse.json({ error: "Missing 'prompt' parameter" }, { status: 400 });
  }

  try {
    // Ensure the .z-ai-config file exists on Vercel
    const fs = await import("fs");
    const path = await import("path");
    const configPath = path.join(process.cwd(), ".z-ai-config");
    if (!fs.existsSync(configPath)) {
      const config = {
        baseUrl: process.env.ZAI_BASE_URL || "https://internal-api.z.ai/v1",
        apiKey: process.env.ZAI_API_KEY || "Z.ai",
        chatId: process.env.ZAI_CHAT_ID || "",
        token: process.env.ZAI_TOKEN || "",
        userId: process.env.ZAI_USER_ID || "",
      };
      try { fs.writeFileSync(configPath, JSON.stringify(config)); } catch {}
    }

    const ZAI = (await import("z-ai-web-dev-sdk")).default;
    const zai = await ZAI.create();

    const response = await zai.images.generations.create({
      prompt: prompt,
      size: "1024x1024",
    });

    const imageBase64 = response.data[0]?.base64;
    if (!imageBase64) {
      return NextResponse.json({ error: "AI returned no image" }, { status: 500 });
    }

    // Return as a data URL (base64-encoded PNG) — can be used directly in <img src>
    const dataUrl = `data:image/png;base64,${imageBase64}`;

    return NextResponse.json({
      url: dataUrl,
      prompt: prompt,
      source: "ai-generated",
    });
  } catch (e: any) {
    console.error("[api/ai/generate-image] Error:", e?.message || e);
    return NextResponse.json(
      { error: e?.message || "Failed to generate image" },
      { status: 500 },
    );
  }
}
