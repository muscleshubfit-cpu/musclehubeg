"use client";

import { useEffect, useState } from "react";
import { Dumbbell, FileText, CheckCircle, Clock, Globe, ArrowRight, Plus, Edit3, Trash2, Copy, Eye, TrendingUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { useI18n } from "@/lib/i18n";
import { useRouter } from "next/navigation";
import { getBlogStats, adminListPosts, adminDeletePost, adminDuplicatePost, type AdminBlogPost } from "@/lib/blog-admin";
import { BLOG_CATEGORIES, getCategoryLabel } from "@/lib/blog";
import { toast } from "sonner";

export function BlogAdminView() {
  const { t, lang } = useI18n();
  const router = useRouter();
  const isAr = lang === "ar";
  const [stats, setStats] = useState<any>(null);
  const [posts, setPosts] = useState<AdminBlogPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"all" | "en" | "ar">("all");

  useEffect(() => {
    load();
  }, []);

  const load = async () => {
    setLoading(true);
    try {
      const [s, p] = await Promise.all([getBlogStats(), adminListPosts()]);
      setStats(s);
      setPosts(p);
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm(isAr ? "حذف هذا المقال؟" : "Delete this article?")) return;
    try {
      await adminDeletePost(id);
      await load();
      toast.success(isAr ? "تم الحذف" : "Deleted");
    } catch (e: any) { toast.error(e.message); }
  };

  const handleDuplicate = async (id: string) => {
    try {
      await adminDuplicatePost(id);
      await load();
      toast.success(isAr ? "تم نسخ المقال" : "Article duplicated");
    } catch (e: any) { toast.error(e.message); }
  };

  const filtered = filter === "all" ? posts : posts.filter((p) => p.language === filter);

  if (loading) return <div className="p-8 text-center text-muted-foreground">{isAr ? "جارٍ التحميل..." : "Loading..."}</div>;

  const statCards = [
    { label: isAr ? "إجمالي المقالات" : "Total Articles", value: stats?.total || 0, icon: FileText, color: "text-primary" },
    { label: isAr ? "منشورة" : "Published", value: stats?.published || 0, icon: CheckCircle, color: "text-success" },
    { label: isAr ? "مسودات" : "Drafts", value: stats?.drafts || 0, icon: Clock, color: "text-warning" },
    { label: isAr ? "إنجليزي" : "English", value: stats?.en || 0, icon: Globe, color: "text-primary" },
    { label: isAr ? "عربي" : "Arabic", value: stats?.ar || 0, icon: Globe, color: "text-gold" },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold md:text-3xl">{isAr ? "إدارة المدونة" : "Blog Admin"}</h1>
          <p className="mt-1 text-sm text-muted-foreground">{isAr ? "أنشئ وحرّر وانشر المقالات" : "Create, edit and publish articles"}</p>
        </div>
        <Button className="gap-2" onClick={() => router.push("/admin/blog/new")}>
          <Plus className="h-4 w-4" />
          {isAr ? "مقال جديد" : "New Article"}
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        {statCards.map((s, i) => (
          <Card key={i} className="p-4 shadow-card">
            <div className="flex items-center gap-2">
              <s.icon className={`h-4 w-4 ${s.color}`} />
              <span className="text-xs text-muted-foreground">{s.label}</span>
            </div>
            <p className="mt-2 font-display text-2xl font-bold">{s.value}</p>
          </Card>
        ))}
      </div>

      {/* Filter */}
      <div className="flex gap-2">
        {(["all", "en", "ar"] as const).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`rounded-full px-4 py-1.5 text-sm font-medium transition-colors ${filter === f ? "bg-primary text-primary-foreground" : "border border-border text-muted-foreground hover:text-foreground"}`}
          >
            {f === "all" ? (isAr ? "الكل" : "All") : f === "en" ? "English" : "العربية"}
          </button>
        ))}
      </div>

      {/* Articles table */}
      <Card className="overflow-hidden p-0 shadow-card">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/30">
                <th className="p-3 text-start font-medium text-muted-foreground">{isAr ? "العنوان" : "Title"}</th>
                <th className="p-3 text-center font-medium text-muted-foreground">{isAr ? "اللغة" : "Lang"}</th>
                <th className="p-3 text-center font-medium text-muted-foreground">{isAr ? "التصنيف" : "Category"}</th>
                <th className="p-3 text-center font-medium text-muted-foreground">{isAr ? "الحالة" : "Status"}</th>
                <th className="p-3 text-center font-medium text-muted-foreground">{isAr ? "إجراءات" : "Actions"}</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr><td colSpan={5} className="p-8 text-center text-muted-foreground">{isAr ? "لا توجد مقالات" : "No articles"}</td></tr>
              ) : (
                filtered.map((post) => (
                  <tr key={post.id} className="border-b border-border/60 hover:bg-muted/20">
                    <td className="p-3">
                      <p className="font-medium">{post.title}</p>
                      <p className="text-xs text-muted-foreground">/{post.language === "ar" ? "ar/" : ""}blog/{post.slug}</p>
                    </td>
                    <td className="p-3 text-center">
                      <Badge variant="outline">{post.language === "ar" ? "ع" : "EN"}</Badge>
                    </td>
                    <td className="p-3 text-center">
                      <Badge variant="secondary">{getCategoryLabel(post.category, lang)}</Badge>
                    </td>
                    <td className="p-3 text-center">
                      {post.is_published ? (
                        <Badge variant="outline" className="border-success text-success">{isAr ? "منشور" : "Published"}</Badge>
                      ) : (
                        <Badge variant="outline" className="border-warning text-warning">{isAr ? "مسودة" : "Draft"}</Badge>
                      )}
                    </td>
                    <td className="p-3">
                      <div className="flex items-center justify-center gap-1">
                        <button onClick={() => router.push(`/admin/blog/${post.id}`)} className="rounded-lg p-2 text-primary hover:bg-primary/10" title={isAr ? "تعديل" : "Edit"}>
                          <Edit3 className="h-4 w-4" />
                        </button>
                        <button onClick={() => handleDuplicate(post.id)} className="rounded-lg p-2 text-muted-foreground hover:bg-secondary" title={isAr ? "نسخ" : "Duplicate"}>
                          <Copy className="h-4 w-4" />
                        </button>
                        {post.is_published && (
                          <a href={`${post.language === "ar" ? "/ar" : ""}/blog/${post.slug}`} target="_blank" rel="noreferrer" className="rounded-lg p-2 text-muted-foreground hover:bg-secondary" title={isAr ? "عرض" : "View"}>
                            <Eye className="h-4 w-4" />
                          </a>
                        )}
                        <button onClick={() => handleDelete(post.id)} className="rounded-lg p-2 text-destructive hover:bg-destructive/10" title={isAr ? "حذف" : "Delete"}>
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Recent articles preview */}
      {stats?.recent?.length > 0 && (
        <div>
          <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
            <TrendingUp className="h-4 w-4" />
            {isAr ? "أحدث المقالات" : "Recent Articles"}
          </h2>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {stats.recent.map((p: AdminBlogPost) => (
              <Card key={p.id} className="p-4 shadow-card">
                <div className="flex items-center gap-2">
                  <Badge variant="outline">{p.language === "ar" ? "ع" : "EN"}</Badge>
                  <Badge variant="secondary">{getCategoryLabel(p.category, lang)}</Badge>
                </div>
                <h3 className="mt-2 truncate font-medium">{p.title}</h3>
                <p className="mt-1 text-xs text-muted-foreground">{new Date(p.created_at).toLocaleDateString()}</p>
              </Card>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
