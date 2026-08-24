"use client";

import { supabase, isSupabaseConfigured } from "@/lib/supabase/client";

export type BlogPost = {
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

export const BLOG_CATEGORIES = [
 { id: "nutrition", en: "Nutrition", ar: "تغذية" },
 { id: "workout", en: "Workout", ar: "تمارين" },
 { id: "supplements", en: "Supplements", ar: "مكملات" },
 { id: "weight-loss", en: "Weight Loss", ar: "خسارة وزن" },
 { id: "muscle-gain", en: "Muscle Gain", ar: "بناء عضلات" },
 { id: "health", en: "Health", ar: "صحة" },
 { id: "recipes", en: "Recipes", ar: "وصفات" },
 { id: "science", en: "Science", ar: "علم" },
];

export const VALID_CATEGORY_IDS = new Set(BLOG_CATEGORIES.map((c) => c.id));

/**
 * Normalize a category id to a valid one. Maps common AI-hallucinated
 * synonyms (e.g. "training" → "workout") and falls back to "nutrition"
 * for anything unrecognized. Use this when saving posts to prevent
 * the filter UI from showing broken/unknown categories.
 */
export function normalizeCategory(categoryId: string | undefined | null): string {
 if (!categoryId) return "nutrition";
 const id = categoryId.trim().toLowerCase();
 if (VALID_CATEGORY_IDS.has(id)) return id;
 // Common synonyms the AI model has returned in the past
 const SYNONYMS: Record<string, string> = {
 training: "workout",
 exercise: "workout",
 fitness: "workout",
 diet: "nutrition",
 food: "nutrition",
 supplement: "supplements",
 "weight loss": "weight-loss",
 fatloss: "weight-loss",
 "muscle building": "muscle-gain",
 bodybuilding: "muscle-gain",
 recipe: "recipes",
 cooking: "recipes",
 wellness: "health",
 medical: "science",
 research: "science",
 };
 return SYNONYMS[id] || "nutrition";
}

export function getCategoryLabel(categoryId: string, lang: "en" | "ar"): string {
 const cat = BLOG_CATEGORIES.find((c) => c.id === categoryId);
 return cat ? (lang === "ar" ? cat.ar : cat.en) : categoryId;
}

export async function listBlogPosts(lang: "en" | "ar", category?: string, search?: string): Promise<BlogPost[]> {
 if (!isSupabaseConfigured || !supabase) return [];
 try {
  let query = supabase
  .from("blog_posts")
  .select("*")
  .eq("is_published", true)
  .eq("language", lang)
  .order("published_at", { ascending: false });

  if (category && category !== "all") {
  query = query.eq("category", category);
  }

  const { data, error } = await query;
  if (error) {
  return [];
  }

  let posts = (data ?? []) as BlogPost[];

  // Client-side search (Supabase text search requires pg_trgm)
  if (search && search.trim()) {
  const q = search.toLowerCase().trim();
  posts = posts.filter((p) => {
  const haystack = [
  p.title,
  p.excerpt || "",
  p.focus_keyword || "",
  ...(p.keywords || []),
  ...(p.tags || []),
  p.category,
  ].join(" ").toLowerCase();
  return haystack.includes(q);
  });
  }

  return posts;
 } catch {
  return [];
 }
}

export async function getBlogPost(lang: "en" | "ar", slug: string): Promise<BlogPost | null> {
 if (!isSupabaseConfigured || !supabase) return null;
 try {
  const { data, error } = await supabase
  .from("blog_posts")
  .select("*")
  .eq("language", lang)
  .eq("slug", slug)
  .eq("is_published", true)
  .maybeSingle();

  if (error) {
  return null;
  }
  return (data as BlogPost) || null;
 } catch {
  return null;
 }
}

export async function getRelatedPosts(post: BlogPost, limit = 3): Promise<BlogPost[]> {
 if (!isSupabaseConfigured || !supabase) return [];
 try {
  const { data, error } = await supabase
  .from("blog_posts")
  .select("*")
  .eq("is_published", true)
  .eq("language", post.language)
  .eq("category", post.category)
  .neq("id", post.id)
  .limit(limit);

  if (error) {
  return [];
  }
  return (data ?? []) as BlogPost[];
 } catch {
  return [];
 }
}

export async function getLinkedPost(post: BlogPost): Promise<BlogPost | null> {
 if (!post.linked_post_id || !isSupabaseConfigured || !supabase) return null;
 try {
  const { data, error } = await supabase
  .from("blog_posts")
  .select("*")
  .eq("id", post.linked_post_id)
  .eq("is_published", true)
  .maybeSingle();

  if (error) {
  return null;
  }
  return (data as BlogPost) || null;
 } catch {
  return null;
 }
}

/** Parse markdown content into headings for Table of Contents */
export function parseTableOfContents(content: string): Array<{ level: number; text: string; id: string }> {
 const lines = content.split("\n");
 const toc: Array<{ level: number; text: string; id: string }> = [];
 for (const line of lines) {
 const match = line.match(/^(#{2,3})\s+(.+)/);
 if (match) {
 const level = match[1].length;
 const text = match[2].trim();
 const id = text
 .toLowerCase()
 .replace(/[^\w\u0600-\u06FF\s-]/g, "")
 .replace(/\s+/g, "-")
 .replace(/-+/g, "-")
 .replace(/^-|-$/g, "");
 toc.push({ level, text, id });
 }
 }
 return toc;
}

/**
 * Escape HTML special characters in text content. Used before interpolating
 * user/AI-generated text into HTML to prevent stored XSS.
 *
 * The order matters: & must be escaped first so we don't double-escape
 * entities we just produced.
 */
function escapeHtml(s: string): string {
 return s
 .replace(/&/g, "&amp;")
 .replace(/</g, "&lt;")
 .replace(/>/g, "&gt;")
 .replace(/"/g, "&quot;")
 .replace(/'/g, "&#39;");
}

/**
 * Validate that a URL is safe to use in an href/src attribute.
 * Allows http, https, mailto, tel, and fragment (#...) links.
 * Rejects javascript:, data:, vbscript:, and anything else.
 */
function isSafeUrl(url: string): boolean {
 const trimmed = url.trim();
 if (!trimmed) return false;
 if (trimmed.startsWith("#")) return true;
 if (/^(https?:|mailto:|tel:)/i.test(trimmed)) return true;
 // Relative URLs (no scheme) are also safe
 if (!/^[a-z][a-z0-9+.-]*:/i.test(trimmed)) return true;
 return false;
}

/** Convert markdown to HTML (basic — for production use a proper parser) */
export function renderMarkdown(content: string): string {
 // 1. Extract code blocks first (their content is escaped, not markdown-parsed)
 const codeBlocks: string[] = [];
 let html = content.replace(/```([\s\S]*?)```/g, (_, code) => {
 const escaped = escapeHtml(code.trim());
 codeBlocks.push(`<pre class="bg-muted p-4 rounded-lg overflow-x-auto text-sm"><code>${escaped}</code></pre>`);
 return `\u0000CODEBLOCK${codeBlocks.length - 1}\u0000`;
 });

 // 2. Extract inline code (`code`) — also escaped, not parsed
 const inlineCodes: string[] = [];
 html = html.replace(/`([^`\n]+)`/g, (_, code) => {
 const escaped = escapeHtml(code);
 inlineCodes.push(`<code class="bg-muted px-1.5 py-0.5 rounded text-sm">${escaped}</code>`);
 return `\u0000INLINE${inlineCodes.length - 1}\u0000`;
 });

 // 3. Escape the rest of the content (prevents XSS from raw <script>, onerror=, etc.)
 html = escapeHtml(html);

 // 4. Headings with IDs (text is already escaped)
 html = html.replace(/^### (.+)$/gm, (_, text) => {
 const id = text.toLowerCase().replace(/[^\w\u0600-\u06FF\s-]/g, "").replace(/\s+/g, "-");
 return `<h3 id="${id}" class="text-lg font-bold mt-6 mb-2">${text}</h3>`;
 });
 html = html.replace(/^## (.+)$/gm, (_, text) => {
 const id = text.toLowerCase().replace(/[^\w\u0600-\u06FF\s-]/g, "").replace(/\s+/g, "-");
 return `<h2 id="${id}" class="text-xl font-bold mt-8 mb-3">${text}</h2>`;
 });
 html = html.replace(/^# (.+)$/gm, (_, text) => `<h1 class="text-2xl font-bold mt-8 mb-4">${text}</h1>`);

 // 5. Bold
 html = html.replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>");

 // 6. Italic
 html = html.replace(/\*(.+?)\*/g, "<em>$1</em>");

 // 7. Blockquotes
 html = html.replace(/^&gt; (.+)$/gm, '<blockquote class="border-s-4 border-primary ps-4 py-2 my-4 text-muted-foreground italic">$1</blockquote>');

 // 8. Ordered lists
 html = html.replace(/^(\d+)\.\s+(.+)$/gm, '<li class="ms-6 list-decimal">$2</li>');
 html = html.replace(/(<li[^>]*>.*<\/li>\n?)+/g, (match) => `<ol class="space-y-1 my-4">${match}</ol>`);

 // 9. Unordered lists
 html = html.replace(/^-\s+(.+)$/gm, '<li class="ms-6 list-disc">$1</li>');

 // 10. Tables (basic) — cells already escaped
 html = html.replace(/\|(.+)\|/g, (_, body) => {
 const cells = body.split("|").map((c: string) => c.trim()).filter(Boolean);
 return `<tr>${cells.map((c: string) => `<td class="p-2 border border-border">${c}</td>`).join("")}</tr>`;
 });
 html = html.replace(/(<tr>.*<\/tr>\n?)+/g, (match) => `<table class="w-full text-sm border-collapse my-4"><tbody>${match}</tbody></table>`);

 // 11. Links — validate URL scheme to prevent javascript: etc.
 html = html.replace(/\[([^\]]+)\]\(([^)]+)\)/g, (match, text, url) => {
 if (!isSafeUrl(url)) return text; // strip unsafe links to plain text
 return `<a href="${url}" rel="noopener noreferrer" class="text-primary hover:underline">${text}</a>`;
 });

 // 12. Paragraphs
 html = html.replace(/^(?!<[hbluol])(.+)$/gm, '<p class="my-3 leading-relaxed">$1</p>');

 // 13. Restore code blocks and inline code
 html = html.replace(/\u0000CODEBLOCK(\d+)\u0000/g, (_, i) => codeBlocks[Number(i)]);
 html = html.replace(/\u0000INLINE(\d+)\u0000/g, (_, i) => inlineCodes[Number(i)]);

 return html;
}
