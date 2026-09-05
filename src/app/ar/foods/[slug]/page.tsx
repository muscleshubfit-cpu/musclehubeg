import type { Metadata } from "next";
import { getFoodBySlug, getRelatedFoods } from "@/lib/foods";
import { getBreadcrumbSchema } from "@/lib/seo";
import FoodDetailClient from "@/app/foods/[slug]/FoodDetailClient";

const SITE_URL = "https://alkemos.com";

/**
 * Arabic mirror of /foods/[slug] — SEO 404 FIX (2026-09-01).
 *
 * Previously /ar/foods/<slug> returned a hard 404 while the Arabic foods
 * listing linked into it. This server component resolves the SAME
 * bilingual food row (src/lib/foods.ts, 8,830 foods with native nameAr /
 * defaultServingAr fields — the same data layer that powers the EN pages)
 * and renders it fully in Arabic.
 *
 * Own Arabic metadata: canonical /ar/foods/[slug] + hreflang pair +
 * og:locale ar_EG + Arabic NutritionInformation JSON-LD so answer engines
 * can cite the per-100g facts from the Arabic page.
 *
 * NO generateStaticParams — 8,830 × 2 languages is too many to pre-build
 * (same decision as the EN route); pages render on-demand and are cached.
 */
export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const food = getFoodBySlug(slug);

  if (!food) {
    return {
      title: "الأكلة غير موجودة",
      robots: { index: false, follow: false },
    };
  }

  // NOTE: no "| Musclehubeg" suffix — the /ar layout title template appends
  // the brand automatically (avoids "— Musclehubeg — Musclehubeg").
  const title = `${food.nameAr} — السعرات والماكروز لكل 100 جرام`;
  const description = `القيمة الغذائية لـ ${food.nameAr}: ${food.per100g.calories} سعرة، ${food.per100g.protein} جرام بروتين، ${food.per100g.carbs} جرام كارب، ${food.per100g.fat} جرام دهون لكل 100 جرام. الحصة الافتراضية: ${food.defaultServingAr} (${food.defaultGrams} جرام).`;
  const url = `${SITE_URL}/ar/foods/${food.slug}`;

  return {
    title,
    description,
    alternates: {
      canonical: `/ar/foods/${food.slug}`,
      languages: {
        en: `${SITE_URL}/foods/${food.slug}`,
        ar: url,
        "x-default": `${SITE_URL}/foods/${food.slug}`,
      },
    },
    openGraph: {
      type: "article",
      url,
      title,
      description,
      siteName: "Musclehubeg",
      locale: "ar_EG",
    },
    twitter: {
      card: "summary",
      title,
      description,
    },
  };
}

export default async function Page({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const food = getFoodBySlug(slug);

  const breadcrumbSchema = food
    ? getBreadcrumbSchema([
        { name: "الرئيسية", url: "/ar" },
        { name: "الأكلات", url: "/ar/foods" },
        { name: food.nameAr, url: `/ar/foods/${food.slug}` },
      ])
    : null;

  // GEO: Arabic NutritionInformation node — mirrors the EN page's schema
  // so AI answer engines can cite the ARABIC page for Arabic queries
  // ("كم سعرات صدور الفراخ").
  const nutritionSchema = food
    ? {
        "@context": "https://schema.org",
        "@type": "NutritionInformation",
        name: `${food.nameAr} — القيم الغذائية (لكل 100 جرام)`,
        servingSize: "100 g",
        calories: `${food.per100g.calories} kcal`,
        proteinContent: `${food.per100g.protein} g`,
        carbohydrateContent: `${food.per100g.carbs} g`,
        fatContent: `${food.per100g.fat} g`,
      }
    : null;

  return (
    <>
      {breadcrumbSchema && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbSchema) }}
        />
      )}
      {nutritionSchema && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(nutritionSchema) }}
        />
      )}
      <FoodDetailClient
        food={food ?? null}
        related={food ? getRelatedFoods(food) : []}
        lang="ar"
      />
    </>
  );
}
