"use client";

import { useI18n } from "@/lib/i18n";
import { Button } from "@/components/ui/button";
import { Languages } from "lucide-react";
import { usePathname, useRouter } from "next/navigation";
import { getBlogPost, getLinkedPost } from "@/lib/blog";

/**
 * Site-wide language toggle. M31 fix: now navigates to the /ar/ mirror
 * (or back to the English URL) when a mirror exists, so the URL matches
 * the language and can be shared/bookmarked correctly.
 *
 * Pages with Arabic mirrors (/ar/*):
 *   /            <-> /ar
 *   /blog        <-> /ar/blog
 *   /blog/[slug] <-> /ar/blog/[slug] (via linked_post_id)
 *   /exercises   <-> /ar/exercises
 *   /foods       <-> /ar/foods
 *   /memberships <-> /ar/memberships
 *   /coaches/[slug] <-> /ar/coaches/[slug] (same slug — multi-coach
 *                   public landing, migration 0032 i18n follow-up)
 *
 * Pages without Arabic mirrors (e.g. /coaching, /evo, /tools/*, /about,
 * /faq, /privacy, /terms, /contact, /meal-planner, /affiliate): just
 * toggle the UI language (the page content is already bilingual via
 * useI18n, so the user sees the new language without a URL change).
 */
export function LanguageToggle() {
 const { lang, setLang } = useI18n();
 const pathname = usePathname() || "/";
 const router = useRouter();

 const handleToggle = async () => {
 const nextLang = lang === "ar" ? "en" : "ar";

 // Blog article page: /blog/[slug] <-> /ar/blog/[slug] (via linked_post_id)
 const enMatch = pathname.match(/^\/blog\/([^/]+)$/);
 const arMatch = pathname.match(/^\/ar\/blog\/([^/]+)$/);
 if (enMatch || arMatch) {
 const currentSlug = (enMatch || arMatch)![1];
 const currentArticleLang: "en" | "ar" = enMatch ? "en" : "ar";
 setLang(nextLang);
 try {
 const post = await getBlogPost(currentArticleLang, currentSlug);
 const linked = post ? await getLinkedPost(post) : null;
 if (linked) {
 router.push(linked.language === "ar" ? `/ar/blog/${linked.slug}` : `/blog/${linked.slug}`);
 return;
 }
 } catch {
 // fall through to list-page fallback below
 }
 // No translated version exists yet — land on the blog list in the new language.
 router.push(nextLang === "ar" ? "/ar/blog" : "/blog");
 return;
 }

 // Multi-coach public landing: /coaches/[slug] <-> /ar/coaches/[slug].
 // Same slug serves both languages (migration 0032), so the mirror is
 // a pure prefix swap — no lookup needed (unlike the blog pair).
 const coachEnMatch = pathname.match(/^\/coaches\/([^/]+)$/);
 const coachArMatch = pathname.match(/^\/ar\/coaches\/([^/]+)$/);
 if (coachEnMatch || coachArMatch) {
 const slug = (coachEnMatch || coachArMatch)![1];
 setLang(nextLang);
 router.push(nextLang === "ar" ? `/ar/coaches/${slug}` : `/coaches/${slug}`);
 return;
 }

 // M31 fix: routes with known Arabic mirrors — navigate to the mirror URL.
 const MIRROR_ROUTES = [
 { en: "/", ar: "/ar" },
 { en: "/blog", ar: "/ar/blog" },
 { en: "/exercises", ar: "/ar/exercises" },
 { en: "/foods", ar: "/ar/foods" },
 { en: "/memberships", ar: "/ar/memberships" },
 ];

 for (const route of MIRROR_ROUTES) {
 if (pathname === route.en) {
 setLang(nextLang);
 router.push(nextLang === "ar" ? route.ar : route.en);
 return;
 }
 if (pathname === route.ar) {
 setLang(nextLang);
 router.push(nextLang === "ar" ? route.ar : route.en);
 return;
 }
 }

 // Pages without Arabic mirrors: just toggle the UI language.
 // The page content is already bilingual via useI18n, so the user sees
 // the new language immediately without a URL change.
 setLang(nextLang);
 };

 return (
 <Button
 variant="ghost"
 size="sm"
 className="gap-2"
 onClick={handleToggle}
 aria-label="Toggle language"
 >
 <Languages className="h-4 w-4" />
 <span className="text-xs font-semibold">{lang === "ar" ? "EN" : "ع"}</span>
 </Button>
 );
}
