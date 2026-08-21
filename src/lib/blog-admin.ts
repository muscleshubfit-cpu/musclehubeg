"use client";

import { supabase, isSupabaseConfigured } from "@/lib/supabase/client";

// ---- Types ----
export type AdminBlogPost = {
 id: string;
 language: "en" | "ar";
 title: string;
 slug: string;
 excerpt: string | null;
 content: string;
 meta_title: string | null;
 meta_description: string | null;
 focus_keyword: string | null;
 keywords: string[];
 category: string;
 tags: string[];
 featured_image: string | null;
 cover_alt: string | null;
 reading_time: number;
 author: string;
 published_at: string | null;
 updated_at: string;
 is_published: boolean;
 faq_json: any;
 schema_json: any;
 linked_post_id: string | null;
 created_at: string;
};

// ---- CRUD ----

export async function adminListPosts(lang?: "en" | "ar"): Promise<AdminBlogPost[]> {
 if (!isSupabaseConfigured || !supabase) return [];
 try {
  let q = supabase.from("blog_posts" as any).select("*").order("created_at", { ascending: false });
  if (lang) q = q.eq("language", lang);
  const { data, error } = await q;
  if (error) {
   return [];
  }
  return (data ?? []) as unknown as AdminBlogPost[];
 } catch {
  return [];
 }
}

export async function adminGetPost(id: string): Promise<AdminBlogPost | null> {
 if (!isSupabaseConfigured || !supabase) return null;
 try {
  const { data, error } = await supabase.from("blog_posts" as any).select("*").eq("id", id).maybeSingle();
  if (error) {
   return null;
  }
  return (data as unknown as AdminBlogPost) || null;
 } catch {
  return null;
 }
}

export async function adminCreatePost(post: Partial<AdminBlogPost>): Promise<AdminBlogPost> {
 if (!isSupabaseConfigured || !supabase) throw new Error("Supabase not configured");
 const { data, error } = await supabase.from("blog_posts" as any).insert(post).select().single();
 if (error) throw new Error(error.message);
 return data as unknown as AdminBlogPost;
}

export async function adminUpdatePost(id: string, updates: Partial<AdminBlogPost>): Promise<AdminBlogPost> {
 if (!isSupabaseConfigured || !supabase) throw new Error("Supabase not configured");
 const { data, error } = await supabase.from("blog_posts" as any).update({ ...updates, updated_at: new Date().toISOString() }).eq("id", id).select().single();
 if (error) throw new Error(error.message);
 return data as unknown as AdminBlogPost;
}

export async function adminDeletePost(id: string): Promise<void> {
 if (!isSupabaseConfigured || !supabase) return;
 const { error } = await supabase.from("blog_posts" as any).delete().eq("id", id);
 if (error) throw new Error(error.message);
}

export async function adminDuplicatePost(id: string): Promise<AdminBlogPost | null> {
 const original = await adminGetPost(id);
 if (!original) return null;
 const { id: _, created_at, updated_at, published_at, ...rest } = original;
 const dup = await adminCreatePost({
 ...rest,
 title: `${original.title} (Copy)`,
 slug: `${original.slug}-copy-${Date.now().toString(36)}`,
 is_published: false,
 published_at: null,
 });
 return dup;
}

// ---- Stats ----

export async function getBlogStats() {
 if (!isSupabaseConfigured || !supabase) {
  return { total: 0, published: 0, drafts: 0, en: 0, ar: 0, scheduled: 0, recent: [] };
 }
 try {
  const { data, error } = await supabase.from("blog_posts" as any).select("*").order("created_at", { ascending: false });
  if (error || !data) return { total: 0, published: 0, drafts: 0, en: 0, ar: 0, scheduled: 0, recent: [] };

  const posts = data as unknown as AdminBlogPost[];
  const now = new Date().toISOString();
  return {
   total: posts.length,
   published: posts.filter((p) => p.is_published).length,
   drafts: posts.filter((p) => !p.is_published).length,
   en: posts.filter((p) => p.language === "en").length,
   ar: posts.filter((p) => p.language === "ar").length,
   scheduled: posts.filter((p) => p.is_published && p.published_at && p.published_at > now).length,
   recent: posts.slice(0, 5),
  };
 } catch {
  return { total: 0, published: 0, drafts: 0, en: 0, ar: 0, scheduled: 0, recent: [] };
 }
}

// ---- AI Tools ----

export type AIToolResult = { text: string; error?: string };

export async function aiTool(tool: string, params: { content?: string; title?: string; keyword?: string; lang: "en" | "ar" }): Promise<AIToolResult> {
 const isAr = params.lang === "ar";
 const content = params.content || "";
 const title = params.title || "";
 const keyword = params.keyword || "";

 const prompts: Record<string, string> = {
 seo_title: isAr
 ? `اكتب عنوان SEO جذاب (أقل من 60 حرف) لمقال بعنوان "${title}" وكلمة مفتاحية "${keyword}". أعد العنوان فقط.`
 : `Write an SEO-optimized title (under 60 chars) for an article titled "${title}" with focus keyword "${keyword}". Return title only.`,
 meta_desc: isAr
 ? `اكتب وصف ميتا (أقل من 160 حرف) لمقال بعنوان "${title}". أعد الوصف فقط.`
 : `Write a meta description (under 160 chars) for an article titled "${title}". Return description only.`,
 improve: isAr
 ? `حسّن readability ووضوح هذا النص:\n\n${content.slice(0, 2000)}`
 : `Improve readability and clarity of this text:\n\n${content.slice(0, 2000)}`,
 faq: isAr
 ? `ولّد 3 أسئلة شائعة JSON بصيغة [{"question":"...","answer":"..."}] من هذا المحتوى:\n${content.slice(0, 3000)}`
 : `Generate 3 FAQ JSON as [{"question":"...","answer":"..."}] from this content:\n${content.slice(0, 3000)}`,
 cta: isAr
 ? `اكتب نص CTA قصير يحفز القارئ على الاشتراك في كوتشينج رياضي.`
 : `Write a short CTA copy motivating readers to join fitness coaching.`,
 fb: isAr
 ? `اكتب منشور فيسبوك جذاب لمقال بعنوان "${title}".`
 : `Write an engaging Facebook post for an article titled "${title}".`,
 linkedin: isAr
 ? `اكتب منشور لينكد إن احترافي لمقال بعنوان "${title}".`
 : `Write a professional LinkedIn post for an article titled "${title}".`,
 x: isAr
 ? `اكتب تغريدة (أقل من 280 حرف) لمقال بعنوان "${title}".`
 : `Write a tweet (under 280 chars) for an article titled "${title}".`,
 instagram: isAr
 ? `اكتب كابشن إنستجرام مع هاشتاجات لمقال بعنوان "${title}".`
 : `Write an Instagram caption with hashtags for an article titled "${title}".`,
 summary: isAr
 ? `لخّص هذا المحتوى في 3 نقاط:\n${content.slice(0, 3000)}`
 : `Summarize this content in 3 bullet points:\n${content.slice(0, 3000)}`,
 image_prompt: isAr
 ? `اكتب prompt احترافي لتوليد صورة تناسب مقال بعنوان "${title}" وكلمة مفتاحية "${keyword}".`
 : `Write a professional image generation prompt for an article titled "${title}" with keyword "${keyword}".`,
 };

 const prompt = prompts[tool] || prompts.improve;

 // Use OpenRouter (Gemini removed — doesn't work)
 try {
   const { callAIWithFallback } = await import("@/lib/ai-provider");
   const OPENROUTER_KEY = process.env.OPENROUTER_API_KEY || process.env.AI_API_KEY || "";
   const OPENROUTER_BASE = "https://openrouter.ai/api/v1";
   if (OPENROUTER_KEY) {
     const models = ["google/gemma-4-26b-a4b-it:free", "google/gemma-4-31b-it:free", "nvidia/nemotron-3-ultra-550b-a55b:free"];
     for (const model of models) {
       try {
         const { text } = await callAIWithFallback(prompt, {
           temperature: 0.7, maxTokens: 1000, jsonMode: tool === "faq", timeoutMs: 30_000,
         }, { provider: "openrouter" as any, apiKey: OPENROUTER_KEY, model, baseUrl: OPENROUTER_BASE });
         return { text };
       } catch (e: any) { console.error(`[aiTool] OpenRouter ${model} failed:`, e?.message); }
     }
   }
 } catch (e: any) { console.error("[aiTool] AI failed:", e); }

 // Fallback: local generation
 return { text: localAITool(tool, params) };
}

function localAITool(tool: string, params: { content?: string; title?: string; keyword?: string; lang: "en" | "ar" }): string {
 const isAr = params.lang === "ar";
 const title = params.title || "";

 switch (tool) {
 case "seo_title":
 return isAr ? `${title} | دليل شامل 2026` : `${title} | Complete Guide 2026`;
 case "meta_desc":
 return isAr
 ? `اكتشف ${title} في هذا الدليل الشامل. نصائح علمية وتوصيات عملية من MuscleHub.`
 : `Discover ${title} in this complete guide. Science-backed tips and practical recommendations from MuscleHub.`;
 case "improve":
 return params.content?.slice(0, 500) || "";
 case "faq":
 return JSON.stringify([
 { question: isAr ? `ما هو ${title}؟` : `What is ${title}?`, answer: isAr ? "إجابة تفصيلية هنا..." : "Detailed answer here..." },
 { question: isAr ? `كيف أبدأ؟` : `How do I get started?`, answer: isAr ? "ابدأ بـ..." : "Start by..." },
 ]);
 case "cta":
 return isAr
 ? " جاهز لتبدأ تحوّلك؟ اشترك في عضوية MuscleHub اليوم واحصل على خطط مخصصة!"
 : " Ready to transform? Subscribe to a MuscleHub membership today and get personalized plans!";
 case "fb":
 return isAr
 ? ` مقال جديد: ${title}\n\nاكتشف النصائح العلمية في هذا الدليل الشامل.\n\n اقرأ المقال كاملاً\n#لياقة #تغذية #MuscleHub`
 : ` New Article: ${title}\n\nDiscover science-backed tips in this complete guide.\n\n Read the full article\n#fitness #nutrition #MuscleHub`;
 case "linkedin":
 return isAr
 ? `أكثر ما يميز النجاح في اللياقة هو الاستمرارية. في هذا المقال نشرح ${title} بالتفصيل.\n\nما هو أكبر تحدٍ يواجهك؟`
 : `What sets fitness success apart is consistency. In this article we explain ${title} in detail.\n\nWhat's your biggest challenge?`;
 case "x":
 return isAr ? ` ${title}\n\nنصائح علمية عملية من @MuscleHub\n\n#لياقة #تغذية` : ` ${title}\n\nScience-backed tips from @MuscleHub\n\n#fitness #nutrition`;
 case "instagram":
 return isAr
 ? `${title} \n.\n.\n.\n#لياقة #تغذية #تمارين #بناء_عضلات #MuscleHub #لياقة_بدون_حدود`
 : `${title} \n.\n.\n.\n#fitness #nutrition #workout #musclebuilding #MuscleHub #fitnessjourney`;
 case "summary":
 return isAr ? "• نقطة 1\n• نقطة 2\n• نقطة 3" : "• Point 1\n• Point 2\n• Point 3";
 case "image_prompt":
 return isAr
 ? `صورة احترافية لرياضي في جيم بإضاءة درامية، ألوان زرقاء وذهبية، جودة عالية`
 : `Professional photo of an athlete in a gym with dramatic lighting, blue and gold tones, high quality`;
 default:
 return "";
 }
}

// ---- SEO Scoring ----

export function calculateSEOScore(post: Partial<AdminBlogPost>): { score: number; suggestions: string[] } {
 let score = 0;
 const suggestions: string[] = [];
 const maxScore = 100;

 // Title length (15 pts)
 if (post.title && post.title.length >= 30 && post.title.length <= 60) score += 15;
 else if (post.title && post.title.length > 0) { score += 8; suggestions.push(post.title!.length < 30 ? "العنوان قصير جداً (30-60 حرف مثالي)" : "العنوان طويل جداً (30-60 حرف مثالي)"); }
 else suggestions.push("أضف عنواناً");

 // Meta description (15 pts)
 if (post.meta_description && post.meta_description.length >= 120 && post.meta_description.length <= 160) score += 15;
 else if (post.meta_description && post.meta_description.length > 0) { score += 8; suggestions.push("وصف الميتا يجب أن يكون 120-160 حرف"); }
 else suggestions.push("أضف وصف ميتا");

 // Focus keyword (10 pts)
 if (post.focus_keyword) score += 10;
 else suggestions.push("أضف كلمة مفتاحية رئيسية");

 // Keywords (10 pts)
 if (post.keywords && post.keywords.length >= 3) score += 10;
 else if (post.keywords && post.keywords.length > 0) { score += 5; suggestions.push("أضف المزيد من الكلمات المفتاحية (3+ على الأقل)"); }
 else suggestions.push("أضف كلمات مفتاحية");

 // Content length (15 pts)
 if (post.content && post.content.length >= 1500) score += 15;
 else if (post.content && post.content.length >= 500) { score += 8; suggestions.push("المحتوى قصير (1500+ حرف مثالي)"); }
 else suggestions.push("أضف محتوى (1500+ حرف)");

 // Featured image (10 pts)
 if (post.featured_image) score += 10;
 else suggestions.push("أضف صورة مميزة");

 // Tags (5 pts)
 if (post.tags && post.tags.length >= 3) score += 5;
 else if (post.tags && post.tags.length > 0) score += 3;
 else suggestions.push("أضف وسوم");

 // FAQ (10 pts)
 if (post.faq_json && Array.isArray(post.faq_json) && post.faq_json.length > 0) score += 10;
 else suggestions.push("أضف أسئلة شائعة (FAQ)");

 // Slug (5 pts)
 if (post.slug && post.slug.length >= 10 && /^[a-z0-9-]+$/.test(post.slug)) score += 5;
 else if (post.slug) { score += 2; suggestions.push("الـ slug يجب أن يكون أحرف صغيرة وأرقام وشرطات فقط"); }
 else suggestions.push("أضف slug");

 // Excerpt (5 pts)
 if (post.excerpt && post.excerpt.length >= 50) score += 5;
 else if (post.excerpt) score += 2;
 else suggestions.push("أضف ملخصاً");

 return { score, suggestions };
}

export function calculateWordCount(content: string): number {
 return content.trim().split(/\s+/).filter(Boolean).length;
}

export function calculateReadingTime(content: string): number {
 const words = calculateWordCount(content);
 return Math.max(1, Math.ceil(words / 200)); // 200 WPM average
}
