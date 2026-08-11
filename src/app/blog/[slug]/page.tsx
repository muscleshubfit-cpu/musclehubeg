import { BlogArticlePage } from "@/components/blog/BlogArticlePage";
import { getBlogPost } from "@/lib/blog";
import type { Metadata } from "next";

/**
 * Server-side metadata generation — puts OG tags in <head> where Facebook,
 * LinkedIn, X, and WhatsApp can find them.
 *
 * This is the CORRECT way to set social share metadata in Next.js App Router:
 * the `generateMetadata` function runs on the server, fetches the article,
 * and injects the OG + Twitter meta tags into the <head> element.
 */
export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const post = await getBlogPost("en", slug);

  if (!post) {
    return {
      title: "Article Not Found — MuscleHub",
    };
  }

  const baseUrl = "https://musclehubeg.vercel.app";
  const articleUrl = `${baseUrl}/blog/${post.slug}`;
  const title = post.meta_title || post.title;
  const description = post.meta_description || post.excerpt || "";
  const image = post.featured_image || `${baseUrl}/logo.png`;

  return {
    title,
    description,
    alternates: {
      canonical: articleUrl,
    },
    openGraph: {
      type: "article",
      url: articleUrl,
      title,
      description,
      images: [
        {
          url: image,
          width: 1200,
          height: 630,
          alt: post.cover_alt || post.title,
        },
      ],
      siteName: "MuscleHub",
      locale: "en_US",
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [image],
    },
  };
}

export default function Page({ params }: { params: Promise<{ slug: string }> }) {
  return <BlogArticlePageAsync params={params} />;
}

import { BlogArticlePage as ArticleComponent } from "@/components/blog/BlogArticlePage";

async function BlogArticlePageAsync({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  return <ArticleComponent lang="en" slug={slug} />;
}
