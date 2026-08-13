import { BlogArticlePage } from "@/components/blog/BlogArticlePage";
import { fetchBlogForOG } from "@/lib/blog-server";
import type { Metadata } from "next";

// Force dynamic rendering so generateMetadata runs on every request
export const dynamic = "force-dynamic";
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
    return { title: "Article Not Found — MuscleHub" };
  }

  return {
    title: og.title,
    description: og.description,
    alternates: { canonical: og.articleUrl },
    openGraph: {
      type: "article",
      url: og.articleUrl,
      title: og.title,
      description: og.description,
      images: [{ url: og.image, width: 1200, height: 630 }],
      siteName: "MuscleHub",
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
  return <BlogArticlePage lang="en" slug={slug} />;
}
