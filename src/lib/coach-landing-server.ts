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

export type CoachLandingData = {
  slug: string;
  is_published: boolean;
  coach_name: string;
  coach_avatar: string | null;
  /** Arabic content (0031 columns) */
  ar: CoachLandingCopy;
  /** English content (0032 columns) */
  en: CoachLandingCopy;
};

function splitSpecialties(raw: string | null | undefined): string[] {
  return (raw || "").split("\n").map((s) => s.trim()).filter(Boolean);
}

export async function fetchCoachLanding(
  slug: string,
): Promise<CoachLandingData | null> {
  if (!isSupabaseAdminConfigured || !supabaseAdmin) return null;

  const { data: page } = await supabaseAdmin
    .from("coach_pages")
    .select(
      "slug, headline, bio, specialties, headline_en, bio_en, specialties_en, is_published, coach_id",
    )
    .eq("slug", slug)
    .maybeSingle();

  if (!page || !page.is_published) return null;

  const { data: prof } = await supabaseAdmin
    .from("profiles")
    .select("full_name, avatar_url, role")
    .eq("id", page.coach_id)
    .maybeSingle();

  if (!prof || (prof.role !== "coach" && prof.role !== "admin")) return null;

  return {
    slug: page.slug,
    is_published: page.is_published,
    coach_name: prof.full_name || "",
    coach_avatar: prof.avatar_url || null,
    ar: {
      headline: page.headline || "",
      bio: page.bio || "",
      specialties: splitSpecialties(page.specialties),
    },
    en: {
      headline: page.headline_en || "",
      bio: page.bio_en || "",
      specialties: splitSpecialties(page.specialties_en),
    },
  };
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
  return data.coach_name || (lang === "ar" ? "مدرب MuscleHub" : "MuscleHub coach");
}
