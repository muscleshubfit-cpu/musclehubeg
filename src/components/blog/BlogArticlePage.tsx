"use client";

import { useEffect, useState } from "react";
import { Dumbbell, Calendar, Clock, ArrowRight, ArrowLeft, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { LanguageToggle } from "@/components/LanguageToggle";
import { getBlogPost, getRelatedPosts, getLinkedPost, parseTableOfContents, renderMarkdown, getCategoryLabel, type BlogPost } from "@/lib/blog";
import { BlogCTA, NewsletterBlock, SocialShare, ReadingProgress, TableOfContents } from "./BlogComponents";

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

 // Show CTA after 70% scroll
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
 <div className="min-h-screen flex items-center justify-center bg-background">
 <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
 </div>
 );
 }

 if (!post) {
 return (
 <div className="min-h-screen flex flex-col items-center justify-center bg-background gap-4">
 <p className="text-muted-foreground">{isAr ? "المقال غير موجود" : "Article not found"}</p>
 <a href={isAr ? "/ar/blog" : "/blog"}>
 <Button variant="outline">{isAr ? "العودة للمدونة" : "Back to blog"}</Button>
 </a>
 </div>
 );
 }

 const toc = parseTableOfContents(post.content);
 const htmlContent = renderMarkdown(post.content);
 const baseUrl = "https://musclehubeg.vercel.app";
 const articleUrl = `${baseUrl}${isAr ? "/ar/blog" : "/blog"}/${post.slug}`;
 const linkedUrl = linked ? `${baseUrl}${linked.language === "ar" ? "/ar/blog" : "/blog"}/${linked.slug}` : null;

 // Social share metadata — used by SocialShare component
 const shareTitle = post.meta_title || post.title;
 const shareDescription = post.meta_description || post.excerpt || "";
 const shareImage = post.featured_image || "https://musclehubeg.vercel.app/logo.png";

 return (
 <div className="min-h-screen flex flex-col bg-background" dir={isAr ? "rtl" : "ltr"}>
 <ReadingProgress />

 {/* Note: OG + Twitter meta tags are now generated server-side via
     generateMetadata() in the page.tsx route file, so they appear in <head>
     where Facebook/LinkedIn/X can find them. */}

 <header className="sticky top-0 z-40 border-b border-border bg-background/80 backdrop-blur-xl">
 <div className="mx-auto flex h-16 w-full max-w-6xl items-center justify-between px-4 sm:px-6">
 <a href="/" className="flex items-center gap-2">
 <img
 src="/logo.png"
 alt="MuscleHub"
 className="hidden h-9 w-auto object-contain sm:block"
 />
 <img
 src="/icon-192.png"
 alt="MuscleHub"
 className="h-9 w-9 rounded-lg object-contain sm:hidden"
 />
 </a>
 <div className="flex items-center gap-2">
 <LanguageToggle />
 <a href={isAr ? "/ar/blog" : "/blog"}>
 <Button variant="ghost" size="sm" className="gap-1">
 <ArrowLeft className="h-4 w-4 rtl:rotate-180" />
 {isAr ? "المدونة" : "Blog"}
 </Button>
 </a>
 </div>
 </div>
 </header>

 {/* hreflang alternate links (for SEO) */}
 <link rel="alternate" hrefLang="en" href={`${baseUrl}/blog/${post.slug}`} />
 {linkedUrl && <link rel="alternate" hrefLang="ar" href={linkedUrl} />}
 <link rel="canonical" href={articleUrl} />

 {/* JSON-LD Article Schema */}
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

 {/* JSON-LD FAQ Schema */}
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

 {/* JSON-LD Breadcrumb Schema */}
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

 <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-8 sm:px-6">
 {/* Breadcrumb */}
 <nav className="mb-6 flex items-center gap-2 text-sm text-muted-foreground">
 <a href="/" className="hover:text-primary">{isAr ? "الرئيسية" : "Home"}</a>
 <span>/</span>
 <a href={isAr ? "/ar/blog" : "/blog"} className="hover:text-primary">{isAr ? "المدونة" : "Blog"}</a>
 <span>/</span>
 <span className="truncate text-foreground">{post.title}</span>
 </nav>

 <div className="grid gap-8 lg:grid-cols-[1fr_250px]">
 {/* Article content */}
 <article>
 {/* Hero */}
 <div className="mb-6">
 <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
 <Badge variant="secondary">{getCategoryLabel(post.category, lang)}</Badge>
 <span className="flex items-center gap-1"><Clock className="h-3 w-3" /> {post.reading_time} {isAr ? "دقائق قراءة" : "min read"}</span>
 {post.published_at && (
 <span className="flex items-center gap-1">
 <Calendar className="h-3 w-3" />
 {new Date(post.published_at).toLocaleDateString(isAr ? "ar-EG" : "en-US", { year: "numeric", month: "long", day: "numeric" })}
 </span>
 )}
 </div>
 <h1 className="mt-3 text-3xl font-extrabold leading-tight md:text-4xl">{post.title}</h1>
 <p className="mt-3 text-lg text-muted-foreground">{post.excerpt}</p>
 <div className="mt-4 flex items-center gap-2">
 <span className="grid h-9 w-9 place-items-center rounded-full bg-gradient-primary text-sm font-bold text-primary-foreground">
 {post.author.charAt(0)}
 </span>
 <div>
 <p className="text-sm font-medium">{post.author}</p>
 <p className="text-xs text-muted-foreground">{isAr ? "كوتش معتمد" : "Certified Coach"}</p>
 </div>
 </div>
 </div>

 {/* Featured image */}
 {post.featured_image && (
 <div className="mb-8 overflow-hidden rounded-2xl">
 <img
 src={post.featured_image}
 alt={post.cover_alt || post.title}
 className="aspect-[2/1] w-full object-cover"
 loading="eager"
 />
 </div>
 )}

 {/* Content */}
 <div
 className="prose prose-sm max-w-none text-foreground [&_a]:text-primary [&_h2]:mt-8 [&_h2]:mb-3 [&_h2]:font-bold [&_h3]:mt-6 [&_h3]:mb-2 [&_h3]:font-semibold [&_p]:leading-relaxed [&_blockquote]:border-s-4 [&_blockquote]:border-primary [&_blockquote]:ps-4 [&_blockquote]:italic [&_blockquote]:text-muted-foreground [&_code]:bg-muted [&_code]:rounded [&_code]:px-1 [&_code]:text-sm [&_pre]:bg-muted [&_pre]:rounded-lg [&_pre]:p-4 [&_table]:w-full [&_td]:border [&_td]:border-border [&_td]:p-2"
 dangerouslySetInnerHTML={{ __html: htmlContent }}
 />

 {/* Tags */}
 {post.tags && post.tags.length > 0 && (
 <div className="mt-8 flex flex-wrap gap-2">
 {post.tags.map((tag) => (
 <Badge key={tag} variant="outline" className="text-xs">#{tag}</Badge>
 ))}
 </div>
 )}

 {/* Social share */}
 {/* Social share — use /api/og/[slug] for Facebook/LinkedIn so OG tags are in <head> */}
 <SocialShare url={articleUrl} ogUrl={`${baseUrl}/api/og/${post.slug}?lang=${isAr ? "ar" : "en"}`} title={shareTitle} description={shareDescription} image={shareImage} lang={lang} />

 {/* Language alternate link */}
 {linkedUrl && linked && (
 <div className="my-6 rounded-xl border border-primary/20 bg-primary/5 p-4 text-center">
 <p className="text-sm text-muted-foreground">
 {isAr ? "هذا المقال متاح أيضاً بالإنجليزية:" : "This article is also available in Arabic:"}
 </p>
 <a href={linkedUrl} className="mt-1 inline-flex items-center gap-1 font-semibold text-primary hover:underline">
 {linked.title}
 <ArrowRight className="h-4 w-4 rtl:rotate-180" />
 </a>
 </div>
 )}

 {/* FAQ Section */}
 {post.faq_json && Array.isArray(post.faq_json) && post.faq_json.length > 0 && (
 <div className="mt-12">
 <h2 className="text-2xl font-bold">{isAr ? "الأسئلة الشائعة" : "Frequently Asked Questions"}</h2>
 <div className="mt-4 space-y-4">
 {post.faq_json.map((faq: any, i: number) => (
 <div key={i} className="rounded-xl border border-border bg-card p-4">
 <h3 className="font-semibold">{faq.question}</h3>
 <p className="mt-2 text-sm text-muted-foreground">{faq.answer}</p>
 </div>
 ))}
 </div>
 </div>
 )}

 {/* CTA (shows after 70% scroll) */}
 {showCTA && <BlogCTA lang={lang} />}

 {/* Newsletter */}
 <NewsletterBlock lang={lang} />

 {/* Related posts */}
 {related.length > 0 && (
 <div className="mt-12">
 <h2 className="text-2xl font-bold">{isAr ? "مقالات ذات صلة" : "Related Articles"}</h2>
 <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
 {related.map((rel) => (
 <a
 key={rel.id}
 href={isAr ? `/ar/blog/${rel.slug}` : `/blog/${rel.slug}`}
 className="group overflow-hidden rounded-xl border border-border bg-card transition-all hover:border-primary/40"
 >
 {rel.featured_image && (
 <div className="aspect-video overflow-hidden">
 <img src={rel.featured_image} alt={rel.title} className="h-full w-full object-cover transition-transform group-hover:scale-105" loading="lazy" />
 </div>
 )}
 <div className="p-4">
 <Badge variant="secondary" className="text-xs">{getCategoryLabel(rel.category, lang)}</Badge>
 <h3 className="mt-2 font-semibold leading-snug group-hover:text-primary">{rel.title}</h3>
 <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">{rel.excerpt}</p>
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

 <footer className="mt-auto border-t border-border py-6 text-center text-sm text-muted-foreground">
 © {new Date().getFullYear()} MuscleHub. {isAr ? "كل الحقوق محفوظة." : "All rights reserved."}
 </footer>
 </div>
 );
}
