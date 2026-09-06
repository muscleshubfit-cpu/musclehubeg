"use client";

import Image from "next/image";
import { SiteHeader } from "@/components/SiteHeader";
import { PageBanner } from "@/components/PageBanner";

import { useEffect, useState } from "react";
import { listBlogPosts, BLOG_CATEGORIES, getCategoryLabel, type BlogPostCard } from "@/lib/blog";

export function BlogListPage({
  lang,
  initialPosts,
}: {
  lang: "en" | "ar";
  /** Server-fetched posts (SSR, H1 audit fix) — seed the first render. */
  initialPosts?: BlogPostCard[];
}) {
  const isAr = lang === "ar";
  const [posts, setPosts] = useState<BlogPostCard[]>(initialPosts ?? []);
  const [loading, setLoading] = useState(!initialPosts);
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("all");

  useEffect(() => {
    (async () => {
      // SSR seed (H1 audit fix): the default view (all categories, no
      // search) is fully covered by the server-provided posts — no
      // network round trip until the user actually filters.
      if (initialPosts && category === "all" && !search) {
        setPosts(initialPosts);
        setLoading(false);
        return;
      }
      setLoading(true);
      const data = await listBlogPosts(lang, category, search);
      setPosts(data);
      setLoading(false);
    })();
  }, [lang, category, search, initialPosts]);

  return (
    <div className="flex min-h-screen flex-col bg-[var(--bg)] text-[var(--text)]">
      <SiteHeader variant="landing" />

      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-20 sm:px-6 md:py-28">
        {/* Owner artwork page banner (Phase 127 — 12 header images are PAGE banners) */}
        <div className="mb-12">
          <PageBanner section="blog" />
        </div>

        {/* Hero */}
        <div className="mb-12 text-center">
          <h1 className="text-4xl font-semibold tracking-tight md:text-6xl">
            {isAr ? "مدونة Alkemos" : "Alkemos Blog"}
          </h1>
          <p className="mx-auto mt-6 max-w-xl text-lg font-normal text-[var(--muted-foreground)] md:text-xl">
            {isAr
              ? "نصائح وإرشادات علمية للتغذية واللياقة من فريق Alkemos"
              : "Science-backed nutrition and fitness tips from the Alkemos team"}
          </p>
        </div>

        {/* Search + Categories */}
        <div className="mb-16 flex flex-col gap-4 sm:flex-row sm:items-center">
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={isAr ? "ابحث في المقالات..." : "Search articles..."}
            className="flex-1 rounded-full border border-[var(--edge)] bg-[var(--tint)] px-5 py-2.5 text-sm font-normal outline-none focus:border-[var(--chrome-edge)]"
          />
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => setCategory("all")}
              className={`rounded-full px-4 py-2 text-xs font-normal transition-all ${
                category === "all" ? "bg-[var(--text)] text-[var(--bg)]" : "bg-[var(--tint)] text-[var(--muted-foreground)] hover:text-[var(--text)]"
              }`}
            >
              {isAr ? "الكل" : "All"}
            </button>
            {BLOG_CATEGORIES.map((cat) => (
              <button
                key={cat.id}
                onClick={() => setCategory(cat.id)}
                className={`rounded-full px-4 py-2 text-xs font-normal transition-all ${
                  category === cat.id ? "bg-[var(--text)] text-[var(--bg)]" : "bg-[var(--tint)] text-[var(--muted-foreground)] hover:text-[var(--text)]"
                }`}
              >
                {isAr ? cat.ar : cat.en}
              </button>
            ))}
          </div>
        </div>

        {/* Posts grid */}
        {loading ? (
          <div className="py-20 text-center text-base font-normal text-[var(--muted-foreground)]">
            {isAr ? "جارٍ التحميل..." : "Loading..."}
          </div>
        ) : posts.length === 0 ? (
          <div className="py-20 text-center text-base font-normal text-[var(--muted-foreground)]">
            {isAr ? "لا توجد مقالات حالياً" : "No articles yet"}
          </div>
        ) : (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {posts.map((post) => (
              <a
                key={post.id}
                href={isAr ? `/ar/blog/${post.slug}` : `/blog/${post.slug}`}
                className="marble-card group block overflow-hidden transition-transform duration-300 hover:-translate-y-0.5"
              >
                {post.featured_image && (
                  <div className="relative aspect-video overflow-hidden">
                    <Image
                      src={post.featured_image}
                      alt={post.cover_alt || post.title}
                      fill
                      sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 400px"
                      className="object-cover"
                    />
                  </div>
                )}
                <div className="p-6">
                  <div className="flex items-center gap-3 text-xs font-normal text-[var(--muted-foreground)]">
                    <span className="seal-chip">
                      {getCategoryLabel(post.category, lang)}
                    </span>
                    <span>{post.reading_time} {isAr ? "دقائق" : "min"}</span>
                  </div>
                  <h2 className="mt-3 text-lg font-semibold leading-tight tracking-tight">
                    {post.title}
                  </h2>
                  <p className="mt-2 line-clamp-2 text-sm font-normal text-[var(--muted-foreground)]">{post.excerpt}</p>
                  <div className="mt-4 flex items-center justify-between">
                    <span className="text-xs font-normal text-[var(--muted-foreground)]">{post.author}</span>
                    <span className="chrome-text text-xs font-semibold">
                      {isAr ? "اقرأ المزيد ›" : "Read more ›"}
                    </span>
                  </div>
                </div>
              </a>
            ))}
          </div>
        )}
      </main>

      <footer className="mt-auto border-t border-[var(--edge)] py-6 text-center text-xs font-normal text-[var(--muted-foreground)]">
        © {new Date().getFullYear()} Alkemos. {isAr ? "كل الحقوق محفوظة." : "All rights reserved."}
      </footer>
    </div>
  );
}
