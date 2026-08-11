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

export function getCategoryLabel(categoryId: string, lang: "en" | "ar"): string {
 const cat = BLOG_CATEGORIES.find((c) => c.id === categoryId);
 return cat ? (lang === "ar" ? cat.ar : cat.en) : categoryId;
}

export async function listBlogPosts(lang: "en" | "ar", category?: string, search?: string): Promise<BlogPost[]> {
 if (!isSupabaseConfigured || !supabase) return [];
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
 console.error("[blog] listBlogPosts error:", error);
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
}

export async function getBlogPost(lang: "en" | "ar", slug: string): Promise<BlogPost | null> {
 if (!isSupabaseConfigured || !supabase) return null;
 const { data, error } = await supabase
 .from("blog_posts")
 .select("*")
 .eq("language", lang)
 .eq("slug", slug)
 .eq("is_published", true)
 .maybeSingle();

 if (error) {
 console.error("[blog] getBlogPost error:", error);
 return null;
 }
 return (data as BlogPost) || null;
}

export async function getRelatedPosts(post: BlogPost, limit = 3): Promise<BlogPost[]> {
 if (!isSupabaseConfigured || !supabase) return [];
 const { data } = await supabase
 .from("blog_posts")
 .select("*")
 .eq("is_published", true)
 .eq("language", post.language)
 .eq("category", post.category)
 .neq("id", post.id)
 .limit(limit);

 return (data ?? []) as BlogPost[];
}

export async function getLinkedPost(post: BlogPost): Promise<BlogPost | null> {
 if (!post.linked_post_id || !isSupabaseConfigured || !supabase) return null;
 const { data } = await supabase
 .from("blog_posts")
 .select("*")
 .eq("id", post.linked_post_id)
 .eq("is_published", true)
 .maybeSingle();
 return (data as BlogPost) || null;
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

/** Convert markdown to HTML (basic — for production use a proper parser) */
export function renderMarkdown(content: string): string {
 let html = content;

 // Code blocks
 html = html.replace(/```([\s\S]*?)```/g, (_, code) => `<pre class="bg-muted p-4 rounded-lg overflow-x-auto text-sm"><code>${code.trim()}</code></pre>`);

 // Headings with IDs
 html = html.replace(/^### (.+)$/gm, (_, text) => {
 const id = text.toLowerCase().replace(/[^\w\u0600-\u06FF\s-]/g, "").replace(/\s+/g, "-");
 return `<h3 id="${id}" class="text-lg font-bold mt-6 mb-2">${text}</h3>`;
 });
 html = html.replace(/^## (.+)$/gm, (_, text) => {
 const id = text.toLowerCase().replace(/[^\w\u0600-\u06FF\s-]/g, "").replace(/\s+/g, "-");
 return `<h2 id="${id}" class="text-xl font-bold mt-8 mb-3">${text}</h2>`;
 });
 html = html.replace(/^# (.+)$/gm, (_, text) => `<h1 class="text-2xl font-bold mt-8 mb-4">${text}</h1>`);

 // Bold
 html = html.replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>");

 // Italic
 html = html.replace(/\*(.+?)\*/g, "<em>$1</em>");

 // Blockquotes
 html = html.replace(/^> (.+)$/gm, '<blockquote class="border-s-4 border-primary ps-4 py-2 my-4 text-muted-foreground italic">$1</blockquote>');

 // Ordered lists
 html = html.replace(/^(\d+)\.\s+(.+)$/gm, '<li class="ms-6 list-decimal">$2</li>');
 html = html.replace(/(<li[^>]*>.*<\/li>\n?)+/g, (match) => `<ol class="space-y-1 my-4">${match}</ol>`);

 // Unordered lists
 html = html.replace(/^-\s+(.+)$/gm, '<li class="ms-6 list-disc">$1</li>');

 // Tables (basic)
 html = html.replace(/\|(.+)\|/g, (_, content) => {
 const cells = content.split("|").map((c: string) => c.trim()).filter(Boolean);
 return `<tr>${cells.map((c: string) => `<td class="p-2 border border-border">${c}</td>`).join("")}</tr>`;
 });
 html = html.replace(/(<tr>.*<\/tr>\n?)+/g, (match) => `<table class="w-full text-sm border-collapse my-4"><tbody>${match}</tbody></table>`);

 // Paragraphs
 html = html.replace(/^(?!<[hbluo])(.+)$/gm, '<p class="my-3 leading-relaxed">$1</p>');

 // Links
 html = html.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" class="text-primary hover:underline">$1</a>');

 return html;
}
