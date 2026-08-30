import type { Metadata } from "next";
import { getFAQSchema, getBreadcrumbSchema } from "@/lib/seo";
import { COACH_FAQ_AR } from "@/app/for-coaches/content";

/**
 * AR MIRROR of /for-coaches — SEO layout.
 *
 * Arabic-FIRST metadata: the recruitment audience is Egyptian coaches.
 * The hreflang pair is declared on BOTH sides (en→/for-coaches,
 * ar→/ar/for-coaches, x-default→/for-coaches) — no self-references,
 * the /ar/about & /ar/faq pattern (Phase 44).
 *
 * JSON-LD: FAQPage (AR questions) + BreadcrumbList — semantic value
 * for non-Google answer engines per site convention.
 */

const SITE_URL = "https://musclehubeg.vercel.app";

export const metadata: Metadata = {
  title: "انضم كمدرب في Musclehubeg — درِّب عملاءك بأسعارك وفلوسك في إيدك",
  description:
    "سجّل كوتش أو أخصائي تغذية على Musclehubeg مجانًا: منصة كاملة لإدارة عملائك أنت، خطط تغذية وتمارين بالذكاء الاصطناعي، تحدد سعرك بنفسك وتحصّل من عملائك مباشرة بدون أي نسبة — رسم تفعيل شهري ثابت فقط. تفعيل فوري.",
  keywords: [
    "انضم كمدرب",
    "تسجيل مدرب",
    "شغل كوتش اونلاين",
    "كوتشينج اونلاين في مصر",
    "منصة مدربين",
    "إدارة عملاء الكوتش",
    "خطط تغذية بالذكاء الاصطناعي",
    "برامج تمارين للعملاء",
    "كوتش جيم",
    "أخصائي تغذية اونلاين",
    "متابعة عملاء التدريب",
  ],
  alternates: {
    canonical: `${SITE_URL}/ar/for-coaches`,
    languages: {
      en: `${SITE_URL}/for-coaches`,
      ar: `${SITE_URL}/ar/for-coaches`,
      "x-default": `${SITE_URL}/for-coaches`,
    },
  },
  openGraph: {
    title: "انضم كمدرب في Musclehubeg — درِّب عملاءك بأسعارك وفلوسك في إيدك",
    description:
      "منصة كاملة للكوتشات: إدارة عملائك، خطط بالذكاء الاصطناعي، أسعارك بتحددها وتحصّل بنفسك — بدون أي نسبة من دخلك. سجّل مجانًا بتفعيل فوري.",
    url: `${SITE_URL}/ar/for-coaches`,
    siteName: "Musclehubeg",
    locale: "ar_EG",
    type: "website",
    images: [
      {
        url: `${SITE_URL}/images/coach-portrait.jpg`,
        width: 1122,
        height: 1402,
        alt: "انضم كمدرب في Musclehubeg",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "انضم كمدرب في Musclehubeg — عملاؤك بأسعارك وفلوسك في إيدك",
    description:
      "إدارة عملاء، خطط AI، أسعارك إنت اللي بتحددها وتحصّل بنفسك — بدون نسبة. سجّل مجانًا.",
    images: [`${SITE_URL}/images/coach-portrait.jpg`],
  },
};

const faqSchema = getFAQSchema(COACH_FAQ_AR);
const breadcrumbSchema = getBreadcrumbSchema([
  { name: "Musclehubeg", url: SITE_URL },
  { name: "انضم كمدرب", url: `${SITE_URL}/ar/for-coaches` },
]);

export default function ArForCoachesLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbSchema) }}
      />
      {children}
    </>
  );
}
