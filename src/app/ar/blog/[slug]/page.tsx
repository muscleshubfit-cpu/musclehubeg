import { BlogArticlePage } from "@/components/blog/BlogArticlePage";
import { getBlogPost } from "@/lib/blog";
import type { Metadata } from "next";

// Force dynamic rendering so generateMetadata runs on every request
export const dynamic = "force-dynamic";

/**
 * Server-side metadata for Arabic articles — puts OG tags in <head>.
 */
export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const post = await getBlogPost("ar", slug);

  if (!post) {
    return {
      title: "المقال غير موجود — MuscleHub",
    };
  }

  const baseUrl = "https://musclehubeg.vercel.app";
  const articleUrl = `${baseUrl}/ar/blog/${post.slug}`;
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
      locale: "ar_EG",
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
  return <ArticleComponent lang="ar" slug={slug} />;
}
