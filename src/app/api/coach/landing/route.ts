import { NextRequest, NextResponse } from "next/server";
import { requireCoach, isAuthConfigured, type AuthUser } from "@/lib/auth-server";
import { supabaseAdmin, isSupabaseAdminConfigured } from "@/lib/supabase/admin";

/**
 * MULTI-COACH PHASE 2B — coach public landing page (self-promoted,
 * NOT in menus — owner answer 3 of the multi-coach design).
 *
 * GET  /api/coach/landing          → own page (or null) + suggested slug
 * PUT  /api/coach/landing          → upsert own page (coach = owner)
 *
 * The landing table (coach_pages) is created by migration 0031 — until
 * the owner runs it, GET returns page:null (the editor shows an empty
 * form and PUT reports the migration as missing).
 */

const SLUG_RE = /^[a-z0-9-]{3,40}$/;

export async function GET(request: NextRequest) {
  let user: AuthUser;
  if (isAuthConfigured) {
    const auth = await requireCoach(request);
    if (auth instanceof Response) return auth;
    user = auth;
  } else {
    return NextResponse.json({ error: "Auth not configured" }, { status: 500 });
  }

  if (!isSupabaseAdminConfigured || !supabaseAdmin) {
    return NextResponse.json({ error: "Server not configured" }, { status: 500 });
  }

  const { data, error } = await supabaseAdmin
    .from("coach_pages")
    .select("*")
    .eq("coach_id", user.id)
    .maybeSingle();

  if (error) {
    const code = (error as { code?: string }).code;
    // 42P01 = table missing (0031 not run yet) → treat as "no page yet"
    if (code !== "42P01" && code !== "PGRST116") {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
  }

  // Suggested slug: coach-<6 chars of id> (the coach edits it freely)
  const suggested = `coach-${user.id.slice(0, 6).toLowerCase()}`;

  return NextResponse.json({
    page: data ?? null,
    suggestedSlug: data?.slug ?? suggested,
  });
}

export async function PUT(request: NextRequest) {
  let user: AuthUser;
  if (isAuthConfigured) {
    const auth = await requireCoach(request);
    if (auth instanceof Response) return auth;
    user = auth;
  } else {
    return NextResponse.json({ error: "Auth not configured" }, { status: 500 });
  }

  if (!isSupabaseAdminConfigured || !supabaseAdmin) {
    return NextResponse.json({ error: "Server not configured" }, { status: 500 });
  }

  const body = await request.json().catch(() => ({} as Record<string, unknown>));
  const slug = String(body.slug ?? "").trim().toLowerCase();
  const headline = String(body.headline ?? "").slice(0, 140);
  const bio = String(body.bio ?? "").slice(0, 4000);
  // specialties arrive as an array of strings → stored one-per-line
  const specialties = Array.isArray(body.specialties)
    ? body.specialties.map((s: unknown) => String(s).slice(0, 80)).filter(Boolean).join("\n").slice(0, 800)
    : String(body.specialties ?? "").slice(0, 800);
  // English copy (migration 0032) — optional, same limits as the AR fields
  const headlineEn = String(body.headline_en ?? "").slice(0, 140);
  const bioEn = String(body.bio_en ?? "").slice(0, 4000);
  const specialtiesEn = Array.isArray(body.specialties_en)
    ? body.specialties_en.map((s: unknown) => String(s).slice(0, 80)).filter(Boolean).join("\n").slice(0, 800)
    : String(body.specialties_en ?? "").slice(0, 800);
  const isPublished = Boolean(body.is_published);

  if (!SLUG_RE.test(slug)) {
    return NextResponse.json(
      { error: "invalid_slug", message: "الرابط يجب أن يكون 3-40 حرفًا إنجليزيًا صغيرًا أو أرقامًا أو شرطة (-)" },
      { status: 400 },
    );
  }

  // The owner (admin) might edit his page too — both roles pass requireCoach.
  // Guard the profile role anyway: only staff may own a landing page.
  const { data: prof } = await supabaseAdmin
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();
  if (!prof || (prof.role !== "coach" && prof.role !== "admin")) {
    return NextResponse.json({ error: "Forbidden — staff only" }, { status: 403 });
  }

  const { data, error } = await supabaseAdmin
    .from("coach_pages")
    .upsert(
      {
        coach_id: user.id,
        slug,
        headline,
        bio,
        specialties,
        headline_en: headlineEn,
        bio_en: bioEn,
        specialties_en: specialtiesEn,
        is_published: isPublished,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "coach_id" },
    )
    .select()
    .maybeSingle();

  if (error) {
    const code = (error as { code?: string }).code;
    if (code === "23505") {
      return NextResponse.json(
        { error: "slug_taken", message: "هذا الرابط مستخدم بالفعل — اختر رابطًا آخر" },
        { status: 409 },
      );
    }
    if (code === "42P01") {
      return NextResponse.json(
        { error: "migration_missing", message: "جدول الصفحات غير موجود — شغّل هجرة 0031 في Supabase أولًا" },
        { status: 503 },
      );
    }
    if (code === "42703") {
      // Undefined column → the 0032 EN columns are not there yet
      return NextResponse.json(
        { error: "migration_missing_0032", message: "أعمدة النسخة الإنجليزية غير موجودة — شغّل هجرة 0032 في Supabase أولًا (raw link في المحادثة)" },
        { status: 503 },
      );
    }
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ page: data });
}
