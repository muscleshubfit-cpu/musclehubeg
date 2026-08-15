"use client";

import { useEffect, useState } from "react";
import { LanguageToggle } from "@/components/LanguageToggle";
import { getBlogPost, getRelatedPosts, getLinkedPost, parseTableOfContents, renderMarkdown, getCategoryLabel, type BlogPost } from "@/lib/blog";
import { BlogCTA, NewsletterBlock, SocialShare, ReadingProgress, TableOfContents } from "./BlogComponents";
import { AdSenseAd } from "@/components/AdSenseAd";

export function BlogArticlePage({ lang, slug }: { lang: "en" | "ar"; slug: string }) {
  const isAr = lang === "ar";
  const [post, setPost] = useState<BlogPost | null>(null);
  const [linked, setLinked] = useState<BlogPost | null>(null);
  const [related, setRelated] = useState<BlogPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCTA, setShowCTA] = useState(false);

  useEffect(() => {
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
  }, [lang, slug]);

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
      <div className="flex min-h-screen items-center justify-center bg-white">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-[#0071e3] border-t-transparent" />
      </div>
    );
  }

  if (!post) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-white">
        <p className="text-base font-normal text-[#6e6e73]">{isAr ? "المقال غير موجود" : "Article not found"}</p>
        <a href={isAr ? "/ar/blog" : "/blog"} className="text-base font-normal text-[#0071e3] transition-opacity hover:opacity-70">
          {isAr ? "العودة للمدونة ›" : "Back to blog ›"}
        </a>
      </div>
    );
  }

  const toc = parseTableOfContents(post.content);
  const htmlContent = renderMarkdown(post.content);
  const baseUrl = "https://musclehubeg.vercel.app";
  const articleUrl = `${baseUrl}${isAr ? "/ar/blog" : "/blog"}/${post.slug}`;
  const linkedUrl = linked ? `${baseUrl}${linked.language === "ar" ? "/ar/blog" : "/blog"}/${linked.slug}` : null;

  const shareTitle = post.meta_title || post.title;
  const shareDescription = post.meta_description || post.excerpt || "";
  const shareImage = post.featured_image || "https://musclehubeg.vercel.app/logo.png";

  return (
    <div className="flex min-h-screen flex-col bg-white text-[#1d1d1f]" dir={isAr ? "rtl" : "ltr"}>
      <ReadingProgress />

      <header className="sticky top-0 z-40 border-b border-[#d2d2d7] bg-white/80 backdrop-blur-xl">
        <div className="mx-auto flex h-16 w-full max-w-6xl items-center justify-between px-4 sm:px-6">
          <a href="/" className="text-lg font-semibold tracking-tight">
            MuscleHub
          </a>
          <div className="flex items-center gap-4">
            <LanguageToggle />
            <a
              href={isAr ? "/ar/blog" : "/blog"}
              className="text-sm font-normal text-[#0071e3] transition-opacity hover:opacity-70"
            >
              {isAr ? "‹ المدونة" : "‹ Blog"}
            </a>
          </div>
        </div>
      </header>

      {/* hreflang alternate links (for SEO) */}
      <link rel="alternate" hrefLang="en" href={`${baseUrl}/blog/${post.slug}`} />
      {linkedUrl && <link rel="alternate" hrefLang="ar" href={linkedUrl} />}
      <link rel="canonical" href={articleUrl} />

      {/* JSON-LD Schemas (unchanged — for SEO) */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "Article",
            headline: post.title,
            description: post.meta_description || post.excerpt,
            image: post.featured_image,
            author: { "@type": "Person", name: post.author },
            publisher: { "@type": "Organization", name: "MuscleHub" },
            datePublished: post.published_at,
            dateModified: post.updated_at,
            mainEntityOfPage: { "@type": "WebPage", "@id": articleUrl },
            keywords: (post.keywords || []).join(", "),
          }),
        }}
      />
      {post.faq_json && Array.isArray(post.faq_json) && post.faq_json.length > 0 && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "FAQPage",
              mainEntity: post.faq_json.map((faq: any) => ({
                "@type": "Question",
                name: faq.question,
                acceptedAnswer: { "@type": "Answer", text: faq.answer },
              })),
            }),
          }}
        />
      )}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "BreadcrumbList",
            itemListElement: [
              { "@type": "ListItem", position: 1, name: isAr ? "الرئيسية" : "Home", item: baseUrl },
              { "@type": "ListItem", position: 2, name: isAr ? "المدونة" : "Blog", item: `${baseUrl}${isAr ? "/ar/blog" : "/blog"}` },
              { "@type": "ListItem", position: 3, name: post.title, item: articleUrl },
            ],
          }),
        }}
      />

      <main className="mx-auto w-full max-w-4xl flex-1 px-4 py-12 sm:px-6 md:py-20">
        {/* Breadcrumb */}
        <nav className="mb-8 flex items-center gap-2 text-sm font-normal text-[#6e6e73]">
          <a href="/" className="transition-opacity hover:opacity-70">{isAr ? "الرئيسية" : "Home"}</a>
          <span>/</span>
          <a href={isAr ? "/ar/blog" : "/blog"} className="transition-opacity hover:opacity-70">{isAr ? "المدونة" : "Blog"}</a>
          <span>/</span>
          <span className="truncate text-[#1d1d1f]">{post.title}</span>
        </nav>

        <div className="grid gap-12 lg:grid-cols-[1fr_220px]">
          {/* Article content */}
          <article>
            {/* Hero */}
            <div className="mb-8">
              <div className="flex flex-wrap items-center gap-3 text-xs font-normal text-[#6e6e73]">
                <span className="rounded-full bg-[#f5f5f7] px-2.5 py-0.5">
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
              <p className="mt-4 text-lg font-normal leading-relaxed text-[#6e6e73] md:text-xl">
                {post.excerpt}
              </p>
              <div className="mt-6 flex items-center gap-3">
                <span className="grid h-10 w-10 place-items-center rounded-full bg-[#1d1d1f] text-sm font-semibold text-white">
                  {post.author.charAt(0)}
                </span>
                <div>
                  <p className="text-sm font-medium">{post.author}</p>
                  <p className="text-xs font-normal text-[#6e6e73]">{isAr ? "كوتش معتمد" : "Certified Coach"}</p>
                </div>
              </div>
            </div>

            {/* Featured image */}
            {post.featured_image && (
              <div className="mb-10 overflow-hidden rounded-3xl">
                <img
                  src={post.featured_image}
                  alt={post.cover_alt || post.title}
                  className="aspect-[2/1] w-full object-cover"
                  loading="eager"
                />
              </div>
            )}

            {/* Content — Apple-style typography */}
            <div
              className="prose prose-sm max-w-none text-[#1d1d1f] [&_a]:text-[#0071e3] [&_a]:no-underline [&_a]:transition-opacity [&_a]:hover:opacity-70 [&_h2]:mt-10 [&_h2]:mb-4 [&_h2]:text-2xl [&_h2]:font-semibold [&_h2]:tracking-tight [&_h3]:mt-8 [&_h3]:mb-3 [&_h3]:text-xl [&_h3]:font-semibold [&_h3]:tracking-tight [&_p]:my-5 [&_p]:text-base [&_p]:leading-relaxed [&_p]:text-[#1d1d1f] [&_p]:md:text-lg [&_p]:md:leading-relaxed [&_blockquote]:border-s-4 [&_blockquote]:border-[#0071e3] [&_blockquote]:ps-5 [&_blockquote]:py-2 [&_blockquote]:my-6 [&_blockquote]:text-lg [&_blockquote]:font-normal [&_blockquote]:text-[#1d1d1f] [&_blockquote]:italic [&_code]:rounded [&_code]:bg-[#f5f5f7] [&_code]:px-1.5 [&_code]:py-0.5 [&_code]:text-sm [&_code]:font-mono [&_pre]:my-6 [&_pre]:rounded-2xl [&_pre]:bg-[#1d1d1f] [&_pre]:p-5 [&_pre]:text-sm [&_pre]:text-white [&_pre]:overflow-x-auto [&_table]:my-6 [&_table]:w-full [&_td]:border [&_td]:border-[#d2d2d7] [&_td]:p-3 [&_th]:border [&_th]:border-[#d2d2d7] [&_th]:p-3 [&_th]:bg-[#f5f5f7] [&_th]:text-start [&_th]:font-semibold [&_ul]:my-5 [&_ul]:list-disc [&_ul]:ps-6 [&_ol]:my-5 [&_ol]:list-decimal [&_ol]:ps-6 [&_li]:my-2 [&_li]:text-base [&_li]:md:text-lg [&_li]:leading-relaxed"
              dangerouslySetInnerHTML={{ __html: htmlContent }}
            />

            {/* AdSense — after article content */}
            <AdSenseAd format="auto" />

            {/* Tags */}
            {post.tags && post.tags.length > 0 && (
              <div className="mt-10 flex flex-wrap gap-2">
                {post.tags.map((tag) => (
                  <span key={tag} className="rounded-full bg-[#f5f5f7] px-3 py-1 text-xs font-normal text-[#6e6e73]">
                    #{tag}
                  </span>
                ))}
              </div>
            )}

            {/* Social share */}
            <SocialShare url={articleUrl} ogUrl={`${baseUrl}/api/og/${post.slug}?lang=${isAr ? "ar" : "en"}`} title={shareTitle} description={shareDescription} image={shareImage} lang={lang} />

            {/* Language alternate link */}
            {linkedUrl && linked && (
              <div className="my-8 rounded-3xl bg-[#f5f5f7] p-6 text-center">
                <p className="text-sm font-normal text-[#6e6e73]">
                  {isAr ? "هذا المقال متاح أيضاً بالإنجليزية:" : "This article is also available in Arabic:"}
                </p>
                <a href={linkedUrl} className="mt-2 inline-block text-base font-normal text-[#0071e3] transition-opacity hover:opacity-70">
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
                  {post.faq_json.map((faq: any, i: number) => (
                    <div key={i} className="rounded-2xl bg-[#f5f5f7] p-6">
                      <h3 className="text-base font-semibold tracking-tight">{faq.question}</h3>
                      <p className="mt-2 text-base font-normal leading-relaxed text-[#6e6e73]">{faq.answer}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* CTA */}
            {showCTA && <BlogCTA lang={lang} />}

            {/* Newsletter */}
            <NewsletterBlock lang={lang} />

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
                      className="group block overflow-hidden rounded-3xl bg-[#f5f5f7] transition-opacity hover:opacity-90"
                    >
                      {rel.featured_image && (
                        <div className="aspect-video overflow-hidden">
                          <img
                            src={rel.featured_image}
                            alt={rel.title}
                            className="h-full w-full object-cover"
                            loading="lazy"
                          />
                        </div>
                      )}
                      <div className="p-5">
                        <span className="text-xs font-normal text-[#6e6e73]">
                          {getCategoryLabel(rel.category, lang)}
                        </span>
                        <h3 className="mt-2 text-base font-semibold leading-tight tracking-tight">{rel.title}</h3>
                        <p className="mt-2 line-clamp-2 text-sm font-normal text-[#6e6e73]">{rel.excerpt}</p>
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

      <footer className="mt-auto border-t border-[#d2d2d7] py-6 text-center text-xs font-normal text-[#6e6e73]">
        © {new Date().getFullYear()} MuscleHub. {isAr ? "كل الحقوق محفوظة." : "All rights reserved."}
      </footer>
    </div>
  );
}

