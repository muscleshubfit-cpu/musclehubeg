import { NextRequest, NextResponse } from "next/server";
import { normalizeCoachPlanText } from "@/lib/plan-generator";
import { requireCoach, authRequired } from "@/lib/auth-server";

/**
 * Normalize a coach-pasted plan (free text, markdown, or loosely-structured
 * JSON) into the standard structured JSON format used by AI-generated plans.
 *
 * POST /api/plans/normalize
 * Body: {
 * text: string, // raw coach text (or JSON string)
 * planType: "nutrition" | "workout"
 * }
 *
 * Returns: { content, source }
 *
 * This is what makes coach-added plans behave like AI-generated plans:
 * - They get the same editable table UI in the PlanViewerModal.
 * - Clients get the per-meal regenerate button (because the meal items
 * are now structured with food/amount/calories).
 *
 * The endpoint tries OpenRouter's best free models in order. If all fail,
 * it falls back to wrapping the raw text in a minimal structure.
 */
export const maxDuration = 60; // Vercel Hobby cap (2026-08-27) — was 180 which exceeds Hobby

export async function POST(request: NextRequest) {
 try {
 // Coach-only — uses OpenRouter credits to normalize coach-pasted plans.
 let coachId: string | undefined;
 let coachRole: string | undefined;
 if (authRequired) {
 const auth = await requireCoach(request);
 if (auth instanceof Response) return auth;
 coachId = auth.id;
 coachRole = auth.role;
 }

 const body = await request.json();
 const { text, planType, clientId } = body as {
 text: string;
 planType: "nutrition" | "workout";
 clientId?: string;
 };

 if (!text || !text.trim()) {
 return NextResponse.json(
 { error: "Missing required field: text" },
 { status: 400 },
 );
 }

 if (planType !== "nutrition" && planType !== "workout") {
 return NextResponse.json(
 { error: "planType must be 'nutrition' or 'workout'" },
 { status: 400 },
 );
 }

 // ── OWNER DECREE (2026-08-30): no paid activation → no plan service.
 // Normalize burns OpenRouter credits, so a COACH (never admin) must
 // target his OWN assigned client AND that client must carry an ACTIVE
 // coaching subscription (the $6/$16 wallet activation). Mirrors the
 // /api/ai/jobs gate — the raw manual upload path is gated the same way.
 if (authRequired && coachRole === "coach") {
 const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
 if (!clientId || !UUID_RE.test(clientId)) {
 return NextResponse.json(
 { error: "افتح صفحة العميل ثم ارفع الخطة منه — الخطة محتاجة عميل محدد." },
 { status: 400 },
 );
 }
 const { supabaseAdmin, isSupabaseAdminConfigured } = await import(
 "@/lib/supabase/admin"
 );
 if (!isSupabaseAdminConfigured || !supabaseAdmin) {
 return NextResponse.json({ error: "Server not configured" }, { status: 501 });
 }
 const { data: owned } = await supabaseAdmin
 .from("coach_assignments")
 .select("client_id")
 .eq("client_id", clientId)
 .eq("coach_id", coachId!)
 .maybeSingle();
 if (!owned) {
 return NextResponse.json(
 { error: "العميل ده مش من عملاؤك — كل مدرب يدير خطط عملائه هو فقط." },
 { status: 403 },
 );
 }
 const nowIso = new Date().toISOString();
 const { data: activeCoaching } = await supabaseAdmin
 .from("subscriptions")
 .select("id")
 .eq("client_id", clientId)
 .eq("tier", "coaching")
 .eq("status", "active")
 .or(`end_date.is.null,end_date.gt.${nowIso}`)
 .limit(1)
 .maybeSingle();
 if (!activeCoaching) {
 return NextResponse.json(
 {
 error:
 "العميل ده لسه مش مفعّل — فعّل اشتراكه الأول من صفحته (شهر 6$ — ٣ شهور 16$ بتخصم من محفظتك) وبعدها تقدر تديله خطط.",
 code: "client_not_activated",
 },
 { status: 402 },
 );
 }
 }

 const result = await normalizeCoachPlanText(text, planType);
 return NextResponse.json(result);
 } catch (e) {
 const msg = e instanceof Error ? e.message : String(e);
 console.error("[api/plans/normalize] Error:", msg);
 return NextResponse.json(
 { error: msg || "Failed to normalize plan" },
 { status: 500 },
 );
 }
}
