import { supabaseAdmin, isSupabaseAdminConfigured } from "@/lib/supabase/admin";

/**
 * MULTI-COACH PHASE 2B (i18n follow-up) — server-side fetch + per-lang
 * copy resolution for the PUBLIC coach landing page.
 *
 * Mirror law (same as the blog): EN canonical /coaches/{slug} + AR
 * mirror /ar/coaches/{slug}. Migration 0031 created coach_pages (AR
 * content); migration 0032 added the EN columns. Both page routes share
 * THIS fetch — service-role (RLS-independent), published-only, proper
 * 404 via null.
 *
 * FALLBACK LAW: a coach may fill only one language. EN page renders
 * headline_en || headline (AR), AR page renders headline || headline_en
 * — so a half-filled page NEVER shows an empty section, and a
 * single-language page works on both mirrors exactly like today.
 */

export type CoachLandingCopy = {
  headline: string;
  bio: string;
  specialties: string[];
};

/** One client-result photo (0037) — public URL + optional caption. */
export type CoachResultPhoto = { url: string; caption: string };

/** One coach certificate (0049) — public URL + certificate name. */
export type CoachCertificate = { url: string; title: string };

/** Social links (0037) — empty string = not set. */
export type CoachSocialLinks = {
  instagram: string;
  facebook: string;
  tiktok: string;
  youtube: string;
};

export type CoachLandingData = {
  slug: string;
  is_published: boolean;
  /** 0046 review state — public fetch guarantees "approved"; the STAFF
   * PREVIEW fetch (Phase 58) returns the raw state so the preview banner
   * can say whether the page is pending/rejected/unpublished. */
  review_status?: string | null;
  /** Owning coach's profile id — the /preview route compares it with the
   * logged-in user to let a coach preview ONLY his own page. */
  coach_id?: string;
  coach_name: string;
  coach_avatar: string | null;
  /** 0037 — coach-uploaded personal photo (public bucket), beats avatar */
  photo_url: string | null;
  /** 0037 — client results photos gallery */
  results_photos: CoachResultPhoto[];
  /** 0049 — coach certificates gallery (OPTIONAL — empty hides the section) */
  certificates: CoachCertificate[];
  /** 0037 — social profile links */
  social: CoachSocialLinks;
  /** Arabic content (0031 columns) */
  ar: CoachLandingCopy;
  /** English content (0032 columns) */
  en: CoachLandingCopy;
};

function splitSpecialties(raw: string | null | undefined): string[] {
  return (raw || "").split("\n").map((s) => s.trim()).filter(Boolean);
}

/** 0037 — defensive jsonb parse of the results-photos array. */
function parseResultsPhotos(raw: unknown): CoachResultPhoto[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .slice(0, 6)
    .map((item) => {
      const rec = (item ?? {}) as Record<string, unknown>;
      const url = typeof rec.url === "string" ? rec.url : "";
      const caption = typeof rec.caption === "string" ? rec.caption.slice(0, 120) : "";
      return url ? { url, caption } : null;
    })
    .filter((x): x is CoachResultPhoto => x !== null);
}

/**
 * 0049 — defensive jsonb parse of the certificates array.
 * Exported for unit tests. Max 8; url required; title optional (≤120).
 */
export function parseCertificates(raw: unknown): CoachCertificate[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .slice(0, 8)
    .map((item) => {
      const rec = (item ?? {}) as Record<string, unknown>;
      const url = typeof rec.url === "string" ? rec.url : "";
      const title = typeof rec.title === "string" ? rec.title.slice(0, 120) : "";
      return url ? { url, title } : null;
    })
    .filter((x): x is CoachCertificate => x !== null);
}

/**
 * Internal: load a coach_pages row by slug (service role, RLS-independent)
 * and shape it into CoachLandingData. NO publish/review gates here — the
 * two callers decide who may see non-approved content:
 *   fetchCoachLanding        → PUBLIC (gates: published + approved)
 *   fetchCoachLandingForPreview → STAFF PREVIEW (no gates; caller
 *                               authorizes admin-or-owning-coach).
 */
async function fetchCoachLandingRow(
  slug: string,
): Promise<CoachLandingData | null> {
  if (!isSupabaseAdminConfigured || !supabaseAdmin) return null;

  // review_status is read defensively: before migration 0046 runs, the
  // column doesn't exist (42703) → fall back to the legacy select and
  // treat every row as approved (pre-0046 behaviour preserved).
  // NOTE: certificates are NOT part of this select — they're fetched
  // separately below so a missing 0049 column can NEVER break the load
  // (pending/rejected pages must stay hidden from the public regardless).
  const { data: page, error: pageErr } = await supabaseAdmin
    .from("coach_pages")
    .select(
      "slug, headline, bio, specialties, headline_en, bio_en, specialties_en, is_published, review_status, coach_id, photo_url, results_photos, instagram_url, facebook_url, tiktok_url, youtube_url",
    )
    .eq("slug", slug)
    .maybeSingle();

  let pageRow = page;
  // PGRST204 (schema-cache miss) or 42703 (undefined column) → the
  // review columns don't exist yet (0046 not run). Fall back to the
  // legacy select WITHOUT them and treat every row as approved
  // (pre-0046 behaviour preserved).
  if (
    pageErr &&
    (pageErr.code === "42703" || pageErr.code === "PGRST204")
  ) {
    const { data: legacy } = await supabaseAdmin
      .from("coach_pages")
      .select(
        "slug, headline, bio, specialties, headline_en, bio_en, specialties_en, is_published, coach_id, photo_url, results_photos, instagram_url, facebook_url, tiktok_url, youtube_url",
      )
      .eq("slug", slug)
      .maybeSingle();
    pageRow = legacy ? { ...legacy, review_status: "approved" } : null;
  }

  if (!pageRow) return null;

  // 0049 — certificates fetch is a SEPARATE lightweight query: if the
  // column is missing (0049 not run yet) the error is swallowed and the
  // section stays empty/hidden — nothing else is affected.
  const { data: certRow } = await supabaseAdmin
    .from("coach_pages")
    .select("certificates")
    .eq("slug", slug)
    .maybeSingle();
  const certRaw = certRow && Array.isArray(certRow.certificates) ? certRow.certificates : [];

  const { data: prof } = await supabaseAdmin
    .from("profiles")
    .select("full_name, avatar_url, role")
    .eq("id", pageRow.coach_id)
    .maybeSingle();

  if (!prof || (prof.role !== "coach" && prof.role !== "admin")) return null;

  return {
    slug: pageRow.slug,
    is_published: pageRow.is_published,
    review_status: pageRow.review_status ?? "approved",
    coach_id: pageRow.coach_id,
    coach_name: prof.full_name || "",
    coach_avatar: prof.avatar_url || null,
    photo_url: pageRow.photo_url || null,
    results_photos: parseResultsPhotos(pageRow.results_photos),
    // 0049 — empty before the migration runs → public section hides itself.
    certificates: parseCertificates(certRaw),
    social: {
      instagram: pageRow.instagram_url || "",
      facebook: pageRow.facebook_url || "",
      tiktok: pageRow.tiktok_url || "",
      youtube: pageRow.youtube_url || "",
    },
    ar: {
      headline: pageRow.headline || "",
      bio: pageRow.bio || "",
      specialties: splitSpecialties(pageRow.specialties),
    },
    en: {
      headline: pageRow.headline_en || "",
      bio: pageRow.bio_en || "",
      specialties: splitSpecialties(pageRow.specialties_en),
    },
  };
}

export async function fetchCoachLanding(
  slug: string,
): Promise<CoachLandingData | null> {
  const data = await fetchCoachLandingRow(slug);
  if (!data) return null;

  // 0046 REVIEW GATE — the public page renders ONLY approved content.
  if (!data.is_published) return null;
  if ((data.review_status ?? "approved") !== "approved") return null;

  return data;
}

/**
 * PHASE 58 — STAFF-ONLY preview loader. Same data as the public page but
 * WITHOUT the publish/review gates: the admin review console and the
 * coach's own landing editor need to see PENDING / REJECTED / UNPUBLISHED
 * pages before approval (the public mirrors 404 those on purpose — that
 * is the 0046/0048 protection working as designed).
 *
 * AUTHORIZATION IS THE CALLER'S JOB: the /preview/coach/[slug] route
 * allows the admin (any page) and the owning coach (his own row only);
 * everyone else gets a 404. Never expose this fetch on a public route.
 */
export async function fetchCoachLandingForPreview(
  slug: string,
): Promise<CoachLandingData | null> {
  return fetchCoachLandingRow(slug);
}

/**
 * Resolve the copy a given language mirror should render, with the
 * cross-language fallback described above.
 */
export function resolveLandingCopy(
  data: CoachLandingData,
  lang: "en" | "ar",
): CoachLandingCopy {
  if (lang === "ar") {
    return {
      headline: data.ar.headline || data.en.headline,
      bio: data.ar.bio || data.en.bio,
      specialties: data.ar.specialties.length
        ? data.ar.specialties
        : data.en.specialties,
    };
  }
  return {
    headline: data.en.headline || data.ar.headline,
    bio: data.en.bio || data.ar.bio,
    specialties: data.en.specialties.length
      ? data.en.specialties
      : data.ar.specialties,
  };
}

/** Fallback display name when the profile has no full_name yet. */
export function coachDisplayName(data: CoachLandingData, lang: "en" | "ar"): string {
  return data.coach_name || (lang === "ar" ? "مدرب Alkemos" : "Alkemos coach");
}
