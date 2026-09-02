import { NextRequest, NextResponse } from "next/server";
import { createHash } from "crypto";
import { callFreeAIFallbackChain } from "@/lib/ai-provider";
import { requireUser, isAuthConfigured, type AuthUser } from "@/lib/auth-server";
import {
  checkEvoChatLimit,
  recordEvoChatUsage,
  checkEvoPlanQuota,
  checkAnonChatLimit,
  recordAnonChatUsage,
} from "@/lib/tier-limits";
import { classifyEvoIntent } from "@/lib/evo-intent";
import {
  searchPlatform,
  getFoodNutrition,
  isNutritionQuery,
  isExerciseQuery,
  isProgramQuery,
  type SearchResult,
} from "@/lib/evo-search";
import {
  sanitizeLatexToPlain,
  stripMarkdownSyntax,
} from "@/lib/evo-chat-format";
import type { Database, Json } from "@/lib/supabase/types";

/**
 * EVO Chat endpoint — context-aware AI assistant.
 *
 * Features:
 *   1. Platform search — finds exercises, foods, programs, tools
 *   2. Blog RAG — searches Supabase blog_posts for relevant articles
 *   3. OpenRouter + Groq AI (owner directive 2026-08-27)
 *   4. Anonymous mode — works without login. T-AI-DEEP-AUDIT-V2 (D3):
 *      anonymous traffic is throttled SERVER-SIDE per hashed client IP
 *      (evo_anon_usage ledger, migration 0028) — the old "client-side
 *      counter only" posture let scripts bleed OpenRouter credits.
 *   5. Subscriber mode — full context (plans, progress, questionnaires)
 *
 * 2026-08-28 T-AI-DEEP-AUDIT-V2 (D4 — MONTHLY PLAN QUOTA):
 *   The advertised "3/6 plans per month" quotas were never enforced —
 *   this chat is the only member-reachable "EVO builds me a plan"
 *   surface, and it let paid tiers generate unlimited plans. Now
 *   plan-creation intents (evo-intent.ts) are counted per domain
 *   (nutrition/workout) in the SAME tamper-proof ledger, against
 *   evoNutritionPlanLimit / evoWorkoutPlanLimit. Swap intents stay on
 *   the weekly /api/ai/jobs flow — NOT double-counted here.
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

/**
 * D3 — salted hash of the client IP. No raw IPs are stored; rotating
 * EVO_ANON_SALT invalidates all existing anon counters (documented).
 * Missing proxy headers collapse into one shared conservative bucket —
 * on Vercel x-forwarded-for is always present.
 */
function getAnonKey(request: NextRequest): string {
  const ip =
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    request.headers.get("x-real-ip") ||
    "unknown";
  const salt = process.env.EVO_ANON_SALT || "mhe-evo-anon-v1";
  return createHash("sha256").update(`${ip}:${salt}`).digest("hex").slice(0, 32);
}

/** Subscriber context handed to the prompt builder / local fallback (G5). */
type EvoClientContext = {
  name: string;
  isSubscriber: boolean;
  nutrition?: Json | null;
  fitness?: Json | null;
  recent_measurements?: { weight: number | null; waist: number | null; date: string }[];
  current_plans?: { type: string; title: string; content: Json | null }[];
  subscription?: { tier: string | null };
};

/** Local food-database hit returned by getFoodNutrition (incl. null). */
type FoodNutritionInfo = ReturnType<typeof getFoodNutrition>;

export async function POST(request: NextRequest) {
  try {
    // 1. Authenticate (optional — works for anonymous too)
    let userId: string | undefined;
    let userName: string | undefined;
    let authTier: string | null = null;
    let authIsStaff = false;
    if (isAuthConfigured) {
      const auth = await requireUser(request);
      if (!(auth instanceof Response)) {
        userId = auth.id;
        userName = auth.full_name || auth.email || undefined;
        // G3/G4 fix: already verified active + non-expired by getAuthUser().
        authTier = auth.membership_tier;
        // STAFF QUOTA SEMANTICS: platform staff (coach|admin) bypass
        // every consumer usage limit below.
        authIsStaff = auth.is_staff;
      }
      // If auth fails (401), we continue as anonymous — EVO is free for all
    }

    const body = await request.json().catch(() => ({}));
    const rawMessage = typeof body?.message === "string" ? body.message : "";
    const rawHistory: unknown[] = Array.isArray(body?.history)
      ? body.history.slice(-MAX_HISTORY_ITEMS)
      : [];
    const message = rawMessage.trim().slice(0, MAX_MESSAGE_LENGTH);

    if (!message) {
      return NextResponse.json({ error: "Missing message" }, { status: 400 });
    }

    const history = rawHistory
      .filter((m): m is { role: unknown; content: string } => {
        if (!m || typeof m !== "object") return false;
        return typeof (m as { content?: unknown }).content === "string";
      })
      .map((m) => ({
        role: m.role === "user" ? ("user" as const) : ("assistant" as const),
        content: String(m.content).slice(0, MAX_HISTORY_ITEM_LENGTH),
      }));

    // ── Effective tier resolution (G5 fix) ────────────────────────────
    // A paid-tier subscription resolves to "coaching"/"pro"/"premium"
    // (unlimited EVO). Everything else — including AUTHENTICATED FREE
    // accounts — is subject to the free daily limit AND the
    // subscriber-only feature gate.
    const isPaidTier =
      !!userId && ["premium", "pro", "coaching"].includes(authTier || "");

    // 1.5 Server-side daily limit check (C15+G1).
    //   Logged-in: tamper-proof evo_chat_usage ledger, verified tier.
    //   Anonymous (D3): same shape against the evo_anon_usage ledger,
    //   keyed by hashed client IP — free-tier daily limit applies.
    let limitUsed = 0;
    let limitValue: number | null = null;
    let anonKey: string | undefined;
    if (userId) {
      const limitCheck = await checkEvoChatLimit(userId, authTier, authIsStaff);
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
    } else {
      // D3 — anonymous visitors: server-side per-IP throttling.
      anonKey = getAnonKey(request);
      const anonCheck = await checkAnonChatLimit(anonKey);
      limitUsed = anonCheck.used;
      limitValue = anonCheck.limit;
      if (!anonCheck.allowed) {
        return NextResponse.json(
          {
            response: `⏰ You've reached today's EVO chat limit (${anonCheck.used}/${anonCheck.limit} messages). The limit resets at midnight.\n\nCreate a free account or subscribe to Premium/Pro for more.`,
            links: [{ label: "View membership plans →", url: "/memberships" }],
            source: "rate-limit",
            rateLimited: true,
            used: anonCheck.used,
            limit: anonCheck.limit,
          },
          { status: 429, headers: { "Retry-After": "3600" } },
        );
      }
    }

    // SUBSCRIBER-ONLY features: meal plans, workout plans, meal generation,
    // macro calculations, swap suggestions.
    // G5 FIX: gate fires for EVERYONE without a paid tier — including
    // authenticated free accounts (previously bypassed with any login).
    // D4: the flat list moved to evo-intent.ts so plan-creation intents
    // can be quota'd per domain without touching the gate coverage.
    const intent = classifyEvoIntent(message);

    if (intent.isSubscriberOnly && !isPaidTier) {
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

    // 1.6 D4 — WEEKLY + MONTHLY plan-generation quota (paid tiers only;
    // free users were already blocked by the subscriber gate above).
    // Plan-creation intents count per domain against the tier's WEEKLY cap
    // (1+1 — Pro 2+2, owner decree 2026-09-02) AND the MONTHLY total
    // (4+4 — Pro 8+8). Swap intents intentionally NOT counted here —
    // they ride the weekly /api/ai/jobs quota (no double-billing).
    if (intent.isPlanCreation && isPaidTier && userId) {
      const quota = await checkEvoPlanQuota(
        userId,
        intent.planDomain,
        authTier,
        authIsStaff,
      );
      if (!quota.allowed) {
        const domainLabel =
          intent.planDomain === "nutrition" ? "meal" : "workout";
        const upgradeHint =
          authTier === "pro"
            ? ""
            : "\n\nUpgrade to Pro for 8 plans per month (2 per week).";
        const responseText =
          quota.blockedBy === "week"
            ? `⏰ You've hit the weekly cap: ${quota.weekly.used}/${quota.weekly.limit} ${domainLabel} plans this week. The weekly cap resets on Monday — your monthly total (${quota.used}/${quota.limit}) is still available.${upgradeHint}`
            : `⏰ You've used ${quota.used}/${quota.limit} ${domainLabel} plans this month. Your quota resets on the 1st of each month.${upgradeHint}`;
        return NextResponse.json(
          {
            response: responseText,
            links: [{ label: "View membership plans →", url: "/memberships" }],
            source: "rate-limit",
            rateLimited: true,
            used: quota.used,
            limit: quota.limit,
          },
          { status: 429, headers: { "Retry-After": "3600" } },
        );
      }
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
    let clientContext: EvoClientContext = { name: userName || "المستخدم", isSubscriber: false };
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
          recent_measurements: progress.slice(-3).map((p) => ({
            weight: p.weight,
            waist: p.waist,
            date: p.created_at,
          })),
          current_plans: plans.map((p) => ({
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
      ...history.map((m) => ({
        role: m.role,
        content: m.content,
      })),
      { role: "user", content: message },
    ];

    const chatPrompt = messages
      .map((m) => `${m.role === "user" ? "User" : "Assistant"}: ${m.content}`)
      .join("\n\n");
    const fullPrompt = `${systemPrompt}\n\n${chatPrompt}\n\nAssistant:`;

    // 6.5 G1 + D3 + D4 — record usage BEFORE dispatch in tamper-proof
    // ledgers (record-before-dispatch closes the concurrent-burst window):
    //   chat   → every logged-in dispatch (daily quota evidence)
    //   plan_* → paid-tier plan-creation dispatches (monthly quota evidence)
    //   anon   → anonymous dispatches (per-IP daily quota evidence)
    if (userId) {
      await recordEvoChatUsage(userId, "chat");
      if (isPaidTier && intent.isPlanCreation) {
        await recordEvoChatUsage(userId, `plan_${intent.planDomain}`);
      }
    } else if (anonKey) {
      await recordAnonChatUsage(anonKey, "chat");
    }

    // 7. Try AI via callFreeAIFallbackChain — Phase 89: TRUE TOKEN STREAMING.
    //    Success responses are SSE (text/event-stream):
    //      event: delta → raw model tokens live (user sees typing as they arrive)
    //      event: final → CLEANED full text + links + source (client swaps it in)
    //      event: error → mid-stream failure (client keeps the partial text)
    //    429/quota and pre-stream failures stay JSON — the client sniffs the
    //    content-type and handles both shapes. Cleaning still needs the full
    //    text (LaTeX/reasoning stripping), so `final` may differ slightly from
    //    the raw streamed tokens — by design (quality floor unchanged).
    //    maxModels=3 × self-clamped ≤17s each → worst ~52s (Vercel-safe).
    const sseEncoder = new TextEncoder();
    const localReplyFallback = () =>
      generateLocalReply(message, clientContext, platformResults, foodNutrition, blogResults);

    const sseStream = new ReadableStream<Uint8Array>({
      async start(controller) {
        const send = (event: string, data: unknown) => {
          controller.enqueue(sseEncoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`));
        };
        try {
          // OWNER DIRECTIVE #1 (2026-08-27): interactive chat uses the
          // speed-first chain (fastest free models, accuracy-checked).
          // Phase 89: raw tokens stream to the user via onDelta while the
          // chain keeps its fast-order + key-rotation + fallback policy.
          const { text: aiReply, model: aiModel, provider: aiProvider } = await callFreeAIFallbackChain(
            fullPrompt,
            {
              tag: "evo-chat",
              temperature: 0.6,
              maxTokens: 800,
              timeoutMs: 16_000,
              maxModels: 3,
              chain: "fast",
              onDelta: (chunk) => send("delta", { text: chunk }),
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

            // 6.5 OWNER 2026-08-27: LATEX→PLAIN + MARKDOWN STRIP sanitizer.
            // The chat renders plain text only — live evidence showed raw
            // "\\frac{4}{3}\\pi r^{3}" reaching users verbatim (models ignore
            // the no-LaTeX law occasionally; this is the guaranteed floor).
            cleanText = sanitizeLatexToPlain(cleanText);
            cleanText = stripMarkdownSyntax(cleanText);

            // 7. Final validation: too-short output falls back to local reply.
            if (cleanText.length < 10 || /^\s*\d+\.\s+\*\*?[A-Z]/.test(cleanText)) {
              console.warn("[api/ai/chat] Cleaned text still looks like reasoning, using local fallback");
              send("final", { response: localReplyFallback(), links, source: "local" });
            } else {
              send("final", { response: cleanText, links, source: `${aiProvider}:${aiModel}` });
            }
          } else {
            // Model returned an unusably short text → local fallback.
            send("final", { response: localReplyFallback(), links, source: "local" });
          }
        } catch (aiErr) {
          console.error("[api/ai/chat] AI fallback chain failed:", aiErr);
          const aiMsg = aiErr instanceof Error ? aiErr.message : String(aiErr);
          if (/stream failed mid-way/i.test(aiMsg)) {
            // Tokens already reached the user — no silent model switch / no
            // replacement; the client keeps the partial text and is told the
            // stream was interrupted.
            send("error", { message: "stream interrupted" });
          } else {
            // Nothing streamed (providers failed before the first token) —
            // graceful local fallback, same as the pre-streaming era.
            send("final", { response: localReplyFallback(), links, source: "local" });
          }
        } finally {
          controller.close();
        }
      },
    });

    return new Response(sseStream, {
      headers: {
        "Content-Type": "text/event-stream; charset=utf-8",
        "Cache-Control": "no-cache, no-transform",
      },
    });
  } catch (e) {
    console.error("[api/ai/chat] Error:", e instanceof Error ? e.message : e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Internal server error" },
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
    return [];
  }
}
async function listProgressSafe(userId: string) {
  try {
    const { listProgress } = await import("@/lib/data");
    return await listProgress(userId);
  } catch {
    return [];
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
    const supabase = createClient<Database>(supabaseUrl, serviceKey || supabaseKey, {
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

    return data.map((post) => ({
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
  ctx: EvoClientContext,
  platformResults: SearchResult[],
  foodNutrition: FoodNutritionInfo,
  blogResults: Array<{ title: string; url: string; excerpt: string }>,
): string {
  const isSubscriber = ctx.isSubscriber;
  const plans = ctx.current_plans || [];
  // Questionnaire JSON blobs are Json — view them as Record<string, unknown>
  // for the prompt (Phase 92 loose-fields pattern; shape unchanged).
  const nutrition: Record<string, unknown> =
    ctx.nutrition && typeof ctx.nutrition === "object" && !Array.isArray(ctx.nutrition)
      ? (ctx.nutrition as Record<string, unknown>)
      : {};
  const fitness: Record<string, unknown> =
    ctx.fitness && typeof ctx.fitness === "object" && !Array.isArray(ctx.fitness)
      ? (ctx.fitness as Record<string, unknown>)
      : {};

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
        .map((p) => {
          const c =
            p.content && typeof p.content === "object" && !Array.isArray(p.content)
              ? (p.content as Record<string, unknown>)
              : null;
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

  return `You are EVO, the intelligent performance engine of the Musclehubeg sports platform.
Musclehubeg offers: exercise library (868+ exercises), workout programs, free fitness calculators, food database with calories and macros, fitness blog, and online coaching.

You are NOT just a chatbot — you analyze data, predict outcomes, and guide users to relevant content.
${isSubscriber ? "The user IS a subscriber — you can generate meal plans, workout plans, suggest swaps, and use their personal data." : "The user is NOT a subscriber — do NOT generate meal plans, workout plans, or macro calculations. Those are subscriber-only features. If asked, tell them to subscribe."}
${subscriberContext}${platformContext}${nutritionContext}${blogContext}

CRITICAL — PLATFORM TRUTH LAW (never hallucinate features):
- NEVER mention or imply that Musclehubeg (or any website) has a tool, feature, page, or capability unless it is listed in THIS prompt or in the platform context above. Inventing a feature is a critical error.
- The ONLY real Musclehubeg surfaces: exercise library (/exercises), workout programs (/programs), food database (/foods), free tools & calculators (/tools), blog (/blog), online coaching (/coaching), memberships (/memberships), and this EVO chat.
- You CANNOT: generate images, edit photos, create videos, send or receive files, browse the internet, or connect the user to a human. If asked for any of these, say plainly in the user's language that you can't do it — and STOP there. NEVER redirect the user to a non-existent alternative (e.g. never say "use the image generation tool on the site" — no such tool exists). Offer a real help instead: exercise info, food calories, general fitness guidance, or one of the real surfaces above.
- If you don't know something, say you don't know. Uncertainty is allowed; fabrication is not.

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
- NO LaTeX, NO TeX, NO markdown syntax in your reply (never \\frac, \\pi, $...$, **bold**, #, *, or code blocks) — the chat renders PLAIN TEXT only. Write any math in plain words/numbers (e.g. "حجم الكرة = 4/3 × 3.14 × نصف القطر³" or "V = 4/3 x 3.14 x r x r x r").

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
  ctx: EvoClientContext,
  platformResults: SearchResult[],
  foodNutrition: FoodNutritionInfo,
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
