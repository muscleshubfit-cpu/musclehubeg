"use client";
import { SiteHeader } from "@/components/SiteHeader";

import { useEffect, useState } from "react";
import { listBlogPosts, BLOG_CATEGORIES, getCategoryLabel, type BlogPost } from "@/lib/blog";

export function BlogListPage({ lang }: { lang: "en" | "ar" }) {
  const isAr = lang === "ar";
  const [posts, setPosts] = useState<BlogPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("all");

  useEffect(() => {
    (async () => {
      setLoading(true);
      const data = await listBlogPosts(lang, category, search);
      setPosts(data);
      setLoading(false);
    })();
  }, [lang, category, search]);

  return (
    <div className="flex min-h-screen flex-col bg-white text-[#1d1d1f]">
      <SiteHeader variant="landing" />

      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-20 sm:px-6 md:py-28">
        {/* Hero */}
        <div className="mb-12 text-center">
          <h1 className="text-4xl font-semibold tracking-tight md:text-6xl">
            {isAr ? "مدونة MuscleHubEG" : "MuscleHubEG Blog"}
          </h1>
          <p className="mx-auto mt-6 max-w-xl text-lg font-normal text-[#6e6e73] md:text-xl">
            {isAr
              ? "نصائح وإرشادات علمية للتغذية واللياقة من فريق MuscleHubEG"
              : "Science-backed nutrition and fitness tips from the MuscleHubEG team"}
          </p>
        </div>

        {/* Search + Categories — Apple-style */}
        <div className="mb-16 flex flex-col gap-4 sm:flex-row sm:items-center">
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={isAr ? "ابحث في المقالات..." : "Search articles..."}
            className="flex-1 rounded-full border border-[#d2d2d7] bg-[#f5f5f7] px-5 py-2.5 text-sm font-normal outline-none focus:border-[#0071e3]"
          />
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => setCategory("all")}
              className={`rounded-full px-4 py-2 text-xs font-normal transition-all ${
                category === "all" ? "bg-[#1d1d1f] text-white" : "bg-[#f5f5f7] text-[#6e6e73] hover:text-[#1d1d1f]"
              }`}
            >
              {isAr ? "الكل" : "All"}
            </button>
            {BLOG_CATEGORIES.map((cat) => (
              <button
                key={cat.id}
                onClick={() => setCategory(cat.id)}
                className={`rounded-full px-4 py-2 text-xs font-normal transition-all ${
                  category === cat.id ? "bg-[#1d1d1f] text-white" : "bg-[#f5f5f7] text-[#6e6e73] hover:text-[#1d1d1f]"
                }`}
              >
                {isAr ? cat.ar : cat.en}
              </button>
            ))}
          </div>
        </div>

        {/* Posts grid */}
        {loading ? (
          <div className="py-20 text-center text-base font-normal text-[#6e6e73]">
            {isAr ? "جارٍ التحميل..." : "Loading..."}
          </div>
        ) : posts.length === 0 ? (
          <div className="py-20 text-center text-base font-normal text-[#6e6e73]">
            {isAr ? "لا توجد مقالات حالياً" : "No articles yet"}
          </div>
        ) : (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {posts.map((post) => (
              <a
                key={post.id}
                href={isAr ? `/ar/blog/${post.slug}` : `/blog/${post.slug}`}
                className="group block overflow-hidden rounded-3xl bg-[#f5f5f7] transition-opacity hover:opacity-90"
              >
                {post.featured_image && (
                  <div className="aspect-video overflow-hidden">
                    <img
                      src={post.featured_image}
                      alt={post.cover_alt || post.title}
                      className="h-full w-full object-cover"
                      loading="lazy"
                    />
                  </div>
                )}
                <div className="p-6">
                  <div className="flex items-center gap-3 text-xs font-normal text-[#6e6e73]">
                    <span className="rounded-full bg-white px-2.5 py-0.5">
                      {getCategoryLabel(post.category, lang)}
                    </span>
                    <span>{post.reading_time} {isAr ? "دقائق" : "min"}</span>
                  </div>
                  <h2 className="mt-3 text-lg font-semibold leading-tight tracking-tight">
                    {post.title}
                  </h2>
                  <p className="mt-2 line-clamp-2 text-sm font-normal text-[#6e6e73]">{post.excerpt}</p>
                  <div className="mt-4 flex items-center justify-between">
                    <span className="text-xs font-normal text-[#6e6e73]">{post.author}</span>
                    <span className="text-xs font-normal text-[#0071e3]">
                      {isAr ? "اقرأ المزيد ›" : "Read more ›"}
                    </span>
                  </div>
                </div>
              </a>
            ))}
          </div>
        )}
      </main>

      <footer className="mt-auto border-t border-[#d2d2d7] py-6 text-center text-xs font-normal text-[#6e6e73]">
        © {new Date().getFullYear()} MuscleHubEG. {isAr ? "كل الحقوق محفوظة." : "All rights reserved."}
      </footer>
    </div>
  );
}
