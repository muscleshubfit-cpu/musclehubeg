/**
 * Cross-instance rate limiting (H3, performance/security audit 2026-09-05).
 *
 * The old in-memory Maps reset on every serverless cold start and are
 * per-instance — on Vercel, abuse slips through whenever a new lambda
 * handles the request. This module is a drop-in upgrade:
 *
 *   • If UPSTASH_REDIS_REST_URL + UPSTASH_REDIS_REST_TOKEN are set →
 *     fixed-window counters live in Upstash Redis (free tier is
 *     plenty for lead/email/register volume) — shared across ALL
 *     instances, survives cold starts. Zero npm dependencies: plain
 *     fetch against the REST API.
 *   • Otherwise → falls back to the previous in-memory behavior
 *     (dev/demo mode). No env vars = no behavior change.
 *
 * Usage:
 *   const rl = await rateLimit(`lead:${ip}`, 5, 10 * 60 * 1000);
 *   if (!rl.allowed) return 429;
 */

export type RateLimitResult = {
  allowed: boolean;
  /** Requests remaining in the current window (>= 0). */
  remaining: number;
  /** Epoch ms when the window resets. */
  resetAt: number;
};

/**
 * SECURITY (audit H3, 2026-09-07): derive the client IP for rate-limit
 * keys. The OLD pattern `x-forwarded-for.split(",")[0]` takes the FIRST
 * entry, which is attacker-appendable when a chain is present. The LAST
 * entry is the one appended by the closest trusted proxy (Vercel), so it
 * is the reliable client identity; x-real-ip is the platform fallback.
 */
export function clientIp(request: { headers: { get(name: string): string | null } }): string {
  const xff = request.headers.get("x-forwarded-for") || "";
  const last = xff.split(",").pop()?.trim();
  if (last) return last;
  return request.headers.get("x-real-ip")?.trim() || "unknown";
}

type MemoryEntry = { count: number; resetAt: number };

const memory = new Map<string, MemoryEntry>();

const upstashUrl = () =>
  process.env.UPSTASH_REDIS_REST_URL || "";
const upstashToken = () =>
  process.env.UPSTASH_REDIS_REST_TOKEN || "";

function isUpstashConfigured(): boolean {
  return Boolean(upstashUrl() && upstashToken());
}

function memoryLimit(
  key: string,
  max: number,
  windowMs: number,
): RateLimitResult {
  const now = Date.now();
  const entry = memory.get(key);
  if (!entry || now > entry.resetAt) {
    const resetAt = now + windowMs;
    memory.set(key, { count: 1, resetAt });
    return { allowed: true, remaining: Math.max(0, max - 1), resetAt };
  }
  entry.count += 1;
  return {
    allowed: entry.count <= max,
    remaining: Math.max(0, max - entry.count),
    resetAt: entry.resetAt,
  };
}

async function upstashCommand(
  commands: (string | number)[][],
): Promise<unknown[] | null> {
  const url = upstashUrl().replace(/\/+$/, "");
  // Endpoint routing (verified live 2026-09-05 on flowing-sunbeam-103898):
  // the ROOT path accepts a SINGLE command array (["PING"]) but REJECTS
  // a nested/pipeline array with 400 "unsupported arg type: json.Delim".
  // Pipelined commands must go to the dedicated /pipeline path.
  // (Forgetting this made the whole feature silently fall back to the
  // in-memory Map even with env vars set — caught by live verification.)
  const endpoint = commands.length === 1 ? url : `${url}/pipeline`;
  try {
    const res = await fetch(endpoint, {
      method: "POST",
      headers: {
        authorization: `Bearer ${upstashToken()}`,
        "content-type": "application/json",
      },
      body: JSON.stringify(commands),
      cache: "no-store",
    });
    if (!res.ok) return null;
    const data = (await res.json()) as unknown;
    // Single command → { result }, pipeline → [{ result }, …]
    if (Array.isArray(data)) {
      return (data as { result: unknown }[]).map((d) => d.result);
    }
    return [(data as { result: unknown }).result];
  } catch {
    return null; // network error → caller falls back to memory
  }
}

/**
 * Fixed-window rate limit. `key` should include the bucket + identity
 * (e.g. `sendemail:ip:1.2.3.4`). Upstash keys get a `rl:` prefix and a
 * TTL so the ledger cleans itself.
 */
export async function rateLimit(
  key: string,
  max: number,
  windowMs: number,
): Promise<RateLimitResult> {
  const now = Date.now();
  const ttlSeconds = Math.ceil(windowMs / 1000);

  if (isUpstashConfigured()) {
    const redisKey = `rl:${key}:${Math.floor(now / windowMs)}`;
    // INCR the window counter; EXPIRE (NX) only arms the TTL on first hit.
    const results = await upstashCommand([
      ["INCR", redisKey],
      ["EXPIRE", redisKey, String(ttlSeconds + 5), "NX"],
    ]);
    const count = typeof results?.[0] === "number" ? results[0] : null;
    if (count !== null) {
      const windowIndex = Math.floor(now / windowMs);
      return {
        allowed: count <= max,
        remaining: Math.max(0, max - count),
        resetAt: (windowIndex + 1) * windowMs,
      };
    }
    // Upstash unreachable → degrade to memory (still better than open).
  }

  return memoryLimit(key, max, windowMs);
}
