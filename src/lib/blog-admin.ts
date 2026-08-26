import { supabaseAdmin } from "@/lib/supabase/admin";
import { supabase as supabaseClient } from "@/lib/supabase/client";
import { callFreeAIFallbackChain } from "@/lib/ai-provider";

export type AdminBlogPost = {
  id: string;
  slug: string;
  language: string;
  title: string;
  excerpt?: string;
  content: string;
  meta_title?: string;
  meta_description?: string;
  focus_keyword?: string;
  keywords?: string[];
  category: string;
  tags?: string[];
  featured_image?: string;
  cover_alt?: string;
  reading_time?: number;
  author?: string;
  is_published: boolean;
  published_at?: string;
  created_at?: string;
  updated_at?: string;
  source?: string;
  faq_json?: any;
  schema_json?: any;
};

// ---- Client/Admin queries ----

export async function adminListPosts(): Promise<AdminBlogPost[]> {
  return adminGetPosts();
}

export async function adminGetPosts(): Promise<AdminBlogPost[]> {
  const client = typeof window === "undefined" ? supabaseAdmin : supabaseClient;
  if (!client) return [];
  const { data, error } = await client
    .from("blog_posts")
    .select("*")
    .order("created_at", { ascending: false });
  if (error) {
    console.error("[adminGetPosts] Error:", error);
    return [];
  }
  return (data || []) as unknown as AdminBlogPost[];
}

export async function adminGetPost(id: string): Promise<AdminBlogPost | null> {
  const client = typeof window === "undefined" ? supabaseAdmin : supabaseClient;
  if (!client) return null;
  const { data, error } = await client
    .from("blog_posts")
    .select("*")
    .eq("id", id)
    .single();
  if (error) {
    console.error("[adminGetPost] Error:", error);
    return null;
  }
  return data as unknown as AdminBlogPost;
}

export async function adminDeletePost(id: string): Promise<boolean> {
  const client = typeof window === "undefined" ? supabaseAdmin : supabaseClient;
  if (!client) return false;
  const { error } = await client.from("blog_posts").delete().eq("id", id);
  if (error) {
    console.error("[adminDeletePost] Error:", error);
    return false;
  }
  return true;
}

export async function adminDuplicatePost(id: string): Promise<AdminBlogPost | null> {
  const post = await adminGetPost(id);
  if (!post) return null;

  const newTitle = `${post.title} (نسخة)`;
  const newSlug = `${post.slug}-copy-${Date.now().toString().slice(-4)}`;

  return adminCreatePost({
    ...post,
    id: undefined,
    title: newTitle,
    slug: newSlug,
    is_published: false,
  });
}

export async function adminCreatePost(
  post: Partial<AdminBlogPost>,
): Promise<AdminBlogPost | null> {
  const client = typeof window === "undefined" ? supabaseAdmin : supabaseClient;
  if (!client) throw new Error("Supabase client unavailable");

  const now = new Date().toISOString();
  const payload: Record<string, any> = {
    language: post.language || "ar",
    title: post.title || "مقال جديد",
    slug: post.slug || `post-${Date.now()}`,
    excerpt: post.excerpt || "",
    content: post.content || "",
    meta_title: post.meta_title || "",
    meta_description: post.meta_description || "",
    focus_keyword: post.focus_keyword || "",
    keywords: post.keywords || [],
    category: post.category || "nutrition",
    tags: post.tags || [],
    featured_image: post.featured_image || "",
    cover_alt: post.cover_alt || "",
    reading_time: post.reading_time || 1,
    author: post.author || "MuscleHubEG",
    is_published: post.is_published || false,
    published_at: post.is_published ? now : null,
    created_at: now,
    updated_at: now,
    faq_json: post.faq_json || [],
    schema_json: post.schema_json || {},
  };

  if (post.source) {
    payload.source = post.source;
  }

  const { data, error } = await (client as any)
    .from("blog_posts")
    .insert([payload])
    .select()
    .single();

  if (error) {
    console.error("[adminCreatePost] Primary insert error:", error);
    if ("source" in payload) {
      delete payload.source;
      const retryRes = await (client as any)
        .from("blog_posts")
        .insert([payload])
        .select()
        .single();
      if (!retryRes.error) {
        return retryRes.data as unknown as AdminBlogPost;
      }
      console.error("[adminCreatePost] Retry insert error:", retryRes.error);
      throw new Error(retryRes.error.message || "فشل إنشاء المقال");
    }
    throw new Error(error.message || "فشل إنشاء المقال");
  }
  return data as unknown as AdminBlogPost;
}

export async function adminUpdatePost(
  id: string,
  updates: Partial<AdminBlogPost>,
): Promise<AdminBlogPost | null> {
  const client = typeof window === "undefined" ? supabaseAdmin : supabaseClient;
  if (!client) throw new Error("Supabase client unavailable");

  const payload: Record<string, any> = {
    ...updates,
    updated_at: new Date().toISOString(),
  };

  if (payload.source === undefined) {
    delete payload.source;
  }

  const { data, error } = await (client as any)
    .from("blog_posts")
    .update(payload)
    .eq("id", id)
    .select()
    .single();

  if (error) {
    console.error("[adminUpdatePost] Primary update error:", error);
    if ("source" in payload) {
      delete payload.source;
      const retryRes = await (client as any)
        .from("blog_posts")
        .update(payload)
        .eq("id", id)
        .select()
        .single();
      if (!retryRes.error) {
        return retryRes.data as unknown as AdminBlogPost;
      }
      console.error("[adminUpdatePost] Retry update error:", retryRes.error);
      throw new Error(retryRes.error.message || "فشل تحديث المقال");
    }
    throw new Error(error.message || "فشل تحديث المقال");
  }
  return data as unknown as AdminBlogPost;
}

export async function getBlogStats() {
  return adminGetStats();
}

export async function adminGetStats() {
  const client = typeof window === "undefined" ? supabaseAdmin : supabaseClient;
  if (!client)
    return {
      total: 0,
      published: 0,
      drafts: 0,
      en: 0,
      ar: 0,
      scheduled: 0,
      recent: [],
    };

  try {
    const { data } = await client
      .from("blog_posts")
      .select("*")
      .order("created_at", { ascending: false });

    if (!data)
      return {
        total: 0,
        published: 0,
        drafts: 0,
        en: 0,
        ar: 0,
        scheduled: 0,
        recent: [],
      };

    const posts = data as unknown as AdminBlogPost[];
    const now = new Date().toISOString();
    return {
      total: posts.length,
      published: posts.filter((p) => p.is_published).length,
      drafts: posts.filter((p) => !p.is_published).length,
      en: posts.filter((p) => p.language === "en").length,
      ar: posts.filter((p) => p.language === "ar").length,
      scheduled: posts.filter(
        (p) => p.is_published && p.published_at && p.published_at > now,
      ).length,
      recent: posts.slice(0, 5),
    };
  } catch {
    return {
      total: 0,
      published: 0,
      drafts: 0,
      en: 0,
      ar: 0,
      scheduled: 0,
      recent: [],
    };
  }
}

// ---- AI Tools ----

export type AIToolResult = { text: string; error?: string };

export async function aiTool(
  tool: string,
  params: {
    content?: string;
    title?: string;
    keyword?: string;
    lang: "en" | "ar";
  },
): Promise<AIToolResult> {
  // If running in browser, call the server API endpoint /api/ai/blog-tool
  if (typeof window !== "undefined") {
    try {
      const res = await fetch("/api/ai/blog-tool", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tool,
          params,
          content: params.content,
          title: params.title,
          focusKeyword: params.keyword,
          language: params.lang,
        }),
      });

      const data = await res.json();
      if (res.ok && (data.text || data.result)) {
        return { text: data.text || data.result };
      }
      if (data.error) {
        throw new Error(data.error);
      }
    } catch (err: any) {
      console.warn("[aiTool] Fetch to /api/ai/blog-tool failed, trying direct SDK:", err?.message || err);
    }
  }

  // Server-side / direct fallback
  const isAr = params.lang === "ar";
  const content = params.content || "";
  const title = params.title || "";
  const keyword = params.keyword || "";

  const prompts: Record<string, string> = {
    seo_title: isAr
      ? `اكتب عنوان SEO جذاب (أقل من 60 حرف) لمقال بعنوان "${title}" وكلمة مفتاحية "${keyword}". أعد العنوان فقط بدون علامات تنصيص.`
      : `Write an SEO-optimized title (under 60 chars) for an article titled "${title}" with focus keyword "${keyword}". Return title only without quotes.`,
    meta_desc: isAr
      ? `اكتب وصف ميتا (أقل من 160 حرف) لمقال بعنوان "${title}". أعد الوصف فقط بدون علامات تنصيص.`
      : `Write a meta description (under 160 chars) for an article titled "${title}". Return description only without quotes.`,
    improve: isAr
      ? `قم بإعادة صياغة وتحسين النص التالي ليكون أكثر احترافية وسلاسة وتنظيماً بأسلوب كوتش لياقة بدنية وتغذية خبير:\n\n${content.slice(0, 3000)}`
      : `Improve readability, flow, and clarity of this fitness/nutrition text:\n\n${content.slice(0, 3000)}`,
    enhance: isAr
      ? `قم بإعادة صياغة وتحسين النص التالي ليكون أكثر احترافية وسلاسة وتنظيماً بأسلوب كوتش لياقة بدنية وتغذية خبير:\n\n${content.slice(0, 3000)}`
      : `Improve readability, flow, and clarity of this fitness/nutrition text:\n\n${content.slice(0, 3000)}`,
    faq: isAr
      ? `استخرج وولّد 3 إلى 5 أسئلة وأجوبة شائعة (FAQ) هامة من هذا المحتوى.\n- جميع الأسئلة والأجوبة MUST تكون بالعربية الفصحى فقط.\n- لا تستخدم كلمات إنجليزية إلا المصطلحات العلمية المختصرة بين قوسين.\n- الأسئلة مرتبطة مباشرة بمحتوى المقال.\n- التزم بتنسيق Markdown:\n${content.slice(0, 3000)}`
      : `Generate 3 to 5 high-value FAQs in Markdown based on this content:\n${content.slice(0, 3000)}`,
    cta: isAr
      ? `اكتب 3 خيارات مختلفة لنصوص CTA قصيرة ومحفزة تدعو القارئ للاشتراك في برامج التدريب والتغذية المخصصة في MuscleHubEG.`
      : `Write 3 motivating CTA copies inviting readers to join MuscleHubEG personalized coaching.`,
    fb: isAr
      ? `اكتب منشور فيسبوك تفاعلي وجذاب مع إيموجيز وهاشتاجات مناسبة لمقال بعنوان "${title}".`
      : `Write an engaging Facebook post with emojis and hashtags for an article titled "${title}".`,
    fb_post: isAr
      ? `اكتب منشور فيسبوك تفاعلي وجذاب مع إيموجيز وهاشتاجات مناسبة لمقال بعنوان "${title}".`
      : `Write an engaging Facebook post with emojis and hashtags for an article titled "${title}".`,
    linkedin: isAr
      ? `اكتب منشور لينكد إن احترافي بأسلوب القيادة الفكرية يناقش النقاط الأساسية لمقال بعنوان "${title}".`
      : `Write a professional LinkedIn post highlighting key points for an article titled "${title}".`,
    x: isAr
      ? `اكتب تغريدة احترافية وموجزة (أقل من 280 حرف) لمقال بعنوان "${title}".`
      : `Write a concise professional tweet (under 280 chars) for an article titled "${title}".`,
    tweet: isAr
      ? `اكتب تغريدة احترافية وموجزة (أقل من 280 حرف) لمقال بعنوان "${title}".`
      : `Write a concise professional tweet (under 280 chars) for an article titled "${title}".`,
    instagram: isAr
      ? `اكتب كابشن إنستجرام شيق مع نقاط وهاشتاجات قوية لمقال بعنوان "${title}".`
      : `Write an engaging Instagram caption with bullet points and strong hashtags for an article titled "${title}".`,
    summary: isAr
      ? `لخّص هذا المحتوى في 4 إلى 6 نقاط محددة وعملية بأسلوب Markdown:\n${content.slice(0, 3000)}`
      : `Summarize this content in 4-6 actionable bullet points:\n${content.slice(0, 3000)}`,
    image_prompt: isAr
      ? `Write a detailed, high-quality AI image generation prompt in English for an article titled "${title}" with keyword "${keyword}". The image MUST be directly related to the specific article topic — NOT a generic gym scene. Include the article's main subject in the prompt.`
      : `Write a detailed, high-quality AI image generation prompt in English for an article titled "${title}" with keyword "${keyword}". The image MUST be directly related to the specific article topic — NOT a generic gym scene. Include the article's main subject in the prompt.`,
  };

  const prompt = prompts[tool] || prompts.improve;

  // Use callFreeAIFallbackChain — OpenRouter + Groq interleaved by strength
  // (owner directive 2026-08-27). maxModels × timeoutMs clamped ≤ 52s.
  try {
    const { text } = await callFreeAIFallbackChain(
      prompt,
      {
        temperature: 0.7,
        maxTokens: 1200,
        jsonMode: tool === "faq",
        timeoutMs: 22_000,
        maxModels: 2, // Vercel Hobby budget
      },
    );
    if (text && text.trim().length > 0) {
      return { text: text.trim() };
    }
  } catch (err: any) {
    console.error("[aiTool] OpenRouter failed:", err?.message);
    throw new Error(
      isAr
        ? "تعذر التواصل مع خدمات الذكاء الاصطناعي حالياً. يرجى إعادة المحاولة."
        : "AI service is currently unavailable. Please try again.",
    );
  }

  throw new Error(
    isAr
      ? "تعذر التواصل مع خدمات الذكاء الاصطناعي حالياً. يرجى إعادة المحاولة."
      : "AI service is currently unavailable. Please try again.",
  );
}

// ---- SEO Scoring ----

export function calculateSEOScore(post: Partial<AdminBlogPost>): {
  score: number;
  suggestions: string[];
} {
  let score = 0;
  const suggestions: string[] = [];

  // Title length (15 pts)
  if (post.title && post.title.length >= 30 && post.title.length <= 60)
    score += 15;
  else if (post.title && post.title.length > 0) {
    score += 8;
    suggestions.push(
      post.title!.length < 30
        ? "العنوان قصير جداً (30-60 حرف مثالي)"
        : "العنوان طويل جداً (30-60 حرف مثالي)",
    );
  } else suggestions.push("أضف عنواناً");

  // Meta description (15 pts)
  if (
    post.meta_description &&
    post.meta_description.length >= 120 &&
    post.meta_description.length <= 160
  )
    score += 15;
  else if (post.meta_description && post.meta_description.length > 0) {
    score += 8;
    suggestions.push("وصف الميتا يجب أن يكون 120-160 حرف");
  } else suggestions.push("أضف وصف ميتا");

  // Focus keyword (10 pts)
  if (post.focus_keyword) score += 10;
  else suggestions.push("أضف كلمة مفتاحية رئيسية");

  // Keywords (10 pts)
  if (post.keywords && post.keywords.length >= 3) score += 10;
  else if (post.keywords && post.keywords.length > 0) {
    score += 5;
    suggestions.push("أضف المزيد من الكلمات المفتاحية (3+ على الأقل)");
  } else suggestions.push("أضف كلمات مفتاحية");

  // Content length (15 pts)
  if (post.content && post.content.length >= 1500) score += 15;
  else if (post.content && post.content.length >= 500) {
    score += 8;
    suggestions.push("المحتوى قصير (1500+ حرف مثالي)");
  } else suggestions.push("أضف محتوى (1500+ حرف)");

  // Featured image (10 pts)
  if (post.featured_image) score += 10;
  else suggestions.push("أضف صورة مميزة");

  // Tags (5 pts)
  if (post.tags && post.tags.length >= 3) score += 5;
  else if (post.tags && post.tags.length > 0) score += 3;
  else suggestions.push("أضف وسوم");

  // FAQ (10 pts)
  if (post.faq_json && Array.isArray(post.faq_json) && post.faq_json.length > 0)
    score += 10;
  else suggestions.push("أضف أسئلة شائعة (FAQ)");

  // Slug (5 pts)
  if (post.slug && post.slug.length >= 10 && /^[a-z0-9-]+$/.test(post.slug))
    score += 5;
  else if (post.slug) {
    score += 2;
    suggestions.push("الـ slug يجب أن يكون أحرف صغيرة وأرقام وشرطات فقط");
  } else suggestions.push("أضف slug");

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
  return Math.max(1, Math.ceil(words / 200));
}
