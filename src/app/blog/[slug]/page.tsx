import { notFound } from "next/navigation";
import { BlogArticlePage } from "@/components/blog/BlogArticlePage";
import { fetchBlogForOG, fetchBlogPostFull } from "@/lib/blog-server";
import { getArticleSchema, getBreadcrumbSchema } from "@/lib/seo";
import type { Metadata } from "next";

// #10 fix: use ISR instead of force-dynamic — blog posts change rarely,
// so a 1-hour revalidate cache reduces Vercel function invocations
// significantly while keeping content fresh.
export const revalidate = 300; // 5 min — post-remediation freshness (IMAGE SAFETY sweep 2026-08-27)
export const runtime = "nodejs";

/**
 * Server-side metadata generation — puts OG tags in <head> where Facebook,
 * LinkedIn, X, and WhatsApp can find them.
 */
export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;

  const og = await fetchBlogForOG(slug, "en");
  if (!og) {
    return {
      title: "Article Not Found — MuscleHubEG",
      robots: { index: false, follow: false },
    };
  }

  return {
    title: og.title,
    description: og.description,
    alternates: {
      canonical: og.articleUrl,
      // C24 fix: declare hreflang alternates so Google knows the EN article
      // has an AR counterpart (and vice versa). x-default = EN (primary).
      languages: {
        "en": og.articleUrl,
        "ar": `https://musclehubeg.vercel.app/ar/blog/${slug}`,
        "x-default": og.articleUrl,
      },
    },
    openGraph: {
      type: "article",
      url: og.articleUrl,
      title: og.title,
      description: og.description,
      images: [{ url: og.image, width: 1200, height: 630 }],
      siteName: "MuscleHubEG",
      locale: "en_US",
    },
    twitter: {
      card: "summary_large_image",
      title: og.title,
      description: og.description,
      images: [og.image],
    },
  };
}

export default async function Page({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;

  // Fetch blog data for Article schema
  const og = await fetchBlogForOG(slug, "en");

  // M29 fix: return proper 404 (not soft-404 HTTP 200) when the post
  // doesn't exist. This triggers Next.js's not-found page with status 404,
  // preventing Google from indexing invalid blog URLs as soft-404s.
  if (!og) {
    notFound();
  }

  const articleSchema = og
    ? getArticleSchema({
        title: og.title,
        description: og.description,
        slug,
        image: og.image,
        datePublished: og.publishedAt || new Date().toISOString(),
      })
    : null;

  const breadcrumbSchema = og
    ? getBreadcrumbSchema([
        { name: "Home", url: "/" },
        { name: "Blog", url: "/blog" },
        { name: og.title, url: `/blog/${slug}` },
      ])
    : null;

  // M28 fix: fetch the full post server-side so the article body is in
  // the initial HTML (visible to Googlebot without executing JS).
  const fullPost = await fetchBlogPostFull(slug, "en");

  return (
    <>
      {articleSchema && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(articleSchema) }}
        />
      )}
      {breadcrumbSchema && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbSchema) }}
        />
      )}
      <BlogArticlePage lang="en" slug={slug} initialPost={fullPost} />
    </>
  );
}
