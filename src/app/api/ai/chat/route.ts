import { NextRequest, NextResponse } from "next/server";
import { callFreeOpenRouterRace } from "@/lib/ai-provider";
import { callGemini } from "@/lib/gemini-wrapper";
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

    // SUBSCRIBER-ONLY features: meal plans, workout plans, meal generation,
    // macro calculations, swap suggestions.
    // Free users get: general Q&A, exercise info, food nutrition lookup,
    // blog references, platform navigation.
    const subscriberOnlyPatterns = [
      /make\s+me\s+(a|an)?\s*(meal|workout|plan|diet|menu)/i,
      /generate\s+(a|an)?\s*(meal|workout|plan|diet|menu)/i,
      /create\s+(a|an)?\s*(meal|workout|plan|diet|menu)/i,
      /plan\s+(for|with)\s+\d+\s*(calorie|kcal|cal)/i,
      /meal\s+(plan|with|for)\s+\d+/i,
      /\d+\s*(calorie|kcal|cal)\s*(meal|plan|diet)/i,
      /workout\s+(plan|program|routine)\s*(for|with)/i,
      /اعمل\s+(وجبة|خطة|برنامج|جدول|دايت|مينو)/i,
      /صمم\s+(وجبة|خطة|برنامج|جدول)/i,
      /انشئ\s+(وجبة|خطة|برنامج|جدول)/i,
      /خطة\s+(تغذية|تمارين|دايت)\s+/i,
      /وجبة\s+\d+\s*سعر/i,
      /\d+\s*سعرة\s*(وجبة|خطة|مينو)/i,
      /swap\s+(this|my|the)\s*(meal|food|exercise)/i,
      /بدّل\s+(وجبة|أكلة|تمرين)/i,
      /بديل\s+(وجبة|أكلة|تمرين)/i,
      /regenerate\s+(meal|plan|workout)/i,
      /أعد\s+(توليد|صناعة)\s*(وجبة|خطة)/i,
    ];

    const isSubscriberOnlyRequest = subscriberOnlyPatterns.some((pattern) =>
      pattern.test(message),
    );

    if (isSubscriberOnlyRequest && !userId) {
      return NextResponse.json({
        response:
          "🔒 This feature is for subscribers only. Meal plans, workout plans, and meal generation require an active coaching subscription.\n\nFree features I can help with:\n• Exercise info and instructions\n• Food calories and macros\n• Fitness calculators\n• General fitness Q&A\n\nSubscribe to get personalized meal & workout plans!",
        links: [
          {
            label: "View coaching plans →",
            url: "/memberships",
          },
        ],
        source: "subscriber-gate",
      });
    }

    // 2. Search the platform's local databases (exercises, foods, programs, tools)
    const platformResults = searchPlatform(message);
    const foodNutrition = isNutritionQuery(message) ? getFoodNutrition(message) : null;

    // 3. Only search the blog if the platform search didn't find high-relevance results
    //    This prevents EVO from returning blog links instead of the actual exercise/food page
    const hasHighRelevancePlatformResult = platformResults.some((r) => r.relevance >= 0.4);
    const blogResults = hasHighRelevancePlatformResult
      ? [] // Skip blog search — we already found a specific platform page
      : await searchBlog(message);

    // 4. Build links from search results — platform results FIRST, blog SECOND
    const links: Array<{ label: string; url: string }> = [];

    // Platform links (exercises, foods, programs, tools) — only relevant results
    const highRelevancePlatform = platformResults.filter((r) => r.relevance >= 0.3);
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

    // 7. Try Gemini first (fastest, cleanest responses)
    try {
      const { text: geminiReply, model: geminiModel } = await callGemini(
        fullPrompt,
        {
          temperature: 0.7,
          maxTokens: 1000,
          timeoutMs: 15_000,
        },
        2,
      );

      if (geminiReply && geminiReply.trim().length > 5) {
        return NextResponse.json({
          response: geminiReply.trim(),
          links,
          source: `gemini:${geminiModel}`,
        });
      }
    } catch (gErr: any) {
      console.warn("[api/ai/chat] Gemini notice, falling back to OpenRouter/local:", gErr?.message);
    }

    // 8. Try OpenRouter AI (if configured)
    if (process.env.OPENROUTER_API_KEY || process.env.AI_API_KEY) {
      try {
        const { text, model } = await callFreeOpenRouterRace(fullPrompt, {
          temperature: 0.6,
          maxTokens: 500,
          timeoutMs: 15_000,
        }, 3);

        if (text && text.length > 10) {
          // ─────────────────────────────────────────────────────────────
          // Clean up reasoning artifacts from nemotron models that
          // sometimes include "thinking process" content in the response.
          // ─────────────────────────────────────────────────────────────
          let cleanText = text;

          // 1. Strip <think>...</think>, <reasoning>...</reasoning>,
          //    <reflection>...</reflection>, <analysis>...</analysis> blocks
          cleanText = cleanText
            .replace(/<think>[\s\S]*?<\/think>\s*/gi, "")
            .replace(/<reasoning>[\s\S]*?<\/reasoning>\s*/gi, "")
            .replace(/<reflection>[\s\S]*?<\/reflection>\s*/gi, "")
            .replace(/<analysis>[\s\S]*?<\/analysis>\s*/gi, "");

          // 2. Strip "Here's a thinking process:" / "Thinking process:" headers
          cleanText = cleanText
            .replace(/^Here's a thinking process:?\s*/i, "")
            .replace(/^Thinking process:?\s*/i, "")
            .replace(/^Step-by-step thinking:?\s*/i, "")
            .replace(/^Reasoning:?\s*/i, "")
            .replace(/^Let me think about this:?\s*/i, "");

          // 3. Try to extract the final answer if the model wrote reasoning
          //    steps followed by a "Final Answer:" / "Draft:" / "Response:" marker.
          const finalAnswerMatch = cleanText.match(
            /(?:Final Answer|Final answer|Formulate Response|Draft|Response):?\s*:?\s*\n?\s*"([^"]+)"/i,
          );
          if (finalAnswerMatch && finalAnswerMatch[1]) {
            cleanText = finalAnswerMatch[1].trim();
          } else {
            // 4. Strip numbered reasoning steps at the start.
            //    Pattern: "1. **Word...**\n2. **Word...**\n3. ..." — keep only
            //    content AFTER the last numbered step.
            const lines = cleanText.split("\n");
            let answerStartIdx = 0;
            let foundNumberedStep = false;
            for (let i = 0; i < lines.length; i++) {
              const line = lines[i].trim();
              if (!line) continue;
              // Detect numbered reasoning step: "1. **Analyze...**" or "1. Analyze..."
              if (/^\d+\.\s+\*\*?[A-Z]/.test(line)) {
                foundNumberedStep = true;
                answerStartIdx = i + 1;
                continue;
              }
              // Detect bullet-style reasoning: "- Analyze..." or "**Analyze...**"
              if (/^[-*]\s+\*\*?[A-Z]/.test(line) || /^\*\*?[A-Z][a-z]+\s*\*?\*?:\s/.test(line)) {
                foundNumberedStep = true;
                answerStartIdx = i + 1;
                continue;
              }
              // First non-reasoning line that's long enough — start of the answer
              if (foundNumberedStep && line.length > 20 && !/^(step|draft|formulate|analyze|strategy|determine|response):/i.test(line)) {
                answerStartIdx = i;
                break;
              }
            }
            if (answerStartIdx > 0) {
              cleanText = lines.slice(answerStartIdx).join("\n").trim();
            }
          }

          // 5. Strip leading "**" + numbered thinking steps (legacy cleanup)
          cleanText = cleanText.replace(/^\*\*\d+\.\s+/m, "").trim();

          // 6. Strip wrapping quotes (model wrote: "answer here")
          cleanText = cleanText.replace(/^"([^"]+)"$/, "$1").trim();

          // 7. Final validation: if cleaned text is too short or still looks
          //    like reasoning, fall back to the local rule-based reply.
          if (cleanText.length < 10 || /^\s*\d+\.\s+\*\*?[A-Z]/.test(cleanText)) {
            console.warn("[api/ai/chat] Cleaned text still looks like reasoning, using local fallback");
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
          }

          return NextResponse.json({
            response: cleanText,
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

  return `You are EVO, the intelligent performance engine of the MuscleHub sports platform.
MuscleHub offers: exercise library (868+ exercises), workout programs, free fitness calculators, food database with calories and macros, fitness blog, and online coaching.

You are NOT just a chatbot — you analyze data, predict outcomes, and guide users to relevant content.
${isSubscriber ? "The user IS a subscriber — you can generate meal plans, workout plans, suggest swaps, and use their personal data." : "The user is a FREE visitor — do NOT generate meal plans, workout plans, or suggest swaps. Those are subscriber-only features. If asked, tell them to subscribe."}
${subscriberContext}${platformContext}${nutritionContext}${blogContext}

CRITICAL RULES:
- Reply in the SAME language as the question (Arabic or English).
- Keep responses VERY short (3-5 lines max, ideally 1-3 sentences).
- If the question is about an exercise/food/program/tool found in search results, mention its name and a brief answer.
- Do NOT write URLs or paths in the text — links appear automatically below.
- Do NOT say "see the link below" — links appear on their own.
- If no search results match, give a general answer without mentioning links.
- NEVER generate full meal plans, workout plans, or macro calculations unless the user is a subscriber.
- If a free user asks for a meal plan/workout plan, say: "This is a subscriber feature. Subscribe to coaching for personalized plans."
- If the user is a subscriber, use their personal data in responses.
- Do NOT invent numbers not in search results.
- Do NOT give medical advice.
- For general questions, answer with general fitness/nutrition knowledge without mentioning links.

CRITICAL — OUTPUT FORMAT (read carefully):
- ANSWER DIRECTLY. Do NOT explain your reasoning process.
- Do NOT include "Step 1:", "Step 2:", "Analyze:", "Strategy:", "Draft:", "Formulate:", or any meta-commentary.
- Do NOT include numbered thinking steps like "1. **Analyze...** 2. **Determine...** 3. **Formulate...**".
- Do NOT wrap your answer in quotes.
- Do NOT say "Here is the answer:" or "Sure!" or "Of course!" — just give the answer.
- Imagine you are typing in a chat — give the final answer IMMEDIATELY, as if you already know it.
- BAD: "1. **Analyze User Input:** The user is asking...\n2. **Determine Strategy:** I should...\n3. **Formulate Response:** Hello!"
- GOOD: "Hello! I'm EVO, your fitness assistant. How can I help you today?"`;
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
    return `${foodNutrition.nameAr} (${foodNutrition.nameEn}):
• ${foodNutrition.per100g.calories} kcal per 100g
• ${foodNutrition.per100g.protein}g protein
• ${foodNutrition.per100g.carbs}g carbs
• ${foodNutrition.per100g.fat}g fat`;
  }

  // Only use platform results if they're HIGH relevance (above 0.6)
  const highRelevanceResults = platformResults.filter((r) => r.relevance >= 0.6);

  // If we found exercises with high relevance
  const exercises = highRelevanceResults.filter((r) => r.type === "exercise");
  if (exercises.length > 0 && isExerciseQuery(message)) {
    const ex = exercises[0];
    return `${ex.nameAr} (${ex.nameEn}) — ${ex.description}.`;
  }

  // If we found programs with high relevance
  const programs = highRelevanceResults.filter((r) => r.type === "program");
  if (programs.length > 0 && isProgramQuery(message)) {
    const prog = programs[0];
    return `${prog.nameAr} — ${prog.description}.`;
  }

  // If we found blog articles
  if (blogResults.length > 0) {
    return `We wrote about this: "${blogResults[0].title}".`;
  }

  // Generic fallback — DON'T mention links if there are none
  return `مقدرش ألاقي معلومات محددة عن ده في المنصة دلوقتي.

تقدر تتصفح:
• مكتبة التمارين (868+ تمرين)
• برامج التدريب الجاهزة
• مكتبة الأكلات (8830+ أكلة)
• الأدوات المجانية (حاسبات)

أو اسألني سؤال تاني محدد أكتر.`;
}
