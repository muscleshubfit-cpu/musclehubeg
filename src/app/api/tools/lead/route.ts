import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

/**
 * POST /api/tools/lead
 *
 * Saves an email/WhatsApp lead captured from one of the free tools.
 * Public endpoint (no auth required) — RLS allows anonymous inserts.
 *
 * Body:
 *   {
 *     tool_slug: "calorie-calculator" | "bmi-calculator" | "macro-calculator" | "body-fat-calculator",
 *     email?: string,        // optional
 *     whatsapp?: string,     // optional
 *     result_summary?: string,  // short human-readable
 *     result_json?: object,     // structured result
 *     lang?: "ar" | "en",
 *     consent?: boolean         // default true
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
      whatsapp,
      result_summary,
      result_json,
      lang,
      consent = true,
    } = body || {};

    // Validate tool_slug (must be one of the known tools)
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

    // Require at least one contact channel
    const cleanEmail = typeof email === "string" ? email.trim().toLowerCase() : "";
    const cleanWhatsapp = typeof whatsapp === "string" ? whatsapp.trim() : "";
    if (!cleanEmail && !cleanWhatsapp) {
      return NextResponse.json(
        { error: "Email or WhatsApp is required" },
        { status: 400 },
      );
    }

    // Basic email validation
    if (cleanEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) {
      return NextResponse.json(
        { error: "Invalid email format" },
        { status: 400 },
      );
    }

    // Basic WhatsApp validation (digits, +, spaces, dashes)
    if (cleanWhatsapp && !/^[+0-9][0-9\s-]{6,}$/.test(cleanWhatsapp)) {
      return NextResponse.json(
        { error: "Invalid WhatsApp number" },
        { status: 400 },
      );
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (!supabaseUrl || !supabaseAnonKey) {
      // Demo mode — silently succeed (no DB to write to).
      // The user still gets the "results sent" success message.
      return NextResponse.json({ ok: true, demo: true });
    }

    // Use the SERVICE ROLE key (server-only, bypasses RLS) for inserts.
    // This is a public endpoint — anonymous users submit leads from the
    // free tools. The RLS INSERT policy for anon was not being honored
    // by PostgREST (schema cache issue), so we bypass it server-side.
    // The route still validates all input before writing.
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
        email: cleanEmail || null,
        whatsapp: cleanWhatsapp || null,
        result_summary: typeof result_summary === "string" ? result_summary.slice(0, 500) : null,
        result_json: result_json ?? null,
        lang: lang || "ar",
        consent: !!consent,
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
