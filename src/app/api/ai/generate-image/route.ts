import { NextRequest, NextResponse } from "next/server";
import { requireCoach, isAuthConfigured } from "@/lib/auth-server";
import { GoogleGenAI } from "@google/genai";

export const maxDuration = 60;

export async function GET(request: NextRequest) {
  if (isAuthConfigured) {
    const auth = await requireCoach(request);
    if (auth instanceof Response) return auth;
  }

  const url = new URL(request.url);
  const prompt = url.searchParams.get("prompt");

  if (!prompt) {
    return NextResponse.json({ error: "Missing 'prompt' parameter" }, { status: 400 });
  }

  try {
    const apiKey = process.env.GEMINI_API_KEY || process.env.AI_API_KEY;
    if (!apiKey) {
      throw new Error("GEMINI_API_KEY not configured.");
    }

    const ai = new GoogleGenAI({ apiKey });
    
    // Generate image using Gemini Imagen model
    const response = await ai.models.generateImages({
      model: "imagen-3.0-generate-002",
      prompt: prompt,
      config: {
        numberOfImages: 1,
        outputMimeType: "image/png",
        aspectRatio: "1:1"
      }
    });

    const base64Image = response.generatedImages?.[0]?.image?.imageBytes;

    if (!base64Image) {
      return NextResponse.json({ error: "AI returned no image" }, { status: 500 });
    }

    const dataUrl = `data:image/png;base64,${base64Image}`;
    
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
