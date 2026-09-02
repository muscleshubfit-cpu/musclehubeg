import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/auth-server";
import { supabaseAdmin, isSupabaseAdminConfigured } from "@/lib/supabase/admin";

/**
 * MY COACH'S WHATSAPP (0037, owner directive: «زرار تواصل واتساب يظهر
 * للعملاء بعد تفعيل اشتراكهم — المدرب يضيف رقم واتساب الخاص به»).
 *
 * GET /api/my/coach-whatsapp → { phone: string | null }
 *
 * GATE LAW (server-side, non-spoofable):
 *   1. the caller is authenticated;
 *   2. his PRIMARY subscription is ACTIVE (status='active' AND
 *      end_date > now — mirrors the app's own isActive rule);
 *   3. he has an assigned coach (coach_assignments);
 *   4. that coach saved a WhatsApp number on his page record
 *      (coach_pages.whatsapp_phone — read service-side, so the RLS
 *      publish state of the coach's page is irrelevant).
 *
 * The number NEVER reaches the public landing page or any visitor —
 * only the coach's own activated client. Returning {phone:null} (not
 * an error) for every non-matching case keeps the client UI simple.
 */

export async function GET(request: NextRequest) {
  const auth = await requireUser(request);
  if (auth instanceof Response) return auth;

  if (!isSupabaseAdminConfigured || !supabaseAdmin) {
    return NextResponse.json({ error: "Server not configured" }, { status: 500 });
  }

  // ── Gate 1+2: an ACTIVE subscription (same rule the app displays). ──
  const { data: sub } = await supabaseAdmin
    .from("subscriptions")
    .select("id")
    .eq("client_id", auth.id)
    .eq("status", "active")
    .gt("end_date", new Date().toISOString())
    .limit(1)
    .maybeSingle();

  if (!sub) return NextResponse.json({ phone: null });

  // ── Gate 3: his assigned coach. ──
  const { data: assignment } = await supabaseAdmin
    .from("coach_assignments")
    .select("coach_id")
    .eq("client_id", auth.id)
    .limit(1)
    .maybeSingle();

  if (!assignment?.coach_id) return NextResponse.json({ phone: null });

  // ── Gate 4: the coach saved his WhatsApp number. ──
  const { data: page } = await supabaseAdmin
    .from("coach_pages")
    .select("whatsapp_phone")
    .eq("coach_id", assignment.coach_id)
    .maybeSingle();

  const phone = String(page?.whatsapp_phone ?? "").trim();
  return NextResponse.json({ phone: phone || null });
}
