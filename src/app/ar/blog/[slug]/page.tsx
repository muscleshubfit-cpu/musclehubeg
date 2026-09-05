import { notFound } from "next/navigation";
import { BlogArticlePage } from "@/components/blog/BlogArticlePage";
import { fetchBlogForOG, fetchBlogPostFull } from "@/lib/blog-server";
import { getArticleSchema, getBreadcrumbSchema } from "@/lib/seo";
import type { Metadata } from "next";

// #10 fix: ISR — 1 hour revalidate
export const revalidate = 300; // 5 min — post-remediation freshness
export const runtime = "nodejs";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;

  const og = await fetchBlogForOG(slug, "ar");
  if (!og) {
    return {
      title: "المقال غير موجود — Musclehubeg",
      robots: { index: false, follow: false },
    };
  }

  return {
    title: og.title,
    description: og.description,
    alternates: {
      canonical: og.articleUrl,
      // Correct hreflang — point en + ar to their own URLs (not the same URL).
      // C24 fix: add x-default = EN (primary) for users without a matching locale.
      languages: {
        "en": `https://alkemos.com/blog/${slug}`,
        "ar": og.articleUrl,
        "x-default": `https://alkemos.com/blog/${slug}`,
      },
    },
    openGraph: {
      type: "article",
      url: og.articleUrl,
      title: og.title,
      description: og.description,
      images: [{ url: og.image, width: 1200, height: 630 }],
      siteName: "Musclehubeg",
      locale: "ar_EG",
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

  const og = await fetchBlogForOG(slug, "ar");

  // M29 fix: return proper 404 when the post doesn't exist.
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
        { name: "الرئيسية", url: "/" },
        { name: "المدونة", url: "/ar/blog" },
        { name: og.title, url: `/ar/blog/${slug}` },
      ])
    : null;

  // M28 fix: fetch the full post server-side so the article body is in
  // the initial HTML (visible to Googlebot without executing JS).
  const fullPost = await fetchBlogPostFull(slug, "ar");

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
      <BlogArticlePage lang="ar" slug={slug} initialPost={fullPost} />
    </>
  );
}
