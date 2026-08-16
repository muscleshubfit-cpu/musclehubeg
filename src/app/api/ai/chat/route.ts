import { NextRequest, NextResponse } from "next/server";
import { callFreeOpenRouter } from "@/lib/ai-provider";
import { generateChatReply } from "@/lib/ai-local";
import { listPlans, listProgress, getQuestionnaire, getSubscriptionForClient } from "@/lib/data";
import { getTier } from "@/lib/plans";
import { requireUser, isAuthConfigured } from "@/lib/auth-server";
import {
  searchPlatform,
  getFoodNutrition,
  isNutritionQuery,
  isExerciseQuery,
  isProgramQuery,
  type SearchResult,
} from "@/lib/evo-search";

/**
 * EVO Chat endpoint — context-aware AI assistant.
 *
 * Features:
 *   1. Platform search — finds exercises, foods, programs, tools
 *   2. Blog RAG — searches Supabase blog_posts for relevant articles
 *   3. OpenRouter AI — generates responses using AI (not just local rules)
 *   4. Anonymous mode — works without login (rate-limited)
 *   5. Subscriber mode — full context (plans, progress, questionnaires)
 *
 * POST /api/ai/chat
 * Body: { message, history }
 * Returns: { response, links, source }
 */

const BLOG_SEARCH_BASE_URL = "https://musclehubeg.vercel.app";

export async function POST(request: NextRequest) {
  try {
    // 1. Authenticate (optional — works for anonymous too)
    let userId: string | undefined;
    let userName: string | undefined;
    if (isAuthConfigured) {
      const auth = await requireUser(request);
      if (!(auth instanceof Response)) {
        userId = auth.id;
        userName = auth.full_name || auth.email || undefined;
      }
      // If auth fails (401), we continue as anonymous — EVO is free for all
    }

    const body = await request.json().catch(() => ({}));
    const { message, history = [] } = body;

    if (!message) {
      return NextResponse.json({ error: "Missing message" }, { status: 400 });
    }

    // 2. Search the platform's local databases (exercises, foods, programs, tools)
    const platformResults = searchPlatform(message);
    const foodNutrition = isNutritionQuery(message) ? getFoodNutrition(message) : null;

    // 3. Only search the blog if the platform search didn't find high-relevance results
    //    This prevents EVO from returning blog links instead of the actual exercise/food page
    const hasHighRelevancePlatformResult = platformResults.some((r) => r.relevance >= 0.6);
    const blogResults = hasHighRelevancePlatformResult
      ? [] // Skip blog search — we already found a specific platform page
      : await searchBlog(message);

    // 4. Build links from search results — platform results FIRST, blog SECOND
    const links: Array<{ label: string; url: string }> = [];

    // Platform links (exercises, foods, programs, tools) — only high relevance
    const highRelevancePlatform = platformResults.filter((r) => r.relevance >= 0.5);
    for (const result of highRelevancePlatform.slice(0, 3)) {
      links.push({
        label: `${result.nameAr} — ${result.description}`,
        url: result.url,
      });
    }

    // Blog links — only if no high-relevance platform results
    if (highRelevancePlatform.length === 0) {
      for (const blog of blogResults.slice(0, 2)) {
        links.push({
          label: `📖 ${blog.title}`,
          url: blog.url,
        });
      }
    }

    // 5. Build context for the AI
    let clientContext: any = { name: userName || "المستخدم" };
    if (userId) {
      try {
        const [plans, progress, nutriQ, fitQ, sub] = await Promise.all([
          listPlans(userId),
          listProgress(userId),
          getQuestionnaire(userId, "nutrition"),
          getQuestionnaire(userId, "fitness"),
          getSubscriptionForClient(userId),
        ]);
        const tierId = (sub?.tier as any) || "starter";
        const tier = getTier(tierId);

        clientContext = {
          name: userName || "العميل",
          isSubscriber: true,
          nutrition: nutriQ?.data || null,
          fitness: fitQ?.data || null,
          recent_measurements: progress.slice(-3).map((p: any) => ({
            weight: p.weight,
            waist: p.waist,
            date: p.created_at,
          })),
          current_plans: plans.map((p: any) => ({
            type: p.type,
            title: p.title,
            content: p.content,
          })),
          subscription: {
            tier: tierId,
            tierName: tier?.nameKey,
            swapLimit: tier?.swapLimit,
          },
        };
      } catch (e) {
        console.error("[api/ai/chat] Failed to load subscriber context:", e);
      }
    }

    // 6. Build the system prompt with platform context
    const systemPrompt = buildSystemPrompt(
      clientContext,
      platformResults,
      foodNutrition,
      blogResults,
    );

    // 7. Try OpenRouter AI (if configured)
    if (process.env.OPENROUTER_API_KEY || process.env.AI_API_KEY) {
      try {
        const messages = [
          ...history.slice(-10).map((m: any) => ({
            role: m.role,
            content: m.content,
          })),
          { role: "user", content: message },
        ];

        const chatPrompt = messages
          .map((m) => `${m.role === "user" ? "User" : "Assistant"}: ${m.content}`)
          .join("\n\n");
        const fullPrompt = `${systemPrompt}\n\n${chatPrompt}\n\nAssistant:`;

        const { text, model } = await callFreeOpenRouter(fullPrompt, {
          temperature: 0.6,
          maxTokens: 500,
          timeoutMs: 15_000,
        });

        if (text && text.length > 10) {
          return NextResponse.json({
            response: text,
            links,
            source: `openrouter:${model}`,
          });
        }
      } catch (aiErr) {
        console.error("[api/ai/chat] OpenRouter failed, using local fallback:", aiErr);
      }
    }

    // 8. Fallback: local rule-based reply + platform context
    const localReply = generateLocalReply(
      message,
      clientContext,
      platformResults,
      foodNutrition,
      blogResults,
    );

    return NextResponse.json({
      response: localReply,
      links,
      source: "local",
    });
  } catch (e: any) {
    console.error("[api/ai/chat] Error:", e?.message || e);
    return NextResponse.json(
      { error: e?.message || "Internal server error" },
      { status: 500 },
    );
  }
}

/**
 * Search the blog for relevant articles.
 * Searches in the same language as the query.
 */
async function searchBlog(
  query: string,
): Promise<Array<{ title: string; url: string; excerpt: string }>> {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseKey) return [];

  try {
    // Determine language from query (simple heuristic)
    const isArabic = /[\u0600-\u06FF]/.test(query);

    const { createClient } = await import("@supabase/supabase-js");
    const supabase = createClient(supabaseUrl, serviceKey || supabaseKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    // Search in blog_posts using ilike on title and excerpt
    const { data, error } = await supabase
      .from("blog_posts")
      .select("slug, title, excerpt, language")
      .eq("is_published", true)
      .eq("language", isArabic ? "ar" : "en")
      .or(`title.ilike.%${query}%,excerpt.ilike.%${query}%`)
      .limit(3);

    if (error || !data) return [];

    return data.map((post: any) => ({
      title: post.title,
      url: `${post.language === "ar" ? "/ar/blog" : "/blog"}/${post.slug}`,
      excerpt: post.excerpt || "",
    }));
  } catch (e) {
    console.error("[api/ai/chat] Blog search failed:", e);
    return [];
  }
}

/**
 * Build the system prompt for the AI.
 * Includes platform context, search results, and blog articles.
 */
function buildSystemPrompt(
  ctx: any,
  platformResults: SearchResult[],
  foodNutrition: any,
  blogResults: Array<{ title: string; url: string; excerpt: string }>,
): string {
  const isSubscriber = ctx.isSubscriber;
  const plans = ctx.current_plans || [];
  const nutrition = ctx.nutrition || {};
  const fitness = ctx.fitness || {};

  // Build platform search context
  let platformContext = "";
  if (platformResults.length > 0) {
    platformContext = "\n\nنتائج البحث في المنصة:\n";
    platformContext += platformResults
      .map(
        (r) =>
          `- ${r.nameAr} (${r.nameEn}): ${r.description} — الرابط: ${r.url}`,
      )
      .join("\n");
  }

  // Build food nutrition context
  let nutritionContext = "";
  if (foodNutrition) {
    nutritionContext = `\n\nمعلومات غذائية لـ ${foodNutrition.nameAr}:\nلكل 100g: ${foodNutrition.per100g.calories} سعرة، ${foodNutrition.per100g.protein}g بروتين، ${foodNutrition.per100g.carbs}g كارب، ${foodNutrition.per100g.fat}g دهون\nالرابط: ${foodNutrition.url}`;
  }

  // Build blog context
  let blogContext = "";
  if (blogResults.length > 0) {
    blogContext = "\n\nمقالات ذات صلة من المدونة:\n";
    blogContext += blogResults
      .map((b) => `- "${b.title}" — الرابط: ${b.url}`)
      .join("\n");
  }

  // Build subscriber context (if logged in)
  let subscriberContext = "";
  if (isSubscriber) {
    let planInfo = "لا توجد خطط مفعّلة بعد.";
    if (plans.length > 0) {
      planInfo = plans
        .map((p: any) => {
          const c = p.content;
          if (p.type === "meal" || p.type === "nutrition") {
            return `خطة تغذية "${p.title}": ${c?.daily_calories || "?"} كالوري/يوم`;
          }
          if (p.type === "workout") {
            return `برنامج تمارين "${p.title}"`;
          }
          return p.title;
        })
        .join("\n");
    }

    subscriberContext = `\n\nبيانات المشترك:\n${JSON.stringify({
      name: ctx.name,
      weight: nutrition.weight,
      height: nutrition.height,
      age: nutrition.age,
      target: nutrition.target || nutrition.target_weight,
      goal: fitness.goal,
      activity: fitness.activity,
      training_days: fitness.days,
      location: fitness.location,
      experience: fitness.experience,
      injuries: fitness.injuries,
      allergies: nutrition.allergies,
      disliked_foods: nutrition.disliked,
      diet: nutrition.diet,
    }, null, 2)}\n\nالخطط المفعّلة:\n${planInfo}`;
  }

  return `أنت EVO، محرك الأداء الذكي في منصة MuscleHub الرياضية الشاملة.
منصة MuscleHub تقدم: مكتبة تمارين (55+ تمرين)، برامج تدريب جاهزة، حاسبات لياقة مجانية، مكتبة أكلات بالسعرات والماكروز، مدونة رياضية، وكوتشينج أونلاين.

أنت لست مجرد شات بوت — أنت تحلل البيانات، تتنبأ بالنتائج، وتوجّه المستخدمين للمحتوى المناسب.${subscriberContext}${platformContext}${nutritionContext}${blogContext}

القواعد المهمة جداً:
- أجب بالعربية إذا كان السؤال بالعربية، وبالإنجليزية إذا كان بالإنجليزية.
- كن مختصراً جداً (3-5 أسطر كحد أقصى).
- لو السؤال عن تمرين/أكل/برنامج/أداة موجود في نتائج البحث، اذكر اسمه وإجابة مختصرة.
- لو السؤال عن تمرين محدد (مثل: إزاي أعمل بنش بريس) ونتائج البحث فيها التمرين، قول خطوات مختصرة + قول "شوف التفاصيل في الرابط تحت".
- متذكرش مقالات المدونة إلا لو مفيش نتائج بحث في المنصة (تمارين/أكلات/برامج).
- لو مفيش نتائج بحث مطابقة للسؤال، متقولش "شوف الرابط تحت" — قول إجابتك العامة بس.
- متقولش "الرابط تحت" إلا لو فعلاً في نتائج بحث.
- لو المستخدم مشترك، استخدم بياناته الشخصية.
- لا تخترع أرقام غير موجودة في نتائج البحث.
- لا تقدم نصائح طبية.
- للأسئلة العامة (مش مرتبطة بالمنصة)، ارد بمعرفة عامة رياضية وتغذوية بدون ذكر روابط.`;
}

/**
 * Generate a local reply (fallback when OpenRouter is not available).
 * Uses platform search results to give a helpful answer.
 */
function generateLocalReply(
  message: string,
  ctx: any,
  platformResults: SearchResult[],
  foodNutrition: any,
  blogResults: Array<{ title: string; url: string }>,
): string {
  // If we found food nutrition info (exact match)
  if (foodNutrition) {
    return `${foodNutrition.nameAr} (${foodNutrition.nameEn}) فيه:
• ${foodNutrition.per100g.calories} سعرة حرارية لكل 100g
• ${foodNutrition.per100g.protein}g بروتين
• ${foodNutrition.per100g.carbs}g كارب
• ${foodNutrition.per100g.fat}g دهون

شوف التفاصيل والجرامات في الرابط تحت 👇`;
  }

  // Only use platform results if they're HIGH relevance (above 0.6)
  const highRelevanceResults = platformResults.filter((r) => r.relevance >= 0.6);

  // If we found exercises with high relevance
  const exercises = highRelevanceResults.filter((r) => r.type === "exercise");
  if (exercises.length > 0 && isExerciseQuery(message)) {
    const ex = exercises[0];
    return `${ex.nameAr} (${ex.nameEn}) تمرين لـ ${ex.description}.
شوف خطوات التنفيذ والنصائح في الرابط تحت 👇`;
  }

  // If we found programs with high relevance
  const programs = highRelevanceResults.filter((r) => r.type === "program");
  if (programs.length > 0 && isProgramQuery(message)) {
    const prog = programs[0];
    return `${prog.nameAr} — ${prog.description}.
شوف الجدول الأسبوعي كامل في الرابط تحت 👇`;
  }

  // If we found blog articles
  if (blogResults.length > 0) {
    return `كتبنا مقال عن ده: "${blogResults[0].title}".
شوف الرابط تحت للمقال كامل 👇`;
  }

  // Generic fallback — DON'T mention links if there are none
  return `مقدرش ألاقي معلومات محددة عن ده في المنصة دلوقتي.

تقدر تتصفح:
• مكتبة التمارين (55+ تمرين)
• برامج التدريب الجاهزة
• مكتبة الأكلات (80+ أكلة)
• الأدوات المجانية (حاسبات)

أو اسألني سؤال تاني محدد أكتر.`;
}
