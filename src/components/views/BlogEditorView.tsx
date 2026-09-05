"use client";

import Image from "next/image";
import { useEffect, useState, useCallback, useRef } from "react";
import { Save, Eye, Code, Sparkles, Loader2, ArrowLeft, Plus, X, CheckCircle, AlertCircle, Clock, Wand2, Settings2, ImagePlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { useI18n } from "@/lib/i18n";
import { useRouter } from "next/navigation";
import { BLOG_CATEGORIES, VALID_CATEGORY_IDS, getCategoryLabel, parseTableOfContents, renderMarkdown, isSafeUrl } from "@/lib/blog";
import { adminGetPost, adminCreatePost, adminUpdatePost, calculateSEOScore, calculateWordCount, calculateReadingTime, type AdminBlogPost } from "@/lib/blog-admin";
import { runAiJob, AI_ARTICLE_DRAFT_KEY, articleSlugFromTitle } from "@/lib/ai-jobs-client";
import { toast } from "sonner";

/* CLEAR-PERSISTS LAW (2026-08-28n, owner: «مسح نتائج الادوات لم يعمل»):
 * clearing used to be memory-only — every remount re-hydrated the SAME
 * results from ai_jobs (24h window), so «مسح الكل»/«إغلاق» looked dead:
 * the panel emptied for a second, then everything came back. Dismissed
 * job ids now persist in localStorage — hydration skips them on every
 * mount AND every manual refresh, so cleared results STAY cleared.
 * Lazy init + window guards keep SSR prerender safe. */
const DISMISSED_TOOL_JOBS_KEY = "muscleshub.dismissedToolJobs";
const loadDismissedToolJobs = (): Set<string> => {
 try {
  if (typeof window === "undefined") return new Set<string>();
  const raw = window.localStorage.getItem(DISMISSED_TOOL_JOBS_KEY);
  const arr: unknown = raw ? JSON.parse(raw) : [];
  return new Set<string>(Array.isArray(arr) ? arr.filter((x): x is string => typeof x === "string") : []);
 } catch {
  return new Set<string>();
 }
};
const saveDismissedToolJobs = (s: Set<string>): void => {
 try {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(DISMISSED_TOOL_JOBS_KEY, JSON.stringify([...s].slice(-400)));
 } catch {
  /* storage blocked/full — dismissal still holds for this page load */
 }
};
// Session cache survives view switches inside one page load;
// localStorage survives reloads.
let dismissedToolJobsCache: Set<string> | null = null;
const getDismissedToolJobs = (): Set<string> => {
 if (!dismissedToolJobsCache) dismissedToolJobsCache = loadDismissedToolJobs();
 return dismissedToolJobsCache;
};
const dismissToolJob = (jobId: string): void => {
 if (!jobId) return;
 const s = getDismissedToolJobs();
 if (!s.has(jobId)) {
  s.add(jobId);
  saveDismissedToolJobs(s);
 }
};

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
 author: "Alkemos",
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
 // ALL-RESULTS LAW (2026-08-28m, owner: «بيظهر نتيجتين فقط محتاج يظهر
 // كل النتايج»): the panel is an APPEND-ONLY list — every tool run AND
 // every recovered job gets its own card. The previous per-tool record
 // silently OVERWROTE earlier results of the same tool (run «إعادة
 // صياغة» 3 times → only the last survived) and hydration filled only
 // missing keys. «مسح الكل» wipes the panel; each card has its own إغلاق.
 const [aiResults, setAiResults] = useState<AiResultListItem[]>([]);
 const [aiPrefilled, setAiPrefilled] = useState(false);
 // OWNER IMAGE-SWAP (2026-08-28f): «خلال الانتظار محتاج اقدر اعدل الصور
 // للمقال… لان احيانا الصور بتكون غير مناسبة» — suggest/swap session
 // state: rejected URLs accumulate so the same photo never repeats.
 const [imgBusy, setImgBusy] = useState(false);
 const [imgExclude, setImgExclude] = useState<string[]>([]);
 const [imgVariation, setImgVariation] = useState(0);

 // Suggest ONE safe cover via the SAME v3.1 pipeline (Pexels-first, NSFW
 // screened). The exclude list grows with every rejection so
 // «🔄 صورة مختلفة» always returns a NEW photo.
 const suggestCoverImage = async () => {
   if (imgBusy) return;
   const query = [post.title, post.focus_keyword, ...(post.keywords || []).slice(0, 2)]
     .filter(Boolean)
     .join(" ")
     .trim();
   if (query.length < 3) {
     toast.error(isAr ? "اكتب العنوان الأول علشان نقترح صورة مناسبة" : "Add a title first so we can suggest a matching photo");
     return;
   }
   setImgBusy(true);
   try {
     const res = await fetch("/api/blog/suggest-image", {
       method: "POST",
       headers: { "Content-Type": "application/json" },
       body: JSON.stringify({ query, exclude: imgExclude, variation: imgVariation }),
     });
     const data = await res.json().catch(() => ({}));
     if (!res.ok) {
       toast.error(data.error || (isAr ? "فشل اقتراح الصورة" : "Image suggestion failed"));
       return;
     }
     if (!data.image?.url) {
       toast.error(isAr ? "مفيش صورة آمنة مطابقة — جرب كلمات مختلفة في العنوان" : "No safe match found — try different wording");
       return;
     }
     const nextExclude = [...imgExclude, data.image.url].slice(-12);
     setImgExclude(nextExclude);
     setImgVariation((v) => v + 1);
     setPost((p) => ({ ...p, featured_image: data.image.url, cover_alt: data.image.alt || p.cover_alt }));
     toast.success(isAr ? "وصلت صورة آمنة مقترحة ✅ اقبلها أو اطلب غيرها" : "Safe photo suggested ✅ accept it or ask for another");
   } catch (e) {
     toast.error(e instanceof Error ? e.message : (isAr ? "فشل اقتراح الصورة" : "Image suggestion failed"));
   } finally {
     setImgBusy(false);
   }
 };

 // PER-IMAGE SWAP (2026-08-28m, owner: «تبديل صورة المقال اليدوى تعمل
 // جيدا لكن لصورة المقال الرئيسية فقط محتاج اضافة تبديل لكل صورة داخل
 // المقال لوحدها»): every body image in the preview swaps through the
 // SAME safe suggest-image pipeline as the cover, replacing exactly that
 // markdown occurrence (offset-precise — sibling images never move).
 const [bodyImgBusy, setBodyImgBusy] = useState<string | null>(null);
 const swapBodyImage = async (b: { alt: string; url: string; start: number; end: number }) => {
   if (bodyImgBusy) return;
   setBodyImgBusy(b.url);
   try {
     const hint = b.alt.trim().length > 3 ? `${b.alt.trim().slice(0, 80)} ` : "";
     const query = `${hint}${[post.title, post.focus_keyword, ...(post.keywords || []).slice(0, 2)]
       .filter(Boolean)
       .join(" ")}`.trim();
     if (query.length < 3) {
       toast.error(isAr ? "اكتب العنوان الأول علشان نقترح بديل مناسب" : "Add a title first so we can suggest a replacement");
       return;
     }
     const res = await fetch("/api/blog/suggest-image", {
       method: "POST",
       headers: { "Content-Type": "application/json" },
       body: JSON.stringify({ query, exclude: imgExclude, variation: imgVariation }),
     });
     const data = await res.json().catch(() => ({}));
     if (!res.ok || !data.image?.url) {
       toast.error(data.error || (isAr ? "مفيش بديل آمن مطابق — جرب تاني" : "No safe match found — try again"));
       return;
     }
     const nextExclude = [...imgExclude, data.image.url].slice(-12);
     setImgExclude(nextExclude);
     setImgVariation((v) => v + 1);
     // Markdown alt cannot contain ] or ) — neutralize before splicing.
     const safeAlt = String(data.image.alt || b.alt || "").replace(/[\[\]()]/g, " ").trim();
     const replacement = `![${safeAlt}](${data.image.url})`;
     setPost((p) => ({
       ...p,
       content: (p.content || "").slice(0, b.start) + replacement + (p.content || "").slice(b.end),
     }));
     toast.success(isAr ? "اتبدلت الصورة في مكانها ✅" : "Image swapped in place ✅");
   } catch (e) {
     toast.error(e instanceof Error ? e.message : (isAr ? "فشل تبديل الصورة" : "Image swap failed"));
   } finally {
     setBodyImgBusy(null);
   }
 };

 // AI ARTICLE GENERATION HAND-OFF (2026-08-28): BlogAdminView stores the
 // finished article_generate result in sessionStorage right before pushing
 // here — consume it exactly once and prefill the draft form.
 useEffect(() => {
 if (mode !== "new") return;
 try {
 const raw = sessionStorage.getItem(AI_ARTICLE_DRAFT_KEY);
 if (!raw) return;
 sessionStorage.removeItem(AI_ARTICLE_DRAFT_KEY);
 const d = JSON.parse(raw);
 if (!d?.title || !d?.markdown) return;
 setPost((p) => ({
 ...p,
 title: String(d.title),
 content: String(d.markdown),
 excerpt: String(d.excerpt || ""),
 meta_title: String(d.meta_title || d.title),
 meta_description: String(d.meta_description || ""),
 focus_keyword: String(d.focus_keyword || (Array.isArray(d.tags) && d.tags[0]) || "") || p.focus_keyword,
 keywords: Array.isArray(d.tags) ? d.tags.slice(0, 8).map(String) : p.keywords,
 tags: Array.isArray(d.tags) ? d.tags.map(String) : p.tags,
 // SEO-SLUG LAW (2026-08-28i): the generator now proposes a real English
 // SEO slug — dated articleSlugFromTitle is only the fallback net.
 slug: String(d.slug || "").trim() || articleSlugFromTitle(String(d.title)),
 featured_image: String(d.featured_image || ""),
 cover_alt: String(d.cover_alt || ""),
 language: d.language === "en" ? "en" : "ar",
 // TYPE-ROTATION (2026-08-28c): the generated draft lands under the
 // pillar the topic brain picked (only when it's a known category id).
 category: VALID_CATEGORY_IDS.has(String(d.category)) ? String(d.category) : p.category,
 reading_time: calculateReadingTime(String(d.markdown)),
 }));
 setAiPrefilled(true);
 toast.success(
 isAr
 ? "تم تعبئة المسودة من الذكاء الاصطناعي — راجع المحتوى وعدّل ما يلزم قبل الحفظ"
 : "AI draft loaded — review and edit before saving",
 );
 } catch {
 /* malformed draft — ignore, the editor stays clean */
 }
 }, [mode]);

 useEffect(() => {
 if (mode === "edit" && postId) {
 (async () => {
 try {
 const p = await adminGetPost(postId);
 if (p) setPost(p);
 } catch (e) { toast.error(e instanceof Error ? e.message : "فشل تحميل المقال"); }
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
 // ONE-SLUG-LAW (2026-08-28k): was a SIXTH drifted local slug copy that
 // kept Arabic characters (\u0600-\u06FF) — an Arabic title auto-filled
 // an Arabic slug the M15 save gate then rejected. Now the shared law
 // produces the same latin/dated slug the coach generator uses (line
 // parity with the generation path above).
 const slug = articleSlugFromTitle(title);
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
 } catch (e) { toast.error(e instanceof Error ? e.message : "فشل الحفظ"); }
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

 // Tool registry + label resolver live ABOVE runAITool/hydration — both
 // consume labels while running (lint no-use-before-define).
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

/* Result formatters — ONE shaping for fresh runs AND recovered jobs.
 * COPY-VS-DISPLAY LAW (2026-08-28, owner: «النسخ بياخد الرسالة كلها
 * مش المطلوب فقط»): the panel DISPLAYS the ♻️ recovered-header, the 📝
 * change-notes and social meta-suggestions, but «نسخ» copies ONLY the
 * paste-able deliverable (the text itself / post+hashtags). */
type AiResultEntry = { display: string; copy: string };
type AiResultListItem = AiResultEntry & { key: string; label: string; at: string; recovered: boolean; jobId?: string };
const formatSocialResult = (r: unknown): AiResultEntry => {
 const view = (r ?? {}) as Record<string, unknown>;
 const tags = Array.isArray(view.hashtags) ? view.hashtags.join(" ") : "";
 const main = [String(view.post_text || ""), tags ? `\n\n${tags}` : ""].join("");
 const aux = [
 view.cta ? `\n\n📣 ${view.cta}` : "",
 view.image_idea ? `\n\n🖼️ اقتراح صورة: ${view.image_idea}` : "",
 Array.isArray(view.best_times) && view.best_times.length ? `\n⏰ أفضل أوقات النشر: ${view.best_times.join(" • ")}` : "",
 ].join("");
 return { copy: main.trim(), display: `${main}${aux}`.trim() };
};
const formatToolResult = (r: unknown): AiResultEntry => {
 const view = (r ?? {}) as Record<string, unknown>;
 const text = String(view.text ?? "");
 const notes = typeof view.notes === "string" && view.notes.trim() ? view.notes : undefined;
 return {
 copy: text.trim(),
 display: notes ? `${text}\n\n📝 تغييرات:\n${notes}` : text,
 };
};

/* PREVIEW SEGMENTATION (2026-08-28m, owner: «محتاج اضافة تبديل لكل صورة
 * داخل المقال لوحدها»): standalone image lines become first-class blocks
 * so the preview can attach a swap button to EACH image. Text blocks
 * keep rendering through the SAME renderMarkdown law; unsafe image URLs
 * fall back into the text path where renderMarkdown strips them. */
type PreviewBlock =
 | { kind: "md"; text: string }
 | { kind: "img"; alt: string; url: string; start: number; end: number };
const IMAGE_LINE_RE = /^!\[([^\]]*)\]\(([^)\s]+)(?:\s+"[^"]*")?\)\s*$/;

const splitPreviewBlocks = (content: string): PreviewBlock[] => {
  const blocks: PreviewBlock[] = [];
  let buf: string[] = [];
  let pos = 0;
  for (const line of (content || "").split("\n")) {
    const lineStart = pos;
    pos += line.length + 1;
    const raw = line.trim();
    const m = raw.match(IMAGE_LINE_RE);
    if (m && isSafeUrl(m[2])) {
      // Standalone image line → first-class block with its own swap
      // button. start/end are ABSOLUTE offsets into post.content so a
      // swap replaces exactly this occurrence (never a sibling image).
      if (buf.some((l) => l.trim())) blocks.push({ kind: "md", text: buf.join("\n") });
      buf = [];
      const start = lineStart + line.indexOf(raw);
      blocks.push({ kind: "img", alt: m[1] || "", url: m[2], start, end: start + raw.length });
    } else {
      buf.push(line);
    }
  }
  if (buf.some((l) => l.trim())) blocks.push({ kind: "md", text: buf.join("\n") });
  return blocks;
};

/* Queue-driven button → GH Actions worker → result stored in ai_jobs.
 * Poll continues client-side; the panel below is also hydrated from the
 * queue on mount/refresh so a finished result is NEVER stranded by a
 * navigation (the «لم يحدث شيء» incident, 2026-08-28). */
const runAITool = async (tool: string) => {
 if (aiBusy[tool]) return;
 setAiBusy((b) => ({ ...b, [tool]: true }));
 try {
 const platform = SOCIAL_TOOL_PLATFORMS[tool];
 let entry: AiResultEntry;
 let jobId = "";
 if (platform) {
 const { result, id } = await runAiJob("social_post", {
 platform,
 tone: socialTone,
 language: post.language,
 title: post.title || "",
 topic: post.title || "",
 content: (post.excerpt || "") + "\n\n" + (post.content || "").slice(0, 6000),
 });
 jobId = id;
 entry = formatSocialResult(result);
 } else {
 const { result, id } = await runAiJob("article_tool", {
 tool,
 content: post.content || "",
 title: post.title || "",
 keyword: post.focus_keyword || "",
 category: post.category || "",
 language: post.language,
 });
 jobId = id;
 entry = formatToolResult(result);
 }
 if (!entry.copy.trim()) throw new Error("نتيجة فارغة — حاول مرة أخرى.");
 // Mark the settled job so a later manual hydration refresh can NEVER
 // duplicate a result the user just watched land.
 if (jobId) hydratedJobIds.current.add(jobId);
 const at = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
 setAiResults((prev) => [
 { ...entry, key: tool, label: aiResultLabel(tool), at, recovered: false, jobId: jobId || undefined },
 ...prev,
 ]);
 toast.success("تم التوليد من الطابور!");
 } catch (e) {
 toast.error(e instanceof Error ? e.message : "فشل التوليد");
 } finally {
 setAiBusy((b) => ({ ...b, [tool]: false }));
 }
 };

/* RECOVER-RESULTS LAW (2026-08-28, incident «لم يحدث شيء»): tool results
 * land in ai_jobs 2-5 min AFTER the click (queued GH Actions worker).
 * The panel is memory-only, so a navigation during the wait stranded the
 * finished result with no way back — plans already recover via the jobs
 * list, tools now do too. On mount + on manual refresh: pull the last 20
 * own jobs, hydrate DONE article_tool/social_post results (≤24h old) not
 * already shown — ALL-RESULTS: each recovered job appends its OWN card
 * («نتيجة سابقة» + finish time), nothing collapses per tool key. */
const hydratedJobIds = useRef<Set<string>>(new Set());
const hydratingRef = useRef(false);
const [hydrating, setHydrating] = useState(false);
const scanRecentToolJobs = useCallback(async () => {
 if (hydratingRef.current) return;
 hydratingRef.current = true;
 setHydrating(true);
 try {
 const res = await fetch("/api/ai/jobs?limit=20");
 if (!res.ok) return;
 const data = await res.json().catch(() => null);
 // jobs list rows — only the fields the hydration scan consumes.
 type ToolJobRow = {
 id?: string;
 status?: string;
 job_type?: string;
 payload?: Record<string, unknown> | null;
 finished_at?: string | null;
 created_at?: string | null;
 };
 const jobs = ((data as { jobs?: ToolJobRow[] } | null)?.jobs) ?? [];
 const cutoff = Date.now() - 24 * 3_600_000;
 const recovered: AiResultListItem[] = [];
 for (const j of jobs) {
 if (!j?.id || hydratedJobIds.current.has(j.id)) continue;
 hydratedJobIds.current.add(j.id);
 // CLEAR-PERSISTS: the owner dismissed this result — never resurrect it.
 if (getDismissedToolJobs().has(String(j.id))) continue;
 if (j?.status !== "done") continue;
 if (j?.job_type !== "article_tool" && j?.job_type !== "social_post") continue;
 const when = Date.parse(j.finished_at || j.created_at || "");
 if (Number.isFinite(when) && when < cutoff) continue;
 const PLATFORM_BUTTON: Record<string, string> = { facebook: "fb", x: "x", linkedin: "linkedin", instagram: "instagram" };
 const key = j.job_type === "social_post"
 ? PLATFORM_BUTTON[String(j.payload?.platform || "")] || ""
 : String(j.payload?.tool || "");
 if (!key) continue;
 const rres = await fetch(`/api/ai/jobs?id=${encodeURIComponent(j.id)}`);
 if (!rres.ok) continue;
 const job = await rres.json().catch(() => null);
 const r = job?.result;
 const entry = j.job_type === "social_post" ? formatSocialResult(r) : formatToolResult(r);
 if (!entry.copy.trim()) continue;
 const at = new Date(String(j.finished_at || j.created_at)).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
 const display = `♻️ نتيجة سابقة (اتكملت ${at})\n\n${entry.display}`;
 recovered.push({ ...entry, display, key, label: aiResultLabel(key), at, recovered: true });
 }
 // newest-first (the API returns newest first) — recovered results sit
 // above anything already on screen from this session.
 if (recovered.length) setAiResults((prev) => [...recovered, ...prev]);
 } catch {
 /* queue visibility is best-effort — never blocks editing */
 } finally {
 hydratingRef.current = false;
 setHydrating(false);
 }
}, []);
useEffect(() => {
 void scanRecentToolJobs();
}, [scanRecentToolJobs]);

 const seo = calculateSEOScore(post);
 const wordCount = calculateWordCount(post.content || "");
 const toc = parseTableOfContents(post.content || "");

 if (loading) return <div className="p-8 text-center text-muted-foreground">{isAr ? "جارٍ التحميل..." : "Loading..."}</div>;

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
 {/* AI prefill banner — explicit provenance so a generated draft is
 never mistaken for hand-written content (review-before-publish). */}
 {aiPrefilled && (
 <div className="flex items-start gap-2 rounded-xl border border-primary/30 bg-primary/5 px-4 py-3 text-xs text-foreground">
 <Sparkles className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary" />
 <span>
 {isAr
 ? "هذه المسودة مولّدة بالذكاء الاصطناعي. راجع المحتوى بالكامل، عدّل ما يلزم، واضبط الصورة المميزة قبل الحفظ أو النشر."
 : "This draft was AI-generated. Review the full content, edit as needed, and set the featured image before saving or publishing."}
 </span>
 </div>
 )}
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

 {/* Content / Preview — PER-IMAGE SWAP (2026-08-28m): standalone image
     lines render as first-class blocks, each with its own 🔄 swap button
     (same safe suggest-image pipeline as the cover). */}
 {showPreview ? (() => {
 const previewBlocks = splitPreviewBlocks(post.content || "");
 const hasBodyImages = previewBlocks.some((b) => b.kind === "img");
 return (
 <Card className="min-h-[400px] p-6">
 {hasBodyImages && (
 <p className="mb-3 text-[11px] text-muted-foreground">
 💡 {isAr
 ? "كل صورة في المعاينة ليها زر «🔄 بدّل الصورة» — هتجيب بديل آمن ويستبدلها في مكانها داخل المحتوى."
 : "Every preview photo has a swap button — pick a safe replacement right where it stands."}
 </p>
 )}
 <div className="prose prose-sm max-w-none [&_h2]:mt-6 [&_h2]:mb-2 [&_h2]:font-bold [&_p]:leading-relaxed">
 {previewBlocks.map((b, i) =>
 b.kind === "md" ? (
 <div key={i} dangerouslySetInnerHTML={{ __html: renderMarkdown(b.text) }} />
 ) : (
 <div key={i} className="relative my-6">
 {/* eslint-disable-next-line @next/next/no-img-element */}
 <img src={b.url} alt={b.alt} loading="lazy" className="w-full rounded-2xl" />
 <button
 type="button"
 onClick={() => void swapBodyImage(b)}
 disabled={!!bodyImgBusy}
 className="absolute end-2 top-2 inline-flex items-center gap-1 rounded-full border border-border bg-background/95 px-2.5 py-1 text-[11px] font-medium shadow-sm transition-opacity hover:opacity-90 disabled:opacity-50"
 >
 {bodyImgBusy === b.url ? <Loader2 className="h-3 w-3 animate-spin" /> : <ImagePlus className="h-3 w-3" />}
 {bodyImgBusy === b.url
 ? (isAr ? "جاري التبديل…" : "Swapping…")
 : (isAr ? "🔄 بدّل الصورة" : "🔄 Swap photo")}
 </button>
 </div>
 ),
 )}
 </div>
 </Card>
 );
 })() : (
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

 {/* Featured image + OWNER IMAGE-SWAP (2026-08-28f): «احيانا الصور
     بتكون غير مناسبة» — suggest/replace a SAFE cover without leaving
     the review flow, using the same v3.1 sourcing pipeline. */}
 <div>
 <div className="flex items-center justify-between gap-2">
 <Label>{isAr ? "الصورة المميزة" : "Featured Image"}</Label>
 <div className="flex gap-1.5">
 <Button
 type="button"
 size="sm"
 variant="outline"
 disabled={imgBusy}
 onClick={suggestCoverImage}
 className="gap-1 text-xs"
 >
 {imgBusy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <ImagePlus className="h-3.5 w-3.5" />}
 {imgBusy
 ? (isAr ? "جاري البحث..." : "Searching...")
 : post.featured_image
 ? (isAr ? "🔄 صورة مختلفة" : "🔄 Different photo")
 : (isAr ? "✨ اقترح صورة آمنة" : "✨ Suggest safe photo")}
 </Button>
 </div>
 </div>
 {post.featured_image && (
 <div className="relative mt-2 h-36 w-full overflow-hidden rounded-lg">
 <Image src={post.featured_image} alt={post.cover_alt || "preview"} fill className="object-cover" />
 </div>
 )}
 <Input
 value={post.featured_image || ""}
 onChange={(e) => setPost((p) => ({ ...p, featured_image: e.target.value }))}
 placeholder={isAr ? "أو الصق رابط صورة يدوياً (https://...)" : "or paste an image URL (https://...)"}
 className="mt-2"
 dir="ltr"
 />
 <Input
 value={post.cover_alt || ""}
 onChange={(e) => setPost((p) => ({ ...p, cover_alt: e.target.value }))}
 placeholder={isAr ? "وصف الصورة (alt) — مهم للسيو وقارئ الشاشة" : "Image alt text — SEO + screen readers"}
 className="mt-2 text-xs"
 />
 <p className="mt-1.5 text-[11px] leading-relaxed text-muted-foreground">
 {isAr
 ? "الصور المقترحة من Pexels بنفس منظومة الأمان الآلية (فحص المحتوى غير اللائق قبل العرض). مش مناسبة؟ اضغط «صورة مختلفة» وهتجيب صورة جديدة غيرها."
 : "Suggested photos come from Pexels through the same automated safety pipeline (modesty-screened before display). Not a fit? Hit «Different photo» for a fresh one."}
 </p>
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

 <div className="mt-2 flex items-center justify-between gap-2">
 <span className="text-[10px] leading-4 text-muted-foreground">
 {isAr
 ? "⏱ النتيجة وظيفة خلفية تحتاج عادة ٢–٥ دقايق — لو غادرت الصفحة هتلاقي النتيجة محفوظة هنا (أو اضغط تحديث)."
 : "⏱ Results are background jobs (~2–5 min). If you leave the page, finished results are restored here (or press refresh)."}
 </span>
 <button
 onClick={() => void scanRecentToolJobs()}
 disabled={hydrating}
 className="shrink-0 text-xs text-primary hover:underline disabled:opacity-50"
 >
 {hydrating ? (isAr ? "جارٍ التحديث…" : "Refreshing…") : isAr ? "تحديث النتائج ↻" : "Refresh results ↻"}
 </button>
 </div>

 {/* AI Results — ALL-RESULTS: every run keeps its own card; «مسح الكل»
     wipes the panel and «إغلاق» removes a single result — both PERSIST
     (CLEAR-PERSISTS): dismissed job ids are remembered, hydration never
     brings cleared results back. */}
 {aiResults.length > 0 && (
 <div className="mt-4 space-y-3">
 <div className="flex items-center justify-between gap-2">
 <span className="text-xs font-semibold">
 {isAr ? `النتائج (${aiResults.length})` : `Results (${aiResults.length})`}
 </span>
 <button
 onClick={() => {
 for (const it of aiResults) if (it.jobId) dismissToolJob(it.jobId);
 setAiResults([]);
 toast.success(isAr ? "اتمسحت كل النتائج — مش هترجع تاني ✅" : "All results cleared — they stay cleared ✅");
 }}
 className="text-xs text-destructive hover:underline"
 >
 🗑 {isAr ? "مسح الكل" : "Clear all"}
 </button>
 </div>
 {aiResults.map((item, idx) => (
 <div key={`${item.key}-${idx}`} className="rounded-lg border border-border bg-muted/30 p-3">
 <div className="mb-1 flex items-center justify-between gap-2">
 <span className="truncate text-xs font-semibold">
 {item.label}
 {!item.recovered && item.at ? <span className="font-normal text-muted-foreground"> · {item.at}</span> : null}
 </span>
 <div className="flex shrink-0 gap-1">
 <button onClick={() => { navigator.clipboard.writeText(item.copy); toast.success(isAr ? "تم نسخ النص المطلوب فقط" : "Copied the deliverable only"); }} className="text-xs text-primary hover:underline">{isAr ? "نسخ" : "Copy"}</button>
 <button onClick={() => { if (item.jobId) dismissToolJob(item.jobId); setAiResults((prev) => prev.filter((_, i) => i !== idx)); }} className="text-xs text-destructive hover:underline">{isAr ? "إغلاق" : "Close"}</button>
 </div>
 </div>
 <pre className="whitespace-pre-wrap text-xs text-muted-foreground max-h-32 overflow-y-auto scrollbar-thin" dir="auto">{item.display}</pre>
 </div>
 ))}
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
