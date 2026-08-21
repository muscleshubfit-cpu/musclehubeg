import { GoogleGenAI } from "@google/genai";
import { callAIWithFallback } from "@/lib/ai-provider";

export async function callGemini(
  prompt: string,
  options: {
    systemPrompt?: string;
    temperature?: number;
    maxTokens?: number;
    jsonMode?: boolean;
    timeoutMs?: number;
  } = {},
  ...args: any[]
): Promise<{ text: string; model: string }> {
  const geminiKey =
    process.env.GEMINI_API_KEY ||
    process.env.GOOGLE_API_KEY ||
    process.env.GOOGLE_GENAI_API_KEY ||
    process.env.AI_API_KEY;

  if (geminiKey && geminiKey.startsWith("AIzaSy")) {
    try {
      const ai = new GoogleGenAI({ apiKey: geminiKey });
      const model = "gemini-2.5-flash";

      const response = await ai.models.generateContent({
        model,
        contents: prompt,
        config: {
          systemInstruction: options.systemPrompt,
          temperature: options.temperature ?? 0.7,
          maxOutputTokens: options.maxTokens ?? 8192,
          responseMimeType: options.jsonMode ? "application/json" : "text/plain",
        },
      });

      if (response.text) {
        return { text: response.text, model };
      }
    } catch (err: any) {
      console.warn("[gemini-wrapper] GoogleGenAI SDK notice, trying AI fallback:", err?.message || err);
    }
  } else if (geminiKey && !geminiKey.startsWith("sk-")) {
    try {
      const ai = new GoogleGenAI({ apiKey: geminiKey });
      const model = "gemini-2.5-flash";

      const response = await ai.models.generateContent({
        model,
        contents: prompt,
        config: {
          systemInstruction: options.systemPrompt,
          temperature: options.temperature ?? 0.7,
          maxOutputTokens: options.maxTokens ?? 8192,
          responseMimeType: options.jsonMode ? "application/json" : "text/plain",
        },
      });

      if (response.text) {
        return { text: response.text, model };
      }
    } catch (err: any) {
      console.warn("[gemini-wrapper] GoogleGenAI SDK notice, trying AI fallback:", err?.message || err);
    }
  }

  // Fallback to universal AI providers (OpenRouter, Groq, OpenAI, DeepSeek, Anthropic)
  try {
    const result = await callAIWithFallback(prompt, {
      systemPrompt: options.systemPrompt,
      temperature: options.temperature,
      maxTokens: options.maxTokens,
      jsonMode: options.jsonMode,
      timeoutMs: options.timeoutMs,
    });
    return { text: result.text, model: `${result.provider}:${result.model}` };
  } catch (fallbackErr: any) {
    console.error("[gemini-wrapper] All providers failed:", fallbackErr?.message);
    throw new Error(fallbackErr?.message || "AI generation failed");
  }
}

