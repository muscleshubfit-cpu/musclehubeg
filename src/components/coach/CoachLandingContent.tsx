import type { CoachLandingData } from "@/lib/coach-landing-server";
import { coachDisplayName, resolveLandingCopy } from "@/lib/coach-landing-server";
import { LanguageToggle } from "@/components/LanguageToggle";

/**
 * MULTI-COACH PHASE 2B (i18n follow-up) — shared SERVER render for the
 * public coach landing page, used by BOTH mirrors:
 *   EN canonical: /coaches/[slug]     (lang="en", dir ltr)
 *   AR mirror:    /ar/coaches/[slug]  (lang="ar", dir rtl)
 *
 * No "use client" — pure server component so ISR (revalidate=300) and
 * first-paint SEO stay intact, and the language always follows the URL
 * (never localStorage) exactly like /ar/blog/[slug]. Chrome strings are
 * local per-lang copy; the coach-authored content is resolved by
 * resolveLandingCopy() with the cross-language fallback.
 */

export function CoachLandingContent({
  data,
  lang,
}: {
  data: CoachLandingData;
  lang: "en" | "ar";
}) {
  const isAr = lang === "ar";
  const copy = resolveLandingCopy(data, lang);
  const name = coachDisplayName(data, lang);
  const initial = name.trim().charAt(0) || "M";
  // COACH ATTRIBUTION (0033): the slug travels in the link — the signup
  // trigger reads coach_slug from metadata and assigns this client to
  // THIS coach (not the admin). Google signups fall back to the 30-day
  // cookie + /api/coach/claim.
  const signupHref = `/auth?mode=signup&coach=${encodeURIComponent(
    data.slug,
  )}&next=${encodeURIComponent(
    isAr ? `/ar/coaches/${data.slug}` : `/coaches/${data.slug}`,
  )}`;

  return (
    <main dir={isAr ? "rtl" : "ltr"} lang={lang} className="min-h-screen bg-white text-[#1d1d1f]">
      {/* Floating language switch — navigates between the EN canonical
          (/coaches/{slug}) and the AR mirror (/ar/coaches/{slug}) via
          LanguageToggle's coach-mirror case (URL follows the language). */}
      <div className={`fixed top-4 z-50 ${isAr ? "left-4" : "right-4"}`}>
        <LanguageToggle />
      </div>

      {/* Hero */}
      <section className="mx-auto flex max-w-3xl flex-col items-center px-6 pb-16 pt-20 text-center">
        {data.coach_avatar ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={data.coach_avatar}
            alt={name}
            className="h-28 w-28 rounded-full object-cover shadow-lg ring-4 ring-[#f5f5f7]"
          />
        ) : (
          <div className="grid h-28 w-28 place-items-center rounded-full bg-[#0071e3]/10 text-4xl font-semibold text-[#0071e3] shadow-lg ring-4 ring-[#f5f5f7]">
            {initial}
          </div>
        )}

        <h1 className="mt-6 text-3xl font-semibold tracking-tight md:text-5xl">
          {name}
        </h1>
        {copy.headline && (
          <p className="mt-3 text-lg font-normal text-[#6e6e73] md:text-xl">
            {copy.headline}
          </p>
        )}

        {copy.specialties.length > 0 && (
          <div className="mt-6 flex flex-wrap justify-center gap-2">
            {copy.specialties.map((s) => (
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
          {isAr
            ? `ابدأ متابعتك مع ${name.split(" ")[0]} الآن`
            : `Start your journey with ${name.split(" ")[0]} now`}
        </a>
      </section>

      {/* Bio */}
      {copy.bio && (
        <section className="mx-auto max-w-3xl px-6 pb-16">
          <div className="rounded-3xl bg-[#f5f5f7] p-8 md:p-10">
            <h2 className="mb-4 text-xl font-semibold tracking-tight">
              {isAr ? "نبذة عن المدرب" : "About the coach"}
            </h2>
            <div className="space-y-4 text-base font-normal leading-relaxed text-[#424245]">
              {copy.bio.split("\n").map((para, i) =>
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
          {isAr ? (
            <>
              منصة اللياقة والتغذية —{" "}
              <a href="/ar" className="text-[#0071e3] hover:underline">الصفحة الرئيسية</a>
            </>
          ) : (
            <>
              Fitness &amp; nutrition platform —{" "}
              <a href="/" className="text-[#0071e3] hover:underline">Home</a>
            </>
          )}
        </p>
      </footer>
    </main>
  );
}
