import type { Metadata } from "next";
import { SiteHeader } from "@/components/SiteHeader";
import { StaticPageView } from "@/components/views/StaticPageView";
import { FAQS_EN, FAQS_AR } from "@/lib/faq-content";

/**
 * FAQ page — server component so we can attach metadata + FAQPage JSON-LD
 * for Google rich results.
 *
 * AR EXPANSION (2026-08-30): the Q&A data moved to src/lib/faq-content.ts
 * (shared with the new /ar/faq mirror). hreflang now declares the REAL
 * Arabic twin /ar/faq instead of the old self-referencing en/ar pair
 * (which told Google this EN url was also the AR version).
 */

export const metadata: Metadata = {
  title: "الأسئلة الشائعة — Musclehubeg | دليل شامل للمنصة",
  description:
    "إجابات على أكثر الأسئلة شيوعاً حول Musclehubeg: كيف يعمل محرك EVO الذكي، باقات العضوية، طرق الدفع، أمان البيانات، دعم اللغة العربية، والجدول الزمني للنتائج.",
  alternates: {
    canonical: "https://alkemos.com/faq",
    languages: {
      "en": "https://alkemos.com/faq",
      "ar": "https://alkemos.com/ar/faq",
      "x-default": "https://alkemos.com/faq",
    },
  },
  openGraph: {
    title: "الأسئلة الشائعة — Musclehubeg",
    description:
      "إجابات شاملة حول منصة Musclehubeg: محرك EVO الذكي، العضويات، الدفع، الأمان، والمزيد.",
    url: "https://alkemos.com/faq",
    type: "website",
    locale: "ar_EG",
  },
};

export default function Page() {
  // FAQPage JSON-LD — both EN + AR versions for SEO
  const faqSchema = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: [...FAQS_EN, ...FAQS_AR].map((faq) => ({
      "@type": "Question",
      name: faq.q,
      acceptedAnswer: {
        "@type": "Answer",
        text: faq.a,
      },
    })),
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }}
      />
      <StaticPageView page="faq" />
    </>
  );
}
