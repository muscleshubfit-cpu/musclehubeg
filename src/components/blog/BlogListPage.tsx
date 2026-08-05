"use client";

import { useEffect, useState } from "react";
import { Dumbbell, Calendar, Clock, ArrowRight, Search, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { LanguageToggle } from "@/components/LanguageToggle";
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
    <div className="min-h-screen flex flex-col bg-background">
      <ReadingProgressInline />
      <header className="sticky top-0 z-40 border-b border-border bg-background/80 backdrop-blur-xl">
        <div className="mx-auto flex h-16 w-full max-w-6xl items-center justify-between px-4 sm:px-6">
          <a href={isAr ? "/ar" : "/"} className="flex items-center gap-2">
            <span className="grid h-9 w-9 place-items-center rounded-xl bg-gradient-primary">
              <Dumbbell className="h-5 w-5 text-primary-foreground" />
            </span>
            <span className="font-display text-lg font-bold">Muscle<span className="text-primary">Hub</span></span>
          </a>
          <div className="flex items-center gap-2">
            <LanguageToggle />
            <a href={isAr ? "/ar" : "/"}>
              <Button variant="ghost" size="sm">{isAr ? "الرئيسية" : "Home"}</Button>
            </a>
          </div>
        </div>
      </header>

      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-10 sm:px-6">
        {/* Hero */}
        <div className="mb-8 text-center">
          <h1 className="text-4xl font-extrabold md:text-5xl">
            {isAr ? "مدونة MuscleHub" : "MuscleHub Blog"}
          </h1>
          <p className="mx-auto mt-3 max-w-xl text-muted-foreground">
            {isAr
              ? "نصائح وإرشادات علمية للتغذية واللياقة من الكوتش أحمد زكي"
              : "Science-backed nutrition and fitness tips from Coach Ahmed Zake"}
          </p>
        </div>

        {/* Search + Categories */}
        <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center">
          <div className="relative flex-1">
            <Search className="absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={isAr ? "ابحث في المقالات..." : "Search articles..."}
              className="ps-9"
            />
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => setCategory("all")}
              className={`rounded-full px-3 py-1.5 text-xs font-medium transition-colors ${category === "all" ? "bg-primary text-primary-foreground" : "border border-border text-muted-foreground hover:text-foreground"}`}
            >
              {isAr ? "الكل" : "All"}
            </button>
            {BLOG_CATEGORIES.map((cat) => (
              <button
                key={cat.id}
                onClick={() => setCategory(cat.id)}
                className={`rounded-full px-3 py-1.5 text-xs font-medium transition-colors ${category === cat.id ? "bg-primary text-primary-foreground" : "border border-border text-muted-foreground hover:text-foreground"}`}
              >
                {isAr ? cat.ar : cat.en}
              </button>
            ))}
          </div>
        </div>

        {/* Posts grid */}
        {loading ? (
          <div className="py-20 text-center text-muted-foreground">{isAr ? "جارٍ التحميل..." : "Loading..."}</div>
        ) : posts.length === 0 ? (
          <div className="py-20 text-center text-muted-foreground">
            {isAr ? "لا توجد مقالات حالياً" : "No articles yet"}
          </div>
        ) : (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {posts.map((post) => (
              <a
                key={post.id}
                href={isAr ? `/ar/blog/${post.slug}` : `/blog/${post.slug}`}
                className="group overflow-hidden rounded-2xl border border-border bg-card shadow-card transition-all hover:border-primary/40 hover:shadow-glow"
              >
                {post.featured_image && (
                  <div className="aspect-video overflow-hidden">
                    <img
                      src={post.featured_image}
                      alt={post.cover_alt || post.title}
                      className="h-full w-full object-cover transition-transform group-hover:scale-105"
                      loading="lazy"
                    />
                  </div>
                )}
                <div className="p-5">
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <Badge variant="secondary">{getCategoryLabel(post.category, lang)}</Badge>
                    <span className="flex items-center gap-1"><Clock className="h-3 w-3" /> {post.reading_time} {isAr ? "دقائق" : "min"}</span>
                  </div>
                  <h2 className="mt-3 font-display text-lg font-bold leading-snug group-hover:text-primary">
                    {post.title}
                  </h2>
                  <p className="mt-2 line-clamp-2 text-sm text-muted-foreground">{post.excerpt}</p>
                  <div className="mt-4 flex items-center justify-between">
                    <span className="text-xs text-muted-foreground">{post.author}</span>
                    <span className="flex items-center gap-1 text-xs font-medium text-primary">
                      {isAr ? "اقرأ المزيد" : "Read more"}
                      <ArrowRight className="h-3 w-3 rtl:rotate-180" />
                    </span>
                  </div>
                </div>
              </a>
            ))}
          </div>
        )}
      </main>

      <footer className="mt-auto border-t border-border py-6 text-center text-sm text-muted-foreground">
        © {new Date().getFullYear()} MuscleHub. {isAr ? "كل الحقوق محفوظة." : "All rights reserved."}
      </footer>
    </div>
  );
}

function ReadingProgressInline() {
  return null; // Placeholder — progress bar is on article pages only
}
