/**
 * Google Gemini AI client.
 * Uses the Gemini API to generate plans and chat responses.
 * Falls back to local rule-based AI if Gemini is not configured or fails.
 */

const GEMINI_API_KEY = process.env.GEMINI_API_KEY || "";
const GEMINI_MODEL = "gemini-2.0-flash";
const GEMINI_URL = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${GEMINI_API_KEY}`;

export const isGeminiConfigured = Boolean(GEMINI_API_KEY);

type GeminiPart = { text: string };
type GeminiContent = { parts: GeminiPart[]; role?: string };

export async function geminiGenerate(prompt: string, systemInstruction?: string): Promise<string> {
  if (!isGeminiConfigured) {
    throw new Error("Gemini API key not configured");
  }

  const contents: GeminiContent[] = [
    { parts: [{ text: prompt }] },
  ];

  const body: any = {
    contents,
    generationConfig: {
      temperature: 0.7,
      maxOutputTokens: 8192,
      responseMimeType: "application/json",
    },
  };

  if (systemInstruction) {
    body.systemInstruction = { parts: [{ text: systemInstruction }] };
  }

  const res = await fetch(GEMINI_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`Gemini API error ${res.status}: ${text.slice(0, 300)}`);
  }

  const data = await res.json();
  const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!text) throw new Error("Gemini returned empty response");
  return text.trim();
}

export async function geminiChat(messages: Array<{ role: string; content: string }>, systemInstruction: string): Promise<string> {
  if (!isGeminiConfigured) {
    throw new Error("Gemini API key not configured");
  }

  const contents: GeminiContent[] = messages.map((m) => ({
    role: m.role === "assistant" ? "model" : "user",
    parts: [{ text: m.content }],
  }));

  const body: any = {
    contents,
    systemInstruction: { parts: [{ text: systemInstruction }] },
    generationConfig: {
      temperature: 0.6,
      maxOutputTokens: 2048,
    },
  };

  const res = await fetch(GEMINI_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`Gemini API error ${res.status}: ${text.slice(0, 300)}`);
  }

  const data = await res.json();
  const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!text) throw new Error("Gemini returned empty response");
  return text.trim();
}

/** Parse JSON from Gemini response (handles markdown fences) */
export function parseJsonResponse(text: string): any | null {
  if (!text) return null;
  let cleaned = text.trim();
  const fenceMatch = cleaned.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (fenceMatch) cleaned = fenceMatch[1].trim();
  const firstBrace = cleaned.indexOf("{");
  const lastBrace = cleaned.lastIndexOf("}");
  if (firstBrace === -1 || lastBrace === -1 || lastBrace < firstBrace) return null;
  cleaned = cleaned.slice(firstBrace, lastBrace + 1);
  try {
    return JSON.parse(cleaned);
  } catch {
    return null;
  }
}
