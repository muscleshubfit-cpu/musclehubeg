import { listPublishedPostsForFeed } from "@/lib/blog-server";

/**
 * GET /llms-full.txt — EXPANDED machine-readable site guide for AI
 * engines (llms.txt spec companion; Phase 86, owner GEO push).
 *
 * public/llms.txt (static) stays the SHORT curated overview; THIS route
 * appends the latest published articles per language (title + URL +
 * excerpt) so AI crawlers can cite fresh content without crawling the
 * whole site. SYNC NOTE: keep the curated section list below aligned
 * with public/llms.txt (edited together by convention).
 *
 * CACHED hourly; degrades to the static portion when the DB is not
 * configured (listPublishedPostsForFeed → []).
 */
export const revalidate = 3600;
export const dynamic = "force-static";

const SITE =
  process.env.NEXT_PUBLIC_SITE_URL ||
  process.env.NEXT_PUBLIC_APP_URL ||
  "https://alkemos.com";

const RECENT_PER_LANG = 30;

function clean(s: string): string {
  return s.replace(/\s+/g, " ").trim().slice(0, 300);
}

export async function GET(): Promise<Response> {
  const [en, ar] = await Promise.all([
    listPublishedPostsForFeed("en", RECENT_PER_LANG),
    listPublishedPostsForFeed("ar", RECENT_PER_LANG),
  ]);

  const enList = en
    .map(
      (p) =>
        `- [${clean(p.title)}](${SITE}/blog/${p.slug}): ${clean(p.excerpt || p.meta_description || p.title)}`,
    )
    .join("\n");
  const arList = ar
    .map(
      (p) =>
        `- [${clean(p.title)}](${SITE}/ar/blog/${p.slug}): ${clean(p.excerpt || p.meta_description || p.title)}`,
    )
    .join("\n");

  const body = `# Musclehubeg (llms-full)

> Musclehubeg is a bilingual (English/Arabic) fitness and nutrition platform for the Egyptian and Arab market: an 868+ exercise library with form instructions, ready workout programs, a food database with per-100g nutrition for 8,830+ foods, six free fitness calculators, an AI meal planner, the EVO AI coach, and human online coaching. This file extends the short /llms.txt with the latest articles per language.

- Platform: ${SITE}
- Arabic homepage: ${SITE}/ar
- English blog feed (RSS): ${SITE}/rss.xml
- Arabic blog feed (RSS): ${SITE}/ar/rss.xml

## Main sections

- [Exercise Library](${SITE}/exercises): 868+ exercises with proper form; detail pages under /exercises/[slug]. Arabic: /ar/exercises
- [Workout Programs](${SITE}/programs): ready training plans (home & gym, beginner to advanced); detail pages under /programs/[slug]
- [Food Database](${SITE}/foods): 8,830+ foods with calories and macros per 100g; detail pages under /foods/[slug]. Arabic: /ar/foods
- [Fitness Tools](${SITE}/tools): free calculators — Calorie/TDEE ${SITE}/tools/calorie-calculator, BMI ${SITE}/tools/bmi-calculator, Macro ${SITE}/tools/macro-calculator, Body Fat ${SITE}/tools/body-fat-calculator, Water Tracker ${SITE}/tools/water-tracker, plus the AI Meal Planner ${SITE}/meal-planner
- [Fitness Blog](${SITE}/blog): evidence-based training and nutrition articles; Arabic articles at ${SITE}/ar/blog
- [Online Coaching](${SITE}/coaching): human coaches and nutrition specialists
- [EVO — AI Fitness Coach](${SITE}/evo): the platform's AI performance engine
- [Memberships](${SITE}/memberships): Free, Premium ($14.99/mo), Pro ($29.99/mo), Coaching ($39.99/mo); Arabic: ${SITE}/ar/memberships
- [FAQ](${SITE}/faq): payments (PayPal, InstaPay, Vodafone Cash) and common questions; Arabic: ${SITE}/ar/faq
- [For Coaches](${SITE}/for-coaches): coach recruitment funnel; Arabic: ${SITE}/ar/for-coaches

## Key facts

- Payment methods: PayPal (automatic), InstaPay, Vodafone Cash (manual receipt review within 24h)
- Bilingual platform: every main section has an Arabic mirror under /ar/*; hreflang en/ar/x-default declared on every page
- Ships as a PWA (installable on mobile) with full RTL support
- Content license: all content owned by Musclehubeg; citing facts with a link is welcome

## Latest English articles

${enList || "(feed temporarily unavailable — see " + SITE + "/blog)"}

## Latest Arabic articles (أحدث المقالات العربية)

${arList || "(غير متاح مؤقتاً — راجع " + SITE + "/ar/blog)"}
`;

  return new Response(body, {
    headers: { "Content-Type": "text/plain; charset=utf-8" },
  });
}
