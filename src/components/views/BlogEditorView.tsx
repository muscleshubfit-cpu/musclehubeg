"use client";

import Image from "next/image";
import { useEffect, useState, useCallback, useRef } from "react";
import { Save, Eye, Code, Sparkles, Loader2, ArrowLeft, Plus, X, CheckCircle, AlertCircle, Clock, Wand2, Settings2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { useI18n } from "@/lib/i18n";
import { useRouter } from "next/navigation";
import { BLOG_CATEGORIES, getCategoryLabel, parseTableOfContents, renderMarkdown } from "@/lib/blog";
import { adminGetPost, adminCreatePost, adminUpdatePost, calculateSEOScore, calculateWordCount, calculateReadingTime, type AdminBlogPost } from "@/lib/blog-admin";
import { runAiJob } from "@/lib/ai-jobs-client";
import { toast } from "sonner";

export function BlogEditorView({ mode, postId }: { mode: "new" | "edit"; postId?: string }) {
 const { t, lang } = useI18n();
 const router = useRouter();
 const isAr = lang === "ar";

 const [post, setPost] = useState<Partial<AdminBlogPost>>({
 language: "ar",
 title: "",
 slug: "",
 excerpt: "",
 content: "",
 meta_title: "",
 meta_description: "",
 focus_keyword: "",
 keywords: [],
 category: "nutrition",
 tags: [],
 featured_image: "",
 cover_alt: "",
 reading_time: 1,
 author: "MuscleHub",
 is_published: false,
 faq_json: [],
 });
 const [loading, setLoading] = useState(mode === "edit");
 const [saving, setSaving] = useState(false);
 const [showPreview, setShowPreview] = useState(false);
 const [keywordInput, setKeywordInput] = useState("");
 const [tagInput, setTagInput] = useState("");
 const [aiBusy, setAiBusy] = useState<Record<string, boolean>>({}); // multi-tool in-flight (queued jobs)
 const [socialTone, setSocialTone] = useState<"professional" | "friendly" | "motivational">("motivational");
 const [aiResults, setAiResults] = useState<Record<string, string>>({});

 useEffect(() => {
 if (mode === "edit" && postId) {
 (async () => {
 try {
 const p = await adminGetPost(postId);
 if (p) setPost(p);
 } catch (e: any) { toast.error(e.message); }
 finally { setLoading(false); }
 })();
 }
 }, [mode, postId]);

 // Auto-save draft every 30s (M17 fix: use a ref so the interval doesn't
 // reset on every keystroke. The interval reads the latest post from the ref.)
 const postRef = useRef(post);
 useEffect(() => {
 postRef.current = post;
 }, [post]);
 useEffect(() => {
 if (mode !== "edit" || !postId) return;
 const interval = setInterval(() => {
 const p = postRef.current;
 if (p.title && p.content) {
 adminUpdatePost(postId, { title: p.title, content: p.content }).catch((e) => {
 console.error("[BlogEditor] auto-save failed:", e?.message);
 });
 }
 }, 30000);
 return () => clearInterval(interval);
 }, [mode, postId]);

 // Auto-calculate reading time
 useEffect(() => {
 if (post.content) {
 const rt = calculateReadingTime(post.content);
 setPost((p) => ({ ...p, reading_time: rt }));
 }
 }, [post.content]);

 // Auto-generate slug from title
 const updateTitle = (title: string) => {
 setPost((p) => {
 const slug = title.toLowerCase().replace(/[^\w\u0600-\u06FF\s-]/g, "").replace(/\s+/g, "-").replace(/-+/g, "-").slice(0, 80);
 return { ...p, title, slug: p.slug || slug };
 });
 };

 const save = async (publish?: boolean) => {
 if (!post.title?.trim() || !post.content?.trim()) {
 toast.error(isAr ? "العنوان والمحتوى مطلوبان" : "Title and content are required");
 return;
 }
 // M15 fix: validate slug format — only lowercase letters, numbers, hyphens.
 // Arabic characters break URL encoding + sharing + hreflang.
 const slug = post.slug?.trim() || "";
 if (!slug) {
 toast.error(isAr ? "الـ slug مطلوب" : "Slug is required");
 return;
 }
 if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)) {
 toast.error(
 isAr
 ? "الـ slug يجب أن يكون أحرف إنجليزية صغيرة وأرقام وواصلات فقط (مثال: my-first-post)"
 : "Slug must be lowercase English letters, numbers, and hyphens only (e.g. my-first-post)"
 );
 return;
 }
 if (slug.length > 80) {
 toast.error(isAr ? "الـ slug طويل جداً (حد أقصى 80 حرف)" : "Slug too long (max 80 chars)");
 return;
 }
 setSaving(true);
 try {
 const updates = { ...post, is_published: publish ?? post.is_published, published_at: publish && !post.published_at ? new Date().toISOString() : post.published_at };
 if (mode === "edit" && postId) {
 await adminUpdatePost(postId, updates);
 toast.success(isAr ? "تم الحفظ!" : "Saved!");
 } else {
 const created = await adminCreatePost(updates);
 toast.success(isAr ? "تم إنشاء المقال!" : "Article created!");
 router.push("/admin/blog");
 }
 } catch (e: any) { toast.error(e.message); }
 finally { setSaving(false); }
 };

 const addKeyword = () => {
 if (keywordInput.trim()) {
 setPost((p) => ({ ...p, keywords: [...(p.keywords || []), keywordInput.trim()] }));
 setKeywordInput("");
 }
 };
 const addTag = () => {
 if (tagInput.trim()) {
 setPost((p) => ({ ...p, tags: [...(p.tags || []), tagInput.trim()] }));
 setTagInput("");
 }
 };

 /**
 * OWNER DIRECTIVE #3/#4 (2026-08-27): every improvement tool and social
 * post runs as a queued AI job executed by GitHub Actions
 * (process-ai-jobs.yml). Multiple tools can be in-flight at once — each
 * button shows its own spinner and results land in the same panel.
 */
 const SOCIAL_TOOL_PLATFORMS: Record<string, string> = {
 fb: "facebook",
 facebook: "facebook",
 social_facebook: "facebook",
 instagram: "instagram",
 social_instagram: "instagram",
 x: "x",
 tweet: "x",
 twitter: "x",
 social_x: "x",
 linkedin: "linkedin",
 social_linkedin: "linkedin",
 };

 const runAITool = async (tool: string) => {
 if (aiBusy[tool]) return;
 setAiBusy((b) => ({ ...b, [tool]: true }));
 try {
 const platform = SOCIAL_TOOL_PLATFORMS[tool];
 let text: string;
 let notes: string | undefined;
 if (platform) {
 const { result } = await runAiJob("social_post", {
 platform,
 tone: socialTone,
 language: post.language,
 title: post.title || "",
 topic: post.title || "",
 content: (post.excerpt || "") + "\n\n" + (post.content || "").slice(0, 6000),
 });
 const r = result as any;
 const tags = Array.isArray(r?.hashtags) ? r.hashtags.join(" ") : "";
 text = [
 r?.post_text || "",
 tags ? `\n\n${tags}` : "",
 r?.cta ? `\n\n📣 ${r.cta}` : "",
 r?.image_idea ? `\n\n🖼️ اقتراح صورة: ${r.image_idea}` : "",
 r?.best_times?.length ? `\n⏰ أفضل أوقات النشر: ${r.best_times.join(" • ")}` : "",
 ].join("");
 } else {
 const { result } = await runAiJob("article_tool", {
 tool,
 content: post.content || "",
 title: post.title || "",
 keyword: post.focus_keyword || "",
 category: post.category || "",
 language: post.language,
 });
 const r = result as any;
 text = String(r?.text ?? "");
 notes = typeof r?.notes === "string" ? r.notes : undefined;
 }
 if (!text.trim()) throw new Error("نتيجة فارغة — حاول مرة أخرى.");
 setAiResults((prev) => ({ ...prev, [tool]: notes ? `${text}\n\n📝 تغييرات:\n${notes}` : text }));
 toast.success("تم التوليد من الطابور!");
 } catch (e: any) {
 toast.error(e.message || "فشل التوليد");
 } finally {
 setAiBusy((b) => ({ ...b, [tool]: false }));
 }
 };

 const seo = calculateSEOScore(post);
 const wordCount = calculateWordCount(post.content || "");
 const toc = parseTableOfContents(post.content || "");

 if (loading) return <div className="p-8 text-center text-muted-foreground">{isAr ? "جارٍ التحميل..." : "Loading..."}</div>;

 const aiTools = [
 { id: "seo_title", label: isAr ? "عنوان SEO" : "SEO Title" },
 { id: "meta_desc", label: isAr ? "وصف ميتا" : "Meta Description" },
 { id: "paraphrase", label: isAr ? "إعادة صياغة" : "Paraphrase" },
 { id: "improve", label: isAr ? "تحسين النص" : "Improve Content" },
 { id: "proofread", label: isAr ? "تدقيق لغوي" : "Proofread" },
 { id: "subheadings", label: isAr ? "عناوين فرعية" : "Add Subheadings" },
 { id: "summary", label: isAr ? "تلخيص + نقاط" : "Summarize + Bullets" },
 { id: "seo_pack", label: isAr ? "حزمة SEO كاملة" : "Full SEO Pack" },
 { id: "faq", label: isAr ? "توليد FAQ" : "Generate FAQ" },
 { id: "cta", label: isAr ? "توليد CTA" : "Generate CTA" },
 { id: "fb", label: isAr ? "منشور فيسبوك" : "Facebook Post" },
 { id: "linkedin", label: isAr ? "منشور لينكدإن" : "LinkedIn Post" },
 { id: "x", label: isAr ? "تغريدة X" : "X Post" },
 { id: "instagram", label: isAr ? "كابشن إنستجرام" : "Instagram Caption" },
 { id: "image_prompt", label: isAr ? "Prompt صورة" : "Image Prompt" },
 ];

 // Build a friendly label for AI results that came from the bundle.
 const aiResultLabel = (key: string): string => {
 const map: Record<string, string> = {
 image_prompt_featured: isAr ? "برومبت الصورة المميزة" : "Featured Image Prompt",
 image_prompt_facebook: isAr ? "برومبت صورة فيسبوك" : "Facebook Image Prompt",
 image_prompt_og: isAr ? "برومبت Open Graph" : "Open Graph Image Prompt",
 social_facebook: isAr ? "منشور فيسبوك" : "Facebook Post",
 social_linkedin: isAr ? "منشور لينكدإن" : "LinkedIn Post",
 social_instagram: isAr ? "كابشن إنستجرام" : "Instagram Caption",
 social_x: isAr ? "تغريدة" : "X Post",
 };
 return map[key] || aiTools.find((t) => t.id === key)?.label || key;
 };

 return (
 <div className="space-y-6">
 {/* Header — Apple-style */}
 <div className="flex flex-wrap items-center justify-between gap-4">
 <div className="flex items-center gap-4">
 <button
 onClick={() => router.push("/admin/blog")}
 className="text-sm font-normal text-[#0071e3] transition-opacity hover:opacity-70"
 >
 ‹ {isAr ? "رجوع" : "Back"}
 </button>
 <h1 className="text-2xl font-semibold tracking-tight md:text-3xl">
 {mode === "new" ? (isAr ? "مقال جديد" : "New Article") : (isAr ? "تعديل المقال" : "Edit Article")}
 </h1>
 </div>
 <div className="flex flex-wrap items-center gap-2">
 <button
 onClick={() => setShowPreview(!showPreview)}
 className="rounded-full border border-[#d2d2d7] bg-white px-4 py-2 text-sm font-normal transition-opacity hover:opacity-90"
 >
 {showPreview ? (isAr ? "تحرير" : "Edit") : (isAr ? "معاينة" : "Preview")}
 </button>
 <button
 onClick={() => save(false)}
 disabled={saving}
 className="rounded-full border border-[#d2d2d7] bg-white px-4 py-2 text-sm font-normal transition-opacity hover:opacity-90 disabled:opacity-50"
 >
 {saving ? "..." : (isAr ? "حفظ مسودة" : "Save Draft")}
 </button>
 <button
 onClick={() => save(true)}
 disabled={saving}
 className="rounded-full bg-[#1d1d1f] px-4 py-2 text-sm font-normal text-white transition-opacity hover:opacity-90 disabled:opacity-50"
 >
 {isAr ? "نشر" : "Publish"}
 </button>
 </div>
 </div>

 <div className="grid gap-4 lg:grid-cols-[1fr_320px]">
 {/* Main editor */}
 <div className="space-y-4">
 {/* Language + Category */}
 <div className="flex gap-2">
 <select
 value={post.language}
 onChange={(e) => setPost((p) => ({ ...p, language: e.target.value as "en" | "ar" }))}
 className="rounded-lg border border-border bg-card px-3 py-2 text-sm"
 >
 <option value="ar">العربية</option>
 <option value="en">English</option>
 </select>
 <select
 value={post.category}
 onChange={(e) => setPost((p) => ({ ...p, category: e.target.value }))}
 className="rounded-lg border border-border bg-card px-3 py-2 text-sm"
 >
 {BLOG_CATEGORIES.map((c) => (
 <option key={c.id} value={c.id}>{isAr ? c.ar : c.en}</option>
 ))}
 </select>
 </div>

 {/* Title */}
 <div>
 <Label>{isAr ? "العنوان" : "Title"}</Label>
 <Input
 value={post.title || ""}
 onChange={(e) => updateTitle(e.target.value)}
 placeholder={isAr ? "عنوان المقال..." : "Article title..."}
 className="mt-1.5 text-lg font-bold"
 />
 </div>

 {/* Slug */}
 <div>
 <Label>Slug</Label>
 <Input
 value={post.slug || ""}
 onChange={(e) => setPost((p) => ({ ...p, slug: e.target.value }))}
 placeholder="article-slug"
 className="mt-1.5 font-mono text-sm"
 dir="ltr"
 />
 </div>

 {/* Content / Preview */}
 {showPreview ? (
 <Card className="min-h-[400px] p-6">
 <div
 className="prose prose-sm max-w-none [&_h2]:mt-6 [&_h2]:mb-2 [&_h2]:font-bold [&_p]:leading-relaxed"
 dangerouslySetInnerHTML={{ __html: renderMarkdown(post.content || "") }}
 />
 </Card>
 ) : (
 <div>
 <Label>{isAr ? "المحتوى (Markdown)" : "Content (Markdown)"}</Label>
 <Textarea
 value={post.content || ""}
 onChange={(e) => setPost((p) => ({ ...p, content: e.target.value }))}
 placeholder="# Heading&#10;&#10;Write your content here..."
 className="mt-1.5 min-h-[400px] font-mono text-sm"
 dir="ltr"
 />
 </div>
 )}

 {/* Excerpt */}
 <div>
 <Label>{isAr ? "الملخص" : "Excerpt"}</Label>
 <Textarea
 value={post.excerpt || ""}
 onChange={(e) => setPost((p) => ({ ...p, excerpt: e.target.value }))}
 placeholder={isAr ? "ملخص قصير..." : "Short excerpt..."}
 className="mt-1.5 min-h-[60px]"
 />
 </div>

 {/* Featured image */}
 <div>
 <Label>{isAr ? "الصورة المميزة" : "Featured Image URL"}</Label>
 <Input
 value={post.featured_image || ""}
 onChange={(e) => setPost((p) => ({ ...p, featured_image: e.target.value }))}
 placeholder="https://..."
 className="mt-1.5"
 dir="ltr"
 />
 {post.featured_image && (
 <div className="relative mt-2 h-32 w-full overflow-hidden rounded-lg">
 <Image src={post.featured_image} alt="preview" fill className="object-cover" />
 </div>
 )}
 </div>

 {/* Keywords + Tags */}
 <div className="grid gap-4 sm:grid-cols-2">
 <div>
 <Label>{isAr ? "الكلمات المفتاحية" : "Keywords"}</Label>
 <div className="mt-1.5 flex gap-2">
 <Input value={keywordInput} onChange={(e) => setKeywordInput(e.target.value)} onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addKeyword())} placeholder={isAr ? "أضف كلمة..." : "Add keyword..."} />
 <Button size="sm" onClick={addKeyword}><Plus className="h-4 w-4" /></Button>
 </div>
 <div className="mt-2 flex flex-wrap gap-1">
 {(post.keywords || []).map((k, i) => (
 <Badge key={i} variant="secondary" className="cursor-pointer gap-1" onClick={() => setPost((p) => ({ ...p, keywords: p.keywords?.filter((_, j) => j !== i) }))}>
 {k} <X className="h-3 w-3" />
 </Badge>
 ))}
 </div>
 </div>
 <div>
 <Label>{isAr ? "الوسوم" : "Tags"}</Label>
 <div className="mt-1.5 flex gap-2">
 <Input value={tagInput} onChange={(e) => setTagInput(e.target.value)} onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addTag())} placeholder={isAr ? "أضف وسم..." : "Add tag..."} />
 <Button size="sm" onClick={addTag}><Plus className="h-4 w-4" /></Button>
 </div>
 <div className="mt-2 flex flex-wrap gap-1">
 {(post.tags || []).map((tag, i) => (
 <Badge key={i} variant="outline" className="cursor-pointer gap-1" onClick={() => setPost((p) => ({ ...p, tags: p.tags?.filter((_, j) => j !== i) }))}>
 #{tag} <X className="h-3 w-3" />
 </Badge>
 ))}
 </div>
 </div>
 </div>
 </div>

 {/* Sidebar: SEO + AI */}
 <div className="space-y-4">
 {/* SEO Score */}
 <Card className="p-4 shadow-card">
 <h3 className="flex items-center justify-between text-sm font-bold">
 {isAr ? "نقاط SEO" : "SEO Score"}
 <span className={`font-display text-2xl font-bold ${seo.score >= 70 ? "text-success" : seo.score >= 40 ? "text-warning" : "text-destructive"}`}>
 {seo.score}
 </span>
 </h3>
 <div className="mt-2 h-2 overflow-hidden rounded-full bg-muted">
 <div className={`h-full transition-all ${seo.score >= 70 ? "bg-success" : seo.score >= 40 ? "bg-warning" : "bg-destructive"}`} style={{ width: `${seo.score}%` }} />
 </div>
 <div className="mt-3 space-y-1 text-xs">
 <div className="flex justify-between"><span className="text-muted-foreground">{isAr ? "عدد الكلمات" : "Word Count"}</span><span className="font-medium">{wordCount}</span></div>
 <div className="flex justify-between"><span className="text-muted-foreground">{isAr ? "وقت القراءة" : "Reading Time"}</span><span className="font-medium">{post.reading_time} {isAr ? "د" : "min"}</span></div>
 </div>
 {seo.suggestions.length > 0 && (
 <div className="mt-3 space-y-1.5">
 {seo.suggestions.slice(0, 5).map((s, i) => (
 <div key={i} className="flex items-start gap-1.5 text-xs text-muted-foreground">
 <AlertCircle className="mt-0.5 h-3 w-3 shrink-0 text-warning" />
 <span>{s}</span>
 </div>
 ))}
 </div>
 )}
 </Card>

 {/* SEO Fields */}
 <Card className="p-4 shadow-card">
 <h3 className="mb-3 text-sm font-bold">{isAr ? "حقول SEO" : "SEO Fields"}</h3>
 <div className="space-y-3">
 <div>
 <Label className="text-xs">{isAr ? "عنوان SEO" : "Meta Title"}</Label>
 <Input value={post.meta_title || ""} onChange={(e) => setPost((p) => ({ ...p, meta_title: e.target.value }))} className="mt-1 text-sm" />
 <p className="mt-0.5 text-[10px] text-muted-foreground">{(post.meta_title || "").length}/60</p>
 </div>
 <div>
 <Label className="text-xs">{isAr ? "وصف ميتا" : "Meta Description"}</Label>
 <Textarea value={post.meta_description || ""} onChange={(e) => setPost((p) => ({ ...p, meta_description: e.target.value }))} className="mt-1 text-sm" rows={2} />
 <p className="mt-0.5 text-[10px] text-muted-foreground">{(post.meta_description || "").length}/160</p>
 </div>
 <div>
 <Label className="text-xs">{isAr ? "الكلمة المفتاحية" : "Focus Keyword"}</Label>
 <Input value={post.focus_keyword || ""} onChange={(e) => setPost((p) => ({ ...p, focus_keyword: e.target.value }))} className="mt-1 text-sm" />
 </div>
 </div>
 </Card>

 {/* AI Tools — each tool is a queued GitHub-Actions job; several can
 run at once and every button spins independently. */}
 <Card className="p-4 shadow-card">
 <h3 className="mb-3 flex items-center gap-2 text-sm font-bold">
 <Sparkles className="h-4 w-4 text-primary" />
 {isAr ? "أدوات AI (تعمل بالخلفية)" : "AI Tools (background jobs)"}
 </h3>

 {/* Tone for social-post tools */}
 <div className="mb-3 flex items-center gap-2">
 <span className="text-xs text-muted-foreground">{isAr ? "نبرة منشورات السوشيال:" : "Social tone:"}</span>
 <select
 value={socialTone}
 onChange={(e) => setSocialTone(e.target.value as typeof socialTone)}
 className="rounded-md border border-border bg-background px-2 py-1 text-xs"
 >
 <option value="motivational">{isAr ? "تحفيزية" : "Motivational"}</option>
 <option value="friendly">{isAr ? "ودية" : "Friendly"}</option>
 <option value="professional">{isAr ? "احترافية" : "Professional"}</option>
 </select>
 </div>

 <div className="grid grid-cols-2 gap-2">
 {aiTools.map((tool) => {
 const busy = !!aiBusy[tool.id];
 return (
 <Button
 key={tool.id}
 variant="outline"
 size="sm"
 className="gap-1.5 text-xs"
 onClick={() => runAITool(tool.id)}
 disabled={busy}
 title={isAr ? "ينفّذ في الخلفية على GitHub Actions (~10 دقائق)" : "Runs on GitHub Actions in the background (~10 min)"}
 >
 {busy ? <Loader2 className="h-3 w-3 animate-spin" /> : <Sparkles className="h-3 w-3" />}
 {busy ? (isAr ? "جارٍ التنفيذ…" : "Running…") : tool.label}
 </Button>
 );
 })}
 </div>

 {/* AI Results */}
 {Object.entries(aiResults).length > 0 && (
 <div className="mt-4 space-y-3">
 {Object.entries(aiResults).map(([tool, result]) => {
 const toolLabel = aiResultLabel(tool);
 return (
 <div key={tool} className="rounded-lg border border-border bg-muted/30 p-3">
 <div className="mb-1 flex items-center justify-between">
 <span className="text-xs font-semibold">{toolLabel}</span>
 <div className="flex gap-1">
 <button onClick={() => { navigator.clipboard.writeText(result); toast.success(isAr ? "تم النسخ" : "Copied"); }} className="text-xs text-primary hover:underline">{isAr ? "نسخ" : "Copy"}</button>
 <button onClick={() => { setAiResults((prev) => { const n = { ...prev }; delete n[tool]; return n; }); }} className="text-xs text-destructive hover:underline">{isAr ? "إغلاق" : "Close"}</button>
 </div>
 </div>
 <pre className="whitespace-pre-wrap text-xs text-muted-foreground max-h-32 overflow-y-auto scrollbar-thin" dir="auto">{result}</pre>
 </div>
 );
 })}
 </div>
 )}
 </Card>

 {/* TOC preview */}
 {toc.length > 0 && (
 <Card className="p-4 shadow-card">
 <h3 className="mb-2 text-sm font-bold">{isAr ? "جدول المحتويات" : "Table of Contents"}</h3>
 <ul className="space-y-1 text-xs text-muted-foreground">
 {toc.map((item, i) => (
 <li key={i} className={item.level === 3 ? "ps-3" : ""}>{item.text}</li>
 ))}
 </ul>
 </Card>
 )}
 </div>
 </div>
 </div>
 );
}
