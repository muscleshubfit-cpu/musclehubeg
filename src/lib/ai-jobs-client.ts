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
