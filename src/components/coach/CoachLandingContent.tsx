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
  preview = false,
}: {
  data: CoachLandingData;
  lang: "en" | "ar";
  /** PHASE 58 — true on /preview/coach/[slug] only: swaps the floating
   * language toggle (it would navigate to the PUBLIC mirrors, which 404
   * non-approved pages) for a fixed preview banner that switches the
   * language via ?lang= instead. */
  preview?: boolean;
}) {
  const isAr = lang === "ar";
  const copy = resolveLandingCopy(data, lang);
  const name = coachDisplayName(data, lang);
  const initial = name.trim().charAt(0) || "M";
  // 0037 — the coach-uploaded personal photo wins over the account avatar
  // (private-bucket avatar URLs 403 for anonymous visitors; the public
  // bucket photo is always anonymously viewable).
  const heroPhoto = data.photo_url || data.coach_avatar || null;
  const socials = [
    { label: isAr ? "انستجرام" : "Instagram", url: data.social.instagram },
    { label: isAr ? "فيسبوك" : "Facebook", url: data.social.facebook },
    { label: isAr ? "تيك توك" : "TikTok", url: data.social.tiktok },
    { label: isAr ? "يوتيوب" : "YouTube", url: data.social.youtube },
  ].filter((s) => s.url);
  // COACH ATTRIBUTION (0033): the slug travels in the link — the signup
  // trigger reads coach_slug from metadata and assigns this client to
  // THIS coach (not the admin). Google signups fall back to the 30-day
  // cookie + /api/coach/claim.
  // PHASE 58 LOOP FIX: `next` used to point back at THIS page, so any
  // ALREADY logged-in visitor (admin checking the page, a member poking
  // around) was bounced /auth → straight back here — the «start
  // following» button looked dead. Without `next`: logged-out visitors
  // get the signup form (attribution still rides on ?coach=), logged-in
  // users land on their own console (dashboard / coach / admin).
  const signupHref = `/auth?mode=signup&coach=${encodeURIComponent(data.slug)}`;

  return (
    <main
      dir={isAr ? "rtl" : "ltr"}
      lang={lang}
      className={`min-h-screen bg-white text-[#1d1d1f] ${preview ? "pb-16" : ""}`}
    >
      {/* Floating language switch — PUBLIC pages only: navigates between
          the EN canonical (/coaches/{slug}) and the AR mirror. In PREVIEW
          mode the mirrors would 404 non-approved pages, so the banner
          below handles the language switch instead (?lang=). */}
      {!preview && (
        <div className={`fixed top-4 z-50 ${isAr ? "left-4" : "right-4"}`}>
          <LanguageToggle />
        </div>
      )}

      {/* Hero */}
      <section className="mx-auto flex max-w-3xl flex-col items-center px-6 pb-16 pt-20 text-center">
        {heroPhoto ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={heroPhoto}
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

        {/* 0037 — social profile pills (text-first, site style) */}
        {socials.length > 0 && (
          <div className="mt-6 flex flex-wrap justify-center gap-2">
            {socials.map((s) => (
              <a
                key={s.label}
                href={s.url}
                target="_blank"
                rel="noopener noreferrer"
                className="rounded-full border border-[#d2d2d7] bg-white px-5 py-2 text-sm font-medium text-[#1d1d1f] transition-colors hover:border-[#0071e3] hover:text-[#0071e3]"
              >
                {s.label}
              </a>
            ))}
          </div>
        )}
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

      {/* 0037 — client results gallery (coach-uploaded photos) */}
      {data.results_photos.length > 0 && (
        <section className="mx-auto max-w-3xl px-6 pb-16">
          <div className="rounded-3xl bg-[#f5f5f7] p-8 md:p-10">
            <h2 className="mb-2 text-xl font-semibold tracking-tight">
              {isAr ? "نتائج العملاء" : "Client results"}
            </h2>
            <p className="text-sm font-normal text-[#6e6e73]">
              {isAr
                ? "صور حقيقية شاركها المدرب لنتائج عملائه — النتائج تختلف من شخص لآخر."
                : "Real photos shared by the coach of his clients' results — results vary from person to person."}
            </p>
            <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-3">
              {data.results_photos.map((photo, i) => (
                <figure key={photo.url} className="group">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={photo.url}
                    alt={photo.caption || `${isAr ? "نتيجة عميل" : "Client result"} ${i + 1}`}
                    loading="lazy"
                    className="aspect-[3/4] w-full rounded-2xl object-cover shadow-sm transition-shadow group-hover:shadow-md"
                  />
                  {photo.caption && (
                    <figcaption className="mt-2 text-center text-xs font-normal text-[#6e6e73]">
                      {photo.caption}
                    </figcaption>
                  )}
                </figure>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* 0049 — coach certificates (OPTIONAL — hidden while empty) */}
      {data.certificates.length > 0 && (
        <section className="mx-auto max-w-3xl px-6 pb-16">
          <div className="rounded-3xl bg-[#f5f5f7] p-8 md:p-10">
            <h2 className="mb-2 text-xl font-semibold tracking-tight">
              {isAr ? "شهادات المدرب" : "Coach certificates"}
            </h2>
            <p className="text-sm font-normal text-[#6e6e73]">
              {isAr
                ? "شهادات واعتمادات شاركها المدرب للتعريف بمؤهلاته."
                : "Certificates and credentials shared by the coach to show his qualifications."}
            </p>
            <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-3">
              {data.certificates.map((cert, i) => (
                <figure key={cert.url} className="group">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={cert.url}
                    alt={cert.title || `${isAr ? "شهادة مدرب" : "Coach certificate"} ${i + 1}`}
                    loading="lazy"
                    className="aspect-[4/3] w-full rounded-2xl bg-white object-cover shadow-sm transition-shadow group-hover:shadow-md"
                  />
                  {cert.title && (
                    <figcaption className="mt-2 text-center text-xs font-normal text-[#6e6e73]">
                      {cert.title}
                    </figcaption>
                  )}
                </figure>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* PHASE 58 — STAFF PREVIEW banner (never renders on public pages):
          tells the reviewing admin / the owning coach that what he sees is
          NOT live yet, and why. Language switch rides on ?lang= because
          the public mirrors stay 404 for non-approved pages. */}
      {preview && (
        <div className="fixed inset-x-0 bottom-0 z-50 border-t border-[#ff9500]/30 bg-[#ff9500]/95 px-4 py-3 text-center text-sm font-medium text-white shadow-lg">
          {isAr ? (
            <>
              وضع المعاينة —{' '}
              {data.is_published
                ? (data.review_status ?? "approved") === "pending"
                  ? "التعديلات الجديدة في انتظار موافقة الأدمن والصفحة القديمة هي المعروضة للعامة"
                  : (data.review_status ?? "approved") === "rejected"
                    ? "الصفحة مرفوضة وغير ظاهرة للعامة"
                    : "الصفحة معتمدة لكن غير منشورة للعامة"
                : "الصفحة غير ظاهرة للعامة"}
              {' · '}
              <a
                href={`?lang=${isAr ? "en" : "ar"}`}
                className="underline underline-offset-2 hover:opacity-80"
              >
                {isAr ? "View in English" : "عرض بالعربية"}
              </a>
            </>
          ) : (
            <>
              Preview mode —{' '}
              {data.is_published
                ? (data.review_status ?? "approved") === "pending"
                  ? "the new edits await admin approval; the live page still shows the old content"
                  : (data.review_status ?? "approved") === "rejected"
                    ? "this page is rejected and hidden from the public"
                    : "this page is approved but not published"
                : "this page is not visible to the public"}
              {' · '}
              <a
                href={`?lang=${isAr ? "en" : "ar"}`}
                className="underline underline-offset-2 hover:opacity-80"
              >
                {isAr ? "View in English" : "عرض بالعربية"}
              </a>
            </>
          )}
        </div>
      )}

      {/* Branding footer */}
      <footer className="border-t border-[#d2d2d7] py-10 text-center">
        <p className="text-sm font-semibold tracking-tight text-[#1d1d1f]">Musclehubeg</p>
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
