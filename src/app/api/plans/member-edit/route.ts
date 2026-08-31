import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/auth-server";
import { supabaseAdmin, isSupabaseAdminConfigured } from "@/lib/supabase/admin";
import { countThisMonthPlanUsage, type EvoPlanKind } from "@/lib/tier-limits";

/**
 * POST /api/plans/member-edit — Phase 69 (owner-approved).
 *
 * The plans RLS (0030B) lets COACHES insert/update plan rows — the MEMBER
 * is read-only by design. Two member-facing features need controlled
 * writes, so they run here with ownership verified server-side:
 *
 * 1. mode "save-evo"  — «حفظ خطط ايفو كخطط حقيقية»: persist an EVO chat
 *    plan (text) as a real plans row the member sees in /plans.
 *      body: { mode: "save-evo", kind: "meal"|"workout", title, text }
 *    Anti-spam: monthly cap per kind (30) + length caps. The plan quota
 *    itself was already enforced at generation time — this only gates
 *    the save step.
 *
 * 2. mode "swap" — «حفظ نتيجة الاستبدال»: persist the mutated content
 *    after an AI meal/exercise swap (previously the swap died on reload).
 *      body: { mode: "swap", planId, content }
 *    Ownership: the plan row MUST belong to the caller (service-role
 *    check — never trusts the body beyond that).
 */
const MAX_TITLE = 120;
const MAX_TEXT = 20_000;
const EVO_SAVE_MONTHLY_CAP = 30;

export async function POST(request: NextRequest) {
  const auth = await requireUser(request);
  if (auth instanceof Response) return auth;

  if (!isSupabaseAdminConfigured || !supabaseAdmin) {
    return NextResponse.json({ error: "Server not configured" }, { status: 500 });
  }

  const body = await request.json().catch(() => ({} as Record<string, unknown>));
  const mode = String(body.mode ?? "").trim();

  // ── save-evo ─────────────────────────────────────────────────────────
  if (mode === "save-evo") {
    const kindRaw = String(body.kind ?? "").trim();
    const kind: EvoPlanKind | null =
      kindRaw === "nutrition" || kindRaw === "meal"
        ? "nutrition"
        : kindRaw === "workout"
          ? "workout"
          : null;
    const title = String(body.title ?? "").trim().slice(0, MAX_TITLE);
    const text = String(body.text ?? "").slice(0, MAX_TEXT);

    if (!kind || title.length < 3 || text.trim().length < 20) {
      return NextResponse.json(
        { error: "bad_request", message: "بيانات الخطة غير مكتملة" },
        { status: 400 },
      );
    }

    // Anti-spam cap: EVO-sourced plans per kind per month.
    // Phase 71 — staff bypass (owner decree: admin unlimited everywhere).
    if (auth.is_staff !== true) {
      const used = await countThisMonthPlanUsage(auth.id, kind);
      if (used >= EVO_SAVE_MONTHLY_CAP) {
        return NextResponse.json(
          { error: "quota_exceeded", message: "وصلت الحد الأقصى للخطط المحفوظة هذا الشهر" },
          { status: 429 },
        );
      }
    }

    const planType = kind === "nutrition" ? "meal" : "workout";
    const { data: plan, error } = await supabaseAdmin
      .from("plans")
      .insert({
        client_id: auth.id,
        type: planType,
        title,
        notes: null,
        file_url: null,
        content: { text: text.trim(), source: "evo" },
        status: "approved",
        is_current: true,
        approved_at: new Date().toISOString(),
      })
      .select("id, title, type")
      .single();

    if (error) {
      console.error("[api/plans/member-edit] save-evo error:", error.message);
      return NextResponse.json(
        { error: "insert_failed", message: "تعذر حفظ الخطة — جرب تاني" },
        { status: 500 },
      );
    }

    return NextResponse.json({ ok: true, plan });
  }

  // ── swap ─────────────────────────────────────────────────────────────
  if (mode === "swap") {
    const planId = String(body.planId ?? "").trim();
    const content = body.content;
    if (!planId || !content || typeof content !== "object") {
      return NextResponse.json(
        { error: "bad_request", message: "بيانات الاستبدال غير مكتملة" },
        { status: 400 },
      );
    }

    // Ownership gate — service-role read, the member may only persist
    // swaps to HIS OWN plan rows
    const { data: plan } = await supabaseAdmin
      .from("plans")
      .select("id, client_id")
      .eq("id", planId)
      .maybeSingle();

    if (!plan || (plan as { client_id: string }).client_id !== auth.id) {
      return NextResponse.json(
        { error: "not_found", message: "الخطة غير موجودة" },
        { status: 404 },
      );
    }

    const { error } = await supabaseAdmin
      .from("plans")
      .update({ content })
      .eq("id", planId);
    if (error) {
      console.error("[api/plans/member-edit] swap persist error:", error.message);
      return NextResponse.json(
        { error: "update_failed", message: "تعذر حفظ الاستبدال" },
        { status: 500 },
      );
    }

    return NextResponse.json({ ok: true });
  }

  return NextResponse.json({ error: "unknown_mode" }, { status: 400 });
}
