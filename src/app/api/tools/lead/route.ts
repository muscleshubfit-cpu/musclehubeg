import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { validateEmailStrict } from "@/lib/email-validation";
import { rateLimit, clientIp } from "@/lib/rate-limit";

/**
 * H3 (audit 2026-09-05): rate limiting now goes through
 * src/lib/rate-limit.ts — Upstash Redis when
 * UPSTASH_REDIS_REST_URL/TOKEN are configured (shared across ALL
 * serverless instances, survives cold starts), in-memory fallback
 * otherwise. Same limits as before: 5 requests per IP per 10 min.
 */
const RATE_LIMIT_WINDOW = 10 * 60 * 1000; // 10 minutes
const RATE_LIMIT_MAX = 5; // 5 requests per window per IP

function checkRateLimit(ip: string): Promise<{ allowed: boolean; remaining: number; resetAt: number }> {
  return rateLimit(`lead:ip:${ip}`, RATE_LIMIT_MAX, RATE_LIMIT_WINDOW);
}

/**
 * POST /api/tools/lead
 *
 * Saves a contact lead in the `tool_leads` table — Phase 72 (owner request):
 *   - all SIX free tools can save leads (water-tracker + meal-planner added)
 *   - newsletter subscriptions save with tool_slug="newsletter" + type="newsletter"
 *   - optional `name` column is stored when provided
 * (Email SENDING lives in /api/send-email — this endpoint is save-only.)
 *
 * Public endpoint (no auth required). Rate limited: 5 req / 10 min / IP.
 *
 * Body:
 *   {
 *     tool_slug: "calorie-calculator" | "bmi-calculator" | "macro-calculator" | "body-fat-calculator" | "water-tracker" | "meal-planner" | "newsletter",
 *     email: string,
 *     name?: string,
 *     result_summary?: string,
 *     result_json?: object,
 *     lang?: "ar" | "en"
 *   }
 *
 * Returns:
 *   { ok: true, id: string }
 */
export async function POST(request: NextRequest) {
  // #2 fix: rate limit check (H3 2026-09-07: last XFF hop — not the
  // spoofable split(",")[0])
  const ip = clientIp(request);
  const rl = await checkRateLimit(ip);
  if (!rl.allowed) {
    return NextResponse.json(
      { error: "Too many requests. Please try again later." },
      {
        status: 429,
        headers: {
          "Retry-After": String(Math.ceil((rl.resetAt - Date.now()) / 1000)),
          "X-RateLimit-Remaining": "0",
          "X-RateLimit-Reset": String(rl.resetAt),
        },
      },
    );
  }

  try {
    const body = await request.json();
    const {
      tool_slug,
      email,
      name,
      result_summary,
      result_json,
      lang,
    } = body || {};

    // Validate tool_slug — Phase 72: + water-tracker, meal-planner, newsletter
    const ALLOWED_TOOLS = [
      "calorie-calculator",
      "bmi-calculator",
      "macro-calculator",
      "body-fat-calculator",
      "water-tracker",
      "meal-planner",
      "newsletter",
    ];
    if (!ALLOWED_TOOLS.includes(tool_slug)) {
      return NextResponse.json(
        { error: "Invalid tool_slug" },
        { status: 400 },
      );
    }

    const cleanEmail = typeof email === "string" ? email.trim().toLowerCase() : "";

    // Phase 73: STRICT email filtering (same rules as the client-side form)
    const emailCheck = validateEmailStrict(cleanEmail);
    if (!emailCheck.ok) {
      return NextResponse.json(
        { error: "Valid email is required" },
        { status: 400 },
      );
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (!supabaseUrl || !supabaseAnonKey) {
      // Demo mode — no DB to write to
      return NextResponse.json({ ok: true, demo: true });
    }

    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    const supabase = serviceKey
      ? createClient(supabaseUrl, serviceKey, {
          auth: { persistSession: false, autoRefreshToken: false },
        })
      : createClient(supabaseUrl, supabaseAnonKey, {
          auth: { persistSession: false, autoRefreshToken: false },
        });

    // M2 (audit 2026-09-07): cap the persisted result_json payload —
    // hostile clients could otherwise bloat tool_leads with multi-MB rows.
    const MAX_RESULT_JSON_BYTES = 10 * 1024;
    let storedResultJson: unknown = result_json ?? null;
    try {
      if (storedResultJson && JSON.stringify(storedResultJson).length > MAX_RESULT_JSON_BYTES) {
        storedResultJson = null;
        console.warn("[api/tools/lead] result_json exceeded 10KB — dropped");
      }
    } catch {
      storedResultJson = null;
    }

    const { data, error } = await supabase
      .from("tool_leads")
      .insert({
        tool_slug,
        email: cleanEmail,
        name: typeof name === "string" && name.trim() ? name.trim().slice(0, 80) : null,
        whatsapp: null,
        result_summary: typeof result_summary === "string" ? result_summary.slice(0, 500) : null,
        result_json: storedResultJson,
        lang: lang || "ar",
        consent: true,
        // Phase 72: newsletter subscribers get their dedicated type
        type: tool_slug === "newsletter" ? "newsletter" : "tool",
      })
      .select("id")
      .single();

    if (error) {
      console.error("[api/tools/lead] Insert failed:", error.message);
      return NextResponse.json(
        { error: "Failed to save lead" },
        { status: 500 },
      );
    }

    return NextResponse.json({ ok: true, id: data?.id });
  } catch (e) {
    console.error("[api/tools/lead] Exception:", e instanceof Error ? e.message : e);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
