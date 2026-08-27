import { NextRequest, NextResponse } from "next/server";
import { callFreeAIFallbackChain } from "@/lib/ai-provider";
import { requireUser, isAuthConfigured, type AuthUser } from "@/lib/auth-server";
import { checkEvoChatLimit, recordEvoChatUsage } from "@/lib/tier-limits";
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
 *   3. OpenRouter + Groq AI (owner directive 2026-08-27)
 *   4. Anonymous mode — works without login (client-side counter; no server
 *      identity exists to bill, so server-side throttling for anonymous
 *      traffic is documented as out of scope)
 *   5. Subscriber mode — full context (plans, progress, questionnaires)
 *
 * 2026-08-27 CRITICAL FIXES:
 *   G1/G2 — usage is recorded SERVER-SIDE in the tamper-proof
 *     evo_chat_usage ledger before each AI dispatch. The old design counted
 *     client-written chat_messages rows and let "clear history" reset the quota.
 *   G3/G4 — the tier now comes from the VERIFIED auth session
 *     (getAuthUser: status='active' + end_date>now), not from a browser-client
 *     query that ignored expiry and ran under anonymous RLS.
 *   G5 — the subscriber-only feature gate applies by ACTUAL tier:
 *     authenticated FREE users are gated exactly like anonymous visitors,
 *     and the system prompt only declares a subscriber when tier limits say so.
 *   M-security — message/history length clamped + blog ilike filter escaped.
 */

// Back-compat re-export type (routes/tests may reference AuthUser).
export type { AuthUser };

/** Hard input clamp — prevents multi-MB payloads burning provider tokens. */
const MAX_MESSAGE_LENGTH = 4_000;
const MAX_HISTORY_ITEMS = 10;
const MAX_HISTORY_ITEM_LENGTH = 2_000;

export async function POST(request: NextRequest) {
  try {
    // 1. Authenticate (optional — works for anonymous too)
    let userId: string | undefined;
    let userName: string | undefined;
    let authTier: string | null = null;
    if (isAuthConfigured) {
      const auth = await requireUser(request);
      if (!(auth instanceof Response)) {
        userId = auth.id;
        userName = auth.full_name || auth.email || undefined;
        // G3/G4 fix: already verified active + non-expired by getAuthUser().
        authTier = auth.membership_tier;
      }
      // If auth fails (401), we continue as anonymous — EVO is free for all
    }

    const body = await request.json().catch(() => ({}));
    const rawMessage = typeof body?.message === "string" ? body.message : "";
    const rawHistory = Array.isArray(body?.history) ? body.history.slice(-MAX_HISTORY_ITEMS) : [];
    const message = rawMessage.trim().slice(0, MAX_MESSAGE_LENGTH);

    if (!message) {
      return NextResponse.json({ error: "Missing message" }, { status: 400 });
    }

    const history = rawHistory
      .filter((m: any) => m && typeof m.content === "string")
      .map((m: any) => ({
        role: m.role === "user" ? "user" : "assistant",
        content: String(m.content).slice(0, MAX_HISTORY_ITEM_LENGTH),
      }));

    // ── Effective tier resolution (G5 fix) ────────────────────────────
    // A paid-tier subscription resolves to "coaching"/"pro"/"premium"
    // (unlimited EVO). Everything else — including AUTHENTICATED FREE
    // accounts — is subject to the free daily limit AND the
    // subscriber-only feature gate.
    const isPaidTier =
      !!userId && ["premium", "pro", "coaching"].includes(authTier || "");

    // 1.5 Server-side daily limit check for all NON-paid users (C15+G1).
    // Paid tiers skip counting entirely (limit=null). Free/anonymous
    // anonymous users have no identity → ledger is for logged-in users;
    // anonymous traffic remains client-side-counter best-effort.
    let limitUsed = 0;
    let limitValue: number | null = null;
    if (userId) {
      const limitCheck = await checkEvoChatLimit(userId, authTier);
      limitUsed = limitCheck.used;
      limitValue = limitCheck.limit;
      if (!limitCheck.allowed) {
        const resetMsg =
          limitCheck.limit !== null
            ? `\n\nYou've used ${limitCheck.used}/${limitCheck.limit} messages today. The limit resets at midnight.`
            : "";
        return NextResponse.json(
          {
            response: `⏰ You've reached today's EVO chat limit.${resetMsg}\n\nUpgrade to Premium or Pro for unlimited messages.`,
            links: [{ label: "View membership plans →", url: "/memberships" }],
            source: "rate-limit",
            rateLimited: true,
            used: limitCheck.used,
            limit: limitCheck.limit,
          },
          { status: 429, headers: { "Retry-After": "3600" } },
        );
      }
    }

    // SUBSCRIBER-ONLY features: meal plans, workout plans, meal generation,
    // macro calculations, swap suggestions.
    // G5 FIX: gate fires for EVERYONE without a paid tier — including
    // authenticated free accounts (previously bypassed with any login).
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

    if (isSubscriberOnlyRequest && !isPaidTier) {
      return NextResponse.json({
        response:
          "🔒 This feature is for subscribers only. Meal plans, workout plans, and meal generation require an active Premium/Pro/Coaching subscription.\n\nFree features I can help with:\n• Exercise info and instructions\n• Food calories and macros\n• Fitness calculators\n• General fitness Q&A\n\nSubscribe to get personalized meal & workout plans!",
        links: [
          {
            label: "View membership plans →",
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

    // 5. Build context for the AI — subscribers only (G5 fix: the flag now
    // reflects the REAL tier, not merely being logged in).
    let clientContext: any = { name: userName || "المستخدم", isSubscriber: false };
    if (userId && isPaidTier) {
      try {
        // Subscriber data comes via service-role queries inside the data layer.
        const [plans, progress, nutriQ, fitQ] = await Promise.all([
          listPlansSafe(userId),
          listProgressSafe(userId),
          getQuestionnaireSafe(userId, "nutrition"),
          getQuestionnaireSafe(userId, "fitness"),
        ]);

        clientContext = {
          name: userName || "العميل",
          isSubscriber: true,
          nutrition: nutriQ || null,
          fitness: fitQ || null,
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
          subscription: { tier: authTier },
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
      ...history.map((m: any) => ({
        role: m.role,
        content: m.content,
      })),
      { role: "user", content: message },
    ];

    const chatPrompt = messages
      .map((m) => `${m.role === "user" ? "User" : "Assistant"}: ${m.content}`)
      .join("\n\n");
    const fullPrompt = `${systemPrompt}\n\n${chatPrompt}\n\nAssistant:`;

    // 6.5 G1 FIX — record usage BEFORE dispatch in the tamper-proof ledger.
    // Record-before-dispatch closes the concurrent-burst window and makes
    // clearing chat history irrelevant to the quota.
    if (userId) {
      await recordEvoChatUsage(userId, "chat");
    }

    // 7. Try AI via callFreeAIFallbackChain (OpenRouter + Groq interleaved).
    // maxModels=3 × self-clamped ≤17s each → worst ~52s (Vercel Hobby-safe);
    // Promise-free sequential keeps quality-first ordering for short answers.
    try {
      // OWNER DIRECTIVE #1 (2026-08-27): interactive chat uses the
      // speed-first chain (fastest free models, accuracy-checked) while
      // streaming stays on Vercel per the same directive.
      const { text: aiReply, model: aiModel, provider: aiProvider } = await callFreeAIFallbackChain(
        fullPrompt,
        {
          tag: "evo-chat",
          temperature: 0.6,
          maxTokens: 800,
          timeoutMs: 16_000,
          maxModels: 3,
          chain: "fast",
        },
      );

      if (aiReply && aiReply.trim().length > 5) {
        // Clean up reasoning artifacts from models that sometimes include
        // "thinking process" content in the response.
        let cleanText = aiReply;

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
            const lines = cleanText.split("\n");
            let answerStartIdx = 0;
            let foundNumberedStep = false;
            for (let i = 0; i < lines.length; i++) {
              const line = lines[i].trim();
              if (!line) continue;
              if (/^\d+\.\s+\*\*?[A-Z]/.test(line)) {
                foundNumberedStep = true;
                answerStartIdx = i + 1;
                continue;
              }
              if (/^[-*]\s+\*\*?[A-Z]/.test(line) || /^\*\*?[A-Z][a-z]+\s*\*?\*?:\s/.test(line)) {
                foundNumberedStep = true;
                answerStartIdx = i + 1;
                continue;
              }
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

          // 7. Final validation: too-short output falls back to local reply.
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
            source: `${aiProvider}:${aiModel}`,
          });
        }
      } catch (aiErr) {
        console.error("[api/ai/chat] AI fallback chain failed, using local reply:", aiErr);
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

/* ---------------- Safe data-layer wrappers (fail-soft) ---------------- */

async function listPlansSafe(userId: string) {
  try {
    const { listPlans } = await import("@/lib/data");
    return await listPlans(userId);
  } catch {
    return [] as any[];
  }
}
async function listProgressSafe(userId: string) {
  try {
    const { listProgress } = await import("@/lib/data");
    return await listProgress(userId);
  } catch {
    return [] as any[];
  }
}
async function getQuestionnaireSafe(userId: string, type: "nutrition" | "fitness") {
  try {
    const { getQuestionnaire } = await import("@/lib/data");
    const q = await getQuestionnaire(userId, type);
    return q?.data ?? null;
  } catch {
    return null;
  }
}

/**
 * Search the blog for relevant articles.
 * Searches in the same language as the query.
 * SECURITY: user input is escaped for PostgREST `or=..ilike` filters —
 * commas/parens in a query previously reshaped the filter (injection G6).
 */
async function searchBlog(
  query: string,
): Promise<Array<{ title: string; url: string; excerpt: string }>> {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseKey) return [];

  try {
    const isArabic = /[\u0600-\u06FF]/.test(query);

    const { createClient } = await import("@supabase/supabase-js");
    const supabase = createClient(supabaseUrl, serviceKey || supabaseKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    // Escape PostgREST filter metacharacters + strip wildcards/length-clamp.
    const safe = query
      .replace(/[%_(),*]/g, " ")
      .replace(/\s+/g, " ")
      .trim()
      .slice(0, 80);
    if (!safe) return [];

    const { data, error } = await supabase
      .from("blog_posts")
      .select("slug, title, excerpt, language")
      .eq("is_published", true)
      .eq("language", isArabic ? "ar" : "en")
      .or(`title.ilike.%${safe}%,excerpt.ilike.%${safe}%`)
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

  // Build subscriber context (only when isSubscriber=true — real paid tier)
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

  return `You are EVO, the intelligent performance engine of the MuscleHubEG sports platform.
MuscleHubEG offers: exercise library (868+ exercises), workout programs, free fitness calculators, food database with calories and macros, fitness blog, and online coaching.

You are NOT just a chatbot — you analyze data, predict outcomes, and guide users to relevant content.
${isSubscriber ? "The user IS a subscriber — you can generate meal plans, workout plans, suggest swaps, and use their personal data." : "The user is NOT a subscriber — do NOT generate meal plans, workout plans, or macro calculations. Those are subscriber-only features. If asked, tell them to subscribe."}
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
