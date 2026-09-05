/**
 * Universal AI Provider — OpenAI-compatible client.
 *
 * OWNER DIRECTIVE (2026-08-27): the platform uses EXACTLY TWO AI providers:
 *   1. openrouter (default) → https://openrouter.ai/api/v1   (env: OPENROUTER_API)
 *   2. groq                → https://api.groq.com/openai/v1  (env: GROQ_API_KEY)
 *
 * All previous direct-provider integrations (Gemini SDK / OpenAI /
 * Anthropic / DeepSeek) were removed. Any model that is reachable via
 * OpenRouter or Groq (including Google's Gemini family through OpenRouter
 * `google/*` slugs) must go through THIS file.
 *
 * All providers expose the OpenAI Chat Completions API shape:
 * POST {base_url}/chat/completions
 * body: { model, messages, temperature, max_tokens, response_format }
 *
 * Resolution order (highest priority first):
 * 1. Runtime override (sent inline by the API caller via mergeOverride())
 * 2. Process.env (OPENROUTER_API || OPENROUTER_API_KEY / GROQ_API_KEY)
 *
 * Vercel Hobby budget guarantee: callFreeAIFallbackChain() clamps its own
 * per-model timeout so that maxModels × timeoutMs never exceeds ~52s,
 * keeping every single serverless request safely under the 60s cap.
 *
 * This file MUST be server-only — it never exposes API keys to the client.
 */

export type AIProvider = "openrouter" | "groq";

/**
 * Canonical env-var reader for the two allowed providers.
 * OPENROUTER_API_KEY is accepted as a documented alias of OPENROUTER_API
 * (older docs used it) so both spellings always work.
 */
export function getOpenRouterKey(): string {
  return process.env.OPENROUTER_API || process.env.OPENROUTER_API_KEY || "";
}

/**
 * DUAL-KEY POOL (2026-08-27 owner addition): owner supplied TWO OpenRouter
 * accounts after hitting the free tier's ~50 requests/day ceiling.
 * OPENROUTER_API = account #2, OPENROUTER_API_KEY = account #1.
 * The fallback chain rotates across every configured key so the daily
 * budget effectively doubles before any single account is exhausted,
 * and a key that returns auth/quota errors is bypassed automatically.
 */
export function getOpenRouterKeys(): string[] {
  const raw = [process.env.OPENROUTER_API, process.env.OPENROUTER_API_KEY];
  const keys = raw.filter((k): k is string => typeof k === "string" && k.trim().length > 0);
  return [...new Set(keys)];
}

export function getGroqKey(): string {
  return process.env.GROQ_API_KEY || "";
}

export const AI_PROVIDERS: Record<
  AIProvider,
  {
    label: string;
    baseUrl: string;
    defaultModel: string;
    envKey: string;
    docsUrl: string;
    keyPrefix: string;
  }
> = {
  openrouter: {
    label: "OpenRouter",
    baseUrl: "https://openrouter.ai/api/v1",
    defaultModel: "nvidia/nemotron-3.5-lightning:free",
    envKey: "OPENROUTER_API",
    docsUrl: "https://openrouter.ai/keys",
    keyPrefix: "sk-or-",
  },
  groq: {
    label: "Groq (ultra-fast)",
    baseUrl: "https://api.groq.com/openai/v1",
    defaultModel: "openai/gpt-oss-120b",
    envKey: "GROQ_API_KEY",
    docsUrl: "https://console.groq.com/keys",
    keyPrefix: "gsk_",
  },
};

export type AIConfig = {
  provider: AIProvider;
  apiKey: string;
  model: string;
  baseUrl: string;
};

export type AIConfigStatus = {
  provider: AIProvider;
  model: string;
  baseUrl: string;
  isConfigured: boolean;
  source: "env" | "override" | "none";
  maskedKey: string | null;
};

/**
 * Resolve the active AI config from env vars (default source).
 * Override configs (from cookies/inline) are merged by callers via
 * `mergeOverride` below.
 *
 * Only the two allowed providers (openrouter | groq) are returned.
 * AI_PROVIDER values outside that set are ignored (default wins).
 */
export function getEnvConfig(): AIConfig | null {
  const requested = (process.env.AI_PROVIDER as AIProvider) || "openrouter";
  const provider: AIProvider =
    requested === "groq" || requested === "openrouter" ? requested : "openrouter";
  const meta = AI_PROVIDERS[provider];

  const openrouterKey = getOpenRouterKey();
  const groqKey = getGroqKey();

  // Resolve the key for the chosen provider; if it's missing but the OTHER
  // provider has a key, transparently fall through to that provider.
  let apiKey = provider === "openrouter" ? openrouterKey : groqKey;
  let resolvedProvider = provider;
  if (!apiKey) {
    if (provider === "openrouter" && groqKey) {
      resolvedProvider = "groq";
      apiKey = groqKey;
    } else if (provider === "groq" && openrouterKey) {
      resolvedProvider = "openrouter";
      apiKey = openrouterKey;
    }
  }

  if (!apiKey) return null;

  const meta2 = AI_PROVIDERS[resolvedProvider];
  return {
    provider: resolvedProvider,
    apiKey,
    model: process.env.AI_MODEL || meta2.defaultModel,
    baseUrl: process.env.AI_BASE_URL || meta2.baseUrl,
  };
}

/**
 * Merge an optional override (from the AI Settings page) on top of the env
 * config. The override always wins when present.
 */
export function mergeOverride(
  override?: Partial<AIConfig> | null,
): AIConfig | null {
  const env = getEnvConfig();
  if (!override && !env) return null;
  if (!override) return env;

  const provider =
    (override.provider as AIProvider) || env?.provider || "openrouter";
  const meta = AI_PROVIDERS[provider] || AI_PROVIDERS.openrouter;

  return {
    provider,
    apiKey: override.apiKey || env?.apiKey || "",
    model: override.model || env?.model || meta.defaultModel,
    baseUrl: override.baseUrl || env?.baseUrl || meta.baseUrl,
  };
}

/**
 * Mask a key for display: show prefix + last 4 chars.
 */
export function maskKey(key: string): string | null {
  if (!key) return null;
  if (key.length <= 8) return "****";
  return `${key.slice(0, 4)}…${key.slice(-4)}`;
}

/**
 * Get the current status (for the AI Settings page) — never returns the raw key.
 */
export function getStatus(override?: Partial<AIConfig> | null): AIConfigStatus {
  const cfg = mergeOverride(override);
  if (!cfg || !cfg.apiKey) {
    const provider = (process.env.AI_PROVIDER as AIProvider) || "openrouter";
    const meta = AI_PROVIDERS[provider] || AI_PROVIDERS.openrouter;
    return {
      provider,
      model: meta.defaultModel,
      baseUrl: meta.baseUrl,
      isConfigured: false,
      source: "none",
      maskedKey: null,
    };
  }
  return {
    provider: cfg.provider,
    model: cfg.model,
    baseUrl: cfg.baseUrl,
    isConfigured: true,
    source: override?.apiKey ? "override" : "env",
    maskedKey: maskKey(cfg.apiKey),
  };
}

export type CallAIOptions = {
  systemPrompt?: string;
  temperature?: number;
  maxTokens?: number;
  jsonMode?: boolean;
  timeoutMs?: number;
};

/**
 * Core: call any OpenAI-compatible chat completion endpoint.
 * Returns the assistant message text.
 *
 * Provider-specific notes:
 * - Anthropic's OpenAI-compat shim doesn't support response_format — we
 * skip it and rely on prompt-based JSON instructions.
 * - Gemini's OpenAI-compat shim accepts response_format but sometimes
 * returns 400 — same approach (skip it, use prompt instructions).
 * - Some reasoning models (gpt-oss, gemini-2.5-flash-thinking) return
 * empty `content` and put the actual text in `reasoning_details` /
 * `reasoning`. We fall back to those if `content` is empty.
 */
export async function callAI(
  prompt: string,
  options: CallAIOptions = {},
  configOverride?: Partial<AIConfig> | null,
): Promise<string> {
  const cfg = mergeOverride(configOverride);
  if (!cfg || !cfg.apiKey) {
    throw new Error(
      "AI provider not configured. Set OPENROUTER_API in your environment variables.",
    );
  }

  const messages: Array<{ role: string; content: string }> = [];
  if (options.systemPrompt) {
    messages.push({ role: "system", content: options.systemPrompt });
  }
  messages.push({ role: "user", content: prompt });

  const body: Record<string, unknown> = {
    model: cfg.model,
    messages,
    temperature: options.temperature ?? 0.7,
    max_tokens: options.maxTokens ?? 4096,
  };

  // Both allowed providers (OpenRouter + Groq) support response_format
  // json_object mode reliably.
  if (options.jsonMode) {
    body.response_format = { type: "json_object" };
  }

  const controller = new AbortController();
  const timeoutMs = options.timeoutMs ?? 60_000;
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const res = await fetch(`${cfg.baseUrl}/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${cfg.apiKey}`,
        // OpenRouter recommends these optional headers for attribution.
        ...(cfg.provider === "openrouter"
          ? {
              "HTTP-Referer": "https://alkemos.com",
              "X-Title": "Musclehubeg Blog CMS",
            }
          : {}),
      },
      body: JSON.stringify(body),
      signal: controller.signal,
    });

    if (!res.ok) {
      const text = await res.text().catch(() => "");
      throw new Error(
        `AI API error ${res.status} from ${cfg.provider}: ${text.slice(0, 500)}`,
      );
    }

    // Typed view of the OpenAI-compatible chat-completions response (only
    // the fields we consume — reasoning-model extras included).
    const data = (await res.json()) as {
      choices?: Array<{
        message?: {
          content?: string | null;
          reasoning?: string | null;
          reasoning_details?: Array<{ text?: unknown } | null> | null;
        } | null;
      }> | null;
    } | null;
    const msg = data?.choices?.[0]?.message;
    // Prefer `content`; fall back to `reasoning` / `reasoning_details` for
    // reasoning models (gpt-oss, gemini-thinking) that hide output there.
    let content: string | undefined = msg?.content ?? undefined;
    if (!content && Array.isArray(msg?.reasoning_details)) {
      content = msg.reasoning_details
        .map((r) => (typeof r?.text === "string" ? r.text : ""))
        .filter(Boolean)
        .join("\n");
    }
    if (!content && typeof msg?.reasoning === "string") {
      content = msg.reasoning;
    }
    if (!content) {
      throw new Error(`AI provider ${cfg.provider} returned an empty response`);
    }
    return content.trim();
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Call AI with an EXPLICIT single-provider config — NO hidden cross-provider
 * fallback. (2026-08-27 hardening: the previous silent "try the other
 * provider" stage made the chain mislabel WHICH provider/model actually
 * answered and swallowed quota errors, so the chain's own model ladder AND
 * the new dual-key switch inside `callFreeAIFallbackChain` could never fire.
 * The chain + race now own ALL fallback policy; this helper is exact.)
 */
export async function callAIWithFallback(
  prompt: string,
  options: CallAIOptions = {},
  configOverride?: Partial<AIConfig> | null,
): Promise<{ text: string; provider: AIProvider; model: string }> {
  const cfg = mergeOverride(configOverride);
  if (!cfg || !cfg.apiKey) {
    throw new Error("callAIWithFallback: no provider config/apiKey given");
  }
  const text = await callAI(prompt, options, configOverride);
  return { text, provider: cfg.provider, model: cfg.model };
}

/**
 * Phase 89 — streaming variant of callAI for a single explicit provider
 * config. Opens the request with stream:true and forwards raw content
 * deltas to onDelta as they arrive (OpenAI-compatible SSE). Returns the
 * FULL accumulated text.
 *
 * Reasoning deltas (gpt-oss etc.) are buffered silently and used only if
 * NO content deltas ever arrive — mirroring callAI's content→reasoning
 * fallback — so users never see thinking garbage live.
 *
 * Failure semantics (the chain's streaming contract):
 * - request-level failures (HTTP error, timeout, network) throw BEFORE
 *   any delta → the chain silently falls back to the next model.
 * - mid-stream failures (after ≥1 delta was forwarded) throw with the
 *   stream already consumed — the chain aborts (see callFreeAIFallbackChain).
 */
export async function callAIStream(
  prompt: string,
  options: CallAIOptions = {},
  configOverride?: Partial<AIConfig> | null,
  onDelta?: (chunk: string) => void,
): Promise<string> {
  const cfg = mergeOverride(configOverride);
  if (!cfg || !cfg.apiKey) {
    throw new Error("callAIStream: no provider config/apiKey given");
  }

  const messages: Array<{ role: string; content: string }> = [];
  if (options.systemPrompt) {
    messages.push({ role: "system", content: options.systemPrompt });
  }
  messages.push({ role: "user", content: prompt });

  const body = {
    model: cfg.model,
    messages,
    temperature: options.temperature ?? 0.7,
    max_tokens: options.maxTokens ?? 4096,
    stream: true,
  };

  const controller = new AbortController();
  const timeoutMs = options.timeoutMs ?? 60_000;
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const res = await fetch(`${cfg.baseUrl}/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${cfg.apiKey}`,
        ...(cfg.provider === "openrouter"
          ? {
              "HTTP-Referer": "https://alkemos.com",
              "X-Title": "Musclehubeg EVO Chat",
            }
          : {}),
      },
      body: JSON.stringify(body),
      signal: controller.signal,
    });

    if (!res.ok) {
      const text = await res.text().catch(() => "");
      throw new Error(
        `AI API error ${res.status} from ${cfg.provider}: ${text.slice(0, 500)}`,
      );
    }
    if (!res.body) {
      throw new Error(`AI provider ${cfg.provider} returned no stream body`);
    }

    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";
    let full = "";
    let reasoning = "";

    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });

      let nlIdx: number;
      while ((nlIdx = buffer.indexOf("\n")) !== -1) {
        const line = buffer.slice(0, nlIdx).trim();
        buffer = buffer.slice(nlIdx + 1);
        if (!line || line.startsWith(":")) continue; // SSE comment / keep-alive
        if (!line.startsWith("data:")) continue;
        const payload = line.slice(5).trim();
        if (payload === "[DONE]") continue;
        try {
          const evt = JSON.parse(payload);
          const delta = evt?.choices?.[0]?.delta;
          if (typeof delta?.content === "string" && delta.content.length > 0) {
            full += delta.content;
            onDelta?.(delta.content);
          } else if (typeof delta?.reasoning === "string") {
            // reasoning models — buffered silently, never streamed to users
            reasoning += delta.reasoning;
          }
        } catch {
          // malformed SSE line — skip
        }
      }
    }

    const text = (full || reasoning).trim();
    if (!text) {
      throw new Error(`AI provider ${cfg.provider} returned an empty stream`);
    }
    return text;
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Test that the configured provider responds. Returns a short sample message
 * on success, or throws on failure.
 */
export async function testConnection(
  override?: Partial<AIConfig> | null,
): Promise<{ ok: true; sample: string; provider: AIProvider; model: string }> {
  const sample = await callAI(
    "Reply with the single word: PONG",
    { temperature: 0, maxTokens: 10, timeoutMs: 15_000 },
    override,
  );
  const cfg = mergeOverride(override)!;
  return { ok: true, sample, provider: cfg.provider, model: cfg.model };
}

/**
 * Parse a JSON response from any LLM. Handles:
 * - Plain JSON
 * - ```json fenced blocks
 * - JSON embedded inside surrounding prose (extracts the outermost {…} or […])
 * - Truncated JSON (auto-closes any open {/[/") — useful when the LLM hits
 * max_tokens mid-response and we want to salvage as much as possible.
 */
export function parseJSON<T = unknown>(text: string): T | null {
  if (!text) return null;
  let cleaned = text.trim();

  // Strip ```json … ``` or ``` … ``` fences.
  const fence = cleaned.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (fence) cleaned = fence[1].trim();

  // Find the outermost {…} or […].
  const open = cleaned.search(/[{[]/);
  if (open === -1) return null;
  const openChar = cleaned[open];
  const closeChar = openChar === "{" ? "}" : "]";

  // First try strict parsing of the slice between the first opener and the
  // last closer — this is the happy path.
  const close = cleaned.lastIndexOf(closeChar);
  if (close !== -1 && close > open) {
    const slice = cleaned.slice(open, close + 1);
    try {
      return JSON.parse(slice) as T;
    } catch {
      // fall through to truncation repair
    }
  }

  // Truncation repair: take everything from the first opener to the end of
  // the response, then balance the brackets/braces/quotes.
  const partial = cleaned.slice(open);
  let repaired = repairTruncatedJSON(partial);
  // Strip trailing commas inside objects/arrays: {"a":1,} → {"a":1}
  repaired = repaired.replace(/,\s*([\]}])/g, "$1");
  try {
    return JSON.parse(repaired) as T;
  } catch {
    return null;
  }
}

/**
 * Best-effort repair of truncated JSON. Closes open strings, objects, and
 * arrays. Doesn't handle every edge case (e.g. trailing commas after the
 * last complete value), but recovers most of the structured data.
 */
function repairTruncatedJSON(s: string): string {
  let inString = false;
  let escape = false;
  const stack: string[] = [];
  for (let i = 0; i < s.length; i++) {
    const ch = s[i];
    if (escape) {
      escape = false;
      continue;
    }
    if (ch === "\\") {
      escape = true;
      continue;
    }
    if (ch === '"') {
      inString = !inString;
      continue;
    }
    if (inString) continue;
    if (ch === "{" || ch === "[") stack.push(ch);
    else if (ch === "}" || ch === "]") {
      // pop matching opener if present
      for (let j = stack.length - 1; j >= 0; j--) {
        const opener = stack[j];
        if ((ch === "}" && opener === "{") || (ch === "]" && opener === "[")) {
          stack.length = j;
          break;
        }
      }
    }
  }
  let out = s;
  if (inString) out += '"'; // close dangling string
  // Close remaining open structures in reverse order.
  for (let i = stack.length - 1; i >= 0; i--) {
    out += stack[i] === "{" ? "}" : "]";
  }
  return out;
}

/* -------------------------------------------------------------------------- */
/* Free OpenRouter models — shared list                                        */
/* -------------------------------------------------------------------------- */

/**
 * Free OpenRouter models available to both execution paths.
 * Order: LARGEST/STRONGEST first. Verified on OpenRouter as of Aug 2026.
 *
 *   - nvidia/nemotron-3-ultra-550b-a55b : 550B total / 55B active, 1M ctx → STRONGEST
 *   - google/gemma-4-31b-it             : 31B, 262K ctx     → excellent Arabic + creative writing
 *   - google/gemma-4-26b-a4b-it         : 26B MoE, 262K ctx → balanced (good Arabic, faster)
 *   - nvidia/nemotron-3-super-120b-a12b : 120B / 12B active  → MIDDLE (balanced)
 *   - nvidia/nemotron-3.5-lightning     : compact variant, 1M ctx → FASTEST
 */
export const FREE_OPENROUTER_MODELS = [
  "nvidia/nemotron-3-ultra-550b-a55b:free",
  "google/gemma-4-31b-it:free",
  "google/gemma-4-26b-a4b-it:free",
  "nvidia/nemotron-3-super-120b-a12b:free",
  "nvidia/nemotron-3.5-lightning:free",
];

/**
 * RACE multiple models in PARALLEL and return the FIRST one that succeeds.
 *
 * Uses Promise.any() — returns IMMEDIATELY when the first model responds with
 * valid text.
 *
 * STATUS (2026-08-27): its last consumer (the legacy swap route) was retired when all
 * plan swaps moved to the ai_jobs queue (GitHub Actions). The helper is kept
 * for future latency-critical paths, but NOTHING calls it today. Do not wire
 * it into new code without owner approval — the platform standard is
 * callFreeAIFallbackChain.
 *
 * Returns { text, model } on success, throws on total failure.
 */
export async function callFreeOpenRouterRace(
  prompt: string,
  options: CallAIOptions = {},
  raceCount = 3,
): Promise<{ text: string; model: string }> {
  const apiKey = getOpenRouterKey();
  const baseUrl = "https://openrouter.ai/api/v1";
  if (!apiKey) throw new Error("OPENROUTER_API not configured");

  // Pick the top N models to race (largest first, as defined in FREE_OPENROUTER_MODELS)
  const models = FREE_OPENROUTER_MODELS.slice(0, raceCount);

  // Build promises that REJECT on failure (so Promise.any can skip them)
  // and RESOLVE on success with { text, model }.
  const promises = models.map(async (model) => {
    try {
      const { text } = await callAIWithFallback(prompt, options, {
        provider: "openrouter",
        apiKey,
        model,
        baseUrl,
      });
      if (text && text.trim().length > 0) {
        return { text, model };
      }
      throw new Error(`${model}: empty response`);
    } catch (e) {
      throw new Error(`${model}: ${e instanceof Error ? e.message : e}`);
    }
  });

  try {
    // Promise.any returns as soon as the FIRST promise SUCCEEDS.
    // It rejects with AggregateError only if ALL promises reject.
    const result = await Promise.any(promises);
    return result;
  } catch (e) {
    // All failed — collect errors from the AggregateError
    const errors =
      (e instanceof AggregateError
        ? e.errors.map((err) => err.message).join("\n")
        : "") || "Unknown error";
    throw new Error(`All raced OpenRouter models failed:\n${errors}`);
  }
}


// ─────────────────────────────────────────────────────────────────────────
// UNIFIED AI FALLBACK CHAIN — OpenRouter + Groq interleaved by strength
//
// OWNER DIRECTIVE (2026-08-27): the ONLY sequential execution path in the
// platform. Used by EVO chat, plan generation, article generation (EN+AR),
// topic picking, research, and admin AI tools.
//
// Strategy:
//   Walk INTERLEAVED_STRONGEST_CHAIN in order — strongest model from EITHER
//   provider first. If a provider's key is missing its entries are skipped.
//
// Vercel Hobby budget guarantee (60s function cap):
//   maxModels defaults to 2 and each per-model timeout is hard-clamped so
//   that  maxModels × timeoutMs ≤ 52_000ms — the chain can NEVER exceed the
//   serverless wall clock, no matter what the caller passes.
//
// Returns { text, model, provider } on success. Throws on total failure.
// ─────────────────────────────────────────────────────────────────────────

export type FallbackChainOptions = CallAIOptions & {
  /** Max entries of the interleaved chain to try (default 2). */
  maxModels?: number;
  /** "strongest" (default) = quality-first interleave.
   *  "fast"      = speed-first order for interactive streaming chat. */
  chain?: "strongest" | "fast";
  /** UNIVERSAL SWITCHER COVERAGE (2026-08-27 owner directive "نظام التبديل
   *  يتعمل لكل منظومة"): every subsystem labels its own chain calls so any
   *  log line always proves WHICH system used WHICH provider/model/key —
   *  e.g. "evo-chat", "plan:workout", "blog:content-ar". Observational
   *  only — it NEVER changes model ordering or fallback policy. */
  tag?: string;
  /** Phase 89 — TRUE TOKEN STREAMING: when provided, raw content deltas
   *  stream to this callback as they arrive from the provider.
   *  Fallback contract: attempts fail over silently ONLY while nothing
   *  has been streamed yet; once the first delta reaches the user, a
   *  mid-stream failure aborts the whole chain (the caller decides what
   *  the user sees — the route sends an SSE error event). */
  onDelta?: (chunk: string) => void;
};

/** Total time budget reserved for the whole chain (Vercel Hobby-safe).
 *  Override ONLY in non-Vercel execution contexts (native GitHub Actions
 *  runner via scripts/blog-runner) by setting AI_CHAIN_TOTAL_BUDGET_MS
 *  (e.g. 180000) so full-length articles are generated without the 52s
 *  Hobby clamp. Default stays 52_000 — Vercel behavior unchanged. */
const CHAIN_TOTAL_BUDGET_MS =
  Number(process.env.AI_CHAIN_TOTAL_BUDGET_MS) || 52_000;
const DEFAULT_CHAIN_MODELS = 2;

/**
 * Interleaved strongest-free-models chain.
 *
 * Order (strongest → weakest, interleaved):
 *   1. OpenRouter: nvidia/nemotron-3-ultra-550b (550B — strongest overall)
 *   2. Groq: openai/gpt-oss-120b (120B — Groq's strongest)
 *   3. OpenRouter: google/gemma-4-31b-it (31B — excellent Arabic)
 *   4. Groq: openai/gpt-oss-20b (20B — fast, good quality)
 *   5. OpenRouter: google/gemma-4-26b-a4b-it (26B — balanced)
 *   6. Groq: qwen/qwen3.6-27b (27B — good Arabic)
 *   7. OpenRouter: nvidia/nemotron-3-super-120b (120B — balanced)
 *   8. OpenRouter: nvidia/nemotron-3.5-lightning (fastest)
 *   9. Groq: compound-beta (compound system)
 *
 * Groq free tier has an 8000 TPM limit; interleave spreads load across both
 * providers instead of exhausting one before touching the other.
 */
const INTERLEAVED_STRONGEST_CHAIN: Array<{ provider: AIProvider; model: string }> = [
  { provider: "openrouter", model: "nvidia/nemotron-3-ultra-550b-a55b:free" },
  { provider: "groq", model: "openai/gpt-oss-120b" },
  { provider: "openrouter", model: "google/gemma-4-31b-it:free" },
  { provider: "groq", model: "openai/gpt-oss-20b" },
  { provider: "openrouter", model: "google/gemma-4-26b-a4b-it:free" },
  { provider: "groq", model: "qwen/qwen3.6-27b" },
  { provider: "openrouter", model: "nvidia/nemotron-3-super-120b-a12b:free" },
  { provider: "openrouter", model: "nvidia/nemotron-3.5-lightning:free" },
  { provider: "groq", model: "compound-beta" },
];

/** Alternating-lead rotation counter (see callFreeAIFallbackChain below). */
let chainCallSeq = 0;
/** Round-robin cursor across configured OpenRouter accounts (dual-key pool). */
let orKeyCursor = 0;

/**
 * OWNER DIRECTIVE #1 (2026-08-27): EVO chat needs “very fast free models
 * with accurate replies”. Speed-first ordering of VERIFIED model ids only
 * (same ids as the strong chain — no untested endpoints), starting from
 * the smallest/lowest-latency entries. Interactive streaming paths opt in
 * explicitly via options.chain="fast"; default behavior is unchanged.
 */
export const INTERLEAVED_FAST_CHAIN: Array<{ provider: AIProvider; model: string }> = [
  { provider: "groq", model: "openai/gpt-oss-20b" }, // smallest — usually <1s TTFT
  { provider: "groq", model: "openai/gpt-oss-120b" },
  { provider: "openrouter", model: "nvidia/nemotron-3.5-lightning:free" },
  { provider: "groq", model: "qwen/qwen3.6-27b" },
  { provider: "openrouter", model: "google/gemma-4-26b-a4b-it:free" },
];

export async function callFreeAIFallbackChain(
  prompt: string,
  options: FallbackChainOptions = {},
  _maxOpenRouterModels?: number, // DEPRECATED third arg — superseded by options.maxModels; still honored if provided for backward compat
): Promise<{ text: string; model: string; provider: string }> {
  const errors: string[] = [];

  // Log prefix carrying the calling subsystem's tag (universal coverage).
  const LP =
    "[ai-fallback-chain]" + (options.tag ? ` [${options.tag}]` : "");

  const openrouterKeys = getOpenRouterKeys();
  const groqKey = getGroqKey();
  const openrouterBaseUrl = "https://openrouter.ai/api/v1";
  const groqBaseUrl = "https://api.groq.com/openai/v1";

  if (openrouterKeys.length === 0 && !groqKey) {
    throw new Error(
      "[ai-fallback-chain] No AI providers configured. Set OPENROUTER_API and/or GROQ_API_KEY.",
    );
  }

  // ── PROVIDER-LEAD ROTATION (2026-08-27 owner directive "parallel or alternating") ──
  // Every call alternates which provider LEADS the chain. Without this,
  // entry #1 of INTERLEAVED_STRONGEST_CHAIN (a strong OpenRouter model)
  // succeeds almost every time → Groq is never reached and OpenRouter's
  // ~50/day free budget gets burned while Groq idles. With rotation, call N
  // leads OpenRouter, call N+1 leads Groq — keeping each provider's own
  // strength order intact. Both orders remain strongest-available-first.
  chainCallSeq += 1;

  // GROQ BIG-PAYLOAD GUARD (hard data from dispatch logs): Groq free tier
  // enforces an 8000 TPM ceiling COUNTING both prompt and max_tokens
  // (observed 413s: 'Requested 16664', 'Requested 9094'). Estimate the
  // request size conservatively; oversized calls run OpenRouter-only —
  // normal-sized calls keep the alternating balance untouched.
  const estTokens =
    Math.ceil(prompt.length / 4) + (options.maxTokens ?? DEFAULT_CHAIN_MODELS * 1024) + 800;
  const skipGroq = options.chain !== "fast" && estTokens > 7_200;
  if (skipGroq)
    console.log(
      `${LP} payload ~${estTokens}t exceeds Groq 8k TPM window → openrouter-only for this call`,
    );

  const groqLeads = options.chain !== "fast" && !skipGroq && chainCallSeq % 2 === 0 && !!groqKey;
  let activeChain0 =
    options.chain === "fast" ? INTERLEAVED_FAST_CHAIN : INTERLEAVED_STRONGEST_CHAIN;
  if (groqLeads) {
    const firstGroqIdx = activeChain0.findIndex((e) => e.provider === "groq");
    if (firstGroqIdx > 0) {
      activeChain0 = [
        activeChain0[firstGroqIdx],
        ...activeChain0.slice(0, firstGroqIdx),
        ...activeChain0.slice(firstGroqIdx + 1),
      ];
    }
  }
  if (skipGroq) activeChain0 = activeChain0.filter((e) => e.provider !== "groq");
  console.log(
    `${LP} lead=${groqLeads ? "groq" : "openrouter"} (call #${chainCallSeq}, orKeys=${openrouterKeys.length})`,
  );

  // ── Time-budget enforcement (Vercel Hobby guarantee) ──────────────────
  const requestedModels =
    options.maxModels ??
    (typeof _maxOpenRouterModels === "number" && _maxOpenRouterModels > 0
      ? _maxOpenRouterModels
      : DEFAULT_CHAIN_MODELS);
  const maxModels = Math.max(1, Math.min(requestedModels, activeChain0.length));
  const callerTimeoutMs = options.timeoutMs ?? 60_000;
  // Clamp so that maxModels × effTimeout ≤ budget AND never exceeds caller intent.
  const effTimeoutMs = Math.min(callerTimeoutMs, Math.floor(CHAIN_TOTAL_BUDGET_MS / maxModels));

  const { maxModels: _omit, timeoutMs: _omit2, chain: _omit3, tag: _omit4, ...callOptions } = options;

  /** Quota/auth-style failures justify burning another KEY on the SAME model. */
  const looksLikeQuota = (m: string) => /\b(401|402|429|403)\b|quota|rate.?limit|credit|insufficient/i.test(m);

  let attempted = 0;
  for (const { provider, model } of activeChain0) {
    if (attempted >= maxModels) break;

    const baseUrl = provider === "openrouter" ? openrouterBaseUrl : groqBaseUrl;
    // DUAL-KEY POOL rotation: round-robin across every configured OpenRouter
    // account so the ~50/day free ceiling is shared instead of burned on one.
    let candidateKeys: string[] = [];
    if (provider === "openrouter" && openrouterKeys.length > 0) {
      const first = openrouterKeys[orKeyCursor++ % openrouterKeys.length];
      candidateKeys = [first, ...openrouterKeys.filter((k) => k !== first)];
    } else if (provider === "groq" && groqKey) {
      candidateKeys = [groqKey];
    }
    if (candidateKeys.length === 0) {
      errors.push(`${provider}/${model}: key not configured`);
      continue;
    }
    attempted++;

    // Inner key-fallback loop ONLY triggers on auth/quota-style errors —
    // ordinary failures fall through to the next MODEL as before.
    // EMPTY-RESPONSE RETRY (2026-08-27): OpenRouter's free pool frequently
    // swallows a request and returns 200-with-empty-content; an immediate
    // identical retry very often succeeds. Retry each entry ONCE on empty.
    for (const apiKey of candidateKeys) {
      for (let attemptNo = 0; attemptNo < 2; attemptNo++) {
        // Phase 89 streaming: when the caller passed onDelta, this attempt
        // streams raw deltas through the chain-level callback. attemptStreamed
        // marks that THIS attempt already pushed tokens to the user — after
        // that, a failure must abort the chain (no silent model switch that
        // would splice two different answers into one visible stream).
        let attemptStreamed = false;
        const streamTap = options.onDelta
          ? (chunk: string) => {
              attemptStreamed = true;
              options.onDelta?.(chunk);
            }
          : undefined;
        try {
          const { text } = streamTap
            ? {
                text: await callAIStream(
                  prompt,
                  { ...callOptions, timeoutMs: effTimeoutMs },
                  { provider, apiKey, model, baseUrl },
                  streamTap,
                ),
              }
            : await callAIWithFallback(
                prompt,
                { ...callOptions, timeoutMs: effTimeoutMs },
                {
                  provider,
                  apiKey,
                  model,
                  baseUrl,
                },
              );
          if (text && text.trim().length > 0) {
            console.log(
              `${LP} ${provider}/${model} succeeded${attemptNo ? " (after empty-retry)" : ""}${streamTap ? " (streamed)" : ""}`,
            );
            return { text: text.trim(), model, provider };
          }
          throw new Error(`${model}: empty response`);
        } catch (e) {
          const msg = e instanceof Error ? e.message : String(e);
          errors.push(`${provider}/${model}: ${msg}`);
          if (attemptStreamed) {
            // Mid-stream failure AFTER user-visible tokens — rethrow so the
            // caller can decide (route sends an SSE error event; the client
            // keeps the partial text).
            throw new Error(
              `[ai-fallback-chain] stream failed mid-way on ${provider}/${model}: ${msg}`,
            );
          }
          console.warn(`${LP} ${provider}/${model} notice, trying next:`, msg);
        }
        const lastErr = errors[errors.length - 1] || "";
        const isEmpty = /empty response/i.test(lastErr);
        if (isEmpty && attemptNo === 0 && provider === "openrouter") {
          console.log(`${LP} empty response → one immediate retry of ${provider}/${model}`);
          continue;
        }
        break;
      }
      // Only a quota/auth problem on OpenRouter justifies switching ACCOUNT;
      // everything else falls through to the next model in the chain.
      const lastErr = errors[errors.length - 1] || "";
      if (!looksLikeQuota(lastErr) || provider !== "openrouter") break;
      if (!candidateKeys.some((k) => k !== apiKey)) break;
      console.log(`${LP} quota/auth error → switching OpenRouter account for ${model}`);
    }
  }

  // All providers failed
  const finalError = new Error(
    `[ai-fallback-chain] All AI providers failed.` +
      (options.tag ? ` (system: ${options.tag})\n` : "\n") +
      `OpenRouter keys configured: ${openrouterKeys.length}.\n` +
      `Groq key: ${groqKey ? "present" : "MISSING"}.\n` +
      `Errors:\n  - ${errors.join("\n  - ")}`,
  );
  console.error(finalError.message);
  throw finalError;
}
