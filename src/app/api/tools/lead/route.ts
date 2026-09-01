import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

/**
 * #2 fix: simple in-memory rate limiting for public endpoint.
 * Limits: 5 requests per IP per 10 minutes (prevents lead spam).
 * Note: this is per-instance (Vercel serverless may have multiple
 * instances), but it raises the bar significantly for casual abuse.
 * For production-grade rate limiting, use Upstash Redis.
 */
const RATE_LIMIT_WINDOW = 10 * 60 * 1000; // 10 minutes
const RATE_LIMIT_MAX = 5; // 5 requests per window per IP
const ipRequests = new Map<string, { count: number; resetAt: number }>();

function checkRateLimit(ip: string): { allowed: boolean; remaining: number; resetAt: number } {
  const now = Date.now();
  const entry = ipRequests.get(ip);
  if (!entry || now > entry.resetAt) {
    ipRequests.set(ip, { count: 1, resetAt: now + RATE_LIMIT_WINDOW });
    return { allowed: true, remaining: RATE_LIMIT_MAX - 1, resetAt: now + RATE_LIMIT_WINDOW };
  }
  if (entry.count >= RATE_LIMIT_MAX) {
    return { allowed: false, remaining: 0, resetAt: entry.resetAt };
  }
  entry.count++;
  return { allowed: true, remaining: RATE_LIMIT_MAX - entry.count, resetAt: entry.resetAt };
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
  // #2 fix: rate limit check
  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
  const rateLimit = checkRateLimit(ip);
  if (!rateLimit.allowed) {
    return NextResponse.json(
      { error: "Too many requests. Please try again later." },
      {
        status: 429,
        headers: {
          "Retry-After": String(Math.ceil((rateLimit.resetAt - Date.now()) / 1000)),
          "X-RateLimit-Remaining": "0",
          "X-RateLimit-Reset": String(rateLimit.resetAt),
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

    if (!cleanEmail) {
      return NextResponse.json(
        { error: "Email is required" },
        { status: 400 },
      );
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) {
      return NextResponse.json(
        { error: "Invalid email format" },
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

    const { data, error } = await supabase
      .from("tool_leads")
      .insert({
        tool_slug,
        email: cleanEmail,
        name: typeof name === "string" && name.trim() ? name.trim().slice(0, 80) : null,
        whatsapp: null,
        result_summary: typeof result_summary === "string" ? result_summary.slice(0, 500) : null,
        result_json: result_json ?? null,
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
  } catch (e: any) {
    console.error("[api/tools/lead] Exception:", e?.message || e);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
