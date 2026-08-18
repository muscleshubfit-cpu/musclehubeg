import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

/**
 * POST /api/tools/lead
 *
 * Saves an email lead (newsletter signup) from one of the free tools.
 * The lead is stored in the `tool_leads` table. The coach can later
 * export these emails for newsletter campaigns.
 *
 * Public endpoint (no auth required).
 *
 * Body:
 *   {
 *     tool_slug: "calorie-calculator" | "bmi-calculator" | "macro-calculator" | "body-fat-calculator",
 *     email: string,
 *     result_summary?: string,
 *     result_json?: object,
 *     lang?: "ar" | "en"
 *   }
 *
 * Returns:
 *   { ok: true, id: string }
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      tool_slug,
      email,
      result_summary,
      result_json,
      lang,
    } = body || {};

    // Validate tool_slug
    const ALLOWED_TOOLS = [
      "calorie-calculator",
      "bmi-calculator",
      "macro-calculator",
      "body-fat-calculator",
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
        whatsapp: null,
        result_summary: typeof result_summary === "string" ? result_summary.slice(0, 500) : null,
        result_json: result_json ?? null,
        lang: lang || "ar",
        consent: true,
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
