import type { Metadata } from "next";
import { BlogListPage } from "@/components/blog/BlogListPage";

const SITE_URL = "https://musclehubeg.vercel.app";

/**
 * Blog list (EN).
 *
 * Homepage AR mirror follow-up (2026-08-30): this page previously had NO
 * metadata, so it inherited the ROOT canonical "/" — telling Google the
 * blog list was a duplicate of the homepage. It now declares its own
 * canonical + hreflang pair with the Arabic mirror
 * (src/app/ar/blog/page.tsx declares the reciprocal side).
 */
export const metadata: Metadata = {
  title: "Fitness & Nutrition Blog",
  description:
    "Science-based workout, nutrition, and supplement articles from the Musclehubeg team — English editions.",
  alternates: {
    canonical: "/blog",
    languages: {
      en: `${SITE_URL}/blog`,
      ar: `${SITE_URL}/ar/blog`,
      "x-default": `${SITE_URL}/blog`,
    },
  },
};

export default function Page() {
 return <BlogListPage lang="en" />;
}
