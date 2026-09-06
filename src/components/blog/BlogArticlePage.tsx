"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { SiteHeader } from "@/components/SiteHeader";
import { getBlogPost, getRelatedPosts, getLinkedPost, parseTableOfContents, renderMarkdown, getCategoryLabel, type BlogPost, type BlogPostCard, type BlogFaq } from "@/lib/blog";
import { BlogMembershipCard, SocialShare, ReadingProgress, TableOfContents } from "./BlogComponents";
import { AdSenseAd } from "@/components/AdSenseAd";

export function BlogArticlePage({
  lang,
  slug,
  initialPost,
}: {
  lang: "en" | "ar";
  slug: string;
  initialPost?: BlogPost | null;
}) {
  const isAr = lang === "ar";
  // M28 fix: accept initialPost as a prop from the server component.
  // If provided, use it immediately (server-rendered content in initial HTML).
  // If not (e.g. fallback), fetch client-side as before.
  const [post, setPost] = useState<BlogPost | null>(initialPost ?? null);
  const [linked, setLinked] = useState<BlogPostCard | null>(null);
  const [related, setRelated] = useState<BlogPostCard[]>([]);
  const [loading, setLoading] = useState(!initialPost);
  const [showCTA, setShowCTA] = useState(false);

  useEffect(() => {
    if (initialPost) {
      // Already have the post from server — just fetch related + linked
      (async () => {
        const [rel, lnk] = await Promise.all([
          getRelatedPosts(initialPost),
          getLinkedPost(initialPost),
        ]);
        setRelated(rel);
        setLinked(lnk);
      })();
      return;
    }
    // No initial post — fetch client-side (fallback path)
    (async () => {
      setLoading(true);
      const p = await getBlogPost(lang, slug);
      setPost(p);
      if (p) {
        const [rel, lnk] = await Promise.all([
          getRelatedPosts(p),
          getLinkedPost(p),
        ]);
        setRelated(rel);
        setLinked(lnk);
      }
      setLoading(false);
    })();
  }, [lang, slug, initialPost]);

  useEffect(() => {
    const handleScroll = () => {
      const scrolled = window.scrollY;
      const height = document.documentElement.scrollHeight - window.innerHeight;
      if (height > 0 && scrolled / height >= 0.7) {
        setShowCTA(true);
      }
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[var(--bg)]">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-[#0071e3] border-t-transparent" />
      </div>
    );
  }

  if (!post) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-[var(--bg)]">
        <p className="text-base font-normal text-[var(--muted-foreground)]">{isAr ? "المقال غير موجود" : "Article not found"}</p>
        <a href={isAr ? "/ar/blog" : "/blog"} className="text-base font-normal text-[var(--muted-2)] underline-offset-4 transition-opacity hover:opacity-70 hover:underline">
          {isAr ? "العودة للمدونة ›" : "Back to blog ›"}
        </a>
      </div>
    );
  }

  const toc = parseTableOfContents(post.content);
  const htmlContent = renderMarkdown(post.content);
  const baseUrl = "https://alkemos.com";
  const articleUrl = `${baseUrl}${isAr ? "/ar/blog" : "/blog"}/${post.slug}`;
  const linkedUrl = linked ? `${baseUrl}${linked.language === "ar" ? "/ar/blog" : "/blog"}/${linked.slug}` : null;

  const shareTitle = post.meta_title || post.title;
  const shareDescription = post.meta_description || post.excerpt || "";
  const shareImage = post.featured_image || "https://alkemos.com/logo.png";

  return (
    <div className="flex min-h-screen flex-col bg-[var(--bg)] text-[var(--text)]" dir={isAr ? "rtl" : "ltr"}>
      <ReadingProgress />

      {/* M41 fix: use SiteHeader (full nav) instead of minimal header.
          Blog readers can now navigate to exercises, foods, programs, etc.
          without manually editing the URL. */}
      <SiteHeader variant="landing" />

      {/* M42 fix: removed <link rel="alternate"> + <link rel="canonical"> tags
          from the body. These are now handled server-side in generateMetadata
          (blog/[slug]/page.tsx) so they appear in <head>, not <body>. */}

      {/* JSON-LD schemas are injected server-side in /app/blog/[slug]/page.tsx
          and /app/ar/blog/[slug]/page.tsx (Article + Breadcrumb + FAQPage).
          We deliberately DO NOT duplicate them here — server-rendered JSON-LD
          is visible to crawlers without executing JavaScript, which is the
          correct SEO pattern. */}

      <main className="mx-auto w-full max-w-4xl flex-1 px-4 py-12 sm:px-6 md:py-20">
        {/* Breadcrumb */}
        <nav className="mb-8 flex items-center gap-2 text-sm font-normal text-[var(--muted-foreground)]">
          <a href="/" className="transition-opacity hover:opacity-70">{isAr ? "الرئيسية" : "Home"}</a>
          <span>/</span>
          <a href={isAr ? "/ar/blog" : "/blog"} className="transition-opacity hover:opacity-70">{isAr ? "المدونة" : "Blog"}</a>
          <span>/</span>
          <span className="truncate text-[var(--text)]">{post.title}</span>
        </nav>

        <div className="grid gap-12 lg:grid-cols-[1fr_220px]">
          {/* Article content */}
          <article>
            {/* Hero */}
            <div className="mb-8">
              <div className="flex flex-wrap items-center gap-3 text-xs font-normal text-[var(--muted-foreground)]">
                <span className="rounded-full border border-[var(--edge)] bg-[var(--tint)] px-2.5 py-0.5 text-xs font-medium text-[var(--muted-2)]">
                  {getCategoryLabel(post.category, lang)}
                </span>
                <span>{post.reading_time} {isAr ? "دقائق قراءة" : "min read"}</span>
                {post.published_at && (
                  <span>
                    {new Date(post.published_at).toLocaleDateString(isAr ? "ar-EG" : "en-US", { year: "numeric", month: "long", day: "numeric" })}
                  </span>
                )}
              </div>
              <h1 className="mt-4 text-4xl font-semibold leading-[1.1] tracking-tight md:text-5xl">
                {post.title}
              </h1>
              <p className="mt-4 text-lg font-normal leading-relaxed text-[var(--muted-foreground)] md:text-xl">
                {post.excerpt}
              </p>
              <div className="mt-6 flex items-center gap-3">
                <span className="grid h-10 w-10 place-items-center rounded-full border border-[var(--edge)] bg-[var(--tint)] text-sm font-semibold text-[var(--text)]">
                  {post.author.charAt(0)}
                </span>
                <div>
                  <p className="text-sm font-medium">{post.author}</p>
                  <p className="text-xs font-normal text-[var(--muted-foreground)]">{isAr ? "كوتش معتمد" : "Certified Coach"}</p>
                </div>
              </div>
            </div>

            {/* Featured image — next/image (site image system) converts
                the Pexels CDN photo to lightweight responsive WebP at the
                edge (IMAGE SOURCE LAW v3: «حجم خفيف بنظام الموقع»). */}
            {post.featured_image && (
              <div className="relative mb-10 aspect-[2/1] overflow-hidden rounded-3xl">
                <Image
                  src={post.featured_image}
                  alt={post.cover_alt || post.title}
                  fill
                  sizes="(max-width: 896px) 100vw, 896px"
                  className="object-cover"
                  priority
                />
              </div>
            )}

            {/* Content — Apple-style typography */}
            <div
              className="prose prose-sm max-w-none text-[var(--text)] [&_a]:text-[var(--muted-2)] [&_a]:no-underline [&_a]:transition-opacity [&_a]:hover:opacity-70 [&_h2]:mt-10 [&_h2]:mb-4 [&_h2]:text-2xl [&_h2]:font-semibold [&_h2]:tracking-tight [&_h3]:mt-8 [&_h3]:mb-3 [&_h3]:text-xl [&_h3]:font-semibold [&_h3]:tracking-tight [&_p]:my-5 [&_p]:text-base [&_p]:leading-relaxed [&_p]:text-[var(--muted-2)] [&_p]:md:text-lg [&_p]:md:leading-relaxed [&_blockquote]:border-s-4 [&_blockquote]:border-[var(--chrome-edge)] [&_blockquote]:ps-5 [&_blockquote]:py-2 [&_blockquote]:my-6 [&_blockquote]:text-lg [&_blockquote]:font-normal [&_blockquote]:text-[var(--text)] [&_blockquote]:italic [&_code]:rounded [&_code]:bg-[var(--tint)] [&_code]:px-1.5 [&_code]:py-0.5 [&_code]:text-sm [&_code]:font-mono [&_pre]:my-6 [&_pre]:rounded-2xl [&_pre]:bg-black [&_pre]:p-5 [&_pre]:text-sm [&_pre]:text-white [&_pre]:overflow-x-auto [&_table]:my-6 [&_table]:w-full [&_td]:border [&_td]:border-[var(--edge)] [&_td]:p-3 [&_th]:border [&_th]:border-[var(--edge)] [&_th]:p-3 [&_th]:bg-[var(--tint)] [&_th]:text-start [&_th]:font-semibold [&_ul]:my-5 [&_ul]:list-disc [&_ul]:ps-6 [&_ol]:my-5 [&_ol]:list-decimal [&_ol]:ps-6 [&_li]:my-2 [&_li]:text-base [&_li]:md:text-lg [&_li]:leading-relaxed"
              dangerouslySetInnerHTML={{ __html: htmlContent }}
            />

            {/* AdSense — after article content */}
            <AdSenseAd format="auto" />

            {/* Tags */}
            {post.tags && post.tags.length > 0 && (
              <div className="mt-10 flex flex-wrap gap-2">
                {post.tags.map((tag) => (
                  <span key={tag} className="rounded-full border border-[var(--edge)] bg-[var(--tint)] px-3 py-1 text-xs font-normal text-[var(--muted-foreground)]">
                    #{tag}
                  </span>
                ))}
              </div>
            )}

            {/* Social share */}
            <SocialShare url={articleUrl} ogUrl={`${baseUrl}/api/og-image/${post.slug}?lang=${isAr ? "ar" : "en"}`} title={shareTitle} description={shareDescription} image={shareImage} lang={lang} />

            {/* Language alternate link */}
            {linkedUrl && linked && (
              <div className="marble-card my-8 p-6 text-center">
                <p className="text-sm font-normal text-[var(--muted-foreground)]">
                  {isAr ? "هذا المقال متاح أيضاً بالإنجليزية:" : "This article is also available in Arabic:"}
                </p>
                <a href={linkedUrl} className="btn-outline mt-2 inline-block px-6 py-2.5 text-sm">
                  {linked.title} ›
                </a>
              </div>
            )}

            {/* FAQ Section */}
            {post.faq_json && Array.isArray(post.faq_json) && post.faq_json.length > 0 && (
              <div className="mt-16">
                <h2 className="text-2xl font-semibold tracking-tight md:text-3xl">
                  {isAr ? "الأسئلة الشائعة" : "Frequently Asked Questions"}
                </h2>
                <div className="mt-8 space-y-4">
                  {post.faq_json.map((faq: BlogFaq, i: number) => (
                    <div key={i} className="marble-card p-6">
                      <h3 className="text-base font-semibold tracking-tight">{faq.question}</h3>
                      <p className="mt-2 text-base font-normal leading-relaxed text-[var(--muted-foreground)]">{faq.answer}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Membership card (replaces old BlogCTA + NewsletterBlock) */}
            {showCTA && <BlogMembershipCard lang={lang} />}

            {/* Related posts */}
            {related.length > 0 && (
              <div className="mt-16">
                <h2 className="text-2xl font-semibold tracking-tight md:text-3xl">
                  {isAr ? "مقالات ذات صلة" : "Related Articles"}
                </h2>
                <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
                  {related.map((rel) => (
                    <a
                      key={rel.id}
                      href={isAr ? `/ar/blog/${rel.slug}` : `/blog/${rel.slug}`}
                      className="marble-card group block overflow-hidden transition-opacity hover:opacity-90"
                    >
                      {rel.featured_image && (
                        <div className="relative aspect-video overflow-hidden">
                          <Image
                            src={rel.featured_image}
                            alt={rel.title}
                            fill
                            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 300px"
                            className="object-cover"
                          />
                        </div>
                      )}
                      <div className="p-5">
                        <span className="text-xs font-normal text-[var(--muted-foreground)]">
                          {getCategoryLabel(rel.category, lang)}
                        </span>
                        <h3 className="mt-2 text-base font-semibold leading-tight tracking-tight">{rel.title}</h3>
                        <p className="mt-2 line-clamp-2 text-sm font-normal text-[var(--muted-foreground)]">{rel.excerpt}</p>
                      </div>
                    </a>
                  ))}
                </div>
              </div>
            )}
          </article>

          {/* Sidebar: Table of Contents */}
          <aside className="hidden lg:block">
            <TableOfContents items={toc} lang={lang} />
          </aside>
        </div>
      </main>

      <footer className="mt-auto border-t border-[var(--edge)] py-6 text-center text-xs font-normal text-[var(--muted-foreground)]">
        © {new Date().getFullYear()} Alkemos. {isAr ? "كل الحقوق محفوظة." : "All rights reserved."}
      </footer>
    </div>
  );
}

