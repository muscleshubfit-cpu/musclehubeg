import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { supabaseAdmin, isSupabaseAdminConfigured } from "@/lib/supabase/admin";

/**
 * MULTI-COACH PHASE 2B — PUBLIC coach landing page (/coaches/{slug}).
 * Owner answer 3 (2026-08-29): each coach has a private-to-promote
 * public page — it is NEVER in any menu; the coach shares the URL
 * himself. Reachable while logged-out (published pages only).
 *
 * Fetched server-side with the service-role client (RLS-independent);
 * migration 0031 creates the underlying coach_pages table. Unknown or
 * unpublished slugs → proper 404.
 */

export const revalidate = 300; // 5 min ISR — landing copy changes rarely
export const runtime = "nodejs";

type LandingData = {
  slug: string;
  headline: string;
  bio: string;
  specialties: string[];
  is_published: boolean;
  coach_name: string;
  coach_avatar: string | null;
};

async function fetchLanding(slug: string): Promise<LandingData | null> {
  if (!isSupabaseAdminConfigured || !supabaseAdmin) return null;

  const { data: page } = await supabaseAdmin
    .from("coach_pages")
    .select("slug, headline, bio, specialties, is_published, coach_id")
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
    headline: page.headline || "",
    bio: page.bio || "",
    specialties: (page.specialties || "").split("\n").map((s) => s.trim()).filter(Boolean),
    is_published: page.is_published,
    coach_name: prof.full_name || "مدرب MuscleHub",
    coach_avatar: prof.avatar_url || null,
  };
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const data = await fetchLanding(slug);

  if (!data) {
    return {
      title: "الصفحة غير موجودة — MuscleHub Egypt",
      robots: { index: false, follow: false },
    };
  }

  const title = `${data.coach_name} — ${data.headline || "مدرب معتمد على MuscleHub"}`;
  const description = data.bio.slice(0, 160) || `احجز متابعة خاصة مع ${data.coach_name} على MuscleHub Egypt`;

  return {
    title,
    description,
    alternates: { canonical: `/coaches/${slug}` },
    openGraph: {
      type: "profile",
      url: `/coaches/${slug}`,
      title,
      description,
      siteName: "MuscleHub Egypt",
      locale: "ar_EG",
    },
  };
}

export default async function CoachLandingPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const data = await fetchLanding(slug);
  if (!data) notFound();

  const initial = data.coach_name.trim().charAt(0) || "M";
  const signupHref = `/auth?mode=signup&next=${encodeURIComponent(`/coaches/${slug}`)}`;

  return (
    <main dir="rtl" lang="ar" className="min-h-screen bg-white text-[#1d1d1f]">
      {/* Hero */}
      <section className="mx-auto flex max-w-3xl flex-col items-center px-6 pb-16 pt-20 text-center">
        {data.coach_avatar ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={data.coach_avatar}
            alt={data.coach_name}
            className="h-28 w-28 rounded-full object-cover shadow-lg ring-4 ring-[#f5f5f7]"
          />
        ) : (
          <div className="grid h-28 w-28 place-items-center rounded-full bg-[#0071e3]/10 text-4xl font-semibold text-[#0071e3] shadow-lg ring-4 ring-[#f5f5f7]">
            {initial}
          </div>
        )}

        <h1 className="mt-6 text-3xl font-semibold tracking-tight md:text-5xl">
          {data.coach_name}
        </h1>
        {data.headline && (
          <p className="mt-3 text-lg font-normal text-[#6e6e73] md:text-xl">
            {data.headline}
          </p>
        )}

        {data.specialties.length > 0 && (
          <div className="mt-6 flex flex-wrap justify-center gap-2">
            {data.specialties.map((s) => (
              <span
                key={s}
                className="rounded-full bg-[#f5f5f7] px-4 py-1.5 text-sm font-medium text-[#1d1d1f]"
              >
                {s}
              </span>
            ))}
          </div>
        )}

        <a
          href={signupHref}
          className="mt-8 rounded-full bg-[#0071e3] px-8 py-3.5 text-base font-normal text-white transition-opacity hover:opacity-90"
        >
          ابدأ متابعتك مع {data.coach_name.split(" ")[0]} الآن
        </a>
      </section>

      {/* Bio */}
      {data.bio && (
        <section className="mx-auto max-w-3xl px-6 pb-16">
          <div className="rounded-3xl bg-[#f5f5f7] p-8 md:p-10">
            <h2 className="mb-4 text-xl font-semibold tracking-tight">نبذة عن المدرب</h2>
            <div className="space-y-4 text-base font-normal leading-relaxed text-[#424245]">
              {data.bio.split("\n").map((para, i) =>
                para.trim() ? <p key={i}>{para.trim()}</p> : null,
              )}
            </div>
          </div>
        </section>
      )}

      {/* Branding footer */}
      <footer className="border-t border-[#d2d2d7] py-10 text-center">
        <p className="text-sm font-semibold tracking-tight text-[#1d1d1f]">MuscleHub Egypt</p>
        <p className="mt-1 text-xs font-normal text-[#6e6e73]">
          منصة اللياقة والتغذية — <a href="/" className="text-[#0071e3] hover:underline">الصفحة الرئيسية</a>
        </p>
      </footer>
    </main>
  );
}
