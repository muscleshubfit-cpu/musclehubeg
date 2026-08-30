import type { Metadata } from "next";
import { StaticPageView } from "@/components/views/StaticPageView";
import { FAQS_EN, FAQS_AR } from "@/lib/faq-content";

const SITE_URL = "https://musclehubeg.vercel.app";

/**
 * Arabic mirror of /faq.
 *
 * AR EXPANSION (2026-08-30): the FAQ content (both languages) was already
 * in the platform — StaticPageView renders its Arabic sections whenever the
 * URL is under /ar/* (I18nProvider is URL-first since the homepage AR
 * mirror fix). This page gives that Arabic content its own indexable URL
 * + Arabic-first metadata + reciprocal hreflang with the EN page.
 *
 * The FAQPage JSON-LD mirrors the EN page's structure but is ordered
 * Arabic-first (the AR Q&As are the ones this URL will be quoted for).
 * Q&A data comes from the shared src/lib/faq-content.ts.
 */
export const metadata: Metadata = {
  title: "الأسئلة الشائعة — Musclehubeg | إجابات عن المنصة والعضويات",
  description:
    "كل ما تريد معرفته عن Musclehubeg: ما هي المنصة، كيف يعمل مساعد EVO الذكي، الأسئلة عن العضويات والأسعار، طرق الدفع (PayPal و InstaPay و فودافون كاش)، أمان البيانات، ومتى تظهر النتائج.",
  alternates: {
    canonical: `${SITE_URL}/ar/faq`,
    languages: {
      en: `${SITE_URL}/faq`,
      ar: `${SITE_URL}/ar/faq`,
      "x-default": `${SITE_URL}/faq`,
    },
  },
  openGraph: {
    title: "الأسئلة الشائعة — Musclehubeg",
    description:
      "إجابات شاملة حول منصة Musclehubeg: محرك EVO الذكي، العضويات، الدفع، الأمان، والمزيد.",
    url: `${SITE_URL}/ar/faq`,
    type: "website",
    locale: "ar_EG",
  },
};

export default function Page() {
  // FAQPage JSON-LD — Arabic-first (this is the URL AI engines and Google
  // should quote for Arabic questions), with the EN set riding along.
  const faqSchema = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: [...FAQS_AR, ...FAQS_EN].map((faq) => ({
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
