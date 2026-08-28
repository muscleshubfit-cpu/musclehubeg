"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useI18n } from "@/lib/i18n";
import { useRouter } from "next/navigation";
import { getBlogStats, adminListPosts, adminDeletePost, adminDuplicatePost, type AdminBlogPost } from "@/lib/blog-admin";
import { getCategoryLabel } from "@/lib/blog";
import { enqueueAiJobClient, getAiJob, AI_ARTICLE_DRAFT_KEY, readPendingArticleJob, writePendingArticleJob } from "@/lib/ai-jobs-client";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Sparkles, Search, Plus, RefreshCw, FileText, Globe, CheckCircle2, FileEdit, Trash2, Copy, ExternalLink, Eye, ImagePlus, Loader2, Wand2 } from "lucide-react";

export function BlogAdminView() {
  const { t, lang } = useI18n();
  const router = useRouter();
  const isAr = lang === "ar";
  const [stats, setStats] = useState<any>(null);
  const [posts, setPosts] = useState<AdminBlogPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"all" | "en" | "ar">("all");
  const [searchQuery, setSearchQuery] = useState("");

  /* ── AI article generation (queue-based, survivable) ──
   * 2026-08-28: the old banner pointed coaches at a generator button that
   * no longer existed (Phase-15 deletion) — article generation was
   * effectively GONE. This restores it on the ai_jobs queue with the same
   * reload-surviving watcher pattern as the coach plan jobs. */
  const [genOpen, setGenOpen] = useState(false);
  const [genTopic, setGenTopic] = useState("");
  const [genLang, setGenLang] = useState<"ar" | "en">("ar");
  const [genTone, setGenTone] = useState("");
  const [genKeywords, setGenKeywords] = useState("");
  const [genBusy, setGenBusy] = useState(false);
  const [genJob, setGenJob] = useState<{ id: string; topic: string } | null>(null);
  const activeGenWatcher = useRef<string | null>(null);

  const watchArticleJob = useCallback(
    async (entry: { id: string; topic: string }) => {
      if (activeGenWatcher.current === entry.id) return;
      activeGenWatcher.current = entry.id;
      try {
        const deadline = Date.now() + 26 * 60_000;
        while (Date.now() < deadline) {
          await new Promise((r) => setTimeout(r, 20_000));
          let job: any = null;
          try {
            job = await getAiJob(entry.id);
          } catch {
            continue; // transient network error — keep waiting
          }
          if (job?.status === "done") {
            writePendingArticleJob(null);
            setGenJob(null);
            const r = job.result || {};
            if (!r.title || !r.markdown) {
              toast.error("وصلت نتيجة غير مكتملة — حاول التوليد مرة أخرى.");
              return;
            }
            try {
              sessionStorage.setItem(
                AI_ARTICLE_DRAFT_KEY,
                JSON.stringify({
                  title: r.title,
                  markdown: r.markdown,
                  excerpt: r.excerpt || "",
                  meta_description: r.meta_description || "",
                  tags: Array.isArray(r.tags) ? r.tags : [],
                  language: r.language === "en" ? "en" : "ar",
                }),
              );
            } catch {
              toast.error("تعذّر تخزين المسودة محلياً — افتح المحرر وحاول مرة أخرى.");
              return;
            }
            toast.success("وصل المقال وتم فتح المحرر بالمسودة ✅ راجعه قبل الحفظ.");
            router.push("/admin/blog/new?ai=1");
            return;
          }
          if (job?.status === "failed") {
            writePendingArticleJob(null);
            setGenJob(null);
            toast.error(job.error_message || "فشل توليد المقال. حاول مرة أخرى.");
            return;
          }
        }
        // Timeout: job may STILL finish — keep the registry entry so the
        // next mount re-watches (PLAN JOB RECOVERY LAW pattern).
        toast.info("المقال لسه بيتولد في الخلفية — هنكمل المتابعة تلقائياً لما تفتح الصفحة تاني.");
      } finally {
        activeGenWatcher.current = null;
      }
    },
    [router],
  );

  // Re-attach the watcher to an unfinished job after reload/remount.
  useEffect(() => {
    const entry = readPendingArticleJob();
    if (entry) {
      setGenJob({ id: entry.id, topic: entry.topic });
      void watchArticleJob({ id: entry.id, topic: entry.topic });
    }
  }, [watchArticleJob]);

  const submitGeneration = async () => {
    const topic = genTopic.trim();
    if (topic.length < 5) {
      toast.error(isAr ? "اكتب موضوع المقال (5 أحرف على الأقل)" : "Topic needs at least 5 characters");
      return;
    }
    setGenBusy(true);
    try {
      const jobId = await enqueueAiJobClient("article_generate", {
        topic,
        language: genLang,
        tone: genTone.trim(),
        keywords: genKeywords
          .split(/[,،]/)
          .map((k) => k.trim())
          .filter(Boolean)
          .slice(0, 8),
      });
      const entry = { id: jobId, topic, startedAt: Date.now() };
      writePendingArticleJob(entry);
      setGenJob({ id: jobId, topic });
      setGenOpen(false);
      setGenTopic("");
      setGenKeywords("");
      setGenTone("");
      toast.success(isAr ? "تم إرسال طلب التوليد — جاري التنفيذ في الخلفية ⏳" : "Generation queued — running in the background");
      void watchArticleJob(entry);
    } catch (e: any) {
      toast.error(e.message || "فشل إرسال الطلب");
    } finally {
      setGenBusy(false);
    }
  };

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

  const filtered = posts.filter((p) => {
    const matchesFilter = filter === "all" || p.language === filter;
    const matchesQuery = !searchQuery.trim() || 
      p.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
      p.slug.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (p.category && p.category.toLowerCase().includes(searchQuery.toLowerCase()));
    return matchesFilter && matchesQuery;
  });

  if (loading)
    return (
      <div className="flex min-h-[300px] flex-col items-center justify-center py-12 text-center text-sm text-muted-foreground">
        <RefreshCw className="h-6 w-6 animate-spin text-primary mb-2" />
        {isAr ? "جارٍ التحميل..." : "Loading..."}
      </div>
    );

  const statCards = [
    { label: isAr ? "إجمالي المقالات" : "Total", value: stats?.total || 0, icon: FileText, color: "text-blue-500" },
    { label: isAr ? "منشورة" : "Published", value: stats?.published || 0, icon: CheckCircle2, color: "text-emerald-500" },
    { label: isAr ? "مسودات" : "Drafts", value: stats?.drafts || 0, icon: FileEdit, color: "text-amber-500" },
    { label: isAr ? "إنجليزي" : "English", value: stats?.en || 0, icon: Globe, color: "text-indigo-500" },
    { label: isAr ? "عربي" : "Arabic", value: stats?.ar || 0, icon: Globe, color: "text-teal-500" },
  ];

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border/60 pb-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight md:text-3xl text-foreground">
            {isAr ? "إدارة المدونة" : "Blog Admin"}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {isAr ? "أنشئ وحرّر وانشر مقالات اللياقة والتغذية" : "Create, edit and publish articles"}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={async () => {
              if (!confirm(isAr ? "استكمال الصور المميزة الناقصة للمقالات المنشورة؟ (بخط الصور الآمن v3.1)" : "Fill missing featured covers for published posts? (via the v3.1 safe image pipeline)")) return;
              try {
                const res = await fetch("/api/blog/fetch-images", {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({}),
                });
                const data = await res.json().catch(() => ({}));
                if (!res.ok) {
                  alert(data.error || (isAr ? "فشل الاستكمال" : "Backfill failed"));
                  return;
                }
                alert(
                  isAr
                    ? `تم استكمال ${data.updated} من ${data.total} مقال ناقص${data.failed ? ` — فشل ${data.failed}` : ""} ✅`
                    : `Filled ${data.updated} of ${data.total} missing covers${data.failed ? ` — ${data.failed} failed` : ""} ✅`,
                );
                if (data.updated > 0) await load();
              } catch (e: any) {
                alert(e?.message || (isAr ? "فشل الاستكمال" : "Backfill failed"));
              }
            }}
            className="inline-flex items-center gap-1.5 rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-3.5 py-2 text-xs font-medium text-emerald-600 dark:text-emerald-400 transition-colors hover:bg-emerald-500/20"
          >
            <ImagePlus className="h-3.5 w-3.5" />
            {isAr ? "استكمال الصور الناقصة" : "Fill Missing Covers"}
          </button>
          <button
            onClick={async () => {
              if (!confirm(isAr ? "تنظيف النصوص المشوهة في المقالات المنشورة؟ (يدوياً)" : "Clean up garbled text in published articles? (dry run first)")) return;
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
            className="inline-flex items-center gap-1.5 rounded-lg border border-amber-500/30 bg-amber-500/10 px-3.5 py-2 text-xs font-medium text-amber-600 dark:text-amber-400 transition-colors hover:bg-amber-500/20"
          >
            <RefreshCw className="h-3.5 w-3.5" />
            {isAr ? "تنظيف النصوص" : "Cleanup"}
          </button>
          <button
            onClick={() => router.push("/admin/blog/new")}
            className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-4 py-2 text-xs font-medium text-primary-foreground transition-opacity hover:opacity-90 shadow-2xs"
          >
            <Plus className="h-4 w-4" />
            {isAr ? "مقال جديد" : "New Article"}
          </button>
        </div>
      </div>

      {/* AI Article Generator — REAL queue-based generation (2026-08-28).
          The previous banner pointed at a generator button that had been
          deleted in Phase 15 — coaches had NO way to generate articles. */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-primary/20 bg-primary/5 p-4 md:p-5">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <Sparkles className="h-5 w-5" />
          </div>
          <div>
            <p className="text-sm font-semibold text-foreground">{isAr ? "توليد المقالات بالذكاء الاصطناعي" : "AI Article Generation"}</p>
            <p className="text-xs text-muted-foreground mt-0.5">
              {isAr
                ? "اكتب الموضوع والمولّد يكتب مقالاً كاملاً (عنوان + محتوى + وصف ميتا + وسوم) ويفتحه لك في المحرر للمراجعة."
                : "Give a topic and get a complete article draft (title + body + meta + tags) opened in the editor for review."}
            </p>
          </div>
        </div>
        <button
          onClick={() => setGenOpen(true)}
          disabled={!!genJob}
          className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-3.5 py-1.5 text-xs font-medium text-primary-foreground hover:opacity-90 transition-opacity disabled:opacity-50"
        >
          <Wand2 className="h-3.5 w-3.5" />
          {isAr ? "توليد مقال جديد" : "Generate New Article"}
        </button>
      </div>

      {/* Live generation status strip — survives reloads via localStorage */}
      {genJob && (
        <div className="flex items-center justify-between gap-3 rounded-xl border border-primary/20 bg-primary/5 px-4 py-3">
          <div className="flex items-center gap-2.5 text-xs">
            <Loader2 className="h-4 w-4 animate-spin text-primary" />
            <span className="font-medium text-foreground">
              {isAr ? "جاري توليد مقال:" : "Generating:"} {genJob.topic}
            </span>
            <span className="text-muted-foreground">
              — {isAr ? "عادةً 1-3 دقائق، تقدر تكمل تنقل والنتيجة هتتفتح لوحدها." : "usually 1-3 minutes; the editor opens automatically when done."}
            </span>
          </div>
        </div>
      )}

      {/* Compact Stat Cards */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        {statCards.map((s, i) => {
          const Icon = s.icon;
          return (
            <div key={i} className="rounded-xl border border-border bg-card p-3.5 shadow-2xs transition-all hover:border-primary/30">
              <div className="flex items-center justify-between text-muted-foreground">
                <span className="text-xs font-medium">{s.label}</span>
                <Icon className={`h-4 w-4 ${s.color}`} />
              </div>
              <p className="mt-2 text-2xl font-bold tracking-tight text-foreground">{s.value}</p>
            </div>
          );
        })}
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between rounded-xl border border-border bg-card p-3 shadow-2xs">
        {/* Language Pills */}
        <div className="inline-flex rounded-lg bg-muted p-1">
          {(["all", "en", "ar"] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`rounded-md px-3 py-1 text-xs font-medium transition-all ${
                filter === f ? "bg-background text-foreground shadow-2xs" : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {f === "all" ? (isAr ? "الكل" : "All") : f === "en" ? "English" : "العربية"}
            </button>
          ))}
        </div>

        {/* Search Input */}
        <div className="relative w-full sm:w-64">
          <Search className="absolute start-3 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={isAr ? "بحث في المقالات..." : "Search articles..."}
            className="w-full rounded-lg border border-border bg-background py-1.5 ps-8 pe-3 text-xs text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-hidden"
          />
        </div>
      </div>

      {/* Articles Table */}
      <div className="overflow-hidden rounded-xl border border-border bg-card shadow-2xs">
        <div className="overflow-x-auto">
          <table className="w-full text-start text-xs">
            <thead>
              <tr className="border-b border-border bg-muted/40 text-muted-foreground">
                <th className="p-3 font-semibold text-start">{isAr ? "العنوان" : "Title"}</th>
                <th className="p-3 font-semibold text-center w-16">{isAr ? "اللغة" : "Lang"}</th>
                <th className="p-3 font-semibold text-center w-28">{isAr ? "التصنيف" : "Category"}</th>
                <th className="p-3 font-semibold text-center w-24">{isAr ? "الحالة" : "Status"}</th>
                <th className="p-3 font-semibold text-center w-40">{isAr ? "إجراءات" : "Actions"}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={5} className="p-8 text-center text-xs text-muted-foreground">
                    {isAr ? "لا توجد مقالات مطابقة" : "No matching articles found"}
                  </td>
                </tr>
              ) : (
                filtered.map((post) => (
                  <tr key={post.id} className="transition-colors hover:bg-muted/30">
                    <td className="p-3">
                      <p className="font-semibold text-foreground text-sm line-clamp-1">{post.title}</p>
                      <p className="text-[11px] text-muted-foreground dir-ltr font-mono truncate max-w-md">
                        /{post.language === "ar" ? "ar/" : ""}blog/{post.slug}
                      </p>
                    </td>
                    <td className="p-3 text-center">
                      <span className="inline-block rounded-md bg-muted px-2 py-0.5 text-[11px] font-medium text-foreground">
                        {post.language === "ar" ? "عربي" : "EN"}
                      </span>
                    </td>
                    <td className="p-3 text-center">
                      <span className="text-[11px] text-muted-foreground font-medium">
                        {getCategoryLabel(post.category, lang)}
                      </span>
                    </td>
                    <td className="p-3 text-center">
                      <span
                        className={`inline-block rounded-full px-2.5 py-0.5 text-[11px] font-medium ${
                          post.is_published
                            ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                            : "bg-amber-500/10 text-amber-600 dark:text-amber-400"
                        }`}
                      >
                        {post.is_published ? (isAr ? "منشور" : "Published") : (isAr ? "مسودة" : "Draft")}
                      </span>
                    </td>
                    <td className="p-3">
                      <div className="flex items-center justify-center gap-1.5">
                        <button
                          onClick={() => router.push(`/admin/blog/${post.id}`)}
                          title={isAr ? "تعديل" : "Edit"}
                          className="inline-flex h-7 items-center gap-1 rounded-md bg-primary/10 px-2 text-[11px] font-medium text-primary hover:bg-primary/20 transition-colors"
                        >
                          <FileEdit className="h-3 w-3" />
                          {isAr ? "تعديل" : "Edit"}
                        </button>
                        <button
                          onClick={() => handleDuplicate(post.id)}
                          title={isAr ? "نسخ" : "Copy"}
                          className="inline-flex h-7 items-center justify-center rounded-md border border-border px-2 text-[11px] font-medium text-muted-foreground hover:bg-muted transition-colors"
                        >
                          <Copy className="h-3 w-3" />
                        </button>
                        {post.is_published && (
                          <a
                            href={`${post.language === "ar" ? "/ar" : ""}/blog/${post.slug}`}
                            target="_blank"
                            rel="noreferrer"
                            title={isAr ? "عرض" : "View"}
                            className="inline-flex h-7 items-center justify-center rounded-md border border-border px-2 text-[11px] font-medium text-muted-foreground hover:bg-muted transition-colors"
                          >
                            <ExternalLink className="h-3 w-3" />
                          </a>
                        )}
                        <button
                          onClick={() => handleDelete(post.id)}
                          title={isAr ? "حذف" : "Delete"}
                          className="inline-flex h-7 items-center justify-center rounded-md border border-rose-500/20 px-2 text-[11px] font-medium text-rose-500 hover:bg-rose-500/10 transition-colors"
                        >
                          <Trash2 className="h-3 w-3" />
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
        <div className="pt-2">
          <h2 className="mb-3 text-base font-bold text-foreground">{isAr ? "أحدث المقالات المضافة" : "Recently Added"}</h2>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {stats.recent.map((p: AdminBlogPost) => (
              <div key={p.id} className="rounded-xl border border-border bg-card p-3.5 shadow-2xs hover:border-primary/30 transition-all">
                <div className="flex items-center justify-between gap-2">
                  <span className="rounded-md bg-muted px-2 py-0.5 text-[10px] font-medium text-foreground">
                    {p.language === "ar" ? "عربي" : "EN"}
                  </span>
                  <span className="text-[11px] text-muted-foreground">{getCategoryLabel(p.category, lang)}</span>
                </div>
                <h3 className="mt-2 line-clamp-1 text-xs font-semibold text-foreground">{p.title}</h3>
                <p className="mt-1 text-[10px] text-muted-foreground">{new Date(p.created_at || Date.now()).toLocaleDateString()}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* AI generation form — enqueues an article_generate job on the queue */}
      <Dialog open={genOpen} onOpenChange={(o) => !genBusy && setGenOpen(o)}>
        <DialogContent className="sm:max-w-lg" dir={isAr ? "rtl" : "ltr"}>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base">
              <Wand2 className="h-4 w-4 text-primary" />
              {isAr ? "توليد مقال بالذكاء الاصطناعي" : "Generate Article with AI"}
            </DialogTitle>
            <DialogDescription>
              {isAr
                ? "المقال بيتولد في الخلفية (على طابور الذكاء الاصطناعي) ويفتح في المحرر كمسودة تراجعها وتعدّلها قبل النشر."
                : "The article runs on the background queue and opens in the editor as a draft you review before publishing."}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3.5 py-1">
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-foreground">
                {isAr ? "موضوع المقال *" : "Article topic *"}
              </label>
              <textarea
                value={genTopic}
                onChange={(e) => setGenTopic(e.target.value)}
                rows={3}
                maxLength={300}
                placeholder={isAr ? "مثال: أفضل تمارين لحرق دهون البطن للمبتدئين في المنزل" : "e.g. Best home cardio exercises for beginners to burn belly fat"}
                className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-hidden"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-foreground">{isAr ? "اللغة" : "Language"}</label>
                <div className="inline-flex w-full rounded-lg bg-muted p-1">
                  {(["ar", "en"] as const).map((l) => (
                    <button
                      key={l}
                      type="button"
                      onClick={() => setGenLang(l)}
                      className={`flex-1 rounded-md px-3 py-1.5 text-xs font-medium transition-all ${
                        genLang === l ? "bg-background text-foreground shadow-2xs" : "text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      {l === "ar" ? "العربية" : "English"}
                    </button>
                  ))}
                </div>
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-foreground">
                  {isAr ? "النبرة (اختياري)" : "Tone (optional)"}
                </label>
                <input
                  type="text"
                  value={genTone}
                  onChange={(e) => setGenTone(e.target.value)}
                  maxLength={60}
                  placeholder={isAr ? "تحفيزي عملي" : "motivational & practical"}
                  className="w-full rounded-lg border border-border bg-background px-3 py-2 text-xs text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-hidden"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-medium text-foreground">
                {isAr ? "كلمات مفتاحية (اختياري — افصل بفاصلة)" : "Keywords (optional — comma separated)"}
              </label>
              <input
                type="text"
                value={genKeywords}
                onChange={(e) => setGenKeywords(e.target.value)}
                maxLength={200}
                placeholder={isAr ? "تمارين منزلية، حرق الدهون، زيادة" : "home workout, fat loss"}
                className="w-full rounded-lg border border-border bg-background px-3 py-2 text-xs text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-hidden"
              />
            </div>

            <button
              onClick={submitGeneration}
              disabled={genBusy || genTopic.trim().length < 5}
              className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {genBusy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
              {genBusy ? (isAr ? "جاري الإرسال..." : "Queueing...") : isAr ? "ابدأ التوليد" : "Start Generating"}
            </button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

