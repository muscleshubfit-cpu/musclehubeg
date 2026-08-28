/**
 * AI Jobs — generic queue for ALL batch AI work.
 *
 * OWNER DIRECTIVE (2026-08-27): the whole AI system runs natively inside
 * GitHub Actions (same pattern as the blog pipeline). EVO chat stays on
 * Vercel streaming. Everything else becomes an `ai_jobs` row:
 *
 *   plan_nutrition       coach asks a full nutrition plan  (+2 alts/meal)
 *   plan_workout         coach asks a weekly workout program (4-8 weeks framing)
 *   meal_regenerate      swap one meal (tier-limited weekly, like old C16)
 *   exercise_regenerate  swap one exercise (library-filtered, injury-safe)
 *   article_tool         paraphrase | summarize | proofread | seo_pack |
 *                        subheadings (+ legacy editor tool aliases)
 *   article_generate     coach asks a COMPLETE new article draft (title +
 *                        markdown body + meta + tags) — restored 2026-08-28;
 *                        2026-08-28b: topic is now OPTIONAL — an empty topic
 *                        makes the PROCESSOR pick a fresh title via
 *                        pickSmartTopic() (the same smart topic system the
 *                        automated blog pipeline uses) so the generation
 *                        system itself chooses the article's subject
 *                        (owner report: «مفروض يختار العنوان بنفس نظام
 *                        التوليد»)
 *   social_post          facebook | instagram | x/twitter | linkedin × tone
 *
 * WRITE PATHS:
 *   • enqueueAiJob / status writes → service-role (RLS bypass) only.
 *   • Browsers hold SELECT-own-row RLS policy — they can watch their own
 *     jobs through /api/ai/jobs?id=… but can NEVER forge or mutate rows.
 *
 * RUNNER CONTRACT (scripts/ai-jobs-runner/process.mts):
 *   reapStaleJobs() → claimQueuedJobs() → PROCESSORS[type](payload)
 *   → finishJob()/failJob(); failJob requeues until MAX_ATTEMPTS.
 */

import { supabaseAdmin, isSupabaseAdminConfigured } from "@/lib/supabase/admin";

/* ─────────────────────────── Types ─────────────────────────── */

export const AI_JOB_TYPES = [
  "plan_nutrition",
  "plan_workout",
  "meal_regenerate",
  "exercise_regenerate",
  "article_tool",
  "article_generate",
  "social_post",
] as const;

export type AiJobType = (typeof AI_JOB_TYPES)[number];

export const AI_JOB_STATUSES = [
  "queued",
  "processing",
  "done",
  "failed",
] as const;

export type AiJobStatus = (typeof AI_JOB_STATUSES)[number];

/** Hard retry ceiling per job before it lands in `failed`. */
export const MAX_JOB_ATTEMPTS = 3;

/** Typical end-to-end latency = poll interval + generation time. */
export const JOB_ETA_MINUTES = 10;

/** Envelope cap on the JSON payload the API route will accept. */
export const MAX_PAYLOAD_BYTES = 40_960; // 40 KB

export type AiJobRow = {
  id: string;
  job_type: AiJobType;
  status: AiJobStatus;
  payload?: any;
  result?: any;
  error_message?: string | null;
  requested_by?: string | null;
  attempts?: number;
  created_at?: string;
  started_at?: string | null;
  finished_at?: string | null;
};

/** How a job is authorized at enqueue time. */
export type JobGate = "coach" | "user_swap_meal" | "user_swap_exercise";

export const JOB_GATE: Record<AiJobType, JobGate> = {
  plan_nutrition: "coach",
  plan_workout: "coach",
  article_tool: "coach",
  article_generate: "coach",
  social_post: "coach",
  meal_regenerate: "user_swap_meal",
  exercise_regenerate: "user_swap_exercise",
};

/** UI labels (kept here so client + runner never drift apart). */
export const JOB_LABELS: Record<AiJobType, { ar: string; en: string }> = {
  plan_nutrition: { ar: "توليد خطة تغذية", en: "Generate nutrition plan" },
  plan_workout: { ar: "توليد برنامج تمارين", en: "Generate workout program" },
  meal_regenerate: { ar: "استبدال وجبة", en: "Swap meal" },
  exercise_regenerate: { ar: "استبدال تمرين", en: "Swap exercise" },
  article_tool: { ar: "أداة تحسين المقال", en: "Article tool" },
  article_generate: { ar: "توليد مقال كامل", en: "Generate article" },
  social_post: { ar: "منشور سوشيال ميديا", en: "Social post" },
};

export function isAiJobType(v: any): v is AiJobType {
  return typeof v === "string" && (AI_JOB_TYPES as readonly string[]).includes(v);
}

/** Thrown by sanitizeJobPayload when a REQUIRED field is missing/short —
 * the API route maps this to HTTP 400 (never 500). */
export class JobPayloadError extends Error {}

/* ────────────────── Payload sanitization (server trust boundary) ──────────────────
 * The enqueue route NEVER stores raw body payloads. Every type passes through a
 * whitelist picker that copies ONLY known fields with clamps — deep objects sent
 * from DevTools cannot smuggle prompt injections into uncontrolled fields beyond
 * the user-owned free-text slots explicitly designed for them (`note`, `reason`).
 * ─────────────────────────────────────────────────────────────────────────────── */

const str = (v: any, max: number): string =>
  typeof v === "string" ? v.slice(0, max) : "";
const num = (v: any): number | undefined => {
  const n = typeof v === "number" ? v : parseFloat(String(v));
  return Number.isFinite(n) ? n : undefined;
};

function pickClientContext(cc: any) {
  // Same shape CoachClientView builds today — nothing else survives.
  if (!cc || typeof cc !== "object") return undefined;
  return {
    name: str(cc.name, 80),
    nutrition: cc.nutrition && typeof cc.nutrition === "object" ? cc.nutrition : null,
    fitness: cc.fitness && typeof cc.fitness === "object" ? cc.fitness : null,
    recent_measurements: Array.isArray(cc.recent_measurements)
      ? cc.recent_measurements.slice(0, 5)
      : [],
  };
}

export function sanitizeJobPayload(type: AiJobType, raw: any): Record<string, any> {
  const p = raw && typeof raw === "object" ? raw : {};
  switch (type) {
    case "plan_nutrition":
    case "plan_workout": {
      const o = p.overrides && typeof p.overrides === "object" ? p.overrides : {};
      return {
        clientId: str(p.clientId, 64),
        clientContext: pickClientContext(p.clientContext),
        overrides: {
          targetCalories: num(o.targetCalories),
          macros: o.macros && typeof o.macros === "object"
            ? {
                protein_g: num(o.macros.protein_g),
                carbs_g: num(o.macros.carbs_g),
                fat_g: num(o.macros.fat_g),
              }
            : undefined,
          foods: Array.isArray(o.foods) ? o.foods.map((f: any) => str(f, 60)).slice(0, 30) : undefined,
          mealsCount: (() => { const n = num(o.mealsCount); return n ? Math.min(6, Math.max(2, Math.round(n))) : undefined; })(),
          notes: str(o.notes, 500),
        },
      };
    }
    case "meal_regenerate": {
      const m = p.meal && typeof p.meal === "object" ? p.meal : {};
      return {
        meal: {
          name: str(m.name, 120),
          items: Array.isArray(m.items) ? m.items.slice(0, 15) : [],
          notes: str(m.notes, 300),
        },
        targetCalories: num(p.targetCalories),
        clientContext: pickClientContext(p.clientContext),
        reason: str(p.reason ?? p.note, 400),
      };
    }
    case "exercise_regenerate": {
      const ex = p.exercise && typeof p.exercise === "object" ? p.exercise : {};
      return {
        exercise: {
          name: str(ex.name, 120),
          sets: num(ex.sets),
          reps: str(ex.reps, 40),
          rest: str(ex.rest, 40),
          focus: str(ex.focus, 120),
        },
        location: str(p.location, 60), // gym | home | …
        clientContext: pickClientContext(p.clientContext),
        reason: str(p.reason ?? p.note, 400), // e.g. knee injury / no machine
      };
    }
    case "article_generate": {
      // TOPIC-AUTO LAW (2026-08-28b): an empty topic is a FEATURE — the
      // processor auto-picks a fresh, non-duplicate title through the same
      // pickSmartTopic() system the automated blog pipeline uses. The queue
      // slot is never burned on garbage: pickSmartTopic has curated
      // per-language fallbacks, so a topic ALWAYS exists before generation.
      const topic = str(p.topic, 300).trim();
      return {
        topic, // may be "" → processor-side smart pick
        language: p.language === "en" ? "en" : "ar",
        tone: str(p.tone, 60),
        audience: str(p.audience, 120),
        keywords: Array.isArray(p.keywords)
          ? p.keywords.map((k: any) => str(k, 40).trim()).filter(Boolean).slice(0, 8)
          : [],
        category: str(p.category, 60),
      };
    }
    case "article_tool": {
      return {
        tool: str(p.tool, 40),
        content: str(p.content, 30_000),
        title: str(p.title, 200),
        keyword: str(p.keyword, 120),
        category: str(p.category, 60),
        language: p.language === "en" ? "en" : "ar",
      };
    }
    case "social_post": {
      const platformRaw = str(p.platform, 20).toLowerCase();
      const PLATFORMS = ["facebook", "instagram", "x", "twitter", "linkedin"];
      const platform = PLATFORMS.includes(platformRaw)
        ? platformRaw === "twitter" ? "x" : platformRaw
        : "facebook";
      const TONES = ["professional", "friendly", "motivational"];
      const tone = TONES.includes(str(p.tone, 20)) ? str(p.tone, 20) : "motivational";
      return {
        platform,
        tone,
        language: p.language === "en" ? "en" : "ar",
        topic: str(p.topic, 200),
        content: str(p.content, 12_000),
        articleUrl: /^https?:\/\//.test(String(p.articleUrl || "")) ? str(p.articleUrl, 300) : "",
      };
    }
  }
}

/* ─────────────────────────── Server operations ─────────────────────────── */

export async function enqueueAiJob(opts: {
  type: AiJobType;
  payload: Record<string, any>;
  requestedBy?: string | null;
}): Promise<{ id: string }> {
  if (!isSupabaseAdminConfigured || !supabaseAdmin) {
    throw new Error("SUPABASE_SERVICE_ROLE_KEY not configured");
  }
  const clean = sanitizeJobPayload(opts.type, opts.payload);
  const { data, error } = await supabaseAdmin
    .from("ai_jobs" as any)
    .insert({
      job_type: opts.type,
      payload: clean,
      requested_by: opts.requestedBy ?? null,
      status: "queued",
    })
    .select("id")
    .single();
  if (error) throw new Error(`enqueue failed: ${error.message}`);
  return { id: (data as any).id };
}

/**
 * GHA runner side — atomically claim up to `limit` oldest queued jobs.
 * Optimistic UPDATE … WHERE status='queued' keeps a single winner even if
 * two workflow runs overlap (concurrency group also guards this).
 */
export async function claimQueuedJobs(limit = 10): Promise<AiJobRow[]> {
  if (!isSupabaseAdminConfigured || !supabaseAdmin) throw new Error("admin client missing");
  const { data: candidates } = await supabaseAdmin
    .from("ai_jobs" as any)
    .select("*")
    .eq("status", "queued")
    .order("created_at", { ascending: true })
    .limit(limit);
  const claimed: AiJobRow[] = [];
  for (const row of (candidates as unknown as AiJobRow[]) || []) {
    const { data } = await supabaseAdmin
      .from("ai_jobs" as any)
      .update({
        status: "processing",
        started_at: new Date().toISOString(),
        attempts: (row.attempts || 0) + 1,
      })
      .eq("id", row.id)
      .eq("status", "queued")
      .select("*");
    if (data && data.length > 0) claimed.push(data[0] as unknown as AiJobRow);
  }
  return claimed;
}

export async function finishJob(jobId: string, result: any): Promise<void> {
  await supabaseAdmin!
    .from("ai_jobs" as any)
    .update({
      status: "done",
      result,
      error_message: null,
      finished_at: new Date().toISOString(),
    })
    .eq("id", jobId);
}

/** Retry-aware failure: back to `queued` until attempts hit the ceiling. */
export async function failJob(jobId: string, currentAttempts: number, message: string): Promise<"requeued" | "failed"> {
  const exhausted = (currentAttempts || 1) >= MAX_JOB_ATTEMPTS;
  await supabaseAdmin!
    .from("ai_jobs" as any)
    .update({
      status: exhausted ? "failed" : "queued",
      error_message: message.slice(0, 2000),
      finished_at: exhausted ? new Date().toISOString() : null,
    })
    .eq("id", jobId);
  return exhausted ? "failed" : "requeued";
}

/** Jobs stuck in `processing` > 30 min (runner crash mid-job) → requeue. */
export async function reapStaleJobs(staleMinutes = 30): Promise<number> {
  if (!isSupabaseAdminConfigured || !supabaseAdmin) return 0;
  const cutoff = new Date(Date.now() - staleMinutes * 60_000).toISOString();
  const { data } = await supabaseAdmin
    .from("ai_jobs" as any)
    .update({
      status: "queued",
      error_message: "reaped: processing exceeded time limit — auto-retried",
    })
    .eq("status", "processing")
    .lt("started_at", cutoff)
    .select("id");
  return data?.length ?? 0;
}
