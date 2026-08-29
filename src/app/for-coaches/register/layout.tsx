import type { Metadata } from "next";

/**
 * COACH REGISTRATION — SEO layout for /for-coaches/register.
 * Indexed deliberately: coaches searching «تسجيل مدرب musclehub» land
 * straight on the form (the /auth block in robots.txt does NOT apply —
 * this is a public recruitment surface, owner-approved).
 */

const SITE = "https://musclehubeg.vercel.app";
const PAGE_URL = `${SITE}/for-coaches/register`;

export const metadata: Metadata = {
  title: "تسجيل مدرب — أنشئ حسابك المجاني على MuscleHubEG",
  description:
    "سجّل كمدرب على MuscleHubEG في دقيقة: تفعيل فوري بدون انتظار، أضف عملاءك وحدد أسعارك بنفسك واحصل منهم مباشرة — بدون أي نسبة من دخلك.",
  keywords: [
    "تسجيل مدرب",
    "انشاء حساب كوتش",
    "انضم كمدرب",
    "coach sign up",
    "register as a coach",
  ],
  alternates: {
    canonical: PAGE_URL,
    languages: {
      ar: PAGE_URL,
      en: PAGE_URL,
    },
  },
  openGraph: {
    title: "تسجيل مدرب — MuscleHubEG",
    description:
      "أنشئ حسابك كمدرب مجانًا — تفعيل فوري، عملاؤك بأسعارك، وفلوسك في إيدك.",
    url: PAGE_URL,
    siteName: "MuscleHubEG",
    locale: "ar_EG",
    type: "website",
  },
  twitter: {
    card: "summary",
    title: "تسجيل مدرب — MuscleHubEG",
    description: "أنشئ حسابك كمدرب مجانًا — تفعيل فوري.",
  },
};

export default function CoachRegisterLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
