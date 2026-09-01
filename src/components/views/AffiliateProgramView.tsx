"use client";
import { SiteHeader } from "@/components/SiteHeader";

/**
 * Public Affiliate Program page.
 *
 * Renders fully in English when the active language is English, and fully
 * in Arabic when the active language is Arabic. The brand name "Musclehubeg"
 * is intentionally never translated.
 *
 * The page is fully public (no auth required). Two CTAs:
 *   - GET YOUR AFFILIATE LINK  → /auth?mode=signup (then /referral)
 *   - START SHARING             → /referral (if logged in) or /auth?mode=signup
 *
 * Honesty guardrails:
 *   - No guaranteed income claims.
 *   - No fake testimonials.
 *   - No implied automatic renewals (says "when real recurring
 *     payments exist" for renewals).
 */

import { useI18n } from "@/lib/i18n";
import { useNav } from "@/hooks/use-nav";
import { useAuth } from "@/hooks/use-auth";
import { LanguageToggle } from "@/components/LanguageToggle";
import {
  AFFILIATE_PROGRAM_FACTS,
  buildAffiliateUrl,
  buildPromoCopy,
  PROMO_TEMPLATES,
} from "@/lib/affiliate-content";
import { COMMISSION_RATE, getOrCreateReferralCode } from "@/lib/referral";
import { CopyButton } from "@/components/ui/copy-button";
import { AffiliateToolkit } from "@/components/views/AffiliateToolkit";
import { toast } from "sonner";
import { ArrowRight, Check, Gift, Link2, Share2, Users, Wallet } from "lucide-react";
import { useEffect, useState } from "react";

export function AffiliateProgramView() {
  const { lang } = useI18n();
  const { navigate } = useNav();
  const { profile } = useAuth();
  const isAr = lang === "ar";
  const dir = isAr ? "rtl" : "ltr";
  const c = getCopy(isAr);

  // Load the user's referral code if they're logged in, so we can show
  // share buttons with their personal affiliate URL.
  const [referralCode, setReferralCode] = useState<string>("");

  useEffect(() => {
    if (!profile?.id) return;
    let cancelled = false;
    (async () => {
      try {
        const code = await getOrCreateReferralCode(profile.id, profile.full_name);
        if (!cancelled) setReferralCode(code);
      } catch {
        // Silent fail — share section will show the CTA fallback.
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [profile?.id, profile?.full_name]);

  const affiliateUrl = referralCode ? buildAffiliateUrl(referralCode) : "";

  // Share handlers — use the same templates as the dashboard toolkit
  // (single source of truth via affiliate-content.ts).
  const shareWhatsApp = () => {
    if (!affiliateUrl) return;
    const text = buildPromoCopy(PROMO_TEMPLATES[1], affiliateUrl, isAr);
    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, "_blank");
  };
  const shareFacebook = () => {
    if (!affiliateUrl) return;
    window.open(`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(affiliateUrl)}`, "_blank");
  };
  const shareX = () => {
    if (!affiliateUrl) return;
    const text = buildPromoCopy(PROMO_TEMPLATES[2], affiliateUrl, isAr);
    window.open(`https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}`, "_blank");
  };

  // Primary CTA: "GET YOUR AFFILIATE LINK"
  // - Logged-in user with referral code → copy their personal link to clipboard
  // - Logged-in user without referral code (edge case) → go to /referral dashboard
  // - Logged-out visitor → go to /auth?mode=signup
  const primaryCta = async () => {
    if (profile && affiliateUrl) {
      // Copy the personal affiliate link to clipboard
      try {
        await navigator.clipboard.writeText(affiliateUrl);
        toast.success(isAr ? "تم نسخ رابطك! 🎉" : "Your link is copied! 🎉");
      } catch {
        // Fallback: navigate to dashboard where they can copy manually
        navigate("referral");
      }
    } else if (profile) {
      navigate("referral");
    } else {
      navigate("auth", { mode: "signup" });
    }
  };

  // Secondary CTA: "START SHARING"
  // - Logged-in user → go to /referral dashboard (where the share buttons live)
  // - Logged-out visitor → go to /auth?mode=signup
  const secondaryCta = () => {
    if (profile) navigate("referral");
    else navigate("auth", { mode: "signup" });
  };

  return (
    <div
      dir={dir}
      className="flex min-h-screen flex-col overflow-x-hidden bg-white text-[#1d1d1f]"
    >
      <SiteHeader variant="landing" />

      <main className="flex-1">
        {/* ─── HERO ─── */}
        <section className="relative overflow-hidden border-b border-[#d2d2d7]">
          {/* Subtle gradient background */}
          <div
            aria-hidden="true"
            className="absolute inset-0 -z-10"
            style={{
              background:
                "radial-gradient(120% 80% at 50% 0%, rgba(0,113,227,0.08) 0%, rgba(0,113,227,0) 60%), radial-gradient(80% 60% at 100% 100%, rgba(90,200,250,0.08) 0%, rgba(90,200,250,0) 60%)",
            }}
          />

          <div className="mx-auto w-full max-w-5xl px-4 py-16 text-center sm:px-6 md:py-24 lg:py-28">
            <span className="inline-flex items-center gap-2 rounded-full border border-[#0071e3]/20 bg-[#0071e3]/5 px-3 py-1 text-xs font-medium uppercase tracking-wide text-[#0071e3] sm:px-4 sm:py-1.5">
              <Gift className="h-3.5 w-3.5" aria-hidden="true" />
              {isAr ? "برنامج الأفلييت" : "Affiliate Program"}
            </span>

            <h1 className="mt-6 text-3xl font-semibold leading-[1.1] tracking-tight sm:text-4xl md:text-5xl lg:text-6xl">
              {c.hero.headline}
            </h1>

            <p className="mx-auto mt-5 max-w-2xl text-sm font-normal leading-relaxed text-[#6e6e73] sm:text-base md:text-lg">
              {c.hero.supporting}
            </p>

            <div className="mt-10 flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
              <button
                onClick={primaryCta}
                className="inline-flex min-h-[52px] w-full items-center justify-center gap-2 rounded-full bg-[#0071e3] px-8 text-base font-semibold text-white transition-all hover:bg-[#0058b9] sm:w-auto"
              >
                {c.hero.ctaPrimary}
                <ArrowRight className={`h-5 w-5 ${isAr ? "rotate-180" : ""}`} aria-hidden="true" />
              </button>
              <button
                onClick={secondaryCta}
                className="inline-flex min-h-[52px] w-full items-center justify-center gap-2 rounded-full bg-[#f5f5f7] px-8 text-base font-semibold text-[#1d1d1f] transition-colors hover:bg-[#e8e8ed] sm:w-auto"
              >
                {c.hero.ctaSecondary}
              </button>
            </div>

            {/* Hero stat strip */}
            <div className="mt-16 grid grid-cols-2 gap-4 sm:grid-cols-4">
              {c.heroStats.map((s, i) => (
                <div
                  key={i}
                  className="rounded-2xl bg-[#f5f5f7] p-5 text-center"
                >
                  <p className="text-2xl font-semibold tracking-tight text-[#1d1d1f] sm:text-3xl">
                    {s.value}
                  </p>
                  <p className="mt-1 text-xs font-medium text-[#6e6e73]">
                    {s.label}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ─── WHY BECOME AN AFFILIATE ─── */}
        <section className="border-b border-[#d2d2d7] bg-[#fafafa]">
          <div className="mx-auto w-full max-w-5xl px-4 py-20 sm:px-6 md:py-28">
            <div className="text-center">
              <h2 className="text-3xl font-semibold tracking-tight sm:text-4xl md:text-5xl">
                {c.why.title}
              </h2>
              <p className="mx-auto mt-4 max-w-2xl text-base font-normal text-[#6e6e73] sm:text-lg">
                {c.why.subtitle}
              </p>
            </div>

            <div className="mt-12 grid gap-4 sm:grid-cols-2">
              {c.why.cards.map((card, i) => {
                const Icon = [Link2, Share2, Users, Wallet][i] || Link2;
                return (
                  <div
                    key={i}
                    className="rounded-3xl bg-white p-8 ring-1 ring-[#e5e5e7]"
                  >
                    <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#0071e3]/10">
                      <Icon className="h-6 w-6 text-[#0071e3]" aria-hidden="true" />
                    </div>
                    <h3 className="mt-6 text-xl font-semibold tracking-tight">
                      {card.title}
                    </h3>
                    <p className="mt-2 text-sm font-normal leading-relaxed text-[#6e6e73]">
                      {card.body}
                    </p>
                  </div>
                );
              })}
            </div>

            {/* No claims section */}
            <div className="mt-12 rounded-3xl bg-[#f5f5f7] p-8 text-center text-[#1d1d1f] md:p-12">
              <p className="text-lg font-medium tracking-tight md:text-xl">
                {c.why.pitch}
              </p>
              <p className="mt-4 text-sm font-normal text-[#6e6e73]">
                {c.why.disclosure}
              </p>
            </div>
          </div>
        </section>

        {/* ─── WHO IT'S FOR ─── */}
        <section className="border-b border-[#d2d2d7]">
          <div className="mx-auto w-full max-w-5xl px-4 py-20 sm:px-6 md:py-28">
            <h2 className="text-3xl font-semibold tracking-tight sm:text-4xl md:text-5xl">
              {c.who.title}
            </h2>
            <div className="mt-8 flex flex-wrap gap-3">
              {c.who.audiences.map((aud, i) => (
                <span
                  key={i}
                  className="inline-flex items-center gap-2 rounded-full bg-[#f5f5f7] px-5 py-2.5 text-sm font-medium text-[#1d1d1f]"
                >
                  <Check className="h-4 w-4 text-[#0071e3]" aria-hidden="true" />
                  {aud}
                </span>
              ))}
            </div>
            <p className="mt-8 max-w-2xl text-sm font-normal text-[#6e6e73]">
              {c.who.note}
            </p>
          </div>
        </section>

        {/* ─── COMMISSION SECTION ─── */}
        <section className="border-b border-[#d2d2d7] bg-[#fafafa]">
          <div className="mx-auto w-full max-w-5xl px-4 py-20 sm:px-6 md:py-28">
            <h2 className="text-3xl font-semibold tracking-tight sm:text-4xl md:text-5xl">
              {c.commission.title}
            </h2>
            <p className="mt-4 max-w-2xl text-base font-normal text-[#6e6e73] sm:text-lg">
              {c.commission.subtitle}
            </p>

            <div className="mt-12 grid gap-6 md:grid-cols-2">
              {/* Subscriptions card */}
              <div className="rounded-3xl bg-white p-8 ring-1 ring-[#e5e5e7] md:p-10">
                <span className="inline-flex items-center gap-2 rounded-full bg-[#0071e3]/10 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-[#0071e3]">
                  {c.commission.subs.badge}
                </span>
                <h3 className="mt-6 text-2xl font-semibold tracking-tight">
                  {c.commission.subs.title}
                </h3>
                <p className="mt-3 text-3xl font-semibold tracking-tight text-[#1d1d1f]">
                  {(COMMISSION_RATE * 100).toFixed(0)}%
                  <span className="ms-2 text-sm font-normal text-[#6e6e73]">
                    {c.commission.subs.rateSuffix}
                  </span>
                </p>

                {/* Phase 75 (owner): concrete commission examples */}
                <p className="mt-6 text-sm font-medium text-[#1d1d1f]">
                  {c.commission.subs.examplesTitle}
                </p>
                <div className="mt-3 grid grid-cols-2 gap-3">
                  {c.commission.subs.examples.map((ex, i) => (
                    <div
                      key={i}
                      className="rounded-2xl bg-[#f5f5f7] p-4 text-center"
                    >
                      <p className="text-xs font-normal text-[#6e6e73]">
                        {isAr ? "اشتراك" : "Subscription"} {ex.price}
                      </p>
                      <p className="mt-1 text-xl font-semibold tracking-tight text-[#0071e3]">
                        {ex.earn}
                      </p>
                      <p className="mt-0.5 text-[11px] font-normal text-[#6e6e73]">
                        {isAr ? "عمولتك" : "your commission"}
                      </p>
                    </div>
                  ))}
                </div>

                <p className="mt-6 text-sm font-normal leading-relaxed text-[#6e6e73]">
                  {c.commission.subs.body}
                </p>
                <p className="mt-4 rounded-2xl bg-[#f5f5f7] p-4 text-xs font-normal leading-relaxed text-[#6e6e73]">
                  {c.commission.subs.renewalNote}
                </p>
              </div>

              {/* Products & services card */}
              <div className="rounded-3xl bg-white p-8 ring-1 ring-[#e5e5e7] md:p-10">
                <span className="inline-flex items-center gap-2 rounded-full bg-[#34c759]/10 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-[#1d8a3d]">
                  {c.commission.prods.badge}
                </span>
                <h3 className="mt-6 text-2xl font-semibold tracking-tight">
                  {c.commission.prods.title}
                </h3>
                <p className="mt-3 text-3xl font-semibold tracking-tight text-[#1d1d1f]">
                  {AFFILIATE_PROGRAM_FACTS.cookieDurationDays}
                  <span className="ms-2 text-sm font-normal text-[#6e6e73]">
                    {c.commission.prods.cookieSuffix}
                  </span>
                </p>
                <p className="mt-6 text-sm font-normal leading-relaxed text-[#6e6e73]">
                  {c.commission.prods.body}
                </p>
                <p className="mt-4 rounded-2xl bg-[#f5f5f7] p-4 text-xs font-normal leading-relaxed text-[#6e6e73]">
                  {c.commission.prods.futureNote}
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* ─── HOW IT WORKS ─── */}
        <section className="border-b border-[#d2d2d7]">
          <div className="mx-auto w-full max-w-5xl px-4 py-20 sm:px-6 md:py-28">
            <h2 className="text-3xl font-semibold tracking-tight sm:text-4xl md:text-5xl">
              {c.how.title}
            </h2>
            <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
              {c.how.steps.map((step, i) => (
                <div
                  key={i}
                  className="relative rounded-3xl bg-[#f5f5f7] p-8"
                >
                  <span className="text-5xl font-semibold tracking-tight text-[#0071e3]">
                    {String(i + 1).padStart(2, "0")}
                  </span>
                  <h3 className="mt-6 text-lg font-semibold tracking-tight">
                    {step.title}
                  </h3>
                  <p className="mt-2 text-sm font-normal leading-relaxed text-[#6e6e73]">
                    {step.body}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ─── YOUR PROMO TOOLKIT (authenticated) / CTA (guests) ─── */}
        {/* Phase 75 (owner): the promo toolkit moved from the /referral
            earnings dashboard to the public program page — marketing tools
            belong on the marketing page. Authenticated affiliates get their
            real toolkit; guests get a sign-up CTA. */}
        <section className="border-b border-[#d2d2d7] bg-[#fafafa]">
          <div className="mx-auto w-full max-w-5xl px-4 py-20 sm:px-6 md:py-28">
            <h2 className="text-3xl font-semibold tracking-tight sm:text-4xl md:text-5xl">
              {isAr ? "أدواتك الترويجية" : "YOUR PROMO TOOLKIT"}
            </h2>
            <p className="mt-4 max-w-2xl text-base font-normal text-[#6e6e73] sm:text-lg">
              {isAr
                ? "قوالب جاهزة للنشر وبانرات بكود HTML جاهز للنسخ — كله برابط الأفلييت الشخصي بتاعك."
                : "Ready-to-publish templates and website banners with copy-ready HTML embed codes — all carrying your personal affiliate link."}
            </p>
            {profile ? (
              <div className="mt-10">
                <AffiliateToolkit />
              </div>
            ) : (
              <div className="mt-10 rounded-3xl bg-white p-10 text-center ring-1 ring-[#e5e5e7]">
                <p className="text-lg font-semibold tracking-tight">
                  {isAr
                    ? "سجّل حسابك لتفتح أدواتك الترويجية"
                    : "Create an account to unlock your promo toolkit"}
                </p>
                <p className="mx-auto mt-2 max-w-md text-sm font-normal text-[#6e6e73]">
                  {isAr
                    ? "القوالب والبانرات والرابط الشخصي كلها جاهزة ليك بعد التسجيل — خلال دقايق."
                    : "Templates, banners and your personal link are all ready minutes after you sign up."}
                </p>
                <button
                  onClick={() => navigate("auth", { mode: "signup" })}
                  className="mt-6 inline-flex items-center gap-2 rounded-full bg-[#0071e3] px-8 py-3 text-sm font-medium text-white transition-opacity hover:opacity-90"
                >
                  {isAr ? "ابدأ الآن مجاناً" : "START NOW — FREE"}
                  <ArrowRight className="h-4 w-4 rtl:rotate-180" aria-hidden="true" />
                </button>
              </div>
            )}
          </div>
        </section>

        {/* ─── WHAT YOU GET ─── */}
        <section className="border-b border-[#d2d2d7] bg-[#fafafa]">
          <div className="mx-auto w-full max-w-5xl px-4 py-20 sm:px-6 md:py-28">
            <h2 className="text-3xl font-semibold tracking-tight sm:text-4xl md:text-5xl">
              {c.perks.title}
            </h2>
            <div className="mt-8 grid gap-3 sm:grid-cols-2">
              {c.perks.items.map((p, i) => (
                <div
                  key={i}
                  className="flex items-start gap-3 rounded-2xl bg-white p-5 ring-1 ring-[#e5e5e7]"
                >
                  <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[#0071e3]">
                    <Check className="h-3.5 w-3.5 text-white" aria-hidden="true" />
                  </span>
                  <span className="text-sm font-medium leading-snug text-[#1d1d1f]">
                    {p}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ─── SHARE SECTION (authenticated users only) ─── */}
        {profile && affiliateUrl && (
          <section className="border-t border-[#d2d2d7] bg-[#1d1d1f]">
            <div className="mx-auto w-full max-w-3xl px-4 py-16 text-center text-white sm:px-6 md:py-20">
              <h2 className="text-2xl font-semibold tracking-tight sm:text-3xl md:text-4xl">
                {isAr ? "شارك رابطك الآن" : "Share Your Link Now"}
              </h2>
              <p className="mx-auto mt-3 max-w-xl text-sm font-normal text-white/70 sm:text-base">
                {isAr
                  ? "انسخ رابطك أو شاركه مباشرة على منصاتك المفضلة."
                  : "Copy your link or share it directly to your favourite platforms."}
              </p>

              {/* Link display + Copy */}
              <div className="mx-auto mt-8 flex max-w-xl flex-col gap-3 sm:flex-row">
                <input
                  value={affiliateUrl}
                  readOnly
                  dir="ltr"
                  aria-label={isAr ? "رابط الأفلييت" : "Affiliate link"}
                  className="min-w-0 flex-1 rounded-full border border-white/20 bg-white/10 px-5 py-3 font-mono text-sm text-white outline-none"
                />
                <CopyButton
                  value={affiliateUrl}
                  label={isAr ? "نسخ الرابط" : "Copy Link"}
                  successLabel={isAr ? "تم النسخ ✓" : "Copied ✓"}
                  errorLabel={isAr ? "تعذر النسخ" : "Unable to copy"}
                  variant="primary"
                  analyticsEvent="affiliate_link_copied"
                  analyticsPayload={{ source: "affiliate_page_share_section" }}
                  ariaLabel={isAr ? "نسخ رابط الأفلييت" : "Copy affiliate link"}
                  className="shrink-0"
                />
              </div>

              {/* Share buttons */}
              <div className="mt-6 flex flex-wrap justify-center gap-3">
                <button
                  onClick={shareWhatsApp}
                  className="inline-flex min-h-[44px] items-center gap-2 rounded-full bg-[#25D366] px-5 py-2.5 text-sm font-medium text-white transition-opacity hover:opacity-90"
                >
                  WhatsApp
                </button>
                <button
                  onClick={shareFacebook}
                  className="inline-flex min-h-[44px] items-center gap-2 rounded-full bg-[#1877F2] px-5 py-2.5 text-sm font-medium text-white transition-opacity hover:opacity-90"
                >
                  Facebook
                </button>
                <button
                  onClick={shareX}
                  className="inline-flex min-h-[44px] items-center gap-2 rounded-full bg-white px-5 py-2.5 text-sm font-medium text-[#1d1d1f] transition-opacity hover:opacity-90"
                >
                  X (Twitter)
                </button>
              </div>
            </div>
          </section>
        )}

        {/* ─── FINAL CTA ─── */}
        <section>
          <div className="mx-auto w-full max-w-5xl px-4 py-20 text-center sm:px-6 md:py-32">
            <h2 className="text-3xl font-semibold tracking-tight sm:text-4xl md:text-5xl">
              {c.finalCta.title}
            </h2>
            <p className="mx-auto mt-4 max-w-2xl text-base font-normal text-[#6e6e73] sm:text-lg">
              {c.finalCta.body}
            </p>
            <div className="mt-10">
              <button
                onClick={primaryCta}
                className="inline-flex min-h-[52px] w-full items-center justify-center gap-2 rounded-full bg-[#0071e3] px-8 text-base font-semibold text-white transition-all hover:bg-[#0058b9] sm:w-auto"
              >
                {c.hero.ctaPrimary}
                <ArrowRight className={`h-5 w-5 ${isAr ? "rotate-180" : ""}`} aria-hidden="true" />
              </button>
            </div>

            <p className="mt-10 text-xs font-normal text-[#8e8e93]">
              {c.finalCta.disclosure}
            </p>
          </div>
        </section>
      </main>

      {/* ─── Footer ─── */}
      <footer className="mt-auto border-t border-[#d2d2d7] py-6 text-center text-xs font-normal text-[#6e6e73]">
        © {new Date().getFullYear()} Musclehubeg. {isAr ? "كل الحقوق محفوظة." : "All rights reserved."}
      </footer>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────
// Localised copy
// ─────────────────────────────────────────────────────────────────────────

type Copy = {
  hero: {
    headline: string;
    supporting: string;
    ctaPrimary: string;
    ctaSecondary: string;
  };
  heroStats: { value: string; label: string }[];
  why: {
    title: string;
    subtitle: string;
    cards: { title: string; body: string }[];
    pitch: string;
    disclosure: string;
  };
  who: { title: string; audiences: string[]; note: string };
  commission: {
    title: string;
    subtitle: string;
    subs: {
      badge: string;
      title: string;
      rateSuffix: string;
      body: string;
      renewalNote: string;
      /** Phase 75 (owner): concrete $6 → $1.20 / $16 → $3.20 examples */
      examplesTitle: string;
      examples: { price: string; earn: string }[];
    };
    prods: {
      badge: string;
      title: string;
      cookieSuffix: string;
      body: string;
      futureNote: string;
    };
  };
  how: { title: string; steps: { title: string; body: string }[] };
  perks: { title: string; items: string[] };
  finalCta: { title: string; body: string; disclosure: string };
};

function getCopy(isAr: boolean): Copy {
  if (isAr) {
    return {
      hero: {
        headline: "حوّل تأثيرك إلى دخل.",
        supporting:
          "شارك Musclehubeg مع الناس اللي بيثقوا في توصياتك. ساعدهم يتدربوا بطريقة أذكى، يأكلوا أحسن، ويحققوا تقدم حقيقي — واكسب عمولة من عمليات الشراء المؤهلة اللي تتم عبر رابط الأفلييت بتاعك.",
        ctaPrimary: "احصل على رابط الأفلييت بتاعك",
        ctaSecondary: "ابدأ المشاركة",
      },
      heroStats: [
        { value: "20%", label: "عمولة على اشتراكات مؤهلة" },
        { value: "30 يوم", label: "ألية تتبع للمنتجات لمرة واحدة" },
        { value: "$10", label: "الحد الأدنى للصرف" },
        { value: "آني", label: "تتبع الأرباح بشفافية" },
      ],
      why: {
        title: "ليه تبقى أفلييت لـ Musclehubeg؟",
        subtitle:
          "أنت بتركز على اللي أنت بتعرف تعمله: التوصية بمنصة بتثق فيها. الباقي علينا.",
        cards: [
          {
            title: "مفيش بناء منتج",
            body: "إحنا اللي بنينا المنصة وكل التحديثات. مفيش عليك أي تطوير.",
          },
          {
            title: "مفيش مخزون",
            body: "كل حاجة رقمية. مفيش شحن أو مخزون أو مرتجعات مادية.",
          },
          {
            title: "مفيش معالجة دفعات",
            body: "الموقع بيتكفل بكل الدفعات والاشتراكات. أنت بس شارك الرابط.",
          },
          {
            title: "مفيش دعم عملاء",
            body: "فريق Musclehubeg هو اللي بيتعامل مع كل أسئلة العملاء وطلباتهم.",
          },
        ],
        pitch:
          "أنت بتشارك Musclehubeg. Musclehubeg بيتكفل بتجربة المنتج والعميل. أنت بتكسب عمولات مؤهلة.",
        disclosure:
          "مفيش وعود بأرقام دخل. الأرباح بتعتمد على حجم وجودة جمهورك ونوع التحويلات.",
      },
      who: {
        title: "لمين ده مناسب؟",
        audiences: [
          "كوتشات اللياقة",
          "مدربين شخصيين",
          "متخصصي التغذية",
          "صُنّاع المحتوى الرياضي",
          "المدونين",
          "أصحاب المواقع",
          "المجتمعات الرياضية",
          "صُنّاع المحتوى على السوشيال",
          "عشاق اللياقة مع جمهور نشط",
        ],
        note:
          "بنشجع التوصية لجمهور حقيقي مهتم باللياقة والتغذية. أي ممارسات سبام أو إرسال جماعي غير مرغوب فيه بتعرض الحساب للإيقاف.",
      },
      commission: {
        title: "العمولات",
        subtitle:
          "نظام واضح وموثوق، يدعم اشتراكات اليوم ومستعد لأي منتجات وخدمات مدفوعة مستقبلية.",
        subs: {
          badge: "اشتراكات",
          title: "عمولة على الاشتراكات",
          rateSuffix: "من عمليات شراء الاشتراك المؤهلة",
          body:
            "بتكسب 20% من قيمة أي اشتراك مؤهل يتسجل عن طريق رابطك ويتأكد دفعه. العمولة بتتسجل لحظة تأكيد الدفع، ومش بتتحسب قبل كده.",
          renewalNote:
            "لما تكون في عمليات تجديد اشتراك حقيقية متكررة (recurring payments)، الإحالات المؤهلة للاشتراك بتفضل محفوظة على السيرفر عشان العمولات المستقبلية من عمليات التجديد المؤهلة.",
          examplesTitle: "أمثلة حقيقية على عمولتك:",
          examples: [
            { price: "$6", earn: "$1.20" },
            { price: "$16", earn: "$3.20" },
          ],
        },
        prods: {
          badge: "منتجات وخدمات",
          title: "منتجات وخدمات لمرة واحدة",
          cookieSuffix: "ألية تتبع للكوكيز",
          body:
            "أي منتج أو خدمة مدفوعة مستقبلية مؤهلة ممكن تشارك في برنامج الأفلييت. عمليات الشراء لمرة واحدة بتستخدم ألية الـ 30 يوم للكوكيز الموجودة حالياً.",
          futureNote:
            "بنشجع الترقية لأي منتجات مؤهلة مستقبلية. مفيش قاعدة دايمة بأن منتجات اليوم هي القاعدة الدائمة لبرنامج الأفلييت.",
        },
      },
      how: {
        title: "إزاي بيشتغل",
        steps: [
          {
            title: "احصل على رابطك",
            body: "سجّل حساب في Musclehubeg وهتلاقي رابط الأفلييت الشخصي بتاعك جاهز في لوحتك — انسخه أو حمّل QR Code.",
          },
          {
            title: "شارك رابطك",
            body:
              "انشره على السوشيال ميديا، في المحتوى بتاعك، جوه الجروبات، في الرسايل، أو على موقعك — اللي يريحك.",
          },
          {
            title: "الزائر يفتح رابطك",
            body:
              "أي حد يفتح رابطك بيتتبع تلقائيًا لمدة 30 يوم — حتى لو ساب الموقع ورجع بعدين، الرابط بيحسب لك.",
          },
          {
            title: "الزائر يسجّل حساب",
            body:
              "لما يسجّل حساب من غير ما يدفع ملمش حاجة، حسابه بيتسجل بإحالتك — والربط بيفضل دائم (أول نقرة تحسم الإحالة).",
          },
          {
            title: "الزائر يدفع اشتراك مؤهل",
            body:
              "لما يشترك في أي اشتراك مؤهل ويتأكد الدفع، العمولة بتتسجل لحظتها — مش قبل كده.",
          },
          {
            title: "تكسب 20% فورًا",
            body:
              "بيتكسب 1.20$ عمولة من اشتراك 6$، و3.20$ من اشتراك 16$ — وكل عمولة بتظهر في لوحة أرباحك لحظة بلحظة.",
          },
          {
            title: "اطلب صرف أرباحك",
            body:
              "أول ما رصيدك يوصل 10$ اطلب الصرف من لوحتك — محفظة كاش، خصم من اشتراكك، أو تحويل بنكي — والأدمن بيراجع ويصرف.",
          },
        ],
      },
      perks: {
        title: "هتحصل على إيه",
        items: [
          "رابط أفلييت شخصي للتتبع",
          "لوحة أرباح شفافة وآنية",
          "محتوى ترويجي جاهز للنشر",
          "بانرات للموقع مع كود HTML جاهز للنسخ",
          "تتبع دقيق لكل عملية شراء مؤهلة",
          "ألية عكس العمولة عند الاسترجاع",
          "دعم فني للأسئلة التقنية",
          "وصول لحظي للأداء والتقدم",
        ],
      },
      finalCta: {
        title: "جاهز تبدأ؟",
        body:
          "سجّل حساب في Musclehubeg، روح على قسم الأفلييت في لوحتك، وابدأ المشاركة خلال دقايق.",
        disclosure:
          "المشاركة في برنامج الأفلييت بتخضع لشروط الاستخدام. نحتفظ بحق إيقاف أي حساب بيخالف سياسات السبام أو الإساءة.",
      },
    };
  }

  return {
    hero: {
      headline: "TURN YOUR INFLUENCE INTO INCOME.",
      supporting:
        "Share Musclehubeg with people who trust your recommendations. Help them train smarter, eat better, and make meaningful progress — while earning commissions from eligible purchases made through your Affiliate link.",
      ctaPrimary: "GET YOUR AFFILIATE LINK",
      ctaSecondary: "START SHARING",
    },
    heroStats: [
      { value: "20%", label: "Commission on eligible subscriptions" },
      { value: "30 days", label: "Attribution for eligible one-time products" },
      { value: "$10", label: "Minimum payout" },
      { value: "Real-time", label: "Transparent earnings dashboard" },
    ],
    why: {
      title: "WHY BECOME A MUSCLEHUBEG AFFILIATE?",
      subtitle:
        "You focus on what you do best: recommending a platform you trust. We handle the rest.",
      cards: [
        {
          title: "No product to build",
          body: "We've built the platform and every update. Nothing to develop on your end.",
        },
        {
          title: "No inventory",
          body: "Everything is digital. No shipping, no warehousing, no physical returns.",
        },
        {
          title: "No payment processing",
          body: "The site handles all payments and subscriptions. You only share the link.",
        },
        {
          title: "No customer support",
          body: "The Musclehubeg team handles every customer question and request.",
        },
      ],
      pitch:
        "You share Musclehubeg. Musclehubeg handles the product and customer experience. You earn eligible commissions.",
      disclosure:
        "No guaranteed income. Earnings depend on the size and quality of your audience and the conversions you drive.",
    },
    who: {
      title: "WHO IS THIS FOR?",
      audiences: [
        "Fitness coaches",
        "Personal trainers",
        "Nutrition professionals",
        "Fitness content creators",
        "Bloggers",
        "Website owners",
        "Fitness communities",
        "Social media creators",
        "Fitness enthusiasts with engaged audiences",
      ],
      note:
        "We encourage recommending to a genuine audience interested in fitness and nutrition. Any spam practice or unsolicited mass-messaging will result in account suspension.",
    },
    commission: {
      title: "COMMISSIONS",
      subtitle:
        "A clear, reliable system that supports today's subscriptions and is ready for any future paid products and services.",
      subs: {
        badge: "SUBSCRIPTIONS",
        title: "Subscription Commission",
        rateSuffix: "on qualifying subscription purchases",
        body:
          "You earn 20% of any qualifying subscription purchased through your link and verified. The commission is recorded the moment payment is confirmed — never earlier.",
        renewalNote:
          "When real recurring subscription renewals exist, qualifying subscription referrals are retained server-side so future qualifying renewals can generate additional commissions. We do not imply that automatic renewals currently exist.",
        examplesTitle: "What your commission looks like:",
        examples: [
          { price: "$6", earn: "$1.20" },
          { price: "$16", earn: "$3.20" },
        ],
      },
      prods: {
        badge: "PRODUCTS & SERVICES",
        title: "One-time Products & Services",
        cookieSuffix: "cookie attribution",
        body:
          "Any future eligible paid product or service can participate in the Affiliate Program. One-time purchases use the existing 30-day cookie attribution system.",
        futureNote:
          "We may extend to any eligible future products. Today's products are not the permanent Affiliate rule — the program is designed to grow with the platform.",
      },
    },
    how: {
      title: "HOW IT WORKS",
      steps: [
        {
          title: "Get your link",
          body:
            "Sign up on Musclehubeg and your personal Affiliate link is ready in your dashboard — copy it or download its QR code.",
        },
        {
          title: "Share your link",
          body:
            "Post it on social media, inside your content, in communities, messages, or on your website — whatever suits you.",
        },
        {
          title: "A visitor opens your link",
          body:
            "Anyone opening your link is tracked automatically for 30 days — even if they leave and come back later, the credit stays yours.",
        },
        {
          title: "The visitor signs up",
          body:
            "When they create a free account, their signup is recorded under your referral — the bond is permanent (first click wins).",
        },
        {
          title: "The visitor pays an eligible subscription",
          body:
            "When they subscribe to an eligible plan and payment is verified, the commission is recorded at that exact moment — never earlier.",
        },
        {
          title: "You earn 20% instantly",
          body:
            "That's $1.20 from a $6 subscription, and $3.20 from a $16 subscription — every commission appears in your dashboard in real time.",
        },
        {
          title: "Request your payout",
          body:
            "Once your balance reaches $10, request a payout from your dashboard — cash wallet, subscription discount, or bank transfer — and the admin reviews and pays it.",
        },
      ],
    },
    perks: {
      title: "WHAT YOU GET",
      items: [
        "Personal Affiliate tracking link",
        "Transparent, real-time earnings dashboard",
        "Ready-to-publish promotional content",
        "Website banners with copy-ready HTML embed code",
        "Accurate tracking for every eligible purchase",
        "Commission reversal on refunds",
        "Technical support for any questions",
        "Instant access to your performance and progress",
      ],
    },
    finalCta: {
      title: "READY TO START?",
      body:
        "Sign up for a Musclehubeg account, visit the Affiliate section in your dashboard, and start sharing in minutes.",
      disclosure:
        "Participation in the Affiliate Program is subject to our Terms of Use. We reserve the right to suspend any account that violates our spam or abuse policies.",
    },
  };
}

// Re-export so the import in AffiliateToolkit can use the same source.
export { buildAffiliateUrl };
