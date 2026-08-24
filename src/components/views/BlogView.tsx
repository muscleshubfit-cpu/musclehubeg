"use client";

import { useEffect, useState } from "react";
import { Calendar, ArrowRight, Tag } from "lucide-react";
import { useI18n } from "@/lib/i18n";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { listBlogPosts } from "@/lib/data";

export function BlogView() {
 const { t, lang } = useI18n();
 const [posts, setPosts] = useState<any[]>([]);
 const [loading, setLoading] = useState(true);
 const isAr = lang === "ar";

 useEffect(() => {
 (async () => {
 const data = await listBlogPosts();
 setPosts(data);
 setLoading(false);
 })();
 }, []);

 if (loading) return <div className="text-muted-foreground">{t("common.loading")}</div>;

 return (
 <div className="min-h-screen flex flex-col bg-background">
 <header className="border-b border-border bg-background/80 backdrop-blur">
 <div className="mx-auto flex h-16 max-w-4xl items-center justify-between px-4">
 <h1 className="font-display text-xl font-bold">
 {isAr ? "مدونة MuscleHub" : "MuscleHub Blog"}
 </h1>
 <Badge variant="secondary">{posts.length} {isAr ? "مقال" : "articles"}</Badge>
 </div>
 </header>

 <main className="mx-auto w-full max-w-4xl flex-1 px-4 py-10">
 <div className="mb-8 text-center">
 <h2 className="text-3xl font-bold md:text-4xl">
 {isAr ? "نصائح وإرشادات للياقة والتغذية" : "Fitness & Nutrition Tips"}
 </h2>
 <p className="mt-3 text-muted-foreground">
 {isAr
 ? "مقالات علمية وعملية لمساعدتك في رحلتك نحو جسم أفضل"
 : "Science-based, practical articles to help you on your journey to a better body"}
 </p>
 </div>

 {posts.length === 0 ? (
 <Card className="border-dashed p-12 text-center text-muted-foreground">
 <Calendar className="mx-auto mb-3 h-12 w-12 text-muted-foreground/50" />
 <p className="text-sm">
 {isAr ? "مقالات جديدة قريباً! تابعنا." : "New articles coming soon! Stay tuned."}
 </p>
 </Card>
 ) : (
 <div className="grid gap-6 md:grid-cols-2">
 {posts.map((p) => (
 <Card key={p.id} className="group overflow-hidden p-0 shadow-card transition-all hover:shadow-glow">
 {p.cover_image && (
 <div className="aspect-video overflow-hidden">
 <img
 src={p.cover_image}
 alt={isAr ? p.title_ar : (p.title_en || p.title_ar)}
 className="h-full w-full object-cover transition-transform group-hover:scale-105"
 loading="lazy"
 />
 </div>
 )}
 <div className="p-5">
 <div className="flex items-center gap-2 text-xs text-muted-foreground">
 <Badge variant="secondary">{isAr ? p.category : p.category}</Badge>
 {p.published_at && (
 <span className="flex items-center gap-1">
 <Calendar className="h-3 w-3" />
 {new Date(p.published_at).toLocaleDateString(isAr ? "ar-EG" : "en-US")}
 </span>
 )}
 </div>
 <h3 className="mt-3 font-display text-lg font-bold">
 {isAr ? p.title_ar : (p.title_en || p.title_ar)}
 </h3>
 <p className="mt-2 text-sm text-muted-foreground line-clamp-3">
 {isAr ? p.excerpt_ar : (p.excerpt_en || p.excerpt_ar)}
 </p>
 <Button variant="ghost" size="sm" className="mt-3 gap-1 p-0 text-primary">
 {isAr ? "اقرأ المزيد" : "Read more"}
 <ArrowRight className="h-3 w-3 rtl:rotate-180" />
 </Button>
 </div>
 </Card>
 ))}
 </div>
 )}
 </main>

 <footer className="mt-auto border-t border-border py-6 text-center text-sm text-muted-foreground">
 © {new Date().getFullYear()} {t("brand.name")}. {t("landing.footer")}
 </footer>
 </div>
 );
}
