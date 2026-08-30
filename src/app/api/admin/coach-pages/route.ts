import { NextRequest, NextResponse } from "next/server";
import { requireAdmin, isAuthConfigured } from "@/lib/auth-server";
import { supabaseAdmin, isSupabaseAdminConfigured } from "@/lib/supabase/admin";

/**
 * ADMIN — COACH PAGES REVIEW (0046).
 * Owner request: «ضيف فى داشبورد الادمن قائمة جديدة لعرض صفحات المدربين
 * لمراجعتها والموافقة او الرفض عليها مع ارسال السبب (لان المدربين بيكتبوا
 * بنفسهم المحتوى المرئى على صفحاتهم)»
 *
 * GET   → every coach_pages row + coach identity + review state,
 *         pending first, then most-recently-edited first.
 * PATCH → { coach_id, action: "approve" | "reject", note? }
 *         - approve: page goes live (is_published + approved rule).
 *         - reject : note REQUIRED (3–500 chars) — the reason is shown to
 *                    the coach inside /coach/landing (editor banner) and
 *                    the page stays hidden from the public until he edits
 *                    again (edit → pending automatically).
 *
 * DELIVERY (0049): the result — and the rejection reason — now ALSO land
 * in the coach's own bell. admin_notifications rows with target_coach_id
 * set are PRIVATE to that coach (RLS: admin or the targeted staff member
 * only), so no feedback leaks to other coaches. Approve → link to the
 * live public page; reject → link to the landing editor. Best-effort:
 * a notification failure never fails the review action itself.
 *
 * Migration guard: before RUN_ON_SUPABASE_0046 the review columns are
 * missing (42703) — GET reports migration_missing instead of crashing.
 */

type CoachPageRow = {
  coach_id: string;
  slug: string;
  headline: string | null;
  bio: string | null;
  headline_en: string | null;
  is_published: boolean | null;
  review_status: string | null;
  review_note: string | null;
  reviewed_at: string | null;
  updated_at: string | null;
  photo_url: string | null;
};

export async function GET(request: NextRequest) {
  if (isAuthConfigured) {
    const auth = await requireAdmin(request);
    if (auth instanceof Response) return auth;
  }

  if (!isSupabaseAdminConfigured || !supabaseAdmin) {
    return NextResponse.json({ error: "Server not configured" }, { status: 500 });
  }

  const { data, error } = await (supabaseAdmin.from("coach_pages") as any)
    .select(
      "coach_id, slug, headline, bio, headline_en, is_published, review_status, review_note, reviewed_at, updated_at, photo_url",
    )
    .order("updated_at", { ascending: false });

  if (error) {
    const code = (error as { code?: string }).code;
    if (code === "42P01") {
      // 0031 not run — no coach_pages table at all.
      return NextResponse.json({ pages: [], migration_missing: "0031" });
    }
    if (code === "42703") {
      return NextResponse.json(
        { error: "migration_missing", message: "أعمدة المراجعة غير موجودة — شغّل هجرة 0046 في Supabase أولًا" },
        { status: 503 },
      );
    }
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const rows = (data ?? []) as CoachPageRow[];

  // Phase 51 — include EVERY staff member, even those who never created a
  // page (review_status «missing»): the owner sees who is lagging and can
  // send the manual «أكمل إعداد صفحتك» reminder. This is also where a
  // brand-new coach appears (he gets no coach_pages row until his first
  // save). Left-join: all staff profiles ↔ their (optional) page row.
  const { data: staffRows, error: staffErr } = await supabaseAdmin
    .from("profiles")
    .select("id, full_name, email, role, avatar_url")
    .in("role", ["coach", "admin"]);
  if (staffErr) {
    return NextResponse.json({ error: staffErr.message }, { status: 500 });
  }
  const profMap = new Map(
    ((staffRows ?? []) as Array<Record<string, unknown>>).map((p) => [String(p.id), p]),
  );
  const pageByCoach = new Map(rows.map((r) => [r.coach_id, r]));
  // Legacy safety: a coach_pages row whose owner is no longer staff still
  // shows up (profile fetched separately) instead of silently vanishing.
  const orphanIds = Array.from(new Set(rows.map((r) => r.coach_id))).filter(
    (id) => !profMap.has(id),
  );
  if (orphanIds.length > 0) {
    const { data: orph } = await supabaseAdmin
      .from("profiles")
      .select("id, full_name, email, role, avatar_url")
      .in("id", orphanIds);
    ((orph ?? []) as Array<Record<string, unknown>>).forEach((p) =>
      profMap.set(String(p.id), p),
    );
  }

  type Prof = {
    id: string;
    full_name: string | null;
    email: string | null;
    role: string;
    avatar_url: string | null;
  };
  const toPage = (prof: Prof, r?: CoachPageRow) => ({
    coach_id: prof.id,
    coach_name: prof.full_name || "—",
    coach_email: prof.email || "",
    coach_role: prof.role || "",
    slug: r?.slug || "",
    headline: r?.headline || r?.headline_en || "",
    is_published: Boolean(r?.is_published),
    review_status: r ? r.review_status || "approved" : "missing",
    review_note: r?.review_note || "",
    reviewed_at: r?.reviewed_at ?? null,
    updated_at: r?.updated_at ?? null,
    photo_url: r?.photo_url || "",
  });

  const pages = (
    ((staffRows ?? []) as Prof[]).map((prof) => toPage(prof, pageByCoach.get(prof.id)))
    // orphan page rows (owner not staff anymore)
    .concat(
      rows
        .filter((r) => !((staffRows ?? []) as Prof[]).some((p) => p.id === r.coach_id))
        .map((r) =>
          toPage(
            (profMap.get(r.coach_id) as Prof | undefined) ?? {
              id: r.coach_id,
              full_name: null,
              email: null,
              role: "",
              avatar_url: null,
            },
            r,
          ),
        ),
    )
    // Pending first (the work queue), then «missing» (never finished
    // setup), then rejected, then approved — most recently edited first
    // inside each group.
    .sort((a, b) => {
      const rank = (s: string) =>
        s === "pending" ? 0 : s === "missing" ? 1 : s === "rejected" ? 2 : 3;
      const ra = rank(a.review_status);
      const rb = rank(b.review_status);
      if (ra !== rb) return ra - rb;
      return (b.updated_at || "").localeCompare(a.updated_at || "");
    })
  );

  const counts = {
    total: pages.length,
    pending: pages.filter((p) => p.review_status === "pending").length,
    rejected: pages.filter((p) => p.review_status === "rejected").length,
    approved: pages.filter((p) => p.review_status === "approved").length,
    // Phase 51: staff who never created a page at all.
    missing: pages.filter((p) => p.review_status === "missing").length,
  };

  return NextResponse.json({ pages, counts });
}

export async function PATCH(request: NextRequest) {
  if (isAuthConfigured) {
    const auth = await requireAdmin(request);
    if (auth instanceof Response) return auth;
  }

  if (!isSupabaseAdminConfigured || !supabaseAdmin) {
    return NextResponse.json({ error: "Server not configured" }, { status: 500 });
  }

  const body = await request.json().catch(() => ({} as Record<string, unknown>));
  const coachId = String(body.coach_id ?? "");
  const action = String(body.action ?? "");
  const note = String(body.note ?? "").trim().slice(0, 500);

  if (!coachId || (action !== "approve" && action !== "reject")) {
    return NextResponse.json(
      { error: "bad_request", message: "coach_id و action (approve|reject) مطلوبان" },
      { status: 400 },
    );
  }
  if (action === "reject" && note.length < 3) {
    return NextResponse.json(
      { error: "note_required", message: "اكتب سبب الرفض (٣ أحرف على الأقل) — المدرب هيشوفه في محرر صفحته" },
      { status: 400 },
    );
  }

  const { data, error } = await (supabaseAdmin.from("coach_pages") as any)
    .update({
      review_status: action === "approve" ? "approved" : "rejected",
      review_note: action === "approve" ? "" : note,
      reviewed_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq("coach_id", coachId)
    .select("coach_id, slug, review_status, review_note")
    .maybeSingle();

  if (error) {
    const code = (error as { code?: string }).code;
    if (code === "42703") {
      return NextResponse.json(
        { error: "migration_missing", message: "أعمدة المراجعة غير موجودة — شغّل هجرة 0046 في Supabase أولًا" },
        { status: 503 },
      );
    }
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  if (!data) {
    return NextResponse.json(
      { error: "not_found", message: "مفيش صفحة للمدرب ده" },
      { status: 404 },
    );
  }

  // 0049 — review result → the coach's own bell (private via
  // target_coach_id). Approve celebrates + links to the live page;
  // reject carries the reason in the body and links to the editor.
  const approved = action === "approve";
  const approvedSlug =
    approved && typeof (data as { slug?: string }).slug === "string"
      ? (data as { slug: string }).slug
      : "";
  const { error: notifErr } = await supabaseAdmin.from("admin_notifications").insert({
    type: approved ? "coach_page_approved" : "coach_page_rejected",
    title: approved ? "تمت الموافقة على صفحتك العامة" : "صفحتك العامة تحتاج تعديل",
    body: approved
      ? "صفحتك ظهرت للجميع على صفحة المدربين — شكرًا لاجتهادك."
      : `سبب الرفض: ${note}`,
    link: approvedSlug ? `/coaches/${approvedSlug}` : "/coach/landing",
    target_role: "coach",
    target_coach_id: coachId,
    read: false,
  });
  if (notifErr) {
    // Best-effort only — the review action itself already succeeded.
    console.error("[coach-pages] coach notification failed:", notifErr.message);
  }

  return NextResponse.json({ ok: true, page: data });
}
