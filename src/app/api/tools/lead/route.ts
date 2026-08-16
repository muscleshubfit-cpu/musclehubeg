import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

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

    const cookieStore = await cookies();
    const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll() {
          // No-op for API route — we're not establishing a session here.
        },
      },
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
