import { BlogArticlePage } from "@/components/blog/BlogArticlePage";
import { createClient } from "@supabase/supabase-js";
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

  // Create a server-side Supabase client using env vars
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  let post: any = null;
  if (supabaseUrl && supabaseAnonKey) {
    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const { data } = await supabase
      .from("blog_posts")
      .select("*")
      .eq("language", "en")
      .eq("slug", slug)
      .eq("is_published", true)
      .maybeSingle();
    post = data;
  }

  if (!post) {
    return { title: "Article Not Found — MuscleHub" };
  }

  const baseUrl = "https://musclehubeg.vercel.app";
  const articleUrl = `${baseUrl}/blog/${post.slug}`;
  const title = post.meta_title || post.title;
  const description = post.meta_description || post.excerpt || "";
  const image = post.featured_image || `${baseUrl}/logo.png`;

  return {
    title,
    description,
    alternates: { canonical: articleUrl },
    openGraph: {
      type: "article",
      url: articleUrl,
      title,
      description,
      images: [{ url: image, width: 1200, height: 630, alt: post.cover_alt || post.title }],
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

export default async function Page({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;

  // Also fetch the post on the server side so we can inject OG tags
  // directly into <head> (workaround for Next.js 16 Turbopack not
  // injecting generateMetadata results into <head> during SSR).
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  let post: any = null;
  if (supabaseUrl && supabaseAnonKey) {
    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const { data } = await supabase
      .from("blog_posts")
      .select("*")
      .eq("language", "en")
      .eq("slug", slug)
      .eq("is_published", true)
      .maybeSingle();
    post = data;
  }

  const baseUrl = "https://musclehubeg.vercel.app";
  const articleUrl = `${baseUrl}/blog/${slug}`;
  const title = post?.meta_title || post?.title || "MuscleHub Blog";
  const description = post?.meta_description || post?.excerpt || "";
  const image = post?.featured_image || `${baseUrl}/logo.png`;

  return (
    <>
      <head>
        <meta property="og:type" content="article" />
        <meta property="og:url" content={articleUrl} />
        <meta property="og:title" content={title} />
        <meta property="og:description" content={description} />
        <meta property="og:image" content={image} />
        <meta property="og:image:width" content="1200" />
        <meta property="og:image:height" content="630" />
        <meta property="og:site_name" content="MuscleHub" />
        <meta property="og:locale" content="en_US" />
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content={title} />
        <meta name="twitter:description" content={description} />
        <meta name="twitter:image" content={image} />
      </head>
      <BlogArticlePage lang="en" slug={slug} />
    </>
  );
}
