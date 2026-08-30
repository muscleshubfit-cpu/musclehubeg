import type { Metadata } from "next";

/**
 * AR MIRROR of /for-coaches/register — SEO layout.
 * Arabic-first metadata + reciprocal hreflang with the EN page
 * (src/app/for-coaches/register/layout.tsx). Indexed deliberately:
 * coaches searching «تسجيل مدرب musclehub» land straight on the form.
 */

const SITE_URL = "https://musclehubeg.vercel.app";

export const metadata: Metadata = {
  title: "تسجيل مدرب — أنشئ حسابك المجاني على Musclehubeg",
  description:
    "سجّل كمدرب على Musclehubeg في دقيقة: تفعيل فوري بدون انتظار، أضف عملاءك وحدد أسعارك بنفسك واحصل منهم مباشرة — بدون أي نسبة من دخلك.",
  keywords: ["تسجيل مدرب", "انشاء حساب كوتش", "انضم كمدرب"],
  alternates: {
    canonical: `${SITE_URL}/ar/for-coaches/register`,
    languages: {
      en: `${SITE_URL}/for-coaches/register`,
      ar: `${SITE_URL}/ar/for-coaches/register`,
      "x-default": `${SITE_URL}/for-coaches/register`,
    },
  },
  openGraph: {
    title: "تسجيل مدرب — Musclehubeg",
    description:
      "أنشئ حسابك كمدرب مجانًا — تفعيل فوري، عملاؤك بأسعارك، وفلوسك في إيدك.",
    url: `${SITE_URL}/ar/for-coaches/register`,
    siteName: "Musclehubeg",
    locale: "ar_EG",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "تسجيل مدرب — Musclehubeg",
    description: "أنشئ حسابك كمدرب مجانًا — تفعيل فوري، بدون أي نسبة من دخلك.",
  },
  robots: { index: true, follow: true },
};

export default function ArForCoachesRegisterLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
