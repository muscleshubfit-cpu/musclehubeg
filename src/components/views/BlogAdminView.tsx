"use client";

import { useEffect, useState } from "react";
import { useI18n } from "@/lib/i18n";
import { useRouter } from "next/navigation";
import { getBlogStats, adminListPosts, adminDeletePost, adminDuplicatePost, type AdminBlogPost } from "@/lib/blog-admin";
import { getCategoryLabel } from "@/lib/blog";
import { toast } from "sonner";

export function BlogAdminView() {
  const { t, lang } = useI18n();
  const router = useRouter();
  const isAr = lang === "ar";
  const [stats, setStats] = useState<any>(null);
  const [posts, setPosts] = useState<AdminBlogPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"all" | "en" | "ar">("all");

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

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleDelete = async (id: string) => {
    if (!confirm(isAr ? "حذف هذا المقال؟" : "Delete this article?")) return;
    try {
      await adminDeletePost(id);
      await load();
      toast.success(isAr ? "تم الحذف" : "Deleted");
    } catch (e: any) {
      toast.error(e.message);
    }
  };

  const handleDuplicate = async (id: string) => {
    try {
      await adminDuplicatePost(id);
      await load();
      toast.success(isAr ? "تم نسخ المقال" : "Article duplicated");
    } catch (e: any) {
      toast.error(e.message);
    }
  };

  const filtered = filter === "all" ? posts : posts.filter((p) => p.language === filter);

  if (loading)
    return (
      <div className="py-20 text-center text-base font-normal text-[#6e6e73]">
        {isAr ? "جارٍ التحميل..." : "Loading..."}
      </div>
    );

  const statCards = [
    { label: isAr ? "إجمالي المقالات" : "Total", value: stats?.total || 0 },
    { label: isAr ? "منشورة" : "Published", value: stats?.published || 0 },
    { label: isAr ? "مسودات" : "Drafts", value: stats?.drafts || 0 },
    { label: isAr ? "إنجليزي" : "English", value: stats?.en || 0 },
    { label: isAr ? "عربي" : "Arabic", value: stats?.ar || 0 },
  ];

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight md:text-4xl">
            {isAr ? "إدارة المدونة" : "Blog Admin"}
          </h1>
          <p className="mt-2 text-base font-normal text-[#6e6e73] md:text-lg">
            {isAr ? "أنشئ وحرّر وانشر المقالات" : "Create, edit and publish articles"}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <button
            onClick={async () => {
              if (!confirm(isAr ? "تنظيف النصوص المشوهة في المقالات المنشورة؟ (يدوياً)" : "Clean up garbled text in published articles? (dry run first)")) return;
              // Step 1: dry run
              const dryRes = await fetch("/api/admin/blog/cleanup", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ dry_run: true }),
              });
              if (!dryRes.ok) {
                alert(isAr ? "فشل الفحص" : "Scan failed");
                return;
              }
              const dry = await dryRes.json();
              const msg = isAr
                ? `تم العثور على ${dry.fixed} مقال تحتاج إصلاح. تطبّق الإصلاحات؟`
                : `Found ${dry.fixed} articles needing fixes. Apply them now?`;
              if (!confirm(msg)) return;
              // Step 2: apply
              const applyRes = await fetch("/api/admin/blog/cleanup", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ dry_run: false }),
              });
              const applied = await applyRes.json();
              if (applyRes.ok) {
                alert(isAr ? `تم إصلاح ${applied.fixed} مقال ✅` : `Fixed ${applied.fixed} articles ✅`);
                window.location.reload();
              } else {
                alert(isAr ? "فشل التطبيق" : "Apply failed");
              }
            }}
            className="rounded-full border border-[#ff9500]/30 bg-[#ff9500]/10 px-5 py-2.5 text-sm font-normal text-[#ff9500] transition-opacity hover:opacity-90"
          >
            {isAr ? "تنظيف المقالات" : "Cleanup articles"}
          </button>
          <button
            onClick={() => router.push("/admin/ai-settings")}
            className="rounded-full border border-[#d2d2d7] bg-white px-5 py-2.5 text-sm font-normal transition-opacity hover:opacity-90"
          >
            {isAr ? "إعدادات AI" : "AI Settings"}
          </button>
          <button
            onClick={() => router.push("/admin/blog/new")}
            className="rounded-full bg-[#0071e3] px-5 py-2.5 text-sm font-normal text-white transition-opacity hover:opacity-90"
          >
            {isAr ? "مقال جديد" : "New Article"}
          </button>
        </div>
      </div>

      {/* AI Assistant hint */}
      <div className="flex flex-wrap items-center justify-between gap-4 rounded-3xl bg-[#f5f5f7] p-6">
        <div>
          <p className="text-base font-semibold">{isAr ? "مساعد الذكاء الاصطناعي جاهز" : "AI Content Assistant is ready"}</p>
          <p className="mt-1 text-sm font-normal text-[#6e6e73]">
            {isAr
              ? "افتح مقالاً جديداً واضغط «توليد بالذكاء الاصطناعي» — يكتب المقال كاملاً من موضوع واحد."
              : "Open a new article and click \"Generate with AI\" — it builds the entire article from a single topic."}
          </p>
        </div>
        <button
          onClick={() => router.push("/admin/blog/new")}
          className="rounded-full bg-[#0071e3] px-5 py-2.5 text-sm font-normal text-white transition-opacity hover:opacity-90"
        >
          {isAr ? "ابدأ التوليد ›" : "Start ›"}
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
        {statCards.map((s, i) => (
          <div key={i} className="rounded-2xl bg-[#f5f5f7] p-6">
            <p className="text-3xl font-semibold tracking-tight">{s.value}</p>
            <p className="mt-1 text-xs font-normal text-[#6e6e73]">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Filter */}
      <div className="inline-flex rounded-full bg-[#f5f5f7] p-1">
        {(["all", "en", "ar"] as const).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`rounded-full px-5 py-2 text-sm font-normal transition-all ${
              filter === f ? "bg-white text-[#1d1d1f] shadow-sm" : "text-[#6e6e73]"
            }`}
          >
            {f === "all" ? (isAr ? "الكل" : "All") : f === "en" ? "English" : "العربية"}
          </button>
        ))}
      </div>

      {/* Articles table */}
      <div className="overflow-hidden rounded-3xl bg-[#f5f5f7]">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[#d2d2d7]">
                <th className="p-4 text-start text-xs font-normal uppercase tracking-wide text-[#6e6e73]">{isAr ? "العنوان" : "Title"}</th>
                <th className="p-4 text-center text-xs font-normal uppercase tracking-wide text-[#6e6e73]">{isAr ? "اللغة" : "Lang"}</th>
                <th className="p-4 text-center text-xs font-normal uppercase tracking-wide text-[#6e6e73]">{isAr ? "التصنيف" : "Category"}</th>
                <th className="p-4 text-center text-xs font-normal uppercase tracking-wide text-[#6e6e73]">{isAr ? "الحالة" : "Status"}</th>
                <th className="p-4 text-center text-xs font-normal uppercase tracking-wide text-[#6e6e73]">{isAr ? "إجراءات" : "Actions"}</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={5} className="p-12 text-center text-base font-normal text-[#6e6e73]">
                    {isAr ? "لا توجد مقالات" : "No articles"}
                  </td>
                </tr>
              ) : (
                filtered.map((post) => (
                  <tr key={post.id} className="border-b border-[#d2d2d7]/60 hover:bg-white/50">
                    <td className="p-4">
                      <p className="font-medium">{post.title}</p>
                      <p className="text-xs font-normal text-[#6e6e73]">/{post.language === "ar" ? "ar/" : ""}blog/{post.slug}</p>
                    </td>
                    <td className="p-4 text-center">
                      <span className="rounded-full bg-white px-2.5 py-0.5 text-xs font-normal">{post.language === "ar" ? "ع" : "EN"}</span>
                    </td>
                    <td className="p-4 text-center">
                      <span className="text-xs font-normal text-[#6e6e73]">{getCategoryLabel(post.category, lang)}</span>
                    </td>
                    <td className="p-4 text-center">
                      <span
                        className={`rounded-full px-2.5 py-0.5 text-xs font-normal ${
                          post.is_published
                            ? "bg-[#0071e3]/10 text-[#0071e3]"
                            : "bg-[#ff9500]/10 text-[#ff9500]"
                        }`}
                      >
                        {post.is_published ? (isAr ? "منشور" : "Published") : (isAr ? "مسودة" : "Draft")}
                      </span>
                    </td>
                    <td className="p-4">
                      <div className="flex items-center justify-center gap-2">
                        <button
                          onClick={() => router.push(`/admin/blog/${post.id}`)}
                          className="text-sm font-normal text-[#0071e3] transition-opacity hover:opacity-70"
                        >
                          {isAr ? "تعديل ›" : "Edit ›"}
                        </button>
                        <button
                          onClick={() => handleDuplicate(post.id)}
                          className="text-sm font-normal text-[#6e6e73] transition-opacity hover:opacity-70"
                        >
                          {isAr ? "نسخ" : "Copy"}
                        </button>
                        {post.is_published && (
                          <a
                            href={`${post.language === "ar" ? "/ar" : ""}/blog/${post.slug}`}
                            target="_blank"
                            rel="noreferrer"
                            className="text-sm font-normal text-[#6e6e73] transition-opacity hover:opacity-70"
                          >
                            {isAr ? "عرض" : "View"}
                          </a>
                        )}
                        <button
                          onClick={() => handleDelete(post.id)}
                          className="text-sm font-normal text-[#ff3b30] transition-opacity hover:opacity-70"
                        >
                          {isAr ? "حذف" : "Delete"}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Recent articles */}
      {stats?.recent?.length > 0 && (
        <div>
          <h2 className="mb-6 text-xl font-semibold tracking-tight">{isAr ? "أحدث المقالات" : "Recent Articles"}</h2>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {stats.recent.map((p: AdminBlogPost) => (
              <div key={p.id} className="rounded-2xl bg-[#f5f5f7] p-5">
                <div className="flex items-center gap-2">
                  <span className="rounded-full bg-white px-2.5 py-0.5 text-xs font-normal">{p.language === "ar" ? "ع" : "EN"}</span>
                  <span className="text-xs font-normal text-[#6e6e73]">{getCategoryLabel(p.category, lang)}</span>
                </div>
                <h3 className="mt-3 truncate text-base font-medium">{p.title}</h3>
                <p className="mt-1 text-xs font-normal text-[#6e6e73]">{new Date(p.created_at).toLocaleDateString()}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
