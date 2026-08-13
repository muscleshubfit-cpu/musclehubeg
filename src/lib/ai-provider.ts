/**
 * Universal AI Provider — OpenAI-compatible client.
 *
 * Supports (no code changes required to switch):
 * - openrouter (default) → https://openrouter.ai/api/v1
 * - openai → https://api.openai.com/v1
 * - gemini → https://generativelanguage.googleapis.com/v1beta/openai
 * - anthropic → https://api.anthropic.com/v1 (OpenAI-compat shim)
 * - groq → https://api.groq.com/openai/v1
 * - deepseek → https://api.deepseek.com/v1
 *
 * All providers expose the OpenAI Chat Completions API shape:
 * POST {base_url}/chat/completions
 * body: { model, messages, temperature, max_tokens, response_format }
 *
 * Resolution order (highest priority first):
 * 1. Runtime override (set by AI Settings page → stored in HTTP-only cookies
 * on the server, or sent inline by the API caller)
 * 2. Process.env (OPENROUTER_API_KEY / OPENAI_API_KEY / etc.)
 *
 * This file MUST be server-only — it never exposes API keys to the client.
 */

export type AIProvider =
 | "openrouter"
 | "openai"
 | "gemini"
 | "anthropic"
 | "groq"
 | "deepseek";

export const AI_PROVIDERS: Record<
 AIProvider,
 { label: string; baseUrl: string; defaultModel: string; envKey: string; docsUrl: string; keyPrefix: string }
> = {
 openrouter: {
 label: "OpenRouter (recommended)",
 baseUrl: "https://openrouter.ai/api/v1",
 // Free Gemma 4 26B — non-reasoning model that returns clean content (not
 // hidden inside a reasoning_details block). 262K context, plenty for
 // long-form article generation. Switch to a paid model
 // (anthropic/claude-3.5-sonnet, openai/gpt-4o, etc.) in the AI Settings
 // page once you add OpenRouter credits.
 defaultModel: "google/gemma-4-26b-a4b-it:free",
 envKey: "OPENROUTER_API_KEY",
 docsUrl: "https://openrouter.ai/keys",
 keyPrefix: "sk-or-",
 },
 openai: {
 label: "OpenAI",
 baseUrl: "https://api.openai.com/v1",
 defaultModel: "gpt-4o-mini",
 envKey: "OPENAI_API_KEY",
 docsUrl: "https://platform.openai.com/api-keys",
 keyPrefix: "sk-",
 },
 gemini: {
 label: "Google Gemini (OpenAI-compat)",
 baseUrl: "https://generativelanguage.googleapis.com/v1beta/openai",
 defaultModel: "gemini-2.0-flash",
 envKey: "GEMINI_API_KEY",
 docsUrl: "https://aistudio.google.com/apikey",
 keyPrefix: "AI",
 },
 anthropic: {
 label: "Anthropic Claude (OpenAI-compat shim)",
 baseUrl: "https://api.anthropic.com/v1",
 defaultModel: "claude-3-5-sonnet-20241022",
 envKey: "ANTHROPIC_API_KEY",
 docsUrl: "https://console.anthropic.com/settings/keys",
 keyPrefix: "sk-ant-",
 },
 groq: {
 label: "Groq (ultra-fast)",
 baseUrl: "https://api.groq.com/openai/v1",
 defaultModel: "llama-3.3-70b-versatile",
 envKey: "GROQ_API_KEY",
 docsUrl: "https://console.groq.com/keys",
 keyPrefix: "gsk_",
 },
 deepseek: {
 label: "DeepSeek",
 baseUrl: "https://api.deepseek.com/v1",
 defaultModel: "deepseek-chat",
 envKey: "DEEPSEEK_API_KEY",
 docsUrl: "https://platform.deepseek.com/api_keys",
 keyPrefix: "sk-",
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
 */
export function getEnvConfig(): AIConfig | null {
 const provider = (process.env.AI_PROVIDER as AIProvider) || "openrouter";
 const meta = AI_PROVIDERS[provider] || AI_PROVIDERS.openrouter;

 // Provider-specific env key, falling back to a generic AI_API_KEY.
 const apiKey =
 process.env[meta.envKey] ||
 process.env.AI_API_KEY ||
 process.env.OPENROUTER_API_KEY ||
 "";

 if (!apiKey) return null;

 return {
 provider,
 apiKey,
 model: process.env.AI_MODEL || meta.defaultModel,
 baseUrl: process.env.AI_BASE_URL || meta.baseUrl,
 };
}

/**
 * Merge an optional override (from the AI Settings page) on top of the env
 * config. The override always wins when present.
 */
export function mergeOverride(override?: Partial<AIConfig> | null): AIConfig | null {
 const env = getEnvConfig();
 if (!override && !env) return null;
 if (!override) return env;

 const provider = (override.provider as AIProvider) || env?.provider || "openrouter";
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
 "AI provider not configured. Open AI Settings (admin/ai-settings) and add an API key, or set OPENROUTER_API_KEY in your environment.",
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

 // Most OpenAI-compatible endpoints support response_format for JSON mode.
 // Anthropic and Gemini's OpenAI-compat shims are unreliable here — skip
 // it for them and rely on prompt-based JSON instructions.
 const skipJsonMode = cfg.provider === "anthropic" || cfg.provider === "gemini";
 if (options.jsonMode && !skipJsonMode) {
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
 * fails (quota, network, region block, etc.), tries each fallback provider
 * whose key is set in env vars. Returns the first successful result along
 * with which provider actually served the request.
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

 // 2. Try every other provider whose env key is set.
 for (const id of Object.keys(AI_PROVIDERS) as AIProvider[]) {
 if (primary && id === primary.provider) continue;
 const meta = AI_PROVIDERS[id];
 const key = process.env[meta.envKey] || "";
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
 throw new Error(
 `All AI providers failed:\n${errors.join("\n")}`,
 );
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
/* Free OpenRouter models — shared fallback list                              */
/* -------------------------------------------------------------------------- */

/**
 * Free OpenRouter models tried in order by the chat / swap / research-topic
 * routes. Centralized here so we don't have three copies drifting apart.
 *
 * Order: fastest first. gemma-4-26b-a4b-it is non-reasoning (clean content,
 * no reasoning_details wrapper) so it's preferred for short replies and JSON.
 */
export const FREE_OPENROUTER_MODELS = [
 "google/gemma-4-26b-a4b-it:free",
 "google/gemma-4-31b-it:free",
 "nvidia/nemotron-3-super-49b-a4b-it:free",
 "nvidia/nemotron-3-ultra-550b-a55b:free",
 "openai/gpt-oss-20b:free",
];

/**
 * Try each free OpenRouter model in order, returning the first non-empty
 * response. Used by routes that want to specifically iterate free models
 * (rather than callAIWithFallback's provider-level fallback).
 *
 * Returns { text, model } on success, throws on total failure.
 */
export async function callFreeOpenRouter(
 prompt: string,
 options: CallAIOptions = {},
): Promise<{ text: string; model: string }> {
 const apiKey = process.env.OPENROUTER_API_KEY || process.env.AI_API_KEY || "";
 const baseUrl = "https://openrouter.ai/api/v1";
 if (!apiKey) throw new Error("OPENROUTER_API_KEY not configured");

 const errors: string[] = [];
 for (const model of FREE_OPENROUTER_MODELS) {
 try {
 const { text } = await callAIWithFallback(
 prompt,
 options,
 {
 provider: "openrouter",
 apiKey,
 model,
 baseUrl,
 },
 );
 if (text && text.trim().length > 0) {
 return { text, model };
 }
 } catch (e: any) {
 errors.push(`${model}: ${e?.message || e}`);
 }
 }
 throw new Error(`All free OpenRouter models failed:\n${errors.join("\n")}`);
}

/* -------------------------------------------------------------------------- */
/* AI Settings cookie override — read from request cookies                    */
/* -------------------------------------------------------------------------- */

/**
 * Cookie names used by the AI Settings page to store the admin-selected
 * AI provider override (provider + key + model + baseUrl). The cookies are
 * httpOnly, so they're only readable on the server.
 *
 * Kept here (not in the settings route) so other server routes can import
 * getOverrideFromRequest without a circular dependency on a route handler.
 */
export const AI_SETTINGS_COOKIES = {
 provider: "ai_provider",
 apiKey: "ai_api_key",
 model: "ai_model",
 baseUrl: "ai_base_url",
} as const;

/**
 * Read the AI provider override from the request cookies (set by the
 * AI Settings page). Returns null if no override is configured — callers
 * then fall back to process.env-based defaults via mergeOverride(null).
 */
export function getOverrideFromRequest(request: {
 cookies: { get(name: string): { value: string | undefined } | undefined };
}): Partial<AIConfig> | null {
 const provider = request.cookies.get(AI_SETTINGS_COOKIES.provider)?.value as
 | AIProvider
 | undefined;
 const apiKey = request.cookies.get(AI_SETTINGS_COOKIES.apiKey)?.value;
 const model = request.cookies.get(AI_SETTINGS_COOKIES.model)?.value;
 const baseUrl = request.cookies.get(AI_SETTINGS_COOKIES.baseUrl)?.value;
 if (!provider && !apiKey) return null;
 return {
 provider: provider || undefined,
 apiKey: apiKey || undefined,
 model: model || undefined,
 baseUrl: baseUrl || undefined,
 };
}
