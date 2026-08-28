/**
 * AI Jobs — BROWSER client helper.
 *
 * Enqueue a job via /api/ai/jobs then poll /api/ai/jobs?id=… until it is
 * `done` (resolves with the result) or `failed`/timeout (rejects).
 *
 * Latency model: the GHA workflow process-ai-jobs.yml runs every 10 minutes,
 * so worst-case wait ≈ 10 min + generation time. The poll window below
 * covers two scheduling cycles + a long generation, then gives up with a
 * clear error the UI can surface.
 */

import type { AiJobType } from "@/lib/ai-jobs";

const POLL_INTERVAL_MS = 20_000;
const POLL_WINDOW_MS = 25 * 60_000; // 25 min hard ceiling

/* ── Coach article-generation hand-off (queue → editor) ──
 * BlogAdminView writes, BlogEditorView consumes. Same survivable pattern
 * as the plan jobs: a localStorage registry survives reloads while the
 * job is still pending, and a sessionStorage draft carries the finished
 * result into /admin/blog/new exactly once. */
export const AI_ARTICLE_DRAFT_KEY = "mhe:ai-article-draft";
export const AI_ARTICLE_PENDING_KEY = "mhe:pending-article-job";

export type PendingArticleJob = { id: string; topic: string; startedAt: number };

export function readPendingArticleJob(): PendingArticleJob | null {
  try {
    const raw = localStorage.getItem(AI_ARTICLE_PENDING_KEY);
    if (!raw) return null;
    const entry = JSON.parse(raw);
    if (!entry?.id) return null;
    // 24h TTL — older entries are dead weight (job is long-settled).
    if (Date.now() - Number(entry.startedAt || 0) > 24 * 3_600_000) {
      localStorage.removeItem(AI_ARTICLE_PENDING_KEY);
      return null;
    }
    return entry as PendingArticleJob;
  } catch {
    return null;
  }
}

export function writePendingArticleJob(entry: PendingArticleJob | null): void {
  try {
    if (entry) localStorage.setItem(AI_ARTICLE_PENDING_KEY, JSON.stringify(entry));
    else localStorage.removeItem(AI_ARTICLE_PENDING_KEY);
  } catch {
    /* storage full/blocked — watching still works in-session */
  }
}

/**
 * M15 slug law: blog slugs are lowercase-English-and-hyphens ONLY (Arabic
 * breaks URLs/sharing/hreflang). Derive the best Latin slug from an
 * (often Arabic) AI title; fall back to a dated post-YYYYMMDDNN slug the
 * coach can rename in the editor.
 */
export function articleSlugFromTitle(title: string): string {
  const latin = String(title)
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 80)
    .replace(/-$/g, "");
  if (latin.length >= 3) return latin;
  const now = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  return `post-${now.getUTCFullYear()}${pad(now.getUTCMonth() + 1)}${pad(now.getUTCDate())}${pad(now.getUTCHours())}${pad(now.getUTCMinutes())}`;
}

type Pending = { id: string };

export async function enqueueAiJobClient(
  type: AiJobType,
  payload: Record<string, any>,
): Promise<string> {
  const res = await fetch("/api/ai/jobs", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ type, payload }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    // 429 carries tier-limit messages meant for the user as-is.
    throw new Error(data?.error || "تعذّر إرسال الطلب. حاول مرة أخرى.");
  }
  return (data as Pending).id;
}

export async function getAiJob(id: string): Promise<any> {
  const res = await fetch(`/api/ai/jobs?id=${encodeURIComponent(id)}`);
  if (!res.ok) throw new Error("job poll failed");
  return res.json();
}

/**
 * Fire-and-wait: resolves { result } when done, rejects on failure/429/timeout.
 * `onQueued` fires once right after enqueue so UIs can show an immediate
 * "جاري التنفيذ في الخلفية" state.
 */
export async function runAiJob(
  type: AiJobType,
  payload: Record<string, any>,
  opts?: { onQueued?: () => void },
): Promise<{ result: any }> {
  const id = await enqueueAiJobClient(type, payload);
  opts?.onQueued?.();

  const deadline = Date.now() + POLL_WINDOW_MS;
  let lastErr: unknown = null;

  while (Date.now() < deadline) {
    await new Promise((r) => setTimeout(r, POLL_INTERVAL_MS));
    try {
      const job = await getAiJob(id);
      if (job?.status === "done") return { result: job.result };
      if (job?.status === "failed") {
        throw new Error(job.error_message || "فشل توليد النتيجة. حاول مرة أخرى.");
      }
      // queued | processing → keep waiting silently
    } catch (e) {
      // Transient network errors shouldn't kill the wait loop…
      lastErr = e;
      if (e instanceof Error && /فشل|failed/i.test(e.message)) throw e;
    }
  }
  throw new Error(
    lastErr instanceof Error
      ? lastErr.message
      : "انتهت مهلة الانتظار. النتيجة قد تظهر لاحقًا في السجل.",
  );
}
