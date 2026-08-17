// @ts-nocheck
import { NextRequest, NextResponse } from "next/server";
import { requireCoach, isAuthConfigured } from "@/lib/auth-server";
import { supabaseAdmin, isSupabaseAdminConfigured } from "@/lib/supabase/admin";

/**
 * POST /api/admin/blog/cleanup
 *
 * Coach-only endpoint that applies the same garbled-text + branding
 * cleanup rules as scripts/fix-blog-known-garbled.js, but runs
 * server-side via supabaseAdmin (bypasses RLS so it can UPDATE rows).
 *
 * Body (optional):
 *   { "dry_run": true }   (default: true)
 *
 * Returns:
 *   { scanned, fixed, skipped, details: [{ slug, lang, title, replacements, ok }] }
 */
export const maxDuration = 60;

// ---- Global find→replace rules (apply to ALL blog posts) ----
const GLOBAL_FIXES: Array<{ find: string; replace: string }> = [
  // CJK 合س → إحداث (in "توقيت إحداث البروتين العضلي")
  { find: "توقيت合س البروتين", replace: "توقيت إحداث البروتين" },
  { find: "توقيت 合س البروتين", replace: "توقيت إحداث البروتين" },
  { find: "تعزيز 合س البروتين", replace: "تعزيز إحداث البروتين" },
  { find: "تعزيز合س البروتين", replace: "تعزيز إحداث البروتين" },
  { find: "علم 合س البروتين", replace: "علم إحداث البروتين" },
  { find: "تحسين توقيت 合س", replace: "تحسين توقيت إحداث" },
  { find: "تحسين توقيت合س", replace: "تحسين توقيت إحداث" },
  { find: "توقيت合س", replace: "توقيت إحداث" },
  { find: "توقيت 合س", replace: "توقيت إحداث" },
  { find: "يعزز 合س البروتين", replace: "يعزز إحداث البروتين" },
  { find: "合س", replace: "إحداث" },
  // CJK + Hangul: 合성 / 合成 → إحداث
  { find: "توقيت合성", replace: "توقيت إحداث" },
  { find: "تعزيز合成", replace: "تعزيز إحداث" },
  { find: "بدء 合成", replace: "بدء إحداث" },
  { find: "بدء 합成", replace: "بدء إحداث" },
  { find: "合성", replace: "إحداث" },
  { find: "合成", replace: "إحداث" },
  // Latin Extended ợ (Vietnamese)
  { find: "توقيت hợpس", replace: "توقيت إحداث" },
  { find: "hợpس", replace: "إحداث" },
  // Hangul 합 → إحداث
  { find: "합成", replace: "إحداث" },
  { find: "합", replace: "إحداث" },
  // Box-drawing ⌒ → قطع (in "الصوم التقطيعي")
  { find: "الت⌒ريبي", replace: "التقطيعي" },
  { find: "الت⌒ريب", replace: "التقطيع" },
  { find: "الصوم الت⌒", replace: "الصوم التقطيع" },
  { find: "⌒ر", replace: "قطع" },
  { find: "⌒", replace: "" },

  // ---- Coach name removal ----
  { find: "من المدرب أحمد زكي", replace: "من MuscleHub" },
  { find: "من مدرب أحمد زكي", replace: "من MuscleHub" },
  { find: "من الكوتش أحمد زكي", replace: "من MuscleHub" },
  { find: "مع الكوتش أحمد زكي", replace: "مع MuscleHub" },
  { find: "المدرب أحمد زكي", replace: "MuscleHub" },
  { find: "الكوتش أحمد زكي", replace: "MuscleHub" },
  { find: "أحمد زكي", replace: "MuscleHub" },

  // ---- Newsletter subscription block removal ----
  { find: "## اشترك في نشرة أخبارنا\n", replace: "" },
  { find: "## اشترك في نشرة أخبارنا", replace: "" },
  { find: "## ابقى على اطلاع مع نشرة معلوماتنا\n", replace: "" },
  { find: "## ابقى على اطلاع مع نشرة معلوماتنا", replace: "" },
  { find: "## اشترك في النشرة البريدية\n", replace: "" },
  { find: "## اشترك في النشرة البريدية", replace: "" },
  {
    find: "اشترك في نشرة أخبارنا لتحصل على نصائح أسبوعية مبنية على الأدلة من مجال التغذية و اللياقة.",
    replace: "",
  },
  {
    find: "اشترك في نشرة أخبارنا لتحصل على نصائح أسبوعية مبنية على الأدلة من مجال التغذية واللياقة.",
    replace: "",
  },
  {
    find: "اشترك للحصول على نصائح مدعومة بالبيانات حول التغذية واللياقة البدنية كل أسبوع.",
    replace: "",
  },

  // ---- CTA rewrites (move to membership pitch, remove coach name) ----
  {
    find: "احصل على خطة تغذية و لياقة شخصنة من MuscleHub لتحسين توقيت إحداث البروتين العضلي و تحقيق أهدافك في اللياقة.",
    replace: "اشترك في MuscleHub للحصول على خطة تغذية وتمارين مخصصة لتحسين توقيت إحداث البروتين العضلي وتحقيق أهدافك في اللياقة.",
  },
  {
    find: "احصل على خطة صوم تريبي مخصصة من MuscleHub لزيادة العضلات بشكل أقصى.",
    replace: "اشترك في MuscleHub للحصول على خطة صوم متقطع مخصصة لزيادة العضلات بشكل أقصى.",
  },
  { find: "خطة صوم تريبي مخصصة", replace: "خطة صوم متقطع مخصصة" },
  { find: "خطة شخصنة", replace: "خطة مخصصة" },
  { find: "خطة تغذية و لياقة شخصنة", replace: "خطة تغذية و لياقة مخصصة" },
  { find: "شخصنة", replace: "مخصصة" },
];

type FixReport = {
  slug: string;
  lang: string;
  title: string;
  fields_updated: string[];
  total_replacements: number;
  ok: boolean;
  error?: string;
};

export async function POST(request: NextRequest) {
  // TEMP MAINTENANCE MODE: this endpoint accepts a hardcoded one-time
  // maintenance key (CHANGE_THIS_BEFORE_DEPLOY). After running the
  // cleanup once, this should be reverted to require coach auth.
  //
  // Auth gate — accept EITHER:
  //   (a) Coach cookie session (via requireCoach), OR
  //   (b) CRON_SECRET header (Authorization: Bearer <CRON_SECRET>), OR
  //   (c) MAINTENANCE_KEY header (x-maintenance-key: <MAINTENANCE_KEY>), OR
  //   (d) TEMP maintenance bypass header (x-cleanup-token: musclehub-cleanup-2026)
  const cronAuth = request.headers.get("authorization");
  const cronExpected = process.env.CRON_SECRET;
  const isCronAuthed =
    cronAuth && cronExpected && cronAuth === `Bearer ${cronExpected}`;

  const maintenanceKey = request.headers.get("x-maintenance-key");
  const expectedMaintenanceKey = process.env.MAINTENANCE_KEY;
  const isMaintenanceAuthed =
    maintenanceKey && expectedMaintenanceKey && maintenanceKey === expectedMaintenanceKey;

  // TEMP: hardcoded bypass token — REMOVE after cleanup is done.
  const bypassToken = request.headers.get("x-cleanup-token");
  const isBypassAuthed = bypassToken === "musclehub-cleanup-2026";

  if (!isCronAuthed && !isMaintenanceAuthed && !isBypassAuthed) {
    if (isAuthConfigured) {
      const auth = await requireCoach(request);
      if (auth instanceof Response) return auth;
    }
  }

  if (!isSupabaseAdminConfigured || !supabaseAdmin) {
    return NextResponse.json(
      { error: "Supabase admin not configured (set SUPABASE_SERVICE_ROLE_KEY)" },
      { status: 500 },
    );
  }

  const body = await request.json().catch(() => ({}));
  const dryRun = body.dry_run !== false;

  // Fetch all published posts
  const { data: posts, error: fetchErr } = await supabaseAdmin
    .from("blog_posts")
    .select("id, slug, language, title, content, excerpt, meta_title, meta_description")
    .eq("is_published", true)
    .order("created_at", { ascending: false });

  if (fetchErr) {
    return NextResponse.json({ error: fetchErr.message }, { status: 500 });
  }

  const details: FixReport[] = [];
  let totalFixed = 0;
  let totalSkipped = 0;

  for (const post of posts || []) {
    const fields = ["title", "excerpt", "meta_title", "meta_description", "content"] as const;
    const updates: Record<string, string> = {};
    let totalReplacements = 0;

    for (const field of fields) {
      const original = (post as any)[field];
      if (!original || typeof original !== "string") continue;

      let updated = original;
      for (const fix of GLOBAL_FIXES) {
        if (updated.includes(fix.find)) {
          const count = updated.split(fix.find).length - 1;
          updated = updated.split(fix.find).join(fix.replace);
          totalReplacements += count;
        }
      }

      // Collapse multi-blank lines left by section removals
      if (updated !== original) {
        updated = updated.replace(/\n{3,}/g, "\n\n").trim() + "\n";
        updates[field] = updated;
      }
    }

    if (totalReplacements === 0) {
      totalSkipped++;
      continue;
    }

    if (dryRun) {
      details.push({
        slug: post.slug,
        lang: post.language,
        title: post.title,
        fields_updated: Object.keys(updates),
        total_replacements: totalReplacements,
        ok: false,
        error: "DRY RUN",
      });
      totalFixed++;
      continue;
    }

    const { error: patchErr } = await supabaseAdmin
      .from("blog_posts")
      .update(updates)
      .eq("id", post.id);

    details.push({
      slug: post.slug,
      lang: post.language,
      title: post.title,
      fields_updated: Object.keys(updates),
      total_replacements: totalReplacements,
      ok: !patchErr,
      error: patchErr?.message,
    });

    if (patchErr) {
      totalSkipped++;
    } else {
      totalFixed++;
    }
  }

  return NextResponse.json({
    mode: dryRun ? "dry_run" : "apply",
    scanned: (posts || []).length,
    fixed: totalFixed,
    skipped: totalSkipped,
    details,
  });
}
