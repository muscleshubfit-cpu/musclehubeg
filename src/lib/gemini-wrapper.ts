import { GoogleGenAI } from "@google/genai";
import { parseJSON } from "@/lib/ai-provider";

export async function callGemini(
  prompt: string,
  options: {
    systemPrompt?: string;
    temperature?: number;
    maxTokens?: number;
    jsonMode?: boolean;
    timeoutMs?: number;
  } = {}, ...args: any[]
): Promise<{ text: string; model: string }> {
  const apiKey = process.env.GEMINI_API_KEY || process.env.AI_API_KEY;
  if (!apiKey) throw new Error("GEMINI_API_KEY not configured");

  const ai = new GoogleGenAI({ apiKey });
  const model = "gemini-2.5-flash";

  const response = await ai.models.generateContent({
    model,
    contents: prompt,
    config: {
      systemInstruction: options.systemPrompt,
      temperature: options.temperature ?? 0.7,
      maxOutputTokens: options.maxTokens ?? 8192,
      responseMimeType: options.jsonMode ? "application/json" : "text/plain",
    }
  });

  if (!response.text) {
    throw new Error("Gemini returned empty response.");
  }

  return { text: response.text, model };
}
