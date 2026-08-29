import type { Metadata } from "next";
import { getFAQSchema, getBreadcrumbSchema } from "@/lib/seo";
import { COACH_FAQ_AR } from "./content";

/**
 * FOR-COACHES — SEO layout (server component under a client page).
 *
 * Arabic-FIRST metadata: the recruitment audience is Egyptian coaches,
 * and the owner's directive was «اهتم بالسيو جيدًا». English keywords
 * ride along for the toggle audience. The page itself is ONE bilingual
 * URL (client-side i18n, site-wide pattern) — canonical points to
 * itself; hreflang en/ar entries self-reference the same URL for
 * crawlers that honor them.
 *
 * JSON-LD: FAQPage (semantic value only — Google retired FAQ rich
 * results May 2026, kept per site convention in src/lib/seo.ts) +
 * BreadcrumbList.
 */

const SITE = "https://musclehubeg.vercel.app";
const PAGE_URL = `${SITE}/for-coaches`;

export const metadata: Metadata = {
  title: "انضم كمدرب في Musclehubeg — عملاؤك بأسعارك وفلوسك في إيدك",
  description:
    "سجّل كوتش أو أخصائي تغذية على Musclehubeg مجانًا: منصة كاملة لإدارة عملائك أنت، خطط تغذية وتمارين بالذكاء الاصطناعي، تحدد سعرك بنفسك وتحصّل من عملائك مباشرة بدون أي نسبة — رسم تفعيل شهري ثابت فقط. تفعيل فوري.",
  keywords: [
    // Arabic (primary audience)
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
    // English (secondary)
    "join as a coach",
    "coach registration",
    "online coaching platform",
    "personal trainer platform",
    "manage fitness clients",
    "AI meal plans for clients",
    "Musclehubeg coach",
  ],
  alternates: {
    canonical: PAGE_URL,
    languages: {
      ar: PAGE_URL,
      en: PAGE_URL,
    },
  },
  openGraph: {
    title: "انضم كمدرب في Musclehubeg — درِّب عملاءك بأسعارك وفلوسك في إيدك",
    description:
      "منصة كاملة للكوتشات: إدارة عملائك، خطط بالذكاء الاصطناعي، أسعارك بتحددها وتحصّل بنفسك — بدون أي نسبة من دخلك. سجّل مجانًا بتفعيل فوري.",
    url: PAGE_URL,
    siteName: "Musclehubeg",
    locale: "ar_EG",
    type: "website",
    images: [
      {
        url: `${SITE}/images/coach-portrait.jpg`,
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
    images: [`${SITE}/images/coach-portrait.jpg`],
  },
};

const faqSchema = getFAQSchema(COACH_FAQ_AR);
const breadcrumbSchema = getBreadcrumbSchema([
  { name: "Musclehubeg", url: "/" },
  { name: "انضم كمدرب", url: "/for-coaches" },
]);

export default function ForCoachesLayout({
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
