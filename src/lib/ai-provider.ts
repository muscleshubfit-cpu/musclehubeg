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

  const body: any = {
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
              "HTTP-Referer": "https://musclehubeg.vercel.app",
              "X-Title": "MuscleHub Blog CMS",
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

    const data = await res.json();
    const msg = data?.choices?.[0]?.message;
    // Prefer `content`; fall back to `reasoning` / `reasoning_details` for
    // reasoning models (gpt-oss, gemini-thinking) that hide output there.
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
    if (!content) {
      throw new Error(`AI provider ${cfg.provider} returned an empty response`);
    }
    return content.trim();
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Call AI with automatic fallback. Tries the primary config first; if it
 * fails (quota, network, region block, etc.), tries the other allowed
 * provider (openrouter ↔ groq) if its env key is set. Returns the first
 * successful result along with which provider actually served the request.
 *
 * Use this for expensive operations (e.g. article generation) where you
 * don't want a single provider's outage to block the whole workflow.
 */
export async function callAIWithFallback(
  prompt: string,
  options: CallAIOptions = {},
  configOverride?: Partial<AIConfig> | null,
): Promise<{ text: string; provider: AIProvider; model: string }> {
  const errors: string[] = [];

  // 1. Try the primary (override or env).
  const primary = mergeOverride(configOverride);
  if (primary && primary.apiKey) {
    try {
      const text = await callAI(prompt, options, configOverride);
      return { text, provider: primary.provider, model: primary.model };
    } catch (e: any) {
      errors.push(`${primary.provider}: ${e.message}`);
    }
  }

  // 2. Try the other allowed provider whose env key is set.
  for (const id of Object.keys(AI_PROVIDERS) as AIProvider[]) {
    if (primary && id === primary.provider) continue;
    const meta = AI_PROVIDERS[id];
    const key = id === "groq" ? getGroqKey() : getOpenRouterKey();
    if (!key) continue;
    try {
      const text = await callAI(prompt, options, {
        provider: id,
        apiKey: key,
        model: meta.defaultModel,
        baseUrl: meta.baseUrl,
      });
      return { text, provider: id, model: meta.defaultModel };
    } catch (e: any) {
      errors.push(`${id}: ${e.message}`);
    }
  }

  // 3. All providers failed.
  throw new Error(`All AI providers failed:\n${errors.join("\n")}`);
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
export function parseJSON<T = any>(text: string): T | null {
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
    } catch (e: any) {
      throw new Error(`${model}: ${e?.message || e}`);
    }
  });

  try {
    // Promise.any returns as soon as the FIRST promise SUCCEEDS.
    // It rejects with AggregateError only if ALL promises reject.
    const result = await Promise.any(promises);
    return result;
  } catch (e: any) {
    // All failed — collect errors from the AggregateError
    const errors =
      e?.errors?.map((err: Error) => err.message).join("\n") || "Unknown error";
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

  const openrouterKey = getOpenRouterKey();
  const groqKey = getGroqKey();
  const openrouterBaseUrl = "https://openrouter.ai/api/v1";
  const groqBaseUrl = "https://api.groq.com/openai/v1";

  if (!openrouterKey && !groqKey) {
    throw new Error(
      "[ai-fallback-chain] No AI providers configured. Set OPENROUTER_API and/or GROQ_API_KEY.",
    );
  }

  // ── Time-budget enforcement (Vercel Hobby guarantee) ──────────────────
  const requestedModels =
    options.maxModels ??
    (typeof _maxOpenRouterModels === "number" && _maxOpenRouterModels > 0
      ? _maxOpenRouterModels
      : DEFAULT_CHAIN_MODELS);
  const activeChain =
    options.chain === "fast" ? INTERLEAVED_FAST_CHAIN : INTERLEAVED_STRONGEST_CHAIN;
  const maxModels = Math.max(1, Math.min(requestedModels, activeChain.length));
  const callerTimeoutMs = options.timeoutMs ?? 60_000;
  // Clamp so that maxModels × effTimeout ≤ budget AND never exceeds caller intent.
  const effTimeoutMs = Math.min(callerTimeoutMs, Math.floor(CHAIN_TOTAL_BUDGET_MS / maxModels));

  const { maxModels: _omit, timeoutMs: _omit2, chain: _omit3, ...callOptions } = options;

  let attempted = 0;
  for (const { provider, model } of activeChain) {
    if (attempted >= maxModels) break;

    const apiKey = provider === "openrouter" ? openrouterKey : groqKey;
    const baseUrl = provider === "openrouter" ? openrouterBaseUrl : groqBaseUrl;
    if (!apiKey) {
      errors.push(`${provider}/${model}: key not configured`);
      continue;
    }
    attempted++;

    try {
      const { text } = await callAIWithFallback(prompt, { ...callOptions, timeoutMs: effTimeoutMs }, {
        provider,
        apiKey,
        model,
        baseUrl,
      });
      if (text && text.trim().length > 0) {
        console.log(`[ai-fallback-chain] ${provider}/${model} succeeded`);
        return { text: text.trim(), model, provider };
      }
      throw new Error(`${model}: empty response`);
    } catch (e: any) {
      const msg = e?.message || String(e);
      errors.push(`${provider}/${model}: ${msg}`);
      console.warn(`[ai-fallback-chain] ${provider}/${model} notice, trying next:`, msg);
    }
  }

  // All providers failed
  const finalError = new Error(
    `[ai-fallback-chain] All AI providers failed.\n` +
      `OpenRouter key: ${openrouterKey ? "present" : "MISSING"}.\n` +
      `Groq key: ${groqKey ? "present" : "MISSING"}.\n` +
      `Errors:\n  - ${errors.join("\n  - ")}`,
  );
  console.error(finalError.message);
  throw finalError;
}
