import type { Metadata } from "next";
import { BlogListPage } from "@/components/blog/BlogListPage";
import { listPublishedPostsForListPage } from "@/lib/blog-server";

const SITE_URL = "https://alkemos.com";

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

export default async function Page() {
 // SSR fix (H1, audit 2026-09-05): posts are fetched server-side and
 // seeded into the first render — crawlers see real article links in
 // the HTML (previously an empty client-rendered shell) and LCP no
 // longer waits on a second round trip.
 const initialPosts = await listPublishedPostsForListPage("en");
 return <BlogListPage lang="en" initialPosts={initialPosts} />;
}

// ISR — 5 min freshness (same cadence as the article pages).
export const revalidate = 300;
