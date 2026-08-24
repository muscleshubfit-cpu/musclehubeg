/**
 * Gemini Flash via OpenRouter — stage-specific AI model policy.
 *
 * Used by:
 *   - Stage 1 (Topic/Title) — blog-topics.ts pickSmartTopic()
 *
 * Policy (per AI MODEL REQUIREMENT):
 *   - Key source: OPENROUTER_API env var ONLY (NOT GEMINI_API_KEY, NOT AI_MODEL).
 *   - Models: Gemini Flash variants only (NO Pro).
 *   - Fallback chain: gemini-3.7-flash → gemini-3.6-flash → gemini-3.5-flash.
 *   - On model failure: automatically try next model.
 *   - On total failure (all 3 fail): throw clear error — NO fake results, NO empty fallback.
 *
 * Note: Stage 2 (Research) uses external-search.ts which already has its own
 * Gemini Flash fallback chain via Google's direct API (with Google Search
 * grounding). OpenRouter doesn't support Google Search grounding — the
 * `tools: [{ googleSearch: {} }]` parameter is a Google-specific feature.
 * So Research stage stays on Google's direct API for grounding support.
 *
 * For Stage 1 (Topic): no web search needed — just use the model's training
 * knowledge to pick a topic within the assigned content pillar.
 */

import type { CallAIOptions } from "@/lib/ai-provider";

const GEMINI_FLASH_BASE = [
  "google/gemini-3.7-flash",
  "google/gemini-3.6-flash",
  "google/gemini-3.5-flash",
] as const;

export async function callGeminiFlashViaOpenRouter(
  prompt: string,
  options: CallAIOptions = {},
): Promise<{ text: string; model: string }> {
  const apiKey = process.env.OPENROUTER_API || process.env.OPENROUTER_API_KEY || "";
  if (!apiKey) {
    throw new Error(
      "[openrouter-flash] OPENROUTER_API is not configured. " +
        "Topic stage requires the OPENROUTER_API env var. " +
        "Do NOT use GEMINI_API_KEY or AI_MODEL for this stage.",
    );
  }

  const baseUrl = "https://openrouter.ai/api/v1/chat/completions";
  const errors: string[] = [];

  for (const model of GEMINI_FLASH_BASE) {
    try {
      const body: Record<string, any> = {
        model,
        messages: [] as Array<{ role: string; content: string }>,
        temperature: options.temperature ?? 0.7,
        max_tokens: options.maxTokens ?? 4096,
      };

      if (options.systemPrompt) {
        body.messages.push({ role: "system", content: options.systemPrompt });
      }
      body.messages.push({ role: "user", content: prompt });

      if (options.jsonMode) {
        body.response_format = { type: "json_object" };
      }

      const controller = new AbortController();
      const timer = setTimeout(
        () => controller.abort(),
        options.timeoutMs ?? 60_000,
      );

      try {
        const res = await fetch(baseUrl, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${apiKey}`,
            "HTTP-Referer": "https://musclehubeg.vercel.app",
            "X-Title": "MuscleHub Blog Pipeline",
          },
          body: JSON.stringify(body),
          signal: controller.signal,
        });

        if (!res.ok) {
          const errText = await res.text().catch(() => "");
          throw new Error(`HTTP ${res.status}: ${errText.slice(0, 300)}`);
        }

        const data = await res.json();
        const msg = data?.choices?.[0]?.message;
        let content: string | undefined = msg?.content;

        if (!content && Array.isArray(msg?.reasoning_details)) {
          content = msg.reasoning_details
            .map((r: any) => (typeof r?.text === "string" ? r.text : ""))
            .filter(Boolean)
            .join("\n");
        }
        if (!content && typeof msg?.reasoning === "string") {
          content = msg.reasoning;
        }

        if (!content || !content.trim()) {
          throw new Error("empty response body");
        }

        return { text: content.trim(), model };
      } finally {
        clearTimeout(timer);
      }
    } catch (e: any) {
      const msg = e?.message || String(e);
      errors.push(`${model}: ${msg}`);
      console.warn(`[openrouter-flash] ${model} notice, trying next:`, msg);
    }
  }

  const finalError = new Error(
    `[openrouter-flash] All Gemini Flash models failed via OpenRouter.\n` +
      `Key source: OPENROUTER_API (verified: ${apiKey ? "present" : "MISSING"}).\n` +
      `Errors:\n  - ${errors.join("\n  - ")}\n` +
      `No fallback to GEMINI_API_KEY, AI_MODEL, or fake results.`,
  );
  console.error(finalError.message);
  throw finalError;
}
