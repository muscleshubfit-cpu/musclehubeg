import type { Metadata } from "next";
import { StaticPageView } from "@/components/views/StaticPageView";

const SITE_URL = "https://alkemos.com";

/**
 * Arabic mirror of /about.
 *
 * AR EXPANSION (2026-08-30): StaticPageView already contains the full
 * Arabic "عن المنصة" content — it renders Arabic whenever the URL is
 * under /ar/* (I18nProvider is URL-first since the homepage AR mirror
 * fix). This page gives that content its own indexable Arabic URL with
 * Arabic-first metadata + reciprocal hreflang with the EN page.
 *
 * No hreflang self-references and no inherited signals — the pair
 * (en→/about, ar→/ar/about, x-default→/about) is declared on BOTH sides.
 */
export const metadata: Metadata = {
  title: "عن Alkemos — من نحن، رؤيتنا ورسالتنا",
  description:
    "تعرّف على Alkemos: المنصة الرياضية المصرية التي تجمع مكتبة تمرين تضم أكثر من 868 تمريناً، وبرامج تدريب جاهزة، وحاسبات لياقة مجانية، وقاعدة أطعمة، ومساعد EVO الذكي، وكوتشينج أونلاين — رسالتنا أن نجعل اللياقة بمستوى الخبراء في متناول الجميع.",
  alternates: {
    canonical: `${SITE_URL}/ar/about`,
    languages: {
      en: `${SITE_URL}/about`,
      ar: `${SITE_URL}/ar/about`,
      "x-default": `${SITE_URL}/about`,
    },
  },
  openGraph: {
    title: "عن Alkemos — من نحن، رؤيتنا ورسالتنا",
    description:
      "منصة رياضية متكاملة: 868+ تمرين، برامج جاهزة، حاسبات مجانية، قاعدة أطعمة، ومدرب ذكاء اصطناعي EVO.",
    url: `${SITE_URL}/ar/about`,
    type: "website",
    locale: "ar_EG",
  },
};

export default function Page() {
  return <StaticPageView page="about" />;
}
