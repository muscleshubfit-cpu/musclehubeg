import { GoogleGenAI } from "@google/genai";
import { callAIWithFallback, parseJSON } from "@/lib/ai-provider";

export function getGeminiApiKey(): string {
  return (
    process.env.GEMINI_API_KEY ||
    process.env.GOOGLE_API_KEY ||
    process.env.GOOGLE_GENAI_API_KEY ||
    process.env.AI_API_KEY ||
    process.env.OPENROUTER_API ||
    ""
  );
}

export function createGeminiClient(apiKey?: string): GoogleGenAI | null {
  const key = apiKey || getGeminiApiKey();
  if (!key) return null;
  return new GoogleGenAI({
    apiKey: key,
    httpOptions: {
      headers: {
        "User-Agent": "aistudio-build",
      },
    },
  });
}

export async function callGemini(
  prompt: string,
  options: {
    systemPrompt?: string;
    temperature?: number;
    maxTokens?: number;
    jsonMode?: boolean;
    timeoutMs?: number;
  } = {},
  ..._args: any[]
): Promise<{ text: string; model: string }> {
  const geminiKey = getGeminiApiKey();

  // Try GoogleGenAI first whenever any valid Gemini key is present
  if (geminiKey && !geminiKey.startsWith("sk-or-") && !geminiKey.startsWith("gsk_")) {
    try {
      const ai = createGeminiClient(geminiKey);
      if (ai) {
        const geminiModels = ["gemini-3.7-flash", "gemini-3.6-flash", "gemini-flash-latest"];
        for (const model of geminiModels) {
          try {
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

            if (response.text && response.text.trim().length > 0) {
              return { text: response.text.trim(), model };
            }
          } catch (modelErr: any) {
            console.warn(`[gemini-wrapper] GoogleGenAI model ${model} notice:`, modelErr?.message || modelErr);
          }
        }
      }
    } catch (err: any) {
      console.warn("[gemini-wrapper] GoogleGenAI SDK notice, falling back:", err?.message || err);
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

export async function callGeminiJSON<T = any>(
  prompt: string,
  options: {
    systemPrompt?: string;
    temperature?: number;
    maxTokens?: number;
    timeoutMs?: number;
  } = {},
): Promise<{ data: T | null; model: string; rawText: string }> {
  const { text, model } = await callGemini(prompt, {
    ...options,
    jsonMode: true,
  });
  const data = parseJSON<T>(text);
  return { data, model, rawText: text };
}


