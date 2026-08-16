import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

/**
 * POST /api/tools/lead
 *
 * Saves an email lead captured from one of the free tools AND sends
 * a real email with the user's results via Resend.
 *
 * Public endpoint (no auth required).
 *
 * Body:
 *   {
 *     tool_slug: "calorie-calculator" | "bmi-calculator" | "macro-calculator" | "body-fat-calculator",
 *     email: string,
 *     result_summary?: string,
 *     result_json?: object,
 *     lang?: "ar" | "en",
 *     consent?: boolean
 *   }
 *
 * Returns:
 *   { ok: true, id: string, emailSent: boolean }
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
      consent = true,
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
      // Demo mode — no DB, but still try to send email
      const emailSentDemo = await sendEmail(cleanEmail, result_summary || "", tool_slug, lang || "ar");
      return NextResponse.json({ ok: true, demo: true, emailSent: emailSentDemo });
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

    // Send the email with results (server-side via Resend)
    const emailSent = await sendEmail(cleanEmail, result_summary || "", tool_slug, lang || "ar");

    return NextResponse.json({
      ok: true,
      id: data?.id,
      emailSent,
    });
  } catch (e: any) {
    console.error("[api/tools/lead] Exception:", e?.message || e);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

/**
 * Send an email with the user's results via Resend.
 * Requires RESEND_API_KEY env var to be set.
 */
async function sendEmail(
  toEmail: string,
  resultSummary: string,
  toolSlug: string,
  lang: string,
): Promise<boolean> {
  const resendApiKey = process.env.RESEND_API_KEY;
  const fromEmail = process.env.RESEND_FROM_EMAIL || "MuscleHub <onboarding@resend.dev>";

  if (!resendApiKey) {
    console.log("[api/tools/lead] No RESEND_API_KEY set — skipping email send");
    return false;
  }

  const isAr = lang !== "en";
  const toolNames: Record<string, { ar: string; en: string }> = {
    "calorie-calculator": { ar: "حاسبة السعرات", en: "Calorie Calculator" },
    "bmi-calculator": { ar: "حاسبة BMI", en: "BMI Calculator" },
    "macro-calculator": { ar: "حاسبة الماكروز", en: "Macro Calculator" },
    "body-fat-calculator": { ar: "حاسبة الدهون", en: "Body Fat Calculator" },
  };
  const toolName = isAr ? toolNames[toolSlug]?.ar : toolNames[toolSlug]?.en;

  const subject = isAr
    ? `نتائجك من ${toolName} | MuscleHub`
    : `Your ${toolName} results | MuscleHub`;

  // Escape HTML in the result summary to prevent injection
  const safeSummary = resultSummary
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");

  const html = isAr
    ? `
      <div dir="rtl" style="font-family: 'Cairo', Arial, sans-serif; max-width: 560px; margin: 0 auto; padding: 24px; background: #f9fafb;">
        <div style="background: white; border-radius: 24px; padding: 32px; border: 1px solid #e5e7eb;">
          <div style="text-align: center; margin-bottom: 24px;">
            <h1 style="font-size: 22px; font-weight: 600; color: #0071e3; margin: 0;">MuscleHub</h1>
            <p style="font-size: 12px; color: #6e6e73; margin: 4px 0 0;">كوتش أحمد زكي</p>
          </div>
          <h2 style="font-size: 20px; font-weight: 600; color: #1d1d1f; margin: 0 0 16px;">نتائجك من ${toolName}</h2>
          <p style="font-size: 16px; color: #6e6e73; margin: 0 0 24px;">مرحباً! بناءً على طلبك، دي نتائجك من الأداة:</p>
          <div style="background: #f5f5f7; border-radius: 16px; padding: 20px; font-size: 16px; color: #1d1d1f; line-height: 1.6; white-space: pre-wrap;">${safeSummary}</div>
          <div style="margin-top: 32px; padding-top: 24px; border-top: 1px solid #e5e7eb;">
            <p style="font-size: 14px; color: #6e6e73; margin: 0 0 16px;">عايز خطة مخصصة بالجرام بناءً على أرقامك؟</p>
            <a href="https://musclehubeg.vercel.app/pricing" style="display: inline-block; background: #0071e3; color: white; padding: 12px 24px; border-radius: 9999px; text-decoration: none; font-size: 14px;">احصل على خطة مخصصة ›</a>
          </div>
          <p style="font-size: 12px; color: #6e6e73; margin: 32px 0 0;">— كوتش أحمد زكي | MuscleHub</p>
        </div>
      </div>
    `
    : `
      <div style="font-family: -apple-system, Arial, sans-serif; max-width: 560px; margin: 0 auto; padding: 24px; background: #f9fafb;">
        <div style="background: white; border-radius: 24px; padding: 32px; border: 1px solid #e5e7eb;">
          <div style="text-align: center; margin-bottom: 24px;">
            <h1 style="font-size: 22px; font-weight: 600; color: #0071e3; margin: 0;">MuscleHub</h1>
            <p style="font-size: 12px; color: #6e6e73; margin: 4px 0 0;">Coach Ahmed Zake</p>
          </div>
          <h2 style="font-size: 20px; font-weight: 600; color: #1d1d1f; margin: 0 0 16px;">Your ${toolName} results</h2>
          <p style="font-size: 16px; color: #6e6e73; margin: 0 0 24px;">Hi! As requested, here are your tool results:</p>
          <div style="background: #f5f5f7; border-radius: 16px; padding: 20px; font-size: 16px; color: #1d1d1f; line-height: 1.6; white-space: pre-wrap;">${safeSummary}</div>
          <div style="margin-top: 32px; padding-top: 24px; border-top: 1px solid #e5e7eb;">
            <p style="font-size: 14px; color: #6e6e73; margin: 0 0 16px;">Want a personalized plan based on your numbers?</p>
            <a href="https://musclehubeg.vercel.app/pricing" style="display: inline-block; background: #0071e3; color: white; padding: 12px 24px; border-radius: 9999px; text-decoration: none; font-size: 14px;">Get a personalized plan ›</a>
          </div>
          <p style="font-size: 12px; color: #6e6e73; margin: 32px 0 0;">— Coach Ahmed Zake | MuscleHub</p>
        </div>
      </div>
    `;

  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${resendApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: fromEmail,
        to: toEmail,
        subject,
        html,
      }),
    });

    if (!res.ok) {
      const errText = await res.text();
      console.error("[api/tools/lead] Resend API error:", res.status, errText);
      return false;
    }

    const result = await res.json();
    console.log("[api/tools/lead] Email sent to", toEmail, "ID:", result.id);
    return true;
  } catch (e: any) {
    console.error("[api/tools/lead] Email send exception:", e?.message);
    return false;
  }
}
